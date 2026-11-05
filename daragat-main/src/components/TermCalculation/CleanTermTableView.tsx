import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { TermModel, MonthlyModel } from '../../types';
import { calculateTermSummaries, getRatingDetails } from '../../utils/gradeCalculations';
import {
  StudentFloatingCloud,
  ActiveStudentCloudInfo,
} from '../Common/StudentFloatingCloud';
import {
  isGradeLevelMatch,
  isSectionMatch,
} from '../../utils/gradeAndSectionMatcher';

interface Props {
  term: TermModel;
  monthlyModels: MonthlyModel[];
  onClose: () => void;
  showRatingColumn?: boolean;
  showSubjectColumn?: boolean;
  selectedGradeLevel?: string;
  selectedSection?: string;
  onGradeChange?: (grade: string) => void;
  onSectionChange?: (section: string) => void;
}

export const CleanTermTableView: React.FC<Props> = ({
  term,
  monthlyModels,
  onClose,
  showRatingColumn = true,
  showSubjectColumn = Boolean(term.subject),
  selectedGradeLevel = 'ALL',
  selectedSection = 'ALL',
  onGradeChange,
  onSectionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement | null>(null);
  const [activeStudentCloud, setActiveStudentCloud] = useState<ActiveStudentCloudInfo | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Keep floating badge locked with row vertically during scroll & resize
  useEffect(() => {
    const handleScrollOrResize = () => {
      if (activeRowRef.current && activeStudentCloud) {
        const rect = activeRowRef.current.getBoundingClientRect();

        // الحد العلوي (الشريط العلوي) والحد السفلي للشاشة/الحاوية
        const cleanHeader = containerRef.current?.closest('div')?.querySelector('header') || document.querySelector('header');
        const topLimit = cleanHeader ? cleanHeader.getBoundingClientRect().bottom : 50;
        const bottomLimit = containerRef.current ? containerRef.current.getBoundingClientRect().bottom : window.innerHeight;

        // تختفي السحابة إذا وصل صف الطالب للشريط العلوي أو اختفى إلى أسفل الشاشة
        if (rect.top <= topLimit || rect.top >= bottomLimit) {
          setActiveStudentCloud(null);
          return;
        }

        setActiveStudentCloud((prev) => (prev ? { ...prev, rowTop: rect.top } : null));
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScrollOrResize, { passive: true });
    }
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScrollOrResize);
      }
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeStudentCloud]);

  // Dismiss floating badge when clicking outside the table container
  useEffect(() => {
    if (!activeStudentCloud) return;

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (containerRef.current?.contains(target)) return;
      if (target.closest?.('[data-student-floating-cloud="true"]')) return;

      setActiveStudentCloud(null);
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [activeStudentCloud]);

  const handleRowClick = (
    e: React.MouseEvent<HTMLElement>,
    student: { studentId: string; name: string; section: string }
  ) => {
    const rowEl = (e.currentTarget.closest('tr') || e.currentTarget) as HTMLTableRowElement;
    if (rowEl) {
      activeRowRef.current = rowEl;
      const rect = rowEl.getBoundingClientRect();
      const rowHeight = rect.height || 40;
      setActiveStudentCloud({
        studentId: student.studentId,
        name: student.name,
        section: student.section,
        rowTop: rect.top,
        initialRowTop: rect.top,
        rowHeight: rowHeight,
      });
    }
  };

  // Models associated with this term
  const selectedModelsObj = useMemo(() => {
    return monthlyModels.filter((m) =>
      (term.selectedModelIds || []).includes(m.id)
    );
  }, [monthlyModels, term.selectedModelIds]);

  // Calculate summaries across selected models
  const rawSummaries = useMemo(() => {
    return calculateTermSummaries(term, monthlyModels);
  }, [term, monthlyModels]);

  // Filter students based on active Grade Level and Section
  const studentSummaries = useMemo(() => {
    return rawSummaries.filter((s) => {
      const matchGrade = isGradeLevelMatch(s.gradeLevel, selectedGradeLevel);
      const matchSection = isSectionMatch(s.section, selectedSection);
      return matchGrade && matchSection;
    });
  }, [rawSummaries, selectedGradeLevel, selectedSection]);

  // Available sections for the currently selected grade (for quick switching inside fullscreen)
  const availableSectionsForGrade = useMemo(() => {
    if (!selectedGradeLevel || selectedGradeLevel === 'ALL') return [];
    const secSet = new Set<string>();
    for (const s of rawSummaries) {
      if (isGradeLevelMatch(s.gradeLevel, selectedGradeLevel)) {
        const sec = (s.section || 'أ').trim();
        if (sec) secSet.add(sec);
      }
    }
    return Array.from(secSet);
  }, [rawSummaries, selectedGradeLevel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#FAF7EC] flex flex-col font-['Cairo',sans-serif] text-[#2F2822] select-none"
      dir="rtl"
    >
      {/* 1. Ultra-Slim Minimalist Top Bar: Concise Table Name + Filter Badges + Short Return Button */}
      <header className="w-full bg-[#F5EFE2] border-b border-[#D8CEBD] px-3 py-1.5 flex items-center justify-between shrink-0 shadow-2xs gap-2">
        {/* Short & Concise Table Name */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-[10px] sm:text-xs font-black text-[#944D30] bg-[#B86848]/15 border border-[#B86848]/30 px-1.5 py-0.5 rounded shrink-0">
            ملء الشاشة
          </span>
          <h1 className="text-xs sm:text-sm font-black text-[#2F2822] truncate">
            {term.name}
          </h1>

          {/* Active Grade & Section Badges */}
          {selectedGradeLevel && selectedGradeLevel !== 'ALL' ? (
            <div className="flex items-center gap-1.5 bg-[#FAF3E0] border border-[#BA916C]/40 text-[#4A3B2C] px-2 py-0.5 rounded-md text-xs font-black shadow-2xs shrink-0">
              <span className="text-[#8B5A2B]">{selectedGradeLevel}</span>
              <span className="text-[#BA916C]">•</span>
              <span className="text-[#2F2822]">
                {selectedSection && selectedSection !== 'ALL'
                  ? `شعبة ${selectedSection}`
                  : 'جميع الشُعب'}
              </span>
            </div>
          ) : (
            <span className="text-[10px] sm:text-xs font-bold text-[#7A6E5F] bg-white/80 border border-[#D8CEBD] px-2 py-0.5 rounded-md shrink-0">
              جميع الصفوف والشُعب
            </span>
          )}

          {/* Quick Section Switcher if onSectionChange is provided */}
          {selectedGradeLevel && selectedGradeLevel !== 'ALL' && availableSectionsForGrade.length > 1 && onSectionChange && (
            <div className="hidden md:flex items-center gap-1 text-[11px] font-bold shrink-0">
              <span className="text-[#7A6E5F] text-[10px]">الشعبة:</span>
              <div className="inline-flex rounded-md border border-[#D8CEBD] bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onSectionChange('ALL')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    !selectedSection || selectedSection === 'ALL'
                      ? 'bg-[#BA916C] text-white shadow-2xs'
                      : 'text-[#5A4F43] hover:bg-slate-100'
                  }`}
                >
                  جميع الشعب
                </button>
                {availableSectionsForGrade.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onSectionChange(sec)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      selectedSection === sec
                        ? 'bg-[#BA916C] text-white shadow-2xs'
                        : 'text-[#5A4F43] hover:bg-slate-100'
                    }`}
                  >
                    شعبة {sec}
                  </button>
                ))}
              </div>
            </div>
          )}

          <span className="text-[10px] text-[#7A6E5F] font-semibold bg-white/70 px-1.5 py-0.5 rounded border border-[#D8CEBD] shrink-0">
            {studentSummaries.length} طالب
          </span>
        </div>

        {/* Short Return Button */}
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 bg-[#2F2822] hover:bg-[#1E1915] active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
          title="الرجوع إلى الوضع السابق (Esc)"
        >
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>رجوع</span>
        </button>
      </header>

      {/* 2. Full Table Container Maximizing Screen Viewport */}
      <main
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto p-1 sm:p-2 bg-[#FAF7EC]"
      >
        <div className="min-w-max pb-3">
          <table className="border-collapse border-2 border-[#D5C8B2] bg-white text-right text-xs shadow-xs rounded-lg overflow-hidden">
            {/* Clean Header with NO buttons */}
            <thead>
              <tr className="bg-[#EFE8D8] text-[#2F2822] border-b-2 border-[#D5C8B2] font-black text-[11px] sm:text-xs">
                <th className="py-1.5 px-2 w-9 text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                  #
                </th>
                <th className="py-1.5 px-3 min-w-[200px] text-right align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                  اسم الطالب
                </th>
                <th className="py-1.5 px-2 min-w-[80px] text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                  الصف
                </th>
                <th className="py-1.5 px-2 w-12 text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                  الشعبة
                </th>
                {showSubjectColumn && (
                  <th className="py-1.5 px-2 min-w-[85px] text-center align-middle border border-[#D5C8B2] bg-[#E8F0F7] text-[#1E3A8A]">
                    اسم الدرس
                  </th>
                )}
                {selectedModelsObj.map((model) => (
                  <th
                    key={model.id}
                    className="py-1.5 px-2 min-w-[110px] text-center align-middle border border-[#D5C8B2] bg-[#E8F0F7] text-[#1E3A8A]"
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <div className="flex items-center justify-center gap-1">
                        <span>{model.name}</span>
                        <span className="text-[10px] font-bold text-[#3B82F6]">
                          ({model.totalMaxScore})
                        </span>
                      </div>
                      {model.subject && (
                        <span className="text-[10px] font-bold text-[#1E3A8A] bg-white/80 border border-blue-200 px-1.5 py-0.2 rounded">
                          {model.subject}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-1.5 px-2 min-w-[120px] text-center align-middle border border-[#D5C8B2] bg-[#FEF3C7] text-[#92400E]">
                  <div className="flex items-center justify-center gap-1">
                    <span>معدل {term.name}</span>
                    <span className="text-[10px] font-bold text-[#B45309]">
                      {(term.selectedModelIds || []).length > 1 ? '(معدل)' : '(نهائي)'}
                    </span>
                  </div>
                </th>
                {showRatingColumn && (
                  <th className="py-1.5 px-2 min-w-[90px] text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                    التقدير
                  </th>
                )}
                <th className="py-1.5 px-2 min-w-[80px] text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                  الحالة
                </th>
              </tr>
            </thead>

            {/* Clean Table Body */}
            <tbody>
              {selectedModelsObj.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + (showRatingColumn ? 1 : 0) + (showSubjectColumn ? 1 : 0)}
                    className="py-14 text-center text-slate-600 font-bold bg-[#FAF7EC] text-xs"
                  >
                    <p className="text-sm font-black text-[#8C4325]">
                      لم يتم تحديد أي شهر لاحتساب معدل ({term.name}) بعد
                    </p>
                    <p className="text-[11px] text-[#7A6E5F] mt-1">
                      اضغط على زر &quot;رجوع&quot; وحدد الأشهر المراد احتسابها من خلال مربعات الاختيار (☑ Checkbox).
                    </p>
                  </td>
                </tr>
              ) : studentSummaries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + selectedModelsObj.length + (showRatingColumn ? 1 : 0) + (showSubjectColumn ? 1 : 0)}
                    className="py-12 text-center text-slate-500 font-bold bg-[#FAF7EC] text-xs"
                  >
                    لا توجد بيانات طلاب مطابقة في {selectedGradeLevel && selectedGradeLevel !== 'ALL' ? selectedGradeLevel : 'هذا الفصل'}
                    {selectedSection && selectedSection !== 'ALL' ? ` (شعبة ${selectedSection})` : ''}.
                  </td>
                </tr>
              ) : (
                studentSummaries.map((student, idx) => {
                  const rating = getRatingDetails(student.finalTermScore, 100);
                  const isPass =
                    student.finalTermScore !== null && student.finalTermScore >= 50;
                  const isEven = idx % 2 === 0;
                  const isActive = activeStudentCloud?.studentId === student.studentId;

                  return (
                    <tr
                      key={student.studentId}
                      onClick={(e) => handleRowClick(e, student)}
                      className={`transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-50/90 ring-1 ring-sky-300'
                          : isEven
                          ? 'bg-white hover:bg-[#F4EFE2]'
                          : 'bg-[#FAF7EC]/50 hover:bg-[#F4EFE2]'
                      }`}
                    >
                      <td className="py-1 px-1.5 text-center font-bold text-[#7A6E5F] border border-[#D5C8B2] text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2.5 font-bold text-[#2F2822] border border-[#D5C8B2] whitespace-nowrap text-xs">
                        {student.name}
                      </td>
                      <td className="py-1 px-2 text-center text-[11px] font-semibold text-[#5A4F43] border border-[#D5C8B2] whitespace-nowrap">
                        {student.gradeLevel || '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-[11px] font-bold text-[#5A4F43] border border-[#D5C8B2] whitespace-nowrap">
                        {student.section || '-'}
                      </td>
                      {showSubjectColumn && (
                        <td className="py-1 px-2 text-center text-[11px] font-bold text-[#1E3A8A] bg-blue-50/20 border border-[#D5C8B2] whitespace-nowrap">
                          {term.subject || selectedModelsObj[0]?.subject || '-'}
                        </td>
                      )}
                      {selectedModelsObj.map((model) => {
                        const mScore = student.monthlyScores.find(
                          (ms) => ms.modelId === model.id
                        )?.score;
                        return (
                          <td
                            key={model.id}
                            className="py-1 px-2 text-center border border-[#D5C8B2] font-bold text-xs text-[#1E293B]"
                          >
                            {mScore !== null && mScore !== undefined ? (
                              mScore
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-1 px-2 text-center font-black border border-[#D5C8B2] bg-[#FFFBEB]">
                        {student.finalTermScore !== null ? (
                          <span className="inline-block min-w-[36px] px-1.5 py-0.5 text-xs sm:text-sm font-black text-[#92400E] bg-amber-100/90 rounded border border-amber-300">
                            {student.finalTermScore}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">-</span>
                        )}
                      </td>
                      {showRatingColumn && (
                        <td className="py-1 px-2 text-center border border-[#D5C8B2] whitespace-nowrap">
                          {student.finalTermScore !== null ? (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${rating.badgeBg} ${rating.badgeText}`}
                            >
                              {rating.text}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}
                      <td className="py-1 px-2 text-center border border-[#D5C8B2] whitespace-nowrap">
                        {student.finalTermScore !== null ? (
                          isPass ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ناجح
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              راسب
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Floating Student Info Cloud badge */}
      <StudentFloatingCloud
        info={activeStudentCloud}
        isOpen={Boolean(activeStudentCloud)}
        onClose={() => setActiveStudentCloud(null)}
        zIndexClass="z-[70]"
      />
    </div>
  );
};
