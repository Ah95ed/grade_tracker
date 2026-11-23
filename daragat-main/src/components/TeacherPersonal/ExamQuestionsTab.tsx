import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ExamBuilderData,
  SavedExamPaper,
  ExamQuestionItem,
  ExamQuestionBranch,
  ExamBranchStyle,
  ExamBranchLayout,
} from '../../types/teacherPersonal';
import { TeacherProfile } from '../../types';
import {
  createDefaultExamPaper,
  createSampleExamPaper,
} from '../../utils/teacherPersonalStorage';
import { exportExamPaperToWord } from '../../utils/examWordExport';
import { triggerPrint } from '../../utils/printHelper';
import {
  Plus,
  Trash2,
  Printer,
  Mic,
  MicOff,
  Save,
  ListChecks,
  FilePlus2,
  Upload,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Copy,
  Sparkles,
  Check,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  FileDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface Props {
  examsData: ExamBuilderData;
  onChange: (next: ExamBuilderData) => void;
  profile: TeacherProfile;
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

type VoiceTarget =
  | { kind: 'header_line'; side: 'rightLines' | 'leftLines'; index: number }
  | { kind: 'student_label'; field: 'studentNameLabel' | 'studentNumberLabel' }
  | { kind: 'note' }
  | { kind: 'footer' }
  | { kind: 'question_label'; questionId: string }
  | { kind: 'question_prompt'; questionId: string }
  | { kind: 'question_marks'; questionId: string }
  | { kind: 'branch_label'; questionId: string; branchId: string }
  | { kind: 'branch_text'; questionId: string; branchId: string };

interface CursorState {
  target: VoiceTarget;
  element: HTMLInputElement | HTMLTextAreaElement | null;
  start: number;
  end: number;
}

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ARABIC_ALPHA_LABELS = [
  'أ',
  'ب',
  'ج',
  'د',
  'هـ',
  'و',
  'ز',
  'ح',
  'ط',
  'ي',
  'ك',
  'ل',
];

function toArabicDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => ARABIC_INDIC_DIGITS[Number(d)] ?? d);
}

function formatNumber(num: number, useArabicDigits: boolean): string {
  return useArabicDigits ? toArabicDigits(num) : String(num);
}

function getBranchPrefix(
  branch: ExamQuestionBranch,
  index: number,
  style: ExamBranchStyle,
  useArabicDigits: boolean
): string {
  if (branch.customLabel !== undefined && branch.customLabel.trim() !== '') {
    return branch.customLabel.trim();
  }
  switch (style) {
    case 'arabic_num':
      return `${toArabicDigits(index + 1)})`;
    case 'latin_num':
      return `${index + 1})`;
    case 'arabic_alpha':
      return `${ARABIC_ALPHA_LABELS[index] || formatNumber(index + 1, useArabicDigits)})`;
    case 'dash':
      return '-';
    case 'none':
    default:
      return '';
  }
}

function getTargetFieldKey(target: VoiceTarget): string {
  switch (target.kind) {
    case 'header_line':
      return `header:${target.side}:${target.index}`;
    case 'student_label':
      return `student:${target.field}`;
    case 'note':
      return 'note';
    case 'footer':
      return 'footer';
    case 'question_label':
      return `q_label:${target.questionId}`;
    case 'question_prompt':
      return `q_prompt:${target.questionId}`;
    case 'question_marks':
      return `q_marks:${target.questionId}`;
    case 'branch_label':
      return `b_label:${target.questionId}:${target.branchId}`;
    case 'branch_text':
      return `b_text:${target.questionId}:${target.branchId}`;
  }
}

function getDraftValueByTarget(paper: SavedExamPaper, target: VoiceTarget): string {
  switch (target.kind) {
    case 'header_line':
      return paper.header[target.side]?.[target.index] ?? '';
    case 'student_label':
      return paper.header[target.field] ?? '';
    case 'note':
      return paper.header.noteText ?? '';
    case 'footer':
      return paper.header.footerText ?? '';
    case 'question_label':
      return paper.questions.find((q) => q.id === target.questionId)?.label ?? '';
    case 'question_prompt':
      return paper.questions.find((q) => q.id === target.questionId)?.prompt ?? '';
    case 'question_marks':
      return paper.questions.find((q) => q.id === target.questionId)?.marks ?? '';
    case 'branch_label':
      return (
        paper.questions
          .find((q) => q.id === target.questionId)
          ?.branches.find((b) => b.id === target.branchId)?.customLabel ?? ''
      );
    case 'branch_text':
      return (
        paper.questions
          .find((q) => q.id === target.questionId)
          ?.branches.find((b) => b.id === target.branchId)?.text ?? ''
      );
  }
}

function applyDraftValueByTarget(
  paper: SavedExamPaper,
  target: VoiceTarget,
  nextVal: string
): SavedExamPaper {
  switch (target.kind) {
    case 'header_line': {
      const nextLines = [...(paper.header[target.side] || [])];
      nextLines[target.index] = nextVal;
      return {
        ...paper,
        header: { ...paper.header, [target.side]: nextLines },
      };
    }
    case 'student_label':
      return {
        ...paper,
        header: { ...paper.header, [target.field]: nextVal },
      };
    case 'note':
      return {
        ...paper,
        header: { ...paper.header, showNote: true, noteText: nextVal },
      };
    case 'footer':
      return {
        ...paper,
        header: { ...paper.header, footerText: nextVal },
      };
    case 'question_label':
      return {
        ...paper,
        questions: paper.questions.map((q) =>
          q.id === target.questionId ? { ...q, label: nextVal } : q
        ),
      };
    case 'question_prompt':
      return {
        ...paper,
        questions: paper.questions.map((q) =>
          q.id === target.questionId ? { ...q, prompt: nextVal } : q
        ),
      };
    case 'question_marks':
      return {
        ...paper,
        questions: paper.questions.map((q) =>
          q.id === target.questionId ? { ...q, marks: nextVal } : q
        ),
      };
    case 'branch_label':
      return {
        ...paper,
        questions: paper.questions.map((q) =>
          q.id === target.questionId
            ? {
                ...q,
                branches: q.branches.map((b) =>
                  b.id === target.branchId ? { ...b, customLabel: nextVal } : b
                ),
              }
            : q
        ),
      };
    case 'branch_text':
      return {
        ...paper,
        questions: paper.questions.map((q) =>
          q.id === target.questionId
            ? {
                ...q,
                branches: q.branches.map((b) =>
                  b.id === target.branchId ? { ...b, text: nextVal } : b
                ),
              }
            : q
        ),
      };
  }
}

const BRANCH_STYLE_OPTIONS: { value: ExamBranchStyle; label: string }[] = [
  { value: 'arabic_num', label: '١) ٢) ٣)' },
  { value: 'arabic_alpha', label: 'أ) ب) ج)' },
  { value: 'latin_num', label: '1) 2) 3)' },
  { value: 'dash', label: 'شرطة (-)' },
  { value: 'none', label: 'بدون ترقيم' },
];

const BRANCH_LAYOUT_OPTIONS: { value: ExamBranchLayout; label: string }[] = [
  { value: 'vertical', label: 'تحت بعض' },
  { value: 'inline', label: 'سطر واحد' },
  { value: 'two_col', label: 'عمودان' },
];

interface AutoTextareaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  isVoiceActive?: boolean;
  inputRef?: (el: HTMLTextAreaElement | null) => void;
  onCursorActivity?: (el: HTMLTextAreaElement) => void;
}

