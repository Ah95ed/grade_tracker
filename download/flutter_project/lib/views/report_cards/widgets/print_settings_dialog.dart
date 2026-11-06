import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/report_cards_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/custom_button.dart';

/// Modal dialog to configure Print Settings for Report Cards
class PrintSettingsDialog extends StatefulWidget {
  const PrintSettingsDialog({super.key});

  @override
  State<PrintSettingsDialog> createState() => _PrintSettingsDialogState();
}

class _PrintSettingsDialogState extends State<PrintSettingsDialog> {
  late int _cardsPerPage;
  late bool _showEmblem;
  late bool _showSignatures;
  late bool _showHeader;

  @override
  void initState() {
    super.initState();
    final settings = context.read<ReportCardsController>().printSettings;
    _cardsPerPage = settings.cardsPerPage;
    _showEmblem = settings.showEmblem;
    _showSignatures = settings.showSignatures;
    _showHeader = settings.showSchoolHeader;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 24.h),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
      child: Container(
        padding: EdgeInsets.all(18.r),
        constraints: BoxConstraints(maxWidth: 400.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              context.tr(AppKeys.printSettings),
              style: TextStyle(
                fontSize: 16.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 16.h),
            SwitchListTile(
              title: Text(context.tr(AppKeys.schoolEmblem), style: TextStyle(fontSize: 13.sp)),
              value: _showEmblem,
              activeThumbColor: AppColors.cardsGreen,
              onChanged: (val) => setState(() => _showEmblem = val),
            ),
            SwitchListTile(
              title: Text(context.tr(AppKeys.teacherProfile), style: TextStyle(fontSize: 13.sp)),
              value: _showHeader,
              activeThumbColor: AppColors.cardsGreen,
              onChanged: (val) => setState(() => _showHeader = val),
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
                  backgroundColor: AppColors.cardsGreen,
                  onPressed: () {
                    final controller = context.read<ReportCardsController>();
                    final updated = controller.printSettings.copyWith(
                      cardsPerPage: _cardsPerPage,
                      showEmblem: _showEmblem,
                      showSchoolHeader: _showHeader,
                      showSignatures: _showSignatures,
                    );
                    controller.updatePrintSettings(updated);
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
}
