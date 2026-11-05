/**
 * Column Classification & Semantic Matcher for Cloudflare Edge
 */

export function normalizeArabicColumnName(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\(\)\[\]\{\}:،,\.\-_/\\0-9#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function extractColumnSemanticRoot(str: string): string {
  let norm = normalizeArabicColumnName(str);
  if (!norm) return '';

  const prefixes = [
    'درجه التحريري',
    'درجه الورقه',
    'درجه الامتحان',
    'درجه الاختبار',
    'درجه السعي',
    'درجه الشهر',
    'درجه',
    'الدرجه',
    'درجات',
    'الدرجات',
    'حقل',
    'عمود',
    'خانه',
    'كشف',
    'قائمه',
  ];

  for (const p of prefixes) {
    if (norm.startsWith(p + ' ')) {
      norm = norm.slice(p.length).trim();
    }
  }

  const words = norm
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.startsWith('ال') && w.length > 3 ? w.slice(2) : w));

  return words.join(' ').trim();
}

export function isStudentNameColumn(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicColumnName(name);
  const root = extractColumnSemanticRoot(name);

  if (
    clean === 'الاسم' ||
    clean === 'اسم' ||
    clean === 'اسماء' ||
    clean === 'الاسماء' ||
    clean === 'اسم الطالب' ||
    clean === 'اسم التلميذ' ||
    clean === 'اسم الطلاب' ||
    clean === 'اسم التلاميذ' ||
    clean === 'اسماء الطلاب' ||
    clean === 'اسماء التلاميذ' ||
    clean === 'قائمه الاسماء' ||
    clean === 'اسم الدارس' ||
    clean === 'الدارس' ||
    clean === 'الدارسون' ||
    clean === 'الطالب' ||
    clean === 'الطلاب' ||
    clean === 'التلميذ' ||
    clean === 'التلاميذ' ||
    clean === 'student name' ||
    clean === 'name'
  ) {
    return true;
  }

  if (
    (clean.includes('اسم') || clean.includes('اسماء')) &&
    (clean.includes('طالب') ||
      clean.includes('تلميذ') ||
      clean.includes('دارس') ||
      clean.includes('رباعي') ||
      clean.includes('ثلاثي') ||
      clean.includes('كامل') ||
      clean.includes('شخص') ||
      clean.includes('طفل'))
  ) {
    return true;
  }

  if (root === 'اسم' || root === 'طالب' || root === 'تلميذ' || root === 'اسم طالب' || root === 'اسم تلميذ') {
    return true;
  }

  return false;
}

export function isSectionColumn(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicColumnName(name);
  const root = extractColumnSemanticRoot(name);

  if (
    clean === 'الشعبه' ||
    clean === 'شعبه' ||
    clean === 'الشعبة' ||
    clean === 'شعبة' ||
    clean === 'الفصل' ||
    clean === 'فصل' ||
    clean === 'القاعه' ||
    clean === 'قاعه' ||
    clean === 'الفرقه' ||
    clean === 'فرقه' ||
    clean === 'المجموعه' ||
    clean === 'مجموعه' ||
    clean === 'section' ||
    clean === 'class'
  ) {
    return true;
  }

  if (clean.includes('شعبه') || clean.includes('شعبة')) {
    return true;
  }

  if (root === 'شعبه' || root === 'فصل' || root === 'قاعه') {
    return true;
  }

  return false;
}

export function isGradeLevelColumn(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicColumnName(name);
  const root = extractColumnSemanticRoot(name);

  if (
    clean === 'الصف' ||
    clean === 'صف' ||
    clean === 'المرحله' ||
    clean === 'مرحله' ||
    clean === 'المرحله الدراسيه' ||
    clean === 'مرحله دراسيه' ||
    clean === 'الصف الدراسي' ||
    clean === 'صف دراسي' ||
    clean === 'المستوى' ||
    clean === 'مستوى' ||
    clean === 'السنه الدراسيه' ||
    clean === 'السنه' ||
    clean === 'grade' ||
    clean === 'level'
  ) {
    return true;
  }

  if (root === 'صف' || root === 'مرحله' || root === 'مستوى') {
    return true;
  }

  return false;
}

