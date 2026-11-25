import React from 'react';
import { Trash2, AlertTriangle, Calendar } from 'lucide-react';
import {
  MonthlyModel,
  StudentRow,
  CustomColumn,
  WrittenScoreMode,
} from '../../types';
import {
  calculateWrittenScore,
  applyScoreRounding,
  getRatingDetails,
  getStudentMonthlyScoreBreakdown,
} from '../../utils/gradeCalculations';
import { cleanSingleSpaces, SuspectedMatchResult } from '../../utils/arabicNameMatcher';
import { formatScoreDisplay } from './GradeNumericKeypad';
import { NumeralMode } from '../../utils/numeralFormat';
import {
  shouldSuppressNativeKeyboard,
  markTouchScoreInputInteraction,
  markMouseScoreInputInteraction,
  suppressFocusedScoreInputOnTouch,
} from '../../utils/touchInputGuard';

export interface MonthlyStudentRowProps {
  student: StudentRow;
  index: number;
  currentModel: MonthlyModel;
  effectiveWrittenWeight: number;
  writtenScoreMode: WrittenScoreMode;
  effectiveTotalMax: number;
  subjectLabel: string;
  numeralMode: NumeralMode;
  showRatingColumn: boolean;
  isVoiceScoreMode: boolean;
  isRowKeypadActive: boolean;
  activeKeypadColumnType: 'written' | 'custom' | null;
  activeKeypadColumnId: string | null;
  isRowCloudActive: boolean;
  suspectedInTable: SuspectedMatchResult | null;
  onRequestDeleteRow: (studentId: string) => void;
  onScoreCellFocus: (
    e: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement>,
    student: StudentRow,
    forceShowCloud?: boolean
  ) => void;
  onUpdateStudent: (studentId: string, updates: Partial<StudentRow>) => void;
  onUpdateStudentCustomScore: (studentId: string, colId: string, scoreValue: string) => void;
  onOpenKeypadForWritten: (student: StudentRow) => void;
  onOpenKeypadForCustom: (student: StudentRow, col: CustomColumn) => void;
  onOpenRoundingModal: () => void;
  onOpenAttendanceModal: (student: StudentRow, col: CustomColumn) => void;
}

