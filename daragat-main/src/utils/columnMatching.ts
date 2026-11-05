import { isWrittenScoreColumn } from './gradeCalculations';

/**
 * Normalizes Arabic column text for comparison:
 * - Removes diacritics / tashkeel
 * - Standardizes Alef, Taa Marbuta, Yaa, Hamza
 * - Removes non-alphanumeric punctuation and extra whitespaces
 */
export function normalizeColumnText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ؤئء]/g, 'ء')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Tashkeel
    .replace(/[\(\)\[\]\{\}:،,\.\-_/\\0-9٠-٩#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Strips common Arabic prefixes (like 'ال', 'درجة', 'امتحان', 'اختبار', 'سعي', 'تقييم')
 * to reach the core semantic stem of the column name.
 */
export function stripColumnPrefixes(str: string): string {
  let text = normalizeColumnText(str);
  if (!text) return '';

  // Remove common leading words like "درجه", "امتحان", "اختبار", "سعي", "تقييم", "حقل", "عمود"
  text = text
    .replace(/^(درجه|درجات|امتحان|اختبار|سعي|تقييم|حقل|عمود)\s+/g, '')
    .trim();

  // Strip definite article 'ال' from words
  const words = text.split(' ').map((w) => (w.startsWith('ال') && w.length > 2 ? w.slice(2) : w));
  return words.join(' ').trim();
}

/**
 * Checks if a column name refers to the Student Name field (built-in system field).
 * Examples from papers:
 * - "اسم الطالب", "اسم الطلاب", "اسم التلاميذ", "اسم التلميذ"
 * - "الاسم", "الاسم الثلاثي", "الاسم الرباعي", "الاسم واللقب"
 * - "اسماء الطلاب", "اسماء التلاميذ", "الاسم الكامل", "اسماء"
 */
export function isStandardStudentNameField(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeColumnText(name);
  if (!clean) return false;

  // Exact or common matches
  if (
    clean === 'اسم' ||
    clean === 'الاسم' ||
    clean === 'اسماء' ||
    clean === 'الاسماء' ||
    clean === 'اسم الطالب' ||
    clean === 'اسم الطلاب' ||
    clean === 'اسم التلميذ' ||
    clean === 'اسم التلاميذ' ||
    clean === 'اسماء الطلاب' ||
    clean === 'اسماء التلاميذ' ||
    clean === 'الاسم الثلاثي' ||
    clean === 'الاسم الرباعي' ||
    clean === 'الاسم واللقب' ||
    clean === 'الاسم الكامل' ||
    clean === 'اسم الطالب الثلاثي' ||
    clean === 'اسم التلميذ الثلاثي' ||
    clean === 'اسم الطالب الرباعي' ||
    clean === 'اسم التلميذ الرباعي' ||
    clean === 'اسم التلميذ او الطالب' ||
    clean === 'اسماء الطلبه' ||
    clean === 'اسم الطلبه'
  ) {
    return true;
  }

  // Any column containing 'اسم' or 'اسماء' with 'طالب'/'طلاب'/'تلميذ'/'تلاميذ'/'ثلاثي'/'رباعي'
  const hasNameRoot = clean.includes('اسم') || clean.includes('اسماء');
  const hasStudentRoot =
    clean.includes('طالب') ||
    clean.includes('طلاب') ||
    clean.includes('تلميذ') ||
    clean.includes('تلاميذ') ||
    clean.includes('ثلاثي') ||
    clean.includes('رباعي') ||
    clean.includes('لقب') ||
    clean.includes('كامل');

  return hasNameRoot && hasStudentRoot;
}

/**
 * Checks if a column name refers to the Section or Grade Level field (built-in system field).
 * Examples from papers:
 * - "الشعبة", "شعبة", "الصف", "الصف والشعبة", "الصف / الشعبة"
 * - "المرحلة", "المرحلة الدراسية", "الصف الدراسي", "الفصل", "شعب"
 */
export function isStandardSectionOrGradeField(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeColumnText(name);
  if (!clean) return false;

  if (
    clean === 'شعبه' ||
    clean === 'الشعبه' ||
    clean === 'شعب' ||
    clean === 'صف' ||
    clean === 'الصف' ||
    clean === 'المرحله' ||
    clean === 'المرحله الدراسيه' ||
    clean === 'الصف الدراسي' ||
    clean === 'الصف والشعبه' ||
    clean === 'الصف او الشعبه' ||
    clean === 'الشعبه والصف' ||
    clean === 'فصل' ||
    clean === 'الفصل' ||
    clean === 'الفصل الدراسي' ||
    clean === 'الصف والفصل'
  ) {
    return true;
  }

  const hasSection = clean.includes('شعبه') || clean.includes('شعب');
  const hasGrade = clean.includes('صف') || clean.includes('مرحله') || clean.includes('فصل');

  return hasSection || (hasGrade && !clean.includes('نشاط'));
}

/**
 * Checks if a column name refers to sequence number / index (built-in system field).
 * Examples from papers:
 * - "ت", "تسلسل", "التسلسل", "م", "رقم", "الرقم", "العدد", "عدد", "ت/", "ت."
 */
export function isStandardSequenceField(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeColumnText(name);
  if (!clean) return false;

  return (
    clean === 'ت' ||
    clean === 'تسلسل' ||
    clean === 'التسلسل' ||
    clean === 'م' ||
    clean === 'رقم' ||
    clean === 'الرقم' ||
    clean === 'العدد' ||
    clean === 'عدد' ||
    clean === 'تسلسل الطالب' ||
    clean === 'رقم الطالب' ||
    clean === 'الرقم التسلسلي'
  );
}

/**
 * Checks if a column name refers to the Notes / Status / Attendance field (built-in system field).
 * Examples:
 * - "ملاحظات", "الملاحظات", "ملاحظة", "الملاحظه", "الموقف", "موقف الطالب", "الغياب", "حالة الطالب"
 */
export function isStandardNotesField(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeColumnText(name);
  if (!clean) return false;

  return (
    clean === 'ملاحظات' ||
    clean === 'الملاحظات' ||
    clean === 'ملاحظه' ||
    clean === 'الملاحظه' ||
    clean === 'الموقف' ||
    clean === 'موقف الطالب' ||
    clean === 'الغياب' ||
    clean === 'غياب' ||
    clean === 'حاله الطالب' ||
    clean === 'الحاله' ||
    clean === 'النتيجه' ||
    clean === 'نتيجه'
  );
}

/**
 * Checks if a column refers to the main written exam score / total / grade field.
 * Examples from papers:
 * - "الدرجة", "الدرجات", "درجة", "درجات", "درجة الامتحان", "التحريري", "الامتحان التحريري"
 * - "درجة الشهر", "امتحان الشهر", "السعي", "سعي الطالب", "المجموع", "مجموع الدرجات"
 */
export function isStandardWrittenOrGradeField(name?: string, type?: string): boolean {
  if (!name && !type) return false;
  if (type === 'written') return true;

  // Leverage isWrittenScoreColumn
  if (isWrittenScoreColumn(name, type)) return true;

  if (!name) return false;
  const clean = normalizeColumnText(name);

  // Additional grade / total terms that belong to the main grade column
  return (
    clean === 'درجه' ||
    clean === 'الدرجه' ||
    clean === 'درجات' ||
    clean === 'الدرجات' ||
    clean === 'درجه الامتحان' ||
    clean === 'درجه الاختبار' ||
    clean === 'درجه الطالب' ||
    clean === 'درجه الشهر' ||
    clean === 'امتحان الشهر' ||
    clean === 'درجه السعي' ||
    clean === 'سعي الطالب' ||
    clean === 'السعي' ||
    clean === 'سعي' ||
    clean === 'مجموع' ||
    clean === 'المجموع' ||
    clean === 'مجموع الدرجات' ||
    clean === 'النهائي' ||
    clean === 'الدرجه النهائيه' ||
    clean === 'المعدل' ||
    clean === 'معدل' ||
    clean === 'المحصله'
  );
}

/**
 * Checks if a column is ANY standard built-in system field
 * (Student Name, Section/Grade, Sequence, Written/Main Grade, or Notes).
 *
 * CRITICAL RULE: If this returns true, this column MUST NEVER be created as a new custom column!
 * The extracted data belongs directly in the student's existing row properties.
 */
export function isStandardBuiltInSystemField(name?: string, type?: string): boolean {
  if (!name) return false;

  return (
    isStandardStudentNameField(name) ||
    isStandardSectionOrGradeField(name) ||
    isStandardSequenceField(name) ||
    isStandardNotesField(name) ||
    isStandardWrittenOrGradeField(name, type)
  );
}

/**
 * Semantic groups for school gradebook custom columns.
 * Columns in the same group represent the same educational evaluation component.
 */
const SEMANTIC_COLUMN_GROUPS: Array<{
  groupName: string;
  keywords: string[];
}> = [
  // 1. Oral exam / الشفهي
  {
    groupName: 'oral',
    keywords: ['شفه', 'شفو', 'قراء', 'محادث', 'اصغاء', 'استماع', 'تلاو', 'حفظ', 'نطق'],
  },
  // 2. Daily activity & participation / النشاط والمشاركة
  {
    groupName: 'activity',
    keywords: ['نشاط', 'يومي', 'مشارك', 'تحضير', 'تفاعل', 'انشط', 'يوميه'],
  },
  // 3. Homework & notebooks / الواجبات والدفاتر
  {
    groupName: 'homework',
    keywords: ['واجب', 'دفتر', 'كراس', 'واجبات', 'دفاتر', 'واجب بيتي'],
  },
  // 4. Attendance & commitment / المواظبة والحضور
  {
    groupName: 'attendance',
    keywords: ['مواظب', 'حضور', 'التزام'],
  },
  // 5. Behavior & discipline / السلوك والانضباط
  {
    groupName: 'behavior',
    keywords: ['سلوك', 'انضباط', 'اخلاق'],
  },
  // 6. Practical, lab & projects / العملي والمشاريع
  {
    groupName: 'practical',
    keywords: ['عملي', 'مختبر', 'تجارب', 'مشروع', 'بحث', 'بحوث', 'تقرير'],
  },
];

/**
 * Determines whether two column names represent the same semantic column in a school gradebook.
 * e.g.:
 * - "الشفهي" vs "امتحان شفهي" or "درجة الشفهي" or "الشفوي" -> true
 * - "النشاط" vs "النشاط اليومي" or "المشاركة اليومية" or "يومي" -> true
 * - "الواجبات" vs "دفتر الواجبات" or "الدفتر" or "واجبات" -> true
 */
export function areColumnsSemanticallyEquivalent(colA: string, colB: string): boolean {
  if (!colA || !colB) return false;

  const normA = normalizeColumnText(colA);
  const normB = normalizeColumnText(colB);

  // Exact normalized match
  if (normA === normB) return true;

  // Stripped article 'ال' match
  const strippedA = normA.replace(/^ال/, '');
  const strippedB = normB.replace(/^ال/, '');
  if (strippedA === strippedB) return true;

  // Stripped prefixes match
  const coreA = stripColumnPrefixes(colA);
  const coreB = stripColumnPrefixes(colB);
  if (coreA && coreB) {
    if (coreA === coreB) return true;
    if (coreA.includes(coreB) || coreB.includes(coreA)) return true;
  }

  // Check educational semantic groups
  for (const group of SEMANTIC_COLUMN_GROUPS) {
    const aInGroup = group.keywords.some((kw) => normA.includes(kw));
    const bInGroup = group.keywords.some((kw) => normB.includes(kw));

    if (aInGroup && bInGroup) {
      return true;
    }
  }

  return false;
}

/**
 * Searches an array of existing custom columns in the teacher's model
 * to see if an incoming column from an extracted image semantically matches one of them.
 *
 * If a match is found, returns the existing column so the score can be directly
 * stored in that column without creating a duplicate!
 */
export function findMatchingExistingCustomColumn<T extends { id: string; name: string }>(
  incomingName: string,
  existingColumns: T[]
): T | null {
  if (!incomingName || !existingColumns || existingColumns.length === 0) {
    return null;
  }

  // First pass: exact or normalized match
  const normIncoming = normalizeColumnText(incomingName);
  const strippedIncoming = normIncoming.replace(/^ال/, '');

  for (const col of existingColumns) {
    const normCol = normalizeColumnText(col.name);
    const strippedCol = normCol.replace(/^ال/, '');

    if (col.name === incomingName || normCol === normIncoming || strippedCol === strippedIncoming) {
      return col;
    }
  }

  // Second pass: semantic equivalency check
  for (const col of existingColumns) {
    if (areColumnsSemanticallyEquivalent(incomingName, col.name)) {
      return col;
    }
  }

  return null;
}
