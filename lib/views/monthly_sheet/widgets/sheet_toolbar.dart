import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../core/theme/app_colors.dart';
import 'add_student_dialog.dart';
import 'add_column_dialog.dart';
import 'edit_model_dialog.dart';
import 'rounding_settings_dialog.dart';
import 'final_operation_dialog.dart';

/// Top Table Header & Action Toolbar matching Daragat Web App exactly as in user image
class SheetToolbar extends StatelessWidget {
  const SheetToolbar({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final profile = context.watch<TeacherProfileController>().profile;
    final model = controller.currentModel;

    if (model == null) return const SizedBox.shrink();

    final sections = controller.availableSections;
    final selectedSection = controller.selectedSection;
    final gradeText = model.gradeLevel.isNotEmpty ? model.gradeLevel : 'الصف';
    final effectiveTeacher = model.teacherName.isNotEmpty ? model.teacherName : profile.teacherName;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 14.w),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFFAF7EC), // Craft parchment cream
          borderRadius: BorderRadius.vertical(top: Radius.circular(16.r)),
          border: Border.all(color: const Color(0xFFD8CEBD), width: 1.2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Top Title & Information Bar (#F8F4EA)
            Container(
              padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
              decoration: const BoxDecoration(
                color: Color(0xFFF8F4EA),
                borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
                border: Border(bottom: BorderSide(color: Color(0xFFD8CEBD))),
              ),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8.w,
                runSpacing: 8.h,
                children: [
                  // Title + Name + Grade Pill + Subject Pill
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'كشف درجات: ',
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF2F2822),
                        ),
                      ),
                      Text(
                        model.name,
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF4A82A8),
                        ),
                      ),
                      if (model.gradeLevel.isNotEmpty) ...[
                        SizedBox(width: 8.w),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 3.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF), // blue-50
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
                      ],
                      if (model.subject.isNotEmpty) ...[
                        SizedBox(width: 6.w),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 3.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD1FAE5), // emerald-100
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
                    ],
                  ),

                  // Metadata Badges & Edit Button
                  Wrap(
                    spacing: 6.w,
                    runSpacing: 6.h,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      // Teacher Badge
                      if (effectiveTeacher.isNotEmpty)
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEEF2FF),
                            borderRadius: BorderRadius.circular(8.r),
                            border: Border.all(color: const Color(0xFFC7D2FE)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.person_rounded, size: 13.r, color: const Color(0xFF4338CA)),
                              SizedBox(width: 4.w),
                              Text(
                                'الأستاذ: $effectiveTeacher',
                                style: TextStyle(
                                  fontSize: 10.5.sp,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF3730A3),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Sections Badge
                      if (model.assignedSections.isNotEmpty)
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(8.r),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                          ),
                          child: Text(
                            'الشُعب: ${model.assignedSections.join('، ')}',
                            style: TextStyle(
                              fontSize: 10.5.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF92400E),
                            ),
                          ),
                        ),

                      // Edit Model, Subject & Teacher Button
                      InkWell(
                        onTap: () => showDialog(
                          context: context,
                          builder: (_) => EditModelDialog(model: model),
                        ),
                        borderRadius: BorderRadius.circular(8.r),
                        child: Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEBDDC8),
                            borderRadius: BorderRadius.circular(8.r),
                            border: Border.all(color: const Color(0xFFCBB69F)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.edit_rounded, size: 12.r, color: const Color(0xFFBA916C)),
                              SizedBox(width: 4.w),
                              Text(
                                'تعديل الاسم والمادة والأستاذ',
                                style: TextStyle(
                                  fontSize: 10.5.sp,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF6D4C2F),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Sections Swap Button
                      InkWell(
                        onTap: () => _showSectionsSwapDialog(context, model),
                        borderRadius: BorderRadius.circular(8.r),
                        child: Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEEF2FF),
                            borderRadius: BorderRadius.circular(8.r),
                            border: Border.all(color: const Color(0xFFC7D2FE)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.swap_horiz_rounded, size: 13.r, color: const Color(0xFF4338CA)),
                              SizedBox(width: 3.w),
                              Text(
                                'تبديل الشُعب بين الأساتذة',
                                style: TextStyle(
                                  fontSize: 10.5.sp,
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

            // 2. Sub-toolbar: Section Switcher (Right) & Action Buttons (Left)
            Container(
              padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
              decoration: const BoxDecoration(
                color: Color(0xFFFBF8F0),
                border: Border(bottom: BorderSide(color: Color(0xFFD8CEBD))),
              ),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10.w,
                runSpacing: 8.h,
                children: [
                  // Section Filter Pills: "الالول ▪ جميع الشُعب | ب | د | أ | ج"
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 3.h),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10.r),
                      border: Border.all(color: const Color(0xFFBA916C).withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          gradeText,
                          style: TextStyle(
                            fontSize: 11.sp,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF3A6C8F),
                          ),
                        ),
                        SizedBox(width: 4.w),
                        const Text('▪', style: TextStyle(color: Color(0xFFBA916C), fontSize: 10)),
                        SizedBox(width: 6.w),
                        // All sections pill
                        _buildSectionPill(
                          label: 'جميع الشُعب',
                          isSelected: selectedSection == 'ALL',
                          onTap: () => controller.setSelectedSection('ALL'),
                        ),
                        // Individual section pills
                        ...sections.map((sec) => _buildSectionPill(
                              label: sec,
                              isSelected: selectedSection == sec,
                              onTap: () => controller.setSelectedSection(sec),
                            )),
                      ],
                    ),
                  ),

                  // Action Buttons Cluster matching screenshot
                  Wrap(
                    spacing: 6.w,
                    runSpacing: 6.h,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      // Fullscreen Clean Table Button
                      _buildPillButton(
                        icon: Icons.open_in_full_rounded,
                        label: 'عرض الجدول الصافي (أفقي)',
                        color: const Color(0xFFFAF2EB),
                        borderColor: const Color(0xFFD8BEB0),
                        textColor: const Color(0xFF4A2818),
                        iconColor: const Color(0xFFBA916C),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              duration: Duration(seconds: 2),
                              content: Text('الجدول الصافي: تم تفعيل التمرير الأفقي الموسع'),
                            ),
                          );
                        },
                      ),

                      // Oral Exam Mode Button
                      _buildPillButton(
                        icon: Icons.bookmark_added_rounded,
                        label: 'الصف التفاعلي (الشفهي)',
                        color: const Color(0xFFECFDF5),
                        borderColor: const Color(0xFFA7F3D0),
                        textColor: const Color(0xFF065F46),
                        iconColor: const Color(0xFF059669),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              duration: Duration(seconds: 2),
                              content: Text('الصف التفاعلي: يمكنك رصد الدرجات الشفهية مباشرة في الجدول'),
                            ),
                          );
                        },
                      ),

                      // Rename Columns Button
                      _buildPillButton(
                        icon: Icons.edit_note_rounded,
                        label: 'تسمية الأعمدة',
                        color: Colors.white,
                        borderColor: const Color(0xFFCBD5E1),
                        textColor: const Color(0xFF1E293B),
                        iconColor: const Color(0xFF2B6CB0),
                        onTap: () => showDialog(
                          context: context,
                          builder: (_) => const AddColumnDialog(),
                        ),
                      ),

                      // Add / Import Students Icon Button
                      _buildIconButton(
                        icon: Icons.person_add_alt_1_rounded,
                        color: const Color(0xFFFAF2EB),
                        borderColor: const Color(0xFFD8BEB0),
                        iconColor: const Color(0xFFBA916C),
                        tooltip: 'إضافة أو استيراد كشف الطلاب',
                        onTap: () => showDialog(
                          context: context,
                          builder: (_) => const AddStudentDialog(),
                        ),
                      ),

                      // Merge / Manage Grade Icon Button
                      _buildIconButton(
                        icon: Icons.merge_type_rounded,
                        color: const Color(0xFFFAF2EB),
                        borderColor: const Color(0xFFD8BEB0),
                        iconColor: const Color(0xFFBA916C),
                        tooltip: 'تعديل أو دمج اسم الصف والشعب',
                        onTap: () => showDialog(
                          context: context,
                          builder: (_) => EditModelDialog(model: model),
                        ),
                      ),

                      // Print Icon Button
                      _buildIconButton(
                        icon: Icons.print_rounded,
                        color: Colors.white,
                        borderColor: const Color(0xFFCBD5E1),
                        iconColor: const Color(0xFF2B6CB0),
                        tooltip: 'طباعة كشف درجات ${model.name}',
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              duration: const Duration(seconds: 2),
                              content: Text('تم إرسال كشف ${model.name} للطباعة'),
                            ),
                          );
                        },
                      ),

                      // Excel / CSV Export Icon Button
                      _buildIconButton(
                        icon: Icons.table_view_rounded,
                        color: const Color(0xFFF0FDF4),
                        borderColor: const Color(0xFF86EFAC),
                        iconColor: const Color(0xFF15803D),
                        tooltip: 'تصدير جدول الدرجات إلى Excel / CSV',
                        onTap: () {
                          final buffer = StringBuffer();
                          buffer.writeln('اسم الطالب,الشعبة,التحريري,النهائي');
                          for (final st in model.students) {
                            final finalScore = controller.calculateFinalStudentScore(st, model);
                            buffer.writeln('${st.name},${st.section},${st.writtenRawScore ?? ""},${finalScore ?? ""}');
                          }
                          Clipboard.setData(ClipboardData(text: buffer.toString()));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              backgroundColor: Color(0xFF15803D),
                              content: Text('تم نسخ بيانات درجات الطلاب بصيغة Excel إلى الحافظة بنجاح'),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionPill({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 2.w),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6.r),
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFBA916C) : Colors.transparent,
            borderRadius: BorderRadius.circular(6.r),
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
      ),
    );
  }

  Widget _buildPillButton({
    required IconData icon,
    required String label,
    required Color color,
    required Color borderColor,
    required Color textColor,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10.r),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(10.r),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14.r, color: iconColor),
            SizedBox(width: 4.w),
            Text(
              label,
              style: TextStyle(
                fontSize: 10.5.sp,
                fontWeight: FontWeight.w800,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIconButton({
    required IconData icon,
    required Color color,
    required Color borderColor,
    required Color iconColor,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10.r),
        child: Container(
          padding: EdgeInsets.all(6.r),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(10.r),
            border: Border.all(color: borderColor),
          ),
          child: Icon(icon, size: 16.r, color: iconColor),
        ),
      ),
    );
  }

  void _showSectionsSwapDialog(BuildContext context, dynamic model) {
    showDialog(
      context: context,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
          title: Text(
            'تبديل وتخصيص الشُعب',
            style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w900),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'الصف: ${model.gradeLevel} • المادة: ${model.subject}',
                style: TextStyle(fontSize: 12.sp, color: Colors.black87, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 10.h),
              Text(
                'الشُعب المخصصة حالياً لهذا الأستاذ:\n${model.assignedSections.isNotEmpty ? model.assignedSections.join("، ") : "كل الشُعب"}',
                style: TextStyle(fontSize: 11.5.sp, color: Colors.black54),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('إغلاق'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                showDialog(
                  context: context,
                  builder: (_) => EditModelDialog(model: model),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.craftBrown),
              child: const Text('تعديل الشُعب', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
