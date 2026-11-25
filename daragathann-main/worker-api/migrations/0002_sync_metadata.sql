-- Migration 0002: Offline-first Delta Sync Metadata, Versioning, and Tombstones

ALTER TABLE teacher_profiles ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE monthly_models ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE custom_columns ADD COLUMN updated_at TEXT DEFAULT NULL;
ALTER TABLE custom_columns ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE students ADD COLUMN updated_at TEXT DEFAULT NULL;
ALTER TABLE students ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE student_monthly_records ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE terms ADD COLUMN updated_at TEXT DEFAULT NULL;
ALTER TABLE terms ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS sync_tombstones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_uid TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_tombstones_user_deleted
  ON sync_tombstones(user_uid, deleted_at);

CREATE INDEX IF NOT EXISTS idx_monthly_models_user_updated
  ON monthly_models(user_uid, updated_at);

CREATE INDEX IF NOT EXISTS idx_students_user_updated
  ON students(user_uid, updated_at);

CREATE INDEX IF NOT EXISTS idx_records_updated
  ON student_monthly_records(updated_at);

CREATE INDEX IF NOT EXISTS idx_terms_user_updated
  ON terms(user_uid, updated_at);
