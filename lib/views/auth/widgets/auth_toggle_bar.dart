import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';

/// Segmented tab bar toggling between Login and Registration modes
class AuthToggleBar extends StatelessWidget {
  final bool isRegister;
  final ValueChanged<bool> onToggle;

  const AuthToggleBar({
    super.key,
    required this.isRegister,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.creamBackground,
        borderRadius: BorderRadius.circular(10.r),
        border: Border.all(color: AppColors.borderWarm),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildItem(
              label: context.tr(AppKeys.login),
              isSelected: !isRegister,
              onTap: () => onToggle(false),
            ),
          ),
          Expanded(
            child: _buildItem(
              label: context.tr(AppKeys.register),
              isSelected: isRegister,
              onTap: () => onToggle(true),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItem({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8.r),
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 8.h),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.monthlyBlue : Colors.transparent,
          borderRadius: BorderRadius.circular(8.r),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.sp,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

