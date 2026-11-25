import { MonthlyModel, TermModel, TeacherProfile, StudentRow } from '../types';
import { getCurrentAcademicYear } from './dateUtils';

export const STORAGE_KEYS = {
  MODELS: 'teacher_gradebook_models_v2',
  TERMS: 'teacher_gradebook_terms_v2',
  PROFILE: 'teacher_gradebook_profile_v2',
  ACTIVE_MODEL: 'teacher_gradebook_active_model_v2',
  ACTIVE_TERM: 'teacher_gradebook_active_term_v2',
};

export const DEFAULT_TEACHER_PROFILE: TeacherProfile = {
  teacherName: '',
  schoolName: '',
  subject: '',
  academicYear: getCurrentAcademicYear(),
  governorate: '',
};

export function normalizeLegacyDefaultAcademicYear(
  profile: TeacherProfile,
  userUid?: string
): { profile: TeacherProfile; migrated: boolean } {
  const currentAcademicYear = getCurrentAcademicYear();
  const trimmed = (profile.academicYear || '').trim();
  const isLegacyDefault = !trimmed || /^2024\s*-\s*2025$/.test(trimmed);
  if (!isLegacyDefault) {
    return { profile, migrated: false };
  }

  const migrationKey = getScopedStorageKey('gradebook_academic_year_migrated_v1', userUid);
  try {
    if (!trimmed) {
      return {
        profile: { ...profile, academicYear: currentAcademicYear },
        migrated: true,
      };
    }
    if (localStorage.getItem(migrationKey) === '1') {
      return { profile, migrated: false };
    }
    localStorage.setItem(migrationKey, '1');
  } catch {}

  return {
    profile: { ...profile, academicYear: currentAcademicYear },
    migrated: true,
  };
}

export const INITIAL_MONTHLY_MODELS: MonthlyModel[] = [];
export const INITIAL_TERMS: TermModel[] = [];

/**
 * Returns a user-scoped storage key to ensure complete data isolation between users.
 * No user will ever see or access another user's local gradebook data.
 */
export function getScopedStorageKey(baseKey: string, userUid?: string): string {
  let uid = userUid;
  if (!uid && typeof window !== 'undefined') {
    try {
      const rawUser = localStorage.getItem('gradebook_auth_current_user_v2');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed && parsed.uid) uid = parsed.uid;
      }
    } catch {}
  }
  return uid ? `${baseKey}_${uid}` : `${baseKey}_guest`;
}

function hasStudentData(st: StudentRow): boolean {
  if (st.writtenRawScore !== null && st.writtenRawScore !== undefined) return true;
  if (st.notes && st.notes.trim() !== '') return true;
  if (st.scores) {
    for (const k in st.scores) {
      const v = st.scores[k];
      if (v !== null && v !== undefined) return true;
    }
  }
  if (st.participationHistory) {
    for (const k in st.participationHistory) {
      if (st.participationHistory[k]?.length) return true;
    }
  }
  if (st.attendanceRecords) {
    for (const k in st.attendanceRecords) {
      if (st.attendanceRecords[k]?.length) return true;
    }
  }
  return false;
}

