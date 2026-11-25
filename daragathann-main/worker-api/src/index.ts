import { Hono } from 'hono';
import { LIMITS } from './config/constants';
import type { WorkerEnv } from './config/env';
import { API_ENDPOINTS } from './config/registry';
import { corsMiddleware } from './middleware/cors';
import { createHealthRoutes } from './routes/health.routes';
import { createModelsRoutes } from './routes/models.routes';
import { createProfileRoutes } from './routes/profile.routes';
import { createRecordsRoutes } from './routes/records.routes';
import { createStudentsRoutes } from './routes/students.routes';
import { createLegacyDataRoutes, createSyncRoutes } from './routes/sync.routes';
import { createTermsRoutes } from './routes/terms.routes';
import { createUsersRoutes } from './routes/users.routes';
import type { TokenVerifier } from './utils/firebaseJwt';
import { jsonFail } from './utils/http';

export interface AppDependencies {
  verifyToken?: TokenVerifier;
}

export function createApp(deps: AppDependencies = {}) {
  const app = new Hono<{ Bindings: WorkerEnv }>();

  app.use('*', corsMiddleware());

  app.use('*', async (c, next) => {
    const contentLength = Number(c.req.header('Content-Length') || 0);
    if (contentLength > LIMITS.MAX_BODY_BYTES) {
      return jsonFail(c, 413, 'حجم البيانات المرسلة يتجاوز الحد المسموح به (8 ميجابايت).', {
        code: 'PAYLOAD_TOO_LARGE',
      });
    }
    await next();
  });

  app.route(API_ENDPOINTS.HEALTH, createHealthRoutes());
  app.route(API_ENDPOINTS.USERS, createUsersRoutes(deps.verifyToken));
  app.route(API_ENDPOINTS.PROFILE, createProfileRoutes(deps.verifyToken));
  app.route(API_ENDPOINTS.MODELS, createModelsRoutes(deps.verifyToken));
  app.route(API_ENDPOINTS.STUDENTS, createStudentsRoutes(deps.verifyToken));
  app.route(API_ENDPOINTS.RECORDS, createRecordsRoutes(deps.verifyToken));
  app.route(API_ENDPOINTS.TERMS, createTermsRoutes(deps.verifyToken));
  app.route(API_ENDPOINTS.SYNC, createSyncRoutes(deps.verifyToken));
  app.route(API_ENDPOINTS.DATA_SNAPSHOT, createLegacyDataRoutes(deps.verifyToken));

  app.notFound((c) => {
    return jsonFail(c, 404, 'المسار المطلوب غير موجود.', { code: 'ROUTE_NOT_FOUND' });
  });

  app.onError((err, c) => {
    console.error('[Daragat Worker API Error]', err);
    return jsonFail(c, 500, 'حدث خطأ داخلي في الخادم.', { code: 'INTERNAL_ERROR' });
  });

  return app;
}

const app = createApp();

export default {
  fetch: app.fetch,
};
