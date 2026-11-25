import fs from 'fs';
import path from 'path';
import { authenticateRequest, isAuthorizedForUser } from './authHelper';

const DB_FILE = path.resolve(process.cwd(), '.dev_users.json');
const CANCELLED_FILE = path.resolve(process.cwd(), '.dev_cancelled_accounts.json');
const USED_TRIALS_FILE = path.resolve(process.cwd(), '.dev_used_trials.json');
const PRIMARY_ADMIN_EMAIL = 'asmaomar5566@gmail.com';
const ADMIN_EMAILS = [
  'asmaomar5566@gmail.com',
  'm11287137@gmail.com',
];

const PROD_URL = 'https://daragato.online';

function loadDevUsers(): any[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        return data.map((u: any) => ({
          ...u,
          userRole: u.userRole === 'admin_school' ? 'admin_school' : 'teacher',
        }));
      }
    }
  } catch {}
  return [];
}

function saveDevUsers(users: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch {}
}

function loadCancelledAccounts(): string[] {
  try {
    if (fs.existsSync(CANCELLED_FILE)) {
      const data = JSON.parse(fs.readFileSync(CANCELLED_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        return data.map((e: string) => (e || '').trim().toLowerCase()).filter(Boolean);
      }
    }
  } catch {}
  return [];
}

function saveCancelledAccounts(list: string[]) {
  try {
    const unique = Array.from(new Set(list.map((e) => (e || '').trim().toLowerCase()))).filter(Boolean);
    fs.writeFileSync(CANCELLED_FILE, JSON.stringify(unique, null, 2), 'utf-8');
  } catch {}
}

function loadUsedTrials(): Record<string, { firstTrialAt: string; trialExpiresAt: string }> {
  try {
    if (fs.existsSync(USED_TRIALS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USED_TRIALS_FILE, 'utf-8'));
      if (data && typeof data === 'object') return data;
    }
  } catch {}
  return {};
}

function recordUsedTrial(email: string, firstTrialAt: string, trialExpiresAt: string) {
  try {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    const map = loadUsedTrials();
    if (!map[clean]) {
      map[clean] = { firstTrialAt, trialExpiresAt };
      fs.writeFileSync(USED_TRIALS_FILE, JSON.stringify(map, null, 2), 'utf-8');
    }
  } catch {}
}

