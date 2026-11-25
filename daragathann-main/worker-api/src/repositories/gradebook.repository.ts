import { LIMITS } from '../config/constants';
import { normalizeToUtcIso, nowUtcIso } from '../utils/dates';
import { safeJsonParse, safeSerialize } from '../utils/http';

export interface TeacherProfileDto {
  teacherName: string;
  schoolName: string;
  subject: string;
  academicYear: string;
  governorate: string;
  institutionType: 'school' | 'university';
  universityName: string;
  collegeName: string;
  departmentName: string;
  updatedAt: string;
  version: number;
}

export interface CustomColumnDto {
  id: string;
  modelId: string;
  name: string;
  maxScore: number;
  orderIndex: number;
  isAttendance: boolean;
  attendanceConfig: Record<string, unknown> | null;
  updatedAt: string;
  version: number;
}

export interface MonthlyModelDto {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  teacherName: string;
  assignedSections: string[] | null;
  academicYear: string;
  totalMaxScore: number;
  writtenWeight: number | null;
  writtenMaxScore: number;
  writtenScoreMode: 'relative' | 'raw' | null;
  roundingMode: 'none' | 'half_up' | 'any_fraction' | 'custom_threshold' | null;
  roundingThreshold: number | null;
  finalScoreOperation: { type: string; value: number } | null;
  columnLabels: Record<string, string> | null;
  customColumns: CustomColumnDto[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface StudentDto {
  id: string;
  name: string;
  gradeLevel: string;
  section: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface StudentRecordDto {
  studentId: string;
  modelId: string;
  writtenRawScore: number | null;
  scores: Record<string, number | null>;
  notes: string;
  participationHistory: Record<string, unknown[]> | null;
  attendanceRecords: Record<string, unknown[]> | null;
  updatedAt: string;
  version: number;
}

export interface TermDto {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  teacherName: string;
  assignedSections: string[] | null;
  calculationMode: 'average' | 'single' | 'sum';
  notes: string;
  roundingMode: 'none' | 'half_up' | 'any_fraction' | 'custom_threshold' | null;
  roundingThreshold: number | null;
  sourceType: 'models' | 'terms';
  selectedModelIds: string[];
  selectedTermIds: string[] | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface SyncTombstoneDto {
  entityType: string;
  entityId: string;
  deletedAt: string;
}

async function runBatched(db: D1Database, stmts: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < stmts.length; i += LIMITS.BATCH_CHUNK) {
    const chunk = stmts.slice(i, i + LIMITS.BATCH_CHUNK);
    if (chunk.length > 0) {
      await db.batch(chunk);
    }
  }
}

function mapProfileRow(row: Record<string, any>): TeacherProfileDto {
  return {
    teacherName: String(row.teacher_name || ''),
    schoolName: String(row.school_name || ''),
    subject: String(row.subject || ''),
    academicYear: String(row.academic_year || ''),
    governorate: String(row.governorate || ''),
    institutionType: row.institution_type === 'university' ? 'university' : 'school',
    universityName: String(row.university_name || ''),
    collegeName: String(row.college_name || ''),
    departmentName: String(row.department_name || ''),
    updatedAt: normalizeToUtcIso(row.updated_at) || nowUtcIso(),
    version: Number(row.version || 1),
  };
}

function mapColumnRow(row: Record<string, any>): CustomColumnDto {
  return {
    id: String(row.id),
    modelId: String(row.model_id),
    name: String(row.name || ''),
    maxScore: Number(row.max_score ?? 10),
    orderIndex: Number(row.order_index ?? 0),
    isAttendance: Boolean(row.is_attendance),
    attendanceConfig: safeJsonParse<Record<string, unknown> | null>(row.attendance_config, null),
    updatedAt: normalizeToUtcIso(row.updated_at) || nowUtcIso(),
    version: Number(row.version || 1),
  };
}

function mapModelRow(row: Record<string, any>, columns: CustomColumnDto[]): MonthlyModelDto {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    subject: String(row.subject || ''),
    gradeLevel: String(row.grade_level || ''),
    teacherName: String(row.teacher_name || ''),
    assignedSections: safeJsonParse<string[] | null>(row.assigned_sections, null),
    academicYear: String(row.academic_year || ''),
    totalMaxScore: Number(row.total_max_score ?? 100),
    writtenWeight: row.written_weight !== null && row.written_weight !== undefined ? Number(row.written_weight) : null,
    writtenMaxScore: Number(row.written_max_score ?? 100),
    writtenScoreMode: row.written_score_mode === 'raw' || row.written_score_mode === 'relative' ? row.written_score_mode : null,
    roundingMode: row.rounding_mode || null,
    roundingThreshold: row.rounding_threshold !== null && row.rounding_threshold !== undefined ? Number(row.rounding_threshold) : null,
    finalScoreOperation: safeJsonParse<{ type: string; value: number } | null>(row.final_score_operation, null),
    columnLabels: safeJsonParse<Record<string, string> | null>(row.column_labels, null),
    customColumns: columns,
    createdAt: normalizeToUtcIso(row.created_at) || nowUtcIso(),
    updatedAt: normalizeToUtcIso(row.updated_at) || nowUtcIso(),
    version: Number(row.version || 1),
  };
}

function mapStudentRow(row: Record<string, any>): StudentDto {
  const createdAt = normalizeToUtcIso(row.created_at) || nowUtcIso();
  return {
    id: String(row.id),
    name: String(row.name || ''),
    gradeLevel: String(row.grade_level || ''),
    section: String(row.section || ''),
    createdAt,
    updatedAt: normalizeToUtcIso(row.updated_at) || createdAt,
    version: Number(row.version || 1),
  };
}

function mapRecordRow(row: Record<string, any>): StudentRecordDto {
  return {
    studentId: String(row.student_id),
    modelId: String(row.model_id),
    writtenRawScore: row.written_raw_score !== null && row.written_raw_score !== undefined ? Number(row.written_raw_score) : null,
    scores: safeJsonParse<Record<string, number | null>>(row.scores, {}),
    notes: String(row.notes || ''),
    participationHistory: safeJsonParse<Record<string, unknown[]> | null>(row.participation_history, null),
    attendanceRecords: safeJsonParse<Record<string, unknown[]> | null>(row.attendance_records, null),
    updatedAt: normalizeToUtcIso(row.updated_at) || nowUtcIso(),
    version: Number(row.version || 1),
  };
}

function mapTermRow(row: Record<string, any>, selectedModelIds: string[]): TermDto {
  const createdAt = normalizeToUtcIso(row.created_at) || nowUtcIso();
  return {
    id: String(row.id),
    name: String(row.name || ''),
    subject: String(row.subject || ''),
    gradeLevel: String(row.grade_level || ''),
    teacherName: String(row.teacher_name || ''),
    assignedSections: safeJsonParse<string[] | null>(row.assigned_sections, null),
    calculationMode:
      row.calculation_mode === 'single' || row.calculation_mode === 'sum' ? row.calculation_mode : 'average',
    notes: String(row.notes || ''),
    roundingMode: row.rounding_mode || null,
    roundingThreshold: row.rounding_threshold !== null && row.rounding_threshold !== undefined ? Number(row.rounding_threshold) : null,
    sourceType: row.source_type === 'terms' ? 'terms' : 'models',
    selectedModelIds,
    selectedTermIds: safeJsonParse<string[] | null>(row.selected_term_ids, null),
    createdAt,
    updatedAt: normalizeToUtcIso(row.updated_at) || createdAt,
    version: Number(row.version || 1),
  };
}

export class GradebookRepository {
  constructor(private readonly db: D1Database) {}

  async getProfile(userUid: string): Promise<TeacherProfileDto | null> {
    const row = await this.db
      .prepare('SELECT * FROM teacher_profiles WHERE user_uid = ? LIMIT 1')
      .bind(userUid)
      .first<Record<string, any>>();
    return row ? mapProfileRow(row) : null;
  }

  async upsertProfile(
    userUid: string,
    input: {
      teacherName: string;
      schoolName: string;
      subject: string;
      academicYear: string;
      governorate?: string;
      institutionType?: 'school' | 'university';
      universityName?: string;
      collegeName?: string;
      departmentName?: string;
    }
  ): Promise<TeacherProfileDto> {
    const now = nowUtcIso();
    await this.db
      .prepare(
        `INSERT INTO teacher_profiles (
           user_uid, teacher_name, school_name, subject, academic_year,
           governorate, institution_type, university_name, college_name, department_name,
           updated_at, version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(user_uid) DO UPDATE SET
           teacher_name = excluded.teacher_name,
           school_name = excluded.school_name,
           subject = excluded.subject,
           academic_year = excluded.academic_year,
           governorate = excluded.governorate,
           institution_type = excluded.institution_type,
           university_name = excluded.university_name,
           college_name = excluded.college_name,
           department_name = excluded.department_name,
           updated_at = excluded.updated_at,
           version = teacher_profiles.version + 1`
      )
      .bind(
        userUid,
        input.teacherName,
        input.schoolName,
        input.subject,
        input.academicYear,
        input.governorate || '',
        input.institutionType === 'university' ? 'university' : 'school',
        input.universityName || '',
        input.collegeName || '',
        input.departmentName || '',
        now
      )
      .run();

    const saved = await this.getProfile(userUid);
    return saved!;
  }

  async listModels(userUid: string, opts?: { since?: string; limit?: number; offset?: number }): Promise<MonthlyModelDto[]> {
    const limit = opts?.limit ?? LIMITS.MAX_MODELS;
    const offset = opts?.offset ?? 0;

    let rows: Record<string, any>[] = [];
    if (opts?.since) {
      const res = await this.db
        .prepare(
          `SELECT * FROM monthly_models
           WHERE user_uid = ? AND COALESCE(updated_at, created_at) > ?
           ORDER BY created_at DESC, id ASC
           LIMIT ? OFFSET ?`
        )
        .bind(userUid, opts.since, limit, offset)
        .all<Record<string, any>>();
      rows = res.results || [];
    } else {
      const res = await this.db
        .prepare(
          `SELECT * FROM monthly_models
           WHERE user_uid = ?
           ORDER BY created_at DESC, id ASC
           LIMIT ? OFFSET ?`
        )
        .bind(userUid, limit, offset)
        .all<Record<string, any>>();
      rows = res.results || [];
    }

    if (rows.length === 0) return [];

    const colRes = await this.db
      .prepare(
        `SELECT cc.* FROM custom_columns cc
         INNER JOIN monthly_models m ON m.id = cc.model_id
         WHERE m.user_uid = ?
         ORDER BY cc.order_index ASC, cc.id ASC`
      )
      .bind(userUid)
      .all<Record<string, any>>();

    const colsByModel = new Map<string, CustomColumnDto[]>();
    for (const c of colRes.results || []) {
      const dto = mapColumnRow(c);
      const arr = colsByModel.get(dto.modelId) || [];
      arr.push(dto);
      colsByModel.set(dto.modelId, arr);
    }

    return rows.map((r) => mapModelRow(r, colsByModel.get(String(r.id)) || []));
  }

  async getModelById(userUid: string, modelId: string): Promise<MonthlyModelDto | null> {
    const row = await this.db
      .prepare('SELECT * FROM monthly_models WHERE id = ? AND user_uid = ? LIMIT 1')
      .bind(modelId, userUid)
      .first<Record<string, any>>();
    if (!row) return null;

    const colRes = await this.db
      .prepare('SELECT * FROM custom_columns WHERE model_id = ? ORDER BY order_index ASC, id ASC')
      .bind(modelId)
      .all<Record<string, any>>();

    const cols = (colRes.results || []).map(mapColumnRow);
    return mapModelRow(row, cols);
  }

  async upsertModel(
    userUid: string,
    input: {
      id: string;
      name: string;
      subject: string;
      gradeLevel?: string;
      teacherName?: string;
      assignedSections?: string[] | null;
      academicYear: string;
      totalMaxScore: number;
      writtenWeight?: number | null;
      writtenMaxScore: number;
      writtenScoreMode?: 'relative' | 'raw' | null;
      roundingMode?: string | null;
      roundingThreshold?: number | null;
      finalScoreOperation?: { type: string; value: number } | null;
      columnLabels?: Record<string, string> | null;
      customColumns?: Array<{
        id: string;
        name: string;
        maxScore: number;
        orderIndex?: number;
        isAttendance?: boolean;
        attendanceConfig?: Record<string, unknown> | null;
      }>;
    }
  ): Promise<MonthlyModelDto> {
    const existingOwner = await this.db
      .prepare('SELECT user_uid FROM monthly_models WHERE id = ? LIMIT 1')
      .bind(input.id)
      .first<{ user_uid: string }>();
    if (existingOwner && existingOwner.user_uid !== userUid) {
      throw new Error('FORBIDDEN_RESOURCE');
    }

    const now = nowUtcIso();
    await this.db
      .prepare(
        `INSERT INTO monthly_models (
           id, user_uid, name, subject, grade_level, teacher_name, assigned_sections,
           academic_year, total_max_score, written_weight, written_max_score, written_score_mode,
           rounding_mode, rounding_threshold, final_score_operation, column_labels,
           created_at, updated_at, version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           subject = excluded.subject,
           grade_level = excluded.grade_level,
           teacher_name = excluded.teacher_name,
           assigned_sections = excluded.assigned_sections,
           academic_year = excluded.academic_year,
           total_max_score = excluded.total_max_score,
           written_weight = excluded.written_weight,
           written_max_score = excluded.written_max_score,
           written_score_mode = excluded.written_score_mode,
           rounding_mode = excluded.rounding_mode,
           rounding_threshold = excluded.rounding_threshold,
           final_score_operation = excluded.final_score_operation,
           column_labels = excluded.column_labels,
           updated_at = excluded.updated_at,
           version = monthly_models.version + 1`
      )
      .bind(
        input.id,
        userUid,
        input.name,
        input.subject || '',
        input.gradeLevel || '',
        input.teacherName || '',
        safeSerialize(input.assignedSections),
        input.academicYear || '',
        input.totalMaxScore,
        input.writtenWeight ?? null,
        input.writtenMaxScore,
        input.writtenScoreMode ?? null,
        input.roundingMode ?? null,
        input.roundingThreshold ?? null,
        safeSerialize(input.finalScoreOperation),
        safeSerialize(input.columnLabels),
        now,
        now
      )
      .run();

    if (input.customColumns !== undefined) {
      await this.replaceModelColumns(userUid, input.id, input.customColumns);
    }

    return (await this.getModelById(userUid, input.id))!;
  }

  async replaceModelColumns(
    userUid: string,
    modelId: string,
    columns: Array<{
      id: string;
      name: string;
      maxScore: number;
      orderIndex?: number;
      isAttendance?: boolean;
      attendanceConfig?: Record<string, unknown> | null;
    }>
  ): Promise<CustomColumnDto[]> {
    const model = await this.db
      .prepare('SELECT id FROM monthly_models WHERE id = ? AND user_uid = ? LIMIT 1')
      .bind(modelId, userUid)
      .first<{ id: string }>();
    if (!model) {
      throw new Error('NOT_FOUND');
    }

    const existingColsRes = await this.db
      .prepare('SELECT id FROM custom_columns WHERE model_id = ?')
      .bind(modelId)
      .all<{ id: string }>();
    const incomingIds = new Set(columns.map((c) => c.id));
    const stmts: D1PreparedStatement[] = [];
    const now = nowUtcIso();

    for (const existing of existingColsRes.results || []) {
      if (!incomingIds.has(existing.id)) {
        stmts.push(this.db.prepare('DELETE FROM custom_columns WHERE id = ? AND model_id = ?').bind(existing.id, modelId));
      }
    }

    columns.forEach((col, index) => {
      stmts.push(
        this.db
          .prepare(
            `INSERT INTO custom_columns (
               id, model_id, name, max_score, order_index, is_attendance, attendance_config, updated_at, version
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON CONFLICT(id) DO UPDATE SET
               model_id = excluded.model_id,
               name = excluded.name,
               max_score = excluded.max_score,
               order_index = excluded.order_index,
               is_attendance = excluded.is_attendance,
               attendance_config = excluded.attendance_config,
               updated_at = excluded.updated_at,
               version = custom_columns.version + 1`
          )
          .bind(
            col.id,
            modelId,
            col.name,
            col.maxScore,
            col.orderIndex ?? index,
            col.isAttendance ? 1 : 0,
            safeSerialize(col.attendanceConfig),
            now
          )
      );
    });

    await runBatched(this.db, stmts);

    const colRes = await this.db
      .prepare('SELECT * FROM custom_columns WHERE model_id = ? ORDER BY order_index ASC, id ASC')
      .bind(modelId)
      .all<Record<string, any>>();
    return (colRes.results || []).map(mapColumnRow);
  }

  async deleteModel(userUid: string, modelId: string): Promise<boolean> {
    const existing = await this.db
      .prepare('SELECT id FROM monthly_models WHERE id = ? AND user_uid = ? LIMIT 1')
      .bind(modelId, userUid)
      .first<{ id: string }>();
    if (!existing) return false;

    await this.db.prepare('DELETE FROM student_monthly_records WHERE model_id = ?').bind(modelId).run();
    await this.db.prepare('DELETE FROM custom_columns WHERE model_id = ?').bind(modelId).run();
    await this.db.prepare('DELETE FROM term_selected_models WHERE model_id = ?').bind(modelId).run();
    await this.db.prepare('DELETE FROM monthly_models WHERE id = ? AND user_uid = ?').bind(modelId, userUid).run();
    return true;
  }

  async deleteCustomColumn(userUid: string, columnId: string): Promise<boolean> {
    const row = await this.db
      .prepare(
        `SELECT cc.id FROM custom_columns cc
         INNER JOIN monthly_models m ON m.id = cc.model_id
         WHERE cc.id = ? AND m.user_uid = ?
         LIMIT 1`
      )
      .bind(columnId, userUid)
      .first<{ id: string }>();
    if (!row) return false;

    await this.db.prepare('DELETE FROM custom_columns WHERE id = ?').bind(columnId).run();
    return true;
  }

  async listStudents(
    userUid: string,
    opts?: { section?: string; gradeLevel?: string; since?: string; limit?: number; offset?: number }
  ): Promise<{ students: StudentDto[]; total: number }> {
    const where: string[] = ['user_uid = ?'];
    const params: unknown[] = [userUid];

    if (opts?.section) {
      where.push('section = ?');
      params.push(opts.section);
    }
    if (opts?.gradeLevel) {
      where.push('grade_level = ?');
      params.push(opts.gradeLevel);
    }
    if (opts?.since) {
      where.push('COALESCE(updated_at, created_at) > ?');
      params.push(opts.since);
    }

    const whereClause = where.join(' AND ');
    const countRow = await this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM students WHERE ${whereClause}`)
      .bind(...params)
      .first<{ cnt: number }>();

    const limit = opts?.limit ?? LIMITS.DEFAULT_PAGE_LIMIT;
    const offset = opts?.offset ?? 0;

    const res = await this.db
      .prepare(`SELECT * FROM students WHERE ${whereClause} ORDER BY name ASC, id ASC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all<Record<string, any>>();

    return {
      students: (res.results || []).map(mapStudentRow),
      total: Number(countRow?.cnt ?? 0),
    };
  }

  async getStudentById(userUid: string, studentId: string): Promise<StudentDto | null> {
    const row = await this.db
      .prepare('SELECT * FROM students WHERE id = ? AND user_uid = ? LIMIT 1')
      .bind(studentId, userUid)
      .first<Record<string, any>>();
    return row ? mapStudentRow(row) : null;
  }

  async upsertStudent(
    userUid: string,
    input: { id: string; name: string; gradeLevel?: string; section?: string }
  ): Promise<StudentDto> {
    const existingOwner = await this.db
      .prepare('SELECT user_uid FROM students WHERE id = ? LIMIT 1')
      .bind(input.id)
      .first<{ user_uid: string }>();
    if (existingOwner && existingOwner.user_uid !== userUid) {
      throw new Error('FORBIDDEN_RESOURCE');
    }

    const now = nowUtcIso();
    await this.db
      .prepare(
        `INSERT INTO students (id, user_uid, name, grade_level, section, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           grade_level = excluded.grade_level,
           section = excluded.section,
           updated_at = excluded.updated_at,
           version = students.version + 1`
      )
      .bind(input.id, userUid, input.name, input.gradeLevel || '', input.section || '', now, now)
      .run();

    return (await this.getStudentById(userUid, input.id))!;
  }

  async bulkUpsertStudents(
    userUid: string,
    students: Array<{ id: string; name: string; gradeLevel?: string; section?: string }>
  ): Promise<StudentDto[]> {
    if (students.length === 0) return [];
    const now = nowUtcIso();
    const stmts: D1PreparedStatement[] = [];

    for (const st of students) {
      const existingOwner = await this.db
        .prepare('SELECT user_uid FROM students WHERE id = ? LIMIT 1')
        .bind(st.id)
        .first<{ user_uid: string }>();
      if (existingOwner && existingOwner.user_uid !== userUid) {
        throw new Error('FORBIDDEN_RESOURCE');
      }

      stmts.push(
        this.db
          .prepare(
            `INSERT INTO students (id, user_uid, name, grade_level, section, created_at, updated_at, version)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               grade_level = excluded.grade_level,
               section = excluded.section,
               updated_at = excluded.updated_at,
               version = students.version + 1`
          )
          .bind(st.id, userUid, st.name, st.gradeLevel || '', st.section || '', now, now)
      );
    }

    await runBatched(this.db, stmts);

    const results: StudentDto[] = [];
    for (const st of students) {
      const saved = await this.getStudentById(userUid, st.id);
      if (saved) results.push(saved);
    }
    return results;
  }

  async deleteStudent(userUid: string, studentId: string): Promise<boolean> {
    const existing = await this.db
      .prepare('SELECT id FROM students WHERE id = ? AND user_uid = ? LIMIT 1')
      .bind(studentId, userUid)
      .first<{ id: string }>();
    if (!existing) return false;

    await this.db.prepare('DELETE FROM student_monthly_records WHERE student_id = ?').bind(studentId).run();
    await this.db.prepare('DELETE FROM students WHERE id = ? AND user_uid = ?').bind(studentId, userUid).run();
    return true;
  }

  async listRecords(
    userUid: string,
    opts?: { modelId?: string; studentId?: string; since?: string }
  ): Promise<StudentRecordDto[]> {
    const where: string[] = ['s.user_uid = ?', 'm.user_uid = ?'];
    const params: unknown[] = [userUid, userUid];

    if (opts?.modelId) {
      where.push('r.model_id = ?');
      params.push(opts.modelId);
    }
    if (opts?.studentId) {
      where.push('r.student_id = ?');
      params.push(opts.studentId);
    }
    if (opts?.since) {
      where.push('r.updated_at > ?');
      params.push(opts.since);
    }

    const res = await this.db
      .prepare(
        `SELECT r.*
         FROM student_monthly_records r
         INNER JOIN students s ON s.id = r.student_id
         INNER JOIN monthly_models m ON m.id = r.model_id
         WHERE ${where.join(' AND ')}
         ORDER BY r.model_id ASC, r.student_id ASC`
      )
      .bind(...params)
      .all<Record<string, any>>();

    return (res.results || []).map(mapRecordRow);
  }

  async upsertRecords(
    userUid: string,
    records: Array<{
      studentId: string;
      modelId: string;
      writtenRawScore?: number | null;
      scores: Record<string, number | null>;
      notes?: string;
      participationHistory?: Record<string, unknown[]> | null;
      attendanceRecords?: Record<string, unknown[]> | null;
    }>
  ): Promise<StudentRecordDto[]> {
    if (records.length === 0) return [];

    const ownedModelsRes = await this.db
      .prepare('SELECT id FROM monthly_models WHERE user_uid = ?')
      .bind(userUid)
      .all<{ id: string }>();
    const ownedModels = new Set((ownedModelsRes.results || []).map((r) => r.id));

    const ownedStudentsRes = await this.db
      .prepare('SELECT id FROM students WHERE user_uid = ?')
      .bind(userUid)
      .all<{ id: string }>();
    const ownedStudents = new Set((ownedStudentsRes.results || []).map((r) => r.id));

    const now = nowUtcIso();
    const stmts: D1PreparedStatement[] = [];
    const validKeys: Array<{ studentId: string; modelId: string }> = [];

    for (const rec of records) {
      if (!ownedModels.has(rec.modelId) || !ownedStudents.has(rec.studentId)) {
        throw new Error('FORBIDDEN_OR_MISSING_RELATION');
      }
      validKeys.push({ studentId: rec.studentId, modelId: rec.modelId });
      stmts.push(
        this.db
          .prepare(
            `INSERT INTO student_monthly_records (
               student_id, model_id, written_raw_score, scores, notes,
               participation_history, attendance_records, updated_at, version
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON CONFLICT(student_id, model_id) DO UPDATE SET
               written_raw_score = excluded.written_raw_score,
               scores = excluded.scores,
               notes = excluded.notes,
               participation_history = excluded.participation_history,
               attendance_records = excluded.attendance_records,
               updated_at = excluded.updated_at,
               version = student_monthly_records.version + 1`
          )
          .bind(
            rec.studentId,
            rec.modelId,
            rec.writtenRawScore ?? null,
            JSON.stringify(rec.scores || {}),
            rec.notes || '',
            safeSerialize(rec.participationHistory),
            safeSerialize(rec.attendanceRecords),
            now
          )
      );
    }

    await runBatched(this.db, stmts);

    const saved: StudentRecordDto[] = [];
    for (const key of validKeys) {
      const row = await this.db
        .prepare('SELECT * FROM student_monthly_records WHERE student_id = ? AND model_id = ? LIMIT 1')
        .bind(key.studentId, key.modelId)
        .first<Record<string, any>>();
      if (row) saved.push(mapRecordRow(row));
    }
    return saved;
  }

  async deleteRecord(userUid: string, studentId: string, modelId: string): Promise<boolean> {
    const owned = await this.db
      .prepare(
        `SELECT r.id FROM student_monthly_records r
         INNER JOIN students s ON s.id = r.student_id
         INNER JOIN monthly_models m ON m.id = r.model_id
         WHERE r.student_id = ? AND r.model_id = ? AND s.user_uid = ? AND m.user_uid = ?
         LIMIT 1`
      )
      .bind(studentId, modelId, userUid, userUid)
      .first<{ id: number }>();
    if (!owned) return false;

    await this.db
      .prepare('DELETE FROM student_monthly_records WHERE student_id = ? AND model_id = ?')
      .bind(studentId, modelId)
      .run();
    return true;
  }

  async listTerms(userUid: string, opts?: { since?: string }): Promise<TermDto[]> {
    const res = opts?.since
      ? await this.db
          .prepare(
            `SELECT * FROM terms
             WHERE user_uid = ? AND COALESCE(updated_at, created_at) > ?
             ORDER BY created_at DESC, id ASC`
          )
          .bind(userUid, opts.since)
          .all<Record<string, any>>()
      : await this.db
          .prepare('SELECT * FROM terms WHERE user_uid = ? ORDER BY created_at DESC, id ASC')
          .bind(userUid)
          .all<Record<string, any>>();

    const termRows = res.results || [];
    if (termRows.length === 0) return [];

    const selRes = await this.db
      .prepare(
        `SELECT tsm.term_id, tsm.model_id
         FROM term_selected_models tsm
         INNER JOIN terms t ON t.id = tsm.term_id
         WHERE t.user_uid = ?
         ORDER BY tsm.order_index ASC, tsm.id ASC`
      )
      .bind(userUid)
      .all<{ term_id: string; model_id: string }>();

    const map = new Map<string, string[]>();
    for (const s of selRes.results || []) {
      const arr = map.get(s.term_id) || [];
      arr.push(s.model_id);
      map.set(s.term_id, arr);
    }

    return termRows.map((t) => mapTermRow(t, map.get(String(t.id)) || []));
  }

  async getTermById(userUid: string, termId: string): Promise<TermDto | null> {
    const row = await this.db
      .prepare('SELECT * FROM terms WHERE id = ? AND user_uid = ? LIMIT 1')
      .bind(termId, userUid)
      .first<Record<string, any>>();
    if (!row) return null;

    const selRes = await this.db
      .prepare('SELECT model_id FROM term_selected_models WHERE term_id = ? ORDER BY order_index ASC, id ASC')
      .bind(termId)
      .all<{ model_id: string }>();

    return mapTermRow(
      row,
      (selRes.results || []).map((r) => r.model_id)
    );
  }

  async upsertTerm(
    userUid: string,
    input: {
      id: string;
      name: string;
      subject?: string;
      gradeLevel?: string;
      teacherName?: string;
      assignedSections?: string[] | null;
      calculationMode: 'average' | 'single' | 'sum';
      notes?: string;
      roundingMode?: string | null;
      roundingThreshold?: number | null;
      sourceType?: 'models' | 'terms';
      selectedModelIds?: string[];
      selectedTermIds?: string[] | null;
    }
  ): Promise<TermDto> {
    const existingOwner = await this.db
      .prepare('SELECT user_uid FROM terms WHERE id = ? LIMIT 1')
      .bind(input.id)
      .first<{ user_uid: string }>();
    if (existingOwner && existingOwner.user_uid !== userUid) {
      throw new Error('FORBIDDEN_RESOURCE');
    }

    const now = nowUtcIso();
    await this.db
      .prepare(
        `INSERT INTO terms (
           id, user_uid, name, subject, grade_level, teacher_name, assigned_sections,
           calculation_mode, notes, rounding_mode, rounding_threshold, source_type, selected_term_ids,
           created_at, updated_at, version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           subject = excluded.subject,
           grade_level = excluded.grade_level,
           teacher_name = excluded.teacher_name,
           assigned_sections = excluded.assigned_sections,
           calculation_mode = excluded.calculation_mode,
           notes = excluded.notes,
           rounding_mode = excluded.rounding_mode,
           rounding_threshold = excluded.rounding_threshold,
           source_type = excluded.source_type,
           selected_term_ids = excluded.selected_term_ids,
           updated_at = excluded.updated_at,
           version = terms.version + 1`
      )
      .bind(
        input.id,
        userUid,
        input.name,
        input.subject || '',
        input.gradeLevel || '',
        input.teacherName || '',
        safeSerialize(input.assignedSections),
        input.calculationMode,
        input.notes || '',
        input.roundingMode ?? null,
        input.roundingThreshold ?? null,
        input.sourceType || 'models',
        safeSerialize(input.selectedTermIds),
        now,
        now
      )
      .run();

    if (input.selectedModelIds !== undefined) {
      await this.db.prepare('DELETE FROM term_selected_models WHERE term_id = ?').bind(input.id).run();
      if (input.selectedModelIds.length > 0) {
        const ownedModelsRes = await this.db
          .prepare('SELECT id FROM monthly_models WHERE user_uid = ?')
          .bind(userUid)
          .all<{ id: string }>();
        const ownedSet = new Set((ownedModelsRes.results || []).map((m) => m.id));
        const stmts: D1PreparedStatement[] = [];
        input.selectedModelIds.forEach((modelId, idx) => {
          if (ownedSet.has(modelId)) {
            stmts.push(
              this.db
                .prepare('INSERT OR IGNORE INTO term_selected_models (term_id, model_id, order_index) VALUES (?, ?, ?)')
                .bind(input.id, modelId, idx)
            );
          }
        });
        await runBatched(this.db, stmts);
      }
    }

    return (await this.getTermById(userUid, input.id))!;
  }

  async deleteTerm(userUid: string, termId: string): Promise<boolean> {
    const existing = await this.db
      .prepare('SELECT id FROM terms WHERE id = ? AND user_uid = ? LIMIT 1')
      .bind(termId, userUid)
      .first<{ id: string }>();
    if (!existing) return false;

    await this.db.prepare('DELETE FROM term_selected_models WHERE term_id = ?').bind(termId).run();
    await this.db.prepare('DELETE FROM terms WHERE id = ? AND user_uid = ?').bind(termId, userUid).run();
    return true;
  }

  async listTombstones(userUid: string, since?: string): Promise<SyncTombstoneDto[]> {
    const res = since
      ? await this.db
          .prepare(
            `SELECT entity_type, entity_id, MAX(deleted_at) AS deleted_at
             FROM sync_tombstones
             WHERE user_uid = ? AND deleted_at > ?
             GROUP BY entity_type, entity_id
             ORDER BY deleted_at ASC`
          )
          .bind(userUid, since)
          .all<{ entity_type: string; entity_id: string; deleted_at: string }>()
      : await this.db
          .prepare(
            `SELECT entity_type, entity_id, MAX(deleted_at) AS deleted_at
             FROM sync_tombstones
             WHERE user_uid = ?
             GROUP BY entity_type, entity_id
             ORDER BY deleted_at ASC`
          )
          .bind(userUid)
          .all<{ entity_type: string; entity_id: string; deleted_at: string }>();

    return (res.results || []).map((r) => ({
      entityType: r.entity_type,
      entityId: r.entity_id,
      deletedAt: normalizeToUtcIso(r.deleted_at) || nowUtcIso(),
    }));
  }

  async getFullLegacySnapshot(userUid: string) {
    const [profile, models, students, records, terms] = await Promise.all([
      this.getProfile(userUid),
      this.listModels(userUid),
      this.listStudents(userUid, { limit: LIMITS.MAX_STUDENTS_PER_REQUEST, offset: 0 }),
      this.listRecords(userUid),
      this.listTerms(userUid),
    ]);

    const studentMap = new Map<string, StudentDto>();
    for (const s of students.students) {
      studentMap.set(s.id, s);
    }

    const recordsByModel = new Map<string, StudentRecordDto[]>();
    for (const rec of records) {
      const list = recordsByModel.get(rec.modelId) || [];
      list.push(rec);
      recordsByModel.set(rec.modelId, list);
    }

    const nestedModels = models.map((m) => {
      const modelRecs = recordsByModel.get(m.id) || [];
      const modelStudents = modelRecs.map((rec) => {
        const st = studentMap.get(rec.studentId);
        return {
          id: rec.studentId,
          name: st?.name || '',
          gradeLevel: st?.gradeLevel || '',
          section: st?.section || '',
          writtenRawScore: rec.writtenRawScore,
          scores: rec.scores,
          notes: rec.notes,
          participationHistory: rec.participationHistory,
          attendanceRecords: rec.attendanceRecords,
        };
      });
      return {
        ...m,
        students: modelStudents,
      };
    });

    return {
      profile,
      models: nestedModels,
      terms,
    };
  }

  async replaceFullLegacySnapshot(
    userUid: string,
    payload: {
      profile?: any;
      models: Array<any>;
      terms: Array<any>;
    }
  ): Promise<void> {
    if (payload.profile) {
      await this.upsertProfile(userUid, payload.profile);
    }

    // Clear existing gradebook entities for user before writing snapshot
    await this.db
      .prepare(
        `DELETE FROM student_monthly_records
         WHERE student_id IN (SELECT id FROM students WHERE user_uid = ?)
            OR model_id IN (SELECT id FROM monthly_models WHERE user_uid = ?)`
      )
      .bind(userUid, userUid)
      .run();
    await this.db
      .prepare(
        `DELETE FROM term_selected_models
         WHERE term_id IN (SELECT id FROM terms WHERE user_uid = ?)
            OR model_id IN (SELECT id FROM monthly_models WHERE user_uid = ?)`
      )
      .bind(userUid, userUid)
      .run();
    await this.db
      .prepare('DELETE FROM custom_columns WHERE model_id IN (SELECT id FROM monthly_models WHERE user_uid = ?)')
      .bind(userUid)
      .run();
    await this.db.prepare('DELETE FROM terms WHERE user_uid = ?').bind(userUid).run();
    await this.db.prepare('DELETE FROM students WHERE user_uid = ?').bind(userUid).run();
    await this.db.prepare('DELETE FROM monthly_models WHERE user_uid = ?').bind(userUid).run();

    const uniqueStudents = new Map<string, { id: string; name: string; gradeLevel: string; section: string }>();
    const recordInputs: Array<{
      studentId: string;
      modelId: string;
      writtenRawScore?: number | null;
      scores: Record<string, number | null>;
      notes?: string;
      participationHistory?: Record<string, unknown[]> | null;
      attendanceRecords?: Record<string, unknown[]> | null;
    }> = [];

    for (const model of payload.models) {
      await this.upsertModel(userUid, model);
      for (const st of model.students || []) {
        if (!uniqueStudents.has(st.id)) {
          uniqueStudents.set(st.id, {
            id: st.id,
            name: st.name || '',
            gradeLevel: st.gradeLevel || '',
            section: st.section || '',
          });
        }
        recordInputs.push({
          studentId: st.id,
          modelId: model.id,
          writtenRawScore: st.writtenRawScore ?? null,
          scores: st.scores || {},
          notes: st.notes || '',
          participationHistory: st.participationHistory ?? null,
          attendanceRecords: st.attendanceRecords ?? null,
        });
      }
    }

    if (uniqueStudents.size > 0) {
      await this.bulkUpsertStudents(userUid, Array.from(uniqueStudents.values()));
    }
    if (recordInputs.length > 0) {
      await this.upsertRecords(userUid, recordInputs);
    }

    for (const term of payload.terms) {
      await this.upsertTerm(userUid, term);
    }
  }
}
