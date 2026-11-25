-- Migration 0001: Core Daragat Schema (Cloudflare D1 / SQLite)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'teacher',
  institution_type TEXT NOT NULL DEFAULT 'school',
  is_admin INTEGER NOT NULL DEFAULT 0,
  subscription_type TEXT NOT NULL DEFAULT 'trial',
  subscription_status TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT DEFAULT NULL,
  last_active_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_uid TEXT NOT NULL UNIQUE,
  teacher_name TEXT NOT NULL DEFAULT '',
  school_name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  academic_year TEXT NOT NULL DEFAULT '',
  governorate TEXT DEFAULT '',
  institution_type TEXT DEFAULT 'school',
  university_name TEXT DEFAULT '',
  college_name TEXT DEFAULT '',
  department_name TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_models (
  id TEXT PRIMARY KEY NOT NULL,
  user_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  grade_level TEXT DEFAULT '',
  teacher_name TEXT DEFAULT '',
  assigned_sections TEXT DEFAULT NULL,
  academic_year TEXT NOT NULL DEFAULT '',
  total_max_score INTEGER NOT NULL DEFAULT 100,
  written_weight INTEGER DEFAULT NULL,
  written_max_score INTEGER NOT NULL DEFAULT 100,
  written_score_mode TEXT DEFAULT NULL,
  rounding_mode TEXT DEFAULT NULL,
  rounding_threshold REAL DEFAULT NULL,
  final_score_operation TEXT DEFAULT NULL,
  column_labels TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_columns (
  id TEXT PRIMARY KEY NOT NULL,
  model_id TEXT NOT NULL,
  name TEXT NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_attendance INTEGER DEFAULT 0,
  attendance_config TEXT DEFAULT NULL,
  FOREIGN KEY (model_id) REFERENCES monthly_models(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY NOT NULL,
  user_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_monthly_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  written_raw_score REAL DEFAULT NULL,
  scores TEXT DEFAULT '{}',
  notes TEXT DEFAULT '',
  participation_history TEXT DEFAULT NULL,
  attendance_records TEXT DEFAULT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (student_id, model_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (model_id) REFERENCES monthly_models(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS terms (
  id TEXT PRIMARY KEY NOT NULL,
  user_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  teacher_name TEXT DEFAULT '',
  assigned_sections TEXT DEFAULT NULL,
  calculation_mode TEXT NOT NULL DEFAULT 'average',
  notes TEXT DEFAULT '',
  rounding_mode TEXT DEFAULT NULL,
  rounding_threshold REAL DEFAULT NULL,
  source_type TEXT DEFAULT 'models',
  selected_term_ids TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS term_selected_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE (term_id, model_id),
  FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
  FOREIGN KEY (model_id) REFERENCES monthly_models(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cancelled_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  reason TEXT DEFAULT 'ملغي من الإدارة',
  cancelled_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS used_trials (
  email TEXT PRIMARY KEY,
  first_trial_at TEXT NOT NULL,
  trial_expires_at TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS email_verifications (
  email TEXT PRIMARY KEY,
  uid TEXT,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_sent_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  k TEXT NOT NULL,
  w INTEGER NOT NULL,
  c INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (k, w)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_monthly_models_user ON monthly_models(user_uid);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_uid);
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section);
CREATE INDEX IF NOT EXISTS idx_records_student ON student_monthly_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_model ON student_monthly_records(model_id);
CREATE INDEX IF NOT EXISTS idx_custom_columns_model ON custom_columns(model_id);
CREATE INDEX IF NOT EXISTS idx_terms_user ON terms(user_uid);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token_hash);
