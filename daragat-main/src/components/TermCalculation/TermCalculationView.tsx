import React, { useState, useMemo, useEffect } from 'react';
import { MonthlyModel, TermModel, TeacherProfile, RoundingMode } from '../../types';
import {
  calculateTermSummaries,
} from '../../utils/gradeCalculations';
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
  Maximize2,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { CleanTermTableView } from './CleanTermTableView';
import { ConfirmDeleteModal } from '../Common/ConfirmDeleteModal';
import { ScoreRoundingModal } from '../MonthlySheet/ScoreRoundingModal';
import { StudentFloatingCloud, ActiveStudentCloudInfo } from '../Common/StudentFloatingCloud';
import { ColumnSlant, getSlantClasses, getNextSlant, SlantButton } from '../Common/ColumnSlantToggle';
import { AppUser, getCurrentUser } from '../../utils/auth';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';

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
}) => {
  const currentTerm = terms.find((t) => t.id === activeTermId) || terms[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  // Clean Fullscreen Table View without any buttons
  const [isCleanTableView, setIsCleanTableView] = useState(false);

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
  const activeRowRef = React.useRef<HTMLTableRowElement | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isNameColumnVisible, setIsNameColumnVisible] = useState(true);

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
    };

    checkNameColumnVisibility();

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeStudentCloud, checkNameColumnVisibility]);

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

    // Check matching monthly models from "صفحة الجدول"
    const matchingModelIds = monthlyModels
      .filter((m) => {
        const matchGrade = !updatedGrade || isGradeLevelMatch(m.gradeLevel || '', updatedGrade);
        const matchSub = !updatedSubject || isSubjectMatch(m.subject, updatedSubject);
        const matchTeacher =
          !updatedTeacher ||
          !m.teacherName ||
          canonicalizeArabic(m.teacherName) === canonicalizeArabic(updatedTeacher);
        return matchGrade && matchSub && matchTeacher;
      })
      .map((m) => m.id);

    onUpdateTerm({
      ...currentTerm,
      name: editTermNameValue.trim(),
      gradeLevel: updatedGrade,
      subject: updatedSubject,
      teacherName: updatedTeacher,
      assignedSections: editTermSectionsValue.length > 0 ? editTermSectionsValue : undefined,
      selectedModelIds:
        matchingModelIds.length > 0 ? matchingModelIds : currentTerm.selectedModelIds,
      calculationMode: matchingModelIds.length > 1 ? 'average' : currentTerm.calculationMode,
    });
    if (updatedGrade) {
      setSelectedGradeLevel(updatedGrade);
    }
    setIsEditingTermName(false);
  };

  const handleCreateTerm = () => {
    if (!newTermName.trim()) return;
    const chosenGrade = newTermGrade || availableGradesFromModels[0] || undefined;
    const chosenSubject = newTermSubject || availableSubjectsFromModels[0] || undefined;
    const chosenTeacher = newTermTeacher.trim() || undefined;

    // Automatically find all monthly models from "صفحة الجدول" that match this grade, subject, and teacher!
    const matchingModelIds = monthlyModels
      .filter((m) => {
        const matchGrade = !chosenGrade || isGradeLevelMatch(m.gradeLevel || '', chosenGrade);
        const matchSub = !chosenSubject || isSubjectMatch(m.subject, chosenSubject);
        const matchTeacher =
          !chosenTeacher ||
          !m.teacherName ||
          canonicalizeArabic(m.teacherName) === canonicalizeArabic(chosenTeacher);
        return matchGrade && matchSub && matchTeacher;
      })
      .map((m) => m.id);

    const newTerm: TermModel = {
      id: 'term-' + Date.now(),
      name: newTermName.trim(),
      gradeLevel: chosenGrade,
      subject: chosenSubject,
      teacherName: chosenTeacher,
      assignedSections: newTermSections.length > 0 ? newTermSections : undefined,
      selectedModelIds: matchingModelIds, // Automatically fetch matching months from صفحة الجدول!
      calculationMode: matchingModelIds.length > 1 ? 'average' : 'single',
      notes: '',
    };
    onAddTerm(newTerm);
    if (chosenGrade) {
      setSelectedGradeLevel(chosenGrade);
    }
    setNewTermName('');
    setNewTermTeacher('');
    setNewTermSections([]);
    setIsAddingNewTerm(false);
  };

  const handleOpenAddTerm = () => {
    const nextNum = terms.length + 1;
    const suggested =
      nextNum === 1 ? 'الفصل الأول' : nextNum === 2 ? 'الفصل الثاني' : nextNum === 3 ? 'الفصل الثالث' : `الفصل ${nextNum}`;
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

  // Self-heal and sync term's selectedModelIds so phantom or deleted model IDs are never counted.
  // Persists and restores user selections without forcing any month if the user chose none.
  // CRITICAL: Must be placed BEFORE any early return to satisfy React Rules of Hooks!
  React.useEffect(() => {
    if (!currentTerm) return;

    let currentIds = currentTerm.selectedModelIds || [];

    // If currently empty, check if user had previously selected months saved in localStorage for this term
    if (currentIds.length === 0) {
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

    if (
      validIds.length !== (currentTerm.selectedModelIds || []).length ||
      validIds.some((id, idx) => id !== currentTerm.selectedModelIds[idx])
    ) {
      onUpdateTerm({
        ...currentTerm,
        selectedModelIds: validIds,
        calculationMode: validIds.length > 1 ? 'average' : 'single',
      });
    }
  }, [currentTerm?.id, scopedMonthlyModels]);

  // Memoized student summaries across chosen models (strictly scoped to this term's Grade Level & Subject & Teacher's assigned sections!)
  const studentSummaries = useMemo(() => {
    if (!currentTerm) return [];
    const summaries = calculateTermSummaries(currentTerm, scopedMonthlyModels);
    if (currentTerm.assignedSections && currentTerm.assignedSections.length > 0) {
      return summaries.filter((s) =>
        currentTerm.assignedSections!.some((sec) => isSectionMatch(s.section || 'أ', sec))
      );
    }
    return summaries;
  }, [currentTerm, scopedMonthlyModels]);

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
        {/* Full-width "إضافة فصل جديد" button */}
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
        {isAddingNewTerm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150 text-right">
            <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
              <div className="px-5 py-3.5 bg-[#B86848] text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">إضافة فصل دراسي جديد</h3>
                    <p className="text-xs text-orange-100">
                      احتساب معدل الدرجات لشهور هذا الفصل تلقائياً
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNewTerm(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateTerm();
                }}
                className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain"
              >
                <div>
                  <label className="block text-xs font-bold text-[#2F2822] mb-1.5">
                    اسم الفصل الدراسي
                  </label>
                  <input
                    type="text"
                    value={newTermName}
                    onChange={(e) => setNewTermName(e.target.value)}
                    placeholder="مثال: الفصل الأول، أو السعي السنوي"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D8CEBD] rounded-xl text-sm font-bold text-[#2F2822] focus:bg-white focus:ring-2 focus:ring-[#B86848] focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2F2822] mb-1.5 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-[#B86848]" />
                      <span>الصف الدراسي:</span>
                    </label>
                    <select
                      value={newTermGrade}
                      onChange={(e) => setNewTermGrade(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none cursor-pointer"
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
                      value={newTermSubject}
                      onChange={(e) => setNewTermSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none cursor-pointer"
                    >
                      {availableSubjectsFromModels.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Teacher Name & Multi-teacher section assignment */}
                <div>
                  <label className="block text-xs font-bold text-[#2F2822] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#B86848]" />
                      <span>اسم أستاذ المادة:</span>
                    </span>
                    {matchingTeachersForNewTerm.length > 1 && (
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                        تعدد أساتذة لنفس الصف والمادة
                      </span>
                    )}
                  </label>

                  {matchingTeachersForNewTerm.length > 1 ? (
                    <div className="space-y-2 mb-2">
                      <div className="text-[11px] text-[#7A6E61] bg-amber-50 p-2 rounded-xl border border-amber-200">
                        تم رصد أكثر من أستاذ لمادة <strong>{newTermSubject}</strong> للصف <strong>{newTermGrade}</strong>. اختر الأستاذ لحصر الفصل وشُعبه:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {matchingTeachersForNewTerm.map((t) => {
                          const isSelected =
                            canonicalizeArabic(newTermTeacher) === canonicalizeArabic(t.teacherName);
                          return (
                            <button
                              key={t.teacherName}
                              type="button"
                              onClick={() => {
                                setNewTermTeacher(t.teacherName);
                                setNewTermSections(t.sections);
                              }}
                              className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#B86848]/15 border-[#B86848] text-[#2F2822] ring-2 ring-[#B86848]/30 font-bold'
                                  : 'bg-white border-[#D8CEBD] text-[#554B3E] hover:bg-[#F3EDE2]'
                              }`}
                            >
                              <div className="text-xs font-bold flex items-center justify-between">
                                <span>{t.teacherName}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#B86848]" />}
                              </div>
                              <div className="text-[10px] text-[#8C7E6D] mt-0.5">
                                {t.sections.length > 0
                                  ? `شُعبه: ${t.sections.join('، ')}`
                                  : 'جميع الشُعب'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <input
                    type="text"
                    value={newTermTeacher}
                    onChange={(e) => setNewTermTeacher(e.target.value)}
                    placeholder="اسم أستاذ المادة (مثال: حسين محمد)..."
                    className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none"
                  />
                  {newTermSections.length > 0 && (
                    <div className="mt-1 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        سيتم حصر هذا الفصل على شُعب هذا الأستاذ: <strong>{newTermSections.join('، ')}</strong> فقط.
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-[11px] text-amber-900 leading-relaxed flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    سيتم تلقائياً جلب شهور ونماذج <strong>{newTermGrade || 'الصف المحدد'}</strong> لمادة <strong>{newTermSubject || 'المادة المحددة'}</strong> من صفحة الجدول واحتساب معدلها.
                  </span>
                </div>

                <div className="pt-3 border-t border-[#E0D5C3] flex items-center justify-end gap-2.5 shrink-0 bg-[#FAF7EC]">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewTerm(false)}
                    className="px-4 py-2 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={!newTermName.trim()}
                    className="px-5 py-2 bg-[#B86848] hover:bg-[#A05537] border border-[#944D30] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إنشاء الفصل</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
  const passedCount = validScores.filter(
    (score) => (score / (currentTerm ? 100 : 100)) * 100 >= 50
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

  // Selected models objects
  const selectedModelsObj = monthlyModels.filter((m) =>
    currentTerm.selectedModelIds.includes(m.id)
  );

  // Export CSV
  const handleExportCSV = () => {
    const exportGradeLabel = 'الصف الدراسي';
    const exportSectionLabel = 'الشعبة';
    const exportFinalScoreLabel = 'النهائي';

    const headers = [
      'م',
      'اسم الطالب',
      exportGradeLabel,
      exportSectionLabel,
      ...(showSubjectColumn ? ['اسم الدرس'] : []),
      ...selectedModelsObj.map((m) => `درجة ${m.name}`),
      exportFinalScoreLabel,
      'التقدير',
      'الحالة',
    ];

    const currentSubName = currentTerm.subject || selectedModelsObj[0]?.subject || '';

    const rows = filteredSummaries.map((s, idx) => {
      const monthScores = s.monthlyScores.map((ms) => ms.score ?? '');
      return [
        idx + 1,
        `"${s.name}"`,
        `"${s.gradeLevel}"`,
        `"${s.section}"`,
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
      {/* Full-width "إضافة فصل جديد" button */}
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

      {/* Term Switcher Bar */}
      <div className="bg-[#FAF7EC] p-3.5 rounded-2xl border border-[#D8CEBD] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {terms.map((term) => {
            const isActive = term.id === currentTerm.id;
            const termValidCount = monthlyModels.filter((m) =>
              term.selectedModelIds.includes(m.id)
            ).length;

            return (
              <button
                key={term.id}
                onClick={() => {
                  onSelectTerm(term.id);
                  if (term.gradeLevel) {
                    setSelectedGradeLevel(term.gradeLevel);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#B86848] text-white border border-[#944D30] shadow-sm font-black'
                    : 'bg-[#EFE3DC] hover:bg-[#E5D4CB] text-[#4A2818] border border-[#D6BFB2]'
                }`}
              >
                <span>{term.name}</span>
                {term.gradeLevel && (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-white/80 text-[#7A361D] border-[#D6BFB2]'
                    }`}
                  >
                    {term.gradeLevel}
                  </span>
                )}
                {term.subject && (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold border ${
                      isActive
                        ? 'bg-amber-300/30 text-amber-100 border-amber-200/40'
                        : 'bg-amber-100 text-amber-900 border-amber-200'
                    }`}
                  >
                    {term.subject}
                  </span>
                )}
                {term.teacherName && (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    }`}
                  >
                    أ. {term.teacherName}
                  </span>
                )}
                {term.assignedSections && term.assignedSections.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-blue-50 text-blue-900 border-blue-200'
                    }`}
                  >
                    شُعب: {term.assignedSections.join('، ')}
                  </span>
                )}
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#DDC9BD] text-[#4A2818]'
                  }`}
                >
                  {termValidCount === 1
                    ? 'نموذج واحد'
                    : termValidCount === 2
                    ? 'معدل نموذجين'
                    : `معدل ${termValidCount} نماذج`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Term Name & Scope Button */}
          <button
            type="button"
            onClick={handleOpenEditTermName}
            className="text-xs text-[#8C4325] hover:text-[#6D3219] bg-[#FAEDE8] hover:bg-[#F5DDD5] border border-[#ECD1C5] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-2xs active:scale-95 cursor-pointer"
            title={`تعديل اسم وبيانات فصل ${currentTerm.name}`}
            aria-label={`تعديل اسم وبيانات فصل ${currentTerm.name}`}
          >
            <Pencil className="w-3.5 h-3.5 text-[#8C4325]" />
            <span>تعديل الفصل</span>
          </button>

          {/* Delete Term Button - Always available even if only 1 term remains */}
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-2xs active:scale-95 cursor-pointer"
            title={`حذف فصل ${currentTerm.name}`}
            aria-label={`حذف فصل ${currentTerm.name}`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>حذف فصل {currentTerm.name}</span>
          </button>
        </div>
      </div>

      {/* Model Selection & Auto-Calculation Controller - Terracotta Theme */}
      <div className="bg-[#B86848] rounded-2xl text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-[#FAF0EB] text-[#7A361D] uppercase">
                صفحة احتساب الدرجات
              </span>
              <h2 className="text-xl sm:text-2xl font-black">{currentTerm.name}</h2>
              {currentTerm.gradeLevel && (
                <span className="text-xs px-2.5 py-1 rounded-lg font-black bg-white/20 text-white border border-white/25 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-white/90" />
                  <span>{currentTerm.gradeLevel}</span>
                </span>
              )}
              {currentTerm.subject && (
                <span className="text-xs px-2.5 py-1 rounded-lg font-black bg-amber-300/25 text-amber-100 border border-amber-200/30 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-200" />
                  <span>{currentTerm.subject}</span>
                </span>
              )}
              {currentTerm.teacherName && (
                <span className="text-xs px-2.5 py-1 rounded-lg font-black bg-emerald-900/40 text-emerald-100 border border-emerald-300/30 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-200" />
                  <span>الأستاذ: {currentTerm.teacherName}</span>
                </span>
              )}
              {currentTerm.assignedSections && currentTerm.assignedSections.length > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-lg font-black bg-blue-900/40 text-blue-100 border border-blue-300/30 flex items-center gap-1">
                  <span>الشُعب المخصصة: {currentTerm.assignedSections.join('، ')}</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleOpenEditTermName}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                title={`تعديل مسمى وبيانات ${currentTerm.name}`}
                aria-label={`تعديل مسمى وبيانات ${currentTerm.name}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Checkboxes / Cards for choosing Monthly Models */}
          <div className="pt-1">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <label className="text-xs font-bold text-orange-100 flex items-center gap-1.5 flex-wrap">
                <span>تحديد أشهر ({currentTerm.name}):</span>
                {selectedModelsObj.length > 0 ? (
                  <span className="text-amber-200 font-black">
                    ({selectedModelsObj.map((m) => m.name).join(' + ')})
                  </span>
                ) : (
                  <span className="text-orange-200 font-medium bg-black/20 px-2 py-0.5 rounded">
                    (لم يتم تحديد أي شهر بعد — حدد بالضغط على مربعات الاختيار ☑)
                  </span>
                )}
              </label>

              {/* Quick Select All / Deselect All helpers */}
              {scopedMonthlyModels.length > 1 && (
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = scopedMonthlyModels.map((m) => m.id);
                      try {
                        localStorage.setItem(
                          `daragat_term_selected_models_${currentTerm.id}`,
                          JSON.stringify(allIds)
                        );
                      } catch {}
                      onUpdateTerm({
                        ...currentTerm,
                        selectedModelIds: allIds,
                        calculationMode: allIds.length > 1 ? 'average' : 'single',
                      });
                    }}
                    className="text-orange-100 hover:text-white underline cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-orange-300">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem(
                          `daragat_term_selected_models_${currentTerm.id}`,
                          JSON.stringify([])
                        );
                      } catch {}
                      onUpdateTerm({
                        ...currentTerm,
                        selectedModelIds: [],
                        calculationMode: 'single',
                      });
                    }}
                    className="text-orange-100 hover:text-white underline cursor-pointer"
                  >
                    إلغاء تحديد الكل
                  </button>
                </div>
              )}
            </div>

            {scopedMonthlyModels.length === 0 ? (
              <div className="bg-black/20 border border-white/20 rounded-xl p-4 sm:p-5 text-center text-sm text-orange-100 space-y-1.5">
                <p className="font-bold text-white text-base">
                  لا توجد كشوف درجات شهرية تطابق هذا الصف والمادة
                </p>
                <p className="text-xs text-orange-200 leading-relaxed max-w-lg mx-auto">
                  هذا الفصل الدراسي مخصص لـ{' '}
                  <span className="font-black text-amber-200 underline">{currentTerm.gradeLevel || 'الصف المحدد'}</span>
                  {currentTerm.subject ? ` ومادة (${currentTerm.subject})` : ''}.
                  <br />
                  يرجى إضافة كشف شهري جديد لهذا الصف والمادة من صفحة جدول الدرجات ليظهر هنا لاحتساب المعدل.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {scopedMonthlyModels.map((model) => {
                  const isSelected = (currentTerm.selectedModelIds || []).includes(model.id);
                  // Calculate students count strictly matching the term's designated gradeLevel
                  const matchingStudents = currentTerm.gradeLevel
                    ? model.students.filter((s) => isGradeLevelMatch(s.gradeLevel, currentTerm.gradeLevel!))
                    : model.students;
                  const matchingCount = matchingStudents.length;

                  return (
                    <div
                      key={model.id}
                      onClick={() => handleToggleModel(model.id)}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleToggleModel(model.id);
                        }
                      }}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                        isSelected
                          ? 'bg-[#96472A] border-[#F2C5B3] shadow-md text-white ring-2 ring-white/20'
                          : 'bg-white/10 border-white/20 hover:border-white/50 hover:bg-white/15 text-orange-100/90'
                      }`}
                    >
                      {/* Clear Square Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isSelected
                            ? 'bg-white border-white text-[#7A361D] shadow-xs'
                            : 'border-white/60 bg-white/10 hover:border-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-white flex items-center justify-between gap-1">
                          <span>{model.name}</span>
                          {model.subject && (
                            <span className="text-[11px] font-black bg-white/20 text-amber-200 px-1.5 py-0.5 rounded border border-white/20">
                              {model.subject}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-orange-100 mt-0.5 flex items-center justify-between">
                          <span className={matchingCount === 0 ? 'text-amber-200 font-bold' : ''}>
                            {matchingCount === 0 ? 'لا يوجد طلاب لهذا الصف' : `${matchingCount} طالب`}
                          </span>
                          <span className="font-bold">من {model.totalMaxScore}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">طلاب الفصل</span>
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">نسبة النجاح</span>
            <span className="text-2xl font-black text-emerald-600">{passRate}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">أعلى معدل</span>
            <span className="text-2xl font-black text-amber-600">{maxScore}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">معدل الفصل العام</span>
            <span className="text-2xl font-black text-blue-600">{avgScore}</span>
          </div>
        </div>
      </div>

      {/* Term Grades Table - Excel Style with Warm Craft Theme */}
      <div className="bg-[#FAF7EC] rounded-2xl border border-[#D5C8B2] shadow-xs overflow-hidden">
        {/* Table Title Bar: Full width, Title on the right, Print & Export icons ONLY on the left without student count */}
        <div className="w-full px-3.5 py-3 sm:px-5 sm:py-3.5 bg-[#F8F4EA] border-b border-[#D8CEBD] flex items-center justify-between gap-3 flex-nowrap no-print">
          {/* Right: Clean Term Title */}
          <div className="flex items-center min-w-0">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-[#2F2822] truncate flex items-center gap-1.5">
              <span>كشف درجات:</span>
              <span className="text-[#A05537] font-black">{currentTerm?.name || 'الفصل الدراسي'}</span>
            </h3>
          </div>

          {/* Left: Opposite to the title - Clean Table, Student Cloud, Print icon & Download Excel icon */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

            {/* Print icon only */}
            <button
              type="button"
              onClick={() => window.print()}
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

        <div ref={tableContainerRef} onScroll={checkNameColumnVisibility} className="overflow-x-auto">
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
                <th className={`py-1.5 px-1 w-auto min-w-[50px] max-w-[85px] print:w-auto print:min-w-0 print:px-0 text-center align-middle bg-[#F1F5F9] border border-[#CBD5E1] ${columnSlants['gradeLevel'] === 'vertical' ? 'min-w-[40px]' : ''}`}>
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
                          <span className={`font-bold text-xs text-[#1E293B] whitespace-nowrap truncate ${getSlantClasses(columnSlants['gradeLevel'])}`}>
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
                      <span className={`font-bold text-xs text-[#1E293B] ${getSlantClasses(columnSlants['gradeLevel'])}`}>
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
                  <th className={`py-1.5 px-2 min-w-[75px] max-w-[110px] print:min-w-0 text-center align-middle bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] ${columnSlants['subject'] === 'vertical' ? 'min-w-[40px]' : ''}`}>
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span className={`text-xs ${getSlantClasses(columnSlants['subject'])}`}>اسم الدرس</span>
                      <SlantButton slant={columnSlants['subject']} onToggle={() => toggleColumnSlant('subject')} />
                    </div>
                  </th>
                )}

                {/* Columns for each selected Monthly Model */}
                {selectedModelsObj.map((model) => (
                  <th
                    key={model.id}
                    className={`py-2 px-3 min-w-[130px] print:min-w-0 text-center bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] align-top ${columnSlants[model.id] === 'vertical' ? 'min-w-[50px]' : ''}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <div className="flex items-center justify-center gap-1 font-bold">
                        <span className={getSlantClasses(columnSlants[model.id])}>درجة {model.name}</span>
                        <SlantButton slant={columnSlants[model.id]} onToggle={() => toggleColumnSlant(model.id)} />
                      </div>
                      {model.subject && (
                        <span className="text-[11px] font-extrabold text-[#2B6CB0] bg-[#EFF6FF] px-1.5 py-0.2 rounded border border-[#BFDBFE]">
                          {model.subject}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#64748B] font-normal mt-0.5 print:hidden">
                      (النهائية: {model.totalMaxScore})
                    </div>
                  </th>
                ))}

                {/* The Calculated Term Grade Column - In print strictly ONLY "النهائي" */}
                <th className={`py-2.5 px-3 min-w-[170px] print:min-w-0 bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] text-center font-bold align-top ${columnSlants['finalTermScore'] === 'vertical' ? 'min-w-[50px]' : ''}`}>
                  {/* Screen Title */}
                  <div className="flex items-center justify-center gap-1 print:hidden">
                    <Sparkles className="w-3.5 h-3.5 text-[#2B6CB0]" />
                    <span className={getSlantClasses(columnSlants['finalTermScore'])}>درجة {currentTerm.name} المحسوبة</span>
                    <SlantButton slant={columnSlants['finalTermScore']} onToggle={() => toggleColumnSlant('finalTermScore')} />
                  </div>
                  <div className="text-[10px] text-[#64748B] font-normal mt-0.5 print:hidden">
                    {currentTerm.selectedModelIds.length === 2
                      ? '(معدل الشهرين تلقائياً)'
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
                          ? 'جبر: ≥0.5'
                          : currentTerm.roundingMode === 'any_fraction'
                          ? 'جبر: ≥0.1'
                          : currentTerm.roundingMode === 'custom_threshold'
                          ? `جبر: ≥${currentTerm.roundingThreshold}`
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
                  <th className={`py-2.5 px-3 min-w-[100px] print:min-w-0 text-center align-top bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] animate-in fade-in ${columnSlants['gradeText'] === 'vertical' ? 'min-w-[45px]' : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      <span className={getSlantClasses(columnSlants['gradeText'])}>التقدير</span>
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
                <th className={`py-2.5 px-3 min-w-[85px] print:min-w-0 text-center align-middle bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] ${columnSlants['status'] === 'vertical' ? 'min-w-[45px]' : ''}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span className={getSlantClasses(columnSlants['status'])}>الحالة</span>
                    <SlantButton slant={columnSlants['status']} onToggle={() => toggleColumnSlant('status')} />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="text-sm">
              {selectedModelsObj.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showRatingColumn ? 6 : 5) + (showSubjectColumn ? 1 : 0)}
                    className="py-16 text-center text-[#64748B] text-sm border border-[#CBD5E1] bg-amber-50/25"
                  >
                    <div className="max-w-md mx-auto space-y-2.5">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAEDE8] border border-[#ECD1C5] flex items-center justify-center text-[#944D30] shadow-2xs">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <p className="text-base font-black text-[#8C4325]">
                        لم يتم تحديد أي شهر لاحتساب معدل ({currentTerm.name}) بعد
                      </p>
                      <p className="text-xs text-[#7A6E5F] leading-relaxed">
                        قم بالضغط على مربعات الاختيار (☑ Checkbox) بالأعلى لتحديد الشهور الدراسية المراد استخراج المعدل النهائي لها، وستبقى اختياراتك محفوظة تلقائياً.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredSummaries.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showRatingColumn ? 6 : 5) + selectedModelsObj.length + (showSubjectColumn ? 1 : 0)}
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
                        {index + 1}
                      </td>

                      <td className="py-2.5 px-4 font-bold text-[#1E293B] border border-[#CBD5E1]">
                        {student.name}
                      </td>

                      <td className="py-2.5 px-3 text-xs text-[#475569] font-medium border border-[#CBD5E1] text-center">
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
                            {currentTerm.subject || selectedModelsObj[0]?.subject || '-'}
                          </span>
                        </td>
                      )}

                      {/* Display breakdown of each selected month */}
                      {selectedModelsObj.map((model) => {
                        const mScore = student.monthlyScores.find(
                          (ms) => ms.modelId === model.id
                        )?.score;

                        return (
                          <td
                            key={model.id}
                            className="py-2.5 px-3 text-center border border-[#CBD5E1]"
                          >
                            {mScore !== null && mScore !== undefined ? (
                              <span className="font-bold text-[#1E293B] text-sm">
                                {mScore}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Calculated Final Term Grade */}
                      <td className="py-2.5 px-4 text-center font-black border border-[#CBD5E1]">
                        {student.finalTermScore !== null ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="text-base font-black text-[#1E293B] px-3 py-0.5 bg-slate-100 rounded-lg inline-block min-w-[55px] border border-slate-200">
                              {student.finalTermScore}
                            </span>
                            {student.isRounded && student.rawTermScore !== null && student.rawTermScore !== undefined && (
                              <span
                                className="text-[10px] text-[#854D0E] font-bold"
                                title={`الدرجة قبل جبر الكسور كانت ${student.rawTermScore}`}
                              >
                                (أصله: {student.rawTermScore})
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
            إجمالي الطلاب: <strong className="text-[#2E2B27] font-bold">{filteredSummaries.length}</strong> طالب
          </div>
          <div>
            تم احتساب الدرجات آلياً اعتماداً على:{' '}
            <strong className="text-[#2E2B27] font-bold">
              {selectedModelsObj.map((m) => m.name).join(' و ')}
            </strong>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Term Deletion */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title={`تأكيد حذف فصل (${currentTerm.name})`}
        message={`هل أنت متأكد من الاستمرار في حذف فصل (${currentTerm.name})؟ سيتم حذف نتائج واحتساب هذا الفصل نهائياً.`}
        confirmText={`نعم، استمر في حذف ${currentTerm.name}`}
        onConfirm={() => onDeleteTerm(currentTerm.id)}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Modal for Adding a New Term */}
      {isAddingNewTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150 text-right">
          <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-[#B86848] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">إضافة فصل دراسي جديد</h3>
                  <p className="text-xs text-orange-100">
                    احتساب معدل الدرجات لشهور هذا الفصل تلقائياً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingNewTerm(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateTerm();
              }}
              className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain"
            >
              <div>
                <label className="block text-xs font-bold text-[#2F2822] mb-1.5">
                  اسم الفصل الدراسي:
                </label>
                <input
                  type="text"
                  value={newTermName}
                  onChange={(e) => setNewTermName(e.target.value)}
                  placeholder="مثال: الفصل الثاني، أو السعي السنوي"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8CEBD] rounded-xl text-sm font-bold text-[#2F2822] focus:bg-white focus:ring-2 focus:ring-[#B86848] focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2F2822] mb-1.5 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-[#B86848]" />
                    <span>الصف الدراسي:</span>
                  </label>
                  <select
                    value={newTermGrade}
                    onChange={(e) => setNewTermGrade(e.target.value)}
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
                    value={newTermSubject}
                    onChange={(e) => setNewTermSubject(e.target.value)}
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

              {/* Teacher Name & Multi-teacher section assignment */}
              <div>
                <label className="block text-xs font-bold text-[#2F2822] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#B86848]" />
                    <span>اسم أستاذ المادة:</span>
                  </span>
                  {matchingTeachersForNewTerm.length > 1 && (
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                      تعدد أساتذة لنفس الصف والمادة
                    </span>
                  )}
                </label>

                {matchingTeachersForNewTerm.length > 1 ? (
                  <div className="space-y-2 mb-2">
                    <div className="text-[11px] text-[#7A6E61] bg-amber-50 p-2 rounded-xl border border-amber-200">
                      تم رصد أكثر من أستاذ لمادة <strong>{newTermSubject}</strong> للصف <strong>{newTermGrade}</strong>. اختر الأستاذ لعرض وحساب شُعبه:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {matchingTeachersForNewTerm.map((t) => {
                        const isSelected =
                          canonicalizeArabic(newTermTeacher) === canonicalizeArabic(t.teacherName);
                        return (
                          <button
                            key={t.teacherName}
                            type="button"
                            onClick={() => {
                              setNewTermTeacher(t.teacherName);
                              setNewTermSections(t.sections);
                            }}
                            className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#B86848]/15 border-[#B86848] text-[#2F2822] ring-2 ring-[#B86848]/30 font-bold'
                                : 'bg-white border-[#D8CEBD] text-[#554B3E] hover:bg-[#F3EDE2]'
                            }`}
                          >
                            <div className="text-xs font-bold flex items-center justify-between">
                              <span>{t.teacherName}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#B86848]" />}
                            </div>
                            <div className="text-[10px] text-[#8C7E6D] mt-0.5">
                              {t.sections.length > 0
                                ? `شُعبه: ${t.sections.join('، ')}`
                                : 'جميع الشُعب'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <input
                  type="text"
                  value={newTermTeacher}
                  onChange={(e) => setNewTermTeacher(e.target.value)}
                  placeholder="اسم أستاذ المادة (مثال: حسين محمد)..."
                  className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none"
                />
                {newTermSections.length > 0 && (
                  <div className="mt-1 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      سيتم حصر هذا الفصل على شُعب هذا الأستاذ: <strong>{newTermSections.join('، ')}</strong> فقط.
                    </span>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-[11px] text-amber-900 leading-relaxed flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  سيتم تلقائياً جلب شهور ونماذج <strong>{newTermGrade || 'الصف المحدد'}</strong> لمادة <strong>{newTermSubject || 'المادة المحددة'}</strong> من صفحة الجدول واحتساب معدلها.
                </span>
              </div>

              <div className="pt-3 border-t border-[#E0D5C3] flex items-center justify-end gap-2.5 shrink-0 bg-[#FAF7EC]">
                <button
                  type="button"
                  onClick={() => setIsAddingNewTerm(false)}
                  className="px-4 py-2 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!newTermName.trim()}
                  className="px-5 py-2 bg-[#B86848] hover:bg-[#A05537] border border-[#944D30] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إنشاء الفصل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <div>
                <label className="block text-xs font-bold text-[#2F2822] mb-1.5">
                  اسم الفصل الدراسي:
                </label>
                <input
                  type="text"
                  value={editTermNameValue}
                  onChange={(e) => setEditTermNameValue(e.target.value)}
                  placeholder="مثال: الفصل الأول، الفصل الثاني، السعي السنوي..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8CEBD] rounded-xl text-sm font-bold text-[#2F2822] focus:bg-white focus:ring-2 focus:ring-[#B86848] focus:outline-none"
                  autoFocus
                />
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
          onClose={() => setIsCleanTableView(false)}
          showRatingColumn={showRatingColumn}
          showSubjectColumn={showSubjectColumn}
          selectedGradeLevel={selectedGradeLevel}
          selectedSection={selectedSection}
          onGradeChange={setSelectedGradeLevel}
          onSectionChange={setSelectedSection}
        />
      )}
    </div>
  );
};
