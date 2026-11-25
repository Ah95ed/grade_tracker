import React from 'react';
import { X } from 'lucide-react';

export interface ActiveStudentCloudInfo {
  studentId: string;
  name: string;
  section: string;
  rowTop: number;
  initialRowTop?: number;
  rowHeight?: number;
}

interface StudentFloatingCloudProps {
  info: ActiveStudentCloudInfo | null;
  isOpen: boolean;
  onClose: () => void;
  zIndexClass?: string;
}

export const StudentFloatingCloud: React.FC<StudentFloatingCloudProps> = ({
  info,
  isOpen,
  onClose,
  zIndexClass = 'z-[70]',
}) => {
  if (!isOpen || !info) return null;

  // 1. يختفي المستطيل الأسود إذا اختفى صف الطالب من الشاشة إلى الأسفل
  if (info.rowTop >= window.innerHeight) {
    return null;
  }

  // 2. يختفي المستطيل الأسود إذا وصل صف الطالب حد الحقول التي بها اسم الجدول والمعدل والكروت
  let topBoundary = 130;
  if (typeof document !== 'undefined') {
    const navHeader = document.getElementById('main-navigation-header') || document.querySelector('header');
    if (navHeader) {
      topBoundary = navHeader.getBoundingClientRect().bottom;
    }
  }

  if (info.rowTop <= topBoundary) {
    return null;
  }

  // Clean the section to only display the symbol/letter (e.g. 'أ' instead of 'الشعبة أ')
  const cleanSection = (info.section || '')
    .replace(/^(الشعبة|شعبة)\s*/i, '')
    .trim();

  const safeTop = info.rowTop;

  return (
    <div
      data-student-floating-cloud="true"
      dir="rtl"
      style={{ top: `${safeTop}px` }}
      className={`fixed right-2 sm:right-4 ${zIndexClass} transition-all duration-150 select-none print:hidden pointer-events-auto`}
    >
      <div className="flex items-center gap-1.5 bg-[#0F172A] text-white border border-[#38BDF8] rounded-lg px-2 py-1 shadow-xl text-xs font-bold ring-1 ring-sky-500/20 w-fit max-w-[240px] sm:max-w-[300px] animate-in fade-in duration-100">
        {/* Student Name */}
        <span className="truncate text-white font-bold text-xs sm:text-sm">
          {info.name || 'بدون اسم'}
        </span>

        {/* Section letter/symbol only */}
        {cleanSection && (
          <span className="shrink-0 bg-sky-950 text-sky-300 border border-sky-400/50 px-1 py-0.2 rounded text-[11px] font-extrabold leading-none">
            {cleanSection}
          </span>
        )}

        {/* Single Delete / Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 p-0.5 rounded transition-colors shrink-0 cursor-pointer mr-0.5"
          title="حذف / إخفاء"
          aria-label="إخفاء"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
