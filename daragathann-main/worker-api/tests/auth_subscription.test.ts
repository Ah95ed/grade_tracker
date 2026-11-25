import { describe, expect, it } from 'vitest';
import { TRIAL_DURATION_MS } from '../src/config/constants';
import { createApp } from '../src/index';
import { createMigratedTestDb } from './helpers/mockD1';
import { createTestEnv, testTokenVerifier } from './helpers/testAuth';

describe('Auth & Subscription Logic', () => {
  it('rejects unauthenticated, invalid, and anonymous callers', async () => {
    const db = createMigratedTestDb();
    const env = createTestEnv(db);
    const app = createApp({ verifyToken: testTokenVerifier });

    const r1 = await app.request('/api/v1/users/me', { method: 'GET' }, env);
    expect(r1.status).toBe(401);

    const r2 = await app.request(
      '/api/v1/users/me',
      { method: 'GET', headers: { Authorization: 'Bearer bad-token' } },
      env
    );
    expect(r2.status).toBe(401);

    const r3 = await app.request(
      '/api/v1/users/me',
      { method: 'GET', headers: { Authorization: 'Bearer anon-1' } },
      env
    );
    expect(r3.status).toBe(403);
  });

  it('blocks login when email is pending verification in email_verifications', async () => {
    const db = createMigratedTestDb();
    const env = createTestEnv(db);
    const app = createApp({ verifyToken: testTokenVerifier });

    await db
      .prepare(
        `INSERT INTO email_verifications (email, uid, token_hash, expires_at, created_at, last_sent_at)
         VALUES ('unverified@daragat.test', 'uid-unverified', 'hash123', 9999999999999, 1000, 1000)`
      )
      .run();

    const res = await app.request(
      '/api/v1/users',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer unverified-user', 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Teacher' }),
      },
      env
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('grants an exact 72h server-computed trial once and prevents trial reset after self-deletion', async () => {
    const db = createMigratedTestDb();
    const env = createTestEnv(db);
    const app = createApp({ verifyToken: testTokenVerifier });

    const regRes = await app.request(
      '/api/v1/users',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'أحمد محمد', userRole: 'teacher' }),
      },
      env
    );
    expect(regRes.status).toBe(201);
    const regBody = (await regRes.json()) as any;
    expect(regBody.user.subscriptionType).toBe('trial');
    expect(regBody.user.subscriptionStatus).toBe('pending');
    const createdMs = Date.parse(regBody.user.createdAt);
    const expiresMs = Date.parse(regBody.user.expiresAt);
    expect(expiresMs - createdMs).toBe(TRIAL_DURATION_MS);

    // Expire the trial in DB & used_trials to simulate 72h passing
    const pastIso = new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString();
    const pastExpIso = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    await db
      .prepare("UPDATE users SET created_at = ?, expires_at = ? WHERE uid = 'uid-teacher-1'")
      .bind(pastIso, pastExpIso)
      .run();
    await db
      .prepare("UPDATE used_trials SET first_trial_at = ?, trial_expires_at = ? WHERE email = 'teacher1@daragat.test'")
      .bind(pastIso, pastExpIso)
      .run();

    // Protected route must block expired trial
    const blockedRes = await app.request(
      '/api/v1/models',
      { method: 'GET', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    expect(blockedRes.status).toBe(403);
    expect(((await blockedRes.json()) as any).code).toBe('SUBSCRIPTION_EXPIRED');

    // Self-delete account
    const delRes = await app.request(
      '/api/v1/users/me',
      { method: 'DELETE', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    expect(delRes.status).toBe(200);

    // Re-register with the same email (even with a new Firebase UID) -> stays expired
    const reRegRes = await app.request(
      '/api/v1/users',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1-newuid', 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'أحمد' }),
      },
      env
    );
    expect(reRegRes.status).toBe(201);
    const reRegBody = (await reRegRes.json()) as any;
    expect(reRegBody.user.subscriptionStatus).toBe('expired');
    expect(reRegBody.user.expiresAt).toBe(pastExpIso);
  });

  it('supports admin yearly (+365d), lifetime (null expiresAt), and cancel/reactivate flows', async () => {
    const db = createMigratedTestDb();
    const env = createTestEnv(db);
    const app = createApp({ verifyToken: testTokenVerifier });

    // Register teacher-1
    await app.request(
      '/api/v1/users',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Teacher 1' }),
      },
      env
    );

    // Non-admin cannot list or activate users
    const forbiddenList = await app.request(
      '/api/v1/users',
      { method: 'GET', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    expect(forbiddenList.status).toBe(403);

    // Admin activates yearly
    const yearlyRes = await app.request(
      '/api/v1/users/uid-teacher-1',
      {
        method: 'PUT',
        headers: { Authorization: 'Bearer admin-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionType: 'yearly', subscriptionStatus: 'active' }),
      },
      env
    );
    expect(yearlyRes.status).toBe(200);
    const yearlyBody = (await yearlyRes.json()) as any;
    expect(yearlyBody.user.subscriptionType).toBe('yearly');
    expect(yearlyBody.user.subscriptionStatus).toBe('active');
    const diffDays = (Date.parse(yearlyBody.user.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(364);
    expect(diffDays).toBeLessThan(366);

    // Admin sets lifetime (expiresAt must become null)
    const lifeRes = await app.request(
      '/api/v1/users/uid-teacher-1',
      {
        method: 'PUT',
        headers: { Authorization: 'Bearer admin-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionType: 'lifetime', subscriptionStatus: 'active' }),
      },
      env
    );
    expect(lifeRes.status).toBe(200);
    const lifeBody = (await lifeRes.json()) as any;
    expect(lifeBody.user.subscriptionType).toBe('lifetime');
    expect(lifeBody.user.expiresAt).toBeNull();

    // Admin cancels account -> blocks teacher-1
    const cancelRes = await app.request(
      '/api/v1/users/uid-teacher-1',
      {
        method: 'PUT',
        headers: { Authorization: 'Bearer admin-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionStatus: 'cancelled' }),
      },
      env
    );
    expect(cancelRes.status).toBe(200);

    const blocked = await app.request(
      '/api/v1/profile',
      { method: 'GET', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    expect(blocked.status).toBe(403);
    expect(((await blocked.json()) as any).code).toBe('ACCOUNT_CANCELLED');

    // Admin reactivates -> clears cancelled_accounts and restores access
    const reactivate = await app.request(
      '/api/v1/users/uid-teacher-1',
      {
        method: 'PUT',
        headers: { Authorization: 'Bearer admin-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionType: 'lifetime', subscriptionStatus: 'active' }),
      },
      env
    );
    expect(reactivate.status).toBe(200);

    const unblocked = await app.request(
      '/api/v1/profile',
      { method: 'GET', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    expect(unblocked.status).toBe(200);
  });

  it('migrates pre-created UID data when user signs in with Firebase UID', async () => {
    const db = createMigratedTestDb();
    const env = createTestEnv(db);
    const app = createApp({ verifyToken: testTokenVerifier });

    await db
      .prepare(
        `INSERT INTO users (uid, email, display_name, subscription_type, subscription_status, expires_at)
         VALUES ('user-precreated-1', 'teacher1@daragat.test', 'أستاذ', 'lifetime', 'active', NULL)`
      )
      .run();
    await db
      .prepare("INSERT INTO students (id, user_uid, name) VALUES ('st-pre', 'user-precreated-1', 'طالب قديم')")
      .run();

    const loginRes = await app.request(
      '/api/v1/users',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer teacher-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      env
    );
    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as any;
    expect(loginBody.user.uid).toBe('uid-teacher-1');
    expect(loginBody.user.subscriptionType).toBe('lifetime');
    expect(loginBody.user.subscriptionStatus).toBe('active');

    const studentsRes = await app.request(
      '/api/v1/students',
      { method: 'GET', headers: { Authorization: 'Bearer teacher-1' } },
      env
    );
    const studentsBody = (await studentsRes.json()) as any;
    expect(studentsBody.students).toHaveLength(1);
    expect(studentsBody.students[0].name).toBe('طالب قديم');
  });
});
