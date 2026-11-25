export interface MathAlternative {
  id: string;
  label: string;
  kind: 'spoken' | 'unicode' | 'ascii' | 'katex';
  insertText: string;
  previewText?: string;
  latex?: string;
  isLtr: boolean;
}

export type MathCategory =
  | 'exponent'
  | 'fraction'
  | 'logarithm'
  | 'derivative'
  | 'integral'
  | 'root'
  | 'limit'
  | 'trig'
  | 'katex';

export interface MathTokenSegment {
  type: 'math';
  id: string;
  start: number;
  end: number;
  rawText: string;
  canonicalKey: string;
  category: MathCategory;
  alternatives: MathAlternative[];
  selectedAltId: string;
  isLtr: boolean;
}

export interface TextSegment {
  type: 'text';
  text: string;
  start: number;
  end: number;
}

export type ParsedMathSegment = TextSegment | MathTokenSegment;

export interface ParseMathOptions {
  useArabicDigits?: boolean;
}

export interface MathPatternRule {
  id: string;
  category: MathCategory;
  titleAr: string;
  patterns: RegExp[];
  buildAlternatives: (
    match: RegExpExecArray,
    matchedPatternIndex: number,
    sourceMemory?: Map<string, string>,
    options?: ParseMathOptions
  ) => {
    canonicalKey: string;
    alternatives: MathAlternative[];
    selectedAltId: string;
  } | null;
}

const ARABIC_INDIC_TO_LATIN: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

const LATIN_TO_ARABIC_INDIC: Record<string, string> = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
};

const SPOKEN_NUMBER_MAP: Record<string, string> = {
  صفر: '0',
  واحد: '1',
  واحدة: '1',
  اثنين: '2',
  اثنان: '2',
  ثنتين: '2',
  تنين: '2',
  ثلاثة: '3',
  ثلاثه: '3',
  ثلاث: '3',
  أربعة: '4',
  اربعة: '4',
  أربع: '4',
  اربع: '4',
  خمسة: '5',
  خمسه: '5',
  خمس: '5',
  ستة: '6',
  سته: '6',
  ست: '6',
  سبعة: '7',
  سبعه: '7',
  سبع: '7',
  ثمانية: '8',
  ثمانيه: '8',
  ثماني: '8',
  تسعة: '9',
  تسعه: '9',
  تسع: '9',
  عشرة: '10',
  عشره: '10',
  عشر: '10',
  عشرين: '20',
  ثلاثين: '30',
  أربعين: '40',
  اربعين: '40',
  خمسين: '50',
  مئة: '100',
  مائة: '100',
};

const SPOKEN_VAR_MAP: Record<string, string> = {
  س: 'x',
  سين: 'x',
  ص: 'y',
  صاد: 'y',
  ع: 'z',
  أ: 'a',
  ا: 'a',
  ب: 'b',
  ن: 'n',
  م: 'm',
  هـ: 'e',
  ق: 'f',
  ل: 'l',
  ك: 'k',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  n: 'ⁿ',
  i: 'ⁱ',
  x: 'ˣ',
  y: 'ʸ',
  '+': '⁺',
  '-': '⁻',
};

const REVERSE_SUPERSCRIPT_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SUPERSCRIPT_MAP).map(([k, v]) => [v, k])
);

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  n: 'ₙ',
  x: 'ₓ',
  a: 'ₐ',
  e: 'ₑ',
  i: 'ᵢ',
};

const REVERSE_SUBSCRIPT_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SUBSCRIPT_MAP).map(([k, v]) => [v, k])
);

const VULGAR_FRACTIONS: Record<string, [string, string]> = {
  '½': ['1', '2'],
  '⅓': ['1', '3'],
  '⅔': ['2', '3'],
  '¼': ['1', '4'],
  '¾': ['3', '4'],
  '⅕': ['1', '5'],
  '⅖': ['2', '5'],
  '⅗': ['3', '5'],
  '⅘': ['4', '5'],
  '⅙': ['1', '6'],
  '⅚': ['5', '6'],
  '⅛': ['1', '8'],
  '⅜': ['3', '8'],
  '⅝': ['5', '8'],
  '⅞': ['7', '8'],
};

const PAIR_TO_VULGAR_FRACTION: Record<string, string> = Object.fromEntries(
  Object.entries(VULGAR_FRACTIONS).map(([sym, [n, d]]) => [`${n}/${d}`, sym])
);

const LATIN_TO_ARABIC_VAR: Record<string, string> = {
  x: 'س',
  y: 'ص',
  z: 'ع',
  a: 'أ',
  b: 'ب',
  n: 'ن',
  m: 'م',
  f: 'ق',
};

export function toLatinDigits(str: string): string {
  return str.replace(/[٠-٩]/g, (ch) => ARABIC_INDIC_TO_LATIN[ch] ?? ch);
}

export function toArabicDigits(str: string): string {
  return str.replace(/[0-9]/g, (ch) => LATIN_TO_ARABIC_INDIC[ch] ?? ch);
}

export function formatMathDigits(str: string, useArabicDigits = true): string {
  return useArabicDigits ? toArabicDigits(str) : toLatinDigits(str);
}

/**
 * Strips any `\text{...}` wrapper inside parsed KaTeX snippets so canonical keys
 * and digit transformations stay clean.
 */
function unwrapTexText(raw: string): string {
  return raw.replace(/\\text\{([^}]*)\}/g, '$1').trim();
}

/**
 * Ensures any Arabic characters or Arabic-Indic digits inside KaTeX LaTeX
 * are safely wrapped in `\text{...}` so KaTeX renders crisp, properly aligned
 * roots, vertical fractions, limits, and exponents without font metric errors.
 */
export function prepareLatexForKatex(latex: string): string {
  if (!latex) return '';
  const safeLatex = latex.replace(/\$/g, '');
  return safeLatex.replace(
    /(\\text\{[^}]*\})|([\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)*)/g,
    (full, textCmd: string | undefined, arabicRun: string | undefined) => {
      if (textCmd) return textCmd;
      if (!arabicRun) return full;
      return `\\text{${arabicRun}}`;
    }
  );
}

export function resolveMathOperand(raw: string): string {
  const cleaned = toLatinDigits(unwrapTexText(raw));
  if (SPOKEN_NUMBER_MAP[cleaned]) return SPOKEN_NUMBER_MAP[cleaned];
  if (SPOKEN_VAR_MAP[cleaned]) return SPOKEN_VAR_MAP[cleaned];
  return cleaned;
}

/**
 * Resolves an operand while respecting Arabic variable preference when
 * the input was an Arabic letter (e.g. `س`, `ص`) in Arabic digits mode.
 */
function resolveOperandForDisplay(
  raw: string,
  useArabicDigits: boolean
): { canonical: string; display: string } {
  const unwrapped = unwrapTexText(raw);
  const canonical = resolveMathOperand(unwrapped);

  // If the user explicitly wrote an Arabic letter (like س or ص) and we're in Arabic mode,
  // keep the Arabic variable; if in English mode or spoken phrase, format appropriately.
  let displayBase = canonical;
  if (useArabicDigits && /^[سصعأابنمقلك]$/.test(unwrapped)) {
    displayBase = unwrapped;
  } else if (
    useArabicDigits &&
    SPOKEN_VAR_MAP[unwrapped]
  ) {
    displayBase =
      unwrapped === 'سين' ? 'س' : unwrapped === 'صاد' ? 'ص' : unwrapped;
  }

  return {
    canonical,
    display: formatMathDigits(displayBase, useArabicDigits),
  };
}

export function toArabicLabel(symbol: string, useArabicDigits = true): string {
  const clean = unwrapTexText(symbol);
  const mapped = LATIN_TO_ARABIC_VAR[clean] || clean;
  return formatMathDigits(mapped, useArabicDigits);
}

export function toSuperscriptText(val: string): string | null {
  const latinVal = toLatinDigits(val);
  let out = '';
  for (const ch of latinVal) {
    const mapped = SUPERSCRIPT_MAP[ch];
    if (!mapped) return null;
    out += mapped;
  }
  return out;
}

export function fromSuperscriptText(sup: string): string {
  return Array.from(sup)
    .map((ch) => REVERSE_SUPERSCRIPT_MAP[ch] ?? ch)
    .join('');
}

export function toSubscriptText(val: string): string | null {
  const latinVal = toLatinDigits(val);
  let out = '';
  for (const ch of latinVal) {
    const mapped = SUBSCRIPT_MAP[ch];
    if (!mapped) return null;
    out += mapped;
  }
  return out;
}

export function fromSubscriptText(sub: string): string {
  return Array.from(sub)
    .map((ch) => REVERSE_SUBSCRIPT_MAP[ch] ?? ch)
    .join('');
}

/**
 * Normalizes standalone Arabic spoken math keywords and number words when desired
 * (used safely for voice normalization helpers).
 */
export function normalizeArabicMathSpeech(
  input: string,
  useArabicDigits = false
): string {
  let text = toLatinDigits(input);
  Object.entries(SPOKEN_NUMBER_MAP).forEach(([word, digit]) => {
    const re = new RegExp(`(^|\\s)${word}(?=\\s|$|[،.؟!])`, 'g');
    text = text.replace(re, `$1${digit}`);
  });
  return useArabicDigits ? toArabicDigits(text) : text;
}

const OPERAND_AR_NUMS =
  'صفر|واحد|واحدة|اثنين|اثنان|ثنتين|ثلاثة|ثلاثه|ثلاث|أربعة|اربعة|أربع|اربع|خمسة|خمسه|خمس|ستة|سته|ست|سبعة|سبعه|سبع|ثمانية|ثمانيه|ثماني|تسعة|تسعه|تسع|عشرة|عشره|عشر|عشرين|ثلاثين|مئة|مائة';
const OPERAND_TOKEN = `(?:${OPERAND_AR_NUMS}|[0-9٠-٩]+|سين|صاد|[سصعأابنمقلك]|[a-zA-Z])`;
const BRACE_CONTENT = `(?:[^{}$]|\\{[^{}$]*\\})+`;

