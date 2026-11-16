import React, { useState } from 'react';
import {
  ChevronLeft,
  Delete,
  X,
  Check,
} from 'lucide-react';
import { StudentRow } from '../../types';

interface GradeNumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: StudentRow | null;
  nextStudent: StudentRow | null;
  prevStudent: StudentRow | null;
  currentIndex: number;
  totalStudents: number;
  columnName: string;
  maxScore: number;
  currentValue: number | null | undefined;
  onValueChange: (newValue: number | null) => void;
  onNext: () => void;
  onPrev: () => void;
  numeralMode: 'EN' | 'AR';
  onNumeralModeChange: (mode: 'EN' | 'AR') => void;
}

export const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export const formatScoreDisplay = (
  val: number | string | null | undefined,
  mode: 'EN' | 'AR' = 'EN'
): string => {
  if (val === null || val === undefined || val === '') return '';
  if (mode === 'AR') {
    return String(val)
      .replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
  }
  return String(val)
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace('،', '.');
};

export const GradeNumericKeypad: React.FC<GradeNumericKeypadProps> = ({
  isOpen,
  onClose,
  currentStudent,
  nextStudent,
  prevStudent,
  currentIndex,
  totalStudents,
  columnName,
  maxScore,
  currentValue,
  onValueChange,
  onNext,
  onPrev,
  numeralMode,
  onNumeralModeChange,
}) => {
  const [inputBuffer, setInputBuffer] = useState<string>(() =>
    currentValue !== null && currentValue !== undefined ? String(currentValue) : ''
  );

  // Sync buffer when active student or column changes
  React.useEffect(() => {
    setInputBuffer(
      currentValue !== null && currentValue !== undefined && !isNaN(Number(currentValue))
        ? String(currentValue)
        : ''
    );
  }, [currentStudent?.id, columnName]);

  if (!isOpen || !currentStudent) return null;

  const displayDigit = (num: number): string => {
    if (numeralMode === 'AR') {
      return ARABIC_DIGITS[num] || String(num);
    }
    return String(num);
  };

  const handleKeyPress = (char: string) => {
    let nextStr = inputBuffer;

    if (char === '.' || char === '،') {
      if (!nextStr.includes('.')) {
        nextStr = nextStr === '' ? '0.' : nextStr + '.';
      }
    } else {
      // Digit pressed
      if (nextStr === '0') {
        nextStr = char;
      } else {
        nextStr += char;
      }
    }

    setInputBuffer(nextStr);
    const num = Number(nextStr);
    if (!isNaN(num)) {
      onValueChange(num);
    }
  };

  const handleBackspace = () => {
    if (inputBuffer.length <= 1) {
      setInputBuffer('');
      onValueChange(null);
    } else {
      const nextStr = inputBuffer.slice(0, -1);
      setInputBuffer(nextStr);
      if (nextStr === '' || nextStr === '.') {
        onValueChange(null);
      } else {
        const num = Number(nextStr);
        onValueChange(isNaN(num) ? null : num);
      }
    }
  };

  const handleClear = () => {
    setInputBuffer('');
    onValueChange(null);
  };

  const formattedDisplayValue = () => {
    const valToShow =
      inputBuffer ||
      (currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
    if (!valToShow) return '—';
    if (numeralMode === 'AR') {
      return valToShow.replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]).replace('.', '،');
    }
    return valToShow;
  };

  const isExceeded =
    currentValue !== null && currentValue !== undefined && Number(currentValue) > maxScore;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7EC] border-t-2 border-[#CBB69F] shadow-2xl animate-in slide-in-from-bottom duration-200 select-none no-print"
      dir="rtl"
    >
      {/* Sleek, ultra-compact single bar above the keys */}
      <div className="px-3 py-1.5 bg-[#F2ECE0] border-b border-[#D8CEBD] flex items-center justify-between text-xs font-bold gap-2 overflow-x-auto">
        {/* Current Student Name with distinctive background color confirming this student is receiving the grade */}
        <div className="flex items-center gap-1.5 shrink-0 bg-gradient-to-l from-[#BA916C] via-[#AF845D] to-[#9E744E] text-white px-3 py-1.5 rounded-xl shadow-xs border border-[#8C6544]/60">
          <span className="w-2 h-2 rounded-full bg-amber-200 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-black whitespace-nowrap text-white">
            {currentStudent.name}
          </span>
          {currentStudent.section && (
            <span className="text-[11px] font-black bg-black/25 text-amber-100 px-1.5 py-0.2 rounded-md shrink-0">
              ({currentStudent.section})
            </span>
          )}
        </div>

        {/* Next Student confirmation button without the word 'التالي' + Close */}
        <div className="flex items-center gap-2 shrink-0">
          {nextStudent ? (
            <button
              type="button"
              onClick={onNext}
              className="flex items-center gap-1.5 text-[#1C452C] bg-[#D7EBDC] hover:bg-[#C2E3CB] active:scale-95 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs border border-[#A8D5B2] group"
              title={`انتقال إلى: ${nextStudent.name}`}
            >
              <span className="text-xs font-black text-[#1C452C] whitespace-nowrap">
                {nextStudent.name}
              </span>
              {nextStudent.section && (
                <span className="text-[10px] bg-white/80 text-[#1C452C] px-1 py-0.2 rounded font-bold">
                  ({nextStudent.section})
                </span>
              )}
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#BFE0C8] text-[#1C452C] group-hover:bg-[#A8D5B2] transition-colors shrink-0">
                <ChevronLeft className="w-3.5 h-3.5 stroke-[3] group-hover:-translate-x-0.5 transition-transform" />
              </div>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-semibold px-2 py-1 bg-slate-100 rounded-lg">
              (نهاية القائمة)
            </span>
          )}

          {/* Close Keypad */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#7A6A58] hover:text-[#2F2822] hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
            title="إغلاق لوحة الأرقام"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. The Custom Keypad Grid - Pixel-perfect match to the user's uploaded mockup */}
      <div className="p-2 sm:p-3 max-w-lg mx-auto space-y-2">
        {/* Top Row: [EN] [9] [،] [.] [0] [AR] */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {/* EN Button */}
          <button
            type="button"
            onClick={() => onNumeralModeChange('EN')}
            className={`h-11 sm:h-12 rounded-xl border-2 transition-all flex items-center justify-center font-black text-sm sm:text-base cursor-pointer shadow-md active:translate-y-0.5 ${
              numeralMode === 'EN'
                ? 'border-[#7E6649] bg-gradient-to-b from-[#ECDDC6] to-[#C9B390] text-[#1E1E1E] ring-2 ring-[#BA916C]/60 scale-[1.02]'
                : 'border-[#A89885] bg-gradient-to-b from-[#E2D4BF] to-[#BFA989] text-[#4A3828] hover:brightness-105'
            }`}
            title="تبديل إلى الأرقام الإنجليزية (1 2 3)"
          >
            EN
          </button>

          {/* 9 Button */}
          <button
            type="button"
            onClick={() => handleKeyPress('9')}
            className="h-11 sm:h-12 rounded-xl bg-gradient-to-b from-[#FFA726] via-[#FB8C00] to-[#E65100] border border-[#BF360C] text-white text-xl sm:text-2xl font-black flex items-center justify-center cursor-pointer shadow-[0_3px_0_#9E2D00,0_4px_6px_rgba(0,0,0,0.15)] active:translate-y-0.5 active:shadow-[0_1px_0_#9E2D00] transition-transform"
          >
            {displayDigit(9)}
          </button>

          {/* Arabic Comma Button (،) */}
          <button
            type="button"
            onClick={() => handleKeyPress('،')}
            className="h-11 sm:h-12 rounded-xl bg-gradient-to-b from-[#FFA726] via-[#FB8C00] to-[#E65100] border border-[#BF360C] text-white text-xl sm:text-2xl font-black flex items-center justify-center cursor-pointer shadow-[0_3px_0_#9E2D00,0_4px_6px_rgba(0,0,0,0.15)] active:translate-y-0.5 active:shadow-[0_1px_0_#9E2D00] transition-transform"
          >
            ،
          </button>

          {/* Decimal Dot Button (.) */}
          <button
            type="button"
            onClick={() => handleKeyPress('.')}
            className="h-11 sm:h-12 rounded-xl bg-gradient-to-b from-[#FFA726] via-[#FB8C00] to-[#E65100] border border-[#BF360C] text-white text-2xl sm:text-3xl font-black flex items-center justify-center cursor-pointer shadow-[0_3px_0_#9E2D00,0_4px_6px_rgba(0,0,0,0.15)] active:translate-y-0.5 active:shadow-[0_1px_0_#9E2D00] transition-transform"
          >
            .
          </button>

          {/* 0 Button */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-11 sm:h-12 rounded-xl bg-gradient-to-b from-[#FFA726] via-[#FB8C00] to-[#E65100] border border-[#BF360C] text-white text-xl sm:text-2xl font-black flex items-center justify-center cursor-pointer shadow-[0_3px_0_#9E2D00,0_4px_6px_rgba(0,0,0,0.15)] active:translate-y-0.5 active:shadow-[0_1px_0_#9E2D00] transition-transform"
          >
            {displayDigit(0)}
          </button>

          {/* AR Button */}
          <button
            type="button"
            onClick={() => onNumeralModeChange('AR')}
            className={`h-11 sm:h-12 rounded-xl border-2 transition-all flex items-center justify-center font-black text-sm sm:text-base cursor-pointer shadow-md active:translate-y-0.5 ${
              numeralMode === 'AR'
                ? 'border-[#7E6649] bg-gradient-to-b from-[#ECDDC6] to-[#C9B390] text-[#1E1E1E] ring-2 ring-[#BA916C]/60 scale-[1.02]'
                : 'border-[#A89885] bg-gradient-to-b from-[#E2D4BF] to-[#BFA989] text-[#4A3828] hover:brightness-105'
            }`}
            title="تبديل إلى الأرقام العربية (١ ٢ ٣)"
          >
            AR
          </button>
        </div>

        {/* Bottom Row: [8] [7] [6] [5] [4] [3] [2] [1] in 8 columns matching the image */}
        <div className="grid grid-cols-8 gap-1 sm:gap-1.5">
          {[8, 7, 6, 5, 4, 3, 2, 1].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(String(digit))}
              className="h-11 sm:h-12 rounded-xl bg-gradient-to-b from-[#FFA726] via-[#FB8C00] to-[#E65100] border border-[#BF360C] text-white text-xl sm:text-2xl font-black flex items-center justify-center cursor-pointer shadow-[0_3px_0_#9E2D00,0_4px_6px_rgba(0,0,0,0.15)] active:translate-y-0.5 active:shadow-[0_1px_0_#9E2D00] transition-transform"
            >
              {displayDigit(digit)}
            </button>
          ))}
        </div>

        {/* Auxiliary Controls: Backspace button & Quick Jump */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <button
            type="button"
            onClick={handleBackspace}
            className="flex-1 py-1.5 bg-[#FAF2EB] hover:bg-[#F2E5D5] active:scale-98 text-[#7C482A] border border-[#D8BEB0] rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="مسح آخر خانة مدخلة"
          >
            <Delete className="w-4 h-4 text-[#BA916C]" />
            <span>مسح رقم ⌫</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            className="flex-1 py-1.5 bg-[#BA916C] hover:bg-[#A87E5A] active:scale-98 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="حفظ والانتقال للطالب التالي"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد والانتقال للتالي</span>
          </button>
        </div>
      </div>
    </div>
  );
};
