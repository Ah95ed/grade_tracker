import React from 'react';
import { RotateCw } from 'lucide-react';

export type ColumnSlant = 'normal' | 'italic' | 'vertical';

export function getSlantClasses(slant: ColumnSlant | undefined): string {
  if (slant === 'italic') {
    return 'italic inline-block transform -rotate-12 transition-transform origin-center select-none';
  }
  if (slant === 'vertical') {
    return '[writing-mode:vertical-rl] rotate-180 inline-block tracking-wider py-1.5 whitespace-nowrap transition-transform origin-center select-none';
  }
  return 'inline-block transition-transform';
}

export function getNextSlant(current: ColumnSlant | undefined): ColumnSlant {
  if (!current || current === 'normal') return 'italic';
  if (current === 'italic') return 'vertical';
  return 'normal';
}

interface SlantButtonProps {
  slant: ColumnSlant | undefined;
  onToggle: () => void;
  title?: string;
  className?: string;
}

export const SlantButton: React.FC<SlantButtonProps> = ({
  slant,
  onToggle,
  title,
  className = '',
}) => {
  const currentSlant = slant || 'normal';
  const defaultTitle =
    currentSlant === 'italic'
      ? 'ميل النص: مائل (انقر للتحويل إلى عامودي)'
      : currentSlant === 'vertical'
      ? 'ميل النص: عامودي (انقر للإرجاع إلى عادي)'
      : 'تغيير ميل النص (عادي / مائل / عامودي)';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`p-1 rounded transition-all cursor-pointer print:hidden shrink-0 shadow-2xs border ${
        currentSlant === 'italic'
          ? 'text-amber-800 bg-amber-100/90 border-amber-300 ring-1 ring-amber-300 hover:bg-amber-200'
          : currentSlant === 'vertical'
          ? 'text-blue-800 bg-blue-100/90 border-blue-300 ring-1 ring-blue-300 hover:bg-blue-200'
          : 'text-slate-500 bg-white/80 hover:bg-white border-slate-300/80 hover:border-[#BA916C] hover:text-[#BA916C] opacity-75 hover:opacity-100'
      } ${className}`}
      title={title || defaultTitle}
      aria-label="تغيير ميل النص داخل العمود"
    >
      <RotateCw
        className={`w-3 h-3 transition-transform duration-200 ${
          currentSlant === 'italic' ? '-rotate-45' : currentSlant === 'vertical' ? '-rotate-90' : ''
        }`}
      />
    </button>
  );
};
