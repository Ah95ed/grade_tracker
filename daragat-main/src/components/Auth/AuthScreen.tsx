import React, { useEffect, useState } from 'react';
import { AppLogo } from '../common/AppLogo';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  DownloadCloud,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../Common/PWAInstallModal';
import {
  AppUser,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  resendVerificationEmail,
  sendPasswordResetLink,
  SUPPORT_PHONE_NUMBER,
} from '../../utils/auth';

interface Props {
  onLoginSuccess: (user: AppUser, isTrial: boolean) => void;
  expiredNotice?: boolean;
  onOpenPrivacy?: () => void;
  onAccountCancelled?: (email: string, message?: string) => void;
}

export const AuthScreen: React.FC<Props> = ({
  onLoginSuccess,
  expiredNotice,
  onOpenPrivacy,
  onAccountCancelled,
}) => {
  const [activeMode, setActiveMode] = useState<'login' | 'register' | 'forgot-password'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // تفعيل البريد الإلكتروني: شاشة "تحقق من بريدك" + نتيجة الضغط على رابط التفعيل (?verified=...)
  const [pendingVerification, setPendingVerification] = useState<{ email: string; emailSent: boolean } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [verifyResult] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('verified');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!verifyResult) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('verified');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
    } catch {}
  }, [verifyResult]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!pendingVerification || resendCooldown > 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    setResendInfo(null);
    try {
      await resendVerificationEmail(pendingVerification.email);
      setResendInfo('تمت إعادة إرسال رسالة التفعيل. راجع صندوق الوارد ومجلد الرسائل غير المرغوب فيها (Spam).');
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر إعادة إرسال رسالة التفعيل.');
    } finally {
      setIsLoading(false);
    }
  };

  // PWA Install State for First-Time or Web Visitors
  const { isInstalled, installApp, hasNativePrompt } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleInstallClick = async () => {
    const outcome = await installApp();
    if (outcome === 'ios' || outcome === 'manual' || !hasNativePrompt) {
      setShowInstallModal(true);
    }
  };

  // Password reset handler
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('يرجى كتابة البريد الإلكتروني لإرسال رابط إعادة التعيين.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setResetSuccessMessage(null);
    try {
      await sendPasswordResetLink(email);
      setResetSuccessMessage('تم إرسال رابط إعادة تعيين الرقم السري إلى بريدك الإلكتروني بنجاح! يرجى مراجعة صندوق الوارد (ومجلد الرسائل غير المرغوب فيها Spam).');
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر إرسال الرابط.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email + Password Auth
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let user: AppUser;
      if (activeMode === 'register') {
        user = await registerWithEmail(email, password, displayName);
      } else {
        user = await loginWithEmail(email, password);
      }
      onLoginSuccess(user, false);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.startsWith('EMAIL_NOT_VERIFIED:')) {
        const parts = msg.split(':');
        const pendingEmail = (parts[1] || email).trim().toLowerCase();
        setPendingVerification({ email: pendingEmail, emailSent: parts[2] !== '0' });
        setPassword('');
        setResendInfo(null);
        setResendCooldown(parts[2] !== '0' ? 60 : 0);
        return;
      }
      if (msg.startsWith('CANCELLED_ACCOUNT:')) {
        const cancelledEmail = msg.replace('CANCELLED_ACCOUNT:', '').trim() || (email || '').trim().toLowerCase();
        if (onAccountCancelled) {
          onAccountCancelled(cancelledEmail, 'تم إلغاء حسابك من قِبل إدارة النظام.');
          return;
        }
      }
      setErrorMessage(err.message || 'فشل تسجيل الدخول، يرجى التحقق من البيانات.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await loginWithGoogle();
      onLoginSuccess(user, false);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.startsWith('CANCELLED_ACCOUNT:')) {
        const cancelledEmail = msg.replace('CANCELLED_ACCOUNT:', '').trim();
        if (onAccountCancelled) {
          onAccountCancelled(cancelledEmail, 'تم إلغاء حسابك من قِبل إدارة النظام.');
          return;
        }
      }
      setErrorMessage(err.message || 'تعذر تسجيل الدخول بحساب Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EFEA] flex flex-col justify-center items-center p-4 sm:p-6 text-right selection:bg-[#557A95] selection:text-white" dir="rtl">
      {/* Background Subtle Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#557A95]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#487B5D]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-[#E8E4DA] p-6 sm:p-8 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* App Logo & Header */}
        <div className="text-center space-y-2 mb-5">
          <div className="flex justify-center">
            <AppLogo className="w-20 h-20 sm:w-22 sm:h-22 drop-shadow-md hover:scale-105 transition-transform duration-200" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#2E2B27] tracking-tight">
            دفتر رصد الدرجات
          </h1>
          <p className="text-xs sm:text-sm text-[#7A746B] font-semibold max-w-sm mx-auto leading-relaxed">
            المنصة الذكية لرصد الدرجات الشهرية، احتساب الفصول، وإصدار بطاقات النتائج المعتمدة لأساتذة الجامعات والمدرسين والمعلمين
          </p>

          {/* 3 Days Free Trial Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-900 shadow-2xs mt-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>تسجيل الدخول الفعلي مجاني بالكامل لمدة 3 أيام</span>
          </div>
        </div>

        {/* Expired Notice Banner (if previous subscription or trial expired) */}
        {expiredNotice && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">انتهت فترة الاستخدام التجريبي المجانية (3 أيام)</p>
              <p className="text-amber-700 text-[11px] mt-0.5">
                يرجى التواصل مع إدارة النظام عبر واتساب على الرقم {SUPPORT_PHONE_NUMBER} لتفعيل الاشتراك والمتابعة.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in shake duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-bold leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Reset Password Success Alert */}
        {resetSuccessMessage && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-bold leading-relaxed">{resetSuccessMessage}</span>
          </div>
        )}

        {/* نتيجة الضغط على رابط التفعيل */}
        {verifyResult === '1' && !pendingVerification && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-bold leading-relaxed">تم تفعيل حسابك بنجاح! يمكنك الآن تسجيل الدخول.</span>
          </div>
        )}
        {verifyResult && verifyResult !== '1' && !pendingVerification && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-bold leading-relaxed">
              {verifyResult === 'expired'
                ? 'انتهت صلاحية رابط التفعيل. سجّل الدخول ببريدك وكلمة المرور ثم اضغط على إعادة إرسال رسالة التفعيل.'
                : 'رابط التفعيل غير صالح أو مستخدم سابقاً. إذا فعّلت حسابك من قبل فسجّل الدخول مباشرة.'}
            </span>
          </div>
        )}

        {/* Prominent App Download / PWA Installation Button (تحميل البرنامج / حفظ التطبيق على الشاشة) */}
        {!isInstalled && (
          <div className="mb-5 animate-in fade-in slide-in-from-top-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full p-3.5 bg-gradient-to-r from-[#EFF6FA] via-[#F8FAFC] to-[#EEF4F8] hover:from-[#E4EFF7] hover:to-[#E8EFF6] border-2 border-[#557A95]/40 hover:border-[#557A95] rounded-2xl text-right transition-all group shadow-2xs hover:shadow-md flex items-center justify-between cursor-pointer"
              title="حفظ التطبيق على الشاشة (تثبيت) - أيقونة الشاشة"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#557A95] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <DownloadCloud className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-[#1E3A5F]">تحميل البرنامج</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      أيقونة الشاشة
                    </span>
                  </div>
                  <p className="text-xs text-[#556980] font-semibold mt-0.5">
                    حفظ التطبيق على الشاشة (تثبيت) للتشغيل السريع وبدون إنترنت
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-[#557A95] shrink-0 bg-white px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] shadow-2xs group-hover:bg-[#557A95] group-hover:text-white transition-colors">
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">تثبيت الآن</span>
              </div>
            </button>
          </div>
        )}

        {pendingVerification ? (
          /* شاشة: تحقق من بريدك لتفعيل الحساب */
          <div className="space-y-4 animate-in fade-in text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#EFF6FA] border-2 border-[#557A95]/30 flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#557A95]" />
              </div>
            </div>
            <h2 className="text-lg font-black text-[#2E2B27]">فعّل حسابك عبر البريد الإلكتروني</h2>
            <p className="text-xs sm:text-sm text-[#7A746B] leading-relaxed">
              {pendingVerification.emailSent
                ? 'أرسلنا رسالة تفعيل إلى'
                : 'تم إنشاء حسابك، لكن تعذر إرسال رسالة التفعيل إلى'}
              <span className="block font-black text-[#2E2B27] mt-1" dir="ltr">{pendingVerification.email}</span>
            </p>
            <p className="text-[11px] text-[#9A9388] leading-relaxed">
              افتح الرسالة واضغط على زر «تفعيل الحساب» ثم عد إلى هنا وسجّل الدخول. إن لم تجدها فتفقد مجلد الرسائل غير المرغوب فيها (Spam).
            </p>

            {resendInfo && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-xs text-emerald-900 text-right">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-bold leading-relaxed">{resendInfo}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isLoading || resendCooldown > 0}
              className="w-full py-3 px-4 bg-[#557A95] hover:bg-[#476A84] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>
                {isLoading
                  ? 'جاري الإرسال...'
                  : resendCooldown > 0
                  ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                  : 'إعادة إرسال رسالة التفعيل'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPendingVerification(null);
                setActiveMode('login');
                setErrorMessage(null);
                setResendInfo(null);
              }}
              className="text-xs font-bold text-[#557A95] hover:underline flex items-center gap-1 mx-auto cursor-pointer"
            >
              <span>فعّلت حسابي، العودة لتسجيل الدخول</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : activeMode === 'forgot-password' ? (
          /* Forgot Password View */
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DA]">
              <h2 className="text-base font-bold text-[#2E2B27]">استعادة الرقم السري</h2>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('login');
                  setErrorMessage(null);
                  setResetSuccessMessage(null);
                }}
                className="text-xs font-bold text-[#557A95] hover:underline flex items-center gap-1"
              >
                <span>العودة لتسجيل الدخول</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-[#7A746B] leading-relaxed">
              أدخل بريدك الإلكتروني المسجل، وسيقوم النظام بإرسال رسالة بريد إلكتروني تحتوي على رابط آمن لإعادة تعيين الرقم السري فوراً.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#4A463F] mb-1">
                  البريد الإلكتروني المسجل
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 pl-10 bg-[#FAF8F5] border border-[#D5CFC4] rounded-xl text-sm font-semibold text-[#2E2B27] focus:bg-white focus:ring-2 focus:ring-[#557A95] focus:outline-none text-left"
                  />
                  <Mail className="w-4 h-4 text-[#7A746B] absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#557A95] hover:bg-[#476A84] active:scale-99 text-white rounded-xl text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>جاري إرسال الرابط...</span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>إرسال رابط إعادة تعيين الرقم السري</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Email & Google Auth View */
          <div className="space-y-4">
            {/* Mode Tabs: Login vs Register */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('login');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeMode === 'login'
                    ? 'bg-white text-[#2E485C] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('register');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeMode === 'register'
                    ? 'bg-white text-[#2E485C] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>إنشاء حساب جديد</span>
              </button>
            </div>

            {/* Google Sign In option prominently */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-2xl text-xs sm:text-sm font-black text-slate-800 transition-all flex items-center justify-center gap-2.5 shadow-2xs hover:shadow-xs active:scale-98 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>تسجيل الدخول السريع عبر Google</span>
            </button>

            {/* Separator */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8E4DA]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2.5 text-[#9A9388] font-bold">
                  أو بالبريد الإلكتروني وكلمة المرور
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {activeMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-[#4A463F] mb-1">
                    اسم المعلم / الأستاذ
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="مثال: أ. أحمد الهاشمي"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D5CFC4] rounded-xl text-sm font-semibold text-[#2E2B27] focus:bg-white focus:ring-2 focus:ring-[#557A95] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#4A463F] mb-1">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 pl-10 bg-[#FAF8F5] border border-[#D5CFC4] rounded-xl text-sm font-semibold text-[#2E2B27] focus:bg-white focus:ring-2 focus:ring-[#557A95] focus:outline-none text-left"
                  />
                  <Mail className="w-4 h-4 text-[#7A746B] absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#4A463F]">
                    الرقم السري / كلمة المرور
                  </label>
                  {activeMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setActiveMode('forgot-password')}
                      className="text-[11px] font-bold text-[#557A95] hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 pl-10 bg-[#FAF8F5] border border-[#D5CFC4] rounded-xl text-sm font-semibold text-[#2E2B27] focus:bg-white focus:ring-2 focus:ring-[#557A95] focus:outline-none text-left"
                  />
                  <Lock className="w-4 h-4 text-[#7A746B] absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#557A95] hover:bg-[#476A84] active:scale-99 text-white rounded-xl text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>جاري تسجيل الدخول...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{activeMode === 'login' ? 'دخول إلى حسابي' : 'إتمام إنشاء الحساب'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Safe & Secure note */}
            <div className="pt-2 text-center flex flex-col items-center gap-1.5">
              <p className="text-[11px] text-[#9A9388] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3E7D59]" />
                <span>حفظ تلقائي في IndexedDB بدون إنترنت وحماية لبيانات الطلاب</span>
              </p>
              {onOpenPrivacy && (
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="text-xs text-[#557A95] hover:text-[#38556b] font-bold hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>عرض سياسة الخصوصية وسرية البيانات</span>
                  <ArrowRight className="w-3 h-3 rotate-180" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer below Auth Card */}
      <footer className="mt-6 text-center text-xs text-[#7A746B] relative z-10 flex flex-col items-center gap-2 max-w-lg w-full px-2">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onOpenPrivacy && (
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-emerald-800 font-bold text-xs border border-[#E8E4DA] transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>سياسة الخصوصية وسرية البيانات</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-[#9A9388]">
          <span>رابط الصفحة المباشر:</span>
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenPrivacy) onOpenPrivacy();
            }}
            className="font-mono text-[#557A95] hover:underline"
            dir="ltr"
          >
            https://daragato.online/privacy
          </a>
        </div>
      </footer>

      {/* PWA Installation Modal */}
      <PWAInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
};
