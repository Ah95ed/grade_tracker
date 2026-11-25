import {
  MONTHLY_DURATION_MS,
  TRIAL_DURATION_MS,
  YEARLY_DURATION_MS,
  type InstitutionType,
  type SubscriptionStatus,
  type SubscriptionType,
  type UserRole,
} from '../config/constants';
import { isAdminEmail, type WorkerEnv } from '../config/env';
import { normalizeToUtcIso, nowUtcIso, parseDbDateMs } from '../utils/dates';

export interface UserRow {
  id: number;
  uid: string;
  email: string;
  display_name: string | null;
  user_role: string | null;
  institution_type: string | null;
  is_admin: number;
  subscription_type: string;
  subscription_status: string;
  expires_at: string | null;
  last_active_at: string | null;
  created_at: string | null;
}

export interface UserWithProfileRow extends UserRow {
  school_name?: string | null;
  subject?: string | null;
  teacher_name?: string | null;
}

export interface UsedTrialRow {
  email: string;
  first_trial_at: string;
  trial_expires_at: string | null;
}

export interface FormattedUser {
  uid: string;
  email: string;
  displayName: string;
  userRole: UserRole;
  institutionType: InstitutionType;
  isAdmin: boolean;
  subscriptionType: SubscriptionType;
  subscriptionStatus: SubscriptionStatus;
  expiresAt: string | null;
  lastActiveAt: string;
  createdAt: string;
  schoolName?: string;
  subject?: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeSubType(raw: unknown): SubscriptionType {
  if (raw === 'trial_3days' || raw === 'trial') return 'trial';
  if (raw === 'monthly' || raw === 'yearly' || raw === 'lifetime') return raw;
  return 'trial';
}

function normalizeRole(raw: unknown): UserRole {
  return raw === 'admin_school' ? 'admin_school' : 'teacher';
}

function normalizeInstitution(raw: unknown): InstitutionType {
  return raw === 'university' ? 'university' : 'school';
}

function scoreUserRow(row: UserRow, targetUid: string): number {
  let score = 0;
  if (row.is_admin === 1) score += 10000;
  if (row.subscription_status === 'cancelled' || row.subscription_status === 'suspended') score += 5000;
  if (row.subscription_status === 'active') {
    if (row.subscription_type === 'lifetime') score += 4000;
    else {
      const exp = parseDbDateMs(row.expires_at);
      score += exp === null || exp > Date.now() ? 3000 : 1000;
    }
  } else if (row.subscription_status === 'pending') {
    score += 1500;
  } else if (row.subscription_status === 'expired') {
    score += 500;
  }
  if (row.uid === targetUid) score += 200;
  return score;
}

export class UserRepository {
  constructor(private readonly db: D1Database) {}

  async isEmailUnverified(email: string): Promise<boolean> {
    const clean = normalizeEmail(email);
    if (!clean) return false;
    const row = await this.db
      .prepare('SELECT email FROM email_verifications WHERE LOWER(email) = ? LIMIT 1')
      .bind(clean)
      .first<{ email: string }>();
    return Boolean(row);
  }

  async hasDbAdminFlag(uid: string, email: string): Promise<boolean> {
    const clean = normalizeEmail(email);
    const row = await this.db
      .prepare('SELECT is_admin FROM users WHERE (uid = ? OR LOWER(email) = ?) AND is_admin = 1 LIMIT 1')
      .bind(uid, clean)
      .first<{ is_admin: number }>();
    return Boolean(row);
  }

  async findMatchingRows(uid: string, email: string): Promise<UserRow[]> {
    const clean = normalizeEmail(email);
    const res = await this.db
      .prepare(
        `SELECT id, uid, email, display_name, user_role, institution_type, is_admin,
                subscription_type, subscription_status, expires_at, last_active_at, created_at
         FROM users
         WHERE uid = ? OR LOWER(email) = ?
         ORDER BY id DESC`
      )
      .bind(uid, clean)
      .all<UserRow>();
    return res.results || [];
  }

