import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/custom_button.dart';

/// Modal dialog to configure score rounding and fraction behavior
class RoundingSettingsDialog extends StatefulWidget {
  const RoundingSettingsDialog({super.key});

  @override
  State<RoundingSettingsDialog> createState() => _RoundingSettingsDialogState();
}

class _RoundingSettingsDialogState extends State<RoundingSettingsDialog> {
  late String _selectedMode;
  late double _threshold;

  @override
  void initState() {
    super.initState();
    final model = context.read<MonthlySheetController>().currentModel;
    _selectedMode = model?.roundingMode ?? 'none';
    _threshold = model?.roundingThreshold ?? 0.5;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 24.h),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
      child: Container(
        padding: EdgeInsets.all(18.r),
        constraints: BoxConstraints(maxWidth: 420.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              context.tr(AppKeys.roundingSettings),
              style: TextStyle(
                fontSize: 16.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 16.h),
            _buildRadioOption('none', AppKeys.roundingNone),
            _buildRadioOption('half_up', AppKeys.roundingHalfUp),
            _buildRadioOption('any_fraction', AppKeys.roundingAnyFraction),
            _buildRadioOption('custom_threshold', AppKeys.roundingCustom),
            if (_selectedMode == 'custom_threshold') ...[
              SizedBox(height: 8.h),
              Slider(
                value: _threshold,
                min: 0.1,
                max: 0.9,
                divisions: 8,
                label: _threshold.toStringAsFixed(1),
                onChanged: (val) => setState(() => _threshold = val),
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
                  backgroundColor: AppColors.academicGold,
                  onPressed: () {
                    context.read<MonthlySheetController>().setRoundingMode(_selectedMode, _threshold);
                    Navigator.of(context).pop();
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRadioOption(String modeValue, String titleKey) {
    final isSelected = _selectedMode == modeValue;
    return InkWell(
      onTap: () => setState(() => _selectedMode = modeValue),
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 6.h),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 20.r,
              color: isSelected ? AppColors.academicGold : AppColors.textMuted,
            ),
            SizedBox(width: 10.w),
            Expanded(
              child: Text(
                context.tr(titleKey),
                style: TextStyle(
                  fontSize: 13.sp,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

