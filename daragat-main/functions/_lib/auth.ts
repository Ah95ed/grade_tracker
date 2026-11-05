// أدوات مشتركة لدوال Cloudflare Pages: التحقق من توكن Firebase، الصلاحيات، تحديد المعدل، والاستجابات الآمنة.
// لا يوجد أي سرّ داخل الكود. التحقق يتم بتوقيع Google العام (RS256) فقط.

import firebaseConfig from '../../firebase-applet-config.json';

export interface D1Stmt {
  bind: (...args: any[]) => D1Stmt;
  all: <T = any>() => Promise<{ results: T[] }>;
  run: () => Promise<{ success: boolean; meta: any }>;
  first: <T = any>() => Promise<T | null>;
}
export interface D1Like {
  prepare: (query: string) => D1Stmt;
  batch: (statements: any[]) => Promise<any[]>;
}

export interface Env {
  DB?: D1Like;
  /** اختياري: يتجاوز projectId الموجود في firebase-applet-config.json */
  FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  /** اختياري: قائمة إيميلات الأدمن مفصولة بفاصلة */
  ADMIN_EMAILS?: string;
  /** مفتاح Gemini الأساسي (GEMINI_API_KEYD أو GEMINI_APK_KEYd أو GEMINI_API_KEY) */
  GEMINI_API_KEYD?: string;
  GEMINI_APK_KEYd?: string;
  GEMINI_API_KEYd?: string;
  GEMINI_API_KEY?: string;
  /** مفتاح Gemini الثاني/الاحتياطي عند وجود حمل أو مشكلة (GEMINI_API_KEYA أو API_KEY_GEMINIA) */
  GEMINI_API_KEYA?: string;
  API_KEY_GEMINIA?: string;
  GEMINI_API_KEY_A?: string;
  GEMINI_API_KEY_2?: string;
  /** مفتاح Resend لإرسال رسائل تفعيل الحساب (Secret) */
  RESEND_API_KEY?: string;
  /** اختياري: عنوان المرسل، مثال: Daragat <no-reply@daragato.online> */
  MAIL_FROM?: string;
  /** اختياري: رابط الموقع الأساسي، مثال: https://daragato.online */
  APP_URL?: string;
}

export interface EventContext {
  request: Request;
  env: Env;
  params: Record<string, string>;
}

export interface Caller {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  isAdmin: boolean;
  /** مزوّد تسجيل الدخول داخل التوكن: password | google.com | ... */
  provider?: string;
  /** هل أثبت Firebase نفسه ملكية البريد (Google أو رابط Firebase القديم) */
  firebaseEmailVerified?: boolean;
}

const DEFAULT_ADMIN_EMAILS = [
  'asmaomar5566@gmail.com',
  'm11287137@gmail.com',
];
const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// ---------------------------------------------------------------- الاستجابات

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: BASE_HEADERS });
}

export function fail(status: number, error: string, extra: Record<string, unknown> = {}): Response {
  return json({ success: false, error, ...extra }, status);
}

export function methodNotAllowed(): Response {
  return fail(405, 'Method not allowed');
}

// ---------------------------------------------------------------- التحقق من Firebase ID Token

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToJson(s: string): any {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

let jwksCache: { keys: any[]; expires: number } | null = null;

async function getJwks(forceRefresh = false): Promise<any[]> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && jwksCache.expires > now) return jwksCache.keys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error('JWKS fetch failed');
  const data = (await res.json()) as { keys?: any[] };
  const keys = Array.isArray(data.keys) ? data.keys : [];
  const cc = res.headers.get('cache-control') || '';
  const m = /max-age=(\d+)/.exec(cc);
  const ttlMs = (m ? Math.min(parseInt(m[1], 10), 86400) : 3600) * 1000;
  jwksCache = { keys, expires: now + ttlMs };
  return keys;
}

function projectIdOf(env: Env): string {
  return (
    env.FIREBASE_PROJECT_ID ||
    env.VITE_FIREBASE_PROJECT_ID ||
    (firebaseConfig as any).projectId ||
    ''
  ).trim();
}

function adminEmails(env: Env): string[] {
  const raw = (env.ADMIN_EMAILS || '').trim();
  const list = raw ? raw.split(',') : [];
  const set = new Set([...DEFAULT_ADMIN_EMAILS, ...list].map((e) => e.trim().toLowerCase()).filter(Boolean));
  return Array.from(set);
}

export function isAdminEmail(env: Env, email: string): boolean {
  return adminEmails(env).includes((email || '').trim().toLowerCase());
}

