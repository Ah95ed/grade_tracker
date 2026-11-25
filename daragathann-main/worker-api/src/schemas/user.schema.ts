import { z } from 'zod';
import { INSTITUTION_TYPES, SUBSCRIPTION_STATUSES, SUBSCRIPTION_TYPES, USER_ROLES } from '../config/constants';

export const registerUserSchema = z
  .object({
    displayName: z.string().trim().max(100).optional(),
    userRole: z.enum(USER_ROLES).optional(),
    institutionType: z.enum(INSTITUTION_TYPES).optional(),
  })
  .default({});

export const updateMyRoleSchema = z.object({
  userRole: z.enum(USER_ROLES),
  institutionType: z.enum(INSTITUTION_TYPES).optional(),
});

export const adminUpdateSubscriptionSchema = z
  .object({
    email: z.string().trim().email().max(320).optional(),
    subscriptionType: z.enum(SUBSCRIPTION_TYPES).optional(),
    subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES).optional(),
    userRole: z.enum(USER_ROLES).optional(),
    institutionType: z.enum(INSTITUTION_TYPES).optional(),
  })
  .refine(
    (data) =>
      data.subscriptionType !== undefined ||
      data.subscriptionStatus !== undefined ||
      data.userRole !== undefined ||
      data.institutionType !== undefined,
    { message: 'يجب تحديد حقل واحد على الأقل للتحديث.' }
  );
