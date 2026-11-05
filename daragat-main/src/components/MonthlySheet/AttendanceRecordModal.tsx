import React, { useState } from 'react';
import {
  StudentRow,
  CustomColumn,
  AttendanceRecord,
  AttendanceStatus,
  MonthlyModel,
} from '../../types';
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  AlertCircle,
  FileText,
  History,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRow;
  column: CustomColumn;
  model: MonthlyModel;
  allModels: MonthlyModel[];
  onSaveRecords: (studentId: string, columnId: string, records: AttendanceRecord[]) => void;
}

const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

function getTodayArabicDay(): string {
  const dayIndex = new Date().getDay();
  return ARABIC_DAYS[dayIndex] || 'الأحد';
}

function getTodayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const AttendanceRecordModal: React.FC<Props> = ({
  isOpen,
  onClose,
  student,
  column,
  model,
  allModels,
  onSaveRecords,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'cumulative'>('current');
  const [selectedDay, setSelectedDay] = useState<string>(getTodayArabicDay);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr);
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const currentRecords = student.attendanceRecords?.[column.id] || [];
  const cfg = column.attendanceConfig;

  // Counts for current month
  let currentAbsent = 0;
  let currentExcused = 0;
  let currentPresent = 0;

  for (const r of currentRecords) {
    if (r.status === 'absent') currentAbsent++;
    else if (r.status === 'excused') currentExcused++;
    else if (r.status === 'present') currentPresent++;
  }

  // Calculate grade effect for current student
  let currentEffect = 0;
  if (cfg && cfg.affectsGrade) {
    if (cfg.absent.action === 'deduct') currentEffect -= currentAbsent * (cfg.absent.points || 0);
    else if (cfg.absent.action === 'add') currentEffect += currentAbsent * (cfg.absent.points || 0);

    if (cfg.excused.action === 'deduct') currentEffect -= currentExcused * (cfg.excused.points || 0);
    else if (cfg.excused.action === 'add') currentEffect += currentExcused * (cfg.excused.points || 0);

    if (cfg.present.action === 'add') currentEffect += currentPresent * (cfg.present.points || 0);
    else if (cfg.present.action === 'deduct') currentEffect -= currentPresent * (cfg.present.points || 0);
  }

  // Handle adding an attendance entry
  const handleAddRecord = (status: AttendanceStatus) => {
    const newRecord: AttendanceRecord = {
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: selectedDate,
      dayName: selectedDay,
      status,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
      modelId: model.id,
      modelName: model.name,
    };

    const updated = [...currentRecords, newRecord];
    onSaveRecords(student.id, column.id, updated);
    setNote('');
  };

  const handleDeleteRecord = (recordId: string) => {
    const updated = currentRecords.filter((r) => r.id !== recordId);
    onSaveRecords(student.id, column.id, updated);
  };

  // Cumulative Attendance from the beginning of the school year across ALL models
  const cumulativeRecords: Array<AttendanceRecord & { sourceModelName: string }> = [];
  let cumAbsent = 0;
  let cumExcused = 0;
  let cumPresent = 0;

  allModels.forEach((m) => {
    const stInModel = m.students?.find(
      (s) => s.id === student.id || s.name.trim() === student.name.trim()
    );
    if (!stInModel || !stInModel.attendanceRecords) return;

    for (const [colId, recs] of Object.entries(stInModel.attendanceRecords)) {
      // Find matching attendance column in that model
      const mCol = (m.customColumns || []).find((c) => c.id === colId && c.isAttendance);
      if (mCol && Array.isArray(recs)) {
        for (const rec of recs) {
          cumulativeRecords.push({
            ...rec,
            sourceModelName: m.name,
          });
          if (rec.status === 'absent') cumAbsent++;
          else if (rec.status === 'excused') cumExcused++;
          else if (rec.status === 'present') cumPresent++;
        }
      }
    }
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 font-['Cairo',sans-serif]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-l from-[#355E45] to-[#477C5E] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Calendar className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                رصد الحضور والغياب: {student.name || 'طالب'}
              </h3>
              <p className="text-xs text-emerald-100 flex items-center gap-2 mt-0.5 font-bold">
                <span>{model.name}</span>
                <span>•</span>
                <span>{student.gradeLevel || 'الصف'}</span>
                <span>•</span>
                <span>شعبة {student.section || 'أ'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-[#D8CEBD] bg-[#F5EFE2] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-black transition-all border-b-2 cursor-pointer ${
              activeTab === 'current'
                ? 'border-[#355E45] text-[#355E45]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            سجل الشهر الحالي ({model.name})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cumulative')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cumulative'
                ? 'border-[#355E45] text-[#355E45]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-amber-700" />
            <span>السجل التراكمي (من بداية الدوام)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'current' ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* Present Card */}
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>حاضر</span>
                  </div>
                  <div className="text-xl font-black text-emerald-950 mt-1">
                    {currentPresent} <span className="text-xs font-semibold">يوم</span>
                  </div>
                  {cfg?.affectsGrade && cfg.present.action !== 'none' && (
                    <div className="text-[10px] text-emerald-700 mt-0.5 font-bold">
                      {cfg.present.action === 'add' ? `+${cfg.present.points}` : `-${cfg.present.points}`} للدرجة
                    </div>
                  )}
                </div>

                {/* Excused Card */}
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <div className="text-[11px] font-bold text-blue-800 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>مجاز</span>
                  </div>
                  <div className="text-xl font-black text-blue-950 mt-1">
                    {currentExcused} <span className="text-xs font-semibold">يوم</span>
                  </div>
                  {cfg?.affectsGrade && cfg.excused.action !== 'none' && (
                    <div className="text-[10px] text-blue-700 mt-0.5 font-bold">
                      {cfg.excused.action === 'deduct' ? `-${cfg.excused.points}` : `+${cfg.excused.points}`} للدرجة
                    </div>
                  )}
                </div>

                {/* Absent Card */}
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                  <div className="text-[11px] font-bold text-rose-800 flex items-center justify-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>غائب</span>
                  </div>
                  <div className="text-xl font-black text-rose-950 mt-1">
                    {currentAbsent} <span className="text-xs font-semibold">يوم</span>
                  </div>
                  {cfg?.affectsGrade && cfg.absent.action !== 'none' && (
                    <div className="text-[10px] text-rose-700 mt-0.5 font-bold">
                      {cfg.absent.action === 'deduct' ? `-${cfg.absent.points}` : `+${cfg.absent.points}`} للدرجة
                    </div>
                  )}
                </div>
              </div>

              {/* Grade Impact Notification Banner */}
              {cfg?.affectsGrade && (
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    currentEffect < 0
                      ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                      : currentEffect > 0
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {currentEffect < 0 ? (
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                    ) : currentEffect > 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-500" />
                    )}
                    <span>التأثير الحالي على الدرجة النهائية للطالب:</span>
                  </div>
                  <span className="text-sm font-black">
                    {currentEffect > 0 ? `+${currentEffect}` : currentEffect} درجة
                  </span>
                </div>
              )}

              {/* Recording Action Box */}
              <div className="p-4 bg-white rounded-2xl border border-[#D8CEBD] shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                  <h4 className="text-xs font-bold text-[#2F2822]">تسجيل حضور أو غياب أو إجازة لليوم</h4>
                  <span className="text-[11px] text-[#7A6E5F] font-semibold">اختر الحالة للتسجيل المباشر</span>
                </div>

                {/* Day and Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      يوم الغياب / الإجازة
                    </label>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                    >
                      {ARABIC_DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تاريخ اليوم
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="ملاحظة اختيارية (عذر طبي، استئذان ولي أمر...)"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* 3 Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {/* Present Button */}
                  <button
                    type="button"
                    onClick={() => handleAddRecord('present')}
                    className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تسجيل حاضر</span>
                  </button>

                  {/* Excused Button */}
                  <button
                    type="button"
                    onClick={() => handleAddRecord('excused')}
                    className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>تسجيل مجاز (إجازة)</span>
                  </button>

                  {/* Absent Button */}
                  <button
                    type="button"
                    onClick={() => handleAddRecord('absent')}
                    className="py-2.5 px-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>تسجيل غائب (غياب)</span>
                  </button>
                </div>
              </div>

              {/* Records List for this Month */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    تواريخ الغيابات والإجازات المسجلة ({currentRecords.length} سجل)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    تظهر الأيام والتواريخ الموثقة
                  </span>
                </div>

                {currentRecords.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[#D8CEBD] text-center text-xs text-slate-500 bg-white/60">
                    لا توجد غيابات أو إجازات مسجلة لهذا الطالب حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {currentRecords.map((rec) => {
                      const isAbsent = rec.status === 'absent';
                      const isExcused = rec.status === 'excused';

                      return (
                        <div
                          key={rec.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                            isAbsent
                              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                              : isExcused
                              ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black text-white ${
                                isAbsent
                                  ? 'bg-rose-600'
                                  : isExcused
                                  ? 'bg-blue-600'
                                  : 'bg-emerald-600'
                              }`}
                            >
                              {isAbsent ? 'غائب' : isExcused ? 'مجاز' : 'حاضر'}
                            </span>
                            <div className="font-bold">
                              <span>يوم {rec.dayName}</span>
                              <span className="mx-1 text-slate-400">•</span>
                              <span dir="ltr" className="font-mono text-[11px]">
                                {rec.date}
                              </span>
                              {rec.note && (
                                <span className="mr-2 text-[11px] text-slate-600 font-normal">
                                  ({rec.note})
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                            title="حذف هذا السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Cumulative Tab across all months */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2">
                  <History className="w-4 h-4 text-amber-700" />
                  <span>إجمالي الحضور والغياب والإجازات من بداية الدوام الدراسي</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-slate-500 block">إجمالي الغيابات</span>
                    <span className="text-lg font-black text-rose-600">{cumAbsent} يوم</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-slate-500 block">إجمالي الإجازات</span>
                    <span className="text-lg font-black text-blue-600">{cumExcused} يوم</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-slate-500 block">إجمالي الحضور</span>
                    <span className="text-lg font-black text-emerald-600">{cumPresent} يوم</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">
                  تفاصيل السجلات الموثقة عبر كافة الجداول والأشهر ({cumulativeRecords.length} سجل)
                </h4>

                {cumulativeRecords.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 bg-white">
                    لا توجد سجلات تراكمية حتى الآن لهذا الطالب في أي جدول.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {cumulativeRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black text-white ${
                              rec.status === 'absent'
                                ? 'bg-rose-600'
                                : rec.status === 'excused'
                                ? 'bg-blue-600'
                                : 'bg-emerald-600'
                            }`}
                          >
                            {rec.status === 'absent' ? 'غائب' : rec.status === 'excused' ? 'مجاز' : 'حاضر'}
                          </span>
                          <span className="font-bold text-slate-800">
                            يوم {rec.dayName} ({rec.date})
                          </span>
                          {rec.note && (
                            <span className="text-[11px] text-slate-500 font-normal">
                              - {rec.note}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#BA916C] bg-[#FAF3E0] px-2 py-0.5 rounded-md border border-[#BA916C]/30">
                          {rec.sourceModelName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#F8F4EA] border-t border-[#E0D5C3] flex items-center justify-between">
          <span className="text-[11px] text-slate-600 font-semibold">
            {cfg?.affectsGrade
              ? '✓ حقل الغياب مرتبط بالدرجة النهائية للطالب'
              : 'حقل الغياب توثيقي ولا يؤثر على الدرجات'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 craft-btn-primary text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            إغلاق وتم
          </button>
        </div>
      </div>
    </div>
  );
};
