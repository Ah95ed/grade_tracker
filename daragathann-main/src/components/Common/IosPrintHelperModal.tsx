import React, { useState } from 'react';
import { Printer, ExternalLink, Copy, Check, X, Share, Smartphone } from 'lucide-react';
import { PrintPlatformStatus } from '../../utils/printHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  status: PrintPlatformStatus;
}

export const IosPrintHelperModal: React.FC<Props> = ({ isOpen, onClose, status }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleOpenInSafari = () => {
    try {
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback handled by copy button
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard fallback
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150 no-print"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-right">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-l from-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black leading-tight">
                تنبيه الطباعة على أجهزة الآيفون
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {status.isStandalonePWA
                  ? 'التطبيق مفتوح من الشاشة الرئيسية (وضع التطبيق)'
                  : 'التطبيق مفتوح داخل متصفح تطبيق آخر'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs sm:text-sm text-amber-950 leading-relaxed font-semibold">
            {status.isStandalonePWA ? (
              <p>
                نظام <strong>iOS في الآيفون</strong> يمنع زر الطباعة المباشر عندما يكون الموقع مثبتاً على الشاشة الرئيسية كـ «تطبيق». للطباعة أو الحفظ كـ <strong>PDF</strong>، افتح الصفحة في متصفح <strong>Safari</strong> مباشرة.
              </p>
            ) : (
              <p>
                أنت تتصفح الآن من داخل متصفح داخلي (مثل واتساب أو فيسبوك)، ونظام <strong>الآيفون</strong> يمنع الطباعة من داخله. للطباعة أو الحفظ كـ <strong>PDF</strong>، افتح الرابط في متصفح <strong>Safari</strong>.
              </p>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
            <div className="font-black text-slate-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#557A95]" />
              <span>خطوات الطباعة أو الحفظ كـ PDF في Safari:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 font-semibold leading-relaxed pr-1">
              <li>اضغط على زر <strong>«فتح في متصفح Safari»</strong> أدناه (أو انسخ الرابط وافتحه في سفاري).</li>
              <li>
                من داخل Safari اضغط زر الطباعة، أو اضغط أيقونة المشاركة{' '}
                <Share className="w-3.5 h-3.5 inline-block text-sky-600 mx-0.5" />{' '}
                ثم اختر <strong>طباعة (Print)</strong>.
              </li>
              <li>للحفظ كملف PDF: كبّر معاينة الصفحة بإصبعين أو اضغط المشاركة لحفظه في «الملفات».</li>
            </ol>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleOpenInSafari}
              className="w-full py-2.5 px-4 bg-[#2B6CB0] hover:bg-[#1E4E8C] text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>فتح في متصفح Safari للطباعة</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUrl}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">تم نسخ الرابط! افتح سفاري والصقه</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>نسخ رابط الصفحة</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