  async findBestUserRow(uid: string, email: string): Promise<UserRow | null> {
    const rows = await this.findMatchingRows(uid, email);
    if (rows.length === 0) return null;
    rows.sort((a, b) => scoreUserRow(b, uid) - scoreUserRow(a, uid) || b.id - a.id);
    return rows[0];
  }

  async findUserByUid(uid: string): Promise<UserRow | null> {
    const row = await this.db
      .prepare(
        `SELECT id, uid, email, display_name, user_role, institution_type, is_admin,
                subscription_type, subscription_status, expires_at, last_active_at, created_at
         FROM users WHERE uid = ? LIMIT 1`
      )
      .bind(uid)
      .first<UserRow>();
    return row || null;
  }

  async findUserWithProfileByUid(uid: string): Promise<UserWithProfileRow | null> {
    const row = await this.db
      .prepare(
        `SELECT u.id, u.uid, u.email, u.display_name, u.user_role, u.institution_type, u.is_admin,
                u.subscription_type, u.subscription_status, u.expires_at, u.last_active_at, u.created_at,
                tp.school_name, tp.subject, tp.teacher_name
         FROM users u
         LEFT JOIN teacher_profiles tp ON tp.user_uid = u.uid
         WHERE u.uid = ?
         LIMIT 1`
      )
      .bind(uid)
      .first<UserWithProfileRow>();
    return row || null;
  }

  async findAllUsersWithProfile(): Promise<UserWithProfileRow[]> {
    const res = await this.db
      .prepare(
        `SELECT u.id, u.uid, u.email, u.display_name, u.user_role, u.institution_type, u.is_admin,
                u.subscription_type, u.subscription_status, u.expires_at, u.last_active_at, u.created_at,
                tp.school_name, tp.subject, tp.teacher_name
         FROM users u
         LEFT JOIN teacher_profiles tp ON tp.user_uid = u.uid
         ORDER BY u.last_active_at DESC, u.id DESC`
      )
      .all<UserWithProfileRow>();
    return res.results || [];
  }

  async isEmailCancelled(email: string): Promise<boolean> {
    const clean = normalizeEmail(email);
    if (!clean) return false;
    const row = await this.db
      .prepare('SELECT email FROM cancelled_accounts WHERE LOWER(email) = ? LIMIT 1')
      .bind(clean)
      .first<{ email: string }>();
    return Boolean(row);
  }

  async getCancelledEmailsSet(): Promise<Set<string>> {
    const res = await this.db.prepare('SELECT email FROM cancelled_accounts').all<{ email: string }>();
    const set = new Set<string>();
    for (const r of res.results || []) {
      if (r.email) set.add(normalizeEmail(r.email));
    }
    return set;
  }

  async addCancelledEmail(email: string, reason = 'ملغي من الإدارة'): Promise<void> {
    const clean = normalizeEmail(email);
    await this.db
      .prepare(
        `INSERT INTO cancelled_accounts (email, reason, cancelled_at)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET reason = excluded.reason, cancelled_at = excluded.cancelled_at`
      )
      .bind(clean, reason, nowUtcIso())
      .run();
  }

  async removeCancelledEmail(email: string): Promise<void> {
    await this.db.prepare('DELETE FROM cancelled_accounts WHERE LOWER(email) = ?').bind(normalizeEmail(email)).run();
  }

  async findUsedTrial(email: string): Promise<UsedTrialRow | null> {
    const clean = normalizeEmail(email);
    if (!clean) return null;
    const row = await this.db
      .prepare('SELECT email, first_trial_at, trial_expires_at FROM used_trials WHERE LOWER(email) = ? LIMIT 1')
      .bind(clean)
      .first<UsedTrialRow>();
    return row || null;
  }