const AutoResizeTextarea: React.FC<AutoTextareaProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  ariaLabel,
  isVoiceActive = false,
  inputRef,
  onCursorActivity,
}) => {
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 26)}px`;
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        localRef.current = el;
        inputRef?.(el);
      }}
      rows={1}
      value={value}
      readOnly={isVoiceActive}
      inputMode={isVoiceActive ? 'none' : undefined}
      onChange={(e) => {
        if (isVoiceActive) return;
        onChange(e.target.value);
        onCursorActivity?.(e.currentTarget);
      }}
      onFocus={(e) => onCursorActivity?.(e.currentTarget)}
      onClick={(e) => onCursorActivity?.(e.currentTarget)}
      onKeyUp={(e) => onCursorActivity?.(e.currentTarget)}
      onSelect={(e) => onCursorActivity?.(e.currentTarget)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`overflow-hidden resize-none bg-transparent focus:outline-none ${className}`}
    />
  );
};

export const ExamQuestionsTab: React.FC<Props> = ({
  examsData,
  onChange,
  profile,
}) => {
  const draft = examsData.draft;
  const savedExams = examsData.savedExams || [];

  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);
  const [paperFitWidth, setPaperFitWidth] = useState<boolean>(false);
  const [showLogoMenu, setShowLogoMenu] = useState<boolean>(false);

  // Unified Cursor-Based Voice Dictation State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<'ar-IQ' | 'ar-SA' | 'ar-EG'>('ar-IQ');
  const [activeCursorTarget, setActiveCursorTarget] = useState<VoiceTarget | null>(null);
  const [interimText, setInterimText] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isVoicePanelExpanded, setIsVoicePanelExpanded] = useState<boolean>(false);

  const isSpeechSupported = Boolean(getSpeechRecognitionConstructor());
  const logoInputRef = useRef<HTMLInputElement>(null);

  const shouldListenRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const examsDataRef = useRef<ExamBuilderData>(examsData);
  const committedIndicesRef = useRef<Set<number>>(new Set());

  // Stores the active/last focused input element & exact selection range
  const cursorStateRef = useRef<CursorState | null>(null);
  const fieldElementsRef = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(
    new Map()
  );

  useEffect(() => {
    examsDataRef.current = examsData;
  }, [examsData]);

  const registerFieldRef = useCallback(
    (target: VoiceTarget) => (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      const key = getTargetFieldKey(target);
      if (el) {
        fieldElementsRef.current.set(key, el);
      } else {
        fieldElementsRef.current.delete(key);
      }
    },
    []
  );

  const recordCursorActivity = useCallback(
    (target: VoiceTarget, el: HTMLInputElement | HTMLTextAreaElement) => {
      const len = el.value.length;
      cursorStateRef.current = {
        target,
        element: el,
        start: el.selectionStart ?? len,
        end: el.selectionEnd ?? len,
      };
      setActiveCursorTarget(target);
    },
    []
  );

  const focusFieldAtEnd = useCallback((target: VoiceTarget, atStart = false) => {
    window.requestAnimationFrame(() => {
      const key = getTargetFieldKey(target);
      const el = fieldElementsRef.current.get(key) || null;
      const val = getDraftValueByTarget(examsDataRef.current.draft, target);
      const pos = atStart ? 0 : val.length;
      cursorStateRef.current = {
        target,
        element: el,
        start: pos,
        end: pos,
      };
      setActiveCursorTarget(target);
      // Do not focus/pop virtual keyboard while voice dictation is active
      if (el && !shouldListenRef.current) {
        el.focus();
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          // Ignore selection errors on unsupported input types
        }
      }
    });
  }, []);

  const updateDraft = useCallback(
    (updater: (prev: SavedExamPaper) => SavedExamPaper) => {
      const currentData = examsDataRef.current;
      const nextDraft = {
        ...updater(currentData.draft),
        updatedAt: new Date().toISOString(),
      };
      onChange({
        ...currentData,
        draft: nextDraft,
      });
    },
    [onChange]
  );

  const insertTextAtCursor = useCallback(
    (snippet: string, addSmartSpace = true) => {
      if (!snippet) return;
      const currentDraft = examsDataRef.current.draft;

      // Resolve cursor target (if none selected yet, fall back to first question prompt or note)
      let cursor = cursorStateRef.current;
      if (!cursor) {
        const fallbackTarget: VoiceTarget =
          currentDraft.questions.length > 0
            ? { kind: 'question_prompt', questionId: currentDraft.questions[0].id }
            : { kind: 'note' };
        const fallbackVal = getDraftValueByTarget(currentDraft, fallbackTarget);
        const el =
          fieldElementsRef.current.get(getTargetFieldKey(fallbackTarget)) || null;
        cursor = {
          target: fallbackTarget,
          element: el,
          start: fallbackVal.length,
          end: fallbackVal.length,
        };
        cursorStateRef.current = cursor;
        setActiveCursorTarget(fallbackTarget);
      }

      const { target } = cursor;
      const currentValue = getDraftValueByTarget(currentDraft, target);

      // Read live caret if the target element currently has focus
      const liveEl =
        fieldElementsRef.current.get(getTargetFieldKey(target)) || cursor.element;
      const isElFocused =
        typeof document !== 'undefined' && liveEl && document.activeElement === liveEl;

      const rawStart = isElFocused
        ? liveEl.selectionStart ?? cursor.start
        : cursor.start;
      const rawEnd = isElFocused
        ? liveEl.selectionEnd ?? cursor.end
        : cursor.end;

      const start = Math.max(0, Math.min(rawStart, currentValue.length));
      const end = Math.max(start, Math.min(rawEnd, currentValue.length));

      const before = currentValue.slice(0, start);
      const after = currentValue.slice(end);

      let insertChunk = snippet;
      if (addSmartSpace) {
        const trimmed = snippet.trim();
        const needsLeadingSpace =
          before.length > 0 &&
          !/[\s\n(]$/.test(before) &&
          !/^[،.؟!:)]/.test(trimmed);
        const needsTrailingSpace =
          after.length > 0 &&
          !/^[\s\n،.؟!:)]/.test(after) &&
          !/[\s\n(]$/.test(trimmed);
        insertChunk = `${needsLeadingSpace ? ' ' : ''}${trimmed}${
          needsTrailingSpace ? ' ' : ''
        }`;
      }

      const nextValue = `${before}${insertChunk}${after}`;
      const nextCaretPos = before.length + insertChunk.length;

      cursorStateRef.current = {
        target,
        element: liveEl,
        start: nextCaretPos,
        end: nextCaretPos,
      };

      updateDraft((prev) => applyDraftValueByTarget(prev, target, nextValue));

      if (liveEl) {
        window.requestAnimationFrame(() => {
          if (document.activeElement === liveEl) {
            try {
              liveEl.setSelectionRange(nextCaretPos, nextCaretPos);
            } catch {
              // Ignore selection errors
            }
          }
        });
      }
    },
    [updateDraft]
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
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }
    committedIndicesRef.current.clear();
    setInterimText('');
    setIsListening(false);
    setIsVoicePanelExpanded(false);
  }, []);

  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, [stopRecognition]);

  // Keep mobile virtual keyboard dismissed for the entire duration of voice mode
  useEffect(() => {
    if (!isListening || typeof document === 'undefined') return;
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
    ) {
      active.blur();
    }
  }, [isListening]);

  const startVoiceDictation = useCallback(
    (langOverride?: 'ar-IQ' | 'ar-SA' | 'ar-EG') => {
      const Ctor = getSpeechRecognitionConstructor();
      if (!Ctor) {
        setVoiceError(
          'متصفحك الحالي لا يدعم الإملاء الصوتي المباشر. يُنصح باستخدام متصفح Chrome على الموبايل أو الكمبيوتر.'
        );
        return;
      }

      setVoiceError(null);

      // Set listening flag early so focusFieldAtEnd knows not to trigger soft keyboard
      shouldListenRef.current = true;

      // Dismiss any open mobile virtual keyboard while preserving cursor target
      if (
        typeof document !== 'undefined' &&
        (document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement)
      ) {
        document.activeElement.blur();
      }

      // Ensure we have a valid cursor target ready; if none yet, place cursor at first question prompt
      if (!cursorStateRef.current) {
        const currentDraft = examsDataRef.current.draft;
        const defaultTarget: VoiceTarget =
          currentDraft.questions.length > 0
            ? { kind: 'question_prompt', questionId: currentDraft.questions[0].id }
            : { kind: 'note' };
        focusFieldAtEnd(defaultTarget);
      } else {
        setActiveCursorTarget(cursorStateRef.current.target);
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

      shouldListenRef.current = true;
      committedIndicesRef.current.clear();
      setInterimText('');

      const activeLang = langOverride || speechLang;

      const launchInstance = () => {
        if (!shouldListenRef.current) return;
        const recognition = new Ctor();
        recognition.lang = activeLang;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let latestInterim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result?.[0]?.transcript?.trim() || '';
            if (!transcript) continue;

            if (result.isFinal) {
              if (!committedIndicesRef.current.has(i)) {
                committedIndicesRef.current.add(i);
                insertTextAtCursor(transcript, true);
              }
            } else {
              latestInterim += (latestInterim ? ' ' : '') + transcript;
            }
          }
          setInterimText(latestInterim);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setVoiceError(
              'تم رفض إذن الميكروفون. يرجى السماح بالوصول للميكروفون من إعدادات المتصفح ثم المحاولة مجدداً.'
            );
            stopRecognition();
            return;
          }
          if (event.error === 'audio-capture') {
            setVoiceError('لم يتم العثور على ميكروفون متصل بجهازك.');
            stopRecognition();
            return;
          }
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
          }
        };

        recognition.onend = () => {
          committedIndicesRef.current.clear();
          setInterimText('');
          if (shouldListenRef.current) {
            restartTimerRef.current = window.setTimeout(() => {
              if (shouldListenRef.current) {
                launchInstance();
              }
            }, 250);
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          shouldListenRef.current = false;
        }
      };

      launchInstance();
    },
    [speechLang, insertTextAtCursor, stopRecognition, focusFieldAtEnd]
  );

  const toggleVoiceDictation = () => {
    if (isListening) {
      stopRecognition();
    } else {
      startVoiceDictation();
    }
  };

  const describeActiveCursor = (): string => {
    const target = activeCursorTarget || cursorStateRef.current?.target;
    if (!target) return 'ضع مؤشر الكتابة في أي مكان على الورقة';
    switch (target.kind) {
      case 'header_line':
        return target.side === 'rightLines'
          ? `الترويسة اليمنى (سطر ${target.index + 1})`
          : `الترويسة اليسرى (سطر ${target.index + 1})`;
      case 'student_label':
        return 'بيانات الطالب';
      case 'note':
        return 'الملاحظة العامة (أجب عن...)';
      case 'footer':
        return 'تذييل الورقة';
      case 'question_label':
      case 'question_prompt':
      case 'question_marks': {
        const q = draft.questions.find((item) => item.id === target.questionId);
        const qLabel = q?.label || 'السؤال';
        if (target.kind === 'question_label') return `رمز ${qLabel}`;
        if (target.kind === 'question_marks') return `درجة ${qLabel}`;
        return `${qLabel} — نص السؤال`;
      }
      case 'branch_label':
      case 'branch_text': {
        const q = draft.questions.find((item) => item.id === target.questionId);
        const qLabel = q?.label || 'السؤال';
        const bIdx = q ? q.branches.findIndex((b) => b.id === target.branchId) : -1;
        return `${qLabel} — فرع ${bIdx >= 0 ? bIdx + 1 : ''}`;
      }
    }
  };

  // Header & Logo Helpers
  const updateHeader = (patch: Partial<SavedExamPaper['header']>) => {
    updateDraft((prev) => ({
      ...prev,
      header: { ...prev.header, ...patch },
    }));
  };

  const handleUpdateHeaderLine = (
    side: 'rightLines' | 'leftLines',
    index: number,
    value: string
  ) => {
    updateDraft((prev) => {
      const nextLines = [...(prev.header[side] || [])];
      nextLines[index] = value;
      return {
        ...prev,
        header: { ...prev.header, [side]: nextLines },
      };
    });
  };

  const handleDeleteHeaderLine = (
    side: 'rightLines' | 'leftLines',
    index: number
  ) => {
    updateDraft((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        [side]: (prev.header[side] || []).filter((_, i) => i !== index),
      },
    }));
  };

  const handleAddHeaderLine = (side: 'rightLines' | 'leftLines') => {
    const newIndex = (draft.header[side] || []).length;
    updateDraft((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        [side]: [...(prev.header[side] || []), ''],
      },
    }));
    focusFieldAtEnd({ kind: 'header_line', side, index: newIndex }, true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/png', 0.9);
          updateHeader({ showLogo: true, logoDataUrl: dataUrl });
          setShowLogoMenu(false);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Questions CRUD
  const handleAddQuestion = (focusCursor = false) => {
    const nextIdx = draft.questions.length + 1;
    const labelNum = formatNumber(nextIdx, draft.useArabicDigits);
    const newQId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newQuestion: ExamQuestionItem = {
      id: newQId,
      label: `س${labelNum}`,
      prompt: '',
      marks: '',
      branchStyle: 'arabic_num',
      branchLayout: 'vertical',
      branches: [],
    };
    updateDraft((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
    if (focusCursor) {
      focusFieldAtEnd({ kind: 'question_prompt', questionId: newQId }, true);
    }
  };

  const handleUpdateQuestion = (
    questionId: string,
    patch: Partial<ExamQuestionItem>
  ) => {
    updateDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, ...patch } : q
      ),
    }));
  };

  const handleDeleteQuestion = (questionId: string) => {
    const curTarget = cursorStateRef.current?.target;
    if (curTarget && 'questionId' in curTarget && curTarget.questionId === questionId) {
      cursorStateRef.current = null;
      setActiveCursorTarget(null);
    }
    updateDraft((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }));
  };

  const handleDuplicateQuestion = (question: ExamQuestionItem) => {
    const now = Date.now();
    const copy: ExamQuestionItem = {
      ...question,
      id: `q-${now}-${Math.random().toString(36).slice(2, 6)}`,
      label: `س${formatNumber(draft.questions.length + 1, draft.useArabicDigits)}`,
      branches: question.branches.map((b, idx) => ({
        ...b,
        id: `b-${now}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      })),
    };
    updateDraft((prev) => ({
      ...prev,
      questions: [...prev.questions, copy],
    }));
  };

  const handleMoveQuestion = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= draft.questions.length) return;
    updateDraft((prev) => {
      const next = [...prev.questions];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      return { ...prev, questions: next };
    });
  };

  // Branches CRUD
  const handleAddBranch = (questionId: string, focusCursor = false) => {
    const newBId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    updateDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              branches: [...q.branches, { id: newBId, text: '' }],
            }
          : q
      ),
    }));
    if (focusCursor) {
      focusFieldAtEnd({ kind: 'branch_text', questionId, branchId: newBId }, true);
    }
  };

  const handleUpdateBranch = (
    questionId: string,
    branchId: string,
    patch: Partial<ExamQuestionBranch>
  ) => {
    updateDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              branches: q.branches.map((b) =>
                b.id === branchId ? { ...b, ...patch } : b
              ),
            }
          : q
      ),
    }));
  };

  const handleDeleteBranch = (questionId: string, branchId: string) => {
    const curTarget = cursorStateRef.current?.target;
    if (
      curTarget &&
      (curTarget.kind === 'branch_text' || curTarget.kind === 'branch_label') &&
      curTarget.branchId === branchId
    ) {
      cursorStateRef.current = null;
      setActiveCursorTarget(null);
    }
    updateDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              branches: q.branches.filter((b) => b.id !== branchId),
            }
          : q
      ),
    }));
  };

  const handleMoveBranch = (
    questionId: string,
    branchIndex: number,
    direction: -1 | 1
  ) => {
    updateDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== questionId) return q;
        const targetIdx = branchIndex + direction;
        if (targetIdx < 0 || targetIdx >= q.branches.length) return q;
        const nextBranches = [...q.branches];
        const [moved] = nextBranches.splice(branchIndex, 1);
        nextBranches.splice(targetIdx, 0, moved);
        return { ...q, branches: nextBranches };
      }),
    }));
  };

  // Save / Load / Export / Print
  const showToast = (msg: string) => {
    setSavedToast(msg);
    window.setTimeout(() => setSavedToast(null), 3200);
  };

  const handleSaveExam = () => {
    const inferredTitle =
      draft.title.trim() ||
      draft.header.rightLines
        .find((l) => l.includes('المادة'))
        ?.replace(/^المادة\s*:\s*/, '')
        .trim() ||
      draft.header.leftLines
        .find((l) => l.includes('الامتحان'))
        ?.replace(/^اسم الامتحان\s*:\s*/, '')
        .trim() ||
      'نموذج أسئلة';

    const existing = savedExams.find(
      (item) => item.id === examsData.activeExamId
    );
    const examId = existing?.id || `exam-${Date.now()}`;
    const savedRecord: SavedExamPaper = {
      ...draft,
      id: examId,
      title: inferredTitle,
      updatedAt: new Date().toISOString(),
    };

    const nextSaved = existing
      ? savedExams.map((item) => (item.id === existing.id ? savedRecord : item))
      : [savedRecord, ...savedExams];

    onChange({
      activeExamId: examId,
      draft: savedRecord,
      savedExams: nextSaved,
    });
    showToast(`تم حفظ الورقة: «${inferredTitle}»`);
  };

  const handleCreateNewBlankExam = () => {
    stopRecognition();
    cursorStateRef.current = null;
    setActiveCursorTarget(null);
    const blank = createDefaultExamPaper({
      schoolName: profile.schoolName,
      subject: profile.subject,
      academicYear: profile.academicYear,
      teacherName: profile.teacherName,
      schoolLogo: profile.schoolLogo,
    });
    onChange({
      ...examsData,
      activeExamId: null,
      draft: blank,
    });
    setIsSavedModalOpen(false);
  };

  const handleLoadSampleTemplate = () => {
    stopRecognition();
    cursorStateRef.current = null;
    setActiveCursorTarget(null);
    const sample = createSampleExamPaper({
      schoolLogo: draft.header.logoDataUrl || profile.schoolLogo,
    });
    onChange({
      ...examsData,
      activeExamId: null,
      draft: sample,
    });
    showToast('تم تحميل مثال توضيحي يمكنك تعديله أو الحذف منه بحرية.');
  };

  const handleSelectSavedExam = (item: SavedExamPaper) => {
    stopRecognition();
    cursorStateRef.current = null;
    setActiveCursorTarget(null);
    onChange({
      ...examsData,
      activeExamId: item.id,
      draft: JSON.parse(JSON.stringify(item)) as SavedExamPaper,
    });
    setIsSavedModalOpen(false);
  };

  const handleDeleteSavedExam = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    const nextList = savedExams.filter((item) => item.id !== targetId);
    onChange({
      ...examsData,
      activeExamId:
        examsData.activeExamId === targetId ? null : examsData.activeExamId,
      savedExams: nextList,
    });
  };

  const handlePrintExam = () => {
    document.body.classList.add('printing-personal-schedule');
    const cleanup = () => {
      document.body.classList.remove('printing-personal-schedule');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    triggerPrint();
    window.setTimeout(cleanup, 2500);
  };

  const handleDownloadWord = async () => {
    try {
      setIsExportingWord(true);
      await exportExamPaperToWord(draft);
      showToast('تم تنزيل ملف Microsoft Word (.docx) بنجاح.');
    } catch (err) {
      console.error('Failed to export Word file:', err);
      showToast('تعذر إنشاء ملف Word، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExportingWord(false);
    }
  };

  const h = draft.header;
  const digits = draft.useArabicDigits;
  const paperFontSizeClass =
    draft.fontSize === 'sm'
      ? 'text-[12.5px] leading-relaxed'
      : draft.fontSize === 'lg'
      ? 'text-[16px] leading-loose'
      : 'text-[14px] leading-relaxed';

  const currentVoiceTarget = activeCursorTarget || cursorStateRef.current?.target || null;
  const activeTargetKey = currentVoiceTarget ? getTargetFieldKey(currentVoiceTarget) : null;
  const isFieldVoiceActive = (t: VoiceTarget) =>
    isListening && activeTargetKey === getTargetFieldKey(t);
  const activeQuestionIdForVoice =
    currentVoiceTarget && 'questionId' in currentVoiceTarget
      ? currentVoiceTarget.questionId
      : draft.questions[draft.questions.length - 1]?.id || null;

  return (
    <div className="space-y-2">
      {/* Voice Error Banner (Only shown if mic/speech permission fails) */}
      {voiceError && (
        <div className="rounded-xl border px-3 py-2 bg-rose-50 border-rose-300 text-rose-900 shadow-xs no-print">
          <div className="flex items-start justify-between gap-2 text-xs font-bold">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="p-1 hover:bg-rose-100 rounded-lg cursor-pointer shrink-0"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Compact Single-Strip Action Toolbar (Keeps Paper High on Screen) */}
      <div className="bg-white rounded-2xl border border-[#D5C8B2] p-2 sm:p-2.5 space-y-1.5 no-print">
        {/* Top Row: Title + Horizontal-Scrollable Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <input
              id="exam-paper-title-input"
              type="text"
              value={draft.title}
              readOnly={isListening}
              inputMode={isListening ? 'none' : undefined}
              onChange={(e) => {
                if (isListening) return;
                updateDraft((prev) => ({ ...prev, title: e.target.value }));
              }}
              placeholder="اسم النموذج للحفظ (مثال: أسئلة الشهر الأول)"
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm font-bold bg-[#FAF7EC] border border-[#C2A88F] rounded-xl focus:outline-none focus:border-[#8C6544]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0 lg:flex-wrap lg:overflow-visible shrink-0">
            {/* Single Cursor-Aware Voice Dictation Toggle */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleVoiceDictation}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                  : 'bg-[#FAF3E8] hover:bg-[#EFE8D8] text-[#2F2822] border border-[#BA916C]'
              }`}
              title="تفعيل الكتابة بالصوت عند مؤشر الكتابة الحالي"
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>إيقاف الصوت</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-[#8C6544]" />
                  <span>الكتابة بالصوت</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveExam}
              className="px-2.5 py-1.5 craft-btn-primary rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSavedModalOpen(true)}
              className="px-2.5 py-1.5 bg-[#EFE8D8] hover:bg-[#E5DAC4] text-[#2F2822] border border-[#C2A88F] rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ListChecks className="w-3.5 h-3.5 text-[#8C6544]" />
              <span>
                المحفوظة{savedExams.length > 0 ? ` (${savedExams.length})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCreateNewBlankExam}
              className="px-2.5 py-1.5 bg-white hover:bg-[#FAF6EC] text-[#554A3E] border border-[#D5C8B2] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              title="بدء ورقة بيضاء جديدة"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-[#8C6544]" />
              <span>جديدة</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSampleTemplate}
              className="px-2.5 py-1.5 bg-white hover:bg-[#FAF6EC] text-[#554A3E] border border-[#D5C8B2] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              title="تعبئة مثال توضيحي جاهز للتعديل"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#5692BE]" />
              <span>مثال</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadWord}
              disabled={isExportingWord}
              className="px-2.5 py-1.5 bg-[#2B579A] hover:bg-[#1E447D] text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
              title="تنزيل ورقة الأسئلة كملف Microsoft Word (.docx)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingWord ? 'جاري التجهيز...' : 'Word'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintExam}
              className="px-2.5 py-1.5 bg-[#2F2822] hover:bg-[#3F352D] text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              title="طباعة مباشرة على ورق A4"
            >
              <Printer className="w-3.5 h-3.5 text-[#E8C59B]" />
              <span>طباعة A4</span>
            </button>
          </div>
        </div>

        {/* Second Row: Paper Options & Mobile Fit Toggle (Collapsed while voice bar is open to keep paper high) */}
        {!isListening && (
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#EFE8D8] text-[11px] overflow-x-auto pb-0.5 sm:pb-0">
            <div className="flex items-center gap-1.5 shrink-0">
              {!h.showStudentInfo && (
                <button
                  type="button"
                  onClick={() => updateHeader({ showStudentInfo: true })}
                  className="px-2 py-1 bg-[#FAF7EC] hover:bg-[#EFE8D8] border border-[#D5C8B2] rounded-lg font-bold text-[#2F2822] cursor-pointer whitespace-nowrap"
                >
                  + سطر اسم الطالب
                </button>
              )}
              {!h.showNote && (
                <button
                  type="button"
                  onClick={() => updateHeader({ showNote: true })}
                  className="px-2 py-1 bg-[#FAF7EC] hover:bg-[#EFE8D8] border border-[#D5C8B2] rounded-lg font-bold text-[#2F2822] cursor-pointer whitespace-nowrap"
                >
                  + سطر الملاحظة (أجب عن)
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  updateDraft((prev) => ({
                    ...prev,
                    useArabicDigits: !prev.useArabicDigits,
                  }))
                }
                className="px-2 py-1 bg-[#FAF7EC] hover:bg-[#EFE8D8] border border-[#D5C8B2] rounded-lg font-bold text-[#2F2822] cursor-pointer whitespace-nowrap"
              >
                الأرقام: {digits ? 'عربية (١ ٢ ٣)' : 'إنجليزية (1 2 3)'}
              </button>

              <select
                value={draft.fontSize}
                onChange={(e) =>
                  updateDraft((prev) => ({
                    ...prev,
                    fontSize: e.target.value as 'sm' | 'md' | 'lg',
                  }))
                }
                className="px-2 py-1 bg-[#FAF7EC] border border-[#D5C8B2] rounded-lg font-bold text-[#2F2822] focus:outline-none cursor-pointer"
                aria-label="حجم الخط"
              >
                <option value="sm">خط صغير (A4 مكثف)</option>
                <option value="md">خط متوسط (قياسي)</option>
                <option value="lg">خط كبير</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPaperFitWidth((prev) => !prev)}
                className="px-2 py-1 bg-[#EFE8D8] hover:bg-[#E5DAC4] text-[#2F2822] border border-[#C2A88F] rounded-lg font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                {paperFitWidth ? (
                  <>
                    <Maximize2 className="w-3 h-3 text-[#8C6544]" />
                    <span>حجم A4 (تمرير أفقي)</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3 h-3 text-[#8C6544]" />
                    <span>ملاءمة الشاشة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Feedback */}
      {savedToast && (
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 no-print">
          <Check className="w-4 h-4 shrink-0" />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Hidden File Input for Optional Logo Upload */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleLogoUpload}
        className="hidden"
        id="direct-paper-logo-upload"
      />

      {/* Scrollable White A4 Paper Canvas (Unified Vertical Scroll + Horizontal A4 Scroll on Mobile) */}
      <div className="overflow-x-auto custom-scrollbar bg-[#E5DEC9]/65 border border-[#C2A88F] rounded-2xl p-1.5 sm:p-4 print:overflow-visible print:bg-white print:border-none print:p-0">
        <div
          dir="rtl"
          className={`exam-paper-sheet mx-auto bg-white text-black border border-slate-300 shadow-lg p-4 sm:p-10 print:shadow-none print:border-none print:p-2 ${paperFontSizeClass} ${
            paperFitWidth ? 'w-full min-w-0' : 'w-[794px] min-w-[794px]'
          } min-h-[1040px] print:min-h-0 flex flex-col`}
          style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
        >
          {/* 1. Editable Top Header ("الكليشة") */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 pb-3 border-b-2 border-black">
            {/* Right Header Lines (Editable + Individually Deletable) */}
            <div className="space-y-1 text-right">
              {h.rightLines.map((line, idx) => {
                const target: VoiceTarget = {
                  kind: 'header_line',
                  side: 'rightLines',
                  index: idx,
                };
                return (
                  <div
                    key={`rl-${idx}`}
                    className={`group flex items-center gap-1 ${
                      line.trim() === '' ? 'print:hidden' : ''
                    }`}
                  >
                    <input
                      ref={registerFieldRef(target)}
                      type="text"
                      value={line}
                      readOnly={isListening}
                      inputMode={isListening ? 'none' : undefined}
                      onChange={(e) => {
                        if (isListening) return;
                        handleUpdateHeaderLine('rightLines', idx, e.target.value);
                        recordCursorActivity(target, e.currentTarget);
                      }}
                      onFocus={(e) => recordCursorActivity(target, e.currentTarget)}
                      onClick={(e) => recordCursorActivity(target, e.currentTarget)}
                      onKeyUp={(e) => recordCursorActivity(target, e.currentTarget)}
                      onSelect={(e) => recordCursorActivity(target, e.currentTarget)}
                      placeholder="اكتب هنا (مثال: المدرسة / الصف / المادة)..."
                      className={`w-full bg-transparent font-bold text-black placeholder:text-slate-300 placeholder:font-normal focus:bg-amber-50/60 focus:outline-none rounded px-1 py-0.5 text-[13px] sm:text-[14px] ${
                        isFieldVoiceActive(target) ? 'ring-1 ring-[#BA916C] bg-amber-50/80' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteHeaderLine('rightLines', idx)}
                      className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-0.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer no-print shrink-0"
                      title="حذف هذا السطر من الكليشة"
                      aria-label="حذف السطر"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => handleAddHeaderLine('rightLines')}
                className="text-[11px] font-bold text-slate-400 hover:text-[#8C6544] px-1 cursor-pointer no-print"
              >
                + إضافة سطر
              </button>
            </div>

            {/* Center Optional Logo Slot */}
            <div className="relative flex flex-col items-center justify-center min-w-[82px] px-1">
              {h.showLogo && h.logoDataUrl ? (
                <div className="group relative flex flex-col items-center">
                  <img
                    src={h.logoDataUrl}
                    alt="شعار"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full"
                  />
                  <div className="flex items-center gap-1 mt-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity no-print">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                    >
                      تغيير
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateHeader({ showLogo: false, logoDataUrl: '' })
                      }
                      className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 rounded cursor-pointer"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative no-print">
                  <button
                    type="button"
                    onClick={() => setShowLogoMenu((prev) => !prev)}
                    className="w-16 h-16 rounded-full border border-dashed border-slate-300 hover:border-[#BA916C] text-slate-400 hover:text-[#8C6544] flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold cursor-pointer transition-colors"
                    title="إضافة شعار اختياري"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>شعار</span>
                  </button>

                  {showLogoMenu && (
                    <div className="absolute top-18 left-1/2 -translate-x-1/2 z-20 bg-white border border-[#C2A88F] rounded-xl shadow-xl p-2 w-44 space-y-1 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLogoMenu(false);
                          logoInputRef.current?.click();
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-bold text-[#2F2822] hover:bg-[#FAF6EC] rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#8C6544]" />
                        <span>رفع صورة شعار</span>
                      </button>
                      {profile.schoolLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            updateHeader({
                              showLogo: true,
                              logoDataUrl: profile.schoolLogo,
                            });
                            setShowLogoMenu(false);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs font-bold text-[#2F2822] hover:bg-[#FAF6EC] rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-[#5692BE]" />
                          <span>استخدام شعار المدرسة</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowLogoMenu(false)}
                        className="w-full px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 text-center cursor-pointer"
                      >
                        إغلاق
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Left Header Lines (Editable + Individually Deletable) */}
            <div className="space-y-1 text-left">
              {h.leftLines.map((line, idx) => {
                const target: VoiceTarget = {
                  kind: 'header_line',
                  side: 'leftLines',
                  index: idx,
                };
                return (
                  <div
                    key={`ll-${idx}`}
                    className={`group flex items-center gap-1 ${
                      line.trim() === '' ? 'print:hidden' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDeleteHeaderLine('leftLines', idx)}
                      className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-0.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer no-print shrink-0"
                      title="حذف هذا السطر من الكليشة"
                      aria-label="حذف السطر"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={registerFieldRef(target)}
                      type="text"
                      value={line}
                      readOnly={isListening}
                      inputMode={isListening ? 'none' : undefined}
                      onChange={(e) => {
                        if (isListening) return;
                        handleUpdateHeaderLine('leftLines', idx, e.target.value);
                        recordCursorActivity(target, e.currentTarget);
                      }}
                      onFocus={(e) => recordCursorActivity(target, e.currentTarget)}
                      onClick={(e) => recordCursorActivity(target, e.currentTarget)}
                      onKeyUp={(e) => recordCursorActivity(target, e.currentTarget)}
                      onSelect={(e) => recordCursorActivity(target, e.currentTarget)}
                      placeholder="اكتب هنا (مثال: اسم الامتحان / الساعات)..."
                      className={`w-full bg-transparent text-left font-bold text-black placeholder:text-slate-300 placeholder:font-normal focus:bg-amber-50/60 focus:outline-none rounded px-1 py-0.5 text-[13px] sm:text-[14px] ${
                        isFieldVoiceActive(target) ? 'ring-1 ring-[#BA916C] bg-amber-50/80' : ''
                      }`}
                    />
                  </div>
                );
              })}
              <div className="text-left">
                <button
                  type="button"
                  onClick={() => handleAddHeaderLine('leftLines')}
                  className="text-[11px] font-bold text-slate-400 hover:text-[#8C6544] px-1 cursor-pointer no-print"
                >
                  + إضافة سطر
                </button>
              </div>
            </div>
          </div>

          {/* 2. Optional Student Info Row */}
          {h.showStudentInfo && (
            <div className="group grid grid-cols-2 gap-4 py-2 border-b border-slate-400 text-[13px] font-bold relative">
              <div className="flex items-baseline gap-2">
                <input
                  ref={registerFieldRef({
                    kind: 'student_label',
                    field: 'studentNameLabel',
                  })}
                  type="text"
                  value={h.studentNameLabel}
                  readOnly={isListening}
                  inputMode={isListening ? 'none' : undefined}
                  onChange={(e) => {
                    if (isListening) return;
                    updateHeader({ studentNameLabel: e.target.value });
                    recordCursorActivity(
                      { kind: 'student_label', field: 'studentNameLabel' },
                      e.currentTarget
                    );
                  }}
                  onFocus={(e) =>
                    recordCursorActivity(
                      { kind: 'student_label', field: 'studentNameLabel' },
                      e.currentTarget
                    )
                  }
                  onClick={(e) =>
                    recordCursorActivity(
                      { kind: 'student_label', field: 'studentNameLabel' },
                      e.currentTarget
                    )
                  }
                  onSelect={(e) =>
                    recordCursorActivity(
                      { kind: 'student_label', field: 'studentNameLabel' },
                      e.currentTarget
                    )
                  }
                  placeholder="اسم الطالب :"
                  className={`w-28 sm:w-32 bg-transparent font-bold text-black placeholder:text-slate-300 focus:bg-amber-50/60 focus:outline-none rounded px-1 shrink-0 ${
                    isFieldVoiceActive({ kind: 'student_label', field: 'studentNameLabel' })
                      ? 'ring-1 ring-[#BA916C] bg-amber-50/80'
                      : ''
                  }`}
                />
                <span className="flex-1 border-b border-dotted border-slate-500 h-4" />
              </div>
              <div className="flex items-baseline gap-2">
                <input
                  ref={registerFieldRef({
                    kind: 'student_label',
                    field: 'studentNumberLabel',
                  })}
                  type="text"
                  value={h.studentNumberLabel}
                  readOnly={isListening}
                  inputMode={isListening ? 'none' : undefined}
                  onChange={(e) => {
                    if (isListening) return;
                    updateHeader({ studentNumberLabel: e.target.value });
                    recordCursorActivity(
                      { kind: 'student_label', field: 'studentNumberLabel' },
                      e.currentTarget
                    );
                  }}
                  onFocus={(e) =>
                    recordCursorActivity(
                      { kind: 'student_label', field: 'studentNumberLabel' },
                      e.currentTarget
                    )
                  }
                  onClick={(e) =>
                    recordCursorActivity(
                      { kind: 'student_label', field: 'studentNumberLabel' },
                      e.currentTarget
                    )
                  }
                  onSelect={(e) =>
                    recordCursorActivity(
                      { kind: 'student_label', field: 'studentNumberLabel' },
                      e.currentTarget
                    )
                  }
                  placeholder="الشعبة / الرقم :"
                  className={`w-28 sm:w-32 bg-transparent font-bold text-black placeholder:text-slate-300 focus:bg-amber-50/60 focus:outline-none rounded px-1 shrink-0 ${
                    isFieldVoiceActive({ kind: 'student_label', field: 'studentNumberLabel' })
                      ? 'ring-1 ring-[#BA916C] bg-amber-50/80'
                      : ''
                  }`}
                />
                <span className="flex-1 border-b border-dotted border-slate-500 h-4" />
                <button
                  type="button"
                  onClick={() => updateHeader({ showStudentInfo: false })}
                  className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 p-0.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer no-print shrink-0"
                  title="إخفاء سطر اسم الطالب"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 3. Faint General Exam Note ("أجب عن ...") */}
          {h.showNote && (
            <div
              className={`group flex items-center gap-1.5 py-2.5 ${
                h.noteText.trim() === '' ? 'print:hidden' : ''
              }`}
            >
              <AutoResizeTextarea
                inputRef={registerFieldRef({ kind: 'note' })}
                value={h.noteText}
                isVoiceActive={isListening}
                onChange={(val) => updateHeader({ noteText: val })}
                onCursorActivity={(el) => recordCursorActivity({ kind: 'note' }, el)}
                placeholder="ملاحظة : أجب عن ........ أسئلة فقط ، ولكل سؤال ( .... ) درجة ."
                ariaLabel="الملاحظة العامة للامتحان"
                className={`flex-1 font-black text-black placeholder:text-slate-300 placeholder:font-semibold focus:bg-amber-50/50 rounded px-1 py-0.5 ${
                  isFieldVoiceActive({ kind: 'note' })
                    ? 'ring-1 ring-[#BA916C] bg-amber-50/80'
                    : ''
                }`}
              />
              <button
                type="button"
                onClick={() => updateHeader({ showNote: false })}
                className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer no-print shrink-0"
                title="حذف سطر الملاحظة"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 4. Questions & Branches Directly on the White Paper */}
          <div className="space-y-4 pt-1 flex-1">
            {draft.questions.map((q, qIdx) => {
              const isPromptEmpty = q.prompt.trim() === '';
              const nonEmptyBranches = q.branches.filter(
                (b) =>
                  b.text.trim() !== '' ||
                  (b.customLabel && b.customLabel.trim() !== '')
              );
              const isWholeQuestionEmpty =
                isPromptEmpty && nonEmptyBranches.length === 0;

              const qLabelTarget: VoiceTarget = {
                kind: 'question_label',
                questionId: q.id,
              };
              const qPromptTarget: VoiceTarget = {
                kind: 'question_prompt',
                questionId: q.id,
              };
              const qMarksTarget: VoiceTarget = {
                kind: 'question_marks',
                questionId: q.id,
              };

              return (
                <div
                  key={q.id}
                  className={`group/q rounded-xl transition-colors hover:bg-slate-50/60 focus-within:bg-slate-50/60 p-1.5 -mx-1.5 print:p-0 print:mx-0 print:bg-transparent break-inside-avoid ${
                    isWholeQuestionEmpty ? 'print:hidden' : ''
                  }`}
                >
                  {/* Main Question Line */}
                  <div className="flex items-start gap-1.5">
                    {/* Editable Question Label (س١) */}
                    <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                      <input
                        ref={registerFieldRef(qLabelTarget)}
                        type="text"
                        value={q.label}
                        readOnly={isListening}
                        inputMode={isListening ? 'none' : undefined}
                        onChange={(e) => {
                          if (isListening) return;
                          handleUpdateQuestion(q.id, { label: e.target.value });
                          recordCursorActivity(qLabelTarget, e.currentTarget);
                        }}
                        onFocus={(e) =>
                          recordCursorActivity(qLabelTarget, e.currentTarget)
                        }
                        onClick={(e) =>
                          recordCursorActivity(qLabelTarget, e.currentTarget)
                        }
                        onSelect={(e) =>
                          recordCursorActivity(qLabelTarget, e.currentTarget)
                        }
                        placeholder={`س${formatNumber(qIdx + 1, digits)}`}
                        aria-label="رمز السؤال"
                        className={`w-11 sm:w-12 bg-transparent font-black text-black placeholder:text-slate-300 focus:bg-amber-50/70 focus:outline-none rounded px-1 text-center ${
                          isFieldVoiceActive(qLabelTarget)
                            ? 'ring-1 ring-[#BA916C] bg-amber-50/80'
                            : ''
                        }`}
                      />
                      <span className="font-black text-black">:</span>
                    </div>

                    {/* Direct Question Prompt with Faint Placeholder */}
                    <AutoResizeTextarea
                      inputRef={registerFieldRef(qPromptTarget)}
                      value={q.prompt}
                      isVoiceActive={isListening}
                      onChange={(val) =>
                        handleUpdateQuestion(q.id, { prompt: val })
                      }
                      onCursorActivity={(el) =>
                        recordCursorActivity(qPromptTarget, el)
                      }
                      placeholder={
                        qIdx === 0
                          ? 'اكتب السؤال الأول هنا... (مثال: عرّف ما يأتي، أو أجب عن فرعين — ضع المؤشر هنا وفعّل الصوت للكتابة بالصوت)'
                          : 'اكتب نص السؤال هنا...'
                      }
                      ariaLabel={`نص ${q.label || `السؤال ${qIdx + 1}`}`}
                      className={`flex-1 font-bold text-black placeholder:text-slate-300 placeholder:font-normal focus:bg-amber-50/40 rounded px-1 py-0.5 ${
                        isFieldVoiceActive(qPromptTarget)
                          ? 'ring-1 ring-[#BA916C] bg-amber-50/80'
                          : ''
                      }`}
                    />

                    {/* Optional Marks Input (Hidden in print if empty) */}
                    <input
                      ref={registerFieldRef(qMarksTarget)}
                      type="text"
                      value={q.marks || ''}
                      readOnly={isListening}
                      inputMode={isListening ? 'none' : undefined}
                      onChange={(e) => {
                        if (isListening) return;
                        handleUpdateQuestion(q.id, { marks: e.target.value });
                        recordCursorActivity(qMarksTarget, e.currentTarget);
                      }}
                      onFocus={(e) =>
                        recordCursorActivity(qMarksTarget, e.currentTarget)
                      }
                      onClick={(e) =>
                        recordCursorActivity(qMarksTarget, e.currentTarget)
                      }
                      onSelect={(e) =>
                        recordCursorActivity(qMarksTarget, e.currentTarget)
                      }
                      placeholder="الدرجة"
                      aria-label="درجة السؤال"
                      className={`w-20 bg-transparent text-left text-[12px] font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-normal focus:bg-amber-50/60 focus:outline-none rounded px-1 py-0.5 shrink-0 ${
                        !q.marks || q.marks.trim() === '' ? 'print:hidden' : ''
                      } ${
                        isFieldVoiceActive(qMarksTarget)
                          ? 'ring-1 ring-[#BA916C] bg-amber-50/80'
                          : ''
                      }`}
                    />
                  </div>

                  {/* Branches on the Paper */}
                  {q.branches.length > 0 && (
                    <div
                      className={`pr-7 sm:pr-9 mt-1.5 ${
                        q.branchLayout === 'two_col'
                          ? 'grid grid-cols-2 gap-x-6 gap-y-1.5'
                          : q.branchLayout === 'inline'
                          ? 'flex flex-wrap items-baseline gap-x-2 gap-y-1'
                          : 'space-y-1'
                      }`}
                    >
                      {q.branches.map((branch, bIdx) => {
                        const autoPrefix = getBranchPrefix(
                          { ...branch, customLabel: undefined },
                          bIdx,
                          q.branchStyle,
                          digits
                        );
                        const isBranchEmpty =
                          branch.text.trim() === '' &&
                          (!branch.customLabel || branch.customLabel.trim() === '');

                        const bLabelTarget: VoiceTarget = {
                          kind: 'branch_label',
                          questionId: q.id,
                          branchId: branch.id,
                        };
                        const bTextTarget: VoiceTarget = {
                          kind: 'branch_text',
                          questionId: q.id,
                          branchId: branch.id,
                        };

                        return (
                          <div
                            key={branch.id}
                            className={`group/b flex items-start gap-1 ${
                              isBranchEmpty ? 'print:hidden' : ''
                            } ${
                              q.branchLayout === 'inline'
                                ? 'min-w-[140px] bg-slate-50/70 print:bg-transparent rounded px-1'
                                : ''
                            }`}
                          >
                            {/* Editable/Auto Branch Prefix */}
                            {(q.branchStyle !== 'none' ||
                              (branch.customLabel && branch.customLabel.trim() !== '')) && (
                              <input
                                ref={registerFieldRef(bLabelTarget)}
                                type="text"
                                value={branch.customLabel ?? ''}
                                readOnly={isListening}
                                inputMode={isListening ? 'none' : undefined}
                                onChange={(e) => {
                                  if (isListening) return;
                                  handleUpdateBranch(q.id, branch.id, {
                                    customLabel: e.target.value,
                                  });
                                  recordCursorActivity(bLabelTarget, e.currentTarget);
                                }}
                                onFocus={(e) =>
                                  recordCursorActivity(bLabelTarget, e.currentTarget)
                                }
                                onClick={(e) =>
                                  recordCursorActivity(bLabelTarget, e.currentTarget)
                                }
                                onSelect={(e) =>
                                  recordCursorActivity(bLabelTarget, e.currentTarget)
                                }
                                placeholder={autoPrefix}
                                title="رمز الفرع (اتركه فارغاً للترقيم التلقائي)"
                                className={`w-8 bg-transparent font-bold text-black placeholder:text-black focus:bg-amber-50/70 focus:outline-none rounded px-0.5 text-center shrink-0 pt-0.5 ${
                                  isFieldVoiceActive(bLabelTarget)
                                    ? 'ring-1 ring-[#BA916C] bg-amber-50/80'
                                    : ''
                                }`}
                              />
                            )}

                            {/* Branch Direct Textarea with Faint Placeholder */}
                            <AutoResizeTextarea
                              inputRef={registerFieldRef(bTextTarget)}
                              value={branch.text}
                              isVoiceActive={isListening}
                              onChange={(val) =>
                                handleUpdateBranch(q.id, branch.id, { text: val })
                              }
                              onCursorActivity={(el) =>
                                recordCursorActivity(bTextTarget, el)
                              }
                              placeholder="اكتب الفرع هنا..."
                              ariaLabel={`فرع ${bIdx + 1}`}
                              className={`flex-1 font-medium text-black placeholder:text-slate-300 placeholder:font-normal focus:bg-amber-50/40 rounded px-1 py-0.5 min-w-[100px] ${
                                isFieldVoiceActive(bTextTarget)
                                  ? 'ring-1 ring-[#BA916C] bg-amber-50/80'
                                  : ''
                              }`}
                            />

                            {/* Branch Controls (Screen only) */}
                            <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover/b:opacity-100 sm:focus-within:opacity-100 transition-opacity no-print shrink-0 pt-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateBranch(q.id, branch.id, {
                                    text: branch.text
                                      ? `${branch.text} ............ `
                                      : '............ ',
                                  })
                                }
                                className="px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:text-[#2F2822] hover:bg-slate-200/70 rounded cursor-pointer"
                                title="إدراج فراغ"
                              >
                                فراغ
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateBranch(q.id, branch.id, {
                                    text: branch.text
                                      ? `${branch.text} (   ،   ،   ) `
                                      : '(   ،   ،   )',
                                  })
                                }
                                className="px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:text-[#2F2822] hover:bg-slate-200/70 rounded cursor-pointer"
                                title="إدراج أقواس خيارات"
                              >
                                (،)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveBranch(q.id, bIdx, -1)}
                                disabled={bIdx === 0}
                                className="p-0.5 text-slate-400 hover:text-[#2F2822] disabled:opacity-25 cursor-pointer"
                                title="لأعلى"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveBranch(q.id, bIdx, 1)}
                                disabled={bIdx === q.branches.length - 1}
                                className="p-0.5 text-slate-400 hover:text-[#2F2822] disabled:opacity-25 cursor-pointer"
                                title="لأسفل"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBranch(q.id, branch.id)}
                                className="p-0.5 text-rose-400 hover:text-rose-600 cursor-pointer"
                                title="حذف الفرع"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Subtle Per-Question Action Bar on Paper (Hidden in Print) */}
                  <div className="pr-7 sm:pr-9 mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] no-print">
                    <button
                      type="button"
                      onClick={() => handleAddBranch(q.id, true)}
                      className="px-2 py-0.5 rounded-md border border-dashed border-slate-300 hover:border-[#BA916C] text-slate-400 hover:text-[#8C6544] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>
                        إضافة فرع ({q.branches.length > 0 ? 'توضيح فرع' : 'أ / ب أو ١ / ٢'})
                      </span>
                    </button>

                    {q.branches.length > 0 && (
                      <>
                        <select
                          value={q.branchStyle}
                          onChange={(e) =>
                            handleUpdateQuestion(q.id, {
                              branchStyle: e.target.value as ExamBranchStyle,
                            })
                          }
                          className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 font-bold focus:outline-none cursor-pointer"
                          aria-label="نمط ترقيم الفروع"
                        >
                          {BRANCH_STYLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={q.branchLayout}
                          onChange={(e) =>
                            handleUpdateQuestion(q.id, {
                              branchLayout: e.target.value as ExamBranchLayout,
                            })
                          }
                          className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 font-bold focus:outline-none cursor-pointer"
                          aria-label="تنسيق الفروع"
                        >
                          {BRANCH_LAYOUT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    <div className="flex items-center gap-0.5 mr-auto opacity-75 sm:opacity-0 sm:group-hover/q:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(qIdx, -1)}
                        disabled={qIdx === 0}
                        className="p-1 text-slate-400 hover:text-[#2F2822] disabled:opacity-25 rounded cursor-pointer"
                        title="تحريك السؤال للأعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(qIdx, 1)}
                        disabled={qIdx === draft.questions.length - 1}
                        className="p-1 text-slate-400 hover:text-[#2F2822] disabled:opacity-25 rounded cursor-pointer"
                        title="تحريك السؤال للأسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(q)}
                        className="p-1 text-slate-400 hover:text-[#2F2822] rounded cursor-pointer"
                        title="تكرار السؤال"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1 text-rose-400 hover:text-rose-600 rounded cursor-pointer"
                        title="حذف السؤال"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Question Directly on Paper (Hidden in Print) */}
            <div className="pt-2 no-print">
              <button
                type="button"
                onClick={() => handleAddQuestion(true)}
                className="px-3.5 py-2 rounded-xl border border-dashed border-slate-300 hover:border-[#BA916C] text-slate-400 hover:text-[#8C6544] text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>
                  إضافة سؤال جديد (س{formatNumber(draft.questions.length + 1, digits)})
                </span>
              </button>
            </div>
          </div>

          {/* 5. Faint Optional Footer at Bottom of A4 Sheet */}
          <div
            className={`mt-8 pt-3 border-t border-slate-200 text-center ${
              !h.footerText || h.footerText.trim() === '' ? 'print:hidden' : ''
            }`}
          >
            <input
              ref={registerFieldRef({ kind: 'footer' })}
              type="text"
              value={h.footerText || ''}
              readOnly={isListening}
              inputMode={isListening ? 'none' : undefined}
              onChange={(e) => {
                if (isListening) return;
                updateHeader({ footerText: e.target.value });
                recordCursorActivity({ kind: 'footer' }, e.currentTarget);
              }}
              onFocus={(e) => recordCursorActivity({ kind: 'footer' }, e.currentTarget)}
              onClick={(e) => recordCursorActivity({ kind: 'footer' }, e.currentTarget)}
              onSelect={(e) => recordCursorActivity({ kind: 'footer' }, e.currentTarget)}
              placeholder="تذييل الورقة (اختياري) — مثال: مع تمنياتنا لكم بالنجاح والتوفيق"
              className={`w-full bg-transparent text-center text-[12.5px] font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-normal focus:bg-amber-50/50 focus:outline-none rounded px-2 py-1 ${
                isFieldVoiceActive({ kind: 'footer' })
                  ? 'ring-1 ring-[#BA916C] bg-amber-50/80'
                  : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Saved Exams Popup Modal */}
      {isSavedModalOpen && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-in fade-in duration-150 no-print"
          dir="rtl"
          onClick={() => setIsSavedModalOpen(false)}
        >
          <div
            className="bg-[#FAF7EC] rounded-2xl border border-[#AA8362] shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#2F2822] text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <ListChecks className="w-5 h-5 text-[#E8C59B] shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-black truncate">
                    نماذج الأسئلة المحفوظة
                  </h4>
                  <p className="text-[11px] text-[#D8CEBD] truncate">
                    اختر أي ورقة لتحريرها أو طباعتها أو تنزيلها بصيغة Word
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSavedModalOpen(false)}
                className="p-1.5 text-[#D8CEBD] hover:text-white hover:bg-white/10 rounded-lg cursor-pointer shrink-0"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 bg-white">
              {savedExams.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm font-black text-[#2F2822]">
                    لا توجد نماذج أسئلة محفوظة بعد
                  </p>
                  <p className="text-xs text-[#6B5E51]">
                    اكتب على الورقة البيضاء ثم اضغط «حفظ» للرجوع إليها في أي وقت.
                  </p>
                </div>
              ) : (
                savedExams.map((item) => {
                  const isActive = item.id === examsData.activeExamId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSavedExam(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectSavedExam(item);
                        }
                      }}
                      className={`w-full text-right p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-[#F5EBDC] border-[#BA916C] shadow-2xs'
                          : 'bg-[#FAF7EC] border-[#E5DAC7] hover:border-[#BA916C] hover:bg-[#F8F1E5]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-[#2F2822] truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#6B5E51] mt-0.5 tabular-nums flex items-center gap-1.5">
                          <span>{item.questions.length} سؤال</span>
                          {isActive && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-bold text-[#8C6544]">
                                معروض حالياً
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedExam(e, item.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="حذف النموذج"
                        aria-label="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-3 bg-[#F8F4EA] border-t border-[#D5C8B2] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCreateNewBlankExam}
                className="px-3.5 py-2 bg-white hover:bg-[#EFE8D8] text-[#2F2822] border border-[#C2A88F] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FilePlus2 className="w-3.5 h-3.5 text-[#8C6544]" />
                <span>ورقة بيضاء جديدة</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSavedModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#554A3E] hover:bg-[#EFE8D8] rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Right Floating Voice Helper: Starts as a Compact Rectangle, Expands to Full Controls */}
      {isListening && !isVoicePanelExpanded && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setIsVoicePanelExpanded(true)}
          className="fixed bottom-5 right-3.5 sm:bottom-7 sm:right-7 z-[66] no-print flex items-center gap-1.5 px-2.5 py-2.5 rounded-2xl bg-[#2F2822] hover:bg-[#3F352D] text-[#FAF6EC] border-2 border-[#BA916C] shadow-2xl transition-all duration-150 active:scale-95 cursor-pointer"
          title="إظهار أدوات الكتابة بالصوت والرموز"
          aria-label="إظهار أدوات الصوت والرموز"
        >
          <span className="px-1.5 py-0.5 rounded bg-white/15 text-[11px] font-black leading-none">
            ؟
          </span>
          <span className="px-1.5 py-0.5 rounded bg-white/15 text-[11px] font-black leading-none">
            ،
          </span>
          <span className="px-1.5 py-0.5 rounded bg-white/15 text-[11px] font-black leading-none">
            .
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#BA916C]/40 text-[#FAF6EC] text-[10px] font-black leading-none whitespace-nowrap">
            فراغ +
          </span>
          <ChevronUp className="w-4 h-4 text-[#E8C59B] shrink-0" />
        </button>
      )}

      {isListening && isVoicePanelExpanded && (
        <div
          dir="rtl"
          className="fixed bottom-4 right-3 left-3 sm:bottom-6 sm:right-7 sm:left-auto sm:w-[460px] z-[75] no-print rounded-2xl bg-[#2F2822] text-[#FAF6EC] border-2 border-[#BA916C] shadow-2xl p-3 space-y-2.5 animate-in slide-in-from-bottom-2 duration-150"
        >
          {/* Header Row: Cursor Info + Collapse Button */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-rose-600/25 border border-rose-400/50 flex items-center justify-center shrink-0 mt-0.5">
                <Mic className="w-4 h-4 text-rose-300" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-black text-white leading-snug">
                  الكتابة بالصوت عند المؤشر · {describeActiveCursor()}
                </div>
                <p className="text-[11px] text-[#D8CEBD] leading-snug">
                  {interimText ? (
                    <span className="text-[#E8C59B] font-bold">«{interimText}»</span>
                  ) : (
                    'تحدث الآن ليتم الإدراج في موضع المؤشر — أو انقر في أي حقل لنقل المؤشر'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsVoicePanelExpanded(false)}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#E8C59B] text-[11px] font-black flex items-center gap-1 cursor-pointer shrink-0"
              title="تصغير إلى مستطيل صغير"
              aria-label="تصغير"
            >
              <span>تصغير</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Language & Stop Row */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/15">
            <select
              value={speechLang}
              onMouseDown={(e) => e.preventDefault()}
              onChange={(e) => {
                const nextLang = e.target.value as 'ar-IQ' | 'ar-SA' | 'ar-EG';
                setSpeechLang(nextLang);
                startVoiceDictation(nextLang);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs font-bold text-white focus:outline-none cursor-pointer"
              aria-label="لهجة الإملاء الصوتي"
            >
              <option value="ar-IQ" className="text-slate-900">
                العراقية (ar-IQ)
              </option>
              <option value="ar-SA" className="text-slate-900">
                الفصحى (ar-SA)
              </option>
              <option value="ar-EG" className="text-slate-900">
                المصرية (ar-EG)
              </option>
            </select>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={stopRecognition}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <MicOff className="w-3.5 h-3.5" />
              <span>إيقاف</span>
            </button>
          </div>

          {/* Symbols & Voice Structure Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/15">
            {[
              { label: '؟', val: ' ؟ ' },
              { label: '،', val: ' ، ' },
              { label: '.', val: ' . ' },
              { label: 'فراغ (....)', val: ' ............ ' },
              { label: 'أقواس ( ، )', val: ' (   ،   ،   ) ' },
              { label: 'سطر جديد', val: '\n' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertTextAtCursor(chip.val, false)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                {chip.label}
              </button>
            ))}

            {activeQuestionIdForVoice && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAddBranch(activeQuestionIdForVoice, true)}
                className="px-2.5 py-1 bg-[#BA916C] hover:bg-[#A67E56] text-white rounded-lg text-xs font-black cursor-pointer whitespace-nowrap"
              >
                + فرع جديد صوتياً
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAddQuestion(true)}
              className="px-2.5 py-1 bg-[#4E7A68] hover:bg-[#3B6554] text-white rounded-lg text-xs font-black cursor-pointer whitespace-nowrap"
            >
              + سؤال جديد صوتياً
            </button>
          </div>
        </div>
      )}

      {/* Prominent Floating Voice Dictation Button (Always Visible While Writing/Scrolling) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleVoiceDictation}
        className={`fixed bottom-5 left-3.5 sm:bottom-7 sm:left-7 z-[65] no-print flex items-center gap-2 px-3.5 py-3 sm:px-4 rounded-2xl shadow-2xl border-2 transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BA916C] ${
          isListening
            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-300'
            : 'bg-[#2F2822] hover:bg-[#3F352D] text-[#FAF6EC] border-[#BA916C]'
        }`}
        title={
          isListening
            ? 'إيقاف الكتابة بالصوت'
            : isSpeechSupported
            ? 'الكتابة بالصوت عند مؤشر الكتابة'
            : 'الكتابة بالصوت (يتطلب متصفح Chrome)'
        }
        aria-label={isListening ? 'إيقاف الكتابة بالصوت' : 'الكتابة بالصوت'}
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
            <span className="text-xs font-black whitespace-nowrap">
              جاري السماع · إيقاف
            </span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8C59B] shrink-0" />
            <span className="text-xs font-black whitespace-nowrap">
              الكتابة بالصوت
            </span>
          </>
        )}
      </button>
    </div>
  );
};
