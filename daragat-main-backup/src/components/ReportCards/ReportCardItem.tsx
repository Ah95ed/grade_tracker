import React from 'react';
import { ClassSectionCard, TeacherProfile, TermModel, PrintSettings } from '../../types';
import { Printer, Eye, School, FileSpreadsheet, Users } from 'lucide-react';
import { isGradeLevelMatch, isSubjectMatch } from '../../utils/gradeAndSectionMatcher';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';

interface Props {
  classCard: ClassSectionCard;
  terms: TermModel[];
  profile: TeacherProfile;
  academicYear?: string;
  subject?: string;
  onPreview?: () => void;
  onPrint?: () => void;
  onExportExcel?: () => void;
  isPrintMode?: boolean;
  printSettings?: PrintSettings;
  searchQuery?: string;
}

export const ReportCardItem: React.FC<Props> = ({
  classCard,
  terms,
  profile,
  academicYear,
  subject,
  onPreview,
  onPrint,
  onExportExcel,
  isPrintMode = false,
  printSettings,
  searchQuery = '',
}) => {
  const effectiveYear = profile.academicYear || academicYear || '2024 - 2025';
  const effectiveSubject =
    classCard.subject ||
    (subject && subject !== 'الإدارة' ? subject : profile.subject !== 'الإدارة' ? profile.subject : 'المادة الدراسية');
  const effectiveTeacher = classCard.teacherName || profile.teacherName || '';
  const showLogo = printSettings ? printSettings.showSchoolLogo : true;
  const showHeader = printSettings ? printSettings.showSchoolHeader : true;
  const effectiveLogo = profile.schoolLogo || printSettings?.schoolLogo;

  // Filter terms strictly to those matching this class/card's grade level, subject, and teacher
  const relevantTerms = terms.filter((t) => {
    const matchGrade = !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, classCard.gradeLevel);
    const matchSub =
      !classCard.subject || !t.subject || isSubjectMatch(t.subject, classCard.subject);
    const matchTeacher =
      !classCard.teacherName ||
      !t.teacherName ||
      canonicalizeArabic(t.teacherName) === canonicalizeArabic(classCard.teacherName);
    return matchGrade && matchSub && matchTeacher;
  });

  // Filter students within this card if search query is provided
  const query = searchQuery.trim().toLowerCase();
  const displayedStudents = query
    ? classCard.students.filter((s) => s.name.toLowerCase().includes(query))
    : classCard.students;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-300 shadow-xs flex flex-col justify-between overflow-hidden student-table-card ${
        isPrintMode
          ? 'w-full mx-auto border-2 border-slate-900 shadow-none'
          : 'hover:border-slate-400 transition-all hover:shadow-md'
      }`}
    >
      <div>
        {/* Optional School / Ministry Header */}
        {showHeader && (profile.schoolName || effectiveLogo) && (
          <div className="p-3 px-4 bg-slate-50 border-b border-slate-300 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              {showLogo && effectiveLogo ? (
                <div className="h-9 w-12 flex items-center justify-center shrink-0">
                  <img
                    src={effectiveLogo}
                    alt="شعار المدرسة"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <School className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <div>
                <span className="font-extrabold text-slate-900 block leading-tight text-sm">
                  {profile.schoolName || 'المدرسة'}
                </span>
                {profile.governorate && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {profile.governorate}
                  </span>
                )}
              </div>
            </div>

            {effectiveTeacher && (
              <div className="text-xs text-slate-600 font-medium">
                أستاذ المادة: <strong className="text-slate-900">{effectiveTeacher}</strong>
              </div>
            )}
          </div>
        )}

        {/* Title Header at the top: المرحله | الشعبه | السنه الدراسيه | الماده | أستاذ المادة */}
        <div className="bg-[#F8FAFC] border-b border-slate-300 p-3 sm:p-3.5 text-xs text-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <span className="text-slate-500 font-semibold">المرحلة / الصف:</span>
              <span className="text-slate-900 font-black text-sm">
                {classCard.gradeLevel || 'غير محدد'}
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <span className="text-slate-500 font-semibold">الشعبة:</span>
              <span className="text-slate-900 font-black text-sm">
                {classCard.section || 'غير محدد'}
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <span className="text-slate-500 font-semibold">السنة الدراسية:</span>
              <span className="text-slate-900 font-black" dir="ltr">
                {effectiveYear}
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <span className="text-slate-500 font-semibold">المادة:</span>
              <span className="text-slate-900 font-black">
                {effectiveSubject}
              </span>
            </div>

            {effectiveTeacher && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5 col-span-2 sm:col-span-1">
                <span className="text-slate-500 font-semibold">أستاذ المادة:</span>
                <span className="text-slate-900 font-black">
                  {effectiveTeacher}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* The Simple Student Group Table */}
        <div className="overflow-x-auto p-3 sm:p-4">
          <table className="w-full text-center border-collapse border border-slate-400 bg-white text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                <th className="py-2.5 px-3 border-r border-slate-400 text-center font-black w-12 bg-slate-100 text-slate-900">
                  ت
                </th>
                <th className="py-2.5 px-3 border-r border-slate-400 text-right font-black min-w-[160px] bg-slate-100 text-slate-900">
                  اسم الطالب
                </th>
                {relevantTerms.map((t) => (
                  <th
                    key={t.id}
                    className="py-2.5 px-3 border-r border-slate-400 text-center font-black bg-slate-100 text-slate-900 min-w-[90px]"
                  >
                    درجة {t.name}
                  </th>
                ))}
                {relevantTerms.length === 0 && (
                  <th className="py-2.5 px-3 border-r border-slate-400 text-center font-bold text-slate-500 min-w-[120px]">
                    الفصل الدراسي
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayedStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + Math.max(1, relevantTerms.length)}
                    className="py-6 text-center text-slate-400 bg-white font-medium"
                  >
                    لا يوجد طلاب مسجلون في هذه الشعبة.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((student, idx) => (
                  <tr
                    key={student.id}
                    className={`border-b border-slate-300 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                    }`}
                  >
                    <td className="py-2.5 px-3 border-r border-slate-400 text-center font-bold text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-400 text-right font-bold text-slate-900">
                      {student.name}
                    </td>
                    {relevantTerms.map((t) => {
                      const score = student.termScores[t.id];
                      return (
                        <td
                          key={t.id}
                          className="py-2.5 px-3 border-r border-slate-400 text-center font-extrabold text-slate-900"
                        >
                          {score !== null && score !== undefined ? (
                            <span className="text-sm font-black text-slate-900">{score}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>
                      );
                    })}
                    {relevantTerms.length === 0 && (
                      <td className="py-2.5 px-3 border-r border-slate-400 text-center text-slate-400 text-xs">
                        لم يُحدد فصل لهذا الصف بعد
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen-Only Action Buttons (Hidden on Print) */}
      {!isPrintMode && (
        <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Users className="w-4 h-4 text-slate-400" />
            <span>{classCard.students.length} طالب في الشعبة</span>
          </div>

          <div className="flex items-center gap-2">
            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="px-2.5 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="تصدير هذا الكارت فقط لإكسل"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>إكسل</span>
              </button>
            )}

            {onPreview && (
              <button
                type="button"
                onClick={onPreview}
                className="px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="معاينة كارت الصف والشعبة"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة</span>
              </button>
            )}

            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                title="طباعة كارت هذا الصف والشعبة"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الكارت</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
