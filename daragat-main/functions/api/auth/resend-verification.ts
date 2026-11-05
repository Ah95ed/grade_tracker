// POST /api/auth/resend-verification  { email }
// إعادة إرسال رسالة التفعيل. لا يتطلب تسجيل دخول (الحساب غير المفعّل لا يدخل أصلاً)،
// والرسالة تذهب لصاحب البريد فقط. الرد موحّد حتى لا نكشف إن كان البريد مسجلاً.

import { ensureVerificationSchema, fail, isRateLimited, json, methodNotAllowed, str, type EventContext } from '../../_lib/auth';
import { issueVerification, RESEND_COOLDOWN_MS } from '../../_lib/verification';

export async function onRequest(context: EventContext): Promise<Response> {
  if (context.request.method !== 'POST') return methodNotAllowed();
  const { request, env } = context;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return fail(400, 'صيغة الطلب غير صحيحة.');
  }
  const email = str(body?.email, 320).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'يرجى إدخال بريد إلكتروني صالح.');
  if (!env.DB) return json({ success: true });

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if ((await isRateLimited(env, `resend-ip:${ip}`, 10, 3600)) || (await isRateLimited(env, `resend-em:${email}`, 5, 3600))) {
    return fail(429, 'محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مجدداً.');
  }

  try {
    await ensureVerificationSchema(env.DB);
    const pending = await env.DB
      .prepare('SELECT uid, last_sent_at FROM email_verifications WHERE email = ? LIMIT 1')
      .bind(email)
      .first<{ uid: string | null; last_sent_at: number }>();

    // لا يوجد حساب بانتظار التفعيل، أو أُرسلت رسالة قبل لحظات: رد موحّد بدون إرسال
    if (!pending || Date.now() - pending.last_sent_at < RESEND_COOLDOWN_MS) return json({ success: true });

    const user = await env.DB
      .prepare('SELECT display_name FROM users WHERE LOWER(email) = ? LIMIT 1')
      .bind(email)
      .first<{ display_name: string | null }>();

    const { emailSent } = await issueVerification(env, request, {
      email,
      uid: pending.uid || '',
      displayName: user?.display_name || '',
    });
    if (!emailSent) return fail(502, 'تعذر إرسال رسالة التفعيل حالياً. يرجى المحاولة بعد قليل.');
    return json({ success: true });
  } catch (err) {
    console.error('resend-verification failed:', err);
    return fail(500, 'تعذر إعادة إرسال رسالة التفعيل.');
  }
}
