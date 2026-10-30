import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../controllers/teacher_profile_controller.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/localization/translation_keys.dart';
import '../../core/theme/app_colors.dart';
import '../common/custom_button.dart';
import '../common/custom_text_field.dart';

/// Modal dialog for editing Teacher and School profile
class TeacherProfileDialog extends StatefulWidget {
  const TeacherProfileDialog({super.key});

  @override
  State<TeacherProfileDialog> createState() => _TeacherProfileDialogState();
}

class _TeacherProfileDialogState extends State<TeacherProfileDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _schoolController;
  late final TextEditingController _subjectController;
  late final TextEditingController _yearController;
  late final TextEditingController _govController;

  @override
  void initState() {
    super.initState();
    final profile = context.read<TeacherProfileController>().profile;
    _nameController = TextEditingController(text: profile.teacherName);
    _schoolController = TextEditingController(text: profile.schoolName);
    _subjectController = TextEditingController(text: profile.subject);
    _yearController = TextEditingController(text: profile.academicYear);
    _govController = TextEditingController(text: profile.governorate);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _schoolController.dispose();
    _subjectController.dispose();
    _yearController.dispose();
    _govController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 24.h),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
      child: Container(
        padding: EdgeInsets.all(18.r),
        constraints: BoxConstraints(maxWidth: 420.w),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.tr(AppKeys.teacherProfile),
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 16.h),
              CustomTextField(
                label: context.tr(AppKeys.teacherName),
                controller: _nameController,
              ),
              SizedBox(height: 12.h),
              CustomTextField(
                label: context.tr(AppKeys.schoolName),
                controller: _schoolController,
              ),
              SizedBox(height: 12.h),
              CustomTextField(
                label: context.tr(AppKeys.subject),
                controller: _subjectController,
              ),
              SizedBox(height: 12.h),
              CustomTextField(
                label: context.tr(AppKeys.academicYear),
                controller: _yearController,
              ),
              SizedBox(height: 12.h),
              CustomTextField(
                label: context.tr(AppKeys.governorate),
                controller: _govController,
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
                    label: context.tr(AppKeys.save),
                    onPressed: () {
                      final controller = context.read<TeacherProfileController>();
                      final updated = controller.profile.copyWith(
                        teacherName: _nameController.text.trim(),
                        schoolName: _schoolController.text.trim(),
                        subject: _subjectController.text.trim(),
                        academicYear: _yearController.text.trim(),
                        governorate: _govController.text.trim(),
                      );
                      controller.updateProfile(updated);
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

