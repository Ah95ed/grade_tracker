import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../controllers/teacher_personal_controller.dart';
import '../../models/teacher_personal.dart';

/// Comprehensive modal dialog for Teacher Personal Workspace (Section 2)
/// Encapsulates: Weekly Class Schedule, Notes & Lesson Prep, and Alerts/Reminders
class TeacherPersonalWorkspaceDialog extends StatefulWidget {
  const TeacherPersonalWorkspaceDialog({super.key});

  @override
  State<TeacherPersonalWorkspaceDialog> createState() =>
      _TeacherPersonalWorkspaceDialogState();
}

class _TeacherPersonalWorkspaceDialogState
    extends State<TeacherPersonalWorkspaceDialog>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        backgroundColor: const Color(0xFFFAF7EC),
        insetPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 16.h),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20.r),
          side: const BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
        ),
        child: Container(
          width: 820.w,
          constraints: BoxConstraints(maxHeight: 780.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF4338CA), Color(0xFF3730A3)],
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                  ),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.person_pin_rounded, color: Colors.white, size: 26.r),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'المساحة الشخصية للمعلم',
                            style: TextStyle(
                              fontSize: 16.sp,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            'الجدول الأسبوعي للحصص، مفكرة الملاحظات وتحضير الدروس، والتنبيهات المجدولة',
                            style: TextStyle(
                              fontSize: 10.5.sp,
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Tab Bar
              Container(
                color: const Color(0xFFEEF2FF),
                child: TabBar(
                  controller: _tabController,
                  indicatorColor: const Color(0xFF4338CA),
                  indicatorWeight: 3,
                  labelColor: const Color(0xFF4338CA),
                  unselectedLabelColor: const Color(0xFF64748B),
                  labelStyle: TextStyle(fontSize: 12.5.sp, fontWeight: FontWeight.bold),
                  tabs: const [
                    Tab(icon: Icon(Icons.calendar_view_week_rounded), text: 'الجدول الأسبوعي'),
                    Tab(icon: Icon(Icons.sticky_note_2_rounded), text: 'الملاحظات والتحضير'),
                    Tab(icon: Icon(Icons.notifications_active_rounded), text: 'المواعيد والتنبيهات'),
                  ],
                ),
              ),

              // Tab Bar Views
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildScheduleTab(),
                    _buildNotesTab(),
                    _buildAlertsTab(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- TAB 1: Weekly Class Schedule ---
  Widget _buildScheduleTab() {
    final ctrl = context.watch<TeacherPersonalController>();
    final sched = ctrl.currentSchedule;

    if (sched == null) {
      return const Center(child: Text('لا يوجد جدول متاح.'));
    }

    final days = [
      WeekdayKey.sun,
      WeekdayKey.mon,
      WeekdayKey.tue,
      WeekdayKey.wed,
      WeekdayKey.thu,
      if (sched.showFriday) WeekdayKey.fri,
      if (sched.showSaturday) WeekdayKey.sat,
    ];

    return Padding(
      padding: EdgeInsets.all(12.r),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'جدول الحصص: ${sched.gradeLevel} - شعبة (${sched.section})',
                style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w900, color: const Color(0xFF1E293B)),
              ),
              Row(
                children: [
                  FilterChip(
                    label: const Text('السبت'),
                    selected: sched.showSaturday,
                    onSelected: (val) {
                      ctrl.updateSchedule(sched.copyWith(showSaturday: val));
                    },
                  ),
                  SizedBox(width: 6.w),
                  FilterChip(
                    label: const Text('الجمعة'),
                    selected: sched.showFriday,
                    onSelected: (val) {
                      ctrl.updateSchedule(sched.copyWith(showFriday: val));
                    },
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: 8.h),

          // Schedule Table Grid
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SingleChildScrollView(
                child: Table(
                  border: TableBorder.all(color: const Color(0xFFCBD5E1), width: 1),
                  defaultColumnWidth: FixedColumnWidth(110.w),
                  children: [
                    // Header row: Days
                    TableRow(
                      decoration: const BoxDecoration(color: Color(0xFFE2E8F0)),
                      children: [
                        Container(
                          padding: EdgeInsets.all(8.r),
                          alignment: Alignment.center,
                          child: Text('الحصة / التوقيت', style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold)),
                        ),
                        ...days.map(
                          (d) => Container(
                            padding: EdgeInsets.all(8.r),
                            alignment: Alignment.center,
                            child: Text(d.arabicLabel, style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                    // Body rows: Periods
                    ...sched.periods.map((p) {
                      return TableRow(
                        children: [
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 8.h),
                            alignment: Alignment.center,
                            color: const Color(0xFFF8FAFC),
                            child: Column(
                              children: [
                                Text(p.label, style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold)),
                                Text(p.timeRange, style: TextStyle(fontSize: 8.5.sp, color: const Color(0xFF64748B))),
                              ],
                            ),
                          ),
                          ...days.map((d) {
                            final cellKey = '${d.name}::${p.id}';
                            final subject = sched.cells[cellKey] ?? '';
                            return InkWell(
                              onTap: () => _editCellDialog(ctrl, d, p, subject),
                              child: Container(
                                height: 50.h,
                                alignment: Alignment.center,
                                color: subject.isNotEmpty ? const Color(0xFFF0FDF4) : Colors.white,
                                padding: EdgeInsets.all(4.r),
                                child: Text(
                                  subject,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 11.sp,
                                    fontWeight: FontWeight.bold,
                                    color: subject.isNotEmpty ? const Color(0xFF166534) : const Color(0xFF94A3B8),
                                  ),
                                ),
                              ),
                            );
                          }),
                        ],
                      );
                    }),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _editCellDialog(TeacherPersonalController ctrl, WeekdayKey day, SchedulePeriod period, String currentVal) {
    final textCtrl = TextEditingController(text: currentVal);
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('تعديل حصة (${period.label} - ${day.arabicLabel})'),
        content: TextField(
          controller: textCtrl,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'المادة / الصف / النشاط',
            hintText: 'مثال: رياضيات - أول أ',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              ctrl.saveScheduleCell(day.name, period.id, '');
              Navigator.pop(context);
            },
            child: const Text('مسح', style: TextStyle(color: Colors.red)),
          ),
          ElevatedButton(
            onPressed: () {
              ctrl.saveScheduleCell(day.name, period.id, textCtrl.text);
              Navigator.pop(context);
            },
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
  }

  // --- TAB 2: Notes & Lesson Prep ---
  Widget _buildNotesTab() {
    final ctrl = context.watch<TeacherPersonalController>();
    final notes = ctrl.notes;

    return Padding(
      padding: EdgeInsets.all(12.r),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'ملاحظاتي وتحضير الدروس (${notes.length})',
                style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
              ),
              ElevatedButton.icon(
                onPressed: () => _addNoteDialog(ctrl),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4338CA)),
                icon: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                label: const Text('إضافة ملاحظة', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
          SizedBox(height: 10.h),
          Expanded(
            child: notes.isEmpty
                ? const Center(child: Text('لا توجد ملاحظات مسجلة حالياً.'))
                : ListView.builder(
                    itemCount: notes.length,
                    itemBuilder: (context, idx) {
                      final n = notes[idx];
                      return Container(
                        margin: EdgeInsets.only(bottom: 8.h),
                        padding: EdgeInsets.all(12.r),
                        decoration: BoxDecoration(
                          color: n.isPinned ? const Color(0xFFFFFBEB) : Colors.white,
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(
                            color: n.isPinned ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
                            width: n.isPinned ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Checkbox(
                              value: n.isDone,
                              onChanged: (_) => ctrl.toggleDoneNote(n.id),
                            ),
                            SizedBox(width: 6.w),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        n.title,
                                        style: TextStyle(
                                          fontSize: 12.5.sp,
                                          fontWeight: FontWeight.bold,
                                          decoration: n.isDone ? TextDecoration.lineThrough : null,
                                          color: n.isDone ? const Color(0xFF94A3B8) : const Color(0xFF1E293B),
                                        ),
                                      ),
                                      SizedBox(width: 8.w),
                                      Container(
                                        padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFEFF6FF),
                                          borderRadius: BorderRadius.circular(4.r),
                                        ),
                                        child: Text(
                                          n.category.arabicLabel,
                                          style: TextStyle(fontSize: 9.sp, color: const Color(0xFF2563EB), fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (n.content.isNotEmpty) ...[
                                    SizedBox(height: 4.h),
                                    Text(
                                      n.content,
                                      style: TextStyle(fontSize: 11.sp, color: const Color(0xFF475569)),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            IconButton(
                              icon: Icon(
                                n.isPinned ? Icons.push_pin_rounded : Icons.push_pin_outlined,
                                color: n.isPinned ? const Color(0xFFD97706) : const Color(0xFF94A3B8),
                                size: 18.r,
                              ),
                              onPressed: () => ctrl.togglePinNote(n.id),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: Colors.red, size: 18),
                              onPressed: () => ctrl.deleteNote(n.id),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _addNoteDialog(TeacherPersonalController ctrl) {
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    var category = NoteCategory.general;

    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setDState) => AlertDialog(
          title: const Text('إضافة ملاحظة / تحضير'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'العنوان *'),
              ),
              SizedBox(height: 8.h),
              TextField(
                controller: contentCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'التفاصيل / ملاحظات التحضير'),
              ),
              SizedBox(height: 8.h),
              DropdownButtonFormField<NoteCategory>(
                value: category,
                decoration: const InputDecoration(labelText: 'التصنيف'),
                items: NoteCategory.values.map((c) => DropdownMenuItem(value: c, child: Text(c.arabicLabel))).toList(),
                onChanged: (val) {
                  if (val != null) setDState(() => category = val);
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
            ElevatedButton(
              onPressed: () {
                if (titleCtrl.text.trim().isEmpty) return;
                ctrl.addNote(TeacherNote(
                  id: 'note_${DateTime.now().millisecondsSinceEpoch}',
                  title: titleCtrl.text.trim(),
                  content: contentCtrl.text.trim(),
                  category: category,
                  createdAt: DateTime.now(),
                  updatedAt: DateTime.now(),
                ));
                Navigator.pop(context);
              },
              child: const Text('حفظ'),
            ),
          ],
        ),
      ),
    );
  }

  // --- TAB 3: Alerts & Reminders ---
  Widget _buildAlertsTab() {
    final ctrl = context.watch<TeacherPersonalController>();
    final alerts = ctrl.alerts;

    return Padding(
      padding: EdgeInsets.all(12.r),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'تنبيهات ومواعيد الحصص المجدولة (${alerts.length})',
                style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
              ),
              ElevatedButton.icon(
                onPressed: () => _addAlertDialog(ctrl),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4338CA)),
                icon: const Icon(Icons.alarm_add_rounded, size: 16, color: Colors.white),
                label: const Text('موعد جديد', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
          SizedBox(height: 10.h),
          Expanded(
            child: alerts.isEmpty
                ? const Center(child: Text('لا توجد تنبيهات مجدولة.'))
                : ListView.builder(
                    itemCount: alerts.length,
                    itemBuilder: (context, idx) {
                      final a = alerts[idx];
                      return Container(
                        margin: EdgeInsets.only(bottom: 8.h),
                        padding: EdgeInsets.all(12.r),
                        decoration: BoxDecoration(
                          color: a.isActive ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(
                            color: a.isActive ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              a.isActive ? Icons.alarm_on_rounded : Icons.alarm_off_rounded,
                              color: a.isActive ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                              size: 24.r,
                            ),
                            SizedBox(width: 10.w),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    a.title,
                                    style: TextStyle(fontSize: 12.5.sp, fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    'الوقت: ${a.time} • التكرار: ${a.repeat.arabicLabel}${a.repeatDay != null ? " (${a.repeatDay!.arabicLabel})" : ""}',
                                    style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF64748B)),
                                  ),
                                  if (a.note != null && a.note!.isNotEmpty)
                                    Text(a.note!, style: TextStyle(fontSize: 10.sp, color: const Color(0xFF475569))),
                                ],
                              ),
                            ),
                            Switch(
                              value: a.isActive,
                              onChanged: (_) => ctrl.toggleAlertActive(a.id),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: Colors.red, size: 18),
                              onPressed: () => ctrl.deleteAlert(a.id),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _addAlertDialog(TeacherPersonalController ctrl) {
    final titleCtrl = TextEditingController();
    final noteCtrl = TextEditingController();
    var time = '08:00';
    var repeat = AlertRepeat.once;
    WeekdayKey? repeatDay;

    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setDState) => AlertDialog(
          title: const Text('جدولة تنبيه جديد'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'عنوان التنبيه *'),
                ),
                SizedBox(height: 8.h),
                TextField(
                  controller: noteCtrl,
                  decoration: const InputDecoration(labelText: 'ملاحظة إضافية'),
                ),
                SizedBox(height: 8.h),
                ListTile(
                  title: const Text('وقت التنبيه'),
                  trailing: Text(time, style: const TextStyle(fontWeight: FontWeight.bold)),
                  onTap: () async {
                    final picked = await showTimePicker(
                      context: context,
                      initialTime: const TimeOfDay(hour: 8, minute: 0),
                    );
                    if (picked != null) {
                      setDState(() {
                        time = '${picked.hour.toString().padLeft(2, "0")}:${picked.minute.toString().padLeft(2, "0")}';
                      });
                    }
                  },
                ),
                DropdownButtonFormField<AlertRepeat>(
                  value: repeat,
                  decoration: const InputDecoration(labelText: 'التكرار'),
                  items: AlertRepeat.values.map((r) => DropdownMenuItem(value: r, child: Text(r.arabicLabel))).toList(),
                  onChanged: (val) {
                    if (val != null) setDState(() => repeat = val);
                  },
                ),
                if (repeat == AlertRepeat.weekly) ...[
                  SizedBox(height: 8.h),
                  DropdownButtonFormField<WeekdayKey>(
                    value: repeatDay ?? WeekdayKey.sun,
                    decoration: const InputDecoration(labelText: 'اليوم الأسبوعي'),
                    items: WeekdayKey.values.map((d) => DropdownMenuItem(value: d, child: Text(d.arabicLabel))).toList(),
                    onChanged: (val) {
                      if (val != null) setDState(() => repeatDay = val);
                    },
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
            ElevatedButton(
              onPressed: () {
                if (titleCtrl.text.trim().isEmpty) return;
                ctrl.addAlert(TeacherAlert(
                  id: 'alert_${DateTime.now().millisecondsSinceEpoch}',
                  title: titleCtrl.text.trim(),
                  note: noteCtrl.text.trim().isNotEmpty ? noteCtrl.text.trim() : null,
                  date: DateTime.now().toIso8601String().split('T')[0],
                  time: time,
                  repeat: repeat,
                  repeatDay: repeatDay,
                  createdAt: DateTime.now(),
                ));
                Navigator.pop(context);
              },
              child: const Text('حفظ وجدولة'),
            ),
          ],
        ),
      ),
    );
  }
}
