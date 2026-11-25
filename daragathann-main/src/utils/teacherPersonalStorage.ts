import {
  TeacherPersonalData,
  SchedulePeriod,
  WeekdayKey,
  TeacherAlert,
  SavedExamPaper,
  ExamBuilderData,
} from '../types/teacherPersonal';
import { getScopedStorageKey } from './storage';

const PERSONAL_STORAGE_BASE_KEY = 'teacher_personal_workspace_v1';

export const WEEKDAYS_META: { key: WeekdayKey; label: string; jsDay: number }[] = [
  { key: 'sun', label: 'الأحد', jsDay: 0 },
  { key: 'mon', label: 'الإثنين', jsDay: 1 },
  { key: 'tue', label: 'الثلاثاء', jsDay: 2 },
  { key: 'wed', label: 'الأربعاء', jsDay: 3 },
  { key: 'thu', label: 'الخميس', jsDay: 4 },
  { key: 'fri', label: 'الجمعة', jsDay: 5 },
  { key: 'sat', label: 'السبت', jsDay: 6 },
];

export const DEFAULT_PERIODS: SchedulePeriod[] = [
  { id: 'p-1', label: 'الأولى', timeRange: '08:00 - 08:45' },
  { id: 'p-2', label: 'الثانية', timeRange: '08:50 - 09:35' },
  { id: 'p-3', label: 'الثالثة', timeRange: '09:45 - 10:30' },
  { id: 'p-4', label: 'الرابعة', timeRange: '10:40 - 11:25' },
  { id: 'p-5', label: 'الخامسة', timeRange: '11:30 - 12:15' },
  { id: 'p-6', label: 'السادسة', timeRange: '12:20 - 01:05' },
];

export function createDefaultExamPaper(overrides?: {
  schoolName?: string;
  subject?: string;
  academicYear?: string;
  teacherName?: string;
  schoolLogo?: string;
}): SavedExamPaper {
  const nowIso = new Date().toISOString();
  return {
    id: `exam-draft-${Date.now()}`,
    title: '',
    header: {
      rightLines: [
        overrides?.schoolName ? `المدرسة : ${overrides.schoolName}` : 'المدرسة : ',
        'الصف : ',
        overrides?.subject ? `المادة : ${overrides.subject}` : 'المادة : ',
      ],
      leftLines: [
        'اسم الامتحان : ',
        'الوقت : ساعة واحدة',
        overrides?.academicYear
          ? `العام الدراسي : ( ${overrides.academicYear} )`
          : 'العام الدراسي : ',
      ],
      showLogo: Boolean(overrides?.schoolLogo),
      logoDataUrl: overrides?.schoolLogo || '',
      showStudentInfo: true,
      studentNameLabel: 'اسم الطالب :',
      studentNumberLabel: 'الشعبة / الرقم :',
      showNote: true,
      noteText: '',
      footerText: overrides?.teacherName ? `مدرس المادة : ${overrides.teacherName}` : '',
    },
    questions: [
      {
        id: `q-${Date.now()}-1`,
        label: '',
        prompt: '',
        marks: '',
        branchStyle: 'arabic_num',
        branchLayout: 'vertical',
        branches: [],
      },
    ],
    useArabicDigits: true,
    textDir: 'rtl',
    fontSize: 'md',
    updatedAt: nowIso,
  };
}

