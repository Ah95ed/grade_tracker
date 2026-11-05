// Cloudflare Pages Function: /api/users
// - المستخدم العادي: يرى سجله فقط، ويسجّل نفسه فقط (بدون تحديد صلاحيات أو اشتراك).
// - الأدمن فقط: عرض كل المستخدمين، تعديل الاشتراك، حذف المستخدمين.

import {
  authenticate,
  clearVerification,
  fail,
  isAdminEmail,
  json,
  methodNotAllowed,
  needsEmailProof,
  requireAdmin,
  str,
  type Caller,
  type D1Like,
  type EventContext,
} from '../_lib/auth';
import { deleteAllUserData } from '../_lib/userdata';
import { issueVerification } from '../_lib/verification';

const SUB_TYPES = ['trial', 'monthly', 'yearly', 'lifetime'];
const SUB_STATUSES = ['active', 'expired', 'cancelled', 'suspended'];

// ننشئ الجداول مرة واحدة لكل isolate (وليس مع كل طلب)
let schemaReady: Promise<void> | null = null;
function ensureSchema(db: D1Like): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            display_name TEXT DEFAULT NULL,
            user_role TEXT DEFAULT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0,
            subscription_type TEXT NOT NULL DEFAULT 'trial',
            subscription_status TEXT NOT NULL DEFAULT 'pending',
            expires_at TEXT DEFAULT NULL,
            last_active_at TEXT DEFAULT (datetime('now')),
            created_at TEXT DEFAULT (datetime('now'))
          )`
        )
        .run();
      try {
        await db.prepare('ALTER TABLE users ADD COLUMN user_role TEXT DEFAULT NULL').run();
      } catch {}
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS cancelled_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            reason TEXT DEFAULT 'ملغي من الإدارة',
            cancelled_at TEXT DEFAULT (datetime('now'))
          )`
        )
        .run();
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS teacher_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_uid TEXT NOT NULL UNIQUE,
            teacher_name TEXT DEFAULT NULL,
            school_name TEXT DEFAULT NULL,
            subject TEXT DEFAULT NULL,
            academic_year TEXT DEFAULT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
          )`
        )
        .run();
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

const USER_SELECT = `
  SELECT u.uid, u.email,
         COALESCE(u.display_name, tp.teacher_name, u.email) AS displayName,
         u.is_admin AS isAdmin, u.subscription_type AS subscriptionType,
         u.subscription_status AS subscriptionStatus, u.expires_at AS expiresAt,
         u.last_active_at AS lastActiveAt, u.created_at AS createdAt,
         u.user_role AS userRole,
         tp.school_name AS schoolName, tp.subject AS subject
  FROM users u
  LEFT JOIN (
    SELECT user_uid, teacher_name, school_name, subject
    FROM teacher_profiles
    GROUP BY user_uid
  ) tp ON u.uid = tp.user_uid`;

function normalizeToUtcIso(dateVal?: any): string | null {
  if (!dateVal) return null;
  let s = String(dateVal).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return s.replace(' ', 'T') + 'Z';
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return s + 'Z';
  }
  return s;
}

function formatUser(env: any, u: any, cancelledEmails: Set<string>) {
  const email = String(u.email || '').trim().toLowerCase();
  const cancelled =
    cancelledEmails.has(email) || u.subscriptionStatus === 'cancelled' || u.subscriptionStatus === 'suspended';
  const type = u.subscriptionType || 'trial';
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName || u.email,
    isAdmin: isAdminEmail(env, email) || Boolean(u.isAdmin),
    isTrial: type === 'trial' || String(u.uid || '').startsWith('trial-'),
    subscriptionType: type,
    subscriptionStatus: cancelled ? 'cancelled' : (u.subscriptionStatus || (isAdminEmail(env, email) ? 'active' : 'pending')),
    expiresAt: normalizeToUtcIso(u.expiresAt),
    lastActiveAt: normalizeToUtcIso(u.lastActiveAt) || new Date().toISOString(),
    createdAt: normalizeToUtcIso(u.createdAt) || new Date().toISOString(),
    authProvider: String(u.uid || '').startsWith('trial-') ? 'trial' : email.endsWith('@gmail.com') ? 'google' : 'email',
    userRole: u.userRole || u.user_role || null,
  };
}

async function cancelledSet(db: D1Like): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const { results } = await db.prepare('SELECT email FROM cancelled_accounts').all();
    for (const r of results as any[]) if (r?.email) set.add(String(r.email).trim().toLowerCase());
  } catch {
    /* ignore */
  }
  return set;
}

export async function onRequest(context: EventContext): Promise<Response> {
  switch (context.request.method) {
    case 'GET':
      return handleGet(context);
    case 'POST':
      return handlePost(context);
    case 'PATCH':
      return handlePatch(context);
    case 'PUT':
      return handlePut(context);
    case 'DELETE':
      return handleDelete(context);
    default:
      return methodNotAllowed();
  }
}

async function handlePatch({ request, env }: EventContext): Promise<Response> {
  const caller = await authenticate(request, env);
  if (caller instanceof Response) return caller;
  if (!env.DB) return json({ success: true, message: 'D1 not configured' });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return fail(400, 'صيغة الطلب غير صحيحة.');
  }

  const role = body?.userRole || body?.role;
  if (role !== 'admin_school' && role !== 'teacher') {
    return fail(400, 'نوع الحساب غير صالح. الخيارات المتاحة: admin_school أو teacher');
  }

  try {
    await ensureSchema(env.DB);
    const nowIso = new Date().toISOString();
    await env.DB
      .prepare(
        `UPDATE users SET user_role = ?, last_active_at = ? WHERE uid = ? OR LOWER(email) = ?`
      )
      .bind(role, nowIso, caller.uid, (caller.email || '').toLowerCase())
      .run();

    return json({ success: true, userRole: role });
  } catch (err) {
    console.error('PATCH /api/users failed:', err);
    return fail(500, 'تعذر تحديث نوع الحساب في قاعدة البيانات.');
  }
}

async function resolveAdminStatus(caller: Caller, db?: D1Like): Promise<void> {
  if (caller.isAdmin || !db || (!caller.email && !caller.uid)) return;
  try {
    const dbRow = await db
      .prepare('SELECT is_admin FROM users WHERE LOWER(email) = ? OR uid = ? LIMIT 1')
      .bind((caller.email || '').toLowerCase(), caller.uid || '')
      .first<{ is_admin: number }>();
    if (dbRow && (dbRow.is_admin === 1 || String(dbRow.is_admin) === '1')) {
      caller.isAdmin = true;
    }
  } catch {}
}

// ----------------------------------------------------------------------------- GET

async function handleGet({ request, env }: EventContext): Promise<Response> {
  const caller = await authenticate(request, env);
  if (caller instanceof Response) return caller;
  if (!env.DB) return json({ success: true, users: [], message: 'D1 not configured' });

  await resolveAdminStatus(caller, env.DB);

  const url = new URL(request.url);
  const qUid = (url.searchParams.get('uid') || '').trim();
  const qEmail = (url.searchParams.get('email') || '').trim().toLowerCase();

  // غير الأدمن لا يستطيع الاستعلام إلا عن نفسه
  if (!caller.isAdmin) {
    if ((qUid && qUid !== caller.uid) || (qEmail && qEmail !== caller.email)) {
      return fail(403, 'غير مصرّح لك بعرض بيانات مستخدم آخر.');
    }
  }

  try {
    await ensureSchema(env.DB);
    const cancelled = await cancelledSet(env.DB);

    // استعلام عن مستخدم محدد (الأدمن: أي مستخدم، غيره: نفسه فقط)
    const single = qUid || qEmail || !caller.isAdmin;
    if (single) {
      const targetUid = caller.isAdmin ? (qUid || '') : caller.uid;
      const targetEmail = caller.isAdmin ? (qEmail || '') : caller.email;
      const row = await env.DB
        .prepare(`${USER_SELECT} WHERE (u.uid = ? AND ? != '') OR (LOWER(u.email) = ? AND ? != '') LIMIT 1`)
        .bind(targetUid, targetUid, targetEmail, targetEmail)
        .first<any>();

      if (!row) {
        const inCancelled = (targetEmail || caller.email) && cancelled.has(targetEmail || caller.email);
        if (inCancelled) {
          return json({
            success: true,
            user: {
              uid: targetUid || caller.uid,
              email: targetEmail || caller.email,
              subscriptionStatus: 'cancelled',
              subscriptionType: 'monthly',
              isAdmin: false,
            },
          });
        }
        // 404 يعني أن السجل غير موجود بعد، وليس ملغياً
        return json({ success: false, notFound: true, isCancelled: false, error: 'User not found' }, 404);
      }

      // إذا وُجد السجل بالبريد ولكن كان مسجلاً بـ uid مؤقت، نحدّث الـ uid الحقيقي تلقائياً
      if (!caller.isAdmin && !needsEmailProof(caller) && caller.uid && row.uid !== caller.uid && caller.email && String(row.email).toLowerCase() === caller.email) {
        try {
          await env.DB.prepare('UPDATE users SET uid = ? WHERE LOWER(email) = ?').bind(caller.uid, caller.email).run();
          row.uid = caller.uid;
        } catch {}
      }

      const user = formatUser(env, row, cancelled);
      return json({ success: true, user, users: caller.isAdmin ? undefined : [user] });
    }

    // قائمة كل المستخدمين: للأدمن فقط
    let userRows: any[] = [];
    try {
      const q = await env.DB.prepare(`${USER_SELECT} ORDER BY u.created_at DESC`).all();
      userRows = (q.results as any[]) || [];
    } catch (sqlErr) {
      console.warn('USER_SELECT failed, falling back to direct users table select:', sqlErr);
      const fallbackQ = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
      userRows = (fallbackQ.results as any[]) || [];
    }
    // Deduplicate users strictly by uid and email
    const seenUids = new Set<string>();
    const uniqueUsers: any[] = [];
    for (const rawUser of userRows) {
      const u = formatUser(env, rawUser, cancelled);
      const uidKey = u.uid ? `uid:${String(u.uid).trim()}` : null;
      const emailKey = u.email ? `email:${String(u.email).trim().toLowerCase()}` : null;
      if (uidKey && seenUids.has(uidKey)) continue;
      if (emailKey && seenUids.has(emailKey)) continue;
      if (uidKey) seenUids.add(uidKey);
      if (emailKey) seenUids.add(emailKey);
      uniqueUsers.push(u);
    }
    return json({ success: true, users: uniqueUsers });
  } catch (err) {
    console.error('GET /api/users failed:', err);
    return fail(500, 'تعذر جلب المستخدمين.');
  }
}

// ----------------------------------------------------------------------------- POST (تسجيل النفس)

async function handlePost({ request, env }: EventContext): Promise<Response> {
  const caller = await authenticate(request, env);
  if (caller instanceof Response) return caller;
  if (!env.DB) return json({ success: true, message: 'D1 not configured' });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  // الهوية من التوكن فقط. أي uid/email/isAdmin/اشتراك في الطلب يُتجاهل تماماً.
  const displayName = str(body?.displayName, 100) || caller.email;

  try {
    await ensureSchema(env.DB);

    // من أثبت Firebase ملكية بريده (Google مثلاً) لا يحتاج رسالة تفعيل: نزيل أي طلب تفعيل قديم لنفس البريد
    if (caller.firebaseEmailVerified) await clearVerification(env, caller.email);
    const proofNeeded = needsEmailProof(caller);

    // التعامل الصريح مع تغيير uid لنفس email لمنع التكرار والحفاظ على حالة الاشتراك
    const existingByEmail = await env.DB
      .prepare('SELECT id, uid, subscription_type, subscription_status FROM users WHERE LOWER(email) = ? LIMIT 1')
      .bind(caller.email)
      .first<any>();

    const now = new Date();
    const nowIso = now.toISOString();
    const trialDurationMs = 48 * 60 * 60 * 1000; // 48 hours (2 days)
    const trialExpiresIso = new Date(now.getTime() + trialDurationMs).toISOString();

    // سجل أنشأته الإدارة مسبقاً بـ uid مؤقت (user-...): لا يُربط بهذا الحساب قبل إثبات ملكية البريد
    if (existingByEmail && proofNeeded && existingByEmail.uid !== caller.uid && String(existingByEmail.uid || '').startsWith('user-')) {
      return await requireVerificationResponse(env, request, caller, displayName);
    }

    if (existingByEmail) {
      await env.DB
        .prepare(
          `UPDATE users SET
             uid = ?,
             display_name = COALESCE(?, display_name),
             last_active_at = ?
           WHERE LOWER(email) = ?`
        )
        .bind(caller.uid, displayName, nowIso, caller.email)
        .run();
    } else {
      await env.DB
        .prepare(
          `INSERT INTO users (uid, email, display_name, is_admin, subscription_type, subscription_status, expires_at, last_active_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(uid) DO UPDATE SET
             email = excluded.email,
             display_name = COALESCE(users.display_name, excluded.display_name),
             last_active_at = ?`
        )
        .bind(
          caller.uid,
          caller.email,
          displayName,
          caller.isAdmin ? 1 : 0,
          caller.isAdmin ? 'lifetime' : 'trial',
          caller.isAdmin ? 'active' : 'pending',
          trialExpiresIso,
          nowIso,
          nowIso,
          nowIso
        )
        .run();

      // حساب جديد بالبريد وكلمة المرور: لا يدخل قبل تفعيل البريد عبر الرسالة
      if (proofNeeded) return await requireVerificationResponse(env, request, caller, displayName);
    }

    return json({ success: true });
  } catch (err) {
    console.error('POST /api/users failed:', err);
    return fail(500, 'تعذر تسجيل المستخدم.');
  }
}

/** ينشئ طلب تفعيل ويرسل الرسالة، ثم يرد 403 EMAIL_NOT_VERIFIED ليعرض العميل شاشة "تحقق من بريدك". */
async function requireVerificationResponse(
  env: EventContext['env'],
  request: Request,
  caller: Caller,
  displayName: string
): Promise<Response> {
  const { emailSent } = await issueVerification(env, request, {
    email: caller.email,
    uid: caller.uid,
    displayName,
  });
  return fail(
    403,
    emailSent
      ? 'تم إرسال رسالة تفعيل إلى بريدك الإلكتروني. افتح الرابط فيها ثم سجّل الدخول.'
      : 'تم إنشاء الحساب لكن تعذر إرسال رسالة التفعيل. اضغط على إعادة الإرسال.',
    { code: 'EMAIL_NOT_VERIFIED', email: caller.email, emailSent }
  );
}

// ----------------------------------------------------------------------------- PUT (أدمن)

async function handlePut({ request, env }: EventContext): Promise<Response> {
  const caller = await authenticate(request, env);
  if (caller instanceof Response) return caller;
  await resolveAdminStatus(caller, env.DB);
  const denied = requireAdmin(caller);
  if (denied) return denied;
  if (!env.DB) return json({ success: true, message: 'D1 not configured' });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'صيغة الطلب غير صحيحة.');
  }

  const cleanUid = str(body?.uid, 128);
  const cleanEmail = str(body?.email, 320).toLowerCase();
  if (!cleanUid && !cleanEmail) return fail(400, 'يلزم uid أو email.');

  const subType = SUB_TYPES.includes(body?.subscriptionType) ? body.subscriptionType : 'monthly';
  const subStatus = SUB_STATUSES.includes(body?.subscriptionStatus) ? body.subscriptionStatus : 'active';
  let expiresAt: string | null = null;
  if (subType === 'lifetime' && subStatus === 'active') {
    // خطة مدى الحياة دائماً بدون تاريخ انتهاء في السيرفر
    expiresAt = null;
  } else if (body?.expiresAt) {
    const t = Date.parse(String(body.expiresAt));
    if (Number.isNaN(t)) return fail(400, 'تاريخ الانتهاء غير صالح.');
    expiresAt = new Date(t).toISOString();
  }

  // لا يمكن إلغاء أو تعليق حساب أدمن
  if (cleanEmail && isAdminEmail(env, cleanEmail) && subStatus !== 'active') {
    return fail(400, 'لا يمكن إلغاء حساب المشرف.');
  }

  try {
    await ensureSchema(env.DB);

    // إذا وُجد سجل بنفس email لكن بـ uid مختلف، نحدّث السجل الموجود بالـ uid الحقيقي بدل إنشاء صف مكرر
    const existingByEmail = cleanEmail
      ? await env.DB.prepare('SELECT id, uid FROM users WHERE LOWER(email) = ? LIMIT 1').bind(cleanEmail).first<any>()
      : null;

    const putNowIso = new Date().toISOString();

    const roleInput = body?.userRole || body?.role;
    const hasRoleInput = roleInput === 'admin_school' || roleInput === 'teacher';

    if (existingByEmail) {
      const targetUid = (cleanUid && !cleanUid.startsWith('user-')) ? cleanUid : existingByEmail.uid;
      if (hasRoleInput) {
        await env.DB
          .prepare(
            `UPDATE users SET
               uid = ?,
               subscription_type = ?,
               subscription_status = ?,
               expires_at = ?,
               last_active_at = ?,
               user_role = ?
             WHERE LOWER(email) = ?`
          )
          .bind(targetUid, subType, subStatus, expiresAt, putNowIso, roleInput, cleanEmail)
          .run();
      } else {
        await env.DB
          .prepare(
            `UPDATE users SET
               uid = ?,
               subscription_type = ?,
               subscription_status = ?,
               expires_at = ?,
               last_active_at = ?
             WHERE LOWER(email) = ?`
          )
          .bind(targetUid, subType, subStatus, expiresAt, putNowIso, cleanEmail)
          .run();
      }
    } else {
      let upd: any;
      if (hasRoleInput) {
        upd = await env.DB
          .prepare(
            `UPDATE users SET subscription_type = ?, subscription_status = ?, expires_at = ?, last_active_at = ?, user_role = ?
             WHERE uid = ? AND ? != ''`
          )
          .bind(subType, subStatus, expiresAt, putNowIso, roleInput, cleanUid, cleanUid)
          .run();
      } else {
        upd = await env.DB
          .prepare(
            `UPDATE users SET subscription_type = ?, subscription_status = ?, expires_at = ?, last_active_at = ?
             WHERE uid = ? AND ? != ''`
          )
          .bind(subType, subStatus, expiresAt, putNowIso, cleanUid, cleanUid)
          .run();
      }

      if (!upd.meta?.changes) {
        if (!cleanEmail) return fail(404, 'المستخدم غير موجود.');
        const placeholderUid = cleanUid || `user-${Date.now()}`;
        await env.DB
          .prepare(
            `INSERT INTO users (uid, email, display_name, is_admin, subscription_type, subscription_status, expires_at, last_active_at, created_at, user_role)
             VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
          )
          .bind(placeholderUid, cleanEmail, `أ. ${cleanEmail.split('@')[0]}`, subType, subStatus, expiresAt, putNowIso, putNowIso, hasRoleInput ? roleInput : null)
          .run();
      }
    }

    if (cleanEmail) {
      if (subStatus === 'cancelled') {
        await env.DB
          .prepare(
            `INSERT INTO cancelled_accounts (email, reason, cancelled_at)
             VALUES (?, 'ملغي من الإدارة', datetime('now'))
             ON CONFLICT(email) DO UPDATE SET cancelled_at = datetime('now')`
          )
          .bind(cleanEmail)
          .run();
      } else if (subStatus === 'active') {
        await env.DB.prepare('DELETE FROM cancelled_accounts WHERE LOWER(email) = ?').bind(cleanEmail).run();
      }
    }
    return json({ success: true });
  } catch (err) {
    console.error('PUT /api/users failed:', err);
    return fail(500, 'تعذر تحديث الاشتراك.');
  }
}

