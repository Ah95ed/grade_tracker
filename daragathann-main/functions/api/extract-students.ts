// Cloudflare Pages Function: POST /api/extract-students
// Edge serverless proxy for Gemini Handwritten & Printed OCR extraction with score classification

import {
  authenticate,
  checkAccountAccess,
  fail,
  isRateLimited,
  num,
  str,
  type Env,
  type EventContext,
} from '../_lib/auth';

function cleanKey(raw?: string): string {
  return (raw || '').trim().replace(/^["'\s]+|["'\s]+$/g, '');
}

function safeParseOrRepairJson(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to repair truncated JSON
  }

  try {
    const studentsIdx = cleaned.indexOf('"students"');
    if (studentsIdx !== -1) {
      const arrStart = cleaned.indexOf('[', studentsIdx);
      if (arrStart !== -1) {
        const lastObjectEnd = cleaned.lastIndexOf('}');
        if (lastObjectEnd > arrStart) {
          const repaired = cleaned.slice(0, lastObjectEnd + 1) + ']}';
          return JSON.parse(repaired);
        }
      }
    }
  } catch {
    // Repair failed
  }
  return null;
}

// المفتاح الأساسي (GEMINI_API_KEYD أو GEMINI_APK_KEYd) والمفتاح الاحتياطي (GEMINI_API_KEYA أو API_KEY_GEMINIA)
function getGeminiKeys(env: Env): string[] {
  const primary = cleanKey(
    env.GEMINI_API_KEYD ||
    env.GEMINI_APK_KEYd ||
    env.GEMINI_API_KEYd ||
    env.GEMINI_API_KEY
  );
  const fallback = cleanKey(
    env.GEMINI_API_KEYA ||
    env.API_KEY_GEMINIA ||
    env.GEMINI_API_KEY_A ||
    env.GEMINI_API_KEY_2
  );

  const keys: string[] = [];
  if (primary) keys.push(primary);
  if (fallback && !keys.includes(fallback)) keys.push(fallback);

  return keys;
}

const MAX_IMAGES = 10;
const MAX_BODY_CHARS = 14 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export interface AvailableColumnInfo {
  id: string;
  name: string;
  type: 'written' | 'custom';
  maxScore?: number;
}

function cleanArabicSpacing(str: string): string {
  if (!str) return '';
  return str.replace(/[\s\u00A0\u2000-\u200B\uFEFF]+/g, ' ').trim();
}

function normalizeArabicText(str: string): string {
  return cleanArabicSpacing(str)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .trim();
}

import {
  isStandardSystemColumn,
  isWrittenExamColumn,
  findMatchingExistingColumn,
  normalizeArabicColumnName,
} from '../_lib/columnClassifier';

function isWrittenScoreColumn(name?: string, type?: string): boolean {
  return isWrittenExamColumn(name, type);
}

export async function onRequestPost(context: EventContext): Promise<Response> {
  const { request, env } = context;

  try {
    // 1) مصادقة + حالة الاشتراك + تحديد المعدل (حماية حصة Gemini)
    const authHeader = request.headers.get('Authorization') || '';
    const trialHeader = request.headers.get('x-trial-user-uid') || '';
    const emailHeader = (request.headers.get('x-user-email') || '').trim().toLowerCase();
    const isTrial =
      trialHeader.startsWith('trial-') ||
      authHeader.startsWith('Bearer trial-') ||
      emailHeader.includes('@jok.nom');

    if (isTrial) {
      const trialUid = trialHeader || authHeader.replace(/^Bearer\s+/i, '');
      // السماح بمحاولة استخراج واحدة فقط للمستخدم التجريبي
      if (await isRateLimited(env, `extract-trial:${trialUid}`, 1, 86400 * 365)) {
        return fail(403, 'لقد استنفدت المحاولة المجانية الواحدة المتاحة للاستخراج بالذكاء الاصطناعي في النسخة التجريبية. يرجى الترقية للاشتراك الدائم للاستمرار في الاستخراج بدون حدود.', { isTrialLimitReached: true });
      }
    } else {
      const caller = await authenticate(request, env);
      if (caller instanceof Response) return caller;

      const blocked = await checkAccountAccess(env, caller, { requireActive: true });
      if (blocked) return blocked;

      if (!caller.isAdmin) {
        if (
          (await isRateLimited(env, `extract-h:${caller.uid}`, 30, 3600)) ||
          (await isRateLimited(env, `extract-d:${caller.uid}`, 100, 86400))
        ) {
          return fail(429, 'تجاوزت الحد المسموح لعمليات الاستخراج. يرجى المحاولة لاحقاً.');
        }
      }
    }

    // 2) قراءة الطلب والتحقق من المدخلات
    const rawText = await request.text();
    if (rawText.length > MAX_BODY_CHARS) return fail(413, 'حجم الصور كبير جداً.');
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      return fail(400, 'صيغة الطلب غير صحيحة.');
    }

    // 3) مفاتيح Gemini (الأساسي والاحتياطي من Cloudflare أو من الطلب)
    const clientProvidedKey = cleanKey(body?.apiKey);
    const apiKeys = getGeminiKeys(env);
    if (clientProvidedKey && !apiKeys.includes(clientProvidedKey)) {
      apiKeys.unshift(clientProvidedKey);
    }

    if (apiKeys.length === 0) {
      console.warn('Gemini API key is not configured in Cloudflare environment');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'لم يتم العثور على مفتاح Gemini في خادم Cloudflare. يرجى التأكد من إضافة GEMINI_API_KEYD والضغط على (Retry deployment) في Cloudflare Pages، أو إدخال المفتاح مباشرة في حقل المفتاح المجاني.',
          isMissingApiKey: true,
          isAuthError: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const images: Array<{ mimeType: string; data: string }> = [];
    for (const img of Array.isArray(body?.images) ? body.images.slice(0, MAX_IMAGES) : []) {
      const mime = typeof img?.mimeType === 'string' ? img.mimeType.toLowerCase() : 'image/jpeg';
      const data = typeof img?.data === 'string' ? img.data : '';
      if (!data || !ALLOWED_MIME.includes(mime)) continue;
      images.push({ mimeType: mime, data });
    }
    if (images.length === 0) return fail(400, 'لم يتم إرسال أي صورة صالحة');

    const defaultGrade = str(body?.defaultGrade, 60, 'الأول متوسط') || 'الأول متوسط';
    const defaultSection = str(body?.defaultSection, 30, 'أ') || 'أ';
    const availableColumns: AvailableColumnInfo[] = (Array.isArray(body?.availableColumns) ? body.availableColumns : [])
      .slice(0, 50)
      .map((c: any) => ({
        id: str(c?.id, 64),
        name: str(c?.name, 100),
        type: c?.type === 'written' ? 'written' : 'custom',
        maxScore: num(c?.maxScore, 0, 0, 100000),
      }));

    const parts: any[] = images.map((img) => ({
      inline_data: {
        mime_type: img.mimeType || 'image/jpeg',
        data: img.data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''),
      },
    }));

    const customCols = availableColumns.filter((c: any) => c.type !== 'written');
    const colsDescription = `
الأعمدة المعرفة في جدول المعلم داخل النظام للمطابقة الدقيقة:
1. خانة "الامتحان التحريري" (حقل: writtenRawScore): مخصص لدرجة الامتحان التحريري أو الورقي أو درجة الشهر أو الاختبار.
2. الحقول الأساسية الثابتة في البرنامج (اسم الطالب، الصف، الشعبة): هذه حقول قياسية دائمة في النظام ولا تُعتبر أعمدة درجات مخصصة أبداً.
${
  customCols.length > 0
    ? `3. الأعمدة الإضافية المسجلة حالياً في جدول المعلم:\n` +
      customCols
        .map((c: any) => `   - "${c.name}" (المعرف: ${c.id}، الدرجة العظمى: ${c.maxScore || 'غير محدد'})`)
        .join('\n')
    : '3. لا توجد أعمدة إضافية معرفة مسبقاً، استخرج أي أعمدة درجات أخرى موجودة في الورقة بأسمائها الأصلية.'
}
`;

    const promptText = `أنت مساعد خبير ومتقدم جداً وموثوق في التعرف البصري واستخراج البيانات من كشوفات وقوائم درجات الطلاب المدرسية باللغة العربية (سواء كانت مطبوعة طباعة رسمية كجداول وإكسل أو مكتوبة بخط اليد بالكامل على ورق مسطر أو دفاتر درجات).
قم بتحليل الصورة / الصور المرفقة بعناية فائقة، واستخرج جميع أسماء الطلاب، والصف الدراسي، والشعبة، وجميع الدرجات المسجلة لكل طالب مع تصنيف دقيق لنوع كل درجة وتوزيعها على أعمدة الجدول وفق القواعد الصارمة التالية:

⚠️ التوجيه الحاسم الأول (قراءة ترويسة الورقة واستخراج المرحلة/الصف والشعبة):
- اقرأ ترويسة الورقة (أعلى الصفحة) لاستخراج الصف/المرحلة الدراسية (مثل: "الأول متوسط"، "الثاني متوسط"، "الثالث متوسط"، "الرابع الإعدادي"، "الخامس علمي"، "السادس الابتدائي"، إلخ) وضعه في الحقل الرئيسي detectedGrade.
- اقرأ الشعبة من أعلى الورقة (مثل: "أ"، "ب"، "ج"، "د"، "شعبة 1"، "شعبة 2") وضعها في الحقل الرئيسي detectedSection.
- إذا لم تكن المرحلة أو الشعبة مكتوبة في الترويسة، فاستخدم القيم الافتراضية ("${defaultGrade}"، "${defaultSection}").

⚠️ التوجيه الحاسم الثاني (استخراج كافة أسماء الطلاب دون أي استثناء):
- يجب قراءة واستخراج **جميع** أسماء وصفوف ودرجات الطلاب الموجودين في الصورة أو الكشف من أول اسم في أعلى القائمة حتى آخر اسم في أسفلها سطراً بسطر.
- الكشوفات المدرسية تضم عادةً ما بين 10 إلى 50 طالباً. ممنوع منعاً باتاً التوقف بعد أول طالبين أو ثلاثة كعينة، ويجب إدراج كل طالب يظهر في الورقة كعنصر مستقل في مصفوفة students بدون أي اختصار أو حذف.
- استخرج الاسم كاملاً (الثلاثي أو الرباعي) كما هو مسجل بالورقة دون قطع.
- ⚠️ قاعدة فراغات الأسماء: يجب دائماً أن يكون بين كلمات الاسم (الثلاثي أو الرباعي) فراغ واحد فقط مسافة واحدة عادية (مثلاً: "محمد علي" وليس "محمد  علي") لتلافي أخطاء الفراغات المتعددة.

⚠️ التوجيه الحاسم الثالث (قاعدة ذهبية لمنع تكرار الحقول والأعمدة ومطابقتها بالمعنى دلالياً):
1. الحقول القياسية الأساسية في البرنامج:
   - "اسم الطالب" (يقابله في الورقة: اسم التلاميذ، اسم الطلاب، قائمة الأسماء، الاسم، الاسم الرباعي): مكانه الحصري هو الحقل "name". ممنوع منعاً باتاً إدراجه في detectedColumns أو detectedScores!
   - "الشعبة" (يقابله في الورقة: شعبة، الفصل، الصف/الشعبة، القاعة): مكانه الحصري هو الحقل "section". ممنوع إدراجه كعمود في detectedColumns أو detectedScores!
   - "الصف" (يقابله في الورقة: صف، المرحلة، المستوى): مكانه الحصري هو الحقل "gradeLevel". ممنوع إدراجه كعمود في detectedColumns أو detectedScores!
   - "الامتحان التحريري" (يقابله في الورقة: التحريري، درجة التحريري، الورقي، درجة الشهر، الامتحان، الاختبار، الدرجة، الدرجات، السعي): مكانه الحصري هو الحقل "writtenRawScore". ممنوع منعاً باتاً وضعه في detectedColumns أو detectedScores!
   - أرقام التسلسل (ت، تسلسل، م، رقم) والملاحظات والتقدير والنتيجة والمجموع: لا تُدرج إطلاقاً كأعمدة درجات!
2. المطابقة بالمعنى للأعمدة المسجلة في جدول المعلم (Semantic Matching):
   - إذا وجدت في الورقة عمود درجات يعطي نفس المعنى لأي عمود مسجل مسبقاً في جدول المعلم حتى لو اختلف المسمى قليلاً (مثلاً: في الورقة 'الواجب' أو 'الدفتر' وفي البرنامج 'الواجبات'؛ أو في الورقة 'شفوي' وفي البرنامج 'الشفهي'؛ أو في الورقة 'مشاركة' وفي البرنامج 'النشاط' أو 'يومي'):
     * طابق الدرجة فوراً مع ذلك العمود الموجود وضعها باسم/معرف ذلك العمود ولا تنشئ عموداً جديداً إطلاقاً!
     * لا تضف هذا العمود في قائمة detectedColumns لأن الحقل موجود بالفعل في البرنامج.
3. متى تُدرج عموداً في detectedColumns؟
   - فقط وفقط إذا كان عمود درجات إضافي فريد وجديد كلياً ولا يوجد في جدول المعلم أي عمود يعبر عنه أو يقاربه في المعنى.
4. معالجة الحالات الخاصة:
   - حوّل الأرقام المشرقية (٠، ١، ٢، ٣، ٤، ٥، ٦، ٧، ٨، ٩) إلى أرقام قياسية (0-9).
   - ادعم الكسور والدرجات العشرية (مثل: 18.5 أو 9.5).
   - الطالب الغائب: إذا كان الطالب مسجلاً كغائب (مكتوب "غ"، "غائب"، "مؤجل") أو خانة الدرجة فارغة تماماً مع علامة غياب، اجعل الدرجة null وضع isAbsent: true واكتب "غائب" في notes.
   - لا تدرج أرقام التسلسل (مثل 1، 2، 3 في عمود "ت") ضمن الدرجات، ولا تدرج عناوين الجدول كطلاب.
${colsDescription}`;

    parts.push({ text: promptText });

    const requestPayload = {
      contents: [{ parts }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
        max_output_tokens: 32768,
        response_schema: {
          type: 'OBJECT',
          properties: {
            detectedGrade: { type: 'STRING' },
            detectedSection: { type: 'STRING' },
            students: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  gradeLevel: { type: 'STRING' },
                  section: { type: 'STRING' },
                  writtenRawScore: { type: 'NUMBER' },
                  detectedScores: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        columnName: { type: 'STRING' },
                        type: { type: 'STRING' },
                        score: { type: 'NUMBER' },
                      },
                      required: ['columnName'],
                    },
                  },
                  isAbsent: { type: 'BOOLEAN' },
                  notes: { type: 'STRING' },
                },
                required: ['name'],
              },
            },
            detectedColumns: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  type: { type: 'STRING' },
                },
                required: ['name'],
              },
            },
          },
          required: ['students'],
        },
      },
    };

    // نماذج مجانية 100% على Free Tier: نبدأ بـ gemini-3.1-flash-lite لخفته وسرعته، ثم gemini-3.5-flash و gemini-3.8-flash
    const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

    let geminiRes: Response | null = null;
    let allErrors: string[] = [];
    let isPrepaymentDetected = false;
    let isAuthDetected = false;

    // المرور على المفاتيح: في حال وجود حمل (429/Resource Exhausted) أو مشكلة (401/402/5xx) في المفتاح الأول، يتم الانتقال فوراً للمفتاح الاحتياطي
    keyLoop: for (let kIdx = 0; kIdx < apiKeys.length; kIdx++) {
      const currentKey = apiKeys[kIdx];
      const keyLabel = kIdx === 0 ? 'المفتاح الأساسي (GEMINI_API_KEYD)' : 'المفتاح الاحتياطي (GEMINI_API_KEYA)';

      for (const model of models) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': currentKey,
              },
              body: JSON.stringify(requestPayload),
            }
          );

          if (res.ok) {
            geminiRes = res;
            if (kIdx > 0) {
              console.log(`تم بنجاح استخراج البيانات باستخدام ${keyLabel} بعد مواجهة ضغط على المفتاح الأساسي.`);
            }
            break keyLoop;
          }

          const status = res.status;
          const errText = await res.text().catch(() => '');
          allErrors.push(`[${keyLabel}][${model}][HTTP ${status}]: ${errText.slice(0, 300)}`);

          const isOverloadedOrExhausted =
            status === 429 ||
            status === 503 ||
            status === 500 ||
            status === 502 ||
            status === 504 ||
            status === 402 ||
            status === 401 ||
            errText.includes('RESOURCE_EXHAUSTED') ||
            errText.includes('prepayment') ||
            errText.includes('quota') ||
            errText.includes('rate limit');

          if (status === 402 || errText.includes('prepayment') || errText.includes('RESOURCE_EXHAUSTED')) {
            isPrepaymentDetected = true;
          }
          if (status === 401 || errText.includes('UNAUTHENTICATED') || errText.includes('API_KEY_INVALID')) {
            isAuthDetected = true;
          }

          // إذا كان المفتاح عليه ضغط أو فيه مشكلة وهناك مفتاح آخر تالٍ، ننتقل فوراً للمفتاح التالي
          if (isOverloadedOrExhausted && kIdx < apiKeys.length - 1) {
            console.warn(`[${keyLabel}] يواجه ضغطاً أو مشكلة (${status}). الانتقال التلقائي إلى المفتاح التالي (GEMINI_API_KEYA)...`);
            break; // الخروج من حلقة النماذج للمفتاح الحالي وتجربة المفتاح الاحتياطي فوراً
          }
        } catch (fetchErr: any) {
          allErrors.push(`[${keyLabel}][${model}][Network]: ${fetchErr?.message || String(fetchErr)}`);
          if (kIdx < apiKeys.length - 1) {
            console.warn(`خطأ شبكة على [${keyLabel}]. الانتقال إلى المفتاح الاحتياطي...`);
            break;
          }
        }
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      const combinedErr = allErrors.join(' | ');
      console.error('All Gemini keys/models failed:', combinedErr.slice(0, 600));

      let friendlyMsg = isAuthDetected
        ? 'مفتاح Gemini API غير صالح أو غير مصرح به. يرجى التأكد من نسخ المفتاح بشكل صحيح في متغيرات Cloudflare.'
        : isPrepaymentDetected
        ? 'مفتاح Gemini الحالي يطلب رصيداً. للاستخدام المجاني 100%: أنشئ مفتاحاً جديداً عبر (Create API key in new project) في Google AI Studio.'
        : 'تعذر إكمال الاستخراج حالياً بسبب انشغال خوادم الذكاء الاصطناعي. يرجى المحاولة بعد لحظات أو استخدام الإدخال اليدوي.';

      // نرجع status: 200 مع success: false لتفادي قيام Cloudflare باستبدال استجابة JSON بصفحة HTML 502 Bad Gateway
      return new Response(
        JSON.stringify({
          success: false,
          error: friendlyMsg,
          isAuthError: isAuthDetected,
          isPrepaymentError: isPrepaymentDetected,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const geminiData = (await geminiRes.json()) as any;
    const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const finishReason = geminiData.candidates?.[0]?.finishReason;

    let parsed = safeParseOrRepairJson(textOutput);
    if (!parsed && finishReason === 'MAX_TOKENS') {
      console.warn('Gemini response was truncated due to MAX_TOKENS');
    }

    let rawList: any[] = [];
    let detectedGradeVal = defaultGrade;
    let detectedSectionVal = defaultSection;

    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.students)) {
        rawList = parsed.students;
      }
      if (parsed.detectedGrade && typeof parsed.detectedGrade === 'string' && parsed.detectedGrade.trim()) {
        detectedGradeVal = parsed.detectedGrade.trim();
      }
      if (parsed.detectedSection && typeof parsed.detectedSection === 'string' && parsed.detectedSection.trim()) {
        detectedSectionVal = parsed.detectedSection.trim();
      }
    }

    const detectedColsMap = new Map<string, { name: string; type: string }>();

    if (parsed && Array.isArray(parsed.detectedColumns)) {
      for (const col of parsed.detectedColumns) {
        if (!col || !col.name) continue;
        // Never allow standard system columns (name, section, grade, seq, notes, total, written exam)
        if (isStandardSystemColumn(col.name, col.type)) continue;
        // If it matches an already existing custom column in the teacher's sheet, do not re-add it!
        if (findMatchingExistingColumn(col.name, customCols)) continue;
        detectedColsMap.set(col.name, { name: col.name, type: col.type || 'other' });
      }
    }

    const students = rawList
      .map((item: any) => {
        const name = cleanArabicSpacing(String(item.name || ''));
        const studentGrade = cleanArabicSpacing(String(item.gradeLevel || detectedGradeVal || defaultGrade));
        const studentSection = cleanArabicSpacing(String(item.section || detectedSectionVal || defaultSection));

        let writtenRawScore: number | null = null;
        if (typeof item.writtenRawScore === 'number' && !isNaN(item.writtenRawScore)) {
          writtenRawScore = item.writtenRawScore;
        } else if (typeof item.writtenRawScore === 'string' && item.writtenRawScore.trim() !== '') {
          const n = parseFloat(item.writtenRawScore);
          if (!isNaN(n)) writtenRawScore = n;
        }

        const detectedScores: Array<{ columnName: string; type: string; score: number | null }> = [];
        const scores: Record<string, number | null> = {};

        if (Array.isArray(item.detectedScores)) {
          for (const ds of item.detectedScores) {
            if (!ds || !ds.columnName) continue;
            const colName = String(ds.columnName).trim();
            const colType = String(ds.type || 'other').trim();

            let sVal: number | null = null;
            if (typeof ds.score === 'number' && !isNaN(ds.score)) {
              sVal = ds.score;
            } else if (typeof ds.score === 'string' && ds.score.trim() !== '') {
              const parsedNum = parseFloat(ds.score);
              if (!isNaN(parsedNum)) sVal = parsedNum;
            }

            // Check if column is any standard system column (written score, student name, section, etc.)
            if (isStandardSystemColumn(colName, colType)) {
              if (isWrittenExamColumn(colName, colType)) {
                if ((writtenRawScore === null || writtenRawScore === undefined) && sVal !== null) {
                  writtenRawScore = sVal;
                }
              }
              // Standard table columns are NEVER custom score columns!
              continue;
            }

            // Check if this column matches an existing custom column in the teacher's sheet semantically
            const matchedExisting = findMatchingExistingColumn(colName, customCols);
            if (matchedExisting) {
              scores[matchedExisting.id] = sVal;
              scores[matchedExisting.name] = sVal;
              detectedScores.push({
                columnName: matchedExisting.name,
                type: colType,
                score: sVal,
              });
              // Already exists in table, do NOT add to detectedColsMap
              continue;
            }

            // Truly new custom column
            detectedScores.push({
              columnName: colName,
              type: colType,
              score: sVal,
            });
            scores[colName] = sVal;
            scores[normalizeArabicColumnName(colName)] = sVal;

            if (!detectedColsMap.has(colName)) {
              detectedColsMap.set(colName, { name: colName, type: colType });
            }
          }
        }

        if (availableColumns && availableColumns.length > 0) {
          for (const col of availableColumns) {
            if (col.type === 'written' || isWrittenExamColumn(col.name)) {
              if (writtenRawScore !== null) {
                scores['written'] = writtenRawScore;
              }
              continue;
            }
            if (scores[col.id] !== undefined) continue;

            const matched = findMatchingExistingColumn(col.name, Object.keys(scores).map((k) => ({ id: k, name: k })));
            if (matched && scores[matched.name] !== undefined) {
              scores[col.id] = scores[matched.name];
            }
          }
        }

        return {
          name,
          gradeLevel: studentGrade,
          section: studentSection,
          writtenRawScore,
          scores,
          detectedScores,
          isAbsent: Boolean(item.isAbsent),
          notes: String(item.notes || '').trim(),
        };
      })
      .filter((s) => s.name.length > 0 && !isStandardSystemColumn(s.name) && !s.name.includes('اسم الطالب') && !s.name.includes('اسم التلميذ') && !s.name.includes('الملاحظات'));

    const detectedColumns = Array.from(detectedColsMap.values()).filter(
      (c) => c && c.name && !isStandardSystemColumn(c.name, c.type) && !findMatchingExistingColumn(c.name, customCols)
    );

    return new Response(
      JSON.stringify({
        success: true,
        students,
        detectedColumns,
        detectedGrade: detectedGradeVal,
        detectedSection: detectedSectionVal,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('extract-students failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'حدث خطأ أثناء معالجة الصور. حاول مرة أخرى.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
