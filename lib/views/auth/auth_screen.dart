import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/locale_controller.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/localization/translation_keys.dart';
import '../../core/theme/app_colors.dart';
import '../common/academic_emblem.dart';
import '../common/custom_button.dart';
import '../common/custom_text_field.dart';
import 'widgets/auth_toggle_bar.dart';
import 'widgets/forgot_password_dialog.dart';
import 'widgets/google_sign_in_banner.dart';

/// Real Authentication Screen providing Google Auth, Email Login, Registration, and Free Trial
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isRegister = false;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    final auth = context.read<AuthController>();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (_isRegister) {
      final name = _nameController.text.trim();
      auth.registerWithEmail(email, password, name);
    } else {
      auth.loginWithEmail(email, password);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final localeCtrl = context.watch<LocaleController>();

    return Scaffold(
      backgroundColor: AppColors.warmCanvas,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 20.h),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: 440.w),
              child: Container(
                padding: EdgeInsets.all(22.r),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24.r),
                  border: Border.all(color: AppColors.borderWarm),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 16, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Language Switcher
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: localeCtrl.toggleLanguage,
                        icon: Icon(Icons.language_rounded, size: 16.r, color: AppColors.monthlyBlue),
                        label: Text(
                          localeCtrl.isArabic ? 'English' : 'العربية',
                          style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: AppColors.monthlyBlue),
                        ),
                      ),
                    ),
                    Center(child: AcademicEmblem(size: 52.r)),
                    SizedBox(height: 8.h),
                    Text(
                      context.tr(AppKeys.appTitle),
                      style: TextStyle(fontSize: 22.sp, fontWeight: FontWeight.w900, color: AppColors.textPrimary),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: 4.h),
                    Text(
                      context.tr(AppKeys.authSubtitle),
                      style: TextStyle(fontSize: 11.sp, color: AppColors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: 16.h),
                    // Google Sign-In prominent banner
                    const GoogleSignInBanner(),
                    SizedBox(height: 12.h),
                    AuthToggleBar(isRegister: _isRegister, onToggle: (val) => setState(() => _isRegister = val)),
                    SizedBox(height: 12.h),
                    if (auth.errorMessage != null) ...[
                      Container(
                        padding: EdgeInsets.all(10.r),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8.r),
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          auth.errorMessage!,
                          style: TextStyle(fontSize: 11.sp, color: AppColors.error, fontWeight: FontWeight.bold),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      SizedBox(height: 10.h),
                    ],
                    if (_isRegister) ...[
                      CustomTextField(
                        label: context.tr(AppKeys.displayName),
                        controller: _nameController,
                        prefixIcon: Icon(Icons.person_outline, size: 18.r),
                      ),
                      SizedBox(height: 10.h),
                    ],
                    CustomTextField(
                      label: context.tr(AppKeys.email),
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icon(Icons.mail_outline, size: 18.r),
                    ),
                    SizedBox(height: 10.h),
                    CustomTextField(
                      label: context.tr(AppKeys.password),
                      controller: _passwordController,
                      keyboardType: TextInputType.visiblePassword,
                      prefixIcon: Icon(Icons.lock_outline, size: 18.r),
                    ),
                    if (!_isRegister) ...[
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton(
                          onPressed: () => showDialog(
                            context: context,
                            builder: (_) => ForgotPasswordDialog(initialEmail: _emailController.text),
                          ),
                          child: Text(
                            context.tr(AppKeys.forgotPassword),
                            style: TextStyle(fontSize: 11.sp, color: AppColors.monthlyBlue),
                          ),
                        ),
                      ),
                    ] else
                      SizedBox(height: 12.h),
                    CustomButton(
                      label: _isRegister ? context.tr(AppKeys.register) : context.tr(AppKeys.login),
                      backgroundColor: AppColors.monthlyBlue,
                      height: 44.h,
                      onPressed: auth.isLoading ? null : _handleSubmit,
                    ),
                    SizedBox(height: 8.h),
                    TextButton.icon(
                      onPressed: auth.isLoading ? null : auth.startFreeTrial,
                      icon: Icon(Icons.auto_awesome, size: 16.r, color: AppColors.cardsGreen),
                      label: Text(
                        context.tr(AppKeys.freeTrial),
                        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.cardsGreen),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
