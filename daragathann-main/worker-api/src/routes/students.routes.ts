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
  studentBulkUpsertSchema,
  studentPatchSchema,
  studentUpsertSchema,
} from '../schemas/student.schema';
import { normalizeToUtcIso } from '../utils/dates';
import type { TokenVerifier } from '../utils/firebaseJwt';
import { jsonFail, jsonOk } from '../utils/http';

export function createStudentsRoutes(verifyToken?: TokenVerifier) {
  const router = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();
  const auth = authenticateMiddleware(verifyToken);
  const sub = requireSubscriptionMiddleware();

  router.use('*', auth, sub);

  router.get('/', async (c) => {
    const pq = paginationQuerySchema.safeParse({
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });
    const limit = pq.success ? pq.data.limit : 100;
    const offset = pq.success ? pq.data.offset : 0;
    const since = c.req.query('since') ? normalizeToUtcIso(c.req.query('since')) ?? undefined : undefined;
    const section = c.req.query('section')?.trim() || undefined;
    const gradeLevel = c.req.query('gradeLevel')?.trim() || undefined;

    const repo = new GradebookRepository(c.env.DB);
    const result = await repo.listStudents(c.get('caller').uid, {
      section,
      gradeLevel,
      since,
      limit,
      offset,
    });
    return jsonOk(c, {
      students: result.students,
      total: result.total,
      limit,
      offset,
    });
  });

  router.get('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف الطالب غير صالح.', { code: 'VALIDATION_ERROR' });
    }
    const repo = new GradebookRepository(c.env.DB);
    const student = await repo.getStudentById(c.get('caller').uid, idParsed.data);
    if (!student) {
      return jsonFail(c, 404, 'الطالب غير موجود.', { code: 'NOT_FOUND' });
    }
    return jsonOk(c, { student });
  });

  router.post('/', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = studentUpsertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات الطالب غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    const id = parsed.data.id || crypto.randomUUID();
    try {
      const student = await repo.upsertStudent(c.get('caller').uid, { ...parsed.data, id });
      return jsonOk(c, { student }, 201);
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_RESOURCE') {
        return jsonFail(c, 403, 'لا تملك صلاحية تعديل هذا الطالب.', { code: 'FORBIDDEN_RESOURCE' });
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

    const parsed = studentBulkUpsertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'قائمة الطلاب غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    try {
      const students = await repo.bulkUpsertStudents(c.get('caller').uid, parsed.data.students);
      return jsonOk(c, { students, count: students.length });
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_RESOURCE') {
        return jsonFail(c, 403, 'لا تملك صلاحية تعديل أحد الطلاب.', { code: 'FORBIDDEN_RESOURCE' });
      }
      throw err;
    }
  });

  router.put('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف الطالب غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = studentUpsertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات الطالب غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    try {
      const student = await repo.upsertStudent(c.get('caller').uid, {
        ...parsed.data,
        id: idParsed.data,
      });
      return jsonOk(c, { student });
    } catch (err: any) {
      if (err?.message === 'FORBIDDEN_RESOURCE') {
        return jsonFail(c, 403, 'لا تملك صلاحية تعديل هذا الطالب.', { code: 'FORBIDDEN_RESOURCE' });
      }
      throw err;
    }
  });

  router.patch('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف الطالب غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = studentPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات التعديل غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    const existing = await repo.getStudentById(c.get('caller').uid, idParsed.data);
    if (!existing) {
      return jsonFail(c, 404, 'الطالب غير موجود.', { code: 'NOT_FOUND' });
    }

    const student = await repo.upsertStudent(c.get('caller').uid, {
      id: existing.id,
      name: parsed.data.name ?? existing.name,
      gradeLevel: parsed.data.gradeLevel ?? existing.gradeLevel,
      section: parsed.data.section ?? existing.section,
    });
    return jsonOk(c, { student });
  });

  router.delete('/:id', async (c) => {
    const idParsed = safeIdSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return jsonFail(c, 400, 'معرف الطالب غير صالح.', { code: 'VALIDATION_ERROR' });
    }
    const repo = new GradebookRepository(c.env.DB);
    const deleted = await repo.deleteStudent(c.get('caller').uid, idParsed.data);
    if (!deleted) {
      return jsonFail(c, 404, 'الطالب غير موجود.', { code: 'NOT_FOUND' });
    }
    return jsonOk(c, { deleted: true });
  });

  return router;
}
