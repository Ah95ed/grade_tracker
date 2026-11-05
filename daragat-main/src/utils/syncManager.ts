import { useState, useEffect } from 'react';
import {
  getPendingSyncItems,
  clearPendingSyncItems,
  queuePendingSync,
  loadModelsFromIndexedDB,
  loadTermsFromIndexedDB,
  loadProfileFromIndexedDB,
} from './indexedDB';
import { getAuthHeaders } from './auth';

export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

export interface SyncStatusInfo {
  isOnline: boolean;
  status: SyncState;
  pendingCount: number;
  lastSyncedAt: string | null;
}

class SyncManager {
  private listeners: Set<(state: SyncStatusInfo) => void> = new Set();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private status: SyncState = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced';
  private pendingCount: number = 0;
  private lastSyncedAt: string | null = null;
  private isSyncing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        if (this.pendingCount > 0) {
          this.status = 'pending';
        } else {
          this.status = 'synced';
        }
        this.notify();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.status = 'offline';
        this.notify();
      });

      // Initial check on load
      this.refreshPendingCount();
    }
  }

  public subscribe(listener: (state: SyncStatusInfo) => void) {
    this.listeners.add(listener);
    listener({
      isOnline: this.isOnline,
      status: this.status,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({
        isOnline: this.isOnline,
        status: this.status,
        pendingCount: this.pendingCount,
        lastSyncedAt: this.lastSyncedAt,
      });
    }
  }

  public async refreshPendingCount() {
    const items = await getPendingSyncItems();
    this.pendingCount = items.length > 0 ? 1 : 0;
    if (!this.isOnline) {
      this.status = 'offline';
    } else if (this.pendingCount > 0 && this.status !== 'syncing') {
      this.status = 'pending';
    } else if (this.pendingCount === 0 && this.status !== 'syncing') {
      this.status = 'synced';
    }
    this.notify();
  }

  // Mark local changes as unsynced WITHOUT triggering any network commands on keystrokes
  public async markUnsynced(type: 'models' | 'terms' | 'profile' = 'models'): Promise<void> {
    try {
      await queuePendingSync({ type, data: null });
      this.pendingCount = 1;
      this.status = this.isOnline ? 'pending' : 'offline';
      this.notify();
    } catch (err) {
      console.warn('Error marking unsynced state:', err);
    }
  }

  // Alias for backward compatibility with App.tsx
  public recordChange(type: 'models' | 'terms' | 'profile' = 'models', _data?: any, _uid?: string): void {
    this.markUnsynced(type);
  }

  public hasUnsyncedChanges(): boolean {
    return this.pendingCount > 0 || this.status === 'pending';
  }

  // Clear all pending changes manually if user wishes to skip or reset
  public async clearPendingChanges(): Promise<void> {
    try {
      await clearPendingSyncItems();
      this.pendingCount = 0;
      this.status = 'synced';
      this.notify();
    } catch (err) {
      console.warn('Error clearing pending changes:', err);
    }
  }

  // On-demand bulk sync: Sends the full current snapshot in ONE single HTTP request
  public async syncPendingData(userUid?: string): Promise<{ success: boolean; message: string }> {
    if (!this.isOnline) {
      return {
        success: false,
        message: 'أنت غير متصل بالإنترنت حالياً. بياناتك محفوظة بأمان على جهازك في IndexedDB.',
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        message: 'المزامنة جارية بالفعل...',
      };
    }

    this.isSyncing = true;
    this.status = 'syncing';
    this.notify();

    try {
      let effectiveUid = userUid;
      let userEmail = '';

      if (typeof window !== 'undefined') {
        try {
          const rawUser = localStorage.getItem('gradebook_auth_current_user_v2');
          if (rawUser) {
            const u = JSON.parse(rawUser);
            if (!effectiveUid) effectiveUid = u.uid;
            userEmail = u.email || '';
          }
        } catch {}
      }

      if (!effectiveUid) {
        effectiveUid = 'guest_user';
      }

      // Collect the authoritative current snapshot from IndexedDB
      const models = await loadModelsFromIndexedDB();
      const terms = await loadTermsFromIndexedDB();
      const profile = await loadProfileFromIndexedDB();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: authHeaders,
        signal: controller.signal,
        body: JSON.stringify({
          userUid: effectiveUid,
          email: userEmail,
          profile,
          models,
          terms,
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => {
        console.warn('Network issue during sync attempt:', err);
        return null;
      });

      clearTimeout(timeoutId);

      if (res && res.ok) {
        // Completely clear the pending sync store in IndexedDB
        await clearPendingSyncItems();
        this.pendingCount = 0;
        this.status = 'synced';
        this.lastSyncedAt = new Date().toLocaleTimeString('ar-IQ', {
          timeZone: 'Asia/Baghdad',
          hour: '2-digit',
          minute: '2-digit',
        });
        this.notify();
        return {
          success: true,
          message: 'تمت مزامنة جميع البيانات بنجاح مع السحابة (Cloudflare SQLite D1)',
        };
      } else {
        this.status = 'pending';
        this.notify();
        return {
          success: false,
          message: 'لم يتم حفظ البيانات على السحابة، ولكن بياناتك محفوظة 100% محلياً في جهازك داخل IndexedDB.',
        };
      }
    } catch (err: any) {
      console.warn('Sync pending data notice:', err);
      this.status = 'pending';
      this.notify();
      return {
        success: false,
        message: err.message || 'حدث خطأ أثناء المزامنة، بياناتك محفوظة محلياً على جهازك.',
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();

export function useSyncStatus() {
  const [state, setState] = useState<SyncStatusInfo>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
    pendingCount: 0,
    lastSyncedAt: null,
  });

  useEffect(() => {
    return syncManager.subscribe(setState);
  }, []);

  return {
    ...state,
    hasUnsyncedChanges: state.pendingCount > 0 || state.status === 'pending',
    triggerSync: (uid?: string) => syncManager.syncPendingData(uid),
    clearPending: () => syncManager.clearPendingChanges(),
  };
}
