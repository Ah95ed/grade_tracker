import React, { useState } from 'react';
import { AlertOctagon, Trash2, X, Loader2, Database, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  userEmail: string;
  userName?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export const DeleteAccountModal: React.FC<Props> = ({
  isOpen,
  userEmail,
  userName,
  onConfirm,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmedCheck, setConfirmedCheck] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!confirmedCheck) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-right">
        {/* Header */}
        <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-800 font-black text-sm sm:text-base">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <span>حذف الحساب نهائياً</span>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-slate-700">
          <div className="p-3 bg-red-50/70 rounded-xl border border-red-200 text-xs sm:text-sm font-semibold text-red-900 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                أنت على وشك حذف حساب <span className="font-bold underline" dir="ltr">{userEmail}</span> ({userName || 'المعلم'}).
              </p>
              <p className="text-red-700 text-xs">
                هذا الإجراء نهائي وغير قابل للتراجع وسيتم محو الحساب من الخادم.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
              <Database className="w-4 h-4 text-blue-600" />
              <span>ما الذي سيتم حذفه من النظام وقاعدة البيانات (D1 SQLite)؟</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pr-1 text-[11px] sm:text-xs text-slate-600">
              <li>حذف حساب المستخدم وسجل الدخول نهائياً.</li>
              <li>مسح كافة النماذج الشهرية (Monthly Models) وجداول الدرجات.</li>
              <li>مسح أسماء وسجلات وبيانات الطلاب وملاحظاتهم.</li>
              <li>مسح الفصول الدراسية وحساب المعدلات.</li>
              <li>مسح كافة البيانات من قاعدة بيانات SQLite السحابية والتخزين المحلي.</li>
            </ul>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-red-300 bg-white cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              checked={confirmedCheck}
              onChange={(e) => setConfirmedCheck(e.target.checked)}
              disabled={isDeleting}
              className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800">
              أفهم العواقب وأريد حذف حسابي وكافة بياناتي من قاعدة البيانات نهائياً.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
          >
            إلغاء وتراجع
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!confirmedCheck || isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحذف من قاعدة البيانات...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>نعم، احذف الحساب والبيانات نهائياً</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
