/**
 * وحدة المطابقة الدلالية الذكية للأعمدة ومنع تكرار الحقول
 * Smart Semantic Column Matcher & Deduplication Engine
 *
 * يضمن هذا المحرك عدم إنشاء أي أعمدة مكررة إذا كانت الحقول موجودة في البرنامج،
 * حتى لو اختلفت التسمية قليلاً في الورقة المستخرجة بالذكاء الاصطناعي
 * (مثل: "اسم الطلاب" vs "اسم التلاميذ"، "الشعبة" vs "الفصل"، "الدرجة" vs "العلامة").
 */

export interface SemanticMatchResult {
  isMatched: boolean;
  matchedType: 'name' | 'section' | 'grade_level' | 'written' | 'notes' | 'serial' | 'custom' | 'none';
  matchedExistingId?: string;
  matchedExistingName?: string;
  explanation: string;
}

/**
 * تنظيف وتوحيد النصوص العربية للمقارنة الدقيقة
 */
export function normalizeArabicForComparison(str: string): string {
  if (!str) return '';
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
    .replace(/[\(\)\[\]\{\}:،,\.\-_/\\0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * قائمة مرادفات حقل "اسم الطالب" في الكشوفات المدرسية
 */
const STUDENT_NAME_SYNONYMS = [
  'اسم الطالب',
  'اسم الطلاب',
  'اسم التلميذ',
  'اسم التلاميذ',
  'اسماء الطلاب',
  'اسماء التلاميذ',
  'اسماء الطلبه',
  'اسم الطلبه',
  'الاسم',
  'الاسم الكامل',
  'الاسم الثلاثي',
  'اسم الطالب الثلاثي',
  'اسم التلميذ الثلاثي',
  'الاسم واللقب',
  'اسم التلميذه',
  'اسماء التلميذات',
  'اسم الطالبه',
  'اسماء الطالبات',
  'اسم الدارس',
  'اسم المشترك',
  'اسم المرشح',
  'التلميذ',
  'الطالب',
  'الطلبه',
  'التلاميذ',
  'student name',
  'student',
  'name',
];

/**
 * قائمة مرادفات حقل "الشعبة" في الكشوفات المدرسية
 */
const SECTION_SYNONYMS = [
  'الشعبة',
  'الشعبه',
  'الشعب',
  'شعبة',
  'شعبه',
  'الفصل',
  'فصل',
  'الصف',
  'صف',
  'القاعة',
  'القاعه',
  'قاعة',
  'قاعه',
  'الفرقة',
  'الفرقه',
  'فرقة',
  'فرقه',
  'الفوج',
  'section',
  'class',
  'division',
];

/**
 * قائمة مرادفات حقل "المرحلة / الصف الدراسي"
 */
const GRADE_LEVEL_SYNONYMS = [
  'الصف',
  'المرحلة',
  'المرحله',
  'المرحلة الدراسية',
  'المرحله الدراسيه',
  'الصف الدراسي',
  'المستوى',
  'المستوى الدراسي',
  'السنة الدراسية',
  'السنه الدراسيه',
  'grade',
  'level',
  'grade level',
];

/**
 * قائمة مرادفات حقل "الدرجة / الامتحان التحريري / الدرجات"
 */
const SCORE_GRADE_SYNONYMS = [
  'الدرجة',
  'الدرجه',
  'درجة',
  'درجه',
  'الدرجات',
  'درجات',
  'العلامة',
  'العلامه',
  'علامة',
  'علامه',
  'العلامات',
  'علامات',
  'المجموع',
  'مجموع',
  'النتيجة',
  'النتيجه',
  'نتيجة',
  'نتيجه',
  'السعي',
  'سعي',
  'درجة السعي',
  'درجة الشهر',
  'درجه الشهر',
  'الشهر الاول',
  'الشهر الثاني',
  'درجة الامتحان',
  'درجه الامتحان',
  'الامتحان',
  'امتحان',
  'الاختبار',
  'اختبار',
  'علامة الاختبار',
  'التحريري',
  'تحريري',
  'الامتحان التحريري',
  'الدرجة التحريري',
  'الدرجه التحريري',
  'الدرجة الورقية',
  'الدرجه الورقيه',
  'الورقي',
  'ورقي',
  'الكتابي',
  'كتابي',
  'الدرجة النهائية',
  'الدرجه النهائيه',
  'المعدل',
  'معدل',
  'score',
  'grade',
  'mark',
  'total',
];

/**
 * قائمة حقول التسلسل والأرقام (التي لا يجوز إنشاؤها كأعمدة)
 */
const SERIAL_SYNONYMS = [
  'ت',
  'تـ',
  'التسلسل',
  'تسلسل',
  'م',
  'رقم',
  'الرقم',
  'الرقم التسلسلي',
  'العدد',
  'عدد',
  'تسلسل الطالب',
  'رقم الطالب',
  'no',
  'num',
  'seq',
  '#',
];

/**
 * قائمة مرادفات حقل "الملاحظات"
 */
const NOTES_SYNONYMS = [
  'ملاحظات',
  'ملاحظة',
  'ملاحظه',
  'الملاحظات',
  'الملاحظة',
  'البيان',
  'بيان',
  'الحالة',
  'الحاله',
  'الغياب',
  'notes',
  'remarks',
];

/**
 * فحص ما إذا كان اسم العمود يمثل حقل "اسم الطالب" بمختلف مرادفاته
 */
export function isStudentNameField(name: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicForComparison(name);
  if (STUDENT_NAME_SYNONYMS.some((syn) => clean === normalizeArabicForComparison(syn))) {
    return true;
  }
  // فحص الاحتواء إذا كان الاسم يبدأ بـ "اسم" ويحتوي طالب/تلميذ/دارس
  if (clean.includes('اسم') && (clean.includes('طالب') || clean.includes('تلميذ') || clean.includes('طلبه') || clean.includes('تلاميذ'))) {
    return true;
  }
  return false;
}

/**
 * فحص ما إذا كان اسم العمود يمثل حقل "الشعبة" بمختلف مرادفاته
 */
export function isSectionField(name: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicForComparison(name);
  if (SECTION_SYNONYMS.some((syn) => clean === normalizeArabicForComparison(syn))) {
    return true;
  }
  return clean === 'شعبة' || clean === 'شعبه' || clean === 'الشعبة' || clean === 'الشعبه' || clean === 'فصل' || clean === 'الفصل';
}

/**
 * فحص ما إذا كان اسم العمود يمثل حقل "الصف أو المرحلة"
 */
export function isGradeLevelField(name: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicForComparison(name);
  return GRADE_LEVEL_SYNONYMS.some((syn) => clean === normalizeArabicForComparison(syn));
}

/**
 * فحص ما إذا كان اسم العمود يمثل حقل "الدرجة الأساسية / التحريري / المجموع"
 */
export function isScoreOrGradeField(name: string, type?: string): boolean {
  if (type === 'written') return true;
  if (!name) return false;
  const clean = normalizeArabicForComparison(name);

  // استبعاد صريح إذا كان شفهي أو نشاط أو واجبات أو سلوك
  if (
    clean.includes('شفه') ||
    clean.includes('شفو') ||
    clean.includes('نشاط') ||
    clean.includes('يومي') ||
    clean.includes('واجب') ||
    clean.includes('دفتر') ||
    clean.includes('سلوك') ||
    clean.includes('مواظب') ||
    clean.includes('حضور')
  ) {
    return false;
  }

  return SCORE_GRADE_SYNONYMS.some((syn) => clean === normalizeArabicForComparison(syn)) ||
    clean.includes('تحرير') ||
    clean.includes('كتابي') ||
    clean.includes('ورق') ||
    clean.includes('سعي') ||
    clean === 'درجه' ||
    clean === 'الدرجه' ||
    clean === 'الدرجات' ||
    clean === 'العلامه' ||
    clean === 'المجموع';
}

/**
 * فحص ما إذا كان العمود يمثل التسلسل (ت / رقم)
 */
export function isSerialField(name: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicForComparison(name);
  return SERIAL_SYNONYMS.some((syn) => clean === normalizeArabicForComparison(syn));
}

/**
 * فحص ما إذا كان العمود يمثل الملاحظات
 */
export function isNotesField(name: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicForComparison(name);
  return NOTES_SYNONYMS.some((syn) => clean === normalizeArabicForComparison(syn));
}

/**
 * فحص ما إذا كان العمود يطابق أي حقل أساسي قياسي موجود في جدول الطلاب
 * (اسم الطالب، الشعبة، الصف، الدرجة التحريري، التسلسل، الملاحظات)
 */
export function isCoreTableField(name: string, type?: string): boolean {
  return (
    isStudentNameField(name) ||
    isSectionField(name) ||
    isGradeLevelField(name) ||
    isScoreOrGradeField(name, type) ||
    isSerialField(name) ||
    isNotesField(name)
  );
}

/**
 * مقارنة اسم حقل مخصص مع الأعمدة المخصصة الحالية للتحقق من تطابق المعنى
 * (مثلاً: إذا كان في البرنامج عمود "الشفهي" والورقة فيها "شفهي" أو "شفوي" أو "الامتحان الشفهي")
 */
export function matchWithCustomColumns(
  name: string,
  existingCustomColumns: Array<{ id: string; name: string }> = []
): { matchedCol: { id: string; name: string } | null; explanation: string } {
  if (!name || existingCustomColumns.length === 0) {
    return { matchedCol: null, explanation: '' };
  }

  const cleanName = normalizeArabicForComparison(name);
  const strippedName = cleanName.replace(/^ال/, '');

  for (const col of existingCustomColumns) {
    const cleanCol = normalizeArabicForComparison(col.name);
    const strippedCol = cleanCol.replace(/^ال/, '');

    // 1. تطابق مباشر بعد التنظيف
    if (cleanName === cleanCol || strippedName === strippedCol) {
      return {
        matchedCol: col,
        explanation: `مطابقة تامة مع العمود الحالي "${col.name}"`,
      };
    }

    // 2. مطابقة مرادفات الشفهي والشفوي
    const isOral1 = cleanName.includes('شفه') || cleanName.includes('شفو');
    const isOral2 = cleanCol.includes('شفه') || cleanCol.includes('شفو');
    if (isOral1 && isOral2) {
      return {
        matchedCol: col,
        explanation: `تم دمج "${name}" مع الحقل القائم "${col.name}" (كلاهما درجات شفهية)`,
      };
    }

    // 3. مطابقة مرادفات النشاط واليومي والمشاركة
    const isActivity1 = cleanName.includes('نشاط') || cleanName.includes('يومي') || cleanName.includes('مشارك');
    const isActivity2 = cleanCol.includes('نشاط') || cleanCol.includes('يومي') || cleanCol.includes('مشارك');
    if (isActivity1 && isActivity2) {
      return {
        matchedCol: col,
        explanation: `تم دمج "${name}" مع الحقل القائم "${col.name}" (كلاهما درجات نشاط ويومي)`,
      };
    }

    // 4. مطابقة مرادفات الواجبات والدفتر
    const isHw1 = cleanName.includes('واجب') || cleanName.includes('دفتر');
    const isHw2 = cleanCol.includes('واجب') || cleanCol.includes('دفتر');
    if (isHw1 && isHw2) {
      return {
        matchedCol: col,
        explanation: `تم دمج "${name}" مع الحقل القائم "${col.name}" (كلاهما واجبات ودفتر)`,
      };
    }

    // 5. مطابقة مرادفات المواظبة والسلوك والغياب
    const isAtt1 = cleanName.includes('مواظب') || cleanName.includes('حضور') || cleanName.includes('سلوك') || cleanName.includes('غياب');
    const isAtt2 = cleanCol.includes('مواظب') || cleanCol.includes('حضور') || cleanCol.includes('سلوك') || cleanCol.includes('غياب');
    if (isAtt1 && isAtt2) {
      return {
        matchedCol: col,
        explanation: `تم دمج "${name}" مع الحقل القائم "${col.name}" (كلاهما مواظبة وسلوك)`,
      };
    }

    // 6. تطابق جزئي دلالي (أحد الاسمين يحتوي الآخر)
    if (
      (cleanName.length >= 4 && cleanCol.includes(cleanName)) ||
      (cleanCol.length >= 4 && cleanName.includes(cleanCol))
    ) {
      return {
        matchedCol: col,
        explanation: `تم دمج "${name}" مع الحقل القائم "${col.name}" للتقارب الدلالي`,
      };
    }
  }

  return { matchedCol: null, explanation: '' };
}

/**
 * المحلل الشامل للأعمدة المستخرجة:
 * يحدد ما إذا كان الحقل في الورقة يطابق حقلاً موجوداً في البرنامج (حقل أساسي أو مخصص)،
 * أو أنه حقل جديد فعلاً يستحق الإنشاء.
 */
export function resolveColumnSemantics(
  columnName: string,
  columnType?: string,
  existingCustomColumns: Array<{ id: string; name: string }> = []
): SemanticMatchResult {
  const name = (columnName || '').trim();

  // 1. فحص حقل اسم الطالب / الطلاب / التلاميذ
  if (isStudentNameField(name)) {
    return {
      isMatched: true,
      matchedType: 'name',
      explanation: `تم التعرف على أن "${name}" يرادف حقل "اسم الطالب" الأساسي بالبرنامج، ولن يتم إنشاء عمود مكرر.`,
    };
  }

  // 2. فحص حقل الشعبة / الفصل
  if (isSectionField(name)) {
    return {
      isMatched: true,
      matchedType: 'section',
      explanation: `تم التعرف على أن "${name}" يرادف حقل "الشعبة" الأساسي بالبرنامج، ولن يتم إنشاء عمود مكرر.`,
    };
  }

  // 3. فحص حقل الصف / المرحلة
  if (isGradeLevelField(name)) {
    return {
      isMatched: true,
      matchedType: 'grade_level',
      explanation: `تم التعرف على أن "${name}" يرادف حقل "الصف" بالبرنامج.`,
    };
  }

  // 4. فحص حقل التسلسل والأرقام
  if (isSerialField(name)) {
    return {
      isMatched: true,
      matchedType: 'serial',
      explanation: `حقل التسلسل "${name}" معتمد في ترقيم الأسطر ولن ينشأ كعمود مستقل.`,
    };
  }

  // 5. فحص حقل الدرجة / الامتحان التحريري / الدرجات
  if (isScoreOrGradeField(name, columnType)) {
    return {
      isMatched: true,
      matchedType: 'written',
      explanation: `تم التعرف على أن "${name}" يرادف حقل "الامتحان التحريري / الدرجة" بالبرنامج، ولن يتم إنشاء عمود مكرر.`,
    };
  }

  // 6. فحص حقل الملاحظات
  if (isNotesField(name)) {
    return {
      isMatched: true,
      matchedType: 'notes',
      explanation: `حقل الملاحظات "${name}" يوضع في خانة الملاحظات بالسجل.`,
    };
  }

  // 7. فحص التطابق مع أي من الأعمدة المخصصة الحالية للمعلم
  const customMatch = matchWithCustomColumns(name, existingCustomColumns);
  if (customMatch.matchedCol) {
    return {
      isMatched: true,
      matchedType: 'custom',
      matchedExistingId: customMatch.matchedCol.id,
      matchedExistingName: customMatch.matchedCol.name,
      explanation: customMatch.explanation,
    };
  }

  // 8. لم يطابق أي حقل موجود => هذا حقل جديد حقيقي وموجود في الصورة فقط!
  return {
    isMatched: false,
    matchedType: 'none',
    explanation: `حقل جديد تم استخراجه من الورقة ("${name}") لعدم وجود حقل يطابقه أو يعطي معناه في البرنامج.`,
  };
}
