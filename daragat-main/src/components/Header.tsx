import React, { useRef, useState, useEffect } from 'react';
import { TeacherProfile } from '../types';
import { AppUser } from '../utils/auth';
import { ConfirmDeleteModal } from './Common/ConfirmDeleteModal';
import { DeleteAccountModal } from './Common/DeleteAccountModal';
import { ContactModal } from './Common/ContactModal';
import { SyncStatusBadge } from './Common/SyncStatusBadge';
import { PWAInstallButton } from './Common/PWAInstallButton';
import { PWAInstallModal } from './Common/PWAInstallModal';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppLogo } from './common/AppLogo';
import {
  GraduationCap,
  Table,
  Calculator,
  Award,
  Settings,
  Download,
  Upload,
  RotateCcw,
  LogOut,
  Trash2,
  Crown,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  X,
  User,
  MessageCircle,
  ShieldCheck,
  DownloadCloud,
} from 'lucide-react';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface Props {
  activeTab: 'monthly' | 'term' | 'cards' | 'admin';
  setActiveTab: (tab: 'monthly' | 'term' | 'cards' | 'admin') => void;
  profile: TeacherProfile;
  currentUser: AppUser | null;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void> | void;
  onOpenProfileModal: () => void;
  onOpenSubscriptionModal: () => void;
  onOpenRoundingModal?: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => void;
  onResetDefaults: () => void;
  onOpenPrivacy?: () => void;
  hasUnsavedChanges?: boolean;
}

