import React, { useState, useEffect, useMemo } from 'react';
import {
  MonthlyModel,
  StudentRow,
  CustomColumn,
  TeacherProfile,
  RoundingMode,
  WrittenScoreMode,
  ColumnLabels,
  FinalScoreOperation,
  AttendanceRecord,
  AttendanceColumnConfig,
} from '../../types';
import {
  calculateWrittenScore,
  calculateStudentMonthlyTotal,
  applyScoreRounding,
  getRatingDetails,
  getStudentMonthlyScoreBreakdown,
  isWrittenScoreColumn,
  getEffectiveTotalMax,
  getOperationLabel,
} from '../../utils/gradeCalculations';
import {
  resolveColumnSemantics,
  isCoreTableField,
} from '../../utils/columnSemanticMatcher';
import {
  Plus,
  UserPlus,
  Trash2,
  FileSpreadsheet,
  Printer,
  Search,
  BookOpen,
  GraduationCap,
  X,
  Filter,
  Sliders,
  Check,
  Calendar,
  Eye,
  EyeOff,
  Calculator,
  Pencil,
  PenLine,
  RotateCcw,
  User,
  ChevronDown,
  ChevronLeft,
  AlertTriangle,
  Table,
  Sparkles,
  Award,
  Maximize2,
  LayoutGrid,
  GitMerge,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
} from 'lucide-react';
import { InteractiveClassroomView } from './InteractiveClassroomView';
import { CleanTableView } from './CleanTableView';
import { GradeRenameMergeModal } from './GradeRenameMergeModal';
import { BatchImportModal } from './BatchImportModal';
import { CreateModelModal } from './CreateModelModal';
import { EditModelModal } from './EditModelModal';
import { TeacherSectionsSwapModal } from './TeacherSectionsSwapModal';
import { ConfirmDeleteModal } from '../Common/ConfirmDeleteModal';
import { ScoreRoundingModal } from './ScoreRoundingModal';
import { RenameColumnsModal } from './RenameColumnsModal';
import { FinalScoreOperationModal } from './FinalScoreOperationModal';
import { AttendanceRecordModal } from './AttendanceRecordModal';
import { ClassCumulativeAttendanceModal } from './ClassCumulativeAttendanceModal';
import { StudentFloatingCloud, ActiveStudentCloudInfo } from '../Common/StudentFloatingCloud';
import { ColumnSlant, getSlantClasses, getNextSlant, SlantButton } from '../Common/ColumnSlantToggle';
import {
  cleanSingleSpaces,
  canonicalizeArabic,
  findSuspectedStudentMatch,
} from '../../utils/arabicNameMatcher';
import {
  normalizeGradeLevel,
  normalizeSection,
  getUniqueGradeLevels,
  getUniqueSections,
  isGradeLevelMatch,
  isSectionMatch,
  isSubjectMatch,
} from '../../utils/gradeAndSectionMatcher';
import { AppUser } from '../../utils/auth';

interface Props {
  models: MonthlyModel[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  onUpdateModel: (updatedModel: MonthlyModel) => void;
  onUpdateAllModels?: (updatedModels: MonthlyModel[]) => void;
  onDeleteModel: (id: string) => void;
  onAddModel: (newModel: MonthlyModel) => void;
  profile: TeacherProfile;
  currentUser?: AppUser | null;
}

export const MonthlySheetView: React.FC<Props> = ({
  models,
  activeModelId,
  onSelectModel,
  onUpdateModel,
  onUpdateAllModels,
  onDeleteModel,
  onAddModel,
  profile,
  currentUser,
}) => {
  const currentModel = models.find((m) => m.id === activeModelId) || models[0];

  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false);
  const [editingModelForRename, setEditingModelForRename] = useState<MonthlyModel | null>(null);
  const [isSectionsSwapOpen, setIsSectionsSwapOpen] = useState(false);
  const [swapInitialGrade, setSwapInitialGrade] = useState<string | undefined>();
  const [swapInitialSubject, setSwapInitialSubject] = useState<string | undefined>();

  const handleSaveModelRename = (
    modelId: string,
    newName: string,
    newSubject: string,
    newGradeLevel?: string,
    newTeacherName?: string,
    newAssignedSections?: string[]
  ) => {
    const trimmedSub = newSubject?.trim();
    const trimmedGrade = newGradeLevel?.trim();
    const trimmedTeacher = newTeacherName?.trim();

    if (trimmedSub) {
      try {
        const raw = localStorage.getItem('gradebook_user_subjects');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        if (!existing.includes(trimmedSub)) {
          localStorage.setItem('gradebook_user_subjects', JSON.stringify([...existing, trimmedSub]));
        }
      } catch {}
    }

    if (trimmedGrade) {
      try {
        const raw = localStorage.getItem('gradebook_user_grades');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        if (!existing.some((g) => canonicalizeArabic(g) === canonicalizeArabic(trimmedGrade))) {
          localStorage.setItem('gradebook_user_grades', JSON.stringify([...existing, trimmedGrade]));
        }
        localStorage.setItem('gradebook_last_selected_grade', trimmedGrade);
      } catch {}
    }

    if (onUpdateAllModels && models.length > 0) {
      const updated = models.map((m) => {
        if (m.id === modelId) {
          return {
            ...m,
            name: newName,
            subject: trimmedSub !== undefined ? trimmedSub : m.subject,
            gradeLevel: trimmedGrade !== undefined ? trimmedGrade : m.gradeLevel,
            teacherName: trimmedTeacher !== undefined ? trimmedTeacher : m.teacherName,
            assignedSections: newAssignedSections !== undefined ? newAssignedSections : m.assignedSections,
            updatedAt: new Date().toISOString(),
          };
        }
        // If this other model shares the same grade and subject, remove any sections that were moved to the edited model
        if (
          newAssignedSections &&
          newAssignedSections.length > 0 &&
          trimmedGrade &&
          trimmedSub &&
          isGradeLevelMatch(m.gradeLevel || '', trimmedGrade) &&
          isSubjectMatch(m.subject, trimmedSub) &&
          m.assignedSections &&
          m.assignedSections.length > 0
        ) {
          const filteredSecs = m.assignedSections.filter(
            (sec) => !newAssignedSections.some((newSec) => isSectionMatch(sec, newSec))
          );
          if (filteredSecs.length !== m.assignedSections.length) {
            return {
              ...m,
              assignedSections: filteredSecs.length > 0 ? filteredSecs : undefined,
              updatedAt: new Date().toISOString(),
            };
          }
        }
        return m;
      });
      onUpdateAllModels(updated);
    } else {
      const target = models.find((m) => m.id === modelId) || currentModel;
      onUpdateModel({
        ...target,
        name: newName,
        subject: trimmedSub !== undefined ? trimmedSub : target.subject,
        gradeLevel: trimmedGrade !== undefined ? trimmedGrade : target.gradeLevel,
        teacherName: trimmedTeacher !== undefined ? trimmedTeacher : target.teacherName,
        assignedSections: newAssignedSections !== undefined ? newAssignedSections : target.assignedSections,
        updatedAt: new Date().toISOString(),
      });
    }

    if (trimmedGrade && modelId === currentModel.id) {
      setSelectedGradeLevel(trimmedGrade);
    }
  };

  // Students from other monthly models/sheets to verify and cross-match against
  const otherModelsStudents = useMemo(() => {
    if (!models || models.length === 0) return [];
    const list: Array<{ id: string; name: string; modelName?: string }> = [];
    const seen = new Set<string>();

    for (const m of models) {
      if (currentModel && m.id === currentModel.id) continue;
      for (const st of m.students || []) {
        const cleaned = cleanSingleSpaces(st.name);
        if (cleaned && !seen.has(cleaned)) {
          seen.add(cleaned);
          list.push({ id: st.id, name: cleaned, modelName: m.name });
        }
      }
    }
    return list;
  }, [models, currentModel?.id]);

