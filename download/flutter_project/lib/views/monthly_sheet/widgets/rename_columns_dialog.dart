import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/monthly_model.dart';
import '../../common/custom_button.dart';

/// Default column titles matching Daragat web app specifications
class DefaultColumnTitles {
  static const String studentName = 'اسم الطالب';
  static const String gradeLevel = 'الصف';
  static const String section = 'الشعبة';
  static const String subject = 'المادة';
  static const String writtenExam = 'درجة التحريري بالورقة من';
  static const String finalScore = 'الدرجة النهائية من';
  static const String rating = 'التقدير';
}

/// Dialog allowing full customization and renaming of all table column titles
class RenameColumnsDialog extends StatefulWidget {
  final MonthlyModel model;
  final String? initialFocusKey;

  const RenameColumnsDialog({
    super.key,
    required this.model,
    this.initialFocusKey,
  });

  @override
  State<RenameColumnsDialog> createState() => _RenameColumnsDialogState();
}

class _RenameColumnsDialogState extends State<RenameColumnsDialog> {
  late final TextEditingController _studentNameController;
  late final TextEditingController _gradeLevelController;
  late final TextEditingController _sectionController;
  late final TextEditingController _subjectController;
  late final TextEditingController _writtenExamController;
  late final TextEditingController _finalScoreController;
  late final TextEditingController _ratingController;

  late final Map<String, TextEditingController> _customControllers;

  @override
  void initState() {
    super.initState();
    final labels = widget.model.columnLabels;
    _studentNameController = TextEditingController(
      text: labels['studentName'] ?? '',
    );
    _gradeLevelController = TextEditingController(
      text: labels['gradeLevel'] ?? '',
    );
    _sectionController = TextEditingController(
      text: labels['section'] ?? '',
    );
    _subjectController = TextEditingController(
      text: labels['subject'] ?? '',
    );
    _writtenExamController = TextEditingController(
      text: labels['writtenExam'] ?? '',
    );
    _finalScoreController = TextEditingController(
      text: labels['finalScore'] ?? '',
    );
    _ratingController = TextEditingController(
      text: labels['rating'] ?? '',
    );

    _customControllers = {
      for (final col in widget.model.customColumns)
        col.id: TextEditingController(text: col.name)
    };
  }

