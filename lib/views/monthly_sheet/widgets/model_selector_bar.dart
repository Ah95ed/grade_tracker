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
/// 2. If single table: displays full large card
/// 3. If multiple tables (e.g. 6 tables):
///    - Mobile: Horizontal scrolling ListView (swipe left/right / سكرول صفح)
///    - Desktop / Tablet: Responsive GridView (2 or 3 columns)
///    Each card displays full details: Table name, Teacher, Subject, Grade, Sections, Edit, Swap, Delete
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

          // 2. Models Display: Single Card vs Multiple (Horizontal Scroll on Mobile, GridView on Tablet/Desktop)
          if (models.length == 1 && activeModel != null)
            _buildLargeMonthCard(
              context: context,
              controller: controller,
              model: activeModel,
              isActive: true,
              effectiveTeacher: activeModel.teacherName.isNotEmpty
                  ? activeModel.teacherName
                  : (profile.teacherName.isNotEmpty ? profile.teacherName : ''),
            )
          else if (models.length > 1)
            LayoutBuilder(
              builder: (context, constraints) {
                final isWideScreen = constraints.maxWidth >= 700;

                if (!isWideScreen) {
                  // Mobile: Horizontal scrolling ListView (سكرول صفح يمين/يسار)
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8.w,
                        runSpacing: 4.h,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.swipe_rounded, size: 16.r, color: const Color(0xFF8C5B32)),
                              SizedBox(width: 5.w),
                              Flexible(
                                child: Text(
                                  'الجداول المنشأة (${models.length}): اسحب أفقياً',
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11.5.sp,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF5A4128),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Text(
                            'المختار: ${activeModel?.name ?? ""}',
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF4A82A8),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 6.h),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        child: Row(
                          children: models.map((model) {
                            final isActive = model.id == activeModel?.id;
                            final effectiveTeacher = model.teacherName.isNotEmpty
                                ? model.teacherName
                                : (profile.teacherName.isNotEmpty ? profile.teacherName : '');

                            return Container(
                              width: 320.w,
                              margin: EdgeInsets.only(left: 10.w, bottom: 4.h),
                              child: _buildLargeMonthCard(
                                context: context,
                                controller: controller,
                                model: model,
                                isActive: isActive,
                                effectiveTeacher: effectiveTeacher,
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  );
                } else {
                  // Desktop / Tablet: Responsive GridView (2 or 3 columns)
                  final crossAxisCount = constraints.maxWidth >= 1100 ? 3 : 2;
                  const spacing = 12.0;
                  final itemWidth = (constraints.maxWidth - (spacing * (crossAxisCount - 1))) / crossAxisCount;

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8.w,
                        runSpacing: 4.h,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.grid_view_rounded, size: 16.r, color: const Color(0xFF8C5B32)),
                              SizedBox(width: 6.w),
                              Text(
                                'كشوف الدرجات المتاحة (${models.length}):',
                                style: TextStyle(
                                  fontSize: 12.5.sp,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF3D2E21),
                                ),
                              ),
                            ],
                          ),
                          Text(
                            'انقر على أي جدول لعرض تفاصيله ورصد درجاته',
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF7A6553),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 8.h),
                      Wrap(
                        spacing: spacing,
                        runSpacing: spacing,
                        children: models.map((model) {
                          final isActive = model.id == activeModel?.id;
                          final effectiveTeacher = model.teacherName.isNotEmpty
                              ? model.teacherName
                              : (profile.teacherName.isNotEmpty ? profile.teacherName : '');

                          return SizedBox(
                            width: itemWidth,
                            child: _buildLargeMonthCard(
                              context: context,
                              controller: controller,
                              model: model,
                              isActive: isActive,
                              effectiveTeacher: effectiveTeacher,
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  );
                }
              },
            ),
        ],
      ),
    );
  }

  /// Builds the prominent, organized card showing all table details
  Widget _buildLargeMonthCard({
    required BuildContext context,
    required MonthlySheetController controller,
    required MonthlyModel model,
    required bool isActive,
    required String effectiveTeacher,
  }) {
    final activeSection = controller.selectedSection;
    final assignedSectionsText = model.assignedSections.isNotEmpty
        ? model.assignedSections.join('، ')
        : 'جميع الشُعب';

    return InkWell(
      onTap: () => controller.setActiveModel(model.id),
      borderRadius: BorderRadius.circular(16.r),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: EdgeInsets.all(13.r),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFFFAF7EC) : const Color(0xFFFFFDF8),
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(
            color: isActive ? AppColors.craftBrown : const Color(0xFFD8CEBD),
            width: isActive ? 2.0 : 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: isActive
                  ? const Color(0xFF64462D).withValues(alpha: 0.16)
                  : Colors.black.withValues(alpha: 0.04),
              blurRadius: isActive ? 6 : 3,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Row: Icon, Title, Name, Badges, Active indicator & Delete Button
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Icon Box
                Container(
                  padding: EdgeInsets.all(7.r),
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFFEBDDC8) : const Color(0xFFF3ECE0),
                    borderRadius: BorderRadius.circular(10.r),
                    border: Border.all(color: const Color(0xFFCBB69F)),
                  ),
                  child: Icon(
                    Icons.table_chart_rounded,
                    size: 16.r,
                    color: const Color(0xFF8C5B32),
                  ),
                ),
                SizedBox(width: 8.w),

                // Title + Name
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 6.w,
                        runSpacing: 4.h,
                        children: [
                          Text(
                            'كشف درجات: ',
                            style: TextStyle(
                              fontSize: 12.5.sp,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF2F2822),
                            ),
                          ),
                          Text(
                            model.name,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 14.5.sp,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF4A82A8),
                            ),
                          ),
                          if (isActive)
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 1.5.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFF15803D),
                                borderRadius: BorderRadius.circular(6.r),
                              ),
                              child: Text(
                                'نشط',
                                style: TextStyle(
                                  fontSize: 9.sp,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                        ],
                      ),
                      SizedBox(height: 4.h),
                      // Stage & Subject Badges
                      Wrap(
                        spacing: 4.w,
                        runSpacing: 4.h,
                        children: [
                          if (model.gradeLevel.isNotEmpty)
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 2.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6.r),
                                border: Border.all(color: const Color(0xFFBFDBFE)),
                              ),
                              child: Text(
                                model.gradeLevel,
                                style: TextStyle(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF1E40AF),
                                ),
                              ),
                            ),
                          if (model.subject.isNotEmpty)
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 2.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD1FAE5),
                                borderRadius: BorderRadius.circular(6.r),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: Text(
                                model.subject,
                                style: TextStyle(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF065F46),
                                ),
                              ),
                            ),
                        ],
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
                      padding: EdgeInsets.all(5.r),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8.r),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Icon(
                        Icons.delete_outline_rounded,
                        size: 15.r,
                        color: const Color(0xFFDC2626),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 8.h),

            // Middle Row: Teacher & Sections Badges
            Wrap(
              spacing: 6.w,
              runSpacing: 5.h,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                // Teacher Badge
                if (effectiveTeacher.isNotEmpty)
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 3.5.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(6.r),
                      border: Border.all(color: const Color(0xFFC7D2FE)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.person_rounded, size: 12.r, color: const Color(0xFF4338CA)),
                        SizedBox(width: 3.w),
                        Text(
                          'الأستاذ: $effectiveTeacher',
                          style: TextStyle(
                            fontSize: 10.sp,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF3730A3),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Assigned Sections Badge
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 3.5.h),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(6.r),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.groups_rounded, size: 12.r, color: const Color(0xFF92400E)),
                      SizedBox(width: 3.w),
                      Text(
                        'الشُعب: $assignedSectionsText',
                        style: TextStyle(
                          fontSize: 10.sp,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF92400E),
                        ),
                      ),
                    ],
                  ),
                ),

                // Current Active Filtered Section Badge (only on active card)
                if (isActive && activeSection != 'ALL')
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 3.5.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(6.r),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Text(
                      'المعروض: شعبة $activeSection',
                      style: TextStyle(
                        fontSize: 9.5.sp,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF166534),
                      ),
                    ),
                  ),
              ],
            ),
            SizedBox(height: 10.h),

            // Bottom Row: Action Buttons
            Wrap(
              spacing: 6.w,
              runSpacing: 6.h,
              children: [
                // Edit Model, Subject, & Teacher Button
                InkWell(
                  onTap: () => showDialog(
                    context: context,
                    builder: (_) => EditModelDialog(model: model),
                  ),
                  borderRadius: BorderRadius.circular(8.r),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
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
                        Icon(Icons.edit_rounded, size: 11.r, color: const Color(0xFFBA916C)),
                        SizedBox(width: 4.w),
                        Flexible(
                          child: Text(
                            'تعديل بيانات الجدول (الاسم والمادة والأستاذ)',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF6D4C2F),
                            ),
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
                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
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
                        Icon(Icons.swap_horiz_rounded, size: 12.r, color: const Color(0xFF4338CA)),
                        SizedBox(width: 3.w),
                        Flexible(
                          child: Text(
                            'تبديل الشعبة بين الأساتذة',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF3730A3),
                            ),
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
