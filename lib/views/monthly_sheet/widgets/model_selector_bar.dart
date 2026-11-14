import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/confirm_dialog.dart';
import 'add_model_dialog.dart';
import 'add_student_dialog.dart';
import 'edit_model_dialog.dart';

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
            onTap: () async {
              final shouldOpenAddStudents = await showDialog<bool>(
                context: context,
                builder: (_) => const AddModelDialog(),
              );
              if (shouldOpenAddStudents == true && context.mounted) {
                showDialog(
                  context: context,
                  builder: (_) => const AddStudentDialog(),
                );
              }
            },
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
                            onLongPress: () => _confirmDeleteModel(context, controller, model),
                            borderRadius: BorderRadius.circular(12.r),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
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
                                  if (model.assignedSections.isNotEmpty) ...[
                                    SizedBox(width: 4.w),
                                    Container(
                                      padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 2.h),
                                      decoration: BoxDecoration(
                                        color: isActive ? const Color(0xFF1B5E20) : const Color(0xFF2E7D32),
                                        borderRadius: BorderRadius.circular(6.r),
                                      ),
                                      child: Text(
                                        model.assignedSections.join('،'),
                                        style: TextStyle(
                                          fontSize: 9.sp,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ],
                                  // Edit Button on active model
                                  if (isActive) ...[
                                    SizedBox(width: 6.w),
                                    InkWell(
                                      onTap: () => showDialog(
                                        context: context,
                                        builder: (_) => EditModelDialog(model: model),
                                      ),
                                      child: Container(
                                        padding: EdgeInsets.all(3.r),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(alpha: 0.28),
                                          shape: BoxShape.circle,
                                        ),
                                        child: Icon(
                                          Icons.edit_rounded,
                                          size: 13.r,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),

                          // Red Delete button on top-left of active model chip
                          if (isActive)
                            Positioned(
                              top: -7.h,
                              left: -7.w,
                              child: Tooltip(
                                message: 'حذف جدول ${model.name}',
                                child: InkWell(
                                  onTap: () => _confirmDeleteModel(context, controller, model),
                                  borderRadius: BorderRadius.circular(12.r),
                                  child: Container(
                                    width: 22.r,
                                    height: 22.r,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: const Color(0xFFDC2626), // red-600
                                      border: Border.all(color: Colors.white, width: 1.5),
                                      boxShadow: const [
                                        BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 1)),
                                      ],
                                    ),
                                    child: Icon(Icons.close_rounded, size: 13.r, color: Colors.white),
                                  ),
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

  void _confirmDeleteModel(
    BuildContext context,
    MonthlySheetController controller,
    dynamic model,
  ) {
    showDialog(
      context: context,
      builder: (_) => ConfirmDialog(
        title: 'تأكيد حذف جدول (${model.name})',
        message:
            'هل أنت متأكد من الاستمرار في حذف جدول (${model.name}) بالكامل؟ سيتم حذف جميع درجات وطلاب هذا الشهر ولا يمكن استرجاعها.',
        confirmLabel: 'نعم، استمر في حذف الجدول',
        isDestructive: true,
        onConfirm: () async {
          final modelName = model.name;
          await controller.deleteModel(model.id);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('تم حذف جدول ($modelName) بنجاح'),
                backgroundColor: const Color(0xFFDC2626),
                duration: const Duration(seconds: 3),
              ),
            );
          }
        },
      ),
    );
  }
}
