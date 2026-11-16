import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, Database, X, ArrowLeft } from 'lucide-react';
import { useSyncStatus } from '../../utils/syncManager';

interface Props {
  userUid?: string;
}

export const SyncStatusBadge: React.FC<Props> = ({ userUid }) => {
  const { isOnline, status, pendingCount, lastSyncedAt, triggerSync } = useSyncStatus();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncOverlayStatus, setSyncOverlayStatus] = useState<'idle' | 'syncing' | 'completed' | null>(null);

  const handleManualSync = async () => {
    setIsConfirmModalOpen(false);
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    setSyncOverlayStatus('syncing');

    try {
      await triggerSync(userUid);
      setSyncOverlayStatus('completed');
      setTimeout(() => {
        setSyncOverlayStatus(null);
      }, 2000);
    } catch {
      setSyncOverlayStatus(null);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const hasPending = pendingCount > 0 || status === 'pending';

  return (
    <>
      {/* Icon-Only Sync Button */}
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setIsConfirmModalOpen(true)}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shadow-2xs border cursor-pointer ${
            !isOnline || status === 'offline'
              ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700'
              : status === 'syncing' || isManualSyncing
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : hasPending
              ? 'bg-amber-50 hover:bg-amber-100 border-amber-400 text-amber-700'
              : 'bg-[#FAF6EC] hover:bg-[#F2ECE0] border-[#D8CEBD] text-[#3E7D59]'
          }`}
          title="المزامنة مع قاعدة البيانات السحابية"
          aria-label="المزامنة مع قاعدة البيانات السحابية"
        >
          {!isOnline || status === 'offline' ? (
            <CloudOff className="w-4 h-4 text-amber-600" />
          ) : status === 'syncing' || isManualSyncing ? (
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          ) : hasPending ? (
            <div className="relative flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-amber-700" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
            </div>
          ) : (
            <Cloud className="w-4 h-4 text-[#3E7D59]" />
          )}
        </button>
      </div>

      {/* Confirmation Modal: "هل تريد المزامنة مع قاعدة البيانات السحابية؟" */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 text-right">
          <div
            className="bg-[#FAF7EC] rounded-2xl shadow-2xl border border-[#D8CEBD] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#5692BE] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">المزامنة مع السحابة</h3>
                  <p className="text-[11px] text-blue-100">
                    حفظ وتأمين السجلات في قاعدة البيانات السحابية
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-[#D8CEBD]">
                <div className="w-10 h-10 rounded-xl bg-[#EEF4F8] text-[#557A95] flex items-center justify-center shrink-0 mt-0.5">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2F2822]">
                    هل تريد المزامنة مع قاعدة البيانات السحابية؟
                  </h4>
                  <p className="text-xs text-[#7A6E61] mt-1 leading-relaxed">
                    سيتم رفع وتحديث كافة بيانات الطلاب والدرجات المسجلة على الخادم السحابي الآمن حتى يمكنك الوصول إليها من أي جهاز آخر.
                  </p>
                </div>
              </div>

              {/* Status info */}
              <div className="p-3 bg-[#F5EFE3] rounded-xl border border-[#D8CEBD] text-xs space-y-1.5 text-[#554A3E]">
                <div className="flex items-center justify-between font-bold">
                  <span>حالة اتصال الإنترنت:</span>
                  <span className={isOnline ? 'text-emerald-700' : 'text-amber-700'}>
                    {isOnline ? '✓ متصل بالإنترنت' : '⚠️ غير متصل بالإنترنت'}
                  </span>
                </div>
                {lastSyncedAt && (
                  <div className="flex items-center justify-between text-[11px] text-[#7A6E61]">
                    <span>آخر مزامنة ناجحة:</span>
                    <span className="font-semibold text-[#2F2822]">{lastSyncedAt}</span>
                  </div>
                )}
                {hasPending && (
                  <div className="text-[11px] text-amber-800 font-semibold pt-1 border-t border-[#D8CEBD]/70">
                    • توجد تعديلات محلية جديدة جاهزة للرفع إلى السحابة.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3.5 bg-[#F8F4EA] border-t border-[#E0D5C3] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-[#7A6E61] hover:bg-[#EBE3D3] rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={!isOnline || isManualSyncing}
                className="px-5 py-2 craft-btn-primary disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>نعم، ابدأ المزامنة</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Synchronization In-Progress Overlay Screen */}
      {syncOverlayStatus === 'syncing' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-100 text-center">
          <div className="bg-[#FAF7EC] rounded-3xl shadow-2xl border border-[#D8CEBD] p-6 sm:p-7 max-w-xs sm:max-w-sm w-full text-center space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#EAF2F6] border-4 border-[#D2E2EC] flex items-center justify-center text-[#557A95] shadow-inner">
              <RefreshCw className="w-8 h-8 text-[#557A95] animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-[#2F2822]">جاري المزامنة...</h3>
              <p className="text-xs font-semibold text-[#7A6E61]">
                جاري رفع وتأمين بياناتك ودرجاتك سحابياً
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Synchronization Complete Screen - Disappears after 2 seconds */}
      {syncOverlayStatus === 'completed' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 text-center"
          onClick={() => setSyncOverlayStatus(null)}
        >
          <div
            className="bg-[#FAF7EC] rounded-3xl shadow-2xl border border-[#D8CEBD] p-6 sm:p-8 max-w-xs sm:max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated green success icon */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-25" />
              <div className="relative w-20 h-20 rounded-full bg-[#EEF6ED] border-4 border-[#C8DFCA] flex items-center justify-center text-[#3E7D59] shadow-inner">
                <CheckCircle2 className="w-11 h-11 text-[#3E7D59] stroke-[2.5] animate-in zoom-in duration-200" />
              </div>
            </div>

            <div className="space-y-1.5 text-center">
              <h3 className="text-2xl font-black text-[#2F2822] tracking-tight">
                تمت المزامنة
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-[#7A6E61] leading-relaxed">
                تم حفظ ومزامنة جميع البيانات والدرجات بنجاح مع السحابة
              </p>
            </div>

            {/* Auto-dismiss progress bar (2 seconds) */}
            <div className="pt-2">
              <div className="w-full bg-[#E5DDD0] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3E7D59] rounded-full"
                  style={{
                    animation: 'syncDismissBar 2s linear forwards',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#7A6E61] font-medium mt-2 px-1">
                <span>تختفي تلقائياً بعد ثانيتين...</span>
                <span className="text-[#3E7D59] font-bold">✓ مؤكد</span>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes syncDismissBar {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>
      )}
    </>
  );
};
