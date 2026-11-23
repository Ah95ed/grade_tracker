import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Plus,
  UserPlus,
  Trash2,
  X,
  AlertTriangle,
  Check,
  Volume2,
  CornerDownLeft,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  cleanSpokenStudentName,
  parseSpokenScore,
} from '../../utils/arabicSpeechParser';
import {
  cleanSingleSpaces,
  findSuspectedStudentMatch,
  SuspectedMatchResult,
} from '../../utils/arabicNameMatcher';

export interface VoiceStudentEntryRow {
  id: string;
  name: string;
  score: string;
}

export const createEmptyVoiceRow = (): VoiceStudentEntryRow => ({
  id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  score: '',
});

interface ActiveVoiceCell {
  rowIndex: number;
  field: 'name' | 'score';
}

interface Props {
  rows: VoiceStudentEntryRow[];
  onChangeRows: React.Dispatch<React.SetStateAction<VoiceStudentEntryRow[]>>;
  isActiveTab: boolean;
  autoStartTrigger: number;
  updateExisting: boolean;
  onChangeUpdateExisting: (val: boolean) => void;
  allReferenceStudents: Array<{ id?: string; name: string; source?: string }>;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onstart: (() => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

const getSpeechRecognitionConstructor = (): (new () => SpeechRecognitionLike) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const VoiceStudentEntryPanel: React.FC<Props> = ({
  rows,
  onChangeRows,
  isActiveTab,
  autoStartTrigger,
  updateExisting,
  onChangeUpdateExisting,
  allReferenceStudents,
}) => {
  const [activeCell, setActiveCell] = useState<ActiveVoiceCell>({
    rowIndex: 0,
    field: 'name',
  });
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<'ar-SA' | 'ar-IQ' | 'ar-EG'>('ar-SA');
  const [interimPreview, setInterimPreview] = useState<{
    target: ActiveVoiceCell;
    text: string;
  } | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'warning' | 'error' | 'info';
    text: string;
    isMicPermissionError?: boolean;
  } | null>(null);

  const isSpeechSupported = Boolean(getSpeechRecognitionConstructor());

  // Refs to prevent stale closures inside Web Speech API callbacks
  const activeCellRef = useRef<ActiveVoiceCell>(activeCell);
  const rowsRef = useRef<VoiceStudentEntryRow[]>(rows);
  const shouldListenRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const committedIndicesRef = useRef<Set<number>>(new Set());
  const lockedTargetsRef = useRef<Map<number, ActiveVoiceCell>>(new Map());
  const latestInterimByIndexRef = useRef<Map<number, string>>(new Map());
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);
  const lastAutoStartTriggerRef = useRef<number>(0);
  const triedGetUserMediaRef = useRef<boolean>(false);

