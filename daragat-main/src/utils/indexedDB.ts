import { MonthlyModel, TermModel, TeacherProfile } from '../types';
import type { AppUser } from './auth';
import {
  loadModels as loadFromLocalStorageModels,
  loadTerms as loadFromLocalStorageTerms,
  loadProfile as loadFromLocalStorageProfile,
  isTestProfile,
  DEFAULT_TEACHER_PROFILE,
} from './storage';

const DB_NAME = 'TeacherGradebookIndexedDB';
const DB_VERSION = 2;

export interface PendingChange {
  id: string;
  type: 'models' | 'terms' | 'profile' | 'full';
  timestamp: string;
  data: any;
}

export interface AdminCommandRecord {
  id: string;
  action: 'cancel' | 'reactivate' | 'update_plan' | 'delete' | 'expire' | 'update_role';
  uid?: string;
  email: string;
  timestamp: string;
  details?: any;
}

let dbInstance: IDBDatabase | null = null;

// Initialize or open the IndexedDB database
export function openGradebookDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store for monthly models
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'id' });
      }

      // 2. Store for term models
      if (!db.objectStoreNames.contains('terms')) {
        db.createObjectStore('terms', { keyPath: 'id' });
      }

      // 3. Store for teacher profile (single object with key 'active_profile')
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }

      // 4. Store for pending changes to sync with server when back online
      if (!db.objectStoreNames.contains('pending_sync')) {
        db.createObjectStore('pending_sync', { keyPath: 'id' });
      }

      // 5. Store for general app metadata (lastSync, user, settings)
      if (!db.objectStoreNames.contains('app_meta')) {
        db.createObjectStore('app_meta', { keyPath: 'key' });
      }

      // 6. Store for registered / synced users
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'uid' });
        userStore.createIndex('email', 'email', { unique: false });
      }

      // 7. Store for cancelled accounts registry
      if (!db.objectStoreNames.contains('cancelled_accounts')) {
        db.createObjectStore('cancelled_accounts', { keyPath: 'email' });
      }

      // 8. Store for admin commands log (cancel, reactivate, update)
      if (!db.objectStoreNames.contains('admin_commands')) {
        db.createObjectStore('admin_commands', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

function getEffectiveUid(userUid?: string): string {
  if (userUid) return userUid;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('gradebook_auth_current_user_v2');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.uid) return u.uid;
      }
    } catch {}
  }
  return 'guest';
}

// ---------------- MODELS ----------------

export async function saveModelsToIndexedDB(models: MonthlyModel[], userUid?: string): Promise<void> {
  const effectiveUid = getEffectiveUid(userUid);
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('models', 'readwrite');
    const store = tx.objectStore('models');

    // Retrieve all to remove existing items for this specific user
    const existing = await new Promise<any[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const item of existing) {
      if (item.userUid === effectiveUid || (!item.userUid && effectiveUid === 'guest')) {
        store.delete(item.id);
      }
    }

    for (const model of models) {
      store.put({ ...model, userUid: effectiveUid });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error saving models to IndexedDB:', err);
  }
}

export async function loadModelsFromIndexedDB(userUid?: string): Promise<MonthlyModel[]> {
  const effectiveUid = getEffectiveUid(userUid);
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('models', 'readonly');
    const store = tx.objectStore('models');

    const result = await new Promise<any[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const userModels = (result || []).filter(
      (m: any) => m.userUid === effectiveUid || (!m.userUid && effectiveUid === 'guest')
    );

    if (userModels && userModels.length > 0) {
      return userModels as MonthlyModel[];
    }
  } catch (err) {
    console.warn('Fallback: reading models from localStorage', err);
  }

  // Fallback to localStorage if empty or error
  return loadFromLocalStorageModels(effectiveUid);
}

// ---------------- TERMS ----------------

export async function saveTermsToIndexedDB(terms: TermModel[], userUid?: string): Promise<void> {
  const effectiveUid = getEffectiveUid(userUid);
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('terms', 'readwrite');
    const store = tx.objectStore('terms');

    const existing = await new Promise<any[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const item of existing) {
      if (item.userUid === effectiveUid || (!item.userUid && effectiveUid === 'guest')) {
        store.delete(item.id);
      }
    }

    for (const term of terms) {
      store.put({ ...term, userUid: effectiveUid });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error saving terms to IndexedDB:', err);
  }
}

