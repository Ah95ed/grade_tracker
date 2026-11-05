import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  MonthlyModel,
  TermModel,
  TeacherProfile,
  RoundingMode,
} from './types';
import {
  loadModels,
  saveModels,
  loadTerms,
  saveTerms,
  loadProfile,
  saveProfile,
  resetToDefaults,
  exportBackupData,
  importBackupData,
  isTestProfile,
  DEFAULT_TEACHER_PROFILE,
  harmonizeStudentIds,
} from './utils/storage';
import {
  saveModelsToIndexedDB,
  saveTermsToIndexedDB,
  saveProfileToIndexedDB,
  loadModelsFromIndexedDB,
  loadTermsFromIndexedDB,
  loadProfileFromIndexedDB,
  ensureIndexedDBInitialized,
  clearAllGradebookIndexedDB,
} from './utils/indexedDB';
import { syncManager } from './utils/syncManager';
import {
  AppUser,
  getCurrentUser,
  saveCurrentUser,
  logout,
  deleteAccountCompletely,
  checkAndClearExpiredNotice,
  purgeTrialAccount,
  recordUserActivity,
  isSubscriptionExpired,
  checkLiveSubscription,
  verifyUserWithCloudflareD1,
  OFFLINE_VERIFICATION_TIMEOUT_MS,
  checkLiveSubscriptionByEmail,
  isAccountCancelled,
  markAccountCancelled,
  syncAuthWithIndexedDB,
  getAuthHeaders,
  purgeAllTrialData,
  reconcileCurrentUserWithServer,
  upsertUserInRegistry,
  updateUserRoleOnline,
  SUPPORT_PHONE_NUMBER,
} from './utils/auth';
import { AuthScreen } from './components/Auth/AuthScreen';
import { TrialBanner } from './components/Auth/TrialBanner';
import { SubscriptionExpiredModal } from './components/Auth/SubscriptionExpiredModal';
import { OfflineVerificationModal } from './components/Auth/OfflineVerificationModal';
import { AccountCancelledModal } from './components/Auth/AccountCancelledModal';
import { RoleSelectionModal } from './components/Auth/RoleSelectionModal';
import { AdminDashboardView } from './components/Admin/AdminDashboardView';
import { Header } from './components/Header';
import { MonthlySheetView } from './components/MonthlySheet/MonthlySheetView';
import { TermCalculationView } from './components/TermCalculation/TermCalculationView';
import { ReportCardsView } from './components/ReportCards/ReportCardsView';
import { TeacherSettingsModal } from './components/TeacherSettingsModal';
import { ScoreRoundingModal } from './components/MonthlySheet/ScoreRoundingModal';
import { PrivacyPolicyView } from './components/PrivacyPolicy/PrivacyPolicyView';
import { ShieldCheck, Cloud, CheckCircle2, RefreshCw } from 'lucide-react';

