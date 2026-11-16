import React, { useState, useEffect, useMemo } from 'react';
import { MonthlyModel, StudentRow, ParticipationRecord } from '../../types';
import {
  Users,
  Award,
  Sparkles,
  Plus,
  Minus,
  RotateCcw,
  HelpCircle,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  Search,
  CheckCircle2,
  X,
  Send,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  Calendar,
  Check,
  ArrowLeft,
  Sliders,
  History,
  Layers,
} from 'lucide-react';
import {
  isGradeLevelMatch,
  isSectionMatch,
} from '../../utils/gradeAndSectionMatcher';
import { useInstitutionTerms } from '../../utils/translations';

interface Props {
  model: MonthlyModel;
  allGradeLevels: string[];
  allSections: string[];
  selectedGradeLevel: string;
  selectedSection: string;
  onSelectGrade: (grade: string) => void;
  onSelectSection: (section: string) => void;
  onUpdateStudent: (studentId: string, updates: Partial<StudentRow>) => void;
  onAddNewColumn: (name: string, maxScore: number) => string | undefined;
  onSwitchToTableView: () => void;
}

interface ParticipationSession {
  date: string;
  unansweredCount: number;
  studentAnswers: Record<string, number>; // studentId -> count
}

export const InteractiveClassroomView: React.FC<Props> = ({
  model,
  allGradeLevels,
  allSections,
  selectedGradeLevel,
  selectedSection,
  onSelectGrade,
  onSelectSection,
  onUpdateStudent,
  onAddNewColumn,
  onSwitchToTableView,
}) => {
  const terms = useInstitutionTerms();
  // Flag to hide daily participation (can be toggled to true in future to re-enable)
  const ENABLE_DAILY_PARTICIPATION = false;

  // Active mode: set to 'oral' (الامتحان الشفهي); participation logic is preserved
  const [activeTab, setActiveTab] = useState<'participation' | 'oral'>('oral');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Storage key for daily participation per model and section
  const sessionKey = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return `daragat_participation_${model.id}_${selectedGradeLevel}_${selectedSection}_${today}`;
  }, [model.id, selectedGradeLevel, selectedSection]);

  // Participation session state
  const [session, setSession] = useState<ParticipationSession>(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        return JSON.parse(saved);
      }
      return { date: today, unansweredCount: 0, studentAnswers: {} };
    } catch {
      return {
        date: new Date().toISOString().slice(0, 10),
        unansweredCount: 0,
        studentAnswers: {},
      };
    }
  });

  // Re-load when key changes
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        setSession(JSON.parse(saved));
      } else {
        setSession({ date: today, unansweredCount: 0, studentAnswers: {} });
      }
    } catch {}
  }, [sessionKey]);

  // Persist session
  const saveSession = (newSession: ParticipationSession) => {
    setSession(newSession);
    try {
      localStorage.setItem(sessionKey, JSON.stringify(newSession));
    } catch {}
  };

  // Filter students by selected Grade and Section (strictly scoped to model.assignedSections if set)
  const classStudents = useMemo(() => {
    return model.students.filter((st) => {
      const matchGrade =
        selectedGradeLevel === 'ALL' || isGradeLevelMatch(st.gradeLevel, selectedGradeLevel);
      if (model.assignedSections && model.assignedSections.length > 0) {
        if (!model.assignedSections.some((sec) => isSectionMatch(st.section, sec))) {
          return false;
        }
      }
      const matchSection =
        selectedSection === 'ALL' || isSectionMatch(st.section, selectedSection);
      return matchGrade && matchSection;
    });
  }, [model.students, model.assignedSections, selectedGradeLevel, selectedSection]);

  // Filtered by search
  const visibleStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase().trim();
    return classStudents.filter((st) => st.name.toLowerCase().includes(q));
  }, [classStudents, searchQuery]);

  // Total student answers in current class
  const totalStudentAnswers = useMemo(() => {
    return classStudents.reduce((sum, st) => {
      return sum + (session.studentAnswers[st.id] || 0);
    }, 0);
  }, [classStudents, session.studentAnswers]);

  // Total questions = student answers + unanswered questions
  const totalQuestions = totalStudentAnswers + session.unansweredCount;

  // -------------------------------------------------------------
  // COLUMN LINKAGE FOR PARTICIPATION & ORAL
  // -------------------------------------------------------------

  // Participation Column state
  const [selectedParticipationColId, setSelectedParticipationColId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`daragat_part_col_${model.id}`);
      if (saved && model.customColumns?.some((c) => c.id === saved)) {
        return saved;
      }
    } catch {}
    const existing = (model.customColumns || []).find((c) =>
      c.name.includes('مشارك') || c.name.includes('نشاط')
    );
    return existing ? existing.id : '';
  });

  useEffect(() => {
    if (selectedParticipationColId) {
      try {
        localStorage.setItem(`daragat_part_col_${model.id}`, selectedParticipationColId);
      } catch {}
    }
  }, [selectedParticipationColId, model.id]);

  const activeParticipationColumn = useMemo(() => {
    return (model.customColumns || []).find((c) => c.id === selectedParticipationColId);
  }, [model.customColumns, selectedParticipationColId]);

  // Oral Column state
  const [selectedOralColId, setSelectedOralColId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`daragat_oral_col_${model.id}`);
      if (saved && model.customColumns?.some((c) => c.id === saved)) {
        return saved;
      }
    } catch {}
    const oralCol = (model.customColumns || []).find((c) =>
      c.name.includes('شفه') || c.name.includes('شفوي')
    );
    return oralCol ? oralCol.id : '';
  });

  useEffect(() => {
    if (selectedOralColId) {
      try {
        localStorage.setItem(`daragat_oral_col_${model.id}`, selectedOralColId);
      } catch {}
    }
  }, [selectedOralColId, model.id]);

  const activeOralColumn = useMemo(() => {
    return (model.customColumns || []).find((c) => c.id === selectedOralColId);
  }, [model.customColumns, selectedOralColId]);

  // Alert State: when clicking a student without having specified/created a column
  const [columnAlert, setColumnAlert] = useState<{
    isOpen: boolean;
    mode: 'participation' | 'oral';
    student: StudentRow | null;
  } | null>(null);

  // Dedicated Column Creation Modal state
  const [createColModal, setCreateColModal] = useState<{
    isOpen: boolean;
    mode: 'participation' | 'oral';
    name: string;
    maxScore: number;
    pendingStudent: StudentRow | null;
  } | null>(null);

  // Handle +1 answer for a student (with live cumulative percentage and score calculation)
  const handleStudentAnswerIncrementWithCol = (
    studentId: string,
    overrideColId?: string,
    overrideMaxScore?: number
  ) => {
    const colId = overrideColId || selectedParticipationColId;
    const col = colId ? (model.customColumns || []).find((c) => c.id === colId) : null;
    const max = overrideMaxScore || col?.maxScore || (model.totalMaxScore === 10 ? 1 : 10);

    const current = session.studentAnswers[studentId] || 0;
    const nextAnswers = current + 1;
    saveSession({
      ...session,
      studentAnswers: {
        ...session.studentAnswers,
        [studentId]: nextAnswers,
      },
    });

    if (colId) {
      const st = model.students.find((s) => s.id === studentId);
      if (st) {
        const nextTotalQuestions = totalQuestions + 1;
        const currentTodayPercentage =
          nextTotalQuestions > 0 ? Math.round((nextAnswers / nextTotalQuestions) * 100) : 100;

        const prevHistory = st.participationHistory?.[colId] || [];
        const todayDate = session.date || new Date().toISOString().slice(0, 10);
        // Retain historical lessons from other days/sessions, update or add today's lesson session
        const otherDaysHistory = prevHistory.filter((h) => h.date !== todayDate);
        const updatedTodayRecord: ParticipationRecord = {
          date: todayDate,
          percentage: currentTodayPercentage,
          answersCount: nextAnswers,
          totalQuestions: nextTotalQuestions,
        };
        const updatedHistory = [...otherDaysHistory, updatedTodayRecord];

        const allPercentages = updatedHistory.map((h) => h.percentage);
        const avg = Math.round(allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length);
        const newScore = Math.round(((avg / 100) * max) * 10) / 10;

        onUpdateStudent(studentId, {
          scores: {
            ...st.scores,
            [colId]: newScore,
          },
          participationHistory: {
            ...(st.participationHistory || {}),
            [colId]: updatedHistory,
          },
        });
      }
    }
  };

  // Handle -1 answer for a student (correction)
  const handleStudentAnswerDecrement = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = session.studentAnswers[studentId] || 0;
    if (current <= 0) return;
    const nextAnswers = current - 1;
    saveSession({
      ...session,
      studentAnswers: {
        ...session.studentAnswers,
        [studentId]: nextAnswers,
      },
    });

    if (selectedParticipationColId) {
      const st = model.students.find((s) => s.id === studentId);
      if (st) {
        const col = model.customColumns.find((c) => c.id === selectedParticipationColId);
        const max = col?.maxScore || (model.totalMaxScore === 10 ? 1 : 10);
        const nextTotalQuestions = Math.max(1, totalQuestions - 1);
        const currentTodayPercentage =
          nextTotalQuestions > 0 ? Math.round((nextAnswers / nextTotalQuestions) * 100) : 0;

        const prevHistory = st.participationHistory?.[selectedParticipationColId] || [];
        const todayDate = session.date || new Date().toISOString().slice(0, 10);
        const otherDaysHistory = prevHistory.filter((h) => h.date !== todayDate);
        const updatedHistory =
          nextAnswers > 0
            ? [
                ...otherDaysHistory,
                {
                  date: todayDate,
                  percentage: currentTodayPercentage,
                  answersCount: nextAnswers,
                  totalQuestions: nextTotalQuestions,
                },
              ]
            : otherDaysHistory;

        const allPercentages =
          updatedHistory.length > 0 ? updatedHistory.map((h) => h.percentage) : [0];
        const avg = Math.round(allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length);
        const newScore = Math.round(((avg / 100) * max) * 10) / 10;

        onUpdateStudent(studentId, {
          scores: {
            ...st.scores,
            [selectedParticipationColId]: newScore,
          },
          participationHistory: {
            ...(st.participationHistory || {}),
            [selectedParticipationColId]: updatedHistory,
          },
        });
      }
    }
  };

  // Increment unanswered question ("لم يجب أحد")
  const handleUnansweredIncrement = () => {
    saveSession({
      ...session,
      unansweredCount: session.unansweredCount + 1,
    });
  };

  // Decrement unanswered question
  const handleUnansweredDecrement = () => {
    if (session.unansweredCount <= 0) return;
    saveSession({
      ...session,
      unansweredCount: session.unansweredCount - 1,
    });
  };

  // Reset current lesson session
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const handleResetSession = () => {
    const today = new Date().toISOString().slice(0, 10);
    const empty = { date: today, unansweredCount: 0, studentAnswers: {} };
    saveSession(empty);
    setConfirmResetOpen(false);
  };

  // Handle Create and Link Column
  const handleCreateAndLinkColumn = (
    mode: 'participation' | 'oral',
    colName: string,
    colMax: number,
    studentToFollowUp?: StudentRow | null
  ) => {
    const defaultName = mode === 'participation' ? 'المشاركة اليومية' : 'الامتحان الشفهي';
    const finalName = colName.trim() || defaultName;
    const defaultMax =
      model.totalMaxScore === 10
        ? mode === 'participation'
          ? 1
          : 2
        : mode === 'participation'
        ? 10
        : 20;
    const finalMax = Number(colMax) || defaultMax;

    const newId = onAddNewColumn(finalName, finalMax);
    const assignedId = newId || ('col-' + Date.now());

    if (mode === 'participation') {
      setSelectedParticipationColId(assignedId);
      try {
        localStorage.setItem(`daragat_part_col_${model.id}`, assignedId);
      } catch {}
    } else {
      setSelectedOralColId(assignedId);
      try {
        localStorage.setItem(`daragat_oral_col_${model.id}`, assignedId);
      } catch {}
    }

    setCreateColModal(null);
    setColumnAlert(null);

    // If there was a pending student that triggered the alert, execute the action immediately!
    if (studentToFollowUp) {
      if (mode === 'participation') {
        handleStudentAnswerIncrementWithCol(studentToFollowUp.id, assignedId, finalMax);
      } else {
        openGradingModal(studentToFollowUp, assignedId);
      }
    }
  };

  // -------------------------------------------------------------
  // Sync to Table Modal (ترحيل الدرجات واعتماد نسب الدروس والمعدل)
  // -------------------------------------------------------------
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTargetColId, setSyncTargetColId] = useState<string>('');
  const [newSyncColName, setNewSyncColName] = useState('المشاركة والنشاط');
  const [syncColMaxScore, setSyncColMaxScore] = useState<number>(() => {
    return model.totalMaxScore === 10 ? 1 : 10;
  });
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isSyncModalOpen) {
      if (selectedParticipationColId && activeParticipationColumn) {
        setSyncTargetColId(selectedParticipationColId);
        setSyncColMaxScore(activeParticipationColumn.maxScore);
      } else {
        const existing = (model.customColumns || []).find((c) =>
          c.name.includes('مشارك') || c.name.includes('نشاط')
        );
        if (existing) {
          setSyncTargetColId(existing.id);
          setSyncColMaxScore(existing.maxScore);
        } else if (model.customColumns && model.customColumns.length > 0) {
          setSyncTargetColId(model.customColumns[0].id);
          setSyncColMaxScore(model.customColumns[0].maxScore);
        } else {
          setSyncTargetColId('__create_new__');
          setSyncColMaxScore(model.totalMaxScore === 10 ? 1 : 10);
        }
      }
    }
  }, [isSyncModalOpen, model.customColumns, model.totalMaxScore, selectedParticipationColId, activeParticipationColumn]);

  const handleApplySync = () => {
    const isNewCol = syncTargetColId === '__create_new__' || !syncTargetColId;
    let finalTargetId = syncTargetColId;
    let finalTargetMax = syncColMaxScore;

    if (isNewCol) {
      const colName = newSyncColName.trim() || 'المشاركة اليومية';
      const createdId = onAddNewColumn(colName, finalTargetMax);
      finalTargetId = createdId || ('col-' + Date.now());
      setSelectedParticipationColId(finalTargetId);
    } else {
      const col = model.customColumns.find((c) => c.id === finalTargetId);
      if (col) {
        finalTargetMax = col.maxScore;
        setSelectedParticipationColId(col.id);
      }
    }

    let updatedCount = 0;
    classStudents.forEach((st) => {
      const answers = session.studentAnswers[st.id] || 0;
      const todayPercentage =
        totalQuestions > 0 ? Math.round((answers / totalQuestions) * 100) : (answers > 0 ? 100 : 0);

      // If creating a brand new column: today's lesson is the first record
      // If merging into existing column: get previous history for this column
      const existingHistory = isNewCol ? [] : st.participationHistory?.[finalTargetId] || [];
      const newHistoryRecord: ParticipationRecord = {
        date: session.date || new Date().toISOString().slice(0, 10),
        percentage: todayPercentage,
        answersCount: answers,
        totalQuestions: totalQuestions,
        lessonTitle: isNewCol ? newSyncColName.trim() : undefined,
      };

      const updatedColumnHistory = [...existingHistory, newHistoryRecord];
      const allPercentages = updatedColumnHistory.map((h) => h.percentage);
      const avgPercentage = Math.round(
        allPercentages.reduce((acc, curr) => acc + curr, 0) / allPercentages.length
      );

      // Final score based on cumulative average percentage out of column maxScore
      const finalScore = Math.round(((avgPercentage / 100) * finalTargetMax) * 10) / 10;

      onUpdateStudent(st.id, {
        scores: {
          ...st.scores,
          [finalTargetId]: finalScore,
        },
        participationHistory: {
          ...(st.participationHistory || {}),
          [finalTargetId]: updatedColumnHistory,
        },
      });
      updatedCount++;
    });

    setSyncSuccessMsg(
      isNewCol
        ? `تم بنجاح إنشاء حقل جديد ورصد درجات ونسب مشاركة اليوم لـ (${updatedCount}) طالب!`
        : `تم بنجاح دمج وتحديث نسب ودرجات المشاركة لـ (${updatedCount}) طالب في حقل (${
            model.customColumns.find((c) => c.id === finalTargetId)?.name || 'المشاركة'
          })!`
    );
  };

  // -------------------------------------------------------------
  // ORAL EXAM STATE & LOGIC
  // -------------------------------------------------------------
  const [oralFilter, setOralFilter] = useState<'all' | 'graded' | 'ungraded'>('all');
  const [gradingStudent, setGradingStudent] = useState<StudentRow | null>(null);
  const [gradingScoreInput, setGradingScoreInput] = useState<string>('');
  const [randomStudentHighlight, setRandomStudentHighlight] = useState<string | null>(null);

  const handlePickRandomStudent = () => {
    if (!selectedOralColId || !activeOralColumn) {
      setColumnAlert({
        isOpen: true,
        mode: 'oral',
        student: null,
      });
      return;
    }

    const candidates = classStudents.filter((st) => {
      const score = st.scores[selectedOralColId];
      return score === null || score === undefined;
    });

    const pool = candidates.length > 0 ? candidates : classStudents;
    if (pool.length === 0) return;

    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];

    setRandomStudentHighlight(chosen.id);

    setTimeout(() => {
      openGradingModal(chosen);
      setRandomStudentHighlight(null);
    }, 800);
  };

  const openGradingModal = (st: StudentRow, customColId?: string) => {
    setGradingStudent(st);
    const colId = customColId || selectedOralColId;
    const currentScore = colId ? st.scores[colId] : null;
    setGradingScoreInput(
      currentScore !== null && currentScore !== undefined ? String(currentScore) : ''
    );
  };

  const handleSaveOralScore = (score: number | null) => {
    if (!gradingStudent || !selectedOralColId) return;
    onUpdateStudent(gradingStudent.id, {
      scores: {
        ...gradingStudent.scores,
        [selectedOralColId]: score,
      },
    });
    setGradingStudent(null);
  };

  // Student Card Click Handler: checks if column is specified, alerts if not!
  const handleStudentCardClick = (st: StudentRow) => {
    if (activeTab === 'participation') {
      if (!selectedParticipationColId || !activeParticipationColumn) {
        setColumnAlert({
          isOpen: true,
          mode: 'participation',
          student: st,
        });
        return;
      }
      handleStudentAnswerIncrementWithCol(st.id);
    } else {
      if (!selectedOralColId || !activeOralColumn) {
        setColumnAlert({
          isOpen: true,
          mode: 'oral',
          student: st,
        });
        return;
      }
      openGradingModal(st);
    }
  };

  // List of classes & sections for quick switching at bottom
  const classSectionCombinations = useMemo(() => {
    const list: Array<{ grade: string; section: string }> = [];
    const defaultGrade = terms.type === 'university' ? 'المرحلة الأولى' : 'الأول متوسط';
    const defaultSection = terms.type === 'university' ? 'شعبة A' : 'أ';
    const grades = allGradeLevels.length > 0 ? allGradeLevels : [defaultGrade];
    const sections = allSections.length > 0 ? allSections : [defaultSection];

    for (const g of grades) {
      for (const s of sections) {
        list.push({ grade: g, section: s });
      }
    }
    return list;
  }, [allGradeLevels, allSections, terms.type]);

  const currentIndex = classSectionCombinations.findIndex(
    (c) => isGradeLevelMatch(c.grade, selectedGradeLevel) && isSectionMatch(c.section, selectedSection)
  );

  const handlePrevClass = () => {
    if (classSectionCombinations.length <= 1) return;
    const prevIdx =
      currentIndex <= 0 ? classSectionCombinations.length - 1 : currentIndex - 1;
    const target = classSectionCombinations[prevIdx];
    onSelectGrade(target.grade);
    onSelectSection(target.section);
  };

  const handleNextClass = () => {
    if (classSectionCombinations.length <= 1) return;
    const nextIdx =
      currentIndex >= classSectionCombinations.length - 1 ? 0 : currentIndex + 1;
    const target = classSectionCombinations[nextIdx];
    onSelectGrade(target.grade);
    onSelectSection(target.section);
  };

  return (
    /* Fullscreen classroom screen */
    <div className="fixed inset-0 z-50 bg-[#F4EEDF] flex flex-col overflow-hidden font-sans select-none animate-in fade-in duration-200">
      
      {/* 1. UNIFIED COMPACT TOP COMMAND BAR - ALL CONTROLS AT THE VERY TOP */}
      <div className="bg-[#FAF7EC] border-b-2 border-[#D5C8B2] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-xs">
        
        {/* Right Section: Class Badge + Mode Switcher (مشاركات / شفهي) + Column Linkage & Create */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Active Class Pill */}
          <div className="px-2 py-0.5 rounded-lg bg-[#BA916C]/15 border border-[#BA916C]/40 text-[#4A3B2C] font-black text-xs flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-[#BA916C]" />
            <span>
              {selectedGradeLevel === 'ALL' ? 'كل الصفوف' : selectedGradeLevel}
              {selectedSection !== 'ALL' ? ` (${selectedSection})` : ''}
            </span>
          </div>

          {/* Mode Switcher Pills (المشاركة / الشفهي) - Hidden if ENABLE_DAILY_PARTICIPATION is false */}
          {ENABLE_DAILY_PARTICIPATION ? (
            <div className="inline-flex p-0.5 bg-[#E8DFC9] rounded-xl border border-[#D1C3A9]">
              <button
                type="button"
                onClick={() => setActiveTab('participation')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'participation'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-[#4A3B2C] hover:text-black'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>المشاركة اليومية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('oral')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'oral'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-[#4A3B2C] hover:text-black'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>الامتحان الشفهي</span>
              </button>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs">
              <Award className="w-3.5 h-3.5" />
              <span>الامتحان الشفهي</span>
            </div>
          )}

          {/* زر إنشاء عمود لذلك */}
          <button
            type="button"
            onClick={() => {
              const defaultName =
                activeTab === 'participation' ? 'المشاركة اليومية' : 'الامتحان الشفهي';
              const defaultMax =
                model.totalMaxScore === 10
                  ? activeTab === 'participation'
                    ? 1
                    : 2
                  : activeTab === 'participation'
                  ? 10
                  : 20;
              setCreateColModal({
                isOpen: true,
                mode: activeTab,
                name: defaultName,
                maxScore: defaultMax,
                pendingStudent: null,
              });
            }}
            className={`px-2.5 py-1 rounded-lg text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all ${
              activeTab === 'participation'
                ? 'bg-purple-700 hover:bg-purple-800'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
            title="إنشاء عمود جديد في جدول الدرجات"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>إنشاء عمود</span>
          </button>

          {/* زر وقائمة إضافة إلى عمود موجود في الجدول */}
          <div className="flex items-center gap-1 bg-white border border-[#D5C8B2] rounded-lg px-2 py-0.5 shadow-2xs">
            <Sliders className="w-3 h-3 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-700 hidden sm:inline whitespace-nowrap">
              إضافة إلى جدول:
            </span>
            {model.customColumns && model.customColumns.length > 0 ? (
              <select
                value={
                  activeTab === 'participation'
                    ? selectedParticipationColId
                    : selectedOralColId
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeTab === 'participation') {
                    setSelectedParticipationColId(val);
                  } else {
                    setSelectedOralColId(val);
                  }
                }}
                className={`bg-transparent text-xs font-black outline-none cursor-pointer max-w-[130px] sm:max-w-[160px] truncate ${
                  activeTab === 'participation' ? 'text-purple-900' : 'text-emerald-900'
                }`}
              >
                <option value="">-- اختر العمود --</option>
                {model.customColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.maxScore})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] font-bold text-slate-400">
                (لا توجد أعمدة)
              </span>
            )}
          </div>
        </div>

        {/* Center Section: Tab-Specific Actions & Stats */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center py-0.5">
          {activeTab === 'participation' && ENABLE_DAILY_PARTICIPATION ? (
            <>
              {/* Stats badges */}
              <div className="px-2 py-0.5 rounded-lg bg-white border border-[#D5C8B2] text-[11px] font-bold text-[#4A3B2C] flex items-center gap-1">
                <span>أسئلة:</span>
                <span className="font-black text-black">{totalQuestions}</span>
              </div>

              <div className="px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-900 flex items-center gap-1">
                <span>مشاركات:</span>
                <span className="font-black">{totalStudentAnswers}</span>
              </div>

              {/* لم يجب أحد */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleUnansweredIncrement}
                  className="px-2 py-0.5 rounded-lg bg-[#9C3838] hover:bg-[#852C2C] active:scale-95 text-white font-black text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
                  title="سؤال لم يجب عليه أحد (+1)"
                >
                  <HelpCircle className="w-3 h-3 text-amber-200" />
                  <span>لم يجب أحد ({session.unansweredCount})</span>
                </button>
                {session.unansweredCount > 0 && (
                  <button
                    type="button"
                    onClick={handleUnansweredDecrement}
                    className="p-0.5 rounded-lg bg-white hover:bg-slate-100 text-[#9C3838] border border-red-200 cursor-pointer"
                    title="تراجع -1"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* اعتماد بالجدول */}
              <button
                type="button"
                onClick={() => {
                  setSyncSuccessMsg(null);
                  setIsSyncModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                title="اعتماد وترحيل درجات ونسب المشاركة إلى الجدول"
              >
                <Send className="w-3 h-3" />
                <span>اعتماد بالجدول</span>
              </button>

              {/* تصفير */}
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="p-1 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 cursor-pointer"
                title="بدء درس جديد / تصفير مشاركات اليوم"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {/* Oral filters */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setOralFilter('all')}
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    oralFilter === 'all'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  الكل ({classStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOralFilter('graded')}
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    oralFilter === 'graded'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  تم ({classStudents.filter((st) => selectedOralColId && st.scores[selectedOralColId] !== null && st.scores[selectedOralColId] !== undefined).length})
                </button>
                <button
                  type="button"
                  onClick={() => setOralFilter('ungraded')}
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    oralFilter === 'ungraded'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  بانتظار ({classStudents.filter((st) => !selectedOralColId || st.scores[selectedOralColId] === null || st.scores[selectedOralColId] === undefined).length})
                </button>
              </div>

              {/* طالب عشوائي */}
              <button
                type="button"
                onClick={handlePickRandomStudent}
                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                title="اختيار طالب عشوائي للاختبار الشفهي"
              >
                <Shuffle className="w-3 h-3" />
                <span>طالب عشوائي 🎲</span>
              </button>
            </>
          )}

          {/* Search box */}
          <div className="relative w-24 sm:w-32">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث..."
              className="w-full pl-2 pr-5 py-0.5 rounded-lg bg-white border border-[#D5C8B2] text-xs text-[#2F2822] focus:outline-none"
            />
            <Search className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Left Section: Back to tables button */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onSwitchToTableView}
            className="px-2.5 sm:px-3.5 py-1 rounded-xl bg-[#4A3B2C] hover:bg-[#382C21] active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all border border-[#3D2E21]"
            title="الرجوع إلى عرض جدول الدرجات الكامل"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-200" />
            <span>رجوع لعرض الجداول</span>
          </button>
        </div>

      </div>

      {/* 2. THE CLASSROOM RECTANGLE: "المساحة الأولى للمستطيل الذي بداخله الطلاب" */}
      <div className="flex-1 mx-1.5 sm:mx-2.5 my-1 p-2 sm:p-3 bg-[#FBF9F2] rounded-2xl border-3 border-[#C8B89F] shadow-inner overflow-y-auto relative">
        
        {visibleStudents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#7A6B5D] p-6">
            <Users className="w-10 h-10 mx-auto text-[#BA916C] mb-2 opacity-40" />
            <p className="font-bold text-sm">لا يوجد طلاب مطابقين للبحث أو للشعبة المحددة</p>
            <p className="text-xs text-slate-400 mt-1">اختر الشعبة المطلوبة من الشريط السفلي</p>
          </div>
        ) : (
          /* Students Desks / Cards Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-2.5">
            {visibleStudents.map((st) => {
              const count = session.studentAnswers[st.id] || 0;
              const todayPercentage =
                totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : (count > 0 ? 100 : 0);
              const isHighlighted = randomStudentHighlight === st.id;

              const oralScore = selectedOralColId ? st.scores[selectedOralColId] : null;
              const hasOralScore = oralScore !== null && oralScore !== undefined;

              const partScore = selectedParticipationColId ? st.scores[selectedParticipationColId] : null;

              // Previous participation history for this student in the selected column
              const prevHistory = selectedParticipationColId
                ? st.participationHistory?.[selectedParticipationColId] || []
                : [];
              const prevPercentages = prevHistory.map((h) => h.percentage);
              const hasPrev = prevPercentages.length > 0;

              // Combined percentages: previous + today's lesson (if today has answers/questions)
              const combinedPercentages =
                count > 0 || totalQuestions > 0
                  ? [...prevPercentages, todayPercentage]
                  : prevPercentages;
              const combinedAvg =
                combinedPercentages.length > 0
                  ? Math.round(
                      combinedPercentages.reduce((a, b) => a + b, 0) / combinedPercentages.length
                    )
                  : todayPercentage;

              const projectedScore = activeParticipationColumn
                ? Math.round(((combinedAvg / 100) * activeParticipationColumn.maxScore) * 10) / 10
                : null;

              if (activeTab === 'oral') {
                if (oralFilter === 'graded' && !hasOralScore) return null;
                if (oralFilter === 'ungraded' && hasOralScore) return null;
              }

              return (
                <div
                  key={st.id}
                  onClick={() => handleStudentCardClick(st)}
                  className={`relative group bg-[#FAF7EC] hover:bg-[#F3EBD9] border-2 rounded-xl p-1.5 sm:p-2 flex flex-col justify-between text-center transition-all cursor-pointer shadow-2xs active:scale-95 min-h-[96px] sm:min-h-[105px] ${
                    isHighlighted
                      ? 'border-amber-500 ring-3 ring-amber-300 scale-102 bg-amber-50'
                      : count > 0 && activeTab === 'participation' && ENABLE_DAILY_PARTICIPATION
                      ? 'border-purple-400 bg-purple-50/50'
                      : hasOralScore
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-[#D5C8B2] hover:border-emerald-400'
                  }`}
                >
                  {/* Top Corner Badges */}
                  {activeTab === 'participation' && ENABLE_DAILY_PARTICIPATION ? (
                    <>
                      {/* Purple Circle Count Badge */}
                      <div
                        className={`absolute -top-1.5 -right-1 w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shadow-sm transition-transform group-hover:scale-110 ${
                          count > 0
                            ? 'bg-purple-700 text-white ring-1 ring-purple-300'
                            : 'bg-[#CBB69F] text-[#4A3B2C]'
                        }`}
                        title={`عدد الإجابات في هذا الدرس: ${count}`}
                      >
                        {count}
                      </div>

                      {/* -1 decrement button */}
                      {count > 0 && (
                        <button
                          type="button"
                          onClick={(e) => handleStudentAnswerDecrement(st.id, e)}
                          className="absolute -top-1.5 -left-1 w-5 h-5 rounded-full bg-red-100 hover:bg-red-600 text-red-700 hover:text-white border border-red-300 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                          title="إنقاص مشاركة واحدة (-1)"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </>
                  ) : (
                    /* Oral Exam Score Badge */
                    <div
                      className={`absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-black shadow-xs ${
                        hasOralScore
                          ? 'bg-emerald-700 text-white ring-1 ring-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {hasOralScore ? `الدرجة: ${oralScore}` : 'لم يُمتحن'}
                    </div>
                  )}

                  {/* Card Header: Small Avatar Icon + Student Name */}
                  <div className="flex items-center gap-1.5 w-full pt-0.5 px-0.5 text-right">
                    {/* Small Avatar Icon */}
                    <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-[#E8DFC9] border border-[#D1C3A9] flex items-center justify-center shadow-2xs group-hover:bg-[#DFD3B9] transition-colors shrink-0">
                      <GraduationCap className="w-3 h-3 text-[#6D5A46]" />
                    </div>
                    {/* Student Name */}
                    <h4 className="text-[11px] sm:text-xs font-bold text-[#2F2822] line-clamp-2 leading-tight flex-1">
                      {st.name}
                    </h4>
                  </div>

                  {/* Card Bottom: Lesson Percentages and Resulting Score */}
                  {activeTab === 'participation' && ENABLE_DAILY_PARTICIPATION ? (
                    <div className="w-full pt-1 border-t border-[#D5C8B2]/50 flex flex-col gap-0.5 mt-1">
                      {/* Today's answers & Today's percentage */}
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-purple-900 font-black">
                          {totalQuestions > 0 ? `${todayPercentage}%` : count > 0 ? `${count} إجابة` : '0%'}
                        </span>
                        <span className="text-purple-600 text-[9px]">
                          {count} / {totalQuestions} س
                        </span>
                      </div>

                      {/* Cumulative Average & Both Percentages Together if linked */}
                      {activeParticipationColumn && (
                        <div className="bg-purple-100/90 border border-purple-200/90 rounded px-1 py-0.2 text-[9px] font-bold text-purple-950 text-right shadow-2xs">
                          {hasPrev ? (
                            <div className="flex items-center justify-between text-[9px]">
                              <span>معدل: <strong className="font-black text-purple-900">{combinedAvg}%</strong></span>
                              <span className="text-emerald-800 font-black">
                                درجة: {partScore ?? projectedScore}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[9px] font-black text-emerald-800 text-center">
                              الدرجة: {partScore ?? projectedScore ?? 0} من {activeParticipationColumn.maxScore}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full pt-1 border-t border-[#D5C8B2]/50 flex items-center justify-center text-[10px] font-bold text-emerald-800 mt-1">
                      <span>{hasOralScore ? `الدرجة: ${oralScore}` : 'رصد الدرجة'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SLIM BOTTOM NAVIGATION (Section Switcher & Arrows) */}
      <div className="bg-[#FAF7EC] border-t-2 border-[#D5C8B2] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0">
        {/* Next Class Button */}
        <button
          type="button"
          onClick={handleNextClass}
          className="px-2.5 py-1 rounded-lg bg-[#EFE8D8] hover:bg-[#E5DBCA] text-[#3D2E21] border border-[#CBB69F] font-black text-xs flex items-center gap-1 cursor-pointer active:scale-95"
          title="الصف أو الشعبة التالية"
        >
          <span>التالي</span>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Section pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-2 scrollbar-none max-w-full">
          {classSectionCombinations.map((item, idx) => {
            const isSelected =
              isGradeLevelMatch(item.grade, selectedGradeLevel) &&
              isSectionMatch(item.section, selectedSection);
            return (
              <button
                key={`${item.grade}-${item.section}-${idx}`}
                type="button"
                onClick={() => {
                  onSelectGrade(item.grade);
                  onSelectSection(item.section);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#BA916C] text-white shadow-xs'
                    : 'bg-[#EBDDC8] hover:bg-[#DFCEB7] text-[#3D2E21] border border-[#CBB69F]'
                }`}
              >
                {item.grade} ({item.section})
              </button>
            );
          })}
        </div>

        {/* Previous Class Button */}
        <button
          type="button"
          onClick={handlePrevClass}
          className="px-2.5 py-1 rounded-lg bg-[#EFE8D8] hover:bg-[#E5DBCA] text-[#3D2E21] border border-[#CBB69F] font-black text-xs flex items-center gap-1 cursor-pointer active:scale-95"
          title="الصف أو الشعبة السابقة"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          <span>السابق</span>
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 0: ALERT TO CREATE OR SPECIFY COLUMN                       */}
      {/* ----------------------------------------------------------------- */}
      {columnAlert && columnAlert.isOpen && (
        <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7EC] border-2 border-[#D5C8B2] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-[#D5C8B2] pb-3.5 mb-4">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                  columnAlert.mode === 'participation'
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                }`}
              >
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-[#2F2822]">
                  {columnAlert.mode === 'participation'
                    ? 'تنبيه: يجب إنشاء أو تحديد عمود للمشاركة اليومية'
                    : 'تنبيه: يجب إنشاء أو تحديد عمود للامتحان الشفهي'}
                </h3>
                <p className="text-xs text-[#7A6B5D] font-semibold mt-1 leading-relaxed">
                  {columnAlert.student ? (
                    <>
                      لقد قمت بالضغط على الطالب{' '}
                      <span className="font-black text-[#2F2822] underline">
                        {columnAlert.student.name}
                      </span>
                      ، ولكن لم تقم بعد بتحديد أو إنشاء عمود يخص{' '}
                      <span className="font-bold text-[#2F2822]">
                        {columnAlert.mode === 'participation' ? 'المشاركة اليومية' : 'الامتحان الشفهي'}
                      </span>{' '}
                      في جدول درجات المادة.
                    </>
                  ) : (
                    <>
                      لم تقم بعد بإنشاء أو تحديد عمود يخص{' '}
                      {columnAlert.mode === 'participation' ? 'المشاركة اليومية' : 'الامتحان الشفهي'}{' '}
                      في جدول الدرجات.
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setColumnAlert(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content options */}
            <div className="space-y-4">
              {/* Option 1: Create a new column right now */}
              <div className="bg-white rounded-2xl p-4 border border-[#D5C8B2] shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-[#2F2822]">
                    {columnAlert.mode === 'participation'
                      ? 'إنشاء عمود جديد للمشاركة اليومية الآن'
                      : 'إنشاء عمود جديد للامتحان الشفهي الآن'}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  سيتم إنشاء حقل جديد تلقائياً في كشف الدرجات واعتماده كعمود أساسي لرصد الدرجات.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const defaultName =
                      columnAlert.mode === 'participation' ? 'المشاركة اليومية' : 'الامتحان الشفهي';
                    const defaultMax =
                      model.totalMaxScore === 10
                        ? columnAlert.mode === 'participation'
                          ? 1
                          : 2
                        : columnAlert.mode === 'participation'
                        ? 10
                        : 20;
                    setCreateColModal({
                      isOpen: true,
                      mode: columnAlert.mode,
                      name: defaultName,
                      maxScore: defaultMax,
                      pendingStudent: columnAlert.student,
                    });
                    setColumnAlert(null);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all ${
                    columnAlert.mode === 'participation'
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {columnAlert.mode === 'participation'
                      ? 'إنشاء عمود المشاركة الآن'
                      : 'إنشاء عمود الشفهي الآن'}
                  </span>
                </button>
              </div>

              {/* Option 2: Add to / link with an existing column in the table (if any exist) */}
              {model.customColumns && model.customColumns.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-[#D5C8B2] shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs">
                      2
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-[#2F2822]">
                      أو إضافة وربط بعمود موجود بالفعل في جدول الدرجات
                    </h4>
                  </div>
                  <div>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#BA916C]"
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        if (columnAlert.mode === 'participation') {
                          setSelectedParticipationColId(val);
                          try {
                            localStorage.setItem(`daragat_part_col_${model.id}`, val);
                          } catch {}
                          if (columnAlert.student) {
                            handleStudentAnswerIncrementWithCol(columnAlert.student.id, val);
                          }
                        } else {
                          setSelectedOralColId(val);
                          try {
                            localStorage.setItem(`daragat_oral_col_${model.id}`, val);
                          } catch {}
                          if (columnAlert.student) {
                            openGradingModal(columnAlert.student, val);
                          }
                        }
                        setColumnAlert(null);
                      }}
                    >
                      <option value="" disabled>
                        -- اضغط هنا لاختيار عمود من الجدول --
                      </option>
                      {model.customColumns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.name} (الدرجة من {col.maxScore})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-[#D5C8B2] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setColumnAlert(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#4A3B2C] border border-[#D5C8B2] font-bold text-xs cursor-pointer"
              >
                إلغاء التنبيه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL: CREATE COLUMN MODAL FOR PARTICIPATION OR ORAL              */}
      {/* ----------------------------------------------------------------- */}
      {createColModal && createColModal.isOpen && (
        <div className="fixed inset-0 z-75 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7EC] border-2 border-[#D5C8B2] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D5C8B2] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    createColModal.mode === 'participation'
                      ? 'bg-purple-100 border border-purple-300 text-purple-700'
                      : 'bg-emerald-100 border border-emerald-300 text-emerald-700'
                  }`}
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#2F2822]">
                    {createColModal.mode === 'participation'
                      ? 'إنشاء عمود للمشاركة اليومية'
                      : 'إنشاء عمود للامتحان الشفهي'}
                  </h3>
                  <span className="text-xs text-slate-500 font-bold">
                    إضافة حقل جديد إلى جدول درجات المادة
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateColModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#4A3B2C] block mb-1">
                  اسم الحقل الجديد في الجدول:
                </label>
                <input
                  type="text"
                  value={createColModal.name}
                  onChange={(e) =>
                    setCreateColModal({ ...createColModal, name: e.target.value })
                  }
                  className="w-full bg-white border border-[#D5C8B2] rounded-xl px-3.5 py-2 text-sm font-bold text-[#2F2822] focus:ring-2 focus:ring-[#BA916C] outline-none"
                  placeholder={
                    createColModal.mode === 'participation' ? 'المشاركة اليومية' : 'الامتحان الشفهي'
                  }
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A3B2C] block mb-1">
                  الدرجة العظمى للحقل:
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={createColModal.maxScore}
                  onChange={(e) =>
                    setCreateColModal({
                      ...createColModal,
                      maxScore: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full bg-white border border-[#D5C8B2] rounded-xl px-3.5 py-2 text-sm font-black text-center text-[#2F2822] focus:ring-2 focus:ring-[#BA916C] outline-none"
                />

                {/* Quick Max Score presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-bold">درجات مقترحة:</span>
                  {(createColModal.mode === 'participation'
                    ? [1, 2, 5, 10]
                    : [5, 10, 15, 20]
                  ).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCreateColModal({ ...createColModal, maxScore: val })}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        createColModal.maxScore === val
                          ? 'bg-[#BA916C] text-white border-[#BA916C]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCreateAndLinkColumn(
                      createColModal.mode,
                      createColModal.name,
                      createColModal.maxScore,
                      createColModal.pendingStudent
                    )
                  }
                  className={`flex-1 py-3 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all ${
                    createColModal.mode === 'participation'
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد إنشاء الحقل وإضافته للجدول</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateColModal(null)}
                  className="px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-[#4A3B2C] border border-[#D5C8B2] font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 1: ORAL SCORE INPUT / KEYPAD MODAL                          */}
      {/* ----------------------------------------------------------------- */}
      {gradingStudent && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7EC] border-2 border-[#D5C8B2] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D5C8B2] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center">
                  <Award className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#2F2822]">
                    تقييم الامتحان الشفهي
                  </h3>
                  <span className="text-xs text-emerald-800 font-bold">
                    {gradingStudent.name} ({gradingStudent.section ? `شعبة ${gradingStudent.section}` : ''})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGradingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score info & Column Max */}
            <div className="bg-white rounded-2xl p-4 border border-[#D5C8B2] mb-4 text-center">
              <span className="text-xs text-[#7A6B5D] font-bold block mb-1">
                الدرجة من ({activeOralColumn?.maxScore || 10}) في حقل (
                {activeOralColumn?.name || 'الشفهي'})
              </span>
              <div className="flex items-center justify-center gap-3">
                <input
                  type="text"
                  inputMode="none"
                  data-score-cell="true"
                  value={gradingScoreInput}
                  onChange={(e) => setGradingScoreInput(e.target.value)}
                  placeholder="0"
                  className="w-24 text-center py-2 text-2xl font-black bg-emerald-50 border-2 border-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-900"
                />
                <span className="text-lg font-bold text-slate-400">
                  / {activeOralColumn?.maxScore || 10}
                </span>
              </div>
            </div>

            {/* Quick Score Buttons Keypad */}
            <div className="mb-4">
              <span className="text-xs font-bold text-[#7A6B5D] block mb-2 text-right">
                أزرار سريعة للدرجة:
              </span>
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {Array.from(
                  { length: Math.min(11, (activeOralColumn?.maxScore || 10) + 1) },
                  (_, i) => {
                    const max = activeOralColumn?.maxScore || 10;
                    const val = max <= 10 ? i : Math.round((i / 10) * max);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setGradingScoreInput(String(val))}
                        className={`py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                          gradingScoreInput === String(val)
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs scale-105'
                            : 'bg-white hover:bg-emerald-50 text-emerald-950 border-emerald-200'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Decimal & Fraction buttons (. و ، وحذف) */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[#D5C8B2]/60">
                <button
                  type="button"
                  onClick={() => {
                    if (!gradingScoreInput.includes('.') && !gradingScoreInput.includes('،')) {
                      setGradingScoreInput(gradingScoreInput === '' ? '0.' : gradingScoreInput + '.');
                    }
                  }}
                  className="py-1.5 rounded-xl text-base font-black border bg-[#FAF3E0] hover:bg-[#F3E7C9] text-amber-950 border-amber-300 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  title="إضافة نقطة عشرية (.) للأعشار"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!gradingScoreInput.includes('.') && !gradingScoreInput.includes('،')) {
                      setGradingScoreInput(gradingScoreInput === '' ? '0،' : gradingScoreInput + '،');
                    }
                  }}
                  className="py-1.5 rounded-xl text-base font-black border bg-[#FAF3E0] hover:bg-[#F3E7C9] text-amber-950 border-amber-300 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  title="إضافة فاصلة عشرية (،) للأعشار"
                >
                  ،
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cur = gradingScoreInput === '' ? 0 : Number(gradingScoreInput.replace('،', '.'));
                    if (!isNaN(cur)) {
                      setGradingScoreInput(String(cur + 0.5));
                    }
                  }}
                  className="py-1.5 rounded-xl text-xs font-black border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  title="إضافة نصف درجة (+0.5)"
                >
                  +0.5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (gradingScoreInput.length > 0) {
                      setGradingScoreInput(gradingScoreInput.slice(0, -1));
                    }
                  }}
                  className="py-1.5 rounded-xl text-xs font-black border bg-red-50 hover:bg-red-100 text-red-700 border-red-300 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  title="مسح رقم واحد"
                >
                  ⌫ حذف
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const normalized = gradingScoreInput.trim().replace('،', '.');
                  const val = normalized === '' ? null : Number(normalized);
                  handleSaveOralScore(isNaN(val as number) ? null : val);
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>حفظ الدرجة</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveOralScore(null)}
                className="px-3 py-3 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs cursor-pointer"
                title="مسح الدرجة"
              >
                مسح
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 2: CONFIRM RESET PARTICIPATION MODAL                        */}
      {/* ----------------------------------------------------------------- */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7EC] border-2 border-[#D5C8B2] rounded-3xl max-w-sm w-full p-5 text-center shadow-xl">
            <AlertCircle className="w-12 h-12 text-purple-600 mx-auto mb-2" />
            <h3 className="text-base font-black text-[#2F2822] mb-1">
              بدء درس جديد للمشاركة
            </h3>
            <p className="text-xs text-[#7A6B5D] mb-4 leading-relaxed">
              سيتم تصفير عداد الأسئلة والمشاركات للدرس الحالي لتبدأ درساً جديداً. الدرجات والنسب المعتمدة سابقاً في الجدول ستبقى محفوظة بالكامل دون أي تغيير.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetSession}
                className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-xs"
              >
                نعم، بدء درس جديد
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#4A3B2C] border border-[#D5C8B2] font-bold text-xs sm:text-sm cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 3: SYNC TO TABLE MODAL                                      */}
      {/* (دمج نسب المشاركة مع الدروس السابقة أو إنشاء عمود لدرس جديد)     */}
      {/* ----------------------------------------------------------------- */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7EC] border-2 border-[#D5C8B2] rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl animate-in fade-in duration-150 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D5C8B2] pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center">
                  <Send className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#2F2822]">
                    اعتماد وترحيل درجات ونسب المشاركة إلى الجدول
                  </h3>
                  <span className="text-xs text-purple-800 font-bold">
                    حساب نسبة مشاركة درس اليوم ودمجها مع الدروس السابقة أو إنشاء عمود جديد
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {syncSuccessMsg ? (
              <div className="py-8 text-center space-y-4 my-auto">
                <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
                <h4 className="text-lg font-black text-emerald-950">{syncSuccessMsg}</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  تم حفظ جميع النسب والدرجات في جدول كشف الدرجات بنجاح.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleResetSession();
                      setIsSyncModalOpen(false);
                      setSyncSuccessMsg(null);
                    }}
                    className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95"
                  >
                    بدء درس جديد الآن (تصفير العداد)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSyncModalOpen(false);
                      setSyncSuccessMsg(null);
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-[#4A3B2C] border border-[#D5C8B2] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إغلاق والرجوع للصف
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-1">
                {/* Lesson Context Banner */}
                <div className="bg-purple-50 rounded-2xl p-3 border border-purple-200 text-xs text-purple-950 font-medium flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-bold">إحصائية درس اليوم:</span> إجمالي الأسئلة المطروحة (
                    <strong className="font-black text-purple-900">{totalQuestions}</strong> سؤال)، إجمالي الإجابات (
                    <strong className="font-black text-purple-900">{totalStudentAnswers}</strong> إجابة).
                  </div>
                  <div className="text-[11px] bg-purple-200/60 px-2 py-0.5 rounded-lg font-bold text-purple-900">
                    تاريخ اليوم: {session.date}
                  </div>
                </div>

                {/* Column Destination Selector */}
                <div>
                  <label className="text-xs font-bold text-[#4A3B2C] block mb-1.5">
                    حدد طريقة الاعتماد والعمود المستهدف في جدول الدرجات:
                  </label>
                  <select
                    value={syncTargetColId}
                    onChange={(e) => setSyncTargetColId(e.target.value)}
                    className="w-full bg-white border border-[#D5C8B2] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#2F2822] focus:ring-2 focus:ring-purple-400 outline-none shadow-2xs"
                  >
                    {(model.customColumns || []).map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.id === selectedParticipationColId ? '⭐ ' : ''}إضافة ودمج مع الدروس السابقة في حقل: {col.name} (الدرجة من {col.maxScore})
                      </option>
                    ))}
                    <option value="__create_new__">
                      ➕ إنشاء عمود آخر يخص هذا الدرس الجديد في الجدول
                    </option>
                  </select>
                </div>

                {/* If creating a brand new column */}
                {syncTargetColId === '__create_new__' ? (
                  <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
                    <div>
                      <label className="text-[11px] font-bold text-amber-950 block mb-1">
                        اسم العمود الجديد لهذا الدرس:
                      </label>
                      <input
                        type="text"
                        value={newSyncColName}
                        onChange={(e) => setNewSyncColName(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                        placeholder="مثلاً: المشاركة - درس 2"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-amber-950 block mb-1">
                        الدرجة العظمى للعمود:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={syncColMaxScore}
                        onChange={(e) => setSyncColMaxScore(Number(e.target.value) || 1)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-center text-slate-800"
                      />
                    </div>
                  </div>
                ) : (
                  /* Merge notification */
                  <div className="p-3 bg-white rounded-xl border border-purple-200 text-xs text-purple-900 leading-relaxed font-semibold flex items-start gap-2">
                    <Layers className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>نظام الدمج التراكمي:</strong> ستُضاف نسبة درس اليوم لهذا الحقل، وتُحفظ مع نسب الدروس السابقة لنفس الطالب (مثال: 70% و 80% معاً)، ويتم احتساب المعدل التراكمي (75%) وترصد الدرجة بناءً عليه.
                    </div>
                  </div>
                )}

                {/* Live Preview List for Students */}
                <div>
                  <label className="text-xs font-bold text-[#4A3B2C] block mb-1.5">
                    معاينة درجات ونسب الطلاب بعد الاعتماد:
                  </label>
                  <div className="max-h-52 overflow-y-auto border border-[#D5C8B2] rounded-xl bg-white p-2 divide-y divide-slate-100">
                    {classStudents.map((st) => {
                      const count = session.studentAnswers[st.id] || 0;
                      const todayPercentage =
                        totalQuestions > 0
                          ? Math.round((count / totalQuestions) * 100)
                          : count > 0
                          ? 100
                          : 0;

                      const isNew = syncTargetColId === '__create_new__' || !syncTargetColId;
                      const prevHist = isNew ? [] : st.participationHistory?.[syncTargetColId] || [];
                      const prevPercentages = prevHist.map((h) => h.percentage);

                      const allPercentages = isNew
                        ? [todayPercentage]
                        : [...prevPercentages, todayPercentage];
                      const avgPercentage = Math.round(
                        allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length
                      );
                      const targetMax = isNew
                        ? syncColMaxScore
                        : model.customColumns.find((c) => c.id === syncTargetColId)?.maxScore ||
                          syncColMaxScore;
                      const resultingScore =
                        Math.round(((avgPercentage / 100) * targetMax) * 10) / 10;

                      return (
                        <div
                          key={st.id}
                          className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <span className="font-bold text-[#2F2822]">{st.name}</span>
                            <span className="text-[10px] text-slate-500 mr-2">
                              (أجاب {count} من {totalQuestions})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {prevPercentages.length > 0 && !isNew ? (
                              <div className="text-right">
                                <span className="text-purple-700 font-bold text-[11px] block">
                                  النسب معاً: ({allPercentages.map((p) => `${p}%`).join(' ، ')})
                                </span>
                                <span className="text-slate-500 text-[10px]">
                                  المعدل: {avgPercentage}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-purple-700 font-bold text-[11px]">
                                نسبة الدرس: {todayPercentage}%
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-black text-xs whitespace-nowrap">
                              الدرجة: {resultingScore} من {targetMax}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#D5C8B2]">
                  <button
                    type="button"
                    onClick={handleApplySync}
                    className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>تأكيد واعتماد الدرجات والنسب في الجدول</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSyncModalOpen(false)}
                    className="px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-[#4A3B2C] border border-[#D5C8B2] font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