function buildExponentAlternatives(
  baseRaw: string,
  expRaw: string,
  spokenOverride: string | undefined,
  selectedKind: MathAlternative['kind'],
  useArabicDigits: boolean
): {
  canonicalKey: string;
  alternatives: MathAlternative[];
  selectedAltId: string;
} {
  const baseInfo = resolveOperandForDisplay(baseRaw, useArabicDigits);
  const expInfo = resolveOperandForDisplay(expRaw, useArabicDigits);
  const canonicalKey = `exp:${baseInfo.canonical}:${expInfo.canonical}`;

  const spokenExpText = formatMathDigits(expInfo.canonical, useArabicDigits);
  const defaultSpoken =
    expInfo.canonical === '2'
      ? `${toArabicLabel(baseInfo.canonical, useArabicDigits)} تربيع`
      : expInfo.canonical === '3'
      ? `${toArabicLabel(baseInfo.canonical, useArabicDigits)} تكعيب`
      : `${toArabicLabel(baseInfo.canonical, useArabicDigits)} أس ${spokenExpText}`;
  const spoken = spokenOverride
    ? formatMathDigits(spokenOverride, useArabicDigits)
    : defaultSpoken;

  const hasArabicDigitBase =
    useArabicDigits &&
    /[٠-٩]/.test(baseInfo.display) &&
    !baseInfo.display.trim().endsWith(')');
  const sup = hasArabicDigitBase ? null : toSuperscriptText(expInfo.canonical);
  const unicodeStr = sup
    ? `${baseInfo.display}${sup}`
    : `${baseInfo.display}^${expInfo.display}`;
  const asciiStr = `${baseInfo.display}^${expInfo.display}`;
  const latexStr = `${baseInfo.display}^{${expInfo.display}}`;

  const alternatives: MathAlternative[] = [
    {
      id: 'spoken',
      label: 'عربي',
      kind: 'spoken',
      insertText: spoken,
      previewText: spoken,
      isLtr: false,
    },
  ];

  if (!hasArabicDigitBase && sup) {
    alternatives.push({
      id: 'unicode',
      label: 'رمز',
      kind: 'unicode',
      insertText: unicodeStr,
      previewText: unicodeStr,
      isLtr: true,
    });
  }

  alternatives.push({
    id: 'ascii',
    label: 'نصي',
    kind: 'ascii',
    insertText: asciiStr,
    previewText: asciiStr,
    isLtr: true,
  });

  alternatives.push({
    id: 'katex',
    label: 'معادلة',
    kind: 'katex',
    insertText: `$${latexStr}$`,
    latex: latexStr,
    isLtr: true,
  });

  const effectiveSelectedKind =
    hasArabicDigitBase && selectedKind === 'unicode' ? 'katex' : selectedKind;
  const selectedAltId =
    alternatives.find((a) => a.kind === effectiveSelectedKind)?.id ||
    alternatives[0].id;
  return { canonicalKey, alternatives, selectedAltId };
}

type NestedExponentVariant =
  | 'spoken'
  | 'raw'
  | 'unicode_paren'
  | 'ascii_paren'
  | 'katex_paren'
  | 'ascii_tower'
  | 'katex_tower';

function buildNestedExponentAlternatives(
  baseRaw: string,
  exp1Raw: string,
  exp2Raw: string,
  selectedVariant: NestedExponentVariant,
  spokenOverride: string | undefined,
  rawKeepText: string | undefined,
  useArabicDigits: boolean
): {
  canonicalKey: string;
  alternatives: MathAlternative[];
  selectedAltId: string;
} {
  const baseInfo = resolveOperandForDisplay(baseRaw, useArabicDigits);
  const exp1Info = resolveOperandForDisplay(exp1Raw, useArabicDigits);
  const exp2Info = resolveOperandForDisplay(exp2Raw, useArabicDigits);
  const canonicalKey = `nexp:${baseInfo.canonical}:${exp1Info.canonical}:${exp2Info.canonical}`;

  const defaultSpoken = `(${toArabicLabel(baseInfo.canonical, useArabicDigits)} أس ${exp1Info.display}) أس ${exp2Info.display}`;
  const spoken = spokenOverride
    ? formatMathDigits(spokenOverride, useArabicDigits)
    : defaultSpoken;

  const latexParenStr = `(${baseInfo.display}^{${exp1Info.display}})^{${exp2Info.display}}`;
  const asciiParenStr = `(${baseInfo.display}^${exp1Info.display})^${exp2Info.display}`;
  const latexTowerStr = `${baseInfo.display}^{${exp1Info.display}^{${exp2Info.display}}}`;
  const asciiTowerStr = `${baseInfo.display}^${exp1Info.display}^${exp2Info.display}`;

  const alternatives: MathAlternative[] = [];

  if (rawKeepText && selectedVariant === 'raw') {
    alternatives.push({
      id: 'raw',
      label: 'نص',
      kind: 'ascii',
      insertText: rawKeepText,
      previewText: rawKeepText,
      isLtr: true,
    });
  }

  const sup1 = toSuperscriptText(exp1Info.canonical);
  const sup2 = toSuperscriptText(exp2Info.canonical);
  if (sup1 && sup2) {
    const unicodeStr = `(${baseInfo.display}${sup1})${sup2}`;
    alternatives.push({
      id: 'unicode_paren',
      label: 'رمز بقوس',
      kind: 'unicode',
      insertText: unicodeStr,
      previewText: unicodeStr,
      isLtr: true,
    });
  }

  alternatives.push(
    {
      id: 'katex_paren',
      label: 'معادلة بقوس',
      kind: 'katex',
      insertText: `$${latexParenStr}$`,
      latex: latexParenStr,
      isLtr: true,
    },
    {
      id: 'ascii_paren',
      label: 'نصي بقوس',
      kind: 'ascii',
      insertText: asciiParenStr,
      previewText: asciiParenStr,
      isLtr: true,
    },
    {
      id: 'katex_tower',
      label: 'معادلة',
      kind: 'katex',
      insertText: `$${latexTowerStr}$`,
      latex: latexTowerStr,
      isLtr: true,
    },
    {
      id: 'ascii_tower',
      label: 'نصي',
      kind: 'ascii',
      insertText: asciiTowerStr,
      previewText: asciiTowerStr,
      isLtr: true,
    },
    {
      id: 'spoken',
      label: 'عربي',
      kind: 'spoken',
      insertText: spoken,
      previewText: spoken,
      isLtr: false,
    }
  );

  const selectedAltId =
    alternatives.find((a) => a.id === selectedVariant)?.id || alternatives[0].id;
  return { canonicalKey, alternatives, selectedAltId };
}

function buildFractionAlternatives(
  numRaw: string,
  denRaw: string,
  spokenOverride: string | undefined,
  selectedKind: MathAlternative['kind'],
  useArabicDigits: boolean
): {
  canonicalKey: string;
  alternatives: MathAlternative[];
  selectedAltId: string;
} {
  const numInfo = resolveOperandForDisplay(numRaw, useArabicDigits);
  const denInfo = resolveOperandForDisplay(denRaw, useArabicDigits);
  const canonicalKey = `frac:${numInfo.canonical}:${denInfo.canonical}`;

  const spoken = spokenOverride
    ? formatMathDigits(spokenOverride, useArabicDigits)
    : `${toArabicLabel(numInfo.canonical, useArabicDigits)} على ${toArabicLabel(denInfo.canonical, useArabicDigits)}`;

  const slashStr = `${numInfo.display}/${denInfo.display}`;
  const vulgar = !useArabicDigits
    ? PAIR_TO_VULGAR_FRACTION[`${numInfo.canonical}/${denInfo.canonical}`]
    : undefined;
  const latexStr = `\\frac{${numInfo.display}}{${denInfo.display}}`;

  const alternatives: MathAlternative[] = [
    {
      id: 'spoken',
      label: 'عربي',
      kind: 'spoken',
      insertText: spoken,
      previewText: spoken,
      isLtr: false,
    },
  ];

  if (vulgar) {
    alternatives.push({
      id: 'unicode',
      label: 'رمز',
      kind: 'unicode',
      insertText: vulgar,
      previewText: vulgar,
      isLtr: true,
    });
  }

  alternatives.push({
    id: 'ascii',
    label: 'كسر سطري',
    kind: 'ascii',
    insertText: slashStr,
    previewText: slashStr,
    isLtr: true,
  });

  alternatives.push({
    id: 'katex',
    label: 'كسر عمودي',
    kind: 'katex',
    insertText: `$${latexStr}$`,
    latex: latexStr,
    isLtr: true,
  });

  const selectedAltId =
    alternatives.find((a) => a.kind === selectedKind)?.id ||
    alternatives.find((a) => a.kind === 'katex')?.id ||
    alternatives[0].id;
  return { canonicalKey, alternatives, selectedAltId };
}

