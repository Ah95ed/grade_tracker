import { Hono } from 'hono';
import type { WorkerEnv } from '../config/env';
import {
  authenticateMiddleware,
  requireSubscriptionMiddleware,
  type AuthVariables,
} from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { safeIdSchema, syncQuerySchema } from '../schemas/common';
import { legacySnapshotSchema, syncPushSchema } from '../schemas/sync.schema';
import { AuthService, ServiceError } from '../services/auth.service';
import { SyncService } from '../services/sync.service';
import type { TokenVerifier } from '../utils/firebaseJwt';
import { jsonFail, jsonOk } from '../utils/http';

export function createSyncRoutes(verifyToken?: TokenVerifier) {
  const router = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();
  const auth = authenticateMiddleware(verifyToken);
  const sub = requireSubscriptionMiddleware();

  router.use('*', auth, sub);

  router.get('/', async (c) => {
    const parsed = syncQuerySchema.safeParse({
      since: c.req.query('since'),
      includeDeleted: c.req.query('includeDeleted'),
    });
    if (!parsed.success) {
      return jsonFail(c, 400, 'معاملات المزامنة غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    const service = new SyncService(c.env.DB);
    const delta = await service.pullDelta(c.get('caller').uid, parsed.data);
    return jsonOk(c, delta);
  });

  router.post('/', rateLimitMiddleware('sync_push', 60, 60), async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = syncPushSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'حزمة المزامنة غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    try {
      const service = new SyncService(c.env.DB);
      const result = await service.pushDelta(c.get('caller').uid, parsed.data);
      return jsonOk(c, result);
    } catch (err) {
      if (err instanceof ServiceError) {
        return jsonFail(c, err.status as any, err.message, err.code ? { code: err.code } : undefined);
      }
      throw err;
    }
  });

  return router;
}

export function createLegacyDataRoutes(verifyToken?: TokenVerifier) {
  const router = new Hono<{ Bindings: WorkerEnv; Variables: AuthVariables }>();
  const auth = authenticateMiddleware(verifyToken);
  const sub = requireSubscriptionMiddleware();

  router.get('/', auth, sub, async (c) => {
    const caller = c.get('caller');
    const requestedUid = c.req.query('uid')?.trim();
    let targetUid = caller.uid;

    if (requestedUid && requestedUid !== caller.uid) {
      if (!caller.isAdmin) {
        return jsonFail(c, 403, 'لا تملك صلاحية قراءة بيانات مستخدم آخر.', { code: 'FORBIDDEN' });
      }
      const uidParsed = safeIdSchema.safeParse(requestedUid);
      if (!uidParsed.success) {
        return jsonFail(c, 400, 'معرف المستخدم غير صالح.', { code: 'VALIDATION_ERROR' });
      }
      targetUid = uidParsed.data;
    }

    const service = new SyncService(c.env.DB);
    const snapshot = await service.getSnapshot(targetUid);
    return jsonOk(c, snapshot);
  });

  router.post('/', auth, sub, rateLimitMiddleware('data_snapshot', 30, 60), async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return jsonFail(c, 400, 'تنسيق JSON غير صالح.', { code: 'INVALID_JSON' });
    }

    const parsed = legacySnapshotSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(c, 400, 'بيانات النسخة الاحتياطية غير صالحة.', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      });
    }

    try {
      const service = new SyncService(c.env.DB);
      const result = await service.saveSnapshot(c.get('caller').uid, parsed.data);
      return jsonOk(c, result);
    } catch (err) {
      if (err instanceof ServiceError) {
        return jsonFail(c, err.status as any, err.message, err.code ? { code: err.code } : undefined);
      }
      throw err;
    }
  });

  router.delete('/', auth, async (c) => {
    try {
      const caller = c.get('caller');
      const authService = new AuthService(c.env.DB, c.env);
      await authService.deleteAccount(caller, caller.uid);
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
