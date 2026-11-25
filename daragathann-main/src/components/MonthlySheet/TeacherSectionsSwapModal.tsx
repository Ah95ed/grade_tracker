import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  ArrowLeftRight,
  Layers,
  User,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  GraduationCap,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { MonthlyModel, StudentRow } from '../../types';
import { AppUser } from '../../utils/auth';
import {
  isGradeLevelMatch,
  isSectionMatch,
  isSubjectMatch,
} from '../../utils/gradeAndSectionMatcher';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';

interface TeacherAssignment {
  teacherName: string;
  sections: string[];
  modelIds: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allModels: MonthlyModel[];
  onUpdateAllModels?: (updatedModels: MonthlyModel[]) => void;
  initialGrade?: string;
  initialSubject?: string;
  currentUser?: AppUser | null;
}

export const TeacherSectionsSwapModal: React.FC<Props> = ({
  isOpen,
  onClose,
  allModels,
  onUpdateAllModels,
  initialGrade,
  initialSubject,
}) => {
  // 1. Available Grades from models
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    allModels.forEach((m) => {
      if (m.gradeLevel?.trim()) set.add(m.gradeLevel.trim());
      (m.students || []).forEach((s) => {
        if (s.gradeLevel?.trim()) set.add(s.gradeLevel.trim());
      });
    });
    return Array.from(set);
  }, [allModels]);

  // Selected Grade
  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    return initialGrade || availableGrades[0] || '';
  });

  // 2. Available Subjects for the selected grade
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    allModels.forEach((m) => {
      if (
        !selectedGrade ||
        isGradeLevelMatch(m.gradeLevel || '', selectedGrade)
      ) {
        if (m.subject?.trim()) set.add(m.subject.trim());
      }
    });
    return Array.from(set);
  }, [allModels, selectedGrade]);

  // Selected Subject
  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    return initialSubject || availableSubjects[0] || '';
  });

  // State to hold working assignments for teachers of (selectedGrade, selectedSubject)
  // Mapping: teacherName -> string[] of sections
  const [teacherSectionsMap, setTeacherSectionsMap] = useState<Record<string, string[]>>({});
  const [customSectionsList, setCustomSectionsList] = useState<string[]>([]);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [showAddSectionInput, setShowAddSectionInput] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Initialize or re-sync teacher assignments whenever grade or subject changes
  const matchingModels = useMemo(() => {
    if (!selectedGrade || !selectedSubject) return [];
    return allModels.filter(
      (m) =>
        isGradeLevelMatch(m.gradeLevel || '', selectedGrade) &&
        isSubjectMatch(m.subject || '', selectedSubject)
    );
  }, [allModels, selectedGrade, selectedSubject]);

  // Extract teachers and their initial sections
  const initialTeachers = useMemo(() => {
    const map = new Map<string, TeacherAssignment>();
    matchingModels.forEach((m) => {
      const tName = (m.teacherName || 'أستاذ المادة').trim();
      const canon = canonicalizeArabic(tName);
      if (!map.has(canon)) {
        map.set(canon, {
          teacherName: tName,
          sections: [],
          modelIds: [],
        });
      }
      const entry = map.get(canon)!;
      entry.modelIds.push(m.id);

      if (m.assignedSections && m.assignedSections.length > 0) {
        m.assignedSections.forEach((s) => {
          if (s && !entry.sections.includes(s.trim())) {
            entry.sections.push(s.trim());
          }
        });
      } else {
        (m.students || []).forEach((st) => {
          if (st.section?.trim() && !entry.sections.includes(st.section.trim())) {
            entry.sections.push(st.section.trim());
          }
        });
      }
    });

    return Array.from(map.values());
  }, [matchingModels]);

  // Keep teacherSectionsMap in sync when grade or subject changes
  React.useEffect(() => {
    if (isOpen) {
      const initialMap: Record<string, string[]> = {};
      initialTeachers.forEach((t) => {
        initialMap[t.teacherName] = [...t.sections];
      });
      setTeacherSectionsMap(initialMap);
      setSuccessNotice(null);
    }
  }, [isOpen, initialTeachers]);

  // All known sections for this grade from models, students, defaults, and custom added
  const allKnownSections = useMemo(() => {
    const set = new Set<string>();
    ['أ', 'ب', 'ج', 'د'].forEach((s) => set.add(s));

    allModels.forEach((m) => {
      if (!selectedGrade || isGradeLevelMatch(m.gradeLevel || '', selectedGrade)) {
        (m.assignedSections || []).forEach((s) => s.trim() && set.add(s.trim()));
        (m.students || []).forEach((s) => s.section?.trim() && set.add(s.section.trim()));
      }
    });

    customSectionsList.forEach((s) => s.trim() && set.add(s.trim()));
    Object.values(teacherSectionsMap).forEach((secs) => secs.forEach((s) => set.add(s)));

    return Array.from(set);
  }, [allModels, selectedGrade, customSectionsList, teacherSectionsMap]);

  // Unassigned sections (not in any teacher's list for this grade & subject)
  const assignedSectionsSet = useMemo(() => {
    const set = new Set<string>();
    Object.values(teacherSectionsMap).forEach((secs) => {
      secs.forEach((s) => set.add(canonicalizeArabic(s)));
    });
    return set;
  }, [teacherSectionsMap]);

  const unassignedSections = useMemo(() => {
    return allKnownSections.filter(
      (sec) => !assignedSectionsSet.has(canonicalizeArabic(sec))
    );
  }, [allKnownSections, assignedSectionsSet]);

  if (!isOpen) return null;

  // Swap all sections between Teacher A and Teacher B
  const handleSwapAllSections = (teacherA: string, teacherB: string) => {
    setTeacherSectionsMap((prev) => {
      const secsA = prev[teacherA] || [];
      const secsB = prev[teacherB] || [];
      return {
        ...prev,
        [teacherA]: [...secsB],
        [teacherB]: [...secsA],
      };
    });
    setSuccessNotice(`تم تبديل جميع الشُعب بين الأستاذ (${teacherA}) والأستاذ (${teacherB})!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Move a specific section from one teacher to another
  const handleMoveSection = (section: string, fromTeacher: string, toTeacher: string) => {
    setTeacherSectionsMap((prev) => {
      const fromSecs = (prev[fromTeacher] || []).filter(
        (s) => canonicalizeArabic(s) !== canonicalizeArabic(section)
      );
      const toSecs = prev[toTeacher] || [];
      const existsInTo = toSecs.some(
        (s) => canonicalizeArabic(s) === canonicalizeArabic(section)
      );
      const newToSecs = existsInTo ? toSecs : [...toSecs, section];

      return {
        ...prev,
        [fromTeacher]: fromSecs,
        [toTeacher]: newToSecs,
      };
    });
    setSuccessNotice(`تم نقل (شعبة ${section}) من الأستاذ (${fromTeacher}) إلى (${toTeacher})`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // Assign an unassigned section to a teacher
  const handleAssignUnassignedSection = (section: string, teacherName: string) => {
    setTeacherSectionsMap((prev) => {
      const current = prev[teacherName] || [];
      if (current.some((s) => canonicalizeArabic(s) === canonicalizeArabic(section))) {
        return prev;
      }
      return {
        ...prev,
        [teacherName]: [...current, section],
      };
    });
  };

  // Remove section from a teacher (becomes unassigned)
  const handleUnassignSection = (section: string, teacherName: string) => {
    setTeacherSectionsMap((prev) => {
      const current = prev[teacherName] || [];
      return {
        ...prev,
        [teacherName]: current.filter(
          (s) => canonicalizeArabic(s) !== canonicalizeArabic(section)
        ),
      };
    });
  };

  // Add a brand-new section
  const handleAddNewSection = () => {
    const trimmed = newSectionInput.trim();
    if (!trimmed) return;
    if (!customSectionsList.includes(trimmed)) {
      setCustomSectionsList((prev) => [...prev, trimmed]);
    }
    // Automatically persist in localStorage
    try {
      const k = `gradebook_custom_sections_${canonicalizeArabic(selectedGrade || 'all')}`;
      const raw = localStorage.getItem(k);
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(trimmed)) {
        localStorage.setItem(k, JSON.stringify([...list, trimmed]));
      }
    } catch {}

    setNewSectionInput('');
    setShowAddSectionInput(false);
  };

  // Save all changes back to models
  const handleSaveAndApply = () => {
    // Collect all unique students for this Grade across all models
    const poolOfStudents: StudentRow[] = [];
    const seenStudentKey = new Set<string>();

    allModels.forEach((m) => {
      if (isGradeLevelMatch(m.gradeLevel || '', selectedGrade)) {
        (m.students || []).forEach((st) => {
          const k = `${canonicalizeArabic(st.name)}_${canonicalizeArabic(st.section || 'أ')}`;
          if (!seenStudentKey.has(k)) {
            seenStudentKey.add(k);
            poolOfStudents.push({ ...st });
          }
        });
      }
    });

    // Update all models that match this grade and subject
    const updatedModels = allModels.map((m) => {
      const matchGrade = isGradeLevelMatch(m.gradeLevel || '', selectedGrade);
      const matchSub = isSubjectMatch(m.subject || '', selectedSubject);
      if (!matchGrade || !matchSub) return m;

      const tName = (m.teacherName || 'أستاذ المادة').trim();
      const newAssignedSections = teacherSectionsMap[tName] || [];

      // If the model now has specific assigned sections, ensure students of those sections are present
      let updatedStudents = m.students ? [...m.students] : [];
      if (newAssignedSections.length > 0) {
        // Bring in students of the newly assigned sections if they were in the other teacher's model
        newAssignedSections.forEach((sec) => {
          const matchingPoolStudents = poolOfStudents.filter((st) =>
            isSectionMatch(st.section || 'أ', sec)
          );
          matchingPoolStudents.forEach((poolSt) => {
            const alreadyInModel = updatedStudents.some(
              (st) =>
                canonicalizeArabic(st.name) === canonicalizeArabic(poolSt.name) &&
                isSectionMatch(st.section || 'أ', sec)
            );
            if (!alreadyInModel) {
              updatedStudents.push({
                ...poolSt,
                id: 'st-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                writtenRawScore: null,
                scores: {},
              });
            }
          });
        });
      }

      return {
        ...m,
        assignedSections: newAssignedSections.length > 0 ? newAssignedSections : undefined,
        students: updatedStudents,
        updatedAt: new Date().toISOString(),
      };
    });

    if (onUpdateAllModels) {
      onUpdateAllModels(updatedModels);
    }
    onClose();
  };

  const teacherEntries = Object.entries(teacherSectionsMap);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[#3A6C8F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold flex items-center gap-1.5">
                <span>تبديل وتعديل توزيع الشُعب بين الأساتذة</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-md">
                  خاص بالإدارة
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-blue-100">
                إعادة توزيع أو تبديل الشُعب بسهولة عند الخطأ في الاختيار دون فقدان الدرجات
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

        {/* Filters: Grade & Subject */}
        <div className="p-3 bg-white border-b border-[#D8CEBD] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            {/* Grade Selector */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <GraduationCap className="w-4 h-4 text-[#3A6C8F]" />
              <span>الصف:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold bg-[#FAF7EC] border border-[#D8CEBD] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3A6C8F]"
              >
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>المادة:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold bg-[#FAF7EC] border border-[#D8CEBD] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Notice */}
          <span className="text-[11px] text-slate-500 font-medium">
            عدد الأساتذة المسجلين: {teacherEntries.length}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Success / Feedback notice */}
          {successNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {teacherEntries.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-2">
              <User className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">
                لا يوجد أساتذة مسجلون حالياً لمادة ({selectedSubject}) للصف ({selectedGrade})
              </p>
              <p className="text-[11px] text-slate-500">
                يمكنك إنشاء نماذج للأساتذة أولاً من صفحة الجدول وتعيين أسمائهم ومادتهم.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* If there are 2 teachers, show a prominent "Swap All" button right at the top */}
              {teacherEntries.length === 2 && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="text-xs text-indigo-950 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>تبديل فوري وسريع بين الأستاذين:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSwapAllSections(teacherEntries[0][0], teacherEntries[1][0])
                    }
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                    title="تبديل جميع شُعب الأستاذ الأول مع شُعب الأستاذ الثاني بنقرة واحدة"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>
                      تبديل شُعب ({teacherEntries[0][0]}) مع ({teacherEntries[1][0]})
                    </span>
                  </button>
                </div>
              )}

              {/* Cards for each teacher */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {teacherEntries.map(([tName, sections], idx) => {
                  const otherTeachers = teacherEntries
                    .filter(([name]) => name !== tName)
                    .map(([name]) => name);

                  return (
                    <div
                      key={tName}
                      className="bg-white rounded-xl border-2 border-slate-200 p-3.5 space-y-3 shadow-2xs hover:border-[#3A6C8F]/50 transition-colors"
                    >
                      {/* Teacher Header */}
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center font-black text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900">
                              {tName}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {selectedSubject} • {selectedGrade}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border">
                          {sections.length} {sections.length === 1 ? 'شعبة' : 'شُعب'}
                        </span>
                      </div>

                      {/* Assigned Sections list */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                          الشُعب المخصصة لهذا الأستاذ حالياً:
                        </span>
                        {sections.length === 0 ? (
                          <div className="p-2 text-center bg-slate-50 rounded-lg text-slate-400 text-xs italic">
                            لم تُخصص أي شُعب بعد (أو يدرس كل الشُعب)
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {sections.map((sec) => (
                              <div
                                key={sec}
                                className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-950 px-2.5 py-1 rounded-lg text-xs font-black shadow-2xs"
                              >
                                <span>شعبة {sec}</span>

                                {/* Quick move to other teacher dropdown or button */}
                                {otherTeachers.length === 1 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMoveSection(sec, tName, otherTeachers[0])
                                    }
                                    title={`نقل شعبة ${sec} إلى الأستاذ (${otherTeachers[0]})`}
                                    className="p-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                                  >
                                    <ArrowRight className="w-3 h-3 rotate-180" />
                                  </button>
                                ) : otherTeachers.length > 1 ? (
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleMoveSection(sec, tName, e.target.value);
                                        e.target.value = '';
                                      }
                                    }}
                                    defaultValue=""
                                    title="نقل إلى أستاذ آخر"
                                    className="text-[9px] bg-white border border-slate-300 rounded px-1 py-0.2 font-bold cursor-pointer"
                                  >
                                    <option value="" disabled>
                                      نقل ⇄
                                    </option>
                                    {otherTeachers.map((ot) => (
                                      <option key={ot} value={ot}>
                                        إلى {ot}
                                      </option>
                                    ))}
                                  </select>
                                ) : null}

                                {/* Unassign button */}
                                <button
                                  type="button"
                                  onClick={() => handleUnassignSection(sec, tName)}
                                  title={`إلغاء تعيين شعبة ${sec}`}
                                  className="p-0.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quick Assign from unassigned sections */}
                      {unassignedSections.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                            + إضافة شعبة متاحة لهذا الأستاذ:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {unassignedSections.map((sec) => (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => handleAssignUnassignedSection(sec, tName)}
                                className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                                title={`تعيين شعبة ${sec} للأستاذ ${tName}`}
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>شعبة {sec}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Unassigned sections shelf & Add New Section */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    <span>الشُعب المتبقية (غير المعينة لأي أستاذ):</span>
                  </div>

                  {!showAddSectionInput && (
                    <button
                      type="button"
                      onClick={() => setShowAddSectionInput(true)}
                      className="text-xs px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg border border-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة شعبة جديدة</span>
                    </button>
                  )}
                </div>

                {/* List of unassigned sections */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {unassignedSections.length === 0 && !showAddSectionInput && (
                    <p className="text-[11px] text-amber-800 italic">
                      جميع الشُعب موزعة ومخصصة حالياً للأساتذة. يمكنك إضافة شعبة جديدة من الزر أعلاه.
                    </p>
                  )}
                  {unassignedSections.map((sec) => (
                    <div
                      key={sec}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs flex items-center gap-1.5"
                    >
                      <span>شعبة {sec}</span>
                      <span className="text-[9px] text-amber-700 bg-amber-100 px-1 py-0.2 rounded font-normal">
                        متاحة
                      </span>
                    </div>
                  ))}

                  {/* Add section input inline */}
                  {showAddSectionInput && (
                    <div className="inline-flex items-center gap-1 bg-white p-1 rounded-lg border border-amber-400">
                      <input
                        type="text"
                        value={newSectionInput}
                        onChange={(e) => setNewSectionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewSection()}
                        placeholder="رمز الشعبة (مثال: هـ، 5)..."
                        className="w-24 px-1.5 py-0.5 text-xs font-bold border rounded outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddNewSection}
                        disabled={!newSectionInput.trim()}
                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold rounded cursor-pointer"
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
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#F8F4EA] border-t border-[#E0D5C3] flex items-center justify-between shrink-0">
          <p className="text-[11px] text-[#7A6E61] font-medium hidden sm:block">
            💡 حفظ التغييرات سيحدث نماذج الأساتذة تلقائياً في صفحة الجدول وكشوفات الدرجات.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={teacherEntries.length === 0}
              className="px-4 py-1.5 bg-[#3A6C8F] hover:bg-[#2C5572] disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>حفظ وتطبيق التوزيع الجديد</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
