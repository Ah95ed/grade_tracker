/**
 * Iraq Time (Asia/Baghdad - UTC+3) Date Utilities
 * توحيد التواريخ والتوقيت في كامل البرنامج على توقيت العراق (جرينتش +3)
 */

export const IRAQ_TIMEZONE = 'Asia/Baghdad';
export const IRAQ_UTC_OFFSET_HOURS = 3;

/**
 * تحويل أي صيغة تاريخ (سواء كانت من SQLite بتنسيق YYYY-MM-DD HH:MM:SS بدون منطقة زمنية،
 * أو ISO، أو timestamp رقمي) إلى ميلي ثانية دقيقة متوافقة مع UTC دون أي انزياح محلي.
 */
export function parseSafeTimestamp(val?: string | number | Date | null): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;

  let s = String(val).trim();
  if (!s) return 0;

  // إذا كان رقماً بصيغة نصية
  if (/^\d+$/.test(s)) {
    const num = parseInt(s, 10);
    return Number.isFinite(num) ? num : 0;
  }

  // إذا كان التاريخ قادماً من SQLite مثل "2026-10-29 16:13:57" بدون حرف Z أو إزاحة،
  // يجب معاملته كـ UTC بإضافة T و Z لمنع المتصفح من تفسيره كتوقيت محلي
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    s = s + 'Z';
  }

  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * تحويل أي قيمة تاريخ إلى نص ISO موحد وصحيح ينتهي بحرف Z
 */
export function toNormalizedIsoString(val?: string | number | Date | null): string {
  const ms = parseSafeTimestamp(val);
  if (!ms) return new Date().toISOString();
  return new Date(ms).toISOString();
}

/**
 * تنسيق التاريخ والوقت كاملاً بتوقيت العراق (Asia/Baghdad - GMT+3)
 * مثال: "29 تشرين الأول 2026، 07:15 م"
 */
export function formatIraqDateTime(
  dateOrIso?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const ms = parseSafeTimestamp(dateOrIso);
  if (!ms) return 'غير محدد';

  try {
    const date = new Date(ms);
    return date.toLocaleString('ar-IQ', {
      timeZone: IRAQ_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...(options || {}),
    });
  } catch {
    return String(dateOrIso || 'غير محدد');
  }
}

/**
 * تنسيق التاريخ فقط بتوقيت العراق (Asia/Baghdad)
 * مثال: "29 تشرين الأول 2026"
 */
export function formatIraqDate(dateOrIso?: string | number | Date | null): string {
  const ms = parseSafeTimestamp(dateOrIso);
  if (!ms) return 'غير محدد';

  try {
    const date = new Date(ms);
    return date.toLocaleDateString('ar-IQ', {
      timeZone: IRAQ_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateOrIso || 'غير محدد');
  }
}

/**
 * تنسيق الوقت فقط بتوقيت العراق (Asia/Baghdad)
 * مثال: "07:15 م"
 */
export function formatIraqTime(dateOrIso?: string | number | Date | null): string {
  const ms = parseSafeTimestamp(dateOrIso);
  if (!ms) return 'غير محدد';

  try {
    const date = new Date(ms);
    return date.toLocaleTimeString('ar-IQ', {
      timeZone: IRAQ_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateOrIso || 'غير محدد');
  }
}

/**
 * حساب الوقت النسبي الدقيق (منذ كم مضى) بتفادي انزياح الساعات الثلاث
 */
export function formatRelativeIraq(dateOrIso?: string | number | Date | null): string {
  const ms = parseSafeTimestamp(dateOrIso);
  if (!ms) return 'غير مسجل';

  try {
    const now = Date.now();
    const diffMs = Math.max(0, now - ms);
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'الآن (نشط)';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 30) return `منذ ${diffDays} يوم`;

    return formatIraqDateTime(ms, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(dateOrIso || 'غير مسجل');
  }
}
