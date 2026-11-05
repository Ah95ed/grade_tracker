import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, Check, Sparkles, GraduationCap, Lock, BookOpen, Plus, Trash2, User, AlertCircle, Info, Layers, ArrowLeftRight } from 'lucide-react';
import { MonthlyModel, StudentRow } from '../../types';
import {
  STANDARD_GRADE_LEVELS,
  normalizeGradeLevel,
  normalizeSection,
  isGradeLevelMatch,
  isSectionMatch,
  isSubjectMatch,
} from '../../utils/gradeAndSectionMatcher';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';
import { loadProfile } from '../../utils/storage';
import { AppUser, getCurrentUser } from '../../utils/auth';

const TARGET_ADMIN_EMAIL = 'asmaomar5566@gmail.com';
const ADMIN_CUSTOM_SUBJECTS_KEY = 'gradebook_admin_custom_subjects_asmaomar5566';

const isIdarahOrAdmin = (s?: string): boolean => {
  if (!s) return false;
  const canon = canonicalizeArabic(s.trim());
  return canon === 'اداره' || canon === 'الاداره' || canon === 'عام';
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentModel?: MonthlyModel;
  allModels: MonthlyModel[];
  onCreate: (newModel: MonthlyModel) => void;
  profileSubject?: string;
  currentUser?: AppUser | null;
  onOpenSectionsSwap?: (grade?: string, subject?: string) => void;
}

