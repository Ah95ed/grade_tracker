import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/custom_column.dart';
import '../../common/custom_button.dart';
import '../../common/custom_text_field.dart';

/// Dialog to add a custom column (Oral, Daily Activity, Behavior)
class AddColumnDialog extends StatefulWidget {
  const AddColumnDialog({super.key});

  @override
  State<AddColumnDialog> createState() => _AddColumnDialogState();
}

class _AddColumnDialogState extends State<AddColumnDialog> {
  final _nameController = TextEditingController();
  final _maxScoreController = TextEditingController(text: '10');

  @override
  void dispose() {
    _nameController.dispose();
    _maxScoreController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 24.h),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
      child: Container(
        padding: EdgeInsets.all(18.r),
        constraints: BoxConstraints(maxWidth: 380.w),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.tr(AppKeys.addColumn),
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 16.h),
              CustomTextField(
                label: context.tr(AppKeys.columnName),
                controller: _nameController,
              ),
              SizedBox(height: 12.h),
              CustomTextField(
                label: context.tr(AppKeys.columnMaxScore),
                controller: _maxScoreController,
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
                    backgroundColor: AppColors.cardsGreen,
                    onPressed: () {
                      final name = _nameController.text.trim();
                      if (name.isEmpty) return;

                      final maxScore = double.tryParse(_maxScoreController.text.trim()) ?? 10.0;
                      final newCol = CustomColumn(
                        id: 'col_${DateTime.now().millisecondsSinceEpoch}',
                        name: name,
                        maxScore: maxScore,
                      );

                      context.read<MonthlySheetController>().addColumn(newCol);
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

