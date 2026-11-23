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
import '../../admin/admin_dashboard_dialog.dart';
import '../../teacher_personal/teacher_personal_workspace_dialog.dart';
import '../../exam_builder/exam_builder_view.dart';
import '../../monthly_sheet/widgets/batch_import_modal.dart';
import '../../../features/term_calculation/widgets/term_student_cards_modal.dart';

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
              if (user?.isAdmin == true)
                _buildTile(
                  icon: Icons.admin_panel_settings_rounded,
                  color: const Color(0xFFD97706),
                  title: 'لوحة تحكم إدارة النظام والمشتركين',
                  trailing: Container(
                    padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                    decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6.r)),
                    child: Text('Admin', style: TextStyle(fontSize: 9.sp, fontWeight: FontWeight.bold, color: const Color(0xFFB45309))),
                  ),
                  onTap: () {
                    Navigator.of(context).pop();
                    showDialog(context: context, builder: (_) => const AdminDashboardDialog());
                  },
                ),
              _buildTile(
                icon: Icons.settings_rounded,
                color: const Color(0xFF557A95),
                title: 'الإعدادات (بيانات المعلم والمدرسة)',
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
              _buildSectionHeader('المساحة الشخصية وأدوات التدريس'),
              _buildTile(
                icon: Icons.quiz_rounded,
                color: const Color(0xFFD97706),
                title: 'كتابة وبناء الأسئلة الامتحانية (A4 وزاري)',
                trailing: Container(
                  padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                  decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6.r)),
                  child: Text('جديد • طباعة A4', style: TextStyle(fontSize: 8.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF92400E))),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const ExamBuilderView(isStandalone: true),
                    ),
                  );
                },
              ),
              _buildTile(
                icon: Icons.person_pin_rounded,
                color: const Color(0xFF4338CA),
                title: 'المساحة الشخصية للمعلم',
                trailing: Container(
                  padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                  decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(6.r)),
                  child: Text('جدول • مذكرات • تنبيهات', style: TextStyle(fontSize: 8.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF4338CA))),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const TeacherPersonalWorkspaceDialog());
                },
              ),
              _buildTile(
                icon: Icons.file_upload_outlined,
                color: const Color(0xFF2563EB),
                title: 'الاستيراد الدفعي للطلاب (Excel / CSV)',
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const BatchImportModal());
                },
              ),
              _buildTile(
                icon: Icons.workspace_premium_outlined,
                color: const Color(0xFFB86848),
                title: 'كروت وبطاقات نتائج الفصل',
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(context: context, builder: (_) => const TermStudentCardsModal());
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
