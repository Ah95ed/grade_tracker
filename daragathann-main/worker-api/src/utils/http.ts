import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function jsonOk<T extends Record<string, unknown>>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200
): Response {
  return c.json({ success: true, ...data }, status);
}

export function jsonFail(
  c: Context,
  status: ContentfulStatusCode,
  error: string,
  extra?: Record<string, unknown>
): Response {
  return c.json({ success: false, error, ...(extra || {}) }, status);
}

export function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeSerialize(val: unknown, maxLen = 30000): string | null {
  if (val === null || val === undefined) return null;
  try {
    const serialized = JSON.stringify(val);
    return serialized.length <= maxLen ? serialized : null;
  } catch {
    return null;
  }
}
