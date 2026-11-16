import {
  getAuthHeaders,
  getCurrentUser,
  getTrialExtractionsCount,
  incrementTrialExtractionsCount,
} from '../../utils/auth';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Check,
  Camera,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  FileText,
  UserCheck,
  Scissors,
  Crop,
  ClipboardList,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { CustomColumn, StudentRow } from '../../types';
import { SmartCropModal } from './SmartCropModal';
import {
  isWrittenScoreColumn,
  isStandardSystemColumn,
  findMatchingExistingColumn,
  areColumnsSemanticallyEquivalent,
} from '../../utils/gradeCalculations';
import { extractStudentsDirectly } from '../../utils/directGeminiExtract';
import {
  cleanSingleSpaces,
  canonicalizeArabic,
  findSuspectedStudentMatch,
  SuspectedMatchResult,
} from '../../utils/arabicNameMatcher';
import {
  resolveColumnSemantics,
  isCoreTableField,
  isStudentNameField,
  isSectionField,
  isScoreOrGradeField,
  SemanticMatchResult,
} from '../../utils/columnSemanticMatcher';
import { generateSampleSheetImage } from '../../utils/sampleSheetGenerator';
import { normalizeGradeLevel, normalizeSection } from '../../utils/gradeAndSectionMatcher';

export interface ColumnMappingDisplay {
  originalDocumentLabel: string;
  mappedTarget: string;
  isNewColumn: boolean;
  explanation: string;
}

interface AvailableColumnInfo {
  id: string;
  name: string;
  type: 'written' | 'custom';
  maxScore?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    students: Partial<StudentRow>[],
    options?: {
      updateExisting?: boolean;
      newCustomColumns?: Array<{ name: string; maxScore?: number }>;
    }
  ) => void;
  defaultGrade?: string;
  defaultSection?: string;
  customColumns?: CustomColumn[];
  writtenMaxScore?: number;
  existingStudents?: StudentRow[];
  previousModelsStudents?: Array<{ id: string; name: string; modelName?: string }>;
  allGradeOptions?: string[];
}

interface ImageUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

interface ExtractedStudentItem {
  id: string;
  name: string;
  gradeLevel: string;
  section: string;
  writtenRawScore: number | null;
  scores: Record<string, number | null>;
  detectedScores?: Array<{ columnName: string; type: string; score: number | null }>;
  isAbsent?: boolean;
  notes?: string;
  isExisting?: boolean;
  selected: boolean;
  suspectedMatch?: SuspectedMatchResult | null;
  confirmedPreviousName?: boolean;
}

interface DetectedColumn {
  name: string;
  type: string;
}

const normalizeArabic = (str: string): string => {
  return (str || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Compress and convert image to base64 for fast and reliable upload
const processImageFile = async (
  file: File
): Promise<{ mimeType: string; base64Data: string; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 2600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            mimeType: file.type || 'image/jpeg',
            base64Data: String(e.target?.result || ''),
            previewUrl: String(e.target?.result || ''),
          });
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        resolve({
          mimeType: 'image/jpeg',
          base64Data: dataUrl,
          previewUrl: dataUrl,
        });
      };
      img.onerror = () => reject(new Error('فشل قراءة الصورة'));
      img.src = String(e.target?.result);
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
};

