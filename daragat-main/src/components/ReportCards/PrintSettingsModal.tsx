import React, { useRef } from 'react';
import { TeacherProfile, PrintSettings, StudentSimpleCard, ClassSectionCard, TermModel } from '../../types';
import {
  Printer,
  X,
  Sliders,
  Image as ImageIcon,
  Upload,
  Trash2,
  Check,
  FileText,
  Maximize2,
  Grid2X2,
  Square,
  Sparkles,
} from 'lucide-react';
import { ReportCardItem } from './ReportCardItem';
import { StudentIndividualCardItem, StudentCardData } from './StudentIndividualCardItem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: PrintSettings;
  onUpdateSettings: (newSettings: PrintSettings) => void;
  profile: TeacherProfile;
  onUpdateProfile: (updated: TeacherProfile) => void;
  sampleClassCard?: ClassSectionCard;
  sampleStudent?: StudentSimpleCard;
  sampleStudentCard?: StudentCardData;
  groupingMode?: 'by_subject' | 'by_student';
  terms: TermModel[];
  academicYear?: string;
  subject?: string;
  onStartPrint: () => void;
  totalCardsCount: number;
  isAdministration?: boolean;
}

export const PrintSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  profile,
  onUpdateProfile,
  sampleClassCard,
  sampleStudent,
  sampleStudentCard,
  groupingMode = 'by_subject',
  terms,
  academicYear,
  subject,
  onStartPrint,
  totalCardsCount,
  isAdministration,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/png', 0.9);
          onUpdateProfile({ ...profile, schoolLogo: dataUrl });
          onUpdateSettings({ ...settings, showSchoolLogo: true });
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    onUpdateProfile({ ...profile, schoolLogo: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const effectiveLogo = profile.schoolLogo || settings.schoolLogo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden my-auto">
        {/* Modal Top Bar */}
        <div className="shrink-0 px-5 sm:px-6 py-4 bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>تخصيص وإعدادات طباعة كروت النتائج</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {totalCardsCount} كارت
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                تخصيص الهوامش وشعار المدرسة وتخطيط الصفحة للحصول على طباعة رسمية عالية الدقة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content: Split into Settings (Right) and Live Preview (Left) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-5 text-right">
            {/* 1. School Logo Section (شعار المدرسة) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#2B6CB0]" />
                  <span className="text-sm font-bold text-slate-900">
                    شعار المدرسة في كروت النتائج
                  </span>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showSchoolLogo}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, showSchoolLogo: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    إدراج الشعار في الطباعة
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                {effectiveLogo ? (
                  <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <img
                      src={effectiveLogo}
                      alt="شعار المدرسة"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <ImageIcon className="w-6 h-6 stroke-1 text-slate-400" />
                    <span className="text-[9px] text-slate-400 mt-0.5">لا يوجد</span>
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      className="hidden"
                      id="modal-school-logo-input"
                    />
                    <label
                      htmlFor="modal-school-logo-input"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2B6CB0] hover:bg-[#20548A] text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{effectiveLogo ? 'تغيير الشعار' : 'تحميل شعار المدرسة'}</span>
                    </label>

                    {effectiveLogo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1 transition-colors cursor-pointer border border-rose-200 font-bold"
                        title="إزالة الشعار"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>إزالة</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    يتم إدراج الشعار في ترويسة بطاقة النتائج الرسمية بجوار اسم المدرسة ووزارة التربية.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Custom Margins Section (تخصيص الهوامش) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#2B6CB0]" />
                  <span className="text-sm font-bold text-slate-900">
                    تخصيص هوامش الصفحة للطباعة
                  </span>
                </div>
                <span className="text-xs font-bold text-[#2B6CB0] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200" dir="ltr">
                  {settings.margin === 'custom'
                    ? `${settings.customMarginMm} mm`
                    : settings.margin === 'narrow'
                    ? '5 mm'
                    : settings.margin === 'wide'
                    ? '15 mm'
                    : '10 mm'}
                </span>
              </div>

              {/* Margin Presets */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { id: 'narrow', label: 'ضيقة', desc: '5 مم (أقصى سعة)' },
                  { id: 'normal', label: 'عادية', desc: '10 مم (الافتراضي)' },
                  { id: 'wide', label: 'واسعة', desc: '15 مم (رسمية)' },
                  { id: 'custom', label: 'مخصصة', desc: 'تحديد يدوي' },
                ].map((item) => {
                  const isActive = settings.margin === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          margin: item.id as PrintSettings['margin'],
                        })
                      }
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#2B6CB0] text-white border-[#2B6CB0] shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className={`text-[10px] mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom margin slider when custom is selected */}
              {settings.margin === 'custom' && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-semibold">تحديد الهامش بالمليمتر:</span>
                    <span className="font-extrabold text-[#2B6CB0]" dir="ltr">
                      {settings.customMarginMm} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    step="1"
                    value={settings.customMarginMm}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        customMarginMm: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#2B6CB0] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>2 مم (أدنى هامش)</span>
                    <span>15 مم</span>
                    <span>30 مم (أوسع هامش)</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Cards Per Page Layout (تخطيط عدد الكروت في الصفحة) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2B6CB0]" />
                <span className="text-sm font-bold text-slate-900">
                  تخطيط توزيع الكروت في كل ورقة (A4)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {[
                  {
                    id: '2',
                    title: 'كرتان في الصفحة',
                    desc: 'مناسب جداً للوضوح وتوفير الورق (A4 Portrait)',
                    icon: <Maximize2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />,
                  },
                  {
                    id: '4',
                    title: '4 كروت في الصفحة',
                    desc: 'شبكة 2×2 (أكثر توفيراً للورق)',
                    icon: <Grid2X2 className="w-4 h-4 mx-auto mb-1 text-indigo-600" />,
                  },
                  {
                    id: '1',
                    title: 'كرت واحد كبير',
                    desc: 'حجم شهادة كاملة لكل طالب',
                    icon: <Square className="w-4 h-4 mx-auto mb-1 text-amber-600" />,
                  },
                ].map((layout) => {
                  const isActive = settings.cardsPerPage === layout.id;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          cardsPerPage: layout.id as PrintSettings['cardsPerPage'],
                        })
                      }
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#2B6CB0] text-white border-[#2B6CB0] shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {layout.icon}
                      <div className="text-xs font-bold">{layout.title}</div>
                      <div className={`text-[10px] mt-0.5 leading-snug ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        {layout.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Official Extras Toggles (عناصر رسمية إضافية) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-slate-900">
                  العناصر الرسمية المصاحبة للكارت
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showSchoolHeader}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        showSchoolHeader: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      ترويسة المدرسة والمحافظة
                    </span>
                    <span className="text-[10px] text-slate-400">
                      اسم المدرسة، المادة، والعام الدراسي
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showSignatures}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        showSignatures: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      حقول التوقيع والختم الرسمي
                    </span>
                    <span className="text-[10px] text-slate-400">
                      توقيع المدرس ومدير المدرسة وختم الإدارة
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Live Preview Column (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>معاينة حية لشكل الكارت المطبوع</span>
              <span className="text-slate-400 font-normal text-[11px]">
                {settings.cardsPerPage === '2'
                  ? 'عرض نصفي (2 في الصفحة)'
                  : settings.cardsPerPage === '4'
                  ? 'عرض مصغر (4 في الصفحة)'
                  : 'عرض كامل (1 في الصفحة)'}
              </span>
            </div>

            {/* Container showing simulated sheet paper */}
            <div className="flex-1 bg-slate-200 p-3 sm:p-4 rounded-2xl border border-slate-300 flex items-center justify-center overflow-auto min-h-[320px]">
              <div
                className="w-full bg-white shadow-md rounded-xl p-3 border border-slate-300 transition-all"
                style={{
                  padding:
                    settings.margin === 'narrow'
                      ? '10px'
                      : settings.margin === 'wide'
                      ? '20px'
                      : settings.margin === 'custom'
                      ? `${Math.max(6, Math.min(24, settings.customMarginMm * 0.9))}px`
                      : '14px',
                }}
              >
                {(() => {
                  if (groupingMode === 'by_student' && sampleStudentCard) {
                    return (
                      <StudentIndividualCardItem
                        studentCard={sampleStudentCard}
                        terms={terms}
                        profile={profile}
                        academicYear={academicYear}
                        isPrintMode={true}
                        printSettings={settings}
                        isAdministration={isAdministration}
                      />
                    );
                  }

                  const effectiveCard: ClassSectionCard | undefined =
                    sampleClassCard ||
                    (sampleStudent
                      ? {
                          id: 'sample-card',
                          gradeLevel: sampleStudent.gradeLevel || 'الأول المتوسط',
                          section: sampleStudent.section || 'أ',
                          students: [sampleStudent],
                        }
                      : undefined);

                  return effectiveCard ? (
                    <ReportCardItem
                      classCard={effectiveCard}
                      terms={terms}
                      profile={profile}
                      academicYear={academicYear}
                      subject={subject}
                      isPrintMode={true}
                      printSettings={settings}
                    />
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      يرجى إضافة طلاب أو نماذج للمعاينة
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="shrink-0 px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onStartPrint}
            className="px-6 py-3 bg-[#2B6CB0] hover:bg-[#20548A] active:scale-98 text-white rounded-2xl font-black text-sm shadow-md shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>بدء الطباعة الآن ({totalCardsCount} كارت)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
