import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/auth_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import 'google_sign_in_dialog.dart';

/// Prominent Google Sign-In action button and info card
class GoogleSignInBanner extends StatelessWidget {
  const GoogleSignInBanner({super.key});

  void _handleGoogleClick(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const GoogleSignInDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        OutlinedButton(
          onPressed: auth.isLoading ? null : () => _handleGoogleClick(context),
          style: OutlinedButton.styleFrom(
            backgroundColor: Colors.white,
            side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14.r)),
            padding: EdgeInsets.symmetric(vertical: 12.h, horizontal: 12.w),
            elevation: 1,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildGoogleIcon(),
              SizedBox(width: 8.w),
              Flexible(
                child: Text(
                  context.tr(AppKeys.googleInstantLogin),
                  style: TextStyle(
                    fontSize: 11.sp,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF1E293B),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: 8.h),
        Container(
          padding: EdgeInsets.all(10.r),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12.r),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.verified_user_rounded, size: 14.r, color: const Color(0xFF059669)),
                  SizedBox(width: 4.w),
                  Text(
                    'دخول آمن وفوري بضغطة واحدة',
                    style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: const Color(0xFF334155)),
                  ),
                ],
              ),
              SizedBox(height: 3.h),
              Text(
                context.tr(AppKeys.googleLoginSubtitle),
                style: TextStyle(fontSize: 9.sp, color: const Color(0xFF64748B), height: 1.4),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        SizedBox(height: 12.h),
        Row(
          children: [
            const Expanded(child: Divider(color: AppColors.borderWarm)),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 10.w),
              child: Text(
                context.tr(AppKeys.orWithEmailAndPassword),
                style: TextStyle(fontSize: 10.sp, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
              ),
            ),
            const Expanded(child: Divider(color: AppColors.borderWarm)),
          ],
        ),
      ],
    );
  }

  Widget _buildGoogleIcon() {
    return Container(
      width: 22.r,
      height: 22.r,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Icon(Icons.g_mobiledata_rounded, color: Colors.blue, size: 28.r),
      ),
    );
  }
}
