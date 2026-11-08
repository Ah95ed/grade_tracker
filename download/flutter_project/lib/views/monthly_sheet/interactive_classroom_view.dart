import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../controllers/monthly_sheet_controller.dart';
import '../../models/custom_column.dart';
import '../../models/student_row.dart';
import 'widgets/add_column_dialog.dart';

/// Interactive Classroom & Oral Exam Mode matching Daragat Web App
class InteractiveClassroomView extends StatefulWidget {
  const InteractiveClassroomView({super.key});

  @override
  State<InteractiveClassroomView> createState() => _InteractiveClassroomViewState();
}

class _InteractiveClassroomViewState extends State<InteractiveClassroomView> {
  int _currentIndex = 0;
  String? _selectedColumnId;
  final TextEditingController _scoreInputController = TextEditingController();

  @override
  void dispose() {
    _scoreInputController.dispose();
    super.dispose();
  }

  void _setScore(MonthlySheetController controller, StudentRow student, double score, double maxScore) {
    if (_selectedColumnId == null) return;
    final clamped = score.clamp(0.0, maxScore);
    controller.updateStudentScore(
      student.id,
      colId: _selectedColumnId,
      colScore: clamped,
    );
    _scoreInputController.text = clamped.toInt().toString();
  }

  void _adjustScore(MonthlySheetController controller, StudentRow student, double delta, double maxScore) {
    if (_selectedColumnId == null) return;
    final current = student.scores[_selectedColumnId] ?? 0.0;
    _setScore(controller, student, current + delta, maxScore);
  }

  void _pickRandomStudent(List<StudentRow> students) {
    if (students.isEmpty) return;
    final random = Random();
    int nextIdx;
    if (students.length == 1) {
      nextIdx = 0;
    } else {
      do {
        nextIdx = random.nextInt(students.length);
      } while (nextIdx == _currentIndex);
    }
    setState(() {
      _currentIndex = nextIdx;
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final model = controller.currentModel;

    if (model == null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_forward_rounded),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: const Text('الصف التفاعلي'),
        ),
        body: const Center(child: Text('لا يوجد نموذج درجات حالي')),
      );
    }

    final students = controller.filteredStudents;
    final columns = model.customColumns;

    // Default to first oral/custom column if none selected
    if (_selectedColumnId == null && columns.isNotEmpty) {
      _selectedColumnId = columns.first.id;
    }

    final activeColumn = columns.firstWhere(
      (c) => c.id == _selectedColumnId,
      orElse: () => columns.isNotEmpty
          ? columns.first
          : const CustomColumn(id: 'col_oral', name: 'درجة الشفهي', maxScore: 20),
    );

    if (_currentIndex >= students.length && students.isNotEmpty) {
      _currentIndex = 0;
    }

