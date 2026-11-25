import { useState, useEffect } from 'react';
import type { InstitutionType } from '../types';
import { getCurrentUser } from './auth';

/**
 * Legacy translation map for code editor sandbox UI
 */
export const t = {
  ar: {
    appTitle: 'CodeForge Studio',
    subtitle: 'بيئة تطوير برمجية سحابية متكاملة',
    explorer: 'مستكشف الملفات',
    files: 'الملفات',
    newFile: 'ملف جديد',
    newFolder: 'مجلد جديد',
    uploadFiles: 'رفع ملفات',
    uploadFolder: 'رفع مجلد',
    uploadZip: 'رفع ملف ZIP',
    downloadZip: 'تحميل كـ ZIP',
    downloadFile: 'تحميل هذا الملف',
    runCode: 'تشغيل',
    running: 'جاري التنفيذ...',
    preview: 'المعاينة الحية',
    refreshPreview: 'تحديث المعاينة',
    formatCode: 'تنسيق الكود',
    findReplace: 'بحث واستبدال',
    find: 'بحث عن...',
    replace: 'استبدال بـ...',
    replaceAll: 'استبدال الكل',
    snippets: 'المقتطفات البرمجية',
    settings: 'الإعدادات',
    projects: 'المشاريع',
    newProject: 'مشروع جديد',
    deleteProject: 'حذف المشروع',
    renameProject: 'تسمية المشروع',
    duplicateProject: 'تكرار المشروع',
    console: 'الكونسول',
    terminal: 'الطرفية',
    clear: 'مسح',
    noOpenFiles: 'لا يوجد ملف مفتوح حالياً. اختر ملفاً من القائمة الجانبية أو اضغط على رفع ملف لبدء العمل.',
    dragDropHere: 'اسحب وأفلت الملفات أو المجلدات أو أرشيف ZIP هنا لرفعها فوراً',
    savedLocally: 'محفوظ محلياً',
    saving: 'جاري الحفظ...',
    language: 'اللغة',
    fontSize: 'حجم الخط',
    tabSize: 'حجم الإزاحة (Tab)',
    wordWrap: 'التفاف الأسطر',
    autoRun: 'تشغيل المعاينة تلقائياً',
    line: 'السطر',
    column: 'العمود',
    characters: 'محرف',
    lines: 'أسطر',
    close: 'إغلاق',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    create: 'إنشاء',
    save: 'حفظ',
    fileNamePlaceholder: 'مثال: script.js أو styles.css',
    folderNamePlaceholder: 'مثال: components أو utils',
    projectNamePlaceholder: 'اسم المشروع البرمجي الجديد',
    selectTemplate: 'اختر قالب البداية',
    templateBlank: 'مشروع فارغ (جاهز لرفع أكوادك)',
    templateWeb: 'تطبيق ويب حديث (HTML + CSS + JS)',
    templatePython: 'سكربتات بايثون وخوارزميات',
    templateReact: 'مكون ريأكت تفاعلي',
    deleteConfirmTitle: 'تأكيد الحذف',
    deleteConfirmMsg: 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذه العملية.',
    insertSnippet: 'إدراج الكود في المحرر',
    copySnippet: 'نسخ الكود',
    snippetCopied: 'تم نسخ الكود!',
    emptyProjectWarn: 'المشروع الحالي فارغ. ابدأ بإضافة ملف جديد أو اضغط رفع ملفات.',
    welcomeModalTitle: 'بيئة عملك البرمجية جاهزة للعمل!',
    welcomeModalDesc: 'يمكنك الآن رفع ملفاتك وأكوادك البرمجية بكل سهولة، تعديلها، تشغيلها في المتصفح، وتحميل المشروع في أي وقت بصيغة ZIP.',
    understand: 'ابدأ العمل الآن'
  },
  en: {
    appTitle: 'CodeForge Studio',
    subtitle: 'Interactive Cloud Coding Workspace',
    explorer: 'Explorer',
    files: 'Files',
    newFile: 'New File',
    newFolder: 'New Folder',
    uploadFiles: 'Upload Files',
    uploadFolder: 'Upload Folder',
    uploadZip: 'Upload ZIP',
    downloadZip: 'Download ZIP',
    downloadFile: 'Download File',
    runCode: 'Run',
    running: 'Executing...',
    preview: 'Live Preview',
    refreshPreview: 'Refresh Preview',
    formatCode: 'Format Code',
    findReplace: 'Find & Replace',
    find: 'Find...',
    replace: 'Replace with...',
    replaceAll: 'Replace All',
    snippets: 'Snippets',
    settings: 'Settings',
    projects: 'Projects',
    newProject: 'New Project',
    deleteProject: 'Delete Project',
    renameProject: 'Rename Project',
    duplicateProject: 'Duplicate Project',
    console: 'Console',
    terminal: 'Terminal',
    clear: 'Clear',
    noOpenFiles: 'No file currently open. Select a file from the explorer or click Upload to get started.',
    dragDropHere: 'Drag & drop files, folders, or ZIP archives here to upload instantly',
    savedLocally: 'Saved locally',
    saving: 'Saving...',
    language: 'Language',
    fontSize: 'Font Size',
    tabSize: 'Tab Size',
    wordWrap: 'Word Wrap',
    autoRun: 'Auto-run preview',
    line: 'Ln',
    column: 'Col',
    characters: 'chars',
    lines: 'lines',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    create: 'Create',
    save: 'Save',
    fileNamePlaceholder: 'e.g. script.js or styles.css',
    folderNamePlaceholder: 'e.g. components or utils',
    projectNamePlaceholder: 'New project name',
    selectTemplate: 'Select starter template',
    templateBlank: 'Blank Project (Ready for your code)',
    templateWeb: 'Modern Web App (HTML + CSS + JS)',
    templatePython: 'Python Scripts & Algorithms',
    templateReact: 'Interactive React Sandbox',
    deleteConfirmTitle: 'Confirm Delete',
    deleteConfirmMsg: 'Are you sure you want to delete this item? This action cannot be undone.',
    insertSnippet: 'Insert into Editor',
    copySnippet: 'Copy Code',
    snippetCopied: 'Copied to clipboard!',
    emptyProjectWarn: 'The current project is empty. Add a new file or upload your code.',
    welcomeModalTitle: 'Your coding workspace is ready!',
    welcomeModalDesc: 'Upload your code files, edit with syntax highlighting, run in real-time, and download your project anytime as a ZIP.',
    understand: 'Get Started'
  }
};