  async recordUsedTrialIfAbsent(email: string, firstTrialAt: string, trialExpiresAt: string): Promise<void> {
    const clean = normalizeEmail(email);
    await this.db
      .prepare(
        `INSERT INTO used_trials (email, first_trial_at, trial_expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO NOTHING`
      )
      .bind(clean, firstTrialAt, trialExpiresAt)
      .run();
  }

  async markExpiredById(id: number): Promise<void> {
    await this.db
      .prepare("UPDATE users SET subscription_status = 'expired' WHERE id = ? AND subscription_status != 'expired'")
      .bind(id)
      .run();
  }

  async createUser(params: {
    uid: string;
    email: string;
    displayName: string | null;
    userRole: UserRole;
    institutionType: InstitutionType;
    isAdmin: boolean;
    subscriptionType: SubscriptionType;
    subscriptionStatus: SubscriptionStatus;
    expiresAt: string | null;
    createdAt: string;
  }): Promise<void> {
    const now = nowUtcIso();
    await this.db
      .prepare(
        `INSERT INTO users (
           uid, email, display_name, user_role, institution_type, is_admin,
           subscription_type, subscription_status, expires_at, last_active_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        params.uid,
        normalizeEmail(params.email),
        params.displayName,
        params.userRole,
        params.institutionType,
        params.isAdmin ? 1 : 0,
        params.subscriptionType,
        params.subscriptionStatus,
        params.expiresAt,
        now,
        params.createdAt
      )
      .run();
  }

  async refreshExistingUser(params: {
    id: number;
    newUid?: string;
    email: string;
    displayName?: string | null;
    institutionType?: InstitutionType;
    isAdmin?: boolean;
    subscriptionType?: SubscriptionType;
    subscriptionStatus?: SubscriptionStatus;
    expiresAt?: string | null;
  }): Promise<void> {
    const now = nowUtcIso();
    const sets: string[] = ['email = ?', 'last_active_at = ?'];
    const values: unknown[] = [normalizeEmail(params.email), now];

    if (params.newUid) {
      sets.push('uid = ?');
      values.push(params.newUid);
    }
    if (params.displayName !== undefined) {
      sets.push('display_name = COALESCE(?, display_name)');
      values.push(params.displayName);
    }
    if (params.institutionType !== undefined) {
      sets.push('institution_type = ?');
      values.push(params.institutionType);
    }
    if (params.isAdmin !== undefined) {
      sets.push('is_admin = ?');
      values.push(params.isAdmin ? 1 : 0);
    }
    if (params.subscriptionType !== undefined) {
      sets.push('subscription_type = ?');
      values.push(params.subscriptionType);
    }
    if (params.subscriptionStatus !== undefined) {
      sets.push('subscription_status = ?');
      values.push(params.subscriptionStatus);
    }
    if (params.expiresAt !== undefined) {
      sets.push('expires_at = ?');
      values.push(params.expiresAt);
    }

    values.push(params.id);
    await this.db
      .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  async migrateOwnedDataUid(oldUid: string, newUid: string): Promise<void> {
    if (!oldUid || !newUid || oldUid === newUid) return;
    const now = nowUtcIso();

    const existingNewProfile = await this.db
      .prepare('SELECT id FROM teacher_profiles WHERE user_uid = ? LIMIT 1')
      .bind(newUid)
      .first<{ id: number }>();

    if (existingNewProfile) {
      await this.db.prepare('DELETE FROM teacher_profiles WHERE user_uid = ?').bind(oldUid).run();
    } else {
      await this.db
        .prepare('UPDATE teacher_profiles SET user_uid = ?, updated_at = ? WHERE user_uid = ?')
        .bind(newUid, now, oldUid)
        .run();
    }

    await this.db.prepare('UPDATE monthly_models SET user_uid = ? WHERE user_uid = ?').bind(newUid, oldUid).run();
    await this.db.prepare('UPDATE students SET user_uid = ? WHERE user_uid = ?').bind(newUid, oldUid).run();
    await this.db.prepare('UPDATE terms SET user_uid = ? WHERE user_uid = ?').bind(newUid, oldUid).run();
    await this.db.prepare('UPDATE sync_tombstones SET user_uid = ? WHERE user_uid = ?').bind(newUid, oldUid).run();
  }

  async deleteDuplicateUserRowById(id: number): Promise<void> {
    await this.db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  }

  async updateOwnRole(uid: string, userRole: UserRole, institutionType?: InstitutionType): Promise<void> {
    if (institutionType) {
      await this.db
        .prepare('UPDATE users SET user_role = ?, institution_type = ?, last_active_at = ? WHERE uid = ?')
        .bind(userRole, institutionType, nowUtcIso(), uid)
        .run();
    } else {
      await this.db
        .prepare('UPDATE users SET user_role = ?, last_active_at = ? WHERE uid = ?')
        .bind(userRole, nowUtcIso(), uid)
        .run();
    }
  }

  async adminUpdateUser(params: {
    targetUid: string;
    email?: string;
    subscriptionType?: SubscriptionType;
    subscriptionStatus?: SubscriptionStatus;
    userRole?: UserRole;
    institutionType?: InstitutionType;
  }): Promise<UserRow | null> {
    const existing =
      (await this.findUserByUid(params.targetUid)) ||
      (params.email ? await this.findBestUserRow(params.targetUid, params.email) : null);

    if (!existing) return null;

    const cleanEmail = normalizeEmail(params.email || existing.email);
    const nextType = params.subscriptionType ?? normalizeSubType(existing.subscription_type);
    const nextStatus =
      params.subscriptionStatus ??
      (params.subscriptionType && params.subscriptionType !== 'trial'
        ? 'active'
        : (existing.subscription_status as SubscriptionStatus));
    const nextRole = params.userRole ?? normalizeRole(existing.user_role);
    const nextInst = params.institutionType ?? normalizeInstitution(existing.institution_type);

    const nowMs = Date.now();
    let nextExpiresAt: string | null = existing.expires_at;

    if (nextStatus === 'cancelled' || nextStatus === 'suspended') {
      await this.addCancelledEmail(cleanEmail);
    } else if (nextStatus === 'active') {
      await this.removeCancelledEmail(cleanEmail);
      if (nextType === 'lifetime') {
        nextExpiresAt = null;
      } else if (nextType === 'yearly') {
        nextExpiresAt = new Date(nowMs + YEARLY_DURATION_MS).toISOString();
      } else if (nextType === 'monthly') {
        nextExpiresAt = new Date(nowMs + MONTHLY_DURATION_MS).toISOString();
      } else if (nextType === 'trial') {
        nextExpiresAt = new Date(nowMs + TRIAL_DURATION_MS).toISOString();
      }
    } else if (nextStatus === 'pending' && nextType === 'trial') {
      await this.removeCancelledEmail(cleanEmail);
      if (!nextExpiresAt) {
        nextExpiresAt = new Date(nowMs + TRIAL_DURATION_MS).toISOString();
      }
    }

    await this.db
      .prepare(
        `UPDATE users
         SET subscription_type = ?,
             subscription_status = ?,
             expires_at = ?,
             user_role = ?,
             institution_type = ?,
             last_active_at = ?
         WHERE id = ?`
      )
      .bind(nextType, nextStatus, nextExpiresAt, nextRole, nextInst, nowUtcIso(), existing.id)
      .run();

    return this.findUserByUid(existing.uid);
  }

  async deleteAllUserData(uid: string, emailHint?: string | null): Promise<void> {
    const existing = await this.findUserByUid(uid);
    const cleanEmail = normalizeEmail(emailHint || existing?.email || '');

    if (existing && existing.is_admin === 0 && cleanEmail) {
      const createdIso = normalizeToUtcIso(existing.created_at) || nowUtcIso();
      const createdMs = parseDbDateMs(createdIso) ?? Date.now();
      const trialExpIso =
        existing.subscription_type === 'trial' && existing.expires_at
          ? normalizeToUtcIso(existing.expires_at) || new Date(createdMs + TRIAL_DURATION_MS).toISOString()
          : new Date(createdMs + TRIAL_DURATION_MS).toISOString();
      await this.recordUsedTrialIfAbsent(cleanEmail, createdIso, trialExpIso);
    }

    await this.db
      .prepare(
        `DELETE FROM student_monthly_records
         WHERE student_id IN (SELECT id FROM students WHERE user_uid = ?)
            OR model_id IN (SELECT id FROM monthly_models WHERE user_uid = ?)`
      )
      .bind(uid, uid)
      .run();

    await this.db
      .prepare(
        `DELETE FROM term_selected_models
         WHERE term_id IN (SELECT id FROM terms WHERE user_uid = ?)
            OR model_id IN (SELECT id FROM monthly_models WHERE user_uid = ?)`
      )
      .bind(uid, uid)
      .run();

    await this.db
      .prepare(
        `DELETE FROM custom_columns
         WHERE model_id IN (SELECT id FROM monthly_models WHERE user_uid = ?)`
      )
      .bind(uid)
      .run();

    await this.db.prepare('DELETE FROM terms WHERE user_uid = ?').bind(uid).run();
    await this.db.prepare('DELETE FROM students WHERE user_uid = ?').bind(uid).run();
    await this.db.prepare('DELETE FROM monthly_models WHERE user_uid = ?').bind(uid).run();
    await this.db.prepare('DELETE FROM teacher_profiles WHERE user_uid = ?').bind(uid).run();
    await this.db.prepare('DELETE FROM sync_tombstones WHERE user_uid = ?').bind(uid).run();
    await this.db.prepare('DELETE FROM users WHERE uid = ?').bind(uid).run();
  }

  formatUser(env: Partial<WorkerEnv>, row: UserWithProfileRow, cancelledEmails: Set<string>): FormattedUser {
    const email = normalizeEmail(row.email || '');
    const isAdmin = isAdminEmail(env, email) || row.is_admin === 1;
    const isCancelled =
      !isAdmin &&
      (cancelledEmails.has(email) ||
        row.subscription_status === 'cancelled' ||
        row.subscription_status === 'suspended');

    const type: SubscriptionType = isAdmin ? 'lifetime' : normalizeSubType(row.subscription_type);
    const createdAt = normalizeToUtcIso(row.created_at) || nowUtcIso();
    const lastActiveAt = normalizeToUtcIso(row.last_active_at) || createdAt;
    let expiresAt = normalizeToUtcIso(row.expires_at);

    if (!isAdmin && (type === 'trial' || row.subscription_status === 'pending') && !expiresAt) {
      const createdMs = parseDbDateMs(createdAt) ?? Date.now();
      expiresAt = new Date(createdMs + TRIAL_DURATION_MS).toISOString();
    }

    let status: SubscriptionStatus = isCancelled
      ? 'cancelled'
      : ((row.subscription_status as SubscriptionStatus) || (isAdmin ? 'active' : 'pending'));

    if (!isCancelled && !isAdmin) {
      if (type === 'lifetime' && status === 'active') {
        expiresAt = null;
      } else if (status !== 'expired' && expiresAt) {
        const expMs = parseDbDateMs(expiresAt);
        if (expMs !== null && expMs <= Date.now()) {
          status = 'expired';
        }
      }
    }

    if (isAdmin) {
      status = 'active';
      expiresAt = null;
    }

    const formatted: FormattedUser = {
      uid: row.uid,
      email,
      displayName: row.display_name || row.teacher_name || email,
      userRole: normalizeRole(row.user_role),
      institutionType: normalizeInstitution(row.institution_type),
      isAdmin,
      subscriptionType: type,
      subscriptionStatus: status,
      expiresAt,
      lastActiveAt,
      createdAt,
    };

    if (row.school_name) formatted.schoolName = row.school_name;
    if (row.subject) formatted.subject = row.subject;

    return formatted;
  }
}
