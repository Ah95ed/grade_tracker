import { auth, googleAuthProvider } from '../lib/firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { STORAGE_KEYS, getScopedStorageKey } from './storage';
import type { InstitutionType } from '../types';
import {
  saveUsersToIndexedDB,
  loadUsersFromIndexedDB,
  saveCancelledEmailsToIndexedDB,
  loadCancelledEmailsFromIndexedDB,
  recordAdminCommandInIndexedDB,
  openGradebookDB,
} from './indexedDB';
import {
  parseSafeTimestamp,
  toNormalizedIsoString,
  formatIraqDateTime,
  formatIraqDate,
  formatIraqTime,
  formatRelativeIraq,
  IRAQ_TIMEZONE,
} from './dateUtils';

export {
  parseSafeTimestamp,
  toNormalizedIsoString,
  formatIraqDateTime,
  formatIraqDate,
  formatIraqTime,
  formatRelativeIraq,
  IRAQ_TIMEZONE,
};

export type SubscriptionType = 'trial' | 'monthly' | 'yearly' | 'lifetime';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isTrial: boolean;
  createdAt: string; // ISO String
  expiresAt?: string; // ISO String
  lastActiveAt: string; // ISO String (تاريخ آخر عملية له)
  subscriptionType: SubscriptionType; // 'trial' | 'monthly' | 'yearly' | 'lifetime'
  subscriptionStatus: SubscriptionStatus; // 'active' | 'expired' | 'cancelled'
  authProvider: 'email' | 'google' | 'trial';
  isAdmin: boolean;
  userRole?: 'admin_school' | 'teacher';
  institutionType?: InstitutionType;
}

const env = (typeof import.meta !== 'undefined' && import.meta?.env) ? import.meta.env : ({} as Record<string, string | undefined>);
export const ADMIN_EMAILS_DEFAULT = [
  'asmaomar5566@gmail.com',
  'm11287137@gmail.com',
];
export const PRIMARY_ADMIN_EMAIL =
  ((import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim()) ||
  ((import.meta.env.ADMIN_EMAIL as string | undefined)?.trim()) ||
  'asmaomar5566@gmail.com';

export const SUPPORT_PHONE_NUMBER =
  ((import.meta.env.VITE_SUPPORT_PHONE as string | undefined)?.trim()) ||
  ((import.meta.env.SUPPORT_PHONE as string | undefined)?.trim()) ||
  '07706118982';

export const SUPPORT_PHONE_INTERNATIONAL = '+9647706118982';

export const SUPPORT_WHATSAPP_NUMBER =
  ((import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.trim()) ||
  ((import.meta.env.SUPPORT_WHATSAPP as string | undefined)?.trim()) ||
  '9647706118982';

const AUTH_KEYS = {
  CURRENT_USER: 'gradebook_auth_current_user_v2',
  ALL_USERS: 'gradebook_all_users_v2',
  ADMIN_EMAILS: 'gradebook_admin_emails_v2',
  EXPIRED_NOTICE: 'gradebook_trial_expired_notice_v2',
  CANCELLED_ACCOUNTS: 'gradebook_cancelled_accounts_v2',
  ID_TOKEN: 'gradebook_auth_id_token_v1',
  TOKEN_EXP: 'gradebook_auth_token_exp_v1',
};

// 48 hours free trial for testing and new registrations
export const TRIAL_DURATION_MS = 48 * 60 * 60 * 1000;

/** حفظ التوكن المشفر الصالح محلياً لاستخدامه فوراً عند إعادة تحميل الصفحة قبل اكتمال تهيئة Firebase */
export function saveCachedIdToken(token: string): void {
  try {
    if (!token || typeof token !== 'string') return;
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
      if (payload && typeof payload.exp === 'number') {
        localStorage.setItem(AUTH_KEYS.ID_TOKEN, token);
        localStorage.setItem(AUTH_KEYS.TOKEN_EXP, String(payload.exp));
      }
    }
  } catch {}
}

/** قراءة التوكن المخزن والتأكد من أنه لم ينتهِ (مع هامش أمان 60 ثانية) */
export function getCachedValidIdToken(): string | null {
  try {
    const token = localStorage.getItem(AUTH_KEYS.ID_TOKEN);
    const expStr = localStorage.getItem(AUTH_KEYS.TOKEN_EXP);
    if (token && expStr) {
      const exp = parseInt(expStr, 10);
      const now = Math.floor(Date.now() / 1000);
      if (exp > now + 60) {
        return token;
      }
    }
  } catch {}
  return null;
}

/** مسح التوكن المخزن عند تسجيل الخروج */
export function clearCachedIdToken(): void {
  try {
    localStorage.removeItem(AUTH_KEYS.ID_TOKEN);
    localStorage.removeItem(AUTH_KEYS.TOKEN_EXP);
  } catch {}
}

/**
 * يرجع Firebase ID Token للمستخدم الحالي (أو null للحسابات التجريبية المحلية).
 * ينتظر استعادة الجلسة بأمان ويدعم التوكن المخزن الصالح لمنع فشل المصادقة عند Reload.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // 1. إذا كان المستخدم متاحاً فوراً، نجلب التوكن ونحدّث التخزين المؤقت
    if (auth?.currentUser) {
      try {
        const token = (await auth.currentUser.getIdToken(false)) || null;
        if (token) {
          saveCachedIdToken(token);
          return token;
        }
      } catch {
        const refreshed = (await auth.currentUser.getIdToken(true)) || null;
        if (refreshed) {
          saveCachedIdToken(refreshed);
          return refreshed;
        }
      }
    }

    // 2. إذا كانت Firebase لا تزال تستعيد الجلسة من التخزين بعد reload
    if (auth && typeof auth.authStateReady === 'function') {
      await Promise.race([
        auth.authStateReady(),
        new Promise((r) => setTimeout(r, 2000)),
      ]);
    }

    if (auth?.currentUser) {
      try {
        const token = (await auth.currentUser.getIdToken(false)) || null;
        if (token) {
          saveCachedIdToken(token);
          return token;
        }
      } catch {
        const refreshed = (await auth.currentUser.getIdToken(true)) || null;
        if (refreshed) {
          saveCachedIdToken(refreshed);
          return refreshed;
        }
      }
    }

    // 3. انتظار قصير عبر onAuthStateChanged في حال تأخرت استعادة جلسة Firebase
    if (auth && !auth.currentUser) {
      await new Promise<void>((resolve) => {
        let unsub: (() => void) | null = null;
        const timer = setTimeout(() => {
          if (unsub) unsub();
          resolve();
        }, 1500);
        unsub = onAuthStateChanged(auth, (fbUser) => {
          if (fbUser) {
            clearTimeout(timer);
            if (unsub) unsub();
            resolve();
          }
        });
      });

      if (auth.currentUser) {
        try {
          const token = (await auth.currentUser.getIdToken(false)) || null;
          if (token) {
            saveCachedIdToken(token);
            return token;
          }
        } catch {}
      }
    }

    // 4. استخدام التوكن المخزن الصالح كخيار احتياطي موثوق جداً
    const cached = getCachedValidIdToken();
    if (cached) {
      return cached;
    }
  } catch (err) {
    console.warn('Firebase token retrieval error:', err);
  }
  return getCachedValidIdToken();
}

/**
 * Returns HTTP headers including Authorization Bearer token for secure API requests
 */
export async function getAuthHeaders(extraHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const cur = getCurrentUser();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (cur?.uid) {
    headers['Authorization'] = `Bearer ${cur.uid}`;
  }

  if (cur) {
    headers['x-user-uid'] = cur.uid;
    headers['x-user-email'] = (cur.email || '').trim().toLowerCase();
    headers['x-user-admin'] = cur.isAdmin ? 'true' : 'false';
    if (
      cur.isTrial ||
      cur.authProvider === 'trial' ||
      cur.uid?.startsWith('trial-') ||
      cur.email?.includes('@jok.nom')
    ) {
      headers['x-trial-user-uid'] = cur.uid;
    }
  }

  return headers;
}

/**
 * ترقية وتحديث تلقائي دائم لجميع المستخدمين السابقين الذين لم تُحدد صفتهم (أو كانوا مسجلين قبل إضافة خيار إدارة/أستاذ):
 * - من سجل كـ إدارة (admin_school) يبقى إدارة ثابتاً ومحفوظاً
 * - من سجل كـ أستاذ (teacher) يبقى أستاذ ثابتاً ومحفوظاً
 * - كل من لم يحدد بعد (undefined / null) يُعتمد تلقائياً وبشكل دائم كـ «أستاذ»
 * - لا تظهر له شاشة الاختيار مطلقاً ويُحفظ في التخزين المحلي وقاعدة البيانات
 */
export function migrateLegacyUsersRoles(): void {
  try {
    if (typeof localStorage === 'undefined') return;

    // 1. فحص وتحديث المستخدمين في ALL_USERS
    const rawAll = localStorage.getItem(AUTH_KEYS.ALL_USERS);
    if (rawAll) {
      let changed = false;
      const list: AppUser[] = JSON.parse(rawAll);
      if (Array.isArray(list)) {
        const updatedList = list.map((u) => {
          if (!u) return u;
          if (u.userRole === 'admin_school') return u;
          if (u.userRole === 'teacher') return u;
          changed = true;
          return { ...u, userRole: 'teacher' as const };
        });
        if (changed) {
          localStorage.setItem(AUTH_KEYS.ALL_USERS, JSON.stringify(updatedList));
          saveUsersToIndexedDB(updatedList).catch(() => {});
        }
      }
    }

    // 2. فحص وتحديث المستخدم الحالي
    const rawCur = localStorage.getItem(AUTH_KEYS.CURRENT_USER);
    if (rawCur) {
      const cur: AppUser = JSON.parse(rawCur);
      if (cur && cur.userRole !== 'admin_school' && cur.userRole !== 'teacher') {
        cur.userRole = 'teacher';
        localStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(cur));
        upsertUserInRegistry(cur);
      }
    }
  } catch (e) {
    console.warn('Error migrating legacy user roles:', e);
  }
}