function buildLogAlternatives(
  argRaw: string,
  baseRaw: string | undefined,
  spokenOverride: string | undefined,
  selectedKind: MathAlternative['kind'],
  useArabicDigits: boolean
): {
  canonicalKey: string;
  alternatives: MathAlternative[];
  selectedAltId: string;
} {
  const argInfo = resolveOperandForDisplay(argRaw, useArabicDigits);
  const baseInfo = baseRaw
    ? resolveOperandForDisplay(baseRaw, useArabicDigits)
    : null;
  const canonicalKey = `log:${baseInfo?.canonical || '10'}:${argInfo.canonical}`;

  const spoken = spokenOverride
    ? formatMathDigits(spokenOverride, useArabicDigits)
    : baseInfo
    ? `لوغاريتم ${toArabicLabel(argInfo.canonical, useArabicDigits)} للأساس ${baseInfo.display}`
    : `لوغاريتم ${toArabicLabel(argInfo.canonical, useArabicDigits)}`;

  const logName = useArabicDigits ? 'لو' : 'log';
  const sub = baseInfo ? toSubscriptText(baseInfo.canonical) : null;
  const unicodeStr = baseInfo
    ? sub
      ? `${logName}${sub}(${argInfo.display})`
      : `${logName}_${baseInfo.display}(${argInfo.display})`
    : `${logName}(${argInfo.display})`;
  const asciiStr = baseInfo
    ? `log_${baseInfo.display}(${argInfo.display})`
    : `log(${argInfo.display})`;
  const latexStr = baseInfo
    ? useArabicDigits
      ? `\\text{لو}_{${baseInfo.display}}(${argInfo.display})`
      : `\\log_{${baseInfo.display}}(${argInfo.display})`
    : useArabicDigits
    ? `\\text{لو}(${argInfo.display})`
    : `\\log(${argInfo.display})`;

  const alternatives: MathAlternative[] = [
    {
      id: 'spoken',
      label: 'عربي',
      kind: 'spoken',
      insertText: spoken,
      previewText: spoken,
      isLtr: false,
    },
    {
      id: 'unicode',
      label: 'رمز',
      kind: 'unicode',
      insertText: unicodeStr,
      previewText: unicodeStr,
      isLtr: !useArabicDigits,
    },
  ];

  if (asciiStr !== unicodeStr) {
    alternatives.push({
      id: 'ascii',
      label: 'نصي',
      kind: 'ascii',
      insertText: asciiStr,
      previewText: asciiStr,
      isLtr: true,
    });
  }

  alternatives.push({
    id: 'katex',
    label: 'معادلة',
    kind: 'katex',
    insertText: `$${latexStr}$`,
    latex: latexStr,
    isLtr: true,
  });

  const selectedAltId =
    alternatives.find((a) => a.kind === selectedKind)?.id || alternatives[0].id;
  return { canonicalKey, alternatives, selectedAltId };
}

function buildDerivativeAlternatives(
  numVarRaw: string,
  denVarRaw: string,
  spokenOverride: string | undefined,
  selectedKind: MathAlternative['kind'],
  useArabicDigits: boolean
): {
  canonicalKey: string;
  alternatives: MathAlternative[];
  selectedAltId: string;
} {
  const numCanonical = resolveMathOperand(numVarRaw || 'y');
  const denCanonical = resolveMathOperand(denVarRaw || 'x');
  const numDisplay = useArabicDigits ? toArabicLabel(numCanonical, true) : numCanonical;
  const denDisplay = useArabicDigits ? toArabicLabel(denCanonical, true) : denCanonical;

  const canonicalKey = `deriv:${numCanonical}:${denCanonical}`;
  const spoken = spokenOverride
    ? formatMathDigits(spokenOverride, useArabicDigits)
    : `مشتقة ${toArabicLabel(denCanonical, useArabicDigits)}`;

  const fracAscii = useArabicDigits
    ? `د${numDisplay}/د${denDisplay}`
    : `d${numDisplay}/d${denDisplay}`;
  const primeUnicode = useArabicDigits ? `ق'(${denDisplay})` : `f'(${denDisplay})`;
  const latexStr = useArabicDigits
    ? `\\frac{\\text{د}${numDisplay}}{\\text{د}${denDisplay}}`
    : `\\frac{d${numDisplay}}{d${denDisplay}}`;

  const alternatives: MathAlternative[] = [
    {
      id: 'spoken',
      label: 'عربي',
      kind: 'spoken',
      insertText: spoken,
      previewText: spoken,
      isLtr: false,
    },
    {
      id: 'ascii',
      label: useArabicDigits ? 'دص/دس' : 'dy/dx',
      kind: 'ascii',
      insertText: fracAscii,
      previewText: fracAscii,
      isLtr: !useArabicDigits,
    },
    {
      id: 'unicode',
      label: useArabicDigits ? "ق'(س)" : "f'(x)",
      kind: 'unicode',
      insertText: primeUnicode,
      previewText: primeUnicode,
      isLtr: !useArabicDigits,
    },
    {
      id: 'katex',
      label: 'معادلة',
      kind: 'katex',
      insertText: `$${latexStr}$`,
      latex: latexStr,
      isLtr: true,
    },
  ];

  const selectedAltId =
    alternatives.find((a) => a.kind === selectedKind)?.id || alternatives[0].id;
  return { canonicalKey, alternatives, selectedAltId };
}

function buildIntegralAlternatives(
  mode: 'definite' | 'indefinite',
  lowerRaw: string,
  upperRaw: string,
  integrandRaw: string,
  spokenOverride: string | undefined,
  selectedKind: MathAlternative['kind'],
  useArabicDigits: boolean
): {
  canonicalKey: string;
  alternatives: MathAlternative[];
  selectedAltId: string;
} {
  if (mode === 'definite') {
    const lowInfo = resolveOperandForDisplay(lowerRaw, useArabicDigits);
    const upInfo = resolveOperandForDisplay(upperRaw, useArabicDigits);
    const bodyClean = unwrapTexText(integrandRaw || '').trim();
    const bodyDisplay = formatMathDigits(bodyClean, useArabicDigits);
    const canonicalKey = `int:def:${lowInfo.canonical}:${upInfo.canonical}:${bodyClean}`;

    const spoken = spokenOverride
      ? formatMathDigits(spokenOverride, useArabicDigits)
      : `تكامل من ${lowInfo.display} إلى ${upInfo.display}${bodyDisplay ? ` ${bodyDisplay}` : ''}`;

    const lowSub = toSubscriptText(lowInfo.canonical) ?? `_${lowInfo.display}`;
    const upSup = toSuperscriptText(upInfo.canonical) ?? `^${upInfo.display}`;
    const diffVar = useArabicDigits ? 'دس' : 'dx';
    const unicodeStr = bodyDisplay
      ? `∫${lowSub}${upSup} ${bodyDisplay} ${diffVar}`
      : `∫${lowSub}${upSup} ${diffVar}`;
    const asciiStr = bodyDisplay
      ? `int_${lowInfo.display}^${upInfo.display} ${bodyDisplay} ${diffVar}`
      : `int_${lowInfo.display}^${upInfo.display} ${diffVar}`;
    const latexBody = bodyDisplay
      ? ` ${bodyDisplay.replace(/\^([0-9٠-٩a-zA-Zسصع]+)/g, '^{$1}')}\\,${diffVar}`
      : `\\,${diffVar}`;
    const latexStr = `\\int_{${lowInfo.display}}^{${upInfo.display}}${latexBody}`;

    const alternatives: MathAlternative[] = [
      {
        id: 'spoken',
        label: 'عربي',
        kind: 'spoken',
        insertText: spoken,
        previewText: spoken,
        isLtr: false,
      },
      {
        id: 'unicode',
        label: 'رمز',
        kind: 'unicode',
        insertText: unicodeStr,
        previewText: unicodeStr,
        isLtr: true,
      },
      {
        id: 'ascii',
        label: 'نصي',
        kind: 'ascii',
        insertText: asciiStr,
        previewText: asciiStr,
        isLtr: true,
      },
      {
        id: 'katex',
        label: 'معادلة',
        kind: 'katex',
        insertText: `$${latexStr}$`,
        latex: latexStr,
        isLtr: true,
      },
    ];
    const selectedAltId =
      alternatives.find((a) => a.kind === selectedKind)?.id || alternatives[0].id;
    return { canonicalKey, alternatives, selectedAltId };
  }

  // Indefinite integral
  const cleanBody = unwrapTexText(integrandRaw).trim() || (useArabicDigits ? 'س' : 'x');
  let exprUnicode = cleanBody;
  let exprAscii = cleanBody;
  let exprLatex = cleanBody;

  const sqMatch = new RegExp(`^(${OPERAND_TOKEN})\\s+تربيع$`).exec(cleanBody);
  const cuMatch = new RegExp(`^(${OPERAND_TOKEN})\\s+تكعيب$`).exec(cleanBody);
  if (sqMatch) {
    const vInfo = resolveOperandForDisplay(sqMatch[1], useArabicDigits);
    const two = formatMathDigits('2', useArabicDigits);
    exprUnicode = `${vInfo.display}²`;
    exprAscii = `${vInfo.display}^${two}`;
    exprLatex = `${vInfo.display}^{${two}}`;
  } else if (cuMatch) {
    const vInfo = resolveOperandForDisplay(cuMatch[1], useArabicDigits);
    const three = formatMathDigits('3', useArabicDigits);
    exprUnicode = `${vInfo.display}³`;
    exprAscii = `${vInfo.display}^${three}`;
    exprLatex = `${vInfo.display}^{${three}}`;
  } else {
    const formatted = formatMathDigits(cleanBody, useArabicDigits);
    exprUnicode = formatted
      .replace(/\^[2٢]/g, '²')
      .replace(/\^[3٣]/g, '³');
    exprAscii = formatted.replace(/²/g, `^${formatMathDigits('2', useArabicDigits)}`).replace(/³/g, `^${formatMathDigits('3', useArabicDigits)}`);
    exprLatex = exprAscii.replace(/\^([0-9٠-٩a-zA-Zسصع]+)/g, '^{$1}');
  }

  const canonicalKey = `int:indef:${toLatinDigits(exprAscii)}`;
  const spoken = spokenOverride
    ? formatMathDigits(spokenOverride, useArabicDigits)
    : `تكامل ${toArabicLabel(exprAscii.replace(/\^[2٢3٣]/g, ''), useArabicDigits)}${
        /\^[2٢]$/.test(exprAscii)
          ? ' تربيع'
          : /\^[3٣]$/.test(exprAscii)
          ? ' تكعيب'
          : ''
      }`;

  const diffVar = useArabicDigits ? 'دس' : 'dx';
  const unicodeStr = `∫ ${exprUnicode} ${diffVar}`;
  const asciiStr = `int(${exprAscii}) ${diffVar}`;
  const latexStr = `\\int ${exprLatex}\\,${diffVar}`;

  const alternatives: MathAlternative[] = [
    {
      id: 'spoken',
      label: 'عربي',
      kind: 'spoken',
      insertText: spoken,
      previewText: spoken,
      isLtr: false,
    },
    {
      id: 'unicode',
      label: 'رمز',
      kind: 'unicode',
      insertText: unicodeStr,
      previewText: unicodeStr,
      isLtr: true,
    },
    {
      id: 'ascii',
      label: 'نصي',
      kind: 'ascii',
      insertText: asciiStr,
      previewText: asciiStr,
      isLtr: true,
    },
    {
      id: 'katex',
      label: 'معادلة',
      kind: 'katex',
      insertText: `$${latexStr}$`,
      latex: latexStr,
      isLtr: true,
    },
  ];
  const selectedAltId =
    alternatives.find((a) => a.kind === selectedKind)?.id || alternatives[0].id;
  return { canonicalKey, alternatives, selectedAltId };
}

