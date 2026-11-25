import React, { useState, useEffect } from 'react';
import { FinalScoreOperation, FinalScoreOperationType } from '../../types';
import { X, Check, Calculator, Divide, X as MultiplyIcon, Plus, Minus, RotateCcw, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentOperation?: FinalScoreOperation;
  totalMaxScore: number;
  modelName: string;
  gradeLevel?: string;
  subject?: string;
  onSave: (operation: FinalScoreOperation, applyToSameGradeAndSubject: boolean) => void;
}

export const FinalScoreOperationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentOperation,
  totalMaxScore = 100,
  modelName,
  gradeLevel,
  subject,
  onSave,
}) => {
  const [selectedType, setSelectedType] = useState<FinalScoreOperationType>(
    currentOperation?.type || 'none'
  );
  const [value, setValue] = useState<number>(
    currentOperation?.value !== undefined && currentOperation?.value > 0
      ? currentOperation.value
      : 2
  );
  // Default is strictly 'current_only' so other grades, subjects, and months are NEVER affected!
  const [applyScope, setApplyScope] = useState<'current_only' | 'same_grade_subject'>('current_only');
  const [testScore, setTestScore] = useState<string>(
    String(Math.round(totalMaxScore * 0.8))
  );

  useEffect(() => {
    if (isOpen) {
      const type = currentOperation?.type || 'none';
      setSelectedType(type);
      const val =
        currentOperation?.value !== undefined && currentOperation?.value > 0
          ? currentOperation.value
          : type === 'divide'
          ? 2
          : type === 'multiply'
          ? 2
          : type === 'add' || type === 'subtract'
          ? 5
          : 2;
      setValue(val);
      setApplyScope('current_only');
      setTestScore(String(Math.round(totalMaxScore * 0.8)));
    }
  }, [isOpen, currentOperation, totalMaxScore]);

  if (!isOpen) return null;

  // Calculate live preview
  const numTest = parseFloat(testScore) || 0;
  const safeVal = Math.max(0.01, Number(value) || 1);

  let previewResult = numTest;
  let effectiveMax = totalMaxScore;
  let formulaDesc = 'بدون أي عملية حسابية (الدرجة الأصلية)';

  if (selectedType === 'divide') {
    previewResult = Math.round((numTest / safeVal) * 100) / 100;
    effectiveMax = Math.round((totalMaxScore / safeVal) * 100) / 100;
    formulaDesc = `قسمة الدرجة على ${safeVal} (المجموع النهائي يصبح من ${effectiveMax})`;
  } else if (selectedType === 'multiply') {
    previewResult = Math.round((numTest * safeVal) * 100) / 100;
    effectiveMax = Math.round((totalMaxScore * safeVal) * 100) / 100;
    formulaDesc = `ضرب الدرجة في ${safeVal} (المجموع النهائي يصبح من ${effectiveMax})`;
  } else if (selectedType === 'add') {
    previewResult = Math.round((numTest + safeVal) * 100) / 100;
    effectiveMax = Math.round((totalMaxScore + safeVal) * 100) / 100;
    formulaDesc = `إضافة ${safeVal} درجات إلى المحصلة النهائية`;
  } else if (selectedType === 'subtract') {
    previewResult = Math.max(0, Math.round((numTest - safeVal) * 100) / 100);
    effectiveMax = Math.max(1, Math.round((totalMaxScore - safeVal) * 100) / 100);
    formulaDesc = `طرح / خصم ${safeVal} درجات من المحصلة النهائية`;
  }

  const handleApply = () => {
    const finalOp: FinalScoreOperation = {
      type: selectedType,
      value: selectedType === 'none' ? 1 : safeVal,
    };
    onSave(finalOp, applyScope === 'same_grade_subject');
    onClose();
  };

  const handleReset = () => {
    setSelectedType('none');
    setValue(2);
    onSave({ type: 'none', value: 1 }, applyScope === 'same_grade_subject');
    onClose();
  };

  const operationOptions: {
    type: FinalScoreOperationType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    borderActive: string;
    bgActive: string;
    presets: number[];
  }[] = [
    {
      type: 'none',
      title: 'بدون أي عملية (الدرجة الأصلية)',
      description: 'تبقى الدرجة النهائية كما هي من مجموع التحريري والحقول المضافة بدون أي تعديل',
      icon: <RotateCcw className="w-5 h-5 text-slate-500" />,
      color: 'text-slate-700',
      borderActive: 'border-slate-500 ring-2 ring-slate-200',
      bgActive: 'bg-slate-50',
      presets: [],
    },
    {
      type: 'divide',
      title: 'قسمة على عدد (÷)',
      description: 'مثلاً قسمة الدرجة النهائية على 2 (الدرجة من 100 تصبح من 50 تلقائياً)',
      icon: <Divide className="w-5 h-5 text-blue-600" />,
      color: 'text-blue-700',
      borderActive: 'border-blue-500 ring-2 ring-blue-100',
      bgActive: 'bg-blue-50/70',
      presets: [2, 3, 4, 5, 10],
    },
    {
      type: 'multiply',
      title: 'ضرب في عدد (×)',
      description: 'مضاعفة أو تكبير الدرجة (مثلاً ضرب الدرجة في 2 لتحويلها من 50 إلى 100)',
      icon: <MultiplyIcon className="w-5 h-5 text-indigo-600" />,
      color: 'text-indigo-700',
      borderActive: 'border-indigo-500 ring-2 ring-indigo-100',
      bgActive: 'bg-indigo-50/70',
      presets: [2, 1.5, 3, 4, 5],
    },
    {
      type: 'add',
      title: 'جمع / إضافة درجات (+)',
      description: 'إضافة درجات نشاط أو مكافأة أو حضور إلى المحصلة النهائية للطلاب',
      icon: <Plus className="w-5 h-5 text-emerald-600" />,
      color: 'text-emerald-700',
      borderActive: 'border-emerald-500 ring-2 ring-emerald-100',
      bgActive: 'bg-emerald-50/70',
      presets: [1, 2, 5, 10],
    },
    {
      type: 'subtract',
      title: 'طرح / خصم درجات (-)',
      description: 'خصم نقاط معينة من الدرجة النهائية لجميع الطلاب',
      icon: <Minus className="w-5 h-5 text-rose-600" />,
      color: 'text-rose-700',
      borderActive: 'border-rose-500 ring-2 ring-rose-100',
      bgActive: 'bg-rose-50/70',
      presets: [1, 2, 5, 10],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-right dir-rtl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-l from-slate-50 to-blue-50/40 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                العمليات الحسابية على الدرجة النهائية
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-md">
                  {gradeLevel ? `الصف: ${gradeLevel}` : 'الصف الحالي'}
                </span>
                <span className="text-[11px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md">
                  {subject ? `المادة: ${subject}` : 'المادة الحالية'}
                </span>
                <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                  {modelName}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Operations List */}
          <div className="space-y-2.5">
            <label className="block text-xs font-black text-slate-700 mb-1">
              اختر نوع العملية المراد تطبيقها على عنوان الدرجة النهائية:
            </label>

            {operationOptions.map((opt) => {
              const isSelected = selectedType === opt.type;
              return (
                <div
                  key={opt.type}
                  onClick={() => {
                    setSelectedType(opt.type);
                    if (opt.presets.length > 0 && !opt.presets.includes(value)) {
                      setValue(opt.presets[0]);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? `${opt.borderActive} ${opt.bgActive} shadow-xs`
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isSelected ? 'bg-white shadow-2xs border-slate-200' : 'bg-slate-100 border-transparent'
                        }`}
                      >
                        {opt.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${isSelected ? opt.color : 'text-slate-800'}`}>
                            {opt.title}
                          </span>
                          {opt.type === 'none' && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                              الوضع الافتراضي
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Preset chips and number input when selected and not 'none' */}
                  {isSelected && opt.type !== 'none' && (
                    <div
                      className="mt-3.5 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-bold text-slate-700 ml-1">
                        {opt.type === 'divide' ? 'القسمة على:' : opt.type === 'multiply' ? 'الضرب في:' : opt.type === 'add' ? 'إضافة عدد:' : 'خصم عدد:'}
                      </span>

                      {/* Quick Presets */}
                      {opt.presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setValue(preset)}
                          className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            value === preset
                              ? 'bg-blue-600 text-white shadow-xs scale-105'
                              : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}

                      {/* Custom Input */}
                      <div className="flex items-center gap-1.5 mr-auto">
                        <span className="text-[11px] text-slate-500 font-bold">أو رقم مخصص:</span>
                        <input
                          type="number"
                          step={opt.type === 'multiply' ? '0.1' : '1'}
                          min="0.01"
                          max="1000"
                          value={value}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setValue(isNaN(v) ? 1 : v);
                          }}
                          className="w-16 px-2 py-1 text-xs font-black text-center bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Interactive Live Calculation Preview */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>معاينة حيّة للنتيجة (جرّب درجات طلابك):</span>
              </div>
              <span className="text-[11px] text-slate-500 font-bold">
                المجموع الكامل: {totalMaxScore} ➔ المحصلة: {effectiveMax}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <label className="text-[11px] text-slate-500 block mb-1 font-bold">
                  درجة الطالب قبل العملية (من {totalMaxScore}):
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalMaxScore}
                  value={testScore}
                  onChange={(e) => setTestScore(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-black text-sm text-slate-800 text-center focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-200/60 flex flex-col justify-center">
                <span className="text-[11px] text-blue-900 font-bold mb-1">
                  الدرجة النهائية بعد العملية:
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-blue-700">
                    {previewResult}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    من {effectiveMax}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 font-medium">
              💡 {formulaDesc}
            </p>
          </div>

          {/* Application Scope Options */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <span className="block text-xs font-black text-slate-800">
              نطاق تطبيق العملية الحسابية:
            </span>

            {/* Option 1: Current table only (Default) */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                applyScope === 'current_only'
                  ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="final-score-op-scope"
                value="current_only"
                checked={applyScope === 'current_only'}
                onChange={() => setApplyScope('current_only')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <div className="text-right">
                <span className="text-xs font-black text-slate-800 block">
                  تطبيق على هذا الجدول فقط (الافتراضي والموصى به)
                </span>
                <span className="text-[11px] text-slate-600 block mt-0.5">
                  خاص بـ: {gradeLevel ? `الصف ${gradeLevel}` : 'الصف الحالي'} - {subject ? `مادة ${subject}` : 'المادة الحالية'} - {modelName}. لن تتأثر أي صفوف أخرى أو مواد أخرى أو شهور أخرى.
                </span>
              </div>
            </label>

            {/* Option 2: Same subject and grade months only */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                applyScope === 'same_grade_subject'
                  ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="final-score-op-scope"
                value="same_grade_subject"
                checked={applyScope === 'same_grade_subject'}
                onChange={() => setApplyScope('same_grade_subject')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <div className="text-right">
                <span className="text-xs font-black text-slate-800 block">
                  تطبيق على شهور نفس المادة والصف فقط ({subject ? `مادة ${subject}` : 'هذه المادة'} - {gradeLevel ? `صف ${gradeLevel}` : 'هذا الصف'})
                </span>
                <span className="text-[11px] text-slate-600 block mt-0.5">
                  يُطبق حصراً على شهور نفس الصف والمادة ولا يمس أي صفوف دراسية أخرى أو مواد أخرى في الدفتر.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div>
            {currentOperation && currentOperation.type !== 'none' && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                title="إلغاء العملية والعودة للدرجة الأصلية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إلغاء العملية الحسابية</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>حفظ وتطبيق</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
