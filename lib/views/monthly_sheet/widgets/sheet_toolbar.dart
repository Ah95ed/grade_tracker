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

/// Sheet Header and Toolbar matching Daragat Web App
class SheetToolbar extends StatelessWidget {
  const SheetToolbar({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final model = controller.currentModel;
    final sections = controller.availableSections;
    final selectedSection = controller.selectedSection;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.craftCardBg, // #FAF6EC
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(color: AppColors.craftBorder, width: 1.5), // #AA8362
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF5A4128).withValues(alpha: 0.06),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Table Title Bar (#F8F4EA, border-b #D8CEBD)
            if (model != null)
              Container(
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF8F4EA),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(14)),
                  border: Border(bottom: BorderSide(color: Color(0xFFD8CEBD))),
                ),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 10.w,
                  runSpacing: 8.h,
                  children: [
                    // Title with Badges
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'كشف درجات: ',
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.bold,
                            color: AppColors.inkDark,
                          ),
                        ),
                        Text(
                          model.name,
                          style: TextStyle(
                            fontSize: 14.sp,
                            fontWeight: FontWeight.w900,
                            color: AppColors.monthlyBlueDark,
                          ),
                        ),
                        if (model.gradeLevel.isNotEmpty) ...[
                          SizedBox(width: 6.w),
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF), // blue-50
                              borderRadius: BorderRadius.circular(8.r),
                              border: Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: Text(
                              model.gradeLevel,
                              style: TextStyle(
                                fontSize: 10.5.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF1E40AF),
                              ),
                            ),
                          ),
                        ],
                        if (model.subject.isNotEmpty) ...[
                          SizedBox(width: 6.w),
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5), // emerald-50
                              borderRadius: BorderRadius.circular(8.r),
                              border: Border.all(color: const Color(0xFFA7F3D0)),
                            ),
                            child: Text(
                              model.subject,
                              style: TextStyle(
                                fontSize: 10.5.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF065F46),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),

                    // Section Filter Pills ("جميع الشُعب" + "أ" + "ب"...)
                    Container(
                      padding: EdgeInsets.all(3.r),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3EDE2),
                        borderRadius: BorderRadius.circular(10.r),
                        border: Border.all(color: const Color(0xFFD8CEBD)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildSectionPill(
                            context,
                            label: 'جميع الشُعب',
                            isSelected: selectedSection == 'ALL',
                            onTap: () => controller.setSelectedSection('ALL'),
                          ),
                          ...sections.map((sec) => _buildSectionPill(
                                context,
                                label: sec,
                                isSelected: selectedSection == sec,
                                onTap: () => controller.setSelectedSection(sec),
                              )),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            // 2. Search & Action Toolbar Body
            Padding(
              padding: EdgeInsets.all(12.r),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Search Box
                  SizedBox(
                    height: 40.h,
                    child: TextField(
                      onChanged: controller.setSearchQuery,
                      style: TextStyle(fontSize: 12.5.sp, color: AppColors.inkDark, fontWeight: FontWeight.w600),
                      decoration: InputDecoration(
                        hintText: 'بحث باسم الطالب أو الشعبة...',
                        hintStyle: TextStyle(fontSize: 11.5.sp, color: AppColors.textMuted),
                        prefixIcon: Icon(Icons.search_rounded, size: 18.r, color: AppColors.textSecondary),
                        contentPadding: EdgeInsets.zero,
                        filled: true,
                        fillColor: AppColors.inputBg, // #FAF8F5
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12.r),
                          borderSide: const BorderSide(color: AppColors.inputBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12.r),
                          borderSide: const BorderSide(color: AppColors.inputBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12.r),
                          borderSide: const BorderSide(color: AppColors.slateLight, width: 1.5),
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: 10.h),

                  // Action Buttons Row matching Web
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildActionButton(
                          context,
                          icon: Icons.person_add_rounded,
                          label: context.tr(AppKeys.addStudent),
                          color: AppColors.monthlyBlue, // #5692BE
                          onTap: () => showDialog(
                            context: context,
                            builder: (_) => const AddStudentDialog(),
                          ),
                        ),
                        SizedBox(width: 8.w),
                        _buildActionButton(
                          context,
                          icon: Icons.view_column_rounded,
                          label: context.tr(AppKeys.addColumn),
                          color: AppColors.cardsGreen, // #4E7A68
                          onTap: () => showDialog(
                            context: context,
                            builder: (_) => const AddColumnDialog(),
                          ),
                        ),
                        SizedBox(width: 8.w),
                        _buildActionButton(
                          context,
                          icon: Icons.auto_awesome_rounded,
                          label: context.tr(AppKeys.roundingSettings),
                          color: AppColors.craftBrown, // #BA916C
                          onTap: () => showDialog(
                            context: context,
                            builder: (_) => const RoundingSettingsDialog(),
                          ),
                        ),
                        SizedBox(width: 8.w),
                        _buildActionButton(
                          context,
                          icon: Icons.calculate_rounded,
                          label: context.tr(AppKeys.finalScoreOperation),
                          color: AppColors.termRust, // #B86848
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
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionPill(
    BuildContext context, {
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8.r),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.craftBrown : Colors.transparent,
          borderRadius: BorderRadius.circular(8.r),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 3,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.sp,
            fontWeight: FontWeight.w900,
            color: isSelected ? Colors.white : const Color(0xFF6D4C2F),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12.r),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(12.r),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.28),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15.r, color: Colors.white),
            SizedBox(width: 6.w),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5.sp,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
