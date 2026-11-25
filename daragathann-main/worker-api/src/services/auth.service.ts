import {
  TRIAL_DURATION_MS,
  type InstitutionType,
  type SubscriptionStatus,
  type SubscriptionType,
  type UserRole,
} from '../config/constants';
import { isAdminEmail, type WorkerEnv } from '../config/env';
import { UserRepository, type FormattedUser, type UserRow } from '../repositories/user.repository';
import { normalizeToUtcIso, parseDbDateMs } from '../utils/dates';
import type { VerifiedCaller } from '../utils/firebaseJwt';

export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly code?: string
  ) {
    super(message);
  }
}

export class AuthService {
  private readonly repo: UserRepository;

  constructor(private readonly db: D1Database, private readonly env: Partial<WorkerEnv>) {
    this.repo = new UserRepository(db);
  }

  async registerOrLogin(
    caller: VerifiedCaller,
    input: { displayName?: string; userRole?: UserRole; institutionType?: InstitutionType }
  ): Promise<{ user: FormattedUser; created: boolean }> {
    const cleanEmail = caller.email.trim().toLowerCase();
    const isAdmin = caller.isAdmin || isAdminEmail(this.env, cleanEmail);

    if (!isAdmin && (await this.repo.isEmailCancelled(cleanEmail))) {
      throw new ServiceError(403, 'تم إلغاء هذا الحساب من الإدارة.', 'ACCOUNT_CANCELLED');
    }

    const matchingRows = await this.repo.findMatchingRows(caller.uid, cleanEmail);
    const displayName = input.displayName?.trim() || null;
    const requestedRole: UserRole = input.userRole || 'teacher';
    const requestedInst: InstitutionType = input.institutionType || 'school';
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    let created = false;

    if (matchingRows.length > 0) {
      const best = (await this.repo.findBestUserRow(caller.uid, cleanEmail))!;

      if (!isAdmin && (best.subscription_status === 'cancelled' || best.subscription_status === 'suspended')) {
        throw new ServiceError(403, 'تم إلغاء هذا الحساب من الإدارة.', 'ACCOUNT_CANCELLED');
      }

      let nextType: SubscriptionType =
        isAdmin
          ? 'lifetime'
          : best.subscription_type === 'monthly' ||
              best.subscription_type === 'yearly' ||
              best.subscription_type === 'lifetime'
            ? best.subscription_type
            : 'trial';
      let nextStatus: SubscriptionStatus = isAdmin ? 'active' : (best.subscription_status as SubscriptionStatus);
      let nextExpiresAt: string | null = isAdmin ? null : normalizeToUtcIso(best.expires_at);

      if (!isAdmin) {
        if (nextType === 'lifetime' && nextStatus === 'active') {
          nextExpiresAt = null;
        } else if (nextType === 'trial' || nextStatus === 'pending') {
          if (!nextExpiresAt) {
            const usedTrial = await this.repo.findUsedTrial(cleanEmail);
            const createdMs = parseDbDateMs(best.created_at) ?? nowMs;
            nextExpiresAt =
              normalizeToUtcIso(usedTrial?.trial_expires_at) ||
              new Date(createdMs + TRIAL_DURATION_MS).toISOString();
          }
          const expMs = parseDbDateMs(nextExpiresAt);
          if (expMs !== null && expMs <= nowMs) {
            nextStatus = 'expired';
          }
        } else if ((nextType === 'yearly' || nextType === 'monthly') && nextExpiresAt) {
          const expMs = parseDbDateMs(nextExpiresAt);
          if (expMs !== null && expMs <= nowMs) {
            nextStatus = 'expired';
          }
        }
      }

      const existingTargetRow = matchingRows.find((r) => r.uid === caller.uid);
      if (existingTargetRow) {
        await this.repo.refreshExistingUser({
          id: existingTargetRow.id,
          email: cleanEmail,
          displayName: displayName || best.display_name,
          isAdmin: isAdmin || best.is_admin === 1,
          subscriptionType: nextType,
          subscriptionStatus: nextStatus,
          expiresAt: nextExpiresAt,
        });
      } else {
        await this.repo.createUser({
          uid: caller.uid,
          email: cleanEmail,
          displayName: displayName || best.display_name,
          userRole: best.user_role === 'admin_school' ? 'admin_school' : requestedRole,
          institutionType: best.institution_type === 'university' ? 'university' : requestedInst,
          isAdmin: isAdmin || best.is_admin === 1,
          subscriptionType: nextType,
          subscriptionStatus: nextStatus,
          expiresAt: nextExpiresAt,
          createdAt: normalizeToUtcIso(best.created_at) || nowIso,
        });
      }

      // Migrate owned child data from any old/duplicate rows and delete those rows safely
      for (const row of matchingRows) {
        if (row.uid !== caller.uid) {
          await this.repo.migrateOwnedDataUid(row.uid, caller.uid);
          await this.repo.deleteDuplicateUserRowById(row.id);
        }
      }
    } else {
      created = true;
      if (isAdmin) {
        await this.repo.createUser({
          uid: caller.uid,
          email: cleanEmail,
          displayName,
          userRole: requestedRole,
          institutionType: requestedInst,
          isAdmin: true,
          subscriptionType: 'lifetime',
          subscriptionStatus: 'active',
          expiresAt: null,
          createdAt: nowIso,
        });
      } else {
        const usedTrial = await this.repo.findUsedTrial(cleanEmail);
        let firstTrialAt = nowIso;
        let trialExpiresAt = new Date(nowMs + TRIAL_DURATION_MS).toISOString();
        let initialStatus: SubscriptionStatus = 'pending';

        if (usedTrial) {
          firstTrialAt = normalizeToUtcIso(usedTrial.first_trial_at) || nowIso;
          const existingExpMs =
            parseDbDateMs(usedTrial.trial_expires_at) ??
            ((parseDbDateMs(firstTrialAt) ?? nowMs) + TRIAL_DURATION_MS);
          trialExpiresAt = new Date(existingExpMs).toISOString();
          initialStatus = existingExpMs <= nowMs ? 'expired' : 'pending';
        } else {
          await this.repo.recordUsedTrialIfAbsent(cleanEmail, firstTrialAt, trialExpiresAt);
        }

        await this.repo.createUser({
          uid: caller.uid,
          email: cleanEmail,
          displayName,
          userRole: requestedRole,
          institutionType: requestedInst,
          isAdmin: false,
          subscriptionType: 'trial',
          subscriptionStatus: initialStatus,
          expiresAt: trialExpiresAt,
          createdAt: firstTrialAt,
        });
      }
    }

    const saved = await this.repo.findUserWithProfileByUid(caller.uid);
    if (!saved) {
      throw new ServiceError(500, 'تعذر حفظ بيانات المستخدم.');
    }
    const cancelledSet = await this.repo.getCancelledEmailsSet();
    return { user: this.repo.formatUser(this.env, saved, cancelledSet), created };
  }

