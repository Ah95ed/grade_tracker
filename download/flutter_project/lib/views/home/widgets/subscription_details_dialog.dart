import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/auth_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import 'contact_support_dialog.dart';

/// Modal dialog showing account subscription details and active validity
class SubscriptionDetailsDialog extends StatelessWidget {
  const SubscriptionDetailsDialog({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().currentUser;
    final isTrial = user?.isTrial ?? false;
    final isLifetime = user?.subscriptionType == 'lifetime' || (user?.isAdmin ?? false);
    final isExpired = user?.subscriptionStatus == 'expired' || user?.isExpired == true;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.r)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: 420.w),
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
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(Icons.close_rounded, color: Colors.white, size: 20.r),
                  ),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
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
                  SizedBox(width: 8.w),
                  Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 26.r),
                ],
              ),
            ),
            // Details list
            Padding(
              padding: EdgeInsets.all(18.r),
              child: Column(
                children: [
                  _buildRow(
                    context,
                    label: context.tr(AppKeys.subscriptionStatus),
                    value: isExpired
                        ? context.tr(AppKeys.subscriptionExpired)
                        : (isTrial ? context.tr(AppKeys.subscriptionTrial) : context.tr(AppKeys.subscriptionActive)),
                    color: isExpired ? AppColors.error : AppColors.cardsGreen,
                    icon: isExpired ? Icons.cancel_rounded : Icons.check_circle_rounded,
                  ),
                  Divider(height: 18.h, color: AppColors.borderWarm),
                  _buildRow(
                    context,
                    label: context.tr(AppKeys.subscriptionType),
                    value: isLifetime
                        ? context.tr(AppKeys.subscriptionLifetime)
                        : (isTrial
                            ? context.tr(AppKeys.subscriptionTrial)
                            : (user?.subscriptionType == 'yearly'
                                ? context.tr(AppKeys.subscriptionYearly)
                                : context.tr(AppKeys.subscriptionMonthly))),
                    color: AppColors.monthlyBlue,
                    icon: Icons.star_rounded,
                  ),
                  if (user?.expiresAt != null) ...[
                    Divider(height: 18.h, color: AppColors.borderWarm),
                    _buildRow(
                      context,
                      label: context.tr(AppKeys.expiresOn),
                      value: user!.expiresAt!.split('T')[0],
                      color: AppColors.textPrimary,
                      icon: Icons.calendar_today_rounded,
                    ),
                  ],
                  SizedBox(height: 20.h),
                  // Contact Support for extension/renewal
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      showDialog(context: context, builder: (_) => const ContactSupportDialog());
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                      padding: EdgeInsets.symmetric(vertical: 12.h),
                      elevation: 1,
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
    );
  }

  Widget _buildRow(BuildContext context, {required String label, required String value, required Color color, required IconData icon}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16.r, color: color),
            SizedBox(width: 6.w),
            Text(value, style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
        Text(label, style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary)),
      ],
    );
  }
}

