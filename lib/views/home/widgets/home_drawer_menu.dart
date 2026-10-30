import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/locale_controller.dart';
import '../../../controllers/auth_controller.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../teacher_profile/teacher_profile_dialog.dart';
import '../../common/confirm_dialog.dart';

/// Modal bottom sheet for Tools, Settings, and Account options
class HomeDrawerMenu extends StatelessWidget {
  const HomeDrawerMenu({super.key});

  @override
  Widget build(BuildContext context) {
    final localeCtrl = context.watch<LocaleController>();
    final authCtrl = context.watch<AuthController>();

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 18.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Title Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    context.tr(AppKeys.toolsAndMore),
                    style: TextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, size: 20.r, color: AppColors.textSecondary),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              Divider(height: 16.h, color: AppColors.borderLight),
              // Language Switch
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                leading: Icon(Icons.language_rounded, size: 20.r, color: AppColors.monthlyBlue),
                title: Text(context.tr(AppKeys.switchLanguage), style: TextStyle(fontSize: 13.sp)),
                trailing: Text(
                  localeCtrl.isArabic ? 'English' : 'العربية',
                  style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.monthlyBlue),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  localeCtrl.toggleLanguage();
                },
              ),
              // Edit Profile
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                leading: Icon(Icons.person_outline_rounded, size: 20.r, color: AppColors.academicGold),
                title: Text(context.tr(AppKeys.teacherProfile), style: TextStyle(fontSize: 13.sp)),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(
                    context: context,
                    builder: (_) => const TeacherProfileDialog(),
                  );
                },
              ),
              // Contact Support
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                leading: Icon(Icons.support_agent_rounded, size: 20.r, color: AppColors.cardsGreen),
                title: Text(context.tr(AppKeys.contactSupport), style: TextStyle(fontSize: 13.sp)),
                subtitle: Text(
                  AppConstants.supportPhone,
                  style: TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${context.tr(AppKeys.contactSupport)}: ${AppConstants.supportPhone}')),
                  );
                },
              ),
              // Reset to Defaults
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                leading: Icon(Icons.refresh_rounded, size: 20.r, color: AppColors.warning),
                title: Text(context.tr(AppKeys.resetDefaults), style: TextStyle(fontSize: 13.sp)),
                onTap: () {
                  Navigator.of(context).pop();
                  showDialog(
                    context: context,
                    builder: (_) => ConfirmDialog(
                      title: context.tr(AppKeys.resetDefaults),
                      message: context.tr(AppKeys.resetDefaults),
                      isDestructive: true,
                      onConfirm: () {},
                    ),
                  );
                },
              ),
              // Logout
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                leading: Icon(Icons.logout_rounded, size: 20.r, color: AppColors.error),
                title: Text(
                  context.tr(AppKeys.logout),
                  style: TextStyle(fontSize: 13.sp, color: AppColors.error),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  authCtrl.logout();
                },
              ),
              SizedBox(height: 10.h),
            ],
          ),
        ),
      ),
    );
  }
}