export async function loadTermsFromIndexedDB(userUid?: string): Promise<TermModel[]> {
  const effectiveUid = getEffectiveUid(userUid);
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('terms', 'readonly');
    const store = tx.objectStore('terms');

    const result = await new Promise<any[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const userTerms = (result || []).filter(
      (t: any) => t.userUid === effectiveUid || (!t.userUid && effectiveUid === 'guest')
    );

    if (userTerms && userTerms.length > 0) {
      return userTerms as TermModel[];
    }
  } catch (err) {
    console.warn('Fallback: reading terms from localStorage', err);
  }

  return loadFromLocalStorageTerms(effectiveUid);
}

// ---------------- PROFILE ----------------

export async function saveProfileToIndexedDB(profile: TeacherProfile, userUid?: string): Promise<void> {
  const effectiveUid = getEffectiveUid(userUid);
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('profile', 'readwrite');
    const store = tx.objectStore('profile');

    store.put({ id: `active_profile_${effectiveUid}`, userUid: effectiveUid, ...profile });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error saving profile to IndexedDB:', err);
  }
}

export async function loadProfileFromIndexedDB(userUid?: string): Promise<TeacherProfile> {
  const effectiveUid = getEffectiveUid(userUid);
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('profile', 'readonly');
    const store = tx.objectStore('profile');

    const result = await new Promise<any>((resolve, reject) => {
      const req = store.get(`active_profile_${effectiveUid}`);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (result) {
      const { id, userUid: _, ...cleanProfile } = result;
      if (isTestProfile(cleanProfile as TeacherProfile)) {
        try {
          const deleteTx = db.transaction('profile', 'readwrite');
          deleteTx.objectStore('profile').delete(`active_profile_${effectiveUid}`);
        } catch {}
        return DEFAULT_TEACHER_PROFILE;
      }
      return cleanProfile as TeacherProfile;
    }
  } catch (err) {
    console.warn('Fallback: reading profile from localStorage', err);
  }

  return loadFromLocalStorageProfile(effectiveUid);
}

// ---------------- PENDING SYNC QUEUE ----------------

export async function queuePendingSync(change: Omit<PendingChange, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('pending_sync', 'readwrite');
    const store = tx.objectStore('pending_sync');

    // Use change.type as stable ID ('models', 'terms', 'profile', 'full')
    // This strictly prevents accumulating 200+ duplicate mutations on every keystroke
    const item: PendingChange = {
      id: change.type,
      timestamp: new Date().toISOString(),
      type: change.type,
      data: change.data,
    };

    store.put(item);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error queueing pending sync:', err);
  }
}

export async function consolidatePendingSyncQueue(): Promise<void> {
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('pending_sync', 'readwrite');
    const store = tx.objectStore('pending_sync');
    store.clear();
    store.put({
      id: 'full',
      type: 'full',
      timestamp: new Date().toISOString(),
      data: null,
    });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function getPendingSyncItems(): Promise<PendingChange[]> {
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('pending_sync', 'readonly');
    const store = tx.objectStore('pending_sync');

    const items = await new Promise<PendingChange[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    // If an older session left 200+ bloated entries, automatically purge and consolidate to 1
    if (items.length > 3) {
      setTimeout(() => consolidatePendingSyncQueue(), 0);
      return [{ id: 'full', type: 'full', timestamp: new Date().toISOString(), data: null }];
    }

    return items;
  } catch {
    return [];
  }
}

export async function clearPendingSyncItems(): Promise<void> {
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('pending_sync', 'readwrite');
    const store = tx.objectStore('pending_sync');
    store.clear();

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error clearing pending sync:', err);
  }
}

// ---------------- SEED / INITIAL SYNC MIGRATION ----------------