  // Unique Grade levels across models for the filter dropdown
  const availableGradesForFilter = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    models.forEach((m) => {
      const g = (m.gradeLevel || '').trim();
      if (g) {
        const canonical = canonicalizeArabic(g);
        if (!seen.has(canonical)) {
          seen.add(canonical);
          list.push(g);
        }
      }
    });
    return list;
  }, [models]);

  // Unique Subjects across models for the filter dropdown
  const availableSubjectsForFilter = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    models.forEach((m) => {
      const s = (m.subject || profile.subject || '').trim();
      if (s && s !== 'الإدارة' && s !== 'عام') {
        const canonical = canonicalizeArabic(s);
        if (!seen.has(canonical)) {
          seen.add(canonical);
          list.push(s);
        }
      }
    });
    return list;
  }, [models, profile.subject]);

  // Selected Grade and Subject dropdown filter states for filtering month buttons
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');

  // Filtered models to display as month buttons in the header
  const displayedModels = useMemo(() => {
    return models.filter((m) => {
      const mGrade = (m.gradeLevel || '').trim();
      const mSubj = (m.subject || profile.subject || '').trim();

      const matchGrade =
        selectedGradeFilter === 'ALL' || isGradeLevelMatch(mGrade, selectedGradeFilter);
      const matchSubj =
        selectedSubjectFilter === 'ALL' ||
        canonicalizeArabic(mSubj) === canonicalizeArabic(selectedSubjectFilter);

      return matchGrade && matchSubj;
    });
  }, [models, selectedGradeFilter, selectedSubjectFilter, profile.subject]);

  // If the active model is not part of the filtered grade-subject models, select the first visible one
  useEffect(() => {
    if (displayedModels.length > 0) {
      const isCurrentInDisplayed = displayedModels.some((m) => m.id === currentModel?.id);
      if (!isCurrentInDisplayed) {
        onSelectModel(displayedModels[0].id);
        if (displayedModels[0].gradeLevel) {
          setSelectedGradeLevel(displayedModels[0].gradeLevel);
        }
        setSelectedSection('ALL');
      }
    }
  }, [displayedModels, currentModel?.id]);

  // Quick "Add Column" Modal state
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColMax, setNewColMax] = useState<number>(20);

  // Attendance configuration state in Add Column modal
  const [isAttendanceMode, setIsAttendanceMode] = useState(false);
  const [attendanceAffectsGrade, setAttendanceAffectsGrade] = useState(true);
  const [presentAction, setPresentAction] = useState<'none' | 'add' | 'deduct'>('none');
  const [presentPoints, setPresentPoints] = useState<number>(0);
  const [excusedAction, setExcusedAction] = useState<'none' | 'add' | 'deduct'>('none');
  const [excusedPoints, setExcusedPoints] = useState<number>(0.5);
  const [absentAction, setAbsentAction] = useState<'none' | 'add' | 'deduct'>('deduct');
  const [absentPoints, setAbsentPoints] = useState<number>(1);
  const [attendanceCrossMonthMode, setAttendanceCrossMonthMode] = useState<'fresh' | 'merge'>('fresh');
  const [selectedPriorModelIds, setSelectedPriorModelIds] = useState<string[]>([]);

  // Attendance Record Modal for active student
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] = useState<{
    student: StudentRow;
    column: CustomColumn;
  } | null>(null);
  // Class Cumulative Attendance overview modal
  const [isClassCumulativeAttendanceOpen, setIsClassCumulativeAttendanceOpen] = useState(false);

  // Score Rounding Modal state
  const [isRoundingModalOpen, setIsRoundingModalOpen] = useState(false);
  // Final Score Math Operation Modal state (divide by number, multiply, add, subtract, none)
  const [isFinalOperationModalOpen, setIsFinalOperationModalOpen] = useState(false);

  // View Mode: 'table' (full spreadsheet table) | 'interactive' (classroom view for participation & oral exams)
  const [viewMode, setViewMode] = useState<'table' | 'interactive'>('table');
  // Clean Full-Screen Table View without any buttons
  const [isCleanTableView, setIsCleanTableView] = useState(false);

  // Search & Filter (embedded directly inside the table column headers)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState(() => currentModel?.gradeLevel || 'ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');

  // Automatically scope selectedGradeLevel to the active model's designated gradeLevel
  useEffect(() => {
    if (currentModel?.gradeLevel) {
      setSelectedGradeLevel(currentModel.gradeLevel);
      setSelectedSection('ALL');
    }
  }, [currentModel?.id, currentModel?.gradeLevel]);

  // Check if currentModel has specific assigned sections (e.g. ['أ', 'ب'])
  const modelAssignedSections = useMemo(() => {
    if (currentModel?.assignedSections && currentModel.assignedSections.length > 0) {
      return currentModel.assignedSections;
    }
    return null;
  }, [currentModel?.assignedSections]);

  // Automatically reset selectedSection if it does not belong to the teacher's assigned sections
  useEffect(() => {
    if (modelAssignedSections && selectedSection !== 'ALL') {
      const isValid = modelAssignedSections.some((sec) => isSectionMatch(sec, selectedSection));
      if (!isValid) {
        setSelectedSection('ALL');
      }
    }
  }, [currentModel?.id, modelAssignedSections, selectedSection]);

  // Grade levels list for filter (strictly scoped to currentModel.gradeLevel if set)
  // CRITICAL: Placed BEFORE early return to strictly follow React Rules of Hooks!
  const allGradeLevels = useMemo(() => {
    if (!currentModel) return [];
    return currentModel.gradeLevel
      ? [currentModel.gradeLevel]
      : getUniqueGradeLevels(currentModel.students || []);
  }, [currentModel?.gradeLevel, currentModel?.students]);

  // Relevant students strictly belonging to this model's designated gradeLevel AND assignedSections
  // CRITICAL: Placed BEFORE early return to strictly follow React Rules of Hooks!
  const relevantModelStudents = useMemo(() => {
    if (!currentModel) return [];
    let list = currentModel.students || [];
    if (currentModel.gradeLevel) {
      list = list.filter((s) => isGradeLevelMatch(s.gradeLevel, currentModel.gradeLevel!));
    }
    if (modelAssignedSections) {
      list = list.filter((s) =>
        modelAssignedSections.some((sec) => isSectionMatch(s.section, sec))
      );
    }
    return list;
  }, [currentModel?.students, currentModel?.gradeLevel, modelAssignedSections]);

  // Sections list for filter: if teacher has designated assignedSections, strictly use them!
  // CRITICAL: Placed BEFORE early return to strictly follow React Rules of Hooks!
  const allSections = useMemo(() => {
    if (modelAssignedSections) {
      return modelAssignedSections;
    }
    return getUniqueSections(relevantModelStudents);
  }, [modelAssignedSections, relevantModelStudents]);

  // Filter students (strictly scoped to currentModel.gradeLevel AND teacher's assignedSections)
  // CRITICAL: Placed BEFORE early return to strictly follow React Rules of Hooks!
  const targetGradeLevel = currentModel?.gradeLevel || selectedGradeLevel;
  const filteredStudents = useMemo(() => {
    if (!currentModel) return [];
    return (currentModel.students || []).filter((st) => {
      // 1. Grade match
      const matchGrade = !targetGradeLevel || targetGradeLevel === 'ALL' || isGradeLevelMatch(st.gradeLevel, targetGradeLevel);
      if (!matchGrade) return false;

      // 2. Strict teacher assigned sections: if this teacher/model has specific assigned sections (e.g. أ، ب),
      // NEVER show students from unassigned sections (like ج) in this teacher's sheet!
      if (modelAssignedSections) {
        const belongsToTeacher = modelAssignedSections.some((sec) => isSectionMatch(st.section, sec));
        if (!belongsToTeacher) return false;
      }

      // 3. Section filter button (جميع الشُعب vs specific section like أ or ب)
      const matchSection = isSectionMatch(st.section, selectedSection);
      if (!matchSection) return false;

      // 4. Name search query
      const matchName = st.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchName) return false;

      return true;
    });
  }, [currentModel?.students, targetGradeLevel, modelAssignedSections, selectedSection, searchQuery]);

  // Grade being managed in GradeRenameMergeModal
  const [managingGrade, setManagingGrade] = useState<string | null>(null);

  // Column header slant/orientation (normal | italic | vertical)
  const [columnSlants, setColumnSlants] = useState<Record<string, ColumnSlant>>(() => {
    try {
      if (!currentModel?.id) return {};
      const saved = localStorage.getItem(`daragat_monthly_slants_${currentModel.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleColumnSlant = (colKey: string) => {
    setColumnSlants((prev) => {
      const next = getNextSlant(prev[colKey]);
      const updated = { ...prev, [colKey]: next };
      if (currentModel?.id) {
        try {
          localStorage.setItem(`daragat_monthly_slants_${currentModel.id}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  // Floating student info cloud badge when horizontally scrolling table
  const [activeStudentCloud, setActiveStudentCloud] = useState<ActiveStudentCloudInfo | null>(null);
  const activeRowRef = React.useRef<HTMLTableRowElement | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isNameColumnVisible, setIsNameColumnVisible] = useState(true);
  const [isTableScrolledIntoView, setIsTableScrolledIntoView] = useState(false);

  // Check if student name column is visible within the table container during horizontal scroll
  const checkNameColumnVisibility = React.useCallback(() => {
    if (!tableContainerRef.current) return;
    const container = tableContainerRef.current;
    const nameCell = container.querySelector('[data-student-name-column="true"]') as HTMLElement | null;
    if (!nameCell) return;
    const nameRect = nameCell.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const visibleLeft = Math.max(nameRect.left, containerRect.left);
    const visibleRight = Math.min(nameRect.right, containerRect.right);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);

    setIsNameColumnVisible(visibleWidth >= 60);
  }, []);

  // Track table scroll position for fixed vertical info indicator on the left
  const checkTableScrollPosition = React.useCallback(() => {
    if (!tableContainerRef.current) {
      setIsTableScrolledIntoView(false);
      return;
    }
    const rect = tableContainerRef.current.getBoundingClientRect();
    const isScrolled = rect.top <= 140 && rect.bottom >= 180;
    setIsTableScrolledIntoView(isScrolled);
  }, []);

  // Keep floating badge locked with row vertically during scroll & update visibility
  useEffect(() => {
    const handleScrollOrResize = () => {
      if (activeRowRef.current && activeStudentCloud) {
        const rect = activeRowRef.current.getBoundingClientRect();

        // الحد السفلي لحقول الهيدر التي بها اسم الجدول والمعدل والكروت
        const navHeader = document.getElementById('main-navigation-header') || document.querySelector('header');
        const headerBottom = navHeader ? navHeader.getBoundingClientRect().bottom : 130;

        // تختفي السحابة إذا وصل صف الطالب حد الحقول التي بها اسم الجدول والمعدل والكروت، أو إذا اختفى صف الطالب من الشاشة إلى الأسفل
        if (rect.top <= headerBottom || rect.top >= window.innerHeight) {
          setActiveStudentCloud(null);
          return;
        }

        setActiveStudentCloud((prev) => (prev ? { ...prev, rowTop: rect.top } : null));
      }
      checkNameColumnVisibility();
      checkTableScrollPosition();
    };

    checkNameColumnVisibility();
    checkTableScrollPosition();

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeStudentCloud, checkNameColumnVisibility, checkTableScrollPosition]);

  // Dismiss floating badge when clicking outside the table
  useEffect(() => {
    if (!activeStudentCloud) return;

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (tableContainerRef.current?.contains(target)) return;
      if (target.closest?.('[data-student-floating-cloud="true"]')) return;
      if (target.closest?.('[data-floating-cloud-toggle="true"]')) return;

      setActiveStudentCloud(null);
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [activeStudentCloud]);

  const handleScoreCellFocus = (
    e: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement>,
    student: StudentRow
  ) => {
    const rowEl = (e.currentTarget.closest('tr') || e.currentTarget) as HTMLTableRowElement;
    if (rowEl) {
      activeRowRef.current = rowEl;
      const rect = rowEl.getBoundingClientRect();
      const rowHeight = rect.height || 40;
      setActiveStudentCloud({
        studentId: student.id,
        name: student.name,
        section: student.section,
        rowTop: rect.top,
        initialRowTop: rect.top,
        rowHeight: rowHeight,
      });
      checkNameColumnVisibility();
    }
  };

  // Confirmation Alert Modal State (Ensures any deletion requires explicit confirmation)
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Action Prompt Modal State (Informs user about Export / Print before executing)
  const [actionPrompt, setActionPrompt] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    icon: React.ReactNode;
    onConfirm: () => void;
  } | null>(null);

  // Floating overlay state shown in front of the page (position: fixed) right after creating a model
  const [newlyCreatedModel, setNewlyCreatedModel] = useState<MonthlyModel | null>(null);

  // Column Renaming states (Modal + Inline in Table Headers)
  const [isRenameColumnsModalOpen, setIsRenameColumnsModalOpen] = useState(false);
  const [editingColumnKey, setEditingColumnKey] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');

  // Rating Column visibility preference (hidden by default)
  const [showRatingColumn, setShowRatingColumn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gradebook_show_rating_col') === 'true';
    } catch {
      return false;
    }
  });

  const toggleRatingColumn = () => {
    setShowRatingColumn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gradebook_show_rating_col', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleModelCreated = (newModel: MonthlyModel) => {
    // Check if this is the very first model before adding it
    const isFirstModel = models.length === 0;
    onAddModel(newModel);
    // Show prompt overlay to add students ONLY for the very first model
    if (isFirstModel) {
      setNewlyCreatedModel(newModel);
    }
  };

  // Ensure consistency: if models have different totalMaxScore, sync them with the first/active model
  useEffect(() => {
    if (models.length > 1 && onUpdateAllModels) {
      const refMax = models[0]?.totalMaxScore;
      if (refMax && refMax > 0) {
        const hasMismatch = models.some((m, idx) => idx > 0 && m.totalMaxScore !== refMax);
        if (hasMismatch) {
          const synced = models.map((m) => {
            const hasNoCustomCols = (m.customColumns || []).length === 0;
            return {
              ...m,
              totalMaxScore: refMax,
              writtenMaxScore: hasNoCustomCols ? refMax : m.writtenMaxScore,
              updatedAt: new Date().toISOString(),
            };
          });
          onUpdateAllModels(synced);
        }
      }
    }
  }, []);

  // Check if any student in the active model has decimal / fractional scores, or if rounding is configured
  // CRITICAL: Placed BEFORE early return to strictly follow React Rules of Hooks!
  const hasDecimalScores = useMemo(() => {
    if (!currentModel || !currentModel.students) return false;
    const hasRawDecimals = currentModel.students.some((student) => {
      const raw = calculateStudentMonthlyTotal(student, currentModel, true);
      if (raw === null || raw === undefined) return false;
      return Math.abs(raw - Math.round(raw)) > 0.001;
    });
    return hasRawDecimals || (currentModel.roundingMode !== undefined && currentModel.roundingMode !== 'none');
  }, [currentModel]);

  // Grade levels written by the user in models
  // CRITICAL: Placed BEFORE early return to strictly follow React Rules of Hooks!
  const userEnteredGrades = useMemo(() => {
    if (!models || models.length === 0) return [];
    const list: string[] = [];
    const seen = new Set<string>();
    const addIfValid = (g?: string) => {
      const trimmed = g?.trim();
      if (!trimmed) return;
      if (trimmed === 'الصف الدراسي' || trimmed === 'عام') return;
      const canon = canonicalizeArabic(trimmed);
      if (!seen.has(canon)) {
        seen.add(canon);
        list.push(trimmed);
      }
    };

    if (currentModel?.gradeLevel) addIfValid(currentModel.gradeLevel);
    models.forEach((m) => {
      if (m.gradeLevel) addIfValid(m.gradeLevel);
    });

    return list;
  }, [models, currentModel?.gradeLevel]);

  if (!currentModel) {
    return (
      <div className="space-y-4">
        {/* Full-width "جدول درجات جديد" button */}
        <div className="no-print">
          <button
            type="button"
            onClick={() => setIsCreateModelOpen(true)}
            className="w-full py-3.5 px-6 craft-btn-primary active:scale-[0.99] text-white rounded-2xl text-base sm:text-lg font-bold transition-all flex items-center justify-center gap-2.5 shadow-xs cursor-pointer"
            title={`جدول درجات جديد لمادة ${profile.subject || 'المادة'}`}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>جدول درجات جديد</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E4DA] p-8 sm:p-12 text-center shadow-xs max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EEF4F8] border border-[#D2E0EC] flex items-center justify-center text-[#557A95] shadow-xs">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#2E2B27]">لا يوجد أي نموذج شهري حالياً</h2>
            <p className="text-sm text-[#7A746B] mt-1.5 leading-relaxed">
              جدول النماذج فارغ حالياً. يمكنك استخدام الزر بالأعلى لإنشاء أول نموذج والبدء برصد الدرجات.
            </p>
          </div>

          <CreateModelModal
            isOpen={isCreateModelOpen}
            onClose={() => setIsCreateModelOpen(false)}
            currentModel={undefined}
            allModels={models}
            onCreate={handleModelCreated}
            profileSubject={profile.subject}
            currentUser={currentUser}
          />

          <BatchImportModal
            isOpen={isBatchImportOpen}
            onClose={() => setIsBatchImportOpen(false)}
            onImport={(importedStudents) => {
              const detectedGrade = importedStudents.find((s) => s.gradeLevel?.trim())?.gradeLevel?.trim() || '';
              const newModel: MonthlyModel = {
                id: 'month-' + Date.now(),
                name: 'الشهر الأول',
                subject: profile.subject || 'عام',
                gradeLevel: detectedGrade,
                academicYear: profile.academicYear || '2024 - 2025',
                totalMaxScore: 100,
                writtenMaxScore: 100,
                writtenWeight: null,
                writtenScoreMode: 'raw',
                roundingMode: 'none',
                students: importedStudents.map((st) => ({
                  id: st.id || 'st-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                  name: st.name || '',
                  gradeLevel: st.gradeLevel || detectedGrade,
                  section: st.section || 'أ',
                  writtenRawScore: st.writtenRawScore ?? null,
                  scores: st.scores || {},
                  notes: st.notes || '',
                })),
                customColumns: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              onAddModel(newModel);
              setIsBatchImportOpen(false);
            }}
            defaultGrade=""
            defaultSection="أ"
            writtenMaxScore={100}
          />
        </div>
      </div>
    );
  }

  // Real-time calculation of distributed scores vs total max score
  const totalMax = Number(currentModel.totalMaxScore) || 100;
  const customSum = (currentModel.customColumns || []).reduce(
    (sum, col) => sum + Number(col.maxScore || 0),
    0
  );
  // Automatic written weight = totalMax - customSum (e.g. 100 - 20 = 80, or 10 - 2 = 8)
  const autoWrittenWeight = Math.max(0, totalMax - customSum);
  const effectiveWrittenWeight = autoWrittenWeight;
  // Rule: "الدرجة كما في ورقة الطالب" (raw) is active automatically by default,
  // without depending on whether written test score is less than or equal to total max score.
  // "الدرجة النسبية للطالب" (relative) is only active if the teacher explicitly enables it.
  const writtenScoreMode: WrittenScoreMode = currentModel.writtenScoreMode || 'raw';

  const handleUpdateScoreMode = (newMode: 'relative' | 'raw') => {
    if (onUpdateAllModels && models.length > 0) {
      const updatedModels = models.map((m) => ({
        ...m,
        writtenScoreMode: newMode,
        updatedAt: new Date().toISOString(),
      }));
      onUpdateAllModels(updatedModels);
    } else {
      onUpdateModel({
        ...currentModel,
        writtenScoreMode: newMode,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const rawWrittenMax = currentModel.writtenMaxScore || 0;
  // If in 'raw' mode (الدرجة كما في ورقة الطالب):
  // When custom columns exist (e.g. written 80 + oral 20), allocatedTotal is rawWrittenMax + customSum = 100
  // When no custom columns exist, allocatedTotal is rawWrittenMax (or totalMax)
  // In 'relative' mode (الدرجة النسبية للطالب): calculates weight distribution (effectiveWrittenWeight + customSum)
  const allocatedTotal =
    writtenScoreMode === 'raw'
      ? (customSum > 0 ? rawWrittenMax + customSum : (rawWrittenMax || totalMax))
      : Math.min(totalMax, effectiveWrittenWeight + customSum);
  const remainingScore = totalMax - allocatedTotal;

  // Final Score Math Operation (division, multiplication, addition, subtraction, or none)
  const finalOp = currentModel.finalScoreOperation;
  const hasFinalOp = Boolean(
    finalOp &&
      finalOp.type &&
      finalOp.type !== 'none' &&
      Number(finalOp.value) > 0
  );
  const finalOpLabel = getOperationLabel(finalOp);
  const effectiveTotalMax = getEffectiveTotalMax(currentModel);

  // Breakdown text for custom columns (e.g. "20 درجة شفهي" or "20 درجة شفهي + 10 درجة نشاط")
  const customBreakdownText = (currentModel.customColumns || [])
    .map((col) => {
      const score = col.maxScore || 0;
      const name = (col.name || 'إضافي').trim();
      return name.startsWith('درجة') ? `${score} ${name}` : `${score} درجة ${name}`;
    })
    .join(' + ');

  // Column Titles / Labels (customizable with defaults)
  const studentNameLabel = currentModel.columnLabels?.studentName?.trim() || 'اسم الطالب';
  const gradeLevelLabel = currentModel.columnLabels?.gradeLevel?.trim() || 'الصف';
  const sectionLabel = currentModel.columnLabels?.section?.trim() || 'الشعبة';
  // User requirement: "جدول تحريري من اجعلها درجه التحريري بالورقة من مع امكانيه اعاده تسميه لكل عناوين الاعمده"
  const writtenExamLabel = currentModel.columnLabels?.writtenExam?.trim() || 'درجة التحريري بالورقة من';
  const finalScoreLabel = currentModel.columnLabels?.finalScore?.trim() || 'الدرجة النهائية من';
  const ratingLabel = currentModel.columnLabels?.rating?.trim() || 'التقدير';

  const handleStartInlineEdit = (key: string, currentVal: string) => {
    setEditingColumnKey(key);
    setInlineEditValue(currentVal);
  };

  const handleSaveInlineColumnRename = (key: keyof ColumnLabels) => {
    const trimmed = inlineEditValue.trim();
    if (!trimmed) {
      setEditingColumnKey(null);
      return;
    }
    if (onUpdateAllModels && models.length > 0) {
      const updatedModels = models.map((m) => ({
        ...m,
        columnLabels: {
          ...(m.columnLabels || {}),
          [key]: trimmed,
        },
        updatedAt: new Date().toISOString(),
      }));
      onUpdateAllModels(updatedModels);
    } else {
      onUpdateModel({
        ...currentModel,
        columnLabels: {
          ...(currentModel.columnLabels || {}),
          [key]: trimmed,
        },
        updatedAt: new Date().toISOString(),
      });
    }
    setEditingColumnKey(null);
  };

  const handleSaveInlineCustomColRename = (colId: string) => {
    const trimmed = inlineEditValue.trim();
    if (!trimmed) {
      setEditingColumnKey(null);
      return;
    }
    if (onUpdateAllModels && models.length > 0) {
      const updatedModels = models.map((m) => ({
        ...m,
        customColumns: (m.customColumns || []).map((c) =>
          c.id === colId ? { ...c, name: trimmed } : c
        ),
        updatedAt: new Date().toISOString(),
      }));
      onUpdateAllModels(updatedModels);
    } else {
      onUpdateModel({
        ...currentModel,
        customColumns: (currentModel.customColumns || []).map((c) =>
          c.id === colId ? { ...c, name: trimmed } : c
        ),
        updatedAt: new Date().toISOString(),
      });
    }
    setEditingColumnKey(null);
  };

  // Update total final maximum score (can be edited directly in the final score column)
  const handleUpdateTotalMaxScore = (newMax: number) => {
    try {
      if (newMax > 0) {
        localStorage.setItem('gradebook_last_total_max_score', String(newMax));
      }
    } catch {}

    // Only update the CURRENT model (this specific class, subject, and month)
    const hasNoCustomCols = (currentModel.customColumns || []).length === 0;
    const targetWritten = hasNoCustomCols ? newMax : (currentModel.writtenMaxScore || 0);
    onUpdateModel({
      ...currentModel,
      totalMaxScore: newMax,
      writtenMaxScore: targetWritten,
      writtenScoreMode: currentModel.writtenScoreMode || 'raw',
      writtenWeight: null,
      updatedAt: new Date().toISOString(),
    });
  };

  // Calculate effective percentage of written exam
  const effectiveWrittenPercentage = totalMax > 0 ? Math.round((effectiveWrittenWeight / totalMax) * 100) : 100;

  // When opening the column modal, suggest the preset name and remaining score
  const handleOpenAddColumn = () => {
    setIsAttendanceMode(false);
    setAttendanceAffectsGrade(true);
    setPresentAction('none');
    setPresentPoints(0);
    setExcusedAction('none');
    setExcusedPoints(0.5);
    setAbsentAction('deduct');
    setAbsentPoints(1);
    setAttendanceCrossMonthMode('fresh');
    setSelectedPriorModelIds([]);

    if ((currentModel.customColumns || []).length === 0) {
      setNewColName('درجة الشفهي');
    } else {
      setNewColName('');
    }
    const suggested = totalMax === 10 ? 2 : totalMax === 100 ? 20 : Math.max(1, Math.round(totalMax * 0.2));
    setNewColMax(suggested);
    setIsAddingColumn(true);
  };

  const handleSelectAttendancePreset = () => {
    setIsAttendanceMode(true);
    setNewColName('الغياب والحضور');
    setNewColMax(0);
    // Find if previous models have attendance columns
    const priorModelsWithAttendance = models
      .filter((m) => m.id !== currentModel.id && (m.customColumns || []).some((c) => c.isAttendance))
      .map((m) => m.id);
    setSelectedPriorModelIds(priorModelsWithAttendance);
  };

  const handleSaveRounding = (
    newMode: RoundingMode,
    newThreshold: number,
    applyToSameGradeAndSubject: boolean
  ) => {
    if (applyToSameGradeAndSubject && onUpdateAllModels) {
      const currentGradeNorm = (currentModel.gradeLevel || '').trim().toLowerCase();
      const currentSubjNorm = (currentModel.subject || '').trim().toLowerCase();

      const updated = models.map((m) => {
        const mGradeNorm = (m.gradeLevel || '').trim().toLowerCase();
        const mSubjNorm = (m.subject || '').trim().toLowerCase();
        const isTarget =
          m.id === currentModel.id ||
          (mGradeNorm === currentGradeNorm && mSubjNorm === currentSubjNorm);

        if (isTarget) {
          return {
            ...m,
            roundingMode: newMode,
            roundingThreshold: newThreshold,
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      });
      onUpdateAllModels(updated);
    } else {
      onUpdateModel({
        ...currentModel,
        roundingMode: newMode,
        roundingThreshold: newThreshold,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleSaveFinalScoreOperation = (
    operation: FinalScoreOperation,
    applyToSameGradeAndSubject: boolean
  ) => {
    if (applyToSameGradeAndSubject && onUpdateAllModels) {
      const currentGradeNorm = (currentModel.gradeLevel || '').trim().toLowerCase();
      const currentSubjNorm = (currentModel.subject || '').trim().toLowerCase();

      const updated = models.map((m) => {
        const mGradeNorm = (m.gradeLevel || '').trim().toLowerCase();
        const mSubjNorm = (m.subject || '').trim().toLowerCase();
        const isTarget =
          m.id === currentModel.id ||
          (mGradeNorm === currentGradeNorm && mSubjNorm === currentSubjNorm);

        if (isTarget) {
          return {
            ...m,
            finalScoreOperation: operation,
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      });
      onUpdateAllModels(updated);
    } else {
      onUpdateModel({
        ...currentModel,
        finalScoreOperation: operation,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Student updates - Synchronizes Name, GradeLevel, and Section across ALL monthly models by unique student.id
  const handleUpdateStudent = (studentId: string, updates: Partial<StudentRow>) => {
    const hasProfileField =
      'name' in updates || 'gradeLevel' in updates || 'section' in updates;

    if (hasProfileField && onUpdateAllModels) {
      const profileUpdates: Partial<StudentRow> = {};
      if ('name' in updates) profileUpdates.name = updates.name;
      if ('gradeLevel' in updates) profileUpdates.gradeLevel = updates.gradeLevel;
      if ('section' in updates) profileUpdates.section = updates.section;

      const updatedModels = models.map((m) => {
        if (m.id === currentModel.id) {
          return {
            ...m,
            students: m.students.map((st) =>
              st.id === studentId ? { ...st, ...updates } : st
            ),
            updatedAt: new Date().toISOString(),
          };
        }

        // Check if student exists in this other model by unique ID
        const exists = m.students.some((st) => st.id === studentId);
        if (!exists) {
          // If the student doesn't exist in this other model yet, ONLY add them if this model's grade and assignedSections match!
          const curSt = currentModel.students.find((s) => s.id === studentId);
          const stGrade = updates.gradeLevel !== undefined ? updates.gradeLevel : (curSt?.gradeLevel || '');
          const stSection = updates.section !== undefined ? updates.section : (curSt?.section || 'أ');

          const gradeMatches = !m.gradeLevel || !stGrade || isGradeLevelMatch(m.gradeLevel, stGrade);
          const sectionMatches = !m.assignedSections || m.assignedSections.length === 0 ||
            m.assignedSections.some((sec) => isSectionMatch(sec, stSection));

          if (gradeMatches && sectionMatches) {
            return {
              ...m,
              students: [
                ...m.students,
                {
                  id: studentId, // EXACT SAME ID
                  name: updates.name !== undefined ? updates.name : (curSt?.name || ''),
                  gradeLevel: stGrade,
                  section: stSection,
                  writtenRawScore: null,
                  scores: {},
                  notes: '',
                },
              ],
              updatedAt: new Date().toISOString(),
            };
          }
          return m;
        }

        // Student exists: ONLY update their name/gradeLevel/section, keeping all their scores in this month intact!
        return {
          ...m,
          students: m.students.map((st) =>
            st.id === studentId ? { ...st, ...profileUpdates } : st
          ),
          updatedAt: new Date().toISOString(),
        };
      });

      onUpdateAllModels(updatedModels);
    } else {
      // Score-only updates or local changes: ONLY update the current model
      const updatedStudents = currentModel.students.map((st) =>
        st.id === studentId ? { ...st, ...updates } : st
      );
      onUpdateModel({
        ...currentModel,
        students: updatedStudents,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleUpdateStudentCustomScore = (
    studentId: string,
    colId: string,
    scoreValue: string
  ) => {
    const numericScore = scoreValue === '' ? null : Number(scoreValue);
    const student = currentModel.students.find((s) => s.id === studentId);
    if (!student) return;

    const newScores = {
      ...student.scores,
      [colId]: numericScore,
    };
    handleUpdateStudent(studentId, { scores: newScores });
  };

  // Add single student row - Propagates with the EXACT same unique studentId to all monthly models of the same teacher/sections!
  const handleAddRow = () => {
    const newStudentId = 'st-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const defaultFallbackGrade = profile?.institutionType === 'university' ? 'المرحلة الأولى' : 'الأول متوسط';
    const defaultFallbackSection = profile?.institutionType === 'university' ? 'شعبة A' : 'أ';
    const initialGrade = currentModel.gradeLevel || currentModel.students[0]?.gradeLevel || defaultFallbackGrade;
    const initialSection = (selectedSection !== 'ALL' ? selectedSection : null) || (allSections[0] || defaultFallbackSection);

    const newStudent: StudentRow = {
      id: newStudentId,
      name: '',
      gradeLevel: initialGrade,
      section: initialSection,
      writtenRawScore: null,
      scores: {},
      notes: '',
    };

    if (onUpdateAllModels) {
      const updatedModels = models.map((m) => {
        if (m.id === currentModel.id) {
          return {
            ...m,
            students: [...m.students, newStudent],
            updatedAt: new Date().toISOString(),
          };
        }

        // Only add to another model if it shares the grade and teacher's assigned sections match
        const gradeMatches = !m.gradeLevel || !initialGrade || isGradeLevelMatch(m.gradeLevel, initialGrade);
        const sectionMatches = !m.assignedSections || m.assignedSections.length === 0 ||
          m.assignedSections.some((sec) => isSectionMatch(sec, initialSection));

        if (gradeMatches && sectionMatches) {
          return {
            ...m,
            students: [
              ...m.students,
              {
                id: newStudentId, // EXACT SAME ID ACROSS MATCHING MODELS
                name: '',
                gradeLevel: initialGrade,
                section: initialSection,
                writtenRawScore: null,
                scores: {},
                notes: '',
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        }

        return m;
      });
      onUpdateAllModels(updatedModels);
    } else {
      onUpdateModel({
        ...currentModel,
        students: [...currentModel.students, newStudent],
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Delete a student row WITH CONFIRMATION ALERT - Deletes from all monthly models to keep student lists identical!
  const requestDeleteRow = (studentId: string) => {
    const student = currentModel.students.find((st) => st.id === studentId);
    const studentLabel = student?.name?.trim() ? `الطالب (${student.name})` : 'هذا الطالب';
    setConfirmDelete({
      isOpen: true,
      title: `تنبيه: تأكيد حذف صف ${studentLabel}`,
      message: `هل أنت متأكد من حذف ${studentLabel}؟ سيتم حذف الطالب من جميع الشهور والنماذج لضمان تطابق قوائم الطلاب.`,
      confirmText: 'نعم، احذف الطالب من كافة الشهور',
      onConfirm: () => {
        if (onUpdateAllModels) {
          const updatedModels = models.map((m) => ({
            ...m,
            students: m.students.filter((st) => st.id !== studentId),
            updatedAt: new Date().toISOString(),
          }));
          onUpdateAllModels(updatedModels);
        } else {
          onUpdateModel({
            ...currentModel,
            students: currentModel.students.filter((st) => st.id !== studentId),
            updatedAt: new Date().toISOString(),
          });
        }
      },
    });
  };

  // Clear all students WITH CONFIRMATION ALERT
  const requestClearAllStudents = () => {
    setConfirmDelete({
      isOpen: true,
      title: `تأكيد مسح جميع الطلاب للبدء من الصفر`,
      message: `هل أنت متأكد من الاستمرار في مسح كافة الطلاب (${currentModel.students.length} طالب) من جميع الشهور والنماذج للبدء من الصفر؟`,
      confirmText: 'نعم، استمر في مسح الكل',
      onConfirm: () => {
        if (onUpdateAllModels) {
          const updatedModels = models.map((m) => ({
            ...m,
            students: [],
            updatedAt: new Date().toISOString(),
          }));
          onUpdateAllModels(updatedModels);
        } else {
          onUpdateModel({
            ...currentModel,
            students: [],
            updatedAt: new Date().toISOString(),
          });
        }
      },
    });
  };

  // Delete Model WITH CONFIRMATION ALERT
  const requestDeleteModel = (id: string) => {
    const modelToDelete = models.find((m) => m.id === id) || currentModel;
    setConfirmDelete({
      isOpen: true,
      title: `تأكيد حذف نموذج (${modelToDelete.name})`,
      message: `هل أنت متأكد من الاستمرار في حذف نموذج (${modelToDelete.name}) بالكامل؟ سيتم حذف جميع درجات وطلاب هذا الشهر ولا يمكن استرجاعها.`,
      confirmText: `نعم، استمر في حذف ${modelToDelete.name}`,
      onConfirm: () => onDeleteModel(id),
    });
  };

  // Delete a custom column WITH CONFIRMATION ALERT
  const requestDeleteColumn = (colId: string) => {
    const col = (currentModel.customColumns || []).find((c) => c.id === colId);
    if (!col) return;
    setConfirmDelete({
      isOpen: true,
      title: `تأكيد حذف عمود (${col.name})`,
      message: `هل أنت متأكد من الاستمرار في حذف عمود (${col.name})؟ سيتم حذف جميع درجات الطلاب المسجلة في هذا الحقل نهائياً.`,
      confirmText: `نعم، استمر في حذف (${col.name})`,
      onConfirm: () => {
        onUpdateModel({
          ...currentModel,
          customColumns: (currentModel.customColumns || []).filter((c) => c.id !== colId),
          updatedAt: new Date().toISOString(),
        });
      },
    });
  };

  const normalizeArabicName = (str: string): string => {
    return (str || '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleBatchImport = (
    importedRows: Partial<StudentRow>[],
    options?: {
      updateExisting?: boolean;
      newCustomColumns?: Array<{ name: string; maxScore?: number }>;
    }
  ) => {
    const shouldUpdateExisting = options?.updateExisting !== false;

    // 1) Clean up any existing accidental redundant written column and map custom columns
    let updatedCustomColumns = [...(currentModel.customColumns || [])].filter(
      (c) => !isWrittenScoreColumn(c.name)
    );
    const colNameToIdMap: Record<string, string> = {};

    for (const c of updatedCustomColumns) {
      const norm = normalizeArabicName(c.name);
      colNameToIdMap[c.name] = c.id;
      colNameToIdMap[norm] = c.id;
      colNameToIdMap[norm.replace(/^ال/, '')] = c.id;
    }

    if (options?.newCustomColumns && options.newCustomColumns.length > 0) {
      for (const newCol of options.newCustomColumns) {
        if (!newCol || !newCol.name) continue;

        // Absolutely NEVER create a core column (name, section, grade, written, serial, notes) or synonymous column
        const sem = resolveColumnSemantics(newCol.name, undefined, updatedCustomColumns);
        if (sem.isMatched) {
          if (sem.matchedExistingId) {
            colNameToIdMap[newCol.name] = sem.matchedExistingId;
          }
          continue; // PREVENTS DUPLICATE COLUMNS 100%!
        }

        const normNewCol = normalizeArabicName(newCol.name);
        const strippedNewCol = normNewCol.replace(/^ال/, '');

        const existingCol = updatedCustomColumns.find((c) => {
          const normC = normalizeArabicName(c.name);
          const strippedC = normC.replace(/^ال/, '');
          return normC === normNewCol || c.name === newCol.name || strippedC === strippedNewCol;
        });

        if (existingCol) {
          colNameToIdMap[newCol.name] = existingCol.id;
          colNameToIdMap[normNewCol] = existingCol.id;
          colNameToIdMap[strippedNewCol] = existingCol.id;
        } else {
          const newId = 'col-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
          const defMax = newCol.maxScore || (totalMax === 10 ? 2 : 20);
          updatedCustomColumns.push({
            id: newId,
            name: newCol.name,
            maxScore: defMax,
          });
          colNameToIdMap[newCol.name] = newId;
          colNameToIdMap[normNewCol] = newId;
          colNameToIdMap[strippedNewCol] = newId;
        }
      }
    }

    // Helper to map row.scores (which may contain column names or column ids) to column IDs
    const resolveScores = (rawScores: Record<string, number | null> | undefined) => {
      const result: Record<string, number | null> = {};
      if (!rawScores) return result;
      for (const [key, val] of Object.entries(rawScores)) {
        if (val === null || val === undefined || isNaN(Number(val))) continue;
        const numVal = Number(val);

        // Written exam scores belong exclusively in writtenRawScore, NEVER in student.scores
        if (isWrittenScoreColumn(key) || key === 'written') continue;

        if (updatedCustomColumns.some((c) => c.id === key)) {
          result[key] = numVal;
          continue;
        }
        const normKey = normalizeArabicName(key);
        const strippedKey = normKey.replace(/^ال/, '');
        const mappedId = colNameToIdMap[key] || colNameToIdMap[normKey] || colNameToIdMap[strippedKey];
        if (mappedId) {
          result[mappedId] = numVal;
        } else {
          result[key] = numVal;
        }
      }
      return result;
    };

    // 2) Partition into updates for existing students and new students to append
    // Crucial rule: Matching is strictly BY NAME, regardless of student sequence order in the table
    const currentStudentsCopy = currentModel.students.map((st) => ({
      ...st,
      scores: { ...(st.scores || {}) },
    }));

    const brandNewStudents: StudentRow[] = [];

    for (const row of importedRows) {
      const cleanedRowName = cleanSingleSpaces(row.name || '');
      if (!cleanedRowName) continue;

      let matchedIdx: number = -1;

      if (shouldUpdateExisting) {
        // Priority 1: Exact match after single-space normalization
        matchedIdx = currentStudentsCopy.findIndex(
          (st) => cleanSingleSpaces(st.name) === cleanedRowName
        );

        // Priority 2: Canonical Arabic match (handles differences in أ / ا, ة / ه, ى / ي, tashkeel, etc.)
        if (matchedIdx === -1) {
          const rowCanon = canonicalizeArabic(cleanedRowName);
          matchedIdx = currentStudentsCopy.findIndex(
            (st) => canonicalizeArabic(st.name) === rowCanon
          );
        }

        // Priority 3: Fuzzy / typo match (Levenshtein / OCR confusions like جيدر vs حيدر)
        if (matchedIdx === -1) {
          const suspected = findSuspectedStudentMatch(cleanedRowName, currentStudentsCopy);
          if (suspected && suspected.matchedId) {
            matchedIdx = currentStudentsCopy.findIndex((st) => st.id === suspected.matchedId);
          }
        }
      }

      const resolvedScores = resolveScores(row.scores);
      let writtenScore =
        row.writtenRawScore !== undefined && row.writtenRawScore !== null && !isNaN(Number(row.writtenRawScore))
          ? Number(row.writtenRawScore)
          : null;

      // If writtenRawScore was null but row.scores contained a written exam grade
      if (writtenScore === null && row.scores) {
        for (const [k, v] of Object.entries(row.scores)) {
          if ((isWrittenScoreColumn(k) || k === 'written') && v !== null && v !== undefined && !isNaN(Number(v))) {
            writtenScore = Number(v);
            break;
          }
        }
      }

      const existingGrades = currentStudentsCopy.map((s) => s.gradeLevel).filter(Boolean);
      const existingSections = currentStudentsCopy.map((s) => s.section).filter(Boolean);

      if (matchedIdx !== -1) {
        const target = currentStudentsCopy[matchedIdx];
        if (writtenScore !== null) {
          target.writtenRawScore = writtenScore;
        }
        target.scores = {
          ...target.scores,
          ...resolvedScores,
        };
        if (row.gradeLevel) {
          target.gradeLevel = normalizeGradeLevel(row.gradeLevel, existingGrades);
        }
        if (row.section) {
          target.section = normalizeSection(row.section, existingSections);
        }
        if (row.notes) {
          target.notes = row.notes;
        }
      } else {
        const resolvedGrade = normalizeGradeLevel(
          row.gradeLevel || currentModel.gradeLevel || currentModel.students[0]?.gradeLevel || 'الصف الدراسي',
          existingGrades
        );
        const resolvedSection = normalizeSection(
          row.section || (allSections[0] || 'أ'),
          existingSections
        );
        const newSt: StudentRow = {
          id: 'st-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          name: cleanedRowName,
          gradeLevel: resolvedGrade,
          section: resolvedSection,
          writtenRawScore: writtenScore,
          scores: resolvedScores,
          notes: row.notes || '',
        };
        brandNewStudents.push(newSt);
      }
    }

    const finalStudents = [...currentStudentsCopy, ...brandNewStudents];

    // Find the detected grade from imported students
    const detectedImportGrade = finalStudents.find((s) => s.gradeLevel?.trim())?.gradeLevel?.trim();

    // 3) Update models
    if (onUpdateAllModels) {
      const updatedModels = models.map((m) => {
        const isCurrent = m.id === currentModel.id;
        const currentGrade = isCurrent && !m.gradeLevel?.trim() && detectedImportGrade ? detectedImportGrade : m.gradeLevel;
        return {
          ...m,
          gradeLevel: currentGrade,
          customColumns: isCurrent ? updatedCustomColumns : m.customColumns,
          students: isCurrent
            ? finalStudents
            : [
                ...m.students,
                ...brandNewStudents
                  .filter((st) => {
                    const gradeMatches = !m.gradeLevel || !st.gradeLevel || isGradeLevelMatch(m.gradeLevel, st.gradeLevel);
                    const sectionMatches = !m.assignedSections || m.assignedSections.length === 0 ||
                      m.assignedSections.some((sec) => isSectionMatch(sec, st.section || 'أ'));
                    return gradeMatches && sectionMatches;
                  })
                  .map((st) => ({
                    id: st.id,
                    name: st.name,
                    gradeLevel: st.gradeLevel,
                    section: st.section,
                    writtenRawScore: null,
                    scores: {},
                    notes: '',
                  })),
              ],
          updatedAt: new Date().toISOString(),
        };
      });
      onUpdateAllModels(updatedModels);
    } else {
      const currentGrade = !currentModel.gradeLevel?.trim() && detectedImportGrade ? detectedImportGrade : currentModel.gradeLevel;
      onUpdateModel({
        ...currentModel,
        gradeLevel: currentGrade,
        customColumns: updatedCustomColumns,
        students: finalStudents,
        updatedAt: new Date().toISOString(),
      });
    }

    // Save added grades in localStorage for persistent access in CreateModelModal
    finalStudents.forEach((st) => {
      const g = st.gradeLevel?.trim();
      if (g) {
        try {
          const raw = localStorage.getItem('gradebook_user_grades');
          const existing: string[] = raw ? JSON.parse(raw) : [];
          if (!existing.some((eg) => canonicalizeArabic(eg) === canonicalizeArabic(g))) {
            localStorage.setItem('gradebook_user_grades', JSON.stringify([g, ...existing]));
          }
          localStorage.setItem('gradebook_last_selected_grade', g);
        } catch {}
      }
    });
  };

  // Add new custom column (handles both standard grade columns and special attendance column)
  const handleAddNewColumn = (nameToAdd?: string, maxToAdd?: number): string | undefined => {
    const name = (nameToAdd || newColName).trim();
    if (!name) return undefined;

    const isAttendance = isAttendanceMode || name.includes('الغياب') || name.includes('الحضور');

    if (isAttendance) {
      const newColId = 'col-att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const newCol: CustomColumn = {
        id: newColId,
        name: name || 'الغياب والحضور',
        maxScore: 0,
        isAttendance: true,
        attendanceConfig: {
          affectsGrade: attendanceAffectsGrade,
          present: { action: presentAction, points: Number(presentPoints) || 0 },
          excused: { action: excusedAction, points: Number(excusedPoints) || 0 },
          absent: { action: absentAction, points: Number(absentPoints) || 0 },
          importedFromModelIds: attendanceCrossMonthMode === 'merge' ? selectedPriorModelIds : [],
        },
      };

      // If merging from previous months, populate student attendance records
      let updatedStudents = [...currentModel.students];
      if (attendanceCrossMonthMode === 'merge' && selectedPriorModelIds.length > 0) {
        updatedStudents = updatedStudents.map((st) => {
          const mergedRecords: AttendanceRecord[] = [];
          for (const pModelId of selectedPriorModelIds) {
            const pModel = models.find((m) => m.id === pModelId);
            if (!pModel) continue;
            const pStudent = pModel.students?.find(
              (s) => s.id === st.id || cleanSingleSpaces(s.name) === cleanSingleSpaces(st.name)
            );
            if (!pStudent || !pStudent.attendanceRecords) continue;
            for (const [colId, recs] of Object.entries(pStudent.attendanceRecords)) {
              const pCol = pModel.customColumns?.find((c) => c.id === colId && c.isAttendance);
              if (pCol && Array.isArray(recs)) {
                mergedRecords.push(
                  ...recs.map((r) => ({
                    ...r,
                    id: 'imp-' + r.id + '-' + Math.random().toString(36).substring(2, 6),
                    modelId: pModel.id,
                    modelName: pModel.name,
                  }))
                );
              }
            }
          }

          if (mergedRecords.length > 0) {
            return {
              ...st,
              attendanceRecords: {
                ...(st.attendanceRecords || {}),
                [newColId]: mergedRecords,
              },
            };
          }
          return st;
        });
      }

      onUpdateModel({
        ...currentModel,
        students: updatedStudents,
        customColumns: [...(currentModel.customColumns || []), newCol],
        updatedAt: new Date().toISOString(),
      });

      setNewColName('');
      setIsAddingColumn(false);
      setIsAttendanceMode(false);
      return newColId;
    }

    const max = maxToAdd !== undefined ? maxToAdd : newColMax;
    const newCol: CustomColumn = {
      id: 'col-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name,
      maxScore: Number(max) || (totalMax === 10 ? 2 : 10),
    };

    onUpdateModel({
      ...currentModel,
      writtenWeight: null, // Clear any manual weight so calculation is always automatic
      customColumns: [...(currentModel.customColumns || []), newCol],
      updatedAt: new Date().toISOString(),
    });

    setNewColName('');
    const suggested = totalMax === 10 ? 2 : totalMax === 100 ? 20 : Math.max(1, Math.round(totalMax * 0.2));
    setNewColMax(suggested);
    setIsAddingColumn(false);
    return newCol.id;
  };

  const handleSaveStudentAttendance = (
    studentId: string,
    columnId: string,
    records: AttendanceRecord[]
  ) => {
    const updatedStudents = currentModel.students.map((st) => {
      if (st.id !== studentId) return st;
      return {
        ...st,
        attendanceRecords: {
          ...(st.attendanceRecords || {}),
          [columnId]: records,
        },
      };
    });

    onUpdateModel({
      ...currentModel,
      students: updatedStudents,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete a custom column DIRECTLY
  const handleDeleteColumn = (colId: string) => {
    onUpdateModel({
      ...currentModel,
      writtenWeight: null,
      customColumns: (currentModel.customColumns || []).filter((c) => c.id !== colId),
      updatedAt: new Date().toISOString(),
    });
  };

  // Quick preset columns based on totalMax (10 or 100 or custom)
  const presets = totalMax === 10 ? [
    { name: 'درجة الشفهي', max: 2 },
    { name: 'المشاركة والنشاط', max: 1 },
    { name: 'الواجبات اليومية', max: 1 },
    { name: 'السلوك والمواظبة', max: 1 },
  ] : [
    { name: 'درجة الشفهي', max: 20 },
    { name: 'المشاركة والنشاط', max: 10 },
    { name: 'الواجبات اليومية', max: 10 },
    { name: 'السلوك والمواظبة', max: 10 },
  ];


  // Distinct raw grade levels present in the relevant students array
  const allDistinctGradeLevels: string[] = [];
  const seenDistinctGrades = new Set<string>();
  relevantModelStudents.forEach((s) => {
    const g = (s.gradeLevel || currentModel.gradeLevel || "الصف الدراسي").trim();
    if (!seenDistinctGrades.has(g)) {
      seenDistinctGrades.add(g);
      allDistinctGradeLevels.push(g);
    }
  });

  // Sections for the currently managed grade in GradeRenameMergeModal
  const sectionsForManagingGrade: string[] = managingGrade
    ? Array.from(
        new Set(
          relevantModelStudents
            .filter((s) => (s.gradeLevel || "").trim() === managingGrade.trim())
            .map((s) => (s.section || "أ").trim())
        )
      )
    : [];

  const studentCountForManagingGrade: number = managingGrade
    ? relevantModelStudents.filter(
        (s) => (s.gradeLevel || "").trim() === managingGrade.trim()
      ).length
    : 0;

  const gradeStudentCounts: Record<string, number> = {};
  relevantModelStudents.forEach((s) => {
    const g = (s.gradeLevel || currentModel.gradeLevel || "الصف الدراسي").trim();
    gradeStudentCounts[g] = (gradeStudentCounts[g] || 0) + 1;
  });
  const handleSelectClassAndSection = (gradeLevel: string, section: string | 'ALL') => {
    setSelectedGradeLevel(gradeLevel);
    setSelectedSection(section);
  };

  const handleRenameGrade = (oldGrade: string, newGrade: string) => {
    if (!newGrade.trim() || oldGrade.trim() === newGrade.trim()) return;
    const targetGrade = newGrade.trim();

    if (onUpdateAllModels) {
      const updatedModels = models.map((m) => ({
        ...m,
        students: m.students.map((st) =>
          (st.gradeLevel || '').trim() === oldGrade.trim()
            ? { ...st, gradeLevel: targetGrade }
            : st
        ),
        updatedAt: new Date().toISOString(),
      }));
      onUpdateAllModels(updatedModels);
    } else {
      const updatedStudents = currentModel.students.map((st) =>
        (st.gradeLevel || '').trim() === oldGrade.trim()
          ? { ...st, gradeLevel: targetGrade }
          : st
      );
      onUpdateModel({
        ...currentModel,
        students: updatedStudents,
        updatedAt: new Date().toISOString(),
      });
    }

    if (selectedGradeLevel === oldGrade) {
      setSelectedGradeLevel(targetGrade);
    }
  };

  const handleMergeGrade = (sourceGrade: string, targetGrade: string) => {
    if (!sourceGrade || !targetGrade || sourceGrade.trim() === targetGrade.trim()) return;

    if (onUpdateAllModels) {
      const updatedModels = models.map((m) => ({
        ...m,
        students: m.students.map((st) =>
          (st.gradeLevel || '').trim() === sourceGrade.trim()
            ? { ...st, gradeLevel: targetGrade.trim() }
            : st
        ),
        updatedAt: new Date().toISOString(),
      }));
      onUpdateAllModels(updatedModels);
    } else {
      const updatedStudents = currentModel.students.map((st) =>
        (st.gradeLevel || '').trim() === sourceGrade.trim()
          ? { ...st, gradeLevel: targetGrade.trim() }
          : st
      );
      onUpdateModel({
        ...currentModel,
        students: updatedStudents,
        updatedAt: new Date().toISOString(),
      });
    }

    if (selectedGradeLevel === sourceGrade) {
      setSelectedGradeLevel(targetGrade);
    }
  };

  const handleRenameSection = (grade: string, oldSection: string, newSection: string) => {
    const targetSec = newSection.trim();
    if (!targetSec || targetSec === oldSection.trim()) return;

    if (onUpdateAllModels) {
      const updatedModels = models.map((m) => ({
        ...m,
        students: m.students.map((st) =>
          (st.gradeLevel || '').trim() === grade.trim() && (st.section || '').trim() === oldSection.trim()
            ? { ...st, section: targetSec }
            : st
        ),
        updatedAt: new Date().toISOString(),
      }));
      onUpdateAllModels(updatedModels);
    } else {
      const updatedStudents = currentModel.students.map((st) =>
        (st.gradeLevel || '').trim() === grade.trim() && (st.section || '').trim() === oldSection.trim()
          ? { ...st, section: targetSec }
          : st
      );
      onUpdateModel({
        ...currentModel,
        students: updatedStudents,
        updatedAt: new Date().toISOString(),
      });
    }

    if (selectedSection === oldSection) {
      setSelectedSection(targetSec);
    }
  };


  const hasStudents = relevantModelStudents.length > 0;

  // Export to CSV
  const handleExportCSV = () => {
    const isRelative = writtenScoreMode === 'relative';
    const exportGradeLabel = gradeLevelLabel === 'الصف' ? 'الصف الدراسي' : gradeLevelLabel;
    const exportSectionLabel = 'الشعبة';
    const exportWrittenLabel = 'التحريري';
    const effectiveTotalMax = getEffectiveTotalMax(currentModel);
    const finalOpLabel = getOperationLabel(currentModel.finalScoreOperation);
    const exportFinalScoreLabel = finalOpLabel
      ? `النهائي (${finalOpLabel}) من ${effectiveTotalMax}`
      : `النهائي (من ${effectiveTotalMax})`;

    const headers = [
      'م',
      studentNameLabel,
      exportGradeLabel,
      exportSectionLabel,
      exportWrittenLabel,
      ...(isRelative && customSum > 0 ? [`درجة التحريري المحسوبة (من ${effectiveWrittenWeight})`] : []),
      ...(currentModel.customColumns || []).map((c) => `${c.name} (من ${c.maxScore})`),
      exportFinalScoreLabel,
      ratingLabel,
    ];

    const rows = filteredStudents.map((st, idx) => {
      const writtenCalc = calculateWrittenScore(
        st.writtenRawScore,
        currentModel.writtenMaxScore,
        effectiveWrittenWeight,
        currentModel.totalMaxScore,
        writtenScoreMode
      );
      const total = calculateStudentMonthlyTotal(st, currentModel);
      const rating = getRatingDetails(total, effectiveTotalMax);

      return [
        idx + 1,
        `"${st.name}"`,
        `"${st.gradeLevel}"`,
        `"${st.section}"`,
        st.writtenRawScore ?? '',
        ...(isRelative && customSum > 0 ? [writtenCalc ?? ''] : []),
        ...(currentModel.customColumns || []).map((c) => st.scores[c.id] ?? ''),
        total ?? '',
        `"${rating.text}"`,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `درجات_${currentModel.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prompt user before exporting CSV/Excel
  const requestExportCSV = () => {
    setActionPrompt({
      isOpen: true,
      title: `تنزيل كشف درجات (${currentModel.name})`,
      message: `أنت على وشك تصدير وتنزيل درجات نموذج (${currentModel.name}) بجميع أعمدته المحسوبة ودرجات الطلاب بصيغة ملف Excel (CSV).`,
      confirmText: 'تنزيل الملف الآن',
      confirmColor: 'bg-[#487B5D] hover:bg-[#3C684E]',
      icon: <FileSpreadsheet className="w-5 h-5 text-[#3E7D59]" />,
      onConfirm: () => {
        handleExportCSV();
        setActionPrompt(null);
      },
    });
  };

  // Prompt user before printing
  const requestPrint = () => {
    setActionPrompt({
      isOpen: true,
      title: `طباعة كشف درجات (${currentModel.name})`,
      message: `أنت على وشك فتح نافذة طباعة كشف درجات نموذج (${currentModel.name}) بكافة تفاصيل الطلاب والدرجات.`,
      confirmText: 'بدء الطباعة',
      confirmColor: 'bg-[#557A95] hover:bg-[#476A84]',
      icon: <Printer className="w-5 h-5 text-[#557A95]" />,
      onConfirm: () => {
        setActionPrompt(null);
        setTimeout(() => window.print(), 100);
      },
    });
  };

  return (
    <div className="space-y-3.5">
      {viewMode === 'interactive' ? (
        <InteractiveClassroomView
          model={currentModel}
          allGradeLevels={allGradeLevels}
          allSections={allSections}
          selectedGradeLevel={selectedGradeLevel}
          selectedSection={selectedSection}
          onSelectGrade={setSelectedGradeLevel}
          onSelectSection={setSelectedSection}
          onUpdateStudent={handleUpdateStudent}
          onAddNewColumn={handleAddNewColumn}
          onSwitchToTableView={() => setViewMode('table')}
        />
      ) : (
        <>
          {/* 1. Large Craft Camel Brown "+ جدول درجات جديد" Button */}
          <div className="no-print space-y-2.5">
            <button
              type="button"
              onClick={() => setIsCreateModelOpen(true)}
              className="w-full py-3.5 px-6 craft-btn-primary active:scale-[0.99] rounded-2xl text-base sm:text-lg font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
              title={`جدول درجات جديد لمادة ${profile.subject || 'المادة'}`}
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>جدول درجات جديد</span>
            </button>

            {/* يظهر زر إضافة الطلاب تحت جدول درجات جديد فقط عندما لا يوجد طلاب مضافين بعد (عند بداية العمل بعد ملء بيانات المعلم)، ويختفي نهائياً بمجرد إضافة الطلاب */}
            {currentModel.students.length === 0 && (
              <button
                type="button"
                onClick={() => setIsBatchImportOpen(true)}
                className="w-full py-3.5 px-6 bg-[#3E6D52] hover:bg-[#325842] active:scale-[0.99] text-white rounded-2xl text-base sm:text-lg font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs border border-[#30553F] animate-in fade-in duration-200"
                title="إضافة أو استيراد كشف أسماء الطلاب"
              >
                <UserPlus className="w-5 h-5 stroke-[2.5]" />
                <span>+ إضافة طلاب لهذا النموذج</span>
              </button>
            )}
          </div>

          {/* 2. Model Tabs Card with Month Buttons & Dropdown Filters */}
          <div className="craft-card p-3 sm:p-4 rounded-2xl shadow-xs no-print">
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 max-w-full">
              {displayedModels.map((model) => {
                const isActive = model.id === currentModel.id;
                return (
                  <div key={model.id} className="relative inline-flex shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectModel(model.id);
                        if (model.gradeLevel) {
                          setSelectedGradeLevel(model.gradeLevel);
                        }
                        setSelectedSection('ALL');
                      }}
                      onDoubleClick={() => setEditingModelForRename(model)}
                      className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 flex-wrap ${
                        isActive
                          ? 'bg-[#BA916C] text-white border border-[#9E7752] shadow-sm'
                          : 'bg-[#EBDDC8] hover:bg-[#E0CFB8] text-[#3D2E21] border border-[#CBB69F]'
                      }`}
                      title={
                        isActive
                          ? 'انقر لتحديد أو نقرتين لتعديل الاسم والصف والمادة والأستاذ'
                          : `${model.name}${model.gradeLevel ? ` ${model.gradeLevel}` : ''}${model.subject ? ` ${model.subject}` : ''}${model.teacherName ? ` ${model.teacherName}` : ''}`
                      }
                    >
                      <span>{model.name}</span>
                      {model.gradeLevel && (
                        <span className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-white/25 text-white border border-white/30'
                            : 'bg-white/60 text-[#3D2E21] border border-[#CBB69F]'
                        }`}>
                          {model.gradeLevel}
                        </span>
                      )}
                      {model.subject && (
                        <span className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-black/20 text-amber-100 border border-white/20'
                            : 'bg-black/10 text-[#544030] border border-[#D5C2AA]'
                        }`}>
                          {model.subject}
                        </span>
                      )}
                      {model.teacherName && (
                        <span className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-white/30 text-white border border-white/40'
                            : 'bg-indigo-100/80 text-indigo-950 border border-indigo-300'
                        }`}>
                          {model.teacherName}
                        </span>
                      )}
                      {model.assignedSections && model.assignedSections.length > 0 && (
                        <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                          isActive
                            ? 'bg-black/25 text-amber-200'
                            : 'bg-slate-200/90 text-slate-700 border border-slate-300'
                        }`}>
                          ({model.assignedSections.join('، ')})
                        </span>
                      )}
                    </button>

                    {/* Blue Pencil Edit button sitting on top-right of the active model button */}
                    {isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingModelForRename(model);
                        }}
                        className="absolute -top-2.5 -right-2 sm:-right-2.5 w-6 h-6 rounded-full bg-[#5692BE] hover:bg-[#437A9F] text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
                        title={`تعديل اسم نموذج ${model.name} والمادة`}
                        aria-label={`تعديل اسم نموذج ${model.name}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}

                    {/* Red Trash button sitting on top of the active model button */}
                    {isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteModel(model.id);
                        }}
                        className="absolute -top-2.5 -left-2 sm:-left-2.5 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
                        title={`حذف نموذج ${model.name}`}
                        aria-label={`حذف نموذج ${model.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {displayedModels.length === 0 && (
                <div className="text-xs text-[#7A6A58] py-2 px-3 font-semibold text-center w-full">
                  لا توجد نماذج أشهر مطابقة للصف أو المادة المحددة في الفرز.
                </div>
              )}
            </div>

            {/* Two Dropdown Menus for filtering the Month buttons above */}
            {(availableGradesForFilter.length > 0 || availableSubjectsForFilter.length > 0) && (
              <div className="pt-2.5 mt-2.5 border-t border-[#CBB69F]/50 flex items-center justify-between gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap">
                  <span className="text-xs font-bold text-[#6D4C2F] flex items-center gap-1.5 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-[#BA916C]" />
                    <span>تصفية أزرار الأشهر:</span>
                  </span>

                  {/* 1. قائمة منبثقة للصف الدراسي */}
                  {availableGradesForFilter.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-bold text-[#7A6A58] shrink-0 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[#BA916C]" />
                        <span>الصف:</span>
                      </label>
                      <select
                        value={selectedGradeFilter}
                        onChange={(e) => setSelectedGradeFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-[#CBB69F] rounded-xl text-xs font-bold text-[#3D2E21] focus:ring-2 focus:ring-[#BA916C] focus:outline-none cursor-pointer shadow-2xs hover:border-[#BA916C] transition-colors"
                      >
                        <option value="ALL">جميع الصفوف ({models.length})</option>
                        {availableGradesForFilter.map((grade) => {
                          const count = models.filter((m) =>
                            isGradeLevelMatch(m.gradeLevel || '', grade)
                          ).length;
                          return (
                            <option key={grade} value={grade}>
                              {grade} ({count})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* 2. قائمة منبثقة لمادة الدرس */}
                  {availableSubjectsForFilter.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-bold text-[#7A6A58] shrink-0 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#BA916C]" />
                        <span>مادة الدرس:</span>
                      </label>
                      <select
                        value={selectedSubjectFilter}
                        onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-[#CBB69F] rounded-xl text-xs font-bold text-[#3D2E21] focus:ring-2 focus:ring-[#BA916C] focus:outline-none cursor-pointer shadow-2xs hover:border-[#BA916C] transition-colors"
                      >
                        <option value="ALL">جميع المواد</option>
                        {availableSubjectsForFilter.map((subj) => {
                          const count = models.filter((m) =>
                            canonicalizeArabic(m.subject || profile.subject || '') ===
                            canonicalizeArabic(subj)
                          ).length;
                          return (
                            <option key={subj} value={subj}>
                              {subj} ({count})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* زر إعادة ضبط سريع إذا كانت الفلترة مفعلة */}
                  {(selectedGradeFilter !== 'ALL' || selectedSubjectFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGradeFilter('ALL');
                        setSelectedSubjectFilter('ALL');
                      }}
                      className="text-[11px] text-[#7A6A58] hover:text-[#3D2E21] bg-white/70 hover:bg-white border border-[#CBB69F] px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="إعادة ضبط الفرز وإظهار جميع النماذج"
                    >
                      <X className="w-3 h-3 text-red-500" />
                      <span>عرض الكل</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-bold text-[#7A6A58]">
                  المعروض: {displayedModels.length} من {models.length}
                </div>
              </div>
            )}
          </div>

          {/* 3. Main Gradebook Card - Header with Title, "+ إضافة حقل" button, Print/Export */}
          <div className="craft-card rounded-2xl shadow-xs overflow-hidden">
            {/* Table Title Bar */}
            <div className="w-full px-3.5 py-3 sm:px-5 sm:py-3.5 bg-[#F8F4EA] border-b border-[#D8CEBD] flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap no-print">
              {/* Right: Title, Month Name, inline Edit button, and Class/Section badge */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-[#2F2822] truncate flex items-center gap-1.5 flex-wrap">
                    <span>كشف درجات:</span>
                    <span className="text-[#4A82A8] font-black">{currentModel.name}</span>
                    {currentModel.gradeLevel && (
                      <span className="text-[#3A6C8F] font-black text-xs sm:text-sm bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                        {currentModel.gradeLevel}
                      </span>
                    )}
                    {currentModel.subject && (
                      <span className="text-emerald-800 font-extrabold text-xs sm:text-sm bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-lg">
                        {currentModel.subject}
                      </span>
                    )}
                    {currentModel.teacherName && (
                      <span className="text-indigo-900 font-extrabold text-xs sm:text-sm bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-indigo-700" />
                        <span>الأستاذ: {currentModel.teacherName}</span>
                      </span>
                    )}
                    {currentModel.assignedSections && currentModel.assignedSections.length > 0 && (
                      <span className="text-amber-900 font-bold text-xs bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                        الشُعب: {currentModel.assignedSections.join('، ')}
                      </span>
                    )}
                  </h3>
                  {/* تعديل الاسم والمادة والأستاذ بنفس السطر بشكل أنيق ومدمج */}
                  <button
                    type="button"
                    onClick={() => setEditingModelForRename(currentModel)}
                    className="px-2 py-0.5 text-[11px] font-bold text-[#6D4C2F] hover:text-[#4A2818] bg-[#EBDDC8] hover:bg-[#E0CFB8] border border-[#CBB69F] rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                    title="تعديل اسم هذا النموذج أو المادة أو الأستاذ"
                  >
                    <Pencil className="w-2.5 h-2.5 text-[#BA916C]" />
                    <span>تعديل الاسم والمادة والأستاذ</span>
                  </button>

                  {/* زر تبديل وتعديل الشُعب بين الأساتذة (خاص بالإدارة أو عند تعدد الأساتذة) */}
                  {(currentUser?.userRole === 'admin_school' || Boolean(currentModel.teacherName)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSwapInitialGrade(currentModel.gradeLevel);
                        setSwapInitialSubject(currentModel.subject);
                        setIsSectionsSwapOpen(true);
                      }}
                      className="px-2 py-0.5 text-[11px] font-black text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs active:scale-95"
                      title="تبديل أو إعادة توزيع الشُعب بين الأساتذة عند وجود خطأ في التعيين"
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5 text-indigo-600" />
                      <span>تبديل الشُعب بين الأساتذة</span>
                    </button>
                  )}
                </div>

                {/* الصف الدراسي والشُعب المتاحة بالجدول للفلترة الفورية */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/95 border-2 border-[#BA916C]/40 rounded-xl shadow-2xs text-xs sm:text-sm font-black text-[#2F2822] flex-wrap">
                  <span className="text-[#3A6C8F] font-black px-1">
                    {currentModel.gradeLevel || (selectedGradeLevel === "ALL" ? "جميع الصفوف" : selectedGradeLevel)}
                  </span>
                  <span className="text-[#BA916C] font-bold select-none">•</span>

                  {/* أزرار الشُعب: جميع الشُعب + أ + ب ... */}
                  <div className="inline-flex items-center gap-1 bg-[#F8F4EA] p-0.5 rounded-lg border border-[#D8CEBD]">
                    <button
                      type="button"
                      onClick={() => setSelectedSection('ALL')}
                      className={`px-2 py-0.5 rounded-md text-xs font-black transition-all cursor-pointer ${
                        selectedSection === 'ALL'
                          ? 'bg-[#BA916C] text-white shadow-2xs'
                          : 'text-[#6D4C2F] hover:bg-[#EBDDC8] hover:text-[#3D2612]'
                      }`}
                      title="عرض جميع الشُعب"
                    >
                      جميع الشُعب
                    </button>
                    {allSections.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSelectedSection(sec)}
                        className={`px-2 py-0.5 rounded-md text-xs font-black transition-all cursor-pointer ${
                          selectedSection === sec
                            ? 'bg-[#3A6C8F] text-white shadow-2xs'
                            : 'text-[#554A3E] hover:bg-[#EBDDC8] hover:text-[#2F2822]'
                        }`}
                        title={`عرض طلاب شعبة ${sec}`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Left: Opposite to the title - Clean View, Classroom View, Rename Columns, Print & Download Excel */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">

                    {/* Fullscreen Clean Table View button (الجدول الصافي مع التمرير الأفقي بدون أي أزرار) */}
                    <button
                      type="button"
                      onClick={() => setIsCleanTableView(true)}
                      className="px-2.5 py-1.5 sm:py-2 text-[#4A2818] hover:text-[#2F2822] bg-[#FAF2EB] hover:bg-[#F2E4D8] border border-[#D8BEB0] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                      title="عرض الجدول بملء الشاشة مع التمرير الأفقي وبدون أي أزرار"
                      aria-label="عرض الجدول بملء الشاشة"
                    >
                      <Maximize2 className="w-4 h-4 text-[#BA916C]" />
                      <span className="text-xs font-bold hidden sm:inline">عرض الجدول الصافي (أفقي)</span>
                    </button>

                {/* Switch to Interactive Classroom View button */}
                <button
                  type="button"
                  onClick={() => setViewMode('interactive')}
                  className="px-2.5 py-1.5 sm:py-2 text-emerald-900 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                  title="الانتقال إلى العرض التفاعلي للصف (الامتحان الشفهي)"
                  aria-label="الانتقال إلى الصف التفاعلي"
                >
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold hidden sm:inline">الصف التفاعلي (الشفهي)</span>
                </button>

                {/* Rename Columns button */}
                <button
                  type="button"
                  onClick={() => setIsRenameColumnsModalOpen(true)}
                  className="px-2.5 py-1.5 sm:py-2 text-[#1E293B] hover:text-[#2B6CB0] bg-white hover:bg-slate-100 border border-[#CBD5E1] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                  title="إعادة تسمية عناوين أعمدة الجدول"
                  aria-label="إعادة تسمية عناوين أعمدة الجدول"
                >
                  <PenLine className="w-4 h-4 text-[#2B6CB0]" />
                  <span className="text-xs font-bold hidden sm:inline">تسمية الأعمدة</span>
                </button>

            {/* Person Head Icon Button: Opens Add / Import Students Modal - أيقونة بدون كتابة */}
            <button
              type="button"
              onClick={() => setIsBatchImportOpen(true)}
              className="p-2 sm:p-2.5 rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0 bg-[#FAF2EB] hover:bg-[#F2E4D8] text-[#4A2818] border border-[#D8BEB0]"
              title="إضافة أو استيراد كشف الطلاب"
              aria-label="إضافة أو استيراد كشف الطلاب"
            >
              <UserPlus className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#BA916C]" />
            </button>

            {/* GitMerge button: تعديل أو دمج اسم الصف والشعب - مباشرة قبل أيقونة الطباعة */}
            <button
              type="button"
              onClick={() =>
                setManagingGrade(
                  currentModel.gradeLevel ||
                    (selectedGradeLevel !== 'ALL'
                      ? selectedGradeLevel
                      : userEnteredGrades[0] || 'الصف الأول')
                )
              }
              className="p-2 sm:p-2.5 text-[#4A2818] hover:text-[#2F2822] bg-[#FAF2EB] hover:bg-[#F2E4D8] border border-[#D8BEB0] rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title="تعديل أو دمج اسم الصف والشعب"
              aria-label="تعديل أو دمج اسم الصف والشعب"
            >
              <GitMerge className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#BA916C]" />
            </button>

            {/* Print icon only */}
            <button
              type="button"
              onClick={requestPrint}
              className="p-2 sm:p-2.5 text-[#334155] hover:text-[#2B6CB0] bg-white hover:bg-slate-100 border border-[#CBD5E1] rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title={`طباعة كشف درجات ${currentModel.name}`}
              aria-label={`طباعة كشف درجات ${currentModel.name}`}
            >
              <Printer className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#2B6CB0]" />
            </button>

            {/* Download Document icon only */}
            <button
              type="button"
              onClick={requestExportCSV}
              className="p-2 sm:p-2.5 text-[#15803D] hover:text-[#166534] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-emerald-300 rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title={`تنزيل مستند درجات ${currentModel.name} بصيغة Excel`}
              aria-label={`تنزيل مستند درجات ${currentModel.name} بصيغة Excel`}
            >
              <FileSpreadsheet className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#15803D]" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Header */}
        <div className="hidden print:block p-3 px-4 mb-2 border-b-2 border-slate-900 text-center">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
            <span>{profile.schoolName || 'المدرسة'}</span>
            <span className="text-base font-black text-slate-900">
              كشف درجات {currentModel.name} {currentModel.subject ? `(${currentModel.subject})` : ''}
            </span>
            <span>السنة الدراسية: {currentModel.academicYear || profile.academicYear}</span>
          </div>
          {(currentModel.teacherName || profile.teacherName) && (
            <div className="text-[11px] text-slate-600 font-semibold">
              المعلم: {currentModel.teacherName || profile.teacherName} {currentModel.subject ? `• المادة: ${currentModel.subject}` : ''} {currentModel.gradeLevel ? `• الصف: ${currentModel.gradeLevel}` : ''}
            </div>
          )}
        </div>

        {/* Excel-style Table Grid with Paper & Craft Theme */}
        <div
          ref={tableContainerRef}
          onScroll={checkNameColumnVisibility}
          className="overflow-x-auto transition-all"
        >
          <table className="w-full text-right border-collapse border border-[#D5C8B2] bg-[#FAF7EC]">
            <thead>
              <tr className="bg-[#EFE8D8] text-[#2F2822] text-xs font-bold">
                {/* Delete Student Row Action at Start of Table */}
                <th
                  className="py-2.5 px-2 w-10 text-center align-middle text-[#9C3838] font-bold bg-[#EFE8D8] border border-[#D5C8B2] no-print print:hidden"
                  title="حذف صف الطالب من الجدول"
                >
                  <div className="craft-table-header px-1 py-0.5 rounded-lg text-center font-bold text-[11px]">حذف</div>
                </th>

                {/* Index */}
                <th className="py-2.5 px-2 w-9 text-center align-middle text-[#2F2822] font-bold bg-[#EFE8D8] border border-[#D5C8B2]">
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={`craft-table-header px-1 py-0.5 rounded-lg text-center font-bold text-[11px] ${getSlantClasses(columnSlants['index'])}`}>#</span>
                    <SlantButton slant={columnSlants['index']} onToggle={() => toggleColumnSlant('index')} />
                  </div>
                </th>

                {/* Student Name header */}
                <th data-student-name-column="true" className={`py-2 px-3 min-w-[200px] align-top bg-[#EFE8D8] border border-[#D5C8B2] ${columnSlants['studentName'] === 'vertical' ? 'min-w-[70px]' : ''}`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      {editingColumnKey === 'studentName' ? (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            autoFocus
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineColumnRename('studentName');
                              if (e.key === 'Escape') setEditingColumnKey(null);
                            }}
                            className="w-full px-1.5 py-0.5 text-xs font-bold bg-white border border-[#BA916C] rounded focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineColumnRename('studentName')}
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                            title="حفظ"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingColumnKey(null)}
                            className="p-1 text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group/header">
                          <span className={`craft-table-header px-2.5 py-0.5 rounded-lg font-bold text-[#2F2822] inline-block ${getSlantClasses(columnSlants['studentName'])}`}>{studentNameLabel}</span>
                          <button
                            type="button"
                            onClick={() => handleStartInlineEdit('studentName', studentNameLabel)}
                            className="opacity-40 hover:opacity-100 p-0.5 text-[#6B5E51] hover:text-[#BA916C] rounded transition-opacity cursor-pointer shrink-0 print:hidden"
                            title="إعادة تسمية عمود اسم الطالب"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <SlantButton slant={columnSlants['studentName']} onToggle={() => toggleColumnSlant('studentName')} />
                        </div>
                      )}
                    </div>
                    {/* Embedded Search Input */}
                    <div className="relative print:hidden">
                      <Search className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="بحث بالاسم..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-8 pl-2 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs font-normal focus:border-[#2B6CB0] focus:ring-1 focus:ring-[#2B6CB0] focus:outline-none placeholder:text-[#94A3B8]"
                      />
                    </div>
                  </div>
                </th>

                {/* Grade Level Column Header with inline dynamic title & small triangle */}
                <th className={`py-1.5 px-1 w-auto min-w-[50px] max-w-[85px] print:w-auto print:min-w-0 print:px-0 text-center align-middle bg-[#EFE8D8] border border-[#D5C8B2] ${columnSlants['gradeLevel'] === 'vertical' ? 'min-w-[40px]' : ''}`}>
                  <div className="flex flex-col items-center justify-center gap-1">
                    {/* Screen edit & filter */}
                    <div className="print:hidden flex items-center justify-center w-full">
                      {editingColumnKey === 'gradeLevel' ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineColumnRename('gradeLevel');
                              if (e.key === 'Escape') setEditingColumnKey(null);
                            }}
                            className="w-16 px-1 py-0.5 text-xs font-bold bg-white border border-[#BA916C] rounded text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineColumnRename('gradeLevel')}
                            className="p-0.5 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                            title="حفظ"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingColumnKey(null)}
                            className="p-0.5 text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                            title="إلغاء"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 group/header w-full">
                          {/* Top row: Pencil and Slant icons stacked vertically above the dropdown */}
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartInlineEdit('gradeLevel', gradeLevelLabel)}
                              className="p-1 text-[#6B5E51] hover:text-[#BA916C] hover:bg-white/70 border border-slate-300/80 rounded transition-all cursor-pointer shadow-2xs"
                              title="إعادة تسمية عمود الصف"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                            </button>
                            <SlantButton slant={columnSlants['gradeLevel']} onToggle={() => toggleColumnSlant('gradeLevel')} className="p-1" />
                          </div>

                          {/* Relative container with dynamic title + small triangle + invisible native select */}
                          <div className="relative inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/70 hover:bg-white border border-[#D5C8B2] hover:border-[#BA916C] shadow-2xs transition-all cursor-pointer group/grade w-full">
                            <span className={`font-bold text-xs text-[#2F2822] whitespace-nowrap truncate ${getSlantClasses(columnSlants['gradeLevel'])}`}>
                              {selectedGradeLevel === 'ALL' ? gradeLevelLabel : selectedGradeLevel}
                            </span>
                            <ChevronDown className="w-3 h-3 text-[#6B5E51] shrink-0 transition-transform group-hover/grade:translate-y-0.5" />
                            <select
                              value={selectedGradeLevel}
                              onChange={(e) => setSelectedGradeLevel(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                              title="انقر لاختيار الصف أو تصفية الكل"
                            >
                              <option value="ALL">الكل ({gradeLevelLabel})</option>
                              {allGradeLevels.map((grd) => (
                                <option key={grd} value={grd}>
                                  {grd}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Print Only Header: displays selected grade (e.g. الأول متوسط) or الصف الدراسي without dropdown/arrow */}
                    <div className="hidden print:block text-center py-1">
                      <span className={`font-bold text-xs text-[#2F2822] ${getSlantClasses(columnSlants['gradeLevel'])}`}>
                        {selectedGradeLevel === 'ALL'
                          ? (gradeLevelLabel === 'الصف' ? 'الصف الدراسي' : gradeLevelLabel)
                          : selectedGradeLevel}
                      </span>
                    </div>
                  </div>
                </th>

                {/* Section Column - Narrow width, vertical "الشعبة" with letter underneath & small triangle, or vertical "كل الشعب" */}
                <th className="py-1 px-0.5 w-auto min-w-[32px] max-w-[42px] print:w-auto print:min-w-0 print:px-0 text-center align-middle bg-[#EFE8D8] border border-[#D5C8B2]">
                  <div className="flex flex-col items-center justify-center">
                    {/* Screen edit & filter */}
                    <div className="print:hidden flex flex-col items-center w-full">
                      {editingColumnKey === 'section' ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="text"
                            autoFocus
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineColumnRename('section');
                              if (e.key === 'Escape') setEditingColumnKey(null);
                            }}
                            className="w-10 px-0.5 py-0.5 text-xs font-bold bg-white border border-[#BA916C] rounded text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineColumnRename('section')}
                            className="p-0.5 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                            title="حفظ"
                          >
                            <Check className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative flex flex-col items-center justify-center p-1 rounded hover:bg-white/60 transition-colors cursor-pointer group/sec w-full">
                          {selectedSection === 'ALL' ? (
                            /* All Sections: "كل الشعب" displayed vertically */
                            <div className="flex flex-col items-center">
                              <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-xs text-[#2F2822] tracking-wider py-1 select-none leading-tight">
                                كل الشعب
                              </span>
                              <ChevronDown className="w-3 h-3 text-[#6B5E51] mt-0.5 shrink-0 transition-transform group-hover/sec:translate-y-0.5" />
                            </div>
                          ) : (
                            /* Specific Section: "الشعبة" vertically + section letter horizontally underneath */
                            <div className="flex flex-col items-center">
                              <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-xs text-[#2F2822] tracking-wider select-none leading-tight">
                                {sectionLabel}
                              </span>
                              <span className="font-extrabold text-xs text-[#2F2822] mt-0.5 leading-none bg-[#E5D7BE] px-1 py-0.5 rounded shadow-2xs">
                                {selectedSection}
                              </span>
                              <ChevronDown className="w-2.5 h-2.5 text-[#6B5E51] mt-0.5 shrink-0 transition-transform group-hover/sec:translate-y-0.5" />
                            </div>
                          )}

                          {/* Invisible native select overlay for instant selection */}
                          <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            title="انقر لاختيار وتصفية الشعبة"
                          >
                            <option value="ALL">كل الشعب</option>
                            {allSections.map((sec) => (
                              <option key={sec} value={sec}>
                                شعبة {sec}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Print Only Header: Vertical "كل الشعب" or Vertical "الشعبة" with normal horizontal letter underneath */}
                    <div className="hidden print:flex flex-col items-center justify-center text-center py-0.5 leading-tight">
                      {selectedSection === 'ALL' ? (
                        <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-xs text-[#2F2822] tracking-wider py-1 select-none">
                          كل الشعب
                        </span>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-xs text-[#2F2822] tracking-wider select-none">
                            {sectionLabel}
                          </span>
                          <span className="font-bold text-xs text-[#2F2822] mt-0.5 leading-none">
                            {selectedSection}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </th>

                {/* Subject Name Column - اسم المادة */}
                <th className={`py-1.5 px-2 min-w-[85px] max-w-[130px] print:w-auto print:min-w-0 text-center align-middle bg-[#EFE8D8] border border-[#D5C8B2] ${columnSlants['subject'] === 'vertical' ? 'min-w-[45px]' : ''}`}>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="print:hidden flex items-center justify-center gap-1">
                      <span className={`craft-table-header px-1.5 py-0.5 rounded-lg font-bold text-xs text-[#1E3A8A] inline-block ${getSlantClasses(columnSlants['subject'])}`}>
                        المادة
                      </span>
                      <SlantButton slant={columnSlants['subject']} onToggle={() => toggleColumnSlant('subject')} />
                    </div>
                    {/* Print Header */}
                    <div className="hidden print:block text-center py-1">
                      <span className={`font-bold text-xs text-[#2F2822] ${getSlantClasses(columnSlants['subject'])}`}>
                        المادة
                      </span>
                    </div>
                  </div>
                </th>

                {/* Written Exam Header with editable "درجة التحريري بالورقة من [ input ]" and radio mode selector */}
                <th className={`py-2.5 px-3 min-w-[210px] print:min-w-0 bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] text-center align-top ${columnSlants['writtenExam'] === 'vertical' ? 'min-w-[60px]' : ''}`}>
                  <div className="space-y-1.5 print:hidden">
                    {/* Header Top Row: "درجة التحريري بالورقة من" + editable input */}
                    <div className="flex items-center justify-center gap-1.5">
                      {editingColumnKey === 'writtenExam' ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineColumnRename('writtenExam');
                              if (e.key === 'Escape') setEditingColumnKey(null);
                            }}
                            className="w-36 px-1.5 py-0.5 text-xs font-bold bg-white border border-[#2B6CB0] rounded text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineColumnRename('writtenExam')}
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                            title="حفظ"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingColumnKey(null)}
                            className="p-1 text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 group/header">
                          <span className={`font-bold text-xs text-[#1E293B] whitespace-nowrap ${getSlantClasses(columnSlants['writtenExam'])}`}>
                            {writtenExamLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartInlineEdit('writtenExam', writtenExamLabel)}
                            className="opacity-40 hover:opacity-100 p-0.5 text-slate-500 hover:text-[#2B6CB0] rounded transition-opacity cursor-pointer shrink-0"
                            title="إعادة تسمية عنوان عمود التحريري"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <SlantButton slant={columnSlants['writtenExam']} onToggle={() => toggleColumnSlant('writtenExam')} />
                        </div>
                      )}
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={currentModel.writtenMaxScore || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          onUpdateModel({
                            ...currentModel,
                            writtenMaxScore: val,
                            writtenScoreMode: currentModel.writtenScoreMode || 'raw',
                            updatedAt: new Date().toISOString(),
                          });
                        }}
                        className="w-12 px-1 py-0.5 bg-white text-[#1E293B] font-black text-xs rounded-lg border border-[#CBD5E1] shadow-2xs text-center focus:border-[#2B6CB0] focus:ring-1 focus:ring-[#2B6CB0] focus:outline-none"
                        title="تعديل درجة الامتحان التحريري من"
                      />
                    </div>

                    {/* Mode selector option as Radio buttons - STRICTLY HIDDEN ON PRINT */}
                    <div className="pt-1.5 border-t border-[#CBD5E1] text-right space-y-1.5 bg-white/90 p-2 rounded-xl border border-[#CBD5E1]/60 shadow-2xs">
                      <label className={`flex items-center gap-1.5 p-1 rounded-lg cursor-pointer select-none text-[11px] font-bold transition-all ${writtenScoreMode === 'raw' ? 'bg-blue-50 text-[#1E40AF]' : 'text-slate-700 hover:text-[#2B6CB0]'}`}>
                        <input
                          type="radio"
                          name={`writtenScoreMode-${currentModel.id}`}
                          value="raw"
                          checked={writtenScoreMode === 'raw'}
                          onChange={() => handleUpdateScoreMode('raw')}
                          className="text-[#2B6CB0] focus:ring-[#2B6CB0] w-3.5 h-3.5 cursor-pointer accent-[#2B6CB0]"
                        />
                        <span className="leading-tight">الدرجة كما في ورقة الطالب</span>
                      </label>

                      <label className={`flex items-center gap-1.5 p-1 rounded-lg cursor-pointer select-none text-[11px] font-bold transition-all ${writtenScoreMode === 'relative' ? 'bg-blue-50 text-[#1E40AF]' : 'text-slate-700 hover:text-[#2B6CB0]'}`}>
                        <input
                          type="radio"
                          name={`writtenScoreMode-${currentModel.id}`}
                          value="relative"
                          checked={writtenScoreMode === 'relative'}
                          onChange={() => handleUpdateScoreMode('relative')}
                          className="text-[#2B6CB0] focus:ring-[#2B6CB0] w-3.5 h-3.5 cursor-pointer accent-[#2B6CB0]"
                        />
                        <span className="leading-tight">الدرجة النسبية للطالب</span>
                      </label>
                    </div>

                    {/* Header Bottom Row: Info based on selected mode */}
                    <div>
                      {writtenScoreMode === 'relative' ? (
                        customSum > 0 && effectiveWrittenWeight !== currentModel.writtenMaxScore ? (
                          <div className="text-[10px] text-[#2B6CB0] font-semibold leading-tight">
                            (يُحتسب كنسبة من {effectiveWrittenWeight} درجة)
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#2B6CB0] font-semibold leading-tight">
                            (الدرجة النسبية مفعلة)
                          </div>
                        )
                      ) : (
                        <div className="text-[10px] text-emerald-700 font-bold leading-tight">
                          (مفعل تلقائي - كما في الورقة بدون نسبة)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Print Only Header: Strictly ONLY "التحريري" */}
                  <div className="hidden print:block text-center py-1">
                    <span className={`font-bold text-xs text-[#1E293B] ${getSlantClasses(columnSlants['writtenExam'])}`}>
                      التحريري
                    </span>
                  </div>
                </th>

                {/* Optional Custom Columns */}
                {(currentModel.customColumns || []).map((col) => (
                  <th
                    key={col.id}
                    className={`py-2 px-3 min-w-[130px] print:min-w-0 bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] align-top ${columnSlants[col.id] === 'vertical' ? 'min-w-[50px]' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      {editingColumnKey === col.id ? (
                        <div className="flex items-center gap-1 w-full print:hidden">
                          <input
                            type="text"
                            autoFocus
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineCustomColRename(col.id);
                              if (e.key === 'Escape') setEditingColumnKey(null);
                            }}
                            className="w-full px-1.5 py-0.5 text-xs font-bold bg-white border border-[#2B6CB0] rounded focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineCustomColRename(col.id)}
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded shrink-0 cursor-pointer"
                            title="حفظ"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingColumnKey(null)}
                            className="p-1 text-slate-500 hover:bg-slate-200 rounded shrink-0 cursor-pointer"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 min-w-0 group/header">
                            <span className={`font-bold truncate text-[#1E293B] ${getSlantClasses(columnSlants[col.id])}`}>{col.name}</span>
                            <button
                              type="button"
                              onClick={() => handleStartInlineEdit(col.id, col.name)}
                              className="opacity-40 hover:opacity-100 p-0.5 text-slate-500 hover:text-[#2B6CB0] rounded transition-opacity shrink-0 cursor-pointer print:hidden"
                              title={`إعادة تسمية عمود (${col.name})`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <SlantButton slant={columnSlants[col.id]} onToggle={() => toggleColumnSlant(col.id)} />
                          </div>
                          <button
                            type="button"
                            onClick={() => requestDeleteColumn(col.id)}
                            className="p-1 text-[#BD4B4B] hover:text-white hover:bg-[#BD4B4B] bg-[#FBEBEB] rounded-lg transition-colors shrink-0 cursor-pointer print:hidden"
                            title={`حذف عمود (${col.name})`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                    {col.isAttendance ? (
                      <div className="mt-1 space-y-1">
                        <div className="text-[10px] text-emerald-800 font-bold bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.5 rounded text-center">
                          {col.attendanceConfig?.affectsGrade ? 'مؤثر بالدرجة النهائية' : 'توثيق سجل فقط'}
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsClassCumulativeAttendanceOpen(true)}
                          className="w-full py-0.5 px-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[9px] font-black transition-colors flex items-center justify-center gap-1 cursor-pointer print:hidden shadow-2xs"
                          title="عرض سجل الغيابات والإجازات التراكمي لجميع الطلاب من بداية الدوام"
                        >
                          <span>📊 تراكمي الدوام</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#64748B] font-semibold mt-1">
                        (الدرجة: {col.maxScore})
                      </div>
                    )}
                  </th>
                ))}

                {/* Divider '+' Button between Written / Custom Columns and Final Score */}
                <th className="py-2 px-2 min-w-[95px] max-w-[110px] bg-[#F8FAFC] border border-[#CBD5E1] text-center align-middle no-print print:hidden select-none">
                  <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                    <span className="text-[10px] font-bold text-[#2B6CB0] leading-snug text-center">
                      إذا أردت إضافة حقل اضغط هنا
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenAddColumn}
                      className="w-7 h-7 rounded-full bg-[#2B6CB0] hover:bg-[#1E4E8C] active:scale-95 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer ring-2 ring-blue-200 hover:ring-blue-400 hover:scale-105"
                      title="إذا أردت إضافة حقل اضغط هنا"
                      aria-label="إذا أردت إضافة حقل اضغط هنا"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </th>

                {/* Final Score Header - In print strictly ONLY "النهائي" */}
                <th className={`py-2.5 px-3 min-w-[170px] print:min-w-0 bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] text-center align-top ${columnSlants['finalScore'] === 'vertical' ? 'min-w-[50px]' : ''}`}>
                  <div className="space-y-1.5 print:hidden">
                    {/* Header Top Row: Title + Slant Toggle + Edit Pencil + Operation Badge + Max Score Input */}
                    <div className="flex items-center justify-center gap-1.5">
                      {editingColumnKey === 'finalScore' ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineColumnRename('finalScore');
                              if (e.key === 'Escape') setEditingColumnKey(null);
                            }}
                            className="w-28 px-1.5 py-0.5 text-xs font-bold bg-white border border-[#2B6CB0] rounded text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineColumnRename('finalScore')}
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                            title="حفظ"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingColumnKey(null)}
                            className="p-1 text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 group/header">
                          <span className={`font-bold text-xs text-[#1E293B] whitespace-nowrap ${getSlantClasses(columnSlants['finalScore'])}`}>
                            {finalScoreLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartInlineEdit('finalScore', finalScoreLabel)}
                            className="opacity-40 hover:opacity-100 p-0.5 text-slate-500 hover:text-[#2B6CB0] rounded transition-opacity cursor-pointer shrink-0"
                            title="إعادة تسمية عمود الدرجة النهائية"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <SlantButton slant={columnSlants['finalScore']} onToggle={() => toggleColumnSlant('finalScore')} />
                        </div>
                      )}

                      {/* Prominent pill badge if an active math operation is applied (e.g. ÷ 2) */}
                      {hasFinalOp && (
                        <button
                          type="button"
                          onClick={() => setIsFinalOperationModalOpen(true)}
                          className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all cursor-pointer flex items-center gap-0.5 active:scale-95 shrink-0"
                          title={`الدرجة النهائية مقسومة/معدلة: (${finalOpLabel}) - انقر للتعديل أو الإلغاء`}
                        >
                          <Calculator className="w-3 h-3" />
                          <span>{finalOpLabel}</span>
                        </button>
                      )}

                      <div className="relative inline-flex items-center">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          placeholder="100"
                          value={!currentModel.totalMaxScore || currentModel.totalMaxScore === 0 ? '' : currentModel.totalMaxScore}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const newMax = raw === '' ? 0 : Number(raw);
                            handleUpdateTotalMaxScore(newMax);
                          }}
                          className="w-14 px-1 py-0.5 bg-white text-[#1E293B] font-black text-xs rounded-lg border border-[#CBD5E1] shadow-2xs text-center focus:border-[#2B6CB0] focus:ring-1 focus:ring-[#2B6CB0] focus:outline-none transition-colors"
                          title="تعديل الدرجة النهائية الكاملة"
                        />
                      </div>
                    </div>

                    {/* Header Bottom Row: Completion status + Math Op Button + Rounding + Rating toggle: STRICTLY HIDDEN ON PRINT */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#CBD5E1] text-[10px]">
                      <div className="font-bold text-right">
                        {remainingScore === 0 ? (
                          <span className="text-[#15803D] font-black">
                            ({allocatedTotal}/{totalMax}) {hasFinalOp ? `➔ ${effectiveTotalMax}` : 'مكتمل ✓'}
                          </span>
                        ) : remainingScore > 0 ? (
                          <span className="text-[#2B6CB0] font-bold">
                            ({allocatedTotal}/{totalMax}) متبقي {remainingScore}
                          </span>
                        ) : (
                          <span className="text-[#BD4B4B] font-bold">
                            ({allocatedTotal}/{totalMax}) زائد {Math.abs(remainingScore)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Math Operation Button (divide by number, multiply, add, subtract, none) */}
                        <button
                          type="button"
                          onClick={() => setIsFinalOperationModalOpen(true)}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all border flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer ${
                            hasFinalOp
                              ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 font-black'
                              : 'bg-white text-[#2B6CB0] border-[#CBD5E1] hover:bg-slate-50'
                          }`}
                          title={
                            hasFinalOp
                              ? `الدرجة مطبق عليها (${finalOpLabel}) والمحصلة من ${effectiveTotalMax}. انقر لتعديل أو إلغاء العملية.`
                              : 'خيارات الدرجة النهائية: قسمة على عدد (مثلاً قسمة على 2)، ضرب، جمع، أو طرح'
                          }
                        >
                          <Calculator className={`w-3.5 h-3.5 ${hasFinalOp ? 'text-blue-700' : 'text-[#2B6CB0]'}`} />
                          <span>{hasFinalOp ? `عملية: ${finalOpLabel}` : '÷ × + - عملية'}</span>
                        </button>

                        {/* Rounding button inside header - appears when decimals exist or custom rounding configured */}
                        {(hasDecimalScores || (currentModel.roundingMode && currentModel.roundingMode !== 'none')) && (
                          <button
                            type="button"
                            onClick={() => setIsRoundingModalOpen(true)}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all border flex items-center gap-1 shadow-2xs bg-white text-[#854D0E] border-[#CBD5E1] hover:bg-slate-50 cursor-pointer"
                            title="التحكم بالنسب وقواعد جبر الكسور العشرية"
                          >
                            <Calculator className="w-3.5 h-3.5 text-[#854D0E]" />
                            <span>
                              {currentModel.roundingMode === 'half_up'
                                ? 'جبر: ≥0.5'
                                : currentModel.roundingMode === 'any_fraction'
                                ? 'جبر: ≥0.1'
                                : currentModel.roundingMode === 'custom_threshold'
                                ? `جبر: ≥${currentModel.roundingThreshold}`
                                : 'التحكم بالنسب العشرية'}
                            </span>
                          </button>
                        )}

                        {/* Toggle Rating button inside header */}
                        <button
                          type="button"
                          onClick={toggleRatingColumn}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all border flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer ${
                            showRatingColumn
                              ? 'bg-[#EBF4EE] text-[#15803D] border-emerald-300'
                              : 'bg-white text-[#64748B] border-[#CBD5E1] hover:bg-slate-100'
                          }`}
                          title={showRatingColumn ? 'عمود التقدير ظاهر (انقر للإخفاء)' : 'عمود التقدير مخفي (انقر للإظهار)'}
                        >
                          {showRatingColumn ? (
                            <Eye className="w-3.5 h-3.5 text-[#15803D]" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-[#64748B]" />
                          )}
                          <span>التقدير: {showRatingColumn ? 'ظاهر' : 'مخفي'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Print Only Title */}
                  <div className="hidden print:block text-center py-1">
                    <span className={`font-bold text-xs text-[#1E293B] ${getSlantClasses(columnSlants['finalScore'])}`}>
                      {hasFinalOp ? `النهائي (${finalOpLabel})` : 'النهائي'}
                    </span>
                  </div>
                </th>

                {/* Rating Badge Header */}
                {showRatingColumn && (
                  <th className={`py-2.5 px-2 min-w-[85px] print:min-w-0 bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] text-center align-middle animate-in fade-in ${columnSlants['rating'] === 'vertical' ? 'min-w-[45px]' : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      {editingColumnKey === 'rating' ? (
                        <div className="flex items-center justify-center gap-1 print:hidden">
                          <input
                            type="text"
                            autoFocus
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineColumnRename('rating');
                              if (e.key === 'Escape') setEditingColumnKey(null);
                            }}
                            className="w-20 px-1.5 py-0.5 text-xs font-bold bg-white border border-[#2B6CB0] rounded text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineColumnRename('rating')}
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                            title="حفظ"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingColumnKey(null)}
                            className="p-1 text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 group/header">
                          <span className={`font-bold text-xs text-[#1E293B] ${getSlantClasses(columnSlants['rating'])}`}>{ratingLabel}</span>
                          <button
                            type="button"
                            onClick={() => handleStartInlineEdit('rating', ratingLabel)}
                            className="opacity-40 hover:opacity-100 p-0.5 text-slate-500 hover:text-[#2B6CB0] rounded transition-opacity cursor-pointer shrink-0 print:hidden"
                            title="إعادة تسمية عمود التقدير"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <SlantButton slant={columnSlants['rating']} onToggle={() => toggleColumnSlant('rating')} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={toggleRatingColumn}
                        className="p-0.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 transition-colors cursor-pointer print:hidden"
                        title="إخفاء عمود التقدير"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
              </tr>
            </thead>

            {filteredStudents.length > 0 && (
              <tbody className="text-sm">
                {filteredStudents.map((student, index) => {
                  const writtenCalculated = calculateWrittenScore(
                    student.writtenRawScore,
                    currentModel.writtenMaxScore,
                    effectiveWrittenWeight,
                    currentModel.totalMaxScore,
                    writtenScoreMode
                  );
                  const hasWrittenDecimal =
                    writtenCalculated !== null && Math.round(writtenCalculated) !== writtenCalculated;
                  const roundingMode = currentModel.roundingMode || 'any_fraction';
                  const roundedWrittenScore =
                    writtenCalculated !== null
                      ? currentModel.roundingMode === 'none'
                        ? writtenCalculated
                        : applyScoreRounding(
                            writtenCalculated,
                            roundingMode,
                            currentModel.roundingThreshold,
                            currentModel.totalMaxScore
                          )
                      : null;
                  const breakdown = getStudentMonthlyScoreBreakdown(student, currentModel);
                  const totalMonthly = breakdown.finalScore;
                  const rating = getRatingDetails(totalMonthly, effectiveTotalMax);

                  // Detect if student name resembles another student in this model or other models (e.g. أ/ا or typo)
                  const suspectedInTable = (() => {
                    const cleaned = cleanSingleSpaces(student.name);
                    if (!cleaned || cleaned.length < 3) return null;
                    const others = [
                      ...currentModel.students.filter((s) => s.id !== student.id),
                      ...otherModelsStudents.filter((os) => os.id !== student.id),
                    ];
                    return findSuspectedStudentMatch(cleaned, others, { ignoreExact: true });
                  })();

                  return (
                    <tr
                      key={student.id}
                      className="even:bg-[#F8FAFC] odd:bg-white hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Delete Student Row Button AT THE VERY BEGINNING OF THE ROW */}
                      <td className="py-1 px-1 text-center align-middle border border-[#CBD5E1] no-print print:hidden">
                        <button
                          type="button"
                          onClick={() => requestDeleteRow(student.id)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#BD4B4B] hover:text-white bg-[#FDF2F2] hover:bg-[#BD4B4B] border border-[#F5D5D5] hover:border-[#BD4B4B] transition-all shadow-2xs hover:scale-105 active:scale-95"
                          title={`حذف صف الطالب (${student.name || 'بدون اسم'}) مع تنبيه تأكيد`}
                        >
                          <Trash2 className="w-3.5 h-3.5 transition-colors" />
                        </button>
                      </td>

                      {/* Row Index */}
                      <td className="py-1.5 px-2 text-center text-xs font-bold text-[#64748B] border border-[#CBD5E1] bg-[#F8FAFC]">
                        {index + 1}
                      </td>

                      {/* Student Name */}
                      <td
                        data-student-name-column="true"
                        className={`py-1 px-2 border transition-colors ${
                          suspectedInTable
                            ? 'bg-amber-100/90 border-amber-400'
                            : 'border-[#CBD5E1]'
                        }`}
                      >
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={student.name}
                            onFocus={(e) => handleScoreCellFocus(e, student)}
                            onClick={(e) => handleScoreCellFocus(e, student)}
                            onBlur={(e) => {
                              const cleaned = cleanSingleSpaces(e.target.value);
                              if (cleaned !== student.name) {
                                handleUpdateStudent(student.id, { name: cleaned });
                              }
                            }}
                            onChange={(e) =>
                              handleUpdateStudent(student.id, { name: e.target.value })
                            }
                            placeholder="اكتب اسم الطالب..."
                            className={`w-full px-2 py-1 border border-transparent hover:border-[#CBD5E1] focus:border-[#2B6CB0] focus:bg-white text-sm font-bold text-[#1E293B] focus:outline-none transition-colors rounded-none sm:rounded-sm ${
                              suspectedInTable ? 'bg-amber-50/80 font-black' : ''
                            }`}
                          />

                          {suspectedInTable && (
                            <div className="flex flex-wrap items-center justify-between gap-1 p-1 bg-amber-200/90 border border-amber-300 rounded text-[10px] text-amber-950 font-bold no-print print:hidden shadow-2xs">
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>هل تقصد «{suspectedInTable.matchedName}» كما في الجدول السابق؟</span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStudent(student.id, {
                                    name: suspectedInTable.matchedName,
                                  })
                                }
                                className="px-1.5 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[9px] font-bold cursor-pointer transition-colors shadow-2xs"
                              >
                                نعم اعتمد
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Grade Level */}
                      <td className="py-1 px-2 border border-[#CBD5E1]">
                        <input
                          type="text"
                          value={student.gradeLevel}
                          onFocus={(e) => handleScoreCellFocus(e, student)}
                          onClick={(e) => handleScoreCellFocus(e, student)}
                          onChange={(e) =>
                            handleUpdateStudent(student.id, { gradeLevel: e.target.value })
                          }
                          placeholder="الصف"
                          className="w-full px-1.5 py-1 border border-transparent hover:border-[#CBD5E1] focus:border-[#2B6CB0] focus:bg-white text-xs font-medium text-[#475569] focus:outline-none transition-colors text-center rounded-none sm:rounded-sm"
                        />
                      </td>

                      {/* Section */}
                      <td className="py-1 px-0.5 text-center border border-[#CBD5E1] w-auto min-w-[34px] max-w-[48px] print:w-auto print:px-0">
                        <input
                          type="text"
                          value={student.section}
                          onFocus={(e) => handleScoreCellFocus(e, student)}
                          onClick={(e) => handleScoreCellFocus(e, student)}
                          onChange={(e) =>
                            handleUpdateStudent(student.id, { section: e.target.value })
                          }
                          placeholder="أ"
                          className="w-full text-center px-0.5 py-1 border border-transparent hover:border-[#CBD5E1] focus:border-[#2B6CB0] focus:bg-white text-xs font-bold text-[#1E293B] focus:outline-none transition-colors rounded-none sm:rounded-sm"
                        />
                      </td>

                      {/* Subject Name Column - اسم المادة */}
                      <td className="py-1 px-2 text-center border border-[#CBD5E1] whitespace-nowrap bg-blue-50/20">
                        <span className="text-xs font-bold text-[#1E3A8A]">
                          {currentModel.subject || profile.subject || '-'}
                        </span>
                      </td>

                      {/* Written Exam Input + Converted Score Display */}
                      <td className="py-1 px-2.5 text-center border border-[#CBD5E1]">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max={currentModel.writtenMaxScore || 100}
                            inputMode="decimal"
                            data-score-cell="true"
                            value={
                              student.writtenRawScore === null ||
                              student.writtenRawScore === undefined
                                ? ''
                                : student.writtenRawScore
                            }
                            onFocus={(e) => handleScoreCellFocus(e, student)}
                            onChange={(e) => {
                              const rawVal = e.target.value.replace('،', '.');
                              const num = rawVal === '' ? null : Number(rawVal);
                              handleUpdateStudent(student.id, {
                                writtenRawScore: isNaN(num as number) ? null : num,
                              });
                            }}
                            placeholder={`/${currentModel.writtenMaxScore}`}
                            className="w-16 px-1.5 py-1 text-center border rounded-lg text-sm font-bold transition-all bg-white border-[#CBD5E1] text-[#1E293B] hover:border-[#94A3B8] focus:border-[#2B6CB0] focus:ring-2 focus:ring-[#2B6CB0] focus:outline-none"
                          />

                          {/* Written score conversion display under the input number */}
                          {writtenCalculated !== null && (
                            hasWrittenDecimal ? (
                              <button
                                type="button"
                                onClick={() => setIsRoundingModalOpen(true)}
                                className="text-[11px] leading-tight font-bold text-[#1F5078] bg-[#DCE8F2] hover:bg-[#CFDFEC] border border-[#B8D2E7] px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xs transition-all active:scale-95"
                                title="انقر لتعديل قاعدة جبر وتقريب الكسور العشرية"
                              >
                                {currentModel.roundingMode === 'none' ? (
                                  <span>{writtenCalculated} (بدون تقريب)</span>
                                ) : (
                                  <span>
                                    <span className="font-black">{writtenCalculated}</span>
                                    {' '}تحتسب{' '}
                                    <span className="font-black text-emerald-800 bg-white/90 px-1 py-0.2 rounded border border-emerald-300">
                                      {roundedWrittenScore}
                                    </span>
                                  </span>
                                )}
                              </button>
                            ) : (
                              writtenScoreMode === 'relative' &&
                              effectiveWrittenWeight !== currentModel.writtenMaxScore && (
                                <span
                                  className="text-xs font-black text-[#2B6CB0] bg-[#EFF6FF] px-1.5 py-0.5 rounded-lg whitespace-nowrap"
                                  title={`الدرجة المحسوبة (من ${effectiveWrittenWeight})`}
                                >
                                  = {writtenCalculated}
                                </span>
                              )
                            )
                          )}
                        </div>
                      </td>

                      {/* Optional Custom Columns (Oral, Behavior, Daily Participation, etc.) */}
                      {(currentModel.customColumns || []).map((col) => {
                        const val = student.scores[col.id];
                        const history = student.participationHistory?.[col.id];
                        const isExceeded =
                          val !== null && val !== undefined && Number(val) > col.maxScore;

                        const isParticipation =
                          col.name.includes('مشارك') ||
                          col.name.includes('نشاط') ||
                          (history && history.length > 0);

                        const historyList = history && history.length > 0 ? history : null;

                        let displayPercentage: string | null = null;
                        let multipleBreakdown: string | null = null;

                        if (historyList && historyList.length > 0) {
                          const avgPercentage = Math.round(
                            historyList.reduce((acc, cur) => acc + cur.percentage, 0) /
                              historyList.length
                          );
                          if (historyList.length === 1) {
                            displayPercentage = `${historyList[0].percentage}%`;
                          } else {
                            displayPercentage = `${avgPercentage}%`;
                            multipleBreakdown = historyList.map((h) => `${h.percentage}%`).join(' ، ');
                          }
                        } else if (
                          val !== null &&
                          val !== undefined &&
                          !isNaN(Number(val)) &&
                          col.maxScore > 0 &&
                          isParticipation
                        ) {
                          // Compute percentage directly from score if history is not available
                          const calculatedPct = Math.round((Number(val) / col.maxScore) * 100);
                          displayPercentage = `${calculatedPct}%`;
                        }

                        if (col.isAttendance) {
                          const records = student.attendanceRecords?.[col.id] || [];
                          let absentCount = 0;
                          let excusedCount = 0;
                          let presentCount = 0;
                          for (const r of records) {
                            if (r.status === 'absent') absentCount++;
                            else if (r.status === 'excused') excusedCount++;
                            else if (r.status === 'present') presentCount++;
                          }

                          const cfg = col.attendanceConfig;
                          let gradeDelta = 0;
                          if (cfg && cfg.affectsGrade) {
                            if (cfg.absent.action === 'deduct') gradeDelta -= absentCount * (cfg.absent.points || 0);
                            else if (cfg.absent.action === 'add') gradeDelta += absentCount * (cfg.absent.points || 0);

                            if (cfg.excused.action === 'deduct') gradeDelta -= excusedCount * (cfg.excused.points || 0);
                            else if (cfg.excused.action === 'add') gradeDelta += excusedCount * (cfg.excused.points || 0);

                            if (cfg.present.action === 'add') gradeDelta += presentCount * (cfg.present.points || 0);
                            else if (cfg.present.action === 'deduct') gradeDelta -= presentCount * (cfg.present.points || 0);
                          }

                          return (
                            <td
                              key={col.id}
                              className="py-1 px-1.5 text-center border border-[#CBD5E1]"
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForAttendance({ student, column: col })}
                                className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer bg-[#F5EFE2] hover:bg-[#EBDDC8] border border-[#D8CEBD] text-[#2F2822]"
                                title="انقر لتسجيل الحضور، الغياب، أو الإجازة مع التاريخ واليوم"
                              >
                                {records.length === 0 ? (
                                  <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>+ رصد</span>
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1 text-[11px]">
                                    {absentCount > 0 && (
                                      <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded font-black text-[10px]">
                                        غ: {absentCount}
                                      </span>
                                    )}
                                    {excusedCount > 0 && (
                                      <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded font-black text-[10px]">
                                        م: {excusedCount}
                                      </span>
                                    )}
                                    {presentCount > 0 && (
                                      <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded font-black text-[10px]">
                                        ح: {presentCount}
                                      </span>
                                    )}
                                    {cfg?.affectsGrade && gradeDelta !== 0 && (
                                      <span
                                        className={`text-[10px] font-black mr-0.5 ${
                                          gradeDelta < 0 ? 'text-rose-700' : 'text-emerald-700'
                                        }`}
                                      >
                                        ({gradeDelta > 0 ? `+${gradeDelta}` : gradeDelta})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col.id}
                            className="py-1 px-2 text-center border border-[#CBD5E1]"
                          >
                            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max={col.maxScore}
                                inputMode="decimal"
                                data-score-cell="true"
                                value={val === null || val === undefined ? '' : val}
                                onFocus={(e) => handleScoreCellFocus(e, student)}
                                onChange={(e) => {
                                  const rawVal = e.target.value.replace('،', '.');
                                  handleUpdateStudentCustomScore(student.id, col.id, rawVal);
                                }}
                                placeholder={`/${col.maxScore}`}
                                className={`w-14 px-1 py-1 text-center border rounded-lg text-sm font-black transition-all bg-white ${
                                  isExceeded
                                    ? 'border-red-300 text-red-600 bg-red-50'
                                    : 'border-[#CBD5E1] text-[#1E293B] hover:border-[#94A3B8] focus:border-[#BA916C] focus:ring-2 focus:ring-[#BA916C] focus:outline-none'
                                }`}
                              />
                              {displayPercentage && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100 border border-purple-300 text-purple-950 font-black text-xs shadow-2xs select-none"
                                  title={
                                    multipleBreakdown
                                      ? `نسب المشاركة المسجلة للدروس:\n${multipleBreakdown}\nالمعدل: ${displayPercentage}`
                                      : `نسبة المشاركة: ${displayPercentage}`
                                  }
                                >
                                  <span>{displayPercentage}</span>
                                  {multipleBreakdown && (
                                    <span className="text-[10px] text-purple-700 font-normal">
                                      ({multipleBreakdown})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Divider Column Cell between Written / Custom Columns and Final Score */}
                      <td className="w-16 border border-[#CBD5E1] bg-slate-50/40 text-center no-print print:hidden">
                        <div className="w-px h-6 bg-slate-200 mx-auto" />
                      </td>

                      {/* Mandatory Final Monthly Score */}
                      <td className="py-1 px-3 text-center font-black border border-[#CBD5E1]">
                        {totalMonthly !== null ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="text-sm sm:text-base font-black text-[#1E293B] px-2.5 py-0.5 bg-slate-100 rounded-lg inline-block min-w-[45px] border border-slate-200">
                              {totalMonthly}
                            </span>
                            {breakdown.hasOperation && breakdown.baseScore !== null && breakdown.baseScore !== totalMonthly && (
                              <span
                                className="text-[10px] text-blue-700 font-bold"
                                title={`المجموع قبل العملية (${breakdown.operationLabel}): ${breakdown.baseScore}`}
                              >
                                (الأصل: {breakdown.baseScore})
                              </span>
                            )}
                            {breakdown.isRounded && (
                              <span
                                className="text-[10px] text-[#854D0E] font-bold"
                                title={`الدرجة قبل جبر الكسور كانت ${breakdown.rawScore}`}
                              >
                                (أصله: {breakdown.rawScore})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Rating Badge */}
                      {showRatingColumn && (
                        <td className="py-1 px-2 text-center border border-[#CBD5E1] animate-in fade-in">
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${rating.badgeBg} ${rating.badgeText}`}
                          >
                            {rating.text}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>

        {/* Empty State Banner */}
        {filteredStudents.length === 0 && (
          <div className="py-10 px-4 text-center bg-white border-t border-[#E8E4DA]">
            <div className="max-w-md mx-auto space-y-3.5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EEF4F8] border border-[#D2E0EC] flex items-center justify-center text-[#557A95] shadow-xs">
                <UserPlus className="w-7 h-7" />
              </div>

              <div>
                <p className="font-extrabold text-[#2E2B27] text-base sm:text-lg">
                  {currentModel.students.length === 0
                    ? `لا يوجد طلاب مضافين في هذا النموذج (${currentModel.gradeLevel || 'الصف الدراسي'})`
                    : `لا يوجد طلاب مطابقين للتصفية الحالية (${currentModel.gradeLevel || selectedGradeLevel})`}
                </p>
                <p className="text-xs text-[#7A746B] mt-1">
                  يمكنك إضافة طالب أو لصق كشف أسماء الطلاب بسهولة للبدء برصد الدرجات.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBatchImportOpen(true)}
                  className="px-6 py-2.5 craft-btn-primary active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة أو استيراد كشف الطلاب 📷</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Action Bar: Show add button only when students exist to avoid duplicate buttons when empty */}
      <div className="bg-[#FAF7EC] rounded-2xl border border-[#D8CEBD] p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          {filteredStudents.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBatchImportOpen(true)}
              className="px-4 py-2.5 craft-btn-primary active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              title="إضافة طالب جديد أو لصق قائمة أسماء طلاب من ملف أو إكسل"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة أو استيراد كشف الطلاب 📷</span>
            </button>
          )}
        </div>

        {/* Student count and clear all */}
        <div className="flex items-center gap-3 text-xs sm:text-sm text-[#7A746B] font-medium mr-auto sm:mr-0">
          <span>
            عدد الطلاب:{' '}
            <strong className="text-[#2E2B27] font-bold">
              {filteredStudents.length}
            </strong>{' '}
            من أصل{' '}
            <strong className="text-[#2E2B27] font-bold">
              {relevantModelStudents.length}
            </strong>
          </span>

          {currentModel.students.length > 0 && (
            <button
              type="button"
              onClick={requestClearAllStudents}
              className="text-[#9A9388] hover:text-[#BD4B4B] text-xs underline transition-colors font-semibold cursor-pointer"
              title="مسح جميع أسماء الطلاب الحالية للبدء من جديد"
            >
              مسح الكل
            </button>
          )}
        </div>
      </div>
        </>
      )}

      {/* Grade Rename & Merge Modal */}
      {managingGrade && (
        <GradeRenameMergeModal
          isOpen={Boolean(managingGrade)}
          onClose={() => setManagingGrade(null)}
          currentGrade={managingGrade}
          allGrades={allDistinctGradeLevels}
          currentSections={sectionsForManagingGrade}
          studentCount={studentCountForManagingGrade}
          gradeStudentCounts={gradeStudentCounts}
          onRenameGrade={handleRenameGrade}
          onMergeGrade={handleMergeGrade}
          onRenameSection={handleRenameSection}
        />
      )}

      {/* Quick "Add Field/Column" Modal */}
      {isAddingColumn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddingColumn(false);
          }}
        >
          <div
            className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150 font-['Cairo',sans-serif]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Sky Slate Blue Theme (Fixed top) */}
            <div className="px-5 py-3.5 bg-[#5692BE] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-200" />
                <h3 className="text-sm font-bold">إضافة حقل درجة جديد للجدول</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingColumn(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content - Smooth scrollable area */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain custom-scrollbar">
              {/* Score Distribution Overview Box */}
              <div className="p-3 bg-blue-50/90 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span>إجمالي الدرجة النهائية للمادة:</span>
                  <span className="text-sm font-black text-[#2B6CB0]">
                    {totalMax} درجة
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  الحصة الحالية للتحريري: <strong>{effectiveWrittenWeight}</strong>{' '}
                  {customSum > 0 ? `+ الحقول الإضافية (${customSum})` : ''} ={' '}
                  <strong>{totalMax}</strong>.
                </p>
              </div>

              {/* Quick Preset Pills */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  حقول مقترحة وشائعة (انقر لاختيار الاسم وتحديد درجته بالأسفل):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p, idx) => {
                    const isSelected = !isAttendanceMode && newColName.trim() === p.name.trim();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setIsAttendanceMode(false);
                          setNewColName(p.name);
                          setNewColMax(p.max);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isSelected
                            ? 'bg-[#2B6CB0] text-white border-[#23588f] shadow-xs ring-2 ring-blue-300'
                            : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 border-slate-300 hover:border-blue-300 shadow-2xs'
                        }`}
                        title={`اختيار اسم (${p.name}) وتعديل درجته في الحقل بالأسفل`}
                      >
                        <Plus className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#2B6CB0]'}`} />
                        <span>{p.name}</span>
                      </button>
                    );
                  })}

                  {/* Special Attendance Preset Button */}
                  <button
                    type="button"
                    onClick={handleSelectAttendancePreset}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-2xs ${
                      isAttendanceMode
                        ? 'bg-[#2D5A43] text-white border-[#224432] ring-2 ring-emerald-300 shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>الغياب والحضور</span>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-950 px-1 py-0.2 rounded font-black">
                      خاص
                    </span>
                  </button>
                </div>
              </div>

              {/* Conditional: Standard Column vs Attendance Column */}
              {isAttendanceMode ? (
                <div className="space-y-3.5 pt-2 border-t border-slate-200 animate-in fade-in duration-200">
                  {/* Field Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم الحقل
                    </label>
                    <input
                      type="text"
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      placeholder="الغياب والحضور"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Primary Toggle: Does attendance affect final grade? */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-black text-slate-800">
                      هل يؤثر حقل الحضور والغياب على الدرجة النهائية للطالب؟
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAttendanceAffectsGrade(true)}
                        className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                          attendanceAffectsGrade
                            ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 text-emerald-950 font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs">نعم، يؤثر على الدرجة</div>
                        <div className="text-[10px] text-slate-500 font-normal">خصم أو إضافة من الدرجة النهائية</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAttendanceAffectsGrade(false)}
                        className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                          !attendanceAffectsGrade
                            ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 text-blue-950 font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs">لا، توثيق وحفظ فقط</div>
                        <div className="text-[10px] text-slate-500 font-normal">تسجيل التواريخ دون المساس بالدرجات</div>
                      </button>
                    </div>
                  </div>

                  {/* 3 Status Configuration Options (حاضر، مجاز، غائب) */}
                  {attendanceAffectsGrade && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          تحديد آلية التأثير (حاضر، مجاز، غائب):
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">تطبق لكل يوم مسجل</span>
                      </div>

                      {/* 1. غائب (Absent) */}
                      <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-rose-900 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-600" />
                            حالة (غائب)
                          </span>
                          <span className="text-[10px] text-rose-700 font-semibold">
                            يُوثق باليوم والتاريخ
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={absentAction}
                            onChange={(e) => setAbsentAction(e.target.value as any)}
                            className="px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-950 focus:outline-none"
                          >
                            <option value="deduct">نقصان من الدرجة (-)</option>
                            <option value="add">زيادة على الدرجة (+)</option>
                            <option value="none">بدون تأثير (0)</option>
                          </select>
                          {absentAction !== 'none' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-600">بمقدار:</span>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="50"
                                value={absentPoints}
                                onChange={(e) => setAbsentPoints(Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-white border border-rose-300 rounded-lg text-center text-xs font-black text-rose-950 focus:outline-none"
                              />
                              <span className="text-xs text-slate-500">درجة لكل غياب</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. مجاز (Excused/Leave) */}
                      <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-blue-900 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            حالة (مجاز / إجازة بعذر)
                          </span>
                          <span className="text-[10px] text-blue-700 font-semibold">
                            يُوثق باليوم والتاريخ
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={excusedAction}
                            onChange={(e) => setExcusedAction(e.target.value as any)}
                            className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-950 focus:outline-none"
                          >
                            <option value="none">بدون تأثير (0) - عادي</option>
                            <option value="deduct">نقصان من الدرجة (-)</option>
                            <option value="add">زيادة على الدرجة (+)</option>
                          </select>
                          {excusedAction !== 'none' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-600">بمقدار:</span>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="50"
                                value={excusedPoints}
                                onChange={(e) => setExcusedPoints(Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-white border border-blue-300 rounded-lg text-center text-xs font-black text-blue-950 focus:outline-none"
                              />
                              <span className="text-xs text-slate-500">درجة لكل إجازة</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. حاضر (Present) */}
                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            حالة (حاضر)
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            تسجيل الحضور
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={presentAction}
                            onChange={(e) => setPresentAction(e.target.value as any)}
                            className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none"
                          >
                            <option value="none">بدون تأثير (0) - عادي</option>
                            <option value="add">زيادة على الدرجة (مكافأة مواظبة +)</option>
                            <option value="deduct">نقصان من الدرجة (-)</option>
                          </select>
                          {presentAction !== 'none' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-600">بمقدار:</span>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="50"
                                value={presentPoints}
                                onChange={(e) => setPresentPoints(Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-center text-xs font-black text-emerald-950 focus:outline-none"
                              />
                              <span className="text-xs text-slate-500">درجة لكل حضور</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cross-Month / Previous Months Options */}
                  {models.length > 1 && (
                    <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2">
                      <label className="block text-xs font-black text-amber-950">
                        الربط مع سجلات الأشهر السابقة:
                      </label>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="attCrossMonth"
                            checked={attendanceCrossMonthMode === 'fresh'}
                            onChange={() => setAttendanceCrossMonthMode('fresh')}
                            className="text-[#BA916C] accent-[#BA916C]"
                          />
                          <span>البدء من هذا الشهر (سجل جديد لهذا الشهر فقط)</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="attCrossMonth"
                            checked={attendanceCrossMonthMode === 'merge'}
                            onChange={() => setAttendanceCrossMonthMode('merge')}
                            className="text-[#BA916C] accent-[#BA916C]"
                          />
                          <span>إضافة الحضور والغياب والإجازة من الأشهر السابقة</span>
                        </label>

                        {attendanceCrossMonthMode === 'merge' && (
                          <div className="pt-2 pr-5 space-y-1.5 border-t border-amber-200/80 mt-1">
                            <span className="text-[11px] font-bold text-amber-900 block">
                              اختر الأشهر التي ترغب بدمج غياباتها مع هذا الشهر:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {models
                                .filter((m) => m.id !== currentModel.id)
                                .map((m) => {
                                  const isSelected = selectedPriorModelIds.includes(m.id);
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedPriorModelIds((prev) =>
                                          isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                                        );
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#BA916C] text-white border-[#9E7752] shadow-2xs'
                                          : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100/50'
                                      }`}
                                    >
                                      {isSelected ? '✓ ' : ''}{m.name} ({m.subject || 'المادة'})
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Custom Input for Standard Grade Columns */
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم الحقل الجديد
                    </label>
                    <input
                      type="text"
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewColumn()}
                      placeholder="مثلاً: درجة الشفهي، السلوك، الواجبات..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الدرجة الكاملة لهذا الحقل (يمكنك تعديلها وتحديدها هنا):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={totalMax}
                        value={newColMax === 0 ? '' : newColMax}
                        onChange={(e) => setNewColMax(Number(e.target.value))}
                        placeholder="مثال: 10 أو 20"
                        className="w-28 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-center text-sm font-black text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-600 font-bold">درجة</span>
                    </div>

                    {/* Live Calculation Feedback */}
                    <div className="mt-2 text-[11px] font-medium">
                      {totalMax - customSum - newColMax >= 0 ? (
                        <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 inline-block leading-relaxed">
                          ✓ عند وضع <strong>{newColMax || 0}</strong> درجة لهذا الحقل:
                          ستُحتسب درجة التحريري تلقائياً من{' '}
                          <strong className="text-emerald-950 font-black">
                            {Math.max(0, totalMax - customSum - (Number(newColMax) || 0))}
                          </strong>{' '}
                          ({totalMax > 0 ? Math.round((Math.max(0, totalMax - customSum - (Number(newColMax) || 0)) / totalMax) * 100) : 100}% من الدرجة النهائية) دون الحاجة لإدخال أي نسبة!
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded inline-block font-bold">
                          ⚠️ تنبيه: وضع {newColMax} درجة سيتجاوز سقف الدرجة النهائية
                          بـ {Math.abs(totalMax - customSum - newColMax)} درجات زائدة.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Pinned at bottom */}
            <div className="px-5 py-3.5 bg-[#F8F4EA] border-t border-[#E0D5C3] flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-[#8C7A6B] hidden sm:inline-block font-medium">
                💡 اسحب أو مرّر للأسفل لاستعراض كافة الخيارات
              </span>
              <div className="flex items-center gap-2 mr-auto">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-3.5 py-1.5 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewColumn()}
                  disabled={!newColName.trim()}
                  className="px-4 py-1.5 craft-btn-primary disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>إضافة الحقل للجدول</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <BatchImportModal
        isOpen={isBatchImportOpen}
        onClose={() => setIsBatchImportOpen(false)}
        onImport={handleBatchImport}
        defaultGrade={currentModel.gradeLevel || currentModel.students[0]?.gradeLevel || ''}
        defaultSection={currentModel.students[0]?.section || (allSections[0] || 'أ')}
        customColumns={currentModel.customColumns}
        writtenMaxScore={currentModel.writtenMaxScore}
        existingStudents={currentModel.students}
        previousModelsStudents={otherModelsStudents}
        allGradeOptions={userEnteredGrades}
      />

      <CreateModelModal
        isOpen={isCreateModelOpen}
        onClose={() => setIsCreateModelOpen(false)}
        currentModel={currentModel}
        allModels={models}
        onCreate={handleModelCreated}
        profileSubject={profile.subject}
        currentUser={currentUser}
        onOpenSectionsSwap={(grade, subject) => {
          setSwapInitialGrade(grade || currentModel.gradeLevel);
          setSwapInitialSubject(subject || currentModel.subject);
          setIsSectionsSwapOpen(true);
        }}
      />

      {/* Grade Rename and Merge Modal (دمج وتعديل اسم الصف والشعب) */}
      {managingGrade && (
        <GradeRenameMergeModal
          isOpen={Boolean(managingGrade)}
          onClose={() => setManagingGrade(null)}
          currentGrade={managingGrade}
          allGrades={userEnteredGrades}
          currentSections={allSections}
          studentCount={
            currentModel.students.filter((st) =>
              isGradeLevelMatch(st.gradeLevel, managingGrade)
            ).length
          }
          onRenameGrade={handleRenameGrade}
          onMergeGrade={handleMergeGrade}
          onRenameSection={handleRenameSection}
        />
      )}

      {/* Confirmation Alert Modal for all deletions */}
      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        title={confirmDelete.title}
        message={confirmDelete.message}
        confirmText={confirmDelete.confirmText}
        onConfirm={confirmDelete.onConfirm}
        onCancel={() => setConfirmDelete((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Action Prompt Modal for Print / Export */}
      {actionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 text-right">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-black text-slate-800 text-sm sm:text-base">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  {actionPrompt.icon}
                </div>
                <span>{actionPrompt.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionPrompt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <div className="p-5 space-y-2">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold">
                {actionPrompt.message}
              </p>
            </div>

            {/* Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActionPrompt(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={actionPrompt.onConfirm}
                className={`px-4 py-2 text-white rounded-xl font-bold text-xs transition-all shadow-sm ${actionPrompt.confirmColor}`}
              >
                {actionPrompt.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating fixed overlay dialog in front of page after creating a model (CSS position: fixed) */}
      {newlyCreatedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 no-print" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header banner */}
            <div className="bg-gradient-to-l from-[#3E6D52] via-[#487B5D] to-[#557A95] text-white p-6 text-center relative">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 border border-white/25 shadow-md">
                <UserPlus className="w-7 h-7 text-emerald-100" />
              </div>
              <h3 className="text-lg sm:text-xl font-black">
                تم إنشاء نموذج ({newlyCreatedModel.name}) بنجاح!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xs mx-auto leading-relaxed">
                الخطوة القادمة هي إضافة أو لصق أسماء الطلاب للبدء برصد الدرجات
              </p>
              <button
                type="button"
                onClick={() => setNewlyCreatedModel(null)}
                className="absolute top-4 left-4 p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content & Actions */}
            <div className="p-5 sm:p-6 space-y-3.5 text-center">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                النموذج جاهز حالياً. يمكنك كتابة اسم طالب أو لصق قائمة أسماء طلابك من ملف وورد أو إكسل دفعة واحدة.
              </p>

              <button
                type="button"
                onClick={() => {
                  setNewlyCreatedModel(null);
                  setIsBatchImportOpen(true);
                }}
                className="w-full py-3.5 px-5 bg-[#487B5D] hover:bg-[#3C684E] active:scale-98 text-white rounded-2xl text-sm font-black transition-all shadow-md flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                <span>إضافة طالب أو لصق أسماء الطلاب</span>
              </button>

              <button
                type="button"
                onClick={() => setNewlyCreatedModel(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
              >
                سأقوم بإضافتهم لاحقاً
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Score Rounding Modal */}
      <ScoreRoundingModal
        isOpen={isRoundingModalOpen}
        onClose={() => setIsRoundingModalOpen(false)}
        currentMode={currentModel.roundingMode || 'none'}
        currentThreshold={currentModel.roundingThreshold || 0.5}
        modelName={currentModel.name}
        gradeLevel={currentModel.gradeLevel}
        subject={currentModel.subject}
        onSave={handleSaveRounding}
      />
      {/* Final Score Math Operation Modal */}
      <FinalScoreOperationModal
        isOpen={isFinalOperationModalOpen}
        onClose={() => setIsFinalOperationModalOpen(false)}
        currentOperation={currentModel.finalScoreOperation}
        totalMaxScore={currentModel.totalMaxScore || 100}
        modelName={currentModel.name}
        gradeLevel={currentModel.gradeLevel}
        subject={currentModel.subject}
        onSave={handleSaveFinalScoreOperation}
      />
      {/* Rename Columns Modal */}
      <RenameColumnsModal
        isOpen={isRenameColumnsModalOpen}
        onClose={() => setIsRenameColumnsModalOpen(false)}
        model={currentModel}
        onSave={(newLabels, updatedCustomCols) => {
          if (onUpdateAllModels && models.length > 0) {
            const currentGradeNorm = (currentModel.gradeLevel || '').trim().toLowerCase();
            const currentSubjNorm = (currentModel.subject || '').trim().toLowerCase();

            const updated = models.map((m) => {
              const mGradeNorm = (m.gradeLevel || '').trim().toLowerCase();
              const mSubjNorm = (m.subject || '').trim().toLowerCase();
              const isTarget =
                m.id === currentModel.id ||
                (mGradeNorm === currentGradeNorm && mSubjNorm === currentSubjNorm);

              if (isTarget) {
                return {
                  ...m,
                  columnLabels: newLabels,
                  customColumns: updatedCustomCols,
                  updatedAt: new Date().toISOString(),
                };
              }
              return m;
            });
            onUpdateAllModels(updated);
          } else {
            onUpdateModel({
              ...currentModel,
              columnLabels: newLabels,
              customColumns: updatedCustomCols,
              updatedAt: new Date().toISOString(),
            });
          }
        }}
      />

      {/* Edit Model Name, Subject & Grade Level Modal */}
      <EditModelModal
        isOpen={Boolean(editingModelForRename)}
        onClose={() => setEditingModelForRename(null)}
        model={editingModelForRename}
        onSave={handleSaveModelRename}
        profileSubject={profile.subject}
        allModels={models}
        currentUser={currentUser}
        onOpenSectionsSwap={(grade, subject) => {
          setSwapInitialGrade(grade || currentModel.gradeLevel);
          setSwapInitialSubject(subject || currentModel.subject);
          setIsSectionsSwapOpen(true);
        }}
      />

      {/* Teacher Sections Swap & Reassignment Modal (خاص بالإدارة) */}
      <TeacherSectionsSwapModal
        isOpen={isSectionsSwapOpen}
        onClose={() => setIsSectionsSwapOpen(false)}
        allModels={models}
        onUpdateAllModels={onUpdateAllModels}
        initialGrade={swapInitialGrade || currentModel.gradeLevel}
        initialSubject={swapInitialSubject || currentModel.subject}
        currentUser={currentUser}
      />

      {/* Floating Student Info Cloud during horizontal scrolling (only when names are scrolled out of view) */}
      <StudentFloatingCloud
        info={activeStudentCloud}
        isOpen={Boolean(activeStudentCloud) && !isNameColumnVisible}
        onClose={() => setActiveStudentCloud(null)}
      />

      {/* Attendance Record Modal for Individual Student */}
      {selectedStudentForAttendance && (
        <AttendanceRecordModal
          isOpen={Boolean(selectedStudentForAttendance)}
          onClose={() => setSelectedStudentForAttendance(null)}
          student={selectedStudentForAttendance.student}
          column={selectedStudentForAttendance.column}
          model={currentModel}
          allModels={models}
          onSaveRecords={handleSaveStudentAttendance}
        />
      )}

      {/* Class Cumulative Attendance Overview Modal */}
      {isClassCumulativeAttendanceOpen && (
        <ClassCumulativeAttendanceModal
          isOpen={isClassCumulativeAttendanceOpen}
          onClose={() => setIsClassCumulativeAttendanceOpen(false)}
          currentModel={currentModel}
          allModels={models}
          selectedGradeLevel={selectedGradeLevel}
          selectedSection={selectedSection}
        />
      )}


      {/* المستطيل العمودي الثابت المصغر على جهة اليسار لمعرفة الجدول الحالي والشعبة عند النزول للجدول */}
      {isTableScrolledIntoView && !isCleanTableView && (
        <div
          dir="rtl"
          onClick={() => tableContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="fixed left-1 sm:left-2.5 top-1/2 -translate-y-1/2 z-40 no-print flex flex-col items-center bg-[#FAF7EC]/95 backdrop-blur-sm border border-[#BA916C]/60 shadow-lg rounded-xl p-1 sm:p-1.5 transition-all duration-300 animate-in fade-in slide-in-from-left-2 cursor-pointer hover:scale-105 active:scale-95 group select-none max-w-[62px] sm:max-w-[78px] text-center"
          title="الجدول الحالي - انقر للصعود لأعلى الجدول"
        >
          {/* Header Icon + Pulse indicator */}
          <div className="flex items-center gap-0.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#BA916C]" />
          </div>

          {/* Month Name */}
          <div className="text-[9px] sm:text-[10px] font-black text-[#2F2822] text-center leading-tight truncate w-full">
            {currentModel.name}
          </div>

          {/* Grade Level */}
          <div className="mt-0.5 text-[8px] sm:text-[9px] font-bold text-[#3A6C8F] bg-[#EEF4F8] border border-[#C5D9E8] px-1 py-0.5 rounded text-center leading-tight w-full truncate">
            {currentModel.gradeLevel || (selectedGradeLevel === 'ALL' ? 'الصف' : selectedGradeLevel)}
          </div>

          {/* Subject */}
          {currentModel.subject && (
            <div className="mt-0.5 text-[7.5px] sm:text-[8.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1 py-0.5 rounded text-center leading-tight w-full truncate">
              {currentModel.subject}
            </div>
          )}

          {/* Divider */}
          <div className="w-full my-0.5 border-t border-[#D8CEBD]/60" />

          {/* Section Indicator */}
          <div className="w-full">
            <span className="block text-[7.5px] sm:text-[8.5px] font-black text-[#8C6544] bg-[#F8F4EA] border border-[#BA916C]/40 px-1 py-0.5 rounded text-center leading-tight truncate">
              {selectedSection === 'ALL' ? 'كل الشُعب' : `شعبة ${selectedSection}`}
            </span>
          </div>

          {/* Scroll Up Hint */}
          <div className="mt-0.5 pt-0.5 border-t border-[#D8CEBD]/50 flex items-center justify-center text-[7.5px] sm:text-[8px] text-[#A69989] group-hover:text-[#BA916C] font-semibold leading-none">
            ▲ أعلى
          </div>
        </div>
      )}

      {/* Clean Fullscreen Table View (تمرير أفقي صافي بدون أي أزرار - يلتزم بالصف والشعبة المختارة) */}
      {isCleanTableView && (
        <CleanTableView
          model={currentModel}
          allModels={models}
          onClose={() => setIsCleanTableView(false)}
          onUpdateStudent={handleUpdateStudent}
          showRatingColumn={showRatingColumn}
          totalMax={totalMax}
          effectiveTotalMax={effectiveTotalMax}
          effectiveWrittenWeight={effectiveWrittenWeight}
          writtenScoreMode={writtenScoreMode}
          columnLabels={currentModel.columnLabels}
          selectedGradeLevel={selectedGradeLevel}
          selectedSection={selectedSection}
          onGradeChange={setSelectedGradeLevel}
          onSectionChange={setSelectedSection}
        />
      )}
    </div>
  );
};
