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
  type D1Like,
  type EventContext,
} from '../_lib/auth';
import { deleteAllUserData } from '../_lib/userdata';

let dataSchemaReady: Promise<void> | null = null;
function ensureDataSchema(db: D1Like): Promise<void> {
  if (!dataSchemaReady) {
    dataSchemaReady = (async () => {
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            display_name TEXT DEFAULT NULL,
            user_role TEXT DEFAULT 'teacher',
            institution_type TEXT NOT NULL DEFAULT 'school',
            is_admin INTEGER NOT NULL DEFAULT 0,
            subscription_type TEXT NOT NULL DEFAULT 'trial',
            subscription_status TEXT NOT NULL DEFAULT 'pending',
            expires_at TEXT DEFAULT NULL,
            last_active_at TEXT DEFAULT (datetime('now')),
            created_at TEXT DEFAULT (datetime('now'))
          )`
        )
        .run();

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

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS teacher_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_uid TEXT NOT NULL,
            teacher_name TEXT NOT NULL DEFAULT '',
            school_name TEXT NOT NULL DEFAULT '',
            subject TEXT NOT NULL DEFAULT '',
            academic_year TEXT NOT NULL DEFAULT '',
            governorate TEXT DEFAULT '',
            institution_type TEXT DEFAULT 'school',
            university_name TEXT DEFAULT '',
            college_name TEXT DEFAULT '',
            department_name TEXT DEFAULT '',
            updated_at TEXT DEFAULT (datetime('now'))
          )`
        )
        .run();

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS monthly_models (
            id TEXT PRIMARY KEY NOT NULL,
            user_uid TEXT NOT NULL,
            name TEXT NOT NULL,
            subject TEXT NOT NULL DEFAULT '',
            academic_year TEXT NOT NULL DEFAULT '',
            total_max_score INTEGER NOT NULL DEFAULT 100,
            written_weight INTEGER DEFAULT NULL,
            written_max_score INTEGER NOT NULL DEFAULT 100,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          )`
        )
        .run();

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS custom_columns (
            id TEXT PRIMARY KEY NOT NULL,
            model_id TEXT NOT NULL,
            name TEXT NOT NULL,
            max_score INTEGER NOT NULL DEFAULT 10,
            order_index INTEGER NOT NULL DEFAULT 0
          )`
        )
        .run();

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY NOT NULL,
            user_uid TEXT NOT NULL,
            name TEXT NOT NULL,
            grade_level TEXT NOT NULL DEFAULT '',
            section TEXT NOT NULL DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
          )`
        )
        .run();

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS student_monthly_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            model_id TEXT NOT NULL,
            written_raw_score REAL DEFAULT NULL,
            scores TEXT DEFAULT '{}',
            notes TEXT DEFAULT '',
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE (student_id, model_id)
          )`
        )
        .run();

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS terms (
            id TEXT PRIMARY KEY NOT NULL,
            user_uid TEXT NOT NULL,
            name TEXT NOT NULL,
            calculation_mode TEXT NOT NULL DEFAULT 'average',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
          )`
        )
        .run();

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS term_selected_models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term_id TEXT NOT NULL,
            model_id TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            UNIQUE (term_id, model_id)
          )`
        )
        .run();

      const migrations = [
        "ALTER TABLE teacher_profiles ADD COLUMN governorate TEXT DEFAULT ''",
        "ALTER TABLE teacher_profiles ADD COLUMN institution_type TEXT DEFAULT 'school'",
        "ALTER TABLE teacher_profiles ADD COLUMN university_name TEXT DEFAULT ''",
        "ALTER TABLE teacher_profiles ADD COLUMN college_name TEXT DEFAULT ''",
        "ALTER TABLE teacher_profiles ADD COLUMN department_name TEXT DEFAULT ''",
        'ALTER TABLE teacher_profiles ADD COLUMN updated_at TEXT DEFAULT NULL',
        'ALTER TABLE monthly_models ADD COLUMN written_weight INTEGER DEFAULT NULL',
        'ALTER TABLE monthly_models ADD COLUMN created_at TEXT DEFAULT NULL',
        'ALTER TABLE monthly_models ADD COLUMN updated_at TEXT DEFAULT NULL',
        'ALTER TABLE custom_columns ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0',
        "ALTER TABLE terms ADD COLUMN calculation_mode TEXT NOT NULL DEFAULT 'average'",
        "ALTER TABLE terms ADD COLUMN notes TEXT DEFAULT ''",
        'ALTER TABLE terms ADD COLUMN created_at TEXT DEFAULT NULL',
        'ALTER TABLE term_selected_models ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE student_monthly_records ADD COLUMN written_raw_score REAL DEFAULT NULL',
        "ALTER TABLE student_monthly_records ADD COLUMN scores TEXT DEFAULT '{}'",
        "ALTER TABLE student_monthly_records ADD COLUMN notes TEXT DEFAULT ''",
        'ALTER TABLE student_monthly_records ADD COLUMN updated_at TEXT DEFAULT NULL',
        'ALTER TABLE student_monthly_records ADD COLUMN participation_history TEXT DEFAULT NULL',
        'ALTER TABLE student_monthly_records ADD COLUMN attendance_records TEXT DEFAULT NULL',
        "ALTER TABLE monthly_models ADD COLUMN grade_level TEXT DEFAULT ''",
        "ALTER TABLE monthly_models ADD COLUMN teacher_name TEXT DEFAULT ''",
        'ALTER TABLE monthly_models ADD COLUMN assigned_sections TEXT DEFAULT NULL',
        'ALTER TABLE monthly_models ADD COLUMN written_score_mode TEXT DEFAULT NULL',
        'ALTER TABLE monthly_models ADD COLUMN rounding_mode TEXT DEFAULT NULL',
        'ALTER TABLE monthly_models ADD COLUMN rounding_threshold REAL DEFAULT NULL',
        'ALTER TABLE monthly_models ADD COLUMN final_score_operation TEXT DEFAULT NULL',
        'ALTER TABLE monthly_models ADD COLUMN column_labels TEXT DEFAULT NULL',
        'ALTER TABLE custom_columns ADD COLUMN is_attendance INTEGER DEFAULT 0',
        'ALTER TABLE custom_columns ADD COLUMN attendance_config TEXT DEFAULT NULL',
        "ALTER TABLE terms ADD COLUMN subject TEXT DEFAULT ''",
        "ALTER TABLE terms ADD COLUMN grade_level TEXT DEFAULT ''",
        "ALTER TABLE terms ADD COLUMN teacher_name TEXT DEFAULT ''",
        'ALTER TABLE terms ADD COLUMN assigned_sections TEXT DEFAULT NULL',
        'ALTER TABLE terms ADD COLUMN rounding_mode TEXT DEFAULT NULL',
        'ALTER TABLE terms ADD COLUMN rounding_threshold REAL DEFAULT NULL',
        "ALTER TABLE terms ADD COLUMN source_type TEXT DEFAULT 'models'",
        'ALTER TABLE terms ADD COLUMN selected_term_ids TEXT DEFAULT NULL',
      ];
      for (const sql of migrations) {
        try {
          await db.prepare(sql).run();
        } catch {
          // العمود موجود مسبقاً
        }
      }
    })().catch((e) => {
      dataSchemaReady = null;
      throw e;
    });
  }
  return dataSchemaReady;
}

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
    await ensureDataSchema(db);
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
                  r.written_raw_score, r.scores, r.notes,
                  r.participation_history, r.attendance_records
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

    const safeJson = <T,>(raw: unknown, fallback: T): T => {
      if (typeof raw !== 'string' || !raw) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    };

    const colsByModel = new Map<string, any[]>();
    for (const c of colsR.results as any[]) {
      const list = colsByModel.get(c.model_id) || [];
      const colObj: any = { id: c.id, name: c.name, maxScore: c.max_score };
      if (c.is_attendance) colObj.isAttendance = true;
      const attCfg = safeJson<any>(c.attendance_config, null);
      if (attCfg) colObj.attendanceConfig = attCfg;
      list.push(colObj);
      colsByModel.set(c.model_id, list);
    }
    const studentsByModel = new Map<string, any[]>();
    for (const r of studentsR.results as any[]) {
      const scores = safeJson<Record<string, number | null>>(r.scores, {});
      const participationHistory = safeJson<any>(r.participation_history, null);
      const attendanceRecords = safeJson<any>(r.attendance_records, null);
      const list = studentsByModel.get(r.model_id) || [];
      list.push({
        id: r.id,
        name: r.name,
        gradeLevel: r.grade_level || '',
        section: r.section || '',
        writtenRawScore: r.written_raw_score ?? null,
        scores,
        ...(participationHistory ? { participationHistory } : {}),
        ...(attendanceRecords ? { attendanceRecords } : {}),
        notes: r.notes || '',
      });
      studentsByModel.set(r.model_id, list);
    }
    const models = (modelsR.results as any[]).map((m) => {
      const assignedSections = safeJson<string[] | null>(m.assigned_sections, null);
      const finalScoreOperation = safeJson<any>(m.final_score_operation, null);
      const columnLabels = safeJson<any>(m.column_labels, null);
      return {
        id: m.id,
        name: m.name,
        subject: m.subject,
        ...(m.grade_level ? { gradeLevel: m.grade_level } : {}),
        ...(m.teacher_name ? { teacherName: m.teacher_name } : {}),
        ...(assignedSections ? { assignedSections } : {}),
        academicYear: m.academic_year,
        totalMaxScore: m.total_max_score,
        writtenWeight: m.written_weight ?? null,
        writtenMaxScore: m.written_max_score,
        ...(m.written_score_mode ? { writtenScoreMode: m.written_score_mode } : {}),
        ...(m.rounding_mode ? { roundingMode: m.rounding_mode } : {}),
        ...(m.rounding_threshold !== null && m.rounding_threshold !== undefined
          ? { roundingThreshold: m.rounding_threshold }
          : {}),
        ...(finalScoreOperation ? { finalScoreOperation } : {}),
        ...(columnLabels ? { columnLabels } : {}),
        customColumns: colsByModel.get(m.id) || [],
        students: studentsByModel.get(m.id) || [],
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      };
    });

    const selByTerm = new Map<string, string[]>();
    for (const r of termModelsR.results as any[]) {
      const list = selByTerm.get(r.term_id) || [];
      list.push(r.model_id);
      selByTerm.set(r.term_id, list);
    }
    const terms = (termsR.results as any[]).map((t) => {
      const assignedSections = safeJson<string[] | null>(t.assigned_sections, null);
      const selectedTermIds = safeJson<string[] | null>(t.selected_term_ids, null);
      return {
        id: t.id,
        name: t.name,
        ...(t.subject ? { subject: t.subject } : {}),
        ...(t.grade_level ? { gradeLevel: t.grade_level } : {}),
        ...(t.teacher_name ? { teacherName: t.teacher_name } : {}),
        ...(assignedSections ? { assignedSections } : {}),
        ...(t.rounding_mode ? { roundingMode: t.rounding_mode } : {}),
        ...(t.rounding_threshold !== null && t.rounding_threshold !== undefined
          ? { roundingThreshold: t.rounding_threshold }
          : {}),
        ...(t.source_type ? { sourceType: t.source_type } : {}),
        ...(selectedTermIds ? { selectedTermIds } : {}),
        calculationMode: t.calculation_mode,
        notes: t.notes || '',
        selectedModelIds: selByTerm.get(t.id) || [],
      };
    });

    const p: any = (profileR.results as any[])[0];
    const profile = p
      ? {
          teacherName: p.teacher_name || '',
          schoolName: p.school_name || '',
          subject: p.subject || '',
          academicYear: p.academic_year || '',
          governorate: p.governorate || '',
          ...(p.institution_type ? { institutionType: p.institution_type } : {}),
          ...(p.university_name ? { universityName: p.university_name } : {}),
          ...(p.college_name ? { collegeName: p.college_name } : {}),
          ...(p.department_name ? { departmentName: p.department_name } : {}),
        }
      : null;

    return json({ success: true, data: { models, terms, profile } });
  } catch (err: any) {
    console.error('GET /api/data failed:', err);
    return fail(500, 'تعذر جلب البيانات من السيرفر السحابي.', {
      detail: err?.message ? String(err.message).slice(0, 180) : undefined,
    });
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
    await ensureDataSchema(env.DB);
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

  // 1) سجل الأدمن فقط إن لم يكن موجوداً؛ أما المستخدم العادي فلا يُنشأ له صف أو تجربة هنا (التجربة تُنشأ مرة واحدة في POST /api/users فقط).
  if (caller.isAdmin) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO users (uid, email, subscription_type, subscription_status, expires_at, last_active_at, created_at)
         VALUES (?, ?, 'lifetime', 'active', NULL, datetime('now'), datetime('now'))`
      )
      .bind(uid, caller.email)
      .run();
  }
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
      profile.institutionType === 'university' ? 'university' : 'school',
      str(profile.universityName, 200),
      str(profile.collegeName, 200),
      str(profile.departmentName, 200),
    ];
    const upd = await db
      .prepare(
        `UPDATE teacher_profiles SET teacher_name = ?, school_name = ?, subject = ?, academic_year = ?,
           governorate = ?, institution_type = ?, university_name = ?, college_name = ?, department_name = ?,
           updated_at = datetime('now') WHERE user_uid = ?`
      )
      .bind(...vals, uid)
      .run();
    if (!upd.meta?.changes) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO teacher_profiles (user_uid, teacher_name, school_name, subject, academic_year, governorate, institution_type, university_name, college_name, department_name, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(uid, ...vals)
      );
    }
  }

  // 3) النماذج الشهرية، الأعمدة، الطلاب، والدرجات (كل عبارة تتحقق من الملكية)
  const seenStudentIds = new Set<string>();
  const safeSerialize = (val: unknown, limit = 20000): string | null => {
    if (val === null || val === undefined) return null;
    try {
      const s = JSON.stringify(val);
      return s.length <= limit ? s : null;
    } catch {
      return null;
    }
  };

  for (const m of models) {
    const mid = safeId(m?.id);
    if (!mid) continue;
    const writtenWeightVal =
      m.writtenWeight === null || m.writtenWeight === undefined || m.writtenWeight === ''
        ? null
        : num(m.writtenWeight, 0, 0, 100);
    const assignedSectionsJson = Array.isArray(m.assignedSections) ? safeSerialize(m.assignedSections, 4000) : null;
    const finalOpJson = m.finalScoreOperation ? safeSerialize(m.finalScoreOperation, 1000) : null;
    const colLabelsJson = m.columnLabels ? safeSerialize(m.columnLabels, 2000) : null;
    const roundingThresh =
      m.roundingThreshold === null || m.roundingThreshold === undefined || m.roundingThreshold === ''
        ? null
        : num(m.roundingThreshold, 0.5, 0, 1);

    stmts.push(
      db
        .prepare(
          `INSERT INTO monthly_models (id, user_uid, name, subject, grade_level, teacher_name, assigned_sections, academic_year, total_max_score, written_weight, written_max_score, written_score_mode, rounding_mode, rounding_threshold, final_score_operation, column_labels, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, subject = excluded.subject, grade_level = excluded.grade_level,
             teacher_name = excluded.teacher_name, assigned_sections = excluded.assigned_sections,
             academic_year = excluded.academic_year, total_max_score = excluded.total_max_score,
             written_weight = excluded.written_weight, written_max_score = excluded.written_max_score,
             written_score_mode = excluded.written_score_mode, rounding_mode = excluded.rounding_mode,
             rounding_threshold = excluded.rounding_threshold, final_score_operation = excluded.final_score_operation,
             column_labels = excluded.column_labels, updated_at = datetime('now')
           WHERE monthly_models.user_uid = excluded.user_uid`
        )
        .bind(
          mid,
          uid,
          str(m.name, 200),
          str(m.subject, 200),
          str(m.gradeLevel, 100),
          str(m.teacherName, 200),
          assignedSectionsJson,
          str(m.academicYear, 50),
          num(m.totalMaxScore, 100, 0, 100000),
          writtenWeightVal,
          num(m.writtenMaxScore, 100, 0, 100000),
          m.writtenScoreMode ? str(m.writtenScoreMode, 30) : null,
          m.roundingMode ? str(m.roundingMode, 30) : null,
          roundingThresh,
          finalOpJson,
          colLabelsJson
        )
    );

    const cols: any[] = Array.isArray(m.customColumns) ? m.customColumns.slice(0, MAX_COLUMNS) : [];
    cols.forEach((col, i) => {
      const cid = safeId(col?.id);
      if (!cid) return;
      const attCfgJson = col.attendanceConfig ? safeSerialize(col.attendanceConfig, 4000) : null;
      stmts.push(
        db
          .prepare(
            `INSERT INTO custom_columns (id, model_id, name, max_score, order_index, is_attendance, attendance_config)
             SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM monthly_models WHERE id = ? AND user_uid = ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name, max_score = excluded.max_score, order_index = excluded.order_index,
               is_attendance = excluded.is_attendance, attendance_config = excluded.attendance_config
             WHERE custom_columns.model_id = excluded.model_id`
          )
          .bind(cid, mid, str(col.name, 200), num(col.maxScore, 10, 0, 100000), i, col.isAttendance ? 1 : 0, attCfgJson, mid, uid)
      );
    });

    const students: any[] = Array.isArray(m.students) ? m.students.slice(0, MAX_STUDENTS_PER_MODEL) : [];
    for (const st of students) {
      const sid = safeId(st?.id);
      if (!sid) continue;
      if (!seenStudentIds.has(sid)) {
        seenStudentIds.add(sid);
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
      }

      const raw = st.writtenRawScore;
      const rawScore = raw === null || raw === undefined || raw === '' ? null : num(raw, 0, -100000, 100000);
      let scoresJson = '{}';
      try {
        const s = JSON.stringify(st.scores && typeof st.scores === 'object' ? st.scores : {});
        scoresJson = s.length <= 20000 ? s : '{}';
      } catch {
        scoresJson = '{}';
      }
      const partHistJson = st.participationHistory ? safeSerialize(st.participationHistory, 20000) : null;
      const attRecJson = st.attendanceRecords ? safeSerialize(st.attendanceRecords, 30000) : null;
      stmts.push(
        db
          .prepare(
            `INSERT INTO student_monthly_records (student_id, model_id, written_raw_score, scores, notes, participation_history, attendance_records, updated_at)
             SELECT ?, ?, ?, ?, ?, ?, ?, datetime('now')
             WHERE EXISTS (SELECT 1 FROM students WHERE id = ? AND user_uid = ?)
               AND EXISTS (SELECT 1 FROM monthly_models WHERE id = ? AND user_uid = ?)
             ON CONFLICT(student_id, model_id) DO UPDATE SET
               written_raw_score = excluded.written_raw_score, scores = excluded.scores,
               notes = excluded.notes, participation_history = excluded.participation_history,
               attendance_records = excluded.attendance_records, updated_at = datetime('now')`
          )
          .bind(sid, mid, rawScore, scoresJson, str(st.notes, 2000), partHistJson, attRecJson, sid, uid, mid, uid)
      );
    }
  }

  // 4) الفصول الدراسية
  for (const t of terms) {
    const tid = safeId(t?.id);
    if (!tid) continue;
    const mode = ['average', 'single', 'sum'].includes(t.calculationMode) ? t.calculationMode : 'average';
    const tAssignedSecJson = Array.isArray(t.assignedSections) ? safeSerialize(t.assignedSections, 4000) : null;
    const tSelectedTermsJson = Array.isArray(t.selectedTermIds) ? safeSerialize(t.selectedTermIds, 4000) : null;
    const tRoundingThresh =
      t.roundingThreshold === null || t.roundingThreshold === undefined || t.roundingThreshold === ''
        ? null
        : num(t.roundingThreshold, 0.5, 0, 1);
    stmts.push(
      db
        .prepare(
          `INSERT INTO terms (id, user_uid, name, subject, grade_level, teacher_name, assigned_sections, rounding_mode, rounding_threshold, source_type, selected_term_ids, calculation_mode, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, subject = excluded.subject, grade_level = excluded.grade_level,
             teacher_name = excluded.teacher_name, assigned_sections = excluded.assigned_sections,
             rounding_mode = excluded.rounding_mode, rounding_threshold = excluded.rounding_threshold,
             source_type = excluded.source_type, selected_term_ids = excluded.selected_term_ids,
             calculation_mode = excluded.calculation_mode, notes = excluded.notes
           WHERE terms.user_uid = excluded.user_uid`
        )
        .bind(
          tid,
          uid,
          str(t.name, 200),
          str(t.subject, 200),
          str(t.gradeLevel, 100),
          str(t.teacherName, 200),
          tAssignedSecJson,
          t.roundingMode ? str(t.roundingMode, 30) : null,
          tRoundingThresh,
          t.sourceType === 'terms' ? 'terms' : 'models',
          tSelectedTermsJson,
          mode,
          str(t.notes, 2000)
        )
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
    await ensureDataSchema(env.DB);
    await deleteAllUserData(env, caller.uid, true);
    return json({ success: true, message: 'Account data deleted' });
  } catch (err) {
    console.error('DELETE /api/data failed:', err);
    return fail(500, 'تعذر حذف البيانات.');
  }
}
