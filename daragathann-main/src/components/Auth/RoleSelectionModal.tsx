import React, { useState, useEffect } from 'react';
import {
  Building2,
  GraduationCap,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  BookOpen,
  LogOut,
  X,
  School,
} from 'lucide-react';
import { AppUser, updateUserRoleOnline } from '../../utils/auth';
import type { InstitutionType } from '../../types';

interface Props {
  isOpen: boolean;
  currentUser: AppUser;
  onRoleSelected: (updatedUser: AppUser) => void;
  onLogout: () => void;
  onClose?: () => void;
}

type SelectionChoice = 'teacher_school' | 'teacher_university' | 'admin_school';

export const RoleSelectionModal: React.FC<Props> = ({
  isOpen,
  currentUser,
  onRoleSelected,
  onLogout,
  onClose,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [selectedChoice, setSelectedChoice] = useState<SelectionChoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setErrorMessage(null);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOpen) return null;

  const handleSelect = async (choice: SelectionChoice) => {
    setErrorMessage(null);

    // التحقق الصارم من توفر الإنترنت
    if (!navigator.onLine) {
      setIsOnline(false);
      setErrorMessage(
        'لا يمكن اختيار نوع الحساب والإنترنت مقطوع! يجب الاتصال بالإنترنت أولاً حتى يتم تثبيت اختيارك في السيرفر السحابي وقاعدة البيانات المركزية.'
      );
      return;
    }

    setSelectedChoice(choice);
    setIsSubmitting(true);

    const role: 'admin_school' | 'teacher' =
      choice === 'admin_school' ? 'admin_school' : 'teacher';
    const institutionType: InstitutionType =
      choice === 'teacher_university' ? 'university' : 'school';

    try {
      const res = await updateUserRoleOnline(role, institutionType);
      if (res.success && res.user) {
        onRoleSelected(res.user);
      } else {
        setErrorMessage(
          res.error ||
            'تعذر تأكيد الاختيار في قاعدة البيانات السحابية. يرجى التأكد من اتصال الإنترنت والمحاولة مجدداً.'
        );
        setSelectedChoice(null);
      }
    } catch {
      setErrorMessage(
        'حدث خطأ غير متوقع أثناء الاتصال بقاعدة البيانات. يرجى إعادة المحاولة بعد لحظات.'
      );
      setSelectedChoice(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-3 sm:p-5 select-none font-['Cairo',sans-serif]"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="shrink-0 px-6 py-4.5 bg-gradient-to-l from-[#2F4A5E] via-[#3E6580] to-[#557A95] text-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  تحديد صفة ونوع الحساب في المنصة
                </h2>
                <p className="text-xs text-blue-100 font-medium mt-0.5">
                  اختر صفتك لتخصيص بيئة العمل والمصطلحات: معلم مدرسة، أستاذ جامعي، أو إدارة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-xl text-white/80 hover:text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer border border-white/20 shadow-2xs"
                title="تسجيل الخروج والرجوع لشاشة الدخول"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>شاشة الدخول</span>
              </button>

              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  isOnline
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                    : 'bg-rose-500/30 text-rose-200 border-rose-400/50 animate-pulse'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-300" />
                    <span>متصل</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-rose-300" />
                    <span>غير متصل</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                توثيق الحساب المركزي:
              </p>
              <p className="text-amber-800 mt-0.5">
                اختيارك سيُحفظ مباشرة في قاعدة البيانات المركزية. يمكنك دائماً تعديل هذه البيانات ونوع المؤسسة لاحقاً من زر «بيانات المعلم / الأستاذ».
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-300 p-3.5 rounded-2xl flex items-start gap-3 text-xs text-rose-900 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">تعذر إكمال الطلب:</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Cards Options: 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: أستاذ / معلم مدرسي */}
            <div
              className={`relative border-2 rounded-2xl p-4.5 transition-all flex flex-col justify-between ${
                selectedChoice === 'teacher_school'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                    تعليم مدرسي
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>أستاذ / معلم مدرسي</span>
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold mt-1 leading-relaxed">
                    مخصص لمعلمي ومدرسي المدارس (ابتدائي، متوسط، إعدادي وثانوي) لرصد مادتهم.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-emerald-100 text-xs text-slate-700 font-medium">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>صفوف دراسية وشُعب مدرسية (أ، ب، ج)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>تحريري، شفهي، نشاط، سلوك وغياب</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>فصل أول، نصف سنة، فصل ثاني، ومعدل</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>بطاقات درجات للطلاب وترويسة المدرسة</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3">
                <button
                  type="button"
                  disabled={isSubmitting || !isOnline}
                  onClick={() => handleSelect('teacher_school')}
                  className="w-full py-3 px-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                >
                  {isSubmitting && selectedChoice === 'teacher_school' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التثبيت...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      <span>الدخول كـ أستاذ مدرسي</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: أستاذ جامعي / تدريسي */}
            <div
              className={`relative border-2 rounded-2xl p-4.5 transition-all flex flex-col justify-between ${
                selectedChoice === 'teacher_university'
                  ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs">
                      تعليم جامعي
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-2xs">
                      جديد
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>أستاذ جامعي / تدريسي</span>
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold mt-1 leading-relaxed">
                    مخصص لأساتذة وتدريسيي الجامعات والكليات والمعاهد لإدارة مقرراتهم وسعيهم الأكاديمي.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-blue-100 text-xs text-slate-700 font-medium">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>مراحل أكاديمية ومجموعات (أولى، ثانية...)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>سعي سنوي، كورسات، نظري وعملي ونهائي</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>حقل خاص بالرقم الجامعي / رقم القيد</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>كشوفات درجات وسعي جامعي معتمدة</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3">
                <button
                  type="button"
                  disabled={isSubmitting || !isOnline}
                  onClick={() => handleSelect('teacher_university')}
                  className="w-full py-3 px-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                >
                  {isSubmitting && selectedChoice === 'teacher_university' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التثبيت...</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      <span>الدخول كـ أستاذ جامعي</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 3: الإدارة */}
            <div
              className={`relative border-2 rounded-2xl p-4.5 transition-all flex flex-col justify-between ${
                selectedChoice === 'admin_school'
                  ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-2xs">
                    إدارة شاملة
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>إدارة مدرسة / قسم</span>
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold mt-1 leading-relaxed">
                    مخصص لإدارة المؤسسة لمتابعة ورصد درجات <strong className="text-indigo-800">عدة مواد مختلفة</strong> معاً.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-indigo-100 text-xs text-slate-700 font-medium">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>إضافة وتغيير المواد بحرية لكل نموذج</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>فلاتر سريعة وتصفية ذكية حسب الصف والمادة</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>عمود خاص لاسم المادة في الجداول الموحدة</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>سجلات مركزية لكافة مواد وأساتذة المدرسة</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3">
                <button
                  type="button"
                  disabled={isSubmitting || !isOnline}
                  onClick={() => handleSelect('admin_school')}
                  className="w-full py-3 px-3.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                >
                  {isSubmitting && selectedChoice === 'admin_school' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التثبيت...</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>الدخول كـ إدارة (عدة مواد)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="shrink-0 px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="text-[11px] text-slate-500 font-semibold text-center sm:text-right">
            حساب: <span className="font-mono text-slate-800 font-bold">{currentUser.email}</span> • يتم التوثيق المركزي بالسحابة تلقائياً
          </p>

          <button
            type="button"
            onClick={onLogout}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>تسجيل الخروج والرجوع</span>
          </button>
        </div>
      </div>
    </div>
  );
};
