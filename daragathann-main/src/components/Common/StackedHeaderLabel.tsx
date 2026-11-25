import React from 'react';

interface StackedHeaderLabelProps {
  label: string;
  isVertical?: boolean;
  className?: string;
}

/**
 * Splits multi-word column headers onto compact stacked lines so columns fit
 * their titles without taking excessive horizontal space.
 * Preserves single-strip flow when rotated vertically.
 */
export function getStackedHeaderLines(label: string): string[] {
  const cleaned = (label || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return [];
  const words = cleaned.split(' ');
  if (words.length <= 1) return [cleaned];
  if (words.length <= 3) return words;
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += 2) {
    lines.push(words.slice(i, i + 2).join(' '));
  }
  return lines;
}

export const StackedHeaderLabel: React.FC<StackedHeaderLabelProps> = ({
  label,
  isVertical = false,
  className = '',
}) => {
  if (isVertical) {
    return <span className={className}>{label}</span>;
  }

  const lines = getStackedHeaderLines(label);
  if (lines.length <= 1) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={`inline-block text-center ${className}`}>
      {lines.map((line, idx) => (
        <span key={idx} className="block whitespace-nowrap leading-[1.15]">
          {line}
        </span>
      ))}
    </span>
  );
};
