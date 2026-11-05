import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/term_controller.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/confirm_dialog.dart';
import 'create_term_dialog.dart';

/// Term Selector and Monthly Models Checkbox bar matching Daragat Web App
class TermSelectorBar extends StatelessWidget {
  const TermSelectorBar({super.key});

  @override
  Widget build(BuildContext context) {
    final termController = context.watch<TermController>();
    final sheetController = context.watch<MonthlySheetController>();
    final terms = termController.terms;
    final activeTerm = termController.currentTerm;
    final models = sheetController.models;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 14.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Full-width "+ إضافة فصل جديد" Terracotta Button
          InkWell(
            onTap: () => showDialog(
              context: context,
              builder: (_) => const CreateTermDialog(),
            ),
            borderRadius: BorderRadius.circular(16.r),
            child: Container(
              padding: EdgeInsets.symmetric(vertical: 12.h, horizontal: 20.w),
              decoration: BoxDecoration(
                color: AppColors.termRust, // #B86848
                borderRadius: BorderRadius.circular(16.r),
                border: Border.all(color: const Color(0xFF944D30), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.termRust.withValues(alpha: 0.28),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_rounded, size: 20.r, color: Colors.white),
                  SizedBox(width: 8.w),
                  Text(
                    'إضافة فصل جديد',
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 10.h),

          // 2. Terms Switcher Card
          if (terms.isNotEmpty)
            Container(
              padding: EdgeInsets.all(12.r),
              decoration: BoxDecoration(
                color: const Color(0xFFFAF7EC),
                borderRadius: BorderRadius.circular(16.r),
                border: Border.all(color: const Color(0xFFD8CEBD), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: terms.map((term) {
                    final isActive = term.id == activeTerm?.id;

                    return Padding(
                      padding: EdgeInsets.only(left: 8.w),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          InkWell(
                            onTap: () => termController.setActiveTerm(term.id),
                            borderRadius: BorderRadius.circular(12.r),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                              decoration: BoxDecoration(
                                color: isActive ? AppColors.termRust : const Color(0xFFEFE3DC),
                                borderRadius: BorderRadius.circular(12.r),
                                border: Border.all(
                                  color: isActive ? const Color(0xFF944D30) : const Color(0xFFD6BFB2),
                                  width: isActive ? 1.5 : 1.0,
                                ),
                                boxShadow: isActive
                                    ? [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.12),
                                          blurRadius: 4,
                                          offset: const Offset(0, 2),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Text(
                                term.name,
                                style: TextStyle(
                                  fontSize: 12.sp,
                                  fontWeight: FontWeight.w900,
                                  color: isActive ? Colors.white : const Color(0xFF4A2818),
                                ),
                              ),
                            ),
                          ),

                          // Delete Badge on active term
                          if (isActive && terms.length > 1)
                            Positioned(
                              top: -6.h,
                              left: -6.w,
                              child: InkWell(
                                onTap: () => showDialog(
                                  context: context,
                                  builder: (_) => ConfirmDialog(
                                    title: 'حذف الفصل',
                                    message: 'هل أنت متأكد من حذف فصل ${term.name}؟',
                                    isDestructive: true,
                                    onConfirm: () => termController.deleteTerm(term.id),
                                  ),
                                ),
                                child: Container(
                                  width: 20.r,
                                  height: 20.r,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Color(0xFFDC2626),
                                    boxShadow: [
                                      BoxShadow(color: Colors.black26, blurRadius: 3),
                                    ],
                                  ),
                                  child: Icon(Icons.close_rounded, size: 12.r, color: Colors.white),
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),

          SizedBox(height: 10.h),

          // 3. Monthly Models Selection Checkboxes for Active Term
          if (activeTerm != null && models.isNotEmpty)
            Container(
              padding: EdgeInsets.all(14.r),
              decoration: BoxDecoration(
                color: AppColors.termRust, // Terracotta container matching web
                borderRadius: BorderRadius.circular(16.r),
                border: Border.all(color: AppColors.termRustDark, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.termRust.withValues(alpha: 0.3),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.calendar_month_rounded, size: 16.r, color: Colors.white),
                          SizedBox(width: 6.w),
                          Text(
                            'تحديد أشهر (${activeTerm.name}):',
                            style: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '(${activeTerm.selectedModelIds.length} محددة)',
                        style: TextStyle(
                          fontSize: 11.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFFFEF3C7),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 10.h),
                  Wrap(
                    spacing: 8.w,
                    runSpacing: 8.h,
                    children: models.map((model) {
                      final isSelected = activeTerm.selectedModelIds.contains(model.id);

                      return InkWell(
                        onTap: () => termController.toggleModelSelection(model.id),
                        borderRadius: BorderRadius.circular(12.r),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF96472A) : Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12.r),
                            border: Border.all(
                              color: isSelected ? const Color(0xFFF2C5B3) : Colors.white.withValues(alpha: 0.3),
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 18.r,
                                height: 18.r,
                                decoration: BoxDecoration(
                                  color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4.r),
                                  border: Border.all(color: Colors.white, width: 1.5),
                                ),
                                child: isSelected
                                    ? Icon(Icons.check_rounded, size: 14.r, color: const Color(0xFF7A361D))
                                    : null,
                              ),
                              SizedBox(width: 8.w),
                              Text(
                                model.name,
                                style: TextStyle(
                                  fontSize: 12.sp,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
