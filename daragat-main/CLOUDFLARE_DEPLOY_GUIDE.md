# دليل تشغيل ورفع المشروع على Cloudflare (Pages + D1 SQLite)

---

## ⚡ طبيعة المشروع التقنية (100% TypeScript - بدون أي ملف PHP)
- **لغة المشروع:** **TypeScript / React** بالكامل.
- **ملفات الـ Backend / API:** موجودة في مجلد `functions/api/data.ts` ومكتوبة بلغة **TypeScript** وتعمل مباشرة على **Cloudflare Edge Workers**.
- **قاعدة البيانات:** **SQLite / Cloudflare D1** (قاعدة بيانات سحابية فائقة السرعة مبنية على محرك SQLite).
- **لا وجود لأي ملف PHP على الإطلاق!** المشروع يعمل بصيغة Modern Serverless على بنية Cloudflare العالمية.

---

## 🚀 خطوات النشر على Cloudflare خطوة بخطوة:

### الخطوة 1: إنشاء وتجهيز قاعدة بيانات SQLite (Cloudflare D1)
1. سجّل الدخول إلى لوحة تحكم [Cloudflare Dashboard](https://dash.cloudflare.com).
2. من القائمة الجانبية، اذهب إلى: **Storage & Databases** ⬅️ **D1 SQL Database**.
3. اضغط على **Create Database** (إنشاء قاعدة بيانات):
   - اختر اسماً لها، مثلاً: `gradebook-d1`.
   - اضغط **Create**.
4. بعد إنشاء قاعدة البيانات، اضغط عليها ثم اختر تبويب **Console** (أو تبويب Explore & SQL Console):
   - افتح الملف الموجود في مشروعك: `database/schema_sqlite.sql`.
   - انسخ محتواه بالكامل والصقه في الـ Console واضغط **Execute**.
   - سيتم إنشاء الجداول الثمانية المتوافقة مع SQLite فوراً!

---

### الخطوة 2: رفع المشروع عبر Cloudflare Pages (مجانياً)

#### الطريقة الأولى (الأسهل عبر GitHub / GitLab):
1. ارفع كود المشروع إلى مستودع في حسابك على **GitHub**.
2. في لوحة Cloudflare، اذهب إلى: **Compute (Workers & Pages)** ⬅️ **Pages**.
3. اضغط على **Create application** ⬅️ **Connect to Git**.
4. اختر المستودع الخاص بمشروعك واضبط إعدادات البناء كالتالي:
   - **Framework preset:** `Vite` (أو None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Deploy command:** اتركه **فارغاً (Empty)** — لا تكتب فيه `npx wrangler deploy` إطلاقاً (لأن Cloudflare Pages ينشر مجلد `dist` تلقائياً بمجرد انتهاء البناء).
5. اضغط **Save and Deploy**.

#### الخطوة 3: ربط قاعدة بيانات D1 بالموقع على Cloudflare
1. بعد اكتمال البناء، اذهب إلى صفحة مشروعك في Cloudflare Pages.
2. ادخل إلى تبويب **Settings (الإعدادات)** ⬅️ **Functions**.
3. انزل إلى قسم **D1 Database Bindings** واضغط **Add binding**:
   - **Variable name:** اكتب بالحروف الكبيرة: `DB`
   - **D1 database:** اختر قاعدة البيانات التي أنشأتها: `gradebook-d1`
4. اضغط **Save**.
5. قم بعمل **Retry deployment** أو ارفع تحديثاً جديداً لتفعيل الربط.

---

#### الخطوة 4: تفعيل الذكاء الاصطناعي (Gemini Vision) لمسح خط اليد
لكي تعمل ميزة استخراج أسماء وصفوف الطلاب من الورق المكتوب بخط اليد بالذكاء الاصطناعي:
1. احصل على مفتاح Gemini API المجاني الخاص بك بضغطة زر من: [Google AI Studio](https://aistudio.google.com/app/apikey).
   - **تنبيه هام:** اضغط على **Create API key** ثم اختر **Create API key in new project** (مشروع جديد) حتى يعمل على الخطة المجانية الدائمة (Free Tier) بدون أي طلب رصيد مسبق الدفع (Prepayment Credits).
2. في لوحة تحكم Cloudflare، اذهب إلى مشروعك في **Pages** (مثلاً `daragat`).
3. ادخل إلى تبويب **Settings (الإعدادات)** ⬅️ ثم اضغط على **Environment variables (متغيرات البيئة)**.
4. اضغط على **Add variable**:
   - **Variable name:** `GEMINI_API_KEYD` (المفتاح الأساسي)
   - **Value:** الصق مفتاحك الخاص من Google AI Studio (يبدأ بـ `AQ...` في النظام الحديث لـ Google، أو `AIza...` في النظام السابق).
5. اضغط **Save (حفظ)**.
6. **(اختياري وموصى به جداً) إضافة مفتاح احتياطي ثانٍ للتبديل التلقائي عند الضغط:**
   - اضغط على **Add variable** مرة أخرى:
   - **Variable name:** `GEMINI_API_KEYA` (المفتاح الاحتياطي الثاني)
   - **Value:** الصق مفتاح Gemini إضافي آخر (من مشروع ثانٍ في Google AI Studio).
   - **النتيجة:** عندما يواجه المفتاح الأول أي ضغط (Rate Limit 429) أو مشكلة، سينتقل النظام فوراً وتلقائياً للمفتاح الثاني `GEMINI_API_KEYA` بدون أي توقف!
   *(ملاحظة: النظام يدعم أيضاً الأسماء السابقة GEMINI_APK_KEYd و API_KEY_GEMINIA للتوافق التام).*
7. اذهب إلى تبويب **Deployments** واضغط على آخر نشر ثم اختر **Retry deployment** (أو ارفع commit جديد).
8. ستعمل ميزة قراءة الخط اليدوي فوراً لجميع المعلمين مجاناً وبلا أي قيود!

---

### 💻 الطريقة الثانية (عبر سطر الأوامر Wrangler CLI):
إذا كنت تفضل استخدام سطر الأوامر مباشرة:
```bash
# 1. تثبيت الحزم والبناء
npm install
npm run build

# 2. إنشاء قاعدة بيانات D1
npx wrangler d1 create gradebook-d1

# 3. استيراد المخطط لقاعدة البيانات
npx wrangler d1 execute gradebook-d1 --file=database/schema_sqlite.sql

# 4. نشر المشروع على Cloudflare Pages
npx wrangler pages deploy dist --project-name=teacher-gradebook
```

---

## 📁 هيكلية الملفات في مكانها الصحيح لـ Cloudflare:
```
├── database/
│   └── schema_sqlite.sql       <-- ملف استيراد SQLite / Cloudflare D1
├── functions/
│   └── api/
│       └── data.ts             <-- كود الـ Backend في Cloudflare بلغة TypeScript
├── src/                        <-- كود واجهة المستخدم React + TypeScript
├── public/                     <-- الأصول الثابتة
├── wrangler.toml               <-- ملف إعدادات Cloudflare وربط D1
├── package.json
└── vite.config.ts
```

موقعك الآن جاهز 100% للعمل على Cloudflare عالمياً مع قاعدة بيانات SQLite فائقة الاستجابة!


---

## 🔐 إعدادات الأمان المطلوبة (مهم)

### متغيرات Cloudflare Pages (Settings → Variables and Secrets)
| الاسم | النوع | الوصف |
|---|---|---|
| `GEMINI_APK_KEYd` | **Secret** | مفتاح Gemini. يُقرأ من السيرفر فقط ولا يُدخل من واجهة الموقع |
| `ADMIN_EMAILS` | Text (اختياري) | إيميلات المشرفين مفصولة بفاصلة. الافتراضي `asmaomar5566@gmail.com` |
| `FIREBASE_PROJECT_ID` | Text (اختياري) | فقط إذا اختلف مشروع Firebase في الإنتاج عن `firebase-applet-config.json` |

### Firebase Console
1. Authentication → Sign-in method: فعّل **Google** و**Email/Password** (تسجيل الدخول بالبريد أصبح عبر Firebase).
2. Authentication → Settings → Authorized domains: اترك نطاق موقعك فقط.
3. Google Cloud Console → APIs & Services → Credentials: قيّد **Browser API key** بـ HTTP referrers (نطاق موقعك) وبواجهات Identity Toolkit وToken Service فقط.
4. (موصى به) فعّل Firebase App Check.

### قاعدة البيانات
نفّذ `database/schema_sqlite.sql` على D1 إن كانت قاعدتك قديمة (كل العبارات `IF NOT EXISTS`، والدوال تُنشئ جدولي `users` و`rate_limits` تلقائياً عند الحاجة).

### حل تنبيه GitHub بخصوص مفتاح واجهة برمجة تطبيقات جوجل (Secret Scanning Alert):
إذا ظهر لك تنبيه من GitHub: *"تم اكتشاف سر المراجعة في firebase-applet-config.json"*
1. **السبب:** يقوم روبوت GitHub تلقائياً بالتحذير من أي نص يبدأ بـ `AIza...` معتقداً أنه سر خاص بالسيرفر، بينما مفتاح `apiKey` في Firebase Web App مخصص للواجهة الأمامية للمتصفح.
2. **الحل الاحترافي بنقل المتغيرات إلى Cloudflare:**
   - في Cloudflare Pages > Settings > Environment variables، أضف المتغيرات:
     - `VITE_FIREBASE_API_KEY`: مفتاحك الخاص.
     - `VITE_FIREBASE_AUTH_DOMAIN`: نطاق مشروعك على فايربيس.
     - `VITE_FIREBASE_PROJECT_ID`: معرف المشروع.
     - `VITE_FIREBASE_STORAGE_BUCKET`: مساحة التخزين.
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`: معرف الإرسال.
     - `VITE_FIREBASE_APP_ID`: معرف التطبيق.
   - كود `src/lib/firebase.ts` يقرأ هذه المتغيرات فوراً من Cloudflare تلقائياً.
3. **تقييد المفتاح في Google Cloud (أهم خطوة):**
   - ادخل إلى [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
   - اضغط على المفتاح ثم من **Application restrictions** اختر **Websites** وضع رابط موقعك (مثل `https://*.pages.dev/*` ونطاقك المخصص).
4. **إغلاق التنبيه على GitHub:**
   - اضغط على **Close alert** في صفحة التنبيه على GitHub واختر **False positive** (إنذار خاطئ - لأن المفتاح مخصص لعميل الويب ومقيد بالنطاق).

### التجربة المحلية
`npm run dev` يشغّل الواجهة فقط. لتجربة الـ API محلياً: `npm run build && npx wrangler pages dev dist`.

### بعد النشر: ترويسة CSP
الملف `public/_headers` يحتوي `Content-Security-Policy-Report-Only`. افتح الموقع وراقب Console لأي مخالفات، وإن لم توجد غيّر الاسم إلى `Content-Security-Policy` ليصبح مُلزِماً.
