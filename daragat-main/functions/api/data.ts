// Cloudflare Pages Function: /api/data
// - كل الطلبات تتطلب Firebase ID Token صالحاً (يُتحقق من توقيعه).
// - هوية المستخدم تؤخذ من التوكن فقط، ولا يُقبل أي uid من الطلب (ما عدا قراءة الأدمن).
// - كل عمليات الكتابة تتحقق من ملكية السجلات، فلا يمكن لمستخدم تعديل سجلات غيره.

import {
  authenticate,
  checkAccountAccess,
  fail,
  json,
  methodNotAllowed,
  num,
  safeId,
  str,
  type Caller,
  type EventContext,
} from '../_lib/auth';
import { deleteAllUserData } from '../_lib/userdata';

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_MODELS = 200;
const MAX_STUDENTS_PER_MODEL = 1000;
const MAX_COLUMNS = 50;
const MAX_TERMS = 100;
const BATCH_CHUNK = 40;

export async function onRequest(context: EventContext): Promise<Response> {
  switch (context.request.method) {
    case 'GET':
      return handleGet(context);
    case 'POST':
      return handlePost(context);
    case 'DELETE':
      return handleDelete(context);
    default:
      return methodNotAllowed();
  }
}

// ----------------------------------------------------------------------------- GET