// Initialize automatic synchronization with IndexedDB
export async function syncAuthWithIndexedDB(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const [idbCancelled, idbUsers] = await Promise.all([
      loadCancelledEmailsFromIndexedDB().catch(() => []),
      loadUsersFromIndexedDB().catch(() => []),
    ]);

    // 1. Sync cancelled emails
    const localCancelled = getCancelledEmails();
    const mergedCancelled = Array.from(new Set([...localCancelled, ...idbCancelled])).filter(Boolean);
    if (mergedCancelled.length > 0) {
      localStorage.setItem(AUTH_KEYS.CANCELLED_ACCOUNTS, JSON.stringify(mergedCancelled));
      saveCancelledEmailsToIndexedDB(mergedCancelled).catch(() => {});
    }

    // 2. Sync users
    const localUsers = getAllUsers();
    const userMap = new Map<string, AppUser>();
    for (const u of idbUsers) {
      if (u && u.uid) userMap.set(u.uid, u);
    }
    for (const u of localUsers) {
      if (u && u.uid) {
        const idb = userMap.get(u.uid);
        let resolvedRole: 'admin_school' | 'teacher' = 'teacher';
        if (u.userRole === 'admin_school' || idb?.userRole === 'admin_school') {
          resolvedRole = 'admin_school';
        } else if (u.userRole === 'teacher' || idb?.userRole === 'teacher') {
          resolvedRole = 'teacher';
        }
        userMap.set(u.uid, { ...idb, ...u, userRole: resolvedRole });
      }
    }

    const allMerged = Array.from(userMap.values()).map((u) => {
      const uEmail = (u.email || '').trim().toLowerCase();
      const role: 'admin_school' | 'teacher' = u.userRole === 'admin_school' ? 'admin_school' : 'teacher';
      if (uEmail !== PRIMARY_ADMIN_EMAIL.toLowerCase() && mergedCancelled.includes(uEmail)) {
        return { ...u, subscriptionStatus: 'cancelled' as const, userRole: role };
      }
      return { ...u, userRole: role };
    });

    if (allMerged.length > 0) {
      localStorage.setItem(AUTH_KEYS.ALL_USERS, JSON.stringify(allMerged));
      saveUsersToIndexedDB(allMerged).catch(() => {});

      // Restore userRole into currentUser if missing or legacy
      const cur = getCurrentUser();
      if (cur) {
        const curEmail = (cur.email || '').trim().toLowerCase();
        const match = allMerged.find(
          (m) => (cur.uid && m.uid === cur.uid) || (curEmail && m.email && m.email.trim().toLowerCase() === curEmail)
        );
        const targetRole: 'admin_school' | 'teacher' = match?.userRole === 'admin_school' ? 'admin_school' : (cur.userRole === 'admin_school' ? 'admin_school' : 'teacher');
        if (cur.userRole !== targetRole) {
          cur.userRole = targetRole;
          saveCurrentUser(cur);
        }
      }
    }
  } catch (e) {
    console.warn('Auth sync with IndexedDB warning:', e);
  }
}

// تشغيل ترحيل فوري للمستخدمين القدامى لضمان تعيين صفتهم تلقائياً
if (typeof window !== 'undefined') {
  migrateLegacyUsersRoles();
  syncAuthWithIndexedDB().catch(() => {});
}

export function getAdminEmails(): string[] {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.ADMIN_EMAILS);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const valid = Array.isArray(list) ? list.filter((e) => typeof e === 'string' && e.trim()) : [];
    for (const da of ADMIN_EMAILS_DEFAULT) {
      if (!valid.map((e) => e.toLowerCase()).includes(da.toLowerCase())) {
        valid.unshift(da.toLowerCase());
      }
    }
    return valid;
  } catch {
    return ADMIN_EMAILS_DEFAULT;
  }
}

export function saveAdminEmails(emails: string[]): void {
  try {
    const valid = Array.isArray(emails) ? emails.filter((e) => typeof e === 'string' && e.trim()) : [];
    const unique = Array.from(new Set([...ADMIN_EMAILS_DEFAULT, ...valid.map((e) => e.trim().toLowerCase())]));
    localStorage.setItem(AUTH_KEYS.ADMIN_EMAILS, JSON.stringify(unique));
  } catch (e) {
    console.error('Error saving admin emails:', e);
  }
}

export function addAdminEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return false;
  const current = getAdminEmails();
  if (!current.map((e) => e.toLowerCase()).includes(normalized)) {
    current.push(normalized);
    saveAdminEmails(current);

    // Also update existing user record if present
    const allUsers = getAllUsers();
    const target = allUsers.find((u) => u && u.email && u.email.toLowerCase() === normalized);
    if (target) {
      target.isAdmin = true;
      saveAllUsers(allUsers);
    }
    return true;
  }
  return false;
}

export function removeAdminEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (ADMIN_EMAILS_DEFAULT.map((e) => e.toLowerCase()).includes(normalized)) {
    // Primary super admins cannot be removed
    return false;
  }
  const current = getAdminEmails().filter((e) => e.toLowerCase() !== normalized);
  saveAdminEmails(current);

  // Update existing user record
  const allUsers = getAllUsers();
  const target = allUsers.find((u) => u && u.email && u.email.toLowerCase() === normalized);
  if (target) {
    target.isAdmin = false;
    saveAllUsers(allUsers);
  }
  return true;
}

export function isAdminUser(email?: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (ADMIN_EMAILS_DEFAULT.map((e) => e.toLowerCase()).includes(normalized)) return true;
  const admins = getAdminEmails().map((e) => e.toLowerCase());
  return admins.includes(normalized);
}

// ---------------- All Users Management ----------------

export function getAllUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.ALL_USERS);
    const users: AppUser[] = raw ? JSON.parse(raw) : [];

    // Filter out corrupted or non-object entries
    const cleanUsers = (Array.isArray(users) ? users : []).filter(
      (u) => u && typeof u === 'object' && typeof u.email === 'string'
    );

    const cancelledList = getCancelledEmails();

    // Also merge registered accounts from REGISTERED_USERS_KEY
    const accounts = getStoredAccounts();
    accounts.forEach((acc) => {
      if (!acc || !acc.email || typeof acc.email !== 'string') return;
      const accEmail = acc.email.trim().toLowerCase();
      const exists = cleanUsers.some(
        (u) => (u.uid && acc.uid && u.uid === acc.uid) || (u.email && u.email.trim().toLowerCase() === accEmail)
      );
      if (!exists) {
        const isCancelled = cancelledList.includes(accEmail);
        cleanUsers.push({
          uid: acc.uid || `user-${Date.now()}`,
          email: acc.email,
          displayName: acc.displayName || `أ. ${acc.email.split('@')[0]}`,
          isTrial: false,
          createdAt: acc.createdAt || new Date().toISOString(),
          expiresAt: acc.expiresAt,
          lastActiveAt: acc.createdAt || new Date().toISOString(),
          subscriptionType: acc.subscriptionType || 'monthly',
          subscriptionStatus: isCancelled ? 'cancelled' : (acc.subscriptionStatus || 'active'),
          authProvider: 'email',
          isAdmin: isAdminUser(acc.email),
          userRole: 'teacher',
        });
      }
    });

    // Also merge current user if logged in (read raw without invoking getCurrentUser to avoid recursion)
    try {
      const rawCur = localStorage.getItem(AUTH_KEYS.CURRENT_USER);
      if (rawCur) {
        const curUser = JSON.parse(rawCur);
        if (curUser && curUser.email && typeof curUser.email === 'string') {
          const curEmail = curUser.email.trim().toLowerCase();
          const exists = cleanUsers.some(
            (u) => (u.uid && curUser.uid && u.uid === curUser.uid) || (u.email && u.email.trim().toLowerCase() === curEmail)
          );
          if (!exists) {
            cleanUsers.unshift(curUser);
          }
        }
      }
    } catch {}

    // Ensure primary admin is always in list
    const adminExists = cleanUsers.some(
      (u) => u.email && u.email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()
    );
    if (!adminExists) {
      cleanUsers.unshift({
        uid: 'admin-primary',
        email: PRIMARY_ADMIN_EMAIL,
        displayName: 'المشرف العام (أدمن)',
        isTrial: false,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        subscriptionType: 'lifetime',
        subscriptionStatus: 'active',
        authProvider: 'google',
        isAdmin: true,
        userRole: 'admin_school',
        institutionType: 'school',
      });
    }

    // Enforce cancelled state for all users whose email is cancelled & ensure legacy/unset users have userRole = 'teacher'
    let hasRoleUpdates = false;
    const finalUsers = cleanUsers.map((u) => {
      const uEmail = (u.email || '').trim().toLowerCase();
      let role: 'admin_school' | 'teacher' = 'teacher';
      if (u.userRole === 'admin_school') {
        role = 'admin_school';
      } else {
        role = 'teacher';
      }
      const instType: InstitutionType = u.institutionType === 'university' ? 'university' : 'school';
      if (u.userRole !== role || u.institutionType !== instType) {
        hasRoleUpdates = true;
      }
      if (uEmail !== PRIMARY_ADMIN_EMAIL.toLowerCase() && cancelledList.includes(uEmail)) {
        return { ...u, subscriptionStatus: 'cancelled' as const, userRole: role, institutionType: instType };
      }
      return { ...u, userRole: role, institutionType: instType };
    });

    // Deduplicate to guarantee absolute uniqueness across uid and email
    const seenUids = new Set<string>();
    const seenEmails = new Set<string>();
    const uniqueFinalUsers: AppUser[] = [];
    for (const u of finalUsers) {
      const uUid = (u.uid || '').trim();
      const uEmail = (u.email || '').trim().toLowerCase();
      if (uUid && seenUids.has(uUid)) continue;
      if (uEmail && seenEmails.has(uEmail)) continue;
      if (uUid) seenUids.add(uUid);
      if (uEmail) seenEmails.add(uEmail);
      uniqueFinalUsers.push(u);
    }

    if (hasRoleUpdates && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(AUTH_KEYS.ALL_USERS, JSON.stringify(uniqueFinalUsers));
      } catch {}
    }

    return uniqueFinalUsers;
  } catch (err) {
    console.warn('getAllUsers fallback error:', err);
    return [];
  }
}

export function saveAllUsers(users: AppUser[]): void {
  try {
    const cancelledList = getCancelledEmails();
    const sanitized = users.map((u) => {
      const uEmail = (u.email || '').trim().toLowerCase();
      if (uEmail !== PRIMARY_ADMIN_EMAIL.toLowerCase() && cancelledList.includes(uEmail)) {
        return { ...u, subscriptionStatus: 'cancelled' as const };
      }
      return u;
    });
    localStorage.setItem(AUTH_KEYS.ALL_USERS, JSON.stringify(sanitized));
    saveUsersToIndexedDB(sanitized).catch(() => {});
  } catch (e) {
    console.error('Error saving all users:', e);
  }
}

export interface RemoteUsersResult {
  users: AppUser[];
  source: 'cloudflare-d1' | 'local-cache';
  d1Configured: boolean;
  statusMessage?: string;
  isError?: boolean;
}

