import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/locale_controller.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/localization/translation_keys.dart';
import '../../core/theme/app_colors.dart';
import '../common/app_logo.dart';
import '../common/custom_button.dart';
import '../common/custom_text_field.dart';
import '../home/widgets/privacy_policy_dialog.dart';
import 'widgets/auth_toggle_bar.dart';
import 'widgets/google_sign_in_banner.dart';

enum AuthMode { login, register, forgotPassword }

/// Authentication Screen matching the Daragat Web App (AuthScreen.tsx) 1:1
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  AuthMode _mode = AuthMode.login;
  bool _obscurePassword = true;
  String? _resetSuccessMessage;

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

  void _showErrorSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppColors.termRustDark,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _handlePasswordReset() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      _showErrorSnackBar('يرجى كتابة البريد الإلكتروني لإرسال رابط إعادة التعيين.');
      return;
    }
    final auth = context.read<AuthController>();
    final success = await auth.sendPasswordReset(email);
    if (success && mounted) {
      setState(() {
        _resetSuccessMessage =
            'تم إرسال رابط إعادة تعيين الرقم السري إلى بريدك الإلكتروني بنجاح! يرجى مراجعة صندوق الوارد (ومجلد الرسائل غير المرغوب فيها Spam).';
      });
    } else if (auth.errorMessage != null && mounted) {
      _showErrorSnackBar(auth.errorMessage!);
    }
  }

  Future<void> _handleSubmit() async {
    final auth = context.read<AuthController>();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (_mode == AuthMode.register) {
      final name = _nameController.text.trim();
      if (name.isEmpty) {
        _showErrorSnackBar('يرجى كتابة اسم المعلم / الأستاذ');
        return;
      }
      if (email.isEmpty || !email.contains('@')) {
        _showErrorSnackBar(context.tr(AppKeys.invalidEmail));
        return;
      }
      if (password.length < 6) {
        _showErrorSnackBar(context.tr(AppKeys.passwordTooShort));
        return;
      }
      final success = await auth.registerWithEmail(email, password, name);
      if (!success && auth.errorMessage != null && mounted) {
        _showErrorSnackBar(auth.errorMessage!);
      }
    } else {
      if (email.isEmpty || !email.contains('@')) {
        _showErrorSnackBar(context.tr(AppKeys.invalidEmail));
        return;
      }
      if (password.isEmpty) {
        _showErrorSnackBar(context.tr(AppKeys.fillAllFields));
        return;
      }
      final success = await auth.loginWithEmail(email, password);
      if (!success && auth.errorMessage != null && mounted) {
        _showErrorSnackBar(auth.errorMessage!);
      }
    }
  }

  void _openPrivacy() {
    showDialog(
      context: context,
      builder: (_) => const PrivacyPolicyDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final localeCtrl = context.watch<LocaleController>();

    return Scaffold(
      backgroundColor: AppColors.warmCanvas, // #F4EFEA
      body: Stack(
        children: [
          // Background Subtle Ambient Elements (Matching web blobs)
          Positioned(
            top: -100.h,
            right: -100.w,
            child: Container(
              width: 320.w,
              height: 320.h,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF557A95).withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            bottom: -100.h,
            left: -100.w,
            child: Container(
              width: 320.w,
              height: 320.h,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF487B5D).withValues(alpha: 0.08),
              ),
            ),
          ),

          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 24.h),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Main White Card
                    ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: 480.w),
                      child: Container(
                        padding: EdgeInsets.all(24.r),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(28.r), // rounded-3xl
                          border: Border.all(color: const Color(0xFFE8E4DA)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.06),
                              blurRadius: 20,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Top Row: Language Toggle
                            Align(
                              alignment: Alignment.centerLeft,
                              child: TextButton.icon(
                                onPressed: localeCtrl.toggleLanguage,
                                icon: Icon(Icons.language_rounded, size: 16.r, color: AppColors.slateLight),
                                label: Text(
                                  localeCtrl.isArabic ? 'English' : 'العربية',
                                  style: TextStyle(
                                    fontSize: 11.sp,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.slateLight,
                                  ),
                                ),
                              ),
                            ),

                            // App Logo (Circular Brand Vector Logo)
                            Center(
                              child: Padding(
                                padding: EdgeInsets.only(bottom: 12.h),
                                child: const AppLogo(size: 80),
                              ),
                            ),

                            // App Title
                            Text(
                              'دفتر رصد الدرجات',
                              style: TextStyle(
                                fontSize: 24.sp,
                                fontWeight: FontWeight.w900,
                                color: AppColors.textPrimary,
                                letterSpacing: -0.5,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            SizedBox(height: 6.h),

                            // Subtitle
                            Text(
                              'المنصة الذكية لرصد الدرجات الشهرية، احتساب الفصول، وإصدار بطاقات النتائج المعتمدة لأساتذة الجامعات والمدرسين والمعلمين',
                              style: TextStyle(
                                fontSize: 11.sp,
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w600,
                                height: 1.5,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            SizedBox(height: 12.h),

                            // 3 Days Free Trial Announcement Badge
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 6.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5), // emerald-50
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(color: const Color(0xFFA7F3D0)), // emerald-200
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.auto_awesome, size: 14.r, color: const Color(0xFF059669)),
                                  SizedBox(width: 6.w),
                                  Flexible(
                                    child: Text(
                                      'تسجيل الدخول الفعلي مجاني بالكامل لمدة 3 أيام',
                                      style: TextStyle(
                                        fontSize: 10.5.sp,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFF064E3B),
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(height: 16.h),

                            // Error Alert Banner
                            if (auth.errorMessage != null) ...[
                              Container(
                                padding: EdgeInsets.all(12.r),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF1F2), // rose-50
                                  borderRadius: BorderRadius.circular(14.r),
                                  border: Border.all(color: const Color(0xFFFECDD3)), // rose-200
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.error_outline_rounded, size: 18.r, color: const Color(0xFFE11D48)),
                                    SizedBox(width: 8.w),
                                    Expanded(
                                      child: Text(
                                        auth.errorMessage!,
                                        style: TextStyle(
                                          fontSize: 11.sp,
                                          fontWeight: FontWeight.bold,
                                          color: const Color(0xFF9F1239),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(height: 12.h),
                            ],

                            // Reset Password Success Alert
                            if (_resetSuccessMessage != null) ...[
                              Container(
                                padding: EdgeInsets.all(12.r),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(14.r),
                                  border: Border.all(color: const Color(0xFFA7F3D0)),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.check_circle_rounded, size: 18.r, color: const Color(0xFF059669)),
                                    SizedBox(width: 8.w),
                                    Expanded(
                                      child: Text(
                                        _resetSuccessMessage!,
                                        style: TextStyle(
                                          fontSize: 11.sp,
                                          fontWeight: FontWeight.bold,
                                          color: const Color(0xFF064E3B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(height: 12.h),
                            ],

                            // Main Auth Body depending on mode
                            if (_mode == AuthMode.forgotPassword) ...[
                              _buildForgotPasswordView(auth),
                            ] else ...[
                              _buildStandardAuthView(auth),
                            ],
                          ],
                        ),
                      ),
                    ),

                    SizedBox(height: 20.h),

                    // Footer below Card matching web
                    ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: 480.w),
                      child: Column(
                        children: [
                          InkWell(
                            onTap: _openPrivacy,
                            borderRadius: BorderRadius.circular(999),
                            child: Container(
                              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.9),
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(color: const Color(0xFFE8E4DA)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.02),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.verified_user_outlined, size: 14.r, color: const Color(0xFF059669)),
                                  SizedBox(width: 6.w),
                                  Text(
                                    'سياسة الخصوصية وسرية البيانات',
                                    style: TextStyle(
                                      fontSize: 11.sp,
                                      fontWeight: FontWeight.bold,
                                      color: const Color(0xFF334155),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          SizedBox(height: 8.h),
                          Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                'رابط الصفحة المباشر: ',
                                style: TextStyle(
                                  fontSize: 10.sp,
                                  color: AppColors.textMuted,
                                ),
                              ),
                              Text(
                                'https://daragato.online/privacy',
                                style: TextStyle(
                                  fontSize: 10.sp,
                                  fontFamily: 'monospace',
                                  color: AppColors.slateLight,
                                  fontWeight: FontWeight.bold,
                                ),
                                textDirection: TextDirection.ltr,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStandardAuthView(AuthController auth) {
    final isRegister = _mode == AuthMode.register;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Mode Tabs: Login vs Register
        AuthToggleBar(
          isRegister: isRegister,
          onToggle: (val) {
            auth.clearError();
            setState(() {
              _mode = val ? AuthMode.register : AuthMode.login;
              _resetSuccessMessage = null;
            });
          },
        ),
        SizedBox(height: 14.h),

        // Google Sign In Option Prominently
        const GoogleSignInBanner(),
        SizedBox(height: 14.h),

        // Form Fields
        if (isRegister) ...[
          CustomTextField(
            label: 'اسم المعلم / الأستاذ',
            hint: 'مثال: أ. أحمد الهاشمي',
            controller: _nameController,
            prefixIcon: Icon(Icons.person_outline_rounded, size: 18.r, color: AppColors.textSecondary),
            onSubmitted: (_) => _handleSubmit(),
          ),
          SizedBox(height: 12.h),
        ],

        CustomTextField(
          label: 'البريد الإلكتروني',
          hint: 'name@example.com',
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          prefixIcon: Icon(Icons.mail_outline_rounded, size: 18.r, color: AppColors.textSecondary),
          onSubmitted: (_) => _handleSubmit(),
        ),
        SizedBox(height: 12.h),

        CustomTextField(
          label: 'الرقم السري / كلمة المرور',
          hint: '••••••••',
          controller: _passwordController,
          keyboardType: TextInputType.visiblePassword,
          obscureText: _obscurePassword,
          prefixIcon: Icon(Icons.lock_outline_rounded, size: 18.r, color: AppColors.textSecondary),
          suffixIcon: IconButton(
            icon: Icon(
              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
              size: 18.r,
              color: AppColors.textSecondary,
            ),
            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
          ),
          trailingLabel: !isRegister
              ? InkWell(
                  onTap: () {
                    auth.clearError();
                    setState(() {
                      _mode = AuthMode.forgotPassword;
                      _resetSuccessMessage = null;
                    });
                  },
                  child: Text(
                    'نسيت كلمة المرور؟',
                    style: TextStyle(
                      fontSize: 10.5.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.slateLight,
                    ),
                  ),
                )
              : null,
          onSubmitted: (_) => _handleSubmit(),
        ),
        SizedBox(height: 16.h),

        // Primary Submit Button (#557A95)
        CustomButton(
          label: isRegister ? 'إتمام إنشاء الحساب' : 'دخول إلى حسابي',
          icon: isRegister ? Icons.check_circle_outline_rounded : Icons.login_rounded,
          backgroundColor: const Color(0xFF557A95),
          height: 48.h,
          isLoading: auth.isLoading,
          onPressed: auth.isLoading ? null : _handleSubmit,
        ),

        SizedBox(height: 14.h),

        // Safe & Secure note inside card
        Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.shield_outlined, size: 14.r, color: const Color(0xFF3E7D59)),
                SizedBox(width: 6.w),
                Flexible(
                  child: Text(
                    'حفظ تلقائي محلي بدون إنترنت وحماية لبيانات الطلاب',
                    style: TextStyle(
                      fontSize: 10.5.sp,
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 6.h),
            InkWell(
              onTap: _openPrivacy,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'عرض سياسة الخصوصية وسرية البيانات',
                    style: TextStyle(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.slateLight,
                    ),
                  ),
                  SizedBox(width: 4.w),
                  Icon(Icons.arrow_back_ios_rounded, size: 10.r, color: AppColors.slateLight),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildForgotPasswordView(AuthController auth) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'استعادة الرقم السري',
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.inkDark,
              ),
            ),
            InkWell(
              onTap: () {
                auth.clearError();
                setState(() {
                  _mode = AuthMode.login;
                  _resetSuccessMessage = null;
                });
              },
              child: Row(
                children: [
                  Text(
                    'العودة لتسجيل الدخول',
                    style: TextStyle(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.slateLight,
                    ),
                  ),
                  SizedBox(width: 4.w),
                  Icon(Icons.arrow_forward_rounded, size: 14.r, color: AppColors.slateLight),
                ],
              ),
            ),
          ],
        ),
        SizedBox(height: 10.h),
        Text(
          'أدخل بريدك الإلكتروني المسجل، وسيقوم النظام بإرسال رسالة بريد إلكتروني تحتوي على رابط آمن لإعادة تعيين الرقم السري فوراً.',
          style: TextStyle(
            fontSize: 11.sp,
            color: AppColors.textSecondary,
            height: 1.5,
          ),
        ),
        SizedBox(height: 14.h),

        CustomTextField(
          label: 'البريد الإلكتروني المسجل',
          hint: 'name@example.com',
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          prefixIcon: Icon(Icons.mail_outline_rounded, size: 18.r, color: AppColors.textSecondary),
          onSubmitted: (_) => _handlePasswordReset(),
        ),
        SizedBox(height: 16.h),

        InkWell(
          onTap: auth.isLoading ? null : _handlePasswordReset,
          borderRadius: BorderRadius.circular(14.r),
          child: Container(
            height: 48.h,
            decoration: BoxDecoration(
              color: const Color(0xFF557A95),
              borderRadius: BorderRadius.circular(14.r),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF557A95).withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Center(
              child: auth.isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.mail_rounded, size: 18.r, color: Colors.white),
                        SizedBox(width: 8.w),
                        Text(
                          'إرسال رابط إعادة تعيين الرقم السري',
                          style: TextStyle(
                            fontSize: 12.5.sp,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ],
    );
  }
}
