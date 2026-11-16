import React from 'react';
import {
  MonthlyModel,
  StudentRow,
} from '../../types';
import {
  Users,
  GitMerge,
  Table,
  Plus,
  BookOpen,
  ChevronLeft,
  Pencil,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';
import { calculateStudentMonthlyTotal } from '../../utils/gradeCalculations';
import { isGradeLevelMatch } from '../../utils/gradeAndSectionMatcher';

interface GradeColorPalette {
  id: string;
  name: string;
  headerBg: string;
  headerBorder: string;
  headerText: string;
  headerBadge: string;
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  cardBadgeBg: string;
  cardBadgeText: string;
  accentColor: string;
  viewAllBtnBg: string;
  viewAllBtnHover: string;
}

const COLOR_PALETTES: GradeColorPalette[] = [
  // 1. Blue Theme (أزرق - ممتاز للصفوف مثل الثالث متوسط)
  {
    id: 'blue',
    name: 'أزرق',
    headerBg: 'bg-blue-50/90',
    headerBorder: 'border-blue-200',
    headerText: 'text-blue-950',
    headerBadge: 'bg-blue-600 text-white',
    cardBg: 'bg-white hover:bg-blue-50/50',
    cardBorder: 'border-blue-200/90',
    cardHoverBorder: 'hover:border-blue-400',
    cardBadgeBg: 'bg-blue-100',
    cardBadgeText: 'text-blue-900',
    accentColor: '#2B6CB0',
    viewAllBtnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    viewAllBtnHover: 'hover:bg-blue-700',
  },
  // 2. Emerald Theme (أخضر زمردي)
  {
    id: 'emerald',
    name: 'أخضر',
    headerBg: 'bg-emerald-50/90',
    headerBorder: 'border-emerald-200',
    headerText: 'text-emerald-950',
    headerBadge: 'bg-emerald-600 text-white',
    cardBg: 'bg-white hover:bg-emerald-50/50',
    cardBorder: 'border-emerald-200/90',
    cardHoverBorder: 'hover:border-emerald-400',
    cardBadgeBg: 'bg-emerald-100',
    cardBadgeText: 'text-emerald-900',
    accentColor: '#059669',
    viewAllBtnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    viewAllBtnHover: 'hover:bg-emerald-700',
  },
  // 3. Amber / Sand Theme (عسلي / رملي دافئ)
  {
    id: 'amber',
    name: 'عسلي',
    headerBg: 'bg-amber-50/90',
    headerBorder: 'border-amber-200',
    headerText: 'text-amber-950',
    headerBadge: 'bg-amber-600 text-white',
    cardBg: 'bg-white hover:bg-amber-50/50',
    cardBorder: 'border-amber-200/90',
    cardHoverBorder: 'hover:border-amber-400',
    cardBadgeBg: 'bg-amber-100',
    cardBadgeText: 'text-amber-900',
    accentColor: '#D97706',
    viewAllBtnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    viewAllBtnHover: 'hover:bg-amber-700',
  },
  // 4. Purple / Violet Theme (بنفسجي ملكي)
  {
    id: 'purple',
    name: 'بنفسجي',
    headerBg: 'bg-purple-50/90',
    headerBorder: 'border-purple-200',
    headerText: 'text-purple-950',
    headerBadge: 'bg-purple-600 text-white',
    cardBg: 'bg-white hover:bg-purple-50/50',
    cardBorder: 'border-purple-200/90',
    cardHoverBorder: 'hover:border-purple-400',
    cardBadgeBg: 'bg-purple-100',
    cardBadgeText: 'text-purple-900',
    accentColor: '#7C3AED',
    viewAllBtnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
    viewAllBtnHover: 'hover:bg-purple-700',
  },
  // 5. Rose / Crimson Theme (وردي هادئ)
  {
    id: 'rose',
    name: 'وردي',
    headerBg: 'bg-rose-50/90',
    headerBorder: 'border-rose-200',
    headerText: 'text-rose-950',
    headerBadge: 'bg-rose-600 text-white',
    cardBg: 'bg-white hover:bg-rose-50/50',
    cardBorder: 'border-rose-200/90',
    cardHoverBorder: 'hover:border-rose-400',
    cardBadgeBg: 'bg-rose-100',
    cardBadgeText: 'text-rose-900',
    accentColor: '#E11D48',
    viewAllBtnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    viewAllBtnHover: 'hover:bg-rose-700',
  },
  // 6. Teal / Cyan Theme (فيروزي)
  {
    id: 'teal',
    name: 'فيروزي',
    headerBg: 'bg-teal-50/90',
    headerBorder: 'border-teal-200',
    headerText: 'text-teal-950',
    headerBadge: 'bg-teal-600 text-white',
    cardBg: 'bg-white hover:bg-teal-50/50',
    cardBorder: 'border-teal-200/90',
    cardHoverBorder: 'hover:border-teal-400',
    cardBadgeBg: 'bg-teal-100',
    cardBadgeText: 'text-teal-900',
    accentColor: '#0D9488',
    viewAllBtnBg: 'bg-teal-600 hover:bg-teal-700 text-white',
    viewAllBtnHover: 'hover:bg-teal-700',
  },
];

// Consistent palette selector for grades (e.g. 3rd grade always gets blue, 2nd grade emerald, etc.)
function getGradePalette(gradeName: string, index: number): GradeColorPalette {
  const g = gradeName.toLowerCase();
  if (g.includes('ثالث') || g.includes('3')) return COLOR_PALETTES[0]; // blue
  if (g.includes('ثاني') || g.includes('2')) return COLOR_PALETTES[1]; // emerald
  if (g.includes('اول') || g.includes('أول') || g.includes('1')) return COLOR_PALETTES[2]; // amber
  if (g.includes('رابع') || g.includes('4')) return COLOR_PALETTES[3]; // purple
  if (g.includes('خامس') || g.includes('5')) return COLOR_PALETTES[4]; // rose
  if (g.includes('سادس') || g.includes('6')) return COLOR_PALETTES[5]; // teal
  return COLOR_PALETTES[index % COLOR_PALETTES.length];
}

interface Props {
  model: MonthlyModel;
  onSelectClassAndSection: (gradeLevel: string, section: string | 'ALL') => void;
  onOpenBatchImport: () => void;
  onOpenManageGrade: (gradeLevel: string) => void;
  onViewAllTable: () => void;
  onOpenSectionsSwap?: (gradeLevel: string) => void;
}

export const ClassesSectionsOverview: React.FC<Props> = ({
  model,
  onSelectClassAndSection,
  onOpenBatchImport,
  onOpenManageGrade,
  onViewAllTable,
  onOpenSectionsSwap,
}) => {
  const allStudents = model.students || [];

  // Strictly scope students to this model's designated gradeLevel if specified
  const students = React.useMemo(() => {
    if (!model.gradeLevel?.trim()) return allStudents;
    return allStudents.filter((s) => isGradeLevelMatch(s.gradeLevel, model.gradeLevel!));
  }, [allStudents, model.gradeLevel]);

  // Group students strictly by the active gradeLevel of this model button
  const gradeGroups = React.useMemo(() => {
    const map = new Map<string, StudentRow[]>();

    students.forEach((s) => {
      const g = (s.gradeLevel || model.gradeLevel || 'الصف الدراسي').trim();
      if (!map.has(g)) {
        map.set(g, []);
      }
      map.get(g)!.push(s);
    });

    // If no students yet but model has a designated gradeLevel, show that grade card
    if (map.size === 0 && model.gradeLevel?.trim()) {
      map.set(model.gradeLevel.trim(), []);
    }

    const entries = Array.from(map.entries()).map(([grade, stList]) => {
      // Group by section inside this grade
      const secMap = new Map<string, StudentRow[]>();
      stList.forEach((s) => {
        const sec = (s.section || 'أ').trim();
        if (!secMap.has(sec)) secMap.set(sec, []);
        secMap.get(sec)!.push(s);
      });

      // If no sections yet, default to section 'أ'
      if (secMap.size === 0) {
        secMap.set('أ', []);
      }

      // Sort sections alphabetically (أ, ب, ج, ...)
      const sortedSections = Array.from(secMap.entries()).sort(([a], [b]) =>
        a.localeCompare(b, 'ar')
      );

      return {
        grade,
        students: stList,
        sections: sortedSections,
      };
    });

    // Sort grades
    return entries.sort((a, b) => a.grade.localeCompare(b.grade, 'ar'));
  }, [students, model.gradeLevel]);

  // If no students in this model / grade yet
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E4DA] p-8 sm:p-12 text-center shadow-xs max-w-xl mx-auto my-6 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EEF4F8] border border-[#D2E0EC] flex items-center justify-center text-[#557A95] shadow-xs">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#2E2B27]">
            {model.gradeLevel ? `لا يوجد طلاب مسجلون في صف (${model.gradeLevel}) حالياً` : 'لا يوجد طلاب في هذا النموذج حالياً'}
          </h2>
          <p className="text-sm text-[#7A746B] mt-1.5 leading-relaxed">
            هذا الزر مخصص لـ <strong className="text-[#2F2822]">{model.gradeLevel || 'هذا الصف'}</strong>. يمكنك استيراد أو إضافة أسماء الطلاب وشُعبهم للبدء برصد الدرجات.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenBatchImport}
          className="px-6 py-3 bg-[#557A95] hover:bg-[#476A84] active:scale-98 text-white rounded-xl text-sm font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{model.gradeLevel ? `استيراد وإضافة طلاب صف (${model.gradeLevel})` : 'استيراد وإضافة بيانات الطلاب الآن'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200" dir="rtl">
      {/* Top Banner with Quick Actions */}
      <div className="bg-[#F8F4EA] border border-[#D8CEBD] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#BA916C] text-white flex items-center justify-center shadow-xs shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#2F2822] flex items-center gap-2 flex-wrap">
              <span>صفوف وشُعب:</span>
              <span className="text-[#4A82A8]">{model.name}</span>
              {model.subject && (
                <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-2 py-0.5 rounded-lg">
                  {model.subject}
                </span>
              )}
            </h3>
            <p className="text-xs text-[#7A6E61] mt-0.5">
              انقر على أي شعبة لعرض جدول درجاتها مباشرة، أو اختر "عرض كل الشُعب" للصف
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onViewAllTable}
            className="px-3.5 py-2 text-xs sm:text-sm font-bold text-[#2F2822] bg-white hover:bg-slate-100 border border-[#CBD5E1] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98"
            title={`فتح جدول الدرجات لصف ${model.gradeLevel || 'الطلاب'} لجميع الشُعب`}
          >
            <Table className="w-4 h-4 text-[#BA916C]" />
            <span>عرض كل شُعب {model.gradeLevel ? `(${model.gradeLevel})` : 'الصف'} ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={onOpenBatchImport}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#5692BE] hover:bg-[#437A9F] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98"
            title="إضافة المزيد من الطلاب أو الشُعب"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة طلاب / شعب جديدة</span>
          </button>
        </div>
      </div>

      {/* Grade Rows / Shelves: Each grade in an isolated shelf with uniform color */}
      <div className="space-y-4 sm:space-y-5">
        {gradeGroups.map((group, gradeIdx) => {
          const palette = getGradePalette(group.grade, gradeIdx);
          const totalGradeStudents = group.students.length;
          const sectionCount = group.sections.length;

          return (
            <div
              key={group.grade}
              className={`rounded-2xl border-2 ${palette.headerBorder} bg-white overflow-hidden shadow-xs transition-shadow hover:shadow-sm`}
            >
              {/* Row Header for the Grade */}
              <div
                className={`px-4 py-3 sm:px-5 sm:py-3.5 ${palette.headerBg} border-b ${palette.headerBorder} flex flex-wrap items-center justify-between gap-3`}
              >
                {/* Right: Grade Title & student count */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div
                    className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black shadow-2xs flex items-center gap-1.5 ${palette.headerBadge}`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{group.grade}</span>
                  </div>

                  <span className="text-xs font-bold text-slate-600 bg-white/80 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                    {sectionCount} {sectionCount === 1 ? 'شعبة' : 'شُعب'} • {totalGradeStudents} طالب
                  </span>
                </div>

                {/* Left: Action Buttons for this Grade */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Button 1: View all sections of this grade */}
                  <button
                    type="button"
                    onClick={() => onSelectClassAndSection(group.grade, 'ALL')}
                    className={`px-3.5 py-1.5 text-xs font-black rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${palette.viewAllBtnBg}`}
                    title={`عرض جدول ${group.grade} مع كل شُعبه (${group.sections.map((s) => s[0]).join(' + ')})`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>عرض كل شُعب الصف ({group.sections.map((s) => s[0]).join(' + ')})</span>
                  </button>

                  {/* Button 2: Rename / Merge Grade */}
                  <button
                    type="button"
                    onClick={() => onOpenManageGrade(group.grade)}
                    className="px-2.5 py-1.5 text-xs font-bold text-[#554A3E] hover:text-[#2F2822] bg-white hover:bg-slate-100 border border-[#D8CEBD] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="تعديل اسم الصف أو دمجه مع صف آخر مكرر لتوحيد المربعات"
                  >
                    <GitMerge className="w-3.5 h-3.5 text-amber-700" />
                    <span>تعديل / دمج الصف</span>
                  </button>

                  {/* Button 3: Swap Sections Between Teachers (الإدارة) */}
                  {onOpenSectionsSwap && (
                    <button
                      type="button"
                      onClick={() => onOpenSectionsSwap(group.grade)}
                      className="px-2.5 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="تبديل أو إعادة توزيع الشُعب بين أساتذة هذا الصف"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                      <span>تبديل شُعب الأساتذة</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Row Body: Section Rectangles / Cards in a Single Row / Flow Grid */}
              <div className="p-3.5 sm:p-5 bg-slate-50/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {group.sections.map(([sec, secStudents]) => {
                    const count = secStudents.length;

                    // Calculate students with written scores recorded
                    const scoredCount = secStudents.filter(
                      (st) => st.writtenRawScore !== null && st.writtenRawScore !== undefined
                    ).length;

                    return (
                      <div
                        key={sec}
                        onClick={() => onSelectClassAndSection(group.grade, sec)}
                        className={`group relative p-4 rounded-xl border-2 ${palette.cardBorder} ${palette.cardHoverBorder} ${palette.cardBg} transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[110px] active:scale-98`}
                        title={`انقر لفتح جدول درجات: ${group.grade} - شعبة ${sec}`}
                      >
                        {/* Top row inside card: Section Name + Tag */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-9 h-9 rounded-xl font-black text-base flex items-center justify-center shrink-0 shadow-2xs ${palette.cardBadgeBg} ${palette.cardBadgeText}`}
                            >
                              {sec}
                            </span>
                            <div>
                              <div className="text-sm sm:text-base font-black text-slate-800 group-hover:text-slate-950">
                                شعبة {sec}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                {group.grade}
                              </div>
                            </div>
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200/90 text-slate-600 flex items-center justify-center transition-colors">
                            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                          </div>
                        </div>

                        {/* Bottom row inside card: Count & Status */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{count} طالب</span>
                          </span>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                              scoredCount === count && count > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : scoredCount > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {scoredCount === count && count > 0
                              ? 'اكتمل الرصد ✓'
                              : scoredCount > 0
                              ? `مرصود ${scoredCount}/${count}`
                              : 'بانتظار الرصد'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