export async function fetchRemoteUsersDetailed(retryCount = 1): Promise<RemoteUsersResult> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/users', { cache: 'no-store', headers }).catch(() => null);
    if (!res) {
      return {
        users: getAllUsers(),
        source: 'local-cache',
        d1Configured: false,
        statusMessage: 'تعذر الاتصال بالخادم السحابي (وضع غير متصل بالإنترنت)',
        isError: true,
      };
    }

    if (!res.ok) {
      // إذا كانت الجلسة تحتاج تحديثاً وكان هناك مستخدم Firebase نشط، نجري محاولة تجديد فورية
      if ((res.status === 401 || res.status === 403) && retryCount > 0) {
        if (auth?.currentUser) {
          try {
            const fresh = await auth.currentUser.getIdToken(true);
            if (fresh) {
              saveCachedIdToken(fresh);
              return await fetchRemoteUsersDetailed(retryCount - 1);
            }
          } catch {}
        }
      }

      let msg = `استجابة الخادم غير ناجحة (${res.status})`;
      if (res.status === 401 || res.status === 403) {
        msg = 'جلسة المشرف غير معتمدة على الخادم. يرجى تسجيل الدخول بحساب المشرف المعتمد.';
      }
      return {
        users: getAllUsers(),
        source: 'local-cache',
        d1Configured: false,
        statusMessage: msg,
        isError: true,
      };
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      return {
        users: getAllUsers(),
        source: 'local-cache',
        d1Configured: false,
        statusMessage: 'استجابة بيانات غير صالحة من السيرفر',
        isError: true,
      };
    }

    if (data.message === 'D1 not configured') {
      return {
        users: getAllUsers(),
        source: 'local-cache',
        d1Configured: false,
        statusMessage: 'تنبيه: قاعدة Cloudflare D1 غير مربوطة بمتغير DB في لوحة Cloudflare Pages (يتم الحفظ في متصفحات المستخدمين محلياً)',
        isError: false,
      };
    }

    if (!Array.isArray(data.users)) {
      return {
        users: getAllUsers(),
        source: 'local-cache',
        d1Configured: true,
        statusMessage: 'تم الاتصال بالخادم، جاري معالجة البيانات',
      };
    }

    const cancelledList = getCancelledEmails();

    // Authoritative remote list from Cloudflare D1
    const remoteList: AppUser[] = data.users.map((ru: any) => {
      const ruEmail = (ru.email || '').trim().toLowerCase();
      const isCancelled =
        (ruEmail !== PRIMARY_ADMIN_EMAIL.toLowerCase() && cancelledList.includes(ruEmail)) ||
        ru.subscriptionStatus === 'cancelled';

      if (isCancelled && ruEmail) {
        markAccountCancelled(ruEmail);
      }

      const existingRole = ru.userRole || ru.user_role;
      const role: 'admin_school' | 'teacher' =
        existingRole === 'admin_school' ? 'admin_school' : 'teacher';

      return {
        uid: ru.uid,
        email: ru.email,
        displayName: ru.displayName || ru.email,
        isAdmin: isAdminUser(ru.email) || Boolean(ru.isAdmin),
        isTrial: ru.isTrial || ru.subscriptionType === 'trial',
        subscriptionType: ru.subscriptionType || 'monthly',
        subscriptionStatus: isCancelled ? ('cancelled' as const) : (ru.subscriptionStatus || 'active'),
        expiresAt: ru.expiresAt,
        lastActiveAt: ru.lastActiveAt || new Date().toISOString(),
        createdAt: ru.createdAt || new Date().toISOString(),
        authProvider: ru.authProvider || (ru.uid?.startsWith('trial-') ? 'trial' : 'email'),
        userRole: role,
      };
    });

    // Deduplicate remoteList & merge local users strictly without any duplicate uid or email
    const seenUids = new Set<string>();
    const seenEmails = new Set<string>();
    const dedupedRemoteList: AppUser[] = [];

    for (const ru of remoteList) {
      const ruUid = (ru.uid || '').trim();
      const ruEmail = (ru.email || '').trim().toLowerCase();
      if (ruUid && seenUids.has(ruUid)) continue;
      if (ruEmail && seenEmails.has(ruEmail)) continue;
      if (ruUid) seenUids.add(ruUid);
      if (ruEmail) seenEmails.add(ruEmail);
      dedupedRemoteList.push(ru);
    }

    // Merge any local users that might not be on server yet
    const localUsers = getAllUsers();
    for (const lu of localUsers) {
      if (!lu || !lu.email) continue;
      const luUid = (lu.uid || '').trim();
      const luEmail = lu.email.trim().toLowerCase();
      if (luUid && seenUids.has(luUid)) continue;
      if (luEmail && seenEmails.has(luEmail)) continue;
      if (luUid) seenUids.add(luUid);
      if (luEmail) seenEmails.add(luEmail);
      dedupedRemoteList.push(lu);
    }

    // Update local cache and IndexedDB with authoritative live D1 state
    saveAllUsers(dedupedRemoteList);
    return {
      users: dedupedRemoteList,
      source: 'cloudflare-d1',
      d1Configured: true,
      statusMessage: `متصل بقاعدة Cloudflare D1 المركزية مباشرة (تمت مزامنة ${dedupedRemoteList.length} مستخدم)`,
    };
  } catch (e) {
    console.warn('Error fetching remote users:', e);
    return {
      users: getAllUsers(),
      source: 'local-cache',
      d1Configured: false,
      statusMessage: 'حدث خطأ أثناء الاتصال بقاعدة البيانات، تم استخدام الذاكرة المحلية',
      isError: true,
    };
  }
}

export async function fetchRemoteUsers(): Promise<AppUser[]> {
  const result = await fetchRemoteUsersDetailed();
  return result.users;
}

export function upsertUserInRegistry(user: AppUser): void {
  try {
    const all = getAllUsers();
    const index = all.findIndex((u) => u.uid === user.uid || u.email.toLowerCase() === user.email.toLowerCase());
    if (index >= 0) {
      all[index] = { ...all[index], ...user };
    } else {
      all.unshift(user);
    }
    saveAllUsers(all);

    // Sync user registration to Cloudflare D1 backend (only for permanent non-trial users)
    if (!user.isTrial && user.authProvider !== 'trial' && !user.uid?.startsWith('trial-') && !user.email?.includes('@jok.nom')) {
      getAuthHeaders().then((headers) => {
        fetch('/api/users', {
          method: 'POST',
          headers,
          body: JSON.stringify(user),
        }).catch(() => {});
      });
    }
  } catch (e) {
    console.error('Error upserting user:', e);
  }
}

/**
 * تحديث وتثبيت صِفة المستخدم (إدارة مدرسة أو أستاذ) مباشرة في السيرفر السحابي وقاعدة البيانات
 * شرط أساسي: لا يمكن التحديد بدون اتصال فعّال بالإنترنت
 */
export async function updateUserRoleOnline(
  role: 'admin_school' | 'teacher',
  institutionType: InstitutionType = 'school'
): Promise<{ success: boolean; error?: string; user?: AppUser }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      error: 'لا يمكن تحديد نوع الحساب بدون اتصال بالإنترنت. يرجى الاتصال بالإنترنت أولاً للمزامنة السحابية وتثبيت صفتك في قاعدة البيانات.',
    };
  }

  const cur = getCurrentUser();
  if (!cur) {
    return {
      success: false,
      error: 'لم يتم العثور على جلسة مستخدم نشطة.',
    };
  }

  try {
    const headers = await getAuthHeaders();
    let res = await fetch('/api/users', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ userRole: role, institutionType }),
    });

    if (!res.ok) {
      // Fallback attempt via POST
      res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...cur, userRole: role, institutionType }),
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return {
        success: false,
        error: errData?.error || errData?.message || 'تعذر تسجيل نوع الحساب في السيرفر السحابي. يرجى التأكد من اتصال الإنترنت والمحاولة ثانية.',
      };
    }

    const updatedUser: AppUser = {
      ...cur,
      userRole: role,
      institutionType,
      lastActiveAt: new Date().toISOString(),
    };
    saveCurrentUser(updatedUser);
    upsertUserInRegistry(updatedUser);
    saveUsersToIndexedDB(getAllUsers()).catch(() => {});

    return {
      success: true,
      user: updatedUser,
    };
  } catch (err: any) {
    console.error('Error updating user role online:', err);
    return {
      success: false,
      error: 'حدث خطأ أثناء الاتصال بقاعدة البيانات السحابية. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.',
    };
  }
}

/**
 * تعديل صفة ونوع مؤسسة المستخدم (إدارة مدرسة أو أستاذ / مدرسة أو جامعة) بواسطة المشرف العام (الأدمن)
 * يتم التحديث في السيرفر السحابي، وفي الذاكرة المحلية، وفي IndexedDB
 */
export async function updateUserRoleByAdmin(
  uid: string,
  email: string,
  role: 'admin_school' | 'teacher',
  institutionType: InstitutionType = 'school'
): Promise<AppUser | null> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const all = getAllUsers();
  const index = all.findIndex((u) => (uid && u.uid === uid) || (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail));

  const targetUid = (index >= 0 ? all[index].uid : uid) || `user-${Date.now()}`;
  const targetEmail = (index >= 0 ? all[index].email : cleanEmail) || 'user@example.com';

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          uid: targetUid,
          email: targetEmail,
          userRole: role,
          institutionType,
        }),
      });

      if (!res.ok) {
        let errorMsg = 'تعذر تحديث نوع الحساب في السيرفر';
        try {
          const errData = await res.json();
          if (errData && errData.error) errorMsg = errData.error;
        } catch {}
        throw new Error(errorMsg);
      }
    } catch (e: any) {
      console.error('Failed to update user role on server:', e);
      throw e;
    }
  }

  let updated: AppUser;
  if (index >= 0) {
    updated = {
      ...all[index],
      userRole: role,
      institutionType,
      lastActiveAt: new Date().toISOString(),
    };
    all[index] = updated;
  } else {
    updated = {
      uid: targetUid,
      email: targetEmail,
      displayName: `أ. ${targetEmail.split('@')[0]}`,
      isTrial: false,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      subscriptionType: 'monthly',
      subscriptionStatus: 'active',
      authProvider: 'email',
      isAdmin: isAdminUser(targetEmail),
      userRole: role,
      institutionType,
    };
    all.push(updated);
  }

  saveAllUsers(all);
  try {
    await saveUsersToIndexedDB(all);
  } catch {}

  const current = getCurrentUser();
  if (current && (current.uid === targetUid || (current.email && current.email.toLowerCase() === targetEmail.toLowerCase()))) {
    current.userRole = role;
    current.institutionType = institutionType;
    saveCurrentUser(current);
  }

  recordAdminCommandInIndexedDB({
    action: 'update_role',
    uid: updated.uid,
    email: updated.email,
    timestamp: new Date().toISOString(),
    details: { userRole: role, institutionType },
  }).catch(() => {});

  return updated;
}

