import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/term_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../controllers/auth_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/custom_button.dart';

/// Modal dialog for restoring and importing gradebook JSON backup
class ImportBackupDialog extends StatefulWidget {
  const ImportBackupDialog({super.key});

  @override
  State<ImportBackupDialog> createState() => _ImportBackupDialogState();
}

class _ImportBackupDialogState extends State<ImportBackupDialog> {
  final _controller = TextEditingController();

  void _handleImport() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    final auth = context.read<AuthController>();
    final sheetCtrl = context.read<MonthlySheetController>();
    final termCtrl = context.read<TermController>();
    final profileCtrl = context.read<TeacherProfileController>();

    final success = auth.storageService.importBackupJson(text, userUid: auth.currentUser?.uid);
    if (success) {
      final uid = auth.currentUser?.uid;
      sheetCtrl.setModels(auth.storageService.loadModels(userUid: uid));
      termCtrl.setTerms(auth.storageService.loadTerms(userUid: uid));
      profileCtrl.updateProfile(auth.storageService.loadProfile(userUid: uid));

      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr(AppKeys.backupRestored))),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr(AppKeys.invalidBackupData)), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
      title: Text(
        context.tr(AppKeys.importBackupDesc),
        style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'الصق بيانات النسخة الاحتياطية (JSON) هنا لاسترجاع كافة الطلاب والنماذج:',
            style: TextStyle(fontSize: 11.sp, color: AppColors.textSecondary),
          ),
          SizedBox(height: 10.h),
          TextField(
            controller: _controller,
            maxLines: 6,
            style: TextStyle(fontSize: 10.sp, fontFamily: 'monospace'),
            decoration: InputDecoration(
              hintText: '{\n  "app": "GradeTracker",\n  "models": [...]\n}',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.r)),
              filled: true,
              fillColor: AppColors.creamBackground,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(context.tr(AppKeys.cancel), style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary)),
        ),
        CustomButton(
          label: context.tr(AppKeys.importBackup),
          height: 38.h,
          backgroundColor: AppColors.cardsGreen,
          onPressed: _handleImport,
        ),
      ],
    );
  }
}

