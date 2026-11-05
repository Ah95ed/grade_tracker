import React, { useState } from 'react';
import {
  DownloadCloud,
  Share,
  PlusSquare,
  X,
  Smartphone,
  Laptop,
  CheckCircle2,
  ExternalLink,
  MoreVertical,
} from 'lucide-react';
import { AppLogo } from '../common/AppLogo';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { hasNativePrompt, isIOS, isAndroid, isInstalled, installApp } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'auto' | 'android' | 'ios' | 'desktop'>('auto');
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const detectedPlatform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
  const currentView = activeTab === 'auto' ? detectedPlatform : activeTab;

  const handleNativeInstall = async () => {
    const outcome = await installApp();
    if (outcome === 'accepted') {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
        setInstallSuccess(false);
      }, 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in text-right"
      dir="rtl"
    >
      <div className="bg-[#FAF7EC] rounded-3xl shadow-2xl border border-[#D8CEBD] max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#5692BE] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <DownloadCloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                حفظ التطبيق على الشاشة
              </h3>
              <p className="text-[11px] text-blue-100 mt-0.5">
                إنشاء أيقونة وصول سريع للعمل بدون إنترنت
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* App Card Preview */}
          <div className="p-3.5 bg-white rounded-2xl border border-[#D8CEBD] flex items-center gap-3.5 shadow-2xs">
            <AppLogo className="w-12 h-12 rounded-xl shrink-0 drop-shadow-2xs" />
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-sm text-[#2F2822] truncate">
                دفتر درجات المعلم
              </h4>
              <p className="text-[11px] text-[#7A6E61] truncate mt-0.5">
                تطبيق الويب التقدمي المعتمد لرصد وحساب الدرجات
              </p>
            </div>
            {hasNativePrompt && !installSuccess && (
              <button
                type="button"
                onClick={handleNativeInstall}
                className="shrink-0 px-3.5 py-1.5 craft-btn-primary active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>تثبيت الآن</span>
              </button>
            )}
          </div>

          {installSuccess ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-in fade-in">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-900">
                تمت إضافة التطبيق بنجاح!
              </h4>
              <p className="text-xs text-emerald-700">
                ستجد الآن أيقونة «دفتر درجات المعلم» على شاشة هاتفك أو جهازك.
              </p>
            </div>
          ) : (
            <>
              {/* Platform Switcher Tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-[#EDE5D5] p-1 rounded-xl text-xs font-bold text-[#554A3E]">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    currentView === 'android'
                      ? 'bg-white text-[#2F2822] shadow-2xs'
                      : 'hover:bg-white/50 text-[#7A6E61]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>أندرويد / Chrome</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    currentView === 'ios'
                      ? 'bg-white text-[#2F2822] shadow-2xs'
                      : 'hover:bg-white/50 text-[#7A6E61]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>آيفون / Safari</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    currentView === 'desktop'
                      ? 'bg-white text-[#2F2822] shadow-2xs'
                      : 'hover:bg-white/50 text-[#7A6E61]'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>كمبيوتر / لابتوب</span>
                </button>
              </div>

              {/* View 1: Android Chrome */}
              {currentView === 'android' && (
                <div className="space-y-2.5 text-xs text-[#4A4036] animate-in fade-in">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#D8CEBD]">
                    <span className="w-6 h-6 rounded-full bg-[#5692BE] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="leading-relaxed">
                      اضغط على قائمة متصفح Chrome (أيقونة النقاط الثلاث{' '}
                      <MoreVertical className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" /> في
                      الزاوية العلوية).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#D8CEBD]">
                    <span className="w-6 h-6 rounded-full bg-[#5692BE] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="leading-relaxed">
                      اختر من القائمة <strong>«تثبيت التطبيق»</strong> أو{' '}
                      <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home screen)</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#D8CEBD]">
                    <span className="w-6 h-6 rounded-full bg-[#5692BE] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="leading-relaxed">
                      اضغط على <strong>«تثبيت» (Install)</strong>، وسيتم إنشاء أيقونة التطبيق
                      مباشرة على شاشة هاتفك وتعمل حتى بدون إنترنت!
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: iOS Safari */}
              {currentView === 'ios' && (
                <div className="space-y-2.5 text-xs text-[#4A4036] animate-in fade-in">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#D8CEBD]">
                    <span className="w-6 h-6 rounded-full bg-[#5692BE] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="leading-relaxed">
                      اضغط على زر <strong>المشاركة (Share)</strong>{' '}
                      <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> في أسفل
                      شاشة متصفح Safari.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#D8CEBD]">
                    <span className="w-6 h-6 rounded-full bg-[#5692BE] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="leading-relaxed">
                      اسحب للأعلى واختر <strong>«إضافة إلى الشاشة الرئيسية»</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" />.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#D8CEBD]">
                    <span className="w-6 h-6 rounded-full bg-[#5692BE] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="leading-relaxed">
                      اضغط على <strong>«إضافة» (Add)</strong> في أعلى اليمين، وستظهر أيقونة
                      التطبيق على شاشة هاتفك فوراً!
                    </div>
                  </div>
                </div>
              )}

              {/* View 3: Desktop Chrome / Edge */}
              {currentView === 'desktop' && (
                <div className="space-y-2.5 text-xs text-[#4A4036] animate-in fade-in">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#D8CEBD]">
                    <span className="w-6 h-6 rounded-full bg-[#5692BE] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="leading-relaxed">
                      في شريط عنوان المتصفح في الأعلى، اضغط على أيقونة التثبيت{' '}
                      <DownloadCloud className="w-3.5 h-3.5 inline mx-0.5 text-[#5692BE]" /> أو
                      علامة (⊕) الموجودة بجوار رابط الصفحة.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#D8CEBD]">
                    <span className="w-6 h-6 rounded-full bg-[#5692BE] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="leading-relaxed">
                      اضغط على <strong>«تثبيت» (Install)</strong>، وسيتم حفظ التطبيق على سطح
                      المكتب وفتحه في نافذة مستقلة كبرنامج رسمي.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#F5EFE3] border-t border-[#D8CEBD] flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-[#7A6E61] font-semibold">
            ✓ يتيح لك التطبيق العمل وتعديل الدرجات حتى عند انقطاع الإنترنت
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#EBE2D2] text-[#2F2822] border border-[#D8CEBD] rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
