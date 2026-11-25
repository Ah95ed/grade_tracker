import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Phone,
  PhoneCall,
  Smartphone,
  Monitor,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | 'phone' | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
      setIsMobileDevice(isMobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  const phoneNumber = '+9647706118992';
  const rawPhone = '9647706118992';
  const emailAddress = 'asmaomar5566@gmail.com';
  const messageText = 'السلام عليكم، أود الاستفسار حول تطبيق سجل درجات الطلاب';

  const handleCopy = (text: string, type: 'whatsapp' | 'email' | 'phone') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
    }, 2000);
  };

  // Mobile link triggers the WhatsApp app; Desktop link opens WhatsApp Web
  const mobileWhatsappUrl = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(
    messageText
  )}`;
  const webWhatsappUrl = `https://web.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(
    messageText
  )}`;
  const defaultWhatsappUrl = isMobileDevice ? mobileWhatsappUrl : webWhatsappUrl;

  const directCallUrl = `tel:${phoneNumber}`;
  const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(
    'استفسار حول تطبيق سجل درجات الطلاب'
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-right dir-rtl">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-right">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2 justify-end">
              <span>اتصل بنا والدعم الفني</span>
              <MessageCircle className="w-5 h-5 text-emerald-200" />
            </h3>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              يسعدنا تواصلكم السريع عبر كافة القنوات المتاحة
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* Card 1: Direct Cellular Call */}
          <div className="p-4 rounded-2xl bg-teal-50/90 border border-teal-200 hover:border-teal-300 transition-all shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <a
                href={directCallUrl}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
                title="إجراء اتصال هاتفي مباشر من الموبايل"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>اتصال مباشر</span>
              </a>

              <div className="flex-1 text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="font-black text-sm text-teal-950">اتصال مباشر (هاتف موبايل)</span>
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleCopy(phoneNumber, 'phone')}
                    className="p-1 text-teal-700 hover:text-teal-900 hover:bg-teal-100 rounded-lg transition-colors"
                    title="نسخ رقم الهاتف"
                  >
                    {copiedType === 'phone' ? (
                      <Check className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="font-black text-teal-900 text-sm dir-ltr tracking-wider font-mono">
                    {phoneNumber}
                  </span>
                </div>
              </div>
            </div>
            {copiedType === 'phone' && (
              <p className="text-[11px] font-bold text-teal-700 text-right mt-1.5">
                ✓ تم نسخ رقم الهاتف بنجاح
              </p>
            )}
          </div>

          {/* Card 2: WhatsApp (Smart Detection for Mobile App vs Desktop Web) */}
          <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 hover:border-emerald-300 transition-all shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5 shrink-0">
                <a
                  href={defaultWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 text-center justify-center"
                  title={
                    isMobileDevice
                      ? 'فتح في تطبيق واتس آب الموبايل'
                      : 'فتح في واتساب ويب (الكمبيوتر)'
                  }
                >
                  {isMobileDevice ? (
                    <Smartphone className="w-3.5 h-3.5" />
                  ) : (
                    <Monitor className="w-3.5 h-3.5" />
                  )}
                  <span>{isMobileDevice ? 'تطبيق واتس آب' : 'واتساب ويب'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {/* Secondary alternative link if user on PC wants app or vice versa */}
                {!isMobileDevice ? (
                  <a
                    href={mobileWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-emerald-700 hover:underline text-center"
                    title="فتح رابط تطبيق الواتس آب المباشر"
                  >
                    أو عبر تطبيق الواتس آب
                  </a>
                ) : (
                  <a
                    href={webWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-emerald-700 hover:underline text-center"
                    title="فتح واتساب ويب للمتصفح"
                  >
                    أو عبر واتساب ويب
                  </a>
                )}
              </div>

              <div className="flex-1 text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="font-black text-sm text-emerald-950">محادثة واتس آب</span>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </div>
                </div>

                <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  {isMobileDevice
                    ? 'ينقلك مباشرة لتطبيق واتس آب على هاتفك'
                    : 'ينقلك إلى واتساب ويب على الكمبيوتر'}
                </p>

                <div className="mt-1 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleCopy(phoneNumber, 'whatsapp')}
                    className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg transition-colors"
                    title="نسخ الرقم"
                  >
                    {copiedType === 'whatsapp' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="font-black text-emerald-900 text-sm dir-ltr tracking-wider font-mono">
                    {phoneNumber}
                  </span>
                </div>
              </div>
            </div>
            {copiedType === 'whatsapp' && (
              <p className="text-[11px] font-bold text-emerald-700 text-right mt-1.5">
                ✓ تم نسخ رقم الواتس آب بنجاح
              </p>
            )}
          </div>

          {/* Card 3: Email */}
          <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 hover:border-blue-300 transition-all shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <a
                href={mailtoUrl}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
              >
                <span>إرسال إيميل</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex-1 text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="font-black text-sm text-blue-950">عبر البريد الإلكتروني</span>
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleCopy(emailAddress, 'email')}
                    className="p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors"
                    title="نسخ الإيميل"
                  >
                    {copiedType === 'email' ? (
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="font-black text-blue-900 text-xs sm:text-sm dir-ltr tracking-wide">
                    {emailAddress}
                  </span>
                </div>
              </div>
            </div>
            {copiedType === 'email' && (
              <p className="text-[11px] font-bold text-blue-700 text-right mt-1.5">
                ✓ تم نسخ البريد الإلكتروني بنجاح
              </p>
            )}
          </div>

          {/* Note */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <p className="text-xs font-bold text-slate-600">
              فريق الدعم الفني متاح دائماً للرد على أسئلتكم ومساعدتكم في أي وقت.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
