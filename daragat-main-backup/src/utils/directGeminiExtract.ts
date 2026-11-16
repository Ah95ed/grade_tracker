// Direct client-side Gemini extraction utility
// Provides a 100% reliable fallback when backend serverless routes return HTML or are unconfigured

import { isWrittenScoreColumn } from './gradeCalculations';
import { cleanSingleSpaces } from './arabicNameMatcher';
import {
  resolveColumnSemantics,
  isCoreTableField,
  isStudentNameField,
  isSectionField,
  isScoreOrGradeField,
  isSerialField,
  isNotesField,
  normalizeArabicForComparison,
} from './columnSemanticMatcher';
import { normalizeGradeLevel, normalizeSection } from './gradeAndSectionMatcher';

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

export interface ColumnMappingItem {
  originalDocumentLabel: string;
  mappedTarget: string;
  isNewColumn: boolean;
  explanation: string;
}

export interface DirectExtractionResult {
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

export async function extractStudentsDirectly(options: {
  apiKey: string;
  images: Array<{ mimeType: string; data: string }>;
  defaultGrade?: string;
  defaultSection?: string;
  availableColumns?: AvailableColumnInfo[];
}): Promise<DirectExtractionResult> {
  const { apiKey, images, defaultGrade = 'الأول متوسط', defaultSection = 'أ', availableColumns = [] } = options;

  const cleanKey = apiKey.trim().replace(/^["'\s]+|["'\s]+$/g, '');
  if (!cleanKey) {
    throw new Error('يرجى توفير مفتاح Gemini API صالح');
  }

  const parts: any[] = images.map((img) => ({
    inline_data: {
      mime_type: img.mimeType || 'image/jpeg',
      data: img.data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''),
    },
  }));

  const customCols = availableColumns.filter((c) => c.type !== 'written');
  const colsDescription = `
الأعمدة المعرفة في جدول المعلم داخل النظام للمطابقة الدقيقة:
1. خانة "الامتحان التحريري" (حقل: writtenRawScore): مخصص لدرجة الامتحان التحريري أو الورقي أو درجة الشهر أو الاختبار.
${
  customCols.length > 0
    ? `2. الأعمدة الإضافية المسجلة حالياً في جدول المعلم:\n` +
      customCols
        .map((c) => `   - "${c.name}" (المعرف: ${c.id}، الدرجة العظمى: ${c.maxScore || 'غير محدد'})`)
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

  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  let geminiRes: Response | null = null;
  let lastErrText = '';

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': cleanKey,
            'User-Agent': 'aistudio-build',
          },
          body: JSON.stringify(requestPayload),
        }
      );

      if (res.ok) {
        geminiRes = res;
        break;
      }

      lastErrText = await res.text().catch(() => '');
      if (res.status === 401 || lastErrText.includes('401') || lastErrText.includes('UNAUTHENTICATED')) {
        throw new Error('مفتاح Gemini API المدخل غير صالح (رمز 401). يرجى التأكد من نسخه بشكل صحيح من Google AI Studio.');
      }
      if (res.status === 402 || lastErrText.includes('prepayment') || lastErrText.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('مفتاح Gemini الحالي نفد رصيد الفوترة الخاص به. يرجى إنشاء مفتاح مجاني في مشروع جديد (Create API key in new project).');
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('غير صالح') || e.message.includes('نفد رصيد الفوترة'))) throw e;
      lastErrText = e.message || '';
    }
  }

  if (!geminiRes) {
    throw new Error(`فشل الاتصال بـ Gemini API: ${lastErrText.slice(0, 160)}`);
  }

  const geminiData = (await geminiRes.json()) as any;
  const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const finishReason = geminiData.candidates?.[0]?.finishReason;

  let parsed = safeParseOrRepairJson(textOutput);
  if (!parsed && finishReason === 'MAX_TOKENS') {
    console.warn('Gemini direct response hit MAX_TOKENS limit');
  }

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

  if (parsed && Array.isArray(parsed.detectedColumns)) {
    for (const col of parsed.detectedColumns) {
      if (!col || !col.name) continue;
      const colName = String(col.name).trim();
      const colType = String(col.type || 'other').trim();

      const sem = resolveColumnSemantics(colName, colType, customCols);
      if (sem.isMatched) {
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

          const sem = resolveColumnSemantics(colName, colType, customCols);

          if (sem.matchedType === 'written') {
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

      if (availableColumns.length > 0) {
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

  const detectedColumns = Array.from(detectedColsMap.values()).filter((c) => {
    if (!c || !c.name) return false;
    const sem = resolveColumnSemantics(c.name, c.type, customCols);
    return !sem.isMatched;
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
