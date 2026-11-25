import { useState, useEffect, useRef, useCallback } from 'react';
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
  parseBackupData,
  isTestProfile,
  DEFAULT_TEACHER_PROFILE,
  harmonizeStudentIds,
  normalizeLegacyDefaultAcademicYear,
} from './utils/storage';
import { getCurrentAcademicYear } from './utils/dateUtils';
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
  getAllUsers,
  isAdminUser,
  saveCachedIdToken,
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
import { IosPrintHelperModal } from './components/Common/IosPrintHelperModal';
import { CloudRestoreStep } from './components/Common/CloudRestoreModal';
import { BackupExportModal, BackupExportPreview } from './components/Common/BackupModal';
import { subscribeIosPrintHelper, PrintPlatformStatus, getIOSPrintStatus } from './utils/printHelper';
import {
  TeacherPersonalFloatingButton,
  TeacherPersonalModal,
  TeacherAlertBanner,
  TeacherPersonalTab,
} from './components/TeacherPersonal/TeacherPersonalModal';
import { TeacherPersonalData, TeacherAlert } from './types/teacherPersonal';
import {
  loadTeacherPersonalData,
  saveTeacherPersonalData,
  evaluateDueAlertKey,
  playAlertChime,
} from './utils/teacherPersonalStorage';
import { ShieldCheck, Cloud, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  NumeralMode,
  NUMERAL_MODE_STORAGE_KEY,
  getSavedNumeralMode,
} from './utils/numeralFormat';

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
    // تنظيف البيانات التجريبية المؤقتة فقط إذا كانت الجلسة زائر محلي بدون حساب حقيقي
    if (cur && (cur.authProvider === 'trial' || cur.uid?.startsWith('trial-') || cur.email?.includes('@jok.nom'))) {
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
  const [highlightProfileSubject, setHighlightProfileSubject] = useState<boolean>(false);
  const [reopenCreateModelNonce, setReopenCreateModelNonce] = useState<number>(0);
  const returnToCreateModelRef = useRef<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isRoundingModalOpen, setIsRoundingModalOpen] = useState(false);
  const [iosPrintHelperStatus, setIosPrintHelperStatus] = useState<PrintPlatformStatus | null>(null);
  const [backupExportPreview, setBackupExportPreview] = useState<BackupExportPreview | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [numeralMode, setNumeralMode] = useState<NumeralMode>(() => getSavedNumeralMode());

  const handleNumeralModeChange = useCallback((mode: NumeralMode) => {
    setNumeralMode(mode);
    try {
      localStorage.setItem(NUMERAL_MODE_STORAGE_KEY, mode);
    } catch {}
  }, []);

  // Personal teacher workspace (weekly schedule, notes, alerts) scoped per user
  const [personalData, setPersonalData] = useState<TeacherPersonalData>(() =>
    loadTeacherPersonalData(initialCurUser?.uid)
  );
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [personalModalTab, setPersonalModalTab] = useState<TeacherPersonalTab>('schedule');
  const [ringingAlerts, setRingingAlerts] = useState<TeacherAlert[]>([]);

  useEffect(() => {
    setPersonalData(loadTeacherPersonalData(currentUser?.uid));
    setRingingAlerts([]);
  }, [currentUser?.uid]);

  const handleUpdatePersonalData = useCallback(
    (next: TeacherPersonalData) => {
      setPersonalData(next);
      saveTeacherPersonalData(next, currentUser?.uid);
    },
    [currentUser?.uid]
  );

  // Check teacher personal alerts every 15 seconds when logged in
  useEffect(() => {
    if (!currentUser) return;

    const checkDueAlerts = () => {
      const now = new Date();
      let didTriggerAny = false;
      const newlyTriggered: TeacherAlert[] = [];
      let playSound = false;

      const updatedAlerts = personalData.alerts.map((alert) => {
        const occKey = evaluateDueAlertKey(alert, now);
        if (!occKey) return alert;

        didTriggerAny = true;
        if (alert.soundEnabled) playSound = true;
        newlyTriggered.push(alert);

        return {
          ...alert,
          lastTriggeredKey: occKey,
          snoozeUntil: undefined,
        };
      });

      if (didTriggerAny) {
        const nextData: TeacherPersonalData = {
          ...personalData,
          alerts: updatedAlerts,
        };
        setPersonalData(nextData);
        saveTeacherPersonalData(nextData, currentUser.uid);

        if (playSound) {
          playAlertChime();
        }

        setRingingAlerts((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const uniqueNew = newlyTriggered.filter((a) => !existingIds.has(a.id));
          return [...uniqueNew, ...prev];
        });

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          newlyTriggered.forEach((a) => {
            try {
              new Notification(`تنبيه المعلم: ${a.title}`, {
                body: a.note || `الموعد: ${a.time}`,
                icon: '/icon.svg',
              });
            } catch {}
          });
        }
      }
    };

    checkDueAlerts();
    const timer = window.setInterval(checkDueAlerts, 15000);
    return () => window.clearInterval(timer);
  }, [currentUser, personalData]);

  const handleDismissRingingAlert = (alertId: string) => {
    setRingingAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleSnoozeRingingAlert = (alertId: string, minutes = 10) => {
    const snoozeDate = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const nextData: TeacherPersonalData = {
      ...personalData,
      alerts: personalData.alerts.map((a) =>
        a.id === alertId ? { ...a, snoozeUntil: snoozeDate } : a
      ),
    };
    handleUpdatePersonalData(nextData);
    setRingingAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  useEffect(() => {
    return subscribeIosPrintHelper((status) => {
      setIosPrintHelperStatus(status || getIOSPrintStatus());
    });
  }, []);

  // Guards against race conditions wiping local data before/during loading or on logout
  const isDataLoadedRef = useRef<boolean>(false);
  const isLoggingOutRef = useRef<boolean>(false);

  // Centralized robust loader: Reads from IndexedDB first, then localStorage, then cloud backup
  const loadUserData = useCallback(async (targetUid: string) => {
    isDataLoadedRef.current = false;
    try {
      // 1. Try authoritative local snapshot from IndexedDB first
      let [idbModels, idbTerms, idbProfile] = await Promise.all([
        loadModelsFromIndexedDB(targetUid),
        loadTermsFromIndexedDB(targetUid),
        loadProfileFromIndexedDB(targetUid),
      ]);

      // 2. If IndexedDB returned empty, fallback to localStorage
      if (!idbModels || idbModels.length === 0) {
        const lsModels = loadModels(targetUid);
        if (lsModels && lsModels.length > 0) {
          idbModels = lsModels;
          saveModelsToIndexedDB(lsModels, targetUid).catch(() => {});
        }
      }

      if (!idbTerms || idbTerms.length === 0) {
        const lsTerms = loadTerms(targetUid);
        if (lsTerms && lsTerms.length > 0) {
          idbTerms = lsTerms;
          saveTermsToIndexedDB(lsTerms, targetUid).catch(() => {});
        }
      }

      if (!idbProfile || isTestProfile(idbProfile)) {
        const lsProfile = loadProfile(targetUid);
        if (lsProfile && !isTestProfile(lsProfile)) {
          idbProfile = lsProfile;
          saveProfileToIndexedDB(lsProfile, targetUid).catch(() => {});
        }
      }

      // 3. Fallback to Cloudflare D1 cloud backup if local storage is completely empty and online
      if ((!idbModels || idbModels.length === 0) && navigator.onLine) {
        try {
          const headers = await getAuthHeaders();
          const res = await fetch(`/api/data?uid=${encodeURIComponent(targetUid)}`, { headers });
          if (res.ok) {
            const d = await res.json().catch(() => null);
            if (d && d.success && d.data) {
              if (Array.isArray(d.data.models) && d.data.models.length > 0) {
                idbModels = d.data.models;
                saveModels(d.data.models, targetUid);
                saveModelsToIndexedDB(d.data.models, targetUid).catch(() => {});
              }
              if (Array.isArray(d.data.terms) && d.data.terms.length > 0) {
                idbTerms = d.data.terms;
                saveTerms(d.data.terms, targetUid);
                saveTermsToIndexedDB(d.data.terms, targetUid).catch(() => {});
              }
              if (d.data.profile && !isTestProfile(d.data.profile)) {
                idbProfile = d.data.profile;
                saveProfile(d.data.profile, targetUid);
                saveProfileToIndexedDB(d.data.profile, targetUid).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.warn('Cloud restore check skipped:', err);
        }
      }

      const finalModels = harmonizeStudentIds(idbModels || []);
      const finalTerms = idbTerms || [];
      const rawProfile = (idbProfile && !isTestProfile(idbProfile))
        ? idbProfile
        : { ...DEFAULT_TEACHER_PROFILE, academicYear: getCurrentAcademicYear() };
      const { profile: finalProfile, migrated: profileMigrated } = normalizeLegacyDefaultAcademicYear(rawProfile, targetUid);
      if (profileMigrated) {
        saveProfile(finalProfile, targetUid);
        saveProfileToIndexedDB(finalProfile, targetUid).catch(() => {});
      }

      skipNextModelsPersistRef.current = true;
      skipNextTermsPersistRef.current = true;
      skipNextProfilePersistRef.current = true;
      setModels(finalModels);
      setTerms(finalTerms);
      setProfile(finalProfile);
      setActiveModelId(finalModels[0]?.id || '');
      setActiveTermId(finalTerms[0]?.id || '');

      if (!isProfileComplete(finalProfile) && !hasDismissedProfileModal) {
        setIsProfileModalOpen(true);
      }
    } finally {
      isDataLoadedRef.current = true;
    }
  }, [hasDismissedProfileModal]);

  // Initialize IndexedDB and load data on app mount
  useEffect(() => {
    ensureIndexedDBInitialized().then(async () => {
      await syncAuthWithIndexedDB();
      const cur = getCurrentUser();
      if (cur) {
        const isAnonDemo = cur.authProvider === 'trial' || cur.uid?.startsWith('trial-') || cur.email?.includes('@jok.nom');
        if (!cur.isAdmin && !isAnonDemo && (cur.subscriptionStatus === 'cancelled' || isAccountCancelled(cur.email))) {
          const cancelInfo = {
            email: cur.email,
            message: 'تم إلغاء حسابك من قِبل إدارة النظام.',
          };
          setCancelledAccountInfo(cancelInfo);
          setCurrentUser(null);
        } else {
          setCurrentUser(cur);
        }
        await loadUserData(cur.uid);

        // مصالحة عند بدء التشغيل: إذا كان المستخدم مسجلاً دخوله والسيرفر لا يعرفه -> ننشئ سجله تلقائياً ونحدّث اشتراكه
        if (!isAnonDemo && !cur.isAdmin) {
          reconcileCurrentUserWithServer().then(async (updated) => {
            if (!updated) return;
            if (updated.subscriptionStatus === 'cancelled') {
              const cancelInfo = {
                email: updated.email,
                message: 'تم إلغاء حسابك من قِبل إدارة النظام.',
              };
              try {
                localStorage.setItem('gradebook_active_cancelled_user', JSON.stringify(cancelInfo));
              } catch {}
              setCancelledAccountInfo(cancelInfo);
              setCurrentUser(null);
              return;
            }
            if (updated.subscriptionStatus === 'active' && !isSubscriptionExpired(updated)) {
              try {
                localStorage.removeItem('gradebook_active_cancelled_user');
              } catch {}
              lastOnlineVerifiedAtRef.current = Date.now();
              setCancelledAccountInfo(null);
            }
            setCurrentUser(updated);
          }).catch(() => {});
        }
      } else {
        await loadUserData('guest');
      }
    });
  }, [loadUserData]);

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

  // Sync Google / Email User profile and session persistence from Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        // مصالحة فورية للمستخدم المسجل في Firebase للتأكد من وجوده في D1 وتحديث حالة الاشتراك/الإلغاء
        const cleanEmail = (fbUser.email || '').trim().toLowerCase();
        const fbProvider: 'email' | 'google' = fbUser.providerData[0]?.providerId === 'password' ? 'email' : 'google';
        if (cleanEmail && !cleanEmail.includes('@jok.nom')) {
          fbUser.getIdToken().then((tok) => {
            if (tok) {
              saveCachedIdToken(tok);
            }
            return reconcileCurrentUserWithServer({
              uid: fbUser.uid,
              email: cleanEmail,
              displayName: fbUser.displayName || undefined,
              authProvider: fbProvider,
            });
          }).then(async (updated) => {
            if (!updated) return;
            if (!updated.isAdmin && updated.subscriptionStatus === 'cancelled') {
              const cancelInfo = {
                email: updated.email,
                message: 'تم إلغاء حسابك من قِبل إدارة النظام.',
              };
              try {
                localStorage.setItem('gradebook_active_cancelled_user', JSON.stringify(cancelInfo));
              } catch {}
              setCancelledAccountInfo(cancelInfo);
              setCurrentUser(null);
              return;
            }
            if (updated.subscriptionStatus === 'active' && !isSubscriptionExpired(updated)) {
              try {
                localStorage.removeItem('gradebook_active_cancelled_user');
              } catch {}
              lastOnlineVerifiedAtRef.current = Date.now();
              setCancelledAccountInfo(null);
            }
            setCurrentUser(updated);
            await loadUserData(updated.uid);
          }).catch(() => {});
        }

        setCurrentUser((prev) => {
          // في حال كانت حالة المستخدم فارغة (عند غلق المتصفح والعودة)، استعادة الجلسة المسجلة مسبقاً فقط؛ ولا ننشئ أي تجربة محلية وهمية لغير الأدمن قبل رد السيرفر
          if (!prev) {
            if (cleanEmail && !isAdminUser(cleanEmail) && isAccountCancelled(cleanEmail)) {
              return null;
            }
            const localCur = getCurrentUser();
            if (localCur && (localCur.uid === fbUser.uid || (localCur.email && localCur.email.toLowerCase() === cleanEmail))) {
              loadUserData(localCur.uid);
              return localCur;
            }
            const all: AppUser[] = getAllUsers();
            const existing = all.find(
              (u: AppUser) => (u && u.uid === fbUser.uid) || (u && u.email && u.email.trim().toLowerCase() === cleanEmail)
            );
            if (existing) {
              saveCurrentUser(existing);
              loadUserData(existing.uid);
              return existing;
            }
            const emailStr = fbUser.email || '';
            const isAdmin = isAdminUser(emailStr);
            if (!isAdmin) {
              return null;
            }
            const restored: AppUser = {
              uid: fbUser.uid,
              email: emailStr,
              displayName: fbUser.displayName || `أ. ${(emailStr || 'أستاذ').split('@')[0]}`,
              photoURL: fbUser.photoURL || undefined,
              authProvider: fbProvider,
              createdAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              isTrial: false,
              isAdmin: true,
              subscriptionType: 'lifetime',
              subscriptionStatus: 'active',
              userRole: 'teacher',
              institutionType: 'school',
            };
            saveCurrentUser(restored);
            upsertUserInRegistry(restored);
            loadUserData(restored.uid);
            return restored;
          }

          // Never overwrite or link an anonymous demo user
          if (prev.authProvider === 'trial' || prev.uid?.startsWith('trial-') || prev.email?.includes('@jok.nom')) {
            return prev;
          }
          const prevEmail = (prev.email || '').trim().toLowerCase();
          const fbEmail = (fbUser.email || '').trim().toLowerCase();
          // If matches current user or logged in via Google/Email
          if (
            prev.uid === fbUser.uid ||
            prev.authProvider === 'google' ||
            prev.authProvider === 'email' ||
            (prevEmail && fbEmail && prevEmail === fbEmail)
          ) {
            const updated: AppUser = {
              ...prev,
              displayName: fbUser.displayName || prev.displayName,
              photoURL: fbUser.photoURL || prev.photoURL,
              email: fbUser.email || prev.email,
              authProvider: prev.authProvider || (fbUser.providerData[0]?.providerId === 'password' ? 'email' : 'google'),
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
      // Admins and anonymous demo users are NEVER blocked by cancellation
      if (cur && (cur.isAdmin || cur.authProvider === 'trial' || cur.uid?.startsWith('trial-') || cur.email?.includes('@jok.nom'))) return null;

      const raw = localStorage.getItem('gradebook_active_cancelled_user');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.email && isAccountCancelled(p.email)) return p;
      }
      const isAnonDemo = cur && (cur.authProvider === 'trial' || cur.uid?.startsWith('trial-') || cur.email?.includes('@jok.nom'));
      if (cur && !cur.isAdmin && !isAnonDemo && (cur.subscriptionStatus === 'cancelled' || (cur.email && isAccountCancelled(cur.email)))) {
        return { email: cur.email, message: 'تم إلغاء حسابك من قِبل إدارة النظام.' };
      }
    } catch (e) {
      console.warn('Error checking cancelled account:', e);
    }
    return null;
  });

  const currentUserRef = useRef<AppUser | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Hidden silent verification function with Cloudflare D1
  const runLiveD1Verification = async () => {
    const activeUser = currentUserRef.current;
    if (!activeUser || activeUser.isAdmin || activeUser.authProvider === 'trial' || activeUser.uid?.startsWith('trial-') || activeUser.email?.includes('@jok.nom')) return;

    const wasLockedBefore = isSubscriptionExpired(activeUser) || activeUser.subscriptionStatus !== 'active';

    try {
      const res = await verifyUserWithCloudflareD1(activeUser, lastOnlineVerifiedAtRef.current);

      if (res.status === 'logged_out') return;

      if (res.status === 'cancelled_or_deleted') {
        const email = activeUser.email || '';
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
        if (res.user) {
          setCurrentUser(res.user);
        } else {
          setCurrentUser((prev) => (prev ? { ...prev, subscriptionStatus: 'expired' } : null));
        }
        return;
      }

      if (res.status === 'active') {
        lastOnlineVerifiedAtRef.current = Date.now();
        setIsOfflineTimeoutModalOpen(false);
        try {
          localStorage.removeItem('gradebook_active_cancelled_user');
        } catch {}
        setCancelledAccountInfo(null);
        if (res.user) {
          const verifiedUser: AppUser = res.user;
          setCurrentUser((prev) => {
            if (!prev) return verifiedUser;
            if (
              prev.uid === verifiedUser.uid &&
              prev.subscriptionStatus === verifiedUser.subscriptionStatus &&
              prev.subscriptionType === verifiedUser.subscriptionType &&
              prev.expiresAt === verifiedUser.expiresAt &&
              prev.isTrial === verifiedUser.isTrial &&
              prev.isAdmin === verifiedUser.isAdmin &&
              prev.userRole === verifiedUser.userRole &&
              prev.institutionType === verifiedUser.institutionType
            ) {
              return prev;
            }
            return verifiedUser;
          });
          if (wasLockedBefore) {
            showToast('تم تفعيل اشتراكك واستلام التحديث من السيرفر بنجاح!');
          }
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

  // Automatic polling while on the Cancelled Account screen so Admin reactivation unlocks automatically without logout/reinstall
  const cancelledEmail = cancelledAccountInfo?.email || '';
  useEffect(() => {
    if (!cancelledEmail) return;
    let isDisposed = false;

    const verifyCancelledAccountLive = async () => {
      if (isDisposed) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        const check = await checkLiveSubscriptionByEmail(cancelledEmail);
        if (isDisposed) return;
        if (check.active && check.user) {
          try {
            localStorage.removeItem('gradebook_active_cancelled_user');
          } catch {}
          lastOnlineVerifiedAtRef.current = Date.now();
          setCancelledAccountInfo(null);
          setCurrentUser(check.user);
          await loadUserData(check.user.uid);
          showToast('تم التحقق بنجاح! تم إعادة الاشتراك وتفعيل حسابك تلقائياً.');
        }
      } catch {
        // Keep current state when offline or transient failure
      }
    };

    verifyCancelledAccountLive();
    const timer = setInterval(verifyCancelledAccountLive, 15000);
    const onOnlineOrFocus = () => verifyCancelledAccountLive();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyCancelledAccountLive();
      }
    };

    window.addEventListener('online', onOnlineOrFocus);
    window.addEventListener('focus', onOnlineOrFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isDisposed = true;
      clearInterval(timer);
      window.removeEventListener('online', onOnlineOrFocus);
      window.removeEventListener('focus', onOnlineOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [cancelledEmail, loadUserData]);

  // Periodic and event-based verification (checks faster when locked out so activation unlocks automatically)
  const isCurrentlyExpired = Boolean(currentUser && isSubscriptionExpired(currentUser) && !currentUser.isAdmin);
  useEffect(() => {
    if (!currentUser || currentUser.isAdmin || currentUser.authProvider === 'trial' || currentUser.uid?.startsWith('trial-') || currentUser.email?.includes('@jok.nom')) return;

    // Run silent check on entry
    runLiveD1Verification();

    // Check every 15s when expired/waiting for activation, or every 30s normally
    const intervalMs = isCurrentlyExpired ? 15000 : 30000;
    const timer = setInterval(() => {
      runLiveD1Verification();
    }, intervalMs);

    const onOnline = async () => {
      await runLiveD1Verification();
      const latest = currentUserRef.current;
      if (latest && latest.subscriptionStatus === 'active' && !latest.isTrial && syncManager.hasUnsyncedChanges()) {
        syncManager.syncPendingData(latest.uid).catch(() => {});
      }
    };

    const onFocus = () => {
      runLiveD1Verification();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runLiveD1Verification();
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentUser?.uid, isCurrentlyExpired]);

  const isModelsInitialMount = useRef(true);
  const isTermsInitialMount = useRef(true);
  const isProfileInitialMount = useRef(true);
  const skipNextModelsPersistRef = useRef(false);
  const skipNextTermsPersistRef = useRef(false);
  const skipNextProfilePersistRef = useRef(false);

  const modelsRef = useRef(models);
  modelsRef.current = models;
  const termsRef = useRef(terms);
  termsRef.current = terms;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const dirtyModelsRef = useRef(false);
  const dirtyTermsRef = useRef(false);
  const dirtyProfileRef = useRef(false);
  const modelsSaveTimerRef = useRef<number | null>(null);
  const termsSaveTimerRef = useRef<number | null>(null);
  const profileSaveTimerRef = useRef<number | null>(null);

  const flushPendingLocalSaves = useCallback(() => {
    if (!isDataLoadedRef.current || isLoggingOutRef.current) return;
    const uid = currentUserRef.current?.uid;

    if (dirtyModelsRef.current) {
      if (modelsSaveTimerRef.current !== null) {
        window.clearTimeout(modelsSaveTimerRef.current);
        modelsSaveTimerRef.current = null;
      }
      dirtyModelsRef.current = false;
      saveModels(modelsRef.current, uid);
      saveModelsToIndexedDB(modelsRef.current, uid);
    }

    if (dirtyTermsRef.current) {
      if (termsSaveTimerRef.current !== null) {
        window.clearTimeout(termsSaveTimerRef.current);
        termsSaveTimerRef.current = null;
      }
      dirtyTermsRef.current = false;
      saveTerms(termsRef.current, uid);
      saveTermsToIndexedDB(termsRef.current, uid);
    }

    if (dirtyProfileRef.current) {
      if (profileSaveTimerRef.current !== null) {
        window.clearTimeout(profileSaveTimerRef.current);
        profileSaveTimerRef.current = null;
      }
      dirtyProfileRef.current = false;
      if (!isTestProfile(profileRef.current)) {
        saveProfile(profileRef.current, uid);
        saveProfileToIndexedDB(profileRef.current, uid);
      }
    }
  }, []);

  const [isExitSyncModalOpen, setIsExitSyncModalOpen] = useState(false);
  const [isLoggingOutSyncing, setIsLoggingOutSyncing] = useState(false);

  // Flush debounced local saves & warn on closing tab/browser if changes are unsynced and user is online
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      flushPendingLocalSaves();
      if (syncManager.hasUnsyncedChanges() && navigator.onLine) {
        e.preventDefault();
        e.returnValue = 'لديك تعديلات محفوظة محلياً ولم تُرفع بعد إلى السحابة. هل أنت متأكد من المغادرة؟';
        return e.returnValue;
      }
    };
    const handlePageHide = () => flushPendingLocalSaves();
    const handleVisibilityHidden = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingLocalSaves();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityHidden);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityHidden);
      flushPendingLocalSaves();
    };
  }, [flushPendingLocalSaves]);

  // Auto-save changes locally to localStorage and IndexedDB (debounced to keep typing/browsing instant)
  useEffect(() => {
    if (!isDataLoadedRef.current || isLoggingOutRef.current) return;

    if (skipNextModelsPersistRef.current) {
      skipNextModelsPersistRef.current = false;
      isModelsInitialMount.current = false;
      return;
    }

    if (isModelsInitialMount.current) {
      isModelsInitialMount.current = false;
      saveModels(models, currentUser?.uid);
      saveModelsToIndexedDB(models, currentUser?.uid);
      return;
    }

    syncManager.recordChange('models');
    if (currentUser?.uid) recordUserActivity(currentUser.uid);

    dirtyModelsRef.current = true;
    if (modelsSaveTimerRef.current !== null) {
      window.clearTimeout(modelsSaveTimerRef.current);
    }
    const targetUid = currentUser?.uid;
    modelsSaveTimerRef.current = window.setTimeout(() => {
      modelsSaveTimerRef.current = null;
      if (!isDataLoadedRef.current || isLoggingOutRef.current) return;
      dirtyModelsRef.current = false;
      saveModels(modelsRef.current, targetUid);
      saveModelsToIndexedDB(modelsRef.current, targetUid);
    }, 350);
  }, [models, currentUser?.uid]);

  useEffect(() => {
    if (!isDataLoadedRef.current || isLoggingOutRef.current) return;

    if (skipNextTermsPersistRef.current) {
      skipNextTermsPersistRef.current = false;
      isTermsInitialMount.current = false;
      return;
    }

    if (isTermsInitialMount.current) {
      isTermsInitialMount.current = false;
      saveTerms(terms, currentUser?.uid);
      saveTermsToIndexedDB(terms, currentUser?.uid);
      return;
    }

    syncManager.recordChange('terms');
    if (currentUser?.uid) recordUserActivity(currentUser.uid);

    dirtyTermsRef.current = true;
    if (termsSaveTimerRef.current !== null) {
      window.clearTimeout(termsSaveTimerRef.current);
    }
    const targetUid = currentUser?.uid;
    termsSaveTimerRef.current = window.setTimeout(() => {
      termsSaveTimerRef.current = null;
      if (!isDataLoadedRef.current || isLoggingOutRef.current) return;
      dirtyTermsRef.current = false;
      saveTerms(termsRef.current, targetUid);
      saveTermsToIndexedDB(termsRef.current, targetUid);
    }, 250);
  }, [terms, currentUser?.uid]);

  useEffect(() => {
    if (!isDataLoadedRef.current || isLoggingOutRef.current) return;

    if (skipNextProfilePersistRef.current) {
      skipNextProfilePersistRef.current = false;
      isProfileInitialMount.current = false;
      return;
    }

    if (!isTestProfile(profile)) {
      if (isProfileInitialMount.current) {
        isProfileInitialMount.current = false;
        saveProfile(profile, currentUser?.uid);
        saveProfileToIndexedDB(profile, currentUser?.uid);
        return;
      }

      syncManager.recordChange('profile');
      if (currentUser?.uid) recordUserActivity(currentUser.uid);

      dirtyProfileRef.current = true;
      if (profileSaveTimerRef.current !== null) {
        window.clearTimeout(profileSaveTimerRef.current);
      }
      const targetUid = currentUser?.uid;
      profileSaveTimerRef.current = window.setTimeout(() => {
        profileSaveTimerRef.current = null;
        if (!isDataLoadedRef.current || isLoggingOutRef.current) return;
        dirtyProfileRef.current = false;
        if (!isTestProfile(profileRef.current)) {
          saveProfile(profileRef.current, targetUid);
          saveProfileToIndexedDB(profileRef.current, targetUid);
        }
      }, 250);
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
    setModels(updatedList);
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
  const handleOpenProfileForSubject = useCallback(() => {
    returnToCreateModelRef.current = true;
    setHighlightProfileSubject(true);
    setIsProfileModalOpen(true);
  }, []);

  const handleSaveProfile = (updatedProfile: TeacherProfile) => {
    const shouldReturnToCreateModel = returnToCreateModelRef.current;
    returnToCreateModelRef.current = false;
    setHighlightProfileSubject(false);

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

    const nextAcademicYear = updatedProfile.academicYear?.trim();
    const shouldUpdateSubject =
      models.length === 1 &&
      (!models[0].subject || models[0].subject === 'عام') &&
      Boolean(updatedProfile.subject?.trim());
    const shouldUpdateYear =
      Boolean(nextAcademicYear) &&
      models.some((m) => (m.academicYear || '').trim() !== nextAcademicYear);

    if (shouldUpdateSubject || shouldUpdateYear) {
      const updated = models.map((m, idx) => ({
        ...m,
        ...(shouldUpdateSubject && idx === 0 ? { subject: updatedProfile.subject.trim() } : {}),
        ...(nextAcademicYear ? { academicYear: nextAcademicYear } : {}),
      }));
      setModels(updated);
      saveModels(updated, currentUser?.uid);
      saveModelsToIndexedDB(updated);
    }

    if (shouldReturnToCreateModel && updatedProfile.subject?.trim()) {
      setReopenCreateModelNonce((prev) => prev + 1);
    }

    const toastMsg = updatedProfile.institutionType === 'university'
      ? 'تم حفظ بيانات الأستاذ الجامعي والكلية بنجاح'
      : 'تم حفظ بيانات المعلم والمدرسة بنجاح';
    showToast(toastMsg);
    if (currentUser?.uid) recordUserActivity(currentUser.uid);
  };

  // Backup actions
  const handleExportBackup = () => {
    flushPendingLocalSaves();
    const uid = currentUser?.uid;
    const liveModels = modelsRef.current;
    const liveTerms = termsRef.current;
    const liveProfile = profileRef.current;
    const jsonStr = exportBackupData(uid, {
      models: liveModels,
      terms: liveTerms,
      profile: liveProfile,
      personalData,
    });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fileName = `gradebook-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;

    const uniqueStudentIds = new Set<string>();
    for (const m of liveModels) {
      for (const st of m.students || []) {
        uniqueStudentIds.add(st.id || st.name);
      }
    }
    const sizeKB = Math.max(1, Math.round(new Blob([jsonStr]).size / 1024));

    setBackupExportPreview({
      fileName,
      jsonStr,
      modelsCount: liveModels.length,
      studentsCount: uniqueStudentIds.size,
      termsCount: liveTerms.length,
      sizeKB,
    });

    if (uid) recordUserActivity(uid);
  };

  const handleImportBackup = (jsonString: string, fileName?: string) => {
    const uid = currentUser?.uid;
    const parsed = parseBackupData(jsonString, uid);
    if (!parsed.valid) {
      showToast(
        fileName
          ? `فشل استيراد (${fileName}). يرجى التأكد من اختيار ملف JSON صالح.`
          : 'فشل استيراد الملف. يرجى التأكد من اختيار ملف JSON صالح.'
      );
      return;
    }

    const hasModelsOrTerms = parsed.models.length > 0 || parsed.terms.length > 0;
    const hasPersonalData = Boolean(
      parsed.personalData && typeof parsed.personalData === 'object'
    );

    if (!hasModelsOrTerms && !parsed.profile && !hasPersonalData) {
      showToast(
        fileName
          ? `الملف (${fileName}) فارغ ولا يحتوي على أي جداول أو بيانات مسجلة.`
          : 'ملف النسخة الاحتياطية فارغ ولا يحتوي على أي جداول أو بيانات مسجلة.'
      );
      return;
    }

    if (modelsSaveTimerRef.current !== null) {
      window.clearTimeout(modelsSaveTimerRef.current);
      modelsSaveTimerRef.current = null;
    }
    if (termsSaveTimerRef.current !== null) {
      window.clearTimeout(termsSaveTimerRef.current);
      termsSaveTimerRef.current = null;
    }
    if (profileSaveTimerRef.current !== null) {
      window.clearTimeout(profileSaveTimerRef.current);
      profileSaveTimerRef.current = null;
    }
    dirtyModelsRef.current = false;
    dirtyTermsRef.current = false;
    dirtyProfileRef.current = false;

    skipNextModelsPersistRef.current = true;
    skipNextTermsPersistRef.current = true;
    skipNextProfilePersistRef.current = Boolean(parsed.profile);

    saveModels(parsed.models, uid);
    saveTerms(parsed.terms, uid);
    saveModelsToIndexedDB(parsed.models, uid).catch(() => {});
    saveTermsToIndexedDB(parsed.terms, uid).catch(() => {});

    if (parsed.profile) {
      saveProfile(parsed.profile, uid);
      saveProfileToIndexedDB(parsed.profile, uid).catch(() => {});
      setProfile(parsed.profile);
    }

    if (hasPersonalData) {
      handleUpdatePersonalData(parsed.personalData as any);
    }

    setModels(parsed.models);
    setTerms(parsed.terms);
    setActiveModelId(parsed.models[0]?.id || '');
    setActiveTermId(parsed.terms[0]?.id || '');

    syncManager.recordChange('models');
    syncManager.recordChange('terms');
    if (parsed.profile) syncManager.recordChange('profile');

    if (hasModelsOrTerms) {
      showToast(
        `تم استعادة النسخة الاحتياطية بنجاح (${parsed.models.length} جداول، ${parsed.terms.length} فصول).`
      );
    } else {
      showToast(
        fileName
          ? `تم استيراد بيانات المعلم فقط — الملف (${fileName}) لا يحتوي على جداول طلاب (عدد الجداول: 0).`
          : 'تم استيراد بيانات المعلم فقط — الملف لا يحتوي على جداول طلاب (عدد الجداول: 0).'
      );
    }
    if (uid) recordUserActivity(uid);
  };

  const handleImportFromCloud = async (
    onStepChange: (step: CloudRestoreStep) => void
  ) => {
    if (!currentUser) {
      throw new Error('يرجى تسجيل الدخول أولاً لاستيراد البيانات من السيرفر السحابي.');
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('أنت غير متصل بالإنترنت حالياً. يرجى الاتصال بالإنترنت ثم المحاولة مجدداً.');
    }

    // 1. Download local data first just like exporting a backup
    onStepChange('downloading_local');
    const jsonStr = JSON.stringify(
      {
        app: 'TeacherGradebook',
        version: '2.0',
        exportDate: new Date().toISOString(),
        profile,
        models,
        terms,
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradebook-backup-before-cloud-restore-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);

    // 2. Wait a few seconds so the local backup download settles before pulling from the cloud server
    onStepChange('waiting_before_cloud');
    await new Promise((resolve) => window.setTimeout(resolve, 2500));

    // 3. Fetch data from cloud server and apply into the app
    onStepChange('fetching_cloud');
    const apiUrl = `/api/data?uid=${encodeURIComponent(currentUser.uid)}`;
    let headers = await getAuthHeaders();
    let res = await fetch(apiUrl, {
      headers,
      cache: 'no-store',
    }).catch(() => null);

    if (res && (res.status === 401 || res.status === 403) && auth?.currentUser) {
      try {
        const fresh = await auth.currentUser.getIdToken(true);
        if (fresh) {
          saveCachedIdToken(fresh);
          headers = await getAuthHeaders();
          res = await fetch(apiUrl, {
            headers,
            cache: 'no-store',
          }).catch(() => null);
        }
      } catch {}
    }

    if (!res) {
      throw new Error(
        'تعذر الاتصال بالسيرفر السحابي. تم الاحتفاظ ببياناتك المحلية والنسخة الاحتياطية بأمان.'
      );
    }

    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload || !payload.success) {
      throw new Error(
        payload?.error ||
          'تعذر جلب البيانات من السيرفر السحابي. تم الاحتفاظ ببياناتك المحلية والنسخة الاحتياطية بأمان.'
      );
    }

    if (payload.message === 'D1 not configured') {
      throw new Error(
        'قاعدة البيانات السحابية (Cloudflare D1) غير مربوطة على السيرفر حالياً، وتم الإبقاء على بياناتك المحلية كما هي.'
      );
    }

    const cloudData = payload.data;
    const rawCloudModels = Array.isArray(cloudData?.models) ? cloudData.models : [];
    const rawCloudTerms = Array.isArray(cloudData?.terms) ? cloudData.terms : [];
    const hasCloudProfile = Boolean(cloudData?.profile && !isTestProfile(cloudData.profile));

    if (!cloudData || (rawCloudModels.length === 0 && rawCloudTerms.length === 0 && !hasCloudProfile)) {
      throw new Error(
        'لا توجد بيانات محفوظة على السيرفر السحابي لهذا الحساب حالياً، وتم الإبقاء على بياناتك المحلية كما هي.'
      );
    }

    const preparedCloudModels = rawCloudModels.map((m: MonthlyModel) => {
      let inferredGrade = m.gradeLevel;
      if (!inferredGrade && Array.isArray(m.students) && m.students.length > 0) {
        const gradedGrades = new Set<string>();
        let sampleGrade = '';
        for (const st of m.students) {
          const hasAnyScore =
            (st.writtenRawScore !== null && st.writtenRawScore !== undefined) ||
            Boolean(st.notes && st.notes.trim()) ||
            Boolean(st.scores && Object.values(st.scores).some((v) => v !== null && v !== undefined)) ||
            Boolean(st.participationHistory && Object.values(st.participationHistory).some((arr) => arr?.length)) ||
            Boolean(st.attendanceRecords && Object.values(st.attendanceRecords).some((arr) => arr?.length));
          if (hasAnyScore && st.gradeLevel?.trim()) {
            const gNorm = st.gradeLevel.trim().toLowerCase();
            gradedGrades.add(gNorm);
            if (!sampleGrade) sampleGrade = st.gradeLevel.trim();
          }
        }
        if (gradedGrades.size === 1 && sampleGrade) {
          inferredGrade = sampleGrade;
        }
      }
      return {
        ...m,
        ...(inferredGrade ? { gradeLevel: inferredGrade } : {}),
        writtenWeight:
          m.writtenWeight === 70 && (!m.customColumns || m.customColumns.length === 0)
            ? null
            : m.writtenWeight ?? null,
      };
    });

    const sanitizedModels = harmonizeStudentIds(preparedCloudModels);

    const nextProfileRaw = hasCloudProfile
      ? cloudData.profile
      : { ...DEFAULT_TEACHER_PROFILE, academicYear: getCurrentAcademicYear() };
    const { profile: nextProfile } = normalizeLegacyDefaultAcademicYear(
      nextProfileRaw,
      currentUser.uid
    );

    if (modelsSaveTimerRef.current !== null) {
      window.clearTimeout(modelsSaveTimerRef.current);
      modelsSaveTimerRef.current = null;
    }
    if (termsSaveTimerRef.current !== null) {
      window.clearTimeout(termsSaveTimerRef.current);
      termsSaveTimerRef.current = null;
    }
    if (profileSaveTimerRef.current !== null) {
      window.clearTimeout(profileSaveTimerRef.current);
      profileSaveTimerRef.current = null;
    }
    dirtyModelsRef.current = false;
    dirtyTermsRef.current = false;
    dirtyProfileRef.current = false;

    isModelsInitialMount.current = true;
    isTermsInitialMount.current = true;
    isProfileInitialMount.current = true;
    skipNextModelsPersistRef.current = true;
    skipNextTermsPersistRef.current = true;
    skipNextProfilePersistRef.current = hasCloudProfile;

    saveModels(sanitizedModels, currentUser.uid);
    saveTerms(rawCloudTerms, currentUser.uid);
    if (hasCloudProfile) {
      saveProfile(nextProfile, currentUser.uid);
    }

    await Promise.all([
      saveModelsToIndexedDB(sanitizedModels, currentUser.uid),
      saveTermsToIndexedDB(rawCloudTerms, currentUser.uid),
      ...(hasCloudProfile ? [saveProfileToIndexedDB(nextProfile, currentUser.uid)] : []),
    ]);
    await syncManager.clearPendingChanges();

    setModels(sanitizedModels);
    setTerms(rawCloudTerms);
    if (hasCloudProfile) {
      setProfile(nextProfile);
    }
    setActiveModelId(sanitizedModels[0]?.id || '');
    setActiveTermId(rawCloudTerms[0]?.id || '');

    showToast('تم تنزيل النسخة المحلية واستيراد البيانات من قاعدة البيانات السحابية بنجاح');
    recordUserActivity(currentUser.uid);
  };

  const handleResetDefaults = () => {
    const uid = currentUser?.uid;
    if (modelsSaveTimerRef.current !== null) {
      window.clearTimeout(modelsSaveTimerRef.current);
      modelsSaveTimerRef.current = null;
    }
    if (termsSaveTimerRef.current !== null) {
      window.clearTimeout(termsSaveTimerRef.current);
      termsSaveTimerRef.current = null;
    }
    if (profileSaveTimerRef.current !== null) {
      window.clearTimeout(profileSaveTimerRef.current);
      profileSaveTimerRef.current = null;
    }
    dirtyModelsRef.current = false;
    dirtyTermsRef.current = false;
    dirtyProfileRef.current = false;
    skipNextModelsPersistRef.current = true;
    skipNextTermsPersistRef.current = true;
    skipNextProfilePersistRef.current = true;

    const data = resetToDefaults(uid);
    saveModelsToIndexedDB(data.models, uid).catch(() => {});
    saveTermsToIndexedDB(data.terms, uid).catch(() => {});
    saveProfileToIndexedDB(data.profile, uid).catch(() => {});

    setModels(data.models);
    setTerms(data.terms);
    setProfile(data.profile);
    setActiveModelId(data.models[0]?.id || '');
    setActiveTermId(data.terms[0]?.id || '');
    showToast('تم استعادة البيانات الافتراضية بنجاح');
    if (uid) recordUserActivity(uid);
  };

  const handleLogout = async () => {
    flushPendingLocalSaves();
    isLoggingOutRef.current = true;
    isDataLoadedRef.current = false;
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
    returnToCreateModelRef.current = false;
    setHighlightProfileSubject(false);
    setIsProfileModalOpen(false);
    showToast('تم تسجيل الخروج بنجاح وتأمين الجلسة ومسح البيانات من الشاشة.');
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 800);
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
            lastOnlineVerifiedAtRef.current = Date.now();
            setCancelledAccountInfo(null);
            setCurrentUser(check.user);
            await loadUserData(check.user.uid);
            showToast('تم التحقق بنجاح! تم إعادة الاشتراك وتفعيل حسابك.');
          } else {
            throw new Error(
              check.message ||
                `ما زال الحساب غير مفعل من قِبل الإدارة. يرجى التواصل مع الأدمن على الرقم ${SUPPORT_PHONE_NUMBER || '07706118992'} لطلب إعادة الاشتراك.`
            );
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
          loadUserData(user.uid);

          if (user.subscriptionStatus === 'active') {
            showToast(`أهلاً بك ${user.displayName}! تم تسجيل الدخول بنجاح (حساب مفعل).`);
          } else {
            showToast(`أهلاً بك ${user.displayName}! تم تسجيل الدخول بنجاح (فترة تجريبية مجانية لمدة 3 أيام).`);
          }
        }}
      />
    );
  }

  // Check if current user subscription has expired (blocked unless admin)
  const isExpired = isSubscriptionExpired(currentUser) && !currentUser.isAdmin;

  // When user's yearly subscription or trial expires, show the unbypassable subscription renewal screen
  if (isExpired) {
    return (
      <SubscriptionExpiredModal
        isOpen={true}
        onClose={() => {}}
        user={currentUser}
        onLogout={handleLogout}
        canDismiss={false}
        onSubscriptionActivated={async (updatedUser) => {
          try {
            localStorage.removeItem('gradebook_active_cancelled_user');
          } catch {}
          lastOnlineVerifiedAtRef.current = Date.now();
          setCancelledAccountInfo(null);
          setCurrentUser(updatedUser);
          await loadUserData(updatedUser.uid);
          showToast('تم التحقق بنجاح! تم تجديد اشتراكك وتحديث البيانات.');
        }}
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

      {/* 3-Day (72-Hour) Free Trial Countdown Banner with WhatsApp contact and subscription modal trigger */}
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
        onOpenProfileModal={() => {
          returnToCreateModelRef.current = false;
          setHighlightProfileSubject(false);
          setIsProfileModalOpen(true);
        }}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        onOpenRoundingModal={() => setIsRoundingModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onImportFromCloud={handleImportFromCloud}
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
            onOpenProfileForSubject={handleOpenProfileForSubject}
            reopenCreateModelNonce={reopenCreateModelNonce}
            numeralMode={numeralMode}
            onNumeralModeChange={handleNumeralModeChange}
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
            numeralMode={numeralMode}
            onNumeralModeChange={handleNumeralModeChange}
          />
        )}

        {activeTab === 'cards' && (
          <ReportCardsView
            terms={terms}
            monthlyModels={models}
            profile={profile}
            onUpdateProfile={handleSaveProfile}
            numeralMode={numeralMode}
            onNumeralModeChange={handleNumeralModeChange}
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
          returnToCreateModelRef.current = false;
          setHighlightProfileSubject(false);
          setIsProfileModalOpen(false);
          setHasDismissedProfileModal(true);
        }}
        profile={profile}
        onSave={handleSaveProfile}
        currentUser={currentUser}
        onChangeRole={() => setIsRoleModalOpen(true)}
        highlightSubject={highlightProfileSubject}
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
          try {
            localStorage.removeItem('gradebook_active_cancelled_user');
          } catch {}
          lastOnlineVerifiedAtRef.current = Date.now();
          setCancelledAccountInfo(null);
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

      {/* iOS Print Helper Modal (shown only if iPhone Home-Screen PWA / in-app browser suppresses native print) */}
      <IosPrintHelperModal
        isOpen={Boolean(iosPrintHelperStatus)}
        onClose={() => setIosPrintHelperStatus(null)}
        status={iosPrintHelperStatus || getIOSPrintStatus()}
      />

      {/* Personal Teacher Side-Bottom Floating Icon */}
      <TeacherPersonalFloatingButton
        onClick={() => setIsPersonalModalOpen(true)}
        activeAlertsCount={personalData.alerts.filter((a) => a.isActive).length}
        hasRingingAlert={ringingAlerts.length > 0}
      />

      {/* Active Teacher Alert Banner */}
      <TeacherAlertBanner
        alerts={ringingAlerts}
        onDismiss={handleDismissRingingAlert}
        onSnooze={handleSnoozeRingingAlert}
        onOpenAlertsTab={() => {
          setPersonalModalTab('alerts');
          setIsPersonalModalOpen(true);
        }}
      />

      {/* Personal Teacher Workspace Modal (Weekly Schedule, Notes, Alerts) */}
      <TeacherPersonalModal
        isOpen={isPersonalModalOpen}
        onClose={() => setIsPersonalModalOpen(false)}
        activeTab={personalModalTab}
        onTabChange={setPersonalModalTab}
        data={personalData}
        onChange={handleUpdatePersonalData}
        models={models}
        profile={profile}
      />

      {/* Backup Export Verification & Manual Download / Copy Fallback Modal */}
      <BackupExportModal
        isOpen={Boolean(backupExportPreview)}
        exportData={backupExportPreview}
        onClose={() => setBackupExportPreview(null)}
      />
    </div>
  );
}