function buildRootAlternatives(
  radicandRaw: string,
  indexRaw: string | undefined,
  spokenOverride: string | undefined,
  selectedKind: MathAlternative['kind'],
  useArabicDigits: boolean
): {
  canonicalKey: string;
  alternatives: MathAlternative[];
  selectedAltId: string;
} {
  const radInfo = resolveOperandForDisplay(radicandRaw, useArabicDigits);
  const idxInfo = indexRaw
    ? resolveOperandForDisplay(indexRaw, useArabicDigits)
    : null;
  const idxCanonical = idxInfo?.canonical || '2';

  const canonicalKey = `root:${idxCanonical}:${radInfo.canonical}`;
  const spoken = spokenOverride
    ? formatMathDigits(spokenOverride, useArabicDigits)
    : idxCanonical === '3'
    ? `الجذر التكعيبي لـ ${toArabicLabel(radInfo.canonical, useArabicDigits)}`
    : idxCanonical !== '2'
    ? `الجذر الـ ${idxInfo?.display} لـ ${toArabicLabel(radInfo.canonical, useArabicDigits)}`
    : `جذر ${toArabicLabel(radInfo.canonical, useArabicDigits)}`;

  const unicodeStr =
    idxCanonical === '3'
      ? `∛${radInfo.display}`
      : idxCanonical !== '2'
      ? `${toSuperscriptText(idxCanonical) ?? idxInfo?.display}√${radInfo.display}`
      : `√${radInfo.display}`;
  const asciiStr =
    idxCanonical === '3'
      ? `cbrt(${radInfo.display})`
      : idxCanonical !== '2'
      ? `root(${idxInfo?.display}, ${radInfo.display})`
      : `sqrt(${radInfo.display})`;
  const latexStr =
    idxCanonical !== '2' && idxInfo
      ? `\\sqrt[${idxInfo.display}]{${radInfo.display}}`
      : `\\sqrt{${radInfo.display}}`;

  const alternatives: MathAlternative[] = [
    {
      id: 'spoken',
      label: 'عربي',
      kind: 'spoken',
      insertText: spoken,
      previewText: spoken,
      isLtr: false,
    },
    {
      id: 'unicode',
      label: 'رمز',
      kind: 'unicode',
      insertText: unicodeStr,
      previewText: unicodeStr,
      isLtr: true,
    },
    {
      id: 'ascii',
      label: 'نصي',
      kind: 'ascii',
      insertText: asciiStr,
      previewText: asciiStr,
      isLtr: true,
    },
    {
      id: 'katex',
      label: 'جذر معادلة',
      kind: 'katex',
      insertText: `$${latexStr}$`,
      latex: latexStr,
      isLtr: true,
    },
  ];

  const selectedAltId =
    alternatives.find((a) => a.kind === selectedKind)?.id || alternatives[0].id;
  return { canonicalKey, alternatives, selectedAltId };
}

function buildLimitAlternatives(
  varRaw: string,
  targetRaw: string,
  spokenOverride: string | undefined,
  selectedKind: MathAlternative['kind'],
  useArabicDigits: boolean
): {
  canonicalKey: string;
  alternatives: MathAlternative[];
  selectedAltId: string;
} {
  const varInfo = resolveOperandForDisplay(varRaw, useArabicDigits);
  const targetInfo = resolveOperandForDisplay(targetRaw, useArabicDigits);
  const canonicalKey = `lim:${varInfo.canonical}:${targetInfo.canonical}`;

  const spoken = spokenOverride
    ? formatMathDigits(spokenOverride, useArabicDigits)
    : `غاية ${toArabicLabel(varInfo.canonical, useArabicDigits)} تقترب من ${targetInfo.display}`;

  const unicodeStr = `${useArabicDigits ? 'غا' : 'lim'}(${varInfo.display}→${targetInfo.display})`;
  const asciiStr = `lim_${varInfo.display}->${targetInfo.display}`;
  const latexStr = useArabicDigits
    ? `\\lim_{${varInfo.display} \\to ${targetInfo.display}}`
    : `\\lim_{${varInfo.display} \\to ${targetInfo.display}}`;

  const alternatives: MathAlternative[] = [
    {
      id: 'spoken',
      label: 'عربي',
      kind: 'spoken',
      insertText: spoken,
      previewText: spoken,
      isLtr: false,
    },
    {
      id: 'unicode',
      label: 'رمز',
      kind: 'unicode',
      insertText: unicodeStr,
      previewText: unicodeStr,
      isLtr: !useArabicDigits,
    },
    {
      id: 'ascii',
      label: 'نصي',
      kind: 'ascii',
      insertText: asciiStr,
      previewText: asciiStr,
      isLtr: true,
    },
    {
      id: 'katex',
      label: 'معادلة',
      kind: 'katex',
      insertText: `$${latexStr}$`,
      latex: latexStr,
      isLtr: true,
    },
  ];

  const selectedAltId =
    alternatives.find((a) => a.kind === selectedKind)?.id || alternatives[0].id;
  return { canonicalKey, alternatives, selectedAltId };
}

function buildTrigAlternatives(
  fnEn: 'sin' | 'cos' | 'tan',
  argRaw: string,
  spokenOverride: string | undefined,
  selectedKind: MathAlternative['kind'],
  useArabicDigits: boolean
): {
  canonicalKey: string;
  alternatives: MathAlternative[];
  selectedAltId: string;
} {
  const argInfo = resolveOperandForDisplay(argRaw, useArabicDigits);
  const arFn = fnEn === 'sin' ? 'جا' : fnEn === 'cos' ? 'جتا' : 'ظا';
  const canonicalKey = `trig:${fnEn}:${argInfo.canonical}`;

  const spoken = spokenOverride
    ? formatMathDigits(spokenOverride, useArabicDigits)
    : `${arFn} ${toArabicLabel(argInfo.canonical, useArabicDigits)}`;
  const unicodeStr = `${arFn}(${argInfo.display})`;
  const asciiStr = `${fnEn}(${argInfo.display})`;
  const latexStr = useArabicDigits
    ? `\\text{${arFn}}(${argInfo.display})`
    : `\\${fnEn}(${argInfo.display})`;

  const alternatives: MathAlternative[] = [
    {
      id: 'spoken',
      label: 'عربي',
      kind: 'spoken',
      insertText: spoken,
      previewText: spoken,
      isLtr: false,
    },
    {
      id: 'unicode',
      label: arFn,
      kind: 'unicode',
      insertText: unicodeStr,
      previewText: unicodeStr,
      isLtr: false,
    },
    {
      id: 'ascii',
      label: fnEn,
      kind: 'ascii',
      insertText: asciiStr,
      previewText: asciiStr,
      isLtr: true,
    },
    {
      id: 'katex',
      label: 'معادلة',
      kind: 'katex',
      insertText: `$${latexStr}$`,
      latex: latexStr,
      isLtr: true,
    },
  ];

  const selectedAltId =
    alternatives.find((a) => a.kind === selectedKind)?.id || alternatives[0].id;
  return { canonicalKey, alternatives, selectedAltId };
}

/**
 * Extensible Dictionary of Math Pattern Rules tailored for the Iraqi Mathematics Curriculum.
 * Order matters: higher-specificity composite expressions come before simpler sub-expressions.
 */
