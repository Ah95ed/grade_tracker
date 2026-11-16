import React, { useState, useEffect } from 'react';
import { MonthlyModel, ColumnLabels, CustomColumn } from '../../types';
import { X, Check, RotateCcw, PenLine, Tag } from 'lucide-react';

interface RenameColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: MonthlyModel;
  onSave: (newLabels: ColumnLabels, updatedCustomColumns: CustomColumn[]) => void;
}

export const DEFAULT_COLUMN_TITLES: Required<ColumnLabels> = {
  studentName: 'اسم الطالب',
  gradeLevel: 'الصف',
  section: 'الشعبة',
  writtenExam: 'درجة التحريري بالورقة من',
  finalScore: 'الدرجة النهائية من',
  rating: 'التقدير',
};

export const RenameColumnsModal: React.FC<RenameColumnsModalProps> = ({
  isOpen,
  onClose,
  model,
  onSave,
}) => {
  const [labels, setLabels] = useState<ColumnLabels>({});
  const [customCols, setCustomCols] = useState<CustomColumn[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLabels({
        studentName: model.columnLabels?.studentName || '',
        gradeLevel: model.columnLabels?.gradeLevel || '',
        section: model.columnLabels?.section || '',
        writtenExam: model.columnLabels?.writtenExam || '',
        finalScore: model.columnLabels?.finalScore || '',
        rating: model.columnLabels?.rating || '',
      });
      setCustomCols(
        (model.customColumns || []).map((c) => ({ ...c }))
      );
    }
  }, [isOpen, model]);

  if (!isOpen) return null;

  const handleCustomColRename = (id: string, newName: string) => {
    setCustomCols((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
  };

  const handleResetToDefault = () => {
    setLabels({
      studentName: DEFAULT_COLUMN_TITLES.studentName,
      gradeLevel: DEFAULT_COLUMN_TITLES.gradeLevel,
      section: DEFAULT_COLUMN_TITLES.section,
      writtenExam: DEFAULT_COLUMN_TITLES.writtenExam,
      finalScore: DEFAULT_COLUMN_TITLES.finalScore,
      rating: DEFAULT_COLUMN_TITLES.rating,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedLabels: ColumnLabels = {
      studentName: labels.studentName?.trim() || DEFAULT_COLUMN_TITLES.studentName,
      gradeLevel: labels.gradeLevel?.trim() || DEFAULT_COLUMN_TITLES.gradeLevel,
      section: labels.section?.trim() || DEFAULT_COLUMN_TITLES.section,
      writtenExam: labels.writtenExam?.trim() || DEFAULT_COLUMN_TITLES.writtenExam,
      finalScore: labels.finalScore?.trim() || DEFAULT_COLUMN_TITLES.finalScore,
      rating: labels.rating?.trim() || DEFAULT_COLUMN_TITLES.rating,
    };
    onSave(cleanedLabels, customCols);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-l from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <PenLine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إعادة تسمية عناوين أعمدة الجدول</h3>
              <p className="text-xs text-blue-100">
                تخصيص أسماء الأعمدة في الكشف والطباعة والتصدير
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-right">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
            💡 يمكنك كتابة الاسم المفضل لكل عمود كما ترغب أن يظهر في الجدول وفي الطباعة وفي تصدير الملفات.
          </div>

          <div className="space-y-3.5">
            {/* Student Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                عنوان عمود اسم الطالب:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={labels.studentName ?? ''}
                  placeholder={DEFAULT_COLUMN_TITLES.studentName}
                  onChange={(e) => setLabels({ ...labels, studentName: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Grade & Section */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان عمود الصف:
                </label>
                <input
                  type="text"
                  value={labels.gradeLevel ?? ''}
                  placeholder={DEFAULT_COLUMN_TITLES.gradeLevel}
                  onChange={(e) => setLabels({ ...labels, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان عمود الشعبة:
                </label>
                <input
                  type="text"
                  value={labels.section ?? ''}
                  placeholder={DEFAULT_COLUMN_TITLES.section}
                  onChange={(e) => setLabels({ ...labels, section: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Written Exam Header */}
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>عنوان عمود الامتحان التحريري:</span>
                <span className="text-[10px] text-amber-800 font-normal">الافتراضي: درجة التحريري بالورقة من</span>
              </label>
              <input
                type="text"
                value={labels.writtenExam ?? ''}
                placeholder={DEFAULT_COLUMN_TITLES.writtenExam}
                onChange={(e) => setLabels({ ...labels, writtenExam: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-amber-300 rounded-xl focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                يتبعه في الجدول مربع إدخال الدرجة العظمى لورقة التحريري (مثال: {model.writtenMaxScore}).
              </p>
            </div>

            {/* Custom Columns (if any) */}
            {customCols.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>عناوين الأعمدة الإضافية المخصصة:</span>
                </div>
                {customCols.map((col) => (
                  <div key={col.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 min-w-[70px]">
                      (درجة: {col.maxScore}):
                    </span>
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) => handleCustomColRename(col.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                      placeholder="اسم العمود"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Final Score & Rating */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان عمود الدرجة النهائية:
                </label>
                <input
                  type="text"
                  value={labels.finalScore ?? ''}
                  placeholder={DEFAULT_COLUMN_TITLES.finalScore}
                  onChange={(e) => setLabels({ ...labels, finalScore: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان عمود التقدير:
                </label>
                <input
                  type="text"
                  value={labels.rating ?? ''}
                  placeholder={DEFAULT_COLUMN_TITLES.rating}
                  onChange={(e) => setLabels({ ...labels, rating: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>استعادة العناوين الافتراضية</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التسميات</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
