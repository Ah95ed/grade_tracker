import React, { useState, useEffect } from 'react';
import { AppLogo } from '../common/AppLogo';
import {
  ShieldCheck,
  Lock,
  Database,
  EyeOff,
  FileCheck,
  ArrowRight,
  Mail,
  Phone,
  PhoneCall,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  School,
  HardDrive,
  Copy,
  Check,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { AppUser } from '../../utils/auth';

interface Props {
  onBack: () => void;
  currentUser?: AppUser | null;
}

export const PrivacyPolicyView: React.FC<Props> = ({ onBack, currentUser }) => {
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | 'phone' | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const phoneNumber = '+9647706118992';
  const rawPhone = '9647706118992';
  const emailAddress = 'asmaomar5566@gmail.com';
  const messageText = 'السلام عليكم، أود الاستفسار حول سياسة الخصوصية وسرية البيانات في تطبيق درجات';

  const handleCopy = (text: string, type: 'whatsapp' | 'email' | 'phone') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
    }, 2000);
  };

  const mobileWhatsappUrl = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(
    messageText
  )}`;
  const webWhatsappUrl = `https://web.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(
    messageText
  )}`;
  const whatsappUrl = isMobileDevice ? mobileWhatsappUrl : webWhatsappUrl;
  const directCallUrl = `tel:${phoneNumber}`;
  const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(
    'استفسار حول سياسة الخصوصية - daragato.online'
  )}`;

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#2E2B27] font-['Cairo',sans-serif] flex flex-col dir-rtl" dir="rtl">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E3DEC3]/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -mr-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2 group font-bold text-sm"
              title="العودة"
            >
              <ArrowRight className="w-5 h-5 text-[#557A95] group-hover:-translate-x-0.5 transition-transform" />
              <span>{currentUser ? 'العودة للتطبيق' : 'العودة لتسجيل الدخول'}</span>
            </button>
            <span className="hidden sm:inline-block w-px h-5 bg-slate-200" />
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60" dir="ltr">
                daragato.online/privacy
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">واتساب الدعم</span>
            </a>
            <a
              href={mailtoUrl}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden xs:inline">البريد الإلكتروني</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-white via-white to-[#F6F4EF] border-b border-[#E3DEC3]/60 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-3">
            <AppLogo className="w-14 h-14 drop-shadow-sm" />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>سياسة الخصوصية وسرية البيانات الرسمية</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            سياسة الخصوصية وحماية بيانات الطلاب والمعلمين
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            نلتزم في منصة <strong className="text-slate-900">دفتر الدرجات (daragato.online)</strong> بأعلى معايير الأمان والشفافية لحماية سرية سجلات درجات طلابك وبياناتك التعليمية.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              تاريخ التحديث: أكتوبر 2026
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
              <School className="w-3.5 h-3.5 text-blue-500" />
              مخصص للمعلمين والمدارس
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
              <EyeOff className="w-3.5 h-3.5 text-emerald-600" />
              لا يتم بيع أو مشاركة البيانات نهائياً
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Core Guarantees Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm text-slate-800">سرية تامة لدرجات الطلاب</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              سجلات درجات الطلاب تخص المعلم والمدرسة فقط، ولا يمكن لأي طرف ثالث الاطلاع عليها.
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm text-slate-800">تشفير وتخزين محلي آمن</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              نظام هجين يدمج التخزين المحلي السريع (IndexedDB) مع السحابة المشفرة (Cloudflare D1).
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm text-slate-800">تحكم كامل بالبيانات والحذف</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              يمكنك تصدير نسخة احتياطية أو حذف حسابك وسجلاتك نهائياً من قاعدة البيانات بنقرة واحدة.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xs">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-black text-sm">
                1
              </div>
              <h2 className="text-lg font-black">المقدمة والتعريف بالمنصة</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed pr-10.5">
              منصة <strong>دفتر الدرجات</strong> (المتاحة عبر النطاق الرسمي <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800" dir="ltr">https://daragato.online</span>) هي أداة تعليمية تقنية متخصصة مصممة لمساعدة المعلمين والمدرسين في رصد الدرجات الشهرية والتحريرية والشفهية، واحتساب معدلات الفصول بدقة ومرونة، وإصدار بطاقات النتائج للطلاب. نحن ندرك الحساسية الشديدة للسجلات المدرسية ونضع حماية خصوصيتك وخصوصية طلابك على رأس أولوياتنا.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-black text-sm">
                2
              </div>
              <h2 className="text-lg font-black">البيانات التي نقوم بجمعها</h2>
            </div>
            <div className="pr-10.5 space-y-2 text-sm text-slate-600 leading-relaxed">
              <p>نحن نجمع فقط الحد الأدنى والضروري جداً لتشغيل النظام التعليمي وحفظ حسابك:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-700 font-medium">
                <li>
                  <strong>بيانات حساب المعلم:</strong> البريد الإلكتروني، الاسم الظاهر، وكلمة المرور المشفرة (أو معرف تسجيل الدخول عبر Google إذا اخترت ذلك).
                </li>
                <li>
                  <strong>بيانات الملف التعليمي:</strong> اسم المعلم، اسم المدرسة، المادة، والصف الدراسي (تُستخدم فقط لعرضها في ترويسة التقارير وبطاقات النتائج وكشوف الدرجات المطبوعة).
                </li>
                <li>
                  <strong>سجلات الطلاب الأكاديمية:</strong> أسماء الطلاب، درجات الاختبارات التحريرية والشفهية، درجات الأشهر، والملاحظات الدراسية.
                </li>
                <li>
                  <strong>إعدادات الحساب والنماذج:</strong> نسب احتساب الدرجات، قواعد جبر الكسور وتدوير الأرقام، وتفضيلات العرض.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm">
                3
              </div>
              <h2 className="text-lg font-black text-emerald-950">
                خصوصية وسرية بيانات الطلاب والقُصّر (التزام صارم)
              </h2>
            </div>
            <div className="pr-10.5 space-y-2.5 text-sm text-slate-600 leading-relaxed bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <p className="font-semibold text-emerald-900">
                نتعهد أمام الله وأمامكم بالالتزامات الصارمة التالية:
              </p>
              <div className="space-y-2 text-emerald-950">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>عدم بيع البيانات:</strong> لا نقوم ببيع أو تأجير أو المتاجرة ببيانات الطلاب أو المعلمين لأي طرف كان تحت أي ظرف.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>منع الإعلانات المستهدفة:</strong> لا نستخدم بيانات الطلاب لأي غرض تسويقي أو إعلاني تجاري.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>ملكية المعلم والمدرسة:</strong> تظل بيانات الطلاب وسجلاتهم ملكاً أصيلاً للمعلم ومدرسته وحدهم دون غيرهم.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-black text-sm">
                4
              </div>
              <h2 className="text-lg font-black">أمن البيانات والتخزين الهجين (Offline-First)</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed pr-10.5">
              يعتمد التطبيق على معمارية هجينة متطورة:
            </p>
            <div className="pr-10.5 grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 mb-1">
                  <HardDrive className="w-4 h-4 text-teal-600" />
                  <span>التخزين المحلي لجهازك (IndexedDB)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-normal">
                  تُحفظ سجلاتك محلياً في متصفحك لتمكينك من العمل الفوري حتى في حال انقطاع شبكة الإنترنت تماماً وبسرعة استجابة فائقة.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 mb-1">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>المزامنة السحابية المشفرة (Cloudflare D1)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-normal">
                  عند توفر الاتصال، تتم مزامنة وتأمين درجاتك على خوادم سحابية مشفرة بقاعدة بيانات SQLite آمنة لحمايتها من الضياع في حال تغيير جهازك.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-black text-sm">
                5
              </div>
              <h2 className="text-lg font-black">حقوق المستخدم والتحكم الكامل بالبيانات</h2>
            </div>
            <div className="pr-10.5 space-y-2 text-sm text-slate-600 leading-relaxed">
              <p>يتمتع المعلم بصلاحيات كاملة وغير مقيدة للتحكم في بياناته:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <h4 className="font-bold text-xs text-emerald-900 mb-0.5">1. حق التصدير والنسخ</h4>
                  <p className="text-xs text-emerald-800">
                    يمكنك تصدير نسخة احتياطية كاملة JSON إلى جهازك في أي لحظة.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                  <h4 className="font-bold text-xs text-blue-900 mb-0.5">2. حق التعديل والتصحيح</h4>
                  <p className="text-xs text-blue-800">
                    يمكنك تعديل أي درجة أو اسم أو نسبة ومسح أي حقل متى شئت.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                  <h4 className="font-bold text-xs text-rose-900 mb-0.5">3. حق الحذف النهائي</h4>
                  <p className="text-xs text-rose-800">
                    يمكنك مسح حسابك وكافة درجاتك وسجلات الطلاب نهائياً بنقرة زر.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-black text-sm">
                6
              </div>
              <h2 className="text-lg font-black">ملفات تعريف الارتباط والتخزين (Cookies)</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed pr-10.5">
              نحن نستخدم التخزين المحلي للمتصفح (Local Storage & Session Storage) فقط لتسجيل حالة الدخول الآمنة وتفضيلات الواجهة وحفظ السجلات محلياً للعمل بدون إنترنت. نحن <strong className="text-slate-900">لا نستخدم</strong> ملفات تعريف ارتباط تتبعية لجهات خارجية أو شبكات إعلانية.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-black text-sm">
                7
              </div>
              <h2 className="text-lg font-black">تحديثات سياسة الخصوصية</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed pr-10.5">
              قد نقوم بتحديث سياسة الخصوصية من حين لآخر لتتوافق مع التطورات التقنية أو التنظيمية. في حال إجراء أي تحديث جوهري، سنقوم بتحديث تاريخ آخر تعديل في أعلى هذه الصفحة وعرض إشعار للمستخدمين داخل التطبيق.
            </p>
          </section>

          {/* Section 8: Contact */}
          <section className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                8
              </div>
              <h2 className="text-lg font-black">التواصل معنا ومسؤول الخصوصية</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed pr-10.5">
              إذا كانت لديك أي أسئلة أو استفسارات تتعلق بسياسة الخصوصية أو بحماية بياناتك، يسعدنا تواصلك المباشر معنا في أي وقت:
            </p>

            {/* Quick Contact Box */}
            <div className="pr-10.5 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Phone */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-0.5">الاتصال الهاتفي المباشر</span>
                  <span className="text-xs font-mono font-black text-slate-800 block" dir="ltr">
                    {phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href={directCallUrl}
                    className="flex-1 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(phoneNumber, 'phone')}
                    className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs"
                    title="نسخ الرقم"
                  >
                    {copiedType === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 block mb-0.5">محادثة واتساب الرسمية</span>
                  <span className="text-xs font-mono font-black text-emerald-950 block" dir="ltr">
                    {phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>مراسلة واتساب</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(phoneNumber, 'whatsapp')}
                    className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs"
                    title="نسخ الرقم"
                  >
                    {copiedType === 'whatsapp' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-blue-700 block mb-0.5">البريد الإلكتروني المباشر</span>
                  <span className="text-xs font-mono font-black text-blue-950 block truncate" dir="ltr">
                    {emailAddress}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href={mailtoUrl}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>إرسال بريد</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(emailAddress, 'email')}
                    className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs"
                    title="نسخ البريد"
                  >
                    {copiedType === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Back Button */}
        <div className="text-center pt-2 pb-8">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 inline-flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <span>{currentUser ? 'العودة إلى سجل الدرجات' : 'العودة لصفحة تسجيل الدخول'}</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>
          نظام رصد درجات الطلاب الذكي للمعلمين والمدرسين • daragato.online • جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  );
};