export const MATH_PATTERN_RULES: MathPatternRule[] = [
  // 1. Definite & Indefinite Integrals (التكامل)
  {
    id: 'integral',
    category: 'integral',
    titleAr: 'التكامل',
    patterns: [
      // [0] Arabic definite integral: تكامل من 0 إلى 5
      new RegExp(
        `تكامل\\s+من\\s+(${OPERAND_TOKEN})\\s+(?:إلى|الى)\\s+(${OPERAND_TOKEN})(?:\\s+(?:لـ|ل)?\\s*(${OPERAND_TOKEN}))?`,
        'g'
      ),
      // [1] Arabic indefinite integral: تكامل س تربيع
      new RegExp(
        `تكامل\\s+(${OPERAND_TOKEN}(?:\\s+(?:تربيع|تكعيب))?|[a-zA-Z0-9٠-٩سصع]+\\^[0-9٠-٩a-zA-Zسصع]+)`,
        'g'
      ),
      // [2] KaTeX definite integral: $\int_{0}^{5}\,dx$ or $\int_{٠}^{٥}\,دس$
      new RegExp(
        `\\$\\\\int_\\{(${BRACE_CONTENT})\\}\\^\\{(${BRACE_CONTENT})\\}(?:\\s*([^$\\\\]*?))?(?:\\\\,?(?:dx|دس))?\\$`,
        'g'
      ),
      // [3] KaTeX indefinite integral: $\int x^{2}\,dx$
      /\$\\int\s+([^$]+?)(?:\\,?(?:dx|دس))?\$/g,
      // [4] Unicode definite integral: ∫₀⁵ dx
      /∫([₀-₉ₙₓ]+)([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+)(?:\s+([^\s،؟.!]+))?\s*(?:dx|دس)/g,
      // [5] Unicode indefinite integral: ∫ x² dx
      /∫\s*([a-zA-Z0-9٠-٩سصع⁰¹²³⁴⁵⁶⁷⁸⁹^]+)\s*(?:dx|دس)/g,
      // [6] ASCII definite integral: int_0^5 dx
      /\bint_([a-zA-Z0-9٠-٩سصع]+)\^([a-zA-Z0-9٠-٩سصع]+)(?:\s+([a-zA-Z0-9٠-٩سصع^]+))?\s*(?:dx|دس)\b/g,
      // [7] ASCII indefinite integral: int(x^2) dx
      /\bint\(([^)]+)\)\s*(?:dx|دس)\b/g,
    ],
    buildAlternatives: (match, pIdx, sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      const isDefinite = pIdx === 0 || pIdx === 2 || pIdx === 4 || pIdx === 6;
      if (isDefinite) {
        let lower = match[1];
        let upper = match[2];
        const body = match[3] || '';
        if (pIdx === 4) {
          lower = fromSubscriptText(lower);
          upper = fromSuperscriptText(upper);
        }
        const canonical = `int:def:${resolveMathOperand(lower)}:${resolveMathOperand(upper)}:${unwrapTexText(body)}`;
        const rememberedSpoken = sourceMemory?.get(canonical);
        const kind: MathAlternative['kind'] =
          pIdx === 0
            ? 'spoken'
            : pIdx === 2
            ? 'katex'
            : pIdx === 4
            ? 'unicode'
            : 'ascii';
        if (pIdx === 0) sourceMemory?.set(canonical, match[0]);
        return buildIntegralAlternatives(
          'definite',
          lower,
          upper,
          body,
          pIdx === 0 ? match[0] : rememberedSpoken,
          kind,
          useArabic
        );
      }

      const integrand = match[1];
      const kind: MathAlternative['kind'] =
        pIdx === 1
          ? 'spoken'
          : pIdx === 3
          ? 'katex'
          : pIdx === 5
          ? 'unicode'
          : 'ascii';
      const built = buildIntegralAlternatives(
        'indefinite',
        '',
        '',
        integrand,
        pIdx === 1 ? match[0] : undefined,
        kind,
        useArabic
      );
      if (pIdx === 1) {
        sourceMemory?.set(built.canonicalKey, match[0]);
      } else {
        const mem = sourceMemory?.get(built.canonicalKey);
        if (mem) {
          built.alternatives[0].insertText = formatMathDigits(mem, useArabic);
          built.alternatives[0].previewText = formatMathDigits(mem, useArabic);
        }
      }
      return built;
    },
  },

  // 2. Limits (الغايات / النهايات)
  {
    id: 'limit',
    category: 'limit',
    titleAr: 'الغاية',
    patterns: [
      // [0] Arabic: غاية س تقترب من 0 / نهاية س تقترب من ٢
      new RegExp(
        `(?:غاية|نهاية)\\s+(${OPERAND_TOKEN})\\s+(?:تقترب\\s+من|تؤول\\s+إلى|تؤول\\s+الى)\\s+(${OPERAND_TOKEN})`,
        'g'
      ),
      // [1] KaTeX: $\lim_{x \to 0}$
      new RegExp(
        `\\$\\\\lim_\\{\\s*(${BRACE_CONTENT})\\s*\\\\to\\s*(${BRACE_CONTENT})\\s*\\}\\$`,
        'g'
      ),
      // [2] Unicode: غا(س→٠) or lim(x→0)
      /(?:غا|lim)\(([a-zA-Zسصع])→([a-zA-Z0-9٠-٩∞]+)\)/g,
      // [3] ASCII: lim_x->0
      /\blim_([a-zA-Zسصع])->([a-zA-Z0-9٠-٩]+)\b/g,
    ],
    buildAlternatives: (match, pIdx, sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      const kind: MathAlternative['kind'] =
        pIdx === 0
          ? 'spoken'
          : pIdx === 1
          ? 'katex'
          : pIdx === 2
          ? 'unicode'
          : 'ascii';
      const built = buildLimitAlternatives(
        match[1],
        match[2],
        pIdx === 0 ? match[0] : undefined,
        kind,
        useArabic
      );
      if (pIdx === 0) {
        sourceMemory?.set(built.canonicalKey, match[0]);
      } else {
        const mem = sourceMemory?.get(built.canonicalKey);
        if (mem) {
          built.alternatives[0].insertText = formatMathDigits(mem, useArabic);
          built.alternatives[0].previewText = formatMathDigits(mem, useArabic);
        }
      }
      return built;
    },
  },

  // 3. Logarithms (اللوغاريتمات)
  {
    id: 'logarithm',
    category: 'logarithm',
    titleAr: 'اللوغاريتمات',
    patterns: [
      // [0] Arabic with base: لوغاريتم س للأساس 2
      new RegExp(
        `(?:لوغاريتم|لو)\\s+(${OPERAND_TOKEN})\\s+(?:للأساس|للاساس|أساس)\\s+(${OPERAND_TOKEN})`,
        'g'
      ),
      // [1] Arabic base 10: لوغاريتم س
      new RegExp(`(?:لوغاريتم|لو)\\s+(${OPERAND_TOKEN})`, 'g'),
      // [2] KaTeX: $\log_{2}(x)$ or $\text{لو}_{٢}(س)$
      new RegExp(
        `\\$(?:\\\\log|\\\\text\\{لو\\})(?:_\\{(${BRACE_CONTENT})\\})?\\(([^$)]+)\\)\\$`,
        'g'
      ),
      // [3] Unicode subscript: log₂(x) or لو₂(س)
      /(?:log|لو)([₀-₉ₙₓ]+)\(([^)]+)\)/g,
      // [4] ASCII: log_2(x) or log(x)
      /\blog(?:_([a-zA-Z0-9٠-٩سصع]+))?\(([^)]+)\)/g,
    ],
    buildAlternatives: (match, pIdx, sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      let arg = '';
      let base: string | undefined;
      if (pIdx === 0) {
        arg = match[1];
        base = match[2];
      } else if (pIdx === 1) {
        arg = match[1];
      } else if (pIdx === 2) {
        base = match[1];
        arg = match[2];
      } else if (pIdx === 3) {
        base = fromSubscriptText(match[1]);
        arg = match[2];
      } else {
        base = match[1];
        arg = match[2];
      }
      const kind: MathAlternative['kind'] =
        pIdx === 0 || pIdx === 1
          ? 'spoken'
          : pIdx === 2
          ? 'katex'
          : pIdx === 3
          ? 'unicode'
          : 'ascii';

      const built = buildLogAlternatives(
        arg,
        base,
        pIdx === 0 || pIdx === 1 ? match[0] : undefined,
        kind,
        useArabic
      );
      if (pIdx === 0 || pIdx === 1) {
        sourceMemory?.set(built.canonicalKey, match[0]);
      } else {
        const mem = sourceMemory?.get(built.canonicalKey);
        if (mem) {
          built.alternatives[0].insertText = formatMathDigits(mem, useArabic);
          built.alternatives[0].previewText = formatMathDigits(mem, useArabic);
        }
      }
      return built;
    },
  },

  // 4. Derivatives (التفاضل والمشتقات)
  {
    id: 'derivative',
    category: 'derivative',
    titleAr: 'التفاضل',
    patterns: [
      // [0] Arabic: دي واي على دي إكس / د ص على د س
      /(?:دي\s+(?:واي|ص)\s+على\s+دي\s+(?:إكس|اكس|س)|د\s*ص\s+على\s+د\s*س)/g,
      // [1] Arabic: مشتقة س / مشتقة ص
      new RegExp(`مشتقة\\s+(${OPERAND_TOKEN})`, 'g'),
      // [2] KaTeX: $\frac{dy}{dx}$ or $\frac{\text{د}ص}{\text{د}س}$
      /\$\\frac\{(?:\\text\{د\}|d)([a-zA-Zسصع])\}\{(?:\\text\{د\}|d)([a-zA-Zسصع])\}\$/g,
      // [3] ASCII/Arabic fraction: dy/dx or دص/دس
      /(?:\bd([a-zA-Z])\/d([a-zA-Z])\b|د([سصع])\/د([سصع]))/g,
      // [4] Prime notation: f'(x) or ق'(س)
      /(?:\bf'\(([a-zA-Z])\)|ق'\(([سصع])\))/g,
    ],
    buildAlternatives: (match, pIdx, sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      let numVar = 'y';
      let denVar = 'x';
      if (pIdx === 1) {
        denVar = resolveMathOperand(match[1]);
        numVar = denVar === 'y' ? 'z' : 'y';
      } else if (pIdx === 2) {
        numVar = match[1];
        denVar = match[2];
      } else if (pIdx === 3) {
        numVar = match[1] || match[3];
        denVar = match[2] || match[4];
      } else if (pIdx === 4) {
        denVar = match[1] || match[2];
      }
      const kind: MathAlternative['kind'] =
        pIdx === 0 || pIdx === 1
          ? 'spoken'
          : pIdx === 2
          ? 'katex'
          : pIdx === 4
          ? 'unicode'
          : 'ascii';
      const built = buildDerivativeAlternatives(
        numVar,
        denVar,
        pIdx === 0 || pIdx === 1 ? match[0] : undefined,
        kind,
        useArabic
      );
      if (pIdx === 0 || pIdx === 1) {
        sourceMemory?.set(built.canonicalKey, match[0]);
      } else {
        const mem = sourceMemory?.get(built.canonicalKey);
        if (mem) {
          built.alternatives[0].insertText = formatMathDigits(mem, useArabic);
          built.alternatives[0].previewText = formatMathDigits(mem, useArabic);
        }
      }
      return built;
    },
  },

  // 5. Roots: Square, Cube, and Nth Roots (الجذور التربيعية والتكعيبية)
  {
    id: 'root',
    category: 'root',
    titleAr: 'الجذور',
    patterns: [
      // [0] Arabic cube root: الجذر التكعيبي لـ 8 | جذر تكعيبي ٢٧
      new RegExp(`(?:ال)?جذر\\s+(?:ال)?تكعيبي\\s+(?:لـ|ل)?\\s*(${OPERAND_TOKEN})`, 'g'),
      // [1] Arabic square root: الجذر التربيعي لـ س | جذر التربيعي 25 | جذر ٢٥
      new RegExp(`(?:(?:ال)?جذر\\s+(?:ال)?تربيعي\\s+(?:لـ|ل)?\\s*|جذر\\s+(?:لـ|ل)?\\s*)(${OPERAND_TOKEN})`, 'g'),
      // [2] KaTeX nth/cube root: $\sqrt[3]{8}$ or $\sqrt[٣]{٨}$
      new RegExp(`\\$\\\\sqrt\\[([^$\\]]+)\\]\\{(${BRACE_CONTENT})\\}\\$`, 'g'),
      // [3] KaTeX square root: $\sqrt{25}$ or $\sqrt{\text{٢٥}}$
      new RegExp(`\\$\\\\sqrt\\{(${BRACE_CONTENT})\\}\\$`, 'g'),
      // [4] Unicode cube root: ∛8 or ∛٢٧
      /∛([a-zA-Z0-9٠-٩سصعأابنمقلك]+)/g,
      // [5] Unicode square root: √25 or √٢٥ or √س
      /√([a-zA-Z0-9٠-٩سصعأابنمقلك]+)/g,
      // [6] ASCII cbrt: cbrt(8)
      /\bcbrt\(([^)]+)\)/g,
      // [7] ASCII sqrt: sqrt(25)
      /\bsqrt\(([^)]+)\)/g,
    ],
    buildAlternatives: (match, pIdx, sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      const isCubeOrNth = pIdx === 0 || pIdx === 2 || pIdx === 4 || pIdx === 6;
      const indexRaw =
        pIdx === 2 ? match[1] : isCubeOrNth ? '3' : undefined;
      const radicandRaw = pIdx === 2 ? match[2] : match[1];

      const kind: MathAlternative['kind'] =
        pIdx === 0 || pIdx === 1
          ? 'spoken'
          : pIdx === 2 || pIdx === 3
          ? 'katex'
          : pIdx === 4 || pIdx === 5
          ? 'unicode'
          : 'ascii';

      const built = buildRootAlternatives(
        radicandRaw,
        indexRaw,
        pIdx === 0 || pIdx === 1 ? match[0] : undefined,
        kind,
        useArabic
      );
      if (pIdx === 0 || pIdx === 1) {
        sourceMemory?.set(built.canonicalKey, match[0]);
      } else {
        const mem = sourceMemory?.get(built.canonicalKey);
        if (mem) {
          built.alternatives[0].insertText = formatMathDigits(mem, useArabic);
          built.alternatives[0].previewText = formatMathDigits(mem, useArabic);
        }
      }
      return built;
    },
  },

  // 6. Fractions (الكسور الاعتيادية)
  {
    id: 'fraction',
    category: 'fraction',
    titleAr: 'الكسور',
    patterns: [
      // [0] Arabic: واحد على اثنين | س على ص | ٣ على ٤
      new RegExp(`(${OPERAND_TOKEN})\\s+على\\s+(${OPERAND_TOKEN})`, 'g'),
      // [1] KaTeX: $\frac{1}{2}$ or $\frac{\text{١}}{\text{٢}}$
      new RegExp(`\\$\\\\frac\\{(${BRACE_CONTENT})\\}\\{(${BRACE_CONTENT})\\}\\$`, 'g'),
      // [2] Unicode vulgar fraction: ½ ¼ ¾
      /([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g,
      // [3] ASCII/Arabic slash fraction: 1/2, ١/٢, x/y, س/ص (avoid dates like 2025/2026)
      /(?<![\d٠-٩/])([a-zA-Z0-9٠-٩سصعأابنمقلك]{1,3})\/([a-zA-Z0-9٠-٩سصعأابنمقلك]{1,3})(?![\d٠-٩/])/g,
    ],
    buildAlternatives: (match, pIdx, sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      let num = match[1];
      let den = match[2] || '';
      if (pIdx === 2) {
        const pair = VULGAR_FRACTIONS[match[1]];
        if (!pair) return null;
        [num, den] = pair;
      }
      const kind: MathAlternative['kind'] =
        pIdx === 0
          ? 'spoken'
          : pIdx === 1
          ? 'katex'
          : pIdx === 2
          ? 'unicode'
          : 'ascii';
      const built = buildFractionAlternatives(
        num,
        den,
        pIdx === 0 ? match[0] : undefined,
        kind,
        useArabic
      );
      if (pIdx === 0) {
        sourceMemory?.set(built.canonicalKey, match[0]);
      } else {
        const mem = sourceMemory?.get(built.canonicalKey);
        if (mem) {
          built.alternatives[0].insertText = formatMathDigits(mem, useArabic);
          built.alternatives[0].previewText = formatMathDigits(mem, useArabic);
        }
      }
      return built;
    },
  },

  // 7. Trigonometric Functions (الدوال المثلثية - جا / جتا / ظا و sin / cos / tan)
  {
    id: 'trig',
    category: 'trig',
    titleAr: 'الدوال المثلثية',
    patterns: [
      // [0] Arabic trig: جا س | جتا ٣٠ | ظا θ
      new RegExp(`(جا|جتا|ظا)\\s+(${OPERAND_TOKEN}|θ|α|β)`, 'g'),
      // [1] KaTeX trig: $\sin(x)$ or $\text{جا}(س)$
      /\$\\(sin|cos|tan)\(([^$)]+)\)\$/g,
      // [2] KaTeX Arabic trig: $\text{جا}(س)$
      /\$\\text\{(جا|جتا|ظا)\}\(([^$)]+)\)\$/g,
      // [3] ASCII trig: sin(x), cos(30), tan(x)
      /\b(sin|cos|tan)\(([^)]+)\)/g,
    ],
    buildAlternatives: (match, pIdx, sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      const fnToken = match[1];
      const fnEn: 'sin' | 'cos' | 'tan' =
        fnToken === 'جا' || fnToken === 'sin'
          ? 'sin'
          : fnToken === 'جتا' || fnToken === 'cos'
          ? 'cos'
          : 'tan';
      const arg = match[2];
      const kind: MathAlternative['kind'] =
        pIdx === 0
          ? 'spoken'
          : pIdx === 1 || pIdx === 2
          ? 'katex'
          : 'ascii';

      const built = buildTrigAlternatives(
        fnEn,
        arg,
        pIdx === 0 ? match[0] : undefined,
        kind,
        useArabic
      );
      if (pIdx === 0) {
        sourceMemory?.set(built.canonicalKey, match[0]);
      } else {
        const mem = sourceMemory?.get(built.canonicalKey);
        if (mem) {
          built.alternatives[0].insertText = formatMathDigits(mem, useArabic);
          built.alternatives[0].previewText = formatMathDigits(mem, useArabic);
        }
      }
      return built;
    },
  },

  // 8. Nested Exponents / Power-on-Power (أس على أس: (2³)⁵ أو 2³ اس 5 أو $2^{3}$ اس 5 أو 2 اس 3 اس 5)
  {
    id: 'nested_exponent',
    category: 'exponent',
    titleAr: 'أس على أس',
    patterns: [
      // [0] KaTeX parenthesized: $(٥^{٢})^{٢}$ or $(5^{2})^{2}$
      new RegExp(
        `\\$\\(\\s*(${BRACE_CONTENT})\\^\\{(${BRACE_CONTENT})\\}\\s*\\)\\^\\{(${BRACE_CONTENT})\\}\\$`,
        'g'
      ),
      // [1] Hybrid KaTeX inner (with or without outer parens) + outer power:
      // ($٥^{٢}$) اس 3 | $2^{3}$ اس 5 | $2^{3}$^5 | $2^{3}$⁵ | $2^{3}$5
      new RegExp(
        `(?:\\(\\s*\\$(${BRACE_CONTENT})\\^\\{(${BRACE_CONTENT})\\}\\$\\s*\\)|\\$(${BRACE_CONTENT})\\^\\{(${BRACE_CONTENT})\\}\\$)(?:\\s*(?:\\^\\{(${BRACE_CONTENT})\\}|\\^(${OPERAND_TOKEN})|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+)|(تربيع|تكعيب)|(?:أس|اس|قوة)\\s+(${OPERAND_TOKEN}))|([0-9٠-٩]+))`,
        'g'
      ),
      // [2] KaTeX power tower: $٥^{٢^{٣}}$ or $5^{2^{3}}$
      /\$([a-zA-Z0-9٠-٩سصعأابنمقلك\\text{}]+)\^\{([^{}$]+)\^\{([^{}$]+)\}\}\$/g,
      // [3] ASCII/Unicode parenthesized + symbolic or spoken outer: (٥²) اس 3 | (٥^٢) تكعيب | (5^2)^2 | (2³)⁵
      new RegExp(
        `\\(\\s*([a-zA-Z0-9٠-٩سصعأابنمقلك]+)\\s*(?:\\^([a-zA-Z0-9٠-٩سصعأابنمقلك]+)|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+))\\s*\\)\\s*(?:\\^\\{(${BRACE_CONTENT})\\}|\\^(${OPERAND_TOKEN})|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+)|(تربيع|تكعيب)|(?:أس|اس|قوة)\\s+(${OPERAND_TOKEN}))`,
        'g'
      ),
      // [4] Unparenthesized base+exp1 + outer power: 5^2^3 | 2^3 اس 5 | 2³^5 | 2³ اس 5 | 2³اس 5 | 2³ تربيع | 2³ ⁵ | 2³5
      new RegExp(
        `([a-zA-Z0-9٠-٩سصعأابنمقلك]+)(?:\\^([a-zA-Z0-9٠-٩سصعأابنمقلك]+)(?:\\s*(?:\\^(${OPERAND_TOKEN})|(تربيع|تكعيب)|(?:أس|اس|قوة)\\s+(${OPERAND_TOKEN})))|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+)(?:\\s*(?:\\^(${OPERAND_TOKEN})|(تربيع|تكعيب)|(?:أس|اس|قوة)\\s+(${OPERAND_TOKEN}))|\\s+([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+)|([0-9٠-٩]+)))`,
        'g'
      ),
      // [5] Spoken Arabic inside parens + outer spoken/symbolic: (٥ تربيع) اس ٢ | (٥ أس ٢)^3 | (٥ تربيع)³
      new RegExp(
        `\\(\\s*(${OPERAND_TOKEN})\\s+(?:(تربيع|تكعيب)|(?:أس|اس|قوة)\\s+(${OPERAND_TOKEN}))\\s*\\)\\s*(?:(تربيع|تكعيب)|(?:أس|اس|قوة)\\s+(${OPERAND_TOKEN})|\\^(${OPERAND_TOKEN})|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+))`,
        'g'
      ),
      // [6] Spoken Arabic chained powers without parens: 2 اس 3 اس 5 | 2 تربيع اس 5 | 2 اس 3 تكعيب
      new RegExp(
        `(${OPERAND_TOKEN})\\s+(?:(تربيع|تكعيب)|(?:أس|اس|قوة)\\s+(${OPERAND_TOKEN}))\\s+(?:(تربيع|تكعيب)|(?:أس|اس|قوة)\\s+(${OPERAND_TOKEN}))`,
        'g'
      ),
    ],
    buildAlternatives: (match, pIdx, sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      let base = '';
      let exp1 = '';
      let exp2 = '';
      let selectedVariant: NestedExponentVariant = 'katex_paren';
      let isSpokenInput = false;
      let rawKeepText: string | undefined;

      if (pIdx === 0) {
        base = match[1];
        exp1 = match[2];
        exp2 = match[3];
        selectedVariant = 'katex_paren';
      } else if (pIdx === 1) {
        base = match[1] || match[3];
        exp1 = match[2] || match[4];
        exp2 =
          match[5] ||
          match[6] ||
          (match[7] ? fromSuperscriptText(match[7]) : '') ||
          (match[8] ? (match[8] === 'تربيع' ? '2' : '3') : '') ||
          match[9] ||
          match[10];
        // Hybrid expressions already embed `$...$`, so select `katex_paren` to avoid rendering raw `$` text
        selectedVariant = 'katex_paren';
      } else if (pIdx === 2) {
        base = match[1];
        exp1 = match[2];
        exp2 = match[3];
        selectedVariant = 'katex_tower';
      } else if (pIdx === 3) {
        base = match[1];
        exp1 = match[2] || fromSuperscriptText(match[3] || '');
        exp2 =
          match[4] ||
          match[5] ||
          (match[6] ? fromSuperscriptText(match[6]) : '') ||
          (match[7] ? (match[7] === 'تربيع' ? '2' : '3') : '') ||
          match[8];
        if (match[4] || match[5]) {
          selectedVariant = 'ascii_paren';
        } else if (match[6]) {
          selectedVariant = 'unicode_paren';
        } else {
          selectedVariant = 'spoken';
          isSpokenInput = true;
        }
      } else if (pIdx === 4) {
        base = match[1];
        if (match[2]) {
          // Caret first exponent
          exp1 = match[2];
          exp2 =
            match[3] ||
            (match[4] ? (match[4] === 'تربيع' ? '2' : '3') : '') ||
            match[5];
          if (match[3]) {
            selectedVariant = 'ascii_tower';
          } else {
            selectedVariant = 'spoken';
            isSpokenInput = true;
          }
        } else {
          // Unicode superscript first exponent
          exp1 = fromSuperscriptText(match[6] || '');
          exp2 =
            match[7] ||
            (match[8] ? (match[8] === 'تربيع' ? '2' : '3') : '') ||
            match[9] ||
            (match[10] ? fromSuperscriptText(match[10]) : '') ||
            match[11];
          if (match[7]) {
            selectedVariant = 'ascii_tower';
          } else if (match[10] || match[11]) {
            selectedVariant = 'raw';
            rawKeepText = match[0];
          } else {
            selectedVariant = 'spoken';
            isSpokenInput = true;
          }
        }
      } else if (pIdx === 5) {
        base = match[1];
        exp1 = match[2] ? (match[2] === 'تربيع' ? '2' : '3') : match[3];
        exp2 =
          (match[4] ? (match[4] === 'تربيع' ? '2' : '3') : '') ||
          match[5] ||
          match[6] ||
          (match[7] ? fromSuperscriptText(match[7]) : '');
        if (match[6]) {
          selectedVariant = 'ascii_paren';
        } else if (match[7]) {
          selectedVariant = 'unicode_paren';
        } else {
          selectedVariant = 'spoken';
          isSpokenInput = true;
        }
      } else {
        base = match[1];
        exp1 = match[2] ? (match[2] === 'تربيع' ? '2' : '3') : match[3];
        exp2 = match[4] ? (match[4] === 'تربيع' ? '2' : '3') : match[5];
        selectedVariant = 'spoken';
        isSpokenInput = true;
      }

      const built = buildNestedExponentAlternatives(
        base,
        exp1,
        exp2,
        selectedVariant,
        isSpokenInput ? match[0] : undefined,
        rawKeepText,
        useArabic
      );
      if (isSpokenInput) {
        sourceMemory?.set(built.canonicalKey, match[0]);
      } else {
        const mem = sourceMemory?.get(built.canonicalKey);
        const spokenAlt = built.alternatives.find((a) => a.kind === 'spoken');
        if (mem && spokenAlt) {
          spokenAlt.insertText = formatMathDigits(mem, useArabic);
          spokenAlt.previewText = formatMathDigits(mem, useArabic);
        }
      }
      return built;
    },
  },

  // 9. Exponents (الأسس)
  {
    id: 'exponent',
    category: 'exponent',
    titleAr: 'الأسس',
    patterns: [
      // [0] Arabic square/cube (supports single operand or parenthesized expression): س تربيع | (س + ١) تربيع
      new RegExp(`(${OPERAND_TOKEN}|\\([^()$]+\\))\\s+(تربيع|تكعيب)`, 'g'),
      // [1] Arabic power (supports single operand or parenthesized expression): خمسة أس 2 | (س + ١) أس 3
      new RegExp(`(${OPERAND_TOKEN}|\\([^()$]+\\))\\s+(?:أس|اس|قوة)\\s+(${OPERAND_TOKEN})`, 'g'),
      // [2] KaTeX: $5^{2}$ or $س^{٢}$ or $(س + ١)^{٣}$
      new RegExp(
        `\\$((?:[a-zA-Z0-9٠-٩سصعأابنمقلك]+|\\\\text\\{[^{}$]+\\}|\\([^{}$]+\\)))\\^\\{(${BRACE_CONTENT})\\}\\$`,
        'g'
      ),
      // [3] Unicode superscript: 5² or س² or (س + ١)²
      /([a-zA-Z0-9٠-٩سصعأابنمقلك]+|\([^()$\n]+\))([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+)/g,
      // [4] ASCII/Arabic caret: 5^2 or س^٢ or (س + ١)^٣
      /([a-zA-Z0-9٠-٩سصعأابنمقلك]+|\([^()$\n]+\))\^([a-zA-Z0-9٠-٩سصعأابنمقلك]+|\([^()$\n]+\))/g,
    ],
    buildAlternatives: (match, pIdx, sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      const base = match[1];
      const exp =
        pIdx === 0
          ? match[2] === 'تربيع'
            ? '2'
            : '3'
          : pIdx === 3
          ? fromSuperscriptText(match[2])
          : match[2];
      const kind: MathAlternative['kind'] =
        pIdx === 0 || pIdx === 1
          ? 'spoken'
          : pIdx === 2
          ? 'katex'
          : pIdx === 3
          ? 'unicode'
          : 'ascii';
      const built = buildExponentAlternatives(
        base,
        exp,
        pIdx === 0 || pIdx === 1 ? match[0] : undefined,
        kind,
        useArabic
      );
      if (pIdx === 0 || pIdx === 1) {
        sourceMemory?.set(built.canonicalKey, match[0]);
      } else {
        const mem = sourceMemory?.get(built.canonicalKey);
        if (mem) {
          built.alternatives[0].insertText = formatMathDigits(mem, useArabic);
          built.alternatives[0].previewText = formatMathDigits(mem, useArabic);
        }
      }
      return built;
    },
  },

  // 9. Generic KaTeX `$...$` Fallback (ensures NO valid `$...$` formula ever renders as raw syntax)
  {
    id: 'katex_generic',
    category: 'katex',
    titleAr: 'تعبير رياضي',
    patterns: [/\$([^$]+)\$/g],
    buildAlternatives: (match, _pIdx, _sourceMemory, options) => {
      const useArabic = options?.useArabicDigits ?? true;
      const rawLatex = match[1].trim();
      if (!rawLatex) return null;
      const displayLatex = formatMathDigits(rawLatex, useArabic);
      const plainWord = formatMathForWord(`$${displayLatex}$`, useArabic);
      const alternatives: MathAlternative[] = [
        {
          id: 'katex',
          label: 'معادلة',
          kind: 'katex',
          insertText: `$${displayLatex}$`,
          latex: displayLatex,
          isLtr: true,
        },
        {
          id: 'unicode',
          label: 'نصي',
          kind: 'unicode',
          insertText: plainWord,
          previewText: plainWord,
          isLtr: !useArabic,
        },
      ];
      return {
        canonicalKey: `katex:${toLatinDigits(unwrapTexText(rawLatex))}`,
        alternatives,
        selectedAltId: 'katex',
      };
    },
  },
];