  @override
  void dispose() {
    _studentNameController.dispose();
    _gradeLevelController.dispose();
    _sectionController.dispose();
    _subjectController.dispose();
    _writtenExamController.dispose();
    _finalScoreController.dispose();
    _ratingController.dispose();
    for (final c in _customControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _resetToDefault() {
    setState(() {
      _studentNameController.text = DefaultColumnTitles.studentName;
      _gradeLevelController.text = DefaultColumnTitles.gradeLevel;
      _sectionController.text = DefaultColumnTitles.section;
      _subjectController.text = DefaultColumnTitles.subject;
      _writtenExamController.text = DefaultColumnTitles.writtenExam;
      _finalScoreController.text = DefaultColumnTitles.finalScore;
      _ratingController.text = DefaultColumnTitles.rating;
    });
  }

  void _save(MonthlySheetController controller) {
    final Map<String, String> updatedLabels = {
      'studentName': _studentNameController.text.trim().isEmpty
          ? DefaultColumnTitles.studentName
          : _studentNameController.text.trim(),
      'gradeLevel': _gradeLevelController.text.trim().isEmpty
          ? DefaultColumnTitles.gradeLevel
          : _gradeLevelController.text.trim(),
      'section': _sectionController.text.trim().isEmpty
          ? DefaultColumnTitles.section
          : _sectionController.text.trim(),
      'subject': _subjectController.text.trim().isEmpty
          ? DefaultColumnTitles.subject
          : _subjectController.text.trim(),
      'writtenExam': _writtenExamController.text.trim().isEmpty
          ? DefaultColumnTitles.writtenExam
          : _writtenExamController.text.trim(),
      'finalScore': _finalScoreController.text.trim().isEmpty
          ? DefaultColumnTitles.finalScore
          : _finalScoreController.text.trim(),
      'rating': _ratingController.text.trim().isEmpty
          ? DefaultColumnTitles.rating
          : _ratingController.text.trim(),
    };

    controller.setColumnLabels(updatedLabels);

    // Also update custom columns if modified
    for (final col in widget.model.customColumns) {
      final newName = _customControllers[col.id]?.text.trim();
      if (newName != null && newName.isNotEmpty && newName != col.name) {
        controller.updateCustomColumn(col.id, name: newName);
      }
    }

    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.read<MonthlySheetController>();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        insetPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 24.h),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18.r)),
        child: Container(
          width: 520.w,
          constraints: BoxConstraints(maxHeight: 650.h),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18.r),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header banner matching Daragat
              Container(
                padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 14.h),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1D4ED8), Color(0xFF3730A3)],
                    begin: Alignment.centerRight,
                    end: Alignment.centerLeft,
                  ),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(18.r)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(7.r),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10.r),
                      ),
                      child: Icon(Icons.edit_note_rounded, color: Colors.white, size: 20.r),
                    ),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'إعادة تسمية عناوين أعمدة الجدول',
                            style: TextStyle(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(height: 2.h),
                          Text(
                            'تخصيص أسماء الأعمدة في الكشف والطباعة وتصدير الملفات',
                            style: TextStyle(
                              fontSize: 11.sp,
                              color: const Color(0xFFDBEAFE),
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

              // Scrollable body
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Notice Tip
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10.r),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.lightbulb_outline_rounded, color: const Color(0xFF1D4ED8), size: 16.r),
                            SizedBox(width: 8.w),
                            Expanded(
                              child: Text(
                                'يمكنك كتابة الاسم المفضل لكل عمود كما ترغب أن يظهر في الجدول وفي الطباعة وفي تصدير الملفات.',
                                style: TextStyle(
                                  fontSize: 11.5.sp,
                                  color: const Color(0xFF1E3A8A),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 14.h),

                      // Student Name
                      _buildField(
                        label: 'عنوان عمود اسم الطالب:',
                        controller: _studentNameController,
                        hint: DefaultColumnTitles.studentName,
                      ),
                      SizedBox(height: 12.h),

                      // Grade Level & Section Row
                      Row(
                        children: [
                          Expanded(
                            child: _buildField(
                              label: 'عنوان عمود الصف:',
                              controller: _gradeLevelController,
                              hint: DefaultColumnTitles.gradeLevel,
                            ),
                          ),
                          SizedBox(width: 10.w),
                          Expanded(
                            child: _buildField(
                              label: 'عنوان عمود الشعبة:',
                              controller: _sectionController,
                              hint: DefaultColumnTitles.section,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 12.h),

                      // Subject
                      _buildField(
                        label: 'عنوان عمود المادة:',
                        controller: _subjectController,
                        hint: DefaultColumnTitles.subject,
                      ),
                      SizedBox(height: 12.h),

                      // Written Exam Column
                      Container(
                        padding: EdgeInsets.all(12.r),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Wrap(
                              alignment: WrapAlignment.spaceBetween,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8.w,
                              runSpacing: 4.h,
                              children: [
                                Text(
                                  'عنوان عمود الامتحان التحريري:',
                                  style: TextStyle(
                                    fontSize: 12.sp,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF92400E),
                                  ),
                                ),
                                Text(
                                  'الافتراضي: درجة التحريري بالورقة من',
                                  style: TextStyle(
                                    fontSize: 10.sp,
                                    color: const Color(0xFFB45309),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 6.h),
                            TextFormField(
                              controller: _writtenExamController,
                              style: TextStyle(
                                fontSize: 12.5.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF1E293B),
                              ),
                              decoration: InputDecoration(
                                hintText: DefaultColumnTitles.writtenExam,
                                filled: true,
                                fillColor: Colors.white,
                                contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 9.h),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8.r),
                                  borderSide: const BorderSide(color: Color(0xFFFBBF24)),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8.r),
                                  borderSide: const BorderSide(color: Color(0xFFFCD34D)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8.r),
                                  borderSide: const BorderSide(color: Color(0xFFD97706), width: 1.5),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 12.h),

                      // Final Score & Rating
                      Row(
                        children: [
                          Expanded(
                            child: _buildField(
                              label: 'عنوان عمود الدرجة النهائية:',
                              controller: _finalScoreController,
                              hint: DefaultColumnTitles.finalScore,
                            ),
                          ),
                          SizedBox(width: 10.w),
                          Expanded(
                            child: _buildField(
                              label: 'عنوان عمود التقدير:',
                              controller: _ratingController,
                              hint: DefaultColumnTitles.rating,
                            ),
                          ),
                        ],
                      ),

                      // Custom Columns (if any)
                      if (widget.model.customColumns.isNotEmpty) ...[
                        SizedBox(height: 14.h),
                        Container(
                          padding: EdgeInsets.all(12.r),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12.r),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.style_rounded, size: 14.r, color: const Color(0xFF2563EB)),
                                  SizedBox(width: 6.w),
                                  Text(
                                    'عناوين الأعمدة الإضافية المخصصة:',
                                    style: TextStyle(
                                      fontSize: 12.sp,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF334155),
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 8.h),
                              ...widget.model.customColumns.map((col) {
                                final c = _customControllers[col.id];
                                if (c == null) return const SizedBox.shrink();
                                return Padding(
                                  padding: EdgeInsets.only(bottom: 8.h),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFE2E8F0),
                                          borderRadius: BorderRadius.circular(6.r),
                                        ),
                                        child: Text(
                                          '(درجة: ${col.maxScore.toInt()})',
                                          style: TextStyle(
                                            fontSize: 11.sp,
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFF475569),
                                          ),
                                        ),
                                      ),
                                      SizedBox(width: 8.w),
                                      Expanded(
                                        child: TextFormField(
                                          controller: c,
                                          style: TextStyle(
                                            fontSize: 12.sp,
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFF1E293B),
                                          ),
                                          decoration: InputDecoration(
                                            filled: true,
                                            fillColor: Colors.white,
                                            contentPadding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                                            border: OutlineInputBorder(
                                              borderRadius: BorderRadius.circular(8.r),
                                              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Footer actions
              Container(
                padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 12.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(18.r)),
                  border: const Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                ),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 10.w,
                  runSpacing: 8.h,
                  children: [
                    // Reset to default button
                    TextButton.icon(
                      onPressed: _resetToDefault,
                      icon: Icon(Icons.restore_rounded, size: 16.r, color: const Color(0xFF64748B)),
                      label: Text(
                        'استعادة العناوين الافتراضية',
                        style: TextStyle(
                          fontSize: 11.5.sp,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ),

                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CustomButton(
                          label: 'إلغاء',
                          isOutlined: true,
                          textColor: AppColors.textSecondary,
                          borderColor: const Color(0xFFCBD5E1),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                        SizedBox(width: 8.w),
                        CustomButton(
                          label: 'حفظ التسميات',
                          backgroundColor: const Color(0xFF1D4ED8),
                          onPressed: () => _save(controller),
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
    );
  }

  Widget _buildField({
    required String label,
    required TextEditingController controller,
    required String hint,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11.5.sp,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF334155),
          ),
        ),
        SizedBox(height: 5.h),
        TextFormField(
          controller: controller,
          style: TextStyle(
            fontSize: 12.5.sp,
            fontWeight: FontWeight.bold,
            color: const Color(0xFF1E293B),
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              fontSize: 12.sp,
              color: const Color(0xFF94A3B8),
            ),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 9.h),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10.r),
              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10.r),
              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10.r),
              borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
