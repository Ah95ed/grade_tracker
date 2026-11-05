import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';

/// Navigation Tabs matching Daragat Web App (Header.tsx) 1:1
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
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
      child: Row(
        children: [
          // 1. Monthly Sheet (الجدول)
          Expanded(
            child: _buildTabButton(
              context,
              index: 0,
              icon: Icons.table_chart_rounded,
              label: context.tr(AppKeys.tabMonthly),
              activeColor: AppColors.monthlyBlue, // #5692BE
              borderColor: AppColors.monthlyBlueDark, // #3D7299
            ),
          ),
          SizedBox(width: 10.w),
          // 2. Term Average (المعدل)
          Expanded(
            child: _buildTabButton(
              context,
              index: 1,
              icon: Icons.calculate_rounded,
              label: context.tr(AppKeys.tabTerm),
              activeColor: AppColors.termRust, // #B86848
              borderColor: AppColors.termRustDark, // #9C5133
            ),
          ),
          SizedBox(width: 10.w),
          // 3. Report Cards (الكروت)
          Expanded(
            child: _buildTabButton(
              context,
              index: 2,
              icon: Icons.workspace_premium_rounded,
              label: context.tr(AppKeys.tabCards),
              activeColor: AppColors.cardsGreen, // #4E7A68
              borderColor: AppColors.cardsGreenDark, // #385F4F
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
    required String label,
    required Color activeColor,
    required Color borderColor,
  }) {
    final isActive = activeIndex == index;

    return InkWell(
      onTap: () => onTabSelected(index),
      borderRadius: BorderRadius.circular(16.r),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: EdgeInsets.symmetric(vertical: 10.h, horizontal: 4.w),
        decoration: BoxDecoration(
          color: isActive ? activeColor : const Color(0xFFFAF6EC), // craft card bg
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(
            color: isActive ? borderColor : const Color(0xFFC7B5A0),
            width: isActive ? 2.0 : 1.5,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.35),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [
                  BoxShadow(
                    color: const Color(0xFF5A4128).withValues(alpha: 0.05),
                    blurRadius: 3,
                    offset: const Offset(0, 1),
                  ),
                ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22.r,
              color: isActive ? Colors.white : const Color(0xFF78695A),
            ),
            SizedBox(height: 3.h),
            Text(
              label,
              style: TextStyle(
                fontSize: 13.sp,
                fontWeight: FontWeight.w900,
                color: isActive ? Colors.white : const Color(0xFF3D342A),
              ),
            ),
            SizedBox(height: 3.h),
            // White indicator pill when active (matching web w-8 h-1 bg-white/90 rounded-full)
            Container(
              width: 28.w,
              height: 3.h,
              decoration: BoxDecoration(
                color: isActive ? Colors.white.withValues(alpha: 0.9) : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
