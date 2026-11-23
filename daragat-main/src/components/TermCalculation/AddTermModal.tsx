import React, { useState, useEffect, useMemo } from 'react';
import { MonthlyModel, TeacherProfile, TermModel } from '../../types';
import {
  Plus,
  X,
  GraduationCap,
  BookOpen,
  User,
  Check,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  Filter,
  Calculator,
} from 'lucide-react';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';
import { isGradeLevelMatch, isSectionMatch } from '../../utils/gradeAndSectionMatcher';

export const STANDARD_TERM_SUGGESTIONS = [
  'الفصل الأول',
  'الفصل الثاني',
  'الفصل الثالث',
  'الفصل الرابع',
  'السعي السنوي',
  'نصف السنة',
  'نهاية السنة',
  'الدور الأول',
  'الدور الثاني',
];

export const TERM_NAME_HISTORY_KEY = 'gradebook_user_term_names_history';

function isSubjectMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const ca = canonicalizeArabic(a.trim());
  const cb = canonicalizeArabic(b.trim());
  if (ca === cb) return true;
  const stripAl = (s: string) => (s.startsWith('ال') ? s.slice(2) : s);
  return stripAl(ca) === stripAl(cb);
}

interface AddTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (termData: {
    name: string;
    gradeLevel?: string;
    subject?: string;
    teacherName?: string;
    assignedSections?: string[];
    selectedModelIds: string[];
    selectedTermIds: string[];
    calculationMode: 'average' | 'sum' | 'single';
  }) => void;
  availableGrades: string[];
  availableSubjects: string[];
  monthlyModels: MonthlyModel[];
  initialGrade?: string;
  initialSubject?: string;
  initialTeacher?: string;
  initialSections?: string[];
  defaultName?: string;
  profile: TeacherProfile;
  existingTerms?: TermModel[];
}

