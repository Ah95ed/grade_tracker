import React from 'react';
import { TeacherProfile, TermModel, PrintSettings } from '../../types';
import { Printer, Eye, School, User, Award, CheckCircle2, XCircle } from 'lucide-react';
import { isGradeLevelMatch } from '../../utils/gradeAndSectionMatcher';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';

export interface UnifiedTermColumn {
  key: string;
  displayName: string;
  termIds: string[];
}

export interface StudentSubjectScoreDetail {
  subjectName: string;
  teacherName?: string;
  termScores: Record<string, number | null>; // termId -> score
  finalScore: number | null;
  ratingText: string;
  ratingBadgeBg: string;
  ratingBadgeText: string;
  isPass: boolean;
}

export interface StudentCardData {
  studentId: string;
  name: string;
  gradeLevel: string;
  section: string;
  subjects: StudentSubjectScoreDetail[];
  totalScore: number | null;
  overallAverage: number | null;
  overallRating: {
    text: string;
    badgeBg: string;
    badgeText: string;
  };
  isOverallPass: boolean;
}

interface Props {
  studentCard: StudentCardData;
  terms: TermModel[];
  profile: TeacherProfile;
  academicYear?: string;
  onPreview?: () => void;
  onPrint?: () => void;
  isPrintMode?: boolean;
  printSettings?: PrintSettings;
  isAdministration?: boolean;
}

