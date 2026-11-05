import React, { useState, useEffect } from 'react';
import { RoundingMode } from '../../types';
import { X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentMode: RoundingMode;
  currentThreshold?: number;
  modelName: string;
  gradeLevel?: string;
  subject?: string;
  onSave: (mode: RoundingMode, threshold: number, applyToSameGradeAndSubject: boolean) => void;
  applyToAllLabel?: string;
}

export const ScoreRoundingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentMode = 'none',
  currentThreshold = 0.5,
  modelName,
  gradeLevel,
  subject,
  onSave,
  applyToAllLabel,
}) => {
  const [mode, setMode] = useState<RoundingMode>(currentMode);
  const [threshold, setThreshold] = useState<number>(currentThreshold || 0.5);
  // Default is strictly 'current_only' so other grades and subjects are NEVER modified!
  const [applyScope, setApplyScope] = useState<'current_only' | 'same_grade_subject'>('current_only');
  const [testScore, setTestScore] = useState<string>('7.8');

  useEffect(() => {
    if (isOpen) {
      setMode(currentMode);
      setThreshold(currentThreshold || 0.5);
      setApplyScope('current_only');
      setTestScore('7.8');
    }
  }, [isOpen, currentMode, currentThreshold]);

  if (!isOpen) return null;

  // Preview calculation based on selected mode & threshold
  const calculatePreview = (scoreStr: string): { original: number; rounded: number } => {
    const val = parseFloat(scoreStr);
    if (isNaN(val)) return { original: 0, rounded: 0 };
    if (mode === 'none') return { original: val, rounded: Math.round(val * 100) / 100 };

    const intPart = Math.floor(val);
    const frac = Math.round((val - intPart) * 1000) / 1000;
    if (frac === 0) return { original: val, rounded: intPart };

    let effectiveThresh = 0.5;
    if (mode === 'half_up') effectiveThresh = 0.5;
    else if (mode === 'any_fraction') effectiveThresh = 0.1;
    else if (mode === 'custom_threshold') effectiveThresh = threshold;

    return {
      original: val,
      rounded: frac >= effectiveThresh ? intPart + 1 : intPart,
    };
  };

  const preview = calculatePreview(testScore);

  const handleSave = () => {
    onSave(mode, threshold, applyScope === 'same_grade_subject');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-right dir-rtl">
        {/* Header matching image structure */}
        <div className="px-6 py-4.5 bg-white border-b border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-right">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">التحكم بالنسب وجبر الكسور</h3>
            <div className="flex flex-wrap items-center justify-end gap-1.5 mt-1">
              <span className="text-[11px] font-bold text-[#2B608A] bg-[#EEF4F8] px-2 py-0.5 rounded-md">
                {gradeLevel ? `الصف: ${gradeLevel}` : 'الصف الحالي'}
              </span>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                {subject ? `المادة: ${subject}` : 'المادة الحالية'}
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                {modelName}
              </span>
            </div>
          </div>
        </div>

        {/* Content matching the cards in the user image */}
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          {/* Card 1: بدون تقريب */}
          <div
            onClick={() => setMode('none')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              mode === 'none'
                ? 'bg-[#F2F7FA] border-2 border-[#557A95] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Badges on left */}
              <div className="flex flex-col gap-2 items-start">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
                  <span className="font-black text-base sm:text-lg text-[#2B608A]">7.2</span>
                  <span className="text-base sm:text-lg font-black text-slate-400 select-none">➡️</span>
                  <span className="font-bold text-sm sm:text-base text-slate-600">7.2</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
                  <span className="font-black text-base sm:text-lg text-[#2B608A]">8.5</span>
                  <span className="text-base sm:text-lg font-black text-slate-400 select-none">➡️</span>
                  <span className="font-bold text-sm sm:text-base text-slate-600">8.5</span>
                </div>
              </div>

              {/* Title & Radio button on right */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm sm:text-base text-slate-800">بدون تقريب</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    mode === 'none' ? 'border-[#557A95] bg-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {mode === 'none' && <div className="w-2.5 h-2.5 rounded-full bg-[#557A95]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: من النصف */}
          <div
            onClick={() => setMode('half_up')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              mode === 'half_up'
                ? 'bg-[#F2F7FA] border-2 border-[#557A95] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Badges on left */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
                  <span className="font-black text-base sm:text-lg text-[#2B608A]">7</span>
                  <span className="text-base sm:text-lg font-black text-slate-400 select-none">➡️</span>
                  <span className="font-bold text-sm sm:text-base text-slate-600">7.2</span>
                </div>
                <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
                  <span className="font-black text-base sm:text-lg text-[#2B608A]">8</span>
                  <span className="text-base sm:text-lg font-black text-slate-400 select-none">➡️</span>
                  <span className="font-bold text-sm sm:text-base text-slate-600">7.8</span>
                </div>
              </div>

              {/* Title & Radio button on right */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm sm:text-base text-slate-800">من النصف</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    mode === 'half_up' ? 'border-[#557A95] bg-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {mode === 'half_up' && <div className="w-2.5 h-2.5 rounded-full bg-[#557A95]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: أي كسر يقرّب للأعلى */}
          <div
            onClick={() => setMode('any_fraction')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              mode === 'any_fraction'
                ? 'bg-[#F2F7FA] border-2 border-[#557A95] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Badges on left */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
                  <span className="font-black text-base sm:text-lg text-[#2B608A]">9</span>
                  <span className="text-base sm:text-lg font-black text-slate-400 select-none">➡️</span>
                  <span className="font-bold text-sm sm:text-base text-slate-600">8.2</span>
                </div>
                <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
                  <span className="font-black text-base sm:text-lg text-[#2B608A]">8</span>
                  <span className="text-base sm:text-lg font-black text-slate-400 select-none">➡️</span>
                  <span className="font-bold text-sm sm:text-base text-slate-600">7.1</span>
                </div>
              </div>

              {/* Title & Radio button on right */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm sm:text-base text-slate-800">أي كسر يقرّب للأعلى</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    mode === 'any_fraction' ? 'border-[#557A95] bg-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {mode === 'any_fraction' && <div className="w-2.5 h-2.5 rounded-full bg-[#557A95]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: مخصص */}
          <div
            onClick={() => setMode('custom_threshold')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              mode === 'custom_threshold'
                ? 'bg-[#F2F7FA] border-2 border-[#557A95] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Threshold controls or subtitle on left */}
              {mode === 'custom_threshold' ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs sm:text-sm text-slate-600 font-bold">يجبر إذا ≥</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="0.95"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value) || 0.5)}
                    className="w-18 px-2.5 py-1.5 text-center font-black text-[#2B608A] text-sm sm:text-base bg-white border border-[#B8D1E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#557A95]"
                  />
                </div>
              ) : (
                <span className="text-xs sm:text-sm text-slate-400 font-medium">تحديد حد جبر مخصص</span>
              )}

              {/* Title & Radio button on right */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm sm:text-base text-slate-800">مخصص</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    mode === 'custom_threshold' ? 'border-[#557A95] bg-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {mode === 'custom_threshold' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#557A95]" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Card: "جرّب" tester */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
            {/* Live Result & Arrow on left */}
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-black text-[#2B608A] tracking-tight min-w-[40px]">
                {preview.rounded}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-slate-400 select-none">
                ➡️
              </span>
            </div>

            {/* Input & "جرّب" label on right */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <input
                type="number"
                step="0.1"
                value={testScore}
                onChange={(e) => setTestScore(e.target.value)}
                className="w-24 px-3 py-2 text-center font-black text-lg sm:text-xl bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#557A95] text-slate-800 shadow-2xs"
              />
              <span className="font-black text-base text-slate-800 select-none">جرّب</span>
            </div>
          </div>

          {/* Application Scope Options */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="block text-xs font-black text-slate-800">
              نطاق تطبيق قاعدة جبر الكسور:
            </span>

            {/* Option 1: Current table only (Default) */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                applyScope === 'current_only'
                  ? 'bg-blue-50/80 border-[#557A95] ring-1 ring-blue-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="rounding-scope"
                value="current_only"
                checked={applyScope === 'current_only'}
                onChange={() => setApplyScope('current_only')}
                className="mt-0.5 text-[#557A95] focus:ring-[#557A95] w-4 h-4 cursor-pointer"
              />
              <div className="text-right">
                <span className="text-xs font-black text-slate-800 block">
                  تطبيق على هذا الجدول فقط (الافتراضي والموصى به)
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  خاص بـ: {gradeLevel ? `الصف ${gradeLevel}` : 'الصف الحالي'} - {subject ? `مادة ${subject}` : 'المادة الحالية'} - {modelName}. لن تتأثر أي صفوف أخرى أو مواد أخرى أو شهور أخرى.
                </span>
              </div>
            </label>

            {/* Option 2: Same subject and grade months only */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                applyScope === 'same_grade_subject'
                  ? 'bg-blue-50/80 border-[#557A95] ring-1 ring-blue-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="rounding-scope"
                value="same_grade_subject"
                checked={applyScope === 'same_grade_subject'}
                onChange={() => setApplyScope('same_grade_subject')}
                className="mt-0.5 text-[#557A95] focus:ring-[#557A95] w-4 h-4 cursor-pointer"
              />
              <div className="text-right">
                <span className="text-xs font-black text-slate-800 block">
                  تطبيق على شهور نفس المادة والصف فقط ({subject ? `مادة ${subject}` : 'هذه المادة'} - {gradeLevel ? `صف ${gradeLevel}` : 'هذا الصف'})
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  يُطبق حصراً على شهور نفس الصف والمادة ولا يمس أي صفوف دراسية أخرى أو مواد أخرى في الدفتر.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#557A95] hover:bg-[#476A84] text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-98"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>حفظ وتطبيق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