export async function handleDevUsers(req: any, res: any) {
  const urlObj = new URL(req.url, 'http://localhost:3000');
  const targetUid = urlObj.searchParams.get('uid');
  const targetEmail = urlObj.searchParams.get('email');

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 1. Strictly READ-ONLY fetch from production Cloudflare D1 (GET only)
  // Ensures 100% safety: AI Studio CANNOT modify, alter, or delete any real subscriber in production!
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (req.method === 'GET' && authHeader && typeof authHeader === 'string' && authHeader.includes('.')) {
    try {
      const forwardUrl = `${PROD_URL}/api/users${urlObj.search}`;
      const forwardHeaders: Record<string, string> = {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      };
      if (req.headers['x-user-uid']) forwardHeaders['x-user-uid'] = req.headers['x-user-uid'];
      if (req.headers['x-user-email']) forwardHeaders['x-user-email'] = req.headers['x-user-email'];

      const prodRes = await fetch(forwardUrl, {
        method: 'GET',
        headers: forwardHeaders,
      });

      if (prodRes.ok) {
        const prodData: any = await prodRes.json().catch(() => null);
        if (prodData) {
          // Cache read-only users list locally for viewing in AI Studio
          if (Array.isArray(prodData.users) && prodData.users.length > 0) {
            saveDevUsers(prodData.users);
          }
          res.statusCode = prodRes.status;
          res.end(JSON.stringify(prodData));
          return;
        }
      }
    } catch (proxyError) {
      console.warn('Live Cloudflare D1 read-only fetch failed, using local storage:', proxyError);
    }
  }

  // 2. Fallback: Local storage handler (.dev_users.json)
  let users = loadDevUsers();
  let cancelledList = loadCancelledAccounts();

  // Handle GET requests
  if (req.method === 'GET') {
    // Single User Lookup
    if (targetUid || targetEmail) {
      const cleanUid = (targetUid || '').trim();
      const cleanEmail = (targetEmail || '').trim().toLowerCase();
      const isCancelledByRegistry = cleanEmail && cancelledList.includes(cleanEmail);

      const caller = await authenticateRequest(req);
      if (!caller) {
        if (isCancelledByRegistry) {
          res.statusCode = 200;
          res.end(JSON.stringify({
            success: true,
            isCancelled: true,
            user: { email: cleanEmail, subscriptionStatus: 'cancelled' }
          }));
          return;
        }
        res.statusCode = 401;
        res.end(JSON.stringify({
          success: false,
          error: 'غير مصرح: يجب تسجيل الدخول برمز مصادقة صالح للاستعلام عن بيانات المستخدم',
        }));
        return;
      }

      if (!isAuthorizedForUser(caller, cleanUid, cleanEmail)) {
        res.statusCode = 403;
        res.end(JSON.stringify({
          success: false,
          error: 'مرفوض أمنياً: لا يمكنك الاستعلام عن بيانات حساب مستخدم آخر',
        }));
        return;
      }

      const found = users.find(
        (u) =>
          (cleanUid && u.uid === cleanUid) ||
          (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
      );

      if (isCancelledByRegistry) {
        if (found) {
          found.subscriptionStatus = 'cancelled';
        } else {
          res.statusCode = 200;
          res.end(JSON.stringify({
            success: true,
            user: {
              uid: cleanUid || `user-${cleanEmail}`,
              email: cleanEmail,
              subscriptionStatus: 'cancelled',
              subscriptionType: 'monthly',
              isAdmin: false,
            }
          }));
          return;
        }
      }

      if (!found) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, notFound: true, isCancelled: Boolean(isCancelledByRegistry), message: 'User not found' }));
        return;
      }

      if (!caller.isAdmin && caller.uid && found.uid !== caller.uid && cleanEmail && found.email?.toLowerCase() === cleanEmail) {
        found.uid = caller.uid;
        saveDevUsers(users);
      }

      const resolvedStatus = (() => {
        const rawStatus = found.subscriptionStatus || 'active';
        if (rawStatus === 'active' && (found.subscriptionType === 'yearly' || found.subscriptionType === 'monthly' || found.subscriptionType === 'trial_3days') && found.expiresAt) {
          const expMs = Date.parse(found.expiresAt);
          if (!Number.isNaN(expMs) && expMs <= Date.now()) {
            return 'expired';
          }
        }
        return rawStatus;
      })();

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        user: {
          uid: found.uid,
          email: found.email,
          displayName: found.displayName || found.email,
          isAdmin: Boolean(found.isAdmin || found.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()),
          isTrial: (found.subscriptionType === 'trial' && resolvedStatus !== 'active') || String(found.uid || '').startsWith('trial-'),
          subscriptionStatus: resolvedStatus,
          subscriptionType: found.subscriptionType || 'monthly',
          expiresAt: found.subscriptionType === 'lifetime' && resolvedStatus === 'active' ? null : found.expiresAt,
          createdAt: found.createdAt,
          lastActiveAt: found.lastActiveAt,
          userRole: found.userRole === 'admin_school' ? 'admin_school' : 'teacher',
        }
      }));
      return;
    }

    // Listing ALL users - restricted to Admin
    const caller = await authenticateRequest(req);
    const isCallerAdmin = caller?.isAdmin || (caller?.email && ADMIN_EMAILS.includes(caller.email.toLowerCase()));
    if (!caller || !isCallerAdmin) {
      res.statusCode = 403;
      res.end(JSON.stringify({
        success: false,
        error: 'مرفوض أمنياً: صلاحيات المشرف العام مطلوبة لعرض قائمة مستخدمي النظام',
      }));
      return;
    }

    const mappedUsers = users.map((u) => {
      const uEmail = (u.email || '').trim().toLowerCase();
      const isCancelled = cancelledList.includes(uEmail) || u.subscriptionStatus === 'cancelled';
      const isUserAdmin = ADMIN_EMAILS.includes(uEmail) || Boolean(u.isAdmin);
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || u.email,
        isAdmin: isUserAdmin,
        subscriptionStatus: isCancelled ? 'cancelled' : (u.subscriptionStatus || 'active'),
        subscriptionType: isUserAdmin ? 'lifetime' : (u.subscriptionType || 'monthly'),
        expiresAt: isUserAdmin ? undefined : u.expiresAt,
        createdAt: u.createdAt,
        lastActiveAt: u.lastActiveAt,
        authProvider: u.authProvider || (uEmail.includes('@gmail.com') ? 'google' : 'email'),
        userRole: u.userRole === 'admin_school' ? 'admin_school' : 'teacher',
      };
    });

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, users: mappedUsers }));
    return;
  }

  // Handle POST (Registration / Sync of User Profile)
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c: any) => (body += c));
    req.on('end', async () => {
      try {
        const caller = await authenticateRequest(req);
        const user = JSON.parse(body || '{}');
        const cleanEmail = (user.email || caller?.email || '').trim().toLowerCase();
        const cleanUid = (user.uid || caller?.uid || '').trim();

        if (!cleanEmail && !cleanUid) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing uid or email' }));
          return;
        }

        const idx = users.findIndex(
          (u) =>
            (cleanUid && u.uid === cleanUid) ||
            (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
        );

        if (idx >= 0) {
          if (!caller || !isAuthorizedForUser(caller, cleanUid, cleanEmail)) {
            res.statusCode = 403;
            res.end(JSON.stringify({ success: false, error: 'مرفوض أمنياً: لا تملك الصلاحية لتعديل حساب مستخدم آخر' }));
            return;
          }
        }

        const isLegitAdmin = ADMIN_EMAILS.includes(cleanEmail) || (caller?.isAdmin && Boolean(user.isAdmin));
        const enforcedIsAdmin = isLegitAdmin ? true : false;
        const isCancelled = cleanEmail && cancelledList.includes(cleanEmail);

        if (idx >= 0) {
          const existing = users[idx];
          const updatedStatus = isCancelled ? 'cancelled' : (existing.subscriptionStatus || (enforcedIsAdmin ? 'active' : 'pending'));
          users[idx] = {
            ...existing,
            uid: cleanUid || existing.uid,
            displayName: existing.displayName || user.displayName || cleanEmail,
            subscriptionStatus: updatedStatus,
            isAdmin: enforcedIsAdmin || Boolean(existing.isAdmin),
            lastActiveAt: new Date().toISOString(),
            ...(user.userRole && !existing.userRole ? { userRole: user.userRole } : {}),
          };
          saveDevUsers(users);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, message: 'Saved successfully', user: users[idx] }));
          return;
        } else {
          const nowMs = Date.now();
          const usedTrials = loadUsedTrials();
          const priorTrial = cleanEmail ? usedTrials[cleanEmail] : undefined;
          let createdAt = new Date(nowMs).toISOString();
          let trialExpiresAt: string | undefined = enforcedIsAdmin ? undefined : new Date(nowMs + 72 * 60 * 60 * 1000).toISOString();
          let subStatus = isCancelled ? 'cancelled' : (enforcedIsAdmin ? 'active' : 'pending');

          if (!enforcedIsAdmin && priorTrial) {
            createdAt = priorTrial.firstTrialAt;
            trialExpiresAt = priorTrial.trialExpiresAt;
            const expMs = Date.parse(trialExpiresAt);
            if (!isCancelled) {
              subStatus = !Number.isNaN(expMs) && expMs > nowMs ? 'pending' : 'expired';
            }
          } else if (!enforcedIsAdmin && cleanEmail && trialExpiresAt) {
            recordUsedTrial(cleanEmail, createdAt, trialExpiresAt);
          }

          const createdUser = {
            uid: cleanUid,
            email: cleanEmail,
            displayName: user.displayName || cleanEmail,
            subscriptionStatus: subStatus,
            subscriptionType: enforcedIsAdmin ? 'lifetime' : 'trial',
            expiresAt: trialExpiresAt,
            isAdmin: enforcedIsAdmin,
            createdAt,
            lastActiveAt: new Date().toISOString(),
            authProvider: cleanEmail.includes('@gmail.com') ? 'google' : 'email',
            userRole: user.userRole || null,
          };
          users.unshift(createdUser);
          saveDevUsers(users);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, message: 'Saved successfully', user: createdUser }));
          return;
        }
      } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Handle PATCH (User updating their role)
  if (req.method === 'PATCH') {
    let body = '';
    req.on('data', (c: any) => (body += c));
    req.on('end', async () => {
      try {
        const caller = await authenticateRequest(req);
        if (!caller) {
          res.statusCode = 401;
          res.end(JSON.stringify({ success: false, error: 'غير مصرح: يجب تسجيل الدخول' }));
          return;
        }

        const data = JSON.parse(body || '{}');
        const role = data.userRole || data.role;
        if (role !== 'admin_school' && role !== 'teacher') {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'نوع الحساب غير صالح' }));
          return;
        }

        const cleanEmail = (caller.email || '').trim().toLowerCase();
        const cleanUid = (caller.uid || '').trim();

        const idx = users.findIndex(
          (u) =>
            (cleanUid && u.uid === cleanUid) ||
            (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
        );

        if (idx >= 0) {
          users[idx].userRole = role;
          users[idx].lastActiveAt = new Date().toISOString();
        } else {
          users.unshift({
            uid: cleanUid || `user-${Date.now()}`,
            email: cleanEmail,
            displayName: cleanEmail ? `أ. ${cleanEmail.split('@')[0]}` : 'مستخدم',
            userRole: role,
            isAdmin: cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase(),
            subscriptionType: 'monthly',
            subscriptionStatus: 'active',
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            authProvider: cleanEmail.includes('@gmail.com') ? 'google' : 'email',
          });
        }

        saveDevUsers(users);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, userRole: role }));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Handle PUT (Admin updating user status/subscription)
  if (req.method === 'PUT') {
    const caller = await authenticateRequest(req);
    if (!caller || !caller.isAdmin) {
      res.statusCode = 403;
      res.end(JSON.stringify({
        success: false,
        error: 'مرفوض أمنياً: لا يملك سوى المشرف العام صلاحية تعديل اشتراكات وحسابات المستخدمين',
      }));
      return;
    }

    let body = '';
    req.on('data', (c: any) => (body += c));
    req.on('end', () => {
      try {
        const { uid, email, subscriptionType, subscriptionStatus, expiresAt, displayName, userRole } = JSON.parse(body || '{}');
        const cleanUid = (uid || '').trim();
        const cleanEmail = (email || '').trim().toLowerCase();

        const idx = users.findIndex(
          (u) =>
            (cleanUid && u.uid === cleanUid) ||
            (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
        );
        const existing = idx >= 0 ? users[idx] : null;
        const effectiveEmail = (cleanEmail || existing?.email || '').trim().toLowerCase();

        const subType = subscriptionType || existing?.subscriptionType || 'monthly';
        const subStatus = subscriptionStatus || existing?.subscriptionStatus || 'active';

        const hasSubChange = Boolean(subscriptionType || subscriptionStatus);
        const nowMs = Date.now();
        let finalExpiresAt: string | null = null;
        if (!hasSubChange && existing?.expiresAt) {
          finalExpiresAt = existing.expiresAt;
        } else if (subType === 'lifetime' && subStatus === 'active') {
          finalExpiresAt = null;
        } else if (subStatus === 'expired' || subStatus === 'cancelled' || subStatus === 'suspended') {
          finalExpiresAt = new Date(nowMs - 1000).toISOString();
        } else if (subType === 'yearly') {
          finalExpiresAt = new Date(nowMs + 365 * 24 * 60 * 60 * 1000).toISOString();
        } else if (subType === 'monthly') {
          finalExpiresAt = new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (subType === 'trial_3days') {
          finalExpiresAt = new Date(nowMs + 72 * 60 * 60 * 1000).toISOString();
        } else if (subType === 'trial') {
          finalExpiresAt = existing?.expiresAt || new Date(nowMs + 72 * 60 * 60 * 1000).toISOString();
        }

        if ((subStatus === 'cancelled' || subStatus === 'suspended') && effectiveEmail) {
          if (!cancelledList.includes(effectiveEmail)) {
            cancelledList.push(effectiveEmail);
            saveCancelledAccounts(cancelledList);
          }
        } else if (subStatus === 'active' && effectiveEmail) {
          cancelledList = cancelledList.filter((e) => e !== effectiveEmail);
          saveCancelledAccounts(cancelledList);
        }

        let savedUser: any;
        if (idx >= 0) {
          const exUid = String(users[idx].uid || '');
          if (cleanUid && !cleanUid.startsWith('user-') && (!exUid || exUid.startsWith('user-'))) {
            users[idx].uid = cleanUid;
          }
          users[idx].subscriptionType = subType;
          users[idx].subscriptionStatus = subStatus;
          users[idx].expiresAt = finalExpiresAt;
          users[idx].isTrial = subType === 'trial' && subStatus !== 'active';
          if (displayName) users[idx].displayName = displayName;
          if (userRole !== undefined) users[idx].userRole = userRole;
          users[idx].lastActiveAt = new Date().toISOString();
          savedUser = users[idx];
        } else {
          savedUser = {
            uid: cleanUid || `user-${Date.now()}`,
            email: effectiveEmail,
            displayName: displayName || (effectiveEmail ? `أ. ${effectiveEmail.split('@')[0]}` : 'مستخدم'),
            isTrial: subType === 'trial' && subStatus !== 'active',
            createdAt: new Date().toISOString(),
            expiresAt: finalExpiresAt,
            lastActiveAt: new Date().toISOString(),
            subscriptionType: subType,
            subscriptionStatus: subStatus,
            isAdmin: effectiveEmail === PRIMARY_ADMIN_EMAIL.toLowerCase(),
            authProvider: effectiveEmail.includes('@gmail.com') ? 'google' : 'email',
            userRole: userRole || null,
          };
          users.unshift(savedUser);
        }

        saveDevUsers(users);
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          message: 'تم تحديث الحساب بواسطة المشرف العام',
          user: savedUser,
          userRole: savedUser.userRole,
        }));
      } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Handle DELETE (Admin or user deleting account)
  if (req.method === 'DELETE') {
    const cleanUid = (targetUid || '').trim();
    const cleanEmail = (targetEmail || '').trim().toLowerCase();

    const caller = await authenticateRequest(req);
    if (!caller || !isAuthorizedForUser(caller, cleanUid, cleanEmail)) {
      res.statusCode = 403;
      res.end(JSON.stringify({
        success: false,
        error: 'مرفوض أمنياً: لا تملك الصلاحية لحذف حساب مستخدم آخر',
      }));
      return;
    }

    const toDelete = users.filter(
      (u) =>
        (cleanUid && u.uid === cleanUid) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
    );
    for (const delUser of toDelete) {
      const delEmail = (delUser.email || cleanEmail || '').trim().toLowerCase();
      if (delEmail && !ADMIN_EMAILS.includes(delEmail)) {
        const createdAt = delUser.createdAt || new Date().toISOString();
        const createdMs = Date.parse(createdAt);
        const expAt = delUser.expiresAt || new Date((Number.isNaN(createdMs) ? Date.now() : createdMs) + 72 * 60 * 60 * 1000).toISOString();
        recordUsedTrial(delEmail, createdAt, expAt);
      }
    }

    users = users.filter(
      (u) =>
        !(cleanUid && u.uid === cleanUid) &&
        !(cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
    );
    saveDevUsers(users);
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'تم حذف الحساب بنجاح' }));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}
