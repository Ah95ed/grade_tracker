import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/term_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/term_model.dart';
import '../../common/custom_button.dart';
import '../../common/custom_text_field.dart';

/// Modal dialog to configure and create a new Term assessment
class CreateTermDialog extends StatefulWidget {
  const CreateTermDialog({super.key});

  @override
  State<CreateTermDialog> createState() => _CreateTermDialogState();
}

class _CreateTermDialogState extends State<CreateTermDialog> {
  final _nameController = TextEditingController();
  String _calcMode = 'average';
  final Set<String> _selectedIds = {};

  @override
  void initState() {
    super.initState();
    final models = context.read<MonthlySheetController>().models;
    for (final m in models) {
      _selectedIds.add(m.id);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final models = context.read<MonthlySheetController>().models;

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
                context.tr(AppKeys.addTerm),
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 16.h),
              CustomTextField(
                label: context.tr(AppKeys.termName),
                controller: _nameController,
              ),
              SizedBox(height: 14.h),
              Text(
                context.tr(AppKeys.selectModels),
                style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              SizedBox(height: 6.h),
              Wrap(
                spacing: 8.w,
                runSpacing: 6.h,
                children: models.map((m) {
                  final isChecked = _selectedIds.contains(m.id);
                  return FilterChip(
                    label: Text(m.name, style: TextStyle(fontSize: 12.sp)),
                    selected: isChecked,
                    selectedColor: AppColors.termRust.withValues(alpha: 0.2),
                    checkmarkColor: AppColors.termRust,
                    onSelected: (selected) {
                      setState(() {
                        if (selected) {
                          _selectedIds.add(m.id);
                        } else {
                          _selectedIds.remove(m.id);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              SizedBox(height: 14.h),
              Text(
                context.tr(AppKeys.calculationMode),
                style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              SizedBox(height: 4.h),
              _buildRadioOption('average', AppKeys.calcAverage),
              _buildRadioOption('sum', AppKeys.calcSum),
              _buildRadioOption('single', AppKeys.calcSingle),
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
                      final name = _nameController.text.trim();
                      if (name.isEmpty || _selectedIds.isEmpty) return;

                      final newTerm = TermModel(
                        id: 'term_${DateTime.now().millisecondsSinceEpoch}',
                        name: name,
                        selectedModelIds: _selectedIds.toList(),
                        calculationMode: _calcMode,
                      );

                      context.read<TermController>().addTerm(newTerm);
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

  Widget _buildRadioOption(String val, String key) {
    final isSelected = _calcMode == val;
    return InkWell(
      onTap: () => setState(() => _calcMode = val),
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 4.h),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 18.r,
              color: isSelected ? AppColors.termRust : AppColors.textMuted,
            ),
            SizedBox(width: 8.w),
            Text(
              context.tr(key),
              style: TextStyle(
                fontSize: 12.sp,
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
