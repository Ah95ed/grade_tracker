import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/final_score_operation.dart';
import '../../common/custom_button.dart';
import '../../common/custom_text_field.dart';

/// Modal dialog to configure math operations on final score (divide, multiply, etc.)
class FinalOperationDialog extends StatefulWidget {
  const FinalOperationDialog({super.key});

  @override
  State<FinalOperationDialog> createState() => _FinalOperationDialogState();
}

class _FinalOperationDialogState extends State<FinalOperationDialog> {
  late String _opType;
  late final TextEditingController _valController;

  @override
  void initState() {
    super.initState();
    final model = context.read<MonthlySheetController>().currentModel;
    _opType = model?.finalScoreOperation.type ?? 'none';
    _valController = TextEditingController(
      text: model?.finalScoreOperation.value.toString() ?? '2',
    );
  }

  @override
  void dispose() {
    _valController.dispose();
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
                context.tr(AppKeys.finalScoreOperation),
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 14.h),
              _buildRadioOption('none', AppKeys.opNone),
              _buildRadioOption('divide', AppKeys.opDivide),
              _buildRadioOption('multiply', AppKeys.opMultiply),
              _buildRadioOption('add', AppKeys.opAdd),
              _buildRadioOption('subtract', AppKeys.opSubtract),
              if (_opType != 'none') ...[
                SizedBox(height: 12.h),
                CustomTextField(
                  label: context.tr(AppKeys.operationValue),
                  controller: _valController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
              ],
              SizedBox(height: 18.h),
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
                    backgroundColor: AppColors.termRust,
                    onPressed: () {
                      final val = double.tryParse(_valController.text.trim()) ?? 1.0;
                      final op = FinalScoreOperation(type: _opType, value: val);
                      context.read<MonthlySheetController>().setFinalScoreOperation(op);
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

  Widget _buildRadioOption(String typeValue, String labelKey) {
    final isSelected = _opType == typeValue;
    return InkWell(
      onTap: () => setState(() => _opType = typeValue),
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 5.h),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 20.r,
              color: isSelected ? AppColors.termRust : AppColors.textMuted,
            ),
            SizedBox(width: 10.w),
            Text(
              context.tr(labelKey),
              style: TextStyle(
                fontSize: 13.sp,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

