# ملاحظات الأمان (نسخة معدّلة)

## ما تغيّر
- **functions/_lib/auth.ts**: التحقق الحقيقي من Firebase ID Token (توقيع RS256 + aud/iss/exp)، بلا أي سرّ في الكود.
- **functions/api/data.ts**: المصادقة إلزامية، الهوية من التوكن فقط، كل الكتابات تتحقق من ملكية السجلات، حدود للمدخلات، أخطاء عامة.
- **functions/api/users.ts**: المستخدم العادي يرى ويسجّل نفسه فقط؛ القائمة والتعديل والحذف للأدمن فقط؛ لا يمكن للعميل تحديد isAdmin أو الاشتراك.
- **functions/api/extract-students.ts**: يتطلب تسجيل دخول واشتراكاً فعّالاً، تحديد معدل، المفتاح من `GEMINI_APK_KEYd` فقط، لا تسريب لأخطاء Gemini.
- **الواجهة**: تسجيل الدخول بالبريد عبر Firebase Auth (حُذف تخزين كلمات المرور محلياً)، حُذف حقل مفتاح Gemini وملف الاستدعاء المباشر.
- حُذف: معالجات dev، session HMAC، firebase-admin، express/pg/drizzle، ملفات `.dev_*.json`.
- `public/_headers`: ترويسات أمان + CSP (Report-Only).

## ما يجب فعله بعد النشر
راجع قسم "إعدادات الأمان المطلوبة" في CLOUDFLARE_DEPLOY_GUIDE.md.
