import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';

/// Navigation Tabs matching the original 3 distinct tab signatures
class HomeTabBar extends StatelessWidget {
  final int activeIndex;
  final ValueChanged<int> onTabSelected;

  const HomeTabBar({
    super.key,
    required this.activeIndex,
    required this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
      child: Row(
        children: [
          // 1. Monthly Sheet (الجدول)
          Expanded(
            child: _buildTabButton(
              context,
              index: 0,
              icon: Icons.table_chart_rounded,
              labelKey: AppKeys.tabMonthly,
              activeColor: AppColors.monthlyBlue,
              darkColor: AppColors.monthlyBlueDark,
            ),
          ),
          SizedBox(width: 8.w),
          // 2. Term Average (المعدل)
          Expanded(
            child: _buildTabButton(
              context,
              index: 1,
              icon: Icons.calculate_rounded,
              labelKey: AppKeys.tabTerm,
              activeColor: AppColors.termRust,
              darkColor: AppColors.termRustDark,
            ),
          ),
          SizedBox(width: 8.w),
          // 3. Report Cards (الكروت)
          Expanded(
            child: _buildTabButton(
              context,
              index: 2,
              icon: Icons.workspace_premium_rounded,
              labelKey: AppKeys.tabCards,
              activeColor: AppColors.cardsGreen,
              darkColor: AppColors.cardsGreenDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(
    BuildContext context, {
    required int index,
    required IconData icon,
    required String labelKey,
    required Color activeColor,
    required Color darkColor,
  }) {
    final isActive = activeIndex == index;

    return InkWell(
      onTap: () => onTabSelected(index),
      borderRadius: BorderRadius.circular(12.r),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: EdgeInsets.symmetric(vertical: 10.h),
        decoration: BoxDecoration(
          color: isActive ? activeColor : AppColors.creamBackground,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(
            color: isActive ? darkColor : AppColors.borderWarm,
            width: isActive ? 1.8 : 1.2,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.35),
                    blurRadius: 6,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20.r,
              color: isActive ? Colors.white : AppColors.textSecondary,
            ),
            SizedBox(height: 3.h),
            Text(
              context.tr(labelKey),
              style: TextStyle(
                fontSize: 12.sp,
                fontWeight: FontWeight.bold,
                color: isActive ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