export async function ensureIndexedDBInitialized(): Promise<void> {
  try {
    const db = await openGradebookDB();
    const tx = db.transaction('models', 'readonly');
    const countReq = tx.objectStore('models').count();

    const count = await new Promise<number>((resolve) => {
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => resolve(0);
    });

    if (count === 0) {
      // Migrate initial data from localStorage or default seed
      const initialModels = loadFromLocalStorageModels();
      const initialTerms = loadFromLocalStorageTerms();
      const initialProfile = loadFromLocalStorageProfile();

      await Promise.all([
        saveModelsToIndexedDB(initialModels),
        saveTermsToIndexedDB(initialTerms),
        saveProfileToIndexedDB(initialProfile),
      ]);
    }
  } catch (e) {
    console.warn('Could not run IndexedDB migration:', e);
  }
}

// ---------------- USERS & ADMIN COMMANDS (INDEXEDDB SYNC) ----------------

export async function saveUsersToIndexedDB(users: AppUser[]): Promise<void> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('users')) return;
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');

    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const user of users) {
      if (user && user.uid) {
        store.put(user);
      }
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error saving users to IndexedDB:', err);
  }
}

export async function loadUsersFromIndexedDB(): Promise<AppUser[]> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('users')) return [];
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');

    return await new Promise<AppUser[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as AppUser[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveCancelledEmailsToIndexedDB(emails: string[]): Promise<void> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('cancelled_accounts')) return;
    const tx = db.transaction('cancelled_accounts', 'readwrite');
    const store = tx.objectStore('cancelled_accounts');

    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    const unique = Array.from(new Set(emails.map((e) => (e || '').trim().toLowerCase()))).filter(Boolean);
    for (const email of unique) {
      store.put({ email, cancelledAt: new Date().toISOString() });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error saving cancelled emails to IndexedDB:', err);
  }
}

export async function loadCancelledEmailsFromIndexedDB(): Promise<string[]> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('cancelled_accounts')) return [];
    const tx = db.transaction('cancelled_accounts', 'readonly');
    const store = tx.objectStore('cancelled_accounts');

    const list = await new Promise<{ email: string }[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    return (list || []).map((item) => (item.email || '').trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function recordAdminCommandInIndexedDB(command: {
  action: AdminCommandRecord['action'];
  uid?: string;
  email: string;
  timestamp?: string;
  details?: any;
}): Promise<void> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('admin_commands')) return;
    const tx = db.transaction('admin_commands', 'readwrite');
    const store = tx.objectStore('admin_commands');

    const record: AdminCommandRecord = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action: command.action,
      uid: command.uid,
      email: (command.email || '').trim().toLowerCase(),
      timestamp: command.timestamp || new Date().toISOString(),
      details: command.details,
    };

    store.put(record);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error recording admin command in IndexedDB:', err);
  }
}

export async function loadAdminCommandsFromIndexedDB(): Promise<AdminCommandRecord[]> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('admin_commands')) return [];
    const tx = db.transaction('admin_commands', 'readonly');
    const store = tx.objectStore('admin_commands');

    return await new Promise<AdminCommandRecord[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function clearAllGradebookIndexedDB(): Promise<void> {
  try {
    const db = await openGradebookDB();
    const storeNames = [
      'models',
      'terms',
      'profile',
      'pending_sync',
      'app_meta',
      'users',
      'cancelled_accounts',
      'admin_commands',
    ];
    const activeStores = storeNames.filter((s) => db.objectStoreNames.contains(s));
    if (activeStores.length === 0) return;

    const tx = db.transaction(activeStores, 'readwrite');
    for (const name of activeStores) {
      tx.objectStore(name).clear();
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error clearing IndexedDB data:', err);
  }
}

// ---------------- 48-HOUR TRIAL & OFFLINE ACTIVATION (INDEXEDDB) ----------------

export interface UserTrialMeta {
  key: string;
  uid: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  isActivated: boolean;
  subscriptionType: string;
  subscriptionStatus: string;
  activatedAt?: string;
  lastOfflineTick?: number;
}

export async function saveTrialSessionToIndexedDB(trialData: {
  uid: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  isActivated?: boolean;
  subscriptionType?: string;
  subscriptionStatus?: string;
}): Promise<void> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('app_meta')) return;
    const tx = db.transaction('app_meta', 'readwrite');
    const store = tx.objectStore('app_meta');

    const meta: UserTrialMeta = {
      key: `trial_session_${trialData.uid}`,
      uid: trialData.uid,
      email: (trialData.email || '').toLowerCase().trim(),
      createdAt: trialData.createdAt,
      expiresAt: trialData.expiresAt,
      isActivated: Boolean(trialData.isActivated),
      subscriptionType: trialData.subscriptionType || 'trial',
      subscriptionStatus: trialData.subscriptionStatus || 'active',
      lastOfflineTick: Date.now(),
    };

    store.put(meta);

    // Also persist by email so if uid shifts or is recreated, trial remains enforced
    if (trialData.email) {
      store.put({
        ...meta,
        key: `trial_session_email_${trialData.email.toLowerCase().trim()}`,
      });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error saving trial session to IndexedDB:', err);
  }
}