export function recordUserActivity(uid: string): void {
  try {
    const now = new Date().toISOString();
    const current = getCurrentUser();
    if (current && current.uid === uid) {
      current.lastActiveAt = now;
      saveCurrentUser(current);
    }

    const all = getAllUsers();
    const target = all.find((u) => u.uid === uid);
    if (target) {
      target.lastActiveAt = now;
      saveAllUsers(all);
    }
  } catch (e) {
    console.error('Error recording activity:', e);
  }
}

// ---------------- Subscription Control by Admin ----------------

// ---------------- Cancelled Accounts Registry ----------------

export function getCancelledEmails(): string[] {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.CANCELLED_ACCOUNTS);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((e) => typeof e === 'string' && e.trim()).map((e) => e.trim().toLowerCase())
      : [];
  } catch {
    return [];
  }
}

export function markAccountCancelled(email: string): void {
  try {
    if (!email || typeof email !== 'string') return;
    const clean = email.trim().toLowerCase();
    if (!clean || clean === PRIMARY_ADMIN_EMAIL.toLowerCase()) return;
    const list = getCancelledEmails();
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem(AUTH_KEYS.CANCELLED_ACCOUNTS, JSON.stringify(list));
      saveCancelledEmailsToIndexedDB(list).catch(() => {});
    }
  } catch {}
}

export function unmarkAccountCancelled(email: string): void {
  try {
    if (!email || typeof email !== 'string') return;
    const clean = email.trim().toLowerCase();
    const list = getCancelledEmails().filter((e) => e.toLowerCase() !== clean);
    localStorage.setItem(AUTH_KEYS.CANCELLED_ACCOUNTS, JSON.stringify(list));
    saveCancelledEmailsToIndexedDB(list).catch(() => {});
  } catch {}
}

export function isAccountCancelled(email?: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  if (!clean) return false;
  // Primary admin can NEVER be cancelled
  if (clean === PRIMARY_ADMIN_EMAIL.toLowerCase()) return false;
  try {
    if (getCancelledEmails().includes(clean)) return true;
    const raw = localStorage.getItem(AUTH_KEYS.ALL_USERS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const found = list.find(
          (u: any) => u && u.email && typeof u.email === 'string' && u.email.trim().toLowerCase() === clean
        );
        if (found?.subscriptionStatus === 'cancelled') return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function cancelUserAccount(uid: string, email: string): Promise<boolean> {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    console.warn('Cannot cancel primary admin account');
    return false;
  }

  // 1. Mark in cancelled registry (localStorage + IndexedDB)
  markAccountCancelled(cleanEmail);

  // 2. Record command in IndexedDB
  recordAdminCommandInIndexedDB({
    action: 'cancel',
    uid,
    email: cleanEmail,
    timestamp: new Date().toISOString(),
    details: { message: 'تم إلغاء حسابك من قِبل إدارة النظام.' },
  }).catch(() => {});

  // 3. Store active cancelled state for UI blocking
  try {
    localStorage.setItem(
      'gradebook_active_cancelled_user',
      JSON.stringify({
        email: cleanEmail,
        message: 'تم إلغاء حسابك من قِبل إدارة النظام.',
      })
    );
  } catch {}

  // 4. Update in all users cache (localStorage + IndexedDB)
  const all = getAllUsers();
  const index = all.findIndex((u) => (u && u.uid === uid) || (u && u.email && u.email.trim().toLowerCase() === cleanEmail));
  if (index >= 0) {
    all[index] = {
      ...all[index],
      subscriptionStatus: 'cancelled',
      lastActiveAt: new Date().toISOString(),
    };
    saveAllUsers(all);
  }

  // 5. Update stored account if present
  const accounts = getStoredAccounts();
  const accIndex = accounts.findIndex((a) => (a && a.uid === uid) || (a && a.email && a.email.trim().toLowerCase() === cleanEmail));
  if (accIndex >= 0) {
    accounts[accIndex].subscriptionStatus = 'cancelled';
    saveStoredAccounts(accounts);
  }

  // 6. If this is currently logged in user, update their session
  const current = getCurrentUser();
  if (current && (current.uid === uid || current.email.toLowerCase() === cleanEmail)) {
    saveCurrentUser({
      ...current,
      subscriptionStatus: 'cancelled',
    });
  }

  // 7. Sync cancellation to Cloudflare D1 (SQLite) and local server
  try {
    const headers = await getAuthHeaders();
    await fetch('/api/users', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        uid,
        email: cleanEmail,
        subscriptionStatus: 'cancelled',
      }),
    });
    return true;
  } catch (e) {
    console.warn('Sync cancellation to D1 failed:', e);
    return false;
  }
}

export async function reactivateUserSubscription(
  uid: string,
  email: string,
  type: SubscriptionType = 'lifetime'
): Promise<AppUser | null> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Unmark from cancelled registry (localStorage + IndexedDB)
  unmarkAccountCancelled(cleanEmail);

  // 2. Remove blocked cancelled account flag from localStorage
  try {
    const raw = localStorage.getItem('gradebook_active_cancelled_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.email || parsed.email.toLowerCase() === cleanEmail) {
        localStorage.removeItem('gradebook_active_cancelled_user');
      }
    }
  } catch {}

  // 3. Update user subscription on server via PUT (strict check: throws on failure)
  const updated = await updateUserSubscription(uid, type, 'active', cleanEmail);
  if (!updated) {
    throw new Error('تعذر إرسال طلب التفعيل إلى السيرفر.');
  }

  // 4. التحقق الصارم من السيرفر: بعد PUT ناجح، نعيد GET للتأكد 100% أن subscriptionStatus === 'active' في السيرفر
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline) {
    const headers = await getAuthHeaders();
    const verifyRes = await fetch(
      `/api/users?uid=${encodeURIComponent(updated.uid)}&email=${encodeURIComponent(cleanEmail)}`,
      { cache: 'no-store', headers }
    ).catch(() => null);

    if (verifyRes && verifyRes.ok) {
      const data = await verifyRes.json().catch(() => null);
      const serverUser = data?.user;
      if (!serverUser || serverUser.subscriptionStatus !== 'active') {
        throw new Error('لم يتفعل الحساب في قاعدة البيانات المركزية — حالة السيرفر ليست نشطة بعد.');
      }
      // مزامنة أي بيانات قادمة من السيرفر
      updated.subscriptionStatus = 'active';
      updated.subscriptionType = serverUser.subscriptionType || type;
      updated.expiresAt = serverUser.subscriptionType === 'lifetime' ? undefined : serverUser.expiresAt;
      saveCurrentUser(updated);
      upsertUserInRegistry(updated);
    } else if (verifyRes && !verifyRes.ok) {
      throw new Error(`فشل التحقق من تفعيل الحساب على السيرفر (رمز الاستجابة: ${verifyRes.status})`);
    }
  }

  // 5. Unmark in stored accounts
  const accounts = getStoredAccounts();
  const accIndex = accounts.findIndex((a) => a.uid === uid || a.email.toLowerCase() === cleanEmail);
  if (accIndex >= 0) {
    accounts[accIndex].subscriptionStatus = 'active';
    accounts[accIndex].subscriptionType = type;
    accounts[accIndex].expiresAt = updated.expiresAt;
    saveStoredAccounts(accounts);
  }

  // Record command in IndexedDB
  recordAdminCommandInIndexedDB({
    action: 'reactivate',
    uid: updated.uid,
    email: cleanEmail,
    timestamp: new Date().toISOString(),
    details: { type },
  }).catch(() => {});

  return updated;
}

