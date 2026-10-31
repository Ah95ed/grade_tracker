import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/locale_controller.dart';
import '../../../controllers/auth_controller.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../teacher_profile/teacher_profile_dialog.dart';
import '../../monthly_sheet/widgets/rounding_settings_dialog.dart';
import '../../common/confirm_dialog.dart';
import 'contact_support_dialog.dart';
import 'subscription_details_dialog.dart';
import 'privacy_policy_dialog.dart';
import 'delete_account_dialog.dart';
import 'import_backup_dialog.dart';
import 'drawer_user_header.dart';

/// Modal bottom sheet providing all system tools, database options, and settings
class HomeDrawerMenu extends StatelessWidget {
  const HomeDrawerMenu({super.key});

  @override
  Widget build(BuildContext context) {
    final localeCtrl = context.watch<LocaleController>();
    final authCtrl = context.watch<AuthController>();
    final user = authCtrl.currentUser;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.vertical(top: Radius.circular(22.r)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DrawerUserHeader(auth: authCtrl),
              Divider(height: 16.h, color: AppColors.borderLight),
              _buildTile(
                icon: Icons.person_outline_rounded,
                color: AppColors.monthlyBlue,
                title: context.tr(AppKeys.teacherProfile),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const TeacherProfileDialog());
                },
              ),
              _buildTile(
                icon: Icons.workspace_premium_rounded,
                color: const Color(0xFFD97706),
                title: context.tr(AppKeys.subscriptionDetails),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const SubscriptionDetailsDialog());
                },
              ),
              _buildTile(
                icon: Icons.language_rounded,
                color: AppColors.slateDark,
                title: context.tr(AppKeys.switchLanguage),
                trailing: Text(localeCtrl.isArabic ? 'English' : 'العربية', style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: AppColors.monthlyBlue)),
                onTap: () {
                  Navigator.of(context).pop();
                  localeCtrl.toggleLanguage();
                },
              ),
              _buildSectionHeader(context.tr(AppKeys.backupAndDatabase)),
              _buildTile(
                icon: Icons.calculate_outlined,
                color: const Color(0xFFB45309),
                title: context.tr(AppKeys.decimalControl),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const RoundingSettingsDialog());
                },
              ),
              _buildTile(
                icon: Icons.download_rounded,
                color: AppColors.monthlyBlue,
                title: context.tr(AppKeys.exportBackupDesc),
                onTap: () {
                  Navigator.of(context).pop();
                  final json = authCtrl.storageService.exportBackupJson(userUid: user?.uid);
                  Clipboard.setData(ClipboardData(text: json));
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr(AppKeys.backupCopied))));
                },
              ),
              _buildTile(
                icon: Icons.upload_rounded,
                color: AppColors.cardsGreen,
                title: context.tr(AppKeys.importBackupDesc),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const ImportBackupDialog());
                },
              ),
              _buildSectionHeader('الدعم والحساب'),
              _buildTile(
                icon: Icons.headset_mic_rounded,
                color: const Color(0xFF059669),
                title: context.tr(AppKeys.contactUsAllChannels),
                trailing: Container(
                  padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                  decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(6.r)),
                  child: Text('دعم فني', style: TextStyle(fontSize: 9.sp, fontWeight: FontWeight.bold, color: const Color(0xFF15803D))),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const ContactSupportDialog());
                },
              ),
              _buildTile(
                icon: Icons.shield_outlined,
                color: AppColors.slateDark,
                title: context.tr(AppKeys.privacyPolicy),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const PrivacyPolicyDialog());
                },
              ),
              _buildTile(
                icon: Icons.refresh_rounded,
                color: AppColors.warning,
                title: context.tr(AppKeys.resetDefaults),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(
                    context: context,
                    builder: (_) => ConfirmDialog(
                      title: context.tr(AppKeys.resetDefaults),
                      message: 'هل أنت متأكد من إعادة ضبط وتفريغ جدول الدرجات للبداية؟',
                      isDestructive: true,
                      onConfirm: () => context.read<MonthlySheetController>().setModels([]),
                    ),
                  );
                },
              ),
              _buildTile(
                icon: Icons.logout_rounded,
                color: AppColors.error,
                title: context.tr(AppKeys.logout),
                onTap: () {
                  Navigator.of(context).pop();
                  authCtrl.logout();
                },
              ),
              _buildTile(
                icon: Icons.delete_forever_rounded,
                color: AppColors.error,
                title: context.tr(AppKeys.deleteAccountPermanent),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const DeleteAccountDialog());
                },
              ),
              SizedBox(height: 8.h),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: EdgeInsets.only(top: 8.h, bottom: 4.h, right: 6.w, left: 6.w),
      child: Text(title, style: TextStyle(fontSize: 10.sp, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
    );
  }

  Widget _buildTile({required IconData icon, required Color color, required String title, Widget? trailing, required VoidCallback onTap}) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.symmetric(horizontal: 6.w),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
      leading: Icon(icon, size: 20.r, color: color),
      title: Text(title, style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
      trailing: trailing,
      onTap: onTap,
    );
  }
}
