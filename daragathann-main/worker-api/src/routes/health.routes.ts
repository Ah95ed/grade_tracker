import { Hono } from 'hono';
import type { WorkerEnv } from '../config/env';
import { nowUtcIso } from '../utils/dates';
import { jsonFail, jsonOk } from '../utils/http';

export function createHealthRoutes() {
  const router = new Hono<{ Bindings: WorkerEnv }>();

  router.get('/', async (c) => {
    try {
      let dbConnected = false;
      if (c.env?.DB) {
        const ping = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
        dbConnected = ping?.ok === 1;
      }
      return jsonOk(c, {
        status: 'ok',
        service: 'daragat-worker-api',
        version: '1.0.0',
        dbConnected,
        timestamp: nowUtcIso(),
      });
    } catch {
      return jsonFail(c, 503, 'قاعدة البيانات غير متاحة حالياً.', { code: 'DB_UNAVAILABLE' });
    }
  });

  return router;
}
