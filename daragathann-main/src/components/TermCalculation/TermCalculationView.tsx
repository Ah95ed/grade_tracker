import React, { useState, useMemo, useEffect } from 'react';
import { MonthlyModel, TermModel, TeacherProfile, RoundingMode } from '../../types';
import {
  calculateTermSummaries,
} from '../../utils/gradeCalculations';
import { triggerPrint } from '../../utils/printHelper';
import { getCurrentAcademicYear } from '../../utils/dateUtils';
import {
  getUniqueGradeLevels,
  getUniqueSections,
  isGradeLevelMatch,
  isSectionMatch,
  normalizeGradeLevel,
  STANDARD_GRADE_LEVELS,
} from '../../utils/gradeAndSectionMatcher';
import {
  Calculator,
  CheckCircle2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Users,
  Award,
  TrendingUp,
  Plus,
  Trash2,
  Search,
  X,
  Pencil,
  Check,
  Eye,
  EyeOff,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  GraduationCap,
  BookOpen,
  IdCard,
} from 'lucide-react';
import { CleanTermTableView } from './CleanTermTableView';
import { TermStudentCardsModal } from './TermStudentCardsModal';
import { AddTermModal, STANDARD_TERM_SUGGESTIONS, TERM_NAME_HISTORY_KEY } from './AddTermModal';
import { ConfirmDeleteModal } from '../Common/ConfirmDeleteModal';
import { ScoreRoundingModal } from '../MonthlySheet/ScoreRoundingModal';
import { StudentFloatingCloud, ActiveStudentCloudInfo } from '../Common/StudentFloatingCloud';
import { ColumnSlant, getSlantClasses, getNextSlant, SlantButton } from '../Common/ColumnSlantToggle';
import { StackedHeaderLabel } from '../Common/StackedHeaderLabel';
import { AppUser, getCurrentUser } from '../../utils/auth';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';
import { NumeralModeToggle } from '../Common/NumeralModeToggle';
import {
  NumeralMode,
  NUMERAL_MODE_STORAGE_KEY,
  formatScoreDisplay,
  getSavedNumeralMode,
} from '../../utils/numeralFormat';

function isSubjectMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const ca = canonicalizeArabic(a.trim());
  const cb = canonicalizeArabic(b.trim());
  if (ca === cb) return true;
  const stripAl = (s: string) => (s.startsWith('ال') ? s.slice(2) : s);
  return stripAl(ca) === stripAl(cb);
}

interface Props {
  terms: TermModel[];
  activeTermId: string;
  onSelectTerm: (id: string) => void;
  onUpdateTerm: (updatedTerm: TermModel) => void;
  onUpdateAllTerms?: (updatedTerms: TermModel[]) => void;
  onAddTerm: (newTerm: TermModel) => void;
  onDeleteTerm: (id: string) => void;
  monthlyModels: MonthlyModel[];
  profile: TeacherProfile;
  currentUser?: AppUser | null;
  numeralMode?: NumeralMode;
  onNumeralModeChange?: (mode: NumeralMode) => void;
}

