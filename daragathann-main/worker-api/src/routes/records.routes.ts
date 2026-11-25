import { Hono } from 'hono';
import type { WorkerEnv } from '../config/env';
import {
  authenticateMiddleware,
  requireSubscriptionMiddleware,
  type AuthVariables,
} from '../middleware/auth';
import { GradebookRepository } from '../repositories/gradebook.repository';
import { safeIdSchema } from '../schemas/common';
import { studentRecordBulkSchema, studentRecordUpsertSchema } from '../schemas/record.schema';
import { normalizeToUtcIso } from '../utils/dates';
import type { TokenVerifier } from '../utils/firebaseJwt';
import { jsonFail, jsonOk } from '../utils/http';

export function createRecordsRoutes(verifyToken?: TokenVerifier) {
  const router = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();
  const auth = authenticateMiddleware(verifyToken);
  const sub = requireSubscriptionMiddleware();

  router.use('*', auth, sub);

  router.get('/', async (c) => {
    const modelId = c.req.query('modelId')?.trim() || undefined;
    const studentId = c.req.query('studentId')?.trim() || undefined;
    const since = c.req.query('since') ? normalizeToUtcIso(c.req.query('since')) ?? undefined : undefined;

    const repo = new GradebookRepository(c.env.DB);
    const records = await repo.listRecords(c.get('caller').uid, { modelId, studentId, since });
    return jsonOk(c, { records, count: records.length });
  });

  router.put('/', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = studentRecordUpsertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات الدرجة غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    try {
      const [record] = await repo.upsertRecords(c.get('caller').uid, [parsed.data]);
      return jsonOk(c, { record });
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_OR_MISSING_RELATION') {
        return jsonFail(c, 400, 'الطالب أو النموذج غير موجود أو لا ينتمي لهذا الحساب.', {
          code: 'INVALID_RELATION',
        });
      }
      throw err;
    }
  });

  router.post('/bulk', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = studentRecordBulkSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'قائمة الدرجات غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    try {
      const records = await repo.upsertRecords(c.get('caller').uid, parsed.data.records);
      return jsonOk(c, { records, count: records.length });
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_OR_MISSING_RELATION') {
        return jsonFail(c, 400, 'أحد الطلاب أو النماذج غير موجود أو لا ينتمي لهذا الحساب.', {
          code: 'INVALID_RELATION',
        });
      }
      throw err;
    }
  });

  router.delete('/:studentId/:modelId', async (c) => {
    const sParsed = safeIdSchema.safeParse(c.req.param('studentId'));
    const mParsed = safeIdSchema.safeParse(c.req.param('modelId'));
    if (!sParsed.success || !mParsed.success) {
      return jsonFail(c, 400, 'المعرفات غير صالحة.', { code: 'VALIDATION_ERROR' });
    }

    const repo = new GradebookRepository(c.env.DB);
    const deleted = await repo.deleteRecord(c.get('caller').uid, sParsed.data, mParsed.data);
    if (!deleted) {
      return jsonFail(c, 404, 'السجل غير موجود.', { code: 'NOT_FOUND' });
    }
    return jsonOk(c, { deleted: true });
  });

  return router;
}