export const MonthlyStudentRow = React.memo<MonthlyStudentRowProps>(({
  student,
  index,
  currentModel,
  effectiveWrittenWeight,
  writtenScoreMode,
  effectiveTotalMax,
  subjectLabel,
  numeralMode,
  showRatingColumn,
  isVoiceScoreMode,
  isRowKeypadActive,
  activeKeypadColumnType,
  activeKeypadColumnId,
  isRowCloudActive,
  suspectedInTable,
  onRequestDeleteRow,
  onScoreCellFocus,
  onUpdateStudent,
  onUpdateStudentCustomScore,
  onOpenKeypadForWritten,
  onOpenKeypadForCustom,
  onOpenRoundingModal,
  onOpenAttendanceModal,
}) => {
  const writtenCalculated = calculateWrittenScore(
    student.writtenRawScore,
    currentModel.writtenMaxScore,
    effectiveWrittenWeight,
    currentModel.totalMaxScore,
    writtenScoreMode
  );
  const hasWrittenDecimal =
    writtenCalculated !== null && Math.round(writtenCalculated) !== writtenCalculated;
  const roundingMode = currentModel.roundingMode || 'any_fraction';
  const roundedWrittenScore =
    writtenCalculated !== null
      ? currentModel.roundingMode === 'none'
        ? writtenCalculated
        : applyScoreRounding(
            writtenCalculated,
            roundingMode,
            currentModel.roundingThreshold,
            currentModel.totalMaxScore
          )
      : null;
  const breakdown = getStudentMonthlyScoreBreakdown(student, currentModel);
  const totalMonthly = breakdown.finalScore;
  const rating = getRatingDetails(totalMonthly, effectiveTotalMax);

  return (
    <tr
      id={`student-row-${student.id}`}
      className={`even:bg-[#F8FAFC] odd:bg-white hover:bg-blue-50/40 transition-colors group ${
        isRowKeypadActive ? 'bg-amber-100/70 ring-2 ring-inset ring-amber-400 shadow-xs' : ''
      }`}
    >
      {/* Delete Student Row Button AT THE VERY BEGINNING OF THE ROW */}
      <td className="py-1 px-1 text-center align-middle border border-[#CBD5E1] no-print print:hidden">
        <button
          type="button"
          onClick={() => onRequestDeleteRow(student.id)}
          className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#BD4B4B] hover:text-white bg-[#FDF2F2] hover:bg-[#BD4B4B] border border-[#F5D5D5] hover:border-[#BD4B4B] transition-all shadow-2xs hover:scale-105 active:scale-95"
          title={`حذف صف الطالب (${student.name || 'بدون اسم'}) مع تنبيه تأكيد`}
        >
          <Trash2 className="w-3.5 h-3.5 transition-colors" />
        </button>
      </td>

      {/* Row Index */}
      <td className="py-1.5 px-2 text-center text-xs font-bold text-[#64748B] border border-[#CBD5E1] bg-[#F8FAFC]">
        {formatScoreDisplay(index + 1, numeralMode)}
      </td>

      {/* Student Name */}
      <td
        data-student-name-column="true"
        className={`py-1 px-2 border transition-colors ${
          suspectedInTable ? 'bg-amber-100/90 border-amber-400' : 'border-[#CBD5E1]'
        }`}
      >
        <div className="space-y-1">
          <input
            type="text"
            value={student.name}
            onFocus={(e) => onScoreCellFocus(e, student)}
            onClick={(e) => onScoreCellFocus(e, student)}
            onBlur={(e) => {
              const cleaned = cleanSingleSpaces(e.target.value);
              if (cleaned !== student.name) {
                onUpdateStudent(student.id, { name: cleaned });
              }
            }}
            onChange={(e) => onUpdateStudent(student.id, { name: e.target.value })}
            placeholder="اكتب اسم الطالب..."
            className={`w-full px-2 py-1 border border-transparent hover:border-[#CBD5E1] focus:border-[#2B6CB0] focus:bg-white text-sm font-bold text-[#1E293B] focus:outline-none transition-colors rounded-none sm:rounded-sm ${
              suspectedInTable ? 'bg-amber-50/80 font-black' : ''
            }`}
          />

          {suspectedInTable && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 bg-amber-200/90 border border-amber-300 rounded text-[10px] text-amber-950 font-bold no-print print:hidden shadow-2xs">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                <span>هل تقصد «{suspectedInTable.matchedName}» كما في الجدول السابق؟</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateStudent(student.id, {
                      name: suspectedInTable.matchedName,
                      suspectedMatch: undefined,
                    })
                  }
                  className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[9px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  اعتمد ذلك
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateStudent(student.id, {
                      suspectedMatch: {
                        originalName: cleanSingleSpaces(student.name),
                        dismissed: true,
                      },
                    })
                  }
                  className="px-2 py-0.5 bg-white hover:bg-amber-50 text-amber-950 border border-amber-400 rounded text-[9px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  إبقاء نفس الاسم
                </button>
              </div>
            </div>
          )}
        </div>
      </td>

      {/* Grade Level */}
      <td className="py-1 px-1.5 border border-[#CBD5E1] whitespace-nowrap text-center">
        <div className="inline-grid items-center justify-items-center min-w-full">
          <span
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 px-1 py-1 text-[11px] font-bold whitespace-nowrap pointer-events-none"
          >
            {student.gradeLevel || 'الصف'}
          </span>
          <input
            type="text"
            value={student.gradeLevel}
            onFocus={(e) => onScoreCellFocus(e, student)}
            onClick={(e) => onScoreCellFocus(e, student)}
            onChange={(e) => onUpdateStudent(student.id, { gradeLevel: e.target.value })}
            placeholder="الصف"
            className="col-start-1 row-start-1 w-full min-w-0 px-1 py-1 border border-transparent hover:border-[#CBD5E1] focus:border-[#2B6CB0] focus:bg-white text-[11px] font-bold text-[#0F172A] focus:outline-none transition-colors text-center rounded-none sm:rounded-sm"
          />
        </div>
      </td>

      {/* Section */}
      <td className="py-1 px-0.5 text-center border border-[#CBD5E1] w-auto min-w-[34px] max-w-[48px] print:w-auto print:px-0">
        <input
          type="text"
          value={student.section}
          onFocus={(e) => onScoreCellFocus(e, student)}
          onClick={(e) => onScoreCellFocus(e, student)}
          onChange={(e) => onUpdateStudent(student.id, { section: e.target.value })}
          placeholder="أ"
          className="w-full text-center px-0.5 py-1 border border-transparent hover:border-[#CBD5E1] focus:border-[#2B6CB0] focus:bg-white text-xs font-bold text-[#1E293B] focus:outline-none transition-colors rounded-none sm:rounded-sm"
        />
      </td>

      {/* Subject Name Column - اسم المادة */}
      <td className="py-1 px-2 text-center border border-[#CBD5E1] whitespace-nowrap bg-blue-50/20">
        <span className="text-xs font-bold text-[#1E3A8A]">{subjectLabel}</span>
      </td>

      {/* Written Exam Input + Converted Score Display */}
      <td className="py-1 px-2.5 text-center border border-[#CBD5E1]">
        <div className="flex flex-col items-center justify-center gap-1">
          <input
            id={`score-input-${student.id}-written`}
            type="text"
            inputMode="none"
            readOnly={isVoiceScoreMode || shouldSuppressNativeKeyboard()}
            data-score-cell="true"
            value={formatScoreDisplay(student.writtenRawScore, numeralMode)}
            onTouchStart={(e) => {
              markTouchScoreInputInteraction(e.currentTarget);
            }}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                markTouchScoreInputInteraction(e.currentTarget);
              } else if (e.pointerType === 'mouse') {
                markMouseScoreInputInteraction(e.currentTarget, isVoiceScoreMode);
              }
            }}
            onFocus={(e) => {
              suppressFocusedScoreInputOnTouch(e.currentTarget);
              onScoreCellFocus(e, student);
              onOpenKeypadForWritten(student);
            }}
            onClick={(e) => {
              suppressFocusedScoreInputOnTouch(e.currentTarget);
              onScoreCellFocus(e, student);
              onOpenKeypadForWritten(student);
            }}
            onChange={(e) => {
              const rawVal = e.target.value
                .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
                .replace('،', '.')
                .replace(',', '.');
              const num = rawVal === '' ? null : Number(rawVal);
              onUpdateStudent(student.id, {
                writtenRawScore: isNaN(num as number) ? null : num,
              });
            }}
            placeholder={`/${formatScoreDisplay(currentModel.writtenMaxScore, numeralMode)}`}
            className={`w-16 px-1.5 py-1 text-center border rounded-lg text-sm font-bold transition-all bg-white cursor-pointer ${
              shouldSuppressNativeKeyboard() ? 'caret-transparent ' : ''
            }${
              isRowKeypadActive && activeKeypadColumnType === 'written'
                ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-50 shadow-md font-black text-amber-950 scale-105'
                : 'border-[#CBD5E1] text-[#1E293B] hover:border-[#94A3B8] focus:border-[#2B6CB0]'
            }`}
          />

          {/* Written score conversion display under the input number */}
          {writtenCalculated !== null &&
            (hasWrittenDecimal ? (
              <button
                type="button"
                onClick={onOpenRoundingModal}
                className="text-[11px] leading-tight font-bold text-[#1F5078] bg-[#DCE8F2] hover:bg-[#CFDFEC] border border-[#B8D2E7] px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xs transition-all active:scale-95"
                title="انقر لتعديل قاعدة جبر وتقريب الكسور العشرية"
              >
                {currentModel.roundingMode === 'none' ? (
                  <span>{formatScoreDisplay(writtenCalculated, numeralMode)} (بدون تقريب)</span>
                ) : (
                  <span>
                    <span className="font-black">
                      {formatScoreDisplay(writtenCalculated, numeralMode)}
                    </span>{' '}
                    تحتسب{' '}
                    <span className="font-black text-emerald-800 bg-white/90 px-1 py-0.2 rounded border border-emerald-300">
                      {formatScoreDisplay(roundedWrittenScore, numeralMode)}
                    </span>
                  </span>
                )}
              </button>
            ) : (
              writtenScoreMode === 'relative' &&
              effectiveWrittenWeight !== currentModel.writtenMaxScore && (
                <span
                  className="text-xs font-black text-[#2B6CB0] bg-[#EFF6FF] px-1.5 py-0.5 rounded-lg whitespace-nowrap"
                  title={`الدرجة المحسوبة (من ${effectiveWrittenWeight})`}
                >
                  = {formatScoreDisplay(writtenCalculated, numeralMode)}
                </span>
              )
            ))}
        </div>
      </td>

      {/* Optional Custom Columns (Oral, Behavior, Daily Participation, etc.) */}
      {(currentModel.customColumns || []).map((col) => {
        const val = student.scores[col.id];
        const history = student.participationHistory?.[col.id];
        const isExceeded = val !== null && val !== undefined && Number(val) > col.maxScore;

        const isParticipation =
          col.name.includes('مشارك') ||
          col.name.includes('نشاط') ||
          (history && history.length > 0);

        const historyList = history && history.length > 0 ? history : null;

        let displayPercentage: string | null = null;
        let multipleBreakdown: string | null = null;

        if (historyList && historyList.length > 0) {
          const avgPercentage = Math.round(
            historyList.reduce((acc, cur) => acc + cur.percentage, 0) / historyList.length
          );
          if (historyList.length === 1) {
            displayPercentage = `${historyList[0].percentage}%`;
          } else {
            displayPercentage = `${avgPercentage}%`;
            multipleBreakdown = historyList.map((h) => `${h.percentage}%`).join(' ، ');
          }
        } else if (
          val !== null &&
          val !== undefined &&
          !isNaN(Number(val)) &&
          col.maxScore > 0 &&
          isParticipation
        ) {
          const calculatedPct = Math.round((Number(val) / col.maxScore) * 100);
          displayPercentage = `${calculatedPct}%`;
        }

        if (col.isAttendance) {
          const records = student.attendanceRecords?.[col.id] || [];
          let absentCount = 0;
          let excusedCount = 0;
          let presentCount = 0;
          for (const r of records) {
            if (r.status === 'absent') absentCount++;
            else if (r.status === 'excused') excusedCount++;
            else if (r.status === 'present') presentCount++;
          }

          const cfg = col.attendanceConfig;
          let gradeDelta = 0;
          if (cfg && cfg.affectsGrade) {
            if (cfg.absent.action === 'deduct') gradeDelta -= absentCount * (cfg.absent.points || 0);
            else if (cfg.absent.action === 'add') gradeDelta += absentCount * (cfg.absent.points || 0);

            if (cfg.excused.action === 'deduct')
              gradeDelta -= excusedCount * (cfg.excused.points || 0);
            else if (cfg.excused.action === 'add')
              gradeDelta += excusedCount * (cfg.excused.points || 0);

            if (cfg.present.action === 'add') gradeDelta += presentCount * (cfg.present.points || 0);
            else if (cfg.present.action === 'deduct')
              gradeDelta -= presentCount * (cfg.present.points || 0);
          }

          return (
            <td key={col.id} className="py-1 px-1.5 text-center border border-[#CBD5E1]">
              <button
                type="button"
                onClick={() => onOpenAttendanceModal(student, col)}
                className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer bg-[#F5EFE2] hover:bg-[#EBDDC8] border border-[#D8CEBD] text-[#2F2822]"
                title="انقر لتسجيل الحضور، الغياب، أو الإجازة مع التاريخ واليوم"
              >
                {records.length === 0 ? (
                  <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>+ رصد</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-1 text-[11px]">
                    {absentCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded font-black text-[10px]">
                        غ: {formatScoreDisplay(absentCount, numeralMode)}
                      </span>
                    )}
                    {excusedCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded font-black text-[10px]">
                        م: {formatScoreDisplay(excusedCount, numeralMode)}
                      </span>
                    )}
                    {presentCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded font-black text-[10px]">
                        ح: {formatScoreDisplay(presentCount, numeralMode)}
                      </span>
                    )}
                    {cfg?.affectsGrade && gradeDelta !== 0 && (
                      <span
                        className={`text-[10px] font-black mr-0.5 ${
                          gradeDelta < 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        (
                        {gradeDelta > 0
                          ? `+${formatScoreDisplay(gradeDelta, numeralMode)}`
                          : formatScoreDisplay(gradeDelta, numeralMode)}
                        )
                      </span>
                    )}
                  </div>
                )}
              </button>
            </td>
          );
        }

        return (
          <td key={col.id} className="py-1 px-2 text-center border border-[#CBD5E1]">
            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <input
                id={`score-input-${student.id}-${col.id}`}
                type="text"
                inputMode="none"
                readOnly={isVoiceScoreMode || shouldSuppressNativeKeyboard()}
                data-score-cell="true"
                value={formatScoreDisplay(val, numeralMode)}
                onTouchStart={(e) => {
                  markTouchScoreInputInteraction(e.currentTarget);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                    markTouchScoreInputInteraction(e.currentTarget);
                  } else if (e.pointerType === 'mouse') {
                    markMouseScoreInputInteraction(e.currentTarget, isVoiceScoreMode);
                  }
                }}
                onFocus={(e) => {
                  suppressFocusedScoreInputOnTouch(e.currentTarget);
                  onScoreCellFocus(e, student);
                  onOpenKeypadForCustom(student, col);
                }}
                onClick={(e) => {
                  suppressFocusedScoreInputOnTouch(e.currentTarget);
                  onScoreCellFocus(e, student);
                  onOpenKeypadForCustom(student, col);
                }}
                onChange={(e) => {
                  const rawVal = e.target.value
                    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
                    .replace('،', '.')
                    .replace(',', '.');
                  onUpdateStudentCustomScore(student.id, col.id, rawVal);
                }}
                placeholder={`/${formatScoreDisplay(col.maxScore, numeralMode)}`}
                className={`w-14 px-1 py-1 text-center border rounded-lg text-sm font-black transition-all bg-white cursor-pointer ${
                  shouldSuppressNativeKeyboard() ? 'caret-transparent ' : ''
                }${
                  isRowKeypadActive &&
                  activeKeypadColumnType === 'custom' &&
                  activeKeypadColumnId === col.id
                    ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-50 shadow-md font-black text-amber-950 scale-105'
                    : isExceeded
                    ? 'border-red-300 text-red-600 bg-red-50'
                    : 'border-[#CBD5E1] text-[#1E293B] hover:border-[#94A3B8] focus:border-[#BA916C]'
                }`}
              />
              {displayPercentage && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100 border border-purple-300 text-purple-950 font-black text-xs shadow-2xs select-none"
                  title={
                    multipleBreakdown
                      ? `نسب المشاركة المسجلة للدروس:\n${multipleBreakdown}\nالمعدل: ${displayPercentage}`
                      : `نسبة المشاركة: ${displayPercentage}`
                  }
                >
                  <span>{formatScoreDisplay(displayPercentage, numeralMode)}</span>
                  {multipleBreakdown && (
                    <span className="text-[10px] text-purple-700 font-normal">
                      ({formatScoreDisplay(multipleBreakdown, numeralMode)})
                    </span>
                  )}
                </span>
              )}
            </div>
          </td>
        );
      })}

      {/* Divider Column Cell between Written / Custom Columns and Final Score */}
      <td className="w-16 border border-[#CBD5E1] bg-slate-50/40 text-center no-print print:hidden">
        <div className="w-px h-6 bg-slate-200 mx-auto" />
      </td>

      {/* Mandatory Final Monthly Score */}
      <td
        onClick={(e) => onScoreCellFocus(e, student, true)}
        className={`py-1 px-3 text-center font-black border border-[#CBD5E1] cursor-pointer transition-colors ${
          isRowCloudActive ? 'bg-amber-50/70' : 'hover:bg-slate-50/80'
        }`}
        title={`عرض اسم الطالب: ${student.name || 'بدون اسم'}`}
      >
        {totalMonthly !== null ? (
          <div className="flex flex-col items-center justify-center gap-0.5">
            <span className="text-sm sm:text-base font-black text-[#1E293B] px-2.5 py-0.5 bg-slate-100 rounded-lg inline-block min-w-[45px] border border-slate-200">
              {formatScoreDisplay(totalMonthly, numeralMode)}
            </span>
            {breakdown.hasOperation &&
              breakdown.baseScore !== null &&
              breakdown.baseScore !== totalMonthly && (
                <span
                  className="text-[10px] text-blue-700 font-bold"
                  title={`المجموع قبل العملية (${breakdown.operationLabel}): ${breakdown.baseScore}`}
                >
                  (الأصل: {formatScoreDisplay(breakdown.baseScore, numeralMode)})
                </span>
              )}
            {breakdown.isRounded && (
              <span
                className="text-[10px] text-[#854D0E] font-bold"
                title={`الدرجة قبل جبر الكسور كانت ${breakdown.rawScore}`}
              >
                (أصله: {formatScoreDisplay(breakdown.rawScore, numeralMode)})
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-xs">-</span>
        )}
      </td>

      {/* Rating Badge */}
      {showRatingColumn && (
        <td
          onClick={(e) => onScoreCellFocus(e, student, true)}
          className={`py-1 px-2 text-center border border-[#CBD5E1] animate-in fade-in cursor-pointer transition-colors ${
            isRowCloudActive ? 'bg-amber-50/70' : 'hover:bg-slate-50/80'
          }`}
          title={`عرض اسم الطالب: ${student.name || 'بدون اسم'}`}
        >
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${rating.badgeBg} ${rating.badgeText}`}
          >
            {rating.text}
          </span>
        </td>
      )}
    </tr>
  );
});

MonthlyStudentRow.displayName = 'MonthlyStudentRow';
