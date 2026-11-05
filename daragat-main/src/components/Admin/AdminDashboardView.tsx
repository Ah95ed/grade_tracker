import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Search,
  Sparkles,
  Calendar,
  Clock,
  Infinity as InfinityIcon,
  Trash2,
  AlertCircle,
  CheckCircle,
  Crown,
  RefreshCw,
  Mail,
  UserCheck,
  UserX,
  Phone,
  MessageCircle,
  Database,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { SqlDatabaseModal } from '../Common/SqlDatabaseModal';
import {
  AppUser,
  SubscriptionType,
  getAllUsers,
  fetchRemoteUsers,
  fetchRemoteUsersDetailed,
  RemoteUsersResult,
  updateUserSubscription,
  reactivateUserSubscription,
  cancelUserAccount,
  deleteUserFromRegistry,
  getAdminEmails,
  addAdminEmail,
  removeAdminEmail,
  PRIMARY_ADMIN_EMAIL,
  SUPPORT_PHONE_NUMBER,
  TRIAL_DURATION_MS,
  updateUserRoleByAdmin,
} from '../../utils/auth';
import {
  formatIraqDateTime,
  formatIraqDate,
  formatIraqTime,
  formatRelativeIraq,
  parseSafeTimestamp,
  IRAQ_TIMEZONE,
} from '../../utils/dateUtils';

interface Props {
  currentUser: AppUser;
  onRefreshData?: () => void;
}