// Check if teacher and school profile has been completed (First-time entrance setup)
export const isProfileComplete = (p: TeacherProfile | null): boolean => {
  if (!p) return false;
  if (isTestProfile(p)) return false;
  return Boolean(
    p.teacherName &&
      p.teacherName.trim() !== '' &&
      p.schoolName &&
      p.schoolName.trim() !== '' &&
      p.subject &&
      p.subject.trim() !== ''
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const cur = getCurrentUser();
    // تنظيف البيانات التجريبية المؤقتة فقط إذا كانت الجلسة الحالية تجريبية
    if (cur && (cur.isTrial || cur.authProvider === 'trial' || cur.uid?.startsWith('trial-') || cur.email?.includes('@jok.nom'))) {
      purgeAllTrialData();
      return null;
    }
    return cur;
  });
  const [hadExpiredNotice, setHadExpiredNotice] = useState<boolean>(() => checkAndClearExpiredNotice());
  const [isPrivacyPage, setIsPrivacyPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase();
      return p === '/privacy' || p === '/privacy/' || h === '#privacy';
    }
    return false;
  });

  const initialCurUser = currentUser;
  const [models, setModels] = useState<MonthlyModel[]>(() => (initialCurUser ? loadModels(initialCurUser.uid) : []));
  const [terms, setTerms] = useState<TermModel[]>(() => (initialCurUser ? loadTerms(initialCurUser.uid) : []));
  const [profile, setProfile] = useState<TeacherProfile>(() => (initialCurUser ? loadProfile(initialCurUser.uid) : DEFAULT_TEACHER_PROFILE));

  const [activeTab, setActiveTab] = useState<'monthly' | 'term' | 'cards' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['monthly', 'term', 'cards', 'admin'].includes(hash)) {
        return hash as 'monthly' | 'term' | 'cards' | 'admin';
      }
      const saved = localStorage.getItem('gradebook_active_tab');
      if (saved && ['monthly', 'term', 'cards', 'admin'].includes(saved)) {
        return saved as 'monthly' | 'term' | 'cards' | 'admin';
      }
    }
    return 'monthly';
  });

  const handleSetActiveTab = (tab: 'monthly' | 'term' | 'cards' | 'admin') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('gradebook_active_tab', tab);
    } catch {}
  };
  const [activeModelId, setActiveModelId] = useState<string>(() => models[0]?.id || '');
  const [activeTermId, setActiveTermId] = useState<string>(() => terms[0]?.id || '');

  // Teacher profile modal state: only open if user is logged in, profile incomplete, and not dismissed
  const [hasDismissedProfileModal, setHasDismissedProfileModal] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isRoundingModalOpen, setIsRoundingModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize IndexedDB and migrate any existing data
  useEffect(() => {
    ensureIndexedDBInitialized().then(async () => {
      await syncAuthWithIndexedDB();
      const cur = getCurrentUser();
      if (!cur) return;
      setCurrentUser(cur);

      const idbModels = await loadModelsFromIndexedDB(cur.uid);
      const idbTerms = await loadTermsFromIndexedDB(cur.uid);
      const idbProfile = await loadProfileFromIndexedDB(cur.uid);
      if (idbModels && idbModels.length > 0) setModels(idbModels);
      if (idbTerms && idbTerms.length > 0) setTerms(idbTerms);
      if (idbProfile) {
        if (isTestProfile(idbProfile)) {
          setProfile(DEFAULT_TEACHER_PROFILE);
          if (!hasDismissedProfileModal && !cur.isTrial) setIsProfileModalOpen(true);
        } else {
          setProfile(idbProfile);
          if (!isProfileComplete(idbProfile) && !hasDismissedProfileModal && !cur.isTrial) {
            setIsProfileModalOpen(true);
          }
        }
      } else if (!hasDismissedProfileModal && !cur.isTrial) {
        setIsProfileModalOpen(true);
      }

      // Re-evaluate cancelled account info in case IndexedDB had it
      if (cur && !cur.isAdmin && !cur.isTrial && (cur.subscriptionStatus === 'cancelled' || isAccountCancelled(cur.email))) {
        setCancelledAccountInfo({
          email: cur.email,
          message: 'تم إلغاء حسابك من قِبل إدارة النظام.',
        });
      }

      // مصالحة عند بدء التشغيل: إذا كان المستخدم مسجلاً دخوله والسيرفر لا يعرفه -> ننشئ سجله تلقائياً
      if (cur && !cur.isTrial && !cur.isAdmin) {
        reconcileCurrentUserWithServer().then((updated) => {
          if (updated) {
            setCurrentUser(updated);
          }
        }).catch(() => {});
      }
    });
  }, []);

  // ترقية وتثبيت صِفة «أستاذ» ونوع «مدرسة» تلقائياً لأي مستخدم سابق أو غير محدد دون إظهار شاشة الاختيار
  useEffect(() => {
    if (currentUser && ((currentUser.userRole !== 'admin_school' && currentUser.userRole !== 'teacher') || !currentUser.institutionType)) {
      const updated: AppUser = {
        ...currentUser,
        userRole: (currentUser.userRole === 'admin_school' || currentUser.userRole === 'teacher') ? currentUser.userRole : 'teacher',
        institutionType: currentUser.institutionType || 'school',
      };
      setCurrentUser(updated);
      saveCurrentUser(updated);
      upsertUserInRegistry(updated);
    }
  }, [currentUser]);
  useEffect(() => {
    try {
      if (models.length === 0) {
        localStorage.removeItem('gradebook_user_grades');
        localStorage.removeItem('gradebook_last_selected_grade');
      } else {
        const activeGrades = Array.from(
          new Set(
            models
              .map((m) => m.gradeLevel?.trim())
              .filter((g): g is string => Boolean(g && g !== 'الصف الدراسي' && g !== 'عام'))
          )
        );
        if (activeGrades.length > 0) {
          localStorage.setItem('gradebook_user_grades', JSON.stringify(activeGrades));
        } else {
          localStorage.removeItem('gradebook_user_grades');
          localStorage.removeItem('gradebook_last_selected_grade');
        }
      }
    } catch {}
  }, [models]);

  // Sync Google User profile (Avatar photoURL, displayName, email) from Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        // مصالحة فورية للمستخدم المسجل في Firebase للتأكد من وجوده في D1
        const cleanEmail = (fbUser.email || '').trim().toLowerCase();
        if (cleanEmail && !cleanEmail.includes('@jok.nom')) {
          reconcileCurrentUserWithServer().then((updated) => {
            if (updated) setCurrentUser(updated);
          }).catch(() => {});
        }

        setCurrentUser((prev) => {
          if (!prev) return prev;
          // Never overwrite or link a trial user
          if (prev.isTrial || prev.authProvider === 'trial' || prev.uid?.startsWith('trial-') || prev.email?.includes('@jok.nom')) {
            return prev;
          }
          const prevEmail = (prev.email || '').trim().toLowerCase();
          const fbEmail = (fbUser.email || '').trim().toLowerCase();
          // If matches current user or logged in via Google
          if (
            prev.uid === fbUser.uid ||
            prev.authProvider === 'google' ||
            (prevEmail && fbEmail && prevEmail === fbEmail)
          ) {
            const updated: AppUser = {
              ...prev,
              displayName: fbUser.displayName || prev.displayName,
              photoURL: fbUser.photoURL || prev.photoURL,
              email: fbUser.email || prev.email,
              authProvider: 'google',
            };
            saveCurrentUser(updated);
            return updated;
          }
          return prev;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const lastOnlineVerifiedAtRef = useRef<number>(Date.now());
  const [isOfflineTimeoutModalOpen, setIsOfflineTimeoutModalOpen] = useState(false);
  const [cancelledAccountInfo, setCancelledAccountInfo] = useState<{ email?: string; message?: string } | null>(() => {
    try {
      const cur = getCurrentUser();
      // Admins and trial users are NEVER blocked by cancellation
      if (cur && (cur.isAdmin || cur.isTrial || cur.authProvider === 'trial' || cur.uid?.startsWith('trial-') || cur.email?.includes('@jok.nom'))) return null;

      const raw = localStorage.getItem('gradebook_active_cancelled_user');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.email && isAccountCancelled(p.email)) return p;
      }
      if (cur && !cur.isAdmin && !cur.isTrial && (cur.subscriptionStatus === 'cancelled' || (cur.email && isAccountCancelled(cur.email)))) {
        return { email: cur.email, message: 'تم إلغاء حسابك من قِبل إدارة النظام.' };
      }
    } catch (e) {
      console.warn('Error checking cancelled account:', e);
    }
    return null;
  });

  // Hidden silent verification function with Cloudflare D1
  const runLiveD1Verification = async () => {
    if (!currentUser || currentUser.isAdmin || currentUser.isTrial || currentUser.authProvider === 'trial' || currentUser.uid?.startsWith('trial-') || currentUser.email?.includes('@jok.nom')) return;

    try {
      const res = await verifyUserWithCloudflareD1(currentUser, lastOnlineVerifiedAtRef.current);

      if (res.status === 'logged_out') return;

      if (res.status === 'cancelled_or_deleted') {
        const email = currentUser?.email || '';
        if (email) markAccountCancelled(email);
        const cancelInfo = {
          email,
          message: res.message || 'تم إلغاء حسابك من قِبل إدارة النظام.',
        };
        try {
          localStorage.setItem('gradebook_active_cancelled_user', JSON.stringify(cancelInfo));
        } catch {}
        setCancelledAccountInfo(cancelInfo);
        setCurrentUser(null);
        setIsOfflineTimeoutModalOpen(false);
        return;
      }

      if (res.status === 'expired') {
        setCurrentUser((prev) => (prev ? { ...prev, subscriptionStatus: 'expired' } : null));
        return;
      }

      if (res.status === 'active') {
        lastOnlineVerifiedAtRef.current = Date.now();
        setIsOfflineTimeoutModalOpen(false);
        if (res.user) {
          const verifiedUser: AppUser = res.user;
          setCurrentUser((prev) => {
            if (!prev) return verifiedUser;
            if (
              prev.subscriptionStatus === verifiedUser.subscriptionStatus &&
              prev.subscriptionType === verifiedUser.subscriptionType &&
              prev.expiresAt === verifiedUser.expiresAt &&
              prev.isAdmin === verifiedUser.isAdmin
            ) {
              return prev;
            }
            return verifiedUser;
          });
        }
        return;
      }

      if (res.status === 'offline_timeout') {
        // Unlimited offline usage: do not block user
        return;
      }

      if (res.status === 'offline_ok') {
        // Unlimited offline usage: keep working normally
      }
    } catch {
      // Offline: continue working normally without internet indefinitely
    }
  };

  // Periodic and event-based verification (Hidden request on entry & activity)
  useEffect(() => {
    if (!currentUser || currentUser.isAdmin || currentUser.isTrial || currentUser.authProvider === 'trial' || currentUser.uid?.startsWith('trial-') || currentUser.email?.includes('@jok.nom')) return;

    // Run silent check on entry
    runLiveD1Verification();

    // Check timer every 30 seconds
    const timer = setInterval(() => {
      runLiveD1Verification();
    }, 30000);

    const onOnlineOrFocus = () => {
      runLiveD1Verification();
    };

    window.addEventListener('online', onOnlineOrFocus);
    window.addEventListener('focus', onOnlineOrFocus);
    document.addEventListener('visibilitychange', onOnlineOrFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnlineOrFocus);
      window.removeEventListener('focus', onOnlineOrFocus);
      document.removeEventListener('visibilitychange', onOnlineOrFocus);
    };
  }, [currentUser?.uid]);

  const isModelsInitialMount = useRef(true);
  const isTermsInitialMount = useRef(true);
  const isProfileInitialMount = useRef(true);

  const [isExitSyncModalOpen, setIsExitSyncModalOpen] = useState(false);
  const [isLoggingOutSyncing, setIsLoggingOutSyncing] = useState(false);

  // Warn on closing tab/browser if changes are unsynced and user is online
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (syncManager.hasUnsyncedChanges() && navigator.onLine) {
        e.preventDefault();
        e.returnValue = 'لديك تعديلات محفوظة محلياً ولم تُرفع بعد إلى السحابة. هل أنت متأكد من المغادرة؟';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Auto-save changes locally to localStorage and IndexedDB (zero network calls on keystroke/edits)
  useEffect(() => {
    if (currentUser?.uid) {
      saveModels(models, currentUser.uid);
      saveModelsToIndexedDB(models, currentUser.uid);
    } else {
      saveModels(models);
      saveModelsToIndexedDB(models);
    }
    if (isModelsInitialMount.current) {
      isModelsInitialMount.current = false;
    } else {
      syncManager.recordChange('models');
      if (currentUser?.uid) recordUserActivity(currentUser.uid);
    }
  }, [models, currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid) {
      saveTerms(terms, currentUser.uid);
      saveTermsToIndexedDB(terms, currentUser.uid);
    } else {
      saveTerms(terms);
      saveTermsToIndexedDB(terms);
    }
    if (isTermsInitialMount.current) {
      isTermsInitialMount.current = false;
    } else {
      syncManager.recordChange('terms');
      if (currentUser?.uid) recordUserActivity(currentUser.uid);
    }
  }, [terms, currentUser?.uid]);

  useEffect(() => {
    if (!isTestProfile(profile)) {
      saveProfile(profile, currentUser?.uid);
      saveProfileToIndexedDB(profile, currentUser?.uid);
      if (isProfileInitialMount.current) {
        isProfileInitialMount.current = false;
      } else {
        syncManager.recordChange('profile');
        if (currentUser?.uid) recordUserActivity(currentUser.uid);
      }
    }
  }, [profile, currentUser?.uid]);

  // Keep active model id valid
  useEffect(() => {
    if (!models.some((m) => m.id === activeModelId) && models.length > 0) {
      setActiveModelId(models[0].id);
    }
  }, [models, activeModelId]);

  // Keep active term id valid
  useEffect(() => {
    if (!terms.some((t) => t.id === activeTermId) && terms.length > 0) {
      setActiveTermId(terms[0].id);
    }
  }, [terms, activeTermId]);

  // Sync privacy route with browser history (popstate/hashchange)
  useEffect(() => {
    const handleLocationChange = () => {
      const p = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase();
      setIsPrivacyPage(p === '/privacy' || p === '/privacy/' || h === '#privacy');
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateToPrivacy = () => {
    window.history.pushState({ page: 'privacy' }, '', '/privacy');
    setIsPrivacyPage(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateBackFromPrivacy = () => {
    if (window.location.pathname.toLowerCase().startsWith('/privacy') || window.location.hash === '#privacy') {
      window.history.pushState({}, '', '/');
    }
    setIsPrivacyPage(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Model actions
  const handleUpdateModel = (updated: MonthlyModel) => {
    const updatedList = models.map((m) => (m.id === updated.id ? updated : m));
    const harmonized = harmonizeStudentIds(updatedList);
    setModels(harmonized);
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  const handleUpdateAllModels = (updatedModels: MonthlyModel[]) => {
    const harmonized = harmonizeStudentIds(updatedModels);
    setModels(harmonized);
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  const handleAddModel = (newModel: MonthlyModel) => {
    const combined = [...models, newModel];
    const harmonized = harmonizeStudentIds(combined);
    setModels(harmonized);
    setActiveModelId(newModel.id);
    showToast(`تم إنشاء نموذج (${newModel.name}) بنجاح`);
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  const handleDeleteModel = (id: string) => {
    const modelToDelete = models.find((m) => m.id === id);
    const updated = models.filter((m) => m.id !== id);
    setModels(updated);
    if (updated.length > 0) {
      setActiveModelId(updated[0].id);
    }
    showToast(`تم حذف النموذج (${modelToDelete?.name || ''})`);
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  // Term actions
  const handleUpdateTerm = (updated: TermModel) => {
    setTerms(terms.map((t) => (t.id === updated.id ? updated : t)));
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  const handleUpdateAllTerms = (updatedTerms: TermModel[]) => {
    setTerms(updatedTerms);
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  const handleAddTerm = (newTerm: TermModel) => {
    setTerms([...terms, newTerm]);
    setActiveTermId(newTerm.id);
    showToast(`تم إنشاء فصل (${newTerm.name}) بنجاح`);
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  const handleDeleteTerm = (id: string) => {
    const updated = terms.filter((t) => t.id !== id);
    setTerms(updated);
    if (updated.length > 0) {
      setActiveTermId(updated[0].id);
    }
    showToast('تم حذف الفصل بنجاح');
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  // Profile actions
  const handleSaveProfile = (updatedProfile: TeacherProfile) => {
    setProfile(updatedProfile);
    saveProfile(updatedProfile, currentUser?.uid);
    saveProfileToIndexedDB(updatedProfile);
    setIsProfileModalOpen(false);

    if (updatedProfile.institutionType && currentUser && currentUser.institutionType !== updatedProfile.institutionType) {
      const updatedUser: AppUser = {
        ...currentUser,
        institutionType: updatedProfile.institutionType,
      };
      setCurrentUser(updatedUser);
      saveCurrentUser(updatedUser);
      upsertUserInRegistry(updatedUser);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        updateUserRoleOnline(currentUser.userRole || 'teacher', updatedProfile.institutionType).catch(() => {});
      }
    }

    if (models.length === 1 && (!models[0].subject || models[0].subject === 'عام') && updatedProfile.subject?.trim()) {
      const updated = [{ ...models[0], subject: updatedProfile.subject.trim() }];
      setModels(updated);
      saveModels(updated, currentUser?.uid);
      saveModelsToIndexedDB(updated);
    }

    const toastMsg = updatedProfile.institutionType === 'university'
      ? 'تم حفظ بيانات الأستاذ الجامعي والكلية بنجاح'
      : 'تم حفظ بيانات المعلم والمدرسة بنجاح';
    showToast(toastMsg);
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  // Backup actions
  const handleExportBackup = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradebook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف النسخة الاحتياطية بنجاح');
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  const handleImportBackup = (jsonString: string) => {
    const success = importBackupData(jsonString);
    if (success) {
      const refreshedModels = loadModels();
      const refreshedTerms = loadTerms();
      const refreshedProfile = loadProfile();
      setModels(refreshedModels);
      setTerms(refreshedTerms);
      setProfile(refreshedProfile);
      if (refreshedModels.length > 0) setActiveModelId(refreshedModels[0].id);
      if (refreshedTerms.length > 0) setActiveTermId(refreshedTerms[0].id);
      showToast('تم استعادة النسخة الاحتياطية بنجاح');
      if (currentUser?.uid) recordUserActivity(currentUser.uid);
    } else {
      showToast('فشل استيراد الملف. يرجى التأكد من اختيار ملف JSON صالح.');
    }
  };

  const handleResetDefaults = () => {
    const data = resetToDefaults();
    setModels(data.models);
    setTerms(data.terms);
    setProfile(data.profile);
    setActiveModelId(data.models[0]?.id || '');
    setActiveTermId(data.terms[0]?.id || '');
    showToast('تم استعادة البيانات الافتراضية بنجاح');
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore if offline
    }
    logout();
    purgeAllTrialData();
    setCancelledAccountInfo(null);
    setCurrentUser(null);
    setModels([]);
    setTerms([]);
    setProfile(DEFAULT_TEACHER_PROFILE);
    setActiveModelId('');
    setActiveTermId('');
    setIsProfileModalOpen(false);
    showToast('تم تسجيل الخروج بنجاح وتأمين الجلسة ومسح البيانات من الشاشة.');
  };

  const handleInitiateLogout = () => {
    if (syncManager.hasUnsyncedChanges() && navigator.onLine) {
      setIsExitSyncModalOpen(true);
    } else {
      handleLogout();
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    const uidToDelete = currentUser.uid;

    try {
      // 1. حذف كامل البيانات من قاعدة بيانات Cloudflare D1 (SQLite) عبر الـ API
      const delHeaders = await getAuthHeaders();
      await fetch(`/api/data?uid=${encodeURIComponent(uidToDelete)}`, {
        method: 'DELETE',
        headers: delHeaders,
      }).catch((err) => console.warn('Cloudflare D1 delete request warning:', err));
    } catch (e) {
      console.warn('API deletion error:', e);
    }

    // 2. حذف الحساب من Firebase Authentication إن وجد
    try {
      if (auth.currentUser && auth.currentUser.uid === uidToDelete) {
        await auth.currentUser.delete();
      }
    } catch (fbErr: any) {
      console.warn('Firebase user delete note:', fbErr);
      try {
        await signOut(auth);
      } catch {}
    }

    // 3. مسح كافة البيانات من IndexedDB
    try {
      await clearAllGradebookIndexedDB();
    } catch (dbErr) {
      console.warn('IndexedDB clear warning:', dbErr);
    }

    // 4. مسح الحساب نهائياً من التخزين المحلي وقائمة المستخدمين
    deleteAccountCompletely(uidToDelete);

    // 5. استعادة البيانات إلى الحالة الابتدائية النظيفة
    const defaultData = resetToDefaults();
    setModels(defaultData.models);
    setTerms(defaultData.terms);
    setProfile(defaultData.profile);
    setActiveModelId(defaultData.models[0]?.id || '');
    setActiveTermId(defaultData.terms[0]?.id || '');

    // 6. تسجيل الخروج وإعادة التوجيه لواجهة البداية
    setCurrentUser(null);
    showToast('تم حذف الحساب وكافة السجلات من قاعدة البيانات بنجاح نهائياً.');
  };

  const handleTrialExpire = () => {
    purgeTrialAccount();
    setCurrentUser(null);
    setHadExpiredNotice(true);
    setModels([]);
    setTerms([]);
  };

  // If viewing the Privacy Policy page (accessible publicly with or without login)
  if (isPrivacyPage) {
    return (
      <PrivacyPolicyView
        onBack={navigateBackFromPrivacy}
        currentUser={currentUser}
      />
    );
  }

  // If user account is cancelled by Admin, display the dedicated Cancelled Screen
  // instructing them to contact the Admin via WhatsApp or direct call on +9647706118992
  if (cancelledAccountInfo) {
    return (
      <AccountCancelledModal
        isOpen={true}
        message={cancelledAccountInfo.message || 'تم إلغاء حسابك من قِبل إدارة النظام.'}
        userEmail={cancelledAccountInfo.email}
        onRecheck={async () => {
          if (!cancelledAccountInfo.email) return;
          const check = await checkLiveSubscriptionByEmail(cancelledAccountInfo.email);
          if (check.active && check.user) {
            try {
              localStorage.removeItem('gradebook_active_cancelled_user');
            } catch {}
            setCancelledAccountInfo(null);
            setCurrentUser(check.user);
            showToast('تم التحقق بنجاح! تم إعادة الاشتراك وتفعيل حسابك.');
          } else {
            throw new Error(`ما زال الحساب غير مفعل من قِبل الإدارة. يرجى التواصل مع الأدمن على الرقم ${SUPPORT_PHONE_NUMBER || '07706118982'} لطلب إعادة الاشتراك.`);
          }
        }}
        onSwitchAccount={() => {
          try {
            localStorage.removeItem('gradebook_active_cancelled_user');
          } catch {}
          setCancelledAccountInfo(null);
          handleLogout();
        }}
        onLogout={() => {
          try {
            localStorage.removeItem('gradebook_active_cancelled_user');
          } catch {}
          setCancelledAccountInfo(null);
          handleLogout();
        }}
      />
    );
  }

  // If user is not logged in, show the AuthScreen with the two requested buttons
  if (!currentUser) {
    return (
      <AuthScreen
        expiredNotice={hadExpiredNotice}
        onOpenPrivacy={navigateToPrivacy}
        onAccountCancelled={(cancelledEmail, msg) => {
          setCancelledAccountInfo({
            email: cancelledEmail,
            message: msg || 'تم إلغاء حسابك من قِبل إدارة النظام.',
          });
        }}
        onLoginSuccess={(user, _isTrial) => {
          if (!user.isAdmin && (user.subscriptionStatus === 'cancelled' || isAccountCancelled(user.email))) {
            setCancelledAccountInfo({
              email: user.email,
              message: 'تم إلغاء حسابك من قِبل إدارة النظام.',
            });
            setCurrentUser(null);
            return;
          }
          setCancelledAccountInfo(null);
          setCurrentUser(user);
          setHadExpiredNotice(false);
          const uModels = loadModels(user.uid);
          const uTerms = loadTerms(user.uid);
          const prof = loadProfile(user.uid);
          setModels(uModels);
          setTerms(uTerms);
          setProfile(prof);
          setActiveModelId(uModels[0]?.id || '');
          setActiveTermId(uTerms[0]?.id || '');

          if (!isProfileComplete(prof)) {
            setIsProfileModalOpen(true);
          }

          // If local data is empty for this user and online, securely restore cloud backup
          if (uModels.length === 0 && navigator.onLine) {
            getAuthHeaders().then((headers) => {
              fetch(`/api/data?uid=${encodeURIComponent(user.uid)}`, { headers })
                .then((res) => res.json())
                .then((d) => {
                  if (d && d.success && d.data) {
                    if (Array.isArray(d.data.models) && d.data.models.length > 0) {
                      setModels(d.data.models);
                      saveModels(d.data.models, user.uid);
                      saveModelsToIndexedDB(d.data.models, user.uid);
                      setActiveModelId(d.data.models[0]?.id || '');
                    }
                    if (Array.isArray(d.data.terms) && d.data.terms.length > 0) {
                      setTerms(d.data.terms);
                      saveTerms(d.data.terms, user.uid);
                      saveTermsToIndexedDB(d.data.terms, user.uid);
                      setActiveTermId(d.data.terms[0]?.id || '');
                    }
                    if (d.data.profile && d.data.profile.teacherName) {
                      setProfile(d.data.profile);
                      saveProfile(d.data.profile, user.uid);
                      saveProfileToIndexedDB(d.data.profile, user.uid);
                    }
                  }
                })
                .catch(() => {});
            });
          }

          if (user.subscriptionStatus === 'active') {
            showToast(`أهلاً بك ${user.displayName}! تم تسجيل الدخول بنجاح (حساب مفعل).`);
          } else {
            showToast(`أهلاً بك ${user.displayName}! تم تسجيل الدخول بنجاح (فترة تجريبية مجانية لمدة 5 دقائق).`);
          }
        }}
      />
    );
  }

  // Check if current user subscription has expired (blocked unless admin)
  const isExpired = isSubscriptionExpired(currentUser) && !currentUser.isAdmin;

  // When user's 48-hour free trial expires without admin activation, show the unbypassable screen
  if (isExpired) {
    return (
      <AccountCancelledModal
        isOpen={true}
        message="تم إلغاء حسابك من قِبل إدارة النظام."
        userEmail={currentUser.email}
        onRecheck={async () => {
          const check = await checkLiveSubscriptionByEmail(currentUser.email);
          if (check.active && check.user) {
            try {
              localStorage.removeItem('gradebook_active_cancelled_user');
            } catch {}
            setCancelledAccountInfo(null);
            setCurrentUser(check.user);
            showToast('تم التحقق بنجاح! تم تفعيل واشتراك حسابك.');
          } else {
            throw new Error(`ما زال الحساب غير مفعل من قِبل الإدارة. يرجى التواصل مع الأدمن عبر واتساب أو الاتصال على الرقم ${SUPPORT_PHONE_NUMBER || '07706118982'} لإعادة الاشتراك.`);
          }
        }}
        onSwitchAccount={handleLogout}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col text-[#2F2822] font-['Cairo',sans-serif]" data-page={activeTab}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-bottom duration-200 no-print">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 48-Hour Free Trial Countdown Banner with WhatsApp contact and subscription modal trigger */}
      {!currentUser.isAdmin && currentUser.subscriptionStatus !== 'active' && (
        <TrialBanner
          user={currentUser}
          onLogout={handleInitiateLogout}
          onExpire={() => {
            setCurrentUser((prev) => (prev ? { ...prev, subscriptionStatus: 'expired' } : null));
          }}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        />
      )}

      {/* Main App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        profile={profile}
        currentUser={currentUser}
        onLogout={handleInitiateLogout}
        onDeleteAccount={handleDeleteAccount}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        onOpenRoundingModal={() => setIsRoundingModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetDefaults={handleResetDefaults}
        onOpenPrivacy={navigateToPrivacy}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'monthly' && (
          <MonthlySheetView
            models={models}
            activeModelId={activeModelId}
            onSelectModel={setActiveModelId}
            onUpdateModel={handleUpdateModel}
            onUpdateAllModels={handleUpdateAllModels}
            onDeleteModel={handleDeleteModel}
            onAddModel={handleAddModel}
            profile={profile}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'term' && (
          <TermCalculationView
            terms={terms}
            activeTermId={activeTermId}
            onSelectTerm={setActiveTermId}
            onUpdateTerm={handleUpdateTerm}
            onUpdateAllTerms={handleUpdateAllTerms}
            onAddTerm={handleAddTerm}
            onDeleteTerm={handleDeleteTerm}
            monthlyModels={models}
            profile={profile}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'cards' && (
          <ReportCardsView
            terms={terms}
            monthlyModels={models}
            profile={profile}
            onUpdateProfile={handleSaveProfile}
          />
        )}

        {activeTab === 'admin' && currentUser.isAdmin && (
          <AdminDashboardView
            currentUser={currentUser}
            onRefreshData={() => {
              setModels(loadModels());
              setTerms(loadTerms());
            }}
          />
        )}
      </main>

      {/* First-time / Switch Role Selection Modal: Teacher (لمادة واحدة) vs Administration (لعدة مواد) */}
      {currentUser && (!currentUser.userRole || isRoleModalOpen) && (
        <RoleSelectionModal
          isOpen={true}
          currentUser={currentUser}
          onClose={currentUser.userRole ? () => setIsRoleModalOpen(false) : undefined}
          onLogout={handleLogout}
          onRoleSelected={(updatedUser) => {
            setCurrentUser(updatedUser);
            setIsRoleModalOpen(false);

            const instType = updatedUser.institutionType || 'school';
            if (profile.institutionType !== instType) {
              const updatedProf = { ...profile, institutionType: instType };
              setProfile(updatedProf);
              saveProfile(updatedProf, updatedUser.uid);
              saveProfileToIndexedDB(updatedProf);
            }

            if (updatedUser.institutionType === 'university') {
              showToast('تم اعتماد حسابك بصِفة «أستاذ جامعي / تدريسي» وتثبيته في قاعدة البيانات بنجاح!');
            } else if (updatedUser.userRole === 'admin_school') {
              if (!profile.subject || profile.subject === 'عام' || profile.subject.trim() === '') {
                const adminProfile = { ...profile, subject: 'الإدارة' };
                setProfile(adminProfile);
                saveProfile(adminProfile, updatedUser.uid);
                saveProfileToIndexedDB(adminProfile);
              }
              showToast('تم اعتماد حسابك بصِفة «إدارة مدرسة (عدة مواد)» وتثبيته في قاعدة البيانات بنجاح!');
            } else {
              showToast('تم اعتماد حسابك بصِفة «أستاذ / معلم مدرسي» وتثبيته في قاعدة البيانات بنجاح!');
            }
            if (!isProfileComplete(profile)) {
              setIsProfileModalOpen(true);
            }
          }}
        />
      )}

      {/* Profile Settings Modal */}
      <TeacherSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setHasDismissedProfileModal(true);
        }}
        profile={profile}
        onSave={handleSaveProfile}
        currentUser={currentUser}
        onChangeRole={() => setIsRoleModalOpen(true)}
      />

      {/* Score Rounding Control Modal */}
      {(() => {
        const currentModel = models.find((m) => m.id === activeModelId) || models[0];
        if (!currentModel) return null;
        return (
          <ScoreRoundingModal
            isOpen={isRoundingModalOpen}
            onClose={() => setIsRoundingModalOpen(false)}
            currentMode={currentModel.roundingMode || 'none'}
            currentThreshold={currentModel.roundingThreshold || 0.5}
            modelName={currentModel.name}
            gradeLevel={currentModel.gradeLevel}
            subject={currentModel.subject}
            onSave={(mode: RoundingMode, threshold: number, applyToSameGradeAndSubject: boolean) => {
              if (applyToSameGradeAndSubject) {
                const currentGradeNorm = (currentModel.gradeLevel || '').trim().toLowerCase();
                const currentSubjNorm = (currentModel.subject || '').trim().toLowerCase();

                const updated = models.map((m) => {
                  const mGradeNorm = (m.gradeLevel || '').trim().toLowerCase();
                  const mSubjNorm = (m.subject || '').trim().toLowerCase();
                  const isTarget =
                    m.id === currentModel.id ||
                    (mGradeNorm === currentGradeNorm && mSubjNorm === currentSubjNorm);

                  if (isTarget) {
                    return {
                      ...m,
                      roundingMode: mode,
                      roundingThreshold: threshold,
                      updatedAt: new Date().toISOString(),
                    };
                  }
                  return m;
                });
                handleUpdateAllModels(updated);
              } else {
                handleUpdateModel({
                  ...currentModel,
                  roundingMode: mode,
                  roundingThreshold: threshold,
                  updatedAt: new Date().toISOString(),
                });
              }
              showToast('تم حفظ إعدادات التحكم بالنسب وقواعد الكسور العشرية بنجاح.');
            }}
          />
        );
      })()}

      {/* Subscription Info & Upgrade Modal (Accessible manually or when expired) */}
      <SubscriptionExpiredModal
        isOpen={isSubscriptionModalOpen || isExpired}
        onClose={() => setIsSubscriptionModalOpen(false)}
        user={currentUser}
        onLogout={handleLogout}
        canDismiss={!isExpired}
        onSubscriptionActivated={(updatedUser) => {
          setCurrentUser(updatedUser);
          setIsSubscriptionModalOpen(false);
          showToast('تم التحقق بنجاح! تم تفعيل اشتراكك وتحديث البيانات.');
        }}
      />

      {/* Offline 1-Minute Grace Period Verification Modal */}
      <OfflineVerificationModal
        isOpen={isOfflineTimeoutModalOpen && !!currentUser && !currentUser.isAdmin}
        userEmail={currentUser?.email}
        onRecheck={async () => {
          if (!currentUser) return;
          const res = await verifyUserWithCloudflareD1(currentUser, 0);
          if (res.status === 'cancelled_or_deleted') {
            const email = currentUser?.email || '';
            if (email) markAccountCancelled(email);
            const cancelInfo = {
              email,
              message: res.message || 'تم إلغاء حسابك من قِبل إدارة النظام.',
            };
            try {
              localStorage.setItem('gradebook_active_cancelled_user', JSON.stringify(cancelInfo));
            } catch {}
            setCancelledAccountInfo(cancelInfo);
            setCurrentUser(null);
            setIsOfflineTimeoutModalOpen(false);
            return;
          }
          if (res.status === 'expired') {
            setCurrentUser({ ...currentUser, subscriptionStatus: 'expired' });
            setIsOfflineTimeoutModalOpen(false);
            return;
          }
          if (res.status === 'active') {
            lastOnlineVerifiedAtRef.current = Date.now();
            setIsOfflineTimeoutModalOpen(false);
            if (res.user) setCurrentUser(res.user);
            showToast('تم التحقق بنجاح من اتصالك وقاعدة بيانات D1!');
            return;
          }
          throw new Error('لا يوجد اتصال بالإنترنت حالياً، يرجى تشغيل الشبكة والمحاولة.');
        }}
        onLogout={handleLogout}
      />

      {/* Exit Sync Confirmation Modal when logging out with unsynced data */}
      {isExitSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-right space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Cloud className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  توجد تعديلات لم تُرفع بعد إلى السحابة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  بياناتك محفوظة بأمان محلياً في متصفحك (IndexedDB)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              قمت بإجراء تغييرات في درجات أو سجلات الطلاب، ولم يتم إرسالها إلى قاعدة بيانات <b>Cloudflare SQLite D1</b> بعد. هل ترغب في مزامنتها الآن قبل الخروج؟
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={async () => {
                  setIsLoggingOutSyncing(true);
                  await syncManager.syncPendingData(currentUser?.uid);
                  setIsLoggingOutSyncing(false);
                  setIsExitSyncModalOpen(false);
                  handleLogout();
                }}
                disabled={isLoggingOutSyncing}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {isLoggingOutSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري المزامنة مع السحابة...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>مزامنة السحابة الآن ثم الخروج</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setIsExitSyncModalOpen(false);
                  handleLogout();
                }}
                disabled={isLoggingOutSyncing}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                الخروج والاحتفاظ بالبيانات محلياً (المزامنة لاحقاً)
              </button>

              <button
                onClick={() => setIsExitSyncModalOpen(false)}
                disabled={isLoggingOutSyncing}
                className="w-full py-1 text-slate-400 hover:text-slate-600 text-[11px] text-center cursor-pointer transition-colors"
              >
                تراجع والبقاء في التطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-8 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <p>
            نظام رصد درجات الطلاب الذكي للمعلمين والمدرسين • مصمم للمرونة الكاملة في حساب
            النسب الشهرية ومعدلات الفصول
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={navigateToPrivacy}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold border border-slate-200 hover:border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>سياسة الخصوصية</span>
            </button>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                navigateToPrivacy();
              }}
              className="text-slate-400 hover:text-[#557A95] font-mono text-[11px] hidden md:inline"
              dir="ltr"
            >
              daragato.online/privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