const LaurelAcademicLogo: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 46C15 42 13 36 13 30C13 22 17 16 21 12M46 46C49 42 51 36 51 30C51 22 47 16 43 12"
      stroke="#9C7756"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M15 36C12 36 9 34 8 31C9 28 12 28 14 30M16 26C13 25 11 22 11 19C13 18 16 19 17 22M20 18C18 16 17 13 18 10C21 10 22 13 22 16"
      stroke="#9C7756"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M49 36C52 36 55 34 56 31C55 28 52 28 50 30M48 26C51 25 53 22 53 19C51 18 48 19 47 22M44 18C46 16 47 13 46 10C43 10 42 13 42 16"
      stroke="#9C7756"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M23 44C27 41 31 42 32 44C33 42 37 41 41 44V34C37 31 33 32 32 34C31 32 27 31 23 34V44Z"
      stroke="#9C7756"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M32 20L44 26L32 32L20 26L32 20Z"
      stroke="#9C7756"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M24 28V34C24 37 28 39 32 39C36 39 40 37 40 34V28"
      stroke="#9C7756"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M42 27V36C42 37 44 38 44 39"
      stroke="#9C7756"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const PAGE_THEMES = {
  monthly: {
    bannerBg: 'bg-[#5692BE]',
    accentText: '#4A82A8',
    activeRing: 'ring-2 ring-[#5692BE]',
  },
  term: {
    bannerBg: 'bg-[#B86848]',
    accentText: '#A05537',
    activeRing: 'ring-2 ring-[#B86848]',
  },
  cards: {
    bannerBg: 'bg-[#4E7A68]',
    accentText: '#3B6554',
    activeRing: 'ring-2 ring-[#4E7A68]',
  },
  admin: {
    bannerBg: 'bg-[#3E5771]',
    accentText: '#2F445B',
    activeRing: 'ring-2 ring-[#3E5771]',
  },
};

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  profile,
  currentUser,
  onLogout,
  onDeleteAccount,
  onOpenProfileModal,
  onOpenSubscriptionModal,
  onOpenRoundingModal,
  onExportBackup,
  onImportBackup,
  onResetDefaults,
  onOpenPrivacy,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const { hasNativePrompt, isInstalled: isPWAInstalled, installApp } = usePWAInstall();

  const handlePWAInstallClick = async () => {
    setIsMenuOpen(false);
    if (hasNativePrompt) {
      const outcome = await installApp();
      if (outcome === 'accepted') {
        return;
      }
    }
    setIsInstallModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportBackup(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isAdmin = currentUser?.isAdmin;
  const currentTheme = PAGE_THEMES[activeTab] || PAGE_THEMES.monthly;

  return (
    <header id="main-navigation-header" className={`bg-transparent sticky top-0 ${isMenuOpen ? 'z-50' : 'z-30'} no-print pt-2 pb-2`}>
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-2">
        <div className="flex items-center justify-between gap-2.5">
          {/* School and Subject Banner: Shows Teacher Name and Subject ONLY from teacher settings */}
          <div className="flex-1 min-w-0">
            <div
              onClick={onOpenProfileModal}
              className={`py-2 px-3 sm:px-4 rounded-xl ${currentTheme.bannerBg} text-white shadow-xs transition-colors cursor-pointer select-none`}
              title="تعديل بيانات المعلم والمدرسة والمادة"
            >
              <h2 className="text-xs sm:text-sm font-bold truncate">
                {profile?.teacherName?.trim()
                  ? (/^(الأستاذ|الاستاذ|الأستاذة|الاستاذة|د\.|أ\.)/i.test(profile.teacherName.trim())
                      ? profile.teacherName.trim()
                      : `الأستاذ: ${profile.teacherName.trim()}`)
                  : (profile?.schoolName?.trim() || 'بيانات المعلم والمدرسة')}
              </h2>
              {profile?.subject?.trim() ? (
                <p className="text-[11px] sm:text-xs text-white/90 font-medium truncate mt-0.5">
                  {profile.subject.trim()}
                </p>
              ) : null}
            </div>
          </div>

          {/* Clean Action Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Academic Emblem from Reference Image */}
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FAF6EC] border border-[#D8CEBD] flex items-center justify-center shadow-2xs shrink-0"
              title="شعار المدرسة"
            >
              <LaurelAcademicLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            {/* Live Local & Cloud Sync Status Badge (Icon Only) */}
            <SyncStatusBadge userUid={currentUser?.uid} />

            {/* Subscription Quick Badge (Desktop only) */}
            {currentUser && (
              <button
                onClick={onOpenSubscriptionModal}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF6EC] hover:bg-[#F2ECE0] text-[#7A5B36] border border-[#D8CEBD] rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title="تفاصيل الاشتراك ورقم تواصل الدعم"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  {currentUser.subscriptionType === 'lifetime'
                    ? 'اشتراك دائم'
                    : currentUser.subscriptionType === 'yearly'
                    ? 'اشتراك سنوي'
                    : currentUser.subscriptionType === 'monthly'
                    ? 'اشتراك شهري'
                    : 'تجريبي'}
                </span>
              </button>
            )}

            {/* Profile Settings Button (Desktop only) */}
            <button
              onClick={onOpenProfileModal}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-[#EFECE5] text-[#555047] border border-[#E5E0D5] rounded-xl text-xs font-bold transition-colors shadow-2xs"
              title="تعديل بيانات المعلم والمدرسة"
            >
              <Settings className="w-3.5 h-3.5 text-[#557A95]" />
              <span className="max-w-[90px] truncate">{profile.teacherName}</span>
            </button>

            {/* Google / User Avatar Quick Trigger Button */}
            {currentUser && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 bg-white hover:bg-[#F2ECE3] border border-[#E2DBD0] rounded-xl text-xs font-bold transition-all shadow-2xs group"
                title={`الملف الشخصي: ${currentUser.displayName || currentUser.email}`}
                aria-label="قائمة الحساب"
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Google'}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-[#557A95] transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-[#2E485C] to-[#557A95] text-white flex items-center justify-center text-xs font-bold">
                      {(currentUser.displayName || currentUser.email || 'م').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {currentUser.authProvider === 'google' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-100">
                      <GoogleIcon className="w-2 h-2" />
                    </span>
                  )}
                </div>
                <div className="hidden xl:flex flex-col text-right leading-tight min-w-0 max-w-[100px]">
                  <span className="text-[11px] font-bold text-slate-800 truncate">
                    {currentUser.displayName || 'المعلم'}
                  </span>
                  <span className="text-[9px] text-slate-500 truncate font-sans" dir="ltr">
                    {currentUser.authProvider === 'google' ? 'Google' : currentUser.email}
                  </span>
                </div>
              </button>
            )}

            {/* Unified Tools & Options Menu Trigger (Eliminates horizontal overflow!) */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs border ${
                  isMenuOpen
                    ? 'bg-[#2E485C] text-white border-[#2E485C]'
                    : 'bg-white hover:bg-[#EEF4F8] text-[#2E485C] border-[#D5DFE8]'
                }`}
                title="أدوات النظام، النسخ الاحتياطي، والإعدادات"
                aria-label="قائمة الأدوات والمزيد"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#557A95]" />
                <span className="hidden sm:inline">الأدوات والمزيد</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Tools & Settings Dropdown Menu */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-2xs"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div
                    className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:left-0 top-16 sm:top-full mt-1.5 z-[70] w-auto sm:w-80 max-h-[min(82vh,calc(100dvh-95px))] overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 pb-16 text-right animate-in fade-in zoom-in-95 duration-150 space-y-2.5 scroll-smooth"
                    dir="rtl"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {/* Header info */}
                    <div className="pb-3 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400">الحساب المسجل</span>
                        <button
                          onClick={() => setIsMenuOpen(false)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {currentUser?.photoURL ? (
                            <img
                              src={currentUser.photoURL}
                              alt={currentUser.displayName || 'Google'}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#557A95]/30 shadow-xs"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#557A95]/15 text-[#557A95] flex items-center justify-center font-bold text-base">
                              {(currentUser?.displayName || profile.teacherName || 'م').charAt(0).toUpperCase()}
                            </div>
                          )}
                          {currentUser?.authProvider === 'google' && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-100">
                              <GoogleIcon className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-800 leading-tight truncate">
                            {currentUser?.displayName || profile.teacherName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate" dir="ltr">
                            {currentUser?.email}
                          </p>
                          {currentUser?.authProvider === 'google' ? (
                            <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              <GoogleIcon className="w-2.5 h-2.5" />
                              حساب Google معتمد
                            </span>
                          ) : currentUser?.isAdmin ? (
                            <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              مشرف عام (Admin)
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Section 1: Teacher, Subscription & Install App */}
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenProfileModal();
                        }}
                        className="w-full px-3 py-2 text-right rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-[#557A95]" />
                        <span>بيانات المعلم والمدرسة</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenSubscriptionModal();
                        }}
                        className="w-full px-3 py-2 text-right rounded-xl hover:bg-amber-50 text-xs font-bold text-amber-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>تفاصيل الاشتراك</span>
                      </button>

                      {/* PWA Save to Home Screen Button */}
                      {!isPWAInstalled && (
                        <button
                          type="button"
                          onClick={handlePWAInstallClick}
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
                      )}
                    </div>

                    {/* Section 2: Backup & Database */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider">
                        النسخ الاحتياطي وقواعد البيانات
                      </p>

                      {onOpenRoundingModal && (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenRoundingModal();
                          }}
                          className="w-full px-3 py-2 text-right rounded-xl hover:bg-amber-50 text-xs font-bold text-[#8C6D23] flex items-center gap-2.5 transition-colors"
                          title="التحكم بالنسب العشرية وقواعد جبر وتقريب الكسور"
                        >
                          <Calculator className="w-4 h-4 text-[#8C6D23]" />
                          <span>التحكم بالنسب العشرية</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onExportBackup();
                        }}
                        className="w-full px-3 py-2 text-right rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2.5 transition-colors"
                      >
                        <Download className="w-4 h-4 text-[#557A95]" />
                        <span>تصدير نسخة احتياطية (حفظ على جهازك)</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full px-3 py-2 text-right rounded-xl hover:bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center gap-2.5 transition-colors"
                      >
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>استرجاع واستيراد نسخة احتياطية</span>
                      </button>
                    </div>

                    {/* Section 3: Reset & Logout */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsResetModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-right rounded-xl hover:bg-rose-50 text-xs font-bold text-slate-600 hover:text-rose-700 flex items-center gap-2.5 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                        <span>إعادة ضبط وتفريغ الجدول للبداية</span>
                      </button>

                      {/* زر اتصل بنا عبر الإيميل أو الواتس آب */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsContactModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-right rounded-xl hover:bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center justify-between transition-colors border border-emerald-100"
                        title="اتصل بنا عبر الإيميل asmaomar5566@gmail.com أو عبر الواتس آب +9647706118992"
                      >
                        <div className="flex items-center gap-2.5">
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>اتصل بنا (واتس آب / هاتف / إيميل)</span>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
                          دعم فني
                        </span>
                      </button>

                      {onOpenPrivacy && (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenPrivacy();
                          }}
                          className="w-full px-3 py-2 text-right rounded-xl hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors border border-transparent hover:border-slate-200"
                          title="سياسة الخصوصية وسرية البيانات"
                        >
                          <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>سياسة الخصوصية وسرية البيانات</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                            /privacy
                          </span>
                        </button>
                      )}

                      {currentUser && (
                        <>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              onLogout();
                            }}
                            className="w-full px-3 py-2 text-right rounded-xl hover:bg-rose-50 text-xs font-bold text-rose-700 flex items-center gap-2.5 transition-colors"
                          >
                            <LogOut className="w-4 h-4 text-rose-600" />
                            <span>تسجيل الخروج من الحساب</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsDeleteAccountModalOpen(true);
                            }}
                            className="w-full px-3 py-2 text-right rounded-xl hover:bg-red-50 text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-2.5 transition-colors border border-transparent hover:border-red-200"
                            title="حذف الحساب وكافة بياناته نهائياً من قاعدة البيانات"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span>حذف الحساب نهائياً من قاعدة البيانات</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Hidden File Input for Backup Import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>



        {/* Navigation Tabs - Distinct vibrant colors when active so user clearly knows current page */}
        <div
          className={`grid ${
            isAdmin ? 'grid-cols-4' : 'grid-cols-3'
          } gap-2.5 sm:gap-4 w-full`}
        >
          {/* 1. الجدول (Monthly Sheet) */}
          <button
            onClick={() => setActiveTab('monthly')}
            className={`relative py-3 sm:py-3.5 px-2 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer group select-none ${
              activeTab === 'monthly'
                ? 'bg-[#5692BE] text-white shadow-lg shadow-[#5692BE]/30 border-2 border-[#3D7299] ring-2 ring-[#5692BE]/40 scale-[1.02]'
                : 'bg-[#FAF6EC] hover:bg-[#F2ECE0] text-[#3D342A] border-[1.5px] border-[#C7B5A0] hover:border-[#AA8362] shadow-2xs hover:shadow-xs'
            }`}
            title="جدول رصد الدرجات الشهرية"
          >
            <Table
              className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:scale-105 ${
                activeTab === 'monthly' ? 'text-white stroke-[2.2]' : 'text-[#78695A] group-hover:text-[#2F2822] stroke-[1.8]'
              }`}
            />
            <span
              className={`text-xs sm:text-base font-extrabold leading-tight ${
                activeTab === 'monthly' ? 'text-white' : 'text-[#3D342A]'
              }`}
            >
              الجدول
            </span>
            {activeTab === 'monthly' ? (
              <span className="w-8 h-1 bg-white/90 rounded-full mt-0.5 shadow-2xs" />
            ) : (
              <span className="w-8 h-1 bg-transparent rounded-full mt-0.5 opacity-0" />
            )}
          </button>

          {/* 2. المعدل (Terms) */}
          <button
            onClick={() => setActiveTab('term')}
            className={`relative py-3 sm:py-3.5 px-2 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer group select-none ${
              activeTab === 'term'
                ? 'bg-[#B86848] text-white shadow-lg shadow-[#B86848]/30 border-2 border-[#9C5133] ring-2 ring-[#B86848]/40 scale-[1.02]'
                : 'bg-[#FAF6EC] hover:bg-[#F2ECE0] text-[#3D342A] border-[1.5px] border-[#C7B5A0] hover:border-[#AA8362] shadow-2xs hover:shadow-xs'
            }`}
            title="حساب المعدل الفصلي والنهائي"
          >
            <Calculator
              className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:scale-105 ${
                activeTab === 'term' ? 'text-white stroke-[2.2]' : 'text-[#78695A] group-hover:text-[#2F2822] stroke-[1.8]'
              }`}
            />
            <span
              className={`text-xs sm:text-base font-extrabold leading-tight ${
                activeTab === 'term' ? 'text-white' : 'text-[#3D342A]'
              }`}
            >
              المعدل
            </span>
            {activeTab === 'term' ? (
              <span className="w-8 h-1 bg-white/90 rounded-full mt-0.5 shadow-2xs" />
            ) : (
              <span className="w-8 h-1 bg-transparent rounded-full mt-0.5 opacity-0" />
            )}
          </button>

          {/* 3. الكروت (Cards) */}
          <button
            onClick={() => setActiveTab('cards')}
            className={`relative py-3 sm:py-3.5 px-2 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer group select-none ${
              activeTab === 'cards'
                ? 'bg-[#4E7A68] text-white shadow-lg shadow-[#4E7A68]/30 border-2 border-[#385F4F] ring-2 ring-[#4E7A68]/40 scale-[1.02]'
                : 'bg-[#FAF6EC] hover:bg-[#F2ECE0] text-[#3D342A] border-[1.5px] border-[#C7B5A0] hover:border-[#AA8362] shadow-2xs hover:shadow-xs'
            }`}
            title="كروت وشهادات درجات الطلاب"
          >
            <Award
              className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:scale-105 ${
                activeTab === 'cards' ? 'text-white stroke-[2.2]' : 'text-[#78695A] group-hover:text-[#2F2822] stroke-[1.8]'
              }`}
            />
            <span
              className={`text-xs sm:text-base font-extrabold leading-tight ${
                activeTab === 'cards' ? 'text-white' : 'text-[#3D342A]'
              }`}
            >
              الكروت
            </span>
            {activeTab === 'cards' ? (
              <span className="w-8 h-1 bg-white/90 rounded-full mt-0.5 shadow-2xs" />
            ) : (
              <span className="w-8 h-1 bg-transparent rounded-full mt-0.5 opacity-0" />
            )}
          </button>

          {/* Admin Dashboard Tab (Only visible to authorized admins) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`relative py-3 sm:py-3.5 px-2 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer group select-none ${
                activeTab === 'admin'
                  ? 'bg-[#3E5771] text-white shadow-lg shadow-[#3E5771]/30 border-2 border-[#2C4156] ring-2 ring-[#3E5771]/40 scale-[1.02]'
                : 'bg-[#FAF6EC] hover:bg-[#F2ECE0] text-[#3D342A] border-[1.5px] border-[#C7B5A0] hover:border-[#AA8362] shadow-2xs hover:shadow-xs'
              }`}
              title="لوحة تحكم المشرف العام"
            >
              <Crown
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:scale-105 ${
                  activeTab === 'admin' ? 'text-white stroke-[2.2]' : 'text-[#78695A] group-hover:text-[#2F2822] stroke-[1.8]'
                }`}
              />
              <span
                className={`text-xs sm:text-base font-extrabold leading-tight ${
                  activeTab === 'admin' ? 'text-white' : 'text-[#3D342A]'
                }`}
              >
                لوحة الإدارة
              </span>
              {activeTab === 'admin' ? (
                <span className="w-8 h-1 bg-white/90 rounded-full mt-0.5 shadow-2xs" />
              ) : (
                <span className="w-8 h-1 bg-transparent rounded-full mt-0.5 opacity-0" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Resetting Defaults */}
      <ConfirmDeleteModal
        isOpen={isResetModalOpen}
        title="تأكيد إعادة ضبط النظام"
        message="هل أنت متأكد من الاستمرار في إعادة الضبط وتفريغ كافة الجداول والبيانات المسجلة للبدء من الصفر؟"
        confirmText="نعم، استمر في إعادة الضبط"
        onConfirm={onResetDefaults}
        onCancel={() => setIsResetModalOpen(false)}
      />

      {/* Confirmation Modal for Permanently Deleting Account & Database Records */}
      {currentUser && (
        <DeleteAccountModal
          isOpen={isDeleteAccountModalOpen}
          userEmail={currentUser.email}
          userName={currentUser.displayName}
          onCancel={() => setIsDeleteAccountModalOpen(false)}
          onConfirm={async () => {
            await onDeleteAccount();
            setIsDeleteAccountModalOpen(false);
          }}
        />
      )}
      {/* Contact & Support Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      {/* PWA Save to Home Screen Modal */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </header>
  );
};
