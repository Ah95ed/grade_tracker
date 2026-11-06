import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/auth_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/custom_button.dart';
import '../../common/custom_text_field.dart';

/// Modal dialog for sending a Firebase password reset email
class ForgotPasswordDialog extends StatefulWidget {
  final String initialEmail;
  const ForgotPasswordDialog({super.key, this.initialEmail = ''});

  @override
  State<ForgotPasswordDialog> createState() => _ForgotPasswordDialogState();
}

class _ForgotPasswordDialogState extends State<ForgotPasswordDialog> {
  late final TextEditingController _controller;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleSend() async {
    final email = _controller.text.trim();
    if (email.isEmpty || !email.contains('@')) return;

    setState(() => _isLoading = true);
    final auth = context.read<AuthController>();
    final success = await auth.apiService.sendPasswordReset(email);
    setState(() => _isLoading = false);

    if (mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? context.tr(AppKeys.resetSentSuccess) : context.tr(AppKeys.syncError),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
      title: Text(
        context.tr(AppKeys.forgotPassword),
        style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CustomTextField(
            label: context.tr(AppKeys.email),
            controller: _controller,
            keyboardType: TextInputType.emailAddress,
            prefixIcon: Icon(Icons.mail_outline, size: 18.r),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(context.tr(AppKeys.cancel), style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary)),
        ),
        CustomButton(
          label: context.tr(AppKeys.sendResetLink),
          height: 36.h,
          backgroundColor: AppColors.monthlyBlue,
          onPressed: _isLoading ? null : _handleSend,
        ),
      ],
    );
  }
}