export function isSequenceColumn(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicColumnName(name);

  return (
    clean === 'ت' ||
    clean === 'تسلسل' ||
    clean === 'التسلسل' ||
    clean === 'رقم' ||
    clean === 'الرقم' ||
    clean === 'م' ||
    clean === 'مسلسل' ||
    clean === 'المسلسل' ||
    clean === 'العدد' ||
    clean === 'عدد' ||
    clean === 'seq' ||
    clean === 'no' ||
    clean === 'id'
  );
}

export function isNotesOrStatusColumn(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicColumnName(name);

  return (
    clean === 'ملاحظات' ||
    clean === 'الملاحظات' ||
    clean === 'ملاحظه' ||
    clean === 'الملاحظه' ||
    clean === 'الغياب' ||
    clean === 'غياب' ||
    clean === 'الموقف' ||
    clean === 'حاله الطالب' ||
    clean === 'الحاله' ||
    clean === 'notes' ||
    clean === 'status'
  );
}

export function isFinalTotalOrRatingColumn(name?: string): boolean {
  if (!name) return false;
  const clean = normalizeArabicColumnName(name);

  return (
    clean === 'المجموع' ||
    clean === 'مجموع' ||
    clean === 'المجموع النهائي' ||
    clean === 'مجموع نهائي' ||
    clean === 'الدرجه النهائيه' ||
    clean === 'درجه نهائيه' ||
    clean === 'الدرجه الكليه' ||
    clean === 'درجه كليه' ||
    clean === 'المعدل' ||
    clean === 'معدل' ||
    clean === 'المعدل النهائي' ||
    clean === 'النسبه' ||
    clean === 'النسبه المئويه' ||
    clean === 'التقدير' ||
    clean === 'تقدير' ||
    clean === 'النتيجه' ||
    clean === 'نتيجه' ||
    clean === 'قرار' ||
    clean === 'القرار' ||
    clean === 'درجه القرار' ||
    clean === 'total' ||
    clean === 'final' ||
    clean === 'rating'
  );
}

export function isWrittenExamColumn(name?: string, type?: string): boolean {
  if (!name && !type) return false;
  if (type === 'written') return true;
  if (!name) return false;

  const clean = normalizeArabicColumnName(name);

  if (
    clean.includes('شفه') ||
    clean.includes('شفو') ||
    clean.includes('نشاط') ||
    clean.includes('يومي') ||
    clean.includes('واجب') ||
    clean.includes('دفتر') ||
    clean.includes('حضور') ||
    clean.includes('مواظب') ||
    clean.includes('سلوك') ||
    clean.includes('مشارك') ||
    clean.includes('مشروع')
  ) {
    return false;
  }

  return (
    clean.includes('تحرير') ||
    clean.includes('كتابي') ||
    clean.includes('ورق') ||
    clean.includes('امتحان') ||
    clean.includes('اختبار') ||
    clean.includes('درجه الشهر') ||
    clean.includes('امتحان الشهر') ||
    clean.includes('سعي') ||
    clean === 'الدرجه' ||
    clean === 'درجه' ||
    clean === 'الدرجات' ||
    clean === 'درجات' ||
    clean === 'درجه الاختبار' ||
    clean === 'درجه الامتحان' ||
    clean === 'درجه الطالب' ||
    clean === 'درجه التحريري بالورقه من' ||
    clean.startsWith('الدرجه التحريري') ||
    clean.startsWith('درجه التحريري') ||
    clean.startsWith('الدرجه الورقيه') ||
    clean.startsWith('درجه الورقه')
  );
}

