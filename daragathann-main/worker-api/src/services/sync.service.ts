import { LIMITS } from '../config/constants';
import { GradebookRepository } from '../repositories/gradebook.repository';
import { normalizeToUtcIso, nowUtcIso } from '../utils/dates';
import { ServiceError } from './auth.service';

export class SyncService {
  private readonly repo: GradebookRepository;

  constructor(private readonly db: D1Database) {
    this.repo = new GradebookRepository(db);
  }

  async pullDelta(userUid: string, opts?: { since?: string; includeDeleted?: boolean }) {
    const serverSyncTime = nowUtcIso();
    const sinceIso = opts?.since ? normalizeToUtcIso(opts.since) ?? undefined : undefined;
    const includeDeleted = opts?.includeDeleted ?? true;

    const [profile, models, studentsRes, records, terms, tombstones] = await Promise.all([
      this.repo.getProfile(userUid).then((p) => {
        if (!p) return null;
        if (!sinceIso || p.updatedAt > sinceIso) return p;
        return null;
      }),
      this.repo.listModels(userUid, { since: sinceIso }),
      this.repo.listStudents(userUid, {
        since: sinceIso,
        limit: LIMITS.MAX_STUDENTS_PER_REQUEST,
        offset: 0,
      }),
      this.repo.listRecords(userUid, { since: sinceIso }),
      this.repo.listTerms(userUid, { since: sinceIso }),
      sinceIso && includeDeleted ? this.repo.listTombstones(userUid, sinceIso) : Promise.resolve([]),
    ]);

    return {
      serverSyncTime,
      since: sinceIso ?? null,
      changes: {
        profile,
        models,
        students: studentsRes.students,
        records,
        terms,
      },
      tombstones,
    };
  }

  async pushDelta(
    userUid: string,
    payload: {
      profile?: any;
      models?: any[];
      students?: any[];
      records?: any[];
      terms?: any[];
      deletes?: {
        modelIds?: string[];
        studentIds?: string[];
        termIds?: string[];
        columnIds?: string[];
        records?: Array<{ studentId: string; modelId: string }>;
      };
    }
  ) {
    const applied = {
      profileUpdated: false,
      modelsUpserted: 0,
      studentsUpserted: 0,
      recordsUpserted: 0,
      termsUpserted: 0,
      deletedCount: 0,
    };

    try {
      const deletes = payload.deletes || {};

      for (const rec of deletes.records || []) {
        if (await this.repo.deleteRecord(userUid, rec.studentId, rec.modelId)) {
          applied.deletedCount++;
        }
      }
      for (const colId of deletes.columnIds || []) {
        if (await this.repo.deleteCustomColumn(userUid, colId)) {
          applied.deletedCount++;
        }
      }
      for (const termId of deletes.termIds || []) {
        if (await this.repo.deleteTerm(userUid, termId)) {
          applied.deletedCount++;
        }
      }
      for (const studentId of deletes.studentIds || []) {
        if (await this.repo.deleteStudent(userUid, studentId)) {
          applied.deletedCount++;
        }
      }
      for (const modelId of deletes.modelIds || []) {
        if (await this.repo.deleteModel(userUid, modelId)) {
          applied.deletedCount++;
        }
      }

      if (payload.profile) {
        await this.repo.upsertProfile(userUid, payload.profile);
        applied.profileUpdated = true;
      }

      for (const model of payload.models || []) {
        await this.repo.upsertModel(userUid, model);
        applied.modelsUpserted++;
      }

      if (payload.students && payload.students.length > 0) {
        const res = await this.repo.bulkUpsertStudents(userUid, payload.students);
        applied.studentsUpserted = res.length;
      }

      if (payload.records && payload.records.length > 0) {
        const res = await this.repo.upsertRecords(userUid, payload.records);
        applied.recordsUpserted = res.length;
      }

      for (const term of payload.terms || []) {
        await this.repo.upsertTerm(userUid, term);
        applied.termsUpserted++;
      }

      return {
        serverSyncTime: nowUtcIso(),
        applied,
      };
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_RESOURCE') {
        throw new ServiceError(403, 'لا تملك صلاحية تعديل أحد السجلات المرسلة.', 'FORBIDDEN_RESOURCE');
      }
      if (err?.message === 'FORBIDDEN_OR_MISSING_RELATION') {
        throw new ServiceError(
          400,
          'توجد درجات مرتبطة بطالب أو نموذج غير موجود أو غير مملوك لهذا الحساب.',
          'INVALID_RELATION'
        );
      }
      throw err;
    }
  }

  async getSnapshot(userUid: string) {
    return this.repo.getFullLegacySnapshot(userUid);
  }

  async saveSnapshot(userUid: string, payload: { profile?: any; models: any[]; terms: any[] }) {
    try {
      await this.repo.replaceFullLegacySnapshot(userUid, payload);
      return {
        serverSyncTime: nowUtcIso(),
      };
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_RESOURCE') {
        throw new ServiceError(403, 'معرف أحد السجلات مستخدم لدى حساب آخر.', 'FORBIDDEN_RESOURCE');
      }
      throw err;
    }
  }
}
