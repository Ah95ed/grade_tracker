import { Hono } from 'hono';
import type { WorkerEnv } from '../config/env';
import {
  authenticateMiddleware,
  requireSubscriptionMiddleware,
  type AuthVariables,
} from '../middleware/auth';
import { GradebookRepository } from '../repositories/gradebook.repository';
import { safeIdSchema } from '../schemas/common';
import { termPatchSchema, termUpsertSchema } from '../schemas/term.schema';
import { normalizeToUtcIso } from '../utils/dates';
import type { TokenVerifier } from '../utils/firebaseJwt';
import { jsonFail, jsonOk } from '../utils/http';

export function createTermsRoutes(verifyToken?: TokenVerifier) {
  const router = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();
  const auth = authenticateMiddleware(verifyToken);
  const sub = requireSubscriptionMiddleware();

  router.use('*', auth, sub);

  router.get('/', async (c) => {
    const since = c.req.query('since') ? normalizeToUtcIso(c.req.query('since')) ?? undefined : undefined;
    const repo = new GradebookRepository(c.env.DB);
    const terms = await repo.listTerms(c.get('caller').uid, { since });
    return jsonOk(c, { terms, count: terms.length });
  });

  router.get('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف الفصل غير صالح.', { code: 'VALIDATION_ERROR' });
    }
    const repo = new GradebookRepository(c.env.DB);
    const term = await repo.getTermById(c.get('caller').uid, idParsed.data);
    if (!term) {
      return jsonFail(c, 404, 'الفصل غير موجود.', { code: 'NOT_FOUND' });
    }
    return jsonOk(c, { term });
  });

  router.post('/', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = termUpsertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات الفصل غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    const id = parsed.data.id || crypto.randomUUID();
    try {
      const term = await repo.upsertTerm(c.get('caller').uid, { ...parsed.data, id });
      return jsonOk(c, { term }, 201);
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_RESOURCE') {
        return jsonFail(c, 403, 'لا تملك صلاحية تعديل هذا الفصل.', { code: 'FORBIDDEN_RESOURCE' });
      }
      throw err;
    }
  });

  router.put('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف الفصل غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = termUpsertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات الفصل غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    try {
      const term = await repo.upsertTerm(c.get('caller').uid, {
        ...parsed.data,
        id: idParsed.data,
      });
      return jsonOk(c, { term });
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_RESOURCE') {
        return jsonFail(c, 403, 'لا تملك صلاحية تعديل هذا الفصل.', { code: 'FORBIDDEN_RESOURCE' });
      }
      throw err;
    }
  });

  router.patch('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف الفصل غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = termPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات التعديل غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    const existing = await repo.getTermById(c.get('caller').uid, idParsed.data);
    if (!existing) {
      return jsonFail(c, 404, 'الفصل غير موجود.', { code: 'NOT_FOUND' });
    }

    const term = await repo.upsertTerm(c.get('caller').uid, {
      id: existing.id,
      name: parsed.data.name ?? existing.name,
      subject: parsed.data.subject ?? existing.subject,
      gradeLevel: parsed.data.gradeLevel ?? existing.gradeLevel,
      teacherName: parsed.data.teacherName ?? existing.teacherName,
      assignedSections:
        parsed.data.assignedSections !== undefined ? parsed.data.assignedSections : existing.assignedSections,
      calculationMode: parsed.data.calculationMode ?? existing.calculationMode,
      notes: parsed.data.notes ?? existing.notes,
      roundingMode: parsed.data.roundingMode !== undefined ? parsed.data.roundingMode : existing.roundingMode,
      roundingThreshold:
        parsed.data.roundingThreshold !== undefined ? parsed.data.roundingThreshold : existing.roundingThreshold,
      sourceType: parsed.data.sourceType ?? existing.sourceType,
      selectedModelIds: parsed.data.selectedModelIds ?? existing.selectedModelIds,
      selectedTermIds:
        parsed.data.selectedTermIds !== undefined ? parsed.data.selectedTermIds : existing.selectedTermIds,
    });

    return jsonOk(c, { term });
  });

  router.delete('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف الفصل غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    const repo = new GradebookRepository(c.env.DB);
    const deleted = await repo.deleteTerm(c.get('caller').uid, idParsed.data);
    if (!deleted) {
      return jsonFail(c, 404, 'الفصل غير موجود.', { code: 'NOT_FOUND' });
    }
    return jsonOk(c, { deleted: true });
  });

  return router;
}
