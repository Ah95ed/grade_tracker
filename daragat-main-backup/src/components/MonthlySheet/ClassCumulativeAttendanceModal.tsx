import React, { useState, useMemo } from 'react';
import { MonthlyModel, StudentRow } from '../../types';
import { X, Calendar, Search, Printer, FileSpreadsheet, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { isGradeLevelMatch, isSectionMatch } from '../../utils/gradeAndSectionMatcher';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentModel: MonthlyModel;
  allModels: MonthlyModel[];
  selectedGradeLevel?: string;
  selectedSection?: string;
}

export const ClassCumulativeAttendanceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentModel,
  allModels,
  selectedGradeLevel = 'ALL',
  selectedSection = 'ALL',
}) => {
  const [search, setSearch] = useState('');

  // Collect all students for this grade/section and their cumulative attendance counts across ALL models
  const studentsAttendance = useMemo(() => {
    const effectiveGrade = currentModel.gradeLevel || selectedGradeLevel;
    const studentsMap = new Map<
      string,
      {
        id: string;
        name: string;
        gradeLevel: string;
        section: string;
        totalAbsent: number;
        totalExcused: number;
        totalPresent: number;
        byMonth: Record<string, { absent: number; excused: number; present: number }>;
      }
    >();

    // Seed students from currentModel or all models
    const studentList = currentModel.students || [];
    studentList.forEach((st) => {
      const matchGrade =
        !effectiveGrade || effectiveGrade === 'ALL' || isGradeLevelMatch(st.gradeLevel, effectiveGrade);
      const matchSec = isSectionMatch(st.section, selectedSection);
      if (!matchGrade || !matchSec) return;

      studentsMap.set(st.name.trim(), {
        id: st.id,
        name: st.name,
        gradeLevel: st.gradeLevel,
        section: st.section,
        totalAbsent: 0,
        totalExcused: 0,
        totalPresent: 0,
        byMonth: {},
      });
    });

    // Aggregate attendance from all models
    allModels.forEach((m) => {
      (m.students || []).forEach((st) => {
        const key = st.name.trim();
        const existing = studentsMap.get(key);
        if (!existing) return;

        let mAbsent = 0;
        let mExcused = 0;
        let mPresent = 0;

        if (st.attendanceRecords) {
          for (const recs of Object.values(st.attendanceRecords)) {
            if (Array.isArray(recs)) {
              for (const r of recs) {
                if (r.status === 'absent') {
                  mAbsent++;
                  existing.totalAbsent++;
                } else if (r.status === 'excused') {
                  mExcused++;
                  existing.totalExcused++;
                } else if (r.status === 'present') {
                  mPresent++;
                  existing.totalPresent++;
                }
              }
            }
          }
        }

        existing.byMonth[m.name] = {
          absent: mAbsent,
          excused: mExcused,
          present: mPresent,
        };
      });
    });

    const list = Array.from(studentsMap.values());
    // Sort by highest absences first
    list.sort((a, b) => b.totalAbsent - a.totalAbsent);
    return list;
  }, [currentModel, allModels, selectedGradeLevel, selectedSection]);

  if (!isOpen) return null;

  const filtered = studentsAttendance.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 font-['Cairo',sans-serif]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-l from-[#2D5A43] to-[#3E7D5D] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Calendar className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                سجل الغيابات والإجازات التراكمي لجميع الطلاب (من بداية الدوام)
              </h3>
              <p className="text-xs text-emerald-100 flex items-center gap-2 mt-0.5 font-bold">
                <span>{currentModel.gradeLevel || (selectedGradeLevel === 'ALL' ? 'كافة الصفوف' : selectedGradeLevel)}</span>
                <span>•</span>
                <span>{selectedSection === 'ALL' ? 'جميع الشُعب' : `شعبة ${selectedSection}`}</span>
                <span>•</span>
                <span>إجمالي {studentsAttendance.length} طالب</span>
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

        {/* Toolbar: Search & Print */}
        <div className="p-3 bg-white border-b border-[#D8CEBD] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث باسم الطالب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>طباعة التقرير</span>
          </button>
        </div>

        {/* Table Body */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="border border-[#D8CEBD] rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#EFE8D8] text-[#2F2822] font-black border-b border-[#D8CEBD]">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">اسم الطالب</th>
                  <th className="py-2.5 px-2 text-center w-20">الصف</th>
                  <th className="py-2.5 px-2 text-center w-14">الشعبة</th>
                  <th className="py-2.5 px-3 text-center bg-rose-50 text-rose-900 min-w-[80px]">
                    <div className="flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>الغيابات</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center bg-blue-50 text-blue-900 min-w-[80px]">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>الإجازات</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center bg-emerald-50 text-emerald-900 min-w-[80px]">
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>الحضور</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      لا يوجد طلاب مطابقين للبحث.
                    </td>
                  </tr>
                ) : (
                  filtered.map((st, idx) => (
                    <tr
                      key={st.id || idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 px-3 text-center text-slate-500 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {st.name}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-600 text-[11px]">
                        {st.gradeLevel || '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-800 font-black">
                        {st.section || 'أ'}
                      </td>
                      <td className="py-2 px-3 text-center bg-rose-50/40">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                            st.totalAbsent > 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'text-slate-400 font-normal'
                          }`}
                        >
                          {st.totalAbsent > 0 ? `${st.totalAbsent} يوم` : '0'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center bg-blue-50/40">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                            st.totalExcused > 0
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'text-slate-400 font-normal'
                          }`}
                        >
                          {st.totalExcused > 0 ? `${st.totalExcused} يوم` : '0'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center bg-emerald-50/40">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                            st.totalPresent > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'text-slate-400 font-normal'
                          }`}
                        >
                          {st.totalPresent > 0 ? `${st.totalPresent} يوم` : '0'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#F8F4EA] border-t border-[#E0D5C3] flex items-center justify-between">
          <span className="text-[11px] text-slate-600 font-semibold">
            مرتب تلقائياً من الأكثر غياباً إلى الأقل لمتابعة الالتزام والمواظبة.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 craft-btn-primary text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
