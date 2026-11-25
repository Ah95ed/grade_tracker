import React, { useState } from 'react';
import {
  X,
  GitMerge,
  Pencil,
  AlertTriangle,
  Check,
  Users,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useInstitutionTerms, getGradePlaceholder } from '../../utils/translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentGrade: string;
  allGrades: string[];
  currentSections: string[];
  studentCount: number;
  gradeStudentCounts?: Record<string, number>;
  onRenameGrade: (oldGrade: string, newGrade: string) => void;
  onMergeGrade: (sourceGrade: string, targetGrade: string) => void;
  onRenameSection?: (grade: string, oldSection: string, newSection: string) => void;
}

export const GradeRenameMergeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentGrade,
  allGrades,
  currentSections,
  studentCount,
  gradeStudentCounts = {},
  onRenameGrade,
  onMergeGrade,
  onRenameSection,
}) => {
  const terms = useInstitutionTerms();
  const [activeTab, setActiveTab] = useState<'merge' | 'rename' | 'sections'>('merge');
  const [newGradeName, setNewGradeName] = useState(currentGrade);
  const [selectedTargetGrade, setSelectedTargetGrade] = useState<string | null>(null);
  const [isConfirmingMerge, setIsConfirmingMerge] = useState(false);

  // Section renaming state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');

  // Other available grades for merging
  const otherGrades = allGrades.filter((g) => g !== currentGrade);

  if (!isOpen) return null;

  const handleManualRename = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGradeName.trim();
    if (!trimmed || trimmed === currentGrade) {
      onClose();
      return;
    }
    onRenameGrade(currentGrade, trimmed);
    onClose();
  };

  const handleExecuteMerge = () => {
    if (!selectedTargetGrade) return;
    onMergeGrade(currentGrade, selectedTargetGrade);
    setIsConfirmingMerge(false);
    setSelectedTargetGrade(null);
    onClose();
  };

  const handleSaveSectionRename = (oldSec: string) => {
    const trimmed = newSectionName.trim();
    if (trimmed && trimmed !== oldSec && onRenameSection) {
      onRenameSection(currentGrade, oldSec, trimmed);
    }
    setEditingSection(null);
    setNewSectionName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[92dvh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#4A7C59] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Layers className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight">
                إدارة وتعديل الصف: <span className="text-amber-200 font-black">«{currentGrade}»</span>
              </h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                تعديل الاسم أو دمج الصفوف المكررة ونقل الشعب
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="grid grid-cols-3 p-2 bg-[#F3EDE0] border-b border-[#D8CEBD] text-xs font-bold gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('merge');
              setIsConfirmingMerge(false);
            }}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'merge'
                ? 'bg-white text-[#2F2822] shadow-xs border border-[#CBB69F]'
                : 'text-[#6B5E51] hover:text-[#2F2822] hover:bg-white/50'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5 text-[#4A7C59]" />
            <span>دمج مع صف</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rename')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'rename'
                ? 'bg-white text-[#2F2822] shadow-xs border border-[#CBB69F]'
                : 'text-[#6B5E51] hover:text-[#2F2822] hover:bg-white/50'
            }`}
          >
            <Pencil className="w-3.5 h-3.5 text-[#BA916C]" />
            <span>تعديل الاسم يدوياً</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'sections'
                ? 'bg-white text-[#2F2822] shadow-xs border border-[#CBB69F]'
                : 'text-[#6B5E51] hover:text-[#2F2822] hover:bg-white/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#5692BE]" />
            <span>تعديل الشُعب ({currentSections.length})</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: MERGE GRADE */}
          {activeTab === 'merge' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>حل مشكلة الصفوف المتشابهة بالاسم (مثل أول متوسط و اول متوسط):</span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  اختر الصف الذي تريد أن يندمج معه <b className="text-amber-950">«{currentGrade}»</b>.
                  ستنتقل كافة الشُعب والطلاب إلى الصف المختار، وسيختفي هذا المربع نهائياً لتوحيد الجدول.
                </p>
              </div>

              {otherGrades.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#7A6E61] bg-white rounded-xl border border-dashed border-[#D8CEBD] p-4">
                  لا توجد صفوف أخرى في الجدول حالياً للدمج معها. يمكنك استخدام تبويب "تعديل الاسم يدوياً" لتصحيح اسم الصف.
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#2F2822] block">
                    اختر الصف المستهدف الذي تريد الدمج معه:
                  </label>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {otherGrades.map((target) => {
                      const isSelected = selectedTargetGrade === target;
                      const count = gradeStudentCounts[target] || 0;
                      return (
                        <button
                          key={target}
                          type="button"
                          onClick={() => {
                            setSelectedTargetGrade(target);
                            setIsConfirmingMerge(true);
                          }}
                          className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-[#D8CEBD] text-[#2F2822]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                              <GitMerge className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-black text-[#2F2822]">
                                {target}
                              </div>
                              <div className="text-[10px] text-[#7A6E61]">
                                يحتوي حالياً على {count} طالب
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                              دمج هنا
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 rotate-180" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Explicit Confirmation Dialog before Merge */}
              {isConfirmingMerge && selectedTargetGrade && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs text-rose-950">
                      <div className="font-black text-rose-900 text-xs sm:text-sm">
                        تأكيد عملية الدمج:
                      </div>
                      <p className="leading-relaxed font-medium">
                        ستتحول <span className="font-black text-rose-900 bg-white px-1.5 py-0.5 rounded border border-rose-200">«{currentGrade}»</span> إلى <span className="font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">«{selectedTargetGrade}»</span>.
                      </p>
                      <p className="text-[11px] text-rose-800 leading-normal">
                        سيتم نقل جميع الطلاب ({studentCount} طالب) وكافة شُعبهم تلقائياً ليصبحوا ضمن صف «{selectedTargetGrade}»، ولن يتبقى مربع منفصل لصف «{currentGrade}».
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsConfirmingMerge(false);
                        setSelectedTargetGrade(null);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-[#6B5E51] hover:text-[#2F2822] bg-white border border-[#D8CEBD] rounded-lg cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteMerge}
                      className="px-4 py-1.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>نعم، ادمج وانقل الشُعب الآن</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL RENAME */}
          {activeTab === 'rename' && (
            <form onSubmit={handleManualRename} className="space-y-3.5 animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2F2822] block">
                  اسم {terms.classLabelShort} الحالي:
                </label>
                <div className="p-2.5 bg-white border border-[#D8CEBD] rounded-xl text-xs font-bold text-[#6B5E51]">
                  {currentGrade}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2F2822] block">
                  الاسم الجديد لـ {terms.classLabelShort}:
                </label>
                <input
                  type="text"
                  value={newGradeName}
                  onChange={(e) => setNewGradeName(e.target.value)}
                  placeholder={getGradePlaceholder(terms.type)}
                  className="w-full p-2.5 bg-white border-2 border-[#D8CEBD] focus:border-[#BA916C] rounded-xl text-xs sm:text-sm font-bold text-[#2F2822] focus:outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-[#7A6E61]">
                  سيتم تحديث اسم هذا {terms.classLabelShort} لجميع {terms.studentsLabel} المسجلين فيه ({studentCount} {terms.studentLabel}).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-bold text-[#6B5E51] bg-white border border-[#D8CEBD] rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!newGradeName.trim() || newGradeName.trim() === currentGrade}
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#BA916C] hover:bg-[#A87F5A] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ الاسم الجديد</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SECTIONS RENAME */}
          {activeTab === 'sections' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="text-xs text-[#554A3E]">
                قائمة الشُعب المسجلة في <b className="text-[#2F2822]">«{currentGrade}»</b>:
              </div>

              <div className="space-y-2">
                {currentSections.map((sec) => (
                  <div
                    key={sec}
                    className="p-2.5 bg-white border border-[#D8CEBD] rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    {editingSection === sec ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={newSectionName}
                          onChange={(e) => setNewSectionName(e.target.value)}
                          placeholder="اسم الشعبة الجديد..."
                          className="px-2 py-1 bg-white border border-[#BA916C] rounded-lg text-xs font-bold w-28 text-center"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveSectionRename(sec)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer"
                          title="حفظ"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSection(null)}
                          className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md cursor-pointer"
                          title="إلغاء"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-[#2B6CB0] font-black flex items-center justify-center text-xs">
                            {sec}
                          </span>
                          <span className="font-bold text-[#2F2822]">
                            شعبة {sec}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingSection(sec);
                            setNewSectionName(sec);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#6B5E51] hover:text-[#BA916C] bg-slate-50 hover:bg-amber-50 border border-[#D8CEBD] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          title="تعديل اسم الشعبة"
                        >
                          <Pencil className="w-3 h-3 text-[#BA916C]" />
                          <span>تعديل</span>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
