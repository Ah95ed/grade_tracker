import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Check, BookOpen, GraduationCap, AlertCircle } from 'lucide-react';
import { TermModel } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialName?: string;
  initialSubject?: string;
  initialGrade?: string;
  availableSubjects: string[];
  availableGrades: string[];
  onSubmit: (name: string, subject: string, gradeLevel: string) => void;
}

export const TermModal: React.FC<Props> = ({
  isOpen,
  onClose,
  mode,
  initialName = '',
  initialSubject = '',
  initialGrade = '',
  availableSubjects,
  availableGrades,
  onSubmit,
}) => {
  const [termName, setTermName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject);
  const [gradeLevel, setGradeLevel] = useState(initialGrade);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTermName(initialName);
      setSubject(initialSubject || availableSubjects[0] || '');
      setGradeLevel(initialGrade || availableGrades[0] || '');
      setShowValidation(false);
    }
  }, [isOpen, initialName, initialSubject, initialGrade, availableSubjects, availableGrades]);

  if (!isOpen) return null;

  const isNameValid = Boolean(termName.trim());
  const isSubjectValid = Boolean(subject.trim());
  const isGradeValid = Boolean(gradeLevel.trim());
  const isFormValid = isNameValid && isSubjectValid && isGradeValid;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid) {
      setShowValidation(true);
      return;
    }
    onSubmit(termName.trim(), subject.trim(), gradeLevel.trim());
    onClose();
  };

  const hasPrerequisites = availableSubjects.length > 0 && availableGrades.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-md max-h-[90vh] max-h-[90dvh] flex flex-col overflow-hidden text-right my-auto">
        {/* Header */}
        <div className="px-4 py-3 bg-[#B86848] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {mode === 'create' ? (
                <Plus className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Pencil className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                {mode === 'create' ? 'إضافة فصل دراسي جديد' : 'تعديل بيانات الفصل الدراسي'}
              </h3>
              <p className="text-[11px] text-orange-100">
                تخصيص الفصل لمادة وصف دراسي محدد لمنع خلط الدرجات
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {!hasPrerequisites && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                تنبيه: يجب إنشاء كشف درجات شهري واحد على الأقل في صفحة كشف الدرجات أولاً، حتى تظهر المواد والصفوف المتاحة هنا تلقائياً.
              </span>
            </div>
          )}

          {/* 1. اسم الفصل الدراسي */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1">
                <span>اسم الفصل الدراسي:</span>
                <span className="text-red-500 font-extrabold text-sm">*</span>
              </label>
              <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                إجباري
              </span>
            </div>
            <input
              type="text"
              value={termName}
              onChange={(e) => {
                setTermName(e.target.value);
                if (showValidation) setShowValidation(false);
              }}
              placeholder="مثال: الفصل الأول، الفصل الثاني، السعي السنوي..."
              className={`w-full px-3 py-2 bg-white border rounded-xl font-bold text-[#2F2822] text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#B86848] focus:outline-none transition-colors ${
                showValidation && !isNameValid
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                  : 'border-[#D8CEBD]'
              }`}
              autoFocus
            />
            {showValidation && !isNameValid && (
              <p className="text-[10px] text-rose-600 font-bold mt-1">
                ⚠️ يرجى كتابة اسم الفصل الدراسي
              </p>
            )}
          </div>

          {/* 2. اسم المادة (اختيار حصري من الجداول المضافة مسبقاً) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#B86848]" />
                <span>المادة الدراسية (اختيار من المواد المضافة):</span>
                <span className="text-red-500 font-extrabold text-sm">*</span>
              </label>
              <span className="text-[10px] text-[#7A6E61] bg-[#F2ECE0] border border-[#D8CEBD] px-1.5 py-0.2 rounded font-bold">
                من الجداول السابقة
              </span>
            </div>

            {availableSubjects.length > 0 ? (
              <div className="p-2.5 bg-[#F8F4EA] rounded-xl border border-[#D8CEBD] space-y-1.5">
                <span className="text-[10px] text-[#7A6E61] block font-semibold">
                  اختر المادة المراد احتساب معدل درجاتها:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-0.5">
                  {availableSubjects.map((sub) => {
                    const isSelected = subject === sub;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          setSubject(sub);
                          if (showValidation) setShowValidation(false);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                          isSelected
                            ? 'bg-[#B86848] text-white border-[#944D30] ring-2 ring-[#B86848]/30 shadow-xs'
                            : 'bg-white text-[#4A2818] border-[#D8CEBD] hover:bg-[#FAF4EB] hover:border-[#BA916C]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100 rounded-xl text-xs text-slate-500">
                لا توجد مواد مضافة مسبقاً. أنشئ جدولاً شهرياً أولاً لتحديد مادته.
              </div>
            )}
            {showValidation && !isSubjectValid && (
              <p className="text-[10px] text-rose-600 font-bold mt-1">
                ⚠️ يرجى اختيار المادة الدراسية لهذا الفصل
              </p>
            )}
          </div>

          {/* 3. الصف الدراسي (اختيار حصري من الصفوف المضافة مسبقاً) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#2F2822] flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#B86848]" />
                <span>الصف الدراسي (اختيار من الصفوف المضافة):</span>
                <span className="text-red-500 font-extrabold text-sm">*</span>
              </label>
              <span className="text-[10px] text-[#7A6E61] bg-[#F2ECE0] border border-[#D8CEBD] px-1.5 py-0.2 rounded font-bold">
                من الجداول السابقة
              </span>
            </div>

            {availableGrades.length > 0 ? (
              <div className="p-2.5 bg-[#F8F4EA] rounded-xl border border-[#D8CEBD] space-y-1.5">
                <span className="text-[10px] text-[#7A6E61] block font-semibold">
                  اختر الصف الدراسي المخصص لهذا الفصل:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-0.5">
                  {availableGrades.map((g) => {
                    const isSelected = gradeLevel === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setGradeLevel(g);
                          if (showValidation) setShowValidation(false);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                          isSelected
                            ? 'bg-[#557A95] text-white border-[#476A84] ring-2 ring-[#557A95]/30 shadow-xs'
                            : 'bg-white text-[#2C4B60] border-[#D8CEBD] hover:bg-[#EEF4F8] hover:border-[#557A95]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{g}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100 rounded-xl text-xs text-slate-500">
                لا توجد صفوف دراسية مضافة مسبقاً. أنشئ جدولاً شهرياً أولاً لتحديد صفه.
              </div>
            )}
            {showValidation && !isGradeValid && (
              <p className="text-[10px] text-rose-600 font-bold mt-1">
                ⚠️ يرجى اختيار الصف الدراسي لهذا الفصل
              </p>
            )}
          </div>

          <div className="p-2.5 bg-[#EEF5EB] rounded-xl border border-[#C5DDBE] text-[#224A1E] text-[11px] leading-relaxed font-semibold">
            ✓ عند حفظ هذا الفصل، ستظهر فقط الأشهر ونماذج الدرجات الخاصة بـ ({subject || 'المادة'}) لـ ({gradeLevel || 'الصف'}) في صفحة احتساب المعدل، لمنع أي خلط بين الصفوف والمواد.
          </div>

          </div>

          {/* Footer */}
          <div className="p-3 sm:px-4 border-t border-[#E0D5C3] bg-[#FAF7EC] flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-4 py-1.5 bg-[#B86848] hover:bg-[#A05537] border border-[#944D30] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{mode === 'create' ? 'إنشاء الفصل' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
