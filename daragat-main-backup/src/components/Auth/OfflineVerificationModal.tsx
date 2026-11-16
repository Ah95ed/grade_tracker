import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, LogOut, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onRecheck: () => Promise<void>;
  onLogout: () => void;
  userEmail?: string;
}

export const OfflineVerificationModal: React.FC<Props> = ({
  isOpen,
  onRecheck,
  onLogout,
  userEmail,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-recheck as soon as the browser detects an internet connection
  useEffect(() => {
    if (!isOpen) return;

    const handleOnline = async () => {
      setErrorMsg(null);
      setIsChecking(true);
      try {
        await onRecheck();
      } catch (err: any) {
        setErrorMsg(err?.message || 'تعذر التحقق من الخادم، يرجى المحاولة يدوياً.');
      } finally {
        setIsChecking(false);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isOpen, onRecheck]);

  if (!isOpen) return null;

  const handleManualCheck = async () => {
    setErrorMsg(null);
    setIsChecking(true);
    try {
      await onRecheck();
    } catch (err: any) {
      setErrorMsg(err?.message || 'لا يوجد اتصال بالإنترنت حالياً، يرجى تشغيل Wi-Fi أو بيانات الهاتف.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-amber-300 w-full max-w-md p-6 sm:p-7 text-center space-y-5 animate-in zoom-in-95 duration-200">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <WifiOff className="w-8 h-8 animate-pulse text-amber-600" />
        </div>

        {/* Title & Explanation */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900">
            مطلوب الاتصال بالإنترنت للتحقق من الحساب
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            يرجى الاتصال بالإنترنت للتحقق مما إذا كان حسابك مفعلاً من قِبل إدارة النظام أم تم إلغاؤه في قاعدة البيانات.
          </p>
          <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-bold text-amber-800">
            انتهت مهلة الاستخدام دون اتصال (دقيقة واحدة للتجربة)
          </div>
        </div>

        {userEmail && (
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium truncate">
            الحساب المسجل: <strong className="text-slate-800">{userEmail}</strong>
          </div>
        )}

        {/* Error message if recheck failed */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2 text-right">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'جاري التحقق من الاتصال...' : 'إعادة فحص الاتصال بالإنترنت الآن'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>تسجيل الخروج والعودة لاحقاً</span>
          </button>
        </div>
      </div>
    </div>
  );
};
