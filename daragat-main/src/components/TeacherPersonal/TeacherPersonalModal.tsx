import React, { useState, useMemo } from 'react';
import { MonthlyModel, TeacherProfile } from '../../types';
import {
  TeacherPersonalData,
  TeacherAlert,
} from '../../types/teacherPersonal';
import { WeeklyScheduleTab } from './WeeklyScheduleTab';
import { TeacherNotesTab } from './TeacherNotesTab';
import { TeacherAlertsTab } from './TeacherAlertsTab';
import { ExamQuestionsTab } from './ExamQuestionsTab';
import { createDefaultExamBuilderData } from '../../utils/teacherPersonalStorage';
import {
  NotebookPen,
  CalendarDays,
  StickyNote,
  Bell,
  BellRing,
  X,
  Clock,
  Check,
  FilePenLine,
} from 'lucide-react';

export type TeacherPersonalTab = 'schedule' | 'notes' | 'alerts' | 'exams';

interface FloatingButtonProps {
  onClick: () => void;
  activeAlertsCount: number;
  hasRingingAlert: boolean;
}

export const TeacherPersonalFloatingButton: React.FC<FloatingButtonProps> = ({
  onClick,
  activeAlertsCount,
  hasRingingAlert,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 no-print group flex items-center gap-2.5 px-3.5 py-3 sm:px-4 sm:py-3 rounded-2xl bg-[#2F2822] hover:bg-[#3F352D] text-[#FAF6EC] border border-[#BA916C] shadow-xl transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BA916C]"
      title="ركن المعلم الشخصي: الجدول الأسبوعي، الملاحظات، والتنبيهات"
      aria-label="ركن المعلم الشخصي"
    >
      <div className="relative flex items-center justify-center">
        {hasRingingAlert ? (
          <BellRing className="w-5 h-5 text-amber-300" />
        ) : (
          <NotebookPen className="w-5 h-5 text-[#E8C59B]" />
        )}
        {activeAlertsCount > 0 && (
          <span className="absolute -top-2 -left-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#B86848] text-white text-[10px] font-black tabular-nums flex items-center justify-center border border-[#2F2822]">
            {activeAlertsCount}
          </span>
        )}
      </div>
      <span className="text-xs font-black tracking-tight whitespace-nowrap hidden sm:inline">
        ركني الشخصي
      </span>
    </button>
  );
};

interface AlertBannerProps {
  alerts: TeacherAlert[];
  onDismiss: (id: string) => void;
  onSnooze: (id: string, minutes?: number) => void;
  onOpenAlertsTab: () => void;
}

export const TeacherAlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  onDismiss,
  onSnooze,
  onOpenAlertsTab,
}) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div
      className="fixed top-4 left-4 right-4 sm:left-6 sm:right-auto sm:w-[400px] z-[90] space-y-2.5 no-print"
      dir="rtl"
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-[#2F2822] text-[#FAF6EC] rounded-2xl border border-[#BA916C] shadow-2xl p-4 space-y-3 animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#BA916C]/25 border border-[#BA916C]/50 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-[#E8C59B] block">
                  تنبيه المعلم الشخصي ·{' '}
                  <span dir="ltr" className="tabular-nums">
                    {alert.time}
                  </span>
                </span>
                <h4 className="text-sm font-black text-white leading-snug mt-0.5">
                  {alert.title}
                </h4>
                {alert.note && (
                  <p className="text-xs text-[#DFD4C0] mt-1">{alert.note}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              className="p-1 text-[#C2A88F] hover:text-white rounded-lg cursor-pointer shrink-0"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenAlertsTab}
              className="px-3 py-1.5 text-[11px] font-bold text-[#E8C59B] hover:text-white transition-colors cursor-pointer"
            >
              التنبيهات
            </button>
            <button
              type="button"
              onClick={() => onSnooze(alert.id, 10)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>تأجيل 10 د</span>
            </button>
            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              className="px-3.5 py-1.5 bg-[#BA916C] hover:bg-[#A67E56] text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تم</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TeacherPersonalTab;
  onTabChange: (tab: TeacherPersonalTab) => void;
  data: TeacherPersonalData;
  onChange: (next: TeacherPersonalData) => void;
  models: MonthlyModel[];
  profile: TeacherProfile;
}

export const TeacherPersonalModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  data,
  onChange,
  models,
  profile,
}) => {
  const suggestedSubjects = useMemo(() => {
    const set = new Set<string>();
    if (profile.subject?.trim()) set.add(profile.subject.trim());
    models.forEach((m) => {
      if (m.subject?.trim()) set.add(m.subject.trim());
    });
    return Array.from(set);
  }, [models, profile.subject]);

  const suggestedGrades = useMemo(() => {
    const set = new Set<string>();
    if (profile.gradeLevel?.trim()) set.add(profile.gradeLevel.trim());
    models.forEach((m) => {
      if (m.gradeLevel?.trim()) set.add(m.gradeLevel.trim());
      (m.students || []).forEach((st) => {
        if (st.gradeLevel?.trim()) set.add(st.gradeLevel.trim());
      });
    });
    return Array.from(set).slice(0, 30);
  }, [models, profile.gradeLevel]);

  const suggestedSections = useMemo(() => {
    const set = new Set<string>(['أ', 'ب', 'ج', 'د', 'هـ']);
    models.forEach((m) => {
      (m.assignedSections || []).forEach((sec) => {
        if (sec?.trim()) set.add(sec.trim());
      });
      (m.students || []).forEach((st) => {
        if (st.section?.trim()) set.add(st.section.trim());
      });
    });
    return Array.from(set).slice(0, 20);
  }, [models]);

  if (!isOpen) return null;

  const activeAlertsCount = data.alerts.filter((a) => a.isActive).length;
  const openNotesCount = data.notes.filter((n) => !n.isDone).length;
  const savedExamsCount = data.exams?.savedExams?.length || 0;

  const isExamsTab = activeTab === 'exams';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs ${
        isExamsTab ? 'p-1 sm:p-3' : 'p-2 sm:p-4'
      } animate-in fade-in duration-150 personal-schedule-modal-backdrop single-card-modal-backdrop`}
      dir="rtl"
    >
      <div
        className={`bg-[#F6F3E2] rounded-2xl shadow-2xl border border-[#AA8362] w-full ${
          isExamsTab ? 'max-w-6xl max-h-[96vh]' : 'max-w-5xl max-h-[92vh]'
        } flex flex-col overflow-hidden single-card-modal-content print:max-h-none print:overflow-visible print:shadow-none print:border-none print:bg-white`}
      >
        {/* Top Modal Header */}
        <div
          className={`px-3.5 sm:px-6 ${
            isExamsTab ? 'py-2.5 sm:py-3' : 'py-4'
          } bg-[#2F2822] text-[#FAF6EC] flex items-center justify-between gap-3 shrink-0 no-print`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`${
                isExamsTab ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-10 h-10'
              } rounded-xl bg-[#BA916C]/25 border border-[#BA916C]/50 flex items-center justify-center shrink-0`}
            >
              <NotebookPen className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8C59B]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                المساحة الشخصية للمعلم
              </h3>
              <p
                className={`text-[11px] text-[#D8CEBD] truncate mt-0.5 ${
                  isExamsTab ? 'hidden sm:block' : ''
                }`}
              >
                {profile.teacherName
                  ? `خاصة بالأستاذ / ${profile.teacherName} · محفوظة في جهازك`
                  : 'جدولك الأسبوعي، إنشاء الأسئلة، ملاحظاتك، وتنبيهاتك الخاصة'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-[#D8CEBD] hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Segmented Tabs */}
        <div
          className={`px-3 sm:px-6 ${
            isExamsTab ? 'py-2' : 'py-3'
          } bg-[#EFE8D8] border-b border-[#D5C8B2] shrink-0 no-print`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => onTabChange('schedule')}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'schedule'
                  ? 'bg-[#2F2822] text-white shadow-xs'
                  : 'bg-white/80 text-[#554A3E] hover:bg-white border border-[#D5C8B2]'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>الجدول الأسبوعي للدروس</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('notes')}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'notes'
                  ? 'bg-[#2F2822] text-white shadow-xs'
                  : 'bg-white/80 text-[#554A3E] hover:bg-white border border-[#D5C8B2]'
              }`}
            >
              <StickyNote className="w-4 h-4" />
              <span>ملاحظات المعلم</span>
              {openNotesCount > 0 && (
                <span className="text-[11px] tabular-nums opacity-80">
                  ({openNotesCount})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('exams')}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'exams'
                  ? 'bg-[#2F2822] text-white shadow-xs'
                  : 'bg-white/80 text-[#554A3E] hover:bg-white border border-[#D5C8B2]'
              }`}
            >
              <FilePenLine className="w-4 h-4" />
              <span>إنشاء أسئلة</span>
              {savedExamsCount > 0 && (
                <span className="text-[11px] tabular-nums opacity-80">
                  ({savedExamsCount})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('alerts')}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'alerts'
                  ? 'bg-[#2F2822] text-white shadow-xs'
                  : 'bg-white/80 text-[#554A3E] hover:bg-white border border-[#D5C8B2]'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>تنبيهات المعلم</span>
              {activeAlertsCount > 0 && (
                <span className="text-[11px] tabular-nums opacity-80">
                  ({activeAlertsCount})
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div
          className={`${
            isExamsTab ? 'p-2 sm:p-4' : 'p-4 sm:p-6'
          } overflow-y-auto flex-1 print:overflow-visible print:max-h-none print:p-0 print:bg-white`}
        >
          {activeTab === 'schedule' && (
            <WeeklyScheduleTab
              schedule={data.schedule}
              onChange={(nextSchedule) =>
                onChange({ ...data, schedule: nextSchedule })
              }
              suggestedGrades={suggestedGrades}
              suggestedSections={suggestedSections}
              suggestedSubjects={suggestedSubjects}
              teacherName={profile.teacherName}
            />
          )}

          {activeTab === 'notes' && (
            <TeacherNotesTab
              notes={data.notes}
              onChange={(nextNotes) => onChange({ ...data, notes: nextNotes })}
            />
          )}

          {activeTab === 'exams' && (
            <ExamQuestionsTab
              examsData={data.exams || createDefaultExamBuilderData()}
              onChange={(nextExams) => onChange({ ...data, exams: nextExams })}
              profile={profile}
            />
          )}

          {activeTab === 'alerts' && (
            <TeacherAlertsTab
              alerts={data.alerts}
              onChange={(nextAlerts) =>
                onChange({ ...data, alerts: nextAlerts })
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};
