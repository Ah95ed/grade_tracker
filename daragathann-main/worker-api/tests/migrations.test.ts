import { describe, expect, it } from 'vitest';
import { createMigratedTestDb } from './helpers/mockD1';

describe('D1 Migrations & Triggers', () => {
  it('creates all required Daragat tables and sync metadata columns', async () => {
    const db = createMigratedTestDb();
    const res = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name ASC")
      .all<{ name: string }>();

    const tables = (res.results || []).map((r) => r.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'users',
        'teacher_profiles',
        'monthly_models',
        'custom_columns',
        'students',
        'student_monthly_records',
        'terms',
        'term_selected_models',
        'cancelled_accounts',
        'used_trials',
        'email_verifications',
        'rate_limits',
        'sync_tombstones',
      ])
    );

    const modelCols = await db.prepare('PRAGMA table_info(monthly_models)').all<{ name: string }>();
    const modelColNames = (modelCols.results || []).map((c) => c.name);
    expect(modelColNames).toEqual(expect.arrayContaining(['version', 'updated_at']));
  });

  it('automatically preserves trial history in used_trials on user deletion', async () => {
    const db = createMigratedTestDb();
    await db
      .prepare(
        `INSERT INTO users (uid, email, subscription_type, subscription_status, expires_at, created_at)
         VALUES ('u1', 'TrialUser@Example.COM', 'trial', 'pending', '2026-01-04T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
      )
      .run();

    await db.prepare("DELETE FROM users WHERE uid = 'u1'").run();

    const used = await db
      .prepare("SELECT email, first_trial_at, trial_expires_at FROM used_trials WHERE email = 'trialuser@example.com'")
      .first<{ email: string; first_trial_at: string; trial_expires_at: string }>();

    expect(used).not.toBeNull();
    expect(used?.first_trial_at).toBe('2026-01-01T00:00:00.000Z');
    expect(used?.trial_expires_at).toBe('2026-01-04T00:00:00.000Z');
  });

  it('auto-increments version on raw update and records tombstones on delete', async () => {
    const db = createMigratedTestDb();
    await db
      .prepare("INSERT INTO users (uid, email) VALUES ('u1', 'u1@test.com')")
      .run();
    await db
      .prepare("INSERT INTO students (id, user_uid, name) VALUES ('st1', 'u1', 'أحمد')")
      .run();

    await db.prepare("UPDATE students SET name = 'أحمد علي' WHERE id = 'st1'").run();

    const updated = await db
      .prepare("SELECT version, updated_at FROM students WHERE id = 'st1'")
      .first<{ version: number; updated_at: string }>();
    expect(updated?.version).toBe(2);
    expect(updated?.updated_at).toBeTruthy();

    await db.prepare("DELETE FROM students WHERE id = 'st1'").run();

    const tomb = await db
      .prepare("SELECT user_uid, entity_type, entity_id FROM sync_tombstones WHERE entity_id = 'st1'")
      .first<{ user_uid: string; entity_type: string; entity_id: string }>();
    expect(tomb).toEqual({
      user_uid: 'u1',
      entity_type: 'student',
      entity_id: 'st1',
    });
  });
});
