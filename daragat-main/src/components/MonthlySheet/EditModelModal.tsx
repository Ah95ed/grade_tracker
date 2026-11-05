import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Edit3,
  GraduationCap,
  User,
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { MonthlyModel } from '../../types';
import { AppUser } from '../../utils/auth';
import {
  normalizeGradeLevel,
  isGradeLevelMatch,
  isSectionMatch,
  isSubjectMatch,
} from '../../utils/gradeAndSectionMatcher';
import {
  getStandardGrades,
  getStandardSubjects,
  getInstitutionTerms,
  getGradePlaceholder,
  getSubjectPlaceholder,
} from '../../utils/translations';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';

const TARGET_ADMIN_EMAIL = 'asmaomar5566@gmail.com';

const isIdarahOrAdmin = (s?: string): boolean => {
  if (!s) return false;
  const canon = canonicalizeArabic(s.trim());
  return canon === 'اداره' || canon === 'الاداره' || canon === 'عام';
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  model: MonthlyModel | null;
  onSave: (
    modelId: string,
    newName: string,
    newSubject: string,
    newGradeLevel?: string,
    newTeacherName?: string,
    newAssignedSections?: string[]
  ) => void;
  profileSubject?: string;
  allModels?: MonthlyModel[];
  currentUser?: AppUser | null;
  onOpenSectionsSwap?: (grade?: string, subject?: string) => void;
}

