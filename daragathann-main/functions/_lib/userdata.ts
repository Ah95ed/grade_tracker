import { isAdminEmail, type Env } from './auth';

function toUtcIso(v: unknown): string | null {
  if (!v || typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return s.replace(' ', 'T') + 'Z';
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return s + 'Z';
  }
  return s;
}

/** يحذف كل بيانات مستخدم من D1 في معاملة واحدة (batch) مع إبقاء سجل التجربة في used_trials للأبد. */
export async function deleteAllUserData(env: Env, uid: string, removeUserRow: boolean): Promise<void> {
  if (!env.DB) return;
  const db = env.DB;

  if (removeUserRow) {
    try {
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS used_trials (
             email TEXT PRIMARY KEY,
             first_trial_at TEXT NOT NULL,
             trial_expires_at TEXT DEFAULT NULL
           )`
        )
        .run();
      try {
        await db.prepare('ALTER TABLE used_trials ADD COLUMN trial_expires_at TEXT DEFAULT NULL').run();
      } catch {}

      const userRow = await db
        .prepare('SELECT email, created_at, expires_at, subscription_type FROM users WHERE uid = ? LIMIT 1')
        .bind(uid)
        .first<{ email?: string; created_at?: string; expires_at?: string; subscription_type?: string }>();

      const cleanEmail = String(userRow?.email || '').trim().toLowerCase();
      if (cleanEmail && !isAdminEmail(env, cleanEmail)) {
        const firstTrialAt = toUtcIso(userRow?.created_at) || new Date().toISOString();
        const createdMs = Date.parse(firstTrialAt);
        const fallbackExp = new Date((Number.isNaN(createdMs) ? Date.now() : createdMs) + 72 * 60 * 60 * 1000).toISOString();
        const trialExpiresAt =
          userRow?.subscription_type === 'trial' && userRow?.expires_at
            ? toUtcIso(userRow.expires_at) || fallbackExp
            : fallbackExp;

        await db
          .prepare(
            `INSERT OR IGNORE INTO used_trials (email, first_trial_at, trial_expires_at)
             VALUES (?, ?, ?)`
          )
          .bind(cleanEmail, firstTrialAt, trialExpiresAt)
          .run();
      }
    } catch (err) {
      console.warn('Preserving used_trials record failed:', err);
    }
  }

  const q = (sql: string) => db.prepare(sql).bind(uid);
  const stmts = [
    q('DELETE FROM student_monthly_records WHERE student_id IN (SELECT id FROM students WHERE user_uid = ?)'),
    q('DELETE FROM student_monthly_records WHERE model_id IN (SELECT id FROM monthly_models WHERE user_uid = ?)'),
    q('DELETE FROM term_selected_models WHERE term_id IN (SELECT id FROM terms WHERE user_uid = ?)'),
    q('DELETE FROM term_selected_models WHERE model_id IN (SELECT id FROM monthly_models WHERE user_uid = ?)'),
    q('DELETE FROM custom_columns WHERE model_id IN (SELECT id FROM monthly_models WHERE user_uid = ?)'),
    q('DELETE FROM students WHERE user_uid = ?'),
    q('DELETE FROM monthly_models WHERE user_uid = ?'),
    q('DELETE FROM terms WHERE user_uid = ?'),
    q('DELETE FROM teacher_profiles WHERE user_uid = ?'),
  ];
  if (removeUserRow) stmts.push(q('DELETE FROM users WHERE uid = ?'));
  await db.batch(stmts);
}