export const AdminDashboardView: React.FC<Props> = ({ currentUser }) => {
  const [users, setUsers] = useState<AppUser[]>(() => getAllUsers());
  const [admins, setAdmins] = useState<string[]>(() => getAdminEmails());
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminSuccessMsg, setAdminSuccessMsg] = useState<string | null>(null);
  const [adminErrorMsg, setAdminErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'admin_school' | 'teacher' | 'trial48' | 'exceeded48' | 'cancelled'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncResult, setSyncResult] = useState<RemoteUsersResult | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Update countdown clock every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Quick email reactivation form state
  const [quickEmail, setQuickEmail] = useState('');
  const [quickPlan, setQuickPlan] = useState<SubscriptionType>('lifetime');

  const refreshList = async () => {
    setIsRefreshing(true);
    setAdmins(getAdminEmails());

    // Live remote sync DIRECTLY from Cloudflare D1 SQLite database
    try {
      const detailed = await fetchRemoteUsersDetailed();
      setSyncResult(detailed);
      if (detailed.users && detailed.users.length > 0) {
        setUsers(detailed.users);
      } else {
        setUsers(getAllUsers());
      }
    } catch (e) {
      console.warn('Failed to fetch remote users, using local cache', e);
      setUsers(getAllUsers());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshList();
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        refreshList();
      }
    });
    return () => unsub();
  }, []);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Add new admin
  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErrorMsg(null);
    setAdminSuccessMsg(null);

    const email = newAdminEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setAdminErrorMsg('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    const added = addAdminEmail(email);
    if (added) {
      setAdminSuccessMsg(`تمت إضافة الأدمن (${email}) بنجاح.`);
      setNewAdminEmail('');
      refreshList();
    } else {
      setAdminErrorMsg('هذا البريد مسجل مسبقاً كأدمن.');
    }
  };

  // Remove admin
  const handleRemoveAdmin = (email: string) => {
    if (email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      alert('لا يمكن إزالة الأدمن الأساسي للنظام.');
      return;
    }
    if (confirm(`هل أنت متأكد من سحب صلاحية الأدمن من (${email})؟`)) {
      removeAdminEmail(email);
      refreshList();
      showNotice(`تم سحب صلاحية الأدمن من ${email}`);
    }
  };

  // Update subscription type directly in Cloudflare D1
  const handleSetSubscription = async (uid: string, type: SubscriptionType) => {
    setIsRefreshing(true);
    try {
      const updated = await updateUserSubscription(uid, type, 'active');
      if (updated) {
        await refreshList();
        const planNames = {
          monthly: 'شهري (30 يوماً)',
          yearly: 'سنوي (365 يوماً)',
          lifetime: 'مدى الحياة (دائم)',
          trial: 'تجريبي (3 أيام)',
        };
        showNotice(`تم تحديث اشتراك (${updated.email}) مباشرة في قاعدة البيانات إلى: ${planNames[type]}`);
      }
    } catch (e: any) {
      showNotice(e.message || 'فشل حفظ الاشتراك في قاعدة البيانات السحابية');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reactivate user subscription (زر إعادة الاشتراك الأساسي المطلوب - افتراضياً مدى الحياة)
  const handleReactivateSubscription = async (
    uid: string,
    email: string,
    type: SubscriptionType = 'lifetime'
  ) => {
    setIsRefreshing(true);
    try {
      const updated = await reactivateUserSubscription(uid, email, type);
      if (updated) {
        await refreshList();
        const planNames = {
          monthly: 'شهري (30 يوماً)',
          yearly: 'سنوي (365 يوماً)',
          lifetime: 'مدى الحياة (دائم)',
          trial: 'تجريبي (48 ساعة)',
        };
        showNotice(`✅ تمت إعادة تفعيل واشتراك المستخدم (${email}) بنجاح (${planNames[type]})! أصبح حسابه نشطاً الآن.`);
      } else {
        showNotice(`تعذر إعادة اشتراك (${email})، يرجى التحقق من الاتصال`);
      }
    } catch (e: any) {
      showNotice(e.message || 'حدث خطأ أثناء إعادة الاشتراك والتفعيل');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Cancel / block user account directly (زر إلغاء الحساب)
  const handleCancelUser = async (uid: string, email: string) => {
    if (
      confirm(
        `هل أنت متأكد من إلغاء حساب المستخدم (${email})؟\n\nسيتم حظر حسابه فوراً وتوجيهه إلى صفحة التواصل معك عبر واتساب أو الاتصال على الرقم ${SUPPORT_PHONE_NUMBER} لطلب إعادة الاشتراك.`
      )
    ) {
      setIsRefreshing(true);
      try {
        const ok = await cancelUserAccount(uid, email);
        if (ok) {
          await refreshList();
          showNotice(`🚫 تم إلغاء تفعيل حساب (${email}) بنجاح. ستظهر له صفحة التواصل معك لإعادة الاشتراك.`);
        } else {
          showNotice(`تعذر إلغاء حساب (${email})`);
        }
      } catch (e: any) {
        showNotice(e.message || 'حدث خطأ أثناء إلغاء الحساب');
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Quick email reactivation form submit
  const handleQuickReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = quickEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('يرجى إدخال بريد إلكتروني صالح لإعادة الاشتراك.');
      return;
    }
    const target = users.find((u) => u.email.toLowerCase() === cleanEmail);
    // إذا لم يكن المستخدم موجوداً محلياً بعد، نمرر المعرف الخاص به إن وجد أو ننشئه
    const uid = target ? target.uid : `user-${Date.now()}`;
    await handleReactivateSubscription(uid, cleanEmail, quickPlan);
    setQuickEmail('');
  };

  // Expire / cancel subscription directly in Cloudflare D1
  const handleExpireSubscription = async (uid: string) => {
    setIsRefreshing(true);
    try {
      const updated = await updateUserSubscription(uid, 'monthly', 'expired');
      if (updated) {
        await refreshList();
        showNotice(`تم إنهاء تفعيل اشتراك (${updated.email}) مباشرة في قاعدة البيانات`);
      }
    } catch (e: any) {
      showNotice(e.message || 'فشل إنهاء الاشتراك في السيرفر');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Delete user permanently from Cloudflare D1
  const handleDeleteUser = async (uid: string, email: string) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم (${email}) نهائياً من قاعدة بيانات Cloudflare D1؟`)) {
      setIsRefreshing(true);
      try {
        const ok = await deleteUserFromRegistry(uid, email);
        await refreshList();
        if (ok) {
          showNotice(`تم حذف المستخدم (${email}) نهائياً من قاعدة البيانات`);
        } else {
          showNotice(`تعذر حذف المستخدم (${email})`);
        }
      } catch (e: any) {
        showNotice(e.message || 'فشل حذف المستخدم');
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Change user role (إدارة مدرسة أو أستاذ) directly by Admin
  const handleSetUserRole = async (user: AppUser, newRole: 'admin_school' | 'teacher') => {
    if (user.userRole === newRole) return;
    setIsRefreshing(true);
    try {
      const updated = await updateUserRoleByAdmin(user.uid, user.email, newRole);
      if (updated) {
        await refreshList();
        showNotice(`تم تغيير صفة حساب (${user.email}) إلى «${newRole === 'admin_school' ? 'إدارة مدرسة' : 'أستاذ / معلم'}» وتثبيته في قاعدة البيانات`);
      }
    } catch (e: any) {
      showNotice(e.message || 'فشل تحديث نوع الحساب في السيرفر');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format date helper (بتوقيت العراق GMT+3)
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'غير محدد';
    return formatIraqDateTime(isoString);
  };

  // Format relative last active (بتوقيت العراق وبدون انزياح)
  const formatLastActive = (isoString?: string) => {
    if (!isoString) return 'غير مسجل';
    return formatRelativeIraq(isoString);
  };

  const getUser48hCountdown = (user: AppUser) => {
    if (user.isAdmin) {
      return { type: 'admin' as const, label: 'مشرف عام (دائم)', hours: 0, minutes: 0 };
    }
    if (user.subscriptionStatus === 'active') {
      const planLabel =
        user.subscriptionType === 'lifetime'
          ? 'دائم (مدى الحياة)'
          : user.subscriptionType === 'yearly'
          ? 'سنوي (365 يوماً)'
          : 'شهري (30 يوماً)';
      return { type: 'active' as const, label: `مشترك نشط - ${planLabel}`, hours: 0, minutes: 0 };
    }
    if (user.subscriptionStatus === 'cancelled') {
      return { type: 'cancelled' as const, label: 'ملغي من الإدارة', hours: 0, minutes: 0 };
    }

    const createdMs = parseSafeTimestamp(user.createdAt);
    const expiresMs = user.expiresAt ? parseSafeTimestamp(user.expiresAt) : (createdMs > 0 ? createdMs + TRIAL_DURATION_MS : 0);
    const diff = (expiresMs || (createdMs + TRIAL_DURATION_MS)) - nowTick;

    if (diff <= 0 || user.subscriptionStatus === 'expired') {
      return {
        type: 'exceeded' as const,
        label: 'تجاوز التجربة (غير مشترك)',
        hours: 0,
        minutes: 0,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const label =
      days > 0
        ? `متبقي ${days} يوم و ${hours} س`
        : hours > 0
        ? `متبقي ${hours} س و ${minutes} د`
        : `متبقي ${minutes} د و ${seconds} ث`;
    return {
      type: 'countdown' as const,
      label,
      hours,
      minutes,
    };
  };

  // Deduplicate users strictly by unique uid and unique email
  const deduplicatedUsers = useMemo<AppUser[]>(() => {
    const seenUids = new Set<string>();
    const seenEmails = new Set<string>();
    const list: AppUser[] = [];
    for (const u of users || []) {
      if (!u) continue;
      const uid = (u.uid || '').trim();
      const email = (u.email || '').trim().toLowerCase();
      if (uid && seenUids.has(uid)) continue;
      if (email && seenEmails.has(email)) continue;
      if (uid) seenUids.add(uid);
      if (email) seenEmails.add(email);
      list.push(u);
    }
    return list;
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo<AppUser[]>(() => {
    return deduplicatedUsers.filter((u: AppUser) => {
      if (!u) return false;
      const uEmail = (u.email || '').toLowerCase();
      const uName = (u.displayName || '').toLowerCase();
      const q = (searchQuery || '').trim().toLowerCase();

      const matchesSearch = !q || uEmail.includes(q) || uName.includes(q);
      if (!matchesSearch) return false;

      const c = getUser48hCountdown(u);
      if (filterType === 'active') return u.subscriptionStatus === 'active';
      if (filterType === 'admin_school') return u.userRole === 'admin_school';
      if (filterType === 'teacher') return u.userRole === 'teacher' || u.userRole !== 'admin_school';
      if (filterType === 'trial48') return c.type === 'countdown';
      if (filterType === 'exceeded48') return c.type === 'exceeded';
      if (filterType === 'cancelled') return u.subscriptionStatus === 'cancelled';
      return true;
    });
  }, [deduplicatedUsers, searchQuery, filterType, nowTick]);

  // Stats
  const totalCount = deduplicatedUsers.length;
  const activeCount = deduplicatedUsers.filter((u: AppUser) => u && u.subscriptionStatus === 'active').length;
  const adminSchoolCount = deduplicatedUsers.filter((u: AppUser) => u && u.userRole === 'admin_school').length;
  const teacherCount = deduplicatedUsers.filter((u: AppUser) => u && (u.userRole === 'teacher' || u.userRole !== 'admin_school')).length;
  const trial48Count = deduplicatedUsers.filter((u: AppUser) => u && !u.isAdmin && u.subscriptionStatus !== 'active' && getUser48hCountdown(u).type === 'countdown').length;
  const exceeded48Count = deduplicatedUsers.filter((u: AppUser) => u && !u.isAdmin && u.subscriptionStatus !== 'active' && getUser48hCountdown(u).type === 'exceeded').length;
  const cancelledCount = deduplicatedUsers.filter((u: AppUser) => u && u.subscriptionStatus === 'cancelled').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-right" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-[#2E485C] via-[#3F5E75] to-[#557A95] text-white p-6 rounded-3xl shadow-lg border border-[#2E485C]/20 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-amber-400 text-slate-900 rounded-lg shadow-xs">
              <Crown className="w-5 h-5 fill-current" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black">لوحة الإدارة والتحكم الشاملة</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-200">
            مرحباً بك {currentUser.displayName} • حساب الأدمن المسؤول: <code className="bg-black/20 px-2 py-0.5 rounded font-mono text-amber-200" dir="ltr">{currentUser.email}</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* SQL Database Schema Modal Trigger (Exclusively for Admins) */}
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1.5 text-white transition-colors cursor-pointer"
            title="عرض وتصدير مخطط قاعدة بيانات SQL (خاص بالأدمن للاستضافة)"
          >
            <Database className="w-3.5 h-3.5 text-emerald-300" />
            <span>مخطط قاعدة بيانات SQL</span>
          </button>

          <div className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-bold border border-white/15 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-amber-300" />
            <span>رقم التواصل والدعم:</span>
            <span className="font-mono dir-ltr text-amber-200" dir="ltr">{SUPPORT_PHONE_NUMBER}</span>
          </div>
          <button
            onClick={refreshList}
            disabled={isRefreshing}
            className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-50 rounded-xl transition-all text-white cursor-pointer"
            title="تحديث البيانات من السيرفر وقاعدة البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cloudflare D1 / Database Live Connection Status Card */}
      {syncResult && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex flex-wrap items-center justify-between gap-3 ${
            syncResult.source === 'cloudflare-d1'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${syncResult.source === 'cloudflare-d1' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <div>
              <p className="font-bold flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <span>
                  {syncResult.source === 'cloudflare-d1'
                    ? 'قاعدة بيانات السيرفر المركزية (Cloudflare D1): متصلة بنجاح'
                    : 'مصدر البيانات: الذاكرة المحلية للجهاز (IndexedDB / LocalStorage)'}
                </span>
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {syncResult.statusMessage || (syncResult.source === 'cloudflare-d1'
                  ? 'يتم جلب وعرض كل من يسجل في الموقع من أي موبايل أو كمبيوتر مباشرة لتفعيل أو إلغاء اشتراكه.'
                  : 'التسجيلات تظهر حالياً من هذا الجهاز. لربط جميع أجهزة المستخدمين سحابياً، تأكد من ربط D1 في لوحة Cloudflare Pages.')}
              </p>
            </div>
          </div>
          {syncResult.source !== 'cloudflare-d1' && (
            <div className="bg-amber-100/80 px-3 py-1.5 rounded-xl text-xs text-amber-800 border border-amber-300/60">
              💡 <strong>ملاحظة للمشرف:</strong> لظهور المسجلين من الهواتف الأخرى، تأكد من إضافة <code>DB</code> في إعدادات Cloudflare Pages &gt; Functions &gt; D1.
            </div>
          )}
        </div>
      )}

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-semibold mb-1">إجمالي المستخدمين</p>
          <p className="text-2xl font-black text-slate-800">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <p className="text-xs text-emerald-800 font-semibold mb-1">مشتركون نشطون (مفعلون)</p>
          <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-2xs">
          <p className="text-xs text-amber-900 font-semibold mb-1">قيد عداد التجربة (3 أيام)</p>
          <p className="text-2xl font-black text-amber-600">{trial48Count}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/40 shadow-2xs">
          <p className="text-xs text-red-800 font-semibold mb-1">تجاوزوا التجربة (غير مشتركين)</p>
          <p className="text-2xl font-black text-red-600">{exceeded48Count}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-600 font-semibold mb-1">حسابات ملغية</p>
          <p className="text-2xl font-black text-slate-700">{cancelledCount}</p>
        </div>
      </div>

      {/* Section 1: Manage Admins */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">إدارة مشرفي النظام (الأدمن)</h2>
            <p className="text-xs text-slate-500">
              يمكنك هنا إضافة مشرفين جدد عبر بريدهم الإلكتروني لمنحهم صلاحية إدارة المستخدمين والاشتراكات.
            </p>
          </div>
        </div>

        {/* Add Admin Form */}
        <form onSubmit={handleAddAdmin} className="flex flex-wrap sm:flex-nowrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="أدخل البريد الإلكتروني للمشرف الجديد (مثال: admin2@gmail.com)"
              dir="ltr"
              className="w-full px-3.5 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#557A95] focus:outline-none text-left"
            />
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#557A95] hover:bg-[#476A84] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة كأدمن</span>
          </button>
        </form>

        {adminSuccessMsg && (
          <p className="text-xs text-emerald-600 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
            {adminSuccessMsg}
          </p>
        )}
        {adminErrorMsg && (
          <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            {adminErrorMsg}
          </p>
        )}

        {/* Current Admins List */}
        <div className="pt-2">
          <p className="text-xs font-bold text-slate-600 mb-2">قائمة المشرفين المعتمدين:</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(admins.map((e) => e.trim().toLowerCase()))).map((email, idx) => {
              const isPrimary = email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
              return (
                <div
                  key={`${email}-${idx}`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                    isPrimary
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  {isPrimary ? (
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span className="font-mono dir-ltr" dir="ltr">{email}</span>
                  {isPrimary ? (
                    <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950 font-black">
                      الأدمن الأساسي
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRemoveAdmin(email)}
                      className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                      title="سحب الصلاحية"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Users Management & Subscriptions */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">سجل المستخدمين والتحكم بالاشتراكات</h2>
              <p className="text-xs text-slate-500">
                متابعة الحسابات التجريبية والفعلية، تاريخ آخر نشاط، وتعديل وتفعيل خطط الاشتراك.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Email Reactivation Banner - Ideal for WhatsApp requests */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-4 rounded-2xl border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 bg-emerald-600 text-white rounded-lg">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-xs sm:text-sm font-black text-slate-800">
              إعادة تفعيل واشتراك سريع عبر البريد (عند تواصل المعلم معك عبر واتساب):
            </h3>
          </div>
          <form onSubmit={handleQuickReactivate} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            <input
              type="email"
              value={quickEmail}
              onChange={(e) => setQuickEmail(e.target.value)}
              placeholder="أدخل بريد المعلم (مثال: teacher@gmail.com)"
              dir="ltr"
              className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
            />
            <select
              value={quickPlan}
              onChange={(e) => setQuickPlan(e.target.value as SubscriptionType)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="lifetime">مدى الحياة (دائم) - الافتراضي</option>
              <option value="monthly">شهري (30 يوماً)</option>
              <option value="yearly">سنوي (365 يوماً)</option>
            </select>
            <button
              type="submit"
              disabled={isRefreshing || !quickEmail.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>إعادة الاشتراك والتفعيل الآن 🔄</span>
            </button>
          </form>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالبريد الإلكتروني أو الاسم..."
              className="w-full px-3.5 py-2 pl-9 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#557A95]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#557A95] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              الكل ({users.length})
            </button>
            <button
              onClick={() => setFilterType('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === 'active'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              مشتركون نشطون ({activeCount})
            </button>
            <button
              onClick={() => setFilterType('admin_school')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'admin_school'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-white text-indigo-800 hover:bg-indigo-50 border border-indigo-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>إدارة مدرسة ({adminSchoolCount})</span>
            </button>
            <button
              onClick={() => setFilterType('teacher')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'teacher'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
              <span>أستاذ / معلم ({teacherCount})</span>
            </button>
            <button
              onClick={() => setFilterType('trial48')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'trial48'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-300'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-600" />
              <span>قيد عداد التجربة ({trial48Count})</span>
            </button>
            <button
              onClick={() => setFilterType('exceeded48')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'exceeded48'
                  ? 'bg-red-700 text-white'
                  : 'bg-white text-red-800 hover:bg-red-50 border border-red-300'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span>تجاوزوا التجربة ({exceeded48Count})</span>
            </button>
            <button
              onClick={() => setFilterType('cancelled')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'cancelled'
                  ? 'bg-rose-800 text-white'
                  : 'bg-white text-rose-900 hover:bg-rose-50 border border-rose-300'
              }`}
            >
              <UserX className="w-3 h-3 text-rose-500" />
              <span>ملغي ({cancelledCount})</span>
            </button>
          </div>
        </div>

        {/* Users Table / List */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">لا يوجد مستخدمون مطابقون لمعايير البحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">المستخدم</th>
                  <th className="py-3 px-3">نوع الحساب</th>
                  <th className="py-3 px-3">الاشتراك وعداد الفترة التجريبية</th>
                  <th className="py-3 px-3">
                    <span>تاريخ آخر عملية</span>
                    <span className="block text-[10px] text-slate-500 font-normal">توقيت العراق (GMT+3)</span>
                  </th>
                  <th className="py-3 px-3">
                    <span>تاريخ التسجيل</span>
                    <span className="block text-[10px] text-slate-500 font-normal">توقيت العراق (GMT+3)</span>
                  </th>
                  <th className="py-3 px-3 text-center">أزرار إعادة الاشتراك والتفعيل (للأدمن)</th>
                  <th className="py-3 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user, idx) => {
                  const userEmail = (user.email || '').trim();
                  const isPrimary = userEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                  const countdown = getUser48hCountdown(user);
                  const rowKey = user.uid ? `${user.uid}-${idx}` : `user-${userEmail || idx}`;

                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/80 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {user.displayName || userEmail || 'مستخدم بدون اسم'}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dir-ltr text-right" dir="ltr">
                          {userEmail}
                        </div>
                        {user.isAdmin && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200 mt-0.5">
                            <Crown className="w-2.5 h-2.5" /> مشرف (أدمن)
                          </span>
                        )}
                      </td>

                      {/* Account Type (إدارة أو أستاذ) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleSetUserRole(user, 'admin_school')}
                              title="تعيين الحساب بصِفة: إدارة مدرسة"
                              disabled={isRefreshing}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                user.userRole === 'admin_school'
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-indigo-700 hover:bg-white/70'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>إدارة مدرسة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetUserRole(user, 'teacher')}
                              title="تعيين الحساب بصِفة: أستاذ / معلم"
                              disabled={isRefreshing}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                user.userRole === 'teacher' || user.userRole !== 'admin_school'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white/70'
                              }`}
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>أستاذ / معلم</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Current Subscription Status & Trial Countdown */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {countdown.type === 'active' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{countdown.label}</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              بدون عداد • مفعل دائم ويعمل أوفلاين
                            </span>
                          </div>
                        ) : countdown.type === 'countdown' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>عداد التجربة: {countdown.label}</span>
                            </span>
                            <span className="text-[10px] text-amber-800 font-medium">
                              فترة تجريبية مجانية (48 ساعة)
                            </span>
                          </div>
                        ) : countdown.type === 'exceeded' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                              <span>تجاوز الـ 48 ساعة (غير مشترك)</span>
                            </span>
                            <span className="text-[10px] text-rose-600 font-semibold">
                              محظور بشاشة طلب إعادة الاشتراك
                            </span>
                          </div>
                        ) : countdown.type === 'cancelled' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs">
                              <UserX className="w-3.5 h-3.5 text-rose-600" />
                              <span>ملغي من الإدارة</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              محظور من الاستخدام
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <Crown className="w-3.5 h-3.5 text-amber-600" />
                            <span>مشرف عام (دائم)</span>
                          </span>
                        )}
                      </td>

                      {/* Last Active Time */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatLastActive(user.lastActiveAt)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDate(user.lastActiveAt)}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Subscription Control & Reactivation Buttons */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          {/* زر إعادة الاشتراك والتفعيل الأساسي المطلوب - افتراضياً مدى الحياة */}
                          <button
                            onClick={() => handleReactivateSubscription(user.uid, user.email, 'lifetime')}
                            disabled={isRefreshing}
                            className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer ${
                              user.subscriptionStatus === 'cancelled' || user.subscriptionStatus === 'expired'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 shadow-sm'
                                : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                            title="إعادة تفعيل واشتراك المستخدم فوراً مدى الحياة (دائم)"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>تفعيل مدى الحياة</span>
                          </button>

                          {/* Monthly Extension Button */}
                          <button
                            onClick={() => handleSetSubscription(user.uid, 'monthly')}
                            className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-0.5 shadow-2xs"
                            title="تمديد اشتراك شهري (30 يوماً)"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>شهري</span>
                          </button>

                          {/* Yearly Button */}
                          <button
                            onClick={() => handleSetSubscription(user.uid, 'yearly')}
                            className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-0.5 shadow-2xs"
                            title="تفعيل أو تمديد اشتراك سنوي (365 يوماً)"
                          >
                            <Clock className="w-3 h-3" />
                            <span>سنوي</span>
                          </button>

                          {/* Lifetime Button */}
                          <button
                            onClick={() => handleSetSubscription(user.uid, 'lifetime')}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-0.5 shadow-2xs"
                            title="تفعيل اشتراك دائم مدى الحياة بدون انتهاء"
                          >
                            <InfinityIcon className="w-3 h-3 text-amber-600" />
                            <span>مدى الحياة</span>
                          </button>

                          {/* زر إلغاء الحساب (Cancel / Block Account) */}
                          <button
                            onClick={() => handleCancelUser(user.uid, user.email)}
                            disabled={isRefreshing}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                            title="إلغاء تفعيل حساب هذا المستخدم وحظره من الاستخدام"
                          >
                            <UserX className="w-3 h-3 text-rose-600" />
                            <span>إلغاء الحساب</span>
                          </button>
                        </div>
                      </td>

                      {/* Delete Action */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {!isPrimary && (
                          <button
                            onClick={() => handleDeleteUser(user.uid, user.email)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف هذا المستخدم وسجلاته"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SQL Database Schema Modal for Admins */}
      <SqlDatabaseModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
    </div>
  );
};
