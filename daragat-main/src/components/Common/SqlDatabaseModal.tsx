import React, { useState } from 'react';
import { Database, Copy, Check, Download, X, Server, Layers, Cloud, FileCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const POSTGRESQL_SCHEMA = `-- ==============================================================================
-- نظام دفتر الدرجات الإلكتروني للمعلمين (Teacher Gradebook Database)
-- مخطط قاعدة بيانات PostgreSQL المتوافق مع الاستضافات السحابية والخارجية
-- ==============================================================================

-- 1. جدول المستخدمين (Users / Authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) DEFAULT 'teacher', -- 'teacher', 'admin_school'
    institution_type VARCHAR(50) NOT NULL DEFAULT 'school', -- 'school', 'university'
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
    institution_type VARCHAR(50) DEFAULT 'school', -- 'school', 'university'
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

-- 4. جدول الأعمدة المخصصة للنماذج الشهرية (Custom Columns)
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

-- 6. جدول سجلات ودرجات الطلاب الشهرية (Student Monthly Scores)
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

-- 7. جدول الفصول الدراسية (Terms)
CREATE TABLE IF NOT EXISTS terms (
    id VARCHAR(100) PRIMARY KEY,
    user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    calculation_mode VARCHAR(50) NOT NULL DEFAULT 'average',
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

-- الفهارس لتحسين سرعة الاستعلامات والبحث
CREATE INDEX IF NOT EXISTS idx_monthly_models_user ON monthly_models(user_uid);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_uid);
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section);
CREATE INDEX IF NOT EXISTS idx_records_student ON student_monthly_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_model ON student_monthly_records(model_id);
CREATE INDEX IF NOT EXISTS idx_custom_columns_model ON custom_columns(model_id);
CREATE INDEX IF NOT EXISTS idx_terms_user ON terms(user_uid);`;

const MYSQL_SCHEMA = `-- ==============================================================================
-- نظام دفتر الدرجات الإلكتروني للمعلمين (Teacher Gradebook Database)
-- مخطط قاعدة بيانات MySQL / MariaDB (متوافق مع phpMyAdmin و cPanel والاستضافات الخارجية)
-- ترميز: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. جدول المستخدمين (Users)
CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`uid\` VARCHAR(255) NOT NULL UNIQUE,
    \`email\` VARCHAR(255) NOT NULL,
    \`user_role\` VARCHAR(50) DEFAULT 'teacher',
    \`institution_type\` VARCHAR(50) NOT NULL DEFAULT 'school',
    \`is_admin\` TINYINT(1) NOT NULL DEFAULT 0,
    \`subscription_type\` VARCHAR(50) NOT NULL DEFAULT 'monthly',
    \`subscription_status\` VARCHAR(50) NOT NULL DEFAULT 'active',
    \`expires_at\` TIMESTAMP NULL DEFAULT NULL,
    \`last_active_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. جدول الملف التعريفي للمعلم / الأستاذ (Teacher Profile)
CREATE TABLE IF NOT EXISTS \`teacher_profiles\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`user_uid\` VARCHAR(255) NOT NULL,
    \`teacher_name\` VARCHAR(255) NOT NULL,
    \`school_name\` VARCHAR(255) NOT NULL,
    \`subject\` VARCHAR(255) NOT NULL,
    \`academic_year\` VARCHAR(50) NOT NULL,
    \`governorate\` VARCHAR(100),
    \`institution_type\` VARCHAR(50) DEFAULT 'school',
    \`university_name\` VARCHAR(255),
    \`college_name\` VARCHAR(255),
    \`department_name\` VARCHAR(255),
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_profile_user\` FOREIGN KEY (\`user_uid\`) REFERENCES \`users\` (\`uid\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. جدول النماذج الشهرية (Monthly Models)
CREATE TABLE IF NOT EXISTS \`monthly_models\` (
    \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
    \`user_uid\` VARCHAR(255) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`subject\` VARCHAR(150) NOT NULL,
    \`academic_year\` VARCHAR(50) NOT NULL,
    \`total_max_score\` INT NOT NULL DEFAULT 100,
    \`written_weight\` INT DEFAULT NULL,
    \`written_max_score\` INT NOT NULL DEFAULT 100,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_model_user\` FOREIGN KEY (\`user_uid\`) REFERENCES \`users\` (\`uid\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. جدول الأعمدة المخصصة للنماذج الشهرية (Custom Columns)
CREATE TABLE IF NOT EXISTS \`custom_columns\` (
    \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
    \`model_id\` VARCHAR(100) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`max_score\` INT NOT NULL DEFAULT 10,
    \`order_index\` INT NOT NULL DEFAULT 0,
    CONSTRAINT \`fk_column_model\` FOREIGN KEY (\`model_id\`) REFERENCES \`monthly_models\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. جدول الطلاب (Students)
CREATE TABLE IF NOT EXISTS \`students\` (
    \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
    \`user_uid\` VARCHAR(255) NOT NULL,
    \`name\` VARCHAR(200) NOT NULL,
    \`grade_level\` VARCHAR(100) NOT NULL DEFAULT 'الأول متوسط',
    \`section\` VARCHAR(50) NOT NULL DEFAULT 'أ',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_student_user\` FOREIGN KEY (\`user_uid\`) REFERENCES \`users\` (\`uid\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. جدول سجلات ودرجات الطلاب الشهرية (Student Monthly Scores)
CREATE TABLE IF NOT EXISTS \`student_monthly_records\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`student_id\` VARCHAR(100) NOT NULL,
    \`model_id\` VARCHAR(100) NOT NULL,
    \`written_raw_score\` DOUBLE DEFAULT NULL,
    \`scores\` JSON DEFAULT NULL,
    \`notes\` TEXT,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY \`uk_student_model\` (\`student_id\`, \`model_id\`),
    CONSTRAINT \`fk_record_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`students\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_record_model\` FOREIGN KEY (\`model_id\`) REFERENCES \`monthly_models\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. جدول الفصول الدراسية (Terms)
CREATE TABLE IF NOT EXISTS \`terms\` (
    \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
    \`user_uid\` VARCHAR(255) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`calculation_mode\` VARCHAR(50) NOT NULL DEFAULT 'average',
    \`notes\` TEXT,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_term_user\` FOREIGN KEY (\`user_uid\`) REFERENCES \`users\` (\`uid\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. جدول ربط الفصول بالنماذج (Term Selected Models)
CREATE TABLE IF NOT EXISTS \`term_selected_models\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`term_id\` VARCHAR(100) NOT NULL,
    \`model_id\` VARCHAR(100) NOT NULL,
    \`order_index\` INT NOT NULL DEFAULT 0,
    UNIQUE KEY \`uk_term_model\` (\`term_id\`, \`model_id\`),
    CONSTRAINT \`fk_assoc_term\` FOREIGN KEY (\`term_id\`) REFERENCES \`terms\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_assoc_model\` FOREIGN KEY (\`model_id\`) REFERENCES \`monthly_models\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;`;

const SQLITE_SCHEMA = `-- ==============================================================================
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

-- 4. جدول الأعمدة المخصصة للنماذج الشهرية (Custom Columns)
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
    scores TEXT DEFAULT '{}',
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
CREATE INDEX IF NOT EXISTS idx_terms_user ON terms(user_uid);`;

export const SqlDatabaseModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [selectedEngine, setSelectedEngine] = useState<'sqlite' | 'postgres' | 'mysql'>('sqlite');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  let currentCode = SQLITE_SCHEMA;
  let fileName = 'schema_sqlite.sql';
  if (selectedEngine === 'postgres') {
    currentCode = POSTGRESQL_SCHEMA;
    fileName = 'schema_postgresql.sql';
  } else if (selectedEngine === 'mysql') {
    currentCode = MYSQL_SCHEMA;
    fileName = 'schema_mysql.sql';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 text-right">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-l from-[#2E485C] to-[#557A95] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">مخطط قاعدة بيانات SQL للمشروع</h3>
              <p className="text-xs text-slate-200">
                جاهز للتصدير والتثبيت على Cloudflare D1 (SQLite) أو أي استضافة خارجية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Tabs & Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setSelectedEngine('sqlite')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedEngine === 'sqlite'
                  ? 'bg-[#F38020] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloudflare D1 (SQLite)</span>
            </button>
            <button
              onClick={() => setSelectedEngine('postgres')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedEngine === 'postgres'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              <span>PostgreSQL / Cloud</span>
            </button>
            <button
              onClick={() => setSelectedEngine('mysql')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedEngine === 'mysql'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>MySQL / phpMyAdmin</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ كود SQL'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-1.5 bg-[#487B5D] hover:bg-[#3C684E] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل ملف ({fileName})</span>
            </button>
          </div>
        </div>

        {/* Tables Quick Summary */}
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-900 shrink-0">
          <span className="font-bold flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-emerald-700" />
            الجداول المتضمنة (8 جداول):
          </span>
          <span className="text-emerald-800">
            users • teacher_profiles • monthly_models • custom_columns • students • student_monthly_records • terms • term_selected_models
          </span>
        </div>

        {/* Code View Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed select-all" dir="ltr">
          <pre>{currentCode}</pre>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <span>
            الملفات محفوظة في مجلد: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">database/schema_sqlite.sql</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
