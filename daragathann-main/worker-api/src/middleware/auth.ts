import type { MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../config/env';
import { TRIAL_DURATION_MS } from '../config/constants';
import { parseDbDateMs } from '../utils/dates';
import { verifyFirebaseIdToken, type TokenVerifier, type VerifiedCaller } from '../utils/firebaseJwt';
import { jsonFail } from '../utils/http';
import { UserRepository } from '../repositories/user.repository';

export interface AuthVariables {
  caller: VerifiedCaller;
}

export function authenticateMiddleware(
  customVerifier?: TokenVerifier
): MiddlewareHandler<{ Bindings: WorkerEnv; Variables: AuthVariables }> {
  const verify = customVerifier || verifyFirebaseIdToken;

  return async (c, next) => {
    const authHeader = c.req.header('Authorization') || '';
    const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
    if (!match) {
      return jsonFail(c, 401, 'يجب تسجيل الدخول أولاً.');
    }

    const caller = await verify(match[1], c.env);
    if (!caller) {
      return jsonFail(c, 401, 'جلسة غير صالحة أو منتهية. يرجى تسجيل الدخول مجدداً.');
    }
    if (caller.isAnonymous || !caller.email) {
      return jsonFail(c, 403, 'يلزم حساب مسجّل بالبريد الإلكتروني.');
    }

    if (c.env.DB && !caller.isAdmin && !caller.firebaseEmailVerified) {
      const repo = new UserRepository(c.env.DB);
      const unverified = await repo.isEmailUnverified(caller.email);
      if (unverified) {
        return jsonFail(c, 403, 'يرجى تفعيل حسابك عبر الرابط المرسل إلى بريدك الإلكتروني.', {
          code: 'EMAIL_NOT_VERIFIED',
          email: caller.email,
        });
      }
    }

    if (c.env.DB && !caller.isAdmin) {
      const repo = new UserRepository(c.env.DB);
      const dbAdmin = await repo.hasDbAdminFlag(caller.uid, caller.email);
      if (dbAdmin) {
        caller.isAdmin = true;
      }
    }

    c.set('caller', caller);
    await next();
  };
}

export function requireAdminMiddleware(): MiddlewareHandler<{ Bindings: WorkerEnv; Variables: AuthVariables }> {
  return async (c, next) => {
    const caller = c.get('caller');
    if (!caller?.isAdmin) {
      return jsonFail(c, 403, 'هذه العملية مخصصة للمشرف فقط.');
    }
    await next();
  };
}

export function requireSubscriptionMiddleware(
  opts: { requireActive?: boolean } = {}
): MiddlewareHandler<{ Bindings: WorkerEnv; Variables: AuthVariables }> {
  return async (c, next) => {
    const caller = c.get('caller');
    if (!caller || caller.isAdmin || !c.env.DB) {
      await next();
      return;
    }

    const repo = new UserRepository(c.env.DB);
    const row = await repo.findBestUserRow(caller.uid, caller.email);

    if (row && (row.is_admin === 1 || String(row.is_admin) === '1')) {
      await next();
      return;
    }

    const isCancelled =
      row?.subscription_status === 'cancelled' ||
      row?.subscription_status === 'suspended' ||
      (await repo.isEmailCancelled(caller.email));
    if (isCancelled) {
      return jsonFail(c, 403, 'تم إلغاء هذا الحساب من الإدارة.', { code: 'ACCOUNT_CANCELLED' });
    }

    const nowMs = Date.now();

    if (!row) {
      const usedTrial = await repo.findUsedTrial(caller.email);
      if (usedTrial) {
        const expMs =
          parseDbDateMs(usedTrial.trial_expires_at) ??
          (parseDbDateMs(usedTrial.first_trial_at) !== null
            ? parseDbDateMs(usedTrial.first_trial_at)! + TRIAL_DURATION_MS
            : null);
        if (expMs !== null && expMs <= nowMs) {
          return jsonFail(c, 403, 'انتهت الفترة التجريبية. يرجى الاشتراك للمتابعة.', {
            code: 'SUBSCRIPTION_EXPIRED',
          });
        }
      }
      if (opts.requireActive) {
        return jsonFail(c, 403, 'يرجى تسجيل الدخول وتفعيل الحساب للمتابعة.', {
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }
      await next();
      return;
    }

    if (row.subscription_status === 'expired') {
      return jsonFail(c, 403, 'انتهى الاشتراك. يرجى التجديد للمتابعة.', {
        code: 'SUBSCRIPTION_EXPIRED',
      });
    }

    if (row.subscription_type === 'lifetime' && row.subscription_status === 'active') {
      await next();
      return;
    }

    if (row.subscription_status === 'pending' || row.subscription_type === 'trial') {
      const expMs =
        parseDbDateMs(row.expires_at) ??
        (parseDbDateMs(row.created_at) !== null ? parseDbDateMs(row.created_at)! + TRIAL_DURATION_MS : null);
      if (expMs !== null && expMs <= nowMs) {
        await repo.markExpiredById(row.id);
        return jsonFail(c, 403, 'انتهت الفترة التجريبية. يرجى الاشتراك للمتابعة.', {
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }
      await next();
      return;
    }

    if (row.subscription_type === 'yearly' || row.subscription_type === 'monthly') {
      const expMs = parseDbDateMs(row.expires_at);
      if (expMs !== null && expMs <= nowMs) {
        await repo.markExpiredById(row.id);
        return jsonFail(c, 403, 'انتهى الاشتراك. يرجى التجديد للمتابعة.', {
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }
    }

    if (opts.requireActive && row.subscription_status !== 'active') {
      return jsonFail(c, 403, 'انتهى الاشتراك. يرجى التجديد للمتابعة.', {
        code: 'SUBSCRIPTION_EXPIRED',
      });
    }

    await next();
  };
}
