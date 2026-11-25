import React, { useState, useMemo } from 'react';
import {
  MonthlyModel,
  TermModel,
  TeacherProfile,
  StudentSimpleCard,
  ClassSectionCard,
  PrintSettings,
} from '../../types';
import {
  calculateTermSummaries,
  getRatingDetails,
  getStudentMonthlyScoreBreakdown,
  orderTermsWithAggregates,
} from '../../utils/gradeCalculations';
import {
  normalizeGradeLevel,
  normalizeSection,
  getUniqueGradeLevels,
  getUniqueSections,
  isGradeLevelMatch,
  isSectionMatch,
  isSubjectMatch,
} from '../../utils/gradeAndSectionMatcher';
import { canonicalizeArabic } from '../../utils/arabicNameMatcher';
import { getCurrentUser } from '../../utils/auth';
import { triggerPrint } from '../../utils/printHelper';
import { getCurrentAcademicYear } from '../../utils/dateUtils';
import {
  Printer,
  FileSpreadsheet,
  Search,
  Sliders,
  AlertCircle,
  ArrowRight,
  Layers,
  School,
  LayoutGrid,
  Table as TableIcon,
  Users,
  Filter,
  User,
} from 'lucide-react';
import { ReportCardItem } from './ReportCardItem';
import { StudentCardModal } from './StudentCardModal';
import { PrintSettingsModal } from './PrintSettingsModal';
import { StackedHeaderLabel } from '../Common/StackedHeaderLabel';
import {
  StudentIndividualCardItem,
  StudentCardData,
  StudentSubjectScoreDetail,
} from './StudentIndividualCardItem';
import { SingleStudentCardModal } from './SingleStudentCardModal';
import { NumeralModeToggle } from '../Common/NumeralModeToggle';
import {
  NumeralMode,
  NUMERAL_MODE_STORAGE_KEY,
  formatScoreDisplay,
  getSavedNumeralMode,
} from '../../utils/numeralFormat';

interface Props {
  monthlyModels: MonthlyModel[];
  terms: TermModel[];
  profile: TeacherProfile;
  onUpdateProfile?: (profile: TeacherProfile) => void;
  onNavigateToTerms?: () => void;
  numeralMode?: NumeralMode;
  onNumeralModeChange?: (mode: NumeralMode) => void;
}