  async getMyProfile(caller: VerifiedCaller): Promise<FormattedUser> {
    const cleanEmail = caller.email.trim().toLowerCase();
    let row = await this.repo.findBestUserRow(caller.uid, cleanEmail);

    if (!row) {
      const reg = await this.registerOrLogin(caller, {});
      return reg.user;
    }

    const withProfile = (await this.repo.findUserWithProfileByUid(row.uid)) || row;
    const cancelledSet = await this.repo.getCancelledEmailsSet();
    return this.repo.formatUser(this.env, withProfile, cancelledSet);
  }

  async updateMyRole(
    caller: VerifiedCaller,
    input: { userRole: UserRole; institutionType?: InstitutionType }
  ): Promise<FormattedUser> {
    const row = await this.repo.findUserByUid(caller.uid);
    if (!row) {
      await this.registerOrLogin(caller, { userRole: input.userRole, institutionType: input.institutionType });
    } else {
      await this.repo.updateOwnRole(caller.uid, input.userRole, input.institutionType);
    }
    const updated = await this.repo.findUserWithProfileByUid(caller.uid);
    if (!updated) throw new ServiceError(404, 'المستخدم غير موجود.');
    const cancelledSet = await this.repo.getCancelledEmailsSet();
    return this.repo.formatUser(this.env, updated, cancelledSet);
  }

  async adminListUsers(): Promise<FormattedUser[]> {
    const [rows, cancelledSet] = await Promise.all([
      this.repo.findAllUsersWithProfile(),
      this.repo.getCancelledEmailsSet(),
    ]);
    return rows.map((r) => this.repo.formatUser(this.env, r, cancelledSet));
  }

  async adminGetUser(targetUid: string): Promise<FormattedUser> {
    const row = await this.repo.findUserWithProfileByUid(targetUid);
    if (!row) {
      throw new ServiceError(404, 'المستخدم غير موجود.');
    }
    const cancelledSet = await this.repo.getCancelledEmailsSet();
    return this.repo.formatUser(this.env, row, cancelledSet);
  }

  async adminUpdateUser(
    targetUid: string,
    input: {
      email?: string;
      subscriptionType?: SubscriptionType;
      subscriptionStatus?: SubscriptionStatus;
      userRole?: UserRole;
      institutionType?: InstitutionType;
    }
  ): Promise<FormattedUser> {
    const updated = await this.repo.adminUpdateUser({
      targetUid,
      email: input.email,
      subscriptionType: input.subscriptionType,
      subscriptionStatus: input.subscriptionStatus,
      userRole: input.userRole,
      institutionType: input.institutionType,
    });
    if (!updated) {
      throw new ServiceError(404, 'المستخدم غير موجود.');
    }
    const withProfile = (await this.repo.findUserWithProfileByUid(updated.uid)) || updated;
    const cancelledSet = await this.repo.getCancelledEmailsSet();
    return this.repo.formatUser(this.env, withProfile, cancelledSet);
  }

  async deleteAccount(caller: VerifiedCaller, targetUid: string): Promise<void> {
    if (!caller.isAdmin && targetUid !== caller.uid) {
      throw new ServiceError(403, 'لا يمكنك حذف حساب مستخدم آخر.');
    }
    const existing = await this.repo.findUserByUid(targetUid);
    if (!existing && targetUid !== caller.uid) {
      throw new ServiceError(404, 'المستخدم غير موجود.');
    }
    await this.repo.deleteAllUserData(targetUid, existing?.email || (targetUid === caller.uid ? caller.email : null));
  }
}
