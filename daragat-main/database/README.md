# دليل قاعدة بيانات SQL لنظام دفتر الدرجات الإلكتروني للمعلمين
## Teacher Gradebook - SQL Database Deployment Guide

تم إعداد وتجهيز بنية قاعدة البيانات العلائقية (Relational SQL Database) بالكامل لتطابق متطلبات وميزات هذا التطبيق بدقة 100%.

---

### محتويات المجلد:
1. `schema_postgresql.sql`: ملف إنشاء الجداول والمفاتيح والفهارس لمحركات **PostgreSQL** (مثل Supabase, Neon, Cloud SQL, Render, Railway, VPS).
2. `schema_mysql.sql`: ملف إنشاء الجداول لمحركات **MySQL / MariaDB** (مثل cPanel, phpMyAdmin, Hostinger, Namecheap).

---

### الجداول المُنشأة والعلاقات:
1. **`users`**: جدول المستخدمين والمعلمين وتخزين معرف المعرف الفريد `uid`.
2. **`teacher_profiles`**: الملف الشخصي للمعلم (اسم المعلم، اسم المدرسة، المادة، السنة الدراسية، المحافظة).
3. **`monthly_models`**: النماذج الشهرية (الشهر الأول، الشهر الثاني... مع الوزن التحريري والدرجة القصوى).
4. **`custom_columns`**: الأعمدة المرنة لكل نموذج (الشفهي، النشاط، الواجبات، السلوك...).
5. **`students`**: سجل الطلاب مع شُعبهم ومراحلهم الدراسية مرتبطين بحساب المعلم.
6. **`student_monthly_records`**: درجات الطلاب التفصيلية لكل نموذج شهري مع الدرجة التحريرية ودرجات الأعمدة المخصصة بتنسيق JSON.
7. **`terms`**: الفصول الدراسية (الفصل الأول، الثاني، السعي السنوي) وطريقة الاحتساب (معدل / فردي).
8. **`term_selected_models`**: جدول الربط المتعدد بين الفصول والنماذج الشهرية المحتسبة فيها.

---

### طريقة الاستيراد على الاستضافة الخارجية:

#### 1. استضافة cPanel / phpMyAdmin (MySQL):
1. افتح لوحة تحكم cPanel.
2. توجه إلى **MySQL Databases** وأنشئ قاعدة بيانات جديدة ومستخدماً لها.
3. افتح **phpMyAdmin**.
4. اختر قاعدة البيانات التي أنشأتها من القائمة الجانبية.
5. اضغط على تبويب **استيراد (Import)** ثم اختر ملف `database/schema_mysql.sql` واضغط **Go**.

#### 2. استضافة سحابية (Supabase / Neon / PostgreSQL):
1. ادخل إلى لوحة التحكم (SQL Editor).
2. افتح ملف `database/schema_postgresql.sql` وانسخ محتواه بالكامل.
3. الصق الاستعلامات في المحرر واضغط **Run**.

---

### المتغيرات البيئية المطلوبة لتشغيل التطبيق على استضافتك:
```env
PORT=3000
NODE_ENV=production

# إعدادات الاتصال بقاعدة بيانات PostgreSQL
SQL_HOST=localhost
SQL_DB_NAME=gradebook_db
SQL_USER=db_user
SQL_PASSWORD=your_secure_password
SQL_ADMIN_USER=db_admin
SQL_ADMIN_PASSWORD=your_admin_password
```
