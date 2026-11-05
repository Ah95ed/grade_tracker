import type { Env } from './auth';

/** يحذف كل بيانات مستخدم من D1 في معاملة واحدة (batch). */
export async function deleteAllUserData(env: Env, uid: string, removeUserRow: boolean): Promise<void> {
  if (!env.DB) return;
  const db = env.DB;
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