export function isStandardSystemColumn(name?: string, type?: string): boolean {
  if (!name && !type) return false;
  if (type === 'written') return true;
  if (!name) return false;

  return (
    isStudentNameColumn(name) ||
    isSectionColumn(name) ||
    isGradeLevelColumn(name) ||
    isSequenceColumn(name) ||
    isNotesOrStatusColumn(name) ||
    isFinalTotalOrRatingColumn(name) ||
    isWrittenExamColumn(name, type)
  );
}

const SEMANTIC_GROUPS: Array<{ type: string; keywords: string[] }> = [
  {
    type: 'oral',
    keywords: ['شفهي', 'شفوي', 'تسميع', 'قراءه', 'املاء شفهي', 'محادثه', 'نطق', 'oral'],
  },
  {
    type: 'activity',
    keywords: ['نشاط', 'انشطه', 'نشاطات', 'نشاط لاصفي', 'نشاط يومي', 'مشاركه', 'تفاعل', 'انجاز', 'activity'],
  },
  {
    type: 'homework',
    keywords: ['واجب', 'واجبات', 'واجب بيتي', 'واجبات بيتيه', 'دفتر', 'دفاتر', 'كراس', 'كراسه', 'كشكول', 'تمارين', 'حل التمارين', 'homework'],
  },
  {
    type: 'daily',
    keywords: ['يومي', 'التحضير اليومي', 'تحضير يومي', 'سعي يومي', 'اختبار يومي', 'كويز', 'امتحان يومي', 'daily'],
  },
  {
    type: 'attendance',
    keywords: ['حضور', 'مواظبه', 'التزام', 'حضور وغياب', 'دوام', 'attendance'],
  },
  {
    type: 'behavior',
    keywords: ['سلوك', 'انضباط', 'اخلاق', 'تربيه', 'سيره', 'behavior'],
  },
  {
    type: 'project',
    keywords: ['مشروع', 'مشاريع', 'تقرير', 'تقارير', 'بحث', 'بحوث', 'project'],
  },
];

export function areColumnsSemanticallyEquivalent(col1?: string, col2?: string): boolean {
  if (!col1 || !col2) return false;

  const norm1 = normalizeArabicColumnName(col1);
  const norm2 = normalizeArabicColumnName(col2);

  if (norm1 === norm2) return true;

  const root1 = extractColumnSemanticRoot(col1);
  const root2 = extractColumnSemanticRoot(col2);

  if (root1 && root2 && root1 === root2) return true;

  const stripped1 = norm1.replace(/^ال/, '');
  const stripped2 = norm2.replace(/^ال/, '');
  if (stripped1 === stripped2) return true;

  if (root1.length >= 4 && root2.length >= 4) {
    if (root1.includes(root2) || root2.includes(root1)) return true;
  }

  for (const group of SEMANTIC_GROUPS) {
    const match1 = group.keywords.some((k) => norm1.includes(k) || root1.includes(k));
    const match2 = group.keywords.some((k) => norm2.includes(k) || root2.includes(k));
    if (match1 && match2) return true;
  }

  return false;
}

export function findMatchingExistingColumn<T extends { id: string; name: string }>(
  detectedName: string,
  existingColumns: T[]
): T | null {
  if (!detectedName || !existingColumns || existingColumns.length === 0) {
    return null;
  }

  const normDetected = normalizeArabicColumnName(detectedName);
  const rootDetected = extractColumnSemanticRoot(detectedName);
  const strippedDetected = normDetected.replace(/^ال/, '');

  for (const col of existingColumns) {
    const normCol = normalizeArabicColumnName(col.name);
    const rootCol = extractColumnSemanticRoot(col.name);
    const strippedCol = normCol.replace(/^ال/, '');

    if (
      normCol === normDetected ||
      col.name.trim() === detectedName.trim() ||
      strippedCol === strippedDetected ||
      (rootCol && rootDetected && rootCol === rootDetected)
    ) {
      return col;
    }
  }

  for (const col of existingColumns) {
    if (areColumnsSemanticallyEquivalent(detectedName, col.name)) {
      return col;
    }
  }

  return null;
}
