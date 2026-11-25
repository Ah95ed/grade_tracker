import React, { useState } from 'react';
import {
  TeacherAlert,
  TeacherAlertRepeat,
  WeekdayKey,
} from '../../types/teacherPersonal';
import {
  WEEKDAYS_META,
  getLocalDateStr,
  playAlertChime,
} from '../../utils/teacherPersonalStorage';
import {
  Bell,
  Plus,
  Trash2,
  Pencil,
  Volume2,
  VolumeX,
  BellRing,
  X,
  Clock,
  Power,
} from 'lucide-react';

interface Props {
  alerts: TeacherAlert[];
  onChange: (next: TeacherAlert[]) => void;
}

const REPEAT_LABELS: Record<TeacherAlertRepeat, string> = {
  once: 'مرة واحدة',
  daily: 'يومياً',
  weekly: 'أسبوعياً',
};

export const TeacherAlertsTab: React.FC<Props> = ({ alerts, onChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => getLocalDateStr());
  const [time, setTime] = useState('08:00');
  const [repeat, setRepeat] = useState<TeacherAlertRepeat>('once');
  const [repeatDay, setRepeatDay] = useState<WeekdayKey>('sun');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
    } catch {
      // Ignore permission rejection errors
    }
  };

  const resetForm = () => {
    setTitle('');
    setNote('');
    setDate(getLocalDateStr());
    setTime('08:00');
    setRepeat('once');
    setRepeatDay('sun');
    setSoundEnabled(true);
    setEditingId(null);
    setIsAdding(false);
  };

  const startEdit = (alert: TeacherAlert) => {
    setEditingId(alert.id);
    setTitle(alert.title);
    setNote(alert.note || '');
    setDate(alert.date || getLocalDateStr());
    setTime(alert.time || '08:00');
    setRepeat(alert.repeat);
    setRepeatDay(alert.repeatDay || 'sun');
    setSoundEnabled(alert.soundEnabled);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || !time) return;

    if (editingId) {
      onChange(
        alerts.map((a) =>
          a.id === editingId
            ? {
                ...a,
                title: cleanTitle,
                note: note.trim() || undefined,
                date,
                time,
                repeat,
                repeatDay: repeat === 'weekly' ? repeatDay : undefined,
                soundEnabled,
                lastTriggeredKey: undefined,
                snoozeUntil: undefined,
              }
            : a
        )
      );
    } else {
      const created: TeacherAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        note: note.trim() || undefined,
        date,
        time,
        repeat,
        repeatDay: repeat === 'weekly' ? repeatDay : undefined,
        soundEnabled,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      onChange([created, ...alerts]);
    }
    resetForm();
  };

  const toggleActive = (id: string) => {
    onChange(
      alerts.map((a) =>
        a.id === id
          ? { ...a, isActive: !a.isActive, snoozeUntil: undefined }
          : a
      )
    );
  };

  const deleteAlert = (id: string) => {
    onChange(alerts.filter((a) => a.id !== id));
    if (editingId === id) resetForm();
  };

  const getScheduleSummary = (alert: TeacherAlert) => {
    if (alert.repeat === 'daily') return `يومياً الساعة ${alert.time}`;
    if (alert.repeat === 'weekly') {
      const dayLabel =
        WEEKDAYS_META.find((d) => d.key === alert.repeatDay)?.label || 'الأحد';
      return `كل يوم ${dayLabel} الساعة ${alert.time}`;
    }
    return `${alert.date} · الساعة ${alert.time}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5DAC7]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="px-4 py-2 craft-btn-primary rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة تنبيه جديد</span>
          </button>

          <button
            type="button"
            onClick={playAlertChime}
            className="px-3 py-2 bg-white hover:bg-[#FAF6EC] text-[#554A3E] border border-[#D5C8B2] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="اختبار نغمة التنبيه"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#8C6544]" />
            <span>تجربة الصوت</span>
          </button>
        </div>

        {/* Optional Browser Notifications Permission */}
        {notifPermission === 'default' && (
          <button
            type="button"
            onClick={handleRequestNotificationPermission}
            className="px-3 py-1.5 bg-[#EAF3FA] hover:bg-[#DCEBF7] text-[#2C5B80] border border-[#9AC0DC] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>تفعيل إشعارات المتصفح</span>
          </button>
        )}
        {notifPermission === 'granted' && (
          <span className="text-xs font-bold text-[#2B5945]">
            إشعارات النظام مفعّلة مع التنبيهات داخل البرنامج
          </span>
        )}
      </div>

      {/* Add / Edit Alert Form */}
      {isAdding && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-[#BA916C] p-4 space-y-3.5 shadow-xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-[#2F2822]">
              {editingId ? 'تعديل التنبيه' : 'إنشاء تنبيه للمعلم'}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 text-[#6B5E51] hover:text-[#2F2822] rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#2F2822] mb-1">
                عنوان التنبيه
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: موعد تسليم درجات الشهر الأول، اجتماع أولياء الأمور..."
                className="w-full px-3 py-2 text-sm font-bold bg-[#FAF7EC] border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C]"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2F2822] mb-1">
                التكرار
              </label>
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as TeacherAlertRepeat)}
                className="w-full px-3 py-2 text-xs font-bold bg-[#FAF7EC] border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C]"
              >
                {(Object.keys(REPEAT_LABELS) as TeacherAlertRepeat[]).map((rep) => (
                  <option key={rep} value={rep}>
                    {REPEAT_LABELS[rep]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2F2822] mb-1">
                الوقت
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums font-bold bg-[#FAF7EC] border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C]"
                required
              />
            </div>

            {repeat === 'once' && (
              <div>
                <label className="block text-xs font-bold text-[#2F2822] mb-1">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums font-bold bg-[#FAF7EC] border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C]"
                  required
                />
              </div>
            )}

            {repeat === 'weekly' && (
              <div>
                <label className="block text-xs font-bold text-[#2F2822] mb-1">
                  اليوم الأسبوعي
                </label>
                <select
                  value={repeatDay}
                  onChange={(e) => setRepeatDay(e.target.value as WeekdayKey)}
                  className="w-full px-3 py-2 text-xs font-bold bg-[#FAF7EC] border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C]"
                >
                  {WEEKDAYS_META.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={repeat === 'daily' ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-bold text-[#2F2822] mb-1">
                تفاصيل إضافية (اختياري)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: إحضار دفتر المتابعة..."
                className="w-full px-3 py-2 text-xs font-semibold bg-[#FAF7EC] border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-[#554A3E] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="rounded border-[#BA916C] text-[#BA916C] focus:ring-[#BA916C]"
              />
              <span>تشغيل نغمة تنبيه صوتية عند حلول الموعد</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-1.5 text-xs font-bold text-[#554A3E] hover:bg-[#EFE8D8] rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 craft-btn-primary rounded-xl text-xs font-bold cursor-pointer"
              >
                {editingId ? 'حفظ التعديل' : 'تفعيل التنبيه'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5DAC7] py-10 px-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FDF4DF] border border-[#DFBA74] flex items-center justify-center text-[#7D5012]">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-black text-[#2F2822]">
              لا توجد تنبيهات مجدولة حالياً
            </p>
            <p className="text-xs text-[#6B5E51] mt-1">
              أنشئ تنبيهات لمواعيد الحصص، تسليم الدرجات، أو الاجتماعات لتصلك رسالة وصوت تنبيه في موعدها.
            </p>
          </div>
          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 craft-btn-primary rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء أول تنبيه</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#D5C8B2] divide-y divide-[#EDE4D3]">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 transition-colors flex items-start justify-between gap-3 ${
                alert.isActive ? 'hover:bg-[#FAF7EC]/60' : 'bg-slate-50/70 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    alert.isActive
                      ? 'bg-[#FDF4DF] border-[#DFBA74] text-[#7D5012]'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <h5 className="text-sm font-black text-[#2F2822] leading-snug">
                    {alert.title}
                  </h5>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#6B5E51] mt-1 tabular-nums">
                    <span className="inline-flex items-center gap-1 font-bold text-[#8C6544]">
                      <Clock className="w-3 h-3" />
                      <span>{getScheduleSummary(alert)}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{REPEAT_LABELS[alert.repeat]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      {alert.soundEnabled ? (
                        <>
                          <Volume2 className="w-3 h-3 text-[#4E7A68]" />
                          <span>بصوت</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3 h-3 text-slate-400" />
                          <span>صامت</span>
                        </>
                      )}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className={alert.isActive ? 'font-bold text-[#2B5945]' : 'text-slate-500'}>
                      {alert.isActive ? 'مفعّل' : 'متوقف'}
                    </span>
                  </div>
                  {alert.note && (
                    <p className="text-xs text-[#4A3F35] mt-1.5">{alert.note}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleActive(alert.id)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    alert.isActive
                      ? 'text-[#2B5945] bg-[#EAF3EE] hover:bg-[#DCECE3]'
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                  title={alert.isActive ? 'إيقاف التنبيه مؤقتاً' : 'تفعيل التنبيه'}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(alert)}
                  className="p-1.5 text-[#6B5E51] hover:text-[#2F2822] hover:bg-[#EFE8D8] rounded-lg transition-colors cursor-pointer"
                  title="تعديل"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteAlert(alert.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
