-- Migration 0003: Automatic Versioning, Timestamp, Trial Preservation, and Tombstone Triggers

CREATE TRIGGER IF NOT EXISTS trg_users_preserve_trial_before_delete
BEFORE DELETE ON users
WHEN OLD.is_admin = 0 AND TRIM(COALESCE(OLD.email, '')) != ''
BEGIN
  INSERT OR IGNORE INTO used_trials (email, first_trial_at, trial_expires_at)
  VALUES (
    LOWER(TRIM(OLD.email)),
    COALESCE(OLD.created_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CASE
      WHEN OLD.subscription_type = 'trial' AND OLD.expires_at IS NOT NULL THEN OLD.expires_at
      ELSE datetime(COALESCE(OLD.created_at, 'now'), '+72 hours')
    END
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_teacher_profiles_after_update
AFTER UPDATE ON teacher_profiles
WHEN NEW.version = OLD.version
BEGIN
  UPDATE teacher_profiles
  SET version = COALESCE(OLD.version, 1) + 1,
      updated_at = COALESCE(NULLIF(NEW.updated_at, OLD.updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_monthly_models_after_update
AFTER UPDATE ON monthly_models
WHEN NEW.version = OLD.version
BEGIN
  UPDATE monthly_models
  SET version = COALESCE(OLD.version, 1) + 1,
      updated_at = COALESCE(NULLIF(NEW.updated_at, OLD.updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_custom_columns_after_update
AFTER UPDATE ON custom_columns
WHEN NEW.version = OLD.version
BEGIN
  UPDATE custom_columns
  SET version = COALESCE(OLD.version, 1) + 1,
      updated_at = COALESCE(NULLIF(NEW.updated_at, OLD.updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_students_after_update
AFTER UPDATE ON students
WHEN NEW.version = OLD.version
BEGIN
  UPDATE students
  SET version = COALESCE(OLD.version, 1) + 1,
      updated_at = COALESCE(NULLIF(NEW.updated_at, OLD.updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_records_after_update
AFTER UPDATE ON student_monthly_records
WHEN NEW.version = OLD.version
BEGIN
  UPDATE student_monthly_records
  SET version = COALESCE(OLD.version, 1) + 1,
      updated_at = COALESCE(NULLIF(NEW.updated_at, OLD.updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_terms_after_update
AFTER UPDATE ON terms
WHEN NEW.version = OLD.version
BEGIN
  UPDATE terms
  SET version = COALESCE(OLD.version, 1) + 1,
      updated_at = COALESCE(NULLIF(NEW.updated_at, OLD.updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_monthly_models_tombstone_delete
AFTER DELETE ON monthly_models
BEGIN
  INSERT INTO sync_tombstones (user_uid, entity_type, entity_id, deleted_at)
  VALUES (OLD.user_uid, 'monthly_model', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER IF NOT EXISTS trg_students_tombstone_delete
AFTER DELETE ON students
BEGIN
  INSERT INTO sync_tombstones (user_uid, entity_type, entity_id, deleted_at)
  VALUES (OLD.user_uid, 'student', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER IF NOT EXISTS trg_terms_tombstone_delete
AFTER DELETE ON terms
BEGIN
  INSERT INTO sync_tombstones (user_uid, entity_type, entity_id, deleted_at)
  VALUES (OLD.user_uid, 'term', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER IF NOT EXISTS trg_custom_columns_tombstone_delete
BEFORE DELETE ON custom_columns
BEGIN
  INSERT INTO sync_tombstones (user_uid, entity_type, entity_id, deleted_at)
  SELECT m.user_uid, 'custom_column', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  FROM monthly_models m
  WHERE m.id = OLD.model_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_records_tombstone_delete
BEFORE DELETE ON student_monthly_records
BEGIN
  INSERT INTO sync_tombstones (user_uid, entity_type, entity_id, deleted_at)
  SELECT COALESCE(
    (SELECT user_uid FROM students WHERE id = OLD.student_id LIMIT 1),
    (SELECT user_uid FROM monthly_models WHERE id = OLD.model_id LIMIT 1)
  ), 'student_monthly_record', OLD.student_id || ':' || OLD.model_id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE EXISTS (SELECT 1 FROM students WHERE id = OLD.student_id)
     OR EXISTS (SELECT 1 FROM monthly_models WHERE id = OLD.model_id);
END;
