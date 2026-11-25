import type { MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../config/env';

export function corsMiddleware(): MiddlewareHandler<{ Bindings: WorkerEnv }> {
  return async (c, next) => {
    const allowedOrigin = c.env?.CORS_ORIGIN?.trim() || '*';
    const requestOrigin = c.req.header('Origin') || '*';
    const originHeader = allowedOrigin === '*' ? '*' : allowedOrigin.split(',').includes(requestOrigin) ? requestOrigin : allowedOrigin.split(',')[0];

    c.header('Access-Control-Allow-Origin', originHeader);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Platform, X-App-Version');
    c.header('Access-Control-Max-Age', '86400');

    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }

    await next();
  };
}
