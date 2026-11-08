import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../controllers/monthly_sheet_controller.dart';
import '../../controllers/teacher_profile_controller.dart';
import '../../services/pdf/pdf_print_service.dart';
import '../../services/excel_export_service.dart';
import 'widgets/student_data_table.dart';

/// Fullscreen Clean Horizontal Table View matching Daragat Web App
class CleanTableView extends StatelessWidget {
  const CleanTableView({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final profile = context.watch<TeacherProfileController>().profile;
    final model = controller.currentModel;

    if (model == null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_forward_rounded),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: const Text('الجدول الصافي'),
        ),
        body: const Center(child: Text('لا يوجد نموذج درجات حالي')),
      );
    }

    final sections = controller.availableSections;
    final selectedSection = controller.selectedSection;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFFF5EFE3), // Craft cream background
        appBar: AppBar(
          backgroundColor: const Color(0xFFEBDDC8),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_forward_rounded, color: Color(0xFF4A3D30)),
            tooltip: 'العودة للكشف الرئيسي',
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Row(
            children: [
              Container(
                padding: EdgeInsets.all(6.r),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF2EB),
                  borderRadius: BorderRadius.circular(8.r),
                  border: Border.all(color: const Color(0xFFD8BEB0)),
                ),
                child: Icon(Icons.open_in_full_rounded, size: 16.r, color: const Color(0xFFBA916C)),
              ),
              SizedBox(width: 8.w),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'الجدول الصافي الأفقي - ${model.name}',
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2F2822),
                    ),
                  ),
                  Text(
                    '${model.gradeLevel.isNotEmpty ? model.gradeLevel : ""} | ${model.subject.isNotEmpty ? model.subject : ""}',
                    style: TextStyle(
                      fontSize: 10.5.sp,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF6D4C2F),
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            // Section Switcher
            Container(
              margin: EdgeInsets.symmetric(vertical: 8.h),
              padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 2.h),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8.r),
                border: Border.all(color: const Color(0xFFD8CEBD)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildSectionPill(
                    label: 'الكل',
                    isSelected: selectedSection == 'ALL',
                    onTap: () => controller.setSelectedSection('ALL'),
                  ),
                  ...sections.map((sec) => _buildSectionPill(
                        label: sec,
                        isSelected: selectedSection == sec,
                        onTap: () => controller.setSelectedSection(sec),
                      )),
                ],
              ),
            ),
            SizedBox(width: 6.w),

            // Print Action
            IconButton(
              icon: const Icon(Icons.print_rounded, color: Color(0xFF2B6CB0)),
              tooltip: 'طباعة الكشف',
              onPressed: () => PdfPrintService.printMonthlySheet(model: model, profile: profile),
            ),

            // Excel Export Action
            IconButton(
              icon: const Icon(Icons.table_view_rounded, color: Color(0xFF15803D)),
              tooltip: 'تصدير إكسل',
              onPressed: () async {
                final msg = await ExcelExportService.exportMonthlySheet(
                  model: model,
                  controller: controller,
                  profile: profile,
                );
                if (context.mounted && msg != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(msg)),
                  );
                }
              },
            ),
            SizedBox(width: 8.w),
          ],
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(vertical: 10.h),
            child: const StudentDataTable(),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionPill({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
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
    );
  }
}

