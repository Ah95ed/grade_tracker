export const TABLES = {
  USERS: 'users',
  TEACHER_PROFILES: 'teacher_profiles',
  MONTHLY_MODELS: 'monthly_models',
  CUSTOM_COLUMNS: 'custom_columns',
  STUDENTS: 'students',
  STUDENT_MONTHLY_RECORDS: 'student_monthly_records',
  TERMS: 'terms',
  TERM_SELECTED_MODELS: 'term_selected_models',
  CANCELLED_ACCOUNTS: 'cancelled_accounts',
  USED_TRIALS: 'used_trials',
  EMAIL_VERIFICATIONS: 'email_verifications',
  RATE_LIMITS: 'rate_limits',
  SYNC_TOMBSTONES: 'sync_tombstones',
} as const;

export const SYNC_ENTITY_TYPES = [
  'monthly_model',
  'custom_column',
  'student',
  'student_monthly_record',
  'term',
  'teacher_profile',
] as const;

export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const API_ENDPOINTS = {
  HEALTH: '/api/v1/health',
  USERS: '/api/v1/users',
  PROFILE: '/api/v1/profile',
  MODELS: '/api/v1/models',
  STUDENTS: '/api/v1/students',
  RECORDS: '/api/v1/records',
  TERMS: '/api/v1/terms',
  SYNC: '/api/v1/sync',
  DATA_SNAPSHOT: '/api/v1/data',
} as const;
