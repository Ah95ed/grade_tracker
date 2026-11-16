import React, { useState } from 'react';
import { UserX, MessageCircle, Phone, LogOut, RefreshCw, CheckCircle2 } from 'lucide-react';
import { SUPPORT_PHONE_NUMBER, SUPPORT_WHATSAPP_NUMBER } from '../../utils/auth';

interface Props {
  isOpen: boolean;
  message?: string;
  onLogout?: () => void;
  onSwitchAccount?: () => void;
  onRecheck?: () => Promise<void> | void;
  userEmail?: string;
}

export const AccountCancelledModal: React.FC<Props> = ({
  isOpen,
  message = 'تم إلغاء حسابك من قِبل إدارة النظام.',
  onLogout,
  onSwitchAccount,
  onRecheck,
  userEmail,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const displayPhone = SUPPORT_PHONE_NUMBER || '07706118982';
  const whatsappNumber = SUPPORT_WHATSAPP_NUMBER || '9647706118982';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `مرحباً إدارة التطبيق، تم انتهاء/إلغاء حسابي (${userEmail || ''}) وأود التواصل معكم لإعادة الاشتراك وتفعيل الحساب.`
  )}`;

  const handleRecheckClick = async () => {
    if (!onRecheck) return;
    setIsChecking(true);
    setCheckStatus(null);
    try {
      await onRecheck();
    } catch (e: any) {
      setCheckStatus(e.message || 'ما زال الحساب غير مفعل من قِبل الإدارة.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-rose-300 w-full max-w-lg p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200" dir="rtl">
        {/* Cancelled Icon Badge */}
        <div className="w-18 h-18 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <UserX className="w-9 h-9 text-rose-600" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            تم إلغاء تفعيل حسابك
          </h2>
          <p className="text-xs sm:text-sm text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-bold leading-relaxed">
            {message}
          </p>
          <p className="text-xs text-slate-600 font-semibold leading-relaxed pt-1">
            لإعادة تفعيل واشتراك حسابك ومواصلة استخدام التطبيق، يرجى التواصل مع إدارة النظام عبر واتساب أو الاتصال المباشر على الرقم:
          </p>
          <div className="inline-block py-1.5 px-4 bg-slate-100 rounded-xl border border-slate-300 font-mono text-base sm:text-lg font-black text-slate-900 tracking-wider dir-ltr" dir="ltr">
            {displayPhone}
          </div>
        </div>

        {userEmail && (
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium truncate">
            البريد المرتبط بالحساب: <strong className="text-slate-900 font-mono dir-ltr">{userEmail}</strong>
          </div>
        )}

        {/* Direct Contact Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-98 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>مراسلة الأدمن عبر واتساب ({displayPhone})</span>
          </a>

          {/* Direct Phone Call Button */}
          <a
            href={`tel:${displayPhone}`}
            className="w-full py-3 px-4 bg-[#2B6CB0] hover:bg-[#255C96] text-white rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-98 cursor-pointer"
          >
            <Phone className="w-5 h-5" />
            <span>اتصال مباشر بالأدمن ({displayPhone})</span>
          </a>

          {/* Check Reactivation Status Button */}
          {onRecheck && (
            <button
              type="button"
              onClick={handleRecheckClick}
              disabled={isChecking}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 active:scale-98"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-[#2B6CB0]' : 'text-slate-600'}`} />
              <span>{isChecking ? 'جاري التحقق من السيرفر...' : 'التحقق من إعادة الاشتراك الآن 🔄'}</span>
            </button>
          )}

          {checkStatus && (
            <p className="text-xs font-bold text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
              {checkStatus}
            </p>
          )}
        </div>

        {/* Switch Account Action */}
        {(onSwitchAccount || onLogout) && (
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onSwitchAccount || onLogout}
              className="w-full py-2 px-4 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>تسجيل الدخول بحساب آخر</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
