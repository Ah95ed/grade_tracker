import React, { useState, useMemo } from 'react';
import { MonthlyModel, TermModel, TeacherProfile } from '../../types';
import {
  calculateTermSummaries,
  getRatingDetails,
  getStudentMonthlyScoreBreakdown,
  orderTermsWithAggregates,
} from '../../utils/gradeCalculations';
import {
  isGradeLevelMatch,
  isSectionMatch,
} from '../../utils/gradeAndSectionMatcher';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';
import { triggerPrint } from '../../utils/printHelper';
import { getCurrentAcademicYear } from '../../utils/dateUtils';
import { StackedHeaderLabel } from '../Common/StackedHeaderLabel';
import { NumeralModeToggle } from '../Common/NumeralModeToggle';
import {
  NumeralMode,
  NUMERAL_MODE_STORAGE_KEY,
  formatScoreDisplay,
  getSavedNumeralMode,
} from '../../utils/numeralFormat';
import {
  X,
  Printer,
  Search,
  User,
  School,
  CheckCircle2,
  XCircle,
  IdCard,
} from 'lucide-react';

interface StudentBaseInfo {
  studentId: string;
  name: string;
  gradeLevel: string;
  section: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTerm: TermModel;
  terms: TermModel[];
  monthlyModels: MonthlyModel[];
  profile: TeacherProfile;
  visibleStudents: StudentBaseInfo[];
  isAdministration?: boolean;
  numeralMode?: NumeralMode;
  onNumeralModeChange?: (mode: NumeralMode) => void;
}

interface UnifiedCol {
  key: string;
  displayName: string;
  isAggregate?: boolean;
}

interface DetailedSubjectRow {
  subjectName: string;
  teacherName?: string;
  monthScores: Record<string, number | null>;
  termScores: Record<string, number | null>;
  termScoreDetails?: Record<
    string,
    { raw: number | null; final: number | null; isRounded: boolean }
  >;
  finalScore: number | null;
  ratingText: string;
  ratingBadgeBg: string;
  ratingBadgeText: string;
  isPass: boolean;
}

interface DetailedStudentCard {
  studentId: string;
  name: string;
  gradeLevel: string;
  section: string;
  monthColumns: UnifiedCol[];
  termColumns: UnifiedCol[];
  subjects: DetailedSubjectRow[];
  overallAverage: number | null;
  overallRating: {
    text: string;
    badgeBg: string;
    badgeText: string;
  };
  isOverallPass: boolean;
}

function isSubjectMatchLocal(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const ca = canonicalizeArabic(a.trim());
  const cb = canonicalizeArabic(b.trim());
  if (ca === cb) return true;
  const stripAl = (s: string) => (s.startsWith('ال') ? s.slice(2) : s);
  return stripAl(ca) === stripAl(cb);
}

