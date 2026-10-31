import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/auth_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/custom_button.dart';
import '../../common/custom_text_field.dart';

/// Modal dialog for signing in directly with Google Account
class GoogleSignInDialog extends StatefulWidget {
  const GoogleSignInDialog({super.key});

  @override
  State<GoogleSignInDialog> createState() => _GoogleSignInDialogState();
}

class _GoogleSignInDialogState extends State<GoogleSignInDialog> {
  final _emailController = TextEditingController(text: 'teacher.google@gmail.com');
  final _nameController = TextEditingController(text: 'الأستاذ: علي حسن');
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _handleGoogleLogin() async {
    final email = _emailController.text.trim();
    final name = _nameController.text.trim();
    if (email.isEmpty || !email.contains('@')) return;

    setState(() => _isLoading = true);
    final auth = context.read<AuthController>();
    final success = await auth.loginWithGoogle(email: email, name: name);
    setState(() => _isLoading = false);

    if (success && mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.r)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: 420.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 16.h),
              color: const Color(0xFFF8FAFC),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
                    icon: Icon(Icons.close_rounded, size: 20.r, color: AppColors.textSecondary),
                  ),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        context.tr(AppKeys.continueWithGoogle),
                        style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      SizedBox(height: 2.h),
                      Text('تسجيل دخول فوري وآمن بحساب Google', style: TextStyle(fontSize: 10.sp, color: AppColors.textSecondary)),
                    ],
                  ),
                  SizedBox(width: 8.w),
                  Icon(Icons.g_mobiledata_rounded, size: 32.r, color: Colors.blue),
                ],
              ),
            ),
            Divider(height: 1, color: AppColors.borderWarm),
            Padding(
              padding: EdgeInsets.all(18.r),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CustomTextField(
                    label: context.tr(AppKeys.displayName),
                    controller: _nameController,
                    prefixIcon: Icon(Icons.person_outline, size: 18.r),
                  ),
                  SizedBox(height: 12.h),
                  CustomTextField(
                    label: context.tr(AppKeys.enterGoogleEmail),
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    prefixIcon: Icon(Icons.mail_outline, size: 18.r),
                  ),
                  SizedBox(height: 16.h),
                  CustomButton(
                    label: context.tr(AppKeys.continueWithGoogle),
                    icon: Icons.login_rounded,
                    backgroundColor: const Color(0xFF1D4ED8),
                    height: 42.h,
                    onPressed: _isLoading ? null : _handleGoogleLogin,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