export const CreateModelModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentModel,
  allModels,
  onCreate,
  profileSubject,
  currentUser,
  onOpenSectionsSwap,
}) => {
  // Check if current user is admin or school administration (الإدارة)
  const isCustomSubjectEnabled = useMemo(() => {
    const user = currentUser || getCurrentUser();
    const userEmail = (user?.email || '').trim().toLowerCase();
    const p = loadProfile();
    const profSub = (profileSubject || p?.subject || '').trim();
    return (
      userEmail === TARGET_ADMIN_EMAIL ||
      user?.userRole === 'admin_school' ||
      isIdarahOrAdmin(profSub)
    );
  }, [currentUser, profileSubject, isOpen]);

  const customSubjectsStorageKey = useMemo(() => {
    const user = currentUser || getCurrentUser();
    if (user?.uid) {
      return `gradebook_custom_subjects_${user.uid}`;
    }
    return ADMIN_CUSTOM_SUBJECTS_KEY;
  }, [currentUser]);

  // Suggest next month name automatically
  const nextMonthNumber = allModels.length + 1;
  const defaultNewName =
    nextMonthNumber === 1
      ? 'الشهر الأول'
      : nextMonthNumber === 2
      ? 'الشهر الثاني'
      : nextMonthNumber === 3
      ? 'الشهر الثالث'
      : nextMonthNumber === 4
      ? 'الشهر الرابع'
      : `الشهر ${nextMonthNumber}`;

  // Resolve teacher subject directly from profileSubject prop, or loadProfile(), or existing models
  const teacherSubject = useMemo(() => {
    const fromProp = profileSubject?.trim();
    if (fromProp) return fromProp;
    try {
      const p = loadProfile();
      if (p?.subject?.trim()) return p.subject.trim();
    } catch {}
    const fromModels = currentModel?.subject?.trim() || allModels.find((m) => m.subject?.trim())?.subject?.trim();
    if (fromModels) return fromModels;
    return '';
  }, [profileSubject, currentModel?.subject, allModels, isOpen]);

  const [modelName, setModelName] = useState(defaultNewName);
  const [totalMaxInput, setTotalMaxInput] = useState('');
  const [subjectName, setSubjectName] = useState(() => (isIdarahOrAdmin(teacherSubject) || isCustomSubjectEnabled ? '' : teacherSubject));
  const [gradeLevelInput, setGradeLevelInput] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  // Admin / School administration custom subjects state (filter out any stale "إدارة")
  const [customSubjects, setCustomSubjects] = useState<string[]>(() => {
    try {
      const userKey = currentUser?.uid ? `gradebook_custom_subjects_${currentUser.uid}` : ADMIN_CUSTOM_SUBJECTS_KEY;
      const raw = localStorage.getItem(userKey) || localStorage.getItem(ADMIN_CUSTOM_SUBJECTS_KEY);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      return parsed.filter((s) => !isIdarahOrAdmin(s));
    } catch {
      return [];
    }
  });
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [showAddSubjectInput, setShowAddSubjectInput] = useState(false);

  // Available subjects for the administration / target admin
  const availableAdminSubjects = useMemo(() => {
    if (!isCustomSubjectEnabled) return [];
    const list: string[] = [];
    const seen = new Set<string>();

    const addSub = (s?: string) => {
      const trimmed = s?.trim();
      if (!trimmed || isIdarahOrAdmin(trimmed)) return;
      const canon = canonicalizeArabic(trimmed);
      if (!seen.has(canon)) {
        seen.add(canon);
        list.push(trimmed);
      }
    };

    // 1. Primary subject from teacher profile (if not إدارة)
    if (teacherSubject && !isIdarahOrAdmin(teacherSubject)) addSub(teacherSubject);

    // 2. Custom subjects saved by admin / school administration
    customSubjects.forEach(addSub);

    // 3. Subjects from existing models
    allModels.forEach((m) => {
      if (m.subject && !isIdarahOrAdmin(m.subject)) addSub(m.subject);
    });
    if (currentModel?.subject && !isIdarahOrAdmin(currentModel.subject)) addSub(currentModel.subject);

    return list;
  }, [isCustomSubjectEnabled, teacherSubject, customSubjects, allModels, currentModel]);

  // Profile teacher name
  const profileTeacher = useMemo(() => {
    try {
      const p = loadProfile();
      if (p?.teacherName?.trim()) return p.teacherName.trim();
    } catch {}
    return '';
  }, [isOpen]);

  const [teacherNameInput, setTeacherNameInput] = useState(() => (isCustomSubjectEnabled ? '' : profileTeacher));
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [customSectionsList, setCustomSectionsList] = useState<string[]>([]);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [showAddSectionInput, setShowAddSectionInput] = useState(false);

  // Available teachers for quick click in Administration mode
  const availableTeachers = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const addT = (t?: string) => {
      const trimmed = t?.trim();
      if (!trimmed || isIdarahOrAdmin(trimmed)) return;
      const canon = canonicalizeArabic(trimmed);
      if (!seen.has(canon)) {
        seen.add(canon);
        list.push(trimmed);
      }
    };
    if (profileTeacher) addT(profileTeacher);
    allModels.forEach((m) => {
      if (m.teacherName) addT(m.teacherName);
    });
    try {
      const userKey = currentUser?.uid ? `gradebook_saved_teachers_${currentUser.uid}` : 'gradebook_saved_teachers';
      const raw = localStorage.getItem(userKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) parsed.forEach(addT);
      }
    } catch {}
    return list;
  }, [profileTeacher, allModels, currentUser, isOpen]);

  // Validation flags for the mandatory fields
  const isModelNameValid = Boolean(modelName.trim());
  const isTotalMaxValid = Boolean(totalMaxInput.trim() && Number(totalMaxInput) > 0);
  const effectiveSubject = isCustomSubjectEnabled
    ? subjectName.trim()
    : (teacherSubject || subjectName.trim());
  const isSubjectValid = Boolean(effectiveSubject && !isIdarahOrAdmin(effectiveSubject));
  const isGradeValid = Boolean(gradeLevelInput.trim());
  const effectiveTeacher = isCustomSubjectEnabled
    ? teacherNameInput.trim()
    : (profileTeacher || teacherNameInput.trim());
  const isTeacherValid = !isCustomSubjectEnabled || Boolean(effectiveTeacher);
  const isFormValid = isModelNameValid && isTotalMaxValid && isSubjectValid && isGradeValid && isTeacherValid;

  // Available sections for this grade (from existing students & models, or standard default)
  const availableSectionsForGrade = useMemo(() => {
    const trimmedGrade = gradeLevelInput.trim();
    const secs = new Set<string>();
    allModels.forEach((m) => {
      if (!trimmedGrade || isGradeLevelMatch(m.gradeLevel || '', trimmedGrade)) {
        (m.students || []).forEach((s) => {
          if (s.section?.trim()) secs.add(s.section.trim());
        });
        (m.assignedSections || []).forEach((sec) => {
          if (sec.trim()) secs.add(sec.trim());
        });
      }
    });
    if (secs.size === 0) {
      ['أ', 'ب', 'ج', 'د'].forEach((s) => secs.add(s));
    }
    return Array.from(secs);
  }, [allModels, gradeLevelInput]);

  // Load custom sections for this grade from localStorage
  useEffect(() => {
    const trimmed = gradeLevelInput.trim();
    if (trimmed) {
      try {
        const k = `gradebook_custom_sections_${canonicalizeArabic(trimmed)}`;
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setCustomSectionsList(parsed);
          }
        }
      } catch {}
    }
  }, [gradeLevelInput]);

  // All display sections combining defaults, models, custom added, and selected
  const allDisplaySections = useMemo(() => {
    const set = new Set<string>();
    ['أ', 'ب', 'ج', 'د'].forEach((s) => set.add(s));
    availableSectionsForGrade.forEach((s) => set.add(s));
    customSectionsList.forEach((s) => set.add(s));
    selectedSections.forEach((s) => set.add(s));
    return Array.from(set);
  }, [availableSectionsForGrade, customSectionsList, selectedSections]);

  // Existing teachers already registered for this Grade and Subject with their sections
  const existingTeachersForGradeAndSub = useMemo(() => {
    const trimmedGrade = gradeLevelInput.trim();
    const trimmedSub = effectiveSubject.trim();
    if (!trimmedGrade || !trimmedSub) return [];

    const matching = allModels.filter(
      (m) =>
        isGradeLevelMatch(m.gradeLevel || '', trimmedGrade) &&
        isSubjectMatch(m.subject, trimmedSub) &&
        Boolean(m.teacherName?.trim())
    );

    const map = new Map<string, { teacherName: string; sections: Set<string> }>();
    matching.forEach((m) => {
      const tName = m.teacherName!.trim();
      const canon = canonicalizeArabic(tName);
      if (!map.has(canon)) {
        map.set(canon, { teacherName: tName, sections: new Set<string>() });
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
  }, [allModels, gradeLevelInput, effectiveSubject]);

  // Collect ONLY the grade levels specifically entered by the user in created models
  const addedGrades = useMemo(() => {
    if (!allModels || allModels.length === 0) {
      return [];
    }

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

    allModels.forEach((m) => {
      if (m.gradeLevel) addIfValid(m.gradeLevel);
    });
    if (currentModel?.gradeLevel) addIfValid(currentModel.gradeLevel);

    return list;
  }, [allModels, currentModel, isOpen]);

  // Autocompletion datalist uses only grades added/entered by the user
  const previousGrades = addedGrades;

  useEffect(() => {
    if (isOpen) {
      setModelName(defaultNewName);
      setTotalMaxInput('');
      const defaultSub = isIdarahOrAdmin(teacherSubject) || isCustomSubjectEnabled ? '' : teacherSubject;
      setSubjectName(defaultSub);
      setTeacherNameInput(isCustomSubjectEnabled ? '' : profileTeacher);
      // In Admin mode: Start with completely clean sections so previous teacher's sections aren't leaked!
      setSelectedSections([]);
      setNewSectionInput('');
      setShowAddSectionInput(false);

      // Always start with a completely empty grade field on new creation
      setGradeLevelInput('');
      setShowValidation(false);
      setNewSubjectInput('');
      setShowAddSubjectInput(false);

      if (isCustomSubjectEnabled) {
        try {
          const raw = localStorage.getItem(customSubjectsStorageKey) || localStorage.getItem(ADMIN_CUSTOM_SUBJECTS_KEY);
          if (raw) {
            const parsed: string[] = JSON.parse(raw);
            setCustomSubjects(parsed.filter((s) => !isIdarahOrAdmin(s)));
          }
        } catch {}
      }
    }
  }, [isOpen, defaultNewName, teacherSubject, profileTeacher, isCustomSubjectEnabled, customSubjectsStorageKey, currentModel]);

  // Select a teacher and auto-load ONLY their specific sections if already registered
  const handleSelectTeacher = (teacher: string) => {
    setTeacherNameInput(teacher);
    if (showValidation) setShowValidation(false);

    if (isCustomSubjectEnabled) {
      const canon = canonicalizeArabic(teacher);
      const existing = existingTeachersForGradeAndSub.find(
        (et) => canonicalizeArabic(et.teacherName) === canon
      );
      if (existing && existing.sections.length > 0) {
        setSelectedSections([...existing.sections]);
      } else {
        // Different or new teacher: start clean
        setSelectedSections([]);
      }
    }
  };

  // Add new section and make it immediately visible and selected
  const handleAddNewSection = () => {
    const trimmed = newSectionInput.trim();
    if (!trimmed) return;

    if (!customSectionsList.includes(trimmed)) {
      setCustomSectionsList((prev) => [...prev, trimmed]);
    }
    if (!selectedSections.includes(trimmed)) {
      setSelectedSections((prev) => [...prev, trimmed]);
    }

    try {
      const k = `gradebook_custom_sections_${canonicalizeArabic(gradeLevelInput.trim() || 'all')}`;
      const raw = localStorage.getItem(k);
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(trimmed)) {
        localStorage.setItem(k, JSON.stringify([...list, trimmed]));
      }
    } catch {}

    setNewSectionInput('');
    setShowAddSectionInput(false);
  };

  const handleAddCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSubjectInput.trim();
    if (!trimmed || isIdarahOrAdmin(trimmed)) return;

    const canon = canonicalizeArabic(trimmed);
    const alreadySaved = customSubjects.some((s) => canonicalizeArabic(s) === canon);

    if (!alreadySaved && (!teacherSubject || canonicalizeArabic(teacherSubject) !== canon)) {
      const updated = [...customSubjects, trimmed];
      setCustomSubjects(updated);
      try {
        localStorage.setItem(customSubjectsStorageKey, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }

    setSubjectName(trimmed);
    setNewSubjectInput('');
    setShowAddSubjectInput(false);
    if (showValidation) setShowValidation(false);
  };

  const handleDeleteCustomSubject = (subjectToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const canonToDelete = canonicalizeArabic(subjectToDelete);
    const updated = customSubjects.filter((s) => canonicalizeArabic(s) !== canonToDelete);
    setCustomSubjects(updated);
    try {
      localStorage.setItem(customSubjectsStorageKey, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    if (canonicalizeArabic(subjectName) === canonToDelete) {
      setSubjectName(updated[0] || '');
    }
  };

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!isFormValid) {
      setShowValidation(true);
      return;
    }

    const newId = 'month-' + Date.now();
    const finalGrade = normalizeGradeLevel(gradeLevelInput.trim(), previousGrades);
    const finalSubject = (isCustomSubjectEnabled
      ? subjectName.trim()
      : (teacherSubject || subjectName.trim())) || '';
    const finalTeacher = isCustomSubjectEnabled
      ? teacherNameInput.trim() || profileTeacher
      : (profileTeacher || teacherNameInput.trim());

    // Save teacher name to saved teachers for quick click later
    if (finalTeacher && isCustomSubjectEnabled) {
      try {
        const userKey = currentUser?.uid ? `gradebook_saved_teachers_${currentUser.uid}` : 'gradebook_saved_teachers';
        const raw = localStorage.getItem(userKey);
        const existing: string[] = raw ? JSON.parse(raw) : [];
        const canon = canonicalizeArabic(finalTeacher);
        if (!existing.some((t) => canonicalizeArabic(t) === canon)) {
          localStorage.setItem(userKey, JSON.stringify([...existing, finalTeacher]));
        }
      } catch {}
    }

    // AUTOMATIC TRANSFER: Only carry over students that belong to this chosen grade (and sections if specified)
    const sourceStudents = (currentModel?.students && currentModel.students.length > 0)
      ? currentModel.students
      : (allModels.flatMap((m) => m.students || []));

    const matchingStudents = finalGrade
      ? sourceStudents.filter((st) => {
          const matchGrade = isGradeLevelMatch(st.gradeLevel, finalGrade);
          const matchSection =
            selectedSections.length === 0 ||
            selectedSections.some((sec) => isSectionMatch(st.section || 'أ', sec));
          return matchGrade && matchSection;
        })
      : sourceStudents;

    const seenStudentKeys = new Set<string>();
    const transferredStudents: StudentRow[] = [];
    matchingStudents.forEach((st) => {
      const key = `${canonicalizeArabic(st.name)}_${(st.section || 'أ').trim()}`;
      if (!seenStudentKeys.has(key)) {
        seenStudentKeys.add(key);
        transferredStudents.push({
          id: 'st-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          name: st.name,
          gradeLevel: finalGrade || st.gradeLevel,
          section: st.section || 'أ',
          writtenRawScore: null,
          scores: {},
          notes: '',
        });
      }
    });

    // Also transfer the columns configuration (written weight & custom columns)
    const clonedCustomColumns = (currentModel?.customColumns || []).map((col) => ({
      ...col,
      id: 'col-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    }));

    const lastModel = allModels && allModels.length > 0 ? allModels[allModels.length - 1] : undefined;
    const modelToInherit = currentModel || lastModel;

    const userEnteredMax = Number(totalMaxInput.trim());
    const finalTotalMax = userEnteredMax;

    try {
      localStorage.setItem('gradebook_last_total_max_score', String(userEnteredMax));
    } catch {}

    if (finalSubject && !isIdarahOrAdmin(finalSubject)) {
      try {
        const raw = localStorage.getItem('gradebook_user_subjects');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        if (!existing.includes(finalSubject)) {
          localStorage.setItem('gradebook_user_subjects', JSON.stringify([...existing, finalSubject]));
        }
      } catch {}

      if (isCustomSubjectEnabled) {
        try {
          const raw = localStorage.getItem(customSubjectsStorageKey);
          const existing: string[] = raw ? JSON.parse(raw) : [];
          const canon = canonicalizeArabic(finalSubject);
          if (!existing.some((s) => canonicalizeArabic(s) === canon)) {
            const nextList = [...existing, finalSubject];
            localStorage.setItem(customSubjectsStorageKey, JSON.stringify(nextList));
            setCustomSubjects(nextList);
          }
        } catch {}
      }
    }

    if (finalGrade) {
      try {
        const raw = localStorage.getItem('gradebook_user_grades');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        if (!existing.some((g) => canonicalizeArabic(g) === canonicalizeArabic(finalGrade))) {
          localStorage.setItem('gradebook_user_grades', JSON.stringify([...existing, finalGrade]));
        }
        localStorage.setItem('gradebook_last_selected_grade', finalGrade);
      } catch {}
    }

    const finalWrittenMax =
      clonedCustomColumns.length === 0
        ? finalTotalMax
        : Math.min(modelToInherit?.writtenMaxScore || finalTotalMax, finalTotalMax);

    const newModel: MonthlyModel = {
      id: newId,
      name: modelName.trim(),
      subject: finalSubject,
      gradeLevel: finalGrade,
      teacherName: finalTeacher || undefined,
      assignedSections: selectedSections.length > 0 ? selectedSections : undefined,
      academicYear: modelToInherit?.academicYear || '2024-2025',
      totalMaxScore: finalTotalMax,
      writtenWeight: modelToInherit?.writtenWeight ?? null,
      writtenMaxScore: finalWrittenMax,
      writtenScoreMode: modelToInherit?.writtenScoreMode || 'raw',
      customColumns: clonedCustomColumns,
      students: transferredStudents,
      roundingMode: modelToInherit?.roundingMode || 'none',
      roundingThreshold: modelToInherit?.roundingThreshold || 0.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreate(newModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header - Sky Slate Blue matching reference image */}
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-[#5692BE] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">إنشاء نموذج جديد (شهر جديد)</h3>
              <p className="text-[10px] sm:text-[11px] text-blue-100">
                جميع الحقول أدناه إجبارية لضبط درجات النموذج بدقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Scrollable if screen is extremely small, but compact so it fits easily */}
        <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto">
          {/* 1. اسم النموذج (إجباري) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1">
                <span>اسم النموذج:</span>
                <span className="text-red-500 font-extrabold text-sm">*</span>
              </label>
              <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                إجباري
              </span>
            </div>
            <input
              type="text"
              value={modelName}
              onChange={(e) => {
                setModelName(e.target.value);
                if (showValidation) setShowValidation(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="مثال: الشهر الأول، الشهر الثاني، نصف السنة..."
              className={`w-full px-3 py-1.5 sm:py-2 bg-white border rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#5692BE] focus:outline-none transition-colors ${
                showValidation && !isModelNameValid
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                  : 'border-[#D8CEBD]'
              }`}
              autoFocus
            />
            {showValidation && !isModelNameValid && (
              <p className="text-[10px] text-rose-600 font-bold mt-1">
                ⚠️ يرجى كتابة اسم النموذج (حقل إجباري)
              </p>
            )}
          </div>

          {/* 2. الدرجة النهائية من (إجباري) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1">
                <span>الدرجة النهائية من:</span>
                <span className="text-red-500 font-extrabold text-sm">*</span>
              </label>
              <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                إجباري
              </span>
            </div>
            <input
              type="number"
              min="1"
              max="1000"
              value={totalMaxInput}
              onChange={(e) => {
                setTotalMaxInput(e.target.value);
                if (showValidation) setShowValidation(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="اكتب الدرجة الكلية (مثلاً 10 أو 100)..."
              className={`w-full px-3 py-1.5 sm:py-2 bg-white border rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#5692BE] focus:outline-none placeholder:text-slate-400 placeholder:font-normal transition-colors ${
                showValidation && !isTotalMaxValid
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                  : 'border-[#D8CEBD]'
              }`}
            />
            {showValidation && !isTotalMaxValid && (
              <p className="text-[10px] text-rose-600 font-bold mt-1">
                ⚠️ يرجى كتابة الدرجة النهائية مثل 10 أو 100 (حقل إجباري)
              </p>
            )}
          </div>

          {/* 3. اسم المادة */}
          {!isCustomSubjectEnabled ? (
            /* للأستاذ / المستخدمين العاديين: مطابق حصراً للمادة الدراسية في بيانات المعلم والمدرسة دون أي خيارات أخرى */
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#5692BE]" />
                  <span>اسم المادة:</span>
                </label>
                <span className="text-[10px] text-[#2C5F8A] font-bold bg-[#EBF3FA] border border-[#C5DCEF] px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>من بيانات المعلم والمدرسة (مقفل)</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={effectiveSubject || 'يرجى تحديد المادة في بيانات المعلم والمدرسة'}
                  className="w-full pr-3 pl-16 py-1.5 sm:py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm cursor-not-allowed select-none shadow-2xs"
                  title="اسم المادة مطابق للمادة المحددة في بيانات المعلم والمدرسة ولا توجد خيارات أخرى له"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-500 font-bold pointer-events-none">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>ثابت</span>
                </div>
              </div>
              <p className="text-[11px] text-[#6B5E51] mt-1 font-medium">
                اسم المادة مطابق تلقائياً لحقل «المادة الدراسية» في بيانات المعلم والمدرسة ({effectiveSubject || 'غير محدد'}) ومقفل لمنع خلط المواد.
              </p>
              {showValidation && !isSubjectValid && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">
                  ⚠️ يرجى كتابة المادة الدراسية في صفحة «بيانات المعلم والمدرسة» لتظهر هنا تلقائياً
                </p>
              )}
            </div>
          ) : (
            /* خاص بالإدارة أو المسؤول: المادة مع إمكانية إضافة وتغيير واختيار مواد أخرى وحفظها */
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-300/80 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                  <span>اسم المادة لهذا النموذج:</span>
                  <span className="text-red-500 font-extrabold text-sm">*</span>
                </label>
                <span className="text-[10px] text-amber-900 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                  <span>{currentUser?.userRole === 'admin_school' ? 'خاص بالإدارة (تعدد المواد)' : 'خاص بالمسؤول (إدارة المواد)'}</span>
                </span>
              </div>

              {/* حقل اسم المادة الحالي */}
              <div className="relative">
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => {
                    setSubjectName(e.target.value);
                    if (showValidation) setShowValidation(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="اكتب اسم المادة هنا (أو اختر من المواد بالأسفل)..."
                  className={`w-full px-3 py-1.5 sm:py-2 bg-white border rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-colors ${
                    showValidation && !isSubjectValid
                      ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                      : 'border-amber-300'
                  }`}
                />
                {showValidation && !isSubjectValid && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1">
                    ⚠️ يرجى كتابة أو اختيار اسم المادة لهذا النموذج (حقل إجباري)
                  </p>
                )}
              </div>

              {/* قائمة المواد المتاحة كخيارات بنقرة واحدة */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#4A3D30]">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-amber-600" />
                    <span>خيارات المواد المحفوظة (اضغط للاختيار):</span>
                  </span>
                  {!showAddSubjectInput && (
                    <button
                      type="button"
                      onClick={() => setShowAddSubjectInput(true)}
                      className="text-[11px] text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded-lg border border-amber-400/70 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-amber-800" />
                      <span>إضافة مادة أخرى</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {availableAdminSubjects.length === 0 && !showAddSubjectInput && (
                    <p className="text-[11px] text-[#7A6E5F] italic">
                      لم تتم إضافة مواد محفوظة بعد. يمكنك كتابة اسم المادة في الحقل أعلاه، أو الضغط على «إضافة مادة أخرى» لحفظها كخيار دائم.
                    </p>
                  )}
                  {availableAdminSubjects.map((sub) => {
                    const isSelected = canonicalizeArabic(subjectName.trim()) === canonicalizeArabic(sub);
                    const isProfilePrimary = canonicalizeArabic(teacherSubject) === canonicalizeArabic(sub);
                    const isCustom = customSubjects.some((s) => canonicalizeArabic(s) === canonicalizeArabic(sub));

                    return (
                      <div
                        key={sub}
                        onClick={() => {
                          setSubjectName(sub);
                          if (showValidation) setShowValidation(false);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-500/40'
                            : 'bg-white text-[#2F2822] border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        ) : (
                          <span className="text-amber-600 font-bold">+</span>
                        )}
                        <span>{sub}</span>
                        {isProfilePrimary && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                              isSelected ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            من البيانات
                          </span>
                        )}
                        {isCustom && !isProfilePrimary && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomSubject(sub, e)}
                            title="حذف هذه المادة من خيارات المسؤول"
                            className={`p-0.5 rounded hover:bg-rose-500 hover:text-white transition-colors cursor-pointer mr-0.5 ${
                              isSelected ? 'text-amber-200 hover:text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* واجهة إضافة مادة جديدة كخيار دائم */}
                {showAddSubjectInput && (
                  <div className="mt-2 p-2 bg-white rounded-lg border border-amber-300 space-y-1.5 animate-in fade-in duration-100">
                    <label className="text-[11px] font-bold text-amber-900 block">
                      إضافة مادة جديدة وتثبيتها كخيار دائم:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newSubjectInput}
                        onChange={(e) => setNewSubjectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomSubject();
                          }
                        }}
                        placeholder="اسم المادة (مثال: الفيزياء، الكيمياء، الرياضة...)"
                        className="flex-1 px-2.5 py-1 text-xs font-bold border border-amber-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSubject}
                        disabled={!newSubjectInput.trim()}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>حفظ واختيار</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSubjectInput(false);
                          setNewSubjectInput('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                        title="إلغاء"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-amber-900 font-medium">
                💡 بصفتك مسؤول الحساب ({TARGET_ADMIN_EMAIL})، يمكنك اعتماد مادة البيانات الأساسية أو إضافة واختيار أي مادة أخرى لتصبح خياراً محفوظاً لجميع النماذج القادمة.
              </p>

              {showValidation && !isSubjectValid && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">
                  ⚠️ يرجى كتابة أو اختيار اسم المادة (حقل إجباري)
                </p>
              )}
            </div>
          )}

          {/* 4. الصف الدراسي (إجباري) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#5692BE]" />
                <span>الصف الدراسي لهذا النموذج:</span>
                <span className="text-red-500 font-extrabold text-sm">*</span>
              </label>
              <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                إجباري
              </span>
            </div>
            <input
              type="text"
              list="create-model-grades-list"
              value={gradeLevelInput}
              onChange={(e) => {
                setGradeLevelInput(e.target.value);
                if (showValidation) setShowValidation(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="اكتب الصف الدراسي (مثال: أول متوسط)..."
              className={`w-full px-3 py-1.5 sm:py-2 bg-white border rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#5692BE] focus:outline-none placeholder:text-slate-400 placeholder:font-normal transition-colors ${
                showValidation && !isGradeValid
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                  : 'border-[#D8CEBD]'
              }`}
            />
            <datalist id="create-model-grades-list">
              {addedGrades.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            {showValidation && !isGradeValid && (
              <p className="text-[10px] text-rose-600 font-bold mt-1">
                ⚠️ يرجى كتابة أو اختيار الصف الدراسي (حقل إجباري)
              </p>
            )}

            {/* تظهر خيارات الصفوف تحت الحقل فقط في المرات القادمة بعد كتابة وإضافة صفوف */}
            {addedGrades.length > 0 && (
              <div className="mt-2.5 p-2.5 bg-[#FAF7EC] rounded-xl border border-[#D8CEBD] space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#4A3D30]">
                  <Check className="w-3.5 h-3.5 text-[#5692BE]" />
                  <span>الصفوف المضافة في جدولك (اضغط لاختيار الصف لهذا النموذج):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {addedGrades.map((grade) => {
                    const isSelected = canonicalizeArabic(gradeLevelInput.trim()) === canonicalizeArabic(grade);
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => {
                          setGradeLevelInput(grade);
                          if (showValidation) setShowValidation(false);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                          isSelected
                            ? 'bg-[#5692BE] text-white border-[#3D7299] ring-2 ring-[#5692BE]/30'
                            : 'bg-white text-[#2F2822] border-[#D8CEBD] hover:bg-[#F2ECE0] hover:border-[#B8A896]'
                        }`}
                      >
                        <span className={isSelected ? 'text-white font-bold' : 'text-[#5692BE] font-bold'}>
                          +
                        </span>
                        <span>{grade}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3] mr-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. اسم أستاذ المادة */}
          {!isCustomSubjectEnabled ? (
            /* للأستاذ: مطابق لبيانات المعلم */
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#5692BE]" />
                  <span>اسم أستاذ المادة:</span>
                </label>
                <span className="text-[10px] text-[#2C5F8A] font-bold bg-[#EBF3FA] border border-[#C5DCEF] px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>من بيانات المعلم (مقفل)</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={effectiveTeacher || 'يرجى كتابة اسم المعلم في بيانات المعلم'}
                  className="w-full pr-3 pl-16 py-1.5 sm:py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm cursor-not-allowed select-none shadow-2xs"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-500 font-bold pointer-events-none">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>ثابت</span>
                </div>
              </div>
            </div>
          ) : (
            /* خاص بالإدارة: تحديد أو كتابة اسم أستاذ المادة بحرية مع خيارات سريعة */
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-700" />
                  <span>اسم أستاذ المادة لهذا النموذج:</span>
                  <span className="text-red-500 font-extrabold text-sm">*</span>
                </label>
                <span className="text-[10px] text-indigo-900 font-bold bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-700" />
                  <span>خاص بالإدارة (فرز الأساتذة)</span>
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  list="create-model-teachers-list"
                  value={teacherNameInput}
                  onChange={(e) => {
                    setTeacherNameInput(e.target.value);
                    if (showValidation) setShowValidation(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="اكتب اسم أستاذ المادة (مثال: حسين محمد، علي حسن...)"
                  className={`w-full px-3 py-1.5 sm:py-2 bg-white border rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors ${
                    showValidation && !isTeacherValid
                      ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                      : 'border-indigo-200'
                  }`}
                />
                <datalist id="create-model-teachers-list">
                  {availableTeachers.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                {showValidation && !isTeacherValid && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1">
                    ⚠️ يرجى كتابة اسم أستاذ المادة لهذا النموذج (حقل إجباري في الإدارة)
                  </p>
                )}
              </div>

              {/* أزرار الأساتذة المسجلين للاختيار السريع بنقرة واحدة */}
              {availableTeachers.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-[#4A3D30] font-bold block">
                    أساتذة مسجلون مسبقاً (انقر للاختيار المباشر):
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {availableTeachers.map((teacher) => {
                      const isSelected = canonicalizeArabic(teacherNameInput.trim()) === canonicalizeArabic(teacher);
                      return (
                        <button
                          key={teacher}
                          type="button"
                          onClick={() => handleSelectTeacher(teacher)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-400/40'
                              : 'bg-white text-slate-800 border-indigo-200 hover:bg-indigo-50'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          ) : (
                            <User className="w-3 h-3 text-indigo-500" />
                          )}
                          <span>{teacher}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. تحديد الشُعب المخصصة لهذا الأستاذ / النموذج (مهم جداً عند وجود أستاذين لنفس الصف والمادة) */}
          <div className="p-3 bg-[#FAF7EC] rounded-xl border border-[#D8CEBD] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#5692BE]" />
                <span>الشُعب المخصصة لهذا الأستاذ / النموذج:</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#554A3E] font-bold">
                  {selectedSections.length === 0 ? '(جميع الشُعب)' : `(${selectedSections.length} شعبة محددة)`}
                </span>
                {onOpenSectionsSwap && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSectionsSwap(gradeLevelInput, effectiveSubject);
                    }}
                    className="text-[10px] font-black text-indigo-700 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                    title="فتح نافذة تبديل الشُعب بين الأساتذة"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>تبديل الشُعب ⇄</span>
                  </button>
                )}
              </div>
            </div>

            {/* تنبيه الإدارة في حال وجود أستاذ مسجل مسبقاً لهذا الصف والمادة */}
            {existingTeachersForGradeAndSub.length > 0 && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 text-amber-900 text-xs space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>تنبيه تعدد الأساتذة لنفس الصف والمادة ({effectiveSubject} - {gradeLevelInput}):</span>
                </div>
                {existingTeachersForGradeAndSub.map((et, idx) => (
                  <p key={idx} className="text-[11px] text-amber-800 pr-5">
                    • الأستاذ <strong className="text-amber-950 font-black">{et.teacherName}</strong> مسجل مسبقاً للشُعب: (
                    <span className="font-bold text-indigo-900">{et.sections.join(' ، ') || 'كل الشعب'}</span>).
                  </p>
                ))}
                <div className="pt-1 border-t border-amber-200 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[11px] text-amber-900 font-semibold">
                    حدد الشُعب المخصصة لهذا الأستاذ بالأسفل لتفادي تكرار الشعب بين الأستاذين.
                  </p>
                  {onOpenSectionsSwap && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSectionsSwap(gradeLevelInput, effectiveSubject);
                      }}
                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                      <span>تبديل الشُعب بين الأساتذة</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* خيارات الشُعب بنقرة واحدة */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSections([])}
                className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                  selectedSections.length === 0
                    ? 'bg-[#5692BE] text-white border-[#3D7299] shadow-2xs'
                    : 'bg-white text-slate-700 border-[#D8CEBD] hover:bg-slate-50'
                }`}
              >
                كل الشُعب
              </button>

              {allDisplaySections.map((sec) => {
                const isSelected = selectedSections.includes(sec);
                const assignedToOther = existingTeachersForGradeAndSub.find(
                  (et) =>
                    canonicalizeArabic(et.teacherName) !== canonicalizeArabic(teacherNameInput.trim()) &&
                    et.sections.some((s) => isSectionMatch(s, sec))
                );

                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSections(selectedSections.filter((s) => s !== sec));
                      } else {
                        setSelectedSections([...selectedSections, sec]);
                      }
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-black transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs ring-1 ring-emerald-500'
                        : assignedToOther
                        ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300'
                        : 'bg-white text-slate-800 border-[#D8CEBD] hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    <span>شعبة {sec}</span>
                    {assignedToOther && !isSelected && (
                      <span className="text-[9px] text-slate-500 font-normal">
                        ({assignedToOther.teacherName})
                      </span>
                    )}
                    {!assignedToOther && !isSelected && (
                      <span className="text-[9px] text-emerald-700 font-normal">
                        (متاحة)
                      </span>
                    )}
                  </button>
                );
              })}

              {/* إضافة شعبة أخرى إذا لم تكن موجودة */}
              {!showAddSectionInput ? (
                <button
                  type="button"
                  onClick={() => setShowAddSectionInput(true)}
                  className="text-xs px-2 py-1 rounded-lg border border-dashed border-[#5692BE] text-[#2C5F8A] hover:bg-[#EEF4F8] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>شعبة أخرى</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1 bg-white p-1 rounded-lg border border-[#5692BE]">
                  <input
                    type="text"
                    value={newSectionInput}
                    onChange={(e) => setNewSectionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewSection()}
                    placeholder="رمز الشعبة..."
                    className="w-16 px-1.5 py-0.5 text-xs font-bold border rounded outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddNewSection}
                    disabled={!newSectionInput.trim()}
                    className="px-2 py-0.5 bg-[#5692BE] hover:bg-[#437A9F] disabled:opacity-40 text-white text-xs font-bold rounded cursor-pointer"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSectionInput('');
                      setShowAddSectionInput(false);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Unassigned selection button */}
            {allDisplaySections.some((sec) =>
              !existingTeachersForGradeAndSub.some((et) =>
                canonicalizeArabic(et.teacherName) !== canonicalizeArabic(teacherNameInput.trim()) &&
                et.sections.some((s) => isSectionMatch(s, sec))
              ) && !selectedSections.includes(sec)
            ) && selectedSections.length === 0 && existingTeachersForGradeAndSub.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const unassigned = allDisplaySections.filter(
                      (sec) =>
                        !existingTeachersForGradeAndSub.some((et) =>
                          canonicalizeArabic(et.teacherName) !== canonicalizeArabic(teacherNameInput.trim()) &&
                          et.sections.some((s) => isSectionMatch(s, sec))
                        )
                    );
                    setSelectedSections(unassigned);
                  }}
                  className="text-xs px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold border border-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>تحديد الشُعب المتاحة غير المعينة تلقائياً</span>
                </button>
              </div>
            )}

            <p className="text-[10px] text-[#7A6E61]">
              تحديد الشُعب يفيد في فرز كشوفات الطلاب وكروت الدرجات لكل أستاذ بشكل مستقل عند وجود أكثر من أستاذ لنفس المرحلة والمادة.
            </p>
          </div>

          {/* Automatic Transfer Guarantee Box (Compact) */}
          {currentModel && currentModel.students && currentModel.students.length > 0 ? (
            <div className="p-2.5 bg-[#EEF5EB] rounded-xl border border-[#C5DDBE] text-[#224A1E] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#224A1E]">
                <Users className="w-3.5 h-3.5 text-[#2E6B28] shrink-0" />
                <span>ترحيل بيانات الطلاب تلقائياً:</span>
              </div>
              <p className="text-[11px] text-[#2B5626] leading-relaxed">
                سيتم نقل جميع الطلاب (
                <strong className="text-[#1A3817] font-black">
                  {currentModel.students.length} طالب
                </strong>
                ) مع صفوفهم وشُعبهم والأعمدة إلى النموذج الجديد مع تصفير الدرجات.
              </p>
              <div className="text-[10px] text-[#2E6B28] flex items-center gap-1 font-semibold pt-1 border-t border-[#C5DDBE]/60">
                <Check className="w-3 h-3 text-[#2E6B28] stroke-[3]" />
                <span>لا حاجة لإعادة كتابة أسماء الطلاب أو الشعب مجدداً.</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-[#FAF7EC] rounded-xl border border-[#D8CEBD] text-[#2F2822] text-[11px] leading-relaxed font-semibold">
              سيتم إنشاء نموذج شهري جديد فارغ جاهز لإضافة الطلاب وتخصيص الأعمدة.
            </div>
          )}
        </div>

        {/* Footer - Pinned at bottom, always visible */}
        <div className="px-4 py-2.5 bg-[#F8F4EA] border-t border-[#E0D5C3] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!isFormValid}
            className="px-4 py-1.5 craft-btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {currentModel && currentModel.students && currentModel.students.length > 0
                ? `إنشاء (${modelName || 'النموذج'})`
                : `إنشاء (${modelName || 'النموذج'})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