/* =========================================================================
 * Comprehensive Terminology Layer for School & University Education
 * ========================================================================= */

export type { InstitutionType };

export interface InstitutionTerms {
  type: InstitutionType;
  institutionLabel: string;        // 'المدرسة' vs 'الجامعة / الكلية'
  institutionTypeLabel: string;    // 'مدرسة' vs 'جامعة / كلية'
  institutionNameLabel: string;    // 'اسم المدرسة' vs 'اسم الجامعة / الكلية والجامعة'
  teacherLabel: string;            // 'المعلم / المدرس' vs 'الأستاذ الجامعي / التدريسي'
  teacherLabelShort: string;       // 'المعلم' vs 'التدريسي'
  teachersLabel: string;           // 'المعلمين' vs 'الأساتذة التدريسيين'
  studentLabel: string;            // 'طالب' vs 'طالب جامعي'
  studentsLabel: string;           // 'الطلاب' vs 'الطلبة'
  studentIdLabel: string;          // 'رقم القيد / الكود' vs 'الرقم الجامعي / رقم القيد'
  classLabel: string;              // 'الصف الدراسي' vs 'المرحلة الدراسية'
  classLabelShort: string;         // 'الصف' vs 'المرحلة'
  classesLabel: string;            // 'الصفوف الدراسية' vs 'المراحل الدراسية'
  sectionLabel: string;            // 'الشعبة' vs 'الشعبة / المجموعة'
  sectionLabelShort: string;       // 'الشعبة' vs 'الشعبة'
  sectionsLabel: string;           // 'الشُعَب' vs 'الشُعَب / المجموعات'
  subjectLabel: string;            // 'المادة الدراسية' vs 'المقرر الدراسي'
  subjectLabelShort: string;       // 'المادة' vs 'المقرر'
  subjectsLabel: string;           // 'المواد الدراسية' vs 'المقررات الدراسية'
  termLabel: string;               // 'الفصل الدراسي' vs 'الكورس / الفصل الدراسي'
  termLabelShort: string;          // 'الفصل' vs 'الكورس'
  termsLabel: string;              // 'الفصول الدراسية' vs 'الكورسات / السمسترات'
  monthlyModelLabel: string;       // 'النموذج الشهري' vs 'التقييم الفصلي / السعي'
  monthlyModelsLabel: string;      // 'النماذج الشهرية' vs 'التقييمات الفصلية / السعي'
  administrationLabel: string;     // 'إدارة المدرسة' vs 'إدارة القسم / الكلية'
  adminRoleLabel: string;          // 'إدارة مدرسة' vs 'إدارة قسم / كلية'
  principalLabel: string;          // 'مدير المدرسة' vs 'عميد الكلية / رئيس القسم'
  reportCardLabel: string;         // 'بطاقة الدرجات' vs 'كشف الدرجات'
  reportCardsLabel: string;        // 'بطاقات الدرجات' vs 'كشوفات الدرجات'
  academicYearLabel: string;       // 'العام الدراسي' vs 'العام الأكاديمي'
  curriculumLabel: string;         // 'المنهج الدراسي' vs 'الخطة الدراسية / مفردات المنهج'
  attendanceLabel: string;         // 'حضور وغياب التلاميذ' vs 'حضور وغياب الطلبة'
  absenceLimitLabel: string;       // 'حد الغياب' vs 'حد الغياب والحرمان'
  gradeAverageLabel: string;       // 'معدل الفصل' vs 'السعي السنوي / معدل الكورس'
  finalExamLabel: string;          // 'الامتحان النهائي' vs 'الامتحان النهائي / الدور الأول'
}