function quickNormArabic(str: string): string {
  return (str || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .toLowerCase();
}

function quickNormSection(sec?: string): string {
  const s = quickNormArabic(sec || '')
    .replace(/^(شعبة|الشعبة|فصل|الفصل|مجموعة|المجموعة|قاعة|القاعة)\s*/i, '')
    .replace(/[()[\]{}«»"']/g, '')
    .trim();
  return s || 'أ';
}

export function harmonizeStudentIds(models: MonthlyModel[]): MonthlyModel[] {
  if (!models || models.length === 0) return models;

  // Map canonical (name + grade) -> authoritative student ID
  const idByNameAndGrade = new Map<string, string>();
  const idByNameOnly = new Map<string, string>();

  for (const m of models) {
    for (const st of m.students || []) {
      const nameCanon = quickNormArabic(st.name || '');
      if (!nameCanon) continue;
      const gradeCanon = quickNormArabic(st.gradeLevel || m.gradeLevel || '');
      const fullKey = `${nameCanon}::${gradeCanon}`;
      if (!idByNameAndGrade.has(fullKey)) {
        idByNameAndGrade.set(fullKey, st.id);
      }
      if (!idByNameOnly.has(nameCanon)) {
        idByNameOnly.set(nameCanon, st.id);
      }
    }
  }

  let anyModelChanged = false;

  const nextModels = models.map((m) => {
    const currentStudents = m.students || [];
    if (currentStudents.length === 0) return m;

    const modelGradeCanon = quickNormArabic(m.gradeLevel || '');
    const assignedSecSet =
      m.assignedSections && m.assignedSections.length > 0
        ? new Set(m.assignedSections.map((s) => quickNormSection(s)))
        : null;

    let modelChanged = false;
    const seenKeys = new Set<string>();
    const nextStudents: StudentRow[] = [];

    for (const st of currentStudents) {
      const nameCanon = quickNormArabic(st.name || '');
      const stGradeCanon = quickNormArabic(st.gradeLevel || '');
      const stSecCanon = quickNormSection(st.section);
      const hasData = hasStudentData(st);

      // Safely prune empty phantom rows that belong to a different grade or unassigned section
      if (!hasData) {
        if (modelGradeCanon && stGradeCanon && stGradeCanon !== modelGradeCanon) {
          modelChanged = true;
          continue;
        }
        if (assignedSecSet && st.section && !assignedSecSet.has(stSecCanon)) {
          modelChanged = true;
          continue;
        }
      }

      const fullKey = `${nameCanon}::${stGradeCanon || modelGradeCanon}`;
      const canonicalId = nameCanon
        ? idByNameAndGrade.get(fullKey) || idByNameOnly.get(nameCanon) || st.id
        : st.id;

      // Deduplicate identical student entries inside the same model
      const dedupeKey = nameCanon
        ? `${nameCanon}::${stGradeCanon}::${stSecCanon}`
        : `id:${st.id}`;
      if (seenKeys.has(dedupeKey)) {
        if (!hasData) {
          modelChanged = true;
          continue;
        }
      } else {
        seenKeys.add(dedupeKey);
      }

      if (canonicalId !== st.id) {
        modelChanged = true;
        nextStudents.push({ ...st, id: canonicalId });
      } else {
        nextStudents.push(st);
      }
    }

    if (!modelChanged) return m;
    anyModelChanged = true;
    return {
      ...m,
      students: nextStudents,
    };
  });

  return anyModelChanged ? nextModels : models;
}

export function loadModels(userUid?: string): MonthlyModel[] {
  try {
    const key = getScopedStorageKey(STORAGE_KEYS.MODELS, userUid);
    let raw = localStorage.getItem(key);

    // One-time automatic migration of legacy un-scoped data for current user
    if (!raw && key !== STORAGE_KEYS.MODELS) {
      const legacyRaw = localStorage.getItem(STORAGE_KEYS.MODELS);
      if (legacyRaw) {
        raw = legacyRaw;
        try {
          localStorage.setItem(key, legacyRaw);
          localStorage.removeItem(STORAGE_KEYS.MODELS);
        } catch {}
      }
    }

    // If user has no data yet, check guest key
    if (!raw && userUid && userUid !== 'guest') {
      const guestKey = getScopedStorageKey(STORAGE_KEYS.MODELS, 'guest');
      const guestRaw = localStorage.getItem(guestKey);
      if (guestRaw) {
        raw = guestRaw;
        try {
          localStorage.setItem(key, guestRaw);
        } catch {}
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (
          parsed.length === 1 &&
          parsed[0].id === 'month-1' &&
          (!parsed[0].students || parsed[0].students.length === 0)
        ) {
          return [];
        }
        if (parsed.length > 0) {
          const sanitized = parsed.map((m: MonthlyModel) => ({
            ...m,
            writtenWeight:
              m.writtenWeight === 70 && (!m.customColumns || m.customColumns.length === 0)
                ? null
                : m.writtenWeight ?? null,
          }));
          return harmonizeStudentIds(sanitized);
        }
        return [];
      }
    }
  } catch (e) {
    console.error('Failed to load models from storage', e);
  }
  return INITIAL_MONTHLY_MODELS;
}

export function saveModels(models: MonthlyModel[], userUid?: string): void {
  try {
    const key = getScopedStorageKey(STORAGE_KEYS.MODELS, userUid);
    localStorage.setItem(key, JSON.stringify(models));
  } catch (e) {
    console.error('Failed to save models to storage', e);
  }
}

export function loadTerms(userUid?: string): TermModel[] {
  try {
    const key = getScopedStorageKey(STORAGE_KEYS.TERMS, userUid);
    let raw = localStorage.getItem(key);

    if (!raw && key !== STORAGE_KEYS.TERMS) {
      const legacyRaw = localStorage.getItem(STORAGE_KEYS.TERMS);
      if (legacyRaw) {
        raw = legacyRaw;
        try {
          localStorage.setItem(key, legacyRaw);
          localStorage.removeItem(STORAGE_KEYS.TERMS);
        } catch {}
      }
    }

    // If user has no terms yet, check guest key
    if (!raw && userUid && userUid !== 'guest') {
      const guestKey = getScopedStorageKey(STORAGE_KEYS.TERMS, 'guest');
      const guestRaw = localStorage.getItem(guestKey);
      if (guestRaw) {
        raw = guestRaw;
        try {
          localStorage.setItem(key, guestRaw);
        } catch {}
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (
          parsed.length === 1 &&
          parsed[0].id === 'term-1' &&
          (!parsed[0].selectedModelIds || parsed[0].selectedModelIds.length === 0)
        ) {
          return [];
        }
        if (parsed.length > 0) {
          return parsed;
        }
        return [];
      }
    }
  } catch (e) {
    console.error('Failed to load terms from storage', e);
  }
  return INITIAL_TERMS;
}

export function saveTerms(terms: TermModel[], userUid?: string): void {
  try {
    const key = getScopedStorageKey(STORAGE_KEYS.TERMS, userUid);
    localStorage.setItem(key, JSON.stringify(terms));
  } catch (e) {
    console.error('Failed to save terms to storage', e);
  }
}

export function isTestProfile(p: TeacherProfile | null | undefined): boolean {
  if (!p) return true;
  const tName = (p.teacherName || '').trim();
  const sName = (p.schoolName || '').trim();
  const subj = (p.subject || '').trim();
  const gov = (p.governorate || '').trim();

  if (
    tName.includes('مستخدم تجريبي') ||
    tName.toLowerCase().includes('demo') ||
    tName.toLowerCase().includes('trial') ||
    tName === 'أ. أحمد مصطفى الهاشمي'
  ) {
    return true;
  }

  if (
    sName === 'العراق' ||
    sName === 'ثانوية المتفوقين النموذجية' ||
    subj === 'غربي' ||
    (gov === 'كركوك' && (sName === 'العراق' || subj === 'غربي' || tName.includes('مستخدم تجريبي')))
  ) {
    return true;
  }

  return false;
}

export function loadProfile(userUid?: string): TeacherProfile {
  try {
    const key = getScopedStorageKey(STORAGE_KEYS.PROFILE, userUid);
    let raw = localStorage.getItem(key);

    if (!raw && key !== STORAGE_KEYS.PROFILE) {
      const legacyRaw = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (legacyRaw) {
        raw = legacyRaw;
        try {
          localStorage.setItem(key, legacyRaw);
          localStorage.removeItem(STORAGE_KEYS.PROFILE);
        } catch {}
      }
    }

    // If user has no profile yet, check guest key
    if (!raw && userUid && userUid !== 'guest') {
      const guestKey = getScopedStorageKey(STORAGE_KEYS.PROFILE, 'guest');
      const guestRaw = localStorage.getItem(guestKey);
      if (guestRaw) {
        raw = guestRaw;
        try {
          localStorage.setItem(key, guestRaw);
        } catch {}
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (isTestProfile(parsed)) {
        localStorage.removeItem(key);
        return { ...DEFAULT_TEACHER_PROFILE, academicYear: getCurrentAcademicYear() };
      }
      const { profile: migratedProfile, migrated } = normalizeLegacyDefaultAcademicYear(parsed, userUid);
      if (migrated) {
        try {
          localStorage.setItem(key, JSON.stringify(migratedProfile));
        } catch {}
      }
      return migratedProfile;
    }
  } catch (e) {
    console.error('Failed to load profile', e);
  }
  return { ...DEFAULT_TEACHER_PROFILE, academicYear: getCurrentAcademicYear() };
}

export function saveProfile(profile: TeacherProfile, userUid?: string): void {
  try {
    const key = getScopedStorageKey(STORAGE_KEYS.PROFILE, userUid);
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function resetToDefaults(userUid?: string): {
  models: MonthlyModel[];
  terms: TermModel[];
  profile: TeacherProfile;
} {
  const mKey = getScopedStorageKey(STORAGE_KEYS.MODELS, userUid);
  const tKey = getScopedStorageKey(STORAGE_KEYS.TERMS, userUid);
  const pKey = getScopedStorageKey(STORAGE_KEYS.PROFILE, userUid);
  localStorage.removeItem(mKey);
  localStorage.removeItem(tKey);
  localStorage.removeItem(pKey);
  localStorage.removeItem(STORAGE_KEYS.MODELS);
  localStorage.removeItem(STORAGE_KEYS.TERMS);
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  return {
    models: INITIAL_MONTHLY_MODELS,
    terms: INITIAL_TERMS,
    profile: { ...DEFAULT_TEACHER_PROFILE, academicYear: getCurrentAcademicYear() },
  };
}

export function exportBackupData(
  userUid?: string,
  overrideData?: {
    models?: MonthlyModel[];
    terms?: TermModel[];
    profile?: TeacherProfile;
    personalData?: unknown;
  }
): string {
  const data: Record<string, unknown> = {
    app: 'TeacherGradebook',
    version: '2.0',
    exportDate: new Date().toISOString(),
    profile: overrideData?.profile ?? loadProfile(userUid),
    models: overrideData?.models ?? loadModels(userUid),
    terms: overrideData?.terms ?? loadTerms(userUid),
  };
  if (overrideData?.personalData !== undefined) {
    data.personalData = overrideData.personalData;
  }
  return JSON.stringify(data, null, 2);
}

export interface ParsedBackupResult {
  valid: boolean;
  models: MonthlyModel[];
  terms: TermModel[];
  profile: TeacherProfile | null;
  personalData?: unknown;
}

export function parseBackupData(jsonString: string, userUid?: string): ParsedBackupResult {
  try {
    const cleanedJson = (jsonString || '').replace(/^\uFEFF/, '').trim();
    if (!cleanedJson) {
      return { valid: false, models: [], terms: [], profile: null };
    }

    const rawParsed = JSON.parse(cleanedJson);
    const payload =
      rawParsed && typeof rawParsed === 'object' && rawParsed.data && !Array.isArray(rawParsed.models)
        ? rawParsed.data
        : rawParsed;

    if (!payload || typeof payload !== 'object') {
      return { valid: false, models: [], terms: [], profile: null };
    }

    const hasModels = Array.isArray(payload.models);
    const hasTerms = Array.isArray(payload.terms);
    const hasProfile = Boolean(payload.profile && typeof payload.profile === 'object');

    if (!hasModels && !hasTerms && !hasProfile) {
      return { valid: false, models: [], terms: [], profile: null };
    }

    const rawModels: MonthlyModel[] = hasModels ? payload.models : [];
    const sanitizedModels = harmonizeStudentIds(
      rawModels.map((m: MonthlyModel) => ({
        ...m,
        writtenWeight:
          m.writtenWeight === 70 && (!m.customColumns || m.customColumns.length === 0)
            ? null
            : m.writtenWeight ?? null,
      }))
    );

    const rawTerms: TermModel[] = hasTerms ? payload.terms : [];

    let nextProfile: TeacherProfile | null = null;
    if (hasProfile && !isTestProfile(payload.profile)) {
      const { profile: migratedProfile } = normalizeLegacyDefaultAcademicYear(
        payload.profile,
        userUid
      );
      nextProfile = migratedProfile;
    }

    return {
      valid: true,
      models: sanitizedModels,
      terms: rawTerms,
      profile: nextProfile,
      personalData: payload.personalData,
    };
  } catch (e) {
    console.error('Failed to parse backup JSON', e);
    return { valid: false, models: [], terms: [], profile: null };
  }
}

export function importBackupData(jsonString: string, userUid?: string): boolean {
  const parsed = parseBackupData(jsonString, userUid);
  if (!parsed.valid) return false;

  saveModels(parsed.models, userUid);
  saveTerms(parsed.terms, userUid);
  if (parsed.profile) {
    saveProfile(parsed.profile, userUid);
  }
  return true;
}