async function handleGet({ request, env }: EventContext): Promise<Response> {
  const caller = await authenticate(request, env);
  if (caller instanceof Response) return caller;

  const requested = new URL(request.url).searchParams.get('uid');
  // الأدمن فقط يستطيع قراءة بيانات مستخدم آخر
  const uid = caller.isAdmin && requested ? requested : caller.uid;
  if (requested && requested !== caller.uid && !caller.isAdmin) {
    return fail(403, 'غير مصرّح لك بالوصول إلى هذه البيانات.');
  }

  const blocked = await checkAccountAccess(env, caller);
  if (blocked) return blocked;

  if (!env.DB) return json({ success: true, data: null, message: 'D1 not configured' });

  try {
    const db = env.DB;
    const [modelsR, colsR, studentsR, termsR, termModelsR, profileR] = await Promise.all([
      db.prepare('SELECT * FROM monthly_models WHERE user_uid = ? ORDER BY created_at ASC').bind(uid).all(),
      db
        .prepare(
          `SELECT c.* FROM custom_columns c
           JOIN monthly_models m ON m.id = c.model_id
           WHERE m.user_uid = ? ORDER BY c.order_index ASC`
        )
        .bind(uid)
        .all(),
      db
        .prepare(
          `SELECT r.model_id, s.id, s.name, s.grade_level, s.section,
                  r.written_raw_score, r.scores, r.notes
           FROM student_monthly_records r
           JOIN students s ON s.id = r.student_id
           WHERE s.user_uid = ? ORDER BY s.name ASC`
        )
        .bind(uid)
        .all(),
      db.prepare('SELECT * FROM terms WHERE user_uid = ? ORDER BY created_at ASC').bind(uid).all(),
      db
        .prepare(
          `SELECT t.term_id, t.model_id FROM term_selected_models t
           JOIN terms x ON x.id = t.term_id
           WHERE x.user_uid = ? ORDER BY t.order_index ASC`
        )
        .bind(uid)
        .all(),
      db.prepare('SELECT * FROM teacher_profiles WHERE user_uid = ? ORDER BY id DESC LIMIT 1').bind(uid).all(),
    ]);

    const colsByModel = new Map<string, any[]>();
    for (const c of colsR.results as any[]) {
      const list = colsByModel.get(c.model_id) || [];
      list.push({ id: c.id, name: c.name, maxScore: c.max_score });
      colsByModel.set(c.model_id, list);
    }
    const studentsByModel = new Map<string, any[]>();
    for (const r of studentsR.results as any[]) {
      let scores: Record<string, number | null> = {};
      try {
        scores = JSON.parse(r.scores || '{}');
      } catch {
        scores = {};
      }
      const list = studentsByModel.get(r.model_id) || [];
      list.push({
        id: r.id,
        name: r.name,
        gradeLevel: r.grade_level || '',
        section: r.section || '',
        writtenRawScore: r.written_raw_score ?? null,
        scores,
        notes: r.notes || '',
      });
      studentsByModel.set(r.model_id, list);
    }
    const models = (modelsR.results as any[]).map((m) => ({
      id: m.id,
      name: m.name,
      subject: m.subject,
      academicYear: m.academic_year,
      totalMaxScore: m.total_max_score,
      writtenWeight: m.written_weight ?? null,
      writtenMaxScore: m.written_max_score,
      customColumns: colsByModel.get(m.id) || [],
      students: studentsByModel.get(m.id) || [],
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    const selByTerm = new Map<string, string[]>();
    for (const r of termModelsR.results as any[]) {
      const list = selByTerm.get(r.term_id) || [];
      list.push(r.model_id);
      selByTerm.set(r.term_id, list);
    }
    const terms = (termsR.results as any[]).map((t) => ({
      id: t.id,
      name: t.name,
      calculationMode: t.calculation_mode,
      notes: t.notes || '',
      selectedModelIds: selByTerm.get(t.id) || [],
    }));

    const p: any = (profileR.results as any[])[0];
    const profile = p
      ? {
          teacherName: p.teacher_name,
          schoolName: p.school_name,
          subject: p.subject,
          academicYear: p.academic_year,
          governorate: p.governorate || '',
        }
      : null;

    return json({ success: true, data: { models, terms, profile } });
  } catch (err) {
    console.error('GET /api/data failed:', err);
    return fail(500, 'تعذر جلب البيانات.');
  }
}

// ----------------------------------------------------------------------------- POST

async function handlePost({ request, env }: EventContext): Promise<Response> {
  const caller = await authenticate(request, env);
  if (caller instanceof Response) return caller;

  const blocked = await checkAccountAccess(env, caller, { requireActive: true });
  if (blocked) return blocked;

  if (!env.DB) return json({ success: true, message: 'D1 not configured; saved locally only' });

  let body: any;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return fail(413, 'حجم البيانات كبير جداً.');
    body = JSON.parse(text);
  } catch {
    return fail(400, 'صيغة الطلب غير صحيحة.');
  }
  if (!body || typeof body !== 'object') return fail(400, 'صيغة الطلب غير صحيحة.');

  const models: any[] = Array.isArray(body.models) ? body.models : [];
  const terms: any[] = Array.isArray(body.terms) ? body.terms : [];
  if (models.length > MAX_MODELS || terms.length > MAX_TERMS) return fail(413, 'عدد العناصر كبير جداً.');

  try {
    await saveAll(env.DB, caller, body.profile, models, terms);
    return json({ success: true, message: 'Data synced successfully' });
  } catch (err) {
    console.error('POST /api/data failed:', err);
    return fail(500, 'تعذر حفظ البيانات.');
  }
}

async function runChunked(db: any, statements: any[]) {
  for (let i = 0; i < statements.length; i += BATCH_CHUNK) {
    await db.batch(statements.slice(i, i + BATCH_CHUNK));
  }
}

async function saveAll(db: any, caller: Caller, profile: any, models: any[], terms: any[]) {
  const uid = caller.uid;

  // 1) سجل المستخدم (مطلوب بسبب المفتاح الأجنبي).
  // للمستخدمين الجدد القادمين: يتم ضبطهم كفترة تجريبية 48 ساعة (pending) مع عداد التجربة بدون تحويلهم لمشتركين نشطين.
  // لا يؤثر على أي مستخدم حالي في قاعدة البيانات بفضل INSERT OR IGNORE.
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (uid, email, subscription_type, subscription_status, expires_at, last_active_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now', '+48 hours'), datetime('now'), datetime('now'))`
    )
    .bind(
      uid,
      caller.email,
      caller.isAdmin ? 'lifetime' : 'trial',
      caller.isAdmin ? 'active' : 'pending'
    )
    .run();
  await db.prepare(`UPDATE users SET last_active_at = datetime('now') WHERE uid = ?`).bind(uid).run();

  const stmts: any[] = [];

  // 2) ملف المعلم
  if (profile && typeof profile === 'object') {
    const vals = [
      str(profile.teacherName, 200),
      str(profile.schoolName, 200),
      str(profile.subject, 200),
      str(profile.academicYear, 50),
      str(profile.governorate, 100),
    ];
    const upd = await db
      .prepare(
        `UPDATE teacher_profiles SET teacher_name = ?, school_name = ?, subject = ?, academic_year = ?,
           governorate = ?, updated_at = datetime('now') WHERE user_uid = ?`
      )
      .bind(...vals, uid)
      .run();
    if (!upd.meta?.changes) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO teacher_profiles (user_uid, teacher_name, school_name, subject, academic_year, governorate, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(uid, ...vals)
      );
    }
  }

  // 3) النماذج الشهرية، الأعمدة، الطلاب، والدرجات (كل عبارة تتحقق من الملكية)
  for (const m of models) {
    const mid = safeId(m?.id);
    if (!mid) continue;

    stmts.push(
      db
        .prepare(
          `INSERT INTO monthly_models (id, user_uid, name, subject, academic_year, total_max_score, written_max_score, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, subject = excluded.subject, academic_year = excluded.academic_year,
             total_max_score = excluded.total_max_score, written_max_score = excluded.written_max_score,
             updated_at = datetime('now')
           WHERE monthly_models.user_uid = excluded.user_uid`
        )
        .bind(
          mid,
          uid,
          str(m.name, 200),
          str(m.subject, 200),
          str(m.academicYear, 50),
          num(m.totalMaxScore, 100, 0, 100000),
          num(m.writtenMaxScore, 100, 0, 100000)
        )
    );

    const cols: any[] = Array.isArray(m.customColumns) ? m.customColumns.slice(0, MAX_COLUMNS) : [];
    cols.forEach((col, i) => {
      const cid = safeId(col?.id);
      if (!cid) return;
      stmts.push(
        db
          .prepare(
            `INSERT INTO custom_columns (id, model_id, name, max_score, order_index)
             SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM monthly_models WHERE id = ? AND user_uid = ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name, max_score = excluded.max_score, order_index = excluded.order_index
             WHERE custom_columns.model_id = excluded.model_id`
          )
          .bind(cid, mid, str(col.name, 200), num(col.maxScore, 10, 0, 100000), i, mid, uid)
      );
    });

    const students: any[] = Array.isArray(m.students) ? m.students.slice(0, MAX_STUDENTS_PER_MODEL) : [];
    for (const st of students) {
      const sid = safeId(st?.id);
      if (!sid) continue;
      stmts.push(
        db
          .prepare(
            `INSERT INTO students (id, user_uid, name, grade_level, section, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name, grade_level = excluded.grade_level, section = excluded.section
             WHERE students.user_uid = excluded.user_uid`
          )
          .bind(sid, uid, str(st.name, 300), str(st.gradeLevel, 100), str(st.section, 50))
      );

      const raw = st.writtenRawScore;
      const rawScore = raw === null || raw === undefined || raw === '' ? null : num(raw, 0, -100000, 100000);
      let scoresJson = '{}';
      try {
        const s = JSON.stringify(st.scores && typeof st.scores === 'object' ? st.scores : {});
        scoresJson = s.length <= 20000 ? s : '{}';
      } catch {
        scoresJson = '{}';
      }
      stmts.push(
        db
          .prepare(
            `INSERT INTO student_monthly_records (student_id, model_id, written_raw_score, scores, notes, updated_at)
             SELECT ?, ?, ?, ?, ?, datetime('now')
             WHERE EXISTS (SELECT 1 FROM students WHERE id = ? AND user_uid = ?)
               AND EXISTS (SELECT 1 FROM monthly_models WHERE id = ? AND user_uid = ?)
             ON CONFLICT(student_id, model_id) DO UPDATE SET
               written_raw_score = excluded.written_raw_score, scores = excluded.scores,
               notes = excluded.notes, updated_at = datetime('now')`
          )
          .bind(sid, mid, rawScore, scoresJson, str(st.notes, 2000), sid, uid, mid, uid)
      );
    }
  }

  // 4) الفصول الدراسية
  for (const t of terms) {
    const tid = safeId(t?.id);
    if (!tid) continue;
    const mode = ['average', 'single', 'sum'].includes(t.calculationMode) ? t.calculationMode : 'average';
    stmts.push(
      db
        .prepare(
          `INSERT INTO terms (id, user_uid, name, calculation_mode, notes, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, calculation_mode = excluded.calculation_mode, notes = excluded.notes
           WHERE terms.user_uid = excluded.user_uid`
        )
        .bind(tid, uid, str(t.name, 200), mode, str(t.notes, 2000))
    );

    if (Array.isArray(t.selectedModelIds)) {
      stmts.push(
        db
          .prepare(
            `DELETE FROM term_selected_models
             WHERE term_id = ? AND term_id IN (SELECT id FROM terms WHERE user_uid = ?)`
          )
          .bind(tid, uid)
      );
      t.selectedModelIds.slice(0, MAX_MODELS).forEach((rawMid: unknown, i: number) => {
        const mid = safeId(rawMid);
        if (!mid) return;
        stmts.push(
          db
            .prepare(
              `INSERT INTO term_selected_models (term_id, model_id, order_index)
               SELECT ?, ?, ?
               WHERE EXISTS (SELECT 1 FROM terms WHERE id = ? AND user_uid = ?)
                 AND EXISTS (SELECT 1 FROM monthly_models WHERE id = ? AND user_uid = ?)`
            )
            .bind(tid, mid, i, tid, uid, mid, uid)
        );
      });
    }
  }

  await runChunked(db, stmts);
}

// ----------------------------------------------------------------------------- DELETE

async function handleDelete({ request, env }: EventContext): Promise<Response> {
  const caller = await authenticate(request, env);
  if (caller instanceof Response) return caller;

  // يحذف حساب المستخدم الموثّق فقط. لا يُقبل uid من الطلب.
  if (!env.DB) return json({ success: true, message: 'D1 not configured' });
  try {
    await deleteAllUserData(env, caller.uid, true);
    return json({ success: true, message: 'Account data deleted' });
  } catch (err) {
    console.error('DELETE /api/data failed:', err);
    return fail(500, 'تعذر حذف البيانات.');
  }
}