/**
 * Parses raw text into non-overlapping Plain Text & Interactive Math Token segments.
 */
export function parseMathSegments(
  text: string,
  sourceMemory?: Map<string, string>,
  options?: ParseMathOptions
): ParsedMathSegment[] {
  if (!text) return [];

  interface CandidateMatch {
    start: number;
    end: number;
    rule: MathPatternRule;
    patternIndex: number;
    match: RegExpExecArray;
  }

  const candidates: CandidateMatch[] = [];

  for (const rule of MATH_PATTERN_RULES) {
    rule.patterns.forEach((pattern, pIdx) => {
      const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
      const re = new RegExp(pattern.source, flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) {
          re.lastIndex += 1;
          continue;
        }
        candidates.push({
          start: m.index,
          end: m.index + m[0].length,
          rule,
          patternIndex: pIdx,
          match: m,
        });
      }
    });
  }

  // Sort by earliest start, then longest match, then rule order
  candidates.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return (
      MATH_PATTERN_RULES.indexOf(a.rule) - MATH_PATTERN_RULES.indexOf(b.rule)
    );
  });

  const segments: ParsedMathSegment[] = [];
  let cursor = 0;

  for (const cand of candidates) {
    if (cand.start < cursor) continue; // Skip overlapping lower-priority match
    const built = cand.rule.buildAlternatives(
      cand.match,
      cand.patternIndex,
      sourceMemory,
      options
    );
    if (!built) continue;

    if (cand.start > cursor) {
      segments.push({
        type: 'text',
        text: text.slice(cursor, cand.start),
        start: cursor,
        end: cand.start,
      });
    }

    const activeAlt =
      built.alternatives.find((a) => a.id === built.selectedAltId) ||
      built.alternatives[0];

    segments.push({
      type: 'math',
      id: `${cand.rule.id}-${cand.start}-${cand.end}`,
      start: cand.start,
      end: cand.end,
      rawText: cand.match[0],
      canonicalKey: built.canonicalKey,
      category: cand.rule.category,
      alternatives: built.alternatives,
      selectedAltId: built.selectedAltId,
      isLtr: activeAlt.isLtr,
    });

    cursor = cand.end;
  }

  if (cursor < text.length) {
    segments.push({
      type: 'text',
      text: text.slice(cursor),
      start: cursor,
      end: text.length,
    });
  }

  return segments;
}