  useEffect(() => {
    activeCellRef.current = activeCell;
  }, [activeCell]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Ensure activeCell stays within bounds when rows change
  useEffect(() => {
    if (rows.length === 0) return;
    if (activeCell.rowIndex >= rows.length) {
      setActiveCell({ rowIndex: rows.length - 1, field: 'name' });
    }
  }, [rows.length, activeCell.rowIndex]);

  // Apply spoken transcript cleanly to a specific cell (enforcing numeric-only on score)
  const applyTranscriptToCell = useCallback(
    (target: ActiveVoiceCell, rawTranscript: string, isInterimFlush = false) => {
      const trimmed = rawTranscript.trim();
      if (!trimmed) return;

      if (target.field === 'score') {
        const parsedScore = parseSpokenScore(trimmed);
        if (parsedScore === null) {
          if (!isInterimFlush) {
            setFeedbackBanner({
              type: 'warning',
              text: `حقل الدرجة يقبل الأرقام فقط — لم يُتعرف على رقم في: «${trimmed}»`,
            });
          }
          return;
        }
        setFeedbackBanner(null);
        onChangeRows((prev) =>
          prev.map((row, idx) =>
            idx === target.rowIndex ? { ...row, score: parsedScore } : row
          )
        );
      } else {
        const cleanedName = cleanSpokenStudentName(trimmed);
        if (!cleanedName) return;
        setFeedbackBanner(null);
        onChangeRows((prev) =>
          prev.map((row, idx) => {
            if (idx !== target.rowIndex) return row;
            const existing = cleanSingleSpaces(row.name);
            if (!existing) {
              return { ...row, name: cleanedName };
            }
            if (existing === cleanedName || existing.endsWith(cleanedName)) {
              return row;
            }
            return { ...row, name: cleanSingleSpaces(`${existing} ${cleanedName}`) };
          })
        );
      }
    },
    [onChangeRows]
  );

  // Commit any in-flight interim speech to its locked cell before changing active cell
  const flushPendingInterims = useCallback(() => {
    if (latestInterimByIndexRef.current.size === 0) {
      setInterimPreview(null);
      return;
    }

    for (const [idx, text] of latestInterimByIndexRef.current.entries()) {
      if (committedIndicesRef.current.has(idx)) continue;
      const target = lockedTargetsRef.current.get(idx) ?? activeCellRef.current;
      committedIndicesRef.current.add(idx);
      applyTranscriptToCell(target, text, true);
    }

    latestInterimByIndexRef.current.clear();
    setInterimPreview(null);
  }, [applyTranscriptToCell]);

  const stopRecognition = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }
    committedIndicesRef.current.clear();
    lockedTargetsRef.current.clear();
    latestInterimByIndexRef.current.clear();
    setInterimPreview(null);
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(
    (langOverride?: 'ar-SA' | 'ar-IQ' | 'ar-EG') => {
      const Ctor = getSpeechRecognitionConstructor();
      if (!Ctor) {
        setFeedbackBanner({
          type: 'error',
          text: 'متصفحك لا يدعم ميزة التعرف الصوتي المباشر. يُنصح باستخدام متصفح Chrome على الهاتف أو الكمبيوتر.',
        });
        setIsListening(false);
        shouldListenRef.current = false;
        return;
      }

      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }

      committedIndicesRef.current.clear();
      lockedTargetsRef.current.clear();
      latestInterimByIndexRef.current.clear();
      shouldListenRef.current = true;

      const recognition = new Ctor();
      recognition.lang = langOverride || speechLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        triedGetUserMediaRef.current = false;
        setIsListening(true);
        setFeedbackBanner((prev) => (prev?.type === 'error' ? null : prev));
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let activeInterimText = '';
        let activeInterimTarget: ActiveVoiceCell | null = null;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result || !result[0]) continue;
          const transcript = result[0].transcript || '';

          if (committedIndicesRef.current.has(i)) {
            continue;
          }

          if (!lockedTargetsRef.current.has(i)) {
            lockedTargetsRef.current.set(i, { ...activeCellRef.current });
          }
          const target = lockedTargetsRef.current.get(i)!;