export const EditModelModal: React.FC<Props> = ({
  isOpen,
  onClose,
  model,
  onSave,
  profileSubject,
  allModels = [],
  currentUser,
  onOpenSectionsSwap,
}) => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [customSectionsList, setCustomSectionsList] = useState<string[]>([]);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [showAddSectionInput, setShowAddSectionInput] = useState(false);

  // Check if admin / school administration mode
  const isAdminSchool = useMemo(() => {
    const userRole = currentUser?.userRole;
    const userEmail = (currentUser?.email || '').trim().toLowerCase();
    const profSub = (profileSubject || '').trim();
    return (
      userRole === 'admin_school' ||
      userEmail === TARGET_ADMIN_EMAIL ||
      isIdarahOrAdmin(profSub)
    );
  }, [currentUser, profileSubject]);

  const terms = useMemo(() => getInstitutionTerms(currentUser?.institutionType), [currentUser?.institutionType]);

  // Collect subjects previously added by the user
  const previousSubjects = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addIfValid = (s?: string) => {
      const trimmed = s?.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        list.push(trimmed);
      }
    };

    if (profileSubject?.trim()) {
      addIfValid(profileSubject.trim());
    }

    try {
      const raw = localStorage.getItem('gradebook_user_subjects');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((item) => addIfValid(typeof item === 'string' ? item : ''));
        }
      }
    } catch {}

    if (list.length === 0) {
      getStandardSubjects(currentUser?.institutionType).forEach(addIfValid);
    }

    return list;
  }, [profileSubject, isOpen, currentUser?.institutionType]);

  // Collect grade levels previously added by user or from existing models
  const previousGrades = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addIfValid = (g?: string) => {
      const trimmed = g?.trim();
      if (!trimmed) return;
      const normalized = normalizeGradeLevel(trimmed);
      const canon = canonicalizeArabic(normalized);
      if (!seen.has(canon)) {
        seen.add(canon);
        list.push(normalized);
      }
    };

    allModels.forEach((m) => {
      if (m.gradeLevel) addIfValid(m.gradeLevel);
      (m.students || []).forEach((st) => addIfValid(st.gradeLevel));
    });
    if (model?.gradeLevel) addIfValid(model.gradeLevel);

    try {
      const raw = localStorage.getItem('gradebook_user_grades');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((item) => addIfValid(typeof item === 'string' ? item : ''));
        }
      }
    } catch {}

    getStandardGrades(currentUser?.institutionType).forEach((sg) => addIfValid(sg));
    return list;
  }, [allModels, model, isOpen, currentUser?.institutionType]);

  // Other teachers teaching this same Grade & Subject
  const otherTeachersForGradeAndSub = useMemo(() => {
    const trimmedGrade = gradeLevel.trim();
    const trimmedSub = subject.trim();
    if (!trimmedGrade || !trimmedSub) return [];

    const matching = allModels.filter(
      (m) =>
        m.id !== model?.id &&
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
  }, [allModels, model?.id, gradeLevel, subject]);

  // All display sections for this grade
  const allDisplaySections = useMemo(() => {
    const set = new Set<string>();
    ['أ', 'ب', 'ج', 'د'].forEach((s) => set.add(s));

    allModels.forEach((m) => {
      if (!gradeLevel || isGradeLevelMatch(m.gradeLevel || '', gradeLevel)) {
        (m.assignedSections || []).forEach((s) => s.trim() && set.add(s.trim()));
        (m.students || []).forEach((s) => s.section?.trim() && set.add(s.section.trim()));
      }
    });

    customSectionsList.forEach((s) => s.trim() && set.add(s.trim()));
    selectedSections.forEach((s) => s.trim() && set.add(s.trim()));

    return Array.from(set);
  }, [allModels, gradeLevel, customSectionsList, selectedSections]);

  useEffect(() => {
    if (isOpen && model) {
      setName(model.name || '');
      setSubject(model.subject || '');
      setGradeLevel(model.gradeLevel || '');
      setTeacherName(model.teacherName || '');
      setSelectedSections(model.assignedSections ? [...model.assignedSections] : []);
      setNewSectionInput('');
      setShowAddSectionInput(false);

      // Load custom sections for this grade from localStorage
      if (model.gradeLevel) {
        try {
          const k = `gradebook_custom_sections_${canonicalizeArabic(model.gradeLevel)}`;
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) setCustomSectionsList(list);
          }
        } catch {}
      }
    }
  }, [isOpen, model]);

  if (!isOpen || !model) return null;

  // Swap all sections with another teacher directly
  const handleSwapWithTeacher = (otherTeacherName: string, otherSections: string[]) => {
    const myCurrent = [...selectedSections];
    setSelectedSections([...otherSections]);

    // Also notify user
    alert(
      `تم نقل شُعب (${otherSections.join('، ') || 'المحددة'}) إلى الأستاذ (${teacherName || 'الحالي'})، وسيتم تعيين شُعب (${myCurrent.join('، ') || 'السابقة'}) للأستاذ (${otherTeacherName}) عند الحفظ!`
    );
  };

  // Add new section
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
      const k = `gradebook_custom_sections_${canonicalizeArabic(gradeLevel.trim() || 'all')}`;
      const raw = localStorage.getItem(k);
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(trimmed)) {
        localStorage.setItem(k, JSON.stringify([...list, trimmed]));
      }
    } catch {}

    setNewSectionInput('');
    setShowAddSectionInput(false);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const trimmedSubject = subject.trim();
    const trimmedGrade = gradeLevel.trim();
    const trimmedTeacher = teacherName.trim();

    if (trimmedSubject) {
      try {
        const raw = localStorage.getItem('gradebook_user_subjects');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        if (!existing.includes(trimmedSubject)) {
          localStorage.setItem('gradebook_user_subjects', JSON.stringify([...existing, trimmedSubject]));
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

    onSave(
      model.id,
      trimmedName,
      trimmedSubject,
      trimmedGrade,
      trimmedTeacher || undefined,
      selectedSections.length > 0 ? selectedSections : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[#BA916C] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-amber-100" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                تعديل بيانات النموذج والمادة والشُعب
              </h3>
              <p className="text-[10px] text-amber-100/90">
                تعديل اسم الزر والمادة والصف واسم الأستاذ والشُعب المخصصة
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

        {/* Content */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          {/* اسم النموذج */}
          <div>
            <label className="block text-xs font-bold text-[#2F2822] mb-1">
              اسم النموذج (يظهر على الزر في الأعلى):
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="مثال: الشهر الأول، نصف السنة، الفصل الأول..."
              className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#BA916C] focus:outline-none"
              autoFocus
            />
          </div>

          {/* اسم المادة */}
          <div>
            <label className="block text-xs font-bold text-[#2F2822] mb-1">
              اسم {terms.subjectLabel}:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={getSubjectPlaceholder(currentUser?.institutionType)}
              className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#BA916C] focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
            />
            {previousSubjects.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <span className="text-[10px] text-[#7A6E61] font-bold block">
                  {terms.subjectsLabel} مضافة سابقاً:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {previousSubjects.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubject(sub)}
                      className={`text-xs px-2.5 py-0.5 rounded-lg border font-bold transition-all cursor-pointer ${
                        subject === sub
                          ? 'bg-[#BA916C] text-white border-[#BA916C] shadow-2xs'
                          : 'bg-[#F2ECE0] text-[#554A3E] border-[#D8CEBD] hover:bg-[#E5DBC7] active:scale-95'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* الصف الدراسي لهذا النموذج */}
          <div>
            <label className="block text-xs font-bold text-[#2F2822] mb-1 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#BA916C]" />
              <span>{terms.classLabel} لهذا النموذج:</span>
            </label>
            <input
              type="text"
              list="edit-model-grades-list"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={getGradePlaceholder(currentUser?.institutionType)}
              className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#BA916C] focus:outline-none"
            />
            <datalist id="edit-model-grades-list">
              {previousGrades.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>

          {/* اسم أستاذ المادة */}
          <div>
            <label className="block text-xs font-bold text-[#2F2822] mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#BA916C]" />
              <span>اسم {terms.teacherLabelShort} لهذا النموذج:</span>
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="مثال: حسين محمد، علي حسن..."
              className="w-full px-3 py-2 bg-white border border-[#D8CEBD] rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#BA916C] focus:outline-none"
            />
          </div>

          {/* الشُعب المخصصة لهذا الأستاذ / النموذج (مهم جداً في وضع الإدارة وتعدد الأساتذة) */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-300/80 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>الشُعب المخصصة لهذا الأستاذ:</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-900 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                  {selectedSections.length === 0
                    ? 'كل الشُعب'
                    : `(${selectedSections.length} شعبة: ${selectedSections.join('، ')})`}
                </span>
                {onOpenSectionsSwap && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSectionsSwap(gradeLevel, subject);
                    }}
                    className="text-[10px] font-black text-indigo-700 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                    title="فتح نافذة تبديل الشُعب بين جميع الأساتذة"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>لوحة التبديل الشاملة</span>
                  </button>
                )}
              </div>
            </div>

            {/* تنبيه إذا وُجد أستاذ آخر لنفس الصف والمادة مع إمكانية التبديل المباشر */}
            {otherTeachersForGradeAndSub.length > 0 && (
              <div className="p-2.5 bg-white rounded-lg border border-amber-300 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>أساتذة آخرون لنفس المادة والصف:</span>
                </div>
                {otherTeachersForGradeAndSub.map((ot) => (
                  <div
                    key={ot.teacherName}
                    className="flex items-center justify-between gap-2 p-1.5 bg-amber-50/60 rounded border border-amber-200"
                  >
                    <div className="text-[11px] text-slate-800">
                      • <strong>{ot.teacherName}</strong> (شُعب:{' '}
                      <span className="font-bold text-indigo-900">
                        {ot.sections.join('، ') || 'غير محدد'}
                      </span>
                      )
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSwapWithTeacher(ot.teacherName, ot.sections)}
                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                      title={`تبديل كل الشُعب مع الأستاذ ${ot.teacherName}`}
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                      <span>تبديل الشُعب معه</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* خيارات الشُعب بنقرة واحدة */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSections([])}
                className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                  selectedSections.length === 0
                    ? 'bg-[#BA916C] text-white border-[#BA916C] shadow-2xs'
                    : 'bg-white text-slate-700 border-amber-300 hover:bg-amber-100/50'
                }`}
              >
                كل الشُعب
              </button>

              {allDisplaySections.map((sec) => {
                const isSelected = selectedSections.includes(sec);
                const assignedToOther = otherTeachersForGradeAndSub.find((ot) =>
                  ot.sections.some((s) => isSectionMatch(s, sec))
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
                    className={`text-xs px-2.5 py-1 rounded-lg border font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs ring-1 ring-emerald-500'
                        : assignedToOther
                        ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300'
                        : 'bg-white text-slate-800 border-amber-300 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    <span>شعبة {sec}</span>
                    {assignedToOther && !isSelected && (
                      <span className="text-[9px] text-slate-500 font-normal">
                        ({assignedToOther.teacherName})
                      </span>
                    )}
                  </button>
                );
              })}

              {/* إضافة شعبة أخرى */}
              {!showAddSectionInput ? (
                <button
                  type="button"
                  onClick={() => setShowAddSectionInput(true)}
                  className="text-xs px-2 py-1 rounded-lg border border-dashed border-[#BA916C] text-[#BA916C] hover:bg-amber-100/50 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>شعبة أخرى</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1 bg-white p-1 rounded-lg border border-[#BA916C]">
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
                    className="px-2 py-0.5 bg-[#BA916C] hover:bg-[#A9815D] disabled:opacity-40 text-white text-xs font-bold rounded cursor-pointer"
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
            <p className="text-[10px] text-amber-900 font-medium">
              تعديل الشُعب يتيح تصحيح أي خطأ في تعيين الفصول للأستاذ وسيتم فرز الطلاب وفقاً للشُعب المحددة.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#F8F4EA] border-t border-[#E0D5C3] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-1.5 bg-[#BA916C] hover:bg-[#A9815D] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>حفظ التعديلات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
