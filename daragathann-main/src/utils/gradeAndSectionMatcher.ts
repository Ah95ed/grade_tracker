/**
 * Grade Level and Section Normalization and Semantic Deduplication.
 * Eliminates duplicate entries caused by Arabic orthographic variants
 * such as "اول متوسط" vs "أول متوسط", "شعبة أ" vs "أ", "شعبة 1" vs "1", etc.
 */

import { cleanSingleSpaces, canonicalizeArabic } from './arabicNameMatcher';
import { STANDARD_UNIVERSITY_STAGES } from './translations';

export { STANDARD_UNIVERSITY_STAGES };

/**
 * Known standard Arabic grade levels in Iraqi and Arab curriculum schools
 * with proper, authoritative orthography (e.g. with standard hamza).
 */
export const STANDARD_GRADE_LEVELS: readonly string[] = [
  'الأول الابتدائي',
  'الثاني الابتدائي',
  'الثالث الابتدائي',
  'الرابع الابتدائي',
  'الخامس الابتدائي',
  'السادس الابتدائي',
  'الأول متوسط',
  'الثاني متوسط',
  'الثالث متوسط',
  'الرابع الإعدادي',
  'الرابع العلمي',
  'الرابع الأدبي',
  'الخامس الإعدادي',
  'الخامس العلمي',
  'الخامس الأدبي',
  'الخامس التطبيقي',
  'الخامس الأحيائي',
  'السادس الإعدادي',
  'السادس العلمي',
  'السادس الأدبي',
  'السادس التطبيقي',
  'السادس الأحيائي',
];

/**
 * Normalizes a grade level string to a canonical representation.
 * If existingGrades is provided and one matches canonically, snaps to the existing one
 * so that no new duplicate spelling variant is ever introduced into the teacher's model.
 */
const normGradeCache = new Map<string, string>();
const normSectionCache = new Map<string, string>();

