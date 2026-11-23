import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react';
import { StudentRow } from '../../types';
import { parseSpokenScore } from '../../utils/arabicSpeechParser';
import { formatScoreDisplay } from './GradeNumericKeypad';

interface ActiveVoiceTarget {
  studentId: string;
  columnType: 'written' | 'custom';
  columnId?: string;
  columnName: string;
  maxScore: number;
}

interface VoiceScoreBarProps {
  isActive: boolean;
  isHiddenByKeypad: boolean;
  onDisableVoiceMode: () => void;
  onShowKeypad: () => void;
  activeTarget: ActiveVoiceTarget | null;
  currentStudent: StudentRow | null;
  nextStudent: StudentRow | null;
  prevStudent: StudentRow | null;
  currentValue: number | null | undefined;
  numeralMode: 'EN' | 'AR';
  onValueChangeForTarget: (target: ActiveVoiceTarget, newValue: number | null) => void;
  onNext: () => void;
  onPrev: () => void;
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

export const VoiceScoreBar: React.FC<VoiceScoreBarProps> = ({
  isActive,
  isHiddenByKeypad,
  onDisableVoiceMode,
  onShowKeypad,
  activeTarget,
  currentStudent,
  nextStudent,
  prevStudent,
  currentValue,
  numeralMode,
  onValueChangeForTarget,
  onNext,
  onPrev,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<'ar-SA' | 'ar-IQ' | 'ar-EG'>('ar-SA');
  const [interimText, setInterimText] = useState<string>('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'warning' | 'error';
    text: string;
    isMicPermissionError?: boolean;
  } | null>(null);

  const isSpeechSupported = Boolean(getSpeechRecognitionConstructor());

  const activeTargetRef = useRef<ActiveVoiceTarget | null>(activeTarget);
  const onValueChangeRef = useRef(onValueChangeForTarget);
  const shouldListenRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const committedIndicesRef = useRef<Set<number>>(new Set());
  const lockedTargetsRef = useRef<Map<number, ActiveVoiceTarget | null>>(new Map());
  const latestInterimByIndexRef = useRef<Map<number, string>>(new Map());
  const triedGetUserMediaRef = useRef<boolean>(false);

  useEffect(() => {
    // Flush any pending valid numeric interim before switching cell target
    if (
      activeTargetRef.current &&
      activeTarget &&
      (activeTargetRef.current.studentId !== activeTarget.studentId ||
        activeTargetRef.current.columnType !== activeTarget.columnType ||
        activeTargetRef.current.columnId !== activeTarget.columnId)
    ) {
      for (const [idx, text] of latestInterimByIndexRef.current.entries()) {
        if (committedIndicesRef.current.has(idx)) continue;
        const target = lockedTargetsRef.current.get(idx) ?? activeTargetRef.current;
        if (!target) continue;
        const parsed = parseSpokenScore(text);
        if (parsed !== null) {
          const num = Number(parsed);
          if (!Number.isNaN(num)) {
            committedIndicesRef.current.add(idx);
            onValueChangeRef.current(target, num);
          }
        }
      }
      latestInterimByIndexRef.current.clear();
      setInterimText('');
    }
    activeTargetRef.current = activeTarget;
  }, [activeTarget]);

  useEffect(() => {
    onValueChangeRef.current = onValueChangeForTarget;
  }, [onValueChangeForTarget]);

  const applySpokenGrade = useCallback(
    (target: ActiveVoiceTarget | null, rawTranscript: string) => {
      const trimmed = rawTranscript.trim();
      if (!trimmed || !target) return;

      const parsed = parseSpokenScore(trimmed);
      if (parsed === null) {
        setFeedbackBanner({
          type: 'warning',
          text: `الدرجات تقبل الأرقام فقط — لم يُتعرف على رقم في: «${trimmed}»`,
        });
        return;
      }

      const num = Number(parsed);
      if (Number.isNaN(num)) return;

      setFeedbackBanner(null);
      onValueChangeRef.current(target, num);
    },
    []
  );

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
        // Ignore
      }
      recognitionRef.current = null;
    }
    committedIndicesRef.current.clear();
    lockedTargetsRef.current.clear();
    latestInterimByIndexRef.current.clear();
    setInterimText('');
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(
    (langOverride?: 'ar-SA' | 'ar-IQ' | 'ar-EG') => {
      const Ctor = getSpeechRecognitionConstructor();
      if (!Ctor) {
        setFeedbackBanner({
          type: 'error',
          text: 'متصفحك لا يدعم الإدخال الصوتي المباشر. يُنصح باستخدام متصفح Chrome.',
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
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result || !result[0]) continue;
          const transcript = result[0].transcript || '';

          if (committedIndicesRef.current.has(i)) {
            continue;
          }

          if (!lockedTargetsRef.current.has(i)) {
            lockedTargetsRef.current.set(
              i,
              activeTargetRef.current ? { ...activeTargetRef.current } : null
            );
          }
          const target = lockedTargetsRef.current.get(i) ?? activeTargetRef.current;

          if (result.isFinal) {
            committedIndicesRef.current.add(i);
            latestInterimByIndexRef.current.delete(i);
            applySpokenGrade(target, transcript);
          } else if (transcript.trim()) {
            latestInterimByIndexRef.current.set(i, transcript);
            currentInterim = transcript.trim();
          }
        }

        setInterimText(currentInterim);
      };

      recognition.onerror = async (event: SpeechRecognitionErrorEventLike) => {
        const err = event.error;
        if (err === 'no-speech' || err === 'aborted') return;

        if (err === 'not-allowed' || err === 'service-not-allowed') {
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
              // Blocked by browser or frame policy
            }
          }

          shouldListenRef.current = false;
          setIsListening(false);
          const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
          setFeedbackBanner({
            type: 'error',
            isMicPermissionError: true,
            text: isInIframe
              ? 'إطار المعاينة يمنع الميكروفون أو يحتاج إعادة تحميل. يمكنك الضغط على «فتح في نافذة مستقلة» لتفعيل الميكروفون مباشرة.'
              : 'تعذر الوصول إلى الميكروفون. يرجى تفعيل إذن الميكروفون ثم الضغط على «إعادة المحاولة».',
          });
          return;
        }

        if (err === 'audio-capture') {
          shouldListenRef.current = false;
          setIsListening(false);
          setFeedbackBanner({
            type: 'error',
            text: 'لم يتم العثور على ميكروفون متصل على هذا الجهاز.',
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
    [applySpokenGrade, speechLang]
  );

  // Stop recognition cleanly whenever voice mode is turned off or unmounts; never auto-prompt mic on mount
  useEffect(() => {
    if (!isActive) {
      stopRecognition();
    }
    return () => {
      stopRecognition();
    };
  }, [isActive, stopRecognition]);

  const handleToggleListening = async () => {
    if (isListening || shouldListenRef.current) {
      stopRecognition();
    } else {
      triedGetUserMediaRef.current = false;
      setFeedbackBanner(null);
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          // Handled inside startRecognition
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

  if (!isActive || isHiddenByKeypad) return null;

  const formattedCurrentVal =
    currentValue !== null && currentValue !== undefined
      ? formatScoreDisplay(currentValue, numeralMode)
      : '—';

  const parsedInterim = interimText ? parseSpokenScore(interimText) : null;

  return (
    <div
      id="voice-score-bar"
      data-keypad-container="true"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7EC] border-t-2 border-emerald-600/60 shadow-2xl animate-in slide-in-from-bottom duration-200 select-none no-print"
      dir="rtl"
    >
      <div className="max-w-3xl mx-auto px-2.5 sm:px-4 py-2 space-y-2">
        {/* Top Row: Active Student & Score + Prev/Next */}
        <div className="flex items-center justify-between gap-2 bg-[#F2ECE0] border border-[#D8CEBD] rounded-xl px-2.5 py-1.5">
          {currentStudent && activeTarget ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isListening ? 'bg-rose-600 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-[#2F2822] truncate">
                    {currentStudent.name}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-[#554A3E] bg-white/90 px-1.5 py-0.2 rounded border border-[#D8CEBD]">
                    {activeTarget.columnName}
                  </span>
                  <span
                    dir="ltr"
                    className="text-xs sm:text-sm font-mono font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.2 rounded tabular-nums"
                  >
                    {parsedInterim ?? formattedCurrentVal}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs font-bold text-[#554A3E] flex-1">
              اضغط على أي حقل درجة في الجدول ثم انطق الرقم لإدخال الدرجة صوتياً
            </div>
          )}

          {/* Prev / Next student controls */}
          {currentStudent && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onPrev}
                disabled={!prevStudent}
                title="الطالب السابق"
                className="px-2 py-1 rounded-lg bg-white hover:bg-[#EAE2D5] disabled:opacity-40 text-[#2F2822] border border-[#D8CEBD] text-xs font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">السابق</span>
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!nextStudent}
                title="الطالب التالي"
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-black flex items-center gap-0.5 cursor-pointer shadow-2xs"
              >
                <span>التالي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Feedback / Error Notice */}
        {feedbackBanner && (
          <div
            className={`p-2 rounded-xl border text-xs font-bold space-y-1.5 ${
              feedbackBanner.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedbackBanner.text}</span>
            </div>
            {feedbackBanner.isMicPermissionError && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleListening}
                  className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>إعادة المحاولة</span>
                </button>
                {typeof window !== 'undefined' && window.self !== window.top && (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[11px] font-black flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>فتح في نافذة مستقلة لتفعيل الميكروفون</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Controls Row: Voice Toggle + Dialect + Show Custom Keypad Button + Close Voice */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleToggleListening}
              disabled={!isSpeechSupported}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#5692BE] hover:bg-[#467EAA] text-white'
              }`}
            >
              {isListening ? (
                <>
                  <Mic className="w-4 h-4 animate-pulse shrink-0" />
                  <span>جاري تسجيل الصوت... (إيقاف)</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 shrink-0" />
                  <span>تسجيل صوت</span>
                </>
              )}
            </button>

            <select
              aria-label="لهجة الإدخال الصوتي"
              value={speechLang}
              onChange={(e) =>
                handleChangeLanguage(e.target.value as 'ar-SA' | 'ar-IQ' | 'ar-EG')
              }
              className="bg-white border border-[#D8CEBD] rounded-xl px-2 py-2 text-[11px] sm:text-xs font-bold text-[#2F2822] focus:outline-none cursor-pointer"
            >
              <option value="ar-SA">العربية الفصحى</option>
              <option value="ar-IQ">العراقية</option>
              <option value="ar-EG">المصرية</option>
            </select>
          </div>

          {/* Right/Left group: Button to Reveal Custom Numeric Keypad + Disable Voice */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onShowKeypad}
              className="px-3.5 py-2 bg-[#BA916C] hover:bg-[#A67D58] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              title="إظهار لوحة المفاتيح الرقمية الخاصة"
            >
              <Keyboard className="w-4 h-4 shrink-0" />
              <span>إظهار لوحة المفاتيح</span>
            </button>

            <button
              type="button"
              onClick={onDisableVoiceMode}
              className="p-2 bg-white hover:bg-rose-50 text-[#6B5E51] hover:text-rose-700 border border-[#D8CEBD] hover:border-rose-300 rounded-xl transition-colors cursor-pointer"
              title="إلغاء تفعيل الإدخال الصوتي"
              aria-label="إلغاء تفعيل الإدخال الصوتي"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
