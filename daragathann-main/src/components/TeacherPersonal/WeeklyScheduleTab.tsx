import React, { useState, useMemo } from 'react';
import {
  WeeklyScheduleData,
  WeekdayKey,
  SchedulePeriod,
  ClassWeeklySchedule,
} from '../../types/teacherPersonal';
import {
  WEEKDAYS_META,
  DEFAULT_PERIODS,
  getTodayWeekdayKey,
} from '../../utils/teacherPersonalStorage';
import { triggerPrint } from '../../utils/printHelper';
import {
  Plus,
  Trash2,
  Printer,
  Pencil,
  Clock,
  Check,
  X,
  CalendarDays,
  Save,
  ListChecks,
  FilePlus2,
  AlertCircle,
} from 'lucide-react';

interface Props {
  schedule: WeeklyScheduleData;
  onChange: (next: WeeklyScheduleData) => void;
  suggestedGrades: string[];
  suggestedSections: string[];
  suggestedSubjects: string[];
  teacherName?: string;
}

export const WeeklyScheduleTab: React.FC<Props> = ({
  schedule,
  onChange,
  suggestedGrades,
  suggestedSections,
  suggestedSubjects,
  teacherName,
}) => {
  const todayKey = useMemo(() => getTodayWeekdayKey(), []);

  const gradeLevel = schedule.draftGradeLevel ?? '';
  const section = schedule.draftSection ?? '';
  const cells = schedule.draftCells ?? {};
  const savedSchedules = schedule.savedSchedules ?? [];

  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [isSavedListModalOpen, setIsSavedListModalOpen] = useState(false);

  // Period Editor State
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [periodLabelInput, setPeriodLabelInput] = useState('');
  const [periodTimeInput, setPeriodTimeInput] = useState('');

  const visibleDays = useMemo(() => {
    return WEEKDAYS_META.filter((d) => {
      if (d.key === 'fri') return schedule.showFriday;
      if (d.key === 'sat') return schedule.showSaturday;
      return true;
    });
  }, [schedule.showFriday, schedule.showSaturday]);

  const updateDraftField = (patch: Partial<WeeklyScheduleData>) => {
    setValidationError(null);
    onChange({
      ...schedule,
      ...patch,
    });
  };

  const handleCellChange = (day: WeekdayKey, periodId: string, value: string) => {
    const key = `${day}::${periodId}`;
    const nextCells = { ...cells };
    if (value === '') {
      delete nextCells[key];
    } else {
      nextCells[key] = value;
    }
    onChange({
      ...schedule,
      draftCells: nextCells,
    });
  };

  const handleSaveSchedule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanGrade = gradeLevel.trim();
    const cleanSection = section.trim();

    if (!cleanGrade) {
      setValidationError('يرجى إدخال اسم الصف الدراسي في الأعلى قبل حفظ الجدول.');
      const gradeEl = document.getElementById('schedule-grade-input');
      if (gradeEl) {
        gradeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        gradeEl.focus();
      }
      return;
    }

    const effectiveSection = cleanSection || 'بدون شعبة';
    const nowIso = new Date().toISOString();

    // Check if updating active schedule or matching existing grade+section
    const existingByMatch = savedSchedules.find(
      (item) =>
        item.id === schedule.activeScheduleId ||
        (item.gradeLevel.trim().toLowerCase() === cleanGrade.toLowerCase() &&
          item.section.trim().toLowerCase() === effectiveSection.toLowerCase())
    );

    const scheduleId = existingByMatch?.id || `cls-sched-${Date.now()}`;
    const cleanedCells: Record<string, string> = {};
    Object.entries(cells).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim() !== '') {
        cleanedCells[k] = v;
      }
    });

    const record: ClassWeeklySchedule = {
      id: scheduleId,
      gradeLevel: cleanGrade,
      section: effectiveSection,
      periods: schedule.periods.map((p) => ({ ...p })),
      cells: cleanedCells,
      showSaturday: schedule.showSaturday,
      showFriday: schedule.showFriday,
      updatedAt: nowIso,
    };

    const nextSavedList = existingByMatch
      ? savedSchedules.map((item) => (item.id === existingByMatch.id ? record : item))
      : [record, ...savedSchedules];

    setValidationError(null);
    onChange({
      ...schedule,
      activeScheduleId: scheduleId,
      draftGradeLevel: cleanGrade,
      draftSection: cleanSection,
      draftCells: cleanedCells,
      savedSchedules: nextSavedList,
    });

    setSavedToast(`تم حفظ جدول (${cleanGrade}${cleanSection ? ` - شعبة ${cleanSection}` : ''})`);
    window.setTimeout(() => setSavedToast(null), 3000);

    // Automatically open the unified popup list of saved classes & sections
    setIsSavedListModalOpen(true);
  };

  const handleSelectSavedSchedule = (item: ClassWeeklySchedule) => {
    setValidationError(null);
    onChange({
      ...schedule,
      activeScheduleId: item.id,
      draftGradeLevel: item.gradeLevel,
      draftSection: item.section === 'بدون شعبة' ? '' : item.section,
      draftCells: { ...item.cells },
      periods:
        item.periods && item.periods.length > 0
          ? item.periods.map((p) => ({ ...p }))
          : DEFAULT_PERIODS.map((p) => ({ ...p })),
      showSaturday: Boolean(item.showSaturday),
      showFriday: Boolean(item.showFriday),
    });
    setIsSavedListModalOpen(false);
  };

  const handleCreateNewBlankSchedule = () => {
    setValidationError(null);
    onChange({
      ...schedule,
      activeScheduleId: null,
      draftGradeLevel: '',
      draftSection: '',
      draftCells: {},
    });
    setIsSavedListModalOpen(false);
  };

  const handleDeleteSavedSchedule = (
    e: React.MouseEvent,
    targetId: string
  ) => {
    e.stopPropagation();
    const nextList = savedSchedules.filter((item) => item.id !== targetId);
    const isDeletingActive = schedule.activeScheduleId === targetId;
    onChange({
      ...schedule,
      activeScheduleId: isDeletingActive ? null : schedule.activeScheduleId,
      savedSchedules: nextList,
    });
  };

  const handleAddPeriod = () => {
    const nextNum = schedule.periods.length + 1;
    const newPeriod: SchedulePeriod = {
      id: `p-${Date.now()}`,
      label: `الحصة ${nextNum}`,
      timeRange: '00:00 - 00:45',
    };
    onChange({
      ...schedule,
      periods: [...schedule.periods, newPeriod],
    });
  };

  const startEditPeriod = (p: SchedulePeriod) => {
    setEditingPeriodId(p.id);
    setPeriodLabelInput(p.label);
    setPeriodTimeInput(p.timeRange);
  };

  const saveEditPeriod = () => {
    if (!editingPeriodId) return;
    onChange({
      ...schedule,
      periods: schedule.periods.map((p) =>
        p.id === editingPeriodId
          ? {
              ...p,
              label: periodLabelInput.trim() || p.label,
              timeRange: periodTimeInput.trim() || p.timeRange,
            }
          : p
      ),
    });
    setEditingPeriodId(null);
  };

  const deletePeriod = (periodId: string) => {
    if (schedule.periods.length <= 1) return;
    const nextCells = { ...cells };
    Object.keys(nextCells).forEach((k) => {
      if (k.endsWith(`::${periodId}`)) delete nextCells[k];
    });
    onChange({
      ...schedule,
      periods: schedule.periods.filter((p) => p.id !== periodId),
      draftCells: nextCells,
    });
  };

  const handlePrintSchedule = () => {
    document.body.classList.add('printing-personal-schedule');
    const cleanup = () => {
      document.body.classList.remove('printing-personal-schedule');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    triggerPrint();
    window.setTimeout(cleanup, 2500);
  };

  const countFilledLessons = (itemCells: Record<string, string>) =>
    Object.values(itemCells || {}).filter((v) => v && v.trim() !== '').length;

  return (
    <div className="space-y-4">
      {/* Top Form: Grade Level + Section Inputs + Save & Saved List Controls */}
      <form
        onSubmit={handleSaveSchedule}
        className="bg-white rounded-2xl border border-[#D5C8B2] p-3.5 sm:p-4 space-y-3 no-print"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          {/* Grade & Section Direct Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <div>
              <label
                htmlFor="schedule-grade-input"
                className="block text-xs font-black text-[#2F2822] mb-1"
              >
                الصف الدراسي
              </label>
              <input
                id="schedule-grade-input"
                type="text"
                list="personal-grade-suggestions"
                value={gradeLevel}
                onChange={(e) =>
                  updateDraftField({ draftGradeLevel: e.target.value })
                }
                placeholder="مثال: الأول متوسط، الرابع العلمي..."
                className="w-full px-3 py-2 text-sm font-bold bg-[#FAF7EC] border border-[#C2A88F] rounded-xl focus:outline-none focus:border-[#8C6544]"
              />
              <datalist id="personal-grade-suggestions">
                {suggestedGrades.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="schedule-section-input"
                className="block text-xs font-black text-[#2F2822] mb-1"
              >
                الشعبة
              </label>
              <input
                id="schedule-section-input"
                type="text"
                list="personal-section-suggestions"
                value={section}
                onChange={(e) =>
                  updateDraftField({ draftSection: e.target.value })
                }
                placeholder="مثال: أ، ب، ج..."
                className="w-full px-3 py-2 text-sm font-bold bg-[#FAF7EC] border border-[#C2A88F] rounded-xl focus:outline-none focus:border-[#8C6544]"
              />
              <datalist id="personal-section-suggestions">
                {suggestedSections.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Top Secondary Actions: Open Saved List, New Blank Schedule */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSavedListModalOpen(true)}
              className="px-3.5 py-2 bg-[#EFE8D8] hover:bg-[#E5DAC4] text-[#2F2822] border border-[#C2A88F] rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ListChecks className="w-4 h-4 text-[#8C6544]" />
              <span>
                الجداول المحفوظة
                {savedSchedules.length > 0 ? ` (${savedSchedules.length})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCreateNewBlankSchedule}
              className="px-3 py-2 bg-white hover:bg-[#FAF6EC] text-[#554A3E] border border-[#D5C8B2] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="بدء جدول جديد لصف وشعبة أخرى"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-[#8C6544]" />
              <span>جدول جديد</span>
            </button>
          </div>
        </div>
      </form>

      {/* Secondary Toolbar: Days Toggle, Add Period, Print */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 no-print">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B5E51]">
          <span className="font-bold text-[#2F2822]">أيام إضافية:</span>
          <button
            type="button"
            onClick={() =>
              onChange({ ...schedule, showSaturday: !schedule.showSaturday })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              schedule.showSaturday
                ? 'bg-[#2F2822] text-white border-[#2F2822]'
                : 'bg-white text-[#554A3E] border-[#D5C8B2] hover:bg-[#FAF6EC]'
            }`}
          >
            السبت
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({ ...schedule, showFriday: !schedule.showFriday })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              schedule.showFriday
                ? 'bg-[#2F2822] text-white border-[#2F2822]'
                : 'bg-white text-[#554A3E] border-[#D5C8B2] hover:bg-[#FAF6EC]'
            }`}
          >
            الجمعة
          </button>
          <span className="hidden sm:inline text-[#A08E7B] mx-1">·</span>
          <span className="hidden sm:inline font-semibold">
            اكتب اسم الدرس أو المادة مباشرة داخل أي خانة في الجدول
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddPeriod}
            className="px-3 py-1.5 bg-white hover:bg-[#FAF6EC] text-[#2F2822] border border-[#C2A88F] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#8C6544]" />
            <span>إضافة حصة</span>
          </button>
          <button
            type="button"
            onClick={handlePrintSchedule}
            className="px-3 py-1.5 bg-white hover:bg-[#FAF6EC] text-[#2F2822] border border-[#C2A88F] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-[#5692BE]" />
            <span>طباعة الجدول</span>
          </button>
        </div>
      </div>

      {/* Datalist for fast browser autocomplete when typing subjects manually */}
      <datalist id="personal-direct-subjects">
        {suggestedSubjects.map((sub) => (
          <option key={sub} value={sub} />
        ))}
      </datalist>

      {/* Print-only Header */}
      <div className="hidden print:block text-center pb-3 border-b border-slate-300 mb-3">
        <h2 className="text-lg font-black text-black flex items-center justify-center gap-2">
          <CalendarDays className="w-5 h-5" />
          <span>
            الجدول الأسبوعي للدروس
            {gradeLevel.trim() ? ` — ${gradeLevel.trim()}` : ''}
            {section.trim() ? ` (شعبة ${section.trim()})` : ''}
          </span>
        </h2>
        {teacherName && (
          <p className="text-xs font-bold text-slate-700 mt-1">
            الأستاذ / المعلم: {teacherName}
          </p>
        )}
      </div>

      {/* Direct Manual-Entry Weekly Timetable Grid */}
      <div className="overflow-x-auto print:overflow-visible rounded-xl border border-[#D5C8B2] bg-white">
        <table className="w-full text-right border-collapse min-w-[700px] print:min-w-0">
          <thead>
            <tr className="bg-[#EFE8D8] text-[#2F2822] text-xs font-black border-b border-[#D5C8B2]">
              <th className="py-3 px-2.5 w-32 border-l border-[#D5C8B2] text-center bg-[#E8D7C2]">
                الحصة / الوقت
              </th>
              {visibleDays.map((day) => {
                const isToday = day.key === todayKey;
                return (
                  <th
                    key={day.key}
                    className={`py-3 px-2 text-center border-l last:border-l-0 border-[#D5C8B2] ${
                      isToday ? 'bg-[#DCE8F2] text-[#1E3A5F]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{day.label}</span>
                      {isToday && (
                        <span className="text-[10px] font-bold text-[#2B6CB0] no-print">
                          · اليوم
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8DEC9]">
            {schedule.periods.map((period) => (
              <tr key={period.id} className="align-middle">
                {/* Period Name & Time Column */}
                <td className="p-2 border-l border-[#D5C8B2] bg-[#FAF6EC] text-center">
                  {editingPeriodId === period.id ? (
                    <div className="space-y-1.5 text-right no-print">
                      <input
                        type="text"
                        value={periodLabelInput}
                        onChange={(e) => setPeriodLabelInput(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-bold bg-white border border-[#BA916C] rounded-lg focus:outline-none"
                        placeholder="اسم الحصة"
                      />
                      <input
                        type="text"
                        value={periodTimeInput}
                        onChange={(e) => setPeriodTimeInput(e.target.value)}
                        dir="ltr"
                        className="w-full px-2 py-1 text-[11px] font-mono tabular-nums bg-white border border-[#D5C8B2] rounded-lg text-center focus:outline-none"
                        placeholder="08:00 - 08:45"
                      />
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={saveEditPeriod}
                          className="p-1 bg-[#4E7A68] text-white rounded-md cursor-pointer"
                          title="حفظ"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPeriodId(null)}
                          className="p-1 bg-slate-200 text-slate-700 rounded-md cursor-pointer"
                          title="إلغاء"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex flex-col items-center gap-0.5">
                      <span className="text-xs font-black text-[#2F2822]">
                        {period.label}
                      </span>
                      <span
                        dir="ltr"
                        className="text-[11px] text-[#6B5E51] font-mono tabular-nums flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3 text-[#9C7756] no-print" />
                        <span>{period.timeRange}</span>
                      </span>
                      <div className="flex items-center gap-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-0.5 no-print">
                        <button
                          type="button"
                          onClick={() => startEditPeriod(period)}
                          className="p-1 text-[#6B5E51] hover:text-[#2F2822] hover:bg-[#EFE8D8] rounded cursor-pointer"
                          title="تعديل اسم ووقت الحصة"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {schedule.periods.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deletePeriod(period.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                            title="حذف الحصة"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </td>

                {/* Direct Manual Input Cells */}
                {visibleDays.map((day) => {
                  const cellKey = `${day.key}::${period.id}`;
                  const cellValue = cells[cellKey] || '';
                  const hasValue = cellValue.trim() !== '';
                  const isToday = day.key === todayKey;

                  return (
                    <td
                      key={`${day.key}-${period.id}`}
                      className={`p-1.5 border-l last:border-l-0 border-[#E8DEC9] min-w-[120px] ${
                        isToday ? 'bg-[#F5F9FC]' : ''
                      }`}
                    >
                      {/* Interactive Direct Input */}
                      <textarea
                        rows={2}
                        value={cellValue}
                        onChange={(e) =>
                          handleCellChange(day.key, period.id, e.target.value)
                        }
                        placeholder="اكتب الدرس..."
                        aria-label={`${day.label} - ${period.label}`}
                        className={`w-full px-2 py-1.5 text-xs font-bold text-center rounded-xl border transition-colors resize-none leading-snug focus:outline-none print:hidden ${
                          hasValue
                            ? 'bg-[#FAF3E8] border-[#C8AA87] text-[#2F2822] focus:border-[#8C6544] focus:bg-white'
                            : 'bg-transparent border-transparent hover:border-[#DFD4C0] hover:bg-[#FAF6EC]/60 focus:border-[#BA916C] focus:bg-white text-[#2F2822] placeholder:text-[#C4B6A4] placeholder:font-normal'
                        }`}
                      />
                      {/* Print-friendly full text block */}
                      <div className="hidden print:block text-xs font-bold text-black text-center whitespace-pre-wrap py-1">
                        {cellValue}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline Feedback + Full-Width Longitudinal Save Button Below Table (never overlaps last row) */}
      <div className="pt-2 space-y-2.5 no-print">
        {validationError && (
          <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        {savedToast && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
            <Check className="w-4 h-4 shrink-0" />
            <span>{savedToast}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => handleSaveSchedule()}
          className="w-full py-3.5 px-6 craft-btn-primary rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99] transition-all"
        >
          <Save className="w-5 h-5" />
          <span>حفظ الجدول الأسبوعي</span>
        </button>
      </div>

      {/* Unified Popup Modal Displaying All Saved Classes & Sections */}
      {isSavedListModalOpen && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-in fade-in duration-150 no-print"
          dir="rtl"
          onClick={() => setIsSavedListModalOpen(false)}
        >
          <div
            className="bg-[#FAF7EC] rounded-2xl border border-[#AA8362] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popup Header */}
            <div className="px-5 py-4 bg-[#2F2822] text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <ListChecks className="w-5 h-5 text-[#E8C59B] shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-black truncate">
                    الجداول الأسبوعية المحفوظة
                  </h4>
                  <p className="text-[11px] text-[#D8CEBD] truncate">
                    اضغط على أي صف وشعبة لعرض الجدول الخاص به
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSavedListModalOpen(false)}
                className="p-1.5 text-[#D8CEBD] hover:text-white hover:bg-white/10 rounded-lg cursor-pointer shrink-0"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Single Unified List of Classes + Sections */}
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 bg-white">
              {savedSchedules.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm font-black text-[#2F2822]">
                    لا توجد جداول محفوظة بعد
                  </p>
                  <p className="text-xs text-[#6B5E51]">
                    أدخل الصف والشعبة واكتب الدروس في الجدول ثم اضغط «حفظ الجدول».
                  </p>
                </div>
              ) : (
                savedSchedules.map((item) => {
                  const isActive = item.id === schedule.activeScheduleId;
                  const lessonsCount = countFilledLessons(item.cells);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSavedSchedule(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectSavedSchedule(item);
                        }
                      }}
                      className={`w-full text-right p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-[#F5EBDC] border-[#BA916C] shadow-2xs'
                          : 'bg-[#FAF7EC] border-[#E5DAC7] hover:border-[#BA916C] hover:bg-[#F8F1E5]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-[#2F2822] truncate">
                          {item.gradeLevel}
                          {item.section && item.section !== 'بدون شعبة'
                            ? ` — شعبة ${item.section}`
                            : ''}
                        </div>
                        <div className="text-[11px] text-[#6B5E51] mt-0.5 tabular-nums flex items-center gap-1.5">
                          <span>{lessonsCount} حصة مسجلة</span>
                          {isActive && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-bold text-[#8C6544]">معروض حالياً</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedSchedule(e, item.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف هذا الجدول المحفوظ"
                          aria-label="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Popup Footer */}
            <div className="px-4 py-3 bg-[#F8F4EA] border-t border-[#D5C8B2] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCreateNewBlankSchedule}
                className="px-3.5 py-2 bg-white hover:bg-[#EFE8D8] text-[#2F2822] border border-[#C2A88F] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FilePlus2 className="w-3.5 h-3.5 text-[#8C6544]" />
                <span>إضافة صف وشعبة جديدة</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSavedListModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#554A3E] hover:bg-[#EFE8D8] rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