export function normalizeGradeLevel(
  rawGrade: string,
  existingGrades: string[] = []
): string {
  const raw = rawGrade || '';
  if (existingGrades.length === 0) {
    const cached = normGradeCache.get(raw);
    if (cached !== undefined) return cached;
  }
  const cleaned = cleanSingleSpaces(raw);
  if (!cleaned) return '';

  // 1) Remove common prefixes like "الصف ", "صف ", "مرحلة "
  let core = cleaned
    .replace(/^(الصف|صف|مرحلة|المرحلة)\s+/i, '')
    .trim();

  // 2) If existing grades in the teacher's sheet has a canonical match, adopt it!
  const coreCanon = canonicalizeArabic(core);
  for (const eg of existingGrades) {
    if (!eg) continue;
    const egClean = cleanSingleSpaces(eg);
    const egCanon = canonicalizeArabic(egClean.replace(/^(الصف|صف|مرحلة|المرحلة)\s+/i, ''));
    if (egCanon === coreCanon) {
      return egClean;
    }
  }

  let resolved: string | null = null;

  // 3) Match against standard Iraqi/Arab grade levels
  for (const std of STANDARD_GRADE_LEVELS) {
    const stdCanon = canonicalizeArabic(std);
    if (stdCanon === coreCanon) {
      resolved = std;
      break;
    }
    // Also match without Al- (e.g. "اول متوسط" vs "الأول متوسط")
    const stdNoAl = stdCanon.replace(/\bال/g, '');
    const coreNoAl = coreCanon.replace(/\bال/g, '');
    if (stdNoAl === coreNoAl) {
      resolved = std;
      break;
    }
  }

  // 3.5) Match against standard university stages
  if (!resolved) {
    for (const ustg of STANDARD_UNIVERSITY_STAGES) {
      const ustgCanon = canonicalizeArabic(ustg);
      if (ustgCanon === coreCanon) {
        resolved = ustg;
        break;
      }
      const ustgNoAl = ustgCanon.replace(/\bال/g, '');
      const coreNoAl = coreCanon.replace(/\bال/g, '');
      if (ustgNoAl === coreNoAl) {
        resolved = ustg;
        break;
      }
    }
  }

  // 4) Common numeric or shorthand patterns:
  if (!resolved) {
    if (/^(1|١|اول|اولى|أولى)\s*(مرحلة|المرحلة)?$/.test(coreCanon) || /^(مرحلة|المرحلة)\s*(1|١|اول|اولى|أولى)$/.test(coreCanon)) resolved = 'المرحلة الأولى';
    else if (/^(2|٢|ثاني|ثانية|الثانية)\s*(مرحلة|المرحلة)?$/.test(coreCanon) || /^(مرحلة|المرحلة)\s*(2|٢|ثاني|ثانية|الثانية)$/.test(coreCanon)) resolved = 'المرحلة الثانية';
    else if (/^(3|٣|ثالث|ثالثة|الثالثة)\s*(مرحلة|المرحلة)?$/.test(coreCanon) || /^(مرحلة|المرحلة)\s*(3|٣|ثالث|ثالثة|الثالثة)$/.test(coreCanon)) resolved = 'المرحلة الثالثة';
    else if (/^(4|٤|رابع|رابعة|الرابعة)\s*(مرحلة|المرحلة)?$/.test(coreCanon) || /^(مرحلة|المرحلة)\s*(4|٤|رابع|رابعة|الرابعة)$/.test(coreCanon)) resolved = 'المرحلة الرابعة';
    else if (/^(5|٥|خامس|خامسة|الخامسة)\s*(مرحلة|المرحلة)?$/.test(coreCanon) || /^(مرحلة|المرحلة)\s*(5|٥|خامس|خامسة|الخامسة)$/.test(coreCanon)) resolved = 'المرحلة الخامسة';
    else if (/^(6|٦|سادس|سادسة|السادسة)\s*(مرحلة|المرحلة)?$/.test(coreCanon) || /^(مرحلة|المرحلة)\s*(6|٦|سادس|سادسة|السادسة)$/.test(coreCanon)) resolved = 'المرحلة السادسة';
    else if (/ماجستير/.test(coreCanon)) resolved = 'الدراسات العليا (ماجستير)';
    else if (/دكتوراه/.test(coreCanon)) resolved = 'الدراسات العليا (دكتوراه)';
    else if (/^(1|١|اول|أول)\s*(متوسط|المتوسط)/.test(coreCanon)) resolved = 'الأول متوسط';
    else if (/^(2|٢|ثاني|الثاني)\s*(متوسط|المتوسط)/.test(coreCanon)) resolved = 'الثاني متوسط';
    else if (/^(3|٣|ثالث|الثالث)\s*(متوسط|المتوسط)/.test(coreCanon)) resolved = 'الثالث متوسط';
    else if (/^(4|٤|رابع|الرابع)\s*(علمي|العلمي)/.test(coreCanon)) resolved = 'الرابع العلمي';
    else if (/^(4|٤|رابع|الرابع)\s*(ادبي|الأدبي|الادبي)/.test(coreCanon)) resolved = 'الرابع الأدبي';
    else if (/^(4|٤|رابع|الرابع)\s*(اعدادي|الإعدادي|الاعدادي)/.test(coreCanon)) resolved = 'الرابع الإعدادي';
    else if (/^(5|٥|خامس|الخامس)\s*(علمي|العلمي)/.test(coreCanon)) resolved = 'الخامس العلمي';
    else if (/^(5|٥|خامس|الخامس)\s*(ادبي|الأدبي|الادبي)/.test(coreCanon)) resolved = 'الخامس الأدبي';
    else if (/^(5|٥|خامس|الخامس)\s*(تطبيقي|التطبيقي)/.test(coreCanon)) resolved = 'الخامس التطبيقي';
    else if (/^(5|٥|خامس|الخامس)\s*(احيائي|الأحيائي|الاحيائي)/.test(coreCanon)) resolved = 'الخامس الأحيائي';
    else if (/^(6|٦|سادس|السادس)\s*(علمي|العلمي)/.test(coreCanon)) resolved = 'السادس العلمي';
    else if (/^(6|٦|سادس|السادس)\s*(ادبي|الأدبي|الادبي)/.test(coreCanon)) resolved = 'السادس الأدبي';
    else if (/^(6|٦|سادس|السادس)\s*(تطبيقي|التطبيقي)/.test(coreCanon)) resolved = 'السادس التطبيقي';
    else if (/^(6|٦|سادس|السادس)\s*(احيائي|الأحيائي|الاحيائي)/.test(coreCanon)) resolved = 'السادس الأحيائي';
    else {
      resolved = core
        .replace(/\bاول\b/g, 'أول')
        .replace(/\bالاول\b/g, 'الأول')
        .replace(/\bاعدادي\b/g, 'إعدادي')
        .replace(/\bالاعدادي\b/g, 'الإعدادي')
        .replace(/\bادبي\b/g, 'أدبي')
        .replace(/\bالادبي\b/g, 'الأدبي')
        .replace(/\bابتدائي\b/g, 'ابتدائي')
        .replace(/\bالابتدائي\b/g, 'الابتدائي')
        .replace(/\bاحيائي\b/g, 'أحيائي')
        .replace(/\bالاحيائي\b/g, 'الأحيائي');
    }
  }

  if (existingGrades.length === 0) {
    if (normGradeCache.size > 500) normGradeCache.clear();
    normGradeCache.set(raw, resolved);
  }
  return resolved;
}

