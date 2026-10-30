import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/theme/app_colors.dart';

/// Rating Badge Widget displaying status with appropriate theme color
class RatingBadge extends StatelessWidget {
  final String ratingKey;
  final String status;

  const RatingBadge({
    super.key,
    required this.ratingKey,
    required this.status,
  });

  Color _getBadgeColor() {
    switch (ratingKey) {
      case 'ratingExcellent':
        return AppColors.gradeExcellent;
      case 'ratingVeryGood':
        return AppColors.gradeVeryGood;
      case 'ratingGood':
        return AppColors.gradeGood;
      case 'ratingMedium':
        return AppColors.gradeMedium;
      case 'ratingPass':
        return AppColors.gradePass;
      case 'ratingFail':
        return AppColors.gradeFail;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getBadgeColor();
    final text = context.tr(ratingKey);

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6.r),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 1),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10.sp,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}
