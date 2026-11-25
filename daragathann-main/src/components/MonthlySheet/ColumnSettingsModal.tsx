import React, { useState, useEffect } from 'react';
import { CustomColumn, MonthlyModel, RoundingMode, WrittenScoreMode } from '../../types';
import { X, Plus, Trash2, Sliders, CheckCircle2, AlertCircle, Calculator } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  model: MonthlyModel;
  onSave: (updated: Partial<MonthlyModel>) => void;
}

export const ColumnSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  model,
  onSave,
}) => {
  const [writtenWeight, setWrittenWeight] = useState<number | null>(model.writtenWeight ?? null);
  const [writtenMaxScore, setWrittenMaxScore] = useState<number>(model.writtenMaxScore);
  const [writtenScoreMode, setWrittenScoreMode] = useState<WrittenScoreMode>(
    model.writtenScoreMode || 'raw'
  );
  const [totalMaxScore, setTotalMaxScore] = useState<number>(model.totalMaxScore);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>(
    model.customColumns ? [...model.customColumns] : []
  );
  const [roundingMode, setRoundingMode] = useState<RoundingMode>(model.roundingMode || 'none');
  const [roundingThreshold, setRoundingThreshold] = useState<number>(model.roundingThreshold || 0.5);

  const [newColName, setNewColName] = useState('');
  const [newColMaxScore, setNewColMaxScore] = useState<number>(20);

  useEffect(() => {
    if (isOpen) {
      setWrittenWeight(model.writtenWeight ?? null);
      setWrittenMaxScore(model.writtenMaxScore);
      setWrittenScoreMode(model.writtenScoreMode || 'raw');
      setTotalMaxScore(model.totalMaxScore);
      setCustomColumns(model.customColumns ? [...model.customColumns] : []);
      setRoundingMode(model.roundingMode || 'none');
      setRoundingThreshold(model.roundingThreshold || 0.5);
      setNewColName('');
      setNewColMaxScore(20);
    }
  }, [isOpen, model]);

  if (!isOpen) return null;

  // Quick preset columns for easy selection
  const presets = [
    { name: 'درجة الشفهي', max: 20 },
    { name: 'السلوك والمواظبة', max: 10 },
    { name: 'الواجبات اليومية', max: 10 },
    { name: 'المشاركة الصفية', max: 10 },
    { name: 'النشاط العملي', max: 15 },
  ];

  const handleAddColumn = (nameToAdd?: string, maxToAdd?: number) => {
    const name = (nameToAdd || newColName).trim();
    const max = maxToAdd !== undefined ? maxToAdd : newColMaxScore;
    if (!name) return;

    const newCol: CustomColumn = {
      id: 'col-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name,
      maxScore: Number(max) || 10,
    };
    setCustomColumns([...customColumns, newCol]);

    if (!nameToAdd) {
      setNewColName('');
      setNewColMaxScore(10);
    }
  };

  const handleRemoveColumn = (id: string) => {
    setCustomColumns(customColumns.filter((col) => col.id !== id));
  };

  const handleUpdateColumn = (id: string, updates: Partial<CustomColumn>) => {
    setCustomColumns(
      customColumns.map((col) => (col.id === id ? { ...col, ...updates } : col))
    );
  };

  // Calculate sum of custom columns (excluding attendance) + written weight to verify against total
  const customSum = customColumns
    .filter((col) => !col.isAttendance)
    .reduce((sum, col) => sum + Number(col.maxScore || 0), 0);
  const effectiveWeight = writtenWeight === null ? 100 : Number(writtenWeight);
  const totalAllocated = effectiveWeight + customSum;
  const isMatching = totalAllocated === Number(totalMaxScore);

  const handleSave = () => {
    onSave({
      writtenWeight: writtenWeight,
      writtenMaxScore: Number(writtenMaxScore) || 100,
      writtenScoreMode,
      totalMaxScore: Number(totalMaxScore) || 100,
      customColumns,
      roundingMode,
      roundingThreshold,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-l from-indigo-700 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">تخصيص أعمدة الجدول والدرجات</h3>
              <p className="text-xs text-indigo-200">
                التحكم في نسبة التحريري وإضافة حقول الشفهي والسلوك والأنشطة ({model.name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Total Model Max Score */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800">
                الدرجة النهائية الكاملة لهذا النموذج
              </label>
              <p className="text-xs text-slate-500">
                الحد الأقصى لمجموع درجات الشهر (عادة 100 أو 10 درجات)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="1000"
                value={totalMaxScore}
                onChange={(e) => setTotalMaxScore(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-center font-bold text-indigo-900 text-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-sm font-semibold text-slate-600">درجة</span>
            </div>
          </div>

          {/* Section 2: Written Exam Settings (Special requirement) */}
          <div className="bg-white p-4 rounded-xl border-2 border-indigo-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-100 text-indigo-800">
                  عمود أساسي
                </span>
                <h4 className="font-bold text-slate-900">إعدادات الامتحان التحريري</h4>
              </div>
              <span className="text-xs text-slate-500">يحسب تلقائياً حسب النسبة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نسبة التحريري من الدرجة النهائية
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="100"
                    value={writtenWeight === null ? '' : writtenWeight}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setWrittenWeight(val === '' ? null : Number(val));
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-indigo-600 font-bold select-none text-base">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  إذا أخذ الطالب 100/100 فسيحصل في حقل التحريري على {writtenWeight ?? 100}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الدرجة العظمى لورقة الامتحان التحريري (الدرجة الخام)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={writtenMaxScore}
                    onChange={(e) => {
                      const newScore = Number(e.target.value);
                      setWrittenMaxScore(newScore);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  الدرجة المكتوبة على ورقة الامتحان التي يسجلها المعلم (مثلاً من 100)
                </p>

                <div className="mt-3 pt-3 border-t border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    طريقة احتساب درجة التحريري:
                  </label>
                  <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                      <input
                        type="radio"
                        name="modal-written-score-mode"
                        value="raw"
                        checked={writtenScoreMode === 'raw'}
                        onChange={() => setWrittenScoreMode('raw')}
                        className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer accent-indigo-600"
                      />
                      <span>الدرجة كما في ورقة الطالب (توضع كما هي بدون حساب نسبة)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                      <input
                        type="radio"
                        name="modal-written-score-mode"
                        value="relative"
                        checked={writtenScoreMode === 'relative'}
                        onChange={() => setWrittenScoreMode('relative')}
                        className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer accent-indigo-600"
                      />
                      <span>الدرجة النسبية للطالب (تُحسب كنسبة حسب الوزن المتبقي)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Custom Columns (Oral, Behavior, etc.) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  الحقول الإضافية (درجة الشفهي، السلوك، الأنشطة)
                </h4>
                <p className="text-xs text-slate-500">
                  مرونة كاملة لإضافة أي عدد من الأعمدة وتحديد الدرجة الكاملة لكل حقل
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-500 font-bold">حقول مقترحة وشائعة:</span>
              {presets.map((preset, idx) => {
                const isSelected = newColName.trim() === preset.name.trim();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNewColName(preset.name);
                      setNewColMaxScore(preset.max);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border-slate-200'
                    }`}
                    title={`اختيار اسم (${preset.name}) وتعديل درجته بالأسفل`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>

            {/* List of current custom columns */}
            <div className="space-y-2 mt-2">
              {customColumns.length === 0 ? (
                <div className="p-4 text-center rounded-xl border border-dashed border-slate-300 text-slate-400 text-sm">
                  لا توجد حقول إضافية حالياً. يمكنك إضافة درجة الشفهي أو السلوك بالأسفل.
                </div>
              ) : (
                customColumns.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) =>
                          handleUpdateColumn(col.id, { name: e.target.value })
                        }
                        placeholder="اسم الحقل (مثلاً: درجة الشفهي)"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    {col.isAttendance ? (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                        حقل حضور وغياب {col.attendanceConfig?.affectsGrade ? '(يؤثر على الدرجات)' : '(للتوثيق فقط)'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">الدرجة الكاملة:</span>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={col.maxScore}
                          onChange={(e) =>
                            handleUpdateColumn(col.id, {
                              maxScore: Number(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(col.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="حذف هذا العمود"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new column input row */}
            <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200/60 flex flex-col sm:flex-row items-center gap-3 mt-3">
              <input
                type="text"
                placeholder="اسم الحقل الجديد (مثال: درجة الشفهي أو الواجبات)"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                className="flex-1 w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-600 whitespace-nowrap">الدرجة الكاملة:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newColMaxScore}
                  onChange={(e) => setNewColMaxScore(Number(e.target.value))}
                  className="w-20 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddColumn()}
                  disabled={!newColName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  إضافة الحقل
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Rounding Rules for Final Scores */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-700" />
                <h4 className="font-bold text-slate-900 text-sm">
                  قواعد جبر وتقريب الكسور العشرية (الدرجة النهائية)
                </h4>
              </div>
              <span className="text-xs text-amber-800 font-semibold">تطبق على جميع الطلاب</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Option 1: None */}
              <button
                type="button"
                onClick={() => setRoundingMode('none')}
                className={`p-2.5 rounded-xl border text-right transition-all ${
                  roundingMode === 'none'
                    ? 'bg-white border-amber-400 ring-2 ring-amber-400 text-amber-950 font-bold'
                    : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <div className="text-xs font-bold">بدون جبر (أرقام عشرية)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">مثل 7.2 أو 8.2 كما هي</div>
              </button>

              {/* Option 2: Half up */}
              <button
                type="button"
                onClick={() => setRoundingMode('half_up')}
                className={`p-2.5 rounded-xl border text-right transition-all ${
                  roundingMode === 'half_up'
                    ? 'bg-white border-amber-400 ring-2 ring-amber-400 text-amber-950 font-bold'
                    : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <div className="text-xs font-bold">جبر من النصف (≥ 0.5)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">7.5 تصبح 8، و 7.2 تصبح 7</div>
              </button>

              {/* Option 3: Any fraction */}
              <button
                type="button"
                onClick={() => setRoundingMode('any_fraction')}
                className={`p-2.5 rounded-xl border text-right transition-all ${
                  roundingMode === 'any_fraction'
                    ? 'bg-white border-amber-400 ring-2 ring-amber-400 text-amber-950 font-bold'
                    : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <div className="text-xs font-bold">جبر أي كسر (≥ 0.1)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">7.1 تصبح 8، و 8.2 تصبح 9</div>
              </button>
            </div>

            {/* Custom threshold input if needed */}
            <div className="flex items-center justify-between text-xs pt-1 text-slate-600">
              <span>أو حد مخصص للجبر بعد الفارزة:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="0.95"
                  value={roundingThreshold}
                  onChange={(e) => {
                    setRoundingThreshold(parseFloat(e.target.value) || 0.5);
                    setRoundingMode('custom_threshold');
                  }}
                  className="w-16 px-1.5 py-1 text-center font-bold text-xs bg-white border border-amber-300 rounded focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 font-semibold">(مثلاً 0.25 أو 0.5)</span>
              </div>
            </div>
          </div>

          {/* Score distribution verification banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isMatching
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {isMatching ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold text-sm">
                توزيع الدرجات: تحريري ({writtenWeight}) + الحقول الإضافية ({customSum}) = {totalAllocated} درجة
              </div>
              {isMatching ? (
                <p className="text-emerald-700">
                  توزيع الدرجات مطابق تماماً للدرجة النهائية الكاملة ({totalMaxScore} درجة).
                </p>
              ) : (
                <p className="text-amber-800">
                  تنبيه: مجموع درجات الحقول ({totalAllocated}) يختلف عن الدرجة النهائية المحددة ({totalMaxScore}). يمكنك المتابعة أو تعديل النسب.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-xl font-semibold text-sm transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-colors"
          >
            حفظ وتطبيق على الجدول
          </button>
        </div>
      </div>
    </div>
  );
};