/**
 * Normalizes a section string (e.g. "شعبة أ", "شعبة (أ)", "ا", "أ") to a single clean character/label.
 */
export function normalizeSection(
  rawSection: string,
  existingSections: string[] = []
): string {
  const raw = rawSection || '';
  if (existingSections.length === 0) {
    const cached = normSectionCache.get(raw);
    if (cached !== undefined) return cached;
  }
  const cleaned = cleanSingleSpaces(raw);
  if (!cleaned) return 'أ';

  // Strip prefixes like "شعبة ", "الشعبة ", "فصل ", "مجموعة "
  let core = cleaned
    .replace(/^(شعبة|الشعبة|فصل|الفصل|مجموعة|المجموعة|قاعة|القاعة)\s*/i, '')
    .replace(/[()[\]{}«»"']/g, '')
    .trim();

  if (!core) core = cleaned;

  // Unify Alef to standard Hamza: "ا" -> "أ"
  if (core === 'ا' || core === 'أ' || core === 'إ' || core === 'آ') {
    core = 'أ';
  }

  // Check if existing sections already have a match
  const coreCanon = canonicalizeArabic(core);
  for (const es of existingSections) {
    if (!es) continue;
    const esClean = cleanSingleSpaces(es).replace(/^(شعبة|الشعبة)\s*/i, '').replace(/[()[\]{}]/g, '').trim();
    if (canonicalizeArabic(esClean) === coreCanon || esClean === core) {
      return es;
    }
  }

  if (existingSections.length === 0) {
    if (normSectionCache.size > 500) normSectionCache.clear();
    normSectionCache.set(raw, core);
  }
  return core;
}

/**
 * Returns a deduplicated, canonically unique list of grade levels from students.
 * Prevents identical phonetic grades (e.g. "اول متوسط" and "أول متوسط")
 * from appearing multiple times in dropdown lists.
 */
export function getUniqueGradeLevels(
  students: Array<{ gradeLevel?: string }>,
  preferredDefault = 'الأول متوسط'
): string[] {
  const map = new Map<string, string>();

  for (const s of students || []) {
    const raw = (s?.gradeLevel || '').trim();
    if (!raw) continue;
    const normalized = normalizeGradeLevel(raw);
    const key = canonicalizeArabic(normalized);
    if (!map.has(key)) {
      map.set(key, normalized);
    }
  }

  if (map.size === 0 && preferredDefault) {
    return [normalizeGradeLevel(preferredDefault)];
  }

  return Array.from(map.values());
}

/**
 * Returns a deduplicated, canonically unique list of sections from students.
 * Prevents "أ" and "ا" or "شعبة أ" from appearing as separate duplicate items.
 */
export function getUniqueSections(
  students: Array<{ section?: string }>,
  preferredDefault = 'أ'
): string[] {
  const map = new Map<string, string>();

  for (const s of students || []) {
    const raw = (s?.section || '').trim();
    if (!raw) continue;
    const normalized = normalizeSection(raw);
    const key = canonicalizeArabic(normalized);
    if (!map.has(key)) {
      map.set(key, normalized);
    }
  }

  if (map.size === 0 && preferredDefault) {
    return [normalizeSection(preferredDefault)];
  }

  return Array.from(map.values());
}

/**
 * Compares two grade level strings for equivalence, ignoring hamza/tashkeel/prefix variations.
 */
export function isGradeLevelMatch(studentGrade: string, filterGrade: string): boolean {
  if (filterGrade === 'ALL' || !filterGrade) return true;
  const sNorm = canonicalizeArabic(normalizeGradeLevel(studentGrade));
  const fNorm = canonicalizeArabic(normalizeGradeLevel(filterGrade));
  return sNorm === fNorm;
}

/**
 * Compares two section strings for equivalence, ignoring "شعبة", hamzas, and punctuation.
 */
export function isSectionMatch(studentSection: string, filterSection: string): boolean {
  if (filterSection === 'ALL' || !filterSection) return true;
  const sNorm = canonicalizeArabic(normalizeSection(studentSection));
  const fNorm = canonicalizeArabic(normalizeSection(filterSection));
  return sNorm === fNorm;
}

/**
 * Compares two subject strings for equivalence, ignoring hamza/tashkeel/definite article "ال".
 */
export function isSubjectMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const ca = canonicalizeArabic(a.trim());
  const cb = canonicalizeArabic(b.trim());
  if (ca === cb) return true;
  const stripAl = (s: string) => (s.startsWith('ال') ? s.slice(2) : s);
  return stripAl(ca) === stripAl(cb);
}