export async function checkLiveSubscriptionByEmail(
  email: string
): Promise<{ active: boolean; user?: AppUser }> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/users?email=${encodeURIComponent(cleanEmail)}`, {
      cache: 'no-store',
      headers,
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && data.user) {
        const sUser = data.user;
        const subStatus = sUser.subscriptionStatus || 'active';
        if (subStatus === 'active') {
          unmarkAccountCancelled(cleanEmail);
          try {
            localStorage.removeItem('gradebook_active_cancelled_user');
          } catch {}
          const activeUser: AppUser = {
            uid: sUser.uid,
            email: sUser.email,
            displayName: sUser.displayName || sUser.email,
            isAdmin: Boolean(sUser.isAdmin),
            isTrial: Boolean(sUser.isTrial),
            subscriptionType: sUser.subscriptionType || 'monthly',
            subscriptionStatus: 'active',
            expiresAt: sUser.expiresAt,
            lastActiveAt: new Date().toISOString(),
            createdAt: sUser.createdAt || new Date().toISOString(),
            authProvider: sUser.authProvider || 'email',
          };
          // (1) localStorage للجلسة الحالية
          saveCurrentUser(activeUser);
          // (2) سجل المستخدمين
          upsertUserInRegistry(activeUser);
          const allUsers = getAllUsers();
          saveAllUsers(allUsers);
          // (3) IndexedDB مع await
          try {
            await saveUsersToIndexedDB(allUsers);
            await saveCancelledEmailsToIndexedDB(getCancelledEmails());
          } catch {}
          return { active: true, user: activeUser };
        }
      }
    }

    const all = getAllUsers();
    const local = all.find((u) => u.email.toLowerCase() === cleanEmail);
    if (local && local.subscriptionStatus === 'active') {
      unmarkAccountCancelled(cleanEmail);
      try {
        localStorage.removeItem('gradebook_active_cancelled_user');
      } catch {}
      saveCurrentUser(local);
      return { active: true, user: local };
    }

    return { active: false };
  } catch {
    return { active: false };
  }
}

export async function updateUserSubscription(
  uid: string,
  type: SubscriptionType,
  status: SubscriptionStatus = 'active',
  emailFallback?: string
): Promise<AppUser | null> {
  const all = getAllUsers();
  const cleanFallback = (emailFallback || '').trim().toLowerCase();
  let index = all.findIndex((u) => (uid && u.uid === uid) || (cleanFallback && u.email.toLowerCase() === cleanFallback));

  const now = new Date();
  let expiresAt: string | undefined = undefined;

  if (type === 'trial') {
    expiresAt = new Date(now.getTime() + TRIAL_DURATION_MS).toISOString();
  } else if (type === 'monthly') {
    // 30 days
    expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (type === 'yearly') {
    // 365 days
    expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  } else if (type === 'lifetime') {
    // No expiration for lifetime
    expiresAt = undefined;
  }

  if (status === 'expired' || status === 'cancelled') {
    expiresAt = new Date(now.getTime() - 1000).toISOString();
  }

  const userEmail = (index >= 0 ? all[index].email : cleanFallback) || 'user@example.com';
  const targetUid = (index >= 0 ? all[index].uid : uid) || `user-${Date.now()}`;

  // 1. مزامنة التحديث مباشرة مع السيرفر السحابي (Cloudflare D1) مع التحقق الصارم من res.ok وعدم ابتلاع الأخطاء
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          uid: targetUid,
          email: userEmail,
          subscriptionType: type,
          subscriptionStatus: status,
          // عند مدى الحياة ونشط، يجب أن يكون null في السيرفر
          expiresAt: type === 'lifetime' && status === 'active' ? null : (expiresAt || null),
        }),
      });

      if (!res.ok) {
        let errorMsg = 'لم يتم الحفظ في قاعدة البيانات السحابية — أعد المحاولة';
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch {}
        if (res.status === 403) {
          errorMsg = 'مرفوض: ليس لديك صلاحية المشرف العام (أدمن) لتعديل الاشتراكات في السيرفر.';
        } else if (res.status === 400) {
          errorMsg = `خطأ في بيانات التفعيل: ${errorMsg}`;
        }
        throw new Error(errorMsg);
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('مرفوض') || e.message.includes('لم يتم الحفظ') || e.message.includes('خطأ في بيانات'))) {
        throw e;
      }
      throw new Error(`لم يتم الحفظ في قاعدة البيانات السحابية — أعد المحاولة (${e.message || 'خطأ في الاتصال'})`);
    }
  }

  // 2. تحديث الحالة محلياً فقط بعد نجاح الحفظ في السيرفر (أو في وضع أوفلاين مع تخزين الأمر)
  if (status === 'cancelled') {
    markAccountCancelled(userEmail);
  } else if (status === 'active') {
    unmarkAccountCancelled(userEmail);
    try {
      localStorage.removeItem('gradebook_active_cancelled_user');
    } catch {}
  }

  let updated: AppUser;
  if (index >= 0) {
    updated = {
      ...all[index],
      uid: targetUid,
      subscriptionType: type,
      subscriptionStatus: status,
      expiresAt: type === 'lifetime' && status === 'active' ? undefined : expiresAt,
      lastActiveAt: now.toISOString(),
    };
    all[index] = updated;
  } else {
    updated = {
      uid: targetUid,
      email: userEmail,
      displayName: `أ. ${userEmail.split('@')[0]}`,
      isTrial: type === 'trial',
      createdAt: now.toISOString(),
      expiresAt: type === 'lifetime' && status === 'active' ? undefined : expiresAt,
      lastActiveAt: now.toISOString(),
      subscriptionType: type,
      subscriptionStatus: status,
      authProvider: 'email',
      isAdmin: isAdminUser(userEmail),
    };
    all.push(updated);
  }

  saveAllUsers(all);

  // If this is current user, update current user too
  const current = getCurrentUser();
  if (current && (current.uid === targetUid || current.email.toLowerCase() === userEmail.toLowerCase())) {
    saveCurrentUser(updated);
  }

  // Record command in IndexedDB
  recordAdminCommandInIndexedDB({
    action: status === 'cancelled' ? 'cancel' : status === 'active' ? 'reactivate' : 'update_plan',
    uid: updated.uid,
    email: updated.email,
    timestamp: now.toISOString(),
    details: { type, status, expiresAt },
  }).catch(() => {});

  return updated;
}

export async function deleteUserFromRegistry(uid: string, email?: string): Promise<boolean> {
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  // Record command in IndexedDB
  recordAdminCommandInIndexedDB({
    action: 'delete',
    uid,
    email: cleanEmail,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  // 1. Permanently remove from stored accounts so it never restores!
  removeStoredAccount(uid, cleanEmail);

  // 2. Remove from all users local cache
  const all = getAllUsers().filter(
    (u) => u.uid !== uid && (cleanEmail ? u.email.trim().toLowerCase() !== cleanEmail : true)
  );
  saveAllUsers(all);

  // 3. Purge session if this was the current user
  const current = getCurrentUser();
  if (current && (current.uid === uid || (cleanEmail && current.email.trim().toLowerCase() === cleanEmail))) {
    purgeTrialAccount();
  }

  // 4. Delete directly from Cloudflare D1 backend (awaited!)
  try {
    const url = cleanEmail
      ? `/api/users?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(cleanEmail)}`
      : `/api/users?uid=${encodeURIComponent(uid)}`;
    const headers = await getAuthHeaders();
    const res = await fetch(url, { method: 'DELETE', headers });
    return res.ok;
  } catch (e) {
    console.warn('Direct delete from D1 failed:', e);
    return false;
  }
}

// ---------------- Offline Verification & Live D1 Checks ----------------

// Offline grace period before requiring online verification with Cloudflare D1
// تم جعل الفترة بدون إنترنت غير محدودة تماماً (Infinity) كما طلب المستخدم
export const OFFLINE_VERIFICATION_TIMEOUT_MS = Infinity;

export interface UserVerificationResult {
  status: 'active' | 'cancelled_or_deleted' | 'expired' | 'offline_ok' | 'offline_timeout' | 'logged_out';
  user?: AppUser;
  message?: string;
  elapsedMs?: number;
}

export async function verifyUserWithCloudflareD1(
  user: AppUser,
  lastOnlineVerifiedAt: number
): Promise<UserVerificationResult> {
  if (user.isAdmin) {
    return { status: 'active', user };
  }

  // الحساب التجريبي محلي بالكامل (بدون جلسة Firebase) ولا يُتحقق منه من السيرفر
  if (user.isTrial || user.authProvider === 'trial') {
    return { status: 'active', user };
  }

  try {
    const cleanUid = encodeURIComponent(user.uid);
    const cleanEmail = encodeURIComponent(user.email);
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/users?uid=${cleanUid}&email=${cleanEmail}`, {
      cache: 'no-store',
      headers,
    });

    if (!localStorage.getItem(AUTH_KEYS.CURRENT_USER)) {
      return { status: 'logged_out' };
    }

    // 404 يعني أن السجل غير موجود بعد في D1، ولا يعني الإلغاء نهائياً
    if (res.status === 404) {
      // محاولة تسجيل السجل تلقائياً دون حظر أو إلغاء الحساب
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            authProvider: user.authProvider || 'email',
          }),
        }).catch(() => null);
      } catch {}
      return { status: 'offline_ok', user };
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && data.user) {
        const serverUser = data.user;
        const subStatus = serverUser.subscriptionStatus || 'active';

        if (subStatus === 'cancelled' || subStatus === 'suspended') {
          markAccountCancelled(user.email);
          const cancelledUser: AppUser = { ...user, subscriptionStatus: 'cancelled' };
          saveCurrentUser(cancelledUser);
          return {
            status: 'cancelled_or_deleted',
            message: 'تم إلغاء وتجميد حسابك من قِبل إدارة النظام.',
          };
        }

        if (subStatus === 'expired') {
          const expiredUser: AppUser = { ...user, subscriptionStatus: 'expired' };
          saveCurrentUser(expiredUser);
          return {
            status: 'expired',
            user: expiredUser,
            message: 'انتهت صلاحية اشتراكك، يرجى التواصل مع الإدارة للتجديد.',
          };
        }

        const activeUser: AppUser = {
          ...user,
          subscriptionType: serverUser.subscriptionType || user.subscriptionType,
          subscriptionStatus: 'active',
          expiresAt: serverUser.subscriptionType === 'lifetime' ? undefined : serverUser.expiresAt,
          isAdmin: Boolean(serverUser.isAdmin || user.isAdmin),
          lastActiveAt: new Date().toISOString(),
          userRole: serverUser.userRole || serverUser.user_role || user.userRole,
        };
        saveCurrentUser(activeUser);
        upsertUserInRegistry(activeUser);
        saveUsersToIndexedDB(getAllUsers()).catch(() => {});
        return { status: 'active', user: activeUser };
      }
    }

    // Server non-404 error or offline: continue in offline mode indefinitely without timeout
    const elapsedMs = Date.now() - lastOnlineVerifiedAt;
    return { status: 'offline_ok', elapsedMs };
  } catch (err) {
    if (!localStorage.getItem(AUTH_KEYS.CURRENT_USER)) {
      return { status: 'logged_out' };
    }
    // Network failure (offline): continue in offline mode indefinitely without timeout
    const elapsedMs = Date.now() - lastOnlineVerifiedAt;
    return { status: 'offline_ok', elapsedMs };
  }
}

// ---------------- Trial Extractions Tracker ----------------
const TRIAL_EXTRACTIONS_KEY = 'gradebook_trial_extractions_count';

