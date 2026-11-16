import { GoogleGenAI, Type } from '@google/genai';
import { isWrittenScoreColumn } from '../utils/gradeCalculations';
import { cleanSingleSpaces } from '../utils/arabicNameMatcher';
import {
  resolveColumnSemantics,
  isCoreTableField,
  isStudentNameField,
  isSectionField,
  isScoreOrGradeField,
  isSerialField,
  isNotesField,
  normalizeArabicForComparison,
} from '../utils/columnSemanticMatcher';
import { normalizeGradeLevel, normalizeSection } from '../utils/gradeAndSectionMatcher';

export interface AvailableColumnInfo {
  id: string;
  name: string;
  type: 'written' | 'custom';
  maxScore?: number;
}

export interface DetectedScoreItem {
  columnName: string;
  type: string;
  score: number | null;
}

export interface ExtractedStudent {
  name: string;
  gradeLevel: string;
  section: string;
  writtenRawScore: number | null;
  scores: Record<string, number | null>;
  detectedScores: DetectedScoreItem[];
  isAbsent?: boolean;
  notes?: string;
}

export interface DetectedColumn {
  name: string;
  type: string;
}

export interface ExtractRequestPayload {
  images: Array<{
    mimeType: string;
    data: string; // base64 string
  }>;
  defaultGrade?: string;
  defaultSection?: string;
  availableColumns?: AvailableColumnInfo[];
  apiKey?: string;
}

export interface ColumnMappingItem {
  originalDocumentLabel: string;
  mappedTarget: string;
  isNewColumn: boolean;
  explanation: string;
}

export interface ExtractionResult {
  detectedGrade?: string;
  detectedSection?: string;
  students: ExtractedStudent[];
  detectedColumns: DetectedColumn[];
  columnMappings?: ColumnMappingItem[];
}

function normalizeArabicText(str: string): string {
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .trim();
}

