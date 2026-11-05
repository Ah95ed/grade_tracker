-- ==============================================================================
-- نظام دفتر الدرجات الإلكتروني للمعلمين (Teacher Gradebook Database)
-- مخطط قاعدة بيانات PostgreSQL المتوافق مع الاستضافات السحابية والخارجية
-- ==============================================================================

-- 1. جدول المستخدمين (Users / Authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) DEFAULT 'teacher',
    institution_type VARCHAR(50) NOT NULL DEFAULT 'school',
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    subscription_type VARCHAR(50) NOT NULL DEFAULT 'monthly', -- 'trial', 'monthly', 'yearly', 'lifetime'
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'expired'
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. جدول الملف التعريفي للمعلم / الأستاذ (Teacher Profile)
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id SERIAL PRIMARY KEY,
    user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    teacher_name VARCHAR(255) NOT NULL,
    school_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    governorate VARCHAR(100),
    institution_type VARCHAR(50) DEFAULT 'school',
    university_name VARCHAR(255),
    college_name VARCHAR(255),
    department_name VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. جدول النماذج الشهرية (Monthly Models)
CREATE TABLE IF NOT EXISTS monthly_models (
    id VARCHAR(100) PRIMARY KEY,
    user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    total_max_score INTEGER NOT NULL DEFAULT 100,
    written_weight INTEGER, -- النسبة المئوية للامتحان التحريري (null يعني 100%)
    written_max_score INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. جدول الأعمدة المخصصة للنماذج الشهرية (Custom Columns: شفهي، نشاط، سلوك، واجبات...)
CREATE TABLE IF NOT EXISTS custom_columns (
    id VARCHAR(100) PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL REFERENCES monthly_models(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 10,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- 5. جدول الطلاب (Students)
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(100) PRIMARY KEY,
    user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    grade_level VARCHAR(100) NOT NULL DEFAULT 'الأول متوسط',
    section VARCHAR(50) NOT NULL DEFAULT 'أ',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. جدول سجلات ودرجات الطلاب الشهرية (Student Monthly Scores & Records)
CREATE TABLE IF NOT EXISTS student_monthly_records (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    model_id VARCHAR(100) NOT NULL REFERENCES monthly_models(id) ON DELETE CASCADE,
    written_raw_score DOUBLE PRECISION,
    scores JSONB DEFAULT '{}'::jsonb,
    notes TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT student_model_unique UNIQUE (student_id, model_id)
);

-- 7. جدول الفصول الدراسية (Terms / Semesters)
CREATE TABLE IF NOT EXISTS terms (
    id VARCHAR(100) PRIMARY KEY,
    user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    calculation_mode VARCHAR(50) NOT NULL DEFAULT 'average', -- 'average' أو 'single' أو 'sum'
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. جدول ربط الفصول الدراسية بالنماذج الشهرية المعتمدة (Term Selected Models)
CREATE TABLE IF NOT EXISTS term_selected_models (
    id SERIAL PRIMARY KEY,
    term_id VARCHAR(100) NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    model_id VARCHAR(100) NOT NULL REFERENCES monthly_models(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT term_model_unique UNIQUE (term_id, model_id)
);

-- الفهارس لتحسين سرعة الاستعلامات والبحث (Indexes for performance)
CREATE INDEX IF NOT EXISTS idx_monthly_models_user ON monthly_models(user_uid);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_uid);
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section);
CREATE INDEX IF NOT EXISTS idx_records_student ON student_monthly_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_model ON student_monthly_records(model_id);
CREATE INDEX IF NOT EXISTS idx_custom_columns_model ON custom_columns(model_id);
CREATE INDEX IF NOT EXISTS idx_terms_user ON terms(user_uid);
