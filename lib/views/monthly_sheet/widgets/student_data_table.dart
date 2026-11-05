import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import 'student_row_item.dart';

/// Interactive data table displaying students and their scores
class StudentDataTable extends StatefulWidget {
  const StudentDataTable({super.key});

  @override
  State<StudentDataTable> createState() => _StudentDataTableState();
}

class _StudentDataTableState extends State<StudentDataTable> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final model = controller.currentModel;

    if (model == null) {
      return Center(
        child: Text(
          context.tr(AppKeys.noModelsYet),
          style: TextStyle(fontSize: 14.sp, color: AppColors.textMuted),
        ),
      );
    }

    final students = controller.filteredStudents;
    if (students.isEmpty) {
      return Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 40.h),
          child: Text(
            context.tr(AppKeys.noStudentsYet),
            style: TextStyle(fontSize: 13.sp, color: AppColors.textMuted),
          ),
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final double minTableWidth = constraints.maxWidth > 700 ? constraints.maxWidth : 680.0;

        return Container(
          margin: EdgeInsets.symmetric(horizontal: 14.w),
          decoration: BoxDecoration(
            color: AppColors.craftCardBg, // #FAF6EC
            borderRadius: BorderRadius.circular(16.r),
            border: Border.all(color: AppColors.craftBorder, width: 1.5), // #AA8362
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF5A4128).withValues(alpha: 0.08),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16.r),
            child: Scrollbar(
              controller: _scrollController,
              thumbVisibility: true,
              child: SingleChildScrollView(
                controller: _scrollController,
                scrollDirection: Axis.horizontal,
                child: ConstrainedBox(
                  constraints: BoxConstraints(minWidth: minTableWidth),
                  child: DataTable(
                    headingRowHeight: 50,
                    dataRowMinHeight: 48,
                    dataRowMaxHeight: 56,
                    horizontalMargin: 16.w,
                    columnSpacing: 20.w,
                    headingRowColor: WidgetStateProperty.all(AppColors.craftBadgeBg), // #E8D7C2 craft-table-header
                    columns: _buildColumns(context, model),
                    rows: students.map((s) => buildStudentDataRow(context, s, model, controller)).toList(),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  List<DataColumn> _buildColumns(BuildContext context, dynamic model) {
    final List<DataColumn> cols = [
      DataColumn(
        label: Text(
          context.tr(AppKeys.studentName),
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.inkDark),
        ),
      ),
      DataColumn(
        label: Text(
          context.tr(AppKeys.section),
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.inkDark),
        ),
      ),
      DataColumn(
        label: Text(
          '${context.tr(AppKeys.writtenScore)} (${model.writtenMaxScore.toInt()})',
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.inkDark),
        ),
      ),
    ];

    for (final col in model.customColumns) {
      cols.add(
        DataColumn(
          label: Text(
            '${col.name} (${col.maxScore.toInt()})',
            style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.inkDark),
          ),
        ),
      );
    }

    cols.addAll([
      DataColumn(
        label: Text(
          '${context.tr(AppKeys.finalScore)} (${model.totalMaxScore.toInt()})',
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.monthlyBlueDark),
        ),
      ),
      DataColumn(
        label: Text(
          context.tr(AppKeys.rating),
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.inkDark),
        ),
      ),
      const DataColumn(label: SizedBox(width: 24)),
    ]);

    return cols;
  }
}
