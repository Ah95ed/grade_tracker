import React, { useState, useEffect, useMemo } from 'react';
import { MonthlyModel, TeacherProfile } from '../../types';
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
} from 'lucide-react';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';
import { isGradeLevelMatch } from '../../utils/gradeAndSectionMatcher';

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
}) => {
  const [name, setName] = useState(defaultName || 'الفصل الأول');
  const [grade, setGrade] = useState(initialGrade || availableGrades[0] || '');
  const [subject, setSubject] = useState(initialSubject || availableSubjects[0] || profile.subject || '');
  const [teacher, setTeacher] = useState(initialTeacher || profile.teacherName || '');
  const [sections, setSections] = useState<string[]>(initialSections || []);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [showAllMonths, setShowAllMonths] = useState(false);

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
      setSelectedModelIds([]);
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

  if (!isOpen) return null;

  const handleToggleModel = (modelId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const handleSelectAll = () => {
    setSelectedModelIds(availableMonths.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedModelIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      gradeLevel: grade || undefined,
      subject: subject || undefined,
      teacherName: teacher.trim() || undefined,
      assignedSections: sections.length > 0 ? sections : undefined,
      selectedModelIds: selectedModelIds,
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
          {/* Term Name */}
          <div>
            <label className="block text-xs font-bold text-[#2F2822] mb-1.5">
              اسم الفصل الدراسي:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: الفصل الأول، أو الفصل الثاني، أو السعي السنوي"
              className="w-full px-3.5 py-2.5 bg-white border border-[#D8CEBD] rounded-xl text-sm font-bold text-[#2F2822] focus:bg-white focus:ring-2 focus:ring-[#B86848] focus:outline-none"
              autoFocus
            />
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

          {/* Month Selection Section - NEW FEATURE */}
          <div className="pt-2 border-t border-[#E8E0D2] space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#B86848]" />
                <span>تحديد الأشهر الداخلة في احتساب المعدل:</span>
              </label>

              {/* Counter badge and quick Select All / Deselect All */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#EAD8C7] text-[#6E3C24]">
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

            {/* Scrollable Months Container with custom styled scrollbar */}
            {availableMonths.length === 0 ? (
              <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 text-center text-xs text-amber-900 space-y-1.5">
                <p className="font-bold text-sm text-amber-950">
                  لا توجد كشوف شهرية مطابقة لهذا الصف والمادة حالياً
                </p>
                <p className="text-[11px] text-[#7A6E61] leading-relaxed">
                  يمكنك إنشاء الفصل الآن وربط الشهور له لاحقاً، أو إظهار كافة كشوف الأشهر المنشأة في التطبيق.
                </p>
                {!showAllMonths && monthlyModels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllMonths(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#B86848] bg-white px-3 py-1.5 rounded-lg border border-[#D8CEBD] shadow-2xs hover:bg-[#F3EDE2] cursor-pointer mt-1"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>عرض كافة الشهور المنشأة ({monthlyModels.length})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-56 sm:max-h-60 overflow-y-auto space-y-2 p-2.5 bg-[#F3EDE2] rounded-xl border border-[#D8CEBD] overscroll-contain">
                {availableMonths.map((model) => {
                  const isChecked = selectedModelIds.includes(model.id);
                  const matchingStudents = grade
                    ? model.students.filter((s) => isGradeLevelMatch(s.gradeLevel, grade))
                    : model.students;

                  return (
                    <label
                      key={model.id}
                      onClick={() => handleToggleModel(model.id)}
                      className={`p-2.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                        isChecked
                          ? 'bg-white border-[#B86848] text-[#2F2822] shadow-2xs ring-2 ring-[#B86848]/20'
                          : 'bg-white/70 border-[#D8CEBD] text-[#6E6254] hover:bg-white hover:border-[#B86848]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-[#B86848] border-[#944D30] text-white shadow-xs'
                              : 'border-[#CBD5E1] bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
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

                      {/* Students count pill */}
                      <div className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                        {matchingStudents.length} طالب
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Toggle to show all months if some were filtered out */}
            {!showAllMonths && monthlyModels.length > availableMonths.length && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllMonths(true)}
                  className="text-[11px] font-bold text-[#8C5237] hover:underline cursor-pointer"
                >
                  + إظهار كشوف الأشهر الأخرى التي لم تطابق الفلتر ({monthlyModels.length - availableMonths.length})
                </button>
              </div>
            )}

            {/* Explanatory summary text */}
            <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-[11px] text-amber-900 leading-relaxed flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {selectedModelIds.length > 1 ? (
                  <>
                    سيتم احتساب المعدل الحسابي تلقائياً بين هذه الشهور المختارة (<strong>{selectedModelIds.length} شهور</strong>) ونقل الشاشة مباشرة لعمود المعدل.
                  </>
                ) : selectedModelIds.length === 1 ? (
                  <>
                    تم اختيار شهر واحد فقط، وسيتم احتساب درجته تلقائياً في عمود المعدل.
                  </>
                ) : (
                  <>
                    لم يتم تحديد أي شهر بعد، حدد الأشهر التي تريد احتساب معدلها من القائمة أعلاه (أو يمكنك إضافتها لاحقاً).
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
