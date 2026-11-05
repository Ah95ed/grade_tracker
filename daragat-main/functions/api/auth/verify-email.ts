// GET /api/auth/verify-email?token=...
// يفعّل الحساب ثم يحوّل المستخدم إلى الصفحة الرئيسية مع نتيجة العملية.

import { ensureVerificationSchema, type EventContext } from '../../_lib/auth';
import { baseUrl, sha256Hex } from '../../_lib/verification';

function redirect(base: string, result: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${base}/?verified=${result}`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export async function onRequestGet({ request, env }: EventContext): Promise<Response> {
  const base = baseUrl(env, request);
  const token = (new URL(request.url).searchParams.get('token') || '').trim();
  if (!env.DB || !/^[0-9a-f]{64}$/.test(token)) return redirect(base, 'invalid');

  try {
    await ensureVerificationSchema(env.DB);
    const tokenHash = await sha256Hex(token);
    const row = await env.DB
      .prepare('SELECT email, uid, expires_at FROM email_verifications WHERE token_hash = ? LIMIT 1')
      .bind(tokenHash)
      .first<{ email: string; uid: string | null; expires_at: number }>();

    if (!row) return redirect(base, 'invalid');
    if (row.expires_at < Date.now()) return redirect(base, 'expired');

    await env.DB.prepare('DELETE FROM email_verifications WHERE email = ?').bind(row.email).run();

    // حساب أنشأته الإدارة مسبقاً بـ uid مؤقت (user-...): يُربط الآن بصاحب البريد الذي أثبت ملكيته
    if (row.uid) {
      await env.DB
        .prepare("UPDATE users SET uid = ? WHERE LOWER(email) = ? AND uid LIKE 'user-%'")
        .bind(row.uid, row.email)
        .run();
    }
    return redirect(base, '1');
  } catch (err) {
    console.error('verify-email failed:', err);
    return redirect(base, 'error');
  }
}
