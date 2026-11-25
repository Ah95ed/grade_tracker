-- ==============================================================================
-- نظام دفتر الدرجات الإلكتروني للمعلمين (Teacher Gradebook Database)
-- مخطط قاعدة بيانات MySQL / MariaDB (متوافق مع phpMyAdmin و cPanel والاستضافات الخارجية)
-- ترميز: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. جدول المستخدمين (Users)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uid` VARCHAR(255) NOT NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL,
    `user_role` VARCHAR(50) DEFAULT 'teacher',
    `institution_type` VARCHAR(50) NOT NULL DEFAULT 'school',
    `is_admin` TINYINT(1) NOT NULL DEFAULT 0,
    `subscription_type` VARCHAR(50) NOT NULL DEFAULT 'monthly',
    `subscription_status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `expires_at` TIMESTAMP NULL DEFAULT NULL,
    `last_active_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. جدول الملف التعريفي للمعلم / الأستاذ (Teacher Profile)
CREATE TABLE IF NOT EXISTS `teacher_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_uid` VARCHAR(255) NOT NULL,
    `teacher_name` VARCHAR(255) NOT NULL,
    `school_name` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `academic_year` VARCHAR(50) NOT NULL,
    `governorate` VARCHAR(100),
    `institution_type` VARCHAR(50) DEFAULT 'school',
    `university_name` VARCHAR(255),
    `college_name` VARCHAR(255),
    `department_name` VARCHAR(255),
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_profile_user` FOREIGN KEY (`user_uid`) REFERENCES `users` (`uid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. جدول النماذج الشهرية (Monthly Models)
CREATE TABLE IF NOT EXISTS `monthly_models` (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `user_uid` VARCHAR(255) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `subject` VARCHAR(150) NOT NULL,
    `academic_year` VARCHAR(50) NOT NULL,
    `total_max_score` INT NOT NULL DEFAULT 100,
    `written_weight` INT DEFAULT NULL,
    `written_max_score` INT NOT NULL DEFAULT 100,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_model_user` FOREIGN KEY (`user_uid`) REFERENCES `users` (`uid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. جدول الأعمدة المخصصة للنماذج الشهرية (Custom Columns)
CREATE TABLE IF NOT EXISTS `custom_columns` (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `model_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `max_score` INT NOT NULL DEFAULT 10,
    `order_index` INT NOT NULL DEFAULT 0,
    CONSTRAINT `fk_column_model` FOREIGN KEY (`model_id`) REFERENCES `monthly_models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. جدول الطلاب (Students)
CREATE TABLE IF NOT EXISTS `students` (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `user_uid` VARCHAR(255) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `grade_level` VARCHAR(100) NOT NULL DEFAULT 'الأول متوسط',
    `section` VARCHAR(50) NOT NULL DEFAULT 'أ',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_student_user` FOREIGN KEY (`user_uid`) REFERENCES `users` (`uid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. جدول سجلات ودرجات الطلاب الشهرية (Student Monthly Scores)
CREATE TABLE IF NOT EXISTS `student_monthly_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` VARCHAR(100) NOT NULL,
    `model_id` VARCHAR(100) NOT NULL,
    `written_raw_score` DOUBLE DEFAULT NULL,
    `scores` JSON DEFAULT NULL,
    `notes` TEXT,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_student_model` (`student_id`, `model_id`),
    CONSTRAINT `fk_record_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_record_model` FOREIGN KEY (`model_id`) REFERENCES `monthly_models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. جدول الفصول الدراسية (Terms)
CREATE TABLE IF NOT EXISTS `terms` (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `user_uid` VARCHAR(255) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `calculation_mode` VARCHAR(50) NOT NULL DEFAULT 'average',
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_term_user` FOREIGN KEY (`user_uid`) REFERENCES `users` (`uid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. جدول ربط الفصول بالنماذج (Term Selected Models)
CREATE TABLE IF NOT EXISTS `term_selected_models` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `term_id` VARCHAR(100) NOT NULL,
    `model_id` VARCHAR(100) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 0,
    UNIQUE KEY `uk_term_model` (`term_id`, `model_id`),
    CONSTRAINT `fk_assoc_term` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_assoc_model` FOREIGN KEY (`model_id`) REFERENCES `monthly_models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
