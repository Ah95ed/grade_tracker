import React from 'react';
import { NumeralMode } from '../../utils/numeralFormat';

interface NumeralModeToggleProps {
  mode: NumeralMode;
  onChange: (mode: NumeralMode) => void;
  accent?: 'terracotta' | 'emerald' | 'camel';
  className?: string;
}

export const NumeralModeToggle: React.FC<NumeralModeToggleProps> = ({
  mode,
  onChange,
  accent = 'camel',
  className = '',
}) => {
  const activeStyle =
    accent === 'terracotta'
      ? 'bg-[#B86848] text-white shadow-2xs font-black'
      : accent === 'emerald'
      ? 'bg-[#4E7A68] text-white shadow-2xs font-black'
      : 'bg-[#BA916C] text-white shadow-2xs font-black';

  return (
    <div
      className={`inline-flex items-center bg-white border border-[#D5C8B2] p-0.5 rounded-xl shadow-2xs shrink-0 no-print select-none ${className}`}
      role="group"
      aria-label="اختيار نظام الأرقام"
      title="تبديل لغة الأرقام (عربي / إنكليزي) في الجدول والمعدل والكروت"
    >
      <button
        type="button"
        onClick={() => onChange('AR')}
        aria-pressed={mode === 'AR'}
        title="عرض الأرقام بالعربية (١ ٢ ٣)"
        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
          mode === 'AR'
            ? activeStyle
            : 'text-[#5A4F43] hover:bg-[#FAF2EB] hover:text-[#2F2822]'
        }`}
      >
        <span>عربي</span>
        <span className="font-black">١٢٣</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('EN')}
        aria-pressed={mode === 'EN'}
        title="عرض الأرقام بالإنجليزية (1 2 3)"
        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
          mode === 'EN'
            ? activeStyle
            : 'text-[#5A4F43] hover:bg-[#FAF2EB] hover:text-[#2F2822]'
        }`}
      >
        <span>EN</span>
        <span className="font-black">123</span>
      </button>
    </div>
  );
};
