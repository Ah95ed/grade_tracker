import { cleanSingleSpaces } from './arabicNameMatcher';

const ARABIC_INDIC_MAP: Record<string, string> = {
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
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

/**
 * Converts Eastern Arabic / Persian numerals to ASCII 0-9 and normalizes Arabic decimal marks.
 */
export const normalizeSpokenDigits = (input: string): string => {
  if (!input) return '';
  let out = input.replace(/[٠-٩۰-۹]/g, (ch) => ARABIC_INDIC_MAP[ch] ?? ch);
  // Normalize Arabic decimal separator
  out = out.replace(/٫/g, '.');
  // Normalize decimal comma between digits (e.g. 7,5 -> 7.5)
  out = out.replace(/(\d)[,،](\d)/g, '$1.$2');
  return out;
};

/**
 * Normalizes Arabic letters for fuzzy spoken word matching.
 */
const normWord = (w: string): string => {
  return w
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
};

const EXACT_NUMBER_WORDS: Record<string, number> = {
  // Zero
  صفر: 0,
  // Units (MSA + Iraqi/Gulf/Levantine/Egyptian variations)
  واحد: 1,
  واحده: 1,
  وحده: 1,
  احد: 1,
  اثنين: 2,
  اتنين: 2,
  اثنان: 2,
  ثنتين: 2,
  تنتين: 2,
  ثلاثه: 3,
  ثلاث: 3,
  تلاته: 3,
  تلات: 3,
  اربعه: 4,
  اربع: 4,
  خمسه: 5,
  خمس: 5,
  سته: 6,
  ست: 6,
  سبعه: 7,
  سبع: 7,
  ثمانيه: 8,
  ثمان: 8,
  ثمن: 8,
  تمانيه: 8,
  تمان: 8,
  تسعه: 9,
  تسع: 9,
  عشره: 10,
  عشر: 10,
  // Teens (both MSA and colloquial)
  احدعش: 11,
  حدعش: 11,
  يدعش: 11,
  احداشر: 11,
  اثنعش: 12,
  اطنعش: 12,
  اتنعش: 12,
  اتناشر: 12,
  ثلاثطعش: 13,
  تلتعش: 13,
  تلاتعش: 13,
  تلتاشر: 13,
  اربعطعش: 14,
  اربعتاشر: 14,
  خمسطعش: 15,
  خمستعش: 15,
  خمستاشر: 15,
  ستطعش: 16,
  ستعش: 16,
  ستاشر: 16,
  سبعطعش: 17,
  سبعتاشر: 17,
  ثمنطعش: 18,
  تمنطعش: 18,
  تمنتاشر: 18,
  تسعطعش: 19,
  تسعتاشر: 19,
  // Tens
  عشرين: 20,
  عشرون: 20,
  ثلاثين: 30,
  ثلاثون: 30,
  تلاتين: 30,
  اربعين: 40,
  اربعون: 40,
  خمسين: 50,
  خمسون: 50,
  ستين: 60,
  ستون: 60,
  سبعين: 70,
  سبعون: 70,
  ثمانين: 80,
  ثمانون: 80,
  تمانين: 80,
  تسعين: 90,
  تسعون: 90,
  // Hundreds
  ميه: 100,
  مايه: 100,
  مئتين: 200,
  مائتين: 200,
  ميتين: 200,
  ثلاثميه: 300,
  ثلاثمايه: 300,
  اربعميه: 400,
  اربعمايه: 400,
  خمسميه: 500,
  خمسمايه: 500,
  الف: 1000,
};

const MULTI_WORD_TEENS: Array<[string, number]> = [
  ['احد عشر', 11],
  ['احدى عشر', 11],
  ['احدي عشر', 11],
  ['احد عشره', 11],
  ['اثنا عشر', 12],
  ['اثني عشر', 12],
  ['اثنتا عشر', 12],
  ['اثنتي عشر', 12],
  ['ثلاثه عشر', 13],
  ['ثلاث عشر', 13],
  ['تلاته عشر', 13],
  ['اربعه عشر', 14],
  ['اربع عشر', 14],
  ['خمسه عشر', 15],
  ['خمس عشر', 15],
  ['سته عشر', 16],
  ['ست عشر', 16],
  ['سبعه عشر', 17],
  ['سبع عشر', 17],
  ['ثمانيه عشر', 18],
  ['ثماني عشر', 18],
  ['تمانيه عشر', 18],
  ['تسعه عشر', 19],
  ['تسع عشر', 19],
];

const formatCleanNumber = (val: number): string | null => {
  if (!Number.isFinite(val) || val < 0) return null;
  // Avoid floating point noise like 7.7500000001
  const rounded = Math.round(val * 1000) / 1000;
  return String(rounded);
};

/**
 * Parses an Arabic or English spoken phrase into a numeric string (digits/decimal only).
 * Returns null when no valid numeric grade is detected, guaranteeing numeric-only fields.
 */
export const parseSpokenScore = (transcript: string): string | null => {
  if (!transcript || !transcript.trim()) return null;

  const normalized = normalizeSpokenDigits(transcript).trim();

  // Handle "decimal spoken word" between digits, e.g. "7 فاصلة 5" or "85 نقطة 5"
  const spokenDecimalDigitMatch = normalized.match(
    /(\d+)\s*(?:فاصلة|فاصله|نقطة|نقطه|بوينت|point|\.)\s*(\d+)/i
  );
  if (spokenDecimalDigitMatch) {
    const val = parseFloat(`${spokenDecimalDigitMatch[1]}.${spokenDecimalDigitMatch[2]}`);
    return formatCleanNumber(val);
  }

  // Handle digit + fractional word: e.g. "7 ونص", "7 ونصف", "10 وربع", "8 إلا ربع"
  const digitFractionMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:(و)\s*(نص|نصف|ربع|ثلاث\s*أرباع|ثلاث\s*ارباع|ثلاثة\s*أرباع|ثلاثة\s*ارباع)|(إلا|الا)\s*(ربع|نص|نصف))/
  );
  if (digitFractionMatch) {
    const base = parseFloat(digitFractionMatch[1]);
    if (!Number.isNaN(base)) {
      if (digitFractionMatch[2]) {
        const frac = normWord(digitFractionMatch[3]);
        if (frac === 'نص' || frac === 'نصف') return formatCleanNumber(base + 0.5);
        if (frac === 'ربع') return formatCleanNumber(base + 0.25);
        if (frac.includes('اربع') || frac.includes('ارباع')) return formatCleanNumber(base + 0.75);
      } else if (digitFractionMatch[4]) {
        const frac = normWord(digitFractionMatch[5]);
        if (frac === 'ربع') return formatCleanNumber(Math.max(0, base - 0.25));
        if (frac === 'نص' || frac === 'نصف') return formatCleanNumber(Math.max(0, base - 0.5));
      }
    }
  }

  // Direct numeric extraction (e.g. "85", "7.5", "الدرجة 92")
  const directNumberMatch = normalized.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$|%|\/)/);
  if (directNumberMatch) {
    const val = parseFloat(directNumberMatch[1]);
    return formatCleanNumber(val);
  }

  // Fallback any digit sequence
  const anyDigitMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (anyDigitMatch) {
    const val = parseFloat(anyDigitMatch[1]);
    return formatCleanNumber(val);
  }

  // Parse Arabic number words
  let wordText = normWord(normalized)
    .replace(/[^\u0621-\u064A0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!wordText) return null;

  // Separate attached conjunction "و" (e.g., "وثمانين" -> "و ثمانين", "ونص" -> "و نص")
  // Carefully only split leading "و" when the remainder is a known number/fraction token
  const rawTokens = wordText.split(' ');
  const tokens: string[] = [];
  for (const tok of rawTokens) {
    if (
      tok.startsWith('و') &&
      tok.length > 2 &&
      !EXACT_NUMBER_WORDS[tok] &&
      (EXACT_NUMBER_WORDS[tok.slice(1)] !== undefined ||
        ['نص', 'نصف', 'ربع', 'اربع', 'ارباع', 'عشر'].includes(tok.slice(1)))
    ) {
      tokens.push('و');
      tokens.push(tok.slice(1));
    } else {
      tokens.push(tok);
    }
  }

  wordText = tokens.join(' ');

  // Replace multi-word teens (e.g. "احد عشر" -> "__11__")
  for (const [phrase, num] of MULTI_WORD_TEENS) {
    if (wordText.includes(phrase)) {
      wordText = wordText.replace(new RegExp(phrase, 'g'), `__NUM_${num}__`);
    }
  }

  // Replace "ثلاث ارباع" / "ثلاثة ارباع"
  wordText = wordText
    .replace(/(?:ثلاثه|ثلاث)\s+(?:ارباع|اربع)/g, '__FRAC_0.75__')
    .replace(/(?:الا)\s+(?:ربع)/g, '__MINUS_0.25__')
    .replace(/(?:الا)\s+(?:نصف|نص)/g, '__MINUS_0.5__');

  const finalTokens = wordText.split(' ').filter(Boolean);

  // Check for "X فاصله/نقطه/بوينت Y" entirely in words (e.g., "سبعه فاصله خمسه")
  const decIdx = finalTokens.findIndex((t) =>
    ['فاصله', 'نقطه', 'بوينت'].includes(t)
  );
  if (decIdx > 0 && decIdx < finalTokens.length - 1) {
    const left = parseIntegerTokens(finalTokens.slice(0, decIdx));
    const right = parseIntegerTokens(finalTokens.slice(decIdx + 1));
    if (left !== null && right !== null) {
      return formatCleanNumber(parseFloat(`${left}.${right}`));
    }
  }

  let total = 0;
  let foundAnyNumericToken = false;

  for (let i = 0; i < finalTokens.length; i++) {
    const t = finalTokens[i];
    if (t === 'و') continue;

    if (t.startsWith('__NUM_') && t.endsWith('__')) {
      const n = parseFloat(t.slice(6, -2));
      total += n;
      foundAnyNumericToken = true;
      continue;
    }

    if (t === '__FRAC_0.75__') {
      total += 0.75;
      foundAnyNumericToken = true;
      continue;
    }

    if (t === '__MINUS_0.25__') {
      total = Math.max(0, total - 0.25);
      foundAnyNumericToken = true;
      continue;
    }

    if (t === '__MINUS_0.5__') {
      total = Math.max(0, total - 0.5);
      foundAnyNumericToken = true;
      continue;
    }

    if (t === 'نص' || t === 'نصف') {
      total += 0.5;
      foundAnyNumericToken = true;
      continue;
    }

    if (t === 'ربع') {
      total += 0.25;
      foundAnyNumericToken = true;
      continue;
    }

    if (EXACT_NUMBER_WORDS[t] !== undefined) {
      total += EXACT_NUMBER_WORDS[t];
      foundAnyNumericToken = true;
      continue;
    }
  }

  if (!foundAnyNumericToken) return null;
  return formatCleanNumber(total);
};

const parseIntegerTokens = (tokens: string[]): number | null => {
  let sum = 0;
  let matched = false;
  for (const t of tokens) {
    if (t === 'و') continue;
    if (t.startsWith('__NUM_') && t.endsWith('__')) {
      sum += parseInt(t.slice(6, -2), 10);
      matched = true;
    } else if (EXACT_NUMBER_WORDS[t] !== undefined) {
      sum += EXACT_NUMBER_WORDS[t];
      matched = true;
    }
  }
  return matched ? sum : null;
};

/**
 * Cleans spoken Arabic student name transcript by stripping punctuation and normalizing whitespace.
 */
export const cleanSpokenStudentName = (transcript: string): string => {
  if (!transcript) return '';
  // Remove trailing/inline speech punctuation marks (periods, commas, question marks)
  const stripped = transcript
    .replace(/[.,،؛:?؟!۔"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleanSingleSpaces(stripped);
};