export function getTrialExtractionsCount(): number {
  try {
    const val = localStorage.getItem(TRIAL_EXTRACTIONS_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function incrementTrialExtractionsCount(): void {
  try {
    const cur = getTrialExtractionsCount();
    localStorage.setItem(TRIAL_EXTRACTIONS_KEY, String(cur + 1));
  } catch {}
}

export function hasTrialExceededExtractions(): boolean {
  return getTrialExtractionsCount() >= 1;
}

export function resetTrialExtractionsCount(): void {
  try {
    localStorage.removeItem(TRIAL_EXTRACTIONS_KEY);
  } catch {}
}

// ---------------- Current User & Auth ----------------

export function isSubscriptionExpired(user: AppUser): boolean {
  if (user.isAdmin) return false;
  // المستخدمون المشتركون فعلاً (المشتركون القدامى والجدد الذين تم تفعيلهم من قبل الأدمن) لا تنتهي صلاحيتهم أبداً
  if (user.subscriptionStatus === 'active') return false;
  if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled') return true;

  // للمستخدمين الجدد غير المفعلين من قِبل الإدارة: فترة تجريبية مجانية لمدة 3 أيام من تاريخ التسجيل
  if (user.subscriptionStatus === 'pending' || user.isTrial) {
    const createdMs = parseSafeTimestamp(user.createdAt);
    if (createdMs > 0 && Date.now() - createdMs >= TRIAL_DURATION_MS) {
      return true;
    }
  }

  // فحص تاريخ الانتهاء الصريح
  if (user.expiresAt) {
    const expiresMs = parseSafeTimestamp(user.expiresAt);
    if (expiresMs > 0 && Date.now() >= expiresMs) {
      return true;
    }
  }

  // حماية ضد التلاعب بساعة وتاريخ الجهاز في وضع الـ offline:
  // إذا تم إرجاع ساعة الجهاز للخلف بأكثر من 15 دقيقة عن آخر وقت نشاط مسجل، يُقفل النظام
  if (user.lastActiveAt) {
    const lastActiveMs = parseSafeTimestamp(user.lastActiveAt);
    if (lastActiveMs > 0 && Date.now() < lastActiveMs - 15 * 60 * 1000) {
      return true;
    }
  }

  return false;
}

export async function checkLiveSubscription(
  user: AppUser
): Promise<{ active: boolean; updatedUser?: AppUser; message?: string }> {
  const cleanUid = (user.uid || '').trim();
  const cleanEmail = (user.email || '').trim().toLowerCase();

  try {
    const headers = await getAuthHeaders();
    let res = await fetch(
      `/api/users?uid=${encodeURIComponent(cleanUid)}&email=${encodeURIComponent(cleanEmail)}`,
      { cache: 'no-store', headers }
    ).catch(() => null);

    // إذا كانت الاستجابة 404: 404 تعني "لا يوجد سجل في D1" وليس "تم الإلغاء".
    // لا يتم حذف الحساب نهائياً، بل نحاول تسجيله عبر POST /api/users ثم إعادة المحاولة
    if (res && res.status === 404) {
      try {
        const postRes = await fetch('/api/users', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            uid: cleanUid,
            email: cleanEmail,
            displayName: user.displayName || `أ. ${cleanEmail.split('@')[0]}`,
            authProvider: user.authProvider || 'email',
          }),
        }).catch(() => null);

        if (postRes && postRes.ok) {
          // إعادة المحاولة GET بعد التسجيل
          res = await fetch(
            `/api/users?uid=${encodeURIComponent(cleanUid)}&email=${encodeURIComponent(cleanEmail)}`,
            { cache: 'no-store', headers }
          ).catch(() => null);
        } else {
          // في حال فشل POST: الحفاظ على بيانات المستخدم المحلية والجلسة سليمة
          return {
            active: false,
            updatedUser: user,
            message: 'الحساب غير مسجّل في النظام، تواصل مع الإدارة للتفعيل.',
          };
        }
      } catch {
        return {
          active: false,
          updatedUser: user,
          message: 'الحساب غير مسجّل في النظام، تواصل مع الإدارة للتفعيل.',
        };
      }
    }

    // عند فشل الشبكة أو تعذر الاتصال بالسيرفر (offline):
    if (!res || !res.ok) {
      // إذا كانت الحالة المحلية 'expired' أو 'cancelled' نرجع active: false مع رسالة واضحة دون مسح أي شيء
      if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled' || isAccountCancelled(user.email)) {
        return {
          active: false,
          updatedUser: user,
          message: 'لا يوجد اتصال بالإنترنت للتحقق من حالة اشتراكك، يرجى الاتصال بالإنترنت والمحاولة مجدداً.',
        };
      }
      // إذا كان الحساب نشطاً محلياً، نعتمد على التحقق المحلي للأوفلاين
      const expired = isSubscriptionExpired(user);
      return {
        active: !expired,
        updatedUser: user,
        message: expired
          ? 'انتهت صلاحية الاشتراك محلياً. يرجى الاتصال بالإنترنت لتجديد الاشتراك.'
          : 'وضع العمل بدون إنترنت (الاشتراك نشط محلياً).',
      };
    }

    const data = await res.json().catch(() => null);
    if (data && data.success && data.user) {
      const serverUser = data.user;
      const subStatus = serverUser.subscriptionStatus || 'active';
      const isNowActive = subStatus === 'active';

      if (subStatus === 'cancelled' || subStatus === 'suspended') {
        markAccountCancelled(cleanEmail);
        const cancelledUser: AppUser = {
          ...user,
          subscriptionStatus: 'cancelled',
          lastActiveAt: new Date().toISOString(),
        };
        saveCurrentUser(cancelledUser);
        upsertUserInRegistry(cancelledUser);
        return {
          active: false,
          updatedUser: cancelledUser,
          message: 'تم إلغاء حسابك من قِبل إدارة النظام. يرجى التواصل مع الإدارة.',
        };
      }

      unmarkAccountCancelled(cleanEmail);
      try {
        localStorage.removeItem('gradebook_active_cancelled_user');
      } catch {}

      const updatedUser: AppUser = {
        ...user,
        subscriptionType: serverUser.subscriptionType || user.subscriptionType,
        subscriptionStatus: isNowActive ? 'active' : subStatus,
        expiresAt: serverUser.subscriptionType === 'lifetime' ? undefined : serverUser.expiresAt,
        isAdmin: Boolean(serverUser.isAdmin || user.isAdmin),
        lastActiveAt: new Date().toISOString(),
        userRole: serverUser.userRole || serverUser.user_role || user.userRole,
        institutionType: serverUser.institutionType || serverUser.institution_type || user.institutionType || 'school',
      };

      // عند استلام active من السيرفر: التحديث يشمل الأماكن الثلاثة كلها بالترتيب وبشكل مؤكد
      if (isNowActive) {
        // (1) localStorage لجلسة المستخدم الحالية عبر saveCurrentUser
        saveCurrentUser(updatedUser);

        // (2) سجل المستخدمين المحلي عبر upsertUserInRegistry و saveAllUsers
        upsertUserInRegistry(updatedUser);
        const allUsers = getAllUsers();
        saveAllUsers(allUsers);

        // (3) IndexedDB عبر saveUsersToIndexedDB(allUsers) مع await لضمان الكتابة الدائمة قبل العودة
        try {
          await saveUsersToIndexedDB(allUsers);
          await saveCancelledEmailsToIndexedDB(getCancelledEmails());
        } catch (idbErr) {
          console.warn('Error awaiting IndexedDB sync in checkLiveSubscription:', idbErr);
        }
      } else {
        saveCurrentUser(updatedUser);
        upsertUserInRegistry(updatedUser);
        saveUsersToIndexedDB(getAllUsers()).catch(() => {});
      }

      return {
        active: isNowActive,
        updatedUser,
        message: isNowActive
          ? 'تم تفعيل الحساب بنجاح من قِبل الإدارة!'
          : 'الحساب بانتظار تفعيل الإدارة.',
      };
    }

    if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled') {
      return {
        active: false,
        updatedUser: user,
        message: 'الحساب بانتظار تفعيل الإدارة.',
      };
    }

    return { active: !isSubscriptionExpired(user), updatedUser: user };
  } catch (err) {
    console.warn('Subscription check error:', err);
    if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled' || isAccountCancelled(user.email)) {
      return {
        active: false,
        updatedUser: user,
        message: 'لا يوجد اتصال بالإنترنت للتحقق من حالة اشتراكك، يرجى الاتصال بالإنترنت والمحاولة مجدداً.',
      };
    }
    return { active: !isSubscriptionExpired(user), updatedUser: user };
  }
}

export function getCurrentUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.CURRENT_USER);
    if (!raw) return null;
    const user: AppUser = JSON.parse(raw);

    // Refresh admin status
    user.isAdmin = isAdminUser(user.email);

    // Ensure userRole is preserved if admin_school or teacher, or defaulted to teacher for legacy/unassigned users
    if (user.userRole !== 'admin_school' && user.userRole !== 'teacher') {
      try {
        const rawAll = localStorage.getItem(AUTH_KEYS.ALL_USERS);
        let targetRole: 'admin_school' | 'teacher' = 'teacher';
        if (rawAll) {
          const allList: AppUser[] = JSON.parse(rawAll);
          const cleanEmail = (user.email || '').trim().toLowerCase();
          const match = allList.find(
            (u) => (user.uid && u.uid === user.uid) || (u.email && u.email.trim().toLowerCase() === cleanEmail)
          );
          if (match?.userRole === 'admin_school') {
            targetRole = 'admin_school';
          }
        }
        user.userRole = targetRole;
        localStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(user));
        upsertUserInRegistry(user);
      } catch {
        user.userRole = 'teacher';
      }
    }

    user.institutionType = user.institutionType === 'university' ? 'university' : 'school';

    // Check cancelled status: if cancelled, keep cancelled
    if (!user.isAdmin && (user.subscriptionStatus === 'cancelled' || isAccountCancelled(user.email))) {
      user.subscriptionStatus = 'cancelled';
      return user;
    }

    // Check expiration
    if (isSubscriptionExpired(user)) {
      user.subscriptionStatus = 'expired';
    }

    return user;
  } catch (e) {
    console.error('Error reading current user:', e);
    return null;
  }
}

export function saveCurrentUser(user: AppUser | null): void {
  try {
    if (user) {
      user.isAdmin = isAdminUser(user.email);
      localStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(user));
      if (!user.isTrial && user.authProvider !== 'trial' && !user.uid?.startsWith('trial-') && !user.email?.includes('@jok.nom')) {
        upsertUserInRegistry(user);
      }
    } else {
      localStorage.removeItem(AUTH_KEYS.CURRENT_USER);
    }
  } catch (e) {
    console.error('Error saving current user:', e);
  }
}

export function purgeTrialAccount(): void {
  try {
    localStorage.removeItem(AUTH_KEYS.CURRENT_USER);
    localStorage.setItem(AUTH_KEYS.EXPIRED_NOTICE, 'true');
  } catch (e) {
    console.error('Error purging trial account:', e);
  }
}

export function purgeAllTrialData(): void {
  try {
    if (typeof window === 'undefined') return;

    // 1. Remove current user if trial
    let isCurrentTrial = false;
    const rawCur = localStorage.getItem(AUTH_KEYS.CURRENT_USER);
    if (rawCur) {
      try {
        const u = JSON.parse(rawCur);
        if (u.isTrial || u.authProvider === 'trial' || u.uid?.startsWith('trial-') || u.email?.includes('@jok.nom')) {
          isCurrentTrial = true;
          localStorage.removeItem(AUTH_KEYS.CURRENT_USER);
        }
      } catch {}
    }

    // 2. Clear all trial users from ALL_USERS in localStorage & IndexedDB
    const rawAll = localStorage.getItem(AUTH_KEYS.ALL_USERS);
    if (rawAll) {
      try {
        const users: AppUser[] = JSON.parse(rawAll);
        const nonTrial = (Array.isArray(users) ? users : []).filter(
          (u) => !u.isTrial && u.authProvider !== 'trial' && !u.uid?.startsWith('trial-') && !u.email?.includes('@jok.nom')
        );
        localStorage.setItem(AUTH_KEYS.ALL_USERS, JSON.stringify(nonTrial));
        saveUsersToIndexedDB(nonTrial).catch(() => {});
      } catch {}
    }

    // 3. Scan and delete all trial-scoped keys from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('trial-') || key.includes('@jok.nom') || key.includes('demo_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 4. Remove notices and active cancelled states
    localStorage.removeItem(AUTH_KEYS.EXPIRED_NOTICE);
    localStorage.removeItem('gradebook_active_cancelled_user');
    resetTrialExtractionsCount();

    // 5. Clear IndexedDB stores of trial records
    openGradebookDB().then((db) => {
      ['models', 'terms', 'profile', 'users'].forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) return;
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => {
            const items = req.result || [];
            for (const item of items) {
              const uId = item.userUid || item.uid || item.id || '';
              const email = item.email || '';
              if (String(uId).includes('trial-') || String(email).includes('@jok.nom') || String(email).includes('demo_')) {
                const kp = store.keyPath as string;
                if (kp && item[kp]) store.delete(item[kp]);
              }
            }
          };
        } catch {}
      });
    }).catch(() => {});

    // 6. Sign out Firebase session ONLY if current user was a trial session
    if (isCurrentTrial) {
      firebaseSignOut(auth).catch(() => {});
    }
  } catch (err) {
    console.error('Error purging all trial data:', err);
  }
}

