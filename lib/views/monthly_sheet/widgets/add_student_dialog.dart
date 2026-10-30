import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/student_row.dart';
import '../../common/custom_button.dart';
import '../../common/custom_text_field.dart';

/// Dialog to add a new student to the current monthly sheet
class AddStudentDialog extends StatefulWidget {
  const AddStudentDialog({super.key});

  @override
  State<AddStudentDialog> createState() => _AddStudentDialogState();
}

class _AddStudentDialogState extends State<AddStudentDialog> {
  final _nameController = TextEditingController();
  final _sectionController = TextEditingController(text: 'أ');
  final _writtenController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _sectionController.dispose();
    _writtenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 24.h),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
      child: Container(
        padding: EdgeInsets.all(18.r),
        constraints: BoxConstraints(maxWidth: 400.w),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.tr(AppKeys.addStudent),
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 16.h),
              CustomTextField(
                label: context.tr(AppKeys.studentName),
                controller: _nameController,
              ),
              SizedBox(height: 12.h),
              CustomTextField(
                label: context.tr(AppKeys.section),
                controller: _sectionController,
              ),
              SizedBox(height: 12.h),
              CustomTextField(
                label: context.tr(AppKeys.writtenScore),
                controller: _writtenController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              SizedBox(height: 20.h),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  CustomButton(
                    label: context.tr(AppKeys.cancel),
                    isOutlined: true,
                    textColor: AppColors.textSecondary,
                    borderColor: AppColors.borderWarm,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  SizedBox(width: 8.w),
                  CustomButton(
                    label: context.tr(AppKeys.add),
                    onPressed: () {
                      final name = _nameController.text.trim();
                      if (name.isEmpty) return;

                      final written = double.tryParse(_writtenController.text.trim());
                      final newStudent = StudentRow(
                        id: 'st_${DateTime.now().millisecondsSinceEpoch}',
                        name: name,
                        section: _sectionController.text.trim(),
                        writtenRawScore: written,
                      );

                      context.read<MonthlySheetController>().addStudent(newStudent);
                      Navigator.of(context).pop();
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

