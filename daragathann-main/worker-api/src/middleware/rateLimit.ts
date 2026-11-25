import type { MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../config/env';
import { jsonFail } from '../utils/http';
import type { AuthVariables } from './auth';

export function rateLimitMiddleware(
  prefix: string,
  limit: number,
  windowSeconds: number
): MiddlewareHandler<{ Bindings: WorkerEnv; Variables: AuthVariables }> {
  return async (c, next) => {
    if (!c.env.DB) {
      await next();
      return;
    }

    const caller = c.get('caller');
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || 'local';
    const key = `${prefix}:${caller?.uid || ip}`;
    const windowId = Math.floor(Date.now() / 1000 / windowSeconds);

    try {
      const row = await c.env.DB
        .prepare(
          `INSERT INTO rate_limits (k, w, c) VALUES (?, ?, 1)
           ON CONFLICT(k, w) DO UPDATE SET c = c + 1
           RETURNING c`
        )
        .bind(key, windowId)
        .first<{ c: number }>();

      if ((row?.c ?? 1) > limit) {
        return jsonFail(c, 429, 'تم تجاوز حد الطلبات المسموح به. يرجى المحاولة بعد قليل.', {
          code: 'RATE_LIMITED',
        });
      }
    } catch {
      // Do not block legitimate traffic if rate_limits table is unavailable
    }

    await next();
  };
}