export const TermStudentCardsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentTerm,
  terms,
  monthlyModels,
  profile,
  visibleStudents,
  isAdministration = false,
  numeralMode: propNumeralMode,
  onNumeralModeChange: propOnNumeralModeChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('ALL');
  const [singlePrintStudentId, setSinglePrintStudentId] = useState<string | null>(null);
  const [internalNumeralMode, setInternalNumeralMode] = useState<NumeralMode>(() => getSavedNumeralMode());
  const numeralMode: NumeralMode = propNumeralMode ?? internalNumeralMode;

  const handleNumeralModeChange = (mode: NumeralMode) => {
    setInternalNumeralMode(mode);
    try {
      localStorage.setItem(NUMERAL_MODE_STORAGE_KEY, mode);
    } catch {}
    propOnNumeralModeChange?.(mode);
  };

  const effectiveYear = profile.academicYear?.trim() || getCurrentAcademicYear();
  const effectiveLogo = profile.schoolLogo;

  // Canonical month names selected in the active term (if any)
  const activeTermSelectedMonthKeys = useMemo(() => {
    const set = new Set<string>();
    (currentTerm?.selectedModelIds || []).forEach((id) => {
      const m = monthlyModels.find((item) => item.id === id);
      if (m?.name?.trim()) {
        set.add(canonicalizeArabic(m.name.trim()));
      }
    });
    return set;
  }, [currentTerm, monthlyModels]);

  // Build detailed student cards (with subjects belonging to each student + monthly scores + term averages)
  const studentCards = useMemo<DetailedStudentCard[]>(() => {
    if (!isOpen || !visibleStudents || visibleStudents.length === 0) return [];

    // Deduplicate students cleanly
    const uniqueStudents: StudentBaseInfo[] = [];
    const seenStudentKeys = new Set<string>();
    for (const st of visibleStudents) {
      const cleanName = st.name?.trim();
      if (!cleanName) continue;
      const key = `${canonicalizeArabic(cleanName)}::${canonicalizeArabic(st.gradeLevel || '')}`;
      if (!seenStudentKeys.has(key)) {
        seenStudentKeys.add(key);
        uniqueStudents.push({
          studentId: st.studentId,
          name: cleanName,
          gradeLevel: st.gradeLevel || currentTerm?.gradeLevel || '',
          section: st.section || 'أ',
        });
      }
    }

    // Group monthly models by subject name
    const distinctSubjects = Array.from(
      new Set(
        monthlyModels
          .map((m) => m.subject?.trim() || profile.subject?.trim() || 'المادة الدراسية')
          .filter(Boolean)
      )
    );
    if (distinctSubjects.length === 0) {
      distinctSubjects.push(currentTerm?.subject?.trim() || profile.subject?.trim() || 'المادة الدراسية');
    }

    return uniqueStudents.map((student) => {
      const studentNameCanon = canonicalizeArabic(student.name);

      // Relevant terms for this student's grade level and section
      const relevantTerms = terms.filter(
        (t) =>
          (!t.gradeLevel ||
            !student.gradeLevel ||
            isGradeLevelMatch(t.gradeLevel, student.gradeLevel)) &&
          (!t.assignedSections?.length ||
            !student.section ||
            t.assignedSections.some((sec) => isSectionMatch(sec, student.section)))
      );

      // Unified Term Columns ordered with aggregates directly after their source terms
      const termColumns: UnifiedCol[] = [];
      const termColMap = new Map<string, UnifiedCol>();
      const baseList = relevantTerms.some((t) => t.id === currentTerm.id)
        ? relevantTerms
        : [currentTerm, ...relevantTerms].filter(Boolean);
      const orderedTerms = orderTermsWithAggregates(baseList);

      const isAggTerm = (t: TermModel) =>
        t.sourceType === 'terms' || Boolean(t.selectedTermIds && t.selectedTermIds.length > 0);

      for (const t of orderedTerms) {
        const rawName = t.name?.trim() || 'فصل';
        const key = canonicalizeArabic(rawName);
        if (!termColMap.has(key)) {
          const col: UnifiedCol = {
            key,
            displayName: rawName,
            isAggregate: isAggTerm(t),
          };
          termColMap.set(key, col);
          termColumns.push(col);
        } else if (isAggTerm(t)) {
          termColMap.get(key)!.isAggregate = true;
        }
      }

      const monthColumns: UnifiedCol[] = [];
      const monthColMap = new Map<string, UnifiedCol>();
      const subjectRows: DetailedSubjectRow[] = [];

      let overallSum = 0;
      let overallMaxSum = 0;
      let overallCount = 0;

      for (const subj of distinctSubjects) {
        // Models for this subject matching student's grade level & section
        const modelsOfSubject = monthlyModels.filter((m) => {
          const mSubj = m.subject?.trim() || profile.subject?.trim() || 'المادة الدراسية';
          if (!isSubjectMatchLocal(mSubj, subj)) return false;
          const matchGrade =
            !m.gradeLevel ||
            !student.gradeLevel ||
            isGradeLevelMatch(m.gradeLevel, student.gradeLevel);
          if (!matchGrade) return false;
          if (m.assignedSections && m.assignedSections.length > 0 && student.section) {
            return m.assignedSections.some((sec) => isSectionMatch(sec, student.section));
          }
          return true;
        });

        // Check if student actually exists in any model of this subject
        const studentExistsInSubject = modelsOfSubject.some((m) =>
          (m.students || []).some(
            (s) => canonicalizeArabic(s.name || '') === studentNameCanon
          )
        );
        if (!studentExistsInSubject) continue;

        // Collect monthly scores for this subject
        const monthScores: Record<string, number | null> = {};

        // Prefer models linked to matching terms of active term name, or matching activeTermSelectedMonthKeys, or all subject models
        const matchingSubjCurrentTerm = relevantTerms.find(
          (t) =>
            canonicalizeArabic(t.name) === canonicalizeArabic(currentTerm.name) &&
            (!t.subject || isSubjectMatchLocal(t.subject, subj))
        );

        let modelsForMonths = modelsOfSubject;
        if (matchingSubjCurrentTerm && matchingSubjCurrentTerm.selectedModelIds.length > 0) {
          const explicit = modelsOfSubject.filter((m) =>
            matchingSubjCurrentTerm.selectedModelIds.includes(m.id)
          );
          if (explicit.length > 0) modelsForMonths = explicit;
        } else if (activeTermSelectedMonthKeys.size > 0) {
          const byMonthName = modelsOfSubject.filter((m) =>
            activeTermSelectedMonthKeys.has(canonicalizeArabic(m.name?.trim() || ''))
          );
          if (byMonthName.length > 0) modelsForMonths = byMonthName;
        }

        for (const m of modelsForMonths) {
          const rawMonthName = m.name?.trim() || 'الشهر';
          const mKey = canonicalizeArabic(rawMonthName);
          if (!monthColMap.has(mKey)) {
            const col = { key: mKey, displayName: rawMonthName };
            monthColMap.set(mKey, col);
            monthColumns.push(col);
          }

          const stRow = (m.students || []).find(
            (s) => canonicalizeArabic(s.name || '') === studentNameCanon
          );
          if (stRow) {
            const bd = getStudentMonthlyScoreBreakdown(stRow, m);
            monthScores[mKey] = bd.finalScore;
          } else {
            monthScores[mKey] = null;
          }
        }

        const teacherForSubj =
          modelsOfSubject.find((m) => Boolean(m.teacherName?.trim()))?.teacherName ||
          relevantTerms.find(
            (t) => isSubjectMatchLocal(t.subject, subj) && Boolean(t.teacherName?.trim())
          )?.teacherName ||
          (!isAdministration && profile.subject && isSubjectMatchLocal(profile.subject, subj)
            ? profile.teacherName
            : undefined);

        // Compute term averages for each unified term column
        const termScores: Record<string, number | null> = {};
        const termScoreDetails: Record<
          string,
          { raw: number | null; final: number | null; isRounded: boolean }
        > = {};
        let subjectMaxScore = 0;

        for (const termCol of termColumns) {
          // Find dedicated TermModel for this subject, teacher & term name
          const dedicatedTerm =
            relevantTerms.find(
              (t) =>
                canonicalizeArabic(t.name) === termCol.key &&
                t.subject &&
                isSubjectMatchLocal(t.subject, subj) &&
                (!t.teacherName ||
                  !teacherForSubj ||
                  canonicalizeArabic(t.teacherName) === canonicalizeArabic(teacherForSubj))
            ) ||
            relevantTerms.find(
              (t) =>
                canonicalizeArabic(t.name) === termCol.key &&
                t.subject &&
                isSubjectMatchLocal(t.subject, subj)
            );

          const templateTerm =
            dedicatedTerm ||
            relevantTerms.find((t) => canonicalizeArabic(t.name) === termCol.key);

          if (!templateTerm) {
            termScores[termCol.key] = null;
            continue;
          }

          if (isAggTerm(templateTerm)) {
            let validSourceIds: string[] = [];
            if (dedicatedTerm) {
              validSourceIds = (dedicatedTerm.selectedTermIds || []).filter((srcId) => {
                const src = relevantTerms.find(
                  (rt) => rt.id === srcId && !isAggTerm(rt)
                );
                if (!src) return false;
                if (src.subject && !isSubjectMatchLocal(src.subject, subj)) return false;
                if (
                  src.teacherName &&
                  teacherForSubj &&
                  canonicalizeArabic(src.teacherName) !== canonicalizeArabic(teacherForSubj)
                ) {
                  return false;
                }
                return true;
              });
            } else {
              // Map source term names from templateTerm to matching source terms for this subject
              const srcNames = (templateTerm.selectedTermIds || [])
                .map((id) => terms.find((t) => t.id === id)?.name?.trim())
                .filter(Boolean)
                .map((n) => canonicalizeArabic(n!));
              validSourceIds = relevantTerms
                .filter(
                  (rt) =>
                    !isAggTerm(rt) &&
                    srcNames.includes(canonicalizeArabic(rt.name?.trim() || '')) &&
                    (!rt.subject || isSubjectMatchLocal(rt.subject, subj)) &&
                    (!rt.teacherName ||
                      !teacherForSubj ||
                      canonicalizeArabic(rt.teacherName) === canonicalizeArabic(teacherForSubj))
                )
                .map((rt) => rt.id);
            }

            let hybridModelIds = templateTerm.selectedModelIds.filter((id) =>
              modelsOfSubject.some((m) => m.id === id)
            );
            if (hybridModelIds.length === 0 && templateTerm.selectedModelIds.length > 0) {
              const templateMonthNames = new Set(
                templateTerm.selectedModelIds
                  .map((id) => monthlyModels.find((m) => m.id === id)?.name?.trim())
                  .filter(Boolean)
                  .map((n) => canonicalizeArabic(n!))
              );
              hybridModelIds = modelsOfSubject
                .filter((m) => templateMonthNames.has(canonicalizeArabic(m.name?.trim() || '')))
                .map((m) => m.id);
            }

            if (validSourceIds.length > 0 || hybridModelIds.length > 0) {
              const syntheticAggTerm: TermModel = {
                ...templateTerm,
                subject: subj,
                teacherName: teacherForSubj,
                selectedModelIds: hybridModelIds,
                selectedTermIds: validSourceIds,
              };
              const summaries = calculateTermSummaries(
                syntheticAggTerm,
                modelsOfSubject,
                relevantTerms
              );
              const found = summaries.find(
                (s) => canonicalizeArabic(s.name || '') === studentNameCanon
              );
              termScores[termCol.key] = found?.finalTermScore ?? null;
              termScoreDetails[termCol.key] = {
                raw: found?.rawTermScore ?? null,
                final: found?.finalTermScore ?? null,
                isRounded: Boolean(found?.isRounded),
              };
              if (found && found.termMaxScore > 0) {
                subjectMaxScore = Math.max(subjectMaxScore, found.termMaxScore);
              }
            } else {
              termScores[termCol.key] = null;
            }
            continue;
          }

          let targetIds = templateTerm.selectedModelIds.filter((id) =>
            modelsOfSubject.some((m) => m.id === id)
          );

          // If templateTerm belongs to another subject (e.g., Arabic Month 1), match same month names in this subject
          if (targetIds.length === 0 && templateTerm.selectedModelIds.length > 0) {
            const templateMonthNames = new Set(
              templateTerm.selectedModelIds
                .map((id) => monthlyModels.find((m) => m.id === id)?.name?.trim())
                .filter(Boolean)
                .map((n) => canonicalizeArabic(n!))
            );
            targetIds = modelsOfSubject
              .filter((m) => templateMonthNames.has(canonicalizeArabic(m.name?.trim() || '')))
              .map((m) => m.id);
          }

          if (targetIds.length === 0) {
            targetIds = modelsForMonths.map((m) => m.id);
          }

          if (targetIds.length > 0) {
            const syntheticTerm: TermModel = {
              ...templateTerm,
              subject: subj,
              selectedModelIds: targetIds,
              calculationMode:
                templateTerm.calculationMode === 'sum'
                  ? 'sum'
                  : targetIds.length > 1
                    ? 'average'
                    : 'single',
            };
            const summaries = calculateTermSummaries(syntheticTerm, modelsOfSubject);
            const found = summaries.find(
              (s) => canonicalizeArabic(s.name || '') === studentNameCanon
            );
            termScores[termCol.key] = found?.finalTermScore ?? null;
            termScoreDetails[termCol.key] = {
              raw: found?.rawTermScore ?? null,
              final: found?.finalTermScore ?? null,
              isRounded: Boolean(found?.isRounded),
            };
            if (found && found.termMaxScore > 0) {
              subjectMaxScore = Math.max(subjectMaxScore, found.termMaxScore);
            }
          } else {
            termScores[termCol.key] = null;
          }
        }

        if (subjectMaxScore <= 0 && modelsOfSubject.length > 0) {
          subjectMaxScore =
            modelsOfSubject.reduce(
              (max, m) => Math.max(max, Number(m.totalMaxScore) || 0),
              0
            ) || 100;
        }
        const effectiveSubjectMax = subjectMaxScore > 0 ? subjectMaxScore : 100;

        // Subject overall score: avoid double-counting aggregate terms with their source terms
        const validAggTermVals = termColumns
          .filter((tc) => tc.isAggregate)
          .map((tc) => termScores[tc.key])
          .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

        const validRegularTermVals = termColumns
          .filter((tc) => !tc.isAggregate)
          .map((tc) => termScores[tc.key])
          .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

        const validMonthVals = Object.values(monthScores).filter(
          (v): v is number => v !== null && !isNaN(v)
        );
        const baseVals =
          validAggTermVals.length > 0
            ? validAggTermVals
            : validRegularTermVals.length > 0
              ? validRegularTermVals
              : validMonthVals;
        const finalScore =
          baseVals.length > 0
            ? baseVals.length === 1
              ? baseVals[0]
              : Math.round(
                  (baseVals.reduce((acc, cur) => acc + cur, 0) / baseVals.length) * 100
                ) / 100
            : null;

        const rating = getRatingDetails(finalScore, effectiveSubjectMax);
        const isPass = rating.status === 'passed';

        if (finalScore !== null) {
          overallSum += finalScore;
          overallMaxSum += effectiveSubjectMax;
          overallCount++;
        }

        subjectRows.push({
          subjectName: subj,
          teacherName: teacherForSubj,
          monthScores,
          termScores,
          termScoreDetails,
          finalScore,
          ratingText: rating.text,
          ratingBadgeBg: rating.badgeBg,
          ratingBadgeText: rating.badgeText,
          isPass,
        });
      }

      const overallAverage =
        overallCount > 0 ? Math.round((overallSum / overallCount) * 100) / 100 : null;
      const overallMaxScore =
        overallCount > 0 && overallMaxSum > 0 ? overallMaxSum / overallCount : 100;
      const overallRating = getRatingDetails(overallAverage, overallMaxScore);
      const isOverallPass =
        overallAverage !== null &&
        overallRating.status === 'passed' &&
        subjectRows.every((s) => s.finalScore === null || s.isPass);

      return {
        studentId: student.studentId,
        name: student.name,
        gradeLevel: student.gradeLevel,
        section: student.section,
        monthColumns,
        termColumns,
        subjects: subjectRows,
        overallAverage,
        overallRating: {
          text: overallRating.text,
          badgeBg: overallRating.badgeBg,
          badgeText: overallRating.badgeText,
        },
        isOverallPass,
      };
    });
  }, [
    isOpen,
    visibleStudents,
    monthlyModels,
    terms,
    currentTerm,
    profile.subject,
    profile.teacherName,
    isAdministration,
    activeTermSelectedMonthKeys,
  ]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return studentCards.filter((card) => {
      if (selectedStudentId !== 'ALL' && card.studentId !== selectedStudentId) {
        return false;
      }
      if (q) {
        return (
          card.name.toLowerCase().includes(q) ||
          card.gradeLevel.toLowerCase().includes(q) ||
          card.section.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [studentCards, searchQuery, selectedStudentId]);

  if (!isOpen) return null;

  const handlePrintAllVisible = () => {
    triggerPrint(() => {
      setSinglePrintStudentId(null);
    });
  };

  const handlePrintSingleCard = (studentId: string) => {
    const cleanup = () => {
      setSinglePrintStudentId(null);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    triggerPrint(() => {
      setSinglePrintStudentId(studentId);
    });
    window.setTimeout(cleanup, 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 single-card-modal-backdrop"
      dir="rtl"
    >
      <div className="bg-[#F6F3E2] rounded-2xl shadow-2xl border border-[#AA8362] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden single-card-modal-content print:max-h-none print:overflow-visible print:shadow-none print:border-none print:bg-white">
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#2F2822] text-white flex items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#4E7A68] text-white flex items-center justify-center shrink-0 border border-white/20">
              <IdCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                كروت درجات الطلاب (الأشهر والمعدل)
              </h3>
              <p className="text-[11px] text-[#D8CEBD] truncate">
                عرض المواد الدراسية لكل طالب مع درجات الأشهر ودرجات المعدل المعتمدة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#D8CEBD] hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search, Student Selector & Print Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-[#FAF7EC] border-b border-[#D8CEBD] flex flex-wrap items-center justify-between gap-2.5 shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-4 h-4 text-[#8C7A68] absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم الطالب..."
                className="w-full pr-9 pl-3 py-1.5 text-xs font-bold bg-white border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#4E7A68]"
              />
            </div>

            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-[#D5C8B2] rounded-xl text-[#2F2822] focus:outline-none focus:border-[#4E7A68] cursor-pointer max-w-[210px]"
            >
              <option value="ALL">جميع الطلاب ({formatScoreDisplay(studentCards.length, numeralMode)})</option>
              {studentCards.map((st) => (
                <option key={st.studentId} value={st.studentId}>
                  {st.name} {st.section ? `(${st.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <NumeralModeToggle
              mode={numeralMode}
              onChange={handleNumeralModeChange}
              accent="emerald"
            />
            <button
              type="button"
              onClick={handlePrintAllVisible}
              disabled={filteredCards.length === 0}
              className="px-3.5 py-2 bg-[#4E7A68] hover:bg-[#3B6554] disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>
                {filteredCards.length === 1
                  ? 'طباعة كارت الطالب'
                  : `طباعة الكروت (${formatScoreDisplay(filteredCards.length, numeralMode)})`}
              </span>
            </button>
          </div>
        </div>

        {/* Cards List Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 print:overflow-visible print:max-h-none print:p-0 print:space-y-6">
          {filteredCards.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#D5C8B2] p-10 text-center space-y-2">
              <p className="text-sm font-black text-[#2F2822]">
                لا يوجد طلاب مطابقون للبحث
              </p>
              <p className="text-xs text-[#6B5E51]">
                تأكد من اختيار الشهر المرتبط بالفصل أو تعديل كلمة البحث.
              </p>
            </div>
          ) : (
            filteredCards.map((card) => {
              const hideDuringSinglePrint =
                singlePrintStudentId !== null && singlePrintStudentId !== card.studentId;

              return (
                <div
                  key={card.studentId}
                  className={`bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden break-inside-avoid print:border-2 print:border-slate-900 print:shadow-none ${
                    hideDuringSinglePrint ? 'print:hidden' : ''
                  }`}
                >
                  {/* School / Ministry Header */}
                  {(profile.schoolName || effectiveLogo) && (
                    <div className="p-3 px-4 bg-slate-50 border-b border-slate-300 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        {effectiveLogo ? (
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
                        <div className="text-xs text-slate-800 font-extrabold">
                          إدارة المدرسة
                        </div>
                      ) : profile.teacherName ? (
                        <div className="text-xs text-slate-600 font-medium">
                          المعلم: <strong className="text-slate-900">{profile.teacherName}</strong>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Student Header Info */}
                  <div className="bg-[#FAF7EC] border-b border-[#D8CEBD] p-3 sm:p-4 text-xs text-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#4E7A68] text-white flex items-center justify-center shadow-2xs shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block leading-none">
                            اسم الطالب:
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-[#2F2822] leading-tight">
                            {card.name}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-[#D8CEBD] font-bold text-slate-800">
                          الصف: <strong className="text-[#4E7A68]">{card.gradeLevel || '—'}</strong>
                        </span>
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-[#D8CEBD] font-bold text-slate-800">
                          الشعبة: <strong className="text-[#4E7A68]">{card.section || '—'}</strong>
                        </span>
                        <span
                          className="bg-white px-2.5 py-1 rounded-lg border border-[#D8CEBD] font-bold text-slate-800 tabular-nums"
                          dir="ltr"
                        >
                          {formatScoreDisplay(effectiveYear, numeralMode)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subjects Table with Monthly Scores + Term Averages */}
                  <div className="overflow-x-auto print:overflow-visible p-3 sm:p-4">
                    <table className="w-full text-center border-collapse border border-slate-300 bg-white text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 font-black border-b border-slate-300">
                          <th className="py-2.5 px-2.5 border-l border-slate-300 text-center w-10">
                            #
                          </th>
                          <th className="py-2 px-2 border-l border-slate-300 text-right min-w-[95px] text-[11px] font-extrabold">
                            <StackedHeaderLabel label="المادة الدراسية" />
                          </th>
                          {card.monthColumns.map((mc) => (
                            <th
                              key={mc.key}
                              className="py-2 px-2 border-l border-slate-300 text-center w-auto min-w-[60px] bg-[#EEF4F8] text-[#1E3A5F] text-[11px] font-extrabold"
                            >
                              <StackedHeaderLabel label={mc.displayName} />
                            </th>
                          ))}
                          {card.termColumns.map((tc) => (
                            <th
                              key={tc.key}
                              className={`py-2 px-2 border-l border-slate-300 text-center w-auto min-w-[66px] text-[11px] font-extrabold ${
                                tc.isAggregate
                                  ? 'bg-[#E8F3ED] text-[#1D3B2E]'
                                  : 'bg-[#FAF2EB] text-[#8C4528]'
                              }`}
                            >
                              <StackedHeaderLabel
                                label={tc.isAggregate ? tc.displayName : `معدل ${tc.displayName}`}
                              />
                            </th>
                          ))}
                          <th className="py-2 px-2 border-l border-slate-300 text-center min-w-[64px] text-[11px] font-extrabold">
                            التقدير
                          </th>
                          <th className="py-2 px-2 text-center min-w-[58px] text-[11px] font-extrabold">
                            النتيجة
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {card.subjects.length === 0 ? (
                          <tr>
                            <td
                              colSpan={
                                4 + card.monthColumns.length + card.termColumns.length
                              }
                              className="py-6 text-center text-slate-400 font-medium"
                            >
                              لا توجد مواد مسجلة لهذا الطالب حالياً.
                            </td>
                          </tr>
                        ) : (
                          card.subjects.map((sub, idx) => (
                            <tr
                              key={sub.subjectName}
                              className={`border-b border-slate-200 ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                              }`}
                            >
                              <td className="py-2.5 px-2.5 border-l border-slate-300 text-center font-bold text-slate-500 tabular-nums">
                                {formatScoreDisplay(idx + 1, numeralMode)}
                              </td>
                              <td className="py-2.5 px-3 border-l border-slate-300 text-right font-black text-slate-900">
                                <div>{sub.subjectName}</div>
                                {sub.teacherName && (
                                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                    أ. {sub.teacherName}
                                  </div>
                                )}
                              </td>

                              {/* Monthly Scores */}
                              {card.monthColumns.map((mc) => {
                                const sc = sub.monthScores[mc.key];
                                return (
                                  <td
                                    key={mc.key}
                                    className="py-2.5 px-2.5 border-l border-slate-300 text-center font-bold text-slate-800 tabular-nums"
                                  >
                                    {sc !== null && sc !== undefined ? (
                                      formatScoreDisplay(sc, numeralMode)
                                    ) : (
                                      <span className="text-slate-400 font-normal">—</span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Term Average Scores */}
                              {card.termColumns.map((tc) => {
                                const tScore = sub.termScores[tc.key];
                                const detail = sub.termScoreDetails?.[tc.key];
                                return (
                                  <td
                                    key={tc.key}
                                    className={`py-2.5 px-2.5 border-l border-slate-300 text-center font-black tabular-nums ${
                                      tc.isAggregate
                                        ? 'text-[#1D3B2E] bg-[#F1F8F4]'
                                        : 'text-[#8C4528] bg-[#FAF2EB]/40'
                                    }`}
                                  >
                                    {tScore !== null && tScore !== undefined ? (
                                      <div className="flex flex-col items-center justify-center leading-tight">
                                        <span>{formatScoreDisplay(tScore, numeralMode)}</span>
                                        {detail?.isRounded &&
                                          detail.raw !== null &&
                                          detail.raw !== undefined && (
                                            <span
                                              className="text-[10px] text-[#854D0E] font-bold mt-0.5 no-print"
                                              title={`الدرجة قبل التقريب كانت ${detail.raw}`}
                                            >
                                              (أصله: {formatScoreDisplay(detail.raw, numeralMode)})
                                            </span>
                                          )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 font-normal">—</span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Rating */}
                              <td className="py-2.5 px-2.5 border-l border-slate-300 text-center whitespace-nowrap">
                                {sub.finalScore !== null ? (
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${sub.ratingBadgeBg} ${sub.ratingBadgeText}`}
                                  >
                                    {sub.ratingText}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Pass/Fail */}
                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                {sub.finalScore !== null ? (
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
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>

                      {/* Student General Summary Footer */}
                      {card.subjects.length > 0 && (
                        <tfoot>
                          <tr className="bg-[#FAF7EC] font-black border-t-2 border-slate-400 text-slate-900">
                            <td
                              colSpan={2}
                              className="py-2.5 px-3 text-right border-l border-slate-300 text-xs"
                            >
                              النتيجة العامة للطالب:
                            </td>
                            <td
                              colSpan={Math.max(
                                1,
                                card.monthColumns.length + card.termColumns.length
                              )}
                              className="py-2.5 px-3 text-center border-l border-slate-300 text-xs text-slate-700 font-bold tabular-nums"
                            >
                              <span>عدد المواد: {formatScoreDisplay(card.subjects.length, numeralMode)}</span>
                              {card.overallAverage !== null && (
                                <>
                                  <span className="mx-2 text-slate-400">·</span>
                                  <span>
                                    المعدل العام:{' '}
                                    <strong className="text-[#4E7A68]">
                                      {formatScoreDisplay(card.overallAverage, numeralMode)}
                                    </strong>
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 text-center border-l border-slate-300">
                              {card.overallRating.text ? (
                                <span
                                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${card.overallRating.badgeBg} ${card.overallRating.badgeText}`}
                                >
                                  {card.overallRating.text}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              {card.overallAverage !== null ? (
                                card.isOverallPass ? (
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
                                '—'
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Card Footer Print Button */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end no-print">
                    <button
                      type="button"
                      onClick={() => handlePrintSingleCard(card.studentId)}
                      className="px-3.5 py-1.5 bg-[#4E7A68] hover:bg-[#3B6554] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة هذا الكارت</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
