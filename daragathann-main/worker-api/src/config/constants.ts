export const SUBSCRIPTION_TYPES = ['trial', 'monthly', 'yearly', 'lifetime'] as const;
export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[number];

export const SUBSCRIPTION_STATUSES = ['active', 'pending', 'expired', 'cancelled', 'suspended'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const USER_ROLES = ['teacher', 'admin_school'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const INSTITUTION_TYPES = ['school', 'university'] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export const TRIAL_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours (3 days)
export const MONTHLY_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const YEARLY_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 365 days

export const LIMITS = {
  MAX_BODY_BYTES: 8 * 1024 * 1024,
  MAX_MODELS: 200,
  MAX_COLUMNS: 50,
  MAX_STUDENTS_PER_REQUEST: 1000,
  MAX_RECORDS_PER_REQUEST: 2000,
  MAX_TERMS: 100,
  BATCH_CHUNK: 40,
  DEFAULT_PAGE_LIMIT: 100,
  MAX_PAGE_LIMIT: 500,
} as const;

export const JWT_CONSTANTS = {
  JWKS_URL: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  JWKS_TTL_MS: 60 * 60 * 1000,
  CLOCK_SKEW_SECONDS: 300,
} as const;
