import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/utils/grade_calculator.dart';
import '../../../models/student_row.dart';
import '../../../models/monthly_model.dart';
import '../../common/rating_badge.dart';
import '../../../core/theme/app_colors.dart';

/// Builds an individual student DataRow for the table with zero hardcoding
DataRow buildStudentDataRow(
  BuildContext context,
  StudentRow student,
  MonthlyModel model,
  MonthlySheetController controller,
) {
  final finalScore = controller.calculateFinalStudentScore(student, model);
  final rating = GradeCalculator.getRating(finalScore, model.totalMaxScore);

  final List<DataCell> cells = [
    // Name with bounded constraint preventing truncation/disappearance
    DataCell(
      ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 130, maxWidth: 240),
        child: Text(
          student.name,
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
    // Section
    DataCell(
      Text(
        student.section.isNotEmpty ? student.section : '-',
        style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary),
      ),
    ),
    // Written Score
    DataCell(
      _buildScoreCell(
        context,
        student.writtenRawScore,
        onTap: () => _promptScoreEdit(
          context,
          initialScore: student.writtenRawScore,
          maxScore: model.writtenMaxScore,
          onSave: (val) => controller.updateStudentScore(student.id, writtenScore: val),
        ),
      ),
    ),
  ];

  // Custom columns
  for (final col in model.customColumns) {
    final colScore = student.scores[col.id];
    cells.add(
      DataCell(
        _buildScoreCell(
          context,
          colScore,
          onTap: () => _promptScoreEdit(
            context,
            initialScore: colScore,
            maxScore: col.maxScore,
            onSave: (val) => controller.updateStudentScore(student.id, colId: col.id, colScore: val),
          ),
        ),
      ),
    );
  }

  // Final Score
  cells.add(
    DataCell(
      Text(
        finalScore != null ? finalScore.toString() : '-',
        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w900, color: AppColors.monthlyBlue),
      ),
    ),
  );

  // Rating Badge
  cells.add(
    DataCell(
      RatingBadge(ratingKey: rating.key, status: rating.status),
    ),
  );

  // Delete Action
  cells.add(
    DataCell(
      IconButton(
        icon: Icon(Icons.delete_outline_rounded, size: 18.r, color: AppColors.error),
        onPressed: () => controller.deleteStudent(student.id),
      ),
    ),
  );

  return DataRow(cells: cells);
}

Widget _buildScoreCell(BuildContext context, double? score, {required VoidCallback onTap}) {
  return InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(6.r),
    child: Container(
      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
      decoration: BoxDecoration(
        color: AppColors.creamBackground,
        borderRadius: BorderRadius.circular(6.r),
        border: Border.all(color: AppColors.borderWarm),
      ),
      child: Text(
        score != null ? score.toString() : '-',
        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
      ),
    ),
  );
}

void _promptScoreEdit(
  BuildContext context, {
  required double? initialScore,
  required double maxScore,
  required ValueChanged<double?> onSave,
}) {
  final textController = TextEditingController(text: initialScore?.toString() ?? '');
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14.r)),
      title: Text(
        '${context.tr(AppKeys.edit)} (${maxScore.toInt()})',
        style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold),
      ),
      content: TextField(
        controller: textController,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        autofocus: true,
        decoration: InputDecoration(
          hintText: '0 - ${maxScore.toInt()}',
          contentPadding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(),
          child: Text(context.tr(AppKeys.cancel)),
        ),
        ElevatedButton(
          onPressed: () {
            final val = double.tryParse(textController.text.trim());
            onSave(val);
            Navigator.of(ctx).pop();
          },
          child: Text(context.tr(AppKeys.save)),
        ),
      ],
    ),
  );
}
