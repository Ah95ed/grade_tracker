import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/student_row.dart';
import '../../../models/monthly_model.dart';
import '../../../models/custom_column.dart';
import '../../../core/utils/grade_calculator.dart';
import '../../common/rating_badge.dart';
import 'add_student_dialog.dart';
import 'add_column_dialog.dart';
import 'attendance_record_dialog.dart';
import 'final_operation_dialog.dart';
import 'rename_columns_dialog.dart';

/// Computed column widths for the interactive table
class _TableWidths {
  final double delete;
  final double index;
  final double name;
  final double grade;
  final double section;
  final double subject;
  final double written;
  final double customCol;
  final double addCol;
  final double finalScore;
  final double totalWidth;

  const _TableWidths({
    required this.delete,
    required this.index,
    required this.name,
    required this.grade,
    required this.section,
    required this.subject,
    required this.written,
    required this.customCol,
    required this.addCol,
    required this.finalScore,
    required this.totalWidth,
  });

  factory _TableWidths.calculate({
    required double availableWidth,
    required int customColumnCount,
  }) {
    final baseDelete = 48.w;
    final baseIndex = 46.w;
    final baseName = 225.w;
    final baseGrade = 80.w;
    final baseSection = 70.w;
    final baseSubject = 75.w;
    final baseWritten = 265.w;
    final baseCustom = 135.w;
    final baseAddCol = 115.w;
    final baseFinal = 295.w;

    final minTotal = baseDelete +
        baseIndex +
        baseName +
        baseGrade +
        baseSection +
        baseSubject +
        baseWritten +
        (customColumnCount * baseCustom) +
        baseAddCol +
        baseFinal;

    if (availableWidth > minTotal) {
      final extra = availableWidth - minTotal;
      // Proportional expansion weights
      const wName = 3.5;
      const wWritten = 2.5;
      const wFinal = 2.5;
      const wGrade = 0.5;
      const wSection = 0.5;
      const wSubject = 0.5;
      const totalW = wName + wWritten + wFinal + wGrade + wSection + wSubject;

      return _TableWidths(
        delete: baseDelete,
        index: baseIndex,
        name: baseName + (wName / totalW) * extra,
        grade: baseGrade + (wGrade / totalW) * extra,
        section: baseSection + (wSection / totalW) * extra,
        subject: baseSubject + (wSubject / totalW) * extra,
        written: baseWritten + (wWritten / totalW) * extra,
        customCol: baseCustom,
        addCol: baseAddCol,
        finalScore: baseFinal + (wFinal / totalW) * extra,
        totalWidth: availableWidth,
      );
    } else {
      return _TableWidths(
        delete: baseDelete,
        index: baseIndex,
        name: baseName,
        grade: baseGrade,
        section: baseSection,
        subject: baseSubject,
        written: baseWritten,
        customCol: baseCustom,
        addCol: baseAddCol,
        finalScore: baseFinal,
        totalWidth: minTotal,
      );
    }
  }
}

/// Full-fidelity Interactive Data Table matching Daragat Web App screenshot
class StudentDataTable extends StatefulWidget {
  const StudentDataTable({super.key});

  @override
  State<StudentDataTable> createState() => _StudentDataTableState();
}

