import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';

/// Modal dialog for Customer & Technical Support via WhatsApp, Phone, and Email
class ContactSupportDialog extends StatelessWidget {
  const ContactSupportDialog({super.key});

  static const String _phone = '+9647706118992';
  static const String _rawPhone = '9647706118992';
  static const String _email = 'asmaomar5566@gmail.com';

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _copy(BuildContext context, String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(context.tr(AppKeys.copiedToClipboard)),
        duration: const Duration(seconds: 2),
      ),
    );
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
          children: [
            // Emerald gradient header
            Container(
              padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 16.h),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF059669), Color(0xFF0F766E)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(Icons.close_rounded, color: Colors.white, size: 20.r),
                  ),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        context.tr(AppKeys.contactSupport),
                        style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      SizedBox(height: 2.h),
                      Text(
                        'دعم فني سريع ومباشر على مدار الساعة',
                        style: TextStyle(fontSize: 10.sp, color: Colors.white.withValues(alpha: 0.9)),
                      ),
                    ],
                  ),
                  SizedBox(width: 8.w),
                  Icon(Icons.headset_mic_rounded, color: Colors.white, size: 24.r),
                ],
              ),
            ),
            // Body cards
            Padding(
              padding: EdgeInsets.all(16.r),
              child: Column(
                children: [
                  _buildCard(
                    context,
                    title: context.tr(AppKeys.callDirect),
                    value: _phone,
                    icon: Icons.phone_forwarded_rounded,
                    color: const Color(0xFF0F766E),
                    bgColor: const Color(0xFFF0FDFA),
                    onAction: () => _launch('tel:$_phone'),
                    onCopy: () => _copy(context, _phone),
                  ),
                  SizedBox(height: 10.h),
                  _buildCard(
                    context,
                    title: context.tr(AppKeys.chatWhatsapp),
                    value: 'واتس آب: $_phone',
                    icon: Icons.chat_rounded,
                    color: const Color(0xFF16A34A),
                    bgColor: const Color(0xFFF0FDF4),
                    onAction: () => _launch('https://wa.me/$_rawPhone?text=${Uri.encodeComponent("السلام عليكم، أود الاستفسار حول تطبيق راصد الدرجات")}'),
                    onCopy: () => _copy(context, _phone),
                  ),
                  SizedBox(height: 10.h),
                  _buildCard(
                    context,
                    title: context.tr(AppKeys.sendEmailDirect),
                    value: _email,
                    icon: Icons.mail_outline_rounded,
                    color: const Color(0xFF2563EB),
                    bgColor: const Color(0xFFEFF6FF),
                    onAction: () => _launch('mailto:$_email?subject=${Uri.encodeComponent("استفسار حول تطبيق راصد الدرجات")}'),
                    onCopy: () => _copy(context, _email),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onAction,
    required VoidCallback onCopy,
  }) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 10.h),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14.r),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          ElevatedButton.icon(
            onPressed: onAction,
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              foregroundColor: Colors.white,
              padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
              elevation: 0,
            ),
            icon: Icon(icon, size: 14.r),
            label: Text(title, style: TextStyle(fontSize: 10.sp, fontWeight: FontWeight.bold)),
          ),
          SizedBox(width: 6.w),
          IconButton(
            onPressed: onCopy,
            icon: Icon(Icons.copy_rounded, size: 16.r, color: AppColors.textSecondary),
            tooltip: context.tr(AppKeys.copiedToClipboard),
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(fontSize: 10.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            textDirection: TextDirection.ltr,
          ),
        ],
      ),
    );
  }
}
