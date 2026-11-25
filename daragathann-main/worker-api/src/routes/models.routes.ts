import { Hono } from 'hono';
import type { WorkerEnv } from '../config/env';
import {
  authenticateMiddleware,
  requireSubscriptionMiddleware,
  type AuthVariables,
} from '../middleware/auth';
import { GradebookRepository } from '../repositories/gradebook.repository';
import { paginationQuerySchema, safeIdSchema } from '../schemas/common';
import {
  monthlyModelPatchSchema,
  monthlyModelUpsertSchema,
  replaceModelColumnsSchema,
} from '../schemas/model.schema';
import { normalizeToUtcIso } from '../utils/dates';
import type { TokenVerifier } from '../utils/firebaseJwt';
import { jsonFail, jsonOk } from '../utils/http';

export function createModelsRoutes(verifyToken?: TokenVerifier) {
  const router = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();
  const auth = authenticateMiddleware(verifyToken);
  const sub = requireSubscriptionMiddleware();

  router.use('*', auth, sub);

  router.get('/', async (c) => {
    const pq = paginationQuerySchema.safeParse({
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });
    const since = c.req.query('since') ? normalizeToUtcIso(c.req.query('since')) ?? undefined : undefined;
    const repo = new GradebookRepository(c.env.DB);
    const models = await repo.listModels(c.get('caller').uid, {
      since,
      limit: pq.success ? pq.data.limit : undefined,
      offset: pq.success ? pq.data.offset : undefined,
    });
    return jsonOk(c, { models, count: models.length });
  });

  router.get('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف النموذج غير صالح.', { code: 'VALIDATION_ERROR' });
    }
    const repo = new GradebookRepository(c.env.DB);
    const model = await repo.getModelById(c.get('caller').uid, idParsed.data);
    if (!model) {
      return jsonFail(c, 404, 'النموذج غير موجود.', { code: 'NOT_FOUND' });
    }
    return jsonOk(c, { model });
  });

  router.post('/', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = monthlyModelUpsertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات النموذج غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    const id = parsed.data.id || crypto.randomUUID();
    try {
      const model = await repo.upsertModel(c.get('caller').uid, { ...parsed.data, id });
      return jsonOk(c, { model }, 201);
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_RESOURCE') {
        return jsonFail(c, 403, 'لا تملك صلاحية تعديل هذا النموذج.', { code: 'FORBIDDEN_RESOURCE' });
      }
      throw err;
    }
  });

  router.put('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف النموذج غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = monthlyModelUpsertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات النموذج غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    try {
      const model = await repo.upsertModel(c.get('caller').uid, {
        ...parsed.data,
        id: idParsed.data,
      });
      return jsonOk(c, { model });
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_RESOURCE') {
        return jsonFail(c, 403, 'لا تملك صلاحية تعديل هذا النموذج.', { code: 'FORBIDDEN_RESOURCE' });
      }
      throw err;
    }
  });

  router.patch('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف النموذج غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = monthlyModelPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات التعديل غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    const existing = await repo.getModelById(c.get('caller').uid, idParsed.data);
    if (!existing) {
      return jsonFail(c, 404, 'النموذج غير موجود.', { code: 'NOT_FOUND' });
    }

    const merged = await repo.upsertModel(c.get('caller').uid, {
      id: existing.id,
      name: parsed.data.name ?? existing.name,
      subject: parsed.data.subject ?? existing.subject,
      gradeLevel: parsed.data.gradeLevel ?? existing.gradeLevel,
      teacherName: parsed.data.teacherName ?? existing.teacherName,
      assignedSections:
        parsed.data.assignedSections !== undefined ? parsed.data.assignedSections : existing.assignedSections,
      academicYear: parsed.data.academicYear ?? existing.academicYear,
      totalMaxScore: parsed.data.totalMaxScore ?? existing.totalMaxScore,
      writtenWeight: parsed.data.writtenWeight !== undefined ? parsed.data.writtenWeight : existing.writtenWeight,
      writtenMaxScore: parsed.data.writtenMaxScore ?? existing.writtenMaxScore,
      writtenScoreMode:
        parsed.data.writtenScoreMode !== undefined ? parsed.data.writtenScoreMode : existing.writtenScoreMode,
      roundingMode: parsed.data.roundingMode !== undefined ? parsed.data.roundingMode : existing.roundingMode,
      roundingThreshold:
        parsed.data.roundingThreshold !== undefined ? parsed.data.roundingThreshold : existing.roundingThreshold,
      finalScoreOperation:
        parsed.data.finalScoreOperation !== undefined
          ? parsed.data.finalScoreOperation
          : existing.finalScoreOperation,
      columnLabels: parsed.data.columnLabels !== undefined ? parsed.data.columnLabels : existing.columnLabels,
      customColumns: parsed.data.customColumns,
    });

    return jsonOk(c, { model: merged });
  });

  router.put('/:id/columns', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف النموذج غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = replaceModelColumnsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات الأعمدة غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    try {
      const columns = await repo.replaceModelColumns(c.get('caller').uid, idParsed.data, parsed.data.columns);
      return jsonOk(c, { columns });
    } catch (err: any) {
      if (err?.message === 'NOT_FOUND') {
        return jsonFail(c, 404, 'النموذج غير موجود.', { code: 'NOT_FOUND' });
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف النموذج غير صالح.', { code: 'VALIDATION_ERROR' });
    }
    const repo = new GradebookRepository(c.env.DB);
    const deleted = await repo.deleteModel(c.get('caller').uid, idParsed.data);
    if (!deleted) {
      return jsonFail(c, 404, 'النموذج غير موجود.', { code: 'NOT_FOUND' });
    }
    return jsonOk(c, { deleted: true });
  });

  return router;
}
