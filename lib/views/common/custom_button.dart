import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/theme/app_colors.dart';

/// Reusable responsive styled button
class CustomButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color backgroundColor;
  final Color textColor;
  final Color? borderColor;
  final bool isOutlined;
  final double? height;

  const CustomButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.backgroundColor = AppColors.monthlyBlue,
    this.textColor = Colors.white,
    this.borderColor,
    this.isOutlined = false,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height ?? 42.h,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: isOutlined ? Colors.transparent : backgroundColor,
          foregroundColor: textColor,
          elevation: isOutlined ? 0 : 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10.r),
            side: BorderSide(
              color: borderColor ?? (isOutlined ? backgroundColor : Colors.transparent),
              width: 1.2,
            ),
          ),
          padding: EdgeInsets.symmetric(horizontal: 14.w),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 16.r, color: textColor),
              SizedBox(width: 6.w),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 13.sp,
                fontWeight: FontWeight.bold,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

