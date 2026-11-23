export type NumeralMode = 'EN' | 'AR';

export const NUMERAL_MODE_STORAGE_KEY = 'gradebook_numeral_mode';

export const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function getSavedNumeralMode(): NumeralMode {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(NUMERAL_MODE_STORAGE_KEY) === 'AR' ? 'AR' : 'EN';
    }
  } catch {
    // Ignore storage read errors
  }
  return 'EN';
}

export function formatScoreDisplay(
  val: number | string | null | undefined,
  mode: NumeralMode = 'EN'
): string {
  if (val === null || val === undefined || val === '') return '';
  if (mode === 'AR') {
    return String(val).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
  }
  return String(val)
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/،/g, '.');
}