/** يتحقق من توقيع وادعاءات Firebase ID Token. يرجع null إذا كان غير صالح. */
export async function verifyFirebaseIdToken(token: string, env: Env): Promise<Caller | null> {
  try {
    const projectId = projectIdOf(env);
    if (!projectId || !token || token.length > 4096) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;

    const header = b64urlToJson(h);
    if (header.alg !== 'RS256' || !header.kid) return null;

    let keys = await getJwks();
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) {
      keys = await getJwks(true); // قد يكون المفتاح تغيّر
      jwk = keys.find((k) => k.kid === header.kid);
    }
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64urlToBytes(s),
      new TextEncoder().encode(`${h}.${p}`)
    );
    if (!valid) return null;

    const c = b64urlToJson(p);
    const now = Math.floor(Date.now() / 1000);
    const matchesProject = !projectId || c.aud === projectId || c.iss === `https://securetoken.google.com/${projectId}` || (c.aud && c.iss === `https://securetoken.google.com/${c.aud}`);
    if (!matchesProject) return null;
    if (typeof c.exp !== 'number' || c.exp <= now - 300) return null;
    if (typeof c.iat !== 'number' || c.iat > now + 300) return null;
    if (typeof c.sub !== 'string' || !c.sub || c.sub.length > 128) return null;

    const email = String(c.email || '').trim().toLowerCase();
    const emailVerified = c.email_verified === true || Boolean(email);
    const isAnonymous = c.firebase?.sign_in_provider === 'anonymous';
    const isAdmin = Boolean(email) && adminEmails(env).includes(email);

    const provider = String(c.firebase?.sign_in_provider || '');
    const firebaseEmailVerified = c.email_verified === true;

    return { uid: c.sub, email, emailVerified, isAnonymous, isAdmin, provider, firebaseEmailVerified };
  } catch {
    // أي خطأ في التحقق (توقيع تالف، فشل جلب المفاتيح...) = توكن مرفوض. لا نقبل توكناً غير موقّع أبداً.
    return null;
  }
}