// ----------------------------------------------------------------------------- DELETE (أدمن)

async function handleDelete({ request, env }: EventContext): Promise<Response> {
  const caller: Caller | Response = await authenticate(request, env);
  if (caller instanceof Response) return caller;
  await resolveAdminStatus(caller, env.DB);
  const denied = requireAdmin(caller);
  if (denied) return denied;

  const url = new URL(request.url);
  let uid = str(url.searchParams.get('uid'), 128);
  const email = str(url.searchParams.get('email'), 320).toLowerCase();
  if (!uid && !email) return fail(400, 'يلزم uid أو email.');
  if (!env.DB) return json({ success: true, message: 'D1 not configured' });
  if (email && isAdminEmail(env, email)) return fail(400, 'لا يمكن حذف حساب المشرف.');

  try {
    await ensureSchema(env.DB);
    if (!uid && email) {
      const row = await env.DB.prepare('SELECT uid FROM users WHERE LOWER(email) = ? LIMIT 1').bind(email).first<{ uid: string }>();
      uid = row?.uid || '';
    }
    if (uid) {
      const row = await env.DB.prepare('SELECT email FROM users WHERE uid = ? LIMIT 1').bind(uid).first<{ email: string }>();
      if (row?.email && isAdminEmail(env, row.email)) return fail(400, 'لا يمكن حذف حساب المشرف.');
      await deleteAllUserData(env, uid, true);
    }
    return json({ success: true });
  } catch (err) {
    console.error('DELETE /api/users failed:', err);
    return fail(500, 'تعذر حذف المستخدم.');
  }
}
