export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type ScheduleColorKey = 'craft' | 'sky' | 'sage' | 'amber' | 'rose' | 'slate';

export interface SchedulePeriod {
  id: string;
  label: string;
  timeRange: string;
}

export interface ScheduleEntry {
  id: string;
  day: WeekdayKey;
  periodId: string;
  subject: string;
  className: string;
  note?: string;
  colorKey: ScheduleColorKey;
}

export interface ClassWeeklySchedule {
  id: string;
  gradeLevel: string;
  section: string;
  periods: SchedulePeriod[];
  cells: Record<string, string>; // Keyed by `${day}::${periodId}`
  showSaturday: boolean;
  showFriday: boolean;
  updatedAt: string;
}

export interface WeeklyScheduleData {
  periods: SchedulePeriod[];
  entries: ScheduleEntry[];
  showSaturday: boolean;
  showFriday: boolean;
  activeScheduleId?: string | null;
  draftGradeLevel?: string;
  draftSection?: string;
  draftCells?: Record<string, string>;
  savedSchedules?: ClassWeeklySchedule[];
}

export type TeacherNoteCategory = 'general' | 'lesson_prep' | 'class_note' | 'admin';

export interface TeacherNote {
  id: string;
  title: string;
  content: string;
  category: TeacherNoteCategory;
  isPinned: boolean;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TeacherAlertRepeat = 'once' | 'daily' | 'weekly';

export interface TeacherAlert {
  id: string;
  title: string;
  note?: string;
  date: string; // YYYY-MM-DD (used for 'once')
  time: string; // HH:MM (24-hour format)
  repeat: TeacherAlertRepeat;
  repeatDay?: WeekdayKey; // Used for 'weekly'
  soundEnabled: boolean;
  isActive: boolean;
  lastTriggeredKey?: string; // Prevents duplicate firing within the same occurrence window
  snoozeUntil?: string; // ISO timestamp if user snoozed
  createdAt: string;
}

export type ExamBranchStyle =
  | 'arabic_num'
  | 'latin_num'
  | 'arabic_alpha'
  | 'dash'
  | 'none';

export type ExamBranchLayout = 'vertical' | 'inline' | 'two_col';

export interface ExamQuestionBranch {
  id: string;
  customLabel?: string;
  text: string;
}

export interface ExamQuestionItem {
  id: string;
  label: string;
  prompt: string;
  marks?: string;
  branchStyle: ExamBranchStyle;
  branchLayout: ExamBranchLayout;
  branches: ExamQuestionBranch[];
}

export interface ExamPaperHeader {
  rightLines: string[];
  leftLines: string[];
  showLogo: boolean;
  logoDataUrl?: string;
  showStudentInfo: boolean;
  studentNameLabel: string;
  studentNumberLabel: string;
  showNote: boolean;
  noteText: string;
  footerText?: string;
}

export interface SavedExamPaper {
  id: string;
  title: string;
  header: ExamPaperHeader;
  questions: ExamQuestionItem[];
  useArabicDigits: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  updatedAt: string;
}

export interface ExamBuilderData {
  activeExamId?: string | null;
  draft: SavedExamPaper;
  savedExams: SavedExamPaper[];
}

export interface TeacherPersonalData {
  schedule: WeeklyScheduleData;
  notes: TeacherNote[];
  alerts: TeacherAlert[];
  exams?: ExamBuilderData;
}

