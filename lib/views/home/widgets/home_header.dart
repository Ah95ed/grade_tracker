import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/auth_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/term_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/academic_emblem.dart';
import '../../common/sync_badge.dart';
import '../../teacher_profile/teacher_profile_dialog.dart';
import 'subscription_details_dialog.dart';

/// Top Application Header matching Daragat Web App (Header.tsx)
class HomeHeader extends StatelessWidget {
  final int activeIndex;
  final VoidCallback onOpenMenu;

  const HomeHeader({
    super.key,
    required this.activeIndex,
    required this.onOpenMenu,
  });

  Color _getBannerColor() {
    switch (activeIndex) {
      case 0:
        return AppColors.monthlyBlue; // #5692BE
      case 1:
        return AppColors.termRust; // #B86848
      case 2:
        return AppColors.cardsGreen; // #4E7A68
      default:
        return AppColors.slateDark;
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<TeacherProfileController>().profile;
    final auth = context.watch<AuthController>();
    final bannerColor = _getBannerColor();
    final user = auth.currentUser;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
      child: Row(
        children: [
          // 1. Teacher & School Banner
          Expanded(
            child: InkWell(
              onTap: () => showDialog(
                context: context,
                builder: (_) => const TeacherProfileDialog(),
              ),
              borderRadius: BorderRadius.circular(14.r),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 9.h),
                decoration: BoxDecoration(
                  color: bannerColor,
                  borderRadius: BorderRadius.circular(14.r),
                  boxShadow: [
                    BoxShadow(
                      color: bannerColor.withValues(alpha: 0.35),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      (user?.displayName.isNotEmpty == true)
                          ? user!.displayName
                          : (profile.teacherName.isNotEmpty
                              ? profile.teacherName
                              : (profile.schoolName.isNotEmpty ? profile.schoolName : 'المدرس')),
                      style: TextStyle(
                        fontSize: 12.5.sp,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: 2.h),
                    Text(
                      profile.subject.isNotEmpty
                          ? (profile.effectiveInstitutionName.isNotEmpty ? '${profile.subject} • ${profile.effectiveInstitutionName}' : profile.subject)
                          : (profile.effectiveInstitutionName.isNotEmpty ? profile.effectiveInstitutionName : (user?.email ?? '')),
                      style: TextStyle(
                        fontSize: 10.sp,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withValues(alpha: 0.92),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(width: 8.w),

          // 2. Academic Laurel Logo
          const AcademicEmblem(),
          SizedBox(width: 8.w),

          // 3. Settings Gear Button ("الإعدادات ⚙️")
          Tooltip(
            message: 'الإعدادات وبيانات المعلم والمدرسة',
            child: InkWell(
              onTap: () => showDialog(
                context: context,
                builder: (_) => const TeacherProfileDialog(),
              ),
              borderRadius: BorderRadius.circular(12.r),
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF6EC),
                  borderRadius: BorderRadius.circular(12.r),
                  border: Border.all(color: const Color(0xFFD8CEBD)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 2,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.settings_suggest_rounded,
                      size: 16.r,
                      color: const Color(0xFF557A95),
                    ),
                    SizedBox(width: 4.w),
                    Text(
                      'الإعدادات',
                      style: TextStyle(
                        fontSize: 11.sp,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF2F2822),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(width: 8.w),

          // 4. Live Sync Status Badge
          SyncBadge(
            isOnline: auth.isOnline,
            isSyncing: auth.isSyncing,
            onTap: () async {
              final sheetCtrl = context.read<MonthlySheetController>();
              final termCtrl = context.read<TermController>();
              final profCtrl = context.read<TeacherProfileController>();

              // If user has no local models but is logged in, try restoring from cloud first
              if (sheetCtrl.models.isEmpty && auth.currentUser != null && !auth.currentUser!.isTrial) {
                final restored = await auth.restoreCloudDataIfEmpty(
                  onModelsRestored: (m) => sheetCtrl.setModels(m),
                  onTermsRestored: (t) => termCtrl.setTerms(t),
                  onProfileRestored: (p) => profCtrl.updateProfile(p),
                );
                if (restored && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      duration: Duration(seconds: 3),
                      backgroundColor: AppColors.cardsGreen,
                      content: Text('تمت استعادة درجاتك وجداولك بنجاح من السحابة.'),
                    ),
                  );
                  return;
                }
              }

              final syncResult = await auth.syncCloudData(
                models: sheetCtrl.models,
                terms: termCtrl.terms,
                profile: profCtrl.profile,
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    duration: const Duration(seconds: 3),
                    backgroundColor: syncResult.success ? AppColors.cardsGreen : AppColors.termRust,
                    content: Text(
                      syncResult.message,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                );
              }
            },
          ),
          SizedBox(width: 8.w),

          // 4. Subscription Quick Badge (Desktop / Tablet)
          if (user != null)
            Padding(
              padding: EdgeInsets.only(left: 8.w),
              child: InkWell(
                onTap: () => showDialog(
                  context: context,
                  builder: (_) => const SubscriptionDetailsDialog(),
                ),
                borderRadius: BorderRadius.circular(12.r),
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAF6EC),
                    borderRadius: BorderRadius.circular(12.r),
                    border: Border.all(color: const Color(0xFFD8CEBD)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 2,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome, size: 14.r, color: const Color(0xFFB45309)),
                      SizedBox(width: 4.w),
                      Text(
                        user.isTrial ? 'تجريبي' : 'اشتراك دائم',
                        style: TextStyle(
                          fontSize: 11.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF7A5B36),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // 5. Tools & Options Menu Trigger ("الأدوات والمزيد")
          InkWell(
            onTap: onOpenMenu,
            borderRadius: BorderRadius.circular(12.r),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: const Color(0xFFD5DFE8)), // border-[#D5DFE8]
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 3,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.tune_rounded,
                    size: 16.r,
                    color: AppColors.slateLight, // text-[#557A95]
                  ),
                  SizedBox(width: 6.w),
                  Text(
                    'الأدوات والمزيد',
                    style: TextStyle(
                      fontSize: 11.5.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.slateDark, // text-[#2E485C]
                    ),
                  ),
                  SizedBox(width: 4.w),
                  Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 14.r,
                    color: AppColors.slateDark,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
