import { MonthlyModel, TermModel, TeacherProfile, StudentRow } from '../types';

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
  academicYear: '2024 - 2025',
  governorate: '',
};

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

export function harmonizeStudentIds(models: MonthlyModel[]): MonthlyModel[] {
  if (!models || models.length <= 1) return models;

  interface MasterStudent {
    id: string;
    name: string;
    gradeLevel: string;
    section: string;
  }

  const masterList: MasterStudent[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  models.forEach((m) => {
    (m.students || []).forEach((st) => {
      const trimmedName = (st.name || '').trim();
      const normalizedName = trimmedName.toLowerCase();

      const isDuplicate = normalizedName
        ? seenNames.has(normalizedName)
        : seenIds.has(st.id);

      if (!isDuplicate) {
        if (normalizedName) seenNames.add(normalizedName);
        seenIds.add(st.id);

        masterList.push({
          id: st.id,
          name: trimmedName,
          gradeLevel: st.gradeLevel || '',
          section: st.section || 'أ',
        });
      }
    });
  });

  if (masterList.length === 0) return models;

  return models.map((m) => {
    const currentStudents = m.students || [];
    const byIdMap = new Map<string, StudentRow>();
    const byNameMap = new Map<string, StudentRow>();

    currentStudents.forEach((st) => {
      byIdMap.set(st.id, st);
      const nameKey = (st.name || '').trim().toLowerCase();
      if (nameKey) byNameMap.set(nameKey, st);
    });

    const synchronized: StudentRow[] = masterList.map((master) => {
      const nameKey = master.name.toLowerCase();
      const existing = (nameKey && byNameMap.get(nameKey)) || byIdMap.get(master.id);

      if (existing) {
        return {
          ...existing,
          id: master.id,
          name: master.name,
          gradeLevel: master.gradeLevel,
          section: master.section,
        };
      }

      return {
        id: master.id,
        name: master.name,
        gradeLevel: master.gradeLevel,
        section: master.section,
        writtenRawScore: null,
        scores: {},
        notes: '',
      };
    });

    return {
      ...m,
      students: synchronized,
    };
  });
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

    if (raw) {
      const parsed = JSON.parse(raw);
      if (isTestProfile(parsed)) {
        localStorage.removeItem(key);
        return DEFAULT_TEACHER_PROFILE;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load profile', e);
  }
  return DEFAULT_TEACHER_PROFILE;
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
    profile: DEFAULT_TEACHER_PROFILE,
  };
}

export function exportBackupData(userUid?: string): string {
  const data = {
    app: 'TeacherGradebook',
    version: '2.0',
    exportDate: new Date().toISOString(),
    profile: loadProfile(userUid),
    models: loadModels(userUid),
    terms: loadTerms(userUid),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string, userUid?: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data && data.models && Array.isArray(data.models)) {
      saveModels(data.models, userUid);
      if (data.terms && Array.isArray(data.terms)) {
        saveTerms(data.terms, userUid);
      }
      if (data.profile) {
        saveProfile(data.profile, userUid);
      }
      return true;
    }
  } catch (e) {
    console.error('Failed to parse backup JSON', e);
  }
  return false;
}