export interface WordMathRunSegment {
  text: string;
  superScript?: boolean;
  subScript?: boolean;
}

function normalizeWordFormulaBody(
  inner: string,
  useArabicDigits?: boolean
): string {
  let clean = unwrapTexText(inner.trim());

  // Limits: \lim_{x \to a}
  clean = clean.replace(
    /\\lim_\{([^}]*?)\\to([^}]*?)\}/g,
    (__, v: string, t: string) => `lim(${v.trim()}→${t.trim()})`
  );
  clean = clean.replace(/\\to\b/g, '→');

  // Integrals: \int_{a}^{b}
  clean = clean.replace(
    /\\int_\{([^}]+)\}\^\{([^}]+)\}/g,
    (__, lo: string, hi: string) =>
      `∫_{${lo}}^{${hi}}`
  );
  clean = clean.replace(/\\int\b/g, '∫');
  clean = clean.replace(/\\,/g, ' ');

  // Logarithms & trig
  clean = clean.replace(/\\log_\{([^}]+)\}/g, (__, b: string) => `log_{${b}}`);
  clean = clean.replace(/\\log\b/g, 'log');
  clean = clean.replace(/\\ln\b/g, 'ln');
  clean = clean.replace(/\\sin\b/g, 'sin');
  clean = clean.replace(/\\cos\b/g, 'cos');
  clean = clean.replace(/\\tan\b/g, 'tan');

  // Fractions: \frac{a}{b}
  clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (__, a: string, b: string) => {
    if (useArabicDigits === false) {
      const vulgar = PAIR_TO_VULGAR_FRACTION[`${toLatinDigits(a)}/${toLatinDigits(b)}`];
      if (vulgar) return vulgar;
    }
    return `${a}/${b}`;
  });

  // Nth / Cube / Square roots
  clean = clean.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, (__, idx: string, x: string) => {
    if (toLatinDigits(idx.trim()) === '3') return `∛${x}`;
    return `${toSuperscriptText(idx.trim()) ?? idx}√${x}`;
  });
  clean = clean.replace(/\\sqrt\{([^}]+)\}/g, (__, x: string) => `√${x}`);

  // Greek & relation symbols
  clean = clean
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±')
    .replace(/\\cdot\b/g, '·');

  return clean.replace(/\s+/g, ' ').trim();
}

