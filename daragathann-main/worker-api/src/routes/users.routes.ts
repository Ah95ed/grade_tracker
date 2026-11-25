import { Hono } from 'hono';
import type { WorkerEnv } from '../config/env';
import {
  authenticateMiddleware,
  requireAdminMiddleware,
  type AuthVariables,
} from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { safeIdSchema } from '../schemas/common';
import {
  adminUpdateSubscriptionSchema,
  registerUserSchema,
  updateMyRoleSchema,
} from '../schemas/user.schema';
import { AuthService, ServiceError } from '../services/auth.service';
import type { TokenVerifier } from '../utils/firebaseJwt';
import { jsonFail, jsonOk } from '../utils/http';

export function createUsersRoutes(verifyToken?: TokenVerifier) {
  const router = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();
  const auth = authenticateMiddleware(verifyToken);
  const adminOnly = requireAdminMiddleware();

  router.post('/', auth, rateLimitMiddleware('users_register', 30, 60), async (c) => {
    let rawBody: unknown = {};
    try {
      const text = await c.req.text();
      rawBody = text ? JSON.parse(text) : {};
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = registerUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات التسجيل غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    try {
      const service = new AuthService(c.env.DB, c.env);
      const result = await service.registerOrLogin(c.get('caller'), parsed.data);
      return jsonOk(c, result, result.created ? 201 : 200);
    } catch (err) {
      if (err instanceof ServiceError) {
        return jsonFail(c, err.status as any, err.message, err.code ? { code: err.code } : undefined);
      }
      throw err;
    }
  });

  router.get('/me', auth, async (c) => {
    try {
      const service = new AuthService(c.env.DB, c.env);
      const user = await service.getMyProfile(c.get('caller'));
      return jsonOk(c, { user });
    } catch (err) {
      if (err instanceof ServiceError) {
        return jsonFail(c, err.status as any, err.message, err.code ? { code: err.code } : undefined);
      }
      throw err;
    }
  });

  router.patch('/me/role', auth, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = updateMyRoleSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات الدور غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    try {
      const service = new AuthService(c.env.DB, c.env);
      const user = await service.updateMyRole(c.get('caller'), parsed.data);
      return jsonOk(c, { user });
    } catch (err) {
      if (err instanceof ServiceError) {
        return jsonFail(c, err.status as any, err.message, err.code ? { code: err.code } : undefined);
      }
      throw err;
    }
  });

  router.delete('/me', auth, async (c) => {
    try {
      const caller = c.get('caller');
      const service = new AuthService(c.env.DB, c.env);
      await service.deleteAccount(caller, caller.uid);
      return jsonOk(c, { deleted: true });
    } catch (err) {
      if (err instanceof ServiceError) {
        return jsonFail(c, err.status as any, err.message, err.code ? { code: err.code } : undefined);
      }
      throw err;
    }
  });

  router.get('/', auth, adminOnly, async (c) => {
    const service = new AuthService(c.env.DB, c.env);
    const users = await service.adminListUsers();
    return jsonOk(c, { users, count: users.length });
  });

  router.get('/:uid', auth, adminOnly, async (c) => {
    const uidParsed = safeIdSchema.safeParse(c.req.param('uid'));
    if (!uidParsed.success) {
      return jsonFail(c, 400, 'معرف المستخدم غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    try {
      const service = new AuthService(c.env.DB, c.env);
      const user = await service.adminGetUser(uidParsed.data);
      return jsonOk(c, { user });
    } catch (err) {
      if (err instanceof ServiceError) {
        return jsonFail(c, err.status as any, err.message, err.code ? { code: err.code } : undefined);
      }
      throw err;
    }
  });

  router.put('/:uid', auth, adminOnly, async (c) => {
    const uidParsed = safeIdSchema.safeParse(c.req.param('uid'));
    if (!uidParsed.success) {
      return jsonFail(c, 400, 'معرف المستخدم غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = adminUpdateSubscriptionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات التحديث غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    try {
      const service = new AuthService(c.env.DB, c.env);
      const user = await service.adminUpdateUser(uidParsed.data, parsed.data);
      return jsonOk(c, { user });
    } catch (err) {
      if (err instanceof ServiceError) {
        return jsonFail(c, err.status as any, err.message, err.code ? { code: err.code } : undefined);
      }
      throw err;
    }
  });

  router.delete('/:uid', auth, async (c) => {
    const uidParsed = safeIdSchema.safeParse(c.req.param('uid'));
    if (!uidParsed.success) {
      return jsonFail(c, 400, 'معرف المستخدم غير صالح.', { code: 'VALIDATION_ERROR' });
    }

    try {
      const service = new AuthService(c.env.DB, c.env);
      await service.deleteAccount(c.get('caller'), uidParsed.data);
      return jsonOk(c, { deleted: true });
    } catch (err) {
      if (err instanceof ServiceError) {
        return jsonFail(c, err.status as any, err.message, err.code ? { code: err.code } : undefined);
      }
      throw err;
    }
  });

  return router;
}
