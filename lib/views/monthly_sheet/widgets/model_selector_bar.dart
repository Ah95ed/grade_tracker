import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/monthly_model.dart';
import '../../common/confirm_dialog.dart';
import 'add_model_dialog.dart';
import 'add_student_dialog.dart';
import 'edit_model_dialog.dart';
import 'teacher_sections_swap_dialog.dart';

/// Top section for Monthly Sheet:
/// 1. Large Craft Brown "+ جدول درجات جديد" Button
/// 2. If multiple models: Month Tabs Switcher
/// 3. Prominent, large, well-organized Month Model Card matching user specification:
///    - Table name (e.g. الشهر الأول)
///    - Grade / Stage badge (e.g. الأول الابتدائي)
///    - Subject badge (e.g. عربي)
///    - Teacher name (الأستاذ: ...)
///    - Assigned & active section (الشعبة: جميع الشعب / شعبة ...)
///    - Quick elegant action buttons:
///       • تعديل بيانات الجدول (الاسم والمادة والأستاذ)
///       • تبديل الشعبة بين الأساتذة
///       • زر الحذف الأنيق
class ModelSelectorBar extends StatelessWidget {
  const ModelSelectorBar({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final profile = context.watch<TeacherProfileController>().profile;
    final models = controller.models;
    final activeModel = controller.currentModel;

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

          // 2. Month Tabs Switcher (when multiple months exist)
          if (models.length > 1) ...[
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: models.map((model) {
                  final isActive = model.id == activeModel?.id;
                  return Padding(
                    padding: EdgeInsets.only(left: 8.w),
                    child: InkWell(
                      onTap: () => controller.setActiveModel(model.id),
                      borderRadius: BorderRadius.circular(12.r),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 7.h),
                        decoration: BoxDecoration(
                          color: isActive ? AppColors.craftBrown : const Color(0xFFEFE6D8),
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(
                            color: isActive ? const Color(0xFF9E7752) : const Color(0xFFD8CEBD),
                            width: 1.2,
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
                            Icon(
                              Icons.calendar_today_rounded,
                              size: 13.r,
                              color: isActive ? Colors.white : const Color(0xFF7A6553),
                            ),
                            SizedBox(width: 6.w),
                            Text(
                              model.name,
                              style: TextStyle(
                                fontSize: 12.sp,
                                fontWeight: FontWeight.w900,
                                color: isActive ? Colors.white : const Color(0xFF3D2E21),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            SizedBox(height: 10.h),
          ],

          // 3. Large, Organized Month Table Card
          if (activeModel != null)
            _buildLargeMonthCard(
              context: context,
              controller: controller,
              model: activeModel,
              effectiveTeacher: activeModel.teacherName.isNotEmpty
                  ? activeModel.teacherName
                  : (profile.teacherName.isNotEmpty ? profile.teacherName : ''),
            ),
        ],
      ),
    );
  }

  /// Builds the prominent, large card showing all table details
  Widget _buildLargeMonthCard({
    required BuildContext context,
    required MonthlySheetController controller,
    required MonthlyModel model,
    required String effectiveTeacher,
  }) {
    final activeSection = controller.selectedSection;
    final assignedSectionsText = model.assignedSections.isNotEmpty
        ? model.assignedSections.join('، ')
        : 'جميع الشُعب';

    return InkWell(
      onTap: () => controller.setActiveModel(model.id),
      borderRadius: BorderRadius.circular(16.r),
      child: Container(
        padding: EdgeInsets.all(14.r),
        decoration: BoxDecoration(
          color: const Color(0xFFFAF7EC), // Craft parchment cream
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(color: const Color(0xFFCBB69F), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF5A4128).withValues(alpha: 0.08),
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Row: Title, Model Name, Stage & Subject Badges, and Delete Button
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Icon Box
                Container(
                  padding: EdgeInsets.all(8.r),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEBDDC8),
                    borderRadius: BorderRadius.circular(10.r),
                    border: Border.all(color: const Color(0xFFCBB69F)),
                  ),
                  child: Icon(
                    Icons.table_chart_rounded,
                    size: 18.r,
                    color: const Color(0xFF8C5B32),
                  ),
                ),
                SizedBox(width: 10.w),

                // Title + Name + Badges
                Expanded(
                  child: Wrap(
                    spacing: 8.w,
                    runSpacing: 6.h,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        'كشف درجات: ',
                        style: TextStyle(
                          fontSize: 13.5.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF2F2822),
                        ),
                      ),
                      Text(
                        model.name,
                        style: TextStyle(
                          fontSize: 15.5.sp,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF4A82A8),
                        ),
                      ),
                      if (model.gradeLevel.isNotEmpty)
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 9.w, vertical: 3.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8.r),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: Text(
                            model.gradeLevel,
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF1E40AF),
                            ),
                          ),
                        ),
                      if (model.subject.isNotEmpty)
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 9.w, vertical: 3.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD1FAE5),
                            borderRadius: BorderRadius.circular(8.r),
                            border: Border.all(color: const Color(0xFFA7F3D0)),
                          ),
                          child: Text(
                            model.subject,
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF065F46),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Small Elegant Delete Button
                Tooltip(
                  message: 'حذف جدول ${model.name}',
                  child: InkWell(
                    onTap: () => _confirmDeleteModel(context, controller, model),
                    borderRadius: BorderRadius.circular(8.r),
                    child: Container(
                      padding: EdgeInsets.all(6.r),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8.r),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Icon(
                        Icons.delete_outline_rounded,
                        size: 16.r,
                        color: const Color(0xFFDC2626),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 10.h),

            // Middle Row: Teacher, Sections, and Active Section Badges
            Wrap(
              spacing: 8.w,
              runSpacing: 6.h,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                // Teacher Badge
                if (effectiveTeacher.isNotEmpty)
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 9.w, vertical: 4.5.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: const Color(0xFFC7D2FE)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.person_rounded, size: 14.r, color: const Color(0xFF4338CA)),
                        SizedBox(width: 4.w),
                        Text(
                          'الأستاذ: $effectiveTeacher',
                          style: TextStyle(
                            fontSize: 11.sp,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF3730A3),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Assigned Sections Badge
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 9.w, vertical: 4.5.h),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(8.r),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.groups_rounded, size: 14.r, color: const Color(0xFF92400E)),
                      SizedBox(width: 4.w),
                      Text(
                        'الشُعب: $assignedSectionsText',
                        style: TextStyle(
                          fontSize: 11.sp,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF92400E),
                        ),
                      ),
                    ],
                  ),
                ),

                // Current Active Filtered Section Badge
                if (activeSection != 'ALL')
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.5.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Text(
                      'المعروض: شعبة $activeSection',
                      style: TextStyle(
                        fontSize: 10.5.sp,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF166534),
                      ),
                    ),
                  ),
              ],
            ),
            SizedBox(height: 12.h),

            // Bottom Row: Action Buttons
            Wrap(
              spacing: 8.w,
              runSpacing: 8.h,
              children: [
                // Edit Model, Subject, & Teacher Button
                InkWell(
                  onTap: () => showDialog(
                    context: context,
                    builder: (_) => EditModelDialog(model: model),
                  ),
                  borderRadius: BorderRadius.circular(8.r),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEBDDC8),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: const Color(0xFFCBB69F)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 2,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.edit_rounded, size: 13.r, color: const Color(0xFFBA916C)),
                        SizedBox(width: 5.w),
                        Text(
                          'تعديل بيانات الجدول (الاسم والمادة والأستاذ)',
                          style: TextStyle(
                            fontSize: 11.sp,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF6D4C2F),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Switch Sections Between Teachers Button
                InkWell(
                  onTap: () => showDialog(
                    context: context,
                    builder: (_) => TeacherSectionsSwapDialog(model: model),
                  ),
                  borderRadius: BorderRadius.circular(8.r),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: const Color(0xFFC7D2FE)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF4338CA).withValues(alpha: 0.06),
                          blurRadius: 2,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.swap_horiz_rounded, size: 14.r, color: const Color(0xFF4338CA)),
                        SizedBox(width: 4.w),
                        Text(
                          'تبديل الشعبة بين الأساتذة',
                          style: TextStyle(
                            fontSize: 11.sp,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF3730A3),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteModel(
    BuildContext context,
    MonthlySheetController controller,
    MonthlyModel model,
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