export function checkAndClearExpiredNotice(): boolean {
  const hadNotice = localStorage.getItem(AUTH_KEYS.EXPIRED_NOTICE) === 'true';
  if (hadNotice) {
    localStorage.removeItem(AUTH_KEYS.EXPIRED_NOTICE);
  }
  return hadNotice;
}

export function getTrialRemainingTime(user: AppUser): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  totalHours: number;
} {
  if (!user || user.isAdmin || user.subscriptionStatus === 'active' || user.subscriptionType === 'lifetime') {
    return { days: 999, hours: 9999, minutes: 0, seconds: 0, expired: false, totalHours: 9999 };
  }
  const now = Date.now();
  // حساب وقت الانتهاء: إما تاريخ الانتهاء الصريح أو تاريخ الإنشاء + الفترة التجريبية (3 أيام)
  let expires = user.expiresAt ? parseSafeTimestamp(user.expiresAt) : 0;
  if (!expires && user.createdAt) {
    const createdMs = parseSafeTimestamp(user.createdAt);
    expires = createdMs > 0 ? createdMs + TRIAL_DURATION_MS : 0;
  }
  if (!expires) {
    expires = now + TRIAL_DURATION_MS;
  }
  const diff = expires - now;

  if (diff <= 0 || user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled') {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, totalHours: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, expired: false, totalHours: diff / (1000 * 60 * 60) };
}

export function hasActiveCancelledAccount(): boolean {
  try {
    const raw = localStorage.getItem('gradebook_active_cancelled_user');
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.email && typeof p.email === 'string') {
        const clean = p.email.trim().toLowerCase();
        if (clean === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
          localStorage.removeItem('gradebook_active_cancelled_user');
          return false;
        }
        if (isAccountCancelled(clean)) return true;
      }
    }
  } catch {}
  return false;
}

// ---------------- Login Flows ----------------

export function loginWithTrial(): AppUser {
  // Clear any active cancelled session alert so user can enter the trial sandbox cleanly
  try {
    localStorage.removeItem('gradebook_active_cancelled_user');
    resetTrialExtractionsCount();
  } catch {}

  // Disconnect any lingering Firebase session so the trial runs in its own clean local sandbox
  try {
    firebaseSignOut(auth).catch(() => {});
  } catch {}

  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const trialEmail = `demo_${randomSuffix}@jok.nom`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRIAL_DURATION_MS);

  const trialUser: AppUser = {
    uid: `trial-${Date.now()}-${randomSuffix}`,
    email: trialEmail,
    displayName: `مستخدم تجريبي (${randomSuffix})`,
    isTrial: true,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastActiveAt: now.toISOString(),
    subscriptionType: 'trial',
    subscriptionStatus: 'active',
    authProvider: 'trial',
    isAdmin: false,
  };

  saveCurrentUser(trialUser);
  return trialUser;
}

// ---------------------------------------------------------------------------
// بقايا الحسابات المحلية القديمة (قبل الانتقال إلى Firebase Auth).
// كلمات المرور القديمة تُمسح من الجهاز، ونبقي (uid, email) فقط لنقل البيانات المحلية مرة واحدة.
// ---------------------------------------------------------------------------
interface LegacyAccount {
  uid: string;
  email: string;
  displayName?: string;
  createdAt?: string;
  subscriptionType?: SubscriptionType;
  subscriptionStatus?: SubscriptionStatus;
  expiresAt?: string;
}

const REGISTERED_USERS_KEY = 'gradebook_registered_accounts_v2';

function getStoredAccounts(): LegacyAccount[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.map((a: any) => {
          const { passwordHash: _removed, ...rest } = a || {};
          return { ...rest, uid: String(rest.uid || ''), email: String(rest.email || '') } as LegacyAccount;
        })
      : [];
  } catch {
    return [];
  }
}

function saveStoredAccounts(accounts: LegacyAccount[]): void {
  try {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Error saving accounts:', e);
  }
}

// مسح كلمات المرور القديمة (نص صريح أو hash) فور تحميل هذه النسخة
(function scrubLegacyPasswords() {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (raw && raw.includes('passwordHash')) saveStoredAccounts(getStoredAccounts());
  } catch {
    /* ignore */
  }
})();

export function removeStoredAccount(uid: string, email?: string): void {
  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const filtered = getStoredAccounts().filter(
      (a) => a.uid !== uid && (cleanEmail ? a.email.toLowerCase() !== cleanEmail : true)
    );
    saveStoredAccounts(filtered);
  } catch (e) {
    console.error('Error removing stored account:', e);
  }
}

/** ينسخ بيانات الحساب المحلي القديم (حسب البريد) إلى uid الجديد القادم من Firebase، مرة واحدة. */
function migrateLegacyLocalData(email: string, newUid: string): void {
  try {
    const legacy = getStoredAccounts().find((a) => a.email.toLowerCase() === email && a.uid && a.uid !== newUid);
    if (!legacy) return;
    for (const base of [STORAGE_KEYS.MODELS, STORAGE_KEYS.TERMS, STORAGE_KEYS.PROFILE]) {
      const from = getScopedStorageKey(base, legacy.uid);
      const to = getScopedStorageKey(base, newUid);
      const data = localStorage.getItem(from);
      if (data && !localStorage.getItem(to)) localStorage.setItem(to, data);
    }
    removeStoredAccount(legacy.uid, email);
  } catch (e) {
    console.warn('Legacy data migration skipped:', e);
  }
}

function cancelledError(email: string): Error {
  return new Error('CANCELLED_ACCOUNT:' + email);
}

/**
 * تسجيل المستخدم بشكل موثوق في السيرفر (D1) مع إعادة المحاولة (retries) لضمان عدم بقاء أي مستخدم بدون سجل
 */
export type ServerRegistrationResult =
  | { status: 'ok' }
  | { status: 'unverified'; emailSent: boolean }
  | { status: 'failed' };

/** نفس registerUserWithServer لكن يوضح إن كان الحساب بانتظار تفعيل البريد. */
export async function registerUserWithServerDetailed(
  user: { uid: string; email: string; displayName?: string; authProvider?: string },
  retries = 3
): Promise<ServerRegistrationResult> {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const cleanUid = (user.uid || '').trim();
  if (!cleanEmail || !cleanUid) return { status: 'failed' };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uid: cleanUid,
          email: cleanEmail,
          displayName: user.displayName || `أ. ${cleanEmail.split('@')[0]}`,
          authProvider: user.authProvider || 'email',
        }),
      });
      if (res.ok) {
        return { status: 'ok' };
      }
      if (res.status === 403) {
        const data = await res.json().catch(() => null);
        if (data?.code === 'EMAIL_NOT_VERIFIED') {
          return { status: 'unverified', emailSent: data.emailSent !== false };
        }
      }
    } catch (err) {
      console.warn(`Registration attempt ${attempt} failed:`, err);
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 350 * attempt));
    }
  }
  return { status: 'failed' };
}

export async function registerUserWithServer(
  user: { uid: string; email: string; displayName?: string; authProvider?: string },
  retries = 3
): Promise<boolean> {
  return (await registerUserWithServerDetailed(user, retries)).status === 'ok';
}

/** إعادة إرسال رسالة تفعيل الحساب (لا تتطلب تسجيل دخول). */
export async function resendVerificationEmail(email: string): Promise<void> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('يرجى إدخال بريد إلكتروني صالح.');
  let res: Response;
  try {
    res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
  } catch {
    throw new Error('تعذر الاتصال بالإنترنت. تحقق من الاتصال وحاول مجدداً.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'تعذر إعادة إرسال رسالة التفعيل.');
  }
}

/**
 * مصالحة (Reconciliation) عند بدء التشغيل أو العودة أونلاين:
 * إذا كان المستخدم مسجلاً دخوله والسيرفر لا يعرفه (404) -> ننشئ سجله تلقائياً في D1
 * وإذا كان السيرفر حدّث اشتراكه -> نحدّث الجلسة المحلية فوراً
 */
export async function reconcileCurrentUserWithServer(): Promise<AppUser | null> {
  const cur = getCurrentUser();
  if (!cur || cur.isTrial || cur.authProvider === 'trial' || cur.uid?.startsWith('trial-') || cur.email?.includes('@jok.nom')) {
    return null;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return cur;
  }

  const cleanUid = cur.uid.trim();
  const cleanEmail = cur.email.trim().toLowerCase();

  try {
    const headers = await getAuthHeaders();
    let res = await fetch(
      `/api/users?uid=${encodeURIComponent(cleanUid)}&email=${encodeURIComponent(cleanEmail)}`,
      { cache: 'no-store', headers }
    ).catch(() => null);

    if (res && res.status === 404) {
      // المستخدم غير مسجل في D1 بعد: تسجيله فوراً مع إعادة المحاولة
      const registered = await registerUserWithServer(cur, 3);
      if (registered) {
        res = await fetch(
          `/api/users?uid=${encodeURIComponent(cleanUid)}&email=${encodeURIComponent(cleanEmail)}`,
          { cache: 'no-store', headers }
        ).catch(() => null);
      }
    }

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && data.user) {
        const s = data.user;
        const isServerActive = s.subscriptionStatus === 'active';
        const isServerLifetime = s.subscriptionType === 'lifetime';

        if (s.subscriptionStatus === 'cancelled' || s.subscriptionStatus === 'suspended') {
          markAccountCancelled(cleanEmail);
          const cancelledUser: AppUser = { ...cur, subscriptionStatus: 'cancelled' };
          saveCurrentUser(cancelledUser);
          return cancelledUser;
        }

        unmarkAccountCancelled(cleanEmail);
        try {
          localStorage.removeItem('gradebook_active_cancelled_user');
        } catch {}

        const updated: AppUser = {
          ...cur,
          displayName: s.displayName || cur.displayName,
          subscriptionType: s.subscriptionType || cur.subscriptionType,
          subscriptionStatus: isServerActive ? 'active' : (s.subscriptionStatus || cur.subscriptionStatus),
          expiresAt: isServerLifetime ? undefined : s.expiresAt,
          isAdmin: Boolean(s.isAdmin || cur.isAdmin),
          lastActiveAt: new Date().toISOString(),
          userRole: s.userRole !== undefined ? s.userRole : cur.userRole,
          institutionType: (s.institutionType || s.institution_type || cur.institutionType) === 'university' ? 'university' : 'school',
        };
        saveCurrentUser(updated);
        upsertUserInRegistry(updated);
        saveUsersToIndexedDB(getAllUsers()).catch(() => {});
        return updated;
      }
    }
  } catch (err) {
    console.warn('Reconciliation silent warning:', err);
  }
  return cur;
}

