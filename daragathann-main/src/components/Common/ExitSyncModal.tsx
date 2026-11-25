import React, { useState } from 'react';
import { Cloud, X, AlertTriangle, Loader2, Database, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSyncAndExit: () => Promise<void>;
  onExitWithoutSync: () => void;
}

export const ExitSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirmSyncAndExit,
  onExitWithoutSync,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await onConfirmSyncAndExit();
    } catch (err: any) {
      setSyncFeedback(err.message || 'تعذرت المزامنة، ولكن بياناتك محفوظة محلياً');
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 text-right">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base text-slate-800">
                مزامنة التعديلات مع السحابة (Cloudflare)
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                لديك تعديلات جديدة محفوظة محلياً في جهازك داخل قاعدة بيانات <b>IndexedDB</b>، ولكن لم تتم مزامنتها مع قاعدة بيانات السيرفر (Cloudflare SQLite D1) بعد.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>هل ترغب في مزامنة البيانات الآن قبل الخروج؟</span>
            </p>
            <p className="text-[11px] text-slate-500">
              إذا اخترت المتابعة بدون مزامنة، فستبقى جميع بياناتك ودرجاتك بأمان تام على هذا الجهاز، ويمكنك رفعها لاحقاً في أي وقت عبر زر المزامنة.
            </p>
          </div>

          {syncFeedback && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {syncFeedback}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري المزامنة مع Cloudflare SQLite...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>مزامنة السحابة الآن ثم المتابعة</span>
                </>
              )}
            </button>

            <button
              onClick={onExitWithoutSync}
              disabled={isSyncing}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              المتابعة بدون مزامنة (يمكنك المزامنة لاحقاً)
            </button>

            <button
              onClick={onClose}
              disabled={isSyncing}
              className="w-full py-1.5 text-slate-500 hover:text-slate-700 text-xs text-center cursor-pointer"
            >
              إلغاء والبقاء في الصفحة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