function readBalancedBraces(src: string, openBraceIdx: number): { content: string; endIdx: number } | null {
  if (src[openBraceIdx] !== '{') return null;
  let depth = 0;
  for (let i = openBraceIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: src.slice(openBraceIdx + 1, i),
          endIdx: i + 1,
        };
      }
    }
  }
  return null;
}

function pushPlainSegmentWithScripts(
  out: WordMathRunSegment[],
  raw: string,
  useArabicDigits?: boolean
) {
  if (!raw) return;
  const fmt = (s: string) =>
    useArabicDigits === undefined ? s : formatMathDigits(s, useArabicDigits);

  // If using Arabic digits (or nested plain caret), convert Unicode superscripts/subscripts
  // into true Word superScript/subScript runs so digits never appear as English Unicode glyphs next to Arabic bases.
  if (useArabicDigits) {
    const scriptRe = /([⁰¹²³⁴⁵⁶⁷⁸⁹]+)|([₀-₉]+)/g;
    let last = 0;
    let sm: RegExpExecArray | null;
    while ((sm = scriptRe.exec(raw)) !== null) {
      if (sm.index > last) {
        out.push({ text: fmt(raw.slice(last, sm.index)) });
      }
      if (sm[1]) {
        out.push({ text: fmt(fromSuperscriptText(sm[1])), superScript: true });
      } else if (sm[2]) {
        out.push({ text: fmt(fromSubscriptText(sm[2])), subScript: true });
      }
      last = sm.index + sm[0].length;
    }
    if (last < raw.length) {
      out.push({ text: fmt(raw.slice(last)) });
    }
    return;
  }

  out.push({ text: fmt(raw) });
}

/**
 * Splits text containing KaTeX `$...$` into structured segments with native
 * Word `superScript` / `subScript` flags so Arabic and English digits stay uniform.
 */
export function formatMathSegmentsForWord(
  text: string,
  useArabicDigits?: boolean
): WordMathRunSegment[] {
  if (!text) return [];
  const fmt = (s: string) =>
    useArabicDigits === undefined ? s : formatMathDigits(s, useArabicDigits);

  // Normalize hybrid/plain nested exponents into clean KaTeX tokens first
  const normalized = text
    .replace(
      /\(\s*\$([^{}$]+\^\{[^{}$]+\})\$\s*\)\s*(?:\^\{([^{}]+)\}|\^([a-zA-Z0-9٠-٩سصعأابنمقلك]+)|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+))/g,
      (__, inner: string, eBrace?: string, eCaret?: string, eSup?: string) => {
        const outer = eBrace || eCaret || (eSup ? fromSuperscriptText(eSup) : '');
        return `$(${inner})^{${outer}}$`;
      }
    )
    .replace(
      /\(\s*([a-zA-Z0-9٠-٩سصعأابنمقلك]+)\s*(?:\^([a-zA-Z0-9٠-٩سصعأابنمقلك]+)|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+))\s*\)\s*(?:\^([a-zA-Z0-9٠-٩سصعأابنمقلك]+)|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣʸ]+))/g,
      (__, b: string, e1c?: string, e1s?: string, e2c?: string, e2s?: string) => {
        const e1 = e1c || (e1s ? fromSuperscriptText(e1s) : '');
        const e2 = e2c || (e2s ? fromSuperscriptText(e2s) : '');
        return `$(${b}^{${e1}})^{${e2}}$`;
      }
    );

  if (!normalized.includes('$')) {
    const plainOut: WordMathRunSegment[] = [];
    pushPlainSegmentWithScripts(plainOut, normalized, useArabicDigits);
    return plainOut;
  }

  const out: WordMathRunSegment[] = [];
  const tokenRe = /\$([^$]+)\$/g;
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(normalized)) !== null) {
    if (m.index > cursor) {
      pushPlainSegmentWithScripts(out, normalized.slice(cursor, m.index), useArabicDigits);
    }
    const clean = normalizeWordFormulaBody(m[1], useArabicDigits);
    let i = 0;
    let buf = '';
    const flushBuf = () => {
      if (buf) {
        pushPlainSegmentWithScripts(out, buf, useArabicDigits);
        buf = '';
      }
    };

    while (i < clean.length) {
      if ((clean[i] === '^' || clean[i] === '_') && clean[i + 1] === '{') {
        const balanced = readBalancedBraces(clean, i + 1);
        if (balanced) {
          flushBuf();
          const isSup = clean[i] === '^';
          // Handle nested exponent inside balanced braces cleanly (e.g. 2^{3} -> 2^3)
          const innerClean = balanced.content
            .replace(/\^\{([^{}]+)\}/g, '^$1')
            .replace(/_\{([^{}]+)\}/g, '_$1');
          out.push({
            text: fmt(innerClean),
            ...(isSup ? { superScript: true } : { subScript: true }),
          });
          i = balanced.endIdx;
          continue;
        }
      }
      buf += clean[i];
      i++;
    }
    flushBuf();
    cursor = m.index + m[0].length;
  }

  if (cursor < normalized.length) {
    pushPlainSegmentWithScripts(out, normalized.slice(cursor), useArabicDigits);
  }

  return out;
}

/**
 * Converts any KaTeX `$...$` tokens inside text into clean Unicode/math text
 * suitable for plain-text previews and exports, respecting `useArabicDigits`.
 */
export function formatMathForWord(
  text: string,
  useArabicDigits?: boolean
): string {
  if (!text) return text;
  if (!text.includes('$')) {
    return useArabicDigits === undefined
      ? text
      : formatMathDigits(text, useArabicDigits);
  }

  const converted = text.replace(/\$([^$]+)\$/g, (_, inner: string) => {
    let clean = normalizeWordFormulaBody(inner, useArabicDigits);

    // Resolve innermost ^{...} and _{...} up to 3 levels for nested exponents
    for (let pass = 0; pass < 3; pass++) {
      const next = clean
        .replace(/\^\{([^{}]+)\}/g, (__, e: string) => {
          if (useArabicDigits) return `^${e}`;
          return toSuperscriptText(e) ?? `^${e}`;
        })
        .replace(/_\{([^{}]+)\}/g, (__, s: string) => {
          if (useArabicDigits) return `_${s}`;
          return toSubscriptText(s) ?? `_${s}`;
        });
      if (next === clean) break;
      clean = next;
    }

    return clean;
  });

  return useArabicDigits === undefined
    ? converted
    : formatMathDigits(converted, useArabicDigits);
}
