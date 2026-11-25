/**
 * Utility functions for Arabic student name verification, normalization,
 * and fuzzy/suspicious matching across tables/months.
 */

export interface SuspectedMatchResult {
  matchedId?: string;
  matchedName: string;
  matchType: 'exact' | 'spelling_variation' | 'fuzzy_typo' | 'word_variation';
  similarity: number; // 0.0 to 1.0
  message: string; // e.g. "هل تقصد أحمد محمد علي كما في الجدول السابق؟"
  diffDescription: string;
  isExact: boolean;
}

/**
 * Collapses multiple consecutive spaces, tabs, or invisible whitespace into exactly one single space.
 * e.g. "محمد    علي" -> "محمد علي"
 */
export function cleanSingleSpaces(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width characters
    .replace(/[\t\r\n\v\f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standardizes Arabic characters for canonical comparison:
 * - Collapses spaces to single space
 * - Removes tashkeel / harakat and tatweel
 * - Normalizes alif forms [أإآٱ] -> ا
 * - Normalizes [ة] -> ه
 * - Normalizes [ى ئ] -> ي
 * - Normalizes [ؤ] -> و
 */
export function canonicalizeArabic(str: string): string {
  if (!str) return '';
  return cleanSingleSpaces(str)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و');
}

/**
 * Computes Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

/**
 * Explains specific Arabic letter differences between candidate and reference
 */
function describeArabicDifference(candidate: string, reference: string): string {
  const cNorm = canonicalizeArabic(candidate);
  const rNorm = canonicalizeArabic(reference);

  if (cNorm === rNorm) {
    const diffs: string[] = [];
    if (/[أإآ]/.test(candidate) !== /[أإآ]/.test(reference)) {
      diffs.push('اختلاف رسم الهمزة (أ / ا)');
    }
    if (/ة/.test(candidate) !== /ة/.test(reference) || /ه/.test(candidate) !== /ه/.test(reference)) {
      diffs.push('اختلاف التاء المربوطة والهاء (ة / ه)');
    }
    if (/[ىي]/.test(candidate) !== /[ىي]/.test(reference)) {
      diffs.push('اختلاف الألف المقصورة والياء (ى / ي)');
    }
    return diffs.length > 0 ? diffs.join(' و ') : 'تشابه في رسم الحروف';
  }

  // Check for OCR common confusions (ج / ح / خ)
  if (
    (candidate.includes('ج') && reference.includes('ح')) ||
    (candidate.includes('ح') && reference.includes('ج'))
  ) {
    return 'تشابه نقطة الحرف (ج / ح)';
  }

  // Check word difference
  const cWords = cleanSingleSpaces(candidate).split(' ');
  const rWords = cleanSingleSpaces(reference).split(' ');
  if (cWords.length === rWords.length) {
    const diffCount = cWords.filter((w, idx) => canonicalizeArabic(w) !== canonicalizeArabic(rWords[idx])).length;
    if (diffCount === 1) {
      return 'اختلاف في كلمة واحدة من الاسم';
    }
  }

  return 'تقارب لفظي أو خطأ كتابي في الحروف';
}

/**
 * Searches a list of reference students for an exact or suspected match.
 * Returns null if no match or candidate is empty.
 */
export function findSuspectedStudentMatch(
  candidateName: string,
  referenceStudents: Array<{ id?: string; name: string }>,
  options?: { ignoreExact?: boolean }
): SuspectedMatchResult | null {
  const cleanedCand = cleanSingleSpaces(candidateName);
  if (!cleanedCand || cleanedCand.length < 3) return null;

  const candNorm = canonicalizeArabic(cleanedCand);

  // 1) Check Exact string match
  for (const ref of referenceStudents) {
    const cleanedRef = cleanSingleSpaces(ref.name);
    if (!cleanedRef) continue;

    if (cleanedCand === cleanedRef) {
      if (options?.ignoreExact) return null;
      return {
        matchedId: ref.id,
        matchedName: cleanedRef,
        matchType: 'exact',
        similarity: 1.0,
        message: `مطابق تماماً للاسم السابق: «${cleanedRef}»`,
        diffDescription: 'تطابق تام',
        isExact: true,
      };
    }
  }

  // 2) Check Canonical match (e.g. أحمد vs احمد, بثينة vs بثينه, على vs علي)
  for (const ref of referenceStudents) {
    const cleanedRef = cleanSingleSpaces(ref.name);
    if (!cleanedRef) continue;

    const refNorm = canonicalizeArabic(cleanedRef);
    if (candNorm === refNorm) {
      const diffDesc = describeArabicDifference(cleanedCand, cleanedRef);
      return {
        matchedId: ref.id,
        matchedName: cleanedRef,
        matchType: 'spelling_variation',
        similarity: 0.98,
        message: `هل تقصد ${cleanedRef} كما في الجدول السابق؟`,
        diffDescription: diffDesc,
        isExact: false,
      };
    }
  }

  // 3) Check Close Fuzzy Typos / OCR errors (e.g. جيدر vs حيدر, or 1-2 character distance in 3-part name)
  let bestMatch: { ref: { id?: string; name: string }; dist: number; sim: number } | null = null;

  for (const ref of referenceStudents) {
    const cleanedRef = cleanSingleSpaces(ref.name);
    if (!cleanedRef) continue;

    const refNorm = canonicalizeArabic(cleanedRef);
    const maxLen = Math.max(candNorm.length, refNorm.length);
    if (maxLen < 4) continue;

    // Check Levenshtein distance on canonicalized strings
    const dist = levenshteinDistance(candNorm, refNorm);

    // If strings are relatively long (>= 8 chars for full name), allow distance <= 2
    const allowedDist = maxLen >= 12 ? 2 : 1;
    if (dist <= allowedDist) {
      const sim = 1 - dist / maxLen;
      if (!bestMatch || dist < bestMatch.dist) {
        bestMatch = { ref, dist, sim };
      }
    }
  }

  if (bestMatch && bestMatch.sim >= 0.82) {
    const cleanedRef = cleanSingleSpaces(bestMatch.ref.name);
    const diffDesc = describeArabicDifference(cleanedCand, cleanedRef);
    return {
      matchedId: bestMatch.ref.id,
      matchedName: cleanedRef,
      matchType: 'fuzzy_typo',
      similarity: bestMatch.sim,
      message: `هل تقصد ${cleanedRef} كما في الجدول السابق؟`,
      diffDescription: diffDesc,
      isExact: false,
    };
  }

  // 4) Check Word-level similarity (e.g. "حسين علي عبد الكريم" vs "حسين علي محمد الكريم" or 3-part name vs 4-part)
  const candWords = candNorm.split(' ');
  for (const ref of referenceStudents) {
    const cleanedRef = cleanSingleSpaces(ref.name);
    if (!cleanedRef) continue;
    const refWords = canonicalizeArabic(cleanedRef).split(' ');

    if (candWords.length >= 3 && refWords.length >= 3) {
      // First 2 words match and last word matches, or 3 of 4 match
      const matchingWords = candWords.filter((cw) => refWords.includes(cw));
      const wordOverlapRatio = (matchingWords.length * 2) / (candWords.length + refWords.length);

      if (wordOverlapRatio >= 0.74 && Math.abs(candWords.length - refWords.length) <= 1) {
        // Also ensure at least the first name matches or is very close
        const firstDist = levenshteinDistance(candWords[0], refWords[0]);
        if (firstDist <= 1) {
          return {
            matchedId: ref.id,
            matchedName: cleanedRef,
            matchType: 'word_variation',
            similarity: wordOverlapRatio,
            message: `هل تقصد ${cleanedRef} كما في الجدول السابق؟`,
            diffDescription: describeArabicDifference(cleanedCand, cleanedRef),
            isExact: false,
          };
        }
      }
    }
  }

  return null;
}
