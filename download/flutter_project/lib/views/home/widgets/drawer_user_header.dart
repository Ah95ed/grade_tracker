import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../controllers/auth_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';

/// Top user profile card header in the drawer/bottom sheet menu
class DrawerUserHeader extends StatelessWidget {
  final AuthController auth;
  const DrawerUserHeader({super.key, required this.auth});

  @override
  Widget build(BuildContext context) {
    final user = auth.currentUser;
    final isGoogle = user?.authProvider == 'google';
    final initial = (user?.displayName ?? 'م').isNotEmpty ? (user?.displayName ?? 'م').substring(0, 1) : 'م';

    return Row(
      children: [
        CircleAvatar(
          radius: 20.r,
          backgroundColor: AppColors.monthlyBlue.withValues(alpha: 0.15),
          child: Text(initial, style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: AppColors.monthlyBlue)),
        ),
        SizedBox(width: 10.w),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(user?.displayName ?? '', style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              Text(user?.email ?? '', style: TextStyle(fontSize: 10.sp, color: AppColors.textSecondary), textDirection: TextDirection.ltr),
              if (isGoogle) ...[
                SizedBox(height: 2.h),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 1.h),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10.r),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Text(
                    context.tr(AppKeys.googleVerifiedBadge),
                    style: TextStyle(fontSize: 8.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1D4ED8)),
                  ),
                ),
              ],
            ],
          ),
        ),
        IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: Icon(Icons.close_rounded, size: 20.r, color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

