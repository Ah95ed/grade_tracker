import React, { useEffect, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  X,
  Delete,
  RotateCcw,
  Check,
  Award,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export interface BottomScoreKeypadProps {
  isOpen: boolean;
  studentName: string;
  studentSection?: string;
  columnName: string;
  maxScore: number;
  currentValue: string;
  onValueChange: (newValue: string) => void;
  onNextStudent?: () => void;
  onPrevStudent?: () => void;
  hasNextStudent?: boolean;
  hasPrevStudent?: boolean;
  onClose: () => void;
}

export const BottomScoreKeypad: React.FC<BottomScoreKeypadProps> = ({
  isOpen,
  studentName,
  studentSection,
  columnName,
  maxScore,
  currentValue,
  onValueChange,
  onNextStudent,
  onPrevStudent,
  hasNextStudent = false,
  hasPrevStudent = false,
  onClose,
}) => {
  // Handle digit or decimal button press
  const handleKeyPress = useCallback(
    (key: string) => {
      let next = currentValue;

      if (key === '.' || key === '،') {
        // If already has decimal dot or comma, don't add another
        if (next.includes('.') || next.includes('،')) {
          return;
        }
        if (next === '') {
          next = '0' + key;
        } else {
          next = next + key;
        }
      } else if (/^[0-9]$/.test(key)) {
        if (next === '0') {
          next = key;
        } else {
          next = next + key;
        }
      }

      // Validate numeric value does not grossly exceed maxScore (allow typing decimals)
      const numVal = Number(next.replace('،', '.'));
      if (!isNaN(numVal) && maxScore > 0 && numVal > maxScore && !next.endsWith('.') && !next.endsWith('،')) {
        // If typing exceeds maxScore, cap at maxScore
        next = String(maxScore);
      }

      onValueChange(next);
    },
    [currentValue, maxScore, onValueChange]
  );

  // Handle backspace
  const handleBackspace = useCallback(() => {
    if (currentValue.length > 0) {
      onValueChange(currentValue.slice(0, -1));
    }
  }, [currentValue, onValueChange]);

  // Handle clear all
  const handleClear = useCallback(() => {
    onValueChange('');
  }, [onValueChange]);

  // Handle set max score
  const handleSetMax = useCallback(() => {
    onValueChange(String(maxScore));
  }, [maxScore, onValueChange]);

  // Listen to physical keyboard events on desktop/laptop
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an inline text input like search or rename
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT' && target.getAttribute('type') === 'text' && !target.hasAttribute('data-score-cell')) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleKeyPress(e.key === ',' ? '،' : '.');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (onNextStudent && hasNextStudent) {
          onNextStudent();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (onPrevStudent && hasPrevStudent) {
          onPrevStudent();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isOpen,
    handleKeyPress,
    handleBackspace,
    handleClear,
    onNextStudent,
    onPrevStudent,
    hasNextStudent,
    hasPrevStudent,
    onClose,
  ]);

  if (!isOpen) return null;

  const numericValue = Number(currentValue.replace('،', '.'));
  const isExceeded = !isNaN(numericValue) && maxScore > 0 && numericValue > maxScore;

  return (
    <div
      data-score-keypad="true"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7EC] border-t-2 sm:border-t-3 border-[#CBB69F] shadow-[0_-8px_30px_rgba(0,0,0,0.18)] transition-all animate-in slide-in-from-bottom duration-200 select-none pb-[max(env(safe-area-inset-bottom,0px),8px)]"
      dir="rtl"
    >
      <div className="max-w-2xl mx-auto px-2 sm:px-4 pt-2">
        {/* Top Info Bar: Student info, column info, current display, navigation and close */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 pb-1.5 border-b border-[#D5C8B2]">
          {/* Active Student & Column */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-[#E8DFC9] border border-[#D1C3A9] flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap className="w-4 h-4 text-[#5A4632]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm text-[#2F2822] truncate">
                  {studentName || 'طالب بدون اسم'}
                </span>
                {studentSection && (
                  <span className="px-1.5 py-0.2 bg-[#E5D7BE] text-[#3D2E21] text-[10px] font-black rounded shadow-2xs shrink-0">
                    شعبة {studentSection}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#7A6B5D] truncate">
                <span>الحقل:</span>
                <span className="text-[#2B6CB0] font-black truncate">{columnName}</span>
                <span>(من {maxScore})</span>
              </div>
            </div>
          </div>

          {/* Current Score Display Screen */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`px-3 py-1 min-w-[70px] sm:min-w-[90px] text-center rounded-xl border-2 shadow-inner transition-colors ${
                isExceeded
                  ? 'bg-red-50 border-red-400 text-red-600'
                  : 'bg-white border-[#BA916C] text-[#2F2822]'
              }`}
            >
              <div className="flex items-center justify-center gap-0.5">
                <span className="font-black text-lg sm:text-2xl tracking-wider leading-none">
                  {currentValue === '' ? '—' : currentValue}
                </span>
                {/* Simulated Blinking Cursor */}
                <span className="w-0.5 h-4 sm:h-5 bg-[#BA916C] animate-pulse inline-block" />
              </div>
              <span className="text-[9px] font-bold text-slate-400 block -mt-0.5">
                من {maxScore}
              </span>
            </div>

            {/* Next & Prev Student Arrows */}
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={onPrevStudent}
                disabled={!hasPrevStudent}
                className="p-1 sm:p-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-[#4A3B2C] border border-[#D5C8B2] shadow-2xs cursor-pointer disabled:cursor-not-allowed active:scale-95 transition-all"
                title="الطالب السابق في القائمة (سهم لأعلى)"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onNextStudent}
                disabled={!hasNextStudent}
                className="p-1 sm:p-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-[#4A3B2C] border border-[#D5C8B2] shadow-2xs cursor-pointer disabled:cursor-not-allowed active:scale-95 transition-all"
                title="الطالب التالي في القائمة (سهم لأسفل)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl bg-[#EFE8D8] hover:bg-[#E5DBCA] text-[#4A3B2C] border border-[#CBB69F] shadow-2xs cursor-pointer active:scale-95 transition-all shrink-0"
              title="إغلاق لوحة الأرقام (Escape)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Touch Keypad Grid */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pb-1">
          {/* Row 1: 1, 2, 3 and Backspace */}
          <button
            type="button"
            onClick={() => handleKeyPress('1')}
            className="craft-keypad-key"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('2')}
            className="craft-keypad-key"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('3')}
            className="craft-keypad-key"
          >
            3
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="craft-keypad-action-key bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
            title="حذف رقم واحد للخلف (Backspace)"
          >
            <Delete className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
            <span className="text-xs sm:text-sm font-black">حذف</span>
          </button>

          {/* Row 2: 4, 5, 6 and Clear */}
          <button
            type="button"
            onClick={() => handleKeyPress('4')}
            className="craft-keypad-key"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('5')}
            className="craft-keypad-key"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('6')}
            className="craft-keypad-key"
          >
            6
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="craft-keypad-action-key bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
            title="تفريغ الحقل بالكامل"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
            <span className="text-xs sm:text-sm font-black">تفريغ</span>
          </button>

          {/* Row 3: 7, 8, 9 and Max Score */}
          <button
            type="button"
            onClick={() => handleKeyPress('7')}
            className="craft-keypad-key"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('8')}
            className="craft-keypad-key"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('9')}
            className="craft-keypad-key"
          >
            9
          </button>
          <button
            type="button"
            onClick={handleSetMax}
            className="craft-keypad-action-key bg-blue-50 hover:bg-blue-100 text-[#1F5078] border-blue-300"
            title={`وضع الدرجة الكاملة تلقائياً (${maxScore})`}
          >
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 text-[#2B6CB0]" />
            <span className="text-xs sm:text-sm font-black">كاملة ({maxScore})</span>
          </button>

          {/* Row 4: . (Point), 0, ، (Arabic Comma), and Next/Done Button */}
          <button
            type="button"
            onClick={() => handleKeyPress('.')}
            className="craft-keypad-key bg-[#FAF3E0] hover:bg-[#F3E7C9] text-amber-950 font-black text-2xl sm:text-3xl"
            title="نقطة عشرية (.) لإضافة أعشار للرقم"
          >
            .
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="craft-keypad-key"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('،')}
            className="craft-keypad-key bg-[#FAF3E0] hover:bg-[#F3E7C9] text-amber-950 font-black text-2xl sm:text-3xl leading-none"
            title="فاصلة عشرية (،) لإضافة أعشار للرقم"
          >
            ،
          </button>
          <button
            type="button"
            onClick={() => {
              if (onNextStudent && hasNextStudent) {
                onNextStudent();
              } else {
                onClose();
              }
            }}
            className="craft-keypad-action-key bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-sm"
            title="تأكيد والانتقال للطالب التالي في القائمة"
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
            <span className="text-xs sm:text-sm font-black">
              {hasNextStudent ? 'التالي ⬇' : 'تم ✔'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