          if (result.isFinal) {
            committedIndicesRef.current.add(i);
            latestInterimByIndexRef.current.delete(i);
            applyTranscriptToCell(target, transcript, false);
          } else if (transcript.trim()) {
            latestInterimByIndexRef.current.set(i, transcript);
            activeInterimText = transcript.trim();
            activeInterimTarget = target;
          }
        }

        if (activeInterimText && activeInterimTarget) {
          setInterimPreview({
            target: activeInterimTarget,
            text: activeInterimText,
          });
        } else {
          setInterimPreview(null);
        }
      };

      recognition.onerror = async (event: SpeechRecognitionErrorEventLike) => {
        const err = event.error;
        if (err === 'no-speech' || err === 'aborted') {
          return;
        }
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          // Try requesting microphone explicitly via getUserMedia first in case browser hasn't prompted yet
          if (
            !triedGetUserMediaRef.current &&
            typeof navigator !== 'undefined' &&
            navigator.mediaDevices?.getUserMedia
          ) {
            triedGetUserMediaRef.current = true;
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach((track) => track.stop());
              if (shouldListenRef.current) {
                window.setTimeout(() => {
                  startRecognition(langOverride || speechLang);
                }, 80);
                return;
              }
            } catch {
              // Permission is genuinely blocked by browser or embedded frame policy
            }
          }

          shouldListenRef.current = false;
          setIsListening(false);
          const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
          setFeedbackBanner({
            type: 'error',
            isMicPermissionError: true,
            text: isInIframe
              ? 'إطار المعاينة الحالي يمنع الوصول إلى الميكروفون أو لم يتم تحديث الصلاحية بعد. اضغط «فتح في نافذة مستقلة» لتفعيل الميكروفون مباشرة في متصفحك، أو أعد تحديث الصفحة ثم حاول مجدداً.'
              : 'تعذر الوصول إلى الميكروفون من المتصفح. تأكد من تفعيل إذن الميكروفون للمتصفح في إعدادات الجهاز أو اضغط إعادة المحاولة.',
          });
          return;
        }
        if (err === 'audio-capture') {
          shouldListenRef.current = false;
          setIsListening(false);
          setFeedbackBanner({
            type: 'error',
            text: 'لم يتم العثور على ميكروفون نشط على هذا الجهاز.',
          });
          return;
        }
        if (err === 'language-not-supported' && (langOverride || speechLang) !== 'ar-SA') {
          setSpeechLang('ar-SA');
          return;
        }
        if (err === 'network') {
          setFeedbackBanner({
            type: 'warning',
            text: 'يتطلب التعرف الصوتي اتصالاً مستقراً بالإنترنت.',
          });
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        if (shouldListenRef.current) {
          restartTimerRef.current = window.setTimeout(() => {
            if (shouldListenRef.current) {
              startRecognition(langOverride || speechLang);
            }
          }, 150);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setIsListening(false);
      }
    },
    [applyTranscriptToCell, speechLang]
  );

  // Stop recognition whenever tab is switched away or component unmounts
  useEffect(() => {
    if (!isActiveTab) {
      stopRecognition();
    }
    return () => {
      stopRecognition();
    };
  }, [isActiveTab, stopRecognition]);

  // Auto-select first empty student name cell when tab is activated (without triggering mic permission)
  useEffect(() => {
    if (!isActiveTab) return;
    if (autoStartTrigger !== lastAutoStartTriggerRef.current) {
      lastAutoStartTriggerRef.current = autoStartTrigger;

      // Focus the first empty student name cell (or row 0 if all filled)
      const firstEmptyIdx = rowsRef.current.findIndex((r) => !r.name.trim());
      setActiveCell({
        rowIndex: firstEmptyIdx >= 0 ? firstEmptyIdx : 0,
        field: 'name',
      });
    }
  }, [isActiveTab, autoStartTrigger]);

  // Select a cell cleanly WITHOUT focusing any keyboard input or auto-prompting mic
  const handleSelectCell = (rowIndex: number, field: 'name' | 'score') => {
    if (
      activeCellRef.current.rowIndex !== rowIndex ||
      activeCellRef.current.field !== field
    ) {
      flushPendingInterims();
    }
    setFeedbackBanner(null);
    setActiveCell({ rowIndex, field });
  };

  // Option 1 & Option 2: Create a new student row (Name + Score) and select its Name cell
  const handleCreateNextStudentRow = (insertAfterIndex?: number) => {
    flushPendingInterims();
    setFeedbackBanner(null);

    const newRow = createEmptyVoiceRow();
    const targetIdx =
      typeof insertAfterIndex === 'number'
        ? insertAfterIndex + 1
        : rows.length;

    onChangeRows((prev) => {
      const next = [...prev];
      next.splice(targetIdx, 0, newRow);
      return next;
    });

    setActiveCell({ rowIndex: targetIdx, field: 'name' });

    window.setTimeout(() => {
      rowRefs.current[targetIdx]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 50);
  };

  const handleClearCell = (
    e: React.MouseEvent,
    rowIndex: number,
    field: 'name' | 'score'
  ) => {
    e.stopPropagation();
    flushPendingInterims();
    onChangeRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, [field]: '' } : row
      )
    );
    setActiveCell({ rowIndex, field });
  };

  const handleDeleteRow = (e: React.MouseEvent, rowIndex: number) => {
    e.stopPropagation();
    flushPendingInterims();
    if (rows.length <= 1) {
      onChangeRows([createEmptyVoiceRow()]);
      setActiveCell({ rowIndex: 0, field: 'name' });
      return;
    }

    onChangeRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
    setActiveCell((prev) => ({
      rowIndex: Math.max(0, Math.min(prev.rowIndex, rows.length - 2)),
      field: 'name',
    }));
  };

  const handleToggleListening = async () => {
    if (isListening || shouldListenRef.current) {
      flushPendingInterims();
      stopRecognition();
    } else {
      triedGetUserMediaRef.current = false;
      setFeedbackBanner(null);
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          // Proceed to startRecognition which handles exact permission feedback cleanly
        }
      }
      startRecognition();
    }
  };

  const handleChangeLanguage = (nextLang: 'ar-SA' | 'ar-IQ' | 'ar-EG') => {
    setSpeechLang(nextLang);
    if (shouldListenRef.current || isListening) {
      stopRecognition();
      window.setTimeout(() => {
        startRecognition(nextLang);
      }, 100);
    }
  };

  // Detect any close name matches against previous sheets
  const suspectedVoiceMatches: Array<{
    rowIndex: number;
    rawName: string;
    match: SuspectedMatchResult;
  }> = [];

  rows.forEach((r, rowIndex) => {
    const cleaned = cleanSingleSpaces(r.name);
    if (!cleaned) return;
    const match = findSuspectedStudentMatch(cleaned, allReferenceStudents);
    if (match && !match.isExact) {
      suspectedVoiceMatches.push({ rowIndex, rawName: cleaned, match });
    }
  });

  const handleAdoptVoiceMatch = (rowIndex: number, matchedName: string) => {
    onChangeRows((prev) =>
      prev.map((r, idx) => (idx === rowIndex ? { ...r, name: matchedName } : r))
    );
  };

  const filledCount = rows.filter((r) => cleanSingleSpaces(r.name).length > 0).length;

  return (
    <div className="space-y-3 animate-in fade-in duration-150 select-none" dir="rtl">
      {/* Microphone Control Bar */}
      <div className="p-3 bg-[#F5EFE3] border border-[#D8CEBD] rounded-xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleListening}
            disabled={!isSpeechSupported}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-[#5692BE] hover:bg-[#467EAA] text-white'
            }`}
          >
            {isListening ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0" />
                <Mic className="w-4 h-4 shrink-0" />
                <span>جاري تسجيل الصوت... (إيقاف)</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 shrink-0" />
                <span>تسجيل صوت</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 text-xs">
            <label
              htmlFor="voice-dialect-select"
              className="text-[#554A3E] font-bold hidden sm:inline"
            >
              اللهجة:
            </label>
            <select
              id="voice-dialect-select"
              value={speechLang}
              onChange={(e) =>
                handleChangeLanguage(e.target.value as 'ar-SA' | 'ar-IQ' | 'ar-EG')
              }
              className="bg-white border border-[#D8CEBD] rounded-lg px-2 py-1.5 text-xs font-bold text-[#2F2822] focus:outline-none cursor-pointer"
            >
              <option value="ar-SA">العربية الفصحى / الخليجية</option>
              <option value="ar-IQ">العربية (العراقية)</option>
              <option value="ar-EG">العربية (المصرية)</option>
            </select>
          </div>
        </div>

        {/* Active target indicator */}
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#4A3D30]">
          <Volume2 className="w-4 h-4 text-[#5692BE] shrink-0" />
          <span>الحقل المحدد:</span>
          <span className="font-black text-[#2F2822]">
            الطالب #{activeCell.rowIndex + 1} —{' '}
            {activeCell.field === 'name' ? 'اسم الطالب' : 'الدرجة (أرقام فقط)'}
          </span>
        </div>
      </div>

      {/* Live Speech Preview or Validation Notice */}
      {feedbackBanner && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold space-y-2 ${
            feedbackBanner.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : feedbackBanner.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{feedbackBanner.text}</span>
          </div>

          {feedbackBanner.isMicPermissionError && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleToggleListening}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>

              {typeof window !== 'undefined' && window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في نافذة مستقلة لتفعيل الميكروفون</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {interimPreview && (
        <div className="px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 flex items-center gap-2">
          <Mic className="w-3.5 h-3.5 text-[#5692BE] animate-pulse shrink-0" />
          <span className="font-semibold">يتم السماع الآن:</span>
          <span className="font-black">{interimPreview.text}</span>
        </div>
      )}

      {/* Two-Column Voice Entry Table (STRICTLY NO KEYBOARD INPUTS) */}
      <div className="border border-[#D8CEBD] rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="max-h-64 sm:max-h-72 overflow-y-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-[#F5EFE3] text-[#2F2822] text-xs font-black sticky top-0 z-10 border-b border-[#D8CEBD]">
              <tr>
                <th className="p-2.5 w-10 text-center border-l border-[#E4DAC8]">#</th>
                <th className="p-2.5 border-l border-[#E4DAC8]">اسم الطالب</th>
                <th className="p-2.5 w-28 sm:w-36 text-center border-l border-[#E4DAC8]">
                  <div className="flex flex-col items-center leading-tight">
                    <span>الدرجة</span>
                    <span className="text-[10px] font-semibold text-[#7A6E61]">
                      (أرقام فقط)
                    </span>
                  </div>
                </th>
                <th className="p-2.5 w-20 text-center">التنقل / حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE7D8]">
              {rows.map((row, idx) => {
                const isNameActive =
                  activeCell.rowIndex === idx && activeCell.field === 'name';
                const isScoreActive =
                  activeCell.rowIndex === idx && activeCell.field === 'score';

                const liveNameText =
                  interimPreview &&
                  interimPreview.target.rowIndex === idx &&
                  interimPreview.target.field === 'name'
                    ? interimPreview.text
                    : '';

                const liveScoreText =
                  interimPreview &&
                  interimPreview.target.rowIndex === idx &&
                  interimPreview.target.field === 'score'
                    ? parseSpokenScore(interimPreview.text) || interimPreview.text
                    : '';

                return (
                  <tr
                    key={row.id}
                    ref={(el) => {
                      rowRefs.current[idx] = el;
                    }}
                    className={`transition-colors ${
                      isNameActive || isScoreActive
                        ? 'bg-sky-50/40'
                        : 'hover:bg-[#FAF7EC]/60'
                    }`}
                  >
                    {/* Row Index */}
                    <td className="p-2 text-center text-xs font-mono tabular-nums font-bold text-[#6B5E51] border-l border-[#EFE7D8]">
                      {idx + 1}
                    </td>

                    {/* Column 1: Student Name (Button only — NEVER opens OS keyboard) */}
                    <td className="p-1.5 border-l border-[#EFE7D8]">
                      <div
                        className={`relative flex items-center rounded-lg border-2 transition-all ${
                          isNameActive
                            ? 'border-[#5692BE] bg-sky-50/80 ring-2 ring-[#5692BE]/25'
                            : 'border-[#E4DAC8] bg-[#FAF7EC]/40 hover:border-[#BA916C]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectCell(idx, 'name')}
                          className="w-full min-h-[42px] px-2.5 py-1.5 text-right flex items-center justify-between gap-2 cursor-pointer focus:outline-none"
                        >
                          <span
                            className={`text-xs sm:text-sm truncate ${
                              row.name
                                ? 'font-bold text-[#2F2822]'
                                : liveNameText
                                ? 'font-bold text-[#2B6CB0] italic'
                                : 'text-[#8D8072] font-medium'
                            }`}
                          >
                            {row.name
                              ? liveNameText
                                ? `${row.name} ${liveNameText}`
                                : row.name
                              : liveNameText ||
                                (isNameActive
                                  ? 'انطق اسم الطالب الآن...'
                                  : 'انقر للتحديد وإملاء الاسم')}
                          </span>
                          {isNameActive && (
                            <Mic
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isListening
                                  ? 'text-rose-600 animate-pulse'
                                  : 'text-[#5692BE]'
                              }`}
                            />
                          )}
                        </button>

                        {row.name && (
                          <button
                            type="button"
                            onClick={(e) => handleClearCell(e, idx, 'name')}
                            title="مسح الاسم"
                            aria-label="مسح الاسم"
                            className="p-1.5 ml-1 text-[#8D8072] hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Score (Numbers Only, Button only — NEVER opens OS keyboard) */}
                    <td className="p-1.5 border-l border-[#EFE7D8]">
                      <div
                        className={`relative flex items-center rounded-lg border-2 transition-all ${
                          isScoreActive
                            ? 'border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-500/25'
                            : 'border-[#E4DAC8] bg-[#FAF7EC]/40 hover:border-emerald-500/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectCell(idx, 'score')}
                          className="w-full min-h-[42px] px-2 py-1.5 text-center flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          <span
                            dir="ltr"
                            className={`text-xs sm:text-sm font-mono tabular-nums ${
                              row.score
                                ? 'font-black text-emerald-900'
                                : liveScoreText
                                ? 'font-bold text-emerald-700'
                                : 'text-[#8D8072] text-[11px] font-sans font-medium'
                            }`}
                          >
                            {row.score ||
                              liveScoreText ||
                              (isScoreActive ? 'انطق الرقم...' : 'الدرجة')}
                          </span>
                          {isScoreActive && (
                            <Mic
                              className={`w-3 h-3 shrink-0 ${
                                isListening
                                  ? 'text-rose-600 animate-pulse'
                                  : 'text-emerald-700'
                              }`}
                            />
                          )}
                        </button>

                        {row.score && (
                          <button
                            type="button"
                            onClick={(e) => handleClearCell(e, idx, 'score')}
                            title="مسح الدرجة"
                            aria-label="مسح الدرجة"
                            className="p-1 ml-0.5 text-[#8D8072] hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Row Actions: Option 1 (Inline mark to create new student row) + Delete */}
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCreateNextStudentRow(idx)}
                          title="علامة إنشاء صف جديد للطالب التالي"
                          aria-label="إنشاء صف جديد للطالب التالي"
                          className="w-8 h-8 rounded-lg bg-[#5692BE]/15 hover:bg-[#5692BE] text-[#2B6CB0] hover:text-white border border-[#5692BE]/40 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <CornerDownLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRow(e, idx)}
                          title={rows.length <= 1 ? 'تفريغ الصف' : 'حذف الصف'}
                          aria-label={rows.length <= 1 ? 'تفريغ الصف' : 'حذف الصف'}
                          className="w-8 h-8 rounded-lg text-[#8D8072] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Option 2: Dedicated Button to Create New Student Row */}
      <button
        type="button"
        onClick={() => handleCreateNextStudentRow()}
        className="w-full py-2.5 px-4 bg-[#EAE2D5] hover:bg-[#DFD4C2] text-[#2F2822] border border-[#BA916C]/60 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
      >
        <UserPlus className="w-4 h-4 text-[#8C6544] shrink-0" />
        <span>إضافة صف لطالب جديد والانتقال إليه</span>
        <Plus className="w-4 h-4 text-[#8C6544] shrink-0" />
      </button>

      {/* Summary & Update-Existing Option */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs bg-[#F5EFE3] p-2.5 rounded-xl border border-[#D8CEBD]">
        <div className="flex flex-wrap items-center gap-2 text-[#554A3E] font-medium">
          <span>
            الطلاب المدخلون صوتياً:{' '}
            <b className="text-[#8C6544] font-black tabular-nums">{filledCount}</b>
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-[11px] text-[#6B5E51]">
            إدخال صوتي مباشر دون لوحة مفاتيح
          </span>
        </div>

        <label className="flex items-center gap-1.5 font-bold text-[#2F2822] cursor-pointer select-none text-[11px] sm:text-xs">
          <input
            type="checkbox"
            checked={updateExisting}
            onChange={(e) => onChangeUpdateExisting(e.target.checked)}
            className="rounded text-[#BA916C] focus:ring-[#BA916C] w-4 h-4 cursor-pointer"
          />
          <span>تحديث درجات الطلاب المسجلين مسبقاً على أساس الاسم</span>
        </label>
      </div>

      {/* Suspicious Name Verification Alert for Voice Entry */}
      {suspectedVoiceMatches.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-black text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              تم رصد أسماء قريبة لأسماء في السجلات السابقة ({suspectedVoiceMatches.length}):
            </span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {suspectedVoiceMatches.map((item) => (
              <div
                key={`${item.rowIndex}-${item.rawName}`}
                className="flex flex-wrap items-center justify-between gap-2 p-2 bg-amber-100/80 border border-amber-300 rounded-lg"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-amber-800 line-through">
                    {item.rawName}
                  </span>
                  <span className="text-amber-700">←</span>
                  <span className="font-black text-amber-950">
                    هل تقصد {item.match.matchedName}؟
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleAdoptVoiceMatch(item.rowIndex, item.match.matchedName)
                  }
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>اعتماد «{item.match.matchedName}»</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