export const SCHOOL_TERMS: Readonly<InstitutionTerms> = {
  type: 'school',
  institutionLabel: 'المدرسة',
  institutionTypeLabel: 'مدرسة',
  institutionNameLabel: 'اسم المدرسة',
  teacherLabel: 'المعلم / المدرس',
  teacherLabelShort: 'المعلم',
  teachersLabel: 'المعلمين',
  studentLabel: 'طالب',
  studentsLabel: 'الطلاب',
  studentIdLabel: 'رقم القيد / الكود',
  classLabel: 'الصف الدراسي',
  classLabelShort: 'الصف',
  classesLabel: 'الصفوف الدراسية',
  sectionLabel: 'الشعبة',
  sectionLabelShort: 'الشعبة',
  sectionsLabel: 'الشُعَب',
  subjectLabel: 'المادة الدراسية',
  subjectLabelShort: 'المادة',
  subjectsLabel: 'المواد الدراسية',
  termLabel: 'الفصل الدراسي',
  termLabelShort: 'الفصل',
  termsLabel: 'الفصول الدراسية',
  monthlyModelLabel: 'النموذج الشهري',
  monthlyModelsLabel: 'النماذج الشهرية',
  administrationLabel: 'إدارة المدرسة',
  adminRoleLabel: 'إدارة مدرسة',
  principalLabel: 'مدير المدرسة',
  reportCardLabel: 'بطاقة الدرجات',
  reportCardsLabel: 'بطاقات الدرجات',
  academicYearLabel: 'العام الدراسي',
  curriculumLabel: 'المنهج الدراسي',
  attendanceLabel: 'حضور وغياب التلاميذ',
  absenceLimitLabel: 'الحد الأقصى للغياب',
  gradeAverageLabel: 'معدل الفصل',
  finalExamLabel: 'الامتحان النهائي',
};