    final currentStudent = students.isNotEmpty ? students[_currentIndex] : null;
    final currentScore = currentStudent?.scores[activeColumn.id];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFFF5EFE3), // Craft cream parchment
        appBar: AppBar(
          backgroundColor: const Color(0xFFEBDDC8),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_forward_rounded, color: Color(0xFF4A3D30)),
            tooltip: 'العودة لجدول الدرجات',
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Row(
            children: [
              Container(
                padding: EdgeInsets.all(6.r),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(8.r),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Icon(Icons.bookmark_added_rounded, size: 16.r, color: const Color(0xFF059669)),
              ),
              SizedBox(width: 8.w),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'الصف التفاعلي (رصد الامتحان الشفهي)',
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2F2822),
                    ),
                  ),
                  Text(
                    '${model.name} | ${model.subject.isNotEmpty ? model.subject : ""} - ${model.gradeLevel}',
                    style: TextStyle(
                      fontSize: 10.5.sp,
                      color: const Color(0xFF6D4C2F),
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            // Random student button
            if (students.isNotEmpty)
              Padding(
                padding: EdgeInsets.symmetric(vertical: 8.h),
                child: ElevatedButton.icon(
                  onPressed: () => _pickRandomStudent(students),
                  icon: Icon(Icons.shuffle_rounded, size: 16.r, color: Colors.white),
                  label: Text('طالب عشوائي (قرعة)', style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD97706),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                  ),
                ),
              ),
            SizedBox(width: 8.w),
          ],
        ),
        body: SafeArea(
          child: students.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline_rounded, size: 48.r, color: const Color(0xFFBA916C)),
                      SizedBox(height: 12.h),
                      Text(
                        'لا يوجد طلاب مسجلين في هذه الشعبة',
                        style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.bold, color: const Color(0xFF4A3D30)),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 1. Column Selection Ribbon (Oral, Behavior, Activity, etc.)
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(color: const Color(0xFFD8CEBD)),
                        ),
                        child: Row(
                          children: [
                            Text(
                              'الحقل المرصود حالياً:',
                              style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.w800, color: const Color(0xFF4A3D30)),
                            ),
                            SizedBox(width: 8.w),
                            Expanded(
                              child: SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: [
                                    ...columns.map((col) {
                                      final isSelected = col.id == _selectedColumnId;
                                      return Padding(
                                        padding: EdgeInsets.symmetric(horizontal: 3.w),
                                        child: InkWell(
                                          onTap: () => setState(() => _selectedColumnId = col.id),
                                          borderRadius: BorderRadius.circular(8.r),
                                          child: Container(
                                            padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 5.h),
                                            decoration: BoxDecoration(
                                              color: isSelected ? const Color(0xFF2B6CB0) : const Color(0xFFF1F5F9),
                                              borderRadius: BorderRadius.circular(8.r),
                                              border: Border.all(
                                                color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFFCBD5E1),
                                              ),
                                            ),
                                            child: Text(
                                              '${col.name} (${col.maxScore.toInt()})',
                                              style: TextStyle(
                                                fontSize: 11.sp,
                                                fontWeight: FontWeight.bold,
                                                color: isSelected ? Colors.white : const Color(0xFF1E293B),
                                              ),
                                            ),
                                          ),
                                        ),
                                      );
                                    }),
                                    // Add column shortcut if needed
                                    Padding(
                                      padding: EdgeInsets.symmetric(horizontal: 4.w),
                                      child: InkWell(
                                        onTap: () => showDialog(
                                          context: context,
                                          builder: (_) => const AddColumnDialog(),
                                        ),
                                        child: Container(
                                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF0FDF4),
                                            borderRadius: BorderRadius.circular(8.r),
                                            border: Border.all(color: const Color(0xFF86EFAC)),
                                          ),
                                          child: Row(
                                            children: [
                                              Icon(Icons.add, size: 14.r, color: const Color(0xFF15803D)),
                                              SizedBox(width: 3.w),
                                              Text('حقل جديد', style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF15803D))),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 12.h),

                      // 2. Main Interactive Student Card
                      Container(
                        padding: EdgeInsets.all(20.r),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18.r),
                          border: Border.all(color: const Color(0xFFD5C8B2), width: 1.2),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF5A4128).withValues(alpha: 0.08),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            // Student progress banner
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 3.h),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(8.r),
                                    border: Border.all(color: const Color(0xFFBFDBFE)),
                                  ),
                                  child: Text(
                                    'طالب ${_currentIndex + 1} من ${students.length}',
                                    style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.w900, color: const Color(0xFF1E40AF)),
                                  ),
                                ),
                                Container(
                                  padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 3.h),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(8.r),
                                    border: Border.all(color: const Color(0xFFFDE68A)),
                                  ),
                                  child: Text(
                                    'شعبة ${currentStudent?.section ?? "-"}',
                                    style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.w900, color: const Color(0xFF92400E)),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 16.h),

                            // Student Avatar & Name
                            Container(
                              width: 70.r,
                              height: 70.r,
                              decoration: BoxDecoration(
                                color: const Color(0xFFE0EDF8),
                                shape: BoxShape.circle,
                                border: Border.all(color: const Color(0xFF3A6C8F), width: 2),
                              ),
                              child: Center(
                                child: Text(
                                  currentStudent != null && currentStudent.name.isNotEmpty
                                      ? currentStudent.name.trim().substring(0, 1)
                                      : '؟',
                                  style: TextStyle(fontSize: 28.sp, fontWeight: FontWeight.w900, color: const Color(0xFF1E3A8A)),
                                ),
                              ),
                            ),
                            SizedBox(height: 10.h),
                            Text(
                              currentStudent?.name ?? '',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 20.sp,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF1E293B),
                              ),
                            ),
                            SizedBox(height: 12.h),

                            // Current Score Display Badge
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 8.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFAF7EC),
                                borderRadius: BorderRadius.circular(12.r),
                                border: Border.all(color: const Color(0xFFBA916C)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '${activeColumn.name}: ',
                                    style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold, color: const Color(0xFF4A3D30)),
                                  ),
                                  Text(
                                    currentScore != null ? currentScore.toStringAsFixed(1).replaceAll('.0', '') : 'لم تُرصد',
                                    style: TextStyle(
                                      fontSize: 18.sp,
                                      fontWeight: FontWeight.w900,
                                      color: currentScore != null ? const Color(0xFF15803D) : const Color(0xFFB45309),
                                    ),
                                  ),
                                  Text(
                                    ' / ${activeColumn.maxScore.toInt()}',
                                    style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(height: 16.h),

                            // Quick Delta Increment / Decrement Buttons
                            Wrap(
                              spacing: 8.w,
                              runSpacing: 6.h,
                              alignment: WrapAlignment.center,
                              children: [
                                _buildActionButton(
                                  label: '+1',
                                  color: const Color(0xFF10B981),
                                  onTap: () => _adjustScore(controller, currentStudent!, 1.0, activeColumn.maxScore),
                                ),
                                _buildActionButton(
                                  label: '+2',
                                  color: const Color(0xFF059669),
                                  onTap: () => _adjustScore(controller, currentStudent!, 2.0, activeColumn.maxScore),
                                ),
                                _buildActionButton(
                                  label: '+5',
                                  color: const Color(0xFF047857),
                                  onTap: () => _adjustScore(controller, currentStudent!, 5.0, activeColumn.maxScore),
                                ),
                                _buildActionButton(
                                  label: '-1',
                                  color: const Color(0xFFEF4444),
                                  onTap: () => _adjustScore(controller, currentStudent!, -1.0, activeColumn.maxScore),
                                ),
                                _buildActionButton(
                                  label: 'صفر',
                                  color: const Color(0xFF6B7280),
                                  onTap: () => _setScore(controller, currentStudent!, 0.0, activeColumn.maxScore),
                                ),
                                _buildActionButton(
                                  label: 'الدرجة الكاملة (${activeColumn.maxScore.toInt()})',
                                  color: const Color(0xFF2563EB),
                                  onTap: () => _setScore(controller, currentStudent!, activeColumn.maxScore, activeColumn.maxScore),
                                ),
                              ],
                            ),
                            SizedBox(height: 16.h),

                            // Direct Score Keypad Shortcut Pills
                            Wrap(
                              spacing: 6.w,
                              runSpacing: 6.h,
                              alignment: WrapAlignment.center,
                              children: [5, 8, 10, 12, 14, 15, 16, 18, 20]
                                  .where((s) => s <= activeColumn.maxScore)
                                  .map((score) {
                                return InkWell(
                                  onTap: () => _setScore(controller, currentStudent!, score.toDouble(), activeColumn.maxScore),
                                  borderRadius: BorderRadius.circular(8.r),
                                  child: Container(
                                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 5.h),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(8.r),
                                      border: Border.all(color: const Color(0xFFCBD5E1)),
                                    ),
                                    child: Text(
                                      '$score',
                                      style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: const Color(0xFF1E293B)),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                            SizedBox(height: 20.h),

                            // Navigation controls: Previous & Next Student
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                ElevatedButton.icon(
                                  onPressed: _currentIndex > 0
                                      ? () => setState(() => _currentIndex--)
                                      : null,
                                  icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                                  label: const Text('الطالب السابق'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFE2E8F0),
                                    foregroundColor: const Color(0xFF1E293B),
                                    padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
                                  ),
                                ),
                                ElevatedButton.icon(
                                  onPressed: _currentIndex < students.length - 1
                                      ? () => setState(() => _currentIndex++)
                                      : null,
                                  icon: const Icon(Icons.arrow_back_rounded, size: 16),
                                  label: const Text('الطالب التالي'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF2B6CB0),
                                    foregroundColor: Colors.white,
                                    padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8.r),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(8.r),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.3),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5.sp,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}