export function createSampleExamPaper(overrides?: {
  schoolLogo?: string;
}): SavedExamPaper {
  const now = Date.now();
  return {
    id: `exam-sample-${now}`,
    title: 'نموذج أسئلة استرشادي (مثال)',
    header: {
      rightLines: [
        'اللجنة الدائمة للامتحانات',
        'الدراسة : الإبتدائية',
        'المادة : العلوم',
      ],
      leftLines: [
        'جمهورية العراق - وزارة التربية',
        'الدور الأول : ( ٢٠٢٥ / ٢٠٢٦ )',
        'الوقت : ساعتان فقط',
      ],
      showLogo: Boolean(overrides?.schoolLogo),
      logoDataUrl: overrides?.schoolLogo || '',
      showStudentInfo: true,
      studentNameLabel: 'اسم التلميذ :',
      studentNumberLabel: 'الرقم الامتحاني :',
      showNote: true,
      noteText: 'ملاحظة : أجب عن خمسة أسئلة فقط ، ولكل سؤال ( ٢٠ ) درجة .',
      footerText: 'مع تمنياتنا لكم بالنجاح والتوفيق',
    },
    questions: [
      {
        id: `sq-${now}-1`,
        label: 'س١',
        prompt: 'عرّف ( خمسة ) مما يأتي :',
        marks: '20 درجة',
        branchStyle: 'none',
        branchLayout: 'inline',
        branches: [
          { id: `sb-${now}-11`, text: 'الفلق' },
          { id: `sb-${now}-12`, text: 'التطعيم بالبراعم' },
          { id: `sb-${now}-13`, text: 'الجمجمة' },
          { id: `sb-${now}-14`, text: 'الأظافر' },
          { id: `sb-${now}-15`, text: 'التأريض' },
          { id: `sb-${now}-16`, text: 'العضلات' },
        ],
      },
      {
        id: `sq-${now}-2`,
        label: 'س٢',
        prompt: 'إملأ ( خمسة ) من الفراغات الآتية بما يناسبها :',
        marks: '20 درجة',
        branchStyle: 'arabic_num',
        branchLayout: 'vertical',
        branches: [
          { id: `sb-${now}-21`, text: '............ هو ارتفاع الماء في البحار والمحيطات عند الشواطئ في أوقات معينة .' },
          { id: `sb-${now}-22`, text: '............ هو نبات عشبي معمّر ينمو بكثرة في المناطق الرملية الرطبة على شواطئ الأنهار .' },
          { id: `sb-${now}-23`, text: 'يتكون الجهاز العصبي الـ ............ من الدماغ والحبل الشوكي .' },
          { id: `sb-${now}-24`, text: '............ هو مادة تسمح بسريان التيار الكهربائي خلالها بسهولة مثل النحاس .' },
          { id: `sb-${now}-25`, text: 'الضوء هو شكل من أشكال الطاقة ، وإنه يسير بخطوط ............ في جميع الاتجاهات .' },
        ],
      },
      {
        id: `sq-${now}-3`,
        label: 'س٣',
        prompt: 'أجب عن فرعين مما يأتي :',
        marks: '20 درجة',
        branchStyle: 'arabic_alpha',
        branchLayout: 'vertical',
        branches: [
          { id: `sb-${now}-31`, text: 'ما المعادلة الكيميائية ؟ وما أهميتها ؟' },
          { id: `sb-${now}-32`, text: 'ما هي طبقات العين ؟ عددها واشرح واحدة منها .' },
          { id: `sb-${now}-33`, text: 'قارن بين البروتونات والنيوترونات .' },
        ],
      },
      {
        id: `sq-${now}-4`,
        label: 'س٤',
        prompt: 'اختر الإجابة الصحيحة من بين الأقواس لـ ( ثلاث ) مما يأتي :',
        marks: '20 درجة',
        branchStyle: 'arabic_num',
        branchLayout: 'vertical',
        branches: [
          { id: `sb-${now}-41`, text: 'التكاثر الخضري هو نوع من أنواع التكاثر الطبيعي للنباتات دون الحاجة لـ ( البذور ، الفسيلة ، القلم ) .' },
          { id: `sb-${now}-42`, text: 'براعم الحلاوة تقع في : ( القسم الخلفي للسان ، مقدمة اللسان ، جانبي اللسان الخلفيين ) .' },
          { id: `sb-${now}-43`, text: 'أصغر وحدة في المادة تحمل خواص تلك المادة الأصلية : ( العنصر ، الجزيء ، المركب ) .' },
          { id: `sb-${now}-44`, text: 'الصفائح التي تقع أسفل المحيطات تدعى بالصفائح : ( القارية ، المتباعدة ، المحيطية ) .' },
        ],
      },
    ],
    useArabicDigits: true,
    textDir: 'rtl',
    fontSize: 'md',
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultExamBuilderData(): ExamBuilderData {
  return {
    activeExamId: null,
    draft: createDefaultExamPaper(),
    savedExams: [],
  };
}

export function createDefaultTeacherPersonalData(): TeacherPersonalData {
  return {
    schedule: {
      periods: DEFAULT_PERIODS.map((p) => ({ ...p })),
      entries: [],
      showSaturday: false,
      showFriday: false,
      activeScheduleId: null,
      draftGradeLevel: '',
      draftSection: '',
      draftCells: {},
      savedSchedules: [],
    },
    notes: [],
    alerts: [],
    exams: createDefaultExamBuilderData(),
  };
}

export function loadTeacherPersonalData(userUid?: string): TeacherPersonalData {
  try {
    const key = getScopedStorageKey(PERSONAL_STORAGE_BASE_KEY, userUid);
    const raw = localStorage.getItem(key);
    if (!raw) return createDefaultTeacherPersonalData();
    const parsed = JSON.parse(raw);
    const defaults = createDefaultTeacherPersonalData();

    const rawEntries = Array.isArray(parsed?.schedule?.entries)
      ? parsed.schedule.entries
      : [];
    let draftCells: Record<string, string> =
      parsed?.schedule?.draftCells && typeof parsed.schedule.draftCells === 'object'
        ? parsed.schedule.draftCells
        : {};

    // Migrate any legacy entries into draftCells if draftCells is empty
    if (Object.keys(draftCells).length === 0 && rawEntries.length > 0) {
      const migrated: Record<string, string> = {};
      rawEntries.forEach((entry: { day?: string; periodId?: string; subject?: string; className?: string }) => {
        if (entry.day && entry.periodId && entry.subject) {
          const text = entry.className
            ? `${entry.subject} (${entry.className})`
            : entry.subject;
          migrated[`${entry.day}::${entry.periodId}`] = text;
        }
      });
      draftCells = migrated;
    }

    return {
      schedule: {
        periods:
          Array.isArray(parsed?.schedule?.periods) && parsed.schedule.periods.length > 0
            ? parsed.schedule.periods
            : defaults.schedule.periods,
        entries: rawEntries,
        showSaturday: Boolean(parsed?.schedule?.showSaturday),
        showFriday: Boolean(parsed?.schedule?.showFriday),
        activeScheduleId: parsed?.schedule?.activeScheduleId || null,
        draftGradeLevel:
          typeof parsed?.schedule?.draftGradeLevel === 'string'
            ? parsed.schedule.draftGradeLevel
            : '',
        draftSection:
          typeof parsed?.schedule?.draftSection === 'string'
            ? parsed.schedule.draftSection
            : '',
        draftCells,
        savedSchedules: Array.isArray(parsed?.schedule?.savedSchedules)
          ? parsed.schedule.savedSchedules
          : [],
      },
      notes: Array.isArray(parsed?.notes) ? parsed.notes : [],
      alerts: Array.isArray(parsed?.alerts) ? parsed.alerts : [],
      exams:
        parsed?.exams && typeof parsed.exams === 'object' && parsed.exams.draft
          ? (() => {
              const normalizePaper = (rawPaper: Record<string, unknown>): SavedExamPaper => {
                const def = createDefaultExamPaper();
                const rawHeader = (rawPaper?.header || {}) as Record<string, unknown>;
                const rightLines = Array.isArray(rawHeader.rightLines)
                  ? (rawHeader.rightLines as string[])
                  : [
                      typeof rawHeader.rightTop === 'string' ? rawHeader.rightTop : '',
                      typeof rawHeader.rightMiddle === 'string' ? rawHeader.rightMiddle : '',
                      typeof rawHeader.rightBottom === 'string' ? rawHeader.rightBottom : '',
                    ].filter((v) => v !== '');
                const leftLines = Array.isArray(rawHeader.leftLines)
                  ? (rawHeader.leftLines as string[])
                  : [
                      typeof rawHeader.leftTop === 'string' ? rawHeader.leftTop : '',
                      typeof rawHeader.leftMiddle === 'string' ? rawHeader.leftMiddle : '',
                      typeof rawHeader.leftBottom === 'string' ? rawHeader.leftBottom : '',
                    ].filter((v) => v !== '');

                return {
                  ...def,
                  ...(rawPaper as Partial<SavedExamPaper>),
                  header: {
                    ...def.header,
                    ...(rawHeader as Partial<SavedExamPaper['header']>),
                    rightLines: rightLines.length > 0 ? rightLines : def.header.rightLines,
                    leftLines: leftLines.length > 0 ? leftLines : def.header.leftLines,
                    showNote:
                      typeof rawHeader.showNote === 'boolean' ? rawHeader.showNote : true,
                  },
                  textDir: rawPaper.textDir === 'ltr' ? 'ltr' : 'rtl',
                  questions: Array.isArray(rawPaper.questions)
                    ? (rawPaper.questions as SavedExamPaper['questions']).map((q) =>
                        q &&
                        !q.prompt?.trim() &&
                        (!q.branches || q.branches.length === 0) &&
                        /^س[٠-٩0-9]+$/.test((q.label || '').trim())
                          ? { ...q, label: '' }
                          : q
                      )
                    : def.questions,
                };
              };

              return {
                activeExamId: parsed.exams.activeExamId || null,
                draft: normalizePaper(parsed.exams.draft),
                savedExams: Array.isArray(parsed.exams.savedExams)
                  ? parsed.exams.savedExams.map(normalizePaper)
                  : [],
              };
            })()
          : defaults.exams,
    };
  } catch (e) {
    console.warn('Failed to load teacher personal workspace data:', e);
    return createDefaultTeacherPersonalData();
  }
}

export function saveTeacherPersonalData(
  data: TeacherPersonalData,
  userUid?: string
): void {
  try {
    const key = getScopedStorageKey(PERSONAL_STORAGE_BASE_KEY, userUid);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save teacher personal workspace data:', e);
  }
}

export function getTodayWeekdayKey(): WeekdayKey {
  const jsDay = new Date().getDay();
  const match = WEEKDAYS_META.find((d) => d.jsDay === jsDay);
  return match ? match.key : 'sun';
}

export function getLocalDateStr(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalTimeStr(date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Evaluates whether a TeacherAlert is due at `now`, returning a unique occurrence key
 * if it should trigger right now, or null otherwise.
 */
export function evaluateDueAlertKey(alert: TeacherAlert, now = new Date()): string | null {
  if (!alert.isActive) return null;

  const todayDate = getLocalDateStr(now);
  const currentTime = getLocalTimeStr(now);
  const todayKey = getTodayWeekdayKey();

  // Check snooze first
  if (alert.snoozeUntil) {
    const snoozeTarget = new Date(alert.snoozeUntil);
    if (!isNaN(snoozeTarget.getTime())) {
      if (now.getTime() >= snoozeTarget.getTime()) {
        const snoozeOccKey = `snooze_${alert.snoozeUntil}`;
        if (alert.lastTriggeredKey !== snoozeOccKey) {
          return snoozeOccKey;
        }
      }
      // While snoozed for the future, suppress regular trigger
      return null;
    }
  }

  if (!alert.time) return null;

  // Allow a 2-minute trigger window if the tab was briefly throttled
  const [targetH, targetM] = alert.time.split(':').map(Number);
  if (isNaN(targetH) || isNaN(targetM)) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = targetH * 60 + targetM;
  const diff = nowMinutes - targetMinutes;
  const isTimeReached = diff >= 0 && diff <= 2;

  if (!isTimeReached) return null;

  if (alert.repeat === 'once') {
    if (alert.date !== todayDate) return null;
    const occKey = `once_${todayDate}_${alert.time}`;
    return alert.lastTriggeredKey === occKey ? null : occKey;
  }

  if (alert.repeat === 'daily') {
    const occKey = `daily_${todayDate}_${alert.time}`;
    return alert.lastTriggeredKey === occKey ? null : occKey;
  }

  if (alert.repeat === 'weekly') {
    if (alert.repeatDay && alert.repeatDay !== todayKey) return null;
    const occKey = `weekly_${todayDate}_${alert.time}`;
    return alert.lastTriggeredKey === occKey ? null : occKey;
  }

  void currentTime;
  return null;
}

/**
 * Plays a gentle two-note chime via Web Audio API without requiring external sound files.
 */
export function playAlertChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + startOffset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    playTone(587.33, 0, 0.28); // D5
    playTone(880.0, 0.18, 0.42); // A5
  } catch {
    // Ignore audio context autoplay errors silently
  }
}