/**
 * يُستدعى بعد نجاح تسجيل الدخول في Firebase: يسجّل المستخدم في السيرفر (الاشتراك يحدده السيرفر)
 * ثم يقرأ سجله الرسمي (الاشتراك/الصلاحية) ويبني جلسة الواجهة.
 */
async function finalizeFirebaseLogin(
  fbUser: FirebaseUser,
  provider: 'email' | 'google',
  displayName?: string
): Promise<AppUser> {
  const email = (fbUser.email || '').trim().toLowerCase();
  if (isAccountCancelled(email)) {
    await firebaseSignOut(auth).catch(() => {});
    throw cancelledError(email);
  }

  const name = displayName?.trim() || fbUser.displayName || undefined;

  // تسجيل موثوق في السيرفر مع إعادة المحاولة
  const registration = await registerUserWithServerDetailed(
    {
      uid: fbUser.uid,
      email,
      displayName: name,
      authProvider: provider,
    },
    3
  );

  // حساب بالبريد وكلمة المرور لم يُفعَّل بعد: لا نبني جلسة، نخرج من Firebase ونعرض شاشة التفعيل
  if (registration.status === 'unverified') {
    await firebaseSignOut(auth).catch(() => {});
    throw new Error(`EMAIL_NOT_VERIFIED:${email}:${registration.emailSent ? '1' : '0'}`);
  }

  let server: any = null;
  try {
    const idToken = await fbUser.getIdToken().catch(() => null);
    if (idToken) saveCachedIdToken(idToken);
    const headers = await getAuthHeaders(idToken ? { Authorization: `Bearer ${idToken}` } : {});
    const res = await fetch(`/api/users?email=${encodeURIComponent(email)}&uid=${encodeURIComponent(fbUser.uid)}`, {
      cache: 'no-store',
      headers,
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && data.user) server = data.user;
    }
  } catch {
    /* offline: نكمل بالقيم الافتراضية للواجهة، والسيرفر هو من يفرض الصلاحيات */
  }

  if (server && (server.subscriptionStatus === 'cancelled' || server.subscriptionStatus === 'suspended')) {
    markAccountCancelled(email);
    await firebaseSignOut(auth).catch(() => {});
    throw cancelledError(email);
  }

  migrateLegacyLocalData(email, fbUser.uid);

  const now = new Date();
  const isAdmin = Boolean(server?.isAdmin || isAdminUser(email));
  const isServerActive = server?.subscriptionStatus === 'active';
  const isLifetime = server?.subscriptionType === 'lifetime' || isAdmin;
  const trialExpiresAt = new Date(now.getTime() + TRIAL_DURATION_MS).toISOString();

  // Resolve userRole: Preserve admin_school or teacher if already selected;
  // All legacy users and users without a role automatically become 'teacher'
  const cloudRole = server?.userRole || server?.user_role;
  const localRegistryRole = (() => {
    try {
      const all = getAllUsers();
      const m = all.find((u) => (fbUser.uid && u.uid === fbUser.uid) || (u.email && u.email.toLowerCase() === email));
      return m?.userRole;
    } catch {
      return undefined;
    }
  })();
  let resolvedRole: 'admin_school' | 'teacher' = 'teacher';
  if (cloudRole === 'admin_school' || localRegistryRole === 'admin_school') {
    resolvedRole = 'admin_school';
  } else if (cloudRole === 'teacher' || localRegistryRole === 'teacher') {
    resolvedRole = 'teacher';
  } else {
    resolvedRole = 'teacher';
  }

  const cloudInst = server?.institutionType || server?.institution_type;
  const localRegistryInst = (() => {
    try {
      const all = getAllUsers();
      const m = all.find((u) => (fbUser.uid && u.uid === fbUser.uid) || (u.email && u.email.toLowerCase() === email));
      return m?.institutionType;
    } catch {
      return undefined;
    }
  })();
  const resolvedInstType: InstitutionType = (cloudInst === 'university' || localRegistryInst === 'university') ? 'university' : 'school';

  const user: AppUser = {
    uid: fbUser.uid,
    email,
    displayName: server?.displayName || name || `أ. ${email.split('@')[0]}`,
    photoURL: fbUser.photoURL || undefined,
    isTrial: !isAdmin && !isServerActive,
    createdAt: server?.createdAt ? toNormalizedIsoString(server.createdAt) : now.toISOString(),
    lastActiveAt: now.toISOString(),
    expiresAt: isLifetime ? undefined : (server?.expiresAt ? toNormalizedIsoString(server.expiresAt) : trialExpiresAt),
    subscriptionType: isAdmin ? 'lifetime' : (server?.subscriptionType || 'trial'),
    subscriptionStatus: (isAdmin || isServerActive) ? 'active' : (server?.subscriptionStatus || 'pending'),
    authProvider: provider,
    isAdmin,
    userRole: resolvedRole,
    institutionType: resolvedInstType,
  };

  saveCurrentUser(user);
  upsertUserInRegistry(user);
  saveUsersToIndexedDB(getAllUsers()).catch(() => {});

  // If server had no role for this user, push resolved role in background so it's permanently recorded
  if (!cloudRole) {
    getAuthHeaders().then((headers) => {
      fetch('/api/users', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userRole: resolvedRole, institutionType: resolvedInstType }),
      }).catch(() => {});
    });
  }

  return user;
}

function firebaseAuthMessage(error: any): string {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/user-not-found':
      return 'لا يوجد حساب بهذا البريد. يمكنك إنشاء حساب جديد.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/email-already-in-use':
      return 'هذا البريد مسجّل مسبقاً. استخدم تسجيل الدخول أو استعادة كلمة المرور.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مجدداً.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالإنترنت. تحقق من الاتصال وحاول مجدداً.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في Firebase Console (Authentication > Sign-in method).';
    default:
      return 'تعذر تسجيل الدخول. يرجى المحاولة مرة أخرى.';
  }
}

export async function loginWithEmail(email: string, password: string): Promise<AppUser> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isAccountCancelled(normalizedEmail)) throw cancelledError(normalizedEmail);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('يرجى إدخال بريد إلكتروني صالح.');
  }
  if (!password) throw new Error('يرجى إدخال كلمة المرور.');

  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error: any) {
    throw new Error(firebaseAuthMessage(error));
  }
  return finalizeFirebaseLogin(cred.user, 'email');
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AppUser> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isAccountCancelled(normalizedEmail)) throw cancelledError(normalizedEmail);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('يرجى إدخال بريد إلكتروني صالح.');
  }
  if (!password || password.length < 8) {
    throw new Error('كلمة المرور يجب ألا تقل عن 8 أحرف.');
  }

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error: any) {
    throw new Error(firebaseAuthMessage(error));
  }
  // رسالة التفعيل يرسلها السيرفر (Resend) أثناء finalizeFirebaseLogin، والحساب لا يدخل قبل التفعيل
  return finalizeFirebaseLogin(cred.user, 'email', displayName);
}

export async function loginWithGoogle(): Promise<AppUser> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    return await finalizeFirebaseLogin(result.user, 'google');
  } catch (error: any) {
    if (error?.message && String(error.message).startsWith('CANCELLED_ACCOUNT:')) throw error;
    console.error('Google Sign-in failed:', error?.code || error);
    if (error?.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      throw new Error(`النطاق الحالي (${currentHost}) غير مضاف في Firebase Console > Authentication > Settings > Authorized domains.`);
    }
    if (error?.code === 'auth/operation-not-allowed') {
      throw new Error('تسجيل الدخول عبر Google غير مفعّل في Firebase Console (Authentication > Sign-in method).');
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة للموقع.');
    }
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية. يمكنك المحاولة مجدداً.');
    }
    if (error?.code === 'auth/network-request-failed') {
      throw new Error('تعذر الاتصال بالإنترنت. تحقق من الاتصال وحاول مجدداً.');
    }
    throw new Error('تعذر تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.');
  }
}

export async function sendPasswordResetLink(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('يرجى إدخال بريد إلكتروني صالح لإرسال رابط إعادة التعيين.');
  }
  try {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(auth, normalizedEmail);
  } catch (error: any) {
    // لا نكشف إن كان البريد مسجلاً أم لا (منع تعداد الحسابات)
    if (error?.code === 'auth/invalid-email') throw new Error('صيغة البريد الإلكتروني غير صحيحة.');
    if (error?.code === 'auth/network-request-failed') {
      throw new Error('تعذر الاتصال بالإنترنت. تحقق من الاتصال وحاول مجدداً.');
    }
    if (error?.code === 'auth/too-many-requests') {
      throw new Error('محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مجدداً.');
    }
    // أي خطأ آخر (مثل user-not-found) يُعامل كنجاح ظاهرياً
  }
}

export function logout(): void {
  saveCurrentUser(null);
  clearCachedIdToken();
  firebaseSignOut(auth).catch(() => {});
}

export function removeUserFromRegistry(uid: string): void {
  try {
    const all = getAllUsers().filter((u) => u.uid !== uid);
    saveAllUsers(all);
  } catch (e) {
    console.error('Error removing user from registry:', e);
  }
}

export function deleteAccountCompletely(uid: string): void {
  removeUserFromRegistry(uid);
  saveCurrentUser(null);
  clearCachedIdToken();
  // حذف حساب Firebase نفسه (قد يفشل إذا مضى وقت طويل على تسجيل الدخول؛ البيانات حُذفت من السيرفر على أي حال)
  const fbUser = auth.currentUser;
  if (fbUser) {
    fbUser.delete().catch(() => {}).finally(() => firebaseSignOut(auth).catch(() => {}));
  }
}