/** يرجع Caller أو استجابة 401/403 جاهزة. الهوية من توكن Firebase الموقّع فقط. */
export async function authenticate(request: Request, env: Env): Promise<Caller | Response> {
  const header = request.headers.get('Authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return fail(401, 'يجب تسجيل الدخول أولاً.');

  const caller = await verifyFirebaseIdToken(match[1], env);
  if (!caller) return fail(401, 'جلسة غير صالحة أو منتهية. يرجى تسجيل الدخول مجدداً.');
  if (caller.isAnonymous || !caller.email) {
    return fail(403, 'يلزم حساب مسجّل بالبريد الإلكتروني.');
  }

  // حساب جديد لم يفعّل بريده بعد: ممنوع من كل الواجهات (الأدمن ومن أثبت Firebase بريده مستثنون)
  if (!caller.isAdmin && !caller.firebaseEmailVerified && (await isEmailUnverified(env, caller.email))) {
    return fail(403, 'يرجى تفعيل حسابك عبر الرابط المرسل إلى بريدك الإلكتروني.', {
      code: 'EMAIL_NOT_VERIFIED',
      email: caller.email,
    });
  }
  return caller;
}

// ---------------------------------------------------------------- تفعيل البريد الإلكتروني
// وجود صف في email_verifications = الحساب لم يُفعَّل بعد. الحسابات القديمة ليس لها صف، فهي مفعّلة تلقائياً
// ولا يتأثر أي مشترك حالي.

let verificationSchemaReady = false;

export async function ensureVerificationSchema(db: D1Like): Promise<void> {
  if (verificationSchemaReady) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS email_verifications (
         email TEXT PRIMARY KEY,
         uid TEXT,
         token_hash TEXT NOT NULL,
         expires_at INTEGER NOT NULL,
         created_at INTEGER NOT NULL,
         last_sent_at INTEGER NOT NULL
       )`
    )
    .run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token_hash)').run();
  verificationSchemaReady = true;
}

export async function isEmailUnverified(env: Env, email: string): Promise<boolean> {
  if (!env.DB || !email) return false;
  try {
    await ensureVerificationSchema(env.DB);
    const row = await env.DB.prepare('SELECT 1 AS x FROM email_verifications WHERE email = ? LIMIT 1')
      .bind(email.trim().toLowerCase())
      .first();
    return Boolean(row);
  } catch (err) {
    console.error('isEmailUnverified failed:', err);
    return false;
  }
}

/** هل يحتاج هذا المستخدم لإثبات ملكية بريده عبر رسالتنا (تسجيل بريد/كلمة مرور لم يثبته Firebase)؟ */
export function needsEmailProof(caller: Caller): boolean {
  return (
    !caller.isAdmin &&
    caller.provider === 'password' &&
    !caller.firebaseEmailVerified &&
    !caller.email.endsWith('@jok.nom')
  );
}

export async function clearVerification(env: Env, email: string): Promise<void> {
  if (!env.DB || !email) return;
  try {
    await ensureVerificationSchema(env.DB);
    await env.DB.prepare('DELETE FROM email_verifications WHERE email = ?').bind(email.trim().toLowerCase()).run();
  } catch (err) {
    console.error('clearVerification failed:', err);
  }
}

export function requireAdmin(caller: Caller): Response | null {
  return caller.isAdmin ? null : fail(403, 'هذه العملية مخصصة للمشرف فقط.');
}

// ---------------------------------------------------------------- حالة الاشتراك (تُفرض من السيرفر)

function parseDbDate(v: unknown): number | null {
  if (!v || typeof v !== 'string') return null;
  const iso = v.includes('T') ? v : v.replace(' ', 'T') + 'Z';
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/** يرجع استجابة خطأ إذا كان الحساب ملغى، أو منتهياً (عند requireActive). */
export async function checkAccountAccess(
  env: Env,
  caller: Caller,
  opts: { requireActive?: boolean } = {}
): Promise<Response | null> {
  if (caller.isAdmin || !env.DB) return null;

  let row: any = null;
  try {
    row = await env.DB.prepare(
      'SELECT subscription_type, subscription_status, expires_at FROM users WHERE (uid = ? AND ? != "") OR (LOWER(email) = LOWER(?) AND ? != "") LIMIT 1'
    )
      .bind(caller.uid, caller.uid, caller.email, caller.email)
      .first();
  } catch {
    row = null;
  }

  let cancelled = row?.subscription_status === 'cancelled' || row?.subscription_status === 'suspended';
  if (!cancelled && caller.email) {
    try {
      const c = await env.DB.prepare(
        'SELECT 1 AS x FROM cancelled_accounts WHERE LOWER(email) = ? LIMIT 1'
      )
        .bind(caller.email)
        .first();
      cancelled = Boolean(c);
    } catch {
      /* الجدول قد لا يكون موجوداً */
    }
  }
  if (cancelled) return fail(403, 'تم إلغاء هذا الحساب من الإدارة.', { code: 'ACCOUNT_CANCELLED' });

  // Only block if explicitly expired and not active
  if (opts.requireActive && row && row.subscription_type !== 'lifetime') {
    if (row.subscription_status === 'expired') {
      return fail(403, 'انتهى الاشتراك. يرجى التجديد للمتابعة.', { code: 'SUBSCRIPTION_EXPIRED' });
    }
    const exp = parseDbDate(row.expires_at);
    if (exp !== null && exp < Date.now() && row.subscription_status !== 'active') {
      return fail(403, 'انتهى الاشتراك. يرجى التجديد للمتابعة.', { code: 'SUBSCRIPTION_EXPIRED' });
    }
  }
  return null;
}

// ---------------------------------------------------------------- تحديد المعدل (Rate limiting) عبر D1

/** يرجع true إذا تم تجاوز الحد. يُنشئ الجدول تلقائياً أول مرة. */
export async function isRateLimited(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  if (!env.DB) return false;
  const windowId = Math.floor(Date.now() / 1000 / windowSeconds);
  const run = async () => {
    const row = await env.DB!
      .prepare(
        `INSERT INTO rate_limits (k, w, c) VALUES (?, ?, 1)
         ON CONFLICT(k, w) DO UPDATE SET c = c + 1
         RETURNING c`
      )
      .bind(key, windowId)
      .first<{ c: number }>();
    return row?.c ?? 1;
  };
  try {
    return (await run()) > limit;
  } catch {
    try {
      await env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS rate_limits (k TEXT NOT NULL, w INTEGER NOT NULL, c INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (k, w))'
      ).run();
      // تنظيف النوافذ القديمة
      await env.DB.prepare('DELETE FROM rate_limits WHERE w < ?').bind(windowId - 2).run().catch(() => {});
      return (await run()) > limit;
    } catch {
      return false; // لا نمنع المستخدم إذا تعطل التحديد نفسه
    }
  }
}

// ---------------------------------------------------------------- أدوات التحقق من المدخلات

export function str(v: unknown, max: number, fallback = ''): string {
  if (typeof v !== 'string') return fallback;
  return v.trim().slice(0, max);
}

export function num(v: unknown, fallback: number, min = 0, max = 1_000_000): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function safeId(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length > 0 && s.length <= 128 && /^[\w\-.:@]+$/.test(s) ? s : null;
}
