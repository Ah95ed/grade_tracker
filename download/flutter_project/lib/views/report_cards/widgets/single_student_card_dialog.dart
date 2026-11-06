import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/student_term_summary.dart';
import '../../../models/teacher_profile.dart';
import '../../common/custom_button.dart';
import 'report_card_item.dart';

/// Full preview modal dialog for a single student report card
class SingleStudentCardDialog extends StatelessWidget {
  final StudentTermSummary summary;
  final TeacherProfile profile;

  const SingleStudentCardDialog({
    super.key,
    required this.summary,
    required this.profile,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 24.h),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
      child: Container(
        padding: EdgeInsets.all(18.r),
        constraints: BoxConstraints(maxWidth: 440.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  context.tr(AppKeys.cardStudent),
                  style: TextStyle(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close_rounded, size: 20.r, color: AppColors.textSecondary),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            SizedBox(height: 12.h),
            ReportCardItem(summary: summary, profile: profile),
            SizedBox(height: 18.h),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CustomButton(
                  label: context.tr(AppKeys.close),
                  isOutlined: true,
                  textColor: AppColors.textSecondary,
                  borderColor: AppColors.borderWarm,
                  onPressed: () => Navigator.of(context).pop(),
                ),
                SizedBox(width: 8.w),
                CustomButton(
                  label: context.tr(AppKeys.print),
                  backgroundColor: AppColors.cardsGreen,
                  icon: Icons.print_rounded,
                  onPressed: () {
                    // Triggers print action
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(context.tr(AppKeys.print))),
                    );
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

