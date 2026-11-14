import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/localization/translation_keys.dart';
import '../../core/theme/app_colors.dart';
import 'custom_button.dart';

/// Standard confirmation dialog with zero hardcoding
class ConfirmDialog extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback onConfirm;
  final bool isDestructive;
  final String? confirmLabel;

  const ConfirmDialog({
    super.key,
    required this.title,
    required this.message,
    required this.onConfirm,
    this.isDestructive = false,
    this.confirmLabel,
  });

  @override
  Widget build(BuildContext context) {
    String cancelText = 'إلغاء';
    String confirmText = confirmLabel ?? 'تأكيد';
    try {
      cancelText = context.tr(AppKeys.cancel);
      if (confirmLabel == null) {
        confirmText = context.tr(AppKeys.confirm);
      }
    } catch (_) {}

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 16.sp,
          fontWeight: FontWeight.bold,
          color: isDestructive ? AppColors.error : AppColors.textPrimary,
        ),
      ),
      content: Text(
        message,
        style: TextStyle(
          fontSize: 13.sp,
          color: AppColors.textSecondary,
        ),
      ),
      actions: [
        CustomButton(
          label: cancelText,
          isOutlined: true,
          textColor: AppColors.textSecondary,
          borderColor: AppColors.borderWarm,
          onPressed: () => Navigator.of(context).pop(),
        ),
        SizedBox(width: 8.w),
        CustomButton(
          label: confirmText,
          backgroundColor: isDestructive ? AppColors.error : AppColors.monthlyBlue,
          onPressed: () {
            Navigator.of(context).pop();
            onConfirm();
          },
        ),
      ],
    );
  }
}

