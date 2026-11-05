import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/term_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/student_term_summary.dart';
import '../../common/rating_badge.dart';

/// Data table and analytics summarizing student performance for the active term
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

    // Analytics calculations matching web
    final totalStudents = summaries.length;
    final validScores = summaries.map((s) => s.finalTermScore).whereType<double>().toList();
    final passCount = validScores.where((score) => score >= 50.0).length;
    final passRate = validScores.isNotEmpty ? ((passCount / validScores.length) * 100).round() : 0;
    final avgScore = validScores.isNotEmpty
        ? ((validScores.reduce((a, b) => a + b) / validScores.length) * 10).round() / 10
        : 0.0;
    final maxScore = validScores.isNotEmpty
        ? validScores.reduce((a, b) => a > b ? a : b)
        : 0.0;

    final modelNames = summaries.first.monthlyScores.keys.toList();

    return Column(
      children: [
        // Analytics Summary Cards matching Daragat Web
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 14.w),
          child: Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  title: 'عدد الطلاب',
                  value: '$totalStudents',
                  icon: Icons.people_alt_rounded,
                  color: const Color(0xFF0D9488),
                  bg: const Color(0xFFF0FDFA),
                ),
              ),
              SizedBox(width: 8.w),
              Expanded(
                child: _buildMetricCard(
                  title: 'نسبة النجاح',
                  value: '$passRate%',
                  icon: Icons.trending_up_rounded,
                  color: const Color(0xFF16A34A),
                  bg: const Color(0xFFF0FDF4),
                ),
              ),
              SizedBox(width: 8.w),
              Expanded(
                child: _buildMetricCard(
                  title: 'المعدل العام',
                  value: '$avgScore',
                  icon: Icons.analytics_rounded,
                  color: AppColors.monthlyBlue,
                  bg: const Color(0xFFEFF6FF),
                ),
              ),
              SizedBox(width: 8.w),
              Expanded(
                child: _buildMetricCard(
                  title: 'أعلى معدل',
                  value: '$maxScore',
                  icon: Icons.workspace_premium_rounded,
                  color: const Color(0xFFD97706),
                  bg: const Color(0xFFFFFBEB),
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: 10.h),

        // Main Term Table
        LayoutBuilder(
          builder: (context, constraints) {
            final double minTableWidth = constraints.maxWidth > 700 ? constraints.maxWidth : 650.0;

            return Container(
              margin: EdgeInsets.symmetric(horizontal: 14.w, vertical: 4.h),
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
                        columns: _buildColumns(context, modelNames),
                        rows: summaries.map((s) => _buildRow(context, s, modelNames)).toList(),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required Color bg,
  }) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14.r),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(fontSize: 10.sp, color: AppColors.textSecondary, fontWeight: FontWeight.bold),
              ),
              Icon(icon, size: 14.r, color: color),
            ],
          ),
          SizedBox(height: 3.h),
          Text(
            value,
            style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w900, color: color),
          ),
        ],
      ),
    );
  }

  List<DataColumn> _buildColumns(BuildContext context, List<String> modelNames) {
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
    ];

    for (final name in modelNames) {
      cols.add(
        DataColumn(
          label: Text(
            'درجة $name',
            style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.inkDark),
          ),
        ),
      );
    }

    cols.addAll([
      DataColumn(
        label: Text(
          'المعدل النهائي',
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.termRustDark),
        ),
      ),
      DataColumn(
        label: Text(
          context.tr(AppKeys.rating),
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.inkDark),
        ),
      ),
    ]);

    return cols;
  }

  DataRow _buildRow(BuildContext context, StudentTermSummary summary, List<String> modelNames) {
    final List<DataCell> cells = [
      DataCell(
        ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 120, maxWidth: 220),
          child: Text(
            summary.studentName,
            style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.inkDark),
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
          Container(
            padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(6.r),
              border: Border.all(color: const Color(0xFFD5C8B2)),
            ),
            child: Text(
              score != null ? score.toString() : '-',
              style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.inkDark),
            ),
          ),
        ),
      );
    }

    cells.add(
      DataCell(
        Text(
          summary.finalTermScore != null ? summary.finalTermScore.toString() : '-',
          style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w900, color: AppColors.termRust),
        ),
      ),
    );

    cells.add(
      DataCell(
        RatingBadge(ratingKey: summary.ratingKey, status: summary.status),
      ),
    );

    return DataRow(cells: cells);
  }
}
