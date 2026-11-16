export type AttendanceStatus = 'present' | 'excused' | 'absent';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  dayName: string; // الأحد، الإثنين، الثلاثاء...
  status: AttendanceStatus;
  note?: string;
  createdAt?: string;
  modelId?: string;
  modelName?: string;
}

export interface AttendanceStatusRule {
  action: 'none' | 'add' | 'deduct';
  points: number; // e.g. 1
}

export interface AttendanceColumnConfig {
  affectsGrade: boolean; // هل يؤثر على الدرجة النهائية؟
  present: AttendanceStatusRule; // حاضر
  excused: AttendanceStatusRule; // مجاز
  absent: AttendanceStatusRule; // غائب
  importedFromModelIds?: string[]; // الأشهر السابقة المدمجة
}

export interface CustomColumn {
  id: string;
  name: string;
  maxScore: number;
  isAttendance?: boolean;
  attendanceConfig?: AttendanceColumnConfig;
}

export interface SuspectedMatchInfo {
  originalName: string; // The suspected name from previous table / existing student
  message?: string;
  reason?: 'letter_variation' | 'close_similarity';
  dismissed?: boolean;
}

export interface ParticipationRecord {
  date: string;
  percentage: number; // e.g. 70 for 70%
  answersCount?: number;
  totalQuestions?: number;
  lessonTitle?: string;
}

export interface StudentRow {
  id: string;
  name: string;
  gradeLevel: string;
  section: string;
  // Raw score in written exam (e.g., 90 out of 100)
  writtenRawScore: number | null;
  // Scores for custom columns (oral, behavior, activities, etc.) keyed by column id
  scores: Record<string, number | null>;
  // For daily participation lessons: columnId -> array of lesson participation records
  participationHistory?: Record<string, ParticipationRecord[]>;
  // For attendance/absence records: columnId -> array of attendance records
  attendanceRecords?: Record<string, AttendanceRecord[]>;
  notes?: string;
  suspectedMatch?: SuspectedMatchInfo;
}

export type RoundingMode = 'none' | 'half_up' | 'any_fraction' | 'custom_threshold';
export type WrittenScoreMode = 'relative' | 'raw';
export type FinalScoreOperationType = 'none' | 'divide' | 'multiply' | 'add' | 'subtract';

export interface FinalScoreOperation {
  type: FinalScoreOperationType;
  value: number; // e.g., 2 for dividing by 2, or 5 for adding 5
}

export interface ColumnLabels {
  studentName?: string; // e.g. "اسم الطالب"
  gradeLevel?: string; // e.g. "الصف"
  section?: string; // e.g. "الشعبة"
  writtenExam?: string; // e.g. "درجة التحريري بالورقة من"
  finalScore?: string; // e.g. "الدرجة النهائية من"
  rating?: string; // e.g. "التقدير"
}

export interface MonthlyModel {
  id: string;
  name: string; // e.g. "الشهر الأول", "الشهر الثاني"
  subject: string; // e.g. "الرياضيات"
  gradeLevel?: string; // e.g. "الأول متوسط"
  academicYear: string; // e.g. "2024 - 2025"
  totalMaxScore: number; // e.g. 100 or 10
  writtenWeight: number | null; // Percentage e.g. 70 for 70%, or null (defaults to 100% if empty)
  writtenMaxScore: number; // The maximum raw score of written exam, e.g. 100
  writtenScoreMode?: WrittenScoreMode; // 'raw' (الدرجة كما في ورقة الطالب - افتراضي) | 'relative' (الدرجة النسبية للطالب)
  customColumns: CustomColumn[]; // Flexible columns (oral, behavior, etc.)
  students: StudentRow[];
  createdAt: string;
  updatedAt: string;
  roundingMode?: RoundingMode; // 'none' | 'half_up' | 'any_fraction' | 'custom_threshold'
  roundingThreshold?: number; // e.g. 0.5, 0.1, or custom 0.1 - 0.9
  columnLabels?: ColumnLabels; // Custom user-defined titles for table columns
  finalScoreOperation?: FinalScoreOperation; // Math operation on the final score (divide, multiply, add, subtract, none)
  teacherName?: string; // اسم أستاذ المادة (خاصة في وضع الإدارة)
  assignedSections?: string[]; // الشُعب المخصصة لهذا الأستاذ / النموذج (مثل ["أ", "ب"])
}

export interface TermModel {
  id: string;
  name: string; // e.g. "الفصل الأول", "الفصل الثاني"
  subject?: string; // e.g. "الرياضيات"
  gradeLevel?: string; // e.g. "الأول متوسط"
  teacherName?: string; // اسم أستاذ المادة المخصص لهذا الفصل
  assignedSections?: string[]; // الشُعب المخصصة لهذا الأستاذ
  selectedModelIds: string[]; // e.g. ["month-1"] or ["month-1", "month-2"]
  calculationMode: 'average' | 'single' | 'sum';
  notes?: string;
  roundingMode?: RoundingMode;
  roundingThreshold?: number;
}

export type InstitutionType = 'school' | 'university';

export interface TeacherProfile {
  teacherName: string;
  schoolName: string;
  subject: string;
  gradeLevel?: string;
  academicYear: string;
  governorate?: string;
  schoolLogo?: string;
  // University institution fields
  institutionType?: InstitutionType;
  universityName?: string;
  collegeName?: string;
  departmentName?: string;
}

export interface PrintSettings {
  margin: 'narrow' | 'normal' | 'wide' | 'custom';
  customMarginMm: number;
  showSchoolLogo: boolean;
  cardsPerPage: '2' | '4' | '1';
  showSignatures: boolean;
  showSchoolHeader: boolean;
  schoolLogo?: string;
  orientation?: 'portrait' | 'landscape';
}

export interface StudentTermSummary {
  studentId: string;
  name: string;
  gradeLevel: string;
  section: string;
  monthlyScores: {
    modelId: string;
    modelName: string;
    score: number | null;
    maxScore: number;
  }[];
  rawTermScore?: number | null;
  finalTermScore: number | null;
  isRounded?: boolean;
  termMaxScore: number;
  gradeText: string; // ممتاز, جيد جدا, etc.
  gradeColor: string;
  status: 'passed' | 'failed' | 'incomplete';
}

export interface MultiTermStudentSummary {
  studentId: string;
  name: string;
  gradeLevel: string;
  section: string;
  termBreakdowns: {
    termId: string;
    termName: string;
    rawTermScore?: number | null;
    finalTermScore: number | null;
    isRounded?: boolean;
    termMaxScore: number;
    monthlyScores: {
      modelId: string;
      modelName: string;
      score: number | null;
      maxScore: number;
    }[];
  }[];
  rawAverageScore?: number | null;
  finalAverageScore: number | null;
  isAverageRounded?: boolean;
  combinedMaxScore: number;
  gradeText: string;
  gradeColor: string;
  status: 'passed' | 'failed' | 'incomplete';
}

export interface StudentSimpleCard {
  id: string;
  name: string;
  gradeLevel: string;
  section: string;
  termScores: Record<string, number | null>;
}

export interface ClassSectionCard {
  id: string;
  gradeLevel: string;
  section: string;
  subject?: string;
  teacherName?: string;
  students: StudentSimpleCard[];
}
