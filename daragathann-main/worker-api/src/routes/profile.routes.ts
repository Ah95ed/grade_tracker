import { Hono } from 'hono';
import type { WorkerEnv } from '../config/env';
import {
  authenticateMiddleware,
  requireSubscriptionMiddleware,
  type AuthVariables,
} from '../middleware/auth';
import { GradebookRepository } from '../repositories/gradebook.repository';
import { teacherProfileUpsertSchema } from '../schemas/profile.schema';
import type { TokenVerifier } from '../utils/firebaseJwt';
import { jsonFail, jsonOk } from '../utils/http';

export function createProfileRoutes(verifyToken?: TokenVerifier) {
  const router = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();
  const auth = authenticateMiddleware(verifyToken);
  const sub = requireSubscriptionMiddleware();

  router.use('*', auth, sub);

  router.get('/', async (c) => {
    const repo = new GradebookRepository(c.env.DB);
    const profile = await repo.getProfile(c.get('caller').uid);
    return jsonOk(c, { profile });
  });

  router.put('/', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = teacherProfileUpsertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات ملف المعلم غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const repo = new GradebookRepository(c.env.DB);
    const profile = await repo.upsertProfile(c.get('caller').uid, parsed.data);
    return jsonOk(c, { profile });
  });

  return router;
}
