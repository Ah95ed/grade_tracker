import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/auth_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';

/// Modal dialog confirming permanent user account & data deletion
class DeleteAccountDialog extends StatefulWidget {
  const DeleteAccountDialog({super.key});

  @override
  State<DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<DeleteAccountDialog> {
  bool _confirmed = false;
  bool _isDeleting = false;

  Future<void> _handleDelete() async {
    if (!_confirmed || _isDeleting) return;
    setState(() => _isDeleting = true);
    final auth = context.read<AuthController>();
    await auth.deleteAccount();
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().currentUser;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: 440.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Red header
            Container(
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
              color: const Color(0xFFFEF2F2),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _isDeleting ? null : () => Navigator.of(context).pop(),
                    icon: Icon(Icons.close_rounded, size: 20.r, color: AppColors.error),
                  ),
                  const Spacer(),
                  Text(
                    context.tr(AppKeys.deleteAccountPermanent),
                    style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold, color: AppColors.error),
                  ),
                  SizedBox(width: 8.w),
                  Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 22.r),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.all(16.r),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'أنت على وشك حذف حساب (${user?.email ?? ""}) نهائياً من قاعدة البيانات والتخزين المحلي. هذا الإجراء لا يمكن التراجع عنه.',
                    style: TextStyle(fontSize: 11.sp, height: 1.5, color: AppColors.textPrimary),
                  ),
                  SizedBox(height: 12.h),
                  Container(
                    padding: EdgeInsets.all(10.r),
                    decoration: BoxDecoration(
                      color: AppColors.creamBackground,
                      borderRadius: BorderRadius.circular(10.r),
                      border: Border.all(color: AppColors.borderWarm),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ما الذي سيتم محوه؟', style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                        SizedBox(height: 4.h),
                        _bullet('حذف حساب المعلم وسجل الدخول نهائياً.'),
                        _bullet('مسح كافة النماذج وجداول الدرجات الشهرية.'),
                        _bullet('مسح أسماء الطلاب ودرجاتهم وملاحظاتهم.'),
                        _bullet('مسح الفصول الدراسية والمعدلات السنوية.'),
                        _bullet('مسح كافة البيانات من الخادم السحابي D1 والتخزين المحلي.'),
                      ],
                    ),
                  ),
                  SizedBox(height: 12.h),
                  CheckboxListTile(
                    value: _confirmed,
                    onChanged: _isDeleting ? null : (val) => setState(() => _confirmed = val ?? false),
                    title: Text(
                      context.tr(AppKeys.deleteAccountConfirm),
                      style: TextStyle(fontSize: 10.sp, fontWeight: FontWeight.bold, color: AppColors.error),
                    ),
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                  ),
                  SizedBox(height: 10.h),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: _isDeleting ? null : () => Navigator.of(context).pop(),
                        child: Text(context.tr(AppKeys.cancel), style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary)),
                      ),
                      SizedBox(width: 8.w),
                      ElevatedButton(
                        onPressed: (_confirmed && !_isDeleting) ? _handleDelete : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.error,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: AppColors.error.withValues(alpha: 0.3),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                          padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
                        ),
                        child: _isDeleting
                            ? SizedBox(width: 16.r, height: 16.r, child: const CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Text(context.tr(AppKeys.deleteAccount), style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bullet(String text) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 2.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: TextStyle(fontSize: 10.sp, color: AppColors.error, fontWeight: FontWeight.bold)),
          Expanded(child: Text(text, style: TextStyle(fontSize: 10.sp, color: AppColors.textSecondary))),
        ],
      ),
    );
  }
}