export const AddTermModal: React.FC<AddTermModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableGrades,
  availableSubjects,
  monthlyModels,
  initialGrade,
  initialSubject,
  initialTeacher,
  initialSections,
  defaultName,
  profile,
  existingTerms,
}) => {
  const [name, setName] = useState(defaultName || 'الفصل الأول');
  const [grade, setGrade] = useState(initialGrade || availableGrades[0] || '');
  const [subject, setSubject] = useState(initialSubject || availableSubjects[0] || profile.subject || '');
  const [teacher, setTeacher] = useState(initialTeacher || profile.teacherName || '');
  const [sections, setSections] = useState<string[]>(initialSections || []);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [calculationMode, setCalculationMode] = useState<'average' | 'sum'>('average');
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [showAllTerms, setShowAllTerms] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(defaultName || 'الفصل الأول');
      const g = initialGrade || availableGrades[0] || '';
      const s = initialSubject || availableSubjects[0] || profile.subject || '';
      const t = initialTeacher || profile.teacherName || '';
      setGrade(g);
      setSubject(s);
      setTeacher(t);
      setSections(initialSections || []);
      setShowAllMonths(false);
      setShowAllTerms(false);
      setSelectedModelIds([]);
      setSelectedTermIds([]);
      setCalculationMode('average');
    }
  }, [isOpen, defaultName, initialGrade, initialSubject, initialTeacher, initialSections, availableGrades, availableSubjects, profile]);

  // Find all registered teachers for the selected grade & subject
  const matchingTeachers = useMemo(() => {
    if (!grade || !subject) return [];
    const matching = monthlyModels.filter(
      (m) =>
        isGradeLevelMatch(m.gradeLevel || '', grade) &&
        isSubjectMatch(m.subject, subject) &&
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
        m.assignedSections.forEach((sec) => entry.sections.add(sec));
      } else {
        (m.students || []).forEach((st) => {
          if (st.section?.trim()) entry.sections.add(st.section.trim());
        });
      }
    });
    return Array.from(map.values()).map((e) => ({
      teacherName: e.teacherName,
      sections: Array.from(e.sections),
    }));
  }, [monthlyModels, grade, subject]);

  // Auto-sync teacher & sections when grade or subject changes
  useEffect(() => {
    if (!isOpen) return;
    if (matchingTeachers.length === 1) {
      setTeacher(matchingTeachers[0].teacherName);
      setSections(matchingTeachers[0].sections);
    } else if (matchingTeachers.length > 1) {
      const exists = matchingTeachers.some(
        (t) => canonicalizeArabic(t.teacherName) === canonicalizeArabic(teacher)
      );
      if (!exists) {
        setTeacher(matchingTeachers[0].teacherName);
        setSections(matchingTeachers[0].sections);
      }
    } else if (!teacher) {
      setTeacher(profile.teacherName || '');
      setSections([]);
    }
  }, [matchingTeachers, isOpen]);

  // Months available for this term
  const availableMonths = useMemo(() => {
    if (showAllMonths) {
      return monthlyModels;
    }

    const chosenGrade = grade || availableGrades[0];
    const chosenSub = subject || availableSubjects[0];
    const chosenTeacher = teacher.trim();

    // 1. Strict match: Grade + Subject + Teacher
    const matching = monthlyModels.filter((m) => {
      const matchGrade = !chosenGrade || isGradeLevelMatch(m.gradeLevel || '', chosenGrade);
      const matchSub = !chosenSub || isSubjectMatch(m.subject, chosenSub);
      const matchTeacher =
        !chosenTeacher ||
        !m.teacherName ||
        canonicalizeArabic(m.teacherName) === canonicalizeArabic(chosenTeacher);
      return matchGrade && matchSub && matchTeacher;
    });

    if (matching.length > 0) return matching;

    // 2. Fallback: Grade + Subject
    const matchingGradeSub = monthlyModels.filter((m) => {
      const matchGrade = !chosenGrade || isGradeLevelMatch(m.gradeLevel || '', chosenGrade);
      const matchSub = !chosenSub || isSubjectMatch(m.subject, chosenSub);
      return matchGrade && matchSub;
    });

    if (matchingGradeSub.length > 0) return matchingGradeSub;

    // 3. Fallback: all months so the teacher always has months to pick from
    return monthlyModels;
  }, [monthlyModels, grade, subject, teacher, showAllMonths, availableGrades, availableSubjects]);

  // Existing regular terms created in "صفحة المعدل" matching current Grade, Subject, Teacher, and Sections
  const regularExistingTerms = useMemo(
    () =>
      (existingTerms || []).filter(
        (t) => t.sourceType !== 'terms' && !(t.selectedTermIds && t.selectedTermIds.length > 0)
      ),
    [existingTerms]
  );

  const availableSourceTerms = useMemo(() => {
    if (showAllTerms) {
      return regularExistingTerms;
    }

    const chosenGrade = grade || availableGrades[0];
    const chosenSub = subject || availableSubjects[0];
    const chosenTeacher = teacher.trim();

    return regularExistingTerms.filter((t) => {
      const matchGrade =
        !chosenGrade || !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, chosenGrade);
      const matchSub = !chosenSub || !t.subject || isSubjectMatch(t.subject, chosenSub);
      const matchTeacher =
        !chosenTeacher ||
        !t.teacherName ||
        canonicalizeArabic(t.teacherName) === canonicalizeArabic(chosenTeacher);
      const matchSections =
        sections.length === 0 ||
        !t.assignedSections?.length ||
        sections.some((sec) =>
          t.assignedSections!.some((tSec) => isSectionMatch(tSec, sec))
        );
      return matchGrade && matchSub && matchTeacher && matchSections;
    });
  }, [
    regularExistingTerms,
    grade,
    subject,
    teacher,
    sections,
    showAllTerms,
    availableGrades,
    availableSubjects,
  ]);

  // Find the immediately previous term name (from existing terms or user history)
  const previousTermName = useMemo(() => {
    if (existingTerms && existingTerms.length > 0) {
      return existingTerms[existingTerms.length - 1].name.trim();
    }
    try {
      const raw = localStorage.getItem(TERM_NAME_HISTORY_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (list.length > 0) return list[list.length - 1].trim();
    } catch {}
    return '';
  }, [existingTerms]);

  // All suggested and previous term names (user's previous names appear first!)
  const allSuggestedNames = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addName = (val?: string) => {
      const trimmed = (val || '').trim();
      if (!trimmed) return;
      const canon = canonicalizeArabic(trimmed);
      if (!seen.has(canon)) {
        seen.add(canon);
        list.push(trimmed);
      }
    };

    // 1. Immediately previous term name first
    if (previousTermName) {
      addName(previousTermName);
    }

    // 2. All term names from existing terms in reverse order (most recent first)
    if (existingTerms) {
      for (let i = existingTerms.length - 1; i >= 0; i--) {
        addName(existingTerms[i].name);
      }
    }

    // 3. Any persisted term names from previous sessions
    try {
      const raw = localStorage.getItem(TERM_NAME_HISTORY_KEY);
      const saved: string[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(saved)) {
        for (let i = saved.length - 1; i >= 0; i--) {
          addName(saved[i]);
        }
      }
    } catch {}

    // 4. Default standard term suggestions
    STANDARD_TERM_SUGGESTIONS.forEach(addName);

    return list;
  }, [existingTerms, previousTermName]);

  if (!isOpen) return null;

  const handleToggleModel = (modelId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const handleToggleSourceTerm = (termId: string) => {
    setSelectedTermIds((prev) =>
      prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]
    );
  };

  const handleSelectAll = () => {
    setSelectedModelIds(availableMonths.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedModelIds([]);
  };

  const handleSelectAllTerms = () => {
    setSelectedTermIds(availableSourceTerms.map((t) => t.id));
  };

  const handleDeselectAllTerms = () => {
    setSelectedTermIds([]);
  };

  const totalSelectedCount = selectedModelIds.length + selectedTermIds.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedName = name.trim();

    // Persist to user term names history in localStorage so it's always remembered
    try {
      const raw = localStorage.getItem(TERM_NAME_HISTORY_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter((item) => canonicalizeArabic(item) !== canonicalizeArabic(trimmedName));
      updated.push(trimmedName);
      localStorage.setItem(TERM_NAME_HISTORY_KEY, JSON.stringify(updated));
    } catch {}

    const effectiveMode: 'average' | 'sum' | 'single' =
      totalSelectedCount > 1 ? calculationMode : 'single';

    onSubmit({
      name: trimmedName,
      gradeLevel: grade || undefined,
      subject: subject || undefined,
      teacherName: teacher.trim() || undefined,
      assignedSections: sections.length > 0 ? sections : undefined,
      selectedModelIds,
      selectedTermIds,
      calculationMode: effectiveMode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150 text-right">
      <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#B86848] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">إضافة فصل دراسي جديد</h3>
              <p className="text-xs text-orange-100">
                تحديد كشوف الأشهر واحتساب معدلها النهائي تلقائياً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - scrollable */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain"
        >
          {/* Term Name with Previous Choice & Suggestions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="block text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#B86848]" />
                <span>اسم الفصل الدراسي:</span>
              </label>

              {/* Quick button to use previous term name if available */}
              {previousTermName && (
                <button
                  type="button"
                  onClick={() => setName(previousTermName)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                    name.trim() === previousTermName
                      ? 'bg-[#B86848] text-white border-[#944D30] shadow-xs'
                      : 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 border-amber-300'
                  }`}
                  title="استخدام اسم الفصل الدراسي الذي تم إنشاؤه قبله"
                >
                  <span className="text-[10px] opacity-80">خيار الفصل السابق:</span>
                  <span className="font-black">{previousTermName}</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                list="term-name-suggestions-datalist"
                placeholder="مثال: الفصل الأول، أو الفصل الثاني، أو السعي السنوي"
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8CEBD] rounded-xl text-sm font-bold text-[#2F2822] focus:bg-white focus:ring-2 focus:ring-[#B86848] focus:outline-none"
                autoFocus
              />
              <datalist id="term-name-suggestions-datalist">
                {allSuggestedNames.map((sName) => (
                  <option key={sName} value={sName} />
                ))}
              </datalist>
            </div>

            {/* Quick Choice Chips: Previous Terms & Suggestions */}
            <div className="space-y-1 pt-0.5">
              <div className="text-[11px] font-bold text-[#7A6E61] flex items-center justify-between">
                <span>خيارات أسماء الفصول السابقة والمقترحة:</span>
                <span className="text-[10px] text-[#A89885] font-normal">(انقر للاختيار المباشر)</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#F5EFE6] rounded-xl border border-[#E2D8C9]">
                {allSuggestedNames.map((chipName) => {
                  const isSelected = name.trim() === chipName;
                  const isPrevious = previousTermName === chipName;
                  return (
                    <button
                      key={chipName}
                      type="button"
                      onClick={() => setName(chipName)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 select-none active:scale-95 ${
                        isSelected
                          ? 'bg-[#B86848] text-white shadow-xs border border-[#944D30]'
                          : isPrevious
                          ? 'bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 shadow-2xs'
                          : 'bg-white hover:bg-[#FAF7EC] text-[#4A3E31] border border-[#D8CEBD]'
                      }`}
                    >
                      {isPrevious && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-950 font-black">
                          السابق
                        </span>
                      )}
                      <span>{chipName}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grade & Subject dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#2F2822] mb-1.5 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#B86848]" />
                <span>الصف الدراسي:</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none cursor-pointer"
              >
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
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
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none cursor-pointer"
              >
                {availableSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teacher Name & Multi-teacher selection */}
          <div>
            <label className="block text-xs font-bold text-[#2F2822] mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#B86848]" />
                <span>اسم أستاذ المادة:</span>
              </span>
              {matchingTeachers.length > 1 && (
                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                  تعدد أساتذة لنفس الصف والمادة
                </span>
              )}
            </label>

            {matchingTeachers.length > 1 && (
              <div className="space-y-2 mb-2">
                <div className="text-[11px] text-[#7A6E61] bg-amber-50 p-2 rounded-xl border border-amber-200">
                  تم رصد أكثر من أستاذ لمادة <strong>{subject}</strong> للصف <strong>{grade}</strong>. اختر الأستاذ لعرض كشوفه وحصر شُعبه:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matchingTeachers.map((t) => {
                    const isSelected =
                      canonicalizeArabic(teacher) === canonicalizeArabic(t.teacherName);
                    return (
                      <button
                        key={t.teacherName}
                        type="button"
                        onClick={() => {
                          setTeacher(t.teacherName);
                          setSections(t.sections);
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
            )}

            <input
              type="text"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="اسم أستاذ المادة (مثال: فاروق محمد)..."
              className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#2F2822] focus:ring-2 focus:ring-[#B86848] focus:outline-none"
            />
            {sections.length > 0 && (
              <div className="mt-1 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  سيتم حصر هذا الفصل على شُعب هذا الأستاذ: <strong>{sections.join('، ')}</strong> فقط.
                </span>
              </div>
            )}
          </div>

          {/* Selection Area: Two distinct colored bordered boxes (Months vs Created Terms) */}
          <div className="pt-2 border-t border-[#E8E0D2] space-y-3">
            {/* Calculation mode selector when > 1 item selected */}
            {totalSelectedCount > 1 && (
              <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#D8CEBD]">
                <span className="text-[11px] font-bold text-[#2F2822] flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#3B6554]" />
                  <span>طريقة احتساب العناصر المختارة:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCalculationMode('average')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      calculationMode === 'average'
                        ? 'bg-[#3B6554] text-white shadow-2xs'
                        : 'bg-[#FAF7EC] text-[#5C4D3C] border border-[#D8CEBD]'
                    }`}
                  >
                    احتساب المعدل (متوسط)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalculationMode('sum')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      calculationMode === 'sum'
                        ? 'bg-[#3B6554] text-white shadow-2xs'
                        : 'bg-[#FAF7EC] text-[#5C4D3C] border border-[#D8CEBD]'
                    }`}
                  >
                    جمع الدرجات
                  </button>
                </div>
              </div>
            )}

            {/* Box 1: Monthly Models from "صفحة الجدول" (Terracotta Bordered Rectangle) */}
            <div className="rounded-2xl border-2 border-[#C87D5E] bg-[#FDF6F2] p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black text-[#8C4325] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#B86848]" />
                  <span>كشوف الأشهر (من صفحة الجدول):</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#F5DFD3] text-[#7A361D] border border-[#E5BFA9]">
                    تم اختيار {selectedModelIds.length} من أصل {availableMonths.length}
                  </span>

                  {availableMonths.length > 1 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[#B86848] hover:text-[#8C3E20] underline cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-[#A89885]">•</span>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-[#B86848] hover:text-[#8C3E20] underline cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {availableMonths.length === 0 ? (
                <div className="bg-white/80 border border-dashed border-[#D8A890] rounded-xl p-3 text-center text-xs text-[#7A361D] space-y-1.5">
                  <p className="font-bold">
                    لا توجد كشوف شهرية مطابقة لهذا الصف والمادة حالياً
                  </p>
                  {!showAllMonths && monthlyModels.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllMonths(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#B86848] bg-white px-3 py-1 rounded-lg border border-[#D8A890] hover:bg-[#FAF0EB] cursor-pointer"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>عرض كافة الشهور المنشأة ({monthlyModels.length})</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5 overscroll-contain">
                  {availableMonths.map((model) => {
                    const isChecked = selectedModelIds.includes(model.id);
                    const matchingStudents = grade
                      ? model.students.filter((s) => isGradeLevelMatch(s.gradeLevel, grade))
                      : model.students;

                    return (
                      <label
                        key={model.id}
                        onClick={() => handleToggleModel(model.id)}
                        className={`p-2 rounded-xl border-2 transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                          isChecked
                            ? 'bg-white border-[#B86848] text-[#2F2822] shadow-2xs ring-2 ring-[#B86848]/20'
                            : 'bg-white/80 border-[#E8CEC0] text-[#6E6254] hover:bg-white hover:border-[#B86848]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-[#B86848] border-[#944D30] text-white shadow-xs'
                                : 'border-[#CBD5E1] bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black truncate text-[#2F2822]">
                              {model.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#7A6E61] mt-0.5 flex-wrap">
                              {model.gradeLevel && (
                                <span className="bg-[#FAF7EC] px-1.5 py-0.2 rounded border border-[#E0D5C3]">
                                  {model.gradeLevel}
                                </span>
                              )}
                              {model.subject && (
                                <span className="bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                                  {model.subject}
                                </span>
                              )}
                              {model.teacherName && (
                                <span className="text-[#8C7E6D]">
                                  أ. {model.teacherName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                          {matchingStudents.length} طالب
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {!showAllMonths && monthlyModels.length > availableMonths.length && (
                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowAllMonths(true)}
                    className="text-[11px] font-bold text-[#8C5237] hover:underline cursor-pointer"
                  >
                    + إظهار كشوف الأشهر الأخرى ({monthlyModels.length - availableMonths.length})
                  </button>
                </div>
              )}
            </div>

            {/* Box 2: Created Terms from "صفحة المعدل" (Distinct Emerald/Sage Green Bordered Rectangle) */}
            {regularExistingTerms.length > 0 && (
              <div className="rounded-2xl border-2 border-[#3B6554] bg-[#EFF7F3] p-3 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black text-[#1E4D3B] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#3B6554]" />
                    <span>الفصول المنشأة (من صفحة المعدل):</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#D7ECE1] text-[#1E4D3B] border border-[#A8D2BD]">
                      تم اختيار {selectedTermIds.length} من أصل {availableSourceTerms.length}
                    </span>

                    {availableSourceTerms.length > 1 && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={handleSelectAllTerms}
                          className="text-[#2E5243] hover:text-[#1D3B2E] underline cursor-pointer"
                        >
                          تحديد الكل
                        </button>
                        <span className="text-[#8FB5A3]">•</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllTerms}
                          className="text-[#2E5243] hover:text-[#1D3B2E] underline cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {availableSourceTerms.length === 0 ? (
                  <div className="bg-white/80 border border-dashed border-[#8EC0A9] rounded-xl p-3 text-center text-xs text-[#1E4D3B] space-y-1.5">
                    <p className="font-bold">
                      لا توجد فصول مطابقة لهذا الصف والمادة والأستاذ حالياً
                    </p>
                    {!showAllTerms && regularExistingTerms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAllTerms(true)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#2E5243] bg-white px-3 py-1 rounded-lg border border-[#A8D2BD] hover:bg-[#E4F2EB] cursor-pointer"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>عرض كافة الفصول المنشأة ({regularExistingTerms.length})</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5 overscroll-contain">
                    {availableSourceTerms.map((srcTerm) => {
                      const isChecked = selectedTermIds.includes(srcTerm.id);
                      const monthCount = (srcTerm.selectedModelIds || []).length;

                      return (
                        <label
                          key={srcTerm.id}
                          onClick={() => handleToggleSourceTerm(srcTerm.id)}
                          className={`p-2 rounded-xl border-2 transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                            isChecked
                              ? 'bg-white border-[#3B6554] text-[#1D3B2E] shadow-2xs ring-2 ring-[#3B6554]/20'
                              : 'bg-white/85 border-[#BFE0CF] text-[#355A4B] hover:bg-white hover:border-[#3B6554]/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-[#3B6554] border-[#264A3B] text-white shadow-xs'
                                  : 'border-[#A3C7B6] bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black truncate text-[#1D3B2E]">
                                {srcTerm.name}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#4C7061] mt-0.5 flex-wrap">
                                {srcTerm.gradeLevel && (
                                  <span className="bg-[#EEF7F2] px-1.5 py-0.2 rounded border border-[#BFE0CF]">
                                    {srcTerm.gradeLevel}
                                  </span>
                                )}
                                {srcTerm.subject && (
                                  <span className="bg-emerald-50 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-200 font-bold">
                                    {srcTerm.subject}
                                  </span>
                                )}
                                {srcTerm.teacherName && (
                                  <span className="text-[#4C7061]">
                                    أ. {srcTerm.teacherName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#E4F2EB] text-[#1E4D3B] border border-[#B2D8C4]">
                            {monthCount} {monthCount === 1 ? 'شهر' : 'أشهر'}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {!showAllTerms && regularExistingTerms.length > availableSourceTerms.length && (
                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowAllTerms(true)}
                      className="text-[11px] font-bold text-[#2E5243] hover:underline cursor-pointer"
                    >
                      + إظهار الفصول الأخرى ({regularExistingTerms.length - availableSourceTerms.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Explanatory summary text */}
            <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-[11px] text-amber-900 leading-relaxed flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {totalSelectedCount > 1 ? (
                  <>
                    تم اختيار{' '}
                    <strong>
                      {selectedModelIds.length > 0 && `${selectedModelIds.length} شهر`}
                      {selectedModelIds.length > 0 && selectedTermIds.length > 0 && ' و '}
                      {selectedTermIds.length > 0 && `${selectedTermIds.length} فصل`}
                    </strong>
                    {' '}— سيتم {calculationMode === 'sum' ? 'جمع درجاتها' : 'احتساب معدلها تلقائياً'} وعرضها في جدول المعدل والكروت.
                  </>
                ) : totalSelectedCount === 1 ? (
                  <>
                    تم اختيار عنصر واحد فقط، وسيتم اعتماد درجته في عمود المعدل.
                  </>
                ) : (
                  <>
                    يمكنك الاختيار بحرية من مستطيل الأشهر أو مستطيل الفصول المنشأة (أو من كليهما معاً) لاحتساب المعدل المطلوب.
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Sticky Footer with Create Button and Cancel */}
          <div className="pt-3 border-t border-[#E0D5C3] flex items-center justify-end gap-2.5 shrink-0 bg-[#FAF7EC] sticky bottom-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 bg-[#B86848] hover:bg-[#A05537] border border-[#944D30] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إنشاء الفصل والذهاب للمعدل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