export const UNIVERSITY_TERMS: Readonly<InstitutionTerms> = {
  type: 'university',
  institutionLabel: 'الجامعة / الكلية',
  institutionTypeLabel: 'جامعة / كلية',
  institutionNameLabel: 'اسم الجامعة والكلية',
  teacherLabel: 'الأستاذ الجامعي / التدريسي',
  teacherLabelShort: 'الأستاذ التدريسي',
  teachersLabel: 'الأساتذة التدريسيين',
  studentLabel: 'طالب جامعي',
  studentsLabel: 'الطلبة',
  studentIdLabel: 'الرقم الجامعي / رقم القيد',
  classLabel: 'المرحلة الدراسية',
  classLabelShort: 'المرحلة',
  classesLabel: 'المراحل الدراسية',
  sectionLabel: 'الشعبة / المجموعة',
  sectionLabelShort: 'الشعبة',
  sectionsLabel: 'الشُعَب / المجموعات',
  subjectLabel: 'المقرر الدراسي / المادة',
  subjectLabelShort: 'المقرر',
  subjectsLabel: 'المقررات الدراسية',
  termLabel: 'الكورس / الفصل الدراسي',
  termLabelShort: 'الكورس',
  termsLabel: 'الكورسات / السمسترات',
  monthlyModelLabel: 'التقييم الفصلي / السعي',
  monthlyModelsLabel: 'التقييمات الفصلية / السعي',
  administrationLabel: 'إدارة القسم / الكلية',
  adminRoleLabel: 'إدارة قسم / كلية',
  principalLabel: 'عميد الكلية / رئيس القسم',
  reportCardLabel: 'كشف الدرجات',
  reportCardsLabel: 'كشوفات الدرجات',
  academicYearLabel: 'العام الأكاديمي',
  curriculumLabel: 'الخطة الدراسية / مفردات المنهج',
  attendanceLabel: 'حضور وغياب الطلبة',
  absenceLimitLabel: 'حد الغياب والحرمان',
  gradeAverageLabel: 'السعي السنوي / معدل الكورس',
  finalExamLabel: 'الامتحان النهائي / الدور الأول',
};

/**
 * Returns the terminology dictionary for the specified institution type.
 * Defaults safely to 'school' for legacy compatibility.
 */
export function getInstitutionTerms(type?: InstitutionType | string | null): InstitutionTerms {
  if (type === 'university') {
    return UNIVERSITY_TERMS;
  }
  return SCHOOL_TERMS;
}

/**
 * Resolves the currently active institution type from active user or cached profile
 */
export function getActiveInstitutionType(): InstitutionType {
  try {
    const user = getCurrentUser();
    if (user?.institutionType === 'university') {
      return 'university';
    }
    const stored = localStorage.getItem('gradebook_institution_type');
    if (stored === 'university') {
      return 'university';
    }
  } catch {
    // fallback
  }
  return 'school';
}

/**
 * React hook to get dynamically updated terminology based on user profile or override
 */
