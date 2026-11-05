import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/confirm_dialog.dart';
import 'add_model_dialog.dart';

/// Top section for monthly sheet matching Daragat Web App:
/// 1. Large Craft Camel Brown "+ جدول درجات جديد" Button
/// 2. Craft Card containing Month Model chips with edit/delete badges
class ModelSelectorBar extends StatelessWidget {
  const ModelSelectorBar({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final models = controller.models;
    final activeId = controller.activeModelId;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 14.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Large Craft Camel Brown "+ جدول درجات جديد" Button
          InkWell(
            onTap: () => showDialog(
              context: context,
              builder: (_) => const AddModelDialog(),
            ),
            borderRadius: BorderRadius.circular(16.r),
            child: Container(
              padding: EdgeInsets.symmetric(vertical: 12.h, horizontal: 20.w),
              decoration: BoxDecoration(
                color: AppColors.craftBrown, // #BA916C
                borderRadius: BorderRadius.circular(16.r),
                border: Border.all(color: const Color(0xFF9E7752), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF64462D).withValues(alpha: 0.22),
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
                    'جدول درجات جديد',
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

          // 2. Month Model Tabs Card (craft-card)
          if (models.isNotEmpty)
            Container(
              padding: EdgeInsets.all(12.r),
              decoration: BoxDecoration(
                color: AppColors.craftCardBg, // #FAF6EC
                borderRadius: BorderRadius.circular(16.r),
                border: Border.all(color: AppColors.craftBorder, width: 1.5), // #AA8362
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF5A4128).withValues(alpha: 0.08),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: models.map((model) {
                    final isActive = model.id == activeId;

                    return Padding(
                      padding: EdgeInsets.only(left: 8.w),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          InkWell(
                            onTap: () => controller.setActiveModel(model.id),
                            borderRadius: BorderRadius.circular(12.r),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                              decoration: BoxDecoration(
                                color: isActive ? AppColors.craftBrown : const Color(0xFFEBDDC8),
                                borderRadius: BorderRadius.circular(12.r),
                                border: Border.all(
                                  color: isActive ? const Color(0xFF9E7752) : const Color(0xFFCBB69F),
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
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    model.name,
                                    style: TextStyle(
                                      fontSize: 12.sp,
                                      fontWeight: FontWeight.w900,
                                      color: isActive ? Colors.white : const Color(0xFF3D2E21),
                                    ),
                                  ),
                                  if (model.gradeLevel.isNotEmpty) ...[
                                    SizedBox(width: 6.w),
                                    Container(
                                      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                                      decoration: BoxDecoration(
                                        color: isActive
                                            ? Colors.white.withValues(alpha: 0.25)
                                            : Colors.white.withValues(alpha: 0.6),
                                        borderRadius: BorderRadius.circular(6.r),
                                        border: Border.all(
                                          color: isActive ? Colors.white.withValues(alpha: 0.3) : const Color(0xFFCBB69F),
                                        ),
                                      ),
                                      child: Text(
                                        model.gradeLevel,
                                        style: TextStyle(
                                          fontSize: 9.5.sp,
                                          fontWeight: FontWeight.bold,
                                          color: isActive ? Colors.white : const Color(0xFF3D2E21),
                                        ),
                                      ),
                                    ),
                                  ],
                                  if (model.subject.isNotEmpty) ...[
                                    SizedBox(width: 4.w),
                                    Container(
                                      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                                      decoration: BoxDecoration(
                                        color: isActive
                                            ? Colors.black.withValues(alpha: 0.2)
                                            : Colors.black.withValues(alpha: 0.08),
                                        borderRadius: BorderRadius.circular(6.r),
                                      ),
                                      child: Text(
                                        model.subject,
                                        style: TextStyle(
                                          fontSize: 9.5.sp,
                                          fontWeight: FontWeight.bold,
                                          color: isActive ? const Color(0xFFFEF3C7) : const Color(0xFF544030),
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),

                          // Red Delete button on top-left of active model chip
                          if (isActive && models.length > 1)
                            Positioned(
                              top: -6.h,
                              left: -6.w,
                              child: InkWell(
                                onTap: () => showDialog(
                                  context: context,
                                  builder: (_) => ConfirmDialog(
                                    title: 'حذف النموذج',
                                    message: 'هل أنت متأكد من حذف نموذج ${model.name}؟',
                                    isDestructive: true,
                                    onConfirm: () => controller.deleteModel(model.id),
                                  ),
                                ),
                                child: Container(
                                  width: 20.r,
                                  height: 20.r,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Color(0xFFDC2626), // red-600
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
        ],
      ),
    );
  }
}