class _StudentDataTableState extends State<StudentDataTable> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final model = controller.currentModel;

    if (model == null) {
      return Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 40.h),
          child: Text(
            'لا يوجد أي جدول درجات حالياً. أنشئ جدولاً جديداً للبدء.',
            style: TextStyle(fontSize: 14.sp, color: AppColors.textMuted),
          ),
        ),
      );
    }

    final students = controller.filteredStudents;
    final totalAllocated = model.writtenMaxScore +
        model.customColumns.fold<double>(0.0, (sum, c) => sum + c.maxScore);
    final isComplete = totalAllocated.toInt() == model.totalMaxScore.toInt();
    final customColumns = model.customColumns;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 14.w),
        decoration: BoxDecoration(
          color: const Color(0xFFFAF7EC), // #FAF7EC
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(16.r)),
          border: const Border(
            left: BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
            right: BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
            bottom: BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF5A4128).withValues(alpha: 0.05),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(16.r)),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final widths = _TableWidths.calculate(
                availableWidth: constraints.maxWidth,
                customColumnCount: customColumns.length,
              );
              final isOverflowing = widths.totalWidth > constraints.maxWidth;

              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Horizontal scroll navigation ribbon when there are extra columns
                  if (isOverflowing)
                    _buildScrollNavigationRibbon(context, customColumns.length),

                  RawScrollbar(
                    controller: _scrollController,
                    thumbVisibility: true,
                    trackVisibility: true,
                    interactive: true,
                    thickness: 9.h,
                    radius: Radius.circular(6.r),
                    thumbColor: const Color(0xFFBA916C).withValues(alpha: 0.85),
                    trackColor: const Color(0xFFEFE8D8),
                    trackBorderColor: const Color(0xFFD5C8B2),
                    child: SingleChildScrollView(
                      controller: _scrollController,
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                      child: SizedBox(
                        width: widths.totalWidth,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // 1. Table Header Row (uniform height for all columns)
                            _buildTableHeader(
                              context,
                              model,
                              controller,
                              totalAllocated,
                              isComplete,
                              widths,
                            ),

                            // 2. Table Body: Either Empty State OR Student Rows
                            if (students.isEmpty)
                              _buildEmptyState(context, model, widths.totalWidth)
                            else
                              ...students.asMap().entries.map((entry) {
                                final idx = entry.key;
                                final student = entry.value;
                                return _buildStudentRow(
                                  context,
                                  student,
                                  model,
                                  controller,
                                  idx,
                                  widths,
                                );
                              }),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  /// Ribbon indicating horizontal overflow with quick scroll buttons
  Widget _buildScrollNavigationRibbon(BuildContext context, int customCount) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
      decoration: const BoxDecoration(
        color: Color(0xFFF3ECE0),
        border: Border(bottom: BorderSide(color: Color(0xFFD5C8B2))),
      ),
      child: Row(
        children: [
          const Icon(Icons.swap_horiz_rounded, size: 16, color: Color(0xFFBA916C)),
          SizedBox(width: 4.w),
          Expanded(
            child: Text(
              customCount > 0
                  ? 'الجدول عريض ($customCount حقول إضافية) — اسحب بالماوس أو اضغط للتمرير'
                  : 'يمكنك سحب الجدول بالماوس أو التمرير يميناً ويساراً',
              style: TextStyle(
                fontSize: 11.sp,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF5A4128),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          SizedBox(width: 8.w),
          InkWell(
            onTap: () {
              if (_scrollController.hasClients) {
                _scrollController.animateTo(
                  (_scrollController.offset - 250).clamp(0.0, _scrollController.position.maxScrollExtent),
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOut,
                );
              }
            },
            borderRadius: BorderRadius.circular(6.r),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6.r),
                border: Border.all(color: const Color(0xFFD5C8B2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.chevron_right_rounded, size: 15.r, color: const Color(0xFF2F2822)),
                  SizedBox(width: 2.w),
                  Text(
                    'يمين',
                    style: TextStyle(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2F2822),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(width: 6.w),
          InkWell(
            onTap: () {
              if (_scrollController.hasClients) {
                _scrollController.animateTo(
                  (_scrollController.offset + 250).clamp(0.0, _scrollController.position.maxScrollExtent),
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOut,
                );
              }
            },
            borderRadius: BorderRadius.circular(6.r),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6.r),
                border: Border.all(color: const Color(0xFFD5C8B2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'يسار',
                    style: TextStyle(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2F2822),
                    ),
                  ),
                  SizedBox(width: 2.w),
                  Icon(Icons.chevron_left_rounded, size: 15.r, color: const Color(0xFF2F2822)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Exact Table Header Row matching user's uploaded screenshot with uniform height
  Widget _buildTableHeader(
    BuildContext context,
    MonthlyModel model,
    MonthlySheetController controller,
    double totalAllocated,
    bool isComplete,
    _TableWidths widths,
  ) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFFEFE8D8), // #EFE8D8
        border: Border(bottom: BorderSide(color: Color(0xFFD5C8B2), width: 1.2)),
      ),
      child: IntrinsicHeight(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Delete Column Header
            _buildHeaderCell(
              width: widths.delete,
              child: Center(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 3.h),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(6.r),
                    border: Border.all(color: const Color(0xFFD5C8B2)),
                  ),
                  child: Text(
                    'حذف',
                    style: TextStyle(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF9C3838),
                    ),
                  ),
                ),
              ),
            ),

            // 2. Index (#) Column Header
            _buildHeaderCell(
              width: widths.index,
              child: Center(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildSlantButton(
                        slant: model.getColumnSlant('index'),
                        onToggle: () => controller.toggleColumnSlant('index'),
                      ),
                      SizedBox(width: 2.w),
                      _buildSlantedText(
                        '#',
                        slant: model.getColumnSlant('index'),
                        baseStyle: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF2F2822),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // 2. Student Name Column Header with Embedded Search Input
            _buildHeaderCell(
              width: widths.name,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(
                              child: _buildSlantedText(
                                model.getColumnLabel('studentName', 'اسم الطالب'),
                                slant: model.getColumnSlant('studentName'),
                                baseStyle: TextStyle(
                                  fontSize: 14.sp,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF2F2822),
                                ),
                              ),
                            ),
                            SizedBox(width: 5.w),
                            _buildRenameButton(
                              onTap: () => _promptRenameColumn(
                                context,
                                controller,
                                model,
                                'studentName',
                                model.getColumnLabel('studentName', 'اسم الطالب'),
                                'اسم الطالب',
                              ),
                            ),
                          ],
                        ),
                      ),
                      _buildSlantButton(
                        slant: model.getColumnSlant('studentName'),
                        onToggle: () => controller.toggleColumnSlant('studentName'),
                      ),
                    ],
                  ),
                  Container(
                    height: 32.h,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: controller.setSearchQuery,
                      style: TextStyle(
                        fontSize: 12.5.sp,
                        color: const Color(0xFF2F2822),
                        fontWeight: FontWeight.w600,
                      ),
                      decoration: InputDecoration(
                        hintText: 'بحث بالاسم...',
                        hintStyle: TextStyle(
                          fontSize: 12.sp,
                          color: const Color(0xFF94A3B8),
                        ),
                        prefixIcon: Icon(
                          Icons.search_rounded,
                          size: 16.r,
                          color: const Color(0xFF64748B),
                        ),
                        contentPadding: EdgeInsets.zero,
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 3. Grade / Stage Column Header
            _buildHeaderCell(
              width: widths.grade,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildSlantButton(
                        slant: model.getColumnSlant('gradeLevel'),
                        onToggle: () => controller.toggleColumnSlant('gradeLevel'),
                      ),
                      SizedBox(width: 4.w),
                      _buildRenameButton(
                        onTap: () => _promptRenameColumn(
                          context,
                          controller,
                          model,
                          'gradeLevel',
                          model.getColumnLabel('gradeLevel', 'الصف'),
                          'الصف',
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 3.h),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(6.r),
                      border: Border.all(color: const Color(0xFFD5C8B2)),
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildSlantedText(
                            model.getColumnLabel('gradeLevel', 'الصف'),
                            slant: model.getColumnSlant('gradeLevel'),
                            baseStyle: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF2F2822),
                            ),
                          ),
                          Icon(Icons.arrow_drop_down_rounded, size: 16.r, color: Colors.black54),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 4. Section Column Header
            _buildHeaderCell(
              width: widths.section,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildSlantButton(
                        slant: model.getColumnSlant('section'),
                        onToggle: () => controller.toggleColumnSlant('section'),
                      ),
                      SizedBox(width: 4.w),
                      _buildRenameButton(
                        onTap: () => _promptRenameColumn(
                          context,
                          controller,
                          model,
                          'section',
                          model.getColumnLabel('section', 'كل الشُعب'),
                          'الشعبة',
                        ),
                      ),
                    ],
                  ),
                  _buildSlantedText(
                    model.getColumnLabel('section', 'كل الشُعب'),
                    slant: model.getColumnSlant('section'),
                    baseStyle: TextStyle(
                      fontSize: 12.5.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2F2822),
                    ),
                  ),
                  Icon(Icons.chevron_left_rounded, size: 16.r, color: Colors.black54),
                ],
              ),
            ),

            // 5. Subject Column Header
            _buildHeaderCell(
              width: widths.subject,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildSlantButton(
                        slant: model.getColumnSlant('subject'),
                        onToggle: () => controller.toggleColumnSlant('subject'),
                      ),
                      SizedBox(width: 4.w),
                      _buildRenameButton(
                        onTap: () => _promptRenameColumn(
                          context,
                          controller,
                          model,
                          'subject',
                          model.getColumnLabel('subject', 'المادة'),
                          'المادة',
                        ),
                      ),
                    ],
                  ),
                  _buildSlantedText(
                    model.getColumnLabel('subject', 'المادة'),
                    slant: model.getColumnSlant('subject'),
                    baseStyle: TextStyle(
                      fontSize: 12.5.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2F2822),
                    ),
                  ),
                ],
              ),
            ),

            // 6. Written Exam Column Header (درجة التحريري بالورقة)
            _buildHeaderCell(
              width: widths.written,
              color: const Color(0xFFFAF7EC),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Top row: Label + Max score badge + pencil + slant
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildSlantedText(
                          model.getColumnLabel('writtenExam', 'درجة التحريري بالورقة من'),
                          slant: model.getColumnSlant('writtenExam'),
                          baseStyle: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF1E293B),
                          ),
                        ),
                        SizedBox(width: 6.w),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6.r),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Text(
                            model.writtenMaxScore.toInt().toString(),
                            style: TextStyle(
                              fontSize: 12.5.sp,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        SizedBox(width: 4.w),
                        _buildRenameButton(
                          onTap: () => _promptRenameColumn(
                            context,
                            controller,
                            model,
                            'writtenExam',
                            model.getColumnLabel('writtenExam', 'درجة التحريري بالورقة من'),
                            'درجة التحريري بالورقة من',
                          ),
                        ),
                        SizedBox(width: 3.w),
                        _buildSlantButton(
                          slant: model.getColumnSlant('writtenExam'),
                          onToggle: () => controller.toggleColumnSlant('writtenExam'),
                        ),
                      ],
                    ),
                  ),

                  // Radio Options Box matching screenshot
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 3.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9), // slate-100
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Column(
                      children: [
                        _buildRadioOption(
                          label: 'الدرجة كما في ورقة الطالب',
                          isSelected: model.writtenScoreMode == 'raw',
                          onTap: () => controller.updateWrittenScoreMode('raw'),
                        ),
                        _buildRadioOption(
                          label: 'الدرجة النسبية للطالب',
                          isSelected: model.writtenScoreMode == 'relative',
                          onTap: () => controller.updateWrittenScoreMode('relative'),
                        ),
                      ],
                    ),
                  ),

                  Text(
                    '(مفعل تلقائي - كما في الورقة بدون نسبة)',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 10.5.sp,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF15803D),
                    ),
                  ),
                ],
              ),
            ),

            // 7. Optional Custom Columns
            ...model.customColumns.map((col) {
              return _buildHeaderCell(
                width: widths.customCol,
                color: const Color(0xFFF1F5F9),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildSlantedText(
                            col.name,
                            slant: model.getColumnSlant(col.id),
                            baseStyle: TextStyle(
                              fontSize: 13.sp,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                          SizedBox(width: 4.w),
                          if (col.isAttendance)
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 1.5.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(4.r),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: Text(
                                col.affectsGrade ? 'مؤثر بالدرجة' : 'توثيق سجل',
                                style: TextStyle(
                                  fontSize: 9.5.sp,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF065F46),
                                ),
                              ),
                            )
                          else
                            Text(
                              '(${col.maxScore.toInt()})',
                              style: TextStyle(
                                fontSize: 11.5.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildRenameButton(
                          tooltip: 'تعديل اسم أو درجة الحقل',
                          onTap: () => _promptEditCustomColumn(context, controller, col),
                        ),
                        SizedBox(width: 4.w),
                        _buildSlantButton(
                          slant: model.getColumnSlant(col.id),
                          onToggle: () => controller.toggleColumnSlant(col.id),
                        ),
                        SizedBox(width: 4.w),
                        Tooltip(
                          message: 'حذف هذا الحقل',
                          child: InkWell(
                            onTap: () => _confirmDeleteColumn(context, controller, col),
                            borderRadius: BorderRadius.circular(6.r),
                            child: Container(
                              padding: EdgeInsets.all(3.r),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEE2E2),
                                borderRadius: BorderRadius.circular(6.r),
                                border: Border.all(color: const Color(0xFFFECACA), width: 0.8),
                              ),
                              child: Icon(
                                Icons.delete_outline_rounded,
                                size: 13.r,
                                color: const Color(0xFFDC2626),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),

            // 8. Add Column Header Button matching screenshot
            _buildHeaderCell(
              width: widths.addCol,
              color: const Color(0xFFFAF7EC),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Text(
                    'إذا أردت إضافة حقل\nاضغط هنا',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2B6CB0),
                      height: 1.25,
                    ),
                  ),
                  InkWell(
                    onTap: () => showDialog(
                      context: context,
                      builder: (_) => const AddColumnDialog(),
                    ),
                    borderRadius: BorderRadius.circular(16.r),
                    child: Container(
                      padding: EdgeInsets.all(5.r),
                      decoration: const BoxDecoration(
                        color: Color(0xFF2B6CB0),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.add, size: 15.r, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),

            // 9. Final Score Column Header (الدرجة النهائية من)
            _buildHeaderCell(
              width: widths.finalScore,
              color: const Color(0xFFFAF7EC),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Top row: Label + Score box + pencil + slant
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildSlantedText(
                          model.getColumnLabel('finalScore', 'الدرجة النهائية من'),
                          slant: model.getColumnSlant('finalScore'),
                          baseStyle: TextStyle(
                            fontSize: 13.5.sp,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF1E293B),
                          ),
                        ),
                        SizedBox(width: 6.w),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6.r),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Text(
                            model.totalMaxScore.toInt().toString(),
                            style: TextStyle(
                              fontSize: 12.5.sp,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        SizedBox(width: 4.w),
                        _buildRenameButton(
                          onTap: () => _promptRenameColumn(
                            context,
                            controller,
                            model,
                            'finalScore',
                            model.getColumnLabel('finalScore', 'الدرجة النهائية من'),
                            'الدرجة النهائية من',
                          ),
                        ),
                        SizedBox(width: 3.w),
                        _buildSlantButton(
                          slant: model.getColumnSlant('finalScore'),
                          onToggle: () => controller.toggleColumnSlant('finalScore'),
                        ),
                      ],
                    ),
                  ),

                  // Controls row matching screenshot: Status + Operation + Rating Toggle
                  Builder(builder: (context) {
                    final hasFinalOp = model.finalScoreOperation.hasOperation;
                    final opLabel = model.finalScoreOperation.label;
                    final effectiveTotalMax = model.finalScoreOperation.calculateEffectiveMax(model.totalMaxScore);
                    final effStr = effectiveTotalMax.toString().replaceAll(RegExp(r'\.0$'), '');

                    final statusText = hasFinalOp
                        ? '(${totalAllocated.toInt()}/${model.totalMaxScore.toInt()}) ➔ $effStr'
                        : '✓ مكتمل (${totalAllocated.toInt()}/${model.totalMaxScore.toInt()})';

                    return FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Status Badge
                          Text(
                            statusText,
                            style: TextStyle(
                              fontSize: 11.5.sp,
                              fontWeight: FontWeight.w900,
                              color: isComplete ? const Color(0xFF15803D) : const Color(0xFFB45309),
                            ),
                          ),
                          SizedBox(width: 6.w),

                          // Math Operation Button
                          Tooltip(
                            message: hasFinalOp
                                ? 'الدرجة مطبق عليها ($opLabel) والمحصلة من $effStr. انقر لتعديل أو إلغاء العملية.'
                                : 'خيارات الدرجة النهائية: قسمة على عدد (مثلاً قسمة على 2)، ضرب، جمع، أو طرح',
                            child: InkWell(
                              onTap: () => showDialog(
                                context: context,
                                builder: (_) => const FinalOperationDialog(),
                              ),
                              child: Container(
                                padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 3.h),
                                decoration: BoxDecoration(
                                  color: hasFinalOp ? const Color(0xFFEFF6FF) : Colors.white,
                                  borderRadius: BorderRadius.circular(5.r),
                                  border: Border.all(
                                    color: hasFinalOp ? const Color(0xFF93C5FD) : const Color(0xFFCBD5E1),
                                    width: hasFinalOp ? 1.2 : 1.0,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.calculate_outlined,
                                      size: 13.r,
                                      color: hasFinalOp ? const Color(0xFF1D4ED8) : const Color(0xFF2B6CB0),
                                    ),
                                    SizedBox(width: 3.w),
                                    Text(
                                      hasFinalOp ? 'عملية: $opLabel' : '÷ × + - عملية',
                                      style: TextStyle(
                                        fontSize: 10.5.sp,
                                        fontWeight: hasFinalOp ? FontWeight.w900 : FontWeight.bold,
                                        color: hasFinalOp ? const Color(0xFF1D4ED8) : const Color(0xFF2B6CB0),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          SizedBox(width: 6.w),

                          // Rating Visibility Toggle
                        InkWell(
                          onTap: controller.toggleRatingColumn,
                          child: Container(
                            padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 3.h),
                            decoration: BoxDecoration(
                              color: controller.showRatingColumn ? const Color(0xFFEBF4EE) : Colors.white,
                              borderRadius: BorderRadius.circular(5.r),
                              border: Border.all(
                                color: controller.showRatingColumn ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  controller.showRatingColumn ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                                  size: 13.r,
                                  color: controller.showRatingColumn ? const Color(0xFF15803D) : const Color(0xFF64748B),
                                ),
                                SizedBox(width: 3.w),
                                Text(
                                  'التقدير: ${controller.showRatingColumn ? "ظاهر" : "مخفي"}',
                                  style: TextStyle(
                                    fontSize: 10.5.sp,
                                    fontWeight: FontWeight.bold,
                                    color: controller.showRatingColumn ? const Color(0xFF15803D) : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
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
        ),
      ),
    );
  }

  /// Slanted text rendering based on normal / italic / vertical
  Widget _buildSlantedText(
    String text, {
    required String slant,
    required TextStyle baseStyle,
    TextAlign textAlign = TextAlign.center,
    int maxLines = 1,
  }) {
    if (slant == 'italic') {
      return Transform.rotate(
        angle: -0.15,
        child: Text(
          text,
          textAlign: textAlign,
          maxLines: maxLines,
          overflow: TextOverflow.ellipsis,
          style: baseStyle.copyWith(fontStyle: FontStyle.italic),
        ),
      );
    } else if (slant == 'vertical') {
      return RotatedBox(
        quarterTurns: 3,
        child: Text(
          text,
          textAlign: textAlign,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: baseStyle.copyWith(letterSpacing: 1.2),
        ),
      );
    }
    return Text(
      text,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: TextOverflow.ellipsis,
      style: baseStyle,
    );
  }

  /// Rotate / Slant Button matching Daragat SlantButton
  Widget _buildSlantButton({
    required String slant,
    required VoidCallback onToggle,
    String? tooltip,
  }) {
    final isItalic = slant == 'italic';
    final isVertical = slant == 'vertical';

    final Color bgColor = isItalic
        ? const Color(0xFFFEF3C7)
        : isVertical
            ? const Color(0xFFDBEAFE)
            : Colors.white.withValues(alpha: 0.85);

    final Color borderColor = isItalic
        ? const Color(0xFFF59E0B)
        : isVertical
            ? const Color(0xFF3B82F6)
            : const Color(0xFFCBD5E1);

    final Color iconColor = isItalic
        ? const Color(0xFFB45309)
        : isVertical
            ? const Color(0xFF1D4ED8)
            : const Color(0xFF64748B);

    final String message = tooltip ??
        (isItalic
            ? 'ميل النص: مائل (انقر للتحويل إلى عامودي)'
            : isVertical
                ? 'ميل النص: عامودي (انقر للإرجاع إلى عادي)'
                : 'تغيير ميل النص (عادي / مائل / عامودي)');

    return Tooltip(
      message: message,
      child: InkWell(
        onTap: onToggle,
        borderRadius: BorderRadius.circular(6.r),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: EdgeInsets.all(3.r),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(6.r),
            border: Border.all(
              color: borderColor,
              width: isItalic || isVertical ? 1.2 : 0.8,
            ),
          ),
          child: AnimatedRotation(
            turns: isItalic ? -0.125 : (isVertical ? -0.25 : 0.0),
            duration: const Duration(milliseconds: 180),
            child: Icon(
              Icons.refresh_rounded,
              size: 13.r,
              color: iconColor,
            ),
          ),
        ),
      ),
    );
  }

  /// Pencil Rename Button
  Widget _buildRenameButton({
    required VoidCallback onTap,
    String tooltip = 'تعديل اسم العمود',
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6.r),
        child: Container(
          padding: EdgeInsets.all(3.r),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.85),
            borderRadius: BorderRadius.circular(6.r),
            border: Border.all(color: const Color(0xFFCBD5E1), width: 0.8),
          ),
          child: Icon(
            Icons.edit_rounded,
            size: 13.r,
            color: const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  /// Prompt to rename a specific standard column
  void _promptRenameColumn(
    BuildContext context,
    MonthlySheetController controller,
    MonthlyModel model,
    String key,
    String currentTitle,
    String defaultTitle,
  ) {
    final textCtrl = TextEditingController(text: currentTitle);
    showDialog(
      context: context,
      builder: (ctx) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
            title: Row(
              children: [
                Icon(Icons.edit_note_rounded, color: const Color(0xFF2B6CB0), size: 22.r),
                SizedBox(width: 8.w),
                Expanded(
                  child: Text(
                    'تعديل عنوان العمود',
                    style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w900),
                  ),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'الاسم الافتراضي: $defaultTitle',
                  style: TextStyle(fontSize: 11.sp, color: const Color(0xFF64748B)),
                ),
                SizedBox(height: 10.h),
                TextFormField(
                  controller: textCtrl,
                  autofocus: true,
                  style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    labelText: 'عنوان العمود المفضل',
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.r)),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  showDialog(
                    context: context,
                    builder: (_) => RenameColumnsDialog(model: model, initialFocusKey: key),
                  );
                },
                child: Text('تسمية جميع الأعمدة...', style: TextStyle(fontSize: 11.sp)),
              ),
              TextButton(
                onPressed: () {
                  controller.setColumnLabel(key, '');
                  Navigator.of(ctx).pop();
                },
                child: Text('استعادة الافتراضي', style: TextStyle(fontSize: 11.sp, color: Colors.amber.shade900)),
              ),
              ElevatedButton(
                onPressed: () {
                  final newName = textCtrl.text.trim();
                  controller.setColumnLabel(key, newName);
                  Navigator.of(ctx).pop();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2B6CB0),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                ),
                child: Text('حفظ', style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Prompt to edit custom column name and max score
  void _promptEditCustomColumn(
    BuildContext context,
    MonthlySheetController controller,
    CustomColumn col,
  ) {
    final nameCtrl = TextEditingController(text: col.name);
    final scoreCtrl = TextEditingController(text: col.maxScore.toInt().toString());
    bool isAttendance = col.isAttendance;
    bool affectsGrade = col.affectsGrade;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return Directionality(
              textDirection: TextDirection.rtl,
              child: AlertDialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
                title: Row(
                  children: [
                    Icon(Icons.tune_rounded, color: const Color(0xFF2B6CB0), size: 22.r),
                    SizedBox(width: 8.w),
                    Expanded(
                      child: Text(
                        'تعديل الحقل: ${col.name}',
                        style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ],
                ),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: nameCtrl,
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold),
                        decoration: InputDecoration(
                          labelText: 'اسم الحقل',
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.r)),
                        ),
                      ),
                      SizedBox(height: 12.h),
                      TextFormField(
                        controller: scoreCtrl,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold),
                        decoration: InputDecoration(
                          labelText: 'الدرجة الكاملة للحقل',
                          suffixText: 'درجة',
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.r)),
                        ),
                      ),
                      SizedBox(height: 12.h),
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text('حقل غياب وحضور', style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold)),
                        value: isAttendance,
                        onChanged: (val) {
                          setDialogState(() => isAttendance = val ?? false);
                        },
                      ),
                      if (isAttendance)
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text('يؤثر على الدرجات', style: TextStyle(fontSize: 11.5.sp)),
                          value: affectsGrade,
                          onChanged: (val) {
                            setDialogState(() => affectsGrade = val ?? true);
                          },
                        ),
                    ],
                  ),
                ),
                actions: [
                  TextButton.icon(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _confirmDeleteColumn(context, controller, col);
                    },
                    icon: Icon(Icons.delete_outline_rounded, color: Colors.red.shade700, size: 16.r),
                    label: Text('حذف الحقل', style: TextStyle(color: Colors.red.shade700, fontSize: 11.sp)),
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: Text('إلغاء', style: TextStyle(fontSize: 11.5.sp)),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      final newName = nameCtrl.text.trim();
                      final newScore = double.tryParse(scoreCtrl.text.trim()) ?? col.maxScore;
                      if (newName.isNotEmpty) {
                        controller.updateCustomColumn(
                          col.id,
                          name: newName,
                          maxScore: newScore,
                          isAttendance: isAttendance,
                          affectsGrade: affectsGrade,
                        );
                      }
                      Navigator.of(ctx).pop();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2B6CB0),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                    ),
                    child: Text('حفظ التعديلات', style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  /// Confirm delete custom column
  void _confirmDeleteColumn(
    BuildContext context,
    MonthlySheetController controller,
    CustomColumn col,
  ) {
    showDialog(
      context: context,
      builder: (ctx) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
            title: Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.red.shade700, size: 22.r),
                SizedBox(width: 8.w),
                Text('تأكيد حذف الحقل', style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w900)),
              ],
            ),
            content: Text(
              'هل أنت متأكد من حذف الحقل "${col.name}"؟ سيتم حذف جميع درجات الطلاب المسجلة في هذا الحقل.',
              style: TextStyle(fontSize: 12.sp, color: const Color(0xFF334155)),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: Text('إلغاء', style: TextStyle(fontSize: 12.sp)),
              ),
              ElevatedButton(
                onPressed: () {
                  controller.deleteColumn(col.id);
                  Navigator.of(ctx).pop();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                ),
                child: Text('نعم، احذف الحقل', style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Empty State Card exactly matching the user's uploaded screenshot
  Widget _buildEmptyState(BuildContext context, MonthlyModel model, double tableWidth) {
    return Container(
      width: tableWidth,
      padding: EdgeInsets.symmetric(vertical: 52.h, horizontal: 20.w),
      color: Colors.white,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Circular Soft Blue Avatar Icon with Plus
          Container(
            width: 62.r,
            height: 62.r,
            decoration: BoxDecoration(
              color: const Color(0xFFEEF6FC), // Soft ice blue
              borderRadius: BorderRadius.circular(16.r),
              border: Border.all(color: const Color(0xFFD6E8F6)),
            ),
            child: const Icon(
              Icons.person_add_alt_1_rounded,
              size: 30,
              color: Color(0xFF5692BE),
            ),
          ),
          SizedBox(height: 18.h),

          // Main Header Text
          Text(
            'لا يوجد طلاب مضافين في هذا النموذج (${model.gradeLevel.isNotEmpty ? model.gradeLevel : model.name})',
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF2F2822),
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 8.h),

          // Subtitle
          Text(
            'يمكنك إضافة طالب أو لصق كشف أسماء الطلاب بسهولة للبدء برصد الدرجات.',
            style: TextStyle(
              fontSize: 13.5.sp,
              color: const Color(0xFF786C5E),
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 24.h),

          // Big Camel Brown Button: "إضافة أو استيراد كشف الطلاب"
          InkWell(
            onTap: () => showDialog(
              context: context,
              builder: (_) => const AddStudentDialog(),
            ),
            borderRadius: BorderRadius.circular(12.r),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
              decoration: BoxDecoration(
                color: const Color(0xFFBA916C), // Camel craft brown #BA916C
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: const Color(0xFF9E7752), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF5A4128).withValues(alpha: 0.22),
                    blurRadius: 5,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.folder_shared_rounded, size: 20, color: Colors.white),
                    SizedBox(width: 8.w),
                    Text(
                      'إضافة أو استيراد كشف الطلاب',
                      style: TextStyle(
                        fontSize: 14.5.sp,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(width: 6.w),
                    const Icon(Icons.person_add_rounded, size: 18, color: Colors.white),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Interactive Student Data Row matching the header columns
  Widget _buildStudentRow(
    BuildContext context,
    StudentRow student,
    MonthlyModel model,
    MonthlySheetController controller,
    int idx,
    _TableWidths widths,
  ) {
    final finalScore = controller.calculateFinalStudentScore(student, model);
    final rating = GradeCalculator.getRating(finalScore, model.totalMaxScore);
    final isEven = idx % 2 == 0;

    return Container(
      height: 52.h,
      decoration: BoxDecoration(
        color: isEven ? Colors.white : const Color(0xFFFAF7EC),
        border: const Border(bottom: BorderSide(color: Color(0xFFE8DDCF))),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. Delete button
          Container(
            width: widths.delete,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
            ),
            child: IconButton(
              icon: Icon(Icons.delete_outline_rounded, size: 17.r, color: Colors.red.shade700),
              onPressed: () => controller.deleteStudent(student.id),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ),

          // 2. Index Number
          Container(
            width: widths.index,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
            ),
            child: _buildSlantedText(
              '${idx + 1}',
              slant: model.getColumnSlant('index'),
              baseStyle: TextStyle(
                fontSize: 12.sp,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF544030),
              ),
            ),
          ),

          // 3. Student Name
          Container(
            width: widths.name,
            padding: EdgeInsets.symmetric(horizontal: 10.w),
            alignment: Alignment.centerRight,
            decoration: const BoxDecoration(
              border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
            ),
            child: Text(
              student.name,
              style: TextStyle(
                fontSize: 13.5.sp,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF2F2822),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),

          // 3. Grade
          Container(
            width: widths.grade,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
            ),
            child: Text(
              student.gradeLevel.isNotEmpty ? student.gradeLevel : (model.gradeLevel.isNotEmpty ? model.gradeLevel : '-'),
              style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
          ),

          // 4. Section
          Container(
            width: widths.section,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
            ),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 2.h),
              decoration: BoxDecoration(
                color: const Color(0xFFE5D7BE),
                borderRadius: BorderRadius.circular(4.r),
              ),
              child: Text(
                student.section.isNotEmpty ? student.section : 'أ',
                style: TextStyle(fontSize: 12.5.sp, fontWeight: FontWeight.w900, color: const Color(0xFF2F2822)),
              ),
            ),
          ),

          // 5. Subject
          Container(
            width: widths.subject,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
            ),
            child: Text(
              model.subject.isNotEmpty ? model.subject : '-',
              style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: const Color(0xFF3A6C8F)),
            ),
          ),

          // 6. Written Exam Score cell
          Container(
            width: widths.written,
            padding: EdgeInsets.symmetric(horizontal: 16.w),
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
            ),
            child: _buildClickableScore(
              score: student.writtenRawScore,
              maxScore: model.writtenMaxScore,
              onSave: (val) => controller.updateStudentScore(student.id, writtenScore: val),
            ),
          ),

          // 7. Custom Column score cells
          ...model.customColumns.map((col) {
            if (col.isAttendance) {
              final records = student.attendanceRecords[col.id] ?? const [];
              int absentCount = 0;
              int excusedCount = 0;
              int presentCount = 0;
              for (final r in records) {
                if (r.status == 'absent') absentCount++;
                if (r.status == 'excused') excusedCount++;
                if (r.status == 'present') presentCount++;
              }
              final gradeDelta = controller.calculateStudentAttendanceDelta(student, col);

              return Container(
                width: widths.customCol,
                padding: EdgeInsets.symmetric(horizontal: 4.w),
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
                ),
                child: Tooltip(
                  message: 'انقر لتسجيل الحضور، الغياب، أو الإجازة مع التاريخ واليوم',
                  child: InkWell(
                    onTap: () => showDialog(
                      context: context,
                      builder: (_) => AttendanceRecordDialog(student: student, column: col),
                    ),
                    borderRadius: BorderRadius.circular(8.r),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 3.5.h),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5EFE2),
                        borderRadius: BorderRadius.circular(8.r),
                        border: Border.all(color: const Color(0xFFD8CEBD)),
                      ),
                      child: records.isEmpty
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.calendar_month_rounded, size: 12.r, color: const Color(0xFF64748B)),
                                SizedBox(width: 3.w),
                                Text(
                                  '+ رصد',
                                  style: TextStyle(
                                    fontSize: 11.sp,
                                    fontWeight: FontWeight.bold,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            )
                          : Wrap(
                              spacing: 3.w,
                              runSpacing: 2.h,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                if (absentCount > 0)
                                  _buildAttendanceBadge('غ: $absentCount', const Color(0xFFE11D48)),
                                if (excusedCount > 0)
                                  _buildAttendanceBadge('م: $excusedCount', const Color(0xFF2563EB)),
                                if (presentCount > 0)
                                  _buildAttendanceBadge('ح: $presentCount', const Color(0xFF059669)),
                                if (col.affectsGrade && gradeDelta != 0)
                                  Text(
                                    gradeDelta > 0 ? '(+$gradeDelta)' : '($gradeDelta)',
                                    style: TextStyle(
                                      fontSize: 10.sp,
                                      fontWeight: FontWeight.w900,
                                      color: gradeDelta < 0 ? const Color(0xFFE11D48) : const Color(0xFF059669),
                                    ),
                                  ),
                              ],
                            ),
                    ),
                  ),
                ),
              );
            }

            final score = student.scores[col.id];
            return Container(
              width: widths.customCol,
              padding: EdgeInsets.symmetric(horizontal: 10.w),
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
              ),
              child: _buildClickableScore(
                score: score,
                maxScore: col.maxScore,
                onSave: (val) => controller.updateStudentScore(student.id, colId: col.id, colScore: val),
              ),
            );
          }),

          // 8. Spacer under the Add Column button
          Container(
            width: widths.addCol,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(left: BorderSide(color: Color(0xFFE8DDCF))),
            ),
            child: const Text('—', style: TextStyle(color: Colors.black26)),
          ),

          // 9. Final Score Cell + Rating badge
          Container(
            width: widths.finalScore,
            padding: EdgeInsets.symmetric(horizontal: 12.w),
            alignment: Alignment.center,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  finalScore != null ? finalScore.toStringAsFixed(1).replaceAll('.0', '') : '—',
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF4A82A8),
                  ),
                ),
                if (controller.showRatingColumn) ...[
                  SizedBox(width: 8.w),
                  RatingBadge(ratingKey: rating.key, status: rating.status),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceBadge(String text, Color color) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(4.r),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 9.5.sp,
          fontWeight: FontWeight.w900,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildClickableScore({
    required double? score,
    required double maxScore,
    required ValueChanged<double?> onSave,
  }) {
    return InkWell(
      onTap: () => _promptScoreEdit(score, maxScore, onSave),
      borderRadius: BorderRadius.circular(8.r),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 6.h),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8.r),
          border: Border.all(color: const Color(0xFFD5C8B2)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Text(
          score != null ? score.toStringAsFixed(1).replaceAll('.0', '') : '—',
          style: TextStyle(
            fontSize: 14.sp,
            fontWeight: FontWeight.w900,
            color: score != null ? const Color(0xFF2F2822) : Colors.black38,
          ),
        ),
      ),
    );
  }

  void _promptScoreEdit(double? initialScore, double maxScore, ValueChanged<double?> onSave) {
    final textController = TextEditingController(text: initialScore?.toString() ?? '');
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
          title: Text(
            'رصد الدرجة (من ${maxScore.toInt()})',
            style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w900),
          ),
          content: TextField(
            controller: textController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            autofocus: true,
            style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              hintText: '0 - ${maxScore.toInt()}',
              contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 10.h),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.r)),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('إلغاء'),
            ),
            ElevatedButton(
              onPressed: () {
                final val = double.tryParse(textController.text.trim());
                onSave(val);
                Navigator.of(ctx).pop();
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5692BE)),
              child: const Text(
                'حفظ الدرجة',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCell({
    required double width,
    required Widget child,
    Color? color,
  }) {
    return Container(
      width: width,
      constraints: BoxConstraints(minHeight: 110.h),
      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 8.h),
      decoration: BoxDecoration(
        color: color ?? const Color(0xFFEFE8D8),
        border: const Border(
          left: BorderSide(color: Color(0xFFD5C8B2), width: 1.2),
        ),
      ),
      alignment: Alignment.center,
      child: child,
    );
  }

  Widget _buildRadioOption({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 2.h),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 14.r,
              color: isSelected ? const Color(0xFF2B6CB0) : Colors.black45,
            ),
            SizedBox(width: 4.w),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11.5.sp,
                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                  color: isSelected ? const Color(0xFF1E40AF) : const Color(0xFF334155),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
