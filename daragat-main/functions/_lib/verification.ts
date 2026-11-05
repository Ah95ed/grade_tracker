// إنشاء رموز تفعيل البريد وإرسالها عبر Resend.
// لا يوجد أي سرّ في الكود: RESEND_API_KEY يُقرأ من Secrets في Cloudflare فقط.

import { ensureVerificationSchema, type Env } from './auth';

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 ساعة
export const RESEND_COOLDOWN_MS = 60 * 1000; // دقيقة بين كل رسالتين

const DEFAULT_FROM = 'Daragat <no-reply@daragato.online>';

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function baseUrl(env: Env, request: Request): string {
  const configured = (env.APP_URL || '').trim().replace(/\/+$/, '');
  if (/^https:\/\//i.test(configured)) return configured;
  return new URL(request.url).origin;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function emailHtml(name: string, link: string): string {
  const safeName = escapeHtml(name || 'المعلم');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<body style="margin:0;padding:24px;background:#F4EFEA;font-family:Tahoma,Arial,sans-serif;color:#2E2B27;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #E8E4DA;border-radius:16px;padding:28px;text-align:right;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#2E485C;">تفعيل حسابك في دفتر رصد الدرجات</h2>
    <p style="font-size:15px;line-height:1.8;margin:0 0 8px;">أهلاً ${safeName}،</p>
    <p style="font-size:15px;line-height:1.8;margin:0 0 20px;">اضغط على الزر التالي لتفعيل حسابك ثم سجّل الدخول:</p>
    <p style="text-align:center;margin:0 0 20px;">
      <a href="${link}" style="display:inline-block;background:#557A95;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:12px;">تفعيل الحساب</a>
    </p>
    <p style="font-size:12px;line-height:1.7;color:#7A746B;margin:0 0 6px;">إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:</p>
    <p style="font-size:12px;line-height:1.6;color:#557A95;margin:0 0 16px;word-break:break-all;direction:ltr;text-align:left;">${link}</p>
    <p style="font-size:12px;line-height:1.7;color:#7A746B;margin:0;">الرابط صالح لمدة 24 ساعة. إذا لم تقم بإنشاء هذا الحساب فتجاهل هذه الرسالة.</p>
  </div>
</body>
</html>`;
}

/** يرسل رسالة التفعيل عبر Resend. يرجع true عند النجاح. */
async function sendVerificationEmail(env: Env, to: string, name: string, link: string): Promise<boolean> {
  const apiKey = (env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: (env.MAIL_FROM || '').trim() || DEFAULT_FROM,
        to: [to],
        subject: 'تفعيل حسابك في دفتر رصد الدرجات',
        html: emailHtml(name, link),
        text: `أهلاً ${name || ''}\nلتفعيل حسابك افتح الرابط التالي (صالح 24 ساعة):\n${link}\nإذا لم تقم بإنشاء هذا الحساب فتجاهل الرسالة.`,
      }),
    });
    if (!res.ok) {
      console.error('Resend rejected the email:', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error('Resend request failed:', err);
    return false;
  }
}

/**
 * ينشئ (أو يجدد) رمز تفعيل للبريد ويرسله. يخزّن hash الرمز فقط، لا الرمز نفسه.
 * يرجع emailSent=false إذا فشل الإرسال (يبقى الحساب بانتظار التفعيل ويمكن إعادة الإرسال).
 */
export async function issueVerification(
  env: Env,
  request: Request,
  params: { email: string; uid: string; displayName: string }
): Promise<{ emailSent: boolean }> {
  if (!env.DB) return { emailSent: false };
  const email = params.email.trim().toLowerCase();
  await ensureVerificationSchema(env.DB);

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = Date.now();

  await env.DB
    .prepare(
      `INSERT INTO email_verifications (email, uid, token_hash, expires_at, created_at, last_sent_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         uid = excluded.uid,
         token_hash = excluded.token_hash,
         expires_at = excluded.expires_at,
         last_sent_at = excluded.last_sent_at`
    )
    .bind(email, params.uid, tokenHash, now + VERIFY_TTL_MS, now, now)
    .run();

  const link = `${baseUrl(env, request)}/api/auth/verify-email?token=${token}`;
  const emailSent = await sendVerificationEmail(env, email, params.displayName, link);
  return { emailSent };
}
