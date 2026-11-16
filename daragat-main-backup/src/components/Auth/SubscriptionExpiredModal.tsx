import React, { useState, useEffect } from 'react';
import {
  Lock,
  PhoneCall,
  MessageCircle,
  Sparkles,
  Infinity as InfinityIcon,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Crown,
  X,
  RefreshCw,
  AlertTriangle,
  Laptop,
  Smartphone,
} from 'lucide-react';
import {
  AppUser,
  SUPPORT_PHONE_NUMBER,
  SUPPORT_WHATSAPP_NUMBER,
  checkLiveSubscription,
  isSubscriptionExpired,
} from '../../utils/auth';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  user: AppUser;
  onLogout: () => void;
  canDismiss?: boolean;
  onSubscriptionActivated?: (updatedUser: AppUser) => void;
}

export const SubscriptionExpiredModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  canDismiss = false,
  onSubscriptionActivated,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatusMsg, setCheckStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [isMobileDevice, setIsMobileDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth <= 768
    );
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  // The account is locked if subscription expired, or if pending after 1 day grace period
  const isExpired = !canDismiss || isSubscriptionExpired(user) || user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'pending';

  const handleCheckActivation = async () => {
    setIsChecking(true);
    setCheckStatusMsg(null);

    try {
      const res = await checkLiveSubscription(user);
      if (res.active && res.updatedUser) {
        setCheckStatusMsg({
          type: 'success',
          text: 'تم تفعيل الحساب بنجاح! تم التحقق من تفعيل اشتراكك في قاعدة البيانات.',
        });
        setTimeout(() => {
          onSubscriptionActivated?.(res.updatedUser!);
          if (onClose) onClose();
        }, 1200);
      } else {
        setCheckStatusMsg({
          type: 'error',
          text: 'لم يتم تفعيل الحساب بعد من قِبل الإدارة في قاعدة البيانات. يرجى التواصل عبر الواتساب لتأكيد الدفع والتفعيل الفوري.',
        });
      }
    } catch {
      setCheckStatusMsg({
        type: 'error',
        text: 'تعذر الاتصال بقاعدة البيانات السحابية. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى.',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `السلام عليكم، أود تفعيل حسابي في نظام دفتر درجات المعلم.\nالاسم: ${user.displayName || 'معلم'}\nالبريد الإلكتروني: ${user.email}\nرقم المعرف: ${user.uid}\nنوع الحساب: حساب معلم (مطلوب تفعيل الاشتراك)`
  );

  const whatsappPhone = SUPPORT_WHATSAPP_NUMBER || '9647706118982';
  // روابط مخصصة ذكية: تطبيق واتساب للموبايل، وواتساب ويب للكمبيوتر
  const mobileWhatsappAppUrl = `whatsapp://send?phone=${whatsappPhone}&text=${whatsappMessage}`;
  const webWhatsappUrl = `https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${whatsappMessage}`;
  const universalWhatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${whatsappMessage}`;
  const phoneUrl = `tel:${SUPPORT_PHONE_NUMBER}`;

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    if (isMobileDevice) {
      e.preventDefault();
      // محاولة فتح تطبيق الواتساب مباشرة على الموبايل
      window.location.href = mobileWhatsappAppUrl;
      setTimeout(() => {
        window.open(universalWhatsappUrl, '_blank');
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200 text-right" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        {/* Header Banner */}
        <div
          className={`p-6 text-center relative text-white ${
            isExpired && !canDismiss
              ? 'bg-gradient-to-l from-rose-600 via-rose-700 to-rose-800'
              : 'bg-gradient-to-l from-[#2E485C] via-[#3F5E75] to-[#557A95]'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-md">
            {isExpired && !canDismiss ? (
              <Lock className="w-8 h-8 text-rose-100" />
            ) : (
              <Crown className="w-8 h-8 text-amber-300" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {isExpired && !canDismiss ? 'يلزم تفعيل الاشتراك للمتابعة' : 'تفاصيل الاشتراك في النظام'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-100 mt-1 max-w-xs mx-auto leading-relaxed">
            {isExpired && !canDismiss
              ? `انتهت الفترة التجريبية المجانية (3 أيام) لحسابك (${user.email}). يرجى تفعيل اشتراكك لمتابعة استخدام البرنامج.`
              : `خطة الاشتراك الرسمية المعتمدة لدفتر رصد الدرجات (${user.email})`}
          </p>

          {canDismiss && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Single Lifetime Plan Card */}
          <div className="relative p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-amber-100/50 to-orange-50 border-2 border-amber-400 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                  <InfinityIcon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-950">
                    اشتراك مدى الحياة
                  </h3>
                  <p className="text-[11px] text-amber-800 font-semibold">
                    تفعيل دائم لمرة واحدة وبدون أي تجديد شهري أو سنوي
                  </p>
                </div>
              </div>

              {/* Price Tag */}
              <div className="text-left shrink-0 bg-white px-3.5 py-1.5 rounded-xl border border-amber-300 shadow-2xs">
                <span className="text-xl sm:text-2xl font-black text-[#2E485C] font-mono">
                  10,000
                </span>
                <span className="text-xs font-bold text-amber-900 mr-1">
                  دينار
                </span>
              </div>
            </div>

            {/* Plan Features */}
            <div className="pt-3 border-t border-amber-200/80 space-y-2 text-xs text-amber-950 font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>دفعة واحدة فقط مدى الحياة (لا توجد أي رسوم إضافية).</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>رصد وحفظ غير محدود لسجلات ودرجات جميع الطلاب والشعب.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>يعمل أونلاين وبدون إنترنت على الهاتف والكمبيوتر (PWA & IndexedDB).</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تصدير تقارير وكروت الدرجات وشهادات التقدير للطباعة أو PDF.</span>
              </div>
            </div>
          </div>

          {/* Check Activation Status Button (كما طلب المستخدم: فحص التفعيل من قاعدة البيانات السحابية والمحلية) */}
          <div className="p-4 bg-emerald-50/80 rounded-2xl border-2 border-emerald-300/80 text-center space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-emerald-950 font-black text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>هل قام الأدمن بتفعيل حسابك؟</span>
            </div>
            <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed">
              اضغط على الزر أدناه لمزامنة حسابك مع قاعدة البيانات وفك القفل فوراً:
            </p>
            <button
              type="button"
              onClick={handleCheckActivation}
              disabled={isChecking}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-60 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'جارٍ فحص قاعدة البيانات السحابية...' : 'تأكد من تفعيل الحساب الآن'}</span>
            </button>

            {checkStatusMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150 text-right ${
                  checkStatusMsg.type === 'success'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {checkStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="leading-tight flex-1">{checkStatusMsg.text}</span>
              </div>
            )}
          </div>

          {/* Official Activation & Contact Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1.5 text-slate-800 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-[#557A95]" />
              <span>لتفعيل اشتراكك الفوري، تواصل معنا عبر الرقم المباشر:</span>
            </div>

            <div className="py-1">
              <span className="text-2xl font-black font-mono text-[#2E485C] tracking-widest inline-block bg-white px-4 py-1 rounded-xl border border-slate-300 shadow-2xs" dir="ltr">
                {SUPPORT_PHONE_NUMBER}
              </span>
            </div>

            {/* Contact Action Buttons (Mobile WhatsApp App vs Desktop WhatsApp Web) */}
            <div className="space-y-2 mt-3">
              {isMobileDevice ? (
                <a
                  href={mobileWhatsappAppUrl}
                  onClick={handleWhatsAppClick}
                  className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 shadow-md shadow-emerald-600/20 transition-transform active:scale-98 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  <Smartphone className="w-4 h-4 opacity-80" />
                  <span>فتح محادثة في تطبيق واتساب الموبايل</span>
                </a>
              ) : (
                <a
                  href={webWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 shadow-md shadow-emerald-600/20 transition-transform active:scale-98 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  <Laptop className="w-4 h-4 opacity-80" />
                  <span>فتح في واتساب ويب (WhatsApp Web للكمبيوتر)</span>
                </a>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* رابط بديل مباشر في حال لم يفتح التطبيق */}
                <a
                  href={universalWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>رابط واتساب بديل (wa.me)</span>
                </a>

                <a
                  href={phoneUrl}
                  className="py-2.5 px-3 bg-[#557A95] hover:bg-[#476A84] text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>اتصال هاتفي مباشر</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
            <button
              onClick={onLogout}
              className="px-3.5 py-2 text-rose-700 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج والتبديل</span>
            </button>

            {canDismiss && onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
