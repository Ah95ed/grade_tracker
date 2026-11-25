-- ==============================================================================
-- نظام دفتر الدرجات الإلكتروني للمعلمين (Teacher Gradebook Database)
-- مخطط قاعدة بيانات SQLite / Cloudflare D1 (Native Serverless SQLite)
-- متوافق 100% مع Cloudflare Pages & Cloudflare Workers & D1 Database
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. جدول المستخدمين (Users)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT DEFAULT NULL,
    user_role TEXT DEFAULT 'teacher',
    institution_type TEXT NOT NULL DEFAULT 'school',
    is_admin INTEGER NOT NULL DEFAULT 0,
    subscription_type TEXT NOT NULL DEFAULT 'monthly', -- 'trial', 'monthly', 'yearly', 'lifetime'
    subscription_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired'
    expires_at TEXT DEFAULT NULL,
    last_active_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- 2. جدول الملف التعريفي للمعلم / الأستاذ (Teacher Profile)
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uid TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    school_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    governorate TEXT,
    institution_type TEXT DEFAULT 'school',
    university_name TEXT,
    college_name TEXT,
    department_name TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- 3. جدول النماذج الشهرية (Monthly Models)
CREATE TABLE IF NOT EXISTS monthly_models (
    id TEXT PRIMARY KEY NOT NULL,
    user_uid TEXT NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    total_max_score INTEGER NOT NULL DEFAULT 100,
    written_weight INTEGER DEFAULT NULL,
    written_max_score INTEGER NOT NULL DEFAULT 100,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- 4. جدول الأعمدة المخصصة للنماذج الشهرية (Custom Columns: شفهي، نشاط، سلوك، واجبات)
CREATE TABLE IF NOT EXISTS custom_columns (
    id TEXT PRIMARY KEY NOT NULL,
    model_id TEXT NOT NULL,
    name TEXT NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 10,
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (model_id) REFERENCES monthly_models(id) ON DELETE CASCADE
);

-- 5. جدول الطلاب (Students)
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY NOT NULL,
    user_uid TEXT NOT NULL,
    name TEXT NOT NULL,
    grade_level TEXT NOT NULL DEFAULT 'الأول متوسط',
    section TEXT NOT NULL DEFAULT 'أ',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- 6. جدول سجلات ودرجات الطلاب الشهرية (Student Monthly Scores)
CREATE TABLE IF NOT EXISTS student_monthly_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    written_raw_score REAL DEFAULT NULL,
    scores TEXT DEFAULT '{}', -- JSON text for custom columns
    notes TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE (student_id, model_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES monthly_models(id) ON DELETE CASCADE
);

-- 7. جدول الفصول الدراسية (Terms)
CREATE TABLE IF NOT EXISTS terms (
    id TEXT PRIMARY KEY NOT NULL,
    user_uid TEXT NOT NULL,
    name TEXT NOT NULL,
    calculation_mode TEXT NOT NULL DEFAULT 'average',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- 8. جدول ربط الفصول بالنماذج الشهرية المعتمدة (Term Selected Models)
CREATE TABLE IF NOT EXISTS term_selected_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    UNIQUE (term_id, model_id),
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES monthly_models(id) ON DELETE CASCADE
);

-- فهارس تسريع الاستعلامات (Indexes)
CREATE INDEX IF NOT EXISTS idx_monthly_models_user ON monthly_models(user_uid);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_uid);
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section);
CREATE INDEX IF NOT EXISTS idx_records_student ON student_monthly_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_model ON student_monthly_records(model_id);
CREATE INDEX IF NOT EXISTS idx_custom_columns_model ON custom_columns(model_id);
CREATE INDEX IF NOT EXISTS idx_terms_user ON terms(user_uid);


-- 10. الحسابات الملغاة (يديرها المشرف)
CREATE TABLE IF NOT EXISTS cancelled_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    reason TEXT DEFAULT 'ملغي من الإدارة',
    cancelled_at TEXT DEFAULT (datetime('now'))
);

-- 11. تحديد المعدل (Rate limiting) لدالة الاستخراج بالذكاء الاصطناعي
CREATE TABLE IF NOT EXISTS rate_limits (
    k TEXT NOT NULL,
    w INTEGER NOT NULL,
    c INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (k, w)
);
