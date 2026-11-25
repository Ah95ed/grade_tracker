import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileJson,
  AlertTriangle,
  Upload,
  ClipboardPaste,
} from 'lucide-react';

export interface BackupExportPreview {
  fileName: string;
  jsonStr: string;
  modelsCount: number;
  studentsCount: number;
  termsCount: number;
  sizeKB: number;
}

interface BackupExportModalProps {
  isOpen: boolean;
  exportData: BackupExportPreview | null;
  onClose: () => void;
}

export const BackupExportModal: React.FC<BackupExportModalProps> = ({
  isOpen,
  exportData,
  onClose,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !exportData) {
      setBlobUrl('');
      setCopied(false);
      return;
    }

    const blob = new Blob([exportData.jsonStr], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    // Attempt automatic download immediately
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = exportData.fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Manual download button below remains available
    }

    return () => {
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    };
  }, [isOpen, exportData]);

  if (!isOpen || !exportData) return null;

  const isEmpty = exportData.modelsCount === 0 && exportData.termsCount === 0;

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportData.jsonStr);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback textarea copy
      const ta = document.createElement('textarea');
      ta.value = exportData.jsonStr;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FCFBF8] rounded-3xl border border-[#E6E0D4] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-l from-[#EEF4F8] to-[#FAF6EC] border-b border-[#E6E0D4]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#557A95] text-white flex items-center justify-center shadow-xs">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#2F2822]">
                تصدير النسخة الاحتياطية
              </h3>
              <p className="text-[11px] font-bold text-[#7A7165]" dir="ltr">
                {exportData.fileName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7A7165] hover:text-[#2F2822] hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isEmpty ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2.5 text-xs font-bold leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                تنبيه: لا توجد جداول درجات أو فصول حالياً في التطبيق. الملف المُصدّر يحتوي على معلومات المعلم فقط.
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs font-bold leading-relaxed">
              تم تجهيز ملف النسخة الاحتياطية وبدء تنزيله تلقائياً. إذا لم يبدأ التنزيل في متصفحك، استخدم زر التنزيل أو النسخ أدناه.
            </div>
          )}

          {/* Summary Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-white border border-[#E6E0D4] text-center">
              <div className="text-lg font-black text-[#2F2822]">
                {exportData.modelsCount}
              </div>
              <div className="text-[11px] font-bold text-[#7A7165]">جداول شهرية</div>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#E6E0D4] text-center">
              <div className="text-lg font-black text-[#2F2822]">
                {exportData.studentsCount}
              </div>
              <div className="text-[11px] font-bold text-[#7A7165]">إجمالي الطلاب</div>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#E6E0D4] text-center">
              <div className="text-lg font-black text-[#2F2822]">
                {exportData.termsCount}
              </div>
              <div className="text-[11px] font-bold text-[#7A7165]">فصول ومعدلات</div>
            </div>
          </div>

          <div className="text-[11px] font-bold text-[#7A7165] text-center">
            حجم الملف: {exportData.sizeKB} كيلوبايت
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            {blobUrl && (
              <a
                href={blobUrl}
                download={exportData.fileName}
                className="w-full py-3 px-4 rounded-2xl bg-[#557A95] hover:bg-[#46677F] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل الملف ({exportData.fileName})</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleCopyJson}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#FAF6EC] hover:bg-[#F2ECE0] text-[#3D342A] border border-[#D8CEBD] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">تم نسخ محتوى النسخة الاحتياطية!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#78695A]" />
                  <span>نسخ محتوى النسخة الاحتياطية (بديل عن تنزيل الملف)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface BackupPasteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportText: (jsonString: string) => void;
  onPickFile: () => void;
}

export const BackupPasteImportModal: React.FC<BackupPasteImportModalProps> = ({
  isOpen,
  onClose,
  onImportText,
  onPickFile,
}) => {
  const [pastedText, setPastedText] = useState('');

  useEffect(() => {
    if (!isOpen) setPastedText('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FCFBF8] rounded-3xl border border-[#E6E0D4] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-l from-emerald-50 to-[#FAF6EC] border-b border-[#E6E0D4]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#2F2822]">
                استيراد من نص النسخة الاحتياطية
              </h3>
              <p className="text-[11px] font-bold text-[#7A7165]">
                الصق النص المنسوخ أو اختر ملف JSON من جهازك
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7A7165] hover:text-[#2F2822] hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder='الصق محتوى ملف النسخة الاحتياطية هنا (يبدأ بـ { "app": "TeacherGradebook" ...)'
            rows={6}
            dir="ltr"
            className="w-full p-3 rounded-2xl bg-white border border-[#D8CEBD] focus:border-emerald-600 focus:outline-none text-xs font-mono text-slate-800 resize-none"
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={!pastedText.trim()}
              onClick={() => {
                if (!pastedText.trim()) return;
                onImportText(pastedText);
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>استرجاع البيانات من النص</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onPickFile();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#FAF6EC] hover:bg-[#F2ECE0] text-[#3D342A] border border-[#D8CEBD] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>اختيار ملف JSON من الجهاز</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
