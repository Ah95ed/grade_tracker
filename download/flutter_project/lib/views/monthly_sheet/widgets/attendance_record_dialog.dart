import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../../controllers/monthly_sheet_controller.dart';
import '../../../models/attendance_record.dart';
import '../../../models/custom_column.dart';
import '../../../models/student_row.dart';

/// Modal dialog for Student Attendance & Absence Tracking
/// Completely matching the Daragat Web App (AttendanceRecordModal.tsx)
class AttendanceRecordDialog extends StatefulWidget {
  final StudentRow student;
  final CustomColumn column;

  const AttendanceRecordDialog({
    super.key,
    required this.student,
    required this.column,
  });

  @override
  State<AttendanceRecordDialog> createState() => _AttendanceRecordDialogState();
}

class _AttendanceRecordDialogState extends State<AttendanceRecordDialog> {
  // 'current' | 'cumulative'
  String _activeTab = 'current';

  late String _selectedDay;
  late String _selectedDate;
  final TextEditingController _noteController = TextEditingController();

  static const List<String> _arabicDays = [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    // DateTime weekday: 1 (Mon) to 7 (Sun)
    // Map DateTime to Arabic days:
    // Sunday is 7 in DateTime.
    final dayIndex = now.weekday == 7 ? 0 : now.weekday; // 0: Sun, 1: Mon, ...
    _selectedDay = _arabicDays[dayIndex % 7];

    final y = now.year.toString();
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    _selectedDate = '$y-$m-$d';
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _handleAddRecord(MonthlySheetController controller, String status) {
    final newRecord = AttendanceRecord(
      id: 'att-${DateTime.now().millisecondsSinceEpoch}-${status.hashCode % 1000}',
      date: _selectedDate,
      dayName: _selectedDay,
      status: status,
      note: _noteController.text.trim().isNotEmpty ? _noteController.text.trim() : null,
      createdAt: DateTime.now().toIso8601String(),
      modelId: controller.currentModel?.id,
      modelName: controller.currentModel?.name,
    );

    final currentRecords = List<AttendanceRecord>.from(
      widget.student.attendanceRecords[widget.column.id] ?? const [],
    )..add(newRecord);

    controller.saveStudentAttendanceRecords(
      widget.student.id,
      widget.column.id,
      currentRecords,
    );

    setState(() {
      _noteController.clear();
    });
  }

  void _handleDeleteRecord(MonthlySheetController controller, String recordId) {
    final currentRecords = List<AttendanceRecord>.from(
      widget.student.attendanceRecords[widget.column.id] ?? const [],
    )..removeWhere((r) => r.id == recordId);

    controller.saveStudentAttendanceRecords(
      widget.student.id,
      widget.column.id,
      currentRecords,
    );
    setState(() {});
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_selectedDate) ?? now,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null) {
      final dayIndex = picked.weekday == 7 ? 0 : picked.weekday;
      setState(() {
        final y = picked.year.toString();
        final m = picked.month.toString().padLeft(2, '0');
        final d = picked.day.toString().padLeft(2, '0');
        _selectedDate = '$y-$m-$d';
        _selectedDay = _arabicDays[dayIndex % 7];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final model = controller.currentModel;
    final allModels = controller.models;

    // Get live student from current model if available
    final student = model?.students.firstWhere(
          (s) => s.id == widget.student.id,
          orElse: () => widget.student,
        ) ??
        widget.student;

    final currentRecords = student.attendanceRecords[widget.column.id] ?? const [];
    final cfg = widget.column;

    // Counts for current month
    int currentAbsent = 0;
    int currentExcused = 0;
    int currentPresent = 0;

    for (final r in currentRecords) {
      if (r.status == 'absent') currentAbsent++;
      if (r.status == 'excused') currentExcused++;
      if (r.status == 'present') currentPresent++;
    }

    // Grade impact for current month
    double currentEffect = 0.0;
    if (cfg.affectsGrade) {
      if (cfg.absentAction == 'deduct') {
        currentEffect -= currentAbsent * cfg.absentPoints;
      } else if (cfg.absentAction == 'add') {
        currentEffect += currentAbsent * cfg.absentPoints;
      }

      if (cfg.excusedAction == 'deduct') {
        currentEffect -= currentExcused * cfg.excusedPoints;
      } else if (cfg.excusedAction == 'add') {
        currentEffect += currentExcused * cfg.excusedPoints;
      }

      if (cfg.presentAction == 'add') {
        currentEffect += currentPresent * cfg.presentPoints;
      } else if (cfg.presentAction == 'deduct') {
        currentEffect -= currentPresent * cfg.presentPoints;
      }
    }

    // Cumulative stats across all models
    int cumAbsent = 0;
    int cumExcused = 0;
    int cumPresent = 0;
    final List<Map<String, dynamic>> cumulativeRecords = [];

    for (final m in allModels) {
      final stInModel = m.students.firstWhere(
        (s) => s.id == student.id || s.name.trim() == student.name.trim(),
        orElse: () => const StudentRow(id: '', name: ''),
      );
      if (stInModel.id.isEmpty) continue;

      stInModel.attendanceRecords.forEach((colId, recs) {
        final col = m.customColumns.firstWhere(
          (c) => c.id == colId && c.isAttendance,
          orElse: () => const CustomColumn(id: '', name: '', maxScore: 0),
        );
        if (col.id.isNotEmpty) {
          for (final rec in recs) {
            cumulativeRecords.add({
              'record': rec,
              'modelName': m.name,
            });
            if (rec.status == 'absent') cumAbsent++;
            if (rec.status == 'excused') cumExcused++;
            if (rec.status == 'present') cumPresent++;
          }
        }
      });
    }

    final gradeText = student.gradeLevel.isNotEmpty
        ? student.gradeLevel
        : (model?.gradeLevel.isNotEmpty == true ? model!.gradeLevel : 'الأول متوسط');
    final sectionText = student.section.isNotEmpty ? student.section : 'أ';

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        insetPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 18.h),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
        child: Container(
          constraints: BoxConstraints(maxWidth: 540.w, maxHeight: 760.h),
          decoration: BoxDecoration(
            color: const Color(0xFFFAF7EC), // Craft parchment cream
            borderRadius: BorderRadius.circular(20.r),
            border: Border.all(color: const Color(0xFFD8CEBD), width: 1.2),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Header Banner matching Web App
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF355E45), Color(0xFF477C5E)],
                    begin: Alignment.centerRight,
                    end: Alignment.centerLeft,
                  ),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38.r,
                      height: 38.r,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12.r),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                      ),
                      child: Icon(Icons.calendar_month_rounded, color: const Color(0xFFFDE68A), size: 22.r),
                    ),
                    SizedBox(width: 12.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'رصد الحضور والغياب: ${student.name.isNotEmpty ? student.name : "طالب"}',
                            style: TextStyle(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(height: 3.h),
                          Text(
                            '${model?.name ?? "الشهر الأول"} • $gradeText • شعبة $sectionText',
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFFD1FAE5),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white70),
                      onPressed: () => Navigator.of(context).pop(),
                      splashRadius: 18.r,
                    ),
                  ],
                ),
              ),

              // 2. Tab Switcher
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 4.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF5EFE2),
                  border: Border(bottom: BorderSide(color: Color(0xFFD8CEBD))),
                ),
                child: Row(
                  children: [
                    _buildTabButton(
                      tabKey: 'current',
                      label: 'سجل الشهر الحالي (${model?.name ?? "الشهر الأول"})',
                      icon: null,
                    ),
                    SizedBox(width: 8.w),
                    _buildTabButton(
                      tabKey: 'cumulative',
                      label: 'السجل التراكمي (من بداية الدوام)',
                      icon: Icons.history_rounded,
                    ),
                  ],
                ),
              ),

              // 3. Scrollable Body
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
                  child: _activeTab == 'current'
                      ? _buildCurrentMonthBody(
                          controller: controller,
                          present: currentPresent,
                          excused: currentExcused,
                          absent: currentAbsent,
                          effect: currentEffect,
                          records: currentRecords,
                          cfg: cfg,
                        )
                      : _buildCumulativeBody(
                          cumAbsent: cumAbsent,
                          cumExcused: cumExcused,
                          cumPresent: cumPresent,
                          records: cumulativeRecords,
                        ),
                ),
              ),

              // 4. Footer matching Web App
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 12.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF8F4EA),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
                  border: Border(top: BorderSide(color: Color(0xFFE0D5C3))),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Text(
                        cfg.affectsGrade
                            ? '✓ حقل الغياب مرتبط بالدرجة النهائية للطالب'
                            : 'حقل الغياب توثيقي ولا يؤثر على الدرجات',
                        style: TextStyle(
                          fontSize: 11.sp,
                          fontWeight: FontWeight.bold,
                          color: cfg.affectsGrade ? const Color(0xFF065F46) : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                    SizedBox(width: 8.w),
                    InkWell(
                      onTap: () => Navigator.of(context).pop(),
                      borderRadius: BorderRadius.circular(10.r),
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 7.h),
                        decoration: BoxDecoration(
                          color: const Color(0xFFBA916C), // Craft camel brown
                          borderRadius: BorderRadius.circular(10.r),
                          border: Border.all(color: const Color(0xFF9E7752)),
                        ),
                        child: Text(
                          'إغلاق وتم',
                          style: TextStyle(
                            fontSize: 12.sp,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabButton({
    required String tabKey,
    required String label,
    IconData? icon,
  }) {
    final isSelected = _activeTab == tabKey;

    return InkWell(
      onTap: () => setState(() => _activeTab = tabKey),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? const Color(0xFF355E45) : Colors.transparent,
              width: 2.5,
            ),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 15.r, color: isSelected ? const Color(0xFF355E45) : const Color(0xFFB45309)),
              SizedBox(width: 4.w),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12.sp,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                color: isSelected ? const Color(0xFF355E45) : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentMonthBody({
    required MonthlySheetController controller,
    required int present,
    required int excused,
    required int absent,
    required double effect,
    required List<AttendanceRecord> records,
    required CustomColumn cfg,
  }) {
    final effectStr = effect > 0
        ? '+${effect.toString().replaceAll(RegExp(r'\.0$'), '')}'
        : effect.toString().replaceAll(RegExp(r'\.0$'), '');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Three Summary Cards
        Row(
          children: [
            // Present Card
            Expanded(
              child: _buildSummaryCard(
                title: 'حاضر',
                count: present,
                icon: Icons.check_circle_rounded,
                iconColor: const Color(0xFF059669),
                bgColor: const Color(0xFFECFDF5),
                borderColor: const Color(0xFFA7F3D0),
                textColor: const Color(0xFF065F46),
                footnote: cfg.affectsGrade && cfg.presentAction != 'none'
                    ? (cfg.presentAction == 'add' ? '+${cfg.presentPoints} للدرجة' : '-${cfg.presentPoints} للدرجة')
                    : null,
              ),
            ),
            SizedBox(width: 8.w),

            // Excused Card
            Expanded(
              child: _buildSummaryCard(
                title: 'مجاز',
                count: excused,
                icon: Icons.access_time_rounded,
                iconColor: const Color(0xFF2563EB),
                bgColor: const Color(0xFFEFF6FF),
                borderColor: const Color(0xFFBFDBFE),
                textColor: const Color(0xFF1E40AF),
                footnote: cfg.affectsGrade && cfg.excusedAction != 'none'
                    ? (cfg.excusedAction == 'deduct' ? '-${cfg.excusedPoints} للدرجة' : '+${cfg.excusedPoints} للدرجة')
                    : null,
              ),
            ),
            SizedBox(width: 8.w),

            // Absent Card
            Expanded(
              child: _buildSummaryCard(
                title: 'غائب',
                count: absent,
                icon: Icons.cancel_rounded,
                iconColor: const Color(0xFFE11D48),
                bgColor: const Color(0xFFFFF1F2),
                borderColor: const Color(0xFFFECDD3),
                textColor: const Color(0xFF9F1239),
                footnote: cfg.affectsGrade && cfg.absentAction != 'none'
                    ? (cfg.absentAction == 'deduct' ? '-${cfg.absentPoints.toString().replaceAll(RegExp(r'\.0$'), '')} للدرجة' : '+${cfg.absentPoints} للدرجة')
                    : null,
              ),
            ),
          ],
        ),
        SizedBox(height: 10.h),

        // 2. Grade Impact Banner
        if (cfg.affectsGrade)
          Container(
            padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
            decoration: BoxDecoration(
              color: effect < 0
                  ? const Color(0xFFFFF1F2)
                  : (effect > 0 ? const Color(0xFFECFDF5) : const Color(0xFFF8FAFC)),
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(
                color: effect < 0
                    ? const Color(0xFFFECDD3)
                    : (effect > 0 ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0)),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      effect < 0
                          ? Icons.trending_down_rounded
                          : (effect > 0 ? Icons.trending_up_rounded : Icons.info_outline_rounded),
                      size: 16.r,
                      color: effect < 0
                          ? const Color(0xFFE11D48)
                          : (effect > 0 ? const Color(0xFF059669) : const Color(0xFF64748B)),
                    ),
                    SizedBox(width: 6.w),
                    Text(
                      'التأثير الحالي على الدرجة النهائية للطالب:',
                      style: TextStyle(
                        fontSize: 11.sp,
                        fontWeight: FontWeight.bold,
                        color: effect < 0
                            ? const Color(0xFF9F1239)
                            : (effect > 0 ? const Color(0xFF065F46) : const Color(0xFF475569)),
                      ),
                    ),
                  ],
                ),
                Text(
                  '$effectStr درجة',
                  style: TextStyle(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w900,
                    color: effect < 0
                        ? const Color(0xFFE11D48)
                        : (effect > 0 ? const Color(0xFF059669) : const Color(0xFF1E293B)),
                  ),
                ),
              ],
            ),
          ),
        SizedBox(height: 12.h),

        // 3. Direct Recording Box matching Web App
        Container(
          padding: EdgeInsets.all(12.r),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16.r),
            border: Border.all(color: const Color(0xFFD8CEBD)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'تسجيل حضور أو غياب أو إجازة لليوم',
                    style: TextStyle(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2F2822),
                    ),
                  ),
                  Text(
                    'اختر الحالة للتسجيل المباشر',
                    style: TextStyle(
                      fontSize: 10.5.sp,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF7A6E5F),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 10.h),

              // Inputs: Day & Date
              Row(
                children: [
                  // Day Dropdown
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'يوم الغياب / الإجازة',
                          style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF475569)),
                        ),
                        SizedBox(height: 4.h),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 10.w),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10.r),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedDay,
                              isExpanded: true,
                              items: _arabicDays.map((d) {
                                return DropdownMenuItem<String>(
                                  value: d,
                                  child: Text(d, style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold)),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedDay = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(width: 8.w),

                  // Date Picker Field
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'تاريخ اليوم',
                          style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF475569)),
                        ),
                        SizedBox(height: 4.h),
                        InkWell(
                          onTap: _pickDate,
                          borderRadius: BorderRadius.circular(10.r),
                          child: Container(
                            padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 11.h),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(10.r),
                              border: Border.all(color: const Color(0xFFCBD5E1)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _selectedDate,
                                  style: TextStyle(
                                    fontSize: 12.sp,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF1E293B),
                                  ),
                                ),
                                Icon(Icons.calendar_today_rounded, size: 14.r, color: const Color(0xFF64748B)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              SizedBox(height: 8.h),

              // Note Input
              TextFormField(
                controller: _noteController,
                style: TextStyle(fontSize: 11.5.sp, color: const Color(0xFF1E293B)),
                decoration: InputDecoration(
                  hintText: 'ملاحظة اختيارية (عذر طبي، استئذان ولي أمر...)',
                  hintStyle: TextStyle(fontSize: 11.sp, color: const Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  contentPadding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10.r),
                    borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                  ),
                ),
              ),
              SizedBox(height: 10.h),

              // 3 Direct Action Buttons
              Row(
                children: [
                  // Present Button
                  Expanded(
                    child: _buildActionButton(
                      label: 'تسجيل حاضر',
                      icon: Icons.check_circle_outline_rounded,
                      bgColor: const Color(0xFF059669),
                      onTap: () => _handleAddRecord(controller, 'present'),
                    ),
                  ),
                  SizedBox(width: 6.w),

                  // Excused Button
                  Expanded(
                    child: _buildActionButton(
                      label: 'تسجيل مجاز (إجازة)',
                      icon: Icons.access_time_rounded,
                      bgColor: const Color(0xFF2563EB),
                      onTap: () => _handleAddRecord(controller, 'excused'),
                    ),
                  ),
                  SizedBox(width: 6.w),

                  // Absent Button
                  Expanded(
                    child: _buildActionButton(
                      label: 'تسجيل غائب (غياب)',
                      icon: Icons.highlight_off_rounded,
                      bgColor: const Color(0xFFE11D48),
                      onTap: () => _handleAddRecord(controller, 'absent'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        SizedBox(height: 14.h),

        // 4. Recorded History List for this Month
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'تواريخ الغيابات والإجازات المسجلة (${records.length} سجل)',
              style: TextStyle(
                fontSize: 12.sp,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF1E293B),
              ),
            ),
            Text(
              'تظهر الأيام والتواريخ الموثقة',
              style: TextStyle(
                fontSize: 10.5.sp,
                color: const Color(0xFF64748B),
              ),
            ),
          ],
        ),
        SizedBox(height: 6.h),

        if (records.isEmpty)
          Container(
            padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 16.h),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: const Color(0xFFD8CEBD), style: BorderStyle.solid),
            ),
            child: Center(
              child: Text(
                'لا توجد غيابات أو إجازات مسجلة لهذا الطالب حتى الآن.',
                style: TextStyle(
                  fontSize: 11.5.sp,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF64748B),
                ),
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: records.length,
            separatorBuilder: (context, index) => SizedBox(height: 6.h),
            itemBuilder: (ctx, idx) {
              final rec = records[idx];
              final isAbsent = rec.status == 'absent';
              final isExcused = rec.status == 'excused';

              final Color bgBadge = isAbsent
                  ? const Color(0xFFE11D48)
                  : (isExcused ? const Color(0xFF2563EB) : const Color(0xFF059669));
              final String statusText = isAbsent ? 'غائب' : (isExcused ? 'مجاز' : 'حاضر');

              return Container(
                padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
                decoration: BoxDecoration(
                  color: isAbsent
                      ? const Color(0xFFFFF1F2)
                      : (isExcused ? const Color(0xFFEFF6FF) : const Color(0xFFECFDF5)),
                  borderRadius: BorderRadius.circular(10.r),
                  border: Border.all(
                    color: isAbsent
                        ? const Color(0xFFFECDD3)
                        : (isExcused ? const Color(0xFFBFDBFE) : const Color(0xFFA7F3D0)),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                      decoration: BoxDecoration(
                        color: bgBadge,
                        borderRadius: BorderRadius.circular(6.r),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 9.5.sp,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    SizedBox(width: 8.w),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(
                            fontSize: 11.sp,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1E293B),
                          ),
                          children: [
                            TextSpan(text: 'يوم ${rec.dayName} '),
                            const TextSpan(text: '• ', style: TextStyle(color: Color(0xFF94A3B8))),
                            TextSpan(text: rec.date),
                            if (rec.note != null && rec.note!.isNotEmpty) ...[
                              TextSpan(
                                text: '  (${rec.note})',
                                style: const TextStyle(fontWeight: FontWeight.normal, color: Color(0xFF64748B)),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.delete_outline_rounded, size: 16.r, color: const Color(0xFFE11D48)),
                      tooltip: 'حذف هذا السجل',
                      splashRadius: 14.r,
                      onPressed: () => _handleDeleteRecord(controller, rec.id),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildCumulativeBody({
    required int cumAbsent,
    required int cumExcused,
    required int cumPresent,
    required List<Map<String, dynamic>> records,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header Box
        Container(
          padding: EdgeInsets.all(12.r),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(16.r),
            border: Border.all(color: const Color(0xFFFDE68A)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Icon(Icons.history_rounded, size: 18.r, color: const Color(0xFFB45309)),
                  SizedBox(width: 6.w),
                  Text(
                    'إجمالي الحضور والغياب والإجازات من بداية الدوام الدراسي',
                    style: TextStyle(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF78350F),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 10.h),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: EdgeInsets.all(8.r),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10.r),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Column(
                        children: [
                          Text('إجمالي الغيابات', style: TextStyle(fontSize: 10.sp, color: const Color(0xFF64748B))),
                          SizedBox(height: 2.h),
                          Text(
                            '$cumAbsent يوم',
                            style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w900, color: const Color(0xFFE11D48)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(width: 6.w),
                  Expanded(
                    child: Container(
                      padding: EdgeInsets.all(8.r),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10.r),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Column(
                        children: [
                          Text('إجمالي الإجازات', style: TextStyle(fontSize: 10.sp, color: const Color(0xFF64748B))),
                          SizedBox(height: 2.h),
                          Text(
                            '$cumExcused يوم',
                            style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w900, color: const Color(0xFF2563EB)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(width: 6.w),
                  Expanded(
                    child: Container(
                      padding: EdgeInsets.all(8.r),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10.r),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Column(
                        children: [
                          Text('إجمالي الحضور', style: TextStyle(fontSize: 10.sp, color: const Color(0xFF64748B))),
                          SizedBox(height: 2.h),
                          Text(
                            '$cumPresent يوم',
                            style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w900, color: const Color(0xFF059669)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        SizedBox(height: 14.h),

        // List
        Text(
          'تفاصيل السجلات الموثقة عبر كافة الجداول والأشهر (${records.length} سجل)',
          style: TextStyle(
            fontSize: 12.sp,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF1E293B),
          ),
        ),
        SizedBox(height: 6.h),

        if (records.isEmpty)
          Container(
            padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 16.h),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Center(
              child: Text(
                'لا توجد سجلات تراكمية حتى الآن لهذا الطالب في أي جدول.',
                style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: records.length,
            separatorBuilder: (context, index) => SizedBox(height: 6.h),
            itemBuilder: (ctx, idx) {
              final item = records[idx];
              final rec = item['record'] as AttendanceRecord;
              final modelName = item['modelName'] as String;

              final isAbsent = rec.status == 'absent';
              final isExcused = rec.status == 'excused';

              final Color bgBadge = isAbsent
                  ? const Color(0xFFE11D48)
                  : (isExcused ? const Color(0xFF2563EB) : const Color(0xFF059669));
              final String statusText = isAbsent ? 'غائب' : (isExcused ? 'مجاز' : 'حاضر');

              return Container(
                padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10.r),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                      decoration: BoxDecoration(
                        color: bgBadge,
                        borderRadius: BorderRadius.circular(6.r),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 9.5.sp,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    SizedBox(width: 8.w),
                    Expanded(
                      child: Text(
                        'يوم ${rec.dayName} (${rec.date})${rec.note != null ? " - ${rec.note}" : ""}',
                        style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                      ),
                    ),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAF3E0),
                        borderRadius: BorderRadius.circular(6.r),
                        border: Border.all(color: const Color(0xFFBA916C).withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        modelName,
                        style: TextStyle(
                          fontSize: 9.5.sp,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFFBA916C),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required int count,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required Color borderColor,
    required Color textColor,
    String? footnote,
  }) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 8.h),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14.r, color: iconColor),
              SizedBox(width: 4.w),
              Text(
                title,
                style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: textColor),
              ),
            ],
          ),
          SizedBox(height: 3.h),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: '$count ',
                  style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w900, color: textColor),
                ),
                TextSpan(
                  text: 'يوم',
                  style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: textColor),
                ),
              ],
            ),
          ),
          if (footnote != null) ...[
            SizedBox(height: 2.h),
            Text(
              footnote,
              style: TextStyle(fontSize: 9.5.sp, fontWeight: FontWeight.w900, color: textColor),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12.r),
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 8.h),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12.r),
          boxShadow: [
            BoxShadow(
              color: bgColor.withValues(alpha: 0.25),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          children: [
            Icon(icon, size: 16.r, color: Colors.white),
            SizedBox(height: 3.h),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 10.5.sp,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

