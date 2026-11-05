import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import {
  MonthlyModel,
  StudentRow,
  CustomColumn,
  AttendanceRecord,
  WrittenScoreMode,
  ColumnLabels,
} from '../../types';
import {
  calculateWrittenScore,
  getStudentMonthlyScoreBreakdown,
  getRatingDetails,
} from '../../utils/gradeCalculations';
import {
  StudentFloatingCloud,
  ActiveStudentCloudInfo,
} from '../Common/StudentFloatingCloud';
import {
  isGradeLevelMatch,
  isSectionMatch,
} from '../../utils/gradeAndSectionMatcher';
import { AttendanceRecordModal } from './AttendanceRecordModal';

interface Props {
  model: MonthlyModel;
  allModels?: MonthlyModel[];
  onClose: () => void;
  onUpdateStudent?: (studentId: string, updates: Partial<StudentRow>) => void;
  showRatingColumn?: boolean;
  totalMax: number;
  effectiveTotalMax: number;
  effectiveWrittenWeight: number;
  writtenScoreMode: WrittenScoreMode;
  columnLabels?: ColumnLabels;
  selectedGradeLevel?: string;
  selectedSection?: string;
  onGradeChange?: (grade: string) => void;
  onSectionChange?: (section: string) => void;
}

export const CleanTableView: React.FC<Props> = ({
  model,
  allModels,
  onClose,
  onUpdateStudent,
  showRatingColumn = true,
  effectiveTotalMax,
  effectiveWrittenWeight,
  writtenScoreMode,
  columnLabels,
  selectedGradeLevel = 'ALL',
  selectedSection = 'ALL',
  onGradeChange,
  onSectionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement | null>(null);
  const [activeStudentCloud, setActiveStudentCloud] = useState<ActiveStudentCloudInfo | null>(null);
  const [selectedAttendanceStudent, setSelectedAttendanceStudent] = useState<{
    student: StudentRow;
    column: CustomColumn;
  } | null>(null);

  const handleSaveStudentAttendance = (studentId: string, columnId: string, records: AttendanceRecord[]) => {
    const targetStudent = model.students.find((s) => s.id === studentId);
    const updatedRecords = {
      ...(targetStudent?.attendanceRecords || {}),
      [columnId]: records,
    };
    onUpdateStudent?.(studentId, { attendanceRecords: updatedRecords });
  };

  // Close on Escape key press
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

  const handleScoreCellFocus = (
    e: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement>,
    student: StudentRow
  ) => {
    const rowEl = (e.currentTarget.closest('tr') || e.currentTarget) as HTMLTableRowElement;
    if (rowEl) {
      activeRowRef.current = rowEl;
      const rect = rowEl.getBoundingClientRect();
      const rowHeight = rect.height || 40;
      setActiveStudentCloud({
        studentId: student.id,
        name: student.name,
        section: student.section,
        rowTop: rect.top,
        initialRowTop: rect.top,
        rowHeight: rowHeight,
      });
    }
  };

  const customCols = model.customColumns || [];
  const allStudents = model.students || [];

  // Filter students by selected Grade and Section (matching the active table view and assignedSections)
  const effectiveGrade = model.gradeLevel || selectedGradeLevel;
  const students = useMemo(() => {
    return allStudents.filter((st) => {
      const matchGrade = !effectiveGrade || effectiveGrade === 'ALL' || isGradeLevelMatch(st.gradeLevel || '', effectiveGrade);
      if (model.assignedSections && model.assignedSections.length > 0) {
        if (!model.assignedSections.some((sec) => isSectionMatch(st.section || '', sec))) {
          return false;
        }
      }
      const matchSection = isSectionMatch(st.section || '', selectedSection);
      return matchGrade && matchSection;
    });
  }, [allStudents, effectiveGrade, model.assignedSections, selectedSection]);

  // Available sections for the currently selected grade (for quick switching inside fullscreen)
  const availableSectionsForGrade = useMemo(() => {
    if (model.assignedSections && model.assignedSections.length > 0) {
      return model.assignedSections;
    }
    if (!effectiveGrade || effectiveGrade === 'ALL') return [];
    const secSet = new Set<string>();
    for (const st of allStudents) {
      if (isGradeLevelMatch(st.gradeLevel || '', effectiveGrade)) {
        const s = (st.section || 'أ').trim();
        if (s) secSet.add(s);
      }
    }
    return Array.from(secSet);
  }, [allStudents, effectiveGrade, model.assignedSections]);

  // Concise Labels
  const studentNameLabel = columnLabels?.studentName || 'اسم الطالب';
  const gradeLevelLabel = columnLabels?.gradeLevel || 'الصف';
  const sectionLabel = columnLabels?.section || 'الشعبة';
  const writtenScoreLabel = columnLabels?.writtenExam || 'التحريري';
  const finalScoreLabel = columnLabels?.finalScore || 'النهائي';
  const ratingLabel = columnLabels?.rating || 'التقدير';

  const handleScoreChange = (studentId: string, field: 'written' | string, value: string) => {
    if (!onUpdateStudent) return;
    const student = allStudents.find((s) => s.id === studentId);
    if (!student) return;

    if (field === 'written') {
      const num = value.trim() === '' ? null : Number(value);
      onUpdateStudent(studentId, { writtenRawScore: num });
    } else {
      const num = value.trim() === '' ? null : Number(value);
      onUpdateStudent(studentId, {
        scores: {
          ...student.scores,
          [field]: num,
        },
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#FAF7EC] flex flex-col font-['Cairo',sans-serif] text-[#2F2822] select-none"
      dir="rtl"
    >
      {/* 1. Ultra-Slim Minimalist Top Bar: Concise Table Name + Filter Badges + Short Return Button */}
      <header className="w-full bg-[#F5EFE2] border-b border-[#D8CEBD] px-3 py-1.5 flex items-center justify-between shrink-0 shadow-2xs gap-2">
        {/* Short & Concise Table Name & Filter */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-[10px] sm:text-xs font-black text-[#8B653E] bg-[#BA916C]/15 border border-[#BA916C]/30 px-1.5 py-0.5 rounded shrink-0">
            ملء الشاشة
          </span>
          <h1 className="text-xs sm:text-sm font-black text-[#2F2822] truncate">
            {model.name}
          </h1>
          {model.subject && (
            <span className="text-[10px] sm:text-xs font-black text-[#1E3A8A] bg-blue-100/90 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
              ({model.subject})
            </span>
          )}

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

          {/* Quick Section Switcher if onSectionChange is provided and multiple sections exist */}
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
            {students.length} طالب
          </span>
        </div>

        {/* Short Return Button */}
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 bg-[#2F2822] hover:bg-[#1E1915] active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
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
            {/* Clean Table Header */}
            <thead>
              <tr className="bg-[#EFE8D8] text-[#2F2822] border-b-2 border-[#D5C8B2] font-black text-[11px] sm:text-xs">
                {/* Index */}
                <th className="py-1.5 px-2 w-9 text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                  #
                </th>

                {/* Student Name */}
                <th className="py-1.5 px-3 min-w-[200px] text-right align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                  {studentNameLabel}
                </th>

                {/* Grade */}
                <th className="py-1.5 px-2 min-w-[80px] text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                  {gradeLevelLabel}
                </th>

                {/* Section */}
                <th className="py-1.5 px-2 w-12 text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                  {sectionLabel}
                </th>

                {/* Subject Name */}
                <th className="py-1.5 px-2 min-w-[85px] text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8] text-[#1E3A8A]">
                  اسم المادة
                </th>

                {/* Written Exam Score */}
                <th className="py-1.5 px-2 min-w-[120px] text-center align-middle border border-[#D5C8B2] bg-[#E8F0F7] text-[#1E3A8A]">
                  <div className="flex items-center justify-center gap-1">
                    <span>{writtenScoreLabel}</span>
                    <span className="text-[10px] font-bold text-[#3B82F6]">
                      ({effectiveWrittenWeight})
                    </span>
                  </div>
                </th>

                {/* Custom Columns (e.g. Oral, Behavior, Attendance, etc.) */}
                {customCols.map((col) => (
                  <th
                    key={col.id}
                    className="py-1.5 px-2 min-w-[100px] text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{col.name}</span>
                      {col.isAttendance ? (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            col.attendanceConfig?.affectsGrade
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {col.attendanceConfig?.affectsGrade ? 'يؤثر بالدرجة' : 'توثيق'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#8B653E]">
                          ({col.maxScore})
                        </span>
                      )}
                    </div>
                  </th>
                ))}

                {/* Final Score */}
                <th className="py-1.5 px-2 min-w-[110px] text-center align-middle border border-[#D5C8B2] bg-[#FEF3C7] text-[#92400E]">
                  <div className="flex items-center justify-center gap-1">
                    <span>{finalScoreLabel}</span>
                    <span className="text-[10px] font-bold text-[#B45309]">
                      ({effectiveTotalMax})
                    </span>
                  </div>
                </th>

                {/* Rating Badge Header */}
                {showRatingColumn && (
                  <th className="py-1.5 px-2 min-w-[90px] text-center align-middle border border-[#D5C8B2] bg-[#EFE8D8]">
                    {ratingLabel}
                  </th>
                )}
              </tr>
            </thead>

            {/* Clean Table Body */}
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + customCols.length + (showRatingColumn ? 1 : 0)}
                    className="py-12 text-center text-slate-500 font-bold bg-[#FAF7EC] text-xs"
                  >
                    <p className="text-sm font-black text-[#5A4F43]">
                      لا يوجد طلاب مسجلون في {selectedGradeLevel && selectedGradeLevel !== 'ALL' ? selectedGradeLevel : 'هذا الجدول'}
                      {selectedSection && selectedSection !== 'ALL' ? ` (شعبة ${selectedSection})` : ''} حالياً.
                    </p>
                    <p className="text-[11px] text-[#8C7E6D] mt-1">
                      يمكنك الضغط على زر &quot;رجوع&quot; لاختيار صف أو شعبة أخرى أو استيراد بيانات الطلاب.
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const breakdown = getStudentMonthlyScoreBreakdown(student, model);
                  const writtenCalculated = calculateWrittenScore(
                    student.writtenRawScore,
                    model.writtenMaxScore,
                    effectiveWrittenWeight,
                    model.totalMaxScore,
                    writtenScoreMode
                  );

                  const totalMonthly = breakdown.finalScore;
                  const rating = getRatingDetails(totalMonthly, effectiveTotalMax);
                  const isEven = idx % 2 === 0;

                  const isActive = activeStudentCloud?.studentId === student.id;

                  return (
                    <tr
                      key={student.id}
                      onClick={(e) => handleScoreCellFocus(e, student)}
                      className={`transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-50/90 ring-1 ring-sky-300'
                          : isEven
                          ? 'bg-white hover:bg-[#F4EFE2]'
                          : 'bg-[#FAF7EC]/50 hover:bg-[#F4EFE2]'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-1 px-1.5 text-center font-bold text-[#7A6E5F] border border-[#D5C8B2] text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Student Name */}
                      <td className="py-1 px-2.5 font-bold text-[#2F2822] border border-[#D5C8B2] whitespace-nowrap text-xs">
                        {student.name || 'طالب بدون اسم'}
                      </td>

                      {/* Grade */}
                      <td className="py-1 px-2 text-center text-[11px] font-semibold text-[#5A4F43] border border-[#D5C8B2] whitespace-nowrap">
                        {student.gradeLevel || '-'}
                      </td>

                      {/* Section */}
                      <td className="py-1 px-2 text-center text-[11px] font-bold text-[#5A4F43] border border-[#D5C8B2] whitespace-nowrap">
                        {student.section || '-'}
                      </td>

                      {/* Subject Name */}
                      <td className="py-1 px-2 text-center text-[11px] font-bold text-[#1E3A8A] border border-[#D5C8B2] whitespace-nowrap bg-blue-50/20">
                        {model.subject || '-'}
                      </td>

                      {/* Written Score */}
                      <td className="py-1 px-2 text-center border border-[#D5C8B2] bg-[#F8FAFC]">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={model.writtenMaxScore || 100}
                            inputMode="decimal"
                            value={
                              student.writtenRawScore === null ||
                              student.writtenRawScore === undefined
                                ? ''
                                : student.writtenRawScore
                            }
                            onFocus={(e) => handleScoreCellFocus(e, student)}
                            onClick={(e) => handleScoreCellFocus(e, student)}
                            onChange={(e) =>
                              handleScoreChange(student.id, 'written', e.target.value)
                            }
                            placeholder="-"
                            className="w-14 py-0.5 px-1 text-center font-bold text-xs bg-white border border-[#CBD5E1] rounded focus:outline-none focus:ring-1 focus:ring-[#2B6CB0] focus:border-[#2B6CB0]"
                          />
                          {writtenCalculated !== null &&
                            writtenScoreMode === 'relative' &&
                            effectiveWrittenWeight !== model.writtenMaxScore && (
                              <span
                                className="text-[10px] font-bold text-[#2B6CB0] bg-[#EFF6FF] px-1 py-0.2 rounded"
                                title={`المحسوبة من ${effectiveWrittenWeight}`}
                              >
                                ={writtenCalculated}
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Custom Columns */}
                      {customCols.map((col) => {
                        if (col.isAttendance) {
                          const studentRecords = (student.attendanceRecords && student.attendanceRecords[col.id]) || [];
                          const absentCount = studentRecords.filter((r) => r.status === 'absent').length;
                          const excusedCount = studentRecords.filter((r) => r.status === 'excused').length;
                          const presentCount = studentRecords.filter((r) => r.status === 'present').length;
                          return (
                            <td
                              key={col.id}
                              className="py-1 px-1.5 text-center border border-[#D5C8B2] bg-emerald-50/20"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAttendanceStudent({ student, column: col });
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-emerald-50 border border-emerald-300 text-[10px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="عرض وتسجيل الحضور والغياب"
                              >
                                <span className="text-rose-700 font-black">غ:{absentCount}</span>
                                <span className="text-amber-700 font-bold">م:{excusedCount}</span>
                                <span className="text-emerald-700 font-bold">ح:{presentCount}</span>
                              </button>
                            </td>
                          );
                        }

                        const val = student.scores[col.id];
                        return (
                          <td
                            key={col.id}
                            className="py-1 px-2 text-center border border-[#D5C8B2]"
                          >
                            <input
                              type="number"
                              min="0"
                              max={col.maxScore}
                              inputMode="decimal"
                              value={val === null || val === undefined ? '' : val}
                              onFocus={(e) => handleScoreCellFocus(e, student)}
                              onClick={(e) => handleScoreCellFocus(e, student)}
                              onChange={(e) =>
                                handleScoreChange(student.id, col.id, e.target.value)
                              }
                              placeholder="-"
                              className="w-14 py-0.5 px-1 text-center font-bold text-xs bg-white border border-[#CBD5E1] rounded focus:outline-none focus:ring-1 focus:ring-[#BA916C] focus:border-[#BA916C]"
                            />
                          </td>
                        );
                      })}

                      {/* Final Score */}
                      <td className="py-1 px-2 text-center font-black border border-[#D5C8B2] bg-[#FFFBEB]">
                        {totalMonthly !== null ? (
                          <span className="inline-block min-w-[36px] px-1.5 py-0.5 text-xs sm:text-sm font-black text-[#92400E] bg-amber-100/90 rounded border border-amber-300">
                            {totalMonthly}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">-</span>
                        )}
                      </td>

                      {/* Rating Badge */}
                      {showRatingColumn && (
                        <td className="py-1 px-2 text-center border border-[#D5C8B2] whitespace-nowrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${rating.badgeBg} ${rating.badgeText}`}
                          >
                            {rating.text}
                          </span>
                        </td>
                      )}
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

      {/* Attendance Record Modal */}
      {selectedAttendanceStudent && (
        <AttendanceRecordModal
          isOpen={Boolean(selectedAttendanceStudent)}
          onClose={() => setSelectedAttendanceStudent(null)}
          student={selectedAttendanceStudent.student}
          column={selectedAttendanceStudent.column}
          model={model}
          allModels={allModels || [model]}
          onSaveRecords={handleSaveStudentAttendance}
        />
      )}
    </div>
  );
};