export const TermCalculationView: React.FC<Props> = ({
  terms,
  activeTermId,
  onSelectTerm,
  onUpdateTerm,
  onUpdateAllTerms,
  onAddTerm,
  onDeleteTerm,
  monthlyModels,
  profile,
  currentUser,
  numeralMode: propNumeralMode,
  onNumeralModeChange: propOnNumeralModeChange,
}) => {
  const currentTerm = terms.find((t) => t.id === activeTermId) || terms[0];
  const [internalNumeralMode, setInternalNumeralMode] = useState<NumeralMode>(() => getSavedNumeralMode());
  const numeralMode: NumeralMode = propNumeralMode ?? internalNumeralMode;

  const handleNumeralModeChange = (mode: NumeralMode) => {
    setInternalNumeralMode(mode);
    try {
      localStorage.setItem(NUMERAL_MODE_STORAGE_KEY, mode);
    } catch {}
    propOnNumeralModeChange?.(mode);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  // Clean Fullscreen Table View without any buttons
  const [isCleanTableView, setIsCleanTableView] = useState(false);
  // Student Cards Modal (by student name with subjects, monthly scores & term averages)
  const [isStudentCardsModalOpen, setIsStudentCardsModalOpen] = useState(false);

  // Column header slant/orientation (normal | italic | vertical)
  const [columnSlants, setColumnSlants] = useState<Record<string, ColumnSlant>>(() => {
    try {
      const saved = currentTerm ? localStorage.getItem(`daragat_term_slants_${currentTerm.id}`) : null;
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleColumnSlant = (colKey: string) => {
    setColumnSlants((prev) => {
      const next = getNextSlant(prev[colKey]);
      const updated = { ...prev, [colKey]: next };
      if (currentTerm) {
        try {
          localStorage.setItem(`daragat_term_slants_${currentTerm.id}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };
  const [activeStudentCloud, setActiveStudentCloud] = useState<ActiveStudentCloudInfo | null>(null);
  const activeStudentCloudRef = React.useRef<ActiveStudentCloudInfo | null>(null);
  activeStudentCloudRef.current = activeStudentCloud;
  const activeRowRef = React.useRef<HTMLTableRowElement | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isNameColumnVisible, setIsNameColumnVisible] = useState(true);
  const hasActiveStudentCloud = Boolean(activeStudentCloud);

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
    const nextVisible = visibleWidth >= 60;

    setIsNameColumnVisible((prev) => (prev === nextVisible ? prev : nextVisible));
  }, []);

  // Keep floating badge locked with row vertically during scroll & update visibility (rAF-throttled)
  useEffect(() => {
    let rafId: number | null = null;

    const runUpdate = () => {
      rafId = null;
      const cloud = activeStudentCloudRef.current;
      if (activeRowRef.current && cloud) {
        const rect = activeRowRef.current.getBoundingClientRect();
        const navHeader = document.getElementById('main-navigation-header') || document.querySelector('header');
        const headerBottom = navHeader ? navHeader.getBoundingClientRect().bottom : 130;

        if (rect.top <= headerBottom || rect.top >= window.innerHeight) {
          setActiveStudentCloud(null);
        } else if (Math.abs(cloud.rowTop - rect.top) >= 0.5) {
          setActiveStudentCloud((prev) => (prev && Math.abs(prev.rowTop - rect.top) >= 0.5 ? { ...prev, rowTop: rect.top } : prev));
        }
      }
      checkNameColumnVisibility();
    };

    const handleScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(runUpdate);
    };

    checkNameColumnVisibility();

    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [checkNameColumnVisibility]);

  // Dismiss floating badge when clicking outside the table
  useEffect(() => {
    if (!hasActiveStudentCloud) return;

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
  }, [hasActiveStudentCloud]);

  // Check if current user is admin or school administration (الإدارة)
  const isAdministration = useMemo(() => {
    const user = currentUser || getCurrentUser();
    const userEmail = (user?.email || '').trim().toLowerCase();
    return (
      userEmail === 'asmaomar5566@gmail.com' ||
      user?.userRole === 'admin_school' ||
      profile.subject === 'الإدارة'
    );
  }, [currentUser, profile.subject]);

  const customSubjectsStorageKey = useMemo(() => {
    const user = currentUser || getCurrentUser();
    if (user?.uid) {
      return `gradebook_custom_subjects_${user.uid}`;
    }
    return 'gradebook_admin_custom_subjects_asmaomar5566';
  }, [currentUser]);

  // Deduplicated canonical grade levels extracted strictly from existing monthly models, students, or profile
  const availableGradesFromModels = useMemo(() => {
    const gradesSet = new Set<string>();
    monthlyModels.forEach((m) => {
      if (m.gradeLevel?.trim()) gradesSet.add(normalizeGradeLevel(m.gradeLevel.trim()));
      m.students.forEach((s) => {
        if (s.gradeLevel?.trim()) gradesSet.add(normalizeGradeLevel(s.gradeLevel.trim()));
      });
    });
    if (profile.gradeLevel?.trim()) {
      gradesSet.add(normalizeGradeLevel(profile.gradeLevel.trim()));
    }
    terms.forEach((t) => {
      if (t.gradeLevel?.trim()) gradesSet.add(normalizeGradeLevel(t.gradeLevel.trim()));
    });
    if (gradesSet.size === 0) {
      STANDARD_GRADE_LEVELS.forEach((g) => gradesSet.add(g));
    }
    return Array.from(gradesSet);
  }, [monthlyModels, profile.gradeLevel, terms]);

  // Canonical list of subjects chosen/created in "إنشاء نموذج" (CreateModelModal) and monthlyModels
  const availableSubjectsFromModels = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addSub = (s?: string) => {
      const trimmed = s?.trim();
      if (!trimmed || trimmed === 'الإدارة' || trimmed === 'عام') return;
      const canon = canonicalizeArabic(trimmed);
      if (!seen.has(canon)) {
        seen.add(canon);
        list.push(trimmed);
      }
    };

    // 1. Custom subjects explicitly chosen/saved in "إنشاء نموذج" (CreateModelModal)
    try {
      const rawUser = localStorage.getItem(customSubjectsStorageKey);
      const rawAdmin = localStorage.getItem('gradebook_admin_custom_subjects_asmaomar5566');
      const savedUserList: string[] = rawUser ? JSON.parse(rawUser) : [];
      const savedAdminList: string[] = rawAdmin ? JSON.parse(rawAdmin) : [];
      savedUserList.forEach(addSub);
      savedAdminList.forEach(addSub);
    } catch {}

    // 2. Subjects from existing monthly models created in "صفحة الجدول"
    monthlyModels.forEach((m) => {
      if (m.subject) addSub(m.subject);
    });

    // 3. Subjects from existing terms
    terms.forEach((t) => {
      if (t.subject) addSub(t.subject);
    });

    // 4. Primary teacher subject (if not 'الإدارة')
    if (profile.subject && profile.subject !== 'الإدارة') {
      addSub(profile.subject);
    }

    // 5. Default curriculum subjects if no custom subjects found yet
    if (list.length === 0) {
      const defaults = [
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
      ];
      defaults.forEach(addSub);
    }

    return list;
  }, [customSubjectsStorageKey, monthlyModels, terms, profile.subject]);

  const [isAddingNewTerm, setIsAddingNewTerm] = useState(false);
  const [newTermName, setNewTermName] = useState('');
  const [newTermGrade, setNewTermGrade] = useState('');
  const [newTermSubject, setNewTermSubject] = useState('');
  const [newTermTeacher, setNewTermTeacher] = useState('');
  const [newTermSections, setNewTermSections] = useState<string[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [termToDelete, setTermToDelete] = useState<TermModel | null>(null);
  const requestDeleteTerm = (term: TermModel) => {
    setTermToDelete(term);
    setIsDeleteModalOpen(true);
  };

  // Filter state for Term cards toolbar (term name and grade level)
  const [selectedTermNameFilter, setSelectedTermNameFilter] = useState('ALL');
  const [selectedTermGradeFilter, setSelectedTermGradeFilter] = useState('ALL');

  const availableTermNamesForFilter = useMemo(() => {
    const set = new Set<string>();
    terms.forEach((t) => {
      if (t.name?.trim()) set.add(t.name.trim());
    });
    return Array.from(set);
  }, [terms]);

  const availableTermGradesForFilter = useMemo(() => {
    const set = new Set<string>();
    terms.forEach((t) => {
      if (t.gradeLevel?.trim()) set.add(t.gradeLevel.trim());
    });
    return Array.from(set);
  }, [terms]);

  const displayedTerms = useMemo(() => {
    return terms.filter((t) => {
      if (selectedTermNameFilter !== 'ALL' && t.name?.trim() !== selectedTermNameFilter) {
        return false;
      }
      if (
        selectedTermGradeFilter !== 'ALL' &&
        !isGradeLevelMatch(t.gradeLevel || '', selectedTermGradeFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [terms, selectedTermNameFilter, selectedTermGradeFilter]);

  const regularTermsCount = useMemo(
    () =>
      terms.filter(
        (t) => t.sourceType !== 'terms' && !(t.selectedTermIds && t.selectedTermIds.length > 0)
      ).length,
    [terms]
  );

  // Horizontal scroll container ref & handlers for term cards
  const termCardsContainerRef = React.useRef<HTMLDivElement | null>(null);

  const handleScrollTerms = (direction: 'left' | 'right') => {
    if (!termCardsContainerRef.current) return;
    const scrollAmount = 320;
    const delta = direction === 'left' ? -scrollAmount : scrollAmount;
    termCardsContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  React.useEffect(() => {
    if (!termCardsContainerRef.current || !currentTerm?.id) return;
    const cardEl = termCardsContainerRef.current.querySelector(
      `[data-term-id="${currentTerm.id}"]`
    ) as HTMLElement | null;
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentTerm?.id]);

  // Helper to get scoped monthly models for any term
  const getScopedMonthlyModelsForTerm = React.useCallback(
    (term: TermModel) => {
      return monthlyModels.filter((m) => {
        const matchGrade = !term.gradeLevel || isGradeLevelMatch(m.gradeLevel || '', term.gradeLevel);
        const matchSub = !term.subject || isSubjectMatch(m.subject, term.subject);
        const matchTeacher =
          !term.teacherName ||
          !m.teacherName ||
          canonicalizeArabic(m.teacherName) === canonicalizeArabic(term.teacherName);
        return matchGrade && matchSub && matchTeacher;
      });
    },
    [monthlyModels]
  );

  // Helper to prevent circular term dependencies (A -> B -> A)
  const termDependsOn = React.useCallback(
    (termId: string, targetId: string, visited = new Set<string>()): boolean => {
      if (termId === targetId) return true;
      if (visited.has(termId)) return false;
      visited.add(termId);
      const found = terms.find((item) => item.id === termId);
      if (!found || !found.selectedTermIds?.length) return false;
      return found.selectedTermIds.some((childId) =>
        termDependsOn(childId, targetId, visited)
      );
    },
    [terms]
  );

  // Helper to get scoped created regular terms that can be included in any term
  const getScopedSourceTermsForAggregate = React.useCallback(
    (targetTerm: TermModel) => {
      return terms.filter((t) => {
        if (t.id === targetTerm.id) return false;
        if (termDependsOn(t.id, targetTerm.id)) return false;
        const matchGrade =
          !targetTerm.gradeLevel ||
          !t.gradeLevel ||
          isGradeLevelMatch(t.gradeLevel, targetTerm.gradeLevel);
        const matchSub =
          !targetTerm.subject || !t.subject || isSubjectMatch(t.subject, targetTerm.subject);
        const matchTeacher =
          !targetTerm.teacherName ||
          !t.teacherName ||
          canonicalizeArabic(t.teacherName) === canonicalizeArabic(targetTerm.teacherName);
        const matchSections =
          !targetTerm.assignedSections?.length ||
          !t.assignedSections?.length ||
          targetTerm.assignedSections.some((sec) =>
            t.assignedSections!.some((tSec) => isSectionMatch(tSec, sec))
          );
        return matchGrade && matchSub && matchTeacher && matchSections;
      });
    },
    [terms, termDependsOn]
  );

  // Toggle created term inclusion for any term (preserves selected monthly models)
  const handleToggleSourceTermForAggregate = (targetTerm: TermModel, sourceTermId: string) => {
    const currentValidSelected = Array.from(
      new Set(
        (targetTerm.selectedTermIds || []).filter((id) =>
          terms.some(
            (t) =>
              t.id === id &&
              t.id !== targetTerm.id &&
              !termDependsOn(t.id, targetTerm.id)
          )
        )
      )
    );

    const newSelectedTerms = currentValidSelected.includes(sourceTermId)
      ? currentValidSelected.filter((id) => id !== sourceTermId)
      : [...currentValidSelected, sourceTermId];

    const validModelIds = (targetTerm.selectedModelIds || []).filter((id) =>
      monthlyModels.some((m) => m.id === id)
    );
    const totalCount = validModelIds.length + newSelectedTerms.length;
    const mode: 'average' | 'sum' | 'single' =
      totalCount > 1
        ? targetTerm.calculationMode === 'sum'
          ? 'sum'
          : 'average'
        : 'single';

    onUpdateTerm({
      ...targetTerm,
      selectedTermIds: newSelectedTerms,
      sourceType: newSelectedTerms.length > 0 && validModelIds.length === 0 ? 'terms' : 'models',
      calculationMode: mode,
    });
  };

  // Toggle monthly model inclusion for any specific term (preserves selected created terms)
  const handleToggleModelForTerm = (targetTerm: TermModel, modelId: string) => {
    const currentValidSelected = Array.from(
      new Set(
        (targetTerm.selectedModelIds || []).filter((id) =>
          monthlyModels.some((m) => m.id === id)
        )
      )
    );

    let newSelected: string[];
    if (currentValidSelected.includes(modelId)) {
      newSelected = currentValidSelected.filter((id) => id !== modelId);
    } else {
      newSelected = [...currentValidSelected, modelId];
    }

    const validTermIds = (targetTerm.selectedTermIds || []).filter((id) =>
      terms.some(
        (t) =>
          t.id === id &&
          t.id !== targetTerm.id &&
          !termDependsOn(t.id, targetTerm.id)
      )
    );
    const totalCount = newSelected.length + validTermIds.length;
    const mode: 'average' | 'sum' | 'single' =
      totalCount > 1
        ? targetTerm.calculationMode === 'sum'
          ? 'sum'
          : 'average'
        : 'single';

    try {
      localStorage.setItem(
        `daragat_term_selected_models_${targetTerm.id}`,
        JSON.stringify(newSelected)
      );
    } catch {}

    onUpdateTerm({
      ...targetTerm,
      selectedModelIds: newSelected,
      sourceType: validTermIds.length > 0 && newSelected.length === 0 ? 'terms' : 'models',
      calculationMode: mode,
    });
  };

  const handleOpenEditSpecificTerm = (term: TermModel) => {
    onSelectTerm(term.id);
    setEditTermNameValue(term.name);
    setEditTermGradeValue(term.gradeLevel || availableGradesFromModels[0] || '');
    setEditTermSubjectValue(term.subject || availableSubjectsFromModels[0] || '');
    setEditTermTeacherValue(term.teacherName || '');
    setEditTermSectionsValue(term.assignedSections || []);
    setIsEditingTermName(true);
  };

  const [isRoundingModalOpen, setIsRoundingModalOpen] = useState(false);

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

  // Check if subject column should be displayed in table (always in administration mode, or when term has a subject)
  const showSubjectColumn = isAdministration || Boolean(currentTerm?.subject);

  // Edit Term Name & Scope states
  const [isEditingTermName, setIsEditingTermName] = useState(false);
  const [editTermNameValue, setEditTermNameValue] = useState('');
  const [editTermGradeValue, setEditTermGradeValue] = useState('');
  const [editTermSubjectValue, setEditTermSubjectValue] = useState('');
  const [editTermTeacherValue, setEditTermTeacherValue] = useState('');
  const [editTermSectionsValue, setEditTermSectionsValue] = useState<string[]>([]);

  // Find all registered teachers for the selected grade & subject during term creation
  const matchingTeachersForNewTerm = useMemo(() => {
    if (!newTermGrade || !newTermSubject) return [];
    const matching = monthlyModels.filter(
      (m) =>
        isGradeLevelMatch(m.gradeLevel || '', newTermGrade) &&
        isSubjectMatch(m.subject, newTermSubject) &&
        Boolean(m.teacherName?.trim())
    );
    const map = new Map<string, { teacherName: string; sections: Set<string> }>();
    matching.forEach((m) => {
      const t = m.teacherName!.trim();
      const canon = canonicalizeArabic(t);
      if (!map.has(canon)) {
        map.set(canon, { teacherName: t, sections: new Set<string>() });
      }
      const entry = map.get(canon)!;
      if (m.assignedSections && m.assignedSections.length > 0) {
        m.assignedSections.forEach((s) => entry.sections.add(s));
      } else {
        (m.students || []).forEach((s) => {
          if (s.section?.trim()) entry.sections.add(s.section.trim());
        });
      }
    });
    return Array.from(map.values()).map((e) => ({
      teacherName: e.teacherName,
      sections: Array.from(e.sections),
    }));
  }, [monthlyModels, newTermGrade, newTermSubject]);

  // Auto-sync teacher & sections when grade or subject changes during term creation
  useEffect(() => {
    if (matchingTeachersForNewTerm.length === 1) {
      setNewTermTeacher(matchingTeachersForNewTerm[0].teacherName);
      setNewTermSections(matchingTeachersForNewTerm[0].sections);
    } else if (matchingTeachersForNewTerm.length > 1) {
      const exists = matchingTeachersForNewTerm.some(
        (t) => canonicalizeArabic(t.teacherName) === canonicalizeArabic(newTermTeacher)
      );
      if (!exists) {
        setNewTermTeacher(matchingTeachersForNewTerm[0].teacherName);
        setNewTermSections(matchingTeachersForNewTerm[0].sections);
      }
    } else if (!newTermTeacher) {
      setNewTermTeacher(profile.teacherName || '');
      setNewTermSections([]);
    }
  }, [matchingTeachersForNewTerm]);

  const handleOpenEditTermName = () => {
    if (!currentTerm) return;
    setEditTermNameValue(currentTerm.name);
    setEditTermGradeValue(currentTerm.gradeLevel || availableGradesFromModels[0] || '');
    setEditTermSubjectValue(currentTerm.subject || availableSubjectsFromModels[0] || '');
    setEditTermTeacherValue(currentTerm.teacherName || '');
    setEditTermSectionsValue(currentTerm.assignedSections || []);
    setIsEditingTermName(true);
  };

  const handleSaveTermName = () => {
    if (!currentTerm || !editTermNameValue.trim()) return;
    const updatedGrade = editTermGradeValue || undefined;
    const updatedSubject = editTermSubjectValue || undefined;
    const updatedTeacher = editTermTeacherValue.trim() || undefined;

    const hasSourceTerms =
      currentTerm.sourceType === 'terms' || Boolean(currentTerm.selectedTermIds?.length);
    const hasDirectModels = (currentTerm.selectedModelIds || []).length > 0;

    const matchingTermIds = hasSourceTerms
      ? terms
          .filter((t) => {
            if (
              t.id === currentTerm.id ||
              t.sourceType === 'terms' ||
              (t.selectedTermIds && t.selectedTermIds.length > 0)
            ) {
              return false;
            }
            const matchGrade =
              !updatedGrade || !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, updatedGrade);
            const matchSub =
              !updatedSubject || !t.subject || isSubjectMatch(t.subject, updatedSubject);
            const matchTeacher =
              !updatedTeacher ||
              !t.teacherName ||
              canonicalizeArabic(t.teacherName) === canonicalizeArabic(updatedTeacher);
            return matchGrade && matchSub && matchTeacher;
          })
          .map((t) => t.id)
      : [];

    const matchingModelIds =
      hasDirectModels || !hasSourceTerms
        ? monthlyModels
            .filter((m) => {
              const matchGrade = !updatedGrade || isGradeLevelMatch(m.gradeLevel || '', updatedGrade);
              const matchSub = !updatedSubject || isSubjectMatch(m.subject, updatedSubject);
              const matchTeacher =
                !updatedTeacher ||
                !m.teacherName ||
                canonicalizeArabic(m.teacherName) === canonicalizeArabic(updatedTeacher);
              return matchGrade && matchSub && matchTeacher;
            })
            .map((m) => m.id)
        : [];

    const nextModelIds =
      hasDirectModels || !hasSourceTerms
        ? matchingModelIds.length > 0
          ? matchingModelIds
          : currentTerm.selectedModelIds
        : [];
    const nextTermIds = hasSourceTerms
      ? matchingTermIds.length > 0
        ? matchingTermIds
        : currentTerm.selectedTermIds || []
      : currentTerm.selectedTermIds;
    const totalCount = nextModelIds.length + (nextTermIds?.length || 0);

    onUpdateTerm({
      ...currentTerm,
      name: editTermNameValue.trim(),
      gradeLevel: updatedGrade,
      subject: updatedSubject,
      teacherName: updatedTeacher,
      assignedSections: editTermSectionsValue.length > 0 ? editTermSectionsValue : undefined,
      selectedModelIds: nextModelIds,
      selectedTermIds: nextTermIds,
      sourceType: nextTermIds && nextTermIds.length > 0 && nextModelIds.length === 0 ? 'terms' : 'models',
      calculationMode:
        totalCount > 1
          ? currentTerm.calculationMode === 'sum'
            ? 'sum'
            : 'average'
          : 'single',
    });

    if (updatedGrade) {
      setSelectedGradeLevel(updatedGrade);
    }

    try {
      const trimmed = editTermNameValue.trim();
      const raw = localStorage.getItem(TERM_NAME_HISTORY_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter((item) => canonicalizeArabic(item) !== canonicalizeArabic(trimmed));
      updated.push(trimmed);
      localStorage.setItem(TERM_NAME_HISTORY_KEY, JSON.stringify(updated));
    } catch {}

    setIsEditingTermName(false);
  };

  const allTermNameSuggestions = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const add = (n?: string) => {
      const t = n?.trim();
      if (!t) return;
      const c = canonicalizeArabic(t);
      if (!seen.has(c)) {
        seen.add(c);
        list.push(t);
      }
    };
    if (terms && terms.length > 0) {
      for (let i = terms.length - 1; i >= 0; i--) {
        add(terms[i].name);
      }
    }
    try {
      const raw = localStorage.getItem(TERM_NAME_HISTORY_KEY);
      const saved: string[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(saved)) {
        for (let i = saved.length - 1; i >= 0; i--) add(saved[i]);
      }
    } catch {}
    STANDARD_TERM_SUGGESTIONS.forEach(add);
    return list;
  }, [terms]);

  const [defaultSuggestedTermName, setDefaultSuggestedTermName] = useState('الفصل الأول');
  const [highlightAverageCol, setHighlightAverageCol] = useState(false);
  const scrollTargetPendingRef = React.useRef(false);

  const scrollToAverageColumn = React.useCallback(() => {
    scrollTargetPendingRef.current = true;

    const executeScroll = () => {
      const targetCol =
        document.getElementById('term-calculated-average-col') ||
        document.querySelector('[data-term-average-col="true"]');

      if (targetCol) {
        // 1. Horizontal scroll inside tableContainerRef so the average column is comfortably centered
        if (tableContainerRef.current) {
          const container = tableContainerRef.current;
          const colRect = targetCol.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const scrollDiff = (colRect.left + colRect.width / 2) - (containerRect.left + containerRect.width / 2);
          container.scrollBy({
            left: scrollDiff,
            behavior: 'smooth',
          });
        } else {
          targetCol.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // 2. Vertical window scroll so the table header is clearly in view
        const rect = targetCol.getBoundingClientRect();
        const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = currentScrollY + rect.top - 160;
        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: 'smooth',
        });

        // 3. Highlight column temporarily with glowing border and badge
        setHighlightAverageCol(true);
        setTimeout(() => {
          setHighlightAverageCol(false);
        }, 4500);
        scrollTargetPendingRef.current = false;
      }
    };

    setTimeout(executeScroll, 120);
    setTimeout(executeScroll, 350);
    setTimeout(executeScroll, 700);
  }, []);

  useEffect(() => {
    if (scrollTargetPendingRef.current) {
      scrollToAverageColumn();
    }
  }, [activeTermId, terms, scrollToAverageColumn]);

  const handleCreateTermFromModal = (termData: {
    name: string;
    gradeLevel?: string;
    subject?: string;
    teacherName?: string;
    assignedSections?: string[];
    selectedModelIds: string[];
    selectedTermIds: string[];
    calculationMode: 'average' | 'sum' | 'single';
  }) => {
    const termId = 'term-' + Date.now();
    const hasTerms = termData.selectedTermIds.length > 0;
    const hasModels = termData.selectedModelIds.length > 0;
    const newTerm: TermModel = {
      id: termId,
      name: termData.name.trim(),
      gradeLevel: termData.gradeLevel,
      subject: termData.subject,
      teacherName: termData.teacherName,
      assignedSections: termData.assignedSections,
      selectedModelIds: termData.selectedModelIds,
      sourceType: hasTerms && !hasModels ? 'terms' : 'models',
      selectedTermIds: hasTerms ? termData.selectedTermIds : undefined,
      calculationMode: termData.calculationMode,
      notes: '',
    };
    onAddTerm(newTerm);
    onSelectTerm(termId);
    if (termData.gradeLevel) {
      setSelectedGradeLevel(termData.gradeLevel);
    }
    setNewTermName('');
    setNewTermTeacher('');
    setNewTermSections([]);
    setIsAddingNewTerm(false);

    // Scroll smoothly to the term average column!
    scrollToAverageColumn();
  };

  const handleOpenAddTerm = () => {
    const nextNum = regularTermsCount + 1;
    const suggested =
      nextNum === 1 ? 'الفصل الأول' : nextNum === 2 ? 'الفصل الثاني' : nextNum === 3 ? 'الفصل الثالث' : `الفصل ${nextNum}`;
    setDefaultSuggestedTermName(suggested);
    setNewTermName(suggested);
    const initGrade = currentTerm?.gradeLevel || availableGradesFromModels[0] || '';
    const initSub = currentTerm?.subject || availableSubjectsFromModels[0] || '';
    setNewTermGrade(initGrade);
    setNewTermSubject(initSub);
    setNewTermTeacher(currentTerm?.teacherName || profile.teacherName || '');
    setNewTermSections(currentTerm?.assignedSections || []);
    setIsAddingNewTerm(true);
  };

  // Scoped monthly models filtered strictly by current term's Grade Level, Subject, AND Teacher (if set)
  const scopedMonthlyModels = useMemo(() => {
    if (!currentTerm) return monthlyModels;
    return monthlyModels.filter((m) => {
      const matchGrade =
        !currentTerm.gradeLevel || isGradeLevelMatch(m.gradeLevel || '', currentTerm.gradeLevel);
      const matchSubject =
        !currentTerm.subject || isSubjectMatch(m.subject, currentTerm.subject);
      const matchTeacher =
        !currentTerm.teacherName ||
        !m.teacherName ||
        canonicalizeArabic(m.teacherName) === canonicalizeArabic(currentTerm.teacherName);
      return matchGrade && matchSubject && matchTeacher;
    });
  }, [monthlyModels, currentTerm]);

  // Self-heal and sync term's selectedModelIds AND selectedTermIds so phantom/deleted IDs are never counted.
  // CRITICAL: Must be placed BEFORE any early return to satisfy React Rules of Hooks!
  React.useEffect(() => {
    if (!currentTerm) return;

    const currentTermIds = currentTerm.selectedTermIds || [];
    const validTermIds = Array.from(
      new Set(
        currentTermIds.filter((id) =>
          terms.some(
            (t) =>
              t.id === id &&
              t.id !== currentTerm.id &&
              !termDependsOn(t.id, currentTerm.id)
          )
        )
      )
    );

    let currentIds = currentTerm.selectedModelIds || [];

    // Check saved selections only when both models and terms are empty
    if (currentIds.length === 0 && validTermIds.length === 0 && currentTerm.sourceType !== 'terms') {
      try {
        const saved = localStorage.getItem(`daragat_term_selected_models_${currentTerm.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentIds = parsed;
          }
        }
      } catch {}
    }

    const validIds = Array.from(
      new Set(
        currentIds.filter((id) =>
          scopedMonthlyModels.some((m) => m.id === id)
        )
      )
    );

    const termsChanged =
      validTermIds.length !== currentTermIds.length ||
      validTermIds.some((id, idx) => id !== currentTermIds[idx]);
    const modelsChanged =
      validIds.length !== (currentTerm.selectedModelIds || []).length ||
      validIds.some((id, idx) => id !== currentTerm.selectedModelIds[idx]);

    if (termsChanged || modelsChanged) {
      const totalCount = validIds.length + validTermIds.length;
      onUpdateTerm({
        ...currentTerm,
        selectedModelIds: validIds,
        selectedTermIds: validTermIds.length > 0 ? validTermIds : undefined,
        sourceType: validTermIds.length > 0 && validIds.length === 0 ? 'terms' : 'models',
        calculationMode:
          totalCount > 1
            ? currentTerm.calculationMode === 'sum'
              ? 'sum'
              : 'average'
            : 'single',
      });
    }
  }, [currentTerm?.id, currentTerm?.sourceType, scopedMonthlyModels, terms]);

  // Memoized student summaries across chosen models and/or chosen source terms
  const studentSummaries = useMemo(() => {
    if (!currentTerm) return [];
    const hasSourceTerms =
      currentTerm.sourceType === 'terms' || Boolean(currentTerm.selectedTermIds?.length);
    const modelsInput = hasSourceTerms ? monthlyModels : scopedMonthlyModels;
    const summaries = calculateTermSummaries(currentTerm, modelsInput, terms);
    if (currentTerm.assignedSections && currentTerm.assignedSections.length > 0) {
      return summaries.filter((s) =>
        currentTerm.assignedSections!.some((sec) => isSectionMatch(s.section || 'أ', sec))
      );
    }
    return summaries;
  }, [currentTerm, monthlyModels, scopedMonthlyModels, terms]);

  // Check if any student in the active term has decimal / fractional scores, or if rounding is configured
  const hasDecimalScores = useMemo(() => {
    if (!studentSummaries || studentSummaries.length === 0) return false;
    const hasRawDecimals = studentSummaries.some((s) => {
      const raw = s.rawTermScore ?? s.finalTermScore;
      if (raw === null || raw === undefined) return false;
      return Math.abs(raw - Math.round(raw)) > 0.001;
    });
    const currentRoundingMode = currentTerm?.roundingMode || 'none';
    return hasRawDecimals || currentRoundingMode !== 'none';
  }, [studentSummaries, currentTerm]);

  const handleSaveRounding = (newMode: RoundingMode, newThreshold: number, applyToSameGradeAndSubject: boolean) => {
    if (!currentTerm) return;
    if (applyToSameGradeAndSubject && onUpdateAllTerms) {
      const currentGradeNorm = (currentTerm.gradeLevel || '').trim().toLowerCase();
      const currentSubjNorm = (currentTerm.subject || '').trim().toLowerCase();

      const updated = terms.map((t) => {
        const tGradeNorm = (t.gradeLevel || '').trim().toLowerCase();
        const tSubjNorm = (t.subject || '').trim().toLowerCase();
        const isTarget =
          t.id === currentTerm.id ||
          (tGradeNorm === currentGradeNorm && tSubjNorm === currentSubjNorm);

        if (isTarget) {
          return {
            ...t,
            roundingMode: newMode,
            roundingThreshold: newThreshold,
          };
        }
        return t;
      });
      onUpdateAllTerms(updated);
    } else {
      onUpdateTerm({
        ...currentTerm,
        roundingMode: newMode,
        roundingThreshold: newThreshold,
      });
    }
  };

  if (!currentTerm) {
    return (
      <div className="space-y-4">
        {/* Top Action Button: Single unified "إضافة فصل دراسي جديد" */}
        <div className="no-print">
          <button
            type="button"
            onClick={handleOpenAddTerm}
            className="w-full py-2.5 px-4 bg-[#B86848] hover:bg-[#A05537] border border-[#944D30] active:scale-99 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            title={isAdministration ? 'إضافة فصل دراسي جديد' : `إضافة فصل دراسي جديد مادة ${profile.subject || 'المادة'}`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isAdministration ? 'إضافة فصل دراسي جديد' : `إضافة فصل جديد مادة ${profile.subject || 'المادة'}`}</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E4DA] p-8 sm:p-12 text-center shadow-xs max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EEF4F8] border border-[#D2E0EC] flex items-center justify-center text-[#557A95] shadow-xs">
            <Calendar className="w-8 h-8 text-[#557A95]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#2E2B27]">لا يوجد أي فصل دراسي حالياً</h2>
            <p className="text-sm text-[#7A746B] mt-1.5 leading-relaxed">
              صفحة الفصول فارغة حالياً. يمكنك البدء بإضافة أول فصل دراسي (مثل الفصل الأول) واحتساب معدلات الدرجات.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleOpenAddTerm}
              className="px-6 py-3 bg-[#487B5D] hover:bg-[#3C684E] active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ إضافة فصل دراسي جديد</span>
            </button>
          </div>
        </div>

        {/* Modal for Adding a New Term */}
        <AddTermModal
          isOpen={isAddingNewTerm}
          onClose={() => setIsAddingNewTerm(false)}
          onSubmit={handleCreateTermFromModal}
          availableGrades={availableGradesFromModels}
          availableSubjects={availableSubjectsFromModels}
          monthlyModels={monthlyModels}
          initialGrade={newTermGrade || availableGradesFromModels[0]}
          initialSubject={newTermSubject || availableSubjectsFromModels[0]}
          initialTeacher={newTermTeacher || profile.teacherName}
          initialSections={newTermSections}
          defaultName={defaultSuggestedTermName}
          profile={profile}
          existingTerms={terms}
        />
      </div>
    );
  }

  // Toggle a monthly model in/out of the calculation via checkbox
  const handleToggleModel = (modelId: string) => {
    // Only consider models that actually exist
    const currentValidSelected = Array.from(
      new Set(
        (currentTerm.selectedModelIds || []).filter((id) =>
          monthlyModels.some((m) => m.id === id)
        )
      )
    );

    let newSelected: string[];
    if (currentValidSelected.includes(modelId)) {
      // Uncheck freely - even if it becomes empty
      newSelected = currentValidSelected.filter((id) => id !== modelId);
    } else {
      // Check
      newSelected = [...currentValidSelected, modelId];
    }

    // Auto set calculationMode
    const mode = newSelected.length > 1 ? 'average' : 'single';

    // Persist to localStorage for this specific term so it is remembered on next opening
    try {
      localStorage.setItem(
        `daragat_term_selected_models_${currentTerm.id}`,
        JSON.stringify(newSelected)
      );
    } catch {}

    onUpdateTerm({
      ...currentTerm,
      selectedModelIds: newSelected,
      calculationMode: mode,
    });
  };

    // Grade levels & Sections filter (canonically deduplicated)
  const allGradeLevels = getUniqueGradeLevels(studentSummaries);
  const allSections = getUniqueSections(studentSummaries);

  const filteredSummaries = studentSummaries.filter((s) => {
    const matchName = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGrade = isGradeLevelMatch(s.gradeLevel, selectedGradeLevel);
    const matchSection = isSectionMatch(s.section, selectedSection);
    return matchName && matchGrade && matchSection;
  });

  // Analytics
  const validScores = studentSummaries
    .map((s) => s.finalTermScore)
    .filter((score): score is number => score !== null);

  const totalCount = studentSummaries.length;
  const passedCount = studentSummaries.filter(
    (s) => s.finalTermScore !== null && s.status === 'passed'
  ).length;
  const passRate =
    validScores.length > 0 ? Math.round((passedCount / validScores.length) * 100) : 0;
  const avgScore =
    validScores.length > 0
      ? Math.round(
          (validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length) * 10
        ) / 10
      : 0;
  const maxScore = validScores.length > 0 ? Math.max(...validScores) : 0;

  // Selected models AND selected source terms objects (supports months, created terms, or both together)
  const selectedModelsObj = monthlyModels.filter((m) =>
    (currentTerm.selectedModelIds || []).includes(m.id)
  );
  const selectedSourceTermsObj = terms.filter(
    (t) =>
      (currentTerm.selectedTermIds || []).includes(t.id) &&
      t.id !== currentTerm.id &&
      !termDependsOn(t.id, currentTerm.id)
  );
  const isAggregateTerms =
    selectedSourceTermsObj.length > 0 || currentTerm.sourceType === 'terms';
  const activeSourceItems = [
    ...selectedModelsObj.map((m) => ({
      kind: 'model' as const,
      id: m.id,
      name: m.name,
      subject: m.subject,
    })),
    ...selectedSourceTermsObj.map((t) => ({
      kind: 'term' as const,
      id: t.id,
      name: t.name,
      subject: t.subject,
    })),
  ];

  // Export CSV
  const handleExportCSV = () => {
    const exportGradeLabel = 'الصف الدراسي';
    const exportSectionLabel = 'الشعبة';
    const exportFinalScoreLabel = 'النهائي';
    const effectiveAcademicYear = profile.academicYear?.trim() || getCurrentAcademicYear();

    const headers = [
      'م',
      'اسم الطالب',
      exportGradeLabel,
      exportSectionLabel,
      'السنة الدراسية',
      ...(showSubjectColumn ? ['اسم الدرس'] : []),
      ...activeSourceItems.map((item) => `درجة ${item.name}`),
      exportFinalScoreLabel,
      'التقدير',
      'الحالة',
    ];

    const currentSubName =
      currentTerm.subject ||
      selectedModelsObj[0]?.subject ||
      selectedSourceTermsObj[0]?.subject ||
      '';

    const rows = filteredSummaries.map((s, idx) => {
      const monthScores = s.monthlyScores.map((ms) => ms.score ?? '');
      return [
        idx + 1,
        `"${s.name}"`,
        `"${s.gradeLevel}"`,
        `"${s.section}"`,
        `"${effectiveAcademicYear}"`,
        ...(showSubjectColumn ? [`"${currentSubName}"`] : []),
        ...monthScores,
        s.finalTermScore ?? '',
        `"${s.gradeText}"`,
        s.status === 'passed' ? 'ناجح' : 'راسب',
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `درجات_${currentTerm.name}_المعتمدة.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top Action Button: Single unified "إضافة فصل دراسي جديد" */}
      <div className="no-print">
        <button
          type="button"
          onClick={handleOpenAddTerm}
          className="w-full py-2.5 px-4 bg-[#B86848] hover:bg-[#A05537] border border-[#944D30] active:scale-99 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          title={isAdministration ? 'إضافة فصل دراسي جديد' : `إضافة فصل دراسي جديد مادة ${profile.subject || 'المادة'}`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{isAdministration ? 'إضافة فصل دراسي جديد' : `إضافة فصل جديد مادة ${profile.subject || 'المادة'}`}</span>
        </button>
      </div>

      {/* Term Cards Slider with Square Cards & Horizontal Navigation */}
      <div className="bg-[#FAF7EC] p-3.5 sm:p-5 rounded-2xl border border-[#D8CEBD] shadow-xs no-print">
        {/* Top Toolbar: Title + Compact Filter Box + Horizontal Navigation Arrows */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6DCB8]/60 flex-wrap gap-2">
          {/* Title & Count Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B86848]"></span>
            <h3 className="text-xs sm:text-sm md:text-base font-black text-[#2F2822] whitespace-nowrap">
              فصول ونماذج احتساب الدرجات
            </h3>
            <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-[#EFE3DC] text-[#4A2818] whitespace-nowrap">
              {formatScoreDisplay(displayedTerms.length, numeralMode)} من {formatScoreDisplay(terms.length, numeralMode)}
            </span>
          </div>

          {/* Controls Group: Filter Box + Navigation Arrows on the same line */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-wrap">
            {/* Rectangular Box with "تصفية" on top border containing only the two dropdowns */}
            {(availableTermNamesForFilter.length > 0 || availableTermGradesForFilter.length > 0) && (
              <div className="relative border border-[#CBB69F] rounded-xl px-1.5 sm:px-2 py-1 inline-flex items-center gap-1 sm:gap-1.5 bg-[#FAF7F0]/80 mt-1 sm:mt-0">
                {/* Centered label on top border */}
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#FAF7EC] px-1 text-[10px] font-black text-[#8C7662] leading-none whitespace-nowrap select-none">
                  تصفية
                </span>

                {/* 1. قائمة منبثقة لاسم الفصل الدراسي */}
                {availableTermNamesForFilter.length > 0 && (
                  <select
                    value={selectedTermNameFilter}
                    onChange={(e) => setSelectedTermNameFilter(e.target.value)}
                    className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white border border-[#D8CEBD] rounded-lg text-[11px] font-bold text-[#3D2E21] focus:ring-1 focus:ring-[#B86848] focus:outline-none cursor-pointer shadow-2xs hover:border-[#B86848] transition-colors max-w-[105px] sm:max-w-[130px] truncate"
                    title="تصفية حسب اسم الفصل"
                  >
                    <option value="ALL">جميع الفصول ({formatScoreDisplay(terms.length, numeralMode)})</option>
                    {availableTermNamesForFilter.map((name) => {
                      const count = terms.filter((t) => t.name?.trim() === name).length;
                      return (
                        <option key={name} value={name}>
                          {name} ({formatScoreDisplay(count, numeralMode)})
                        </option>
                      );
                    })}
                  </select>
                )}

                {/* 2. قائمة منبثقة للصف الدراسي */}
                {availableTermGradesForFilter.length > 0 && (
                  <select
                    value={selectedTermGradeFilter}
                    onChange={(e) => setSelectedTermGradeFilter(e.target.value)}
                    className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white border border-[#D8CEBD] rounded-lg text-[11px] font-bold text-[#3D2E21] focus:ring-1 focus:ring-[#B86848] focus:outline-none cursor-pointer shadow-2xs hover:border-[#B86848] transition-colors max-w-[95px] sm:max-w-[120px] truncate"
                    title="تصفية حسب الصف الدراسي"
                  >
                    <option value="ALL">جميع الصفوف</option>
                    {availableTermGradesForFilter.map((grade) => {
                      const count = terms.filter((t) =>
                        isGradeLevelMatch(t.gradeLevel || '', grade)
                      ).length;
                      return (
                        <option key={grade} value={grade}>
                          {grade} ({formatScoreDisplay(count, numeralMode)})
                        </option>
                      );
                    })}
                  </select>
                )}

                {/* زر إلغاء الفرز السريع إذا كانت الفلترة مفعلة */}
                {(selectedTermNameFilter !== 'ALL' || selectedTermGradeFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTermNameFilter('ALL');
                      setSelectedTermGradeFilter('ALL');
                    }}
                    className="w-5 h-5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="إلغاء التصفية وعرض الكل"
                    aria-label="إلغاء التصفية"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                )}
              </div>
            )}

            {/* Navigation Arrows for Horizontal Scrolling */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleScrollTerms('right')}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white hover:bg-[#EFE3DC] active:bg-[#E5D4CB] border border-[#D8CEBD] text-[#4A2818] flex items-center justify-center transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                title="التمرير لليمين (الفصول السابقة)"
                aria-label="التمرير لليمين"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => handleScrollTerms('left')}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white hover:bg-[#EFE3DC] active:bg-[#E5D4CB] border border-[#D8CEBD] text-[#4A2818] flex items-center justify-center transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                title="التمرير لليسار (الفصول التالية)"
                aria-label="التمرير لليسار"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Container with Side Navigation Buttons */}
        <div className="relative group/scroll">
          {/* Floating scroll arrows on container sides for desktop */}
          <button
            type="button"
            onClick={() => handleScrollTerms('right')}
            className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-[#4A2818] border border-[#D8CEBD] shadow-md items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="تصفح لليمين"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => handleScrollTerms('left')}
            className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-[#4A2818] border border-[#D8CEBD] shadow-md items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="تصفح لليسار"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div
            ref={termCardsContainerRef}
            className="flex items-stretch gap-3.5 overflow-x-auto pb-3 pt-1 px-1 scroll-smooth max-w-full"
            style={{ scrollbarWidth: 'thin' }}
          >
            {displayedTerms.map((term) => {
              const isActive = term.id === currentTerm.id;
              const isAgg =
                term.sourceType === 'terms' ||
                Boolean(term.selectedTermIds && term.selectedTermIds.length > 0);
              const matchingScoped = getScopedMonthlyModelsForTerm(term);
              const selectedForTerm = matchingScoped.filter((m) =>
                (term.selectedModelIds || []).includes(m.id)
              );
              const matchingSourceTerms = getScopedSourceTermsForAggregate(term);
              const selectedSourceForAgg = matchingSourceTerms.filter((t) =>
                (term.selectedTermIds || []).includes(t.id)
              );

              return (
                <div
                  key={term.id}
                  data-term-id={term.id}
                  onClick={() => {
                    onSelectTerm(term.id);
                    if (term.gradeLevel) {
                      setSelectedGradeLevel(term.gradeLevel);
                    }
                  }}
                  className={`w-72 sm:w-80 shrink-0 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none border-2 text-right relative snap-start ${
                    isActive
                      ? isAgg
                        ? 'bg-[#F8FBF9] border-[#3B6554] shadow-md ring-2 ring-[#3B6554]/25'
                        : 'bg-[#FFFDFC] border-[#B86848] shadow-md ring-2 ring-[#B86848]/25'
                      : isAgg
                      ? 'bg-[#F3F8F5] hover:bg-[#EAF3EE] border-[#B8D1C4] hover:border-[#3B6554]/70 shadow-2xs hover:shadow-xs'
                      : 'bg-[#FAF7EC] hover:bg-[#F3EFE0] border-[#D8CEBD] hover:border-[#B86848]/60 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  {/* Top Action Header (Status & Edit / Delete Buttons) */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E6DCB8]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive
                            ? isAgg
                              ? 'bg-[#3B6554] animate-pulse'
                              : 'bg-[#B86848] animate-pulse'
                            : 'bg-slate-400'
                        }`}
                      ></span>
                      <span className={`text-[11px] font-bold ${isAgg ? 'text-[#2E5243]' : 'text-[#8C7662]'}`}>
                        {isAgg ? 'معدل الفصول الدراسية' : 'صفحة احتساب الدرجات'}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenEditSpecificTerm(term)}
                        className="w-7 h-7 rounded-lg bg-[#B86848]/10 hover:bg-[#B86848] text-[#8C4325] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        title={`تعديل مسمى وبيانات ${term.name}`}
                        aria-label={`تعديل ${term.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteTerm(term)}
                        className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        title={`حذف ${term.name}`}
                        aria-label={`حذف ${term.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Title / Term Name */}
                  <div className="mb-2.5">
                    <h4 className="text-base sm:text-lg font-black text-[#2F2822] leading-tight flex items-center gap-1.5 flex-wrap">
                      <span>{term.name}</span>
                      {isAgg && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#E1EFE8] text-[#264A3B] border border-[#B2D3C2]">
                          يشمل فصول
                        </span>
                      )}
                      {isActive && (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded-md text-white ${
                            isAgg ? 'bg-[#3B6554]' : 'bg-[#B86848]'
                          }`}
                        >
                          المعروض حالياً
                        </span>
                      )}
                    </h4>
                  </div>

                  {/* Info Badges (Grade, Subject, Teacher, Sections) */}
                  <div className="flex flex-col gap-1.5 mb-2.5 text-xs">
                    {/* الصف والمادة */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {term.gradeLevel ? (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-blue-50 text-blue-900 border border-blue-200/90 flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
                          <span>{term.gradeLevel}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-100">
                          الصف غير محدد
                        </span>
                      )}

                      {term.subject ? (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-50 text-amber-900 border border-amber-200/90 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                          <span>{term.subject}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-100">
                          المادة غير محددة
                        </span>
                      )}
                    </div>

                    {/* الأستاذ */}
                    <div className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50/90 text-emerald-950 border border-emerald-200/80 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">
                        الأستاذ: <strong className="font-black">{term.teacherName || 'غير محدد'}</strong>
                      </span>
                    </div>

                    {/* الشُعب المخصصة */}
                    <div className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-50/90 text-[#544030] border border-amber-200/80 flex items-center justify-between gap-1">
                      <span className="text-[#8C7662] font-semibold text-[11px]">الشُعب المخصصة:</span>
                      <span className="font-black text-[#2F2822]">
                        {term.assignedSections?.length ? term.assignedSections.join('، ') : 'جميع الشُعب'}
                      </span>
                    </div>
                  </div>

                  {/* Two Separate Colored Bordered Rectangles: Monthly Models (Terracotta) & Created Terms (Emerald) */}
                  <div
                    className="pt-2 border-t border-[#E6DCB8]/80 space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Rectangle 1: Monthly Models from الجدول */}
                    <div className="rounded-xl border-2 border-[#C87D5E] bg-[#FDF6F2] p-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-[11px] font-black text-[#7A361D] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#B86848] shrink-0" />
                          <span>الأشهر (من الجدول):</span>
                        </span>
                        {selectedForTerm.length > 0 ? (
                          <span className="text-[10px] font-black text-[#8C4325] bg-white px-1.5 py-0.5 rounded border border-[#E5BFA9] truncate max-w-[125px]">
                            ({selectedForTerm.map((m) => m.name).join(' + ')})
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#8C5237]/80 bg-white/80 px-1.5 py-0.5 rounded border border-[#ECD1C5]">
                            (لم يُحدد شهر)
                          </span>
                        )}
                      </div>

                      {matchingScoped.length === 0 ? (
                        <div className="text-[11px] text-[#7A361D]/80 bg-white/75 border border-dashed border-[#D8A890] rounded-lg p-1.5 text-center">
                          لا توجد كشوف شهرية مطابقة بعد
                        </div>
                      ) : (
                        <div
                          className="space-y-1 max-h-28 overflow-y-auto pr-0.5"
                          style={{ scrollbarWidth: 'thin' }}
                        >
                          {matchingScoped.map((m) => {
                            const isChecked = (term.selectedModelIds || []).includes(m.id);
                            return (
                              <div
                                key={m.id}
                                onClick={() => handleToggleModelForTerm(term, m.id)}
                                role="checkbox"
                                aria-checked={isChecked}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault();
                                    handleToggleModelForTerm(term, m.id);
                                  }
                                }}
                                className={`p-1.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer text-xs select-none ${
                                  isChecked
                                    ? 'bg-white border-[#B86848] text-[#4A2818] font-bold shadow-2xs'
                                    : 'bg-white/75 border-[#E8CEC0] hover:border-[#B86848]/70 text-slate-700'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                    isChecked
                                      ? 'bg-[#B86848] border-[#B86848] text-white'
                                      : 'border-slate-400 bg-white'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="truncate flex-1 font-bold">{m.name}</span>
                                <span className="text-[10px] text-slate-500 font-normal shrink-0">
                                  (من {formatScoreDisplay(m.totalMaxScore, numeralMode)})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Rectangle 2: Created Terms from المعدل */}
                    {(matchingSourceTerms.length > 0 || (term.selectedTermIds || []).length > 0) && (
                      <div className="rounded-xl border-2 border-[#3B6554] bg-[#EFF7F3] p-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-[11px] font-black text-[#1E4D3B] flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#3B6554] shrink-0" />
                            <span>الفصول المنشأة (المعدل):</span>
                          </span>
                          {selectedSourceForAgg.length > 0 ? (
                            <span className="text-[10px] font-black text-[#1E4D3B] bg-white px-1.5 py-0.5 rounded border border-[#A8D2BD] truncate max-w-[125px]">
                              ({selectedSourceForAgg.map((t) => t.name).join(' + ')})
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-[#2E5243]/80 bg-white/80 px-1.5 py-0.5 rounded border border-[#B8D5C6]">
                              (لم يُحدد فصل)
                            </span>
                          )}
                        </div>

                        {matchingSourceTerms.length === 0 ? (
                          <div className="text-[11px] text-[#1E4D3B]/80 bg-white/75 border border-dashed border-[#8EC0A9] rounded-lg p-1.5 text-center">
                            لا توجد فصول منشأة مطابقة بعد
                          </div>
                        ) : (
                          <div
                            className="space-y-1 max-h-28 overflow-y-auto pr-0.5"
                            style={{ scrollbarWidth: 'thin' }}
                          >
                            {matchingSourceTerms.map((srcTerm) => {
                              const isChecked = (term.selectedTermIds || []).includes(srcTerm.id);
                              return (
                                <div
                                  key={srcTerm.id}
                                  onClick={() => handleToggleSourceTermForAggregate(term, srcTerm.id)}
                                  role="checkbox"
                                  aria-checked={isChecked}
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                      e.preventDefault();
                                      handleToggleSourceTermForAggregate(term, srcTerm.id);
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer text-xs select-none ${
                                    isChecked
                                      ? 'bg-white border-[#3B6554] text-[#1D3B2E] font-bold shadow-2xs'
                                      : 'bg-white/75 border-[#BFE0CF] hover:border-[#3B6554]/70 text-[#355A4B]'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                      isChecked
                                        ? 'bg-[#3B6554] border-[#3B6554] text-white'
                                        : 'border-[#8EB5A3] bg-white'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="truncate flex-1 font-bold">{srcTerm.name}</span>
                                  <span className="text-[10px] text-[#4C7061] font-normal shrink-0">
                                    ({formatScoreDisplay((srcTerm.selectedModelIds || []).length, numeralMode)} شهر)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Active Indicator Banner */}
                  <div className="mt-2.5 pt-2 text-center border-t border-dashed border-[#D8CEBD]/60">
                    {isActive ? (
                      <div className={`inline-flex items-center gap-1.5 text-xs font-black ${isAgg ? 'text-[#2E5243]' : 'text-[#8C4325]'}`}>
                        <CheckCircle2 className={`w-4 h-4 ${isAgg ? 'text-[#2E5243]' : 'text-[#8C4325]'}`} />
                        <span>معروض حالياً في جدول المعدل</span>
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-[#8C7662] hover:text-[#2F2822] transition-colors">
                        انقر لاحتساب وعرض معدل هذا الفصل ←
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {displayedTerms.length === 0 && (
              <div className="text-xs text-[#7A6A58] py-8 px-4 font-semibold text-center w-full bg-white/60 rounded-xl border border-dashed border-[#D8CEBD]">
                لا توجد فصول دراسية مطابقة للفصل أو الصف المحدد في التصفية.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Widgets */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 ${isStudentCardsModalOpen ? 'print:hidden' : ''}`}>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">طلاب الفصل</span>
            <span className="text-2xl font-black text-slate-900">{formatScoreDisplay(totalCount, numeralMode)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">نسبة النجاح</span>
            <span className="text-2xl font-black text-emerald-600">{formatScoreDisplay(passRate, numeralMode)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">أعلى معدل</span>
            <span className="text-2xl font-black text-amber-600">{formatScoreDisplay(maxScore, numeralMode)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">معدل الفصل العام</span>
            <span className="text-2xl font-black text-blue-600">{formatScoreDisplay(avgScore, numeralMode)}</span>
          </div>
        </div>
      </div>

      {/* Term Grades Table - Excel Style with Warm Craft Theme */}
      <div className={`bg-[#FAF7EC] rounded-2xl border border-[#D5C8B2] shadow-xs overflow-hidden print:overflow-visible ${isStudentCardsModalOpen ? 'print:hidden' : ''}`}>
        {/* Table Title Bar: Full width, Title on the right, Numeral Toggle, Print & Export icons on the left */}
        <div className="w-full px-3.5 py-3 sm:px-5 sm:py-3.5 bg-[#F8F4EA] border-b border-[#D8CEBD] flex items-center justify-between gap-3 flex-wrap no-print">
          {/* Right: Clean Term Title */}
          <div className="flex items-center min-w-0">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-[#2F2822] truncate flex items-center gap-1.5">
              <span>كشف درجات:</span>
              <span className="text-[#A05537] font-black">{currentTerm?.name || 'الفصل الدراسي'}</span>
            </h3>
          </div>

          {/* Left: Opposite to the title - Numeral Toggle, Clean Table, Student Cloud, Cards, Print & Export */}
          <div className="flex items-center gap-1.5 sm:gap-2 max-w-full flex-wrap">
            <NumeralModeToggle
              mode={numeralMode}
              onChange={handleNumeralModeChange}
              accent="terracotta"
            />
            {/* Fullscreen Clean Table View button */}
            <button
              type="button"
              onClick={() => setIsCleanTableView(true)}
              className="px-2.5 py-1.5 sm:py-2 text-[#4A2818] hover:text-[#2F2822] bg-[#FAF2EB] hover:bg-[#F2E4D8] border border-[#D8BEB0] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              title="عرض جدول الفصل بملء الشاشة مع التمرير الأفقي وبدون أي أزرار"
              aria-label="عرض جدول الفصل بملء الشاشة"
            >
              <Maximize2 className="w-4 h-4 text-[#B86848]" />
              <span className="text-xs font-bold hidden sm:inline">عرض الجدول الصافي (أفقي)</span>
            </button>

            {/* Toggle Student Info Cloud button */}
            <button
              type="button"
              data-floating-cloud-toggle="true"
              onClick={() => {
                if (activeStudentCloud) {
                  setActiveStudentCloud(null);
                } else if (filteredSummaries.length > 0) {
                  const s = filteredSummaries[0];
                  const firstRow = document.querySelector('tbody tr') as HTMLTableRowElement | null;
                  const rect = firstRow?.getBoundingClientRect();
                  activeRowRef.current = firstRow;
                  setActiveStudentCloud({
                    studentId: s.studentId,
                    name: s.name,
                    section: s.section,
                    rowTop: rect ? rect.top + Math.max(0, (rect.height - 32) / 2) : 200,
                  });
                }
              }}
              className={`px-2.5 py-1.5 sm:py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 border ${
                activeStudentCloud
                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                  : 'bg-white text-[#1E293B] hover:text-[#2B6CB0] hover:bg-slate-100 border-[#CBD5E1]'
              }`}
              title="إظهار / إخفاء سحابة اسم الطالب التفاعلية لمتابعة الأسماء أثناء التمرير الأفقي"
              aria-label="سحابة اسم الطالب"
            >
              <User className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold hidden md:inline">
                {activeStudentCloud ? 'إخفاء سحابة الطالب' : 'سحابة اسم الطالب'}
              </span>
            </button>

            {/* Student Cards Modal Icon (Monthly Scores + Term Averages) */}
            <button
              type="button"
              onClick={() => setIsStudentCardsModalOpen(true)}
              className="p-2 sm:p-2.5 text-[#3B6554] hover:text-[#2D5042] bg-[#EEF5F1] hover:bg-[#DCEBE3] border border-[#A6C9B8] rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title="عرض كروت الطلاب حسب الاسم (درجات الأشهر والمعدل)"
              aria-label="كروت الطلاب التفصيلية (الأشهر والمعدل)"
            >
              <IdCard className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#3B6554]" />
            </button>

            {/* Print icon only */}
            <button
              type="button"
              onClick={() => triggerPrint()}
              className="p-2 sm:p-2.5 text-[#334155] hover:text-[#2B6CB0] bg-white hover:bg-slate-100 border border-[#CBD5E1] rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title="طباعة كشف درجات الفصل"
              aria-label="طباعة كشف درجات الفصل"
            >
              <Printer className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#2B6CB0]" />
            </button>

            {/* Export Excel icon only */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 sm:p-2.5 text-[#15803D] hover:text-[#166534] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-emerald-300 rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title="تصدير كشف درجات الفصل بصيغة Excel"
              aria-label="تصدير كشف درجات الفصل بصيغة Excel"
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
              كشف درجات {currentTerm?.name || 'الفصل الدراسي'} {currentTerm?.subject ? `(${currentTerm.subject})` : ''}
            </span>
            <span>السنة الدراسية: {formatScoreDisplay(profile.academicYear?.trim() || getCurrentAcademicYear(), numeralMode)}</span>
          </div>
          {(currentTerm?.teacherName || profile.teacherName) && (
            <div className="text-[11px] text-slate-600 font-semibold">
              المعلم: {currentTerm?.teacherName || profile.teacherName}
              {currentTerm?.subject ? ` • المادة: ${currentTerm.subject}` : ''}
              {selectedGradeLevel !== 'ALL'
                ? ` • الصف: ${selectedGradeLevel}`
                : currentTerm?.gradeLevel
                ? ` • الصف: ${currentTerm.gradeLevel}`
                : ''}
            </div>
          )}
        </div>

        <div ref={tableContainerRef} onScroll={checkNameColumnVisibility} className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-right border-collapse border border-[#CBD5E1] bg-white">
            <thead>
              <tr className="bg-[#F1F5F9] text-[#1E293B] text-xs font-bold">
                <th className="py-2.5 px-3 w-12 text-center align-middle bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569]">
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={getSlantClasses(columnSlants['index'])}>#</span>
                    <SlantButton slant={columnSlants['index']} onToggle={() => toggleColumnSlant('index')} />
                  </div>
                </th>

                {/* Search input directly under "اسم الطالب" heading */}
                <th data-student-name-column="true" className={`py-2 px-3 min-w-[220px] align-top bg-[#F1F5F9] border border-[#CBD5E1] ${columnSlants['studentName'] === 'vertical' ? 'min-w-[70px]' : ''}`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`font-bold text-[#1E293B] ${getSlantClasses(columnSlants['studentName'])}`}>اسم الطالب</span>
                        <SlantButton slant={columnSlants['studentName']} onToggle={() => toggleColumnSlant('studentName')} />
                      </div>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-[10px] text-[#64748B] hover:text-[#1E293B] print:hidden cursor-pointer"
                        >
                          مسح البحث
                        </button>
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
                <th className={`py-1.5 px-1.5 w-auto min-w-[70px] print:w-auto print:min-w-0 print:px-1 text-center align-middle bg-[#F1F5F9] border border-[#CBD5E1] ${columnSlants['gradeLevel'] === 'vertical' ? 'min-w-[40px]' : ''}`}>
                  <div className="flex flex-col items-center justify-center gap-1">
                    {/* Screen edit & filter */}
                    <div className="print:hidden flex items-center justify-center w-full">
                      <div className="flex flex-col items-center justify-center gap-1 group/header w-full">
                        {/* Top row: Slant icon above the dropdown */}
                        <div className="flex items-center justify-center">
                          <SlantButton slant={columnSlants['gradeLevel']} onToggle={() => toggleColumnSlant('gradeLevel')} className="p-1" />
                        </div>

                        {/* Relative container with title + small triangle + invisible native select */}
                        <div className="relative inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/80 hover:bg-white border border-[#CBD5E1] hover:border-[#2B6CB0] shadow-2xs transition-all cursor-pointer group/grade w-full">
                          <span className={`font-extrabold text-[11px] text-[#0F172A] whitespace-nowrap ${getSlantClasses(columnSlants['gradeLevel'])}`}>
                            {selectedGradeLevel === 'ALL' ? 'الصف' : selectedGradeLevel}
                          </span>
                          <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 transition-transform group-hover/grade:translate-y-0.5" />
                          <select
                            value={selectedGradeLevel}
                            onChange={(e) => setSelectedGradeLevel(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            title="انقر لاختيار الصف أو تصفية الكل"
                          >
                            <option value="ALL">الكل (الصف)</option>
                            {allGradeLevels.map((grd) => (
                              <option key={grd} value={grd}>
                                {grd}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Print Only Header: Strictly ONLY "الصف الدراسي" or selected grade without dropdown/arrow */}
                    <div className="hidden print:block text-center py-1">
                      <span className={`font-extrabold text-[11px] text-[#0F172A] whitespace-nowrap ${getSlantClasses(columnSlants['gradeLevel'])}`}>
                        {selectedGradeLevel === 'ALL' ? 'الصف الدراسي' : selectedGradeLevel}
                      </span>
                    </div>
                  </div>
                </th>

                {/* Section Column - Narrow width, vertical "الشعبة" with letter underneath & small triangle, or vertical "كل الشعب" */}
                <th className="py-1 px-0.5 w-auto min-w-[32px] max-w-[42px] print:w-auto print:min-w-0 print:px-0 text-center align-middle bg-[#F1F5F9] border border-[#CBD5E1]">
                  <div className="flex flex-col items-center justify-center">
                    {/* Screen filter */}
                    <div className="print:hidden flex flex-col items-center w-full">
                      <div className="relative flex flex-col items-center justify-center p-1 rounded hover:bg-white/80 transition-colors cursor-pointer group/sec w-full">
                        {selectedSection === 'ALL' ? (
                          /* All Sections: "كل الشعب" displayed vertically */
                          <div className="flex flex-col items-center">
                            <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-xs text-[#1E293B] tracking-wider py-1 select-none leading-tight">
                              كل الشعب
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-500 mt-0.5 shrink-0 transition-transform group-hover/sec:translate-y-0.5" />
                          </div>
                        ) : (
                          /* Specific Section: "الشعبة" vertically + section letter horizontally underneath */
                          <div className="flex flex-col items-center">
                            <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-xs text-[#1E293B] tracking-wider select-none leading-tight">
                              الشعبة
                            </span>
                            <span className="font-extrabold text-xs text-[#1E293B] mt-0.5 leading-none bg-slate-200/80 px-1 py-0.5 rounded shadow-2xs">
                              {selectedSection}
                            </span>
                            <ChevronDown className="w-2.5 h-2.5 text-slate-500 mt-0.5 shrink-0 transition-transform group-hover/sec:translate-y-0.5" />
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
                    </div>

                    {/* Print Only Header: Vertical "كل الشعب" or Vertical "الشعبة" with normal horizontal letter underneath */}
                    <div className="hidden print:flex flex-col items-center justify-center text-center py-0.5 leading-tight">
                      {selectedSection === 'ALL' ? (
                        <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-xs text-[#1E293B] tracking-wider py-1 select-none">
                          كل الشعب
                        </span>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-xs text-[#1E293B] tracking-wider select-none">
                            الشعبة
                          </span>
                          <span className="font-bold text-xs text-[#1E293B] mt-0.5 leading-none">
                            {selectedSection}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </th>

                {/* Subject Column (اسم الدرس) */}
                {showSubjectColumn && (
                  <th className={`py-1.5 px-1.5 w-auto min-w-[60px] print:min-w-0 text-center align-middle bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] ${columnSlants['subject'] === 'vertical' ? 'min-w-[40px]' : ''}`}>
                    <div className="flex flex-col items-center justify-center gap-0.5 font-extrabold">
                      <SlantButton slant={columnSlants['subject']} onToggle={() => toggleColumnSlant('subject')} />
                      <StackedHeaderLabel
                        label="اسم الدرس"
                        isVertical={columnSlants['subject'] === 'vertical'}
                        className={`text-[11px] font-extrabold text-[#0F172A] ${getSlantClasses(columnSlants['subject'])}`}
                      />
                    </div>
                  </th>
                )}

                {/* Columns for each selected Monthly Model AND/OR Source Term */}
                {selectedModelsObj.map((model) => (
                  <th
                    key={model.id}
                    className={`py-1.5 px-2 w-auto min-w-[78px] print:min-w-0 text-center bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] align-top ${columnSlants[model.id] === 'vertical' ? 'min-w-[46px]' : ''}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <SlantButton slant={columnSlants[model.id]} onToggle={() => toggleColumnSlant(model.id)} />
                      <StackedHeaderLabel
                        label={`درجة ${model.name}`}
                        isVertical={columnSlants[model.id] === 'vertical'}
                        className={`text-[11px] font-extrabold text-[#0F172A] ${getSlantClasses(columnSlants[model.id])}`}
                      />
                      {model.subject && (
                        <span className="text-[10px] font-extrabold text-[#2B6CB0] bg-[#EFF6FF] px-1.5 py-0.2 rounded border border-[#BFDBFE] whitespace-nowrap">
                          {model.subject}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-col items-center justify-center gap-0.5 print:hidden">
                      <span className="text-[10px] text-[#475569] font-bold leading-none whitespace-nowrap">
                        النهائية:
                      </span>
                      <span className="inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-black text-[#0F172A] shadow-2xs leading-tight">
                        {formatScoreDisplay(model.totalMaxScore, numeralMode)}
                      </span>
                    </div>
                  </th>
                ))}
                {selectedSourceTermsObj.map((srcTerm) => (
                  <th
                    key={srcTerm.id}
                    className={`py-1.5 px-2 w-auto min-w-[78px] print:min-w-0 text-center bg-[#EEF5F1] border border-[#CBD5E1] text-[#143326] align-top ${columnSlants[srcTerm.id] === 'vertical' ? 'min-w-[46px]' : ''}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <SlantButton slant={columnSlants[srcTerm.id]} onToggle={() => toggleColumnSlant(srcTerm.id)} />
                      <StackedHeaderLabel
                        label={`درجة ${srcTerm.name}`}
                        isVertical={columnSlants[srcTerm.id] === 'vertical'}
                        className={`text-[11px] font-extrabold text-[#143326] ${getSlantClasses(columnSlants[srcTerm.id])}`}
                      />
                      {srcTerm.subject && (
                        <span className="text-[10px] font-extrabold text-[#2E5243] bg-white px-1.5 py-0.2 rounded border border-[#B2D3C2] whitespace-nowrap">
                          {srcTerm.subject}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#3B6554] font-bold mt-0.5 print:hidden whitespace-nowrap">
                      (معدل الفصل)
                    </div>
                  </th>
                ))}

                {/* The Calculated Term Grade Column - In print strictly ONLY "النهائي" */}
                <th
                  id="term-calculated-average-col"
                  data-term-average-col="true"
                  className={`py-2 px-2 min-w-[135px] print:min-w-0 border text-[#0F172A] text-center font-bold align-top transition-all duration-500 ${
                    highlightAverageCol
                      ? 'bg-amber-100 border-amber-500 ring-4 ring-amber-400 shadow-xl'
                      : 'bg-[#F1F5F9] border-[#CBD5E1]'
                  } ${columnSlants['finalTermScore'] === 'vertical' ? 'min-w-[50px]' : ''}`}
                >
                  {highlightAverageCol && (
                    <div className="text-[10px] font-black text-amber-900 bg-amber-300/90 px-2 py-0.5 rounded-full inline-block animate-bounce mb-1 shadow-xs print:hidden">
                      🎯 عمود معدل الفصل
                    </div>
                  )}
                  {/* Screen Title */}
                  <div className="flex items-center justify-center gap-1 print:hidden">
                    <Sparkles className="w-3.5 h-3.5 text-[#2B6CB0] shrink-0" />
                    <StackedHeaderLabel
                      label={`درجة ${currentTerm.name} المحسوبة`}
                      isVertical={columnSlants['finalTermScore'] === 'vertical'}
                      className={`text-[11px] font-extrabold text-[#0F172A] ${getSlantClasses(columnSlants['finalTermScore'])}`}
                    />
                    <SlantButton slant={columnSlants['finalTermScore']} onToggle={() => toggleColumnSlant('finalTermScore')} />
                  </div>
                  <div className="text-[10px] text-[#64748B] font-normal mt-0.5 print:hidden">
                    {selectedModelsObj.length > 0 && selectedSourceTermsObj.length > 0
                      ? currentTerm.calculationMode === 'sum'
                        ? `(مجموع ${formatScoreDisplay(selectedModelsObj.length, numeralMode)} شهور و ${formatScoreDisplay(selectedSourceTermsObj.length, numeralMode)} فصول)`
                        : `(معدل ${formatScoreDisplay(selectedModelsObj.length, numeralMode)} شهور و ${formatScoreDisplay(selectedSourceTermsObj.length, numeralMode)} فصول)`
                      : selectedSourceTermsObj.length > 0
                      ? currentTerm.calculationMode === 'sum'
                        ? `(مجموع ${formatScoreDisplay(selectedSourceTermsObj.length, numeralMode)} فصول)`
                        : `(معدل ${formatScoreDisplay(selectedSourceTermsObj.length, numeralMode)} فصول تلقائياً)`
                      : selectedModelsObj.length > 1
                      ? currentTerm.calculationMode === 'sum'
                        ? `(مجموع ${formatScoreDisplay(selectedModelsObj.length, numeralMode)} شهور)`
                        : `(معدل ${formatScoreDisplay(selectedModelsObj.length, numeralMode)} شهور تلقائياً)`
                      : '(الدرجة المعتمدة)'}
                  </div>

                  {/* Print Only Title: Strictly ONLY "النهائي" */}
                  <div className="hidden print:block text-center py-1">
                    <span className={`font-bold text-xs text-[#1E293B] ${getSlantClasses(columnSlants['finalTermScore'])}`}>
                      النهائي
                    </span>
                  </div>

                  {/* Sub-toolbar: Rounding & Rating Toggle - STRICTLY HIDDEN ON PRINT */}
                  <div className="pt-1 mt-1 border-t border-[#CBD5E1] flex items-center justify-between gap-1 text-[10px] print:hidden">
                    {/* Rounding button inside header */}
                    <button
                      type="button"
                      onClick={() => setIsRoundingModalOpen(true)}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all border flex items-center gap-1 shadow-2xs cursor-pointer ${
                        currentTerm.roundingMode && currentTerm.roundingMode !== 'none'
                          ? 'bg-amber-50 text-[#854D0E] border-amber-300 hover:bg-amber-100'
                          : 'bg-white text-[#854D0E] border-[#CBD5E1] hover:bg-slate-50'
                      }`}
                      title="التحكم بالنسب وقواعد جبر الكسور العشرية"
                    >
                      <Calculator className="w-3.5 h-3.5 text-[#854D0E]" />
                      <span>
                        {currentTerm.roundingMode === 'half_up'
                          ? `جبر: ≥${formatScoreDisplay(0.5, numeralMode)}`
                          : currentTerm.roundingMode === 'any_fraction'
                          ? `جبر: ≥${formatScoreDisplay(0.1, numeralMode)}`
                          : currentTerm.roundingMode === 'custom_threshold'
                          ? `جبر: ≥${formatScoreDisplay(currentTerm.roundingThreshold, numeralMode)}`
                          : 'التحكم بالنسب العشرية'}
                      </span>
                    </button>

                    {/* Toggle Rating button inside header */}
                    <button
                      type="button"
                      onClick={toggleRatingColumn}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all border flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer ${
                        showRatingColumn
                          ? 'bg-white text-[#15803D] border-emerald-300'
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
                </th>

                {/* Rating */}
                {showRatingColumn && (
                  <th className={`py-2 px-2 min-w-[70px] print:min-w-0 text-center align-middle bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] animate-in fade-in ${columnSlants['gradeText'] === 'vertical' ? 'min-w-[42px]' : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-[11px] font-extrabold ${getSlantClasses(columnSlants['gradeText'])}`}>التقدير</span>
                      <SlantButton slant={columnSlants['gradeText']} onToggle={() => toggleColumnSlant('gradeText')} />
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
                <th className={`py-2 px-2 min-w-[64px] print:min-w-0 text-center align-middle bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] ${columnSlants['status'] === 'vertical' ? 'min-w-[42px]' : ''}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-[11px] font-extrabold ${getSlantClasses(columnSlants['status'])}`}>الحالة</span>
                    <SlantButton slant={columnSlants['status']} onToggle={() => toggleColumnSlant('status')} />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="text-sm">
              {activeSourceItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showRatingColumn ? 6 : 5) + (showSubjectColumn ? 1 : 0)}
                    className="py-16 text-center text-[#64748B] text-sm border border-[#CBD5E1] bg-amber-50/25"
                  >
                    <div className="max-w-md mx-auto space-y-2.5">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAEDE8] border border-[#ECD1C5] flex items-center justify-center text-[#944D30] shadow-2xs">
                        {isAggregateTerms ? <Calculator className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                      </div>
                      <p className="text-base font-black text-[#8C4325]">
                        {`لم يتم تحديد أي شهر أو فصل لاحتساب معدل (${currentTerm.name}) بعد`}
                      </p>
                      <p className="text-xs text-[#7A6E5F] leading-relaxed">
                        قم بالضغط على مربعات الاختيار (☑ Checkbox) داخل مستطيل الأشهر أو مستطيل الفصول بالأعلى لتحديد العناصر المراد احتساب معدلها، وستبقى اختياراتك محفوظة تلقائياً.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredSummaries.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showRatingColumn ? 6 : 5) + activeSourceItems.length + (showSubjectColumn ? 1 : 0)}
                    className="py-12 text-center text-[#64748B] text-sm border border-[#CBD5E1]"
                  >
                    لا توجد بيانات طلاب مطابقة في هذا الفصل.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((student, index) => {
                  const isSelected = activeStudentCloud?.studentId === student.studentId;
                  return (
                    <tr
                      key={student.studentId}
                      onClick={(e) => {
                        const rowEl = e.currentTarget;
                        activeRowRef.current = rowEl;
                        const rect = rowEl.getBoundingClientRect();
                        const rowHeight = rect.height || 40;
                        const topPos = rect.top + Math.max(0, (rect.height - 32) / 2);
                        setActiveStudentCloud({
                          studentId: student.studentId,
                          name: student.name,
                          section: student.section,
                          rowTop: topPos,
                          initialRowTop: topPos,
                          rowHeight: rowHeight,
                        });
                        checkNameColumnVisibility();
                      }}
                      className={`even:bg-[#F8FAFC] odd:bg-white hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50/80 ring-1 ring-sky-300' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-xs font-bold text-[#64748B] border border-[#CBD5E1] bg-[#F8FAFC]">
                        {formatScoreDisplay(index + 1, numeralMode)}
                      </td>

                      <td className="py-2.5 px-4 font-bold text-[#1E293B] border border-[#CBD5E1]">
                        {student.name}
                      </td>

                      <td className="py-2 px-2 text-[11px] text-[#0F172A] font-bold border border-[#CBD5E1] text-center whitespace-nowrap">
                        {student.gradeLevel}
                      </td>

                      <td className="py-2.5 px-0.5 text-center border border-[#CBD5E1] w-auto min-w-[34px] max-w-[48px] print:w-auto print:px-0">
                        <span className="px-1.5 py-0.5 bg-slate-100 border border-[#CBD5E1] text-[#1E293B] rounded text-xs font-bold inline-block">
                          {student.section}
                        </span>
                      </td>

                      {/* Lesson / Subject Column */}
                      {showSubjectColumn && (
                        <td className="py-2.5 px-2 text-center border border-[#CBD5E1] text-xs font-bold text-[#1E293B]">
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-md inline-block">
                            {currentTerm.subject || selectedModelsObj[0]?.subject || selectedSourceTermsObj[0]?.subject || '-'}
                          </span>
                        </td>
                      )}

                      {/* Display breakdown of each selected month AND/OR source term */}
                      {activeSourceItems.map((item) => {
                        const mScore = student.monthlyScores.find(
                          (ms) => ms.modelId === item.id
                        )?.score;

                        return (
                          <td
                            key={item.id}
                            className={`py-2.5 px-3 text-center border border-[#CBD5E1] ${
                              item.kind === 'term' ? 'bg-[#F8FBF9]' : ''
                            }`}
                          >
                            {mScore !== null && mScore !== undefined ? (
                              <span className="font-bold text-[#1E293B] text-sm">
                                {formatScoreDisplay(mScore, numeralMode)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Calculated Final Term Grade */}
                      <td
                        data-term-average-cell="true"
                        className={`py-2.5 px-4 text-center font-black border transition-colors duration-500 ${
                          highlightAverageCol
                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400/60 font-black'
                            : 'border-[#CBD5E1]'
                        }`}
                      >
                        {student.finalTermScore !== null ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="text-base font-black text-[#1E293B] px-3 py-0.5 bg-slate-100 rounded-lg inline-block min-w-[55px] border border-slate-200">
                              {formatScoreDisplay(student.finalTermScore, numeralMode)}
                            </span>
                            {student.isRounded && student.rawTermScore !== null && student.rawTermScore !== undefined && (
                              <span
                                className="text-[10px] text-[#854D0E] font-bold"
                                title={`الدرجة قبل جبر الكسور كانت ${student.rawTermScore}`}
                              >
                                (أصله: {formatScoreDisplay(student.rawTermScore, numeralMode)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#64748B] text-xs">غير مرصود</span>
                        )}
                      </td>

                      {/* Rating */}
                      {showRatingColumn && (
                        <td className="py-2.5 px-3 text-center border border-[#CBD5E1] animate-in fade-in">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              student.status === 'passed'
                                ? 'bg-[#EBF4EE] text-[#15803D] border border-emerald-300'
                                : student.status === 'failed'
                                ? 'bg-[#FBEBEB] text-[#BD4B4B] border border-red-200'
                                : 'bg-slate-100 text-[#64748B]'
                            }`}
                          >
                            {student.gradeText}
                          </span>
                        </td>
                      )}

                      {/* Status (Pass / Fail) */}
                      <td className="py-2.5 px-3 text-center border border-[#CBD5E1]">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                            student.status === 'passed'
                              ? 'text-[#15803D] bg-[#EBF4EE]'
                              : student.status === 'failed'
                              ? 'text-[#BD4B4B] bg-[#FBEBEB]'
                              : 'text-[#64748B] bg-slate-100'
                          }`}
                        >
                          {student.status === 'passed'
                            ? 'ناجح'
                            : student.status === 'failed'
                            ? 'راسب'
                            : 'غير محدد'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 bg-[#FAF8F5] border-t border-[#E8E4DA] flex items-center justify-between text-xs text-[#7A746B]">
          <div>
            إجمالي الطلاب: <strong className="text-[#2E2B27] font-bold">{formatScoreDisplay(filteredSummaries.length, numeralMode)}</strong> طالب
          </div>
          <div>
            تم احتساب الدرجات آلياً اعتماداً على:{' '}
            <strong className="text-[#2E2B27] font-bold">
              {activeSourceItems.map((item) => item.name).join(' و ')}
            </strong>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Term Deletion */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title={`تأكيد حذف فصل (${(termToDelete || currentTerm)?.name || ''})`}
        message={`هل أنت متأكد من الاستمرار في حذف فصل (${(termToDelete || currentTerm)?.name || ''})؟ سيتم حذف نتائج واحتساب هذا الفصل نهائياً.`}
        confirmText={`نعم، استمر في حذف ${(termToDelete || currentTerm)?.name || ''}`}
        onConfirm={() => {
          if (termToDelete) {
            onDeleteTerm(termToDelete.id);
            setTermToDelete(null);
          } else if (currentTerm) {
            onDeleteTerm(currentTerm.id);
          }
          setIsDeleteModalOpen(false);
        }}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setTermToDelete(null);
        }}
      />

      {/* Modal for Adding a New Term */}
      <AddTermModal
        isOpen={isAddingNewTerm}
        onClose={() => setIsAddingNewTerm(false)}
        onSubmit={handleCreateTermFromModal}
        availableGrades={availableGradesFromModels}
        availableSubjects={availableSubjectsFromModels}
        monthlyModels={monthlyModels}
        initialGrade={newTermGrade || currentTerm?.gradeLevel || availableGradesFromModels[0]}
        initialSubject={newTermSubject || currentTerm?.subject || availableSubjectsFromModels[0]}
        initialTeacher={newTermTeacher || currentTerm?.teacherName || profile.teacherName}
        initialSections={newTermSections.length > 0 ? newTermSections : currentTerm?.assignedSections}
        defaultName={defaultSuggestedTermName}
        profile={profile}
        existingTerms={terms}
      />

      {/* Modal for Editing Term Name & Scope */}
      {isEditingTermName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150 text-right">
          <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-[#B86848] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-orange-100" />
                </div>
                <div>
                  <h3 className="text-base font-bold">تعديل اسم وبيانات الفصل الدراسي</h3>
                  <p className="text-xs text-orange-100">
                    تغيير مسمى وبيانات الفصل الحالي ({currentTerm.name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingTermName(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveTermName();
              }}
              className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#2F2822]">
                  اسم الفصل الدراسي:
                </label>
                <input
                  type="text"
                  value={editTermNameValue}
                  onChange={(e) => setEditTermNameValue(e.target.value)}
                  list="edit-term-names-datalist"
                  placeholder="مثال: الفصل الأول، الفصل الثاني، السعي السنوي..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8CEBD] rounded-xl text-sm font-bold text-[#2F2822] focus:bg-white focus:ring-2 focus:ring-[#B86848] focus:outline-none"
                  autoFocus
                />
                <datalist id="edit-term-names-datalist">
                  {allTermNameSuggestions.map((sName) => (
                    <option key={sName} value={sName} />
                  ))}
                </datalist>

                {/* Quick choice chips for edit modal */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {allTermNameSuggestions.slice(0, 8).map((chipName) => (
                    <button
                      key={chipName}
                      type="button"
                      onClick={() => setEditTermNameValue(chipName)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        editTermNameValue.trim() === chipName
                          ? 'bg-[#B86848] text-white shadow-xs'
                          : 'bg-white text-[#5C4D3C] border border-[#D8CEBD] hover:bg-[#F3EDE2]'
                      }`}
                    >
                      {chipName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2F2822] mb-1.5 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-[#B86848]" />
                    <span>الصف الدراسي:</span>
                  </label>
                  <select
                    value={editTermGradeValue}
                    onChange={(e) => setEditTermGradeValue(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none cursor-pointer"
                  >
                    {availableGradesFromModels.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2F2822] mb-1.5 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-[#B86848]" />
                    <span>المادة الدراسية:</span>
                  </label>
                  <select
                    value={editTermSubjectValue}
                    onChange={(e) => setEditTermSubjectValue(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none cursor-pointer"
                  >
                    {availableSubjectsFromModels.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Teacher Name */}
              <div>
                <label className="block text-xs font-bold text-[#2F2822] mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#B86848]" />
                  <span>اسم أستاذ المادة:</span>
                </label>
                <input
                  type="text"
                  value={editTermTeacherValue}
                  onChange={(e) => setEditTermTeacherValue(e.target.value)}
                  placeholder="اسم أستاذ المادة (مثال: حسين محمد)..."
                  className="w-full px-3 py-2.5 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-[11px] text-amber-900 leading-relaxed flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  تعديل الصف أو المادة أو الأستاذ سيحدث تلقائياً قائمة النماذج المربوطة من صفحة الجدول واحتساب معدلها.
                </span>
              </div>

              <div className="pt-2 border-t border-[#E0D5C3] flex items-center justify-end gap-2.5 shrink-0 bg-[#FAF7EC]">
                <button
                  type="button"
                  onClick={() => setIsEditingTermName(false)}
                  className="px-4 py-2 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!editTermNameValue.trim()}
                  className="px-5 py-2 bg-[#B86848] hover:bg-[#A05537] border border-[#944D30] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ التعديل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Score Rounding Modal */}
      {currentTerm && (
        <ScoreRoundingModal
          isOpen={isRoundingModalOpen}
          onClose={() => setIsRoundingModalOpen(false)}
          currentMode={currentTerm.roundingMode || 'none'}
          currentThreshold={currentTerm.roundingThreshold || 0.5}
          modelName={currentTerm.name}
          gradeLevel={currentTerm.gradeLevel}
          subject={currentTerm.subject}
          applyToAllLabel="تطبيق قاعدة الجبر هذه على فصول نفس المادة والصف فقط"
          onSave={(newMode, newThreshold, applyToSameGradeAndSubject) => {
            handleSaveRounding(newMode, newThreshold, applyToSameGradeAndSubject);
          }}
        />
      )}

      {/* Floating Student Info Cloud during horizontal scrolling (only when names are scrolled out of view) */}
      <StudentFloatingCloud
        info={activeStudentCloud}
        isOpen={Boolean(activeStudentCloud) && !isNameColumnVisible}
        onClose={() => setActiveStudentCloud(null)}
      />

      {/* Clean Fullscreen Table View (تمرير أفقي صافي بدون أي أزرار) */}
      {isCleanTableView && currentTerm && (
        <CleanTermTableView
          term={currentTerm}
          monthlyModels={monthlyModels}
          allTerms={terms}
          onClose={() => setIsCleanTableView(false)}
          showRatingColumn={showRatingColumn}
          showSubjectColumn={showSubjectColumn}
          selectedGradeLevel={selectedGradeLevel}
          selectedSection={selectedSection}
          onGradeChange={setSelectedGradeLevel}
          onSectionChange={setSelectedSection}
          numeralMode={numeralMode}
        />
      )}

      {/* Detailed Student Cards Modal (By Student Name: Subjects + Monthly Scores + Term Averages) */}
      {isStudentCardsModalOpen && currentTerm && (
        <TermStudentCardsModal
          isOpen={isStudentCardsModalOpen}
          onClose={() => setIsStudentCardsModalOpen(false)}
          currentTerm={currentTerm}
          terms={terms}
          monthlyModels={monthlyModels}
          profile={profile}
          visibleStudents={filteredSummaries}
          isAdministration={isAdministration}
          numeralMode={numeralMode}
          onNumeralModeChange={handleNumeralModeChange}
        />
      )}
    </div>
  );
};