export const BatchImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImport,
  defaultGrade = '',
  defaultSection = 'أ',
  customColumns = [],
  writtenMaxScore = 100,
  existingStudents = [],
  previousModelsStudents = [],
  allGradeOptions = [],
}) => {
  // Reference students combined from current sheet and previous sheets/models for intelligent name verification
  const allReferenceStudents = React.useMemo(() => {
    const list: Array<{ id?: string; name: string; source?: string }> = [];
    const seen = new Set<string>();

    (existingStudents || []).forEach((st) => {
      const cleaned = cleanSingleSpaces(st.name);
      if (cleaned && !seen.has(cleaned)) {
        seen.add(cleaned);
        list.push({ id: st.id, name: cleaned, source: 'الجدول الحالي' });
      }
    });

    (previousModelsStudents || []).forEach((st) => {
      const cleaned = cleanSingleSpaces(st.name);
      if (cleaned && !seen.has(cleaned)) {
        seen.add(cleaned);
        list.push({ id: st.id, name: cleaned, source: st.modelName || 'الجدول السابق' });
      }
    });

    return list;
  }, [existingStudents, previousModelsStudents]);

  // Available grade levels for dropdown options & autocompletion (comes strictly from what user typed in CreateModelModal and models)
  const availableGradeOptions = React.useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addIfValid = (g?: string) => {
      const trimmed = (g || '').trim();
      if (!trimmed) return;
      if (trimmed === 'الصف الدراسي' || trimmed === 'عام') return;
      const canon = canonicalizeArabic(trimmed);
      if (!seen.has(canon)) {
        seen.add(canon);
        list.push(trimmed);
      }
    };

    // 1. Current defaultGrade (from CreateModelModal)
    if (defaultGrade) addIfValid(defaultGrade);

    // 2. All grades created in models by the user
    allGradeOptions.forEach((g) => addIfValid(g));

    // Also read any grades stored in user models/storage
    try {
      const raw = localStorage.getItem('gradebook_user_grades');
      const stored: string[] = raw ? JSON.parse(raw) : [];
      stored.forEach((g) => addIfValid(g));
    } catch {}

    return list;
  }, [defaultGrade, allGradeOptions]);

  // Persistent custom sections saved in localStorage across sessions
  const [savedCustomSections, setSavedCustomSections] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('daragat_saved_sections');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const saveNewSection = (newSec: string) => {
    const trimmed = (newSec || '').trim();
    if (!trimmed) return;
    try {
      const raw = localStorage.getItem('daragat_saved_sections');
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(trimmed)) {
        const nextList = [...list, trimmed];
        localStorage.setItem('daragat_saved_sections', JSON.stringify(nextList));
        setSavedCustomSections(nextList);
      }
    } catch {}
  };

  const availableSectionOptions = React.useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addSection = (s: string) => {
      const trimmed = (s || '').trim();
      if (!trimmed) return;
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        list.push(trimmed);
      }
    };

    // Standard sections first
    ['أ', 'ب', 'ج', 'د', 'هـ', 'و'].forEach(addSection);

    // Any custom sections saved across modal visits
    savedCustomSections.forEach(addSection);

    // Any sections from existing students in this model
    (existingStudents || []).forEach((st) => addSection(st.section));

    return list;
  }, [existingStudents, savedCustomSections]);

  // Mode selection: 'manual' is the INITIAL DEFAULT choice!
  const [activeTab, setActiveTab] = useState<'manual' | 'extract'>('manual');

  // Manual Mode State: gradeLevel always starts unselected ('') so user must deliberately pick
  const [namesText, setNamesText] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [isCustomGrade, setIsCustomGrade] = useState(false);
  const [gradeValidationError, setGradeValidationError] = useState<string | null>(null);
  const [section, setSection] = useState(defaultSection || 'أ');

  // Extraction Mode State (from Camera or Device)
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPrepaymentError, setIsPrepaymentError] = useState(false);
  const [extractedStudents, setExtractedStudents] = useState<ExtractedStudentItem[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumn[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingDisplay[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);

  // Options
  const [updateExisting, setUpdateExisting] = useState(true);
  const [autoAddColumns, setAutoAddColumns] = useState(true);

  // Trial User Extraction Limit
  const currentUser = getCurrentUser();
  const isTrialUser = Boolean(
    currentUser &&
      (currentUser.isTrial ||
        currentUser.authProvider === 'trial' ||
        currentUser.uid?.startsWith('trial-') ||
        currentUser.email?.includes('@jok.nom'))
  );
  const [trialCount, setTrialCount] = useState<number>(() => getTrialExtractionsCount());
  const isTrialLimitReached = isTrialUser && trialCount >= 1;

  // Smart Crop State
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropImageIndex, setCropImageIndex] = useState(0);

  // Direct 100% Free Gemini API Key (stored in localStorage for zero-cost client extraction)
  const [customDirectKey] = useState<string>(() => {
    try {
      return localStorage.getItem('user_free_gemini_key') || '';
    } catch {
      return '';
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNamesText('');
      // Always reset gradeLevel so teacher explicitly confirms/picks the grade each time
      setGradeLevel('');
      setIsCustomGrade(false);
      setGradeValidationError(null);
      setSection(defaultSection || 'أ');
      setImages([]);
      setIsProcessing(false);
      setErrorMessage(null);
      setIsPrepaymentError(false);
      setExtractedStudents([]);
      setDetectedColumns([]);
      setColumnMappings([]);
      setHasExtracted(false);
      // ALWAYS default to manual entry initially
      setActiveTab('manual');
      setUpdateExisting(true);
      setAutoAddColumns(true);
      setIsCropOpen(false);
      setCropImageIndex(0);
      setTrialCount(getTrialExtractionsCount());
    }
  }, [isOpen, defaultSection]);

  if (!isOpen) return null;

  // Merge existing customColumns in the model and newly detected columns (Deduplicated Semantically)
  const effectiveReviewColumns: Array<{ id?: string; name: string; type: string; isNew?: boolean }> = [];
  {
    const seen = new Set<string>();
    for (const cc of customColumns) {
      if (isWrittenScoreColumn(cc.name) || isCoreTableField(cc.name)) continue;
      const norm = normalizeArabic(cc.name);
      seen.add(norm);
      seen.add(cc.name);
      seen.add(norm.replace(/^ال/, ''));
      effectiveReviewColumns.push({ id: cc.id, name: cc.name, type: 'custom', isNew: false });
    }
    for (const dc of detectedColumns) {
      if (!dc || !dc.name) continue;
      // If it semantically matches any core field or any existing custom column, DO NOT duplicate!
      const sem = resolveColumnSemantics(dc.name, dc.type, customColumns);
      if (sem.isMatched) continue;

      const norm = normalizeArabic(dc.name);
      const stripped = norm.replace(/^ال/, '');
      if (!seen.has(norm) && !seen.has(dc.name) && !seen.has(stripped)) {
        seen.add(norm);
        seen.add(dc.name);
        seen.add(stripped);
        effectiveReviewColumns.push({ name: dc.name, type: dc.type, isNew: true });
      }
    }
  }

  // Manual Tab parsing: handles name + optional scores with smart Arabic name verification
  const parseManualLines = () => {
    const rawLines = namesText.split('\n');

    return rawLines
      .map((line, lineIndex) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return null;

        const tokens = trimmed.split(/[\t,،]+/).map((t) => t.trim()).filter(Boolean);
        let rawName = '';
        let writtenScore: number | null = null;
        const extraScores: Record<string, number | null> = {};

        if (tokens.length >= 2) {
          rawName = tokens[0];
          const num1 = parseFloat(tokens[1]);
          writtenScore = !isNaN(num1) ? num1 : null;
          if (tokens.length >= 3) {
            const num2 = parseFloat(tokens[2]);
            if (!isNaN(num2) && customColumns[0]) {
              extraScores[customColumns[0].id] = num2;
            }
          }
        } else {
          const match = trimmed.match(/^(.*?)\s+([0-9]+(?:\.[0-9]+)?)$/);
          if (match) {
            rawName = match[1].trim();
            writtenScore = parseFloat(match[2]);
          } else {
            rawName = trimmed;
          }
        }

        const cleanedName = cleanSingleSpaces(rawName);
        const matchResult = findSuspectedStudentMatch(cleanedName, allReferenceStudents);

        return {
          lineIndex,
          rawLine: line,
          rawName,
          name: cleanedName,
          writtenRawScore: writtenScore,
          scores: extraScores,
          suspectedMatch: matchResult && !matchResult.isExact ? matchResult : null,
          isExactMatch: Boolean(matchResult?.isExact),
        };
      })
      .filter(Boolean) as Array<{
        lineIndex: number;
        rawLine: string;
        rawName: string;
        name: string;
        writtenRawScore: number | null;
        scores: Record<string, number | null>;
        suspectedMatch: SuspectedMatchResult | null;
        isExactMatch: boolean;
      }>;
  };

  const parsedManualItems = parseManualLines();
  const suspectedManualItems = parsedManualItems.filter((item) => item.suspectedMatch !== null);

  const handleAdoptManualPreviousName = (lineIndex: number, rawName: string, matchedName: string) => {
    const lines = namesText.split('\n');
    if (lines[lineIndex] !== undefined) {
      lines[lineIndex] = lines[lineIndex].replace(rawName, matchedName);
      setNamesText(lines.join('\n'));
    }
  };

  const handleAdoptAllManualPreviousNames = () => {
    const lines = namesText.split('\n');
    for (const item of suspectedManualItems) {
      if (item.suspectedMatch && lines[item.lineIndex] !== undefined) {
        lines[item.lineIndex] = lines[item.lineIndex].replace(item.rawName, item.suspectedMatch.matchedName);
      }
    }
    setNamesText(lines.join('\n'));
  };

  const handleConfirmManual = () => {
    if (parsedManualItems.length === 0) return;

    const trimmedGrade = (gradeLevel || '').trim();
    if (!trimmedGrade) {
      setGradeValidationError('⚠️ يجب تحديد الصف الدراسي أولاً قبل إضافة الطلاب لمنع خلط الأسماء بين الصفوف.');
      return;
    }

    const trimmedSection = (section || '').trim() || 'أ';

    // Persist newly used section for future dropdown usage
    saveNewSection(trimmedSection);

    // If a custom grade was entered, save it to the system list
    if (trimmedGrade) {
      try {
        const raw = localStorage.getItem('gradebook_user_grades');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        if (!existing.includes(trimmedGrade)) {
          localStorage.setItem('gradebook_user_grades', JSON.stringify([...existing, trimmedGrade]));
        }
      } catch {}
    }

    const newRows: Partial<StudentRow>[] = parsedManualItems.map((item) => ({
      name: cleanSingleSpaces(item.name),
      gradeLevel: normalizeGradeLevel(trimmedGrade, [defaultGrade]),
      section: normalizeSection(trimmedSection, [defaultSection]),
      writtenRawScore: item.writtenRawScore,
      scores: item.scores,
      notes: '',
    }));

    onImport(newRows, { updateExisting });
    // Reset gradeLevel so next time it requires deliberate choice again
    setGradeLevel('');
    onClose();
  };

  // Image Selection Handlers
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const filesArray = Array.from(fileList);
    const newItems: ImageUploadItem[] = [];

    for (const file of filesArray) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const { mimeType, base64Data, previewUrl } = await processImageFile(file);
        newItems.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          previewUrl,
          base64Data,
          mimeType,
        });
      } catch (err) {
        console.error('Error loading image', err);
      }
    }

    setImages((prev) => [...prev, ...newItems]);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Handle Crop result from SmartCropModal
  const handleApplyCrop = (
    croppedBase64: string,
    imageIndex: number,
    analyzeImmediately: boolean
  ) => {
    const updatedImages = images.map((img, idx) =>
      idx === imageIndex
        ? {
            ...img,
            base64Data: croppedBase64,
            previewUrl: croppedBase64,
          }
        : img
    );
    setImages(updatedImages);
    setIsCropOpen(false);
    setErrorMessage(null);

    if (analyzeImmediately) {
      setTimeout(() => {
        executeExtraction(undefined, updatedImages);
      }, 60);
    }
  };

  const handleLoadSampleSheet = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const sample = await generateSampleSheetImage();
      const sampleItem: ImageUploadItem = {
        id: `sample-${Date.now()}`,
        file: new File([], 'sample_sheet.jpg', { type: 'image/jpeg' }),
        previewUrl: sample.previewUrl,
        base64Data: sample.base64Data,
        mimeType: sample.mimeType,
      };
      setImages([sampleItem]);
      // Trigger extraction with the sample sheet immediately
      await executeExtraction(undefined, [sampleItem]);
    } catch (err: any) {
      console.error('Error generating sample sheet:', err);
      setIsProcessing(false);
      setErrorMessage('تعذر تجهيز كشف العينة، يرجى اختيار صورة يدوياً.');
    }
  };

  // Trigger data extraction from images
  const handleExtractFromImages = () => {
    executeExtraction();
  };

  const executeExtraction = async (
    overrideDirectKey?: string,
    overrideImages?: ImageUploadItem[]
  ) => {
    const currentImages = overrideImages || images;
    if (currentImages.length === 0) {
      setErrorMessage('يرجى التقاط صورة أو اختيار ملف صورة لكشف درجات الطلاب أولاً');
      return;
    }

    if (isTrialLimitReached) {
      setErrorMessage(
        'تم استخدام محاولة الاستخراج المتاحة في الفترة التجريبية. يمكنك استخدام خيار "إضافة يدوية أو لصق نص" لإضافة الطلاب ودرجاتهم مجاناً دائماً، أو الترقية للاشتراك الدائم.'
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setIsPrepaymentError(false);

    const availableCols: AvailableColumnInfo[] = [
      { id: 'written', name: 'الامتحان التحريري', type: 'written', maxScore: writtenMaxScore },
      ...customColumns.map((c) => ({
        id: c.id,
        name: c.name,
        type: 'custom' as const,
        maxScore: c.maxScore,
      })),
    ];

    const directKey =
      (overrideDirectKey || '').trim() ||
      (customDirectKey || '').trim() ||
      (typeof window !== 'undefined' ? localStorage.getItem('user_free_gemini_key') || '' : '').trim() ||
      ((import.meta.env.VITE_GEMINI_API_KEY as string) || '').trim() ||
      '';

    const payload = {
      images: currentImages.map((img) => ({
        mimeType: img.mimeType,
        data: img.base64Data,
      })),
      defaultGrade: gradeLevel,
      defaultSection: section,
      availableColumns: availableCols,
      apiKey: directKey,
    };

    let rawList: any[] = [];
    let returnedCols: DetectedColumn[] = [];
    let detectedGradeFinal = gradeLevel;
    let detectedSectionFinal = section;
    let extractionSucceeded = false;
    let lastExtractError = '';

    try {
      let authHeaders = await getAuthHeaders();
      let res = await fetch('/api/extract-students', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      // If unauthorized on first attempt and user is logged in, retry once with refreshed auth headers
      if (res.status === 401 && currentUser) {
        authHeaders = await getAuthHeaders();
        res = await fetch('/api/extract-students', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      }

      const resText = await res.text();
      let parsedData: any = null;

      try {
        parsedData = JSON.parse(resText);
      } catch {
        parsedData = null;
      }

      if (parsedData && typeof parsedData === 'object') {
        const isAuthErr =
          res.status === 401 ||
          Boolean(parsedData.isAuthError) ||
          Boolean(parsedData.isMissingApiKey) ||
          (parsedData.error &&
            (parsedData.error.includes('401') ||
              parsedData.error.includes('UNAUTHENTICATED') ||
              parsedData.error.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
              parsedData.error.includes('authentication credentials') ||
              parsedData.error.includes('GEMINI_API_KEY') ||
              parsedData.error.includes('مفتاح')));

        if (
          res.status === 403 &&
          (parsedData.isTrialLimitReached ||
            (parsedData.error && (parsedData.error.includes('استنفدت المحاولة المجانية') || parsedData.error.includes('المحاولة'))))
        ) {
          if (isTrialUser) {
            incrementTrialExtractionsCount();
            setTrialCount(getTrialExtractionsCount());
          }
          setIsProcessing(false);
          setErrorMessage(
            parsedData.error ||
              'تم استخدام محاولة الاستخراج المتاحة في الفترة التجريبية. يمكنك استخدام خيار "إضافة يدوية أو لصق نص" لإضافة الطلاب ودرجاتهم مجاناً دائماً، أو الترقية إلى الاشتراك الدائم.'
          );
          return;
        }

        if (res.ok && parsedData.success && Array.isArray(parsedData.students) && parsedData.students.length > 0) {
          rawList = parsedData.students;
          returnedCols = (Array.isArray(parsedData.detectedColumns) ? parsedData.detectedColumns : []).filter(
            (c: any) => {
              if (!c || !c.name) return false;
              const sem = resolveColumnSemantics(c.name, c.type, customColumns);
              return !sem.isMatched; // Only truly new non-synonymous columns!
            }
          );
          if (Array.isArray(parsedData.columnMappings)) {
            setColumnMappings(parsedData.columnMappings);
          }
          if (parsedData.detectedGrade && typeof parsedData.detectedGrade === 'string' && parsedData.detectedGrade.trim()) {
            detectedGradeFinal = normalizeGradeLevel(parsedData.detectedGrade.trim(), [defaultGrade]);
            setGradeLevel(detectedGradeFinal);
          }
          if (parsedData.detectedSection && typeof parsedData.detectedSection === 'string' && parsedData.detectedSection.trim()) {
            detectedSectionFinal = normalizeSection(parsedData.detectedSection.trim(), [defaultSection]);
            setSection(detectedSectionFinal);
          }
          extractionSucceeded = true;
        } else if (isAuthErr) {
          lastExtractError = parsedData.error || 'خدمة الذكاء الاصطناعي تحتاج إلى مفتاح API صالح.';
        } else if (
          parsedData.isPrepaymentError ||
          res.status === 402 ||
          (parsedData.error &&
            (parsedData.error.includes('prepayment') ||
              parsedData.error.includes('RESOURCE_EXHAUSTED') ||
              parsedData.error.includes('رصيد')))
        ) {
          setIsPrepaymentError(true);
          setIsProcessing(false);
          setErrorMessage(
            'مفتاح الخدمة الحالي انتهى رصيده المخصص. يمكنك استخدام خيار الإدخال اليدوي أو إنشاء مفتاح جديد.'
          );
          return;
        } else if (parsedData.error) {
          lastExtractError = parsedData.error;
        }
      } else if (!res.ok) {
        if (res.status === 429) {
          lastExtractError = 'تم تجاوز حد الطلبات للذكاء الاصطناعي (429). يرجى الانتظار لحظات وإعادة المحاولة.';
        } else if (res.status === 503 || res.status === 504) {
          lastExtractError = 'خدمة الذكاء الاصطناعي مشغولة حالياً (503). يرجى إعادة المحاولة بعد لحظات.';
        } else {
          lastExtractError = `استجاب الخادم برمز خطأ (${res.status}).`;
        }
      }
    } catch (srvErr: any) {
      console.warn('Backend proxy /api/extract-students error:', srvErr);
      lastExtractError = srvErr?.message || 'تعذر الاتصال بخادم الاستخراج.';
    }

    // Direct fallback if backend was unavailable and a direct client Gemini key exists
    if (!extractionSucceeded) {
      const directKey =
        (overrideDirectKey || '').trim() ||
        (customDirectKey || '').trim() ||
        (typeof window !== 'undefined' ? localStorage.getItem('user_free_gemini_key') || '' : '').trim() ||
        ((import.meta.env.VITE_GEMINI_API_KEY as string) || '').trim() ||
        '';

      if (directKey) {
        try {
          const directResult = await extractStudentsDirectly({
            apiKey: directKey,
            images: payload.images,
            defaultGrade: gradeLevel,
            defaultSection: section,
            availableColumns: availableCols,
          });
          if (directResult && Array.isArray(directResult.students) && directResult.students.length > 0) {
            rawList = directResult.students;
            returnedCols = (directResult.detectedColumns || []).filter((c: any) => {
              if (!c || !c.name) return false;
              const sem = resolveColumnSemantics(c.name, c.type, customColumns);
              return !sem.isMatched; // Only truly new non-synonymous columns!
            });
            if (Array.isArray(directResult.columnMappings)) {
              setColumnMappings(directResult.columnMappings);
            }
            if (directResult.detectedGrade) {
              detectedGradeFinal = normalizeGradeLevel(directResult.detectedGrade, [defaultGrade]);
              setGradeLevel(detectedGradeFinal);
            }
            if (directResult.detectedSection) {
              detectedSectionFinal = normalizeSection(directResult.detectedSection, [defaultSection]);
              setSection(detectedSectionFinal);
            }
            extractionSucceeded = true;
          }
        } catch (directErr: any) {
          console.warn('Direct client-side extraction error:', directErr);
          lastExtractError = directErr?.message || 'فشل الاتصال المباشر بالذكاء الاصطناعي.';
        }
      }
    }

    if (!extractionSucceeded || rawList.length === 0) {
      setErrorMessage(
        lastExtractError
          ? `تعذّر استخراج البيانات: ${lastExtractError}`
          : 'لم يتم العثور على أسماء طلاب داخل هذه الصورة. يرجى التأكد من وضوح كشف الأسماء، أو استخدام خيار الإضافة اليدوية.'
      );
      setIsProcessing(false);
      return;
    }

    setDetectedColumns(returnedCols);

    const items: ExtractedStudentItem[] = rawList.map((item: any, idx: number) => {
      const cleanedName = cleanSingleSpaces(item.name || '');
      const matchResult = findSuspectedStudentMatch(cleanedName, allReferenceStudents);
      const isExisting = Boolean(
        matchResult?.isExact ||
          (existingStudents || []).some(
            (ex) => canonicalizeArabic(ex.name) === canonicalizeArabic(cleanedName)
          )
      );

      return {
        id: `extracted-${idx}-${Date.now()}`,
        name: cleanedName,
        gradeLevel: normalizeGradeLevel(item.gradeLevel || detectedGradeFinal || gradeLevel, [defaultGrade]),
        section: normalizeSection(item.section || detectedSectionFinal || section, [defaultSection]),
        writtenRawScore:
          typeof item.writtenRawScore === 'number' && !isNaN(item.writtenRawScore)
            ? item.writtenRawScore
            : null,
        scores: item.scores || {},
        detectedScores: item.detectedScores || [],
        isAbsent: Boolean(item.isAbsent),
        notes: item.notes || (item.isAbsent ? 'غائب' : ''),
        isExisting,
        selected: true,
        suspectedMatch: matchResult && !matchResult.isExact ? matchResult : null,
        confirmedPreviousName: false,
      };
    });

    if (isTrialUser) {
      incrementTrialExtractionsCount();
      setTrialCount(getTrialExtractionsCount());
    }

    setExtractedStudents(items);
    setHasExtracted(true);
    setIsProcessing(false);
  };

  const handleAdoptPreviousName = (studentId: string, matchedName: string) => {
    setExtractedStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              name: matchedName,
              isExisting: true,
              suspectedMatch: null,
              confirmedPreviousName: true,
            }
          : s
      )
    );
  };

  const handleDismissSuspicion = (studentId: string) => {
    setExtractedStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, suspectedMatch: null, confirmedPreviousName: true } : s
      )
    );
  };

  const handleAdoptAllExtractedPreviousNames = () => {
    setExtractedStudents((prev) =>
      prev.map((s) => {
        if (s.suspectedMatch && !s.confirmedPreviousName) {
          return {
            ...s,
            name: s.suspectedMatch.matchedName,
            isExisting: true,
            suspectedMatch: null,
            confirmedPreviousName: true,
          };
        }
        return s;
      })
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setExtractedStudents((prev) => prev.map((s) => ({ ...s, selected: checked })));
  };

  const handleToggleStudent = (id: string) => {
    setExtractedStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleUpdateStudent = (
    id: string,
    field: 'name' | 'gradeLevel' | 'section' | 'writtenRawScore' | 'notes',
    value: any
  ) => {
    setExtractedStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleUpdateCustomScore = (
    id: string,
    colKey: string,
    colId: string | undefined,
    scoreVal: string
  ) => {
    setExtractedStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const num = scoreVal.trim() === '' ? null : parseFloat(scoreVal);
        const parsedNum = !isNaN(num as number) ? num : null;
        const nextScores = { ...s.scores };
        nextScores[colKey] = parsedNum;
        nextScores[normalizeArabic(colKey)] = parsedNum;
        if (colId) {
          nextScores[colId] = parsedNum;
        }
        return {
          ...s,
          scores: nextScores,
        };
      })
    );
  };

  const handleDeleteExtractedStudent = (id: string) => {
    setExtractedStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConfirmExtracted = () => {
    const selected = extractedStudents.filter((s) => s.selected && s.name.trim().length > 0);
    if (selected.length === 0) return;

    const trimmedGrade = (gradeLevel || '').trim();
    if (!trimmedGrade && !selected.some((s) => s.gradeLevel && s.gradeLevel.trim())) {
      setGradeValidationError('⚠️ يجب تحديد الصف الدراسي أولاً قبل استيراد الطلاب لمنع خلط الأسماء بين الصفوف.');
      return;
    }

    const trimmedSection = (section || '').trim() || 'أ';
    saveNewSection(trimmedSection);

    const newRows: Partial<StudentRow>[] = selected.map((s) => ({
      name: cleanSingleSpaces(s.name),
      gradeLevel: normalizeGradeLevel(s.gradeLevel || trimmedGrade, [defaultGrade]),
      section: normalizeSection(s.section || trimmedSection, [defaultSection]),
      writtenRawScore: s.writtenRawScore,
      scores: s.scores,
      notes: s.notes || (s.isAbsent ? 'غائب' : ''),
    }));

    const columnsToCreate: Array<{ name: string; maxScore?: number }> = [];
    if (autoAddColumns && detectedColumns.length > 0) {
      for (const dc of detectedColumns) {
        if (!dc || !dc.name) continue;

        // STRICT NON-DUPLICATION: If it means student name, section, grade, written exam, serial, or any existing custom column:
        // NEVER CREATE A DUPLICATE COLUMN!
        const sem = resolveColumnSemantics(dc.name, dc.type, customColumns);
        if (sem.isMatched) continue;

        const normDc = normalizeArabic(dc.name);
        const strippedDc = normDc.replace(/^ال/, '');
        const alreadyExists = customColumns.some((c) => {
          const normC = normalizeArabic(c.name);
          const strippedC = normC.replace(/^ال/, '');
          return normC === normDc || c.name === dc.name || strippedC === strippedDc;
        });

        if (!alreadyExists) {
          columnsToCreate.push({
            name: dc.name,
            maxScore: dc.type === 'oral' ? 20 : dc.type === 'activity' ? 10 : 10,
          });
        }
      }
    }

    onImport(newRows, {
      updateExisting,
      newCustomColumns: columnsToCreate,
    });
    setGradeLevel('');
    onClose();
  };

  const selectedCount = extractedStudents.filter(
    (s) => s.selected && s.name.trim().length > 0
  ).length;

  const totalWithWrittenScores = extractedStudents.filter(
    (s) => s.writtenRawScore !== null && s.writtenRawScore !== undefined
  ).length;

  const matchedExistingCount = extractedStudents.filter((s) => s.isExisting).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-4xl max-h-[96dvh] sm:max-h-[92dvh] flex flex-col overflow-hidden my-auto">
        {/* Header: Clean, Simple, Semantic with Sky Slate Blue Theme */}
        <div className="shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 bg-[#5692BE] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold leading-tight">
                استيراد وإضافة بيانات الطلاب
              </h3>
              <p className="text-[10px] sm:text-xs text-blue-100 mt-0.5 line-clamp-1">
                إضافة يدوية مباشرة أو استخراج بيانات الطلاب من الجهاز أو الكاميرا
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Explicit Grade & Section Selection Bar - مدمج وسهل الوصول على الموبايل والكمبيوتر */}
        <div
          className={`shrink-0 px-3 py-2 sm:px-5 sm:py-2.5 border-b transition-colors no-print ${
            gradeValidationError
              ? 'bg-rose-50 border-rose-300'
              : !gradeLevel
              ? 'bg-amber-50/80 border-amber-300'
              : 'bg-[#FAF7EC] border-[#D8CEBD]'
          }`}
          dir="rtl"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            {/* 1. Grade selection dropdown: prominent, clearly requires choosing */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <label className="text-xs font-black text-[#2F2822] flex items-center gap-1">
                  <span>الصف المستهدف:</span>
                  <span className="text-rose-600 font-bold">* (مطلوب)</span>
                </label>
                {!gradeLevel ? (
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-800 bg-amber-200/80 border border-amber-300 px-1.5 py-0.5 rounded">
                    ⚠️ يرجى تحديد الصف أولاً
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-700" />
                    <span>تم اختيار: {gradeLevel}</span>
                  </span>
                )}
              </div>

              {!isCustomGrade ? (
                <div className="relative">
                  <select
                    aria-label="اختيار الصف الدراسي"
                    value={gradeLevel}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CUSTOM__') {
                        setIsCustomGrade(true);
                        setGradeLevel('');
                      } else {
                        setGradeLevel(val);
                        setGradeValidationError(null);
                      }
                    }}
                    className={`w-full appearance-none bg-white text-xs sm:text-sm font-black py-2 pl-8 pr-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                      gradeValidationError
                        ? 'border-rose-500 ring-2 ring-rose-200 text-rose-900 bg-rose-50/50'
                        : !gradeLevel
                        ? 'border-amber-400 ring-2 ring-amber-200 text-[#8C6544]'
                        : 'border-[#BA916C] ring-2 ring-[#BA916C]/20 text-[#2F2822]'
                    }`}
                  >
                    <option value="" disabled>
                      -- 👇 اضغط هنا لاختيار الصف من قائمة الصفوف --
                    </option>
                    {availableGradeOptions.map((g) => (
                      <option key={g} value={g} className="font-bold py-1">
                        {g}
                      </option>
                    ))}
                    <option value="__CUSTOM__" className="text-blue-700 font-black">
                      ✍️ كتابة صف دراسي آخر غير موجود بالقائمة...
                    </option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#8C6544] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={gradeLevel}
                    onChange={(e) => {
                      setGradeLevel(e.target.value);
                      if (e.target.value.trim()) setGradeValidationError(null);
                    }}
                    placeholder="اكتب اسم الصف هنا (مثال: ثاني متوسط)..."
                    autoFocus
                    className="flex-1 bg-white border-2 border-[#5692BE] rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-black text-[#2F2822] focus:outline-none focus:ring-2 focus:ring-[#5692BE]/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomGrade(false);
                      setGradeLevel('');
                    }}
                    className="px-2.5 py-1.5 text-xs font-bold bg-[#EAE2D5] hover:bg-[#DCD0C0] text-[#4A3D30] rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    العودة للقائمة
                  </button>
                </div>
              )}
            </div>

            {/* 2. Section selection */}
            <div className="sm:w-52 shrink-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <label className="text-xs font-black text-[#2F2822]">
                  الشعبة:
                </label>
                <span className="text-[10px] text-[#7A6E61]">
                  (تُحفظ تلقائياً)
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="batch-import-sections-datalist"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="اختر أو اكتب الشعبة..."
                  maxLength={15}
                  className="w-full px-2.5 py-2 pl-8 bg-white border border-[#D8CEBD] rounded-xl text-xs sm:text-sm font-bold text-[#2F2822] focus:ring-2 focus:ring-[#5692BE] focus:outline-none transition-shadow shadow-2xs"
                />
                <datalist id="batch-import-sections-datalist">
                  {availableSectionOptions.map((s) => (
                    <option key={s} value={s}>
                      شعبة {s}
                    </option>
                  ))}
                </datalist>

                {/* Dropdown menu to pick any section directly */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center">
                  <select
                    aria-label="قائمة منبثقة للشعب المتاحة"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setSection(e.target.value);
                    }}
                    className="opacity-0 absolute inset-0 w-6 h-6 cursor-pointer z-10"
                    title="قائمة الشُعب المتاحة"
                  >
                    <option value="">اختر شعبة...</option>
                    {availableSectionOptions.map((s) => (
                      <option key={s} value={s}>
                        شعبة {s}
                      </option>
                    ))}
                  </select>
                  <div className="p-1 text-[#6B5E51] bg-slate-100 rounded-lg border border-slate-200 pointer-events-none hover:bg-slate-200">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Alert Message */}
          {gradeValidationError && (
            <div className="mt-2 p-2 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>{gradeValidationError}</span>
            </div>
          )}
        </div>

        {/* Method Selector Tabs: Compact Segmented Bar with Direct Instant Access */}
        <div className="shrink-0 px-3 py-2 sm:px-5 sm:py-2.5 bg-[#F5EFE3] border-b border-[#D8CEBD]">
          <div className="flex bg-[#E4DAC8] p-1 rounded-xl gap-1 max-w-xl mx-auto shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-[#8C6544] shadow-sm border border-[#BA916C]/40'
                  : 'text-[#6B5E51] hover:text-[#2F2822] hover:bg-white/40'
              }`}
            >
              <ClipboardList className={`w-4 h-4 shrink-0 ${activeTab === 'manual' ? 'text-[#BA916C]' : 'text-[#6B5E51]'}`} />
              <span>إدخال يدوي أو لصق نص</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('extract')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                activeTab === 'extract'
                  ? 'bg-white text-[#2B6CB0] shadow-sm border border-[#5692BE]/40'
                  : 'text-[#6B5E51] hover:text-[#2F2822] hover:bg-white/40'
              }`}
            >
              <Camera className={`w-4 h-4 shrink-0 ${activeTab === 'extract' ? 'text-[#2B6CB0]' : 'text-[#6B5E51]'}`} />
              <span>من ملف أو الكاميرا</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable & responsive */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3">
          {/* VIEW 1: MANUAL ENTRY / PASTE */}
          {activeTab === 'manual' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Names & Scores Input Area - Clearly visible and immediately reachable */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#554A3E]">
                  <span className="font-bold text-[#2F2822] flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-[#BA916C]" />
                    <span>حقل إضافة ولصق أسماء ودرجات الطلاب (طالب في كل سطر):</span>
                  </span>
                  <span className="text-[#7A6E61] text-[11px] font-medium hidden sm:inline">
                    يدعم النسخ واللصق المباشر من Excel أو Word
                  </span>
                </div>

                <div>
                  <textarea
                    rows={8}
                    value={namesText}
                    onChange={(e) => setNamesText(e.target.value)}
                    placeholder={`أحمد محمد علي 85\nحسين كريم حسن 92\nعلي رضا كاظم 78\n\nأو الصق أسماء ودرجات الطلاب مباشرة من جدول Excel...`}
                    className="w-full h-44 sm:h-60 p-3 sm:p-4 bg-white border-2 border-[#D8CEBD] focus:border-[#BA916C] rounded-xl text-xs sm:text-sm font-mono leading-relaxed text-[#2F2822] focus:ring-2 focus:ring-[#BA916C]/30 focus:outline-none placeholder:text-[#A89C8F] shadow-inner resize-y"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs bg-[#F5EFE3] p-2.5 rounded-xl border border-[#D8CEBD]">
                <span className="text-[#554A3E] font-medium">
                  عدد الطلاب المكتشفين: <b className="text-[#8C6544] font-black">{parsedManualItems.length}</b>
                </span>
                <label className="flex items-center gap-1.5 font-bold text-[#2F2822] cursor-pointer select-none text-[11px] sm:text-xs">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="rounded text-[#BA916C] focus:ring-[#BA916C] w-4 h-4 cursor-pointer"
                  />
                  <span>تحديث درجات الطلاب المسجلين مسبقاً على أساس الاسم</span>
                </label>
              </div>

              {/* Suspicious Name Verification Alert for Manual Entry */}
              {suspectedManualItems.length > 0 && (
                <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2 text-xs text-amber-950 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        تم رصد أسماء مشابهة لأسماء بالجدول السابق ({suspectedManualItems.length} اسم مشتبه):
                      </span>
                    </div>
                    {suspectedManualItems.length > 1 && (
                      <button
                        type="button"
                        onClick={handleAdoptAllManualPreviousNames}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>اعتماد جميع الأسماء السابقة دفعة واحدة</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                    {suspectedManualItems.map((item) => (
                      <div
                        key={item.lineIndex}
                        className="flex flex-wrap items-center justify-between gap-2 p-2 bg-amber-100/90 border border-amber-300 rounded-lg text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-amber-800 line-through opacity-75">
                            {item.rawName}
                          </span>
                          <span className="text-amber-600 font-bold">➔</span>
                          <span className="font-black text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-300">
                            هل تقصد {item.suspectedMatch?.matchedName} كما في الجدول السابق؟
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium">
                            ({item.suspectedMatch?.diffDescription})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleAdoptManualPreviousName(
                              item.lineIndex,
                              item.rawName,
                              item.suspectedMatch!.matchedName
                            )
                          }
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                        >
                          <Check className="w-3 h-3" />
                          <span>نعم، اعتمد «{item.suspectedMatch?.matchedName}»</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: EXTRACTION FROM CAMERA OR DEVICE */}
          {activeTab === 'extract' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Trial Notice */}
              {isTrialUser && (
                isTrialLimitReached ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-950">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>تم استنفاد محاولة الاستخراج المجانية في الفترة التجريبية.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      استخدام الإدخال اليدوي
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2 text-xs text-blue-900 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#2B6CB0]" />
                      <span>استخراج بيانات الطلاب من الجهاز أو الكاميرا متاح لمرة واحدة في الفترة التجريبية</span>
                    </span>
                    <span className="text-[10px] bg-blue-200 text-blue-950 px-2 py-0.5 rounded-md font-bold shrink-0">
                      محاولة متبقية: 1/1
                    </span>
                  </div>
                )
              )}

              {!hasExtracted ? (
                <>
                  {/* Clean Upload / Capture Area - Prominent Action Buttons Front & Center */}
                  <div className="border-2 border-dashed border-[#5692BE]/40 hover:border-[#2B6CB0] bg-white rounded-2xl p-4 sm:p-5 text-center transition-colors shadow-2xs">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={cameraInputRef}
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />

                    {/* Prominent Action Buttons at the very top */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto mb-3">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="py-3 px-4 bg-[#2B6CB0] hover:bg-[#255C96] text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer"
                      >
                        <Camera className="w-5 h-5 shrink-0" />
                        <span>📸 التقاط صورة بالكاميرا</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 border-2 border-slate-300 hover:border-[#2B6CB0] rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-transform active:scale-98 cursor-pointer"
                      >
                        <Upload className="w-5 h-5 text-[#2B6CB0] shrink-0" />
                        <span>📁 رفع صورة من الجهاز</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                      التقط صورة واضحة لكشف الدرجات أو ارفع صورة كشف محفوظ على جهازك
                    </p>

                    {/* Sample Sheet Test Button */}
                    <div className="pt-2.5 border-t border-slate-200/80 flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleLoadSampleSheet}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-98"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>تجربة كشف عينة لاختبار مطابقة الأعمدة ومنع التكرار</span>
                      </button>
                    </div>

                    {/* Semantic Icons & Key Highlights */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-slate-600 font-medium">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>قراءة الأسماء والدرجات</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>التحريري والشفهي والنشاط</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>كشف الغياب تلقائياً</span>
                      </span>
                    </div>
                  </div>

                  {/* Image Previews */}
                  {images.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
                        <span>الصور المحددة ({images.length} صورة):</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCropImageIndex(0);
                              setIsCropOpen(true);
                            }}
                            className="text-xs font-bold text-[#2B6CB0] hover:text-[#1E3A8A] flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                            title="تحديد وقص منطقة الجدول في الصورة يدوياً"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span>تحديد وقص الجدول</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setImages([])}
                            className="text-rose-600 hover:text-rose-700 text-[11px] cursor-pointer"
                          >
                            مسح جميع الصور
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {images.map((img, idx) => (
                          <div
                            key={img.id}
                            className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-3/4 shadow-xs"
                          >
                            <img
                              src={img.previewUrl}
                              alt={`ورقة ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCropImageIndex(idx);
                                  setIsCropOpen(true);
                                }}
                                className="p-2 bg-[#2B6CB0] hover:bg-[#255C96] text-white rounded-full transition-colors cursor-pointer shadow-md"
                                title="تحديد وقص منطقة الجدول"
                              >
                                <Scissors className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(img.id)}
                                className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer shadow-md"
                                title="حذف الصورة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Quick Crop badge */}
                            <button
                              type="button"
                              onClick={() => {
                                setCropImageIndex(idx);
                                setIsCropOpen(true);
                              }}
                              className="absolute top-1.5 left-1.5 bg-black/75 hover:bg-[#2B6CB0] text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer border border-white/20 transition-colors"
                              title="تحديد وقص منطقة الجدول"
                            >
                              <Scissors className="w-3 h-3 text-blue-200" />
                              <span>تحديد/قص</span>
                            </button>

                            <span className="absolute bottom-1 right-1 bg-black/70 text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Results View: Students and Grades Extracted */
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {/* Summary Strip */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-2">
                          <span>تم استخراج {extractedStudents.length} طالب بنجاح!</span>
                          {totalWithWrittenScores > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-md text-[11px] font-semibold">
                              {totalWithWrittenScores} درجة تحريري
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-800 flex flex-wrap items-center gap-2 mt-0.5 font-semibold">
                          <span>الصف: {gradeLevel}</span>
                          <span>·</span>
                          <span>الشعبة: {section}</span>
                          {matchedExistingCount > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-[#2B6CB0] font-bold">
                                {matchedExistingCount} طالب مسجل مسبقاً
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setHasExtracted(false);
                        setImages([]);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>مسح ورقة جديدة</span>
                    </button>
                  </div>

                  {/* Integration Settings */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={updateExisting}
                          onChange={(e) => setUpdateExisting(e.target.checked)}
                          className="rounded text-[#2B6CB0] focus:ring-[#2B6CB0] w-4 h-4 cursor-pointer"
                        />
                        <span>
                          تحديث درجات الطلاب المسجلين مسبقاً إذا تطابقت أسماؤهم
                        </span>
                      </label>

                      {detectedColumns.length > 0 && (
                        <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoAddColumns}
                            onChange={(e) => setAutoAddColumns(e.target.checked)}
                            className="rounded text-[#2B6CB0] focus:ring-[#2B6CB0] w-4 h-4 cursor-pointer"
                          />
                          <span>
                            إضافة الأعمدة المكتشفة ({detectedColumns.map((c) => c.name).join('، ')}) إلى السجل تلقائياً
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Semantic Column Deduplication Report */}
                  {columnMappings.length > 0 && (
                    <div className="p-3.5 bg-gradient-to-r from-blue-50/80 via-emerald-50/50 to-indigo-50/50 border border-blue-200/80 rounded-xl space-y-2.5 text-xs text-slate-800 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#2B6CB0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-black text-[#1A365D]">
                              المطابقة الدلالية الذكية للأعمدة ومنع التكرار
                            </span>
                            <span className="text-slate-500 text-[11px] block sm:inline sm:mr-2">
                              تم فحص رؤوس الأعمدة بالذكاء الاصطناعي وتعيين البيانات للحقول الموجودة تلقائياً
                            </span>
                          </div>
                        </div>
                        {detectedColumns.length === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            لا توجد أي أعمدة مكررة (تم ربط الحقول بنجاح)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold border border-blue-200">
                            سيتم إضافة {detectedColumns.length} حقل جديد فقط لعدم وجود مثيل له
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                        {columnMappings.map((cm, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-lg border text-[11px] flex flex-col justify-between gap-1.5 transition-all ${
                              cm.isNewColumn
                                ? 'bg-blue-50 border-blue-200 text-blue-900'
                                : 'bg-white border-emerald-200 text-slate-800 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200">
                                بالورقة: «{cm.originalDocumentLabel}»
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  cm.isNewColumn
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {cm.isNewColumn ? 'حقل إضافي جديد' : 'حقل موجود بالسجل'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 font-bold text-slate-800">
                              <span className="text-slate-400">➔</span>
                              <span className={cm.isNewColumn ? 'text-blue-700' : 'text-emerald-700'}>
                                {cm.mappedTarget}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 leading-tight">
                              {cm.explanation}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suspicious Name Alert Banner for Extracted Students */}
                  {extractedStudents.some((s) => s.suspectedMatch && !s.confirmedPreviousName) && (
                    <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs text-amber-950">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-black">
                            تم رصد {extractedStudents.filter((s) => s.suspectedMatch && !s.confirmedPreviousName).length} اسم مشتبه به
                          </span>
                          <span className="text-amber-800 mr-1">
                            (يختلف في الهمزة أ/ا أو التاء ة/ه أو تقارب حرفي عن الجدول السابق). تم تمييزها بخلفية ملونة لمراجعتها.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAdoptAllExtractedPreviousNames}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>اعتماد جميع الأسماء السابقة المطابقة</span>
                      </button>
                    </div>
                  )}

                  {/* Selection and count indicator */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          extractedStudents.length > 0 &&
                          extractedStudents.every((s) => s.selected)
                        }
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className="rounded text-[#2B6CB0] focus:ring-[#2B6CB0] w-4 h-4 cursor-pointer"
                      />
                      <span>تحديد الكل ({extractedStudents.length})</span>
                    </label>
                    <span className="text-slate-600 font-medium">
                      المحدد للإدخال: <b className="text-emerald-700">{selectedCount}</b> طالب
                    </span>
                  </div>

                  {/* Table of extracted students & scores */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto bg-white shadow-2xs">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-8 text-center">#</th>
                          <th className="p-2 w-8 text-center">اختيار</th>
                          <th className="p-2 min-w-[200px]">اسم الطالب</th>
                          <th className="p-2 w-20">الصف</th>
                          <th className="p-2 w-16">الشعبة</th>
                          <th className="p-2 w-28 bg-emerald-50/80 text-emerald-900 border-x border-emerald-200 text-center">
                            <div className="flex flex-col items-center">
                              <span>الامتحان التحريري</span>
                              <span className="text-[10px] text-emerald-700 font-normal">
                                {writtenMaxScore ? `(من ${writtenMaxScore})` : '(تحريري)'}
                              </span>
                            </div>
                          </th>
                          {effectiveReviewColumns.map((col) => (
                            <th
                              key={col.id || col.name}
                              className="p-2 min-w-[85px] bg-sky-50 text-sky-900 border-x border-sky-200 text-center"
                            >
                              <div className="flex flex-col items-center">
                                <span>{col.name}</span>
                                {col.isNew ? (
                                  <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded font-normal">
                                    مكتشف
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-sky-700 font-normal">
                                    عمود بالسجل
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                          <th className="p-2 w-24">الحالة / ملاحظات</th>
                          <th className="p-2 w-10 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {extractedStudents.map((student, idx) => (
                          <tr
                            key={student.id}
                            className={`hover:bg-slate-50 transition-colors ${
                              !student.selected ? 'opacity-40 bg-slate-50/50' : ''
                            }`}
                          >
                            <td className="p-2 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={student.selected}
                                onChange={() => handleToggleStudent(student.id)}
                                className="rounded text-[#2B6CB0] focus:ring-[#2B6CB0] w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="p-2">
                              {student.suspectedMatch && !student.confirmedPreviousName ? (
                                <div className="bg-amber-100/90 border-2 border-amber-400 rounded-xl p-2.5 text-amber-950 shadow-xs space-y-1.5 animate-in fade-in">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={student.name}
                                      onBlur={(e) =>
                                        handleUpdateStudent(student.id, 'name', cleanSingleSpaces(e.target.value))
                                      }
                                      onChange={(e) =>
                                        handleUpdateStudent(student.id, 'name', e.target.value)
                                      }
                                      className="w-full px-2 py-1 bg-white border border-amber-300 rounded font-black text-amber-950 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                    />
                                  </div>

                                  <div className="text-[11px] font-bold text-amber-950 leading-snug">
                                    هل تقصد <span className="underline decoration-amber-600 font-black">{student.suspectedMatch.matchedName}</span> كما في الجدول السابق؟
                                  </div>
                                  <div className="text-[10px] text-amber-800">
                                    ({student.suspectedMatch.diffDescription})
                                  </div>

                                  <div className="flex items-center gap-1 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAdoptPreviousName(
                                          student.id,
                                          student.suspectedMatch!.matchedName
                                        )
                                      }
                                      className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>نعم، اعتمد الاسم السابق</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDismissSuspicion(student.id)}
                                      className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-md text-[10px] font-semibold cursor-pointer transition-colors"
                                    >
                                      إبقاء كاسم جديد
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={student.name}
                                    onBlur={(e) =>
                                      handleUpdateStudent(student.id, 'name', cleanSingleSpaces(e.target.value))
                                    }
                                    onChange={(e) =>
                                      handleUpdateStudent(student.id, 'name', e.target.value)
                                    }
                                    className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#2B6CB0] rounded font-bold text-slate-800 focus:outline-none text-xs"
                                  />
                                  {student.isExisting && (
                                    <span
                                      title="هذا الطالب مسجل مسبقاً في السجل، وسيتم تحديث درجاته على أساس الاسم حتى لو اختلف التسلسل"
                                      className="shrink-0 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap"
                                    >
                                      <UserCheck className="w-2.5 h-2.5" />
                                      <span>مسجل مسبقاً</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={student.gradeLevel}
                                onChange={(e) =>
                                  handleUpdateStudent(student.id, 'gradeLevel', e.target.value)
                                }
                                className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#2B6CB0] rounded text-slate-700 text-center focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={student.section}
                                onChange={(e) =>
                                  handleUpdateStudent(student.id, 'section', e.target.value)
                                }
                                className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#2B6CB0] rounded text-center text-slate-700 font-bold focus:outline-none"
                              />
                            </td>

                            {/* Written Raw Score Input */}
                            <td className="p-2 bg-emerald-50/40 border-x border-emerald-100 text-center">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={
                                  student.writtenRawScore !== null && student.writtenRawScore !== undefined
                                    ? student.writtenRawScore
                                    : ''
                                }
                                placeholder={student.isAbsent ? 'غائب' : '--'}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  handleUpdateStudent(
                                    student.id,
                                    'writtenRawScore',
                                    val === '' ? null : parseFloat(val)
                                  );
                                }}
                                className="w-20 px-2 py-1 bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 rounded text-center font-mono font-bold text-emerald-950 focus:outline-none shadow-2xs"
                              />
                            </td>

                            {/* Custom & Detected Columns Inputs */}
                            {effectiveReviewColumns.map((col) => {
                              const normName = normalizeArabic(col.name);
                              const val =
                                col.id && student.scores[col.id] !== undefined && student.scores[col.id] !== null
                                  ? student.scores[col.id]
                                  : (student.scores[col.name] ?? student.scores[normName] ?? null);

                              return (
                                <td
                                  key={col.id || col.name}
                                  className="p-2 bg-sky-50/30 border-x border-sky-100 text-center"
                                >
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={val !== null && val !== undefined ? val : ''}
                                    placeholder="--"
                                    onChange={(e) =>
                                      handleUpdateCustomScore(student.id, col.name, col.id, e.target.value)
                                    }
                                    className="w-16 px-1.5 py-1 bg-white border border-sky-300 focus:border-sky-600 focus:ring-1 focus:ring-sky-500 rounded text-center font-mono font-bold text-sky-950 focus:outline-none shadow-2xs"
                                  />
                                </td>
                              );
                            })}

                            <td className="p-2">
                              <input
                                type="text"
                                value={student.notes || ''}
                                placeholder={student.isAbsent ? 'غائب' : 'ملاحظة...'}
                                onChange={(e) =>
                                  handleUpdateStudent(student.id, 'notes', e.target.value)
                                }
                                className={`w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-slate-400 rounded text-[11px] focus:outline-none ${
                                  student.isAbsent ? 'text-rose-600 font-bold' : 'text-slate-600'
                                }`}
                              />
                            </td>

                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteExtractedStudent(student.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="حذف الطالب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Prepayment notice if applicable */}
              {isPrepaymentError ? (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>ملاحظة حول خدمة الاستخراج:</span>
                  </div>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    انتهى رصيد المفتاح الحالي المخصص للخدمة. يمكنك استخدام خيار "إضافة يدوية أو لصق نص" لمتابعة رصد الدرجات مجاناً.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="inline-flex items-center gap-1 text-xs text-amber-900 hover:text-amber-950 font-bold underline cursor-pointer"
                  >
                    <span>الانتقال إلى الإدخال اليدوي أو اللصق</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : null}

              {/* Error Message with Crop action if images present */}
              {errorMessage && !isPrepaymentError && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                    <div className="shrink-0 mt-0.5">⚠️</div>
                    <div className="flex-1 leading-relaxed font-medium">{errorMessage}</div>
                  </div>

                  {images.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Scissors className="w-4 h-4 text-[#2B6CB0]" />
                        <span>يمكنك تحديد وقص منطقة الجدول في الصورة لزيادة دقة القراءة:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCropImageIndex(0);
                          setIsCropOpen(true);
                        }}
                        className="px-3 py-1.5 bg-[#2B6CB0] hover:bg-[#255C96] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>تحديد الجدول الآن</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 px-5 py-3.5 bg-[#F8F4EA] border-t border-[#E0D5C3] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#F2ECE0] text-[#554A3E] border border-[#D8CEBD] rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          {activeTab === 'manual' ? (
            <button
              type="button"
              onClick={handleConfirmManual}
              disabled={parsedManualItems.length === 0}
              className="px-5 py-2.5 craft-btn-primary disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>إدخال {parsedManualItems.length} طالب إلى السجل</span>
            </button>
          ) : (
            hasExtracted ? (
              <button
                type="button"
                onClick={handleConfirmExtracted}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  تأكيد واستيراد {selectedCount} طالب إلى السجل
                </span>
              </button>
            ) : isTrialLimitReached ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(
                    'تم استخدام المحاولة المجانية المتاحة في النسخة التجريبية. يرجى استخدام خيار "إضافة يدوية أو لصق نص" لإدخال الطلاب مجاناً.'
                  );
                }}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" />
                <span>تم استنفاد المحاولة التجريبية (1/1)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExtractFromImages}
                disabled={images.length === 0 || isProcessing}
                className="px-5 py-2.5 bg-[#5692BE] hover:bg-[#467EAA] disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ استخراج بيانات الطلاب والدرجات...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>استخراج بيانات الطلاب ({images.length} صورة)</span>
                  </>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Smart Crop Modal for manual table cropping */}
      <SmartCropModal
        isOpen={isCropOpen}
        onClose={() => setIsCropOpen(false)}
        images={images}
        activeImageIndex={cropImageIndex}
        onApplyCrop={handleApplyCrop}
      />
    </div>
  );
};
