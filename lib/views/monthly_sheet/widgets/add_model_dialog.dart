import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/monthly_model.dart';
import '../../common/custom_button.dart';
import '../../common/custom_text_field.dart';

/// Dialog to create a new Monthly Model Assessment
class AddModelDialog extends StatefulWidget {
  const AddModelDialog({super.key});

  @override
  State<AddModelDialog> createState() => _AddModelDialogState();
}

class _AddModelDialogState extends State<AddModelDialog> {
  final _nameController = TextEditingController();
  final _maxScoreController = TextEditingController(text: '100');
  final _writtenMaxController = TextEditingController(text: '100');

  @override
  void dispose() {
    _nameController.dispose();
    _maxScoreController.dispose();
    _writtenMaxController.dispose();
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
                context.tr(AppKeys.addNewModel),
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 16.h),
              CustomTextField(
                label: context.tr(AppKeys.modelName),
                controller: _nameController,
              ),
              SizedBox(height: 12.h),
              CustomTextField(
                label: context.tr(AppKeys.totalMaxScore),
                controller: _maxScoreController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              SizedBox(height: 12.h),
              CustomTextField(
                label: context.tr(AppKeys.writtenMaxScore),
                controller: _writtenMaxController,
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
                    label: context.tr(AppKeys.save),
                    onPressed: () {
                      final name = _nameController.text.trim();
                      if (name.isEmpty) return;

                      final maxScore = double.tryParse(_maxScoreController.text.trim()) ?? 100.0;
                      final writtenMax = double.tryParse(_writtenMaxController.text.trim()) ?? 100.0;

                      final newModel = MonthlyModel(
                        id: 'model_${DateTime.now().millisecondsSinceEpoch}',
                        name: name,
                        totalMaxScore: maxScore,
                        writtenMaxScore: writtenMax,
                        createdAt: DateTime.now().toIso8601String(),
                      );

                      context.read<MonthlySheetController>().addModel(newModel);
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

