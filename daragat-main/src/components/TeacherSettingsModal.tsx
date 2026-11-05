import React, { useState, useEffect, useRef } from 'react';
import { TeacherProfile, InstitutionType } from '../types';
import { isTestProfile } from '../utils/storage';
import { AppUser } from '../utils/auth';
import {
  X,
  UserCheck,
  Check,
  Upload,
  Trash2,
  Image as ImageIcon,
  GraduationCap,
  School,
  Building,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: TeacherProfile;
  onSave: (updated: TeacherProfile) => void;
  currentUser?: AppUser | null;
  onChangeRole?: () => void;
}

export const TeacherSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  currentUser,
  onChangeRole,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sanitizeProfile = (p: TeacherProfile): TeacherProfile => {
    const defaultSub = currentUser?.userRole === 'admin_school' ? 'الإدارة' : '';
    const instType: InstitutionType =
      p.institutionType ||
      (currentUser?.institutionType === 'university' ? 'university' : 'school');

    if (isTestProfile(p)) {
      return {
        teacherName: '',
        schoolName: '',
        subject: defaultSub,
        academicYear: p.academicYear?.trim() || '2024 - 2025',
        governorate: '',
        schoolLogo: '',
        institutionType: instType,
        universityName: '',
        collegeName: '',
        departmentName: '',
      };
    }
    return {
      teacherName: p.teacherName || '',
      schoolName: p.schoolName || '',
      subject: p.subject || defaultSub,
      academicYear: p.academicYear?.trim() || '2024 - 2025',
      governorate: p.governorate || '',
      schoolLogo: p.schoolLogo || '',
      institutionType: instType,
      universityName: p.universityName || '',
      collegeName: p.collegeName || '',
      departmentName: p.departmentName || '',
    };
  };

  const [formData, setFormData] = useState<TeacherProfile>(() => sanitizeProfile(profile));

  useEffect(() => {
    if (isOpen) {
      setFormData(sanitizeProfile(profile));
    }
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Formatter for Academic Year (e.g. typing 2025 automatically inserts " - " to become "2025 - ")
  const formatAcademicYear = (raw: string, prevRaw: string = ''): string => {
    const converted = raw.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    const digits = converted.replace(/\D/g, '');

    if (!digits) return '';
    if (digits.length < 4) return digits;
    if (digits.length === 4) {
      if (prevRaw && prevRaw.length > raw.length && prevRaw.startsWith(digits)) {
        return digits;
      }
      return `${digits} - `;
    }

    const y1 = digits.slice(0, 4);
    const y2 = digits.slice(4, 8);
    return `${y1} - ${y2}`;
  };

  const handleAcademicYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const current = formData.academicYear || '';
      if (current.endsWith(' - ') || current.endsWith('- ') || current.endsWith(' -')) {
        e.preventDefault();
        const stripped = current.replace(/\s*-\s*$/, '');
        setFormData((prev) => ({ ...prev, academicYear: stripped }));
      }
    }
  };

  const handleAcademicYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatAcademicYear(val, formData.academicYear || '');
    setFormData((prev) => ({ ...prev, academicYear: formatted }));
  };

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
          setFormData((prev) => ({ ...prev, schoolLogo: dataUrl }));
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, schoolLogo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalSchoolName = formData.schoolName.trim();
    if (formData.institutionType === 'university') {
      const parts = [
        formData.universityName?.trim(),
        formData.collegeName?.trim(),
        formData.departmentName?.trim(),
      ].filter(Boolean);
      if (parts.length > 0) {
        finalSchoolName = parts.join(' - ');
      }
    }

    onSave({
      teacherName: formData.teacherName.trim(),
      schoolName: finalSchoolName,
      subject: formData.subject.trim(),
      academicYear: formData.academicYear?.trim() || '2024 - 2025',
      governorate: formData.governorate?.trim() || '',
      schoolLogo: formData.schoolLogo || '',
      institutionType: formData.institutionType || 'school',
      universityName: formData.universityName?.trim() || '',
      collegeName: formData.collegeName?.trim() || '',
      departmentName: formData.departmentName?.trim() || '',
    });
    onClose();
  };

  const isUniversity = formData.institutionType === 'university';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden my-auto font-['Cairo',sans-serif]">
        {/* Header */}
        <div
          className={`shrink-0 px-6 py-4 text-white flex items-center justify-between transition-colors ${
            isUniversity
              ? 'bg-gradient-to-l from-blue-700 via-blue-800 to-indigo-900'
              : 'bg-gradient-to-l from-indigo-700 via-indigo-800 to-indigo-900'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 text-right">
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                {isUniversity ? 'بيانات الأستاذ الجامعي والكلية' : 'بيانات المعلم والمدرسة'}
              </h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                تظهر هذه البيانات في ترويسة الجداول وكشوفات ونتائج الطلاب
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0">
              {isUniversity ? <GraduationCap className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Content Form (Scrollable body) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-right">
          {/* Segmented Control for Institution Type */}
          <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, institutionType: 'school' })}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                !isUniversity
                  ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <School className="w-4 h-4 text-emerald-600" />
              <span>تعليم مدرسي (مدرسة / ثانوية)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, institutionType: 'university' })}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isUniversity
                  ? 'bg-white text-blue-800 shadow-sm border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>تعليم جامعي (جامعة / كلية / معهد)</span>
            </button>
          </div>

          {/* Field: Name */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              {isUniversity ? 'اسم الأستاذ الجامعي / التدريسي' : 'اسم المعلم / المدرس'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.teacherName}
                onChange={(e) =>
                  setFormData({ ...formData, teacherName: e.target.value })
                }
                placeholder={
                  isUniversity
                    ? 'مثال: أ.د. فاروق محمد، م.م. سارة أحمد...'
                    : 'اكتب اسم المعلم أو المدرس'
                }
                className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Conditional Fields based on Institution Type */}
          {isUniversity ? (
            <>
              {/* Row: اسم الجامعة & الكلية */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    اسم الجامعة / المعهد
                  </label>
                  <input
                    type="text"
                    value={formData.universityName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, universityName: e.target.value })
                    }
                    placeholder="مثال: جامعة بغداد"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    الكلية
                  </label>
                  <input
                    type="text"
                    value={formData.collegeName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, collegeName: e.target.value })
                    }
                    placeholder="مثال: كلية العلوم"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Row: القسم العلمي & المادة / المقرر */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    القسم / الفرع العلمي
                  </label>
                  <input
                    type="text"
                    value={formData.departmentName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, departmentName: e.target.value })
                    }
                    placeholder="مثال: علوم الحاسوب"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    المادة / المقرر الدراسي
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="مثال: هياكل البيانات"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            /* School Mode Fields */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  اسم المدرسة / الثانوية
                </label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) =>
                    setFormData({ ...formData, schoolName: e.target.value })
                  }
                  placeholder="اكتب اسم المدرسة"
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  المادة الدراسية
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="مثال: الرياضيات، العلوم..."
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Row: العام الدراسي & المحافظة */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                {isUniversity ? 'العام الأكاديمي / الجامعي' : 'العام الدراسي'}
              </label>
              <input
                type="text"
                value={formData.academicYear || ''}
                onChange={handleAcademicYearChange}
                onKeyDown={handleAcademicYearKeyDown}
                placeholder="2024 - 2025"
                className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all text-center dir-ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                {isUniversity ? 'المحافظة / المدينة' : 'المحافظة / المديرية العامة'}
              </label>
              <input
                type="text"
                value={formData.governorate || ''}
                onChange={(e) =>
                  setFormData({ ...formData, governorate: e.target.value })
                }
                placeholder={isUniversity ? 'مثال: بغداد، البصرة...' : 'مثال: بغداد / الكرخ...'}
                className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Logo Section */}
          <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-slate-800">
                  {isUniversity ? 'شعار الجامعة أو الكلية (اختياري)' : 'شعار المدرسة (اختياري)'}
                </label>
                <p className="text-xs text-slate-500">
                  يُطبع أعلى كشوفات النتائج والشهادات لإضفاء طابع رسمي أنيق
                </p>
              </div>
              {formData.schoolLogo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="حذف الشعار"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الشعار</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 pt-0.5">
              {formData.schoolLogo ? (
                <div className="w-13 h-13 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  <img
                    src={formData.schoolLogo}
                    alt="الشعار"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-13 h-13 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-6 h-6 stroke-1 text-slate-400" />
                </div>
              )}

              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  className="hidden"
                  id="teacher-school-logo-file"
                />
                <label
                  htmlFor="teacher-school-logo-file"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-all active:scale-98"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{formData.schoolLogo ? 'تغيير الشعار' : 'اختيار صورة الشعار'}</span>
                </label>
                <span className="block text-[11px] text-slate-400 mt-1">
                  صيغ PNG, JPG, WebP أو SVG
                </span>
              </div>
            </div>
          </div>

          {/* Account Role & Switcher */}
          {onChangeRole && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700">صفة الحساب الحالية:</span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                    currentUser?.institutionType === 'university'
                      ? 'bg-blue-100 text-blue-950 border-blue-300'
                      : currentUser?.userRole === 'admin_school'
                      ? 'bg-indigo-100 text-indigo-950 border-indigo-300'
                      : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                  }`}
                >
                  {currentUser?.institutionType === 'university'
                    ? 'أستاذ جامعي / تدريسي (جامعات)'
                    : currentUser?.userRole === 'admin_school'
                    ? 'إدارة مدرسة (عدة مواد دراسية)'
                    : 'أستاذ / معلم مدرسي (مادة واحدة)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChangeRole();
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs cursor-pointer transition-all"
              >
                تغيير صفة الحساب
              </button>
            </div>
          )}

          {/* Footer buttons */}
          <div className="shrink-0 pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="submit"
              className={`px-6 py-3 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                isUniversity
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-400/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-400/30'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>حفظ البيانات</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-5 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