export const StudentIndividualCardItem: React.FC<Props> = ({
  studentCard,
  terms,
  profile,
  academicYear,
  onPreview,
  onPrint,
  isPrintMode = false,
  printSettings,
  isAdministration: propIsAdministration,
}) => {
  const isAdministration =
    propIsAdministration ??
    (profile.subject === 'الإدارة' ||
      typeof window !== 'undefined' && (
        (() => {
          try {
            const raw = localStorage.getItem('daragat_app_user');
            if (raw) {
              const u = JSON.parse(raw);
              return u?.userRole === 'admin_school' || u?.email === 'asmaomar5566@gmail.com';
            }
          } catch {}
          return false;
        })()
      ));

  const effectiveYear = profile.academicYear || academicYear || '2024 - 2025';
  const showLogo = printSettings ? printSettings.showSchoolLogo : true;
  const showHeader = printSettings ? printSettings.showSchoolHeader : true;
  const effectiveLogo = profile.schoolLogo || printSettings?.schoolLogo;

  // Filter terms strictly relevant to this student's grade level
  const relevantTerms = terms.filter(
    (t) => !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, studentCard.gradeLevel)
  );

  // Group terms with the same name (e.g. "الفصل الأول" for Arabic and "الفصل الأول" for English)
  // so they share the exact same column across all subjects
  const unifiedTermColumns = React.useMemo<UnifiedTermColumn[]>(() => {
    const list: UnifiedTermColumn[] = [];
    const map = new Map<string, UnifiedTermColumn>();

    for (const t of relevantTerms) {
      const rawName = t.name?.trim() || 'فصل دراسي';
      const key = canonicalizeArabic(rawName);
      if (!map.has(key)) {
        const col: UnifiedTermColumn = {
          key,
          displayName: rawName,
          termIds: [t.id],
        };
        map.set(key, col);
        list.push(col);
      } else {
        const existing = map.get(key)!;
        if (!existing.termIds.includes(t.id)) {
          existing.termIds.push(t.id);
        }
      }
    }
    return list;
  }, [relevantTerms]);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-300 shadow-xs flex flex-col justify-between overflow-hidden student-individual-card break-inside-avoid ${
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

            {isAdministration ? (
              <div className="text-xs text-slate-600 font-medium bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">
                <strong className="text-slate-900">إدارة المدرسة</strong>
              </div>
            ) : profile.teacherName ? (
              <div className="text-xs text-slate-600 font-medium">
                المعلم: <strong className="text-slate-900">{profile.teacherName}</strong>
              </div>
            ) : null}
          </div>
        )}

        {/* Title Header at the top: Student Name Prominently + Grade + Section + Year */}
        <div className="bg-[#FAF7EC] border-b border-[#D8CEBD] p-3 sm:p-4 text-xs text-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Student Name */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#4E7A68] text-white flex items-center justify-center shadow-2xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block leading-none">اسم الطالب:</span>
                <h3 className="text-sm sm:text-base font-black text-[#2F2822] leading-tight">
                  {studentCard.name || 'بدون اسم'}
                </h3>
              </div>
            </div>

            {/* Class & Section & Academic Year details */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
              <span className="bg-white px-2.5 py-1 rounded-lg border border-[#D8CEBD] font-bold text-slate-800">
                الصف: <strong className="text-[#4E7A68]">{studentCard.gradeLevel || '—'}</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-lg border border-[#D8CEBD] font-bold text-slate-800">
                الشعبة: <strong className="text-[#4E7A68]">{studentCard.section || '—'}</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-lg border border-[#D8CEBD] font-bold text-slate-800" dir="ltr">
                {effectiveYear}
              </span>
            </div>
          </div>
        </div>

        {/* Subjects Table inside the student card */}
        <div className="overflow-x-auto p-3 sm:p-4">
          <table className="w-full text-center border-collapse border border-slate-300 bg-white text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-black border-b border-slate-300">
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-10">#</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[140px]">
                  المادة الدراسية
                </th>
                {unifiedTermColumns.length === 0 ? (
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[85px] text-slate-400">
                    الفصول
                  </th>
                ) : (
                  unifiedTermColumns.map((col) => (
                    <th
                      key={col.key}
                      className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[85px]"
                    >
                      درجة {col.displayName}
                    </th>
                  ))
                )}
                <th className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[80px]">
                  التقدير
                </th>
                <th className="py-2.5 px-3 text-center min-w-[75px]">
                  النتيجة
                </th>
              </tr>
            </thead>
            <tbody>
              {studentCard.subjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + Math.max(1, unifiedTermColumns.length)}
                    className="py-6 text-center text-slate-400 bg-white font-medium"
                  >
                    لا توجد مواد مسجلة لهذا الطالب حالياً.
                  </td>
                </tr>
              ) : (
                studentCard.subjects.map((sub, idx) => (
                  <tr
                    key={sub.subjectName}
                    className={`border-b border-slate-200 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                    }`}
                  >
                    <td className="py-2.5 px-3 border-r border-slate-300 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 text-right font-black text-slate-900">
                      <div>{sub.subjectName}</div>
                      {sub.teacherName && (
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          أ. {sub.teacherName}
                        </div>
                      )}
                    </td>
                    {unifiedTermColumns.length === 0 ? (
                      <td className="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400">
                        -
                      </td>
                    ) : (
                      unifiedTermColumns.map((col) => {
                        let score: number | null = null;
                        for (const tid of col.termIds) {
                          const s = sub.termScores[tid];
                          if (s !== null && s !== undefined && !isNaN(s)) {
                            score = s;
                            break;
                          }
                        }
                        if (score === null && sub.termScores[col.key] !== undefined && sub.termScores[col.key] !== null) {
                          score = sub.termScores[col.key];
                        }
                        return (
                          <td
                            key={col.key}
                            className="py-2.5 px-3 border-r border-slate-300 text-center font-bold text-slate-800"
                          >
                            {score !== null && score !== undefined ? (
                              score
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                        );
                      })
                    )}
                    <td className="py-2.5 px-3 border-r border-slate-300 text-center whitespace-nowrap">
                      {sub.finalScore !== null && sub.finalScore !== undefined ? (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${sub.ratingBadgeBg} ${sub.ratingBadgeText}`}
                        >
                          {sub.ratingText}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {sub.finalScore !== null && sub.finalScore !== undefined ? (
                        sub.isPass ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ناجح
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            راسب
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Student General Summary Row */}
            {studentCard.subjects.length > 0 && (
              <tfoot>
                <tr className="bg-[#FAF7EC] font-black border-t-2 border-slate-400 text-slate-900">
                  <td colSpan={2} className="py-2.5 px-3 text-right border-r border-slate-300 text-xs">
                    النتيجة العامة للطالب:
                  </td>
                  <td
                    colSpan={Math.max(1, unifiedTermColumns.length)}
                    className="py-2.5 px-3 text-center border-r border-slate-300 text-xs text-slate-600 font-normal"
                  >
                    مجموع المواد: {studentCard.subjects.length}
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-slate-300">
                    {studentCard.overallRating?.text ? (
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${studentCard.overallRating.badgeBg} ${studentCard.overallRating.badgeText}`}
                      >
                        {studentCard.overallRating.text}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {studentCard.overallAverage !== null ? (
                      studentCard.isOverallPass ? (
                        <span className="text-xs font-black text-emerald-700 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ناجح</span>
                        </span>
                      ) : (
                        <span className="text-xs font-black text-rose-700 flex items-center justify-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>مكمل / راسب</span>
                        </span>
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Card Footer Actions (Hidden during print) */}
      {!isPrintMode && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 text-xs no-print">
          <div className="flex items-center gap-2">
            {onPreview && (
              <button
                type="button"
                onClick={onPreview}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                title="معاينة كارت الطالب بملء الشاشة"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
                <span>معاينة كارت الطالب</span>
              </button>
            )}
          </div>

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="px-3.5 py-1.5 bg-[#4E7A68] hover:bg-[#3B6554] text-white rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="طباعة شهادة هذا الطالب فقط"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة كارت الطالب</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
