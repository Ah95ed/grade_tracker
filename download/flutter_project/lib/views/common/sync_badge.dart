import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/localization/translation_keys.dart';
import '../../core/theme/app_colors.dart';

/// Cloud and Local Sync Status indicator badge
class SyncBadge extends StatelessWidget {
  final bool isOnline;
  final bool isSyncing;
  final VoidCallback? onTap;

  const SyncBadge({
    super.key,
    required this.isOnline,
    this.isSyncing = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final textKey = isOnline ? AppKeys.liveSyncOnline : AppKeys.liveSyncOffline;
    final color = isOnline ? AppColors.cardsGreen : AppColors.textSecondary;
    final isWide = MediaQuery.of(context).size.width >= 460;

    return Tooltip(
      message: context.tr(textKey),
      child: InkWell(
        onTap: isSyncing ? null : onTap,
        borderRadius: BorderRadius.circular(8.r),
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: isWide ? 8.w : 6.w, vertical: 4.h),
          decoration: BoxDecoration(
            color: AppColors.creamBackground,
            borderRadius: BorderRadius.circular(8.r),
            border: Border.all(color: AppColors.borderWarm),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isSyncing)
                SizedBox(
                  width: 14.r,
                  height: 14.r,
                  child: const CircularProgressIndicator(strokeWidth: 2, color: AppColors.monthlyBlue),
                )
              else
                Icon(
                  isOnline ? Icons.cloud_done_rounded : Icons.save_rounded,
                  size: 14.r,
                  color: color,
                ),
              if (isWide) ...[
                SizedBox(width: 4.w),
                Text(
                  context.tr(textKey),
                  style: TextStyle(
                    fontSize: 10.sp,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
