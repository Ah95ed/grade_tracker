import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import 'add_student_dialog.dart';
import 'add_column_dialog.dart';
import 'rounding_settings_dialog.dart';
import 'final_operation_dialog.dart';

/// Interactive toolbar with action buttons for the monthly sheet
class SheetToolbar extends StatelessWidget {
  const SheetToolbar({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
      child: Column(
        children: [
          // Search Bar
          SizedBox(
            height: 38.h,
            child: TextField(
              onChanged: controller.setSearchQuery,
              decoration: InputDecoration(
                hintText: context.tr(AppKeys.search),
                hintStyle: TextStyle(fontSize: 12.sp, color: AppColors.textMuted),
                prefixIcon: Icon(Icons.search_rounded, size: 18.r, color: AppColors.textSecondary),
                contentPadding: EdgeInsets.zero,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10.r),
                  borderSide: const BorderSide(color: AppColors.borderWarm),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10.r),
                  borderSide: const BorderSide(color: AppColors.borderWarm),
                ),
              ),
            ),
          ),
          SizedBox(height: 8.h),
          // Action Buttons Row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildActionButton(
                  context,
                  icon: Icons.person_add_rounded,
                  labelKey: AppKeys.addStudent,
                  color: AppColors.monthlyBlue,
                  onTap: () => showDialog(
                    context: context,
                    builder: (_) => const AddStudentDialog(),
                  ),
                ),
                SizedBox(width: 6.w),
                _buildActionButton(
                  context,
                  icon: Icons.view_column_rounded,
                  labelKey: AppKeys.addColumn,
                  color: AppColors.cardsGreen,
                  onTap: () => showDialog(
                    context: context,
                    builder: (_) => const AddColumnDialog(),
                  ),
                ),
                SizedBox(width: 6.w),
                _buildActionButton(
                  context,
                  icon: Icons.auto_awesome_rounded,
                  labelKey: AppKeys.roundingSettings,
                  color: AppColors.academicGold,
                  onTap: () => showDialog(
                    context: context,
                    builder: (_) => const RoundingSettingsDialog(),
                  ),
                ),
                SizedBox(width: 6.w),
                _buildActionButton(
                  context,
                  icon: Icons.calculate_rounded,
                  labelKey: AppKeys.finalScoreOperation,
                  color: AppColors.termRust,
                  onTap: () => showDialog(
                    context: context,
                    builder: (_) => const FinalOperationDialog(),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(
    BuildContext context, {
    required IconData icon,
    required String labelKey,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8.r),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8.r),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14.r, color: color),
            SizedBox(width: 4.w),
            Text(
              context.tr(labelKey),
              style: TextStyle(
                fontSize: 11.sp,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
