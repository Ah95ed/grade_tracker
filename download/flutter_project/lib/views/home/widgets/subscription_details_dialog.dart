import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../controllers/auth_controller.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/app_user.dart';
import 'contact_support_dialog.dart';

/// Modal dialog showing account subscription details, yearly plan info (5,000 IQD / 365 days),
/// offline-safe expiration check, and pre-filled WhatsApp activation button (Section 1.1 & 1.5)
class SubscriptionDetailsDialog extends StatefulWidget {
  const SubscriptionDetailsDialog({super.key});

  @override
  State<SubscriptionDetailsDialog> createState() => _SubscriptionDetailsDialogState();
}

class _SubscriptionDetailsDialogState extends State<SubscriptionDetailsDialog> {
  bool _isCheckingLive = false;

  Future<void> _launchWhatsAppActivation(AppUser? user) async {
    final msg = buildWhatsAppActivationMessage(user);
    final uri = Uri.parse(
      'https://wa.me/${AppConstants.supportWhatsAppDigits}?text=${Uri.encodeComponent(msg)}',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _refreshLiveStatus() async {
    setState(() => _isCheckingLive = true);
    final auth = context.read<AuthController>();
    await auth.checkLiveSubscription();
    if (mounted) {
      setState(() => _isCheckingLive = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().currentUser;
    final isTrial = user?.isTrial ?? false;
    final isLifetime = user?.type == SubscriptionType.lifetime || (user?.isAdmin ?? false);
    final isExpired = user != null ? isSubscriptionExpired(user, DateTime.now()) : false;
    final expiryNotice = user != null ? subscriptionExpiryMessage(user) : 'يلزم تفعيل الاشتراك للمتابعة';

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.r)),
        clipBehavior: Clip.antiAlias,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: 440.w),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 16.h),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFFD97706), Color(0xFFB45309)],
                      begin: Alignment.topRight,
                      end: Alignment.bottomLeft,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 26.r),
                      SizedBox(width: 10.w),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr(AppKeys.subscriptionDetails),
                              style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            SizedBox(height: 2.h),
                            Text(
                              user?.email ?? '',
                              style: TextStyle(fontSize: 11.sp, color: Colors.white.withValues(alpha: 0.9)),
                              textDirection: TextDirection.ltr,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: 'تحديث حالة الاشتراك من السيرفر',
                        onPressed: _isCheckingLive ? null : _refreshLiveStatus,
                        icon: _isCheckingLive
                            ? SizedBox(
                                width: 18.r,
                                height: 18.r,
                                child: const CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Icon(Icons.refresh_rounded, color: Colors.white, size: 20.r),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: Icon(Icons.close_rounded, color: Colors.white, size: 20.r),
                      ),
                    ],
                  ),
                ),

                // Expired Banner (Section 1.5)
                if (isExpired)
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
                    color: const Color(0xFFFEF2F2),
                    child: Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: const Color(0xFFDC2626), size: 20.r),
                        SizedBox(width: 8.w),
                        Expanded(
                          child: Text(
                            expiryNotice,
                            style: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFFB91C1C),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Details list
                Padding(
                  padding: EdgeInsets.all(18.r),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildRow(
                        context,
                        label: context.tr(AppKeys.subscriptionStatus),
                        value: isExpired
                            ? context.tr(AppKeys.subscriptionExpired)
                            : (isTrial
                                ? '${context.tr(AppKeys.subscriptionTrial)} (48 ساعة)'
                                : (user?.status == SubscriptionStatus.pending
                                    ? 'فترة تجريبية (48 ساعة)'
                                    : context.tr(AppKeys.subscriptionActive))),
                        color: isExpired ? AppColors.error : AppColors.cardsGreen,
                        icon: isExpired ? Icons.cancel_rounded : Icons.check_circle_rounded,
                      ),
                      Divider(height: 18.h, color: AppColors.borderWarm),
                      _buildRow(
                        context,
                        label: context.tr(AppKeys.subscriptionType),
                        value: isLifetime
                            ? context.tr(AppKeys.subscriptionLifetime)
                            : (user?.type == SubscriptionType.monthly
                                ? context.tr(AppKeys.subscriptionMonthly)
                                : '${context.tr(AppKeys.subscriptionYearly)} (365 يوماً)'),
                        color: AppColors.monthlyBlue,
                        icon: Icons.star_rounded,
                      ),
                      if (user?.expiresAt != null && !isLifetime) ...[
                        Divider(height: 18.h, color: AppColors.borderWarm),
                        _buildRow(
                          context,
                          label: context.tr(AppKeys.expiresOn),
                          value: user!.expiresAt!.split('T')[0],
                          color: AppColors.textPrimary,
                          icon: Icons.calendar_today_rounded,
                        ),
                      ],
                      SizedBox(height: 14.h),

                      // Yearly Plan Pricing Card (5,000 IQD / 365 days)
                      Container(
                        padding: EdgeInsets.all(12.r),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(14.r),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.verified_rounded, color: const Color(0xFFD97706), size: 18.r),
                                SizedBox(width: 6.w),
                                Text(
                                  'الاشتراك السنوي الرسمي: 5,000 دينار / 365 يوماً',
                                  style: TextStyle(
                                    fontSize: 12.sp,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF92400E),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 4.h),
                            Text(
                              'يشمل جميع ميزات التطبيق والعمل أوفلاين وأونلاين والمزامنة السحابية. رقم الدعم المباشر: ${AppConstants.supportPhoneLocal}',
                              style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF78350F)),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 14.h),

                      // Direct WhatsApp Activation Button (Pre-filled with Name, Email, UID, Plan)
                      ElevatedButton.icon(
                        onPressed: () => _launchWhatsAppActivation(user),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF16A34A),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                          padding: EdgeInsets.symmetric(vertical: 12.h),
                          elevation: 1,
                        ),
                        icon: Icon(Icons.chat_rounded, size: 18.r),
                        label: Text(
                          'تفعيل / تجديد الاشتراك عبر واتساب (5,000 دينار)',
                          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold),
                        ),
                      ),
                      SizedBox(height: 8.h),

                      // Other Support Options
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pop();
                          showDialog(context: context, builder: (_) => const ContactSupportDialog());
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFD97706),
                          side: const BorderSide(color: Color(0xFFD97706)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                          padding: EdgeInsets.symmetric(vertical: 10.h),
                        ),
                        icon: Icon(Icons.support_agent_rounded, size: 18.r),
                        label: Text(
                          context.tr(AppKeys.contactSupport),
                          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRow(
    BuildContext context, {
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary)),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16.r, color: color),
            SizedBox(width: 6.w),
            Text(value, style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ],
    );
  }
}
