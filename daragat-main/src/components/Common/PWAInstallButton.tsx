import React, { useState } from 'react';
import { DownloadCloud, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { AppLogo } from '../common/AppLogo';

interface Props {
  variant?: 'icon' | 'menu-item';
  onAfterClick?: () => void;
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'icon', onAfterClick }) => {
  const { isInstalled, installApp } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed as standalone app, do not show button
  if (isInstalled) return null;

  const handleClick = async () => {
    if (onAfterClick) onAfterClick();
    const outcome = await installApp();
    if (outcome === 'ios') {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {variant === 'menu-item' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full px-3 py-2 text-right rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
          title="تثبيت وحفظ التطبيق على شاشة هاتفك أو جهازك للعمل بدون إنترنت"
        >
          <div className="flex items-center gap-2.5">
            <DownloadCloud className="w-4 h-4 text-[#557A95]" />
            <span>حفظ التطبيق على الشاشة (تثبيت)</span>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-100">
            أيقونة الشاشة
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="p-1.5 sm:px-2.5 sm:py-1.5 bg-[#557A95] hover:bg-[#476A84] text-white rounded-lg sm:rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs group cursor-pointer"
          title="تثبيت التطبيق على جهازك أو هاتفك للعمل بدون إنترنت"
        >
          <DownloadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
          <span className="hidden lg:inline">تثبيت التطبيق</span>
        </button>
      )}

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in text-right" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AppLogo className="w-7 h-7 shrink-0 drop-shadow-2xs" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  تثبيت التطبيق على آيفون / آيباد
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              لتثبيت التطبيق على شاشة هاتفك وتشغيله بدون إنترنت:
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-[#557A95] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  اضغط على زر <strong>المشاركة (Share)</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> في أسفل متصفح Safari.
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-[#557A95] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  انزل للأسفل واختر <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-slate-700" />.
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-[#557A95] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  اضغط على <strong>«إضافة» (Add)</strong> في الزاوية العلوية، وسيظهر التطبيق كأيقونة على هاتفك.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-[#557A95] hover:bg-[#476A84] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              حسناً، فهمت ذلك
            </button>
          </div>
        </div>
      )}
    </>
  );
};
