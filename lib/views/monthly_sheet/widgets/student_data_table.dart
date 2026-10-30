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
          margin: EdgeInsets.symmetric(horizontal: 12.w),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12.r),
            border: Border.all(color: AppColors.borderWarm),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12.r),
            child: Scrollbar(
              controller: _scrollController,
              thumbVisibility: true,
              child: SingleChildScrollView(
                controller: _scrollController,
                scrollDirection: Axis.horizontal,
                child: ConstrainedBox(
                  constraints: BoxConstraints(minWidth: minTableWidth),
                  child: DataTable(
                    headingRowHeight: 48,
                    dataRowMinHeight: 48,
                    dataRowMaxHeight: 56,
                    horizontalMargin: 14.w,
                    columnSpacing: 18.w,
                    headingRowColor: WidgetStateProperty.all(AppColors.creamBackground),
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
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
      ),
      DataColumn(
        label: Text(
          context.tr(AppKeys.section),
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
      ),
      DataColumn(
        label: Text(
          '${context.tr(AppKeys.writtenScore)} (${model.writtenMaxScore.toInt()})',
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
      ),
    ];

    for (final col in model.customColumns) {
      cols.add(
        DataColumn(
          label: Text(
            '${col.name} (${col.maxScore.toInt()})',
            style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
        ),
      );
    }

    cols.addAll([
      DataColumn(
        label: Text(
          '${context.tr(AppKeys.finalScore)} (${model.totalMaxScore.toInt()})',
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.monthlyBlue),
        ),
      ),
      DataColumn(
        label: Text(
          context.tr(AppKeys.rating),
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
      ),
      const DataColumn(label: SizedBox(width: 24)),
    ]);

    return cols;
  }
}