export function useInstitutionTerms(overrideType?: InstitutionType): InstitutionTerms {
  const [activeType, setActiveType] = useState<InstitutionType>(() => {
    if (overrideType) return overrideType;
    return getActiveInstitutionType();
  });

  useEffect(() => {
    if (overrideType) {
      setActiveType(overrideType);
      return;
    }
    // Update on mount / storage changes
    const resolved = getActiveInstitutionType();
    setActiveType(resolved);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gradebook_institution_type' || e.key?.startsWith('gradebook_teacher_profile')) {
        setActiveType(getActiveInstitutionType());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [overrideType]);

  return getInstitutionTerms(activeType);
}

/* =========================================================================
 * Standard Presets: Grades, Subjects, Sections, and Terms
 * ========================================================================= */

export const STANDARD_SCHOOL_GRADES: readonly string[] = [
  'الأول الابتدائي',
  'الثاني الابتدائي',
  'الثالث الابتدائي',
  'الرابع الابتدائي',
  'الخامس الابتدائي',
  'السادس الابتدائي',
  'الأول متوسط',
  'الثاني متوسط',
  'الثالث متوسط',
  'الرابع الإعدادي',
  'الرابع العلمي',
  'الرابع الأدبي',
  'الخامس العلمي',
  'الخامس الأدبي',
  'الخامس التطبيقي',
  'الخامس الأحيائي',
  'السادس العلمي',
  'السادس الأدبي',
  'السادس التطبيقي',
  'السادس الأحيائي',
];

export const STANDARD_UNIVERSITY_STAGES: readonly string[] = [
  'المرحلة الأولى',
  'المرحلة الثانية',
  'المرحلة الثالثة',
  'المرحلة الرابعة',
  'المرحلة الخامسة',
  'المرحلة السادسة',
  'الدراسات العليا (ماجستير)',
  'الدراسات العليا (دكتوراه)',
];

export const STANDARD_SCHOOL_SUBJECTS: readonly string[] = [
  'اللغة العربية',
  'الرياضيات',
  'اللغة الإنجليزية',
  'العلوم',
  'التربية الإسلامية',
  'الاجتماعيات',
  'الكيمياء',
  'الفيزياء',
  'الأحياء',
  'الحاسوب',
  'التربية الفنية',
  'التربية الرياضية',
];

export const STANDARD_UNIVERSITY_SUBJECTS: readonly string[] = [
  'نظري',
  'عملي',
  'الرياضيات الهندسية / العامة',
  'برمجة الحاسوب وتكنولوجيا المعلومات',
  'الإحصاء والاحتمالات',
  'اللغة الإنجليزية التخصصية',
  'حقوق الإنسان والديمقراطية',
  'اللغة العربية العامة',
  'مقرر تخصصي (1)',
  'مقرر تخصصي (2)',
  'مقرر تخصصي (3)',
  'مشروع التخرج / البحث',
];

export const STANDARD_SCHOOL_SECTIONS: readonly string[] = [
  'أ', 'ب', 'ج', 'د', 'هـ', 'و', 'A', 'B', 'C', 'D'
];

export const STANDARD_UNIVERSITY_SECTIONS: readonly string[] = [
  'شعبة A', 'شعبة B', 'شعبة C', 'شعبة D',
  'مجموعة 1', 'مجموعة 2', 'مجموعة 3',
  'شعبة أ', 'شعبة ب', 'شعبة ج', 'شعبة د',
  'الصباحي', 'المسائي'
];

export const STANDARD_SCHOOL_TERMS: readonly string[] = [
  'الفصل الأول',
  'الفصل الثاني',
  'نصف السنة',
  'امتحان نهاية السنة (الدور الأول)',
  'امتحان نهاية السنة (الدور الثاني)'
];

export const STANDARD_UNIVERSITY_TERMS: readonly string[] = [
  'الكورس الأول',
  'الكورس الثاني',
  'السعي السنوي',
  'الدور الأول (الامتحان النهائي)',
  'الدور الثاني (الامتحان النهائي)',
  'الفصل الصيفي'
];

/**
 * Get the list of standard classes/stages based on institution type
 */
export function getStandardGrades(type?: InstitutionType | string | null): string[] {
  return type === 'university' ? [...STANDARD_UNIVERSITY_STAGES] : [...STANDARD_SCHOOL_GRADES];
}

/**
 * Get the list of standard subjects/courses based on institution type
 */
export function getStandardSubjects(type?: InstitutionType | string | null): string[] {
  return type === 'university' ? [...STANDARD_UNIVERSITY_SUBJECTS] : [...STANDARD_SCHOOL_SUBJECTS];
}

/**
 * Get the list of standard sections based on institution type
 */
export function getStandardSections(type?: InstitutionType | string | null): string[] {
  return type === 'university' ? [...STANDARD_UNIVERSITY_SECTIONS] : [...STANDARD_SCHOOL_SECTIONS];
}

/**
 * Get the list of standard terms/courses based on institution type
 */
export function getStandardTerms(type?: InstitutionType | string | null): string[] {
  return type === 'university' ? [...STANDARD_UNIVERSITY_TERMS] : [...STANDARD_SCHOOL_TERMS];
}

/**
 * Placeholders for form fields
 */
export function getGradePlaceholder(type?: InstitutionType | string | null): string {
  return type === 'university' ? 'مثال: المرحلة الأولى، المرحلة الثانية...' : 'مثال: الأول متوسط، الثاني متوسط...';
}

export function getSubjectPlaceholder(type?: InstitutionType | string | null): string {
  return type === 'university' ? 'مثال: برمجة 1، نظري، عملي، رياضيات هندسية...' : 'مثال: الرياضيات، اللغة العربية، العلوم...';
}

export function getSectionPlaceholder(type?: InstitutionType | string | null): string {
  return type === 'university' ? 'مثال: شعبة A، مجموعة 1، الصباحي...' : 'مثال: أ، ب، ج، A...';
}

export function getTermPlaceholder(type?: InstitutionType | string | null): string {
  return type === 'university' ? 'مثال: الكورس الأول، الكورس الثاني، السعي السنوي...' : 'مثال: الفصل الأول، الفصل الثاني...';
}