export async function loadTrialSessionFromIndexedDB(uid: string, email?: string): Promise<UserTrialMeta | null> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('app_meta')) return null;
    const tx = db.transaction('app_meta', 'readonly');
    const store = tx.objectStore('app_meta');

    // 1. Try by UID
    const resByUid = await new Promise<any>((resolve) => {
      const req = store.get(`trial_session_${uid}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (resByUid) return resByUid as UserTrialMeta;

    // 2. Try by email if provided
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const resByEmail = await new Promise<any>((resolve) => {
        const req = store.get(`trial_session_email_${cleanEmail}`);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (resByEmail) return resByEmail as UserTrialMeta;
    }

    return null;
  } catch {
    return null;
  }
}

export async function saveActivationToIndexedDB(activation: {
  uid: string;
  email: string;
  subscriptionType: string;
  activatedAt?: string;
}): Promise<void> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('app_meta')) return;
    const tx = db.transaction('app_meta', 'readwrite');
    const store = tx.objectStore('app_meta');

    const cleanEmail = (activation.email || '').toLowerCase().trim();
    const actRecord = {
      key: `activated_user_${activation.uid}`,
      uid: activation.uid,
      email: cleanEmail,
      isActivated: true,
      subscriptionType: activation.subscriptionType || 'lifetime',
      subscriptionStatus: 'active',
      activatedAt: activation.activatedAt || new Date().toISOString(),
    };

    store.put(actRecord);
    if (cleanEmail) {
      store.put({
        ...actRecord,
        key: `activated_user_email_${cleanEmail}`,
      });
    }

    // Also update trial meta if exists to mark as activated permanently
    const metaUid = await new Promise<any>((resolve) => {
      const req = store.get(`trial_session_${activation.uid}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (metaUid) {
      metaUid.isActivated = true;
      metaUid.subscriptionType = activation.subscriptionType || 'lifetime';
      metaUid.subscriptionStatus = 'active';
      metaUid.activatedAt = actRecord.activatedAt;
      store.put(metaUid);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error saving activation to IndexedDB:', err);
  }
}

export async function loadActivationFromIndexedDB(uid: string, email?: string): Promise<boolean> {
  try {
    const db = await openGradebookDB();
    if (!db.objectStoreNames.contains('app_meta')) return false;
    const tx = db.transaction('app_meta', 'readonly');
    const store = tx.objectStore('app_meta');

    // 1. Direct activation record by UID
    const res = await new Promise<any>((resolve) => {
      const req = store.get(`activated_user_${uid}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (res && res.isActivated) return true;

    // 2. Direct activation record by Email
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const resEmail = await new Promise<any>((resolve) => {
        const req = store.get(`activated_user_email_${cleanEmail}`);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (resEmail && resEmail.isActivated) return true;
    }

    // 3. Check trial session records marked as isActivated
    const trialRes = await new Promise<any>((resolve) => {
      const req = store.get(`trial_session_${uid}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (trialRes && (trialRes.isActivated || trialRes.subscriptionStatus === 'active')) return true;

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const trialResEmail = await new Promise<any>((resolve) => {
        const req = store.get(`trial_session_email_${cleanEmail}`);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (trialResEmail && (trialResEmail.isActivated || trialResEmail.subscriptionStatus === 'active')) return true;
    }

    return false;
  } catch {
    return false;
  }
}