export const ReportCardsView: React.FC<Props> = ({
  monthlyModels,
  terms,
  profile,
  onUpdateProfile,
  onNavigateToTerms,
  numeralMode: propNumeralMode,
  onNumeralModeChange: propOnNumeralModeChange,
}) => {
  // User numeral preference synced with App/Monthly/Term views
  const [internalNumeralMode, setInternalNumeralMode] = useState<NumeralMode>(() => getSavedNumeralMode());
  const numeralMode: NumeralMode = propNumeralMode ?? internalNumeralMode;

  const handleNumeralModeChange = (mode: NumeralMode) => {
    setInternalNumeralMode(mode);
    try {
      localStorage.setItem(NUMERAL_MODE_STORAGE_KEY, mode);
    } catch {}
    propOnNumeralModeChange?.(mode);
  };

  // Display Mode: 'by_student' (اسم الطالب في الأعلى وأسماء المواد بالداخل - الافتراضي) | 'by_subject' (اسم المادة في الأعلى وأسماء الطلاب بالداخل)
  const [cardGroupingMode, setCardGroupingMode] = useState<'by_subject' | 'by_student'>('by_student');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // School administration check
  const isAdministration = useMemo(() => {
    const user = getCurrentUser();
    const userEmail = (user?.email || '').trim().toLowerCase();
    return (
      userEmail === 'asmaomar5566@gmail.com' ||
      user?.userRole === 'admin_school' ||
      profile.subject === 'الإدارة'
    );
  }, [profile.subject]);

  // Modals
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [selectedCardForModal, setSelectedCardForModal] =
    useState<ClassSectionCard | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] =
    useState<StudentCardData | null>(null);

  // Print settings
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    try {
      const saved = localStorage.getItem('gradebook_print_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      cardsPerPage: '1',
      orientation: 'portrait',
      margin: 'normal',
      customMarginMm: 10,
      showSchoolHeader: true,
      showSchoolLogo: true,
      showSignatures: false,
    };
  });

  const handleUpdateSettings = (newSettings: PrintSettings) => {
    setPrintSettings(newSettings);
    try {
      localStorage.setItem('gradebook_print_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = (updated: TeacherProfile) => {
    if (onUpdateProfile) {
      onUpdateProfile(updated);
    }
  };

  // Derive common academic year and subject
  const defaultAcademicYear =
    profile.academicYear?.trim() || monthlyModels[0]?.academicYear || getCurrentAcademicYear();
  const defaultSubject =
    profile.subject || monthlyModels[0]?.subject || 'المادة الدراسية';

  // Helper to resolve effective selectedModelIds for a term (matches TermCalculationView fallback)
  const getEffectiveTermModelIds = (term: TermModel): string[] => {
    if (term.selectedModelIds && term.selectedModelIds.length > 0) {
      return term.selectedModelIds;
    }
    try {
      const saved = localStorage.getItem(`daragat_term_selected_models_${term.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  };

  // Assemble student card data across all terms defined in "المعدل"
  const studentCards = useMemo(() => {
    if (terms.length === 0) return [];

    // Calculate summaries for each term using the exact same scoping & rounding rules as TermCalculationView
    const termResults = terms.map((term) => {
      const hasSourceTerms =
        term.sourceType === 'terms' || Boolean(term.selectedTermIds && term.selectedTermIds.length > 0);
      if (hasSourceTerms) {
        return {
          term,
          summaries: calculateTermSummaries(term, monthlyModels, terms),
        };
      }

      const effectiveIds = getEffectiveTermModelIds(term);
      const effectiveTerm: TermModel =
        effectiveIds.length !== (term.selectedModelIds || []).length
          ? { ...term, selectedModelIds: effectiveIds }
          : term;

      const scopedModels = monthlyModels.filter((m) => {
        const matchGrade =
          !term.gradeLevel || isGradeLevelMatch(m.gradeLevel || '', term.gradeLevel);
        const matchSubject =
          !term.subject || isSubjectMatch(m.subject, term.subject);
        const matchTeacher =
          !term.teacherName ||
          !m.teacherName ||
          canonicalizeArabic(m.teacherName) === canonicalizeArabic(term.teacherName);
        return matchGrade && matchSubject && matchTeacher;
      });

      return {
        term: effectiveTerm,
        summaries: calculateTermSummaries(
          effectiveTerm,
          scopedModels.length > 0 ? scopedModels : monthlyModels,
          terms
        ),
      };
    });

    // Collect all unique students
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        gradeLevel: string;
        section: string;
        termScores: Record<string, number | null>;
        termScoreDetails: Record<
          string,
          { raw: number | null; final: number | null; isRounded: boolean }
        >;
      }
    >();

    // 1. First add students in monthlyModels order
    for (const model of monthlyModels) {
      for (const s of model.students) {
        const key = s.name.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: s.id || key,
            name: s.name.trim(),
            gradeLevel: s.gradeLevel || '',
            section: s.section || '',
            termScores: {},
            termScoreDetails: {},
          });
        } else {
          const item = map.get(key)!;
          if (!item.gradeLevel && s.gradeLevel) item.gradeLevel = s.gradeLevel;
          if (!item.section && s.section) item.section = s.section;
        }
      }
    }

    // 2. Also ensure any students in term summaries are included
    for (const { summaries } of termResults) {
      for (const s of summaries) {
        const key = s.name.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: s.studentId || key,
            name: s.name.trim(),
            gradeLevel: s.gradeLevel || '',
            section: s.section || '',
            termScores: {},
            termScoreDetails: {},
          });
        }
      }
    }

    // 3. Assign each term's final & raw scores for each student (only for terms matching the student's grade & assigned sections)
    map.forEach((student, key) => {
      const studentCanon = canonicalizeArabic(student.name);
      termResults.forEach(({ term, summaries }) => {
        const matchGrade =
          !term.gradeLevel || !student.gradeLevel || isGradeLevelMatch(term.gradeLevel, student.gradeLevel);
        const matchSection =
          !term.assignedSections?.length ||
          !student.section ||
          term.assignedSections.some((sec) => isSectionMatch(sec, student.section));

        if (matchGrade && matchSection) {
          const found =
            summaries.find((s) => s.name.trim().toLowerCase() === key) ||
            summaries.find((s) => canonicalizeArabic(s.name) === studentCanon);
          student.termScores[term.id] = found?.finalTermScore ?? null;
          student.termScoreDetails[term.id] = {
            raw: found?.rawTermScore ?? null,
            final: found?.finalTermScore ?? null,
            isRounded: Boolean(found?.isRounded),
          };
        }
      });
    });

    return Array.from(map.values());
  }, [terms, monthlyModels]);

  // Group students by Class & Section, and in administration/multi-subject mode, by Subject and Teacher
  const classCards = useMemo(() => {
    if (terms.length === 0 && monthlyModels.length === 0) return [];

    // Distinct subjects extracted from monthlyModels and terms
    const rawSubjects = Array.from(
      new Set(
        [
          ...monthlyModels.map((m) => m.subject?.trim()),
          ...terms.map((t) => t.subject?.trim()),
          profile.subject !== 'الإدارة' ? profile.subject?.trim() : undefined,
        ].filter(Boolean) as string[]
      )
    );

    const distinctSubjects = rawSubjects.length > 0 ? rawSubjects : ['المادة الدراسية'];
    const isMultiSubject = isAdministration || distinctSubjects.length > 1;

    const groupMap = new Map<string, ClassSectionCard>();

    if (!isMultiSubject) {
      // Single-teacher mode: straightforward grouping by grade & section
      const singleSubj = profile.subject || monthlyModels[0]?.subject || 'المادة الدراسية';
      const singleTeacher = profile.teacherName || monthlyModels[0]?.teacherName || '';

      for (const student of studentCards) {
        const g = normalizeGradeLevel(student.gradeLevel?.trim() || '');
        const s = normalizeSection(student.section?.trim() || '');
        const key = `${g}|||${s}`;

        if (!groupMap.has(key)) {
          groupMap.set(key, {
            id: key,
            gradeLevel: g,
            section: s,
            subject: singleSubj,
            teacherName: singleTeacher,
            students: [],
          });
        }

        groupMap.get(key)!.students.push(student);
      }

      return Array.from(groupMap.values());
    }

    // Administration Mode: Generate dedicated cards per Subject, Grade, Section, and Teacher
    for (const subj of distinctSubjects) {
      const subjectModels = monthlyModels.filter((m) => isSubjectMatch(m.subject, subj));
      const subjectTerms = terms.filter((t) => isSubjectMatch(t.subject, subj));

      // Collect all grades present for this subject
      const subjectGrades = new Set<string>();
      subjectModels.forEach((m) => {
        if (m.gradeLevel?.trim()) subjectGrades.add(normalizeGradeLevel(m.gradeLevel.trim()));
      });
      subjectTerms.forEach((t) => {
        if (t.gradeLevel?.trim()) subjectGrades.add(normalizeGradeLevel(t.gradeLevel.trim()));
      });
      studentCards.forEach((st) => {
        if (st.gradeLevel?.trim()) subjectGrades.add(normalizeGradeLevel(st.gradeLevel.trim()));
      });

      subjectGrades.forEach((g) => {
        // Collect all sections for this grade
        const sectionsSet = new Set<string>();
        monthlyModels.forEach((m) => {
          if (isGradeLevelMatch(m.gradeLevel || '', g)) {
            (m.assignedSections || []).forEach((sec) => sectionsSet.add(normalizeSection(sec)));
            (m.students || []).forEach((st) => {
              if (st.section?.trim()) sectionsSet.add(normalizeSection(st.section.trim()));
            });
          }
        });
        terms.forEach((t) => {
          if (isGradeLevelMatch(t.gradeLevel || '', g)) {
            (t.assignedSections || []).forEach((sec) => sectionsSet.add(normalizeSection(sec)));
          }
        });
        studentCards.forEach((st) => {
          if (isGradeLevelMatch(st.gradeLevel || '', g) && st.section?.trim()) {
            sectionsSet.add(normalizeSection(st.section.trim()));
          }
        });

        if (sectionsSet.size === 0) {
          sectionsSet.add('أ');
        }

        sectionsSet.forEach((sec) => {
          // Determine the designated teacher for this subject, grade, and section
          // 1. Check if any model for this grade and subject specifically has assignedSections including this section
          const explicitSectionModel = subjectModels.find(
            (m) =>
              isGradeLevelMatch(m.gradeLevel || '', g) &&
              m.assignedSections &&
              m.assignedSections.some((s) => isSectionMatch(s, sec)) &&
              Boolean(m.teacherName?.trim())
          );
          // 2. Check if any term for this grade and subject specifically has assignedSections including this section
          const explicitSectionTerm = subjectTerms.find(
            (t) =>
              isGradeLevelMatch(t.gradeLevel || '', g) &&
              t.assignedSections &&
              t.assignedSections.some((s) => isSectionMatch(s, sec)) &&
              Boolean(t.teacherName?.trim())
          );
          // 3. Check general model for this grade and subject with a teacher
          const generalModel = subjectModels.find(
            (m) => isGradeLevelMatch(m.gradeLevel || '', g) && Boolean(m.teacherName?.trim())
          );
          // 4. Check general term for this grade and subject with a teacher
          const generalTerm = subjectTerms.find(
            (t) => isGradeLevelMatch(t.gradeLevel || '', g) && Boolean(t.teacherName?.trim())
          );

          const teacher =
            explicitSectionModel?.teacherName ||
            explicitSectionTerm?.teacherName ||
            generalModel?.teacherName ||
            generalTerm?.teacherName ||
            subjectModels[0]?.teacherName ||
            subjectTerms[0]?.teacherName ||
            (profile.subject && isSubjectMatch(profile.subject, subj) ? profile.teacherName : '') ||
            '';

          // Get students in this grade and section
          const classStudents: StudentSimpleCard[] = [];
          studentCards.forEach((st) => {
            if (isGradeLevelMatch(st.gradeLevel || '', g) && isSectionMatch(st.section || '', sec)) {
              // Map term scores specifically for terms of this subject and teacher
              const termScoresForCard: Record<string, number | null> = {};
              const termScoreDetailsForCard: Record<
                string,
                { raw: number | null; final: number | null; isRounded: boolean }
              > = {};
              subjectTerms.forEach((t) => {
                if (isGradeLevelMatch(t.gradeLevel || '', g)) {
                  const matchTeacher =
                    !t.teacherName ||
                    !teacher ||
                    canonicalizeArabic(t.teacherName) === canonicalizeArabic(teacher);
                  const matchSection =
                    !t.assignedSections?.length ||
                    t.assignedSections.some((s) => isSectionMatch(s, sec));
                  if (matchTeacher && matchSection) {
                    termScoresForCard[t.id] = st.termScores[t.id] ?? null;
                    if (st.termScoreDetails?.[t.id]) {
                      termScoreDetailsForCard[t.id] = st.termScoreDetails[t.id];
                    }
                  }
                }
              });

              classStudents.push({
                ...st,
                termScores: termScoresForCard,
                termScoreDetails: termScoreDetailsForCard,
              });
            }
          });

          if (classStudents.length > 0) {
            const cardId = `${g}|||${sec}|||${canonicalizeArabic(subj)}|||${canonicalizeArabic(teacher)}`;
            groupMap.set(cardId, {
              id: cardId,
              gradeLevel: g,
              section: sec,
              subject: subj,
              teacherName: teacher,
              students: classStudents,
            });
          }
        });
      });
    }

    return Array.from(groupMap.values());
  }, [studentCards, terms, monthlyModels, isAdministration, profile]);

  // Unique sections & grade levels for filtering at the top (deduplicated canonically)
  const allSections = useMemo(() => {
    return getUniqueSections(classCards);
  }, [classCards]);

  const allGradeLevels = useMemo(() => {
    return getUniqueGradeLevels(classCards);
  }, [classCards]);

  const allSubjects = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    classCards.forEach((c) => {
      if (c.subject) {
        const canon = canonicalizeArabic(c.subject);
        if (!seen.has(canon)) {
          seen.add(canon);
          list.push(c.subject);
        }
      }
    });
    return list;
  }, [classCards]);

  // Filter cards based on selected Grade Level, Section, Subject, and Search
  const filteredClassCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return classCards
      .filter((card) => {
        const matchGrade = isGradeLevelMatch(card.gradeLevel, selectedGradeLevel);
        const matchSection = isSectionMatch(card.section, selectedSection);
        const matchSubject =
          selectedSubjectFilter === 'ALL' ||
          !card.subject ||
          isSubjectMatch(card.subject, selectedSubjectFilter);

        if (!matchGrade || !matchSection || !matchSubject) return false;

        if (query) {
          const matchClassName =
            card.gradeLevel.toLowerCase().includes(query) ||
            card.section.toLowerCase().includes(query) ||
            (card.subject && card.subject.toLowerCase().includes(query)) ||
            (card.teacherName && card.teacherName.toLowerCase().includes(query));
          const matchStudent = card.students.some((s) =>
            s.name.toLowerCase().includes(query)
          );
          return matchClassName || matchStudent;
        }

        return true;
      })
      .map((card) => {
        if (query) {
          const matchClassName =
            card.gradeLevel.toLowerCase().includes(query) ||
            card.section.toLowerCase().includes(query) ||
            (card.subject && card.subject.toLowerCase().includes(query)) ||
            (card.teacherName && card.teacherName.toLowerCase().includes(query));
          if (!matchClassName) {
            return {
              ...card,
              students: card.students.filter((s) =>
                s.name.toLowerCase().includes(query)
              ),
            };
          }
        }
        return card;
      });
  }, [classCards, selectedGradeLevel, selectedSection, selectedSubjectFilter, searchQuery]);

  // Total students currently shown in filtered cards
  const totalFilteredStudents = useMemo(() => {
    return filteredClassCards.reduce((acc, c) => acc + c.students.length, 0);
  }, [filteredClassCards]);

  // Individual Student Cards calculation (for "حسب اسم الطالب" mode):
  const individualStudentCards = useMemo(() => {
    // Collect all unique students across all monthlyModels
    const studentMap = new Map<
      string,
      {
        id: string;
        name: string;
        gradeLevel: string;
        section: string;
      }
    >();

    for (const model of monthlyModels) {
      for (const s of model.students || []) {
        const cleanedName = s.name?.trim();
        if (!cleanedName) continue;
        const key = cleanedName.toLowerCase();
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            id: s.id || key,
            name: cleanedName,
            gradeLevel: s.gradeLevel || '',
            section: s.section || '',
          });
        } else {
          const item = studentMap.get(key)!;
          if (!item.gradeLevel && s.gradeLevel) item.gradeLevel = s.gradeLevel;
          if (!item.section && s.section) item.section = s.section;
        }
      }
    }

    // Extract distinct subjects across monthlyModels
    const distinctSubjects = Array.from(
      new Set(
        monthlyModels
          .map((m) => m.subject?.trim() || profile.subject?.trim() || 'المادة الدراسية')
          .filter(Boolean)
      )
    );

    if (distinctSubjects.length === 0) {
      distinctSubjects.push(profile.subject?.trim() || 'المادة الدراسية');
    }

    const cards: StudentCardData[] = [];

    // Pre-index student lookup maps per monthlyModel once
    const modelStudentLookup = new Map<
      string,
      { byLower: Map<string, (typeof monthlyModels)[number]['students'][number]>; byCanon: Map<string, (typeof monthlyModels)[number]['students'][number]> }
    >();
    for (const m of monthlyModels) {
      const byLower = new Map<string, (typeof monthlyModels)[number]['students'][number]>();
      const byCanon = new Map<string, (typeof monthlyModels)[number]['students'][number]>();
      for (const s of m.students || []) {
        const lower = s.name?.trim().toLowerCase();
        const canon = canonicalizeArabic(s.name || '');
        if (lower && !byLower.has(lower)) byLower.set(lower, s);
        if (canon && !byCanon.has(canon)) byCanon.set(canon, s);
      }
      modelStudentLookup.set(m.id, { byLower, byCanon });
    }

    // Cache calculateTermSummaries results keyed by term + model/source ids
    const termSummaryCache = new Map<
      string,
      {
        byLower: Map<string, ReturnType<typeof calculateTermSummaries>[number]>;
        byCanon: Map<string, ReturnType<typeof calculateTermSummaries>[number]>;
      }
    >();

    const getCachedTermSummaries = (
      cacheKey: string,
      compute: () => ReturnType<typeof calculateTermSummaries>
    ) => {
      let cached = termSummaryCache.get(cacheKey);
      if (!cached) {
        const list = compute();
        const byLower = new Map<string, (typeof list)[number]>();
        const byCanon = new Map<string, (typeof list)[number]>();
        for (const item of list) {
          const lower = item.name.trim().toLowerCase();
          const canon = canonicalizeArabic(item.name);
          if (lower && !byLower.has(lower)) byLower.set(lower, item);
          if (canon && !byCanon.has(canon)) byCanon.set(canon, item);
        }
        cached = { byLower, byCanon };
        termSummaryCache.set(cacheKey, cached);
      }
      return cached;
    };

    studentMap.forEach((studentInfo, key) => {
      const studentCanon = canonicalizeArabic(studentInfo.name);
      const subjectDetails: StudentSubjectScoreDetail[] = [];
      let totalSum = 0;
      let totalMaxSum = 0;
      let subjectsCount = 0;

      for (const subj of distinctSubjects) {
        const modelsOfSubject = monthlyModels.filter((m) => {
          const mSubj = m.subject?.trim() || profile.subject?.trim() || 'المادة الدراسية';
          if (!isSubjectMatch(mSubj, subj)) return false;
          const matchGrade =
            !m.gradeLevel ||
            !studentInfo.gradeLevel ||
            isGradeLevelMatch(m.gradeLevel, studentInfo.gradeLevel);
          if (!matchGrade) return false;
          if (m.assignedSections && m.assignedSections.length > 0 && studentInfo.section) {
            return m.assignedSections.some((sec) => isSectionMatch(sec, studentInfo.section));
          }
          return true;
        });

        const matchingModelForTeacher = modelsOfSubject.find(
          (m) =>
            !m.assignedSections?.length ||
            m.assignedSections.some((sec) => isSectionMatch(sec, studentInfo.section))
        );
        const teacherForSubj =
          matchingModelForTeacher?.teacherName ||
          modelsOfSubject.find((m) => Boolean(m.teacherName?.trim()))?.teacherName ||
          terms.find(
            (t) =>
              isSubjectMatch(t.subject, subj) &&
              (!t.gradeLevel || !studentInfo.gradeLevel || isGradeLevelMatch(t.gradeLevel, studentInfo.gradeLevel)) &&
              (!t.assignedSections?.length || !studentInfo.section || t.assignedSections.some((sec) => isSectionMatch(sec, studentInfo.section))) &&
              Boolean(t.teacherName?.trim())
          )?.teacherName ||
          (!isAdministration && profile.subject && isSubjectMatch(profile.subject, subj) ? profile.teacherName : undefined);

        const termScores: Record<string, number | null> = {};
        const termScoreDetails: Record<
          string,
          { raw: number | null; final: number | null; isRounded: boolean }
        > = {};
        let subjectMaxScore = 0;

        // Filter terms relevant to this student's grade level and section
        const relevantTermsForStudent = terms.filter(
          (t) =>
            (!t.gradeLevel ||
              !studentInfo.gradeLevel ||
              isGradeLevelMatch(t.gradeLevel, studentInfo.gradeLevel)) &&
            (!t.assignedSections?.length ||
              !studentInfo.section ||
              t.assignedSections.some((sec) => isSectionMatch(sec, studentInfo.section)))
        );

        if (relevantTermsForStudent.length > 0) {
          relevantTermsForStudent.forEach((term) => {
            // Respect term.subject and term.teacherName if explicitly specified
            if (term.subject && !isSubjectMatch(term.subject, subj)) {
              termScores[term.id] = null;
              return;
            }
            if (
              term.teacherName &&
              teacherForSubj &&
              canonicalizeArabic(term.teacherName) !== canonicalizeArabic(teacherForSubj)
            ) {
              termScores[term.id] = null;
              return;
            }

            const isAggTerm = (t: TermModel) =>
              t.sourceType === 'terms' || Boolean(t.selectedTermIds && t.selectedTermIds.length > 0);

            if (isAggTerm(term)) {
              const validSourceIds = (term.selectedTermIds || []).filter((srcId) => {
                const src = relevantTermsForStudent.find(
                  (rt) => rt.id === srcId && !isAggTerm(rt)
                );
                if (!src) return false;
                if (src.subject && !isSubjectMatch(src.subject, subj)) return false;
                if (
                  src.teacherName &&
                  teacherForSubj &&
                  canonicalizeArabic(src.teacherName) !== canonicalizeArabic(teacherForSubj)
                ) {
                  return false;
                }
                return true;
              });

              const effectiveIds = getEffectiveTermModelIds(term);
              const termModelIdsForSubj = effectiveIds.filter((id) =>
                modelsOfSubject.some((m) => m.id === id)
              );
              const relevantHybridModels = modelsOfSubject.filter((m) =>
                termModelIdsForSubj.includes(m.id)
              );

              if (validSourceIds.length > 0 || relevantHybridModels.length > 0) {
                const cacheKey = `agg:${term.id}:${relevantHybridModels.map((m) => m.id).join(',')}:${validSourceIds.join(',')}:${modelsOfSubject.map((m) => m.id).join(',')}`;
                const cached = getCachedTermSummaries(cacheKey, () => {
                  const aggTermForSubj: TermModel = {
                    ...term,
                    selectedModelIds: relevantHybridModels.map((m) => m.id),
                    selectedTermIds: validSourceIds,
                  };
                  return calculateTermSummaries(
                    aggTermForSubj,
                    modelsOfSubject,
                    relevantTermsForStudent
                  );
                });
                const found = cached.byLower.get(key) || cached.byCanon.get(studentCanon);

                if (found) {
                  termScores[term.id] = found.finalTermScore;
                  termScoreDetails[term.id] = {
                    raw: found.rawTermScore ?? null,
                    final: found.finalTermScore,
                    isRounded: Boolean(found.isRounded),
                  };
                  if (found.termMaxScore > 0) {
                    subjectMaxScore = Math.max(subjectMaxScore, found.termMaxScore);
                  }
                } else {
                  termScores[term.id] = null;
                }
              } else {
                termScores[term.id] = null;
              }
              return;
            }

            const effectiveIds = getEffectiveTermModelIds(term);
            const termModelIdsForSubj = effectiveIds.filter((id) =>
              modelsOfSubject.some((m) => m.id === id)
            );
            const targetModelIds =
              termModelIdsForSubj.length > 0 ? termModelIdsForSubj : effectiveIds;

            const relevantModels = modelsOfSubject.filter((m) =>
              targetModelIds.includes(m.id)
            );

            if (relevantModels.length > 0) {
              const cacheKey = `reg:${term.id}:${relevantModels.map((m) => m.id).join(',')}`;
              const cached = getCachedTermSummaries(cacheKey, () => {
                const termForSubj: TermModel = {
                  ...term,
                  selectedModelIds: relevantModels.map((m) => m.id),
                };
                return calculateTermSummaries(termForSubj, relevantModels);
              });
              const found = cached.byLower.get(key) || cached.byCanon.get(studentCanon);

              if (found) {
                termScores[term.id] = found.finalTermScore;
                termScoreDetails[term.id] = {
                  raw: found.rawTermScore ?? null,
                  final: found.finalTermScore,
                  isRounded: Boolean(found.isRounded),
                };
                if (found.termMaxScore > 0) {
                  subjectMaxScore = Math.max(subjectMaxScore, found.termMaxScore);
                }
              } else {
                termScores[term.id] = null;
              }
            } else {
              termScores[term.id] = null;
            }
          });
        } else {
          // If no terms defined yet for this grade, display monthly model scores
          modelsOfSubject.forEach((m) => {
            const lookup = modelStudentLookup.get(m.id);
            const st = lookup?.byLower.get(key) || lookup?.byCanon.get(studentCanon);
            if (st) {
              const bd = getStudentMonthlyScoreBreakdown(st, m);
              termScores[m.id] = bd.finalScore;
              termScoreDetails[m.id] = {
                raw: bd.rawScore,
                final: bd.finalScore,
                isRounded: bd.isRounded,
              };
              const mMax = Number(m.totalMaxScore) || 100;
              subjectMaxScore = Math.max(subjectMaxScore, mMax);
            }
          });
        }

        if (subjectMaxScore <= 0 && modelsOfSubject.length > 0) {
          subjectMaxScore =
            modelsOfSubject.reduce(
              (max, m) => Math.max(max, Number(m.totalMaxScore) || 0),
              0
            ) || 100;
        }
        const effectiveSubjectMax = subjectMaxScore > 0 ? subjectMaxScore : 100;

        // Avoid double-counting: prefer aggregate/hybrid terms when present for this subject, else regular term / model scores
        const isAggTermCheck = (t: TermModel) =>
          t.sourceType === 'terms' || Boolean(t.selectedTermIds && t.selectedTermIds.length > 0);
        const aggregateScores = relevantTermsForStudent
          .filter(
            (t) =>
              isAggTermCheck(t) &&
              termScores[t.id] !== null &&
              termScores[t.id] !== undefined &&
              !isNaN(termScores[t.id] as number)
          )
          .map((t) => termScores[t.id] as number);

        const regularScores = Object.entries(termScores)
          .filter(([id, v]) => {
            if (v === null || v === undefined || isNaN(v)) return false;
            const tObj = relevantTermsForStudent.find((t) => t.id === id);
            return !tObj || !isAggTermCheck(tObj);
          })
          .map(([, v]) => v as number);

        const validScores = aggregateScores.length > 0 ? aggregateScores : regularScores;
        const finalScore =
          validScores.length > 0
            ? validScores.length === 1
              ? validScores[0]
              : Math.round(
                  (validScores.reduce((acc, cur) => acc + cur, 0) / validScores.length) * 100
                ) / 100
            : null;

        const rating = getRatingDetails(finalScore, effectiveSubjectMax);
        const isPass = rating.status === 'passed';

        if (finalScore !== null) {
          totalSum += finalScore;
          totalMaxSum += effectiveSubjectMax;
          subjectsCount++;
        }

        subjectDetails.push({
          subjectName: subj,
          teacherName: teacherForSubj,
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
        subjectsCount > 0 ? Math.round((totalSum / subjectsCount) * 100) / 100 : null;
      const overallMaxScore =
        subjectsCount > 0 && totalMaxSum > 0 ? totalMaxSum / subjectsCount : 100;
      const overallRating = getRatingDetails(overallAverage, overallMaxScore);
      const isOverallPass =
        overallAverage !== null &&
        overallRating.status === 'passed' &&
        subjectDetails.every((s) => s.finalScore === null || s.isPass);

      cards.push({
        studentId: studentInfo.id,
        name: studentInfo.name,
        gradeLevel: studentInfo.gradeLevel,
        section: studentInfo.section,
        subjects: subjectDetails,
        totalScore: subjectsCount > 0 ? totalSum : null,
        overallAverage,
        overallRating: {
          text: overallRating.text,
          badgeBg: overallRating.badgeBg,
          badgeText: overallRating.badgeText,
        },
        isOverallPass,
      });
    });

    return cards;
  }, [monthlyModels, terms, profile.subject, profile.teacherName, isAdministration]);

  // Filter individual student cards
  const filteredStudentCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return individualStudentCards.filter((card) => {
      const matchGrade = isGradeLevelMatch(card.gradeLevel, selectedGradeLevel);
      const matchSection = isSectionMatch(card.section, selectedSection);
      if (!matchGrade || !matchSection) return false;
      if (query) {
        return (
          card.name.toLowerCase().includes(query) ||
          card.gradeLevel.toLowerCase().includes(query) ||
          card.section.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [individualStudentCards, selectedGradeLevel, selectedSection, searchQuery]);

  // Export single class card to Excel
  const handleExportClassExcel = (card: ClassSectionCard) => {
    const cardTerms = orderTermsWithAggregates(
      terms.filter((t) => {
        const matchGrade = !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, card.gradeLevel);
        const matchSub = !card.subject || !t.subject || isSubjectMatch(t.subject, card.subject);
        const matchTeacher =
          !card.teacherName ||
          !t.teacherName ||
          canonicalizeArabic(t.teacherName) === canonicalizeArabic(card.teacherName);
        return matchGrade && matchSub && matchTeacher;
      })
    );

    const headers = [
      'ت',
      'اسم الطالب',
      'المرحلة / الصف',
      'الشعبة',
      'السنة الدراسية',
      'المادة',
      ...cardTerms.map((t) => `درجة ${t.name}`),
    ];

    const rows = card.students.map((student, idx) => {
      const scores = cardTerms.map((t) => {
        const score = student.termScores[t.id];
        return score !== null && score !== undefined ? score : '';
      });

      return [
        idx + 1,
        `"${student.name}"`,
        `"${card.gradeLevel || '—'}"`,
        `"${card.section || '—'}"`,
        `"${defaultAcademicYear}"`,
        `"${defaultSubject}"`,
        ...scores,
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeGrade = (card.gradeLevel || 'صف').replace(/\s+/g, '_');
    const safeSection = (card.section || 'شعبة').replace(/\s+/g, '_');
    link.setAttribute('download', `كشف_درجات_${safeGrade}_${safeSection}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export all visible cards to Excel (CSV with UTF-8 BOM)
  const handleExportAllExcel = () => {
    const applicableTerms = orderTermsWithAggregates(
      selectedGradeLevel !== 'ALL'
        ? terms.filter((t) => !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, selectedGradeLevel))
        : terms
    );

    if (cardGroupingMode === 'by_student') {
      const headers = [
        'ت',
        'اسم الطالب',
        'المرحلة / الصف',
        'الشعبة',
        'السنة الدراسية',
        'المادة الدراسية',
        ...applicableTerms.map((t) => `درجة ${t.name}`),
        'التقدير',
        'النتيجة',
      ];

      let counter = 1;
      const rows: (string | number)[][] = [];

      filteredStudentCards.forEach((stCard) => {
        stCard.subjects.forEach((sub) => {
          const scores = applicableTerms.map((t) => {
            if (t.gradeLevel && stCard.gradeLevel && !isGradeLevelMatch(t.gradeLevel, stCard.gradeLevel)) {
              return '';
            }
            const sc = sub.termScores[t.id];
            return sc !== null && sc !== undefined ? sc : '';
          });

          rows.push([
            counter++,
            `"${stCard.name}"`,
            `"${stCard.gradeLevel || '—'}"`,
            `"${stCard.section || '—'}"`,
            `"${defaultAcademicYear}"`,
            `"${sub.subjectName}"`,
            ...scores,
            `"${sub.ratingText}"`,
            sub.isPass ? '"ناجح"' : '"راسب"',
          ]);
        });
      });

      const csvContent =
        '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `كروت_درجات_الطلاب.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      'ت',
      'اسم الطالب',
      'المرحلة / الصف',
      'الشعبة',
      'السنة الدراسية',
      'المادة',
      ...applicableTerms.map((t) => `درجة ${t.name}`),
    ];

    let counter = 1;
    const rows: (string | number)[][] = [];

    filteredClassCards.forEach((card) => {
      card.students.forEach((student) => {
        const scores = applicableTerms.map((t) => {
          if (t.gradeLevel && card.gradeLevel && !isGradeLevelMatch(t.gradeLevel, card.gradeLevel)) {
            return '';
          }
          const score = student.termScores[t.id];
          return score !== null && score !== undefined ? score : '';
        });

        rows.push([
          counter++,
          `"${student.name}"`,
          `"${card.gradeLevel || '—'}"`,
          `"${card.section || '—'}"`,
          `"${defaultAcademicYear}"`,
          `"${defaultSubject}"`,
          ...scores,
        ]);
      });
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_درجات_كافة_الصفوف.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMarginCssValue = () => {
    switch (printSettings.margin) {
      case 'narrow':
        return '5mm';
      case 'wide':
        return '15mm';
      case 'custom':
        return `${Math.max(2, Math.min(30, printSettings.customMarginMm || 10))}mm`;
      case 'normal':
      default:
        return '10mm';
    }
  };

  // Print all visible cards
  const handlePrintAll = () => {
    triggerPrint(() => {
      setSelectedCardForModal(null);
      setSelectedStudentForModal(null);
    });
  };

  // Print single class card
  const handlePrintSingleClass = (card: ClassSectionCard) => {
    triggerPrint(() => {
      setSelectedCardForModal(card);
      setSelectedStudentForModal(null);
    });
  };

  // Print single student card
  const handlePrintSingleStudent = (card: StudentCardData) => {
    triggerPrint(() => {
      setSelectedStudentForModal(card);
      setSelectedCardForModal(null);
    });
  };

  // If no terms exist yet in the system
  if (terms.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="bg-[#4E7A68] rounded-2xl p-6 text-white shadow-md border border-[#3B6554]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">كروت درجات الصفوف</h2>
              <p className="text-xs text-white/90 mt-1">
                عرض كروت درجات الفصول لكل صف وشعبة مع إمكانية التصدير والطباعة
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#FAF7EC] rounded-2xl border border-[#D8CEBD] p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 bg-[#E8D7C2] text-[#8C6544] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#C2A88F]">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#2F2822] mb-2">
            لم يتم إنشاء أي فصول درجات بعد
          </h3>
          <p className="text-xs sm:text-sm text-[#7A6E61] mb-6 leading-relaxed">
            لعرض كروت درجات الصفوف، يرجى الانتقال إلى صفحة <strong>(المعدل)</strong> أولاً وإنشاء فصل دراسي (مثل: الفصل الأول، الفصل الثاني).
          </p>
          {onNavigateToTerms && (
            <button
              type="button"
              onClick={onNavigateToTerms}
              className="inline-flex items-center gap-2 px-5 py-2.5 craft-btn-primary text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>الانتقال لصفحة المعدل لإنشاء فصل</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Dynamic Print CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${printSettings.orientation === 'landscape' ? 'landscape' : 'portrait'};
                margin: ${getMarginCssValue()};
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
                font-size: 11pt !important;
              }
              .no-print,
              button,
              header,
              nav,
              .print\\:hidden {
                display: none !important;
              }
              ${
                selectedCardForModal || selectedStudentForModal
                  ? `
                .report-cards-print-grid {
                  display: none !important;
                }
                .single-card-modal-content {
                  box-shadow: none !important;
                  border: none !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  max-height: none !important;
                  height: auto !important;
                  overflow: visible !important;
                }
                .single-card-modal-content > div {
                  overflow: visible !important;
                  max-height: none !important;
                  height: auto !important;
                }
                .single-card-modal-backdrop {
                  position: static !important;
                  background: transparent !important;
                  padding: 0 !important;
                  display: block !important;
                  inset: auto !important;
                  width: 100% !important;
                  height: auto !important;
                }
              `
                  : `
                .single-card-modal-backdrop {
                  display: none !important;
                }
                .report-cards-print-grid {
                  display: block !important;
                  width: 100% !important;
                }
              `
              }
              ${
                printSettings.cardsPerPage === '1'
                  ? `
                .report-cards-print-grid > div,
                .student-table-card,
                .student-individual-card {
                  page-break-after: always !important;
                  break-after: page !important;
                }
                .report-cards-print-grid > div:last-child,
                .student-table-card:last-child,
                .student-individual-card:last-child {
                  page-break-after: auto !important;
                  break-after: auto !important;
                }
              `
                  : printSettings.cardsPerPage === '2'
                  ? `
                .report-cards-print-grid > div:nth-child(2n),
                .student-table-card:nth-child(2n),
                .student-individual-card:nth-child(2n) {
                  page-break-after: always !important;
                  break-after: page !important;
                }
              `
                  : ''
              }
              .report-cards-print-grid > div,
              .student-table-card,
              .student-individual-card {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                margin-bottom: 24px !important;
                border: 2px solid #000000 !important;
                box-shadow: none !important;
                background: #fff !important;
                color: #000000 !important;
              }
              .student-table-card table,
              .student-table-card th,
              .student-table-card td,
              .student-individual-card table,
              .student-individual-card th,
              .student-individual-card td {
                border: 1px solid #000000 !important;
                color: #000000 !important;
              }
              .student-table-card th,
              .student-individual-card th {
                background: #f1f5f9 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      {/* 1. Top Term Names Display: Only displays names of terms created in "المعدل" - Sage Green Theme */}
      <div className="bg-[#4E7A68] rounded-2xl p-4 sm:p-5 text-white shadow-md border border-[#3B6554] space-y-3 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>فصول الدرجات المعتمدة في المعدل</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {formatScoreDisplay(terms.length, numeralMode)} {terms.length === 1 ? 'فصل' : 'فصول'}
                </span>
              </h2>
              <p className="text-xs text-white/90 mt-0.5">
                تظهر هنا أسماء الفصول المعرفة في صفحة المعدل، وتُعرض درجاتها مباشرة لكل صف وشعبة أدناه.
              </p>
            </div>
          </div>
        </div>

        {/* Display the names of the terms created in the "المعدل" page */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {orderTermsWithAggregates(terms).map((t) => (
            <div
              key={t.id}
              className={`px-3.5 py-1.5 rounded-xl border text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xs select-none ${
                t.sourceType === 'terms'
                  ? 'bg-[#2C4E3F] border-emerald-300/60'
                  : 'bg-white/15 border-white/25'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  t.sourceType === 'terms' ? 'bg-emerald-300' : 'bg-amber-300'
                }`}
              ></span>
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Mode Selector: By Subject vs By Student Name */}
      <div className="bg-[#FAF7EC] p-3 sm:p-3.5 rounded-2xl border border-[#D8CEBD] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#554A3E]">
            طريقة عرض الكروت:
          </span>
          <div className="flex items-center bg-[#EBE1CF] p-1 rounded-xl border border-[#D4C4AA]">
            <button
              type="button"
              onClick={() => setCardGroupingMode('by_student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                cardGroupingMode === 'by_student'
                  ? 'bg-[#4E7A68] text-white shadow-xs font-black'
                  : 'text-[#4A3B2C] hover:text-[#2F2822]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>حسب اسم الطالب (اسم الطالب في الأعلى)</span>
            </button>
            <button
              type="button"
              onClick={() => setCardGroupingMode('by_subject')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                cardGroupingMode === 'by_subject'
                  ? 'bg-[#4E7A68] text-white shadow-xs font-black'
                  : 'text-[#4A3B2C] hover:text-[#2F2822]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>حسب المادة (المادة في الأعلى)</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-[#7A6E61] font-semibold bg-white/60 px-3 py-1 rounded-lg border border-[#D8CEBD]">
          {cardGroupingMode === 'by_subject'
            ? 'المادة في رأس الكرت وقائمة أسماء الطلاب بالداخل'
            : 'اسم الطالب في رأس الكرت وقائمة المواد بالداخل'}
        </div>
      </div>

      {/* 3. Top Filter Bar by Grade (الصف / المرحلة) and Section (الشعبة), plus Search and Action Buttons */}
      <div className="bg-[#FAF7EC] p-3 sm:p-4 rounded-2xl border border-[#D8CEBD] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search by student name or class */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث باسم الطالب أو الصف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-white border border-[#D8CEBD] rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#4E7A68] focus:outline-none"
            />
          </div>

          {/* Grade Level (المرحلة / الصف) Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>الصف / المرحلة:</span>
            </span>
            <select
              value={selectedGradeLevel}
              onChange={(e) => setSelectedGradeLevel(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer hover:bg-slate-100"
            >
              <option value="ALL">جميع الصفوف والمراحل</option>
              {allGradeLevels.map((g) => (
                <option key={g} value={g}>
                  {g || 'غير محدد'}
                </option>
              ))}
            </select>
          </div>

          {/* Section (الشعبة) Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">الشعبة:</span>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer hover:bg-slate-100"
            >
              <option value="ALL">جميع الشُعب</option>
              {allSections.map((sec) => (
                <option key={sec} value={sec}>
                  الشعبة ({sec || 'غير محدد'})
                </option>
              ))}
            </select>
          </div>

          {/* Subject (المادة) Filter - visible when multiple subjects exist */}
          {allSubjects.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">المادة:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer hover:bg-slate-100"
              >
                <option value="ALL">جميع المواد</option>
                {allSubjects.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 flex-wrap">
          {/* View Mode Toggle: Class Cards vs Master Table */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض كروت منفصلة"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>كروت منفصلة</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض كشف جدول شامل"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>جدول مجمع</span>
            </button>
          </div>

          <NumeralModeToggle
            mode={numeralMode}
            onChange={handleNumeralModeChange}
            accent="emerald"
          />

          <span className="text-xs font-semibold text-slate-600 hidden sm:inline px-1">
            {cardGroupingMode === 'by_subject'
              ? `${formatScoreDisplay(filteredClassCards.length, numeralMode)} كارت صف • ${formatScoreDisplay(totalFilteredStudents, numeralMode)} طالب`
              : `${formatScoreDisplay(filteredStudentCards.length, numeralMode)} كارت طالب`}
          </span>

          {/* Export Excel Button for all filtered cards */}
          <button
            type="button"
            onClick={handleExportAllExcel}
            className="p-2 sm:px-3 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title="تصدير كشف درجات الكروت بصيغة Excel"
            aria-label="تصدير كشف درجات الكروت بصيغة Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">تصدير إكسل</span>
          </button>

          {/* Print Customization Button */}
          <button
            type="button"
            onClick={() => setIsPrintSettingsOpen(true)}
            className="p-2 sm:px-3 sm:py-1.5 bg-white hover:bg-[#F2ECE0] text-[#554A3E] border border-[#D8CEBD] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title="تخصيص الهوامش وشعار المدرسة"
            aria-label="تخصيص الهوامش وشعار المدرسة"
          >
            <Sliders className="w-4 h-4 text-[#4E7A68]" />
            <span className="hidden sm:inline">تخصيص الطباعة</span>
          </button>

          {/* Print All Cards Button */}
          <button
            type="button"
            onClick={handlePrintAll}
            className="px-3.5 py-1.5 bg-[#4E7A68] hover:bg-[#3B6554] border border-[#3B6554] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            title={
              cardGroupingMode === 'by_subject'
                ? 'طباعة كروت كافة الصفوف المعروضة'
                : 'طباعة كروت كافة الطلاب المعروضين'
            }
          >
            <Printer className="w-4 h-4" />
            <span>طباعة كافة الكروت</span>
          </button>
        </div>
      </div>

      {/* 4. Main Content: Cards View */}
      {viewMode === 'cards' ? (
        <div
          className={`grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 report-cards-print-grid ${
            selectedCardForModal || selectedStudentForModal ? 'print:hidden' : ''
          }`}
        >
          {cardGroupingMode === 'by_subject' ? (
            filteredClassCards.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                لا توجد صفوف أو شُعب مطابقة لخيارات الفلترة والبحث.
              </div>
            ) : (
              filteredClassCards.map((card) => (
                <ReportCardItem
                  key={card.id}
                  classCard={card}
                  terms={terms.filter((t) => !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, card.gradeLevel))}
                  profile={profile}
                  academicYear={defaultAcademicYear}
                  subject={defaultSubject}
                  printSettings={printSettings}
                  searchQuery={searchQuery}
                  numeralMode={numeralMode}
                  onPreview={() => setSelectedCardForModal(card)}
                  onPrint={() => handlePrintSingleClass(card)}
                  onExportExcel={() => handleExportClassExcel(card)}
                />
              ))
            )
          ) : (
            filteredStudentCards.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                لا يوجد طلاب مطابقون لخيارات الفلترة والبحث.
              </div>
            ) : (
              filteredStudentCards.map((studentCard) => (
                <StudentIndividualCardItem
                  key={studentCard.studentId}
                  studentCard={studentCard}
                  terms={terms.filter((t) => !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, studentCard.gradeLevel))}
                  profile={profile}
                  academicYear={defaultAcademicYear}
                  printSettings={printSettings}
                  isAdministration={isAdministration}
                  numeralMode={numeralMode}
                  onPreview={() => setSelectedStudentForModal(studentCard)}
                  onPrint={() => handlePrintSingleStudent(studentCard)}
                />
              ))
            )
          )}
        </div>
      ) : (
        /* Consolidated Master Table View */
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden student-table-card">
          <div className="bg-slate-50 p-3.5 border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-800">
              <span>
                السنة الدراسية: <strong className="text-slate-900">{formatScoreDisplay(defaultAcademicYear, numeralMode)}</strong>
              </span>
              <span>•</span>
              <span>
                {cardGroupingMode === 'by_subject' ? (
                  <>
                    المادة: <strong className="text-slate-900">{defaultSubject}</strong>
                  </>
                ) : (
                  <>
                    الوضع: <strong className="text-[#4E7A68]">كشف شامل بمواد الطلاب</strong>
                  </>
                )}
              </span>
            </div>
            <span className="text-xs text-slate-600 font-bold">
              {cardGroupingMode === 'by_subject'
                ? `${formatScoreDisplay(totalFilteredStudents, numeralMode)} طالب في ${formatScoreDisplay(filteredClassCards.length, numeralMode)} كارت صف`
                : `${formatScoreDisplay(filteredStudentCards.length, numeralMode)} طالب`}
            </span>
          </div>

          <div className="overflow-x-auto divide-y divide-slate-200">
            {cardGroupingMode === 'by_subject' ? (
              totalFilteredStudents === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  لا يوجد طلاب مطابقون لخيارات الفلترة والبحث.
                </div>
              ) : (
                filteredClassCards.map((card) => {
                  const cardTerms = orderTermsWithAggregates(
                    terms.filter((t) => {
                      const matchGrade = !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, card.gradeLevel);
                      const matchSub = !card.subject || !t.subject || isSubjectMatch(t.subject, card.subject);
                      const matchTeacher =
                        !card.teacherName ||
                        !t.teacherName ||
                        canonicalizeArabic(t.teacherName) === canonicalizeArabic(card.teacherName);
                      return matchGrade && matchSub && matchTeacher;
                    })
                  );
                  return (
                    <div key={card.id} className="p-4">
                      <div className="bg-[#FAF7EC] px-3.5 py-2 rounded-t-xl border border-slate-300 border-b-0 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <span className="bg-[#4E7A68] text-white px-2.5 py-1 rounded-lg">
                            الصف: {card.gradeLevel || 'غير محدد'}
                          </span>
                          <span className="bg-white border border-[#D8CEBD] px-2.5 py-1 rounded-lg">
                            الشعبة: {card.section || 'غير محدد'}
                          </span>
                          <span className="text-slate-600 font-normal mr-2">
                            ({formatScoreDisplay(card.students.length, numeralMode)} طالب)
                          </span>
                        </div>
                      </div>
                      <table className="w-full text-center border-collapse border border-slate-300 text-xs bg-white rounded-b-xl overflow-hidden shadow-2xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-black border-b border-slate-300">
                            <th className="py-2.5 px-3 border-r border-slate-300 w-12 text-center">#</th>
                            <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[150px]">
                              اسم الطالب
                            </th>
                            {cardTerms.length === 0 ? (
                              <th className="py-2.5 px-3 border-r border-slate-300 text-center text-slate-400">
                                الفصول
                              </th>
                            ) : (
                              cardTerms.map((t) => (
                                <th key={t.id} className="py-2 px-2 border-r border-slate-300 text-center w-auto min-w-[66px] text-[11px] font-extrabold text-slate-900">
                                  <StackedHeaderLabel label={`درجة ${t.name}`} />
                                </th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {card.students.map((student, sIdx) => (
                            <tr
                              key={`${card.id}-${student.id}`}
                              className={`border-b border-slate-200 transition-colors ${
                                sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                              }`}
                            >
                              <td className="py-2 px-3 border-r border-slate-300 text-slate-500 font-semibold text-center">
                                {formatScoreDisplay(sIdx + 1, numeralMode)}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 text-right font-bold text-slate-900">
                                {student.name}
                              </td>
                              {cardTerms.length === 0 ? (
                                <td className="py-2 px-3 border-r border-slate-300 text-center text-slate-400">
                                  —
                                </td>
                              ) : (
                                cardTerms.map((t) => {
                                  const score = student.termScores[t.id];
                                  const detail = student.termScoreDetails?.[t.id];
                                  return (
                                    <td
                                      key={t.id}
                                      className="py-2 px-3 border-r border-slate-300 text-center font-bold text-slate-900"
                                    >
                                      {score !== null && score !== undefined ? (
                                        <div className="flex flex-col items-center justify-center leading-tight">
                                          <span>{formatScoreDisplay(score, numeralMode)}</span>
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
                                })
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })
              )
            ) : filteredStudentCards.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                لا يوجد طلاب مطابقون لخيارات الفلترة والبحث.
              </div>
            ) : (
              (() => {
                // Group students by gradeLevel so each grade gets only its relevant terms
                const studentsByGrade = new Map<string, typeof filteredStudentCards>();
                filteredStudentCards.forEach((st) => {
                  const g = st.gradeLevel || 'غير محدد';
                  if (!studentsByGrade.has(g)) studentsByGrade.set(g, []);
                  studentsByGrade.get(g)!.push(st);
                });

                return Array.from(studentsByGrade.entries()).map(([gradeName, studentsInGrade]) => {
                  const gradeTerms = orderTermsWithAggregates(
                    terms.filter(
                      (t) => !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, gradeName)
                    )
                  );
                  const unifiedGradeTerms: { key: string; displayName: string; termIds: string[] }[] = [];
                  const gradeTermMap = new Map<string, { key: string; displayName: string; termIds: string[] }>();
                  for (const t of gradeTerms) {
                    const rawName = t.name?.trim() || 'فصل دراسي';
                    const key = canonicalizeArabic(rawName);
                    if (!gradeTermMap.has(key)) {
                      const item = { key, displayName: rawName, termIds: [t.id] };
                      gradeTermMap.set(key, item);
                      unifiedGradeTerms.push(item);
                    } else {
                      const existing = gradeTermMap.get(key)!;
                      if (!existing.termIds.includes(t.id)) {
                        existing.termIds.push(t.id);
                      }
                    }
                  }
                  let counter = 1;

                  return (
                    <div key={gradeName} className="p-4">
                      <div className="bg-[#FAF7EC] px-3.5 py-2 rounded-t-xl border border-slate-300 border-b-0 flex items-center justify-between">
                        <span className="bg-[#4E7A68] text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                          الصف: {gradeName} ({formatScoreDisplay(studentsInGrade.length, numeralMode)} طالب)
                        </span>
                      </div>
                      <table className="w-full text-center border-collapse border border-slate-300 text-xs bg-white rounded-b-xl overflow-hidden shadow-2xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-black border-b border-slate-300">
                            <th className="py-2.5 px-3 border-r border-slate-300 w-12 text-center">#</th>
                            <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[150px]">
                              اسم الطالب
                            </th>
                            <th className="py-2.5 px-2.5 border-r border-slate-300">الشعبة</th>
                            <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[100px] text-[11px] font-extrabold">
                              المادة
                            </th>
                            {unifiedGradeTerms.length === 0 ? (
                              <th className="py-2 px-2 border-r border-slate-300 text-center text-slate-400 text-[11px]">
                                الفصول
                              </th>
                            ) : (
                              unifiedGradeTerms.map((col) => (
                                <th key={col.key} className="py-2 px-2 border-r border-slate-300 text-center w-auto min-w-[66px] text-[11px] font-extrabold text-slate-900">
                                  <StackedHeaderLabel label={`درجة ${col.displayName}`} />
                                </th>
                              ))
                            )}
                            <th className="py-2.5 px-3 border-r border-slate-300">التقدير</th>
                            <th className="py-2.5 px-3">النتيجة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentsInGrade.flatMap((st) =>
                            st.subjects.map((sub, sIdx) => (
                              <tr
                                key={`${st.studentId}-${sub.subjectName}`}
                                className={`border-b border-slate-200 transition-colors ${
                                  counter % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                                }`}
                              >
                                <td className="py-2 px-3 border-r border-slate-300 text-slate-500 font-semibold text-center">
                                  {formatScoreDisplay(counter++, numeralMode)}
                                </td>
                                <td className="py-2 px-3 border-r border-slate-300 text-right font-black text-slate-900">
                                  {sIdx === 0 ? st.name : <span className="text-slate-400 font-normal">↳</span>}
                                </td>
                                <td className="py-2 px-2.5 border-r border-slate-300 text-slate-700">
                                  {st.section || '—'}
                                </td>
                                <td className="py-2 px-3 border-r border-slate-300 text-right font-bold text-[#4E7A68]">
                                  {sub.subjectName}
                                </td>
                                {unifiedGradeTerms.length === 0 ? (
                                  <td className="py-2 px-3 border-r border-slate-300 text-center text-slate-400">
                                    —
                                  </td>
                                ) : (
                                  unifiedGradeTerms.map((col) => {
                                    let score: number | null = null;
                                    let scoreDetail:
                                      | { raw: number | null; final: number | null; isRounded: boolean }
                                      | undefined;
                                    for (const tid of col.termIds) {
                                      const s = sub.termScores[tid];
                                      if (s !== null && s !== undefined && !isNaN(s)) {
                                        score = s;
                                        scoreDetail = sub.termScoreDetails?.[tid];
                                        break;
                                      }
                                    }
                                    return (
                                      <td
                                        key={col.key}
                                        className="py-2 px-3 border-r border-slate-300 text-center font-bold text-slate-900"
                                      >
                                        {score !== null && score !== undefined ? (
                                          <div className="flex flex-col items-center justify-center leading-tight">
                                            <span>{formatScoreDisplay(score, numeralMode)}</span>
                                            {scoreDetail?.isRounded &&
                                              scoreDetail.raw !== null &&
                                              scoreDetail.raw !== undefined && (
                                                <span
                                                  className="text-[10px] text-[#854D0E] font-bold mt-0.5 no-print"
                                                  title={`الدرجة قبل التقريب كانت ${scoreDetail.raw}`}
                                                >
                                                  (أصله: {formatScoreDisplay(scoreDetail.raw, numeralMode)})
                                                </span>
                                              )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 font-normal">—</span>
                                        )}
                                      </td>
                                    );
                                  })
                                )}
                                <td className="py-2 px-3 border-r border-slate-300">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${sub.ratingBadgeBg} ${sub.ratingBadgeText}`}
                                  >
                                    {sub.ratingText}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  {sub.isPass ? (
                                    <span className="text-[10px] font-bold text-emerald-700">ناجح</span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-rose-700">راسب</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>
      )}

      {/* 5. Single Class/Section Card Preview Modal */}
      {selectedCardForModal && (
        <StudentCardModal
          isOpen={!!selectedCardForModal}
          onClose={() => setSelectedCardForModal(null)}
          classCard={selectedCardForModal}
          terms={terms.filter(
            (t) => !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, selectedCardForModal.gradeLevel)
          )}
          profile={profile}
          academicYear={defaultAcademicYear}
          subject={defaultSubject}
          printSettings={printSettings}
          numeralMode={numeralMode}
        />
      )}

      {/* 6. Single Individual Student Card Preview Modal */}
      {selectedStudentForModal && (
        <SingleStudentCardModal
          isOpen={!!selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
          studentCard={selectedStudentForModal}
          terms={terms.filter(
            (t) => !t.gradeLevel || isGradeLevelMatch(t.gradeLevel, selectedStudentForModal.gradeLevel)
          )}
          profile={profile}
          academicYear={defaultAcademicYear}
          printSettings={printSettings}
          isAdministration={isAdministration}
          numeralMode={numeralMode}
        />
      )}

      {/* 7. Print Settings & Customization Modal */}
      {isPrintSettingsOpen && (
        <PrintSettingsModal
          isOpen={isPrintSettingsOpen}
          onClose={() => setIsPrintSettingsOpen(false)}
          settings={printSettings}
          onUpdateSettings={handleUpdateSettings}
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          sampleClassCard={filteredClassCards[0] || classCards[0]}
          sampleStudentCard={filteredStudentCards[0] || individualStudentCards[0]}
          groupingMode={cardGroupingMode}
          terms={terms}
          academicYear={defaultAcademicYear}
          subject={defaultSubject}
          isAdministration={isAdministration}
          numeralMode={numeralMode}
          onStartPrint={() => {
            setIsPrintSettingsOpen(false);
            handlePrintAll();
          }}
          totalCardsCount={
            cardGroupingMode === 'by_subject'
              ? filteredClassCards.length
              : filteredStudentCards.length
          }
        />
      )}
    </div>
  );
};
