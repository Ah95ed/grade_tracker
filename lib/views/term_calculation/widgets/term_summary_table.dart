import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/term_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/rating_badge.dart';

/// Data table summarizing student performance for the active term
class TermSummaryTable extends StatefulWidget {
  const TermSummaryTable({super.key});

  @override
  State<TermSummaryTable> createState() => _TermSummaryTableState();
}

class _TermSummaryTableState extends State<TermSummaryTable> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final termController = context.watch<TermController>();
    final sheetController = context.watch<MonthlySheetController>();
    final summaries = termController.calculateSummaries(sheetController);

    if (summaries.isEmpty) {
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

    final modelNames = summaries.first.monthlyScores.keys.toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final double minTableWidth = constraints.maxWidth > 700 ? constraints.maxWidth : 650.0;

        return Container(
          margin: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
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
                    columns: _buildColumns(context, modelNames),
                    rows: summaries.map((s) => _buildRow(context, s, modelNames)).toList(),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  List<DataColumn> _buildColumns(BuildContext context, List<String> modelNames) {
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
    ];

    for (final name in modelNames) {
      cols.add(
        DataColumn(
          label: Text(
            name,
            style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
        ),
      );
    }

    cols.addAll([
      DataColumn(
        label: Text(
          context.tr(AppKeys.finalScore),
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.termRust),
        ),
      ),
      DataColumn(
        label: Text(
          context.tr(AppKeys.rating),
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
      ),
    ]);

    return cols;
  }

  DataRow _buildRow(BuildContext context, dynamic summary, List<String> modelNames) {
    final List<DataCell> cells = [
      DataCell(
        ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 130, maxWidth: 240),
          child: Text(
            summary.studentName,
            style: TextStyle(
              fontSize: 12.sp,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ),
      DataCell(
        Text(
          summary.section.isNotEmpty ? summary.section : '-',
          style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary),
        ),
      ),
    ];

    for (final name in modelNames) {
      final score = summary.monthlyScores[name];
      cells.add(
        DataCell(
          Text(
            score != null ? score.toString() : '-',
            style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
        ),
      );
    }

    cells.addAll([
      DataCell(
        Text(
          summary.finalTermScore != null ? summary.finalTermScore.toString() : '-',
          style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w900, color: AppColors.termRust),
        ),
      ),
      DataCell(
        RatingBadge(ratingKey: summary.ratingKey, status: summary.status),
      ),
    ]);

    return DataRow(cells: cells);
  }
}
