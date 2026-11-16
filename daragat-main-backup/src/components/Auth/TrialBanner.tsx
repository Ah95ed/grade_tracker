import React, { useState, useEffect } from 'react';
import { Clock, MessageCircle, LogOut, Sparkles, ExternalLink } from 'lucide-react';
import {
  AppUser,
  getTrialRemainingTime,
  SUPPORT_PHONE_NUMBER,
  SUPPORT_WHATSAPP_NUMBER,
} from '../../utils/auth';

interface Props {
  user: AppUser;
  onLogout: () => void;
  onExpire: () => void;
  onOpenSubscriptionModal?: () => void;
}

export const TrialBanner: React.FC<Props> = ({
  user,
  onLogout,
  onExpire,
  onOpenSubscriptionModal,
}) => {
  const [remaining, setRemaining] = useState(() => getTrialRemainingTime(user));

  useEffect(() => {
    // Check remaining time every second for live countdown
    const checkTime = () => {
      const updated = getTrialRemainingTime(user);
      setRemaining(updated);
      if (updated.expired) {
        onExpire();
      }
    };

    checkTime();
    const timer = setInterval(checkTime, 1000);
    return () => clearInterval(timer);
  }, [user, onExpire]);

  // If user is Admin or has already been activated by admin (active status), hide the banner completely!
  if (user.isAdmin || user.subscriptionStatus === 'active' || user.subscriptionType === 'lifetime') {
    return null;
  }

  const adminPhone = SUPPORT_PHONE_NUMBER || '07706118982';
  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER || '9647706118982'}?text=${encodeURIComponent(
    `السلام عليكم، أود تفعيل واشتراك حسابي في نظام دفتر درجات المعلم.\nالاسم: ${user.displayName || 'معلم'}\nالبريد: ${user.email}\nرقم المعرف: ${user.uid}\nرقم الأدمن للتواصل: ${adminPhone}`
  )}`;

  const handleSubscribeClick = () => {
    // Open the subscription modal (page from dropdown) as requested by user
    if (onOpenSubscriptionModal) {
      onOpenSubscriptionModal();
    }
  };

  return (
    <aside
      aria-label="عداد الفترة المجانية للمستخدم والتواصل عبر واتساب"
      className="bg-gradient-to-r from-[#1B365D] via-[#24477A] to-[#1E3A5F] text-white px-3 sm:px-4 py-2 text-xs font-bold shadow-md border-b-2 border-amber-400 no-print transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Countdown timer section */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="p-1.5 bg-amber-400 text-slate-900 rounded-lg shadow-xs animate-pulse">
            <Clock className="w-4 h-4" />
          </span>

          <span className="text-amber-200 font-black">
            فترة تجريبية مجانية (3 أيام):
          </span>

          {/* Countdown Clock Box */}
          <div className="flex items-center gap-1.5 bg-white text-slate-900 px-2.5 py-1 rounded-lg font-black text-xs sm:text-sm shadow-xs border border-amber-300">
            {remaining.days > 0 && (
              <>
                <span className="font-mono text-amber-700">
                  {remaining.days}
                </span>
                <span className="text-[11px] text-slate-600">يوم و</span>
              </>
            )}
            {remaining.hours > 0 && (
              <>
                <span className="font-mono text-amber-700">
                  {remaining.hours}
                </span>
                <span className="text-[11px] text-slate-600">ساعة و</span>
              </>
            )}
            <span className="font-mono text-amber-700">
              {String(remaining.minutes).padStart(2, '0')}
            </span>
            <span className="text-[11px] text-slate-600">د و</span>
            <span className="font-mono text-amber-700">
              {String(remaining.seconds).padStart(2, '0')}
            </span>
            <span className="text-[11px] text-slate-600">ثانية</span>
            <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">تنازلياً</span>
          </div>

          <span className="text-slate-300 text-[11px] font-normal hidden lg:inline">
            (محفوظة محلياً وتعد حتى بدون إنترنت)
          </span>
        </div>

        {/* WhatsApp & Admin Phone Contact Cluster */}
        <div className="flex items-center gap-2 mr-auto flex-wrap">
          {/* Admin phone number clearly visible */}
          <div className="hidden md:flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 text-[11px]">
            <span className="text-slate-200">رقم الأدمن:</span>
            <a
              href={`tel:${adminPhone}`}
              className="font-mono font-black text-amber-300 hover:underline dir-ltr"
              dir="ltr"
            >
              {adminPhone}
            </a>
          </div>

          {/* Button to open subscription modal (صفحة الاشتراك الموجودة في القائمة المنسدلة) */}
          <button
            type="button"
            onClick={handleSubscribeClick}
            className="px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="عرض تفاصيل الاشتراك والتفعيل مدى الحياة"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>طلب الاشتراك بالبرنامج</span>
          </button>

          {/* Direct WhatsApp button with clear admin phone 07706118982 */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-[#25D366] hover:bg-[#20BD5A] active:scale-95 text-white font-black text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title={`مراسلة الأدمن عبر واتساب على الرقم ${adminPhone}`}
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">واتساب:</span>
            <span className="font-mono dir-ltr" dir="ltr">{adminPhone}</span>
          </a>

          {/* Logout button */}
          <button
            type="button"
            onClick={onLogout}
            className="p-1 sm:px-2 sm:py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 text-slate-200 hover:text-white"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