function safeParseOrRepairJson(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt repair for truncated JSON response
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

export async function extractStudentsFromImages(
  payload: ExtractRequestPayload
): Promise<ExtractionResult> {
  const { images, defaultGrade = 'الأول متوسط', defaultSection = 'أ', availableColumns = [], apiKey: clientApiKey } = payload;

  if (!images || images.length === 0) {
    throw new Error('لم يتم إرسال أي صورة للمعالجة');
  }

  // Prioritize explicitly provided key from client, then server primary key (GEMINI_API_KEYD), then fallback key (GEMINI_API_KEYA)
  const primaryKey = (
    (clientApiKey || '').trim() ||
    process.env.GEMINI_API_KEYD ||
    process.env.GEMINI_APK_KEYd ||
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEYd ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  )
    .trim()
    .replace(/^["'\s]+|["'\s]+$/g, '');

  const fallbackKey = (
    process.env.GEMINI_API_KEYA ||
    process.env.API_KEY_GEMINIA ||
    process.env.GEMINI_API_KEY_A ||
    process.env.GEMINI_API_KEY_2 ||
    ''
  )
    .trim()
    .replace(/^["'\s]+|["'\s]+$/g, '');

  const apiKeys: string[] = [];
  if (primaryKey) apiKeys.push(primaryKey);
  if (fallbackKey && !apiKeys.includes(fallbackKey)) apiKeys.push(fallbackKey);

  if (apiKeys.length === 0) {
    const err: any = new Error('مفتاح Gemini API غير متوفر. يرجى التأكد من ضبط GEMINI_API_KEYD أو GEMINI_API_KEYA.');
    err.isAuthError = true;
    err.status = 401;
    throw err;
  }

  const parts: any[] = images.map((img) => ({
    inlineData: {
      mimeType: img.mimeType || 'image/jpeg',
      data: img.data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''),
    },
  }));

  const customCols = availableColumns.filter((c: any) => c.type !== 'written');
  const colsDescription = `
الأعمدة المعرفة في جدول المعلم داخل النظام للمطابقة الدقيقة:
1. خانة "الامتحان التحريري" (حقل: writtenRawScore): مخصص لدرجة الامتحان التحريري أو الورقي أو درجة الشهر أو الاختبار.
${
  customCols.length > 0
    ? `2. الأعمدة الإضافية المسجلة حالياً في جدول المعلم:\n` +
      customCols
        .map((c: any) => `   - "${c.name}" (المعرف: ${c.id}، الدرجة العظمى: ${c.maxScore || 'غير محدد'})`)
        .join('\n')
    : '2. لا توجد أعمدة إضافية معرفة مسبقاً، استخرج أي أعمدة درجات أخرى موجودة في الورقة بأسمائها الأصلية.'
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
- ⚠️ قاعدة دقيقة للمسافات: يجب دائماً عند استخراج الأسماء أن يكون بين كلمات الاسم الثلاثي أو الرباعي فراغ (مسافة) واحدة فقط، مثلاً: "محمد علي" وليس "محمد  علي" بمسافات مزدوجة أو زائدة.

⚠️ التوجيه الحاسم الثالث (قاعدة المطابقة الدلالية الصارمة ومنع تكرار الأعمدة والحقول):
لديك في النظام حقول قائمة مسبقاً ومعتمدة في الجدول:
1. حقل اسم الطالب الرئيسي (حقل name في كائن الطالب):
   - يوضع فيه الاسم الكامل المستخرج من أي عمود يحمل نفس المعنى مثل: ("اسم التلاميذ"، "اسم الطلاب"، "الاسم الثلاثي"، "الاسم الكامل"، "اسم التلميذ"، "اسماء الطلاب"، "الاسم").
   - ⛔ ممنوع منعاً باتاً إنشاء عمود جديد أو إدراج ("اسم التلاميذ" أو "اسم الطلاب" أو "الاسم") في detectedColumns أو detectedScores!

2. حقل الشعبة الرئيسي (حقل section في كائن الطالب):
   - يوضع فيه رمز الشعبة المستخرج من الورقة (مثل: "أ"، "ب"، "ج") أو من عمود الشعبة ("الشعبة"، "الشعبه"، "الفصل"، "الصف"، "القاعة").
   - ⛔ ممنوع منعاً باتاً إدراج ("الشعبة" أو "الفصل" أو "القاعة") كعمود جديد في detectedColumns أو detectedScores!

3. حقل الامتحان التحريري / الدرجة الأساسية (حقل writtenRawScore في كائن الطالب):
   - مخصص لدرجة الامتحان التحريري أو الورقي أو درجة الشهر أو الاختبار الأساسي أو العلامة أو المجموع أو السعي (مثلاً إذا كان العمود معنوناً بـ: "الدرجة"، "الدرجات"، "العلامة"، "العلامات"، "المجموع"، "النتيجة"، "التحريري"، "الامتحان التحريري"، "درجة الشهر"، "سعي").
   - ⛔ ممنوع منعاً باتاً إنشاء عمود جديد لـ ("الدرجة" أو "الدرجات" أو "العلامة" أو "المجموع" أو "التحريري") أو إدراجه في detectedColumns! مكانه الحصري والوحيد هو writtenRawScore فقط.

4. حقل الملاحظات (حقل notes):
   - مخصص لبيان حالة الطالب (مثل "غائب" أو "مؤجل"). ⛔ لا تدرج "ملاحظات" أو "البيان" كعمود مستقل.

5. الأعمدة المخصصة المعرفة مسبقاً في جدول المعلم (customColumns الموضحة أدناه):
   - إذا كان بالورقة عمود يحمل نفس المعنى لعمود موجود مسبقاً في الجدول (مثلاً: الورقة فيها "شفهي" أو "شفوي" وفي الجدول عمود "الشفهي"، أو الورقة فيها "نشاط" أو "يومي" وفي الجدول عمود "النشاط"):
     * طابق اسم العمود وضع درجته في detectedScores بنفس اسم ومعرف العمود المعرف في الجدول.
     * ⛔ لا تضعه في detectedColumns كعمود جديد لأنه موجود بالفعل!

6. ⚠️ في حالة واحدة فقط يتم إدراج عمود في detectedColumns:
   - إذا وفقط إذا كان العمود موجوداً في ورقة الكشف ولا يوجد أي عمود في البرنامج يطابقه أو يحمل نفس معناه (مثلاً: عمود "تاريخ الميلاد"، أو "رقم هاتف ولي الأمر"، أو "سلوك"، عندما لا يكون أي من هذه الحقول موجوداً في النظام).

2. معالجة الحالات الخاصة:
   - حوّل الأرقام المشرقية (٠، ١، ٢، ٣، ٤، ٥، ٦، ٧، ٨، ٩) إلى أرقام قياسية (0-9).
   - ادعم الكسور والدرجات العشرية (مثل: 18.5 أو 9.5).
   - الطالب الغائب: إذا كان الطالب مسجلاً كغائب (مكتوب "غ"، "غائب"، "مؤجل") أو خانة الدرجة فارغة تماماً مع علامة غياب، اجعل الدرجة null وضع isAbsent: true واكتب "غائب" في notes.
   - لا تدرج أرقام التسلسل (مثل 1، 2، 3 في عمود "ت") ضمن الدرجات، ولا تدرج عناوين الجدول كطلاب.
${colsDescription}`;

  parts.push({ text: promptText });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      detectedGrade: {
        type: Type.STRING,
        description: 'الصف أو المرحلة الدراسية المستخرجة من ترويسة الورقة',
      },
      detectedSection: {
        type: Type.STRING,
        description: 'الشعبة المستخرجة من ترويسة الورقة (أ، ب، ج، د...)',
      },
      students: {
        type: Type.ARRAY,
        description: 'قائمة بجميع الطلاب المستخرجين من الكشف من أول اسم لآخر اسم',
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'اسم الطالب الكامل باللغة العربية',
            },
            gradeLevel: {
              type: Type.STRING,
              description: 'الصف أو المرحلة الدراسية لهذا الطالب',
            },
            section: {
              type: Type.STRING,
              description: 'الشعبة أو الفصل الدراسي لهذا الطالب',
            },
            writtenRawScore: {
              type: Type.NUMBER,
              description: 'درجة الامتحان التحريري أو الورقي أو درجة الشهر (null إن لم توجد أو كان غائباً)',
            },
            detectedScores: {
              type: Type.ARRAY,
              description: 'الدرجات الأخرى (شفهي، نشاط، يومي، واجبات، دفتر)',
              items: {
                type: Type.OBJECT,
                properties: {
                  columnName: { type: Type.STRING, description: 'اسم العمود بالعربية كما في الورقة' },
                  type: { type: Type.STRING, description: 'نوع الدرجة: oral, activity, homework, attendance, behavior, other' },
                  score: { type: Type.NUMBER, description: 'قيمة الدرجة الرقمية' },
                },
                required: ['columnName'],
              },
            },
            isAbsent: {
              type: Type.BOOLEAN,
              description: 'هل الطالب غائب في الكشف أو الامتحان',
            },
            notes: {
              type: Type.STRING,
              description: 'ملاحظات مسجلة (مثل غائب أو مؤجل)',
            },
          },
          required: ['name'],
        },
      },
      detectedColumns: {
        type: Type.ARRAY,
        description: 'قائمة أعمدة الدرجات الإضافية الموجودة بالورقة بخلاف التحريري',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'اسم العمود بالعربية' },
            type: { type: Type.STRING, description: 'نوع الدرجة: oral, activity, homework, attendance, behavior, other' },
          },
          required: ['name'],
        },
      },
    },
    required: ['students'],
  };

  let responseText = '';
  let authErrorDetected = false;
  let lastErrorMessage = '';

  // المرور على المفاتيح: في حال وجود ضغط (429/Resource Exhausted) أو مشكلة، ننتقل فوراً للمفتاح الاحتياطي
  keyLoop: for (let kIdx = 0; kIdx < apiKeys.length; kIdx++) {
    const currentKey = apiKeys[kIdx];
    const keyLabel = kIdx === 0 ? 'المفتاح الأساسي (GEMINI_API_KEYD)' : 'المفتاح الاحتياطي (GEMINI_API_KEYA)';

    const ai = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          'x-goog-api-key': currentKey,
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const tryGenerate = async (model: string) => {
      return await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.1,
          maxOutputTokens: 32768,
        },
      });
    };

    const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    for (const model of models) {
      try {
        const response = await tryGenerate(model);
        if (response.text) {
          responseText = response.text;
          if (kIdx > 0) {
            console.log(`[Dev] تم الاستخراج بنجاح باستخدام ${keyLabel}`);
          }
          break keyLoop;
        }
      } catch (err: any) {
        lastErrorMessage = err?.message || String(err);
        const isAuth =
          lastErrorMessage.includes('401') ||
          lastErrorMessage.includes('UNAUTHENTICATED') ||
          lastErrorMessage.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
          lastErrorMessage.includes('API key not valid') ||
          lastErrorMessage.includes('API_KEY_INVALID');

        const isOverloadedOrRateLimited =
          lastErrorMessage.includes('429') ||
          lastErrorMessage.includes('RESOURCE_EXHAUSTED') ||
          lastErrorMessage.includes('quota') ||
          lastErrorMessage.includes('rate limit') ||
          lastErrorMessage.includes('503') ||
          lastErrorMessage.includes('prepayment');

        if (isAuth) authErrorDetected = true;

        if ((isOverloadedOrRateLimited || isAuth) && kIdx < apiKeys.length - 1) {
          console.warn(`[Dev] ${keyLabel} واجه ضغطاً أو مشكلة (${lastErrorMessage.slice(0, 80)}). الانتقال إلى المفتاح التالي (GEMINI_API_KEYA)...`);
          break; // انتقل للمفتاح الاحتياطي
        }
      }
    }

    // تجربة REST المباشر إذا لم تنجح الحزمة على هذا المفتاح
    if (!responseText && !authErrorDetected) {
      try {
        responseText = await callGeminiDirectRest(currentKey, images, promptText);
        if (responseText) {
          break keyLoop;
        }
      } catch (restErr: any) {
        lastErrorMessage = restErr?.message || String(restErr);
      }
    }
  }

  if (authErrorDetected || (!responseText && lastErrorMessage.includes('401'))) {
    const e: any = new Error('مفتاح Gemini API غير مصرح له أو منتهي الصلاحية (رمز 401). يرجى التأكد من صلاحية المفاتيح GEMINI_API_KEYD و GEMINI_API_KEYA.');
    e.isAuthError = true;
    e.status = 401;
    throw e;
  }

  if (!responseText) {
    throw new Error(`فشلت المعالجة بالذكاء الاصطناعي: ${lastErrorMessage.slice(0, 160)}`);
  }

  let parsed: any = safeParseOrRepairJson(responseText);

  let rawList: any[] = [];
  let detectedGradeVal = normalizeGradeLevel(defaultGrade);
  let detectedSectionVal = normalizeSection(defaultSection);

  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.students)) {
      rawList = parsed.students;
    }
    if (parsed.detectedGrade && typeof parsed.detectedGrade === 'string' && parsed.detectedGrade.trim()) {
      detectedGradeVal = normalizeGradeLevel(parsed.detectedGrade.trim());
    }
    if (parsed.detectedSection && typeof parsed.detectedSection === 'string' && parsed.detectedSection.trim()) {
      detectedSectionVal = normalizeSection(parsed.detectedSection.trim());
    }
  }

  const detectedColsMap = new Map<string, { name: string; type: string }>();
  const columnMappingsMap = new Map<string, ColumnMappingItem>();

  // Process explicit detectedColumns from model
  if (parsed && Array.isArray(parsed.detectedColumns)) {
    for (const col of parsed.detectedColumns) {
      if (!col || !col.name) continue;
      const colName = String(col.name).trim();
      const colType = String(col.type || 'other').trim();

      const sem = resolveColumnSemantics(colName, colType, customCols);
      if (sem.isMatched) {
        // Matched an existing or core column => NEVER create a new column!
        if (!columnMappingsMap.has(colName)) {
          let targetLabel = 'حقل موجود بالبرنامج';
          if (sem.matchedType === 'name') targetLabel = 'اسم الطالب (حقل أساسي)';
          else if (sem.matchedType === 'section') targetLabel = 'الشعبة (حقل أساسي)';
          else if (sem.matchedType === 'grade_level') targetLabel = 'الصف (حقل أساسي)';
          else if (sem.matchedType === 'written') targetLabel = 'الامتحان التحريري / الدرجة (حقل أساسي)';
          else if (sem.matchedType === 'custom') targetLabel = `${sem.matchedExistingName} (حقل إضافي قائم)`;
          else if (sem.matchedType === 'notes') targetLabel = 'الملاحظات (حقل أساسي)';
          else if (sem.matchedType === 'serial') targetLabel = 'التسلسل (ترقيم تلقائي)';

          columnMappingsMap.set(colName, {
            originalDocumentLabel: colName,
            mappedTarget: targetLabel,
            isNewColumn: false,
            explanation: sem.explanation,
          });
        }
      } else {
        // Genuinely new column not existing in the program
        detectedColsMap.set(colName, { name: colName, type: colType });
        if (!columnMappingsMap.has(colName)) {
          columnMappingsMap.set(colName, {
            originalDocumentLabel: colName,
            mappedTarget: `حقل إضافي جديد: ${colName}`,
            isNewColumn: true,
            explanation: sem.explanation,
          });
        }
      }
    }
  }

  const students: ExtractedStudent[] = rawList
    .map((item: any) => {
      const name = cleanSingleSpaces(String(item.name || ''));
      const studentGrade = normalizeGradeLevel(String(item.gradeLevel || detectedGradeVal || defaultGrade).trim());
      const studentSection = normalizeSection(String(item.section || detectedSectionVal || defaultSection).trim());

      let writtenRawScore: number | null = null;
      if (typeof item.writtenRawScore === 'number' && !isNaN(item.writtenRawScore)) {
        writtenRawScore = item.writtenRawScore;
      } else if (typeof item.writtenRawScore === 'string' && item.writtenRawScore.trim() !== '') {
        const n = parseFloat(item.writtenRawScore);
        if (!isNaN(n)) writtenRawScore = n;
      }

      const detectedScores: DetectedScoreItem[] = [];
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

          // Evaluate semantic meaning of this column
          const sem = resolveColumnSemantics(colName, colType, customCols);

          if (sem.matchedType === 'written') {
            // Main exam score => belongs strictly in writtenRawScore
            if ((writtenRawScore === null || writtenRawScore === undefined) && sVal !== null) {
              writtenRawScore = sVal;
            }
            if (!columnMappingsMap.has(colName)) {
              columnMappingsMap.set(colName, {
                originalDocumentLabel: colName,
                mappedTarget: 'الامتحان التحريري / الدرجة (حقل أساسي)',
                isNewColumn: false,
                explanation: sem.explanation,
              });
            }
          } else if (sem.matchedType === 'name' || sem.matchedType === 'section' || sem.matchedType === 'grade_level' || sem.matchedType === 'serial' || sem.matchedType === 'notes') {
            // Core standard field, skip adding as score or custom column
            if (!columnMappingsMap.has(colName)) {
              let label = 'حقل أساسي';
              if (sem.matchedType === 'name') label = 'اسم الطالب (حقل أساسي)';
              if (sem.matchedType === 'section') label = 'الشعبة (حقل أساسي)';
              columnMappingsMap.set(colName, {
                originalDocumentLabel: colName,
                mappedTarget: label,
                isNewColumn: false,
                explanation: sem.explanation,
              });
            }
          } else if (sem.matchedType === 'custom') {
            // Matched an existing custom column in teacher's model!
            detectedScores.push({
              columnName: sem.matchedExistingName || colName,
              type: colType,
              score: sVal,
            });
            if (sem.matchedExistingId) {
              scores[sem.matchedExistingId] = sVal;
            }
            if (sem.matchedExistingName) {
              scores[sem.matchedExistingName] = sVal;
              scores[normalizeArabicText(sem.matchedExistingName)] = sVal;
            }
            scores[colName] = sVal;

            if (!columnMappingsMap.has(colName)) {
              columnMappingsMap.set(colName, {
                originalDocumentLabel: colName,
                mappedTarget: `${sem.matchedExistingName} (حقل إضافي قائم)`,
                isNewColumn: false,
                explanation: sem.explanation,
              });
            }
          } else {
            // Genuinely new column found in sheet!
            detectedScores.push({
              columnName: colName,
              type: colType,
              score: sVal,
            });
            scores[colName] = sVal;
            scores[normalizeArabicText(colName)] = sVal;

            if (!detectedColsMap.has(colName)) {
              detectedColsMap.set(colName, { name: colName, type: colType });
            }
            if (!columnMappingsMap.has(colName)) {
              columnMappingsMap.set(colName, {
                originalDocumentLabel: colName,
                mappedTarget: `حقل إضافي جديد: ${colName}`,
                isNewColumn: true,
                explanation: sem.explanation,
              });
            }
          }
        }
      }

      // Map to available custom column IDs and names if provided
      if (availableColumns && availableColumns.length > 0) {
        for (const col of availableColumns) {
          if (col.type === 'written' || isWrittenScoreColumn(col.name)) {
            if (writtenRawScore !== null) {
              scores['written'] = writtenRawScore;
            }
            continue;
          }
          const normTarget = normalizeArabicText(col.name);
          for (const [colName, val] of Object.entries(scores)) {
            const normKey = normalizeArabicText(colName);
            if (
              colName === col.id ||
              normKey === normTarget ||
              normKey.includes(normTarget) ||
              normTarget.includes(normKey)
            ) {
              scores[col.id] = val;
              scores[col.name] = val;
            }
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
    .filter((s) => s.name.length > 0 && !s.name.includes('اسم الطالب') && !s.name.includes('اسم التلميذ') && !s.name.includes('الملاحظات'));

  // Double filter detectedColumns: NEVER return any core or synonymous fields as new columns!
  const detectedColumns = Array.from(detectedColsMap.values()).filter((c) => {
    if (!c || !c.name) return false;
    const sem = resolveColumnSemantics(c.name, c.type, customCols);
    return !sem.isMatched; // ONLY keep columns that did NOT match any existing or core field
  });

  const columnMappings = Array.from(columnMappingsMap.values());

  return {
    detectedGrade: detectedGradeVal,
    detectedSection: detectedSectionVal,
    students,
    detectedColumns,
    columnMappings,
  };
}

async function callGeminiDirectRest(
  apiKey: string,
  images: Array<{ mimeType: string; data: string }>,
  promptText: string
): Promise<string> {
  const parts: any[] = images.map((img) => ({
    inline_data: {
      mime_type: img.mimeType || 'image/jpeg',
      data: img.data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''),
    },
  }));
  parts.push({ text: promptText });

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
      max_output_tokens: 32768,
    },
  };

  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
            'User-Agent': 'aistudio-build',
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const data = (await res.json()) as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      }

      const errText = await res.text().catch(() => '');
      if (
        res.status === 401 ||
        (res.status === 400 && errText.includes('API key')) ||
        errText.includes('401') ||
        errText.includes('UNAUTHENTICATED') ||
        errText.includes('API key not valid') ||
        errText.includes('API_KEY_INVALID')
      ) {
        const e: any = new Error('مفتاح Gemini API غير صالح (رمز 401). يرجى إدخال مفتاح صالح للاستمرار.');
        e.status = 401;
        e.isAuthError = true;
        throw e;
      }
      lastError = new Error(`Gemini REST error (${res.status}): ${errText}`);
    } catch (e: any) {
      if (e.isAuthError) throw e;
      lastError = e;
    }
  }

  throw lastError || new Error('فشل استدعاء Gemini REST API');
}
