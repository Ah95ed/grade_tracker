import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Download,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export type CloudRestoreStep =
  | 'idle'
  | 'downloading_local'
  | 'waiting_before_cloud'
  | 'fetching_cloud'
  | 'error';

interface Props {
  isOpen: boolean;
  onConfirmRestore: (
    onStepChange: (step: CloudRestoreStep) => void
  ) => Promise<void>;
  onCancel: () => void;
}

export const CloudRestoreModal: React.FC<Props> = ({
  isOpen,
  onConfirmRestore,
  onCancel,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<CloudRestoreStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setStep('idle');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim() === 'نعم';
  const isBusy =
    step === 'downloading_local' ||
    step === 'waiting_before_cloud' ||
    step === 'fetching_cloud';

  const handleStart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isConfirmed || isBusy) return;

    setErrorMessage(null);
    try {
      await onConfirmRestore((nextStep) => setStep(nextStep));
      onCancel();
    } catch (err: any) {
      setStep('error');
      setErrorMessage(
        err?.message ||
          'تعذر استيراد البيانات من السيرفر السحابي. تم الاحتفاظ ببياناتك المحلية كما هي.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-right">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-l from-[#2E485C] to-[#4A7595] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-black text-sm sm:text-base">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5 text-sky-200" />
            </div>
            <span>استيراد من قاعدة البيانات السحابية</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleStart} className="p-5 space-y-4 text-slate-700">
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
            <p className="text-sm font-black text-[#1E3A52]">
              هل أنت متأكد من استيراد قاعدة البيانات السحابية؟
            </p>
            <ul className="space-y-1.5 text-xs text-slate-700 font-semibold leading-relaxed">
              <li className="flex items-start gap-2">
                <Download className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  سيتم أولاً <strong>تنزيل نسخة احتياطية من بياناتك المحلية</strong> على جهازك تلقائياً لحفظها قبل أي تغيير.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Cloud className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  وبعدها بثوانٍ قليلة سيتم <strong>أخذ المعلومات من السيرفر السحابي</strong> ووضعها داخل البرنامج.
                </span>
              </li>
            </ul>
          </div>

          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              سيتم استبدال البيانات المعروضة حالياً بنسخة السيرفر السحابي بعد حفظ نسختك المحلية على جهازك.
            </span>
          </div>

          {/* Live Progress State */}
          {isBusy && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2.5 text-xs font-bold text-[#2E485C]">
                <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                <span>
                  {step === 'downloading_local' &&
                    '١/٢: جاري تنزيل البيانات محلياً كنسخة احتياطية على جهازك...'}
                  {step === 'waiting_before_cloud' &&
                    '١/٢: تم تنزيل النسخة المحلية بنجاح! جاري التحضير لأخذ البيانات من السيرفر السحابي...'}
                  {step === 'fetching_cloud' &&
                    '٢/٢: جاري جلب البيانات من السيرفر السحابي ووضعها في البرنامج...'}
                </span>
              </div>
              {(step === 'waiting_before_cloud' || step === 'fetching_cloud') && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>تم حفظ النسخة الاحتياطية المحلية على جهازك بنجاح.</span>
                </div>
              )}
            </div>
          )}

          {/* Error Feedback */}
          {step === 'error' && errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Confirmation Input Box */}
          <div className="space-y-1.5">
            <label
              htmlFor="cloud-restore-confirm-input"
              className="block text-xs font-black text-slate-800"
            >
              للتأكيد والمتابعة، اكتب كلمة{' '}
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black">
                نعم
              </span>{' '}
              في الخانة التالية:
            </label>
            <input
              id="cloud-restore-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isBusy}
              placeholder="اكتب هنا: نعم"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 focus:border-[#2E485C] focus:outline-none text-sm font-bold text-slate-900 bg-white placeholder:text-slate-400 disabled:bg-slate-100"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors disabled:opacity-40 cursor-pointer"
            >
              إلغاء وتراجع
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isBusy}
              className="px-4 py-2 bg-[#2E485C] hover:bg-[#23394A] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التنفيذ...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تأكيد الاستيراد من السحابة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
