import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/auth_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/term_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../common/academic_emblem.dart';
import '../../common/sync_badge.dart';
import '../../teacher_profile/teacher_profile_dialog.dart';

/// Top Application Header matching the original Grade Tracker visual identity
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
        return AppColors.monthlyBlue;
      case 1:
        return AppColors.termRust;
      case 2:
        return AppColors.cardsGreen;
      default:
        return AppColors.slateDark;
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<TeacherProfileController>().profile;
    final auth = context.watch<AuthController>();
    final bannerColor = _getBannerColor();

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
      child: Row(
        children: [
          // Teacher & School Banner
          Expanded(
            child: InkWell(
              onTap: () => showDialog(
                context: context,
                builder: (_) => const TeacherProfileDialog(),
              ),
              borderRadius: BorderRadius.circular(12.r),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                decoration: BoxDecoration(
                  color: bannerColor,
                  borderRadius: BorderRadius.circular(12.r),
                  boxShadow: [
                    BoxShadow(
                      color: bannerColor.withValues(alpha: 0.3),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      profile.teacherName.isNotEmpty ? profile.teacherName : profile.schoolName,
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (profile.subject.isNotEmpty) ...[
                      SizedBox(height: 2.h),
                      Text(
                        profile.subject,
                        style: TextStyle(
                          fontSize: 10.sp,
                          fontWeight: FontWeight.w500,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          SizedBox(width: 8.w),
          // Academic Laurel Logo
          const AcademicEmblem(),
          SizedBox(width: 8.w),
          // Cloud Sync Badge
          SyncBadge(
            isOnline: auth.isOnline,
            isSyncing: auth.isSyncing,
            onTap: () async {
              final models = context.read<MonthlySheetController>().models;
              final terms = context.read<TermController>().terms;
              final profile = context.read<TeacherProfileController>().profile;
              final success = await auth.syncCloudData(models: models, terms: terms, profile: profile);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    duration: const Duration(seconds: 2),
                    content: Text(
                      success ? context.tr(AppKeys.syncSuccess) : context.tr(AppKeys.syncError),
                    ),
                  ),
                );
              }
            },
          ),
          SizedBox(width: 8.w),
          // Tools & Menu Button
          IconButton(
            onPressed: onOpenMenu,
            icon: Icon(
              Icons.tune_rounded,
              size: 20.r,
              color: AppColors.slateDark,
            ),
            tooltip: context.tr(AppKeys.toolsAndMore),
            style: IconButton.styleFrom(
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10.r),
                side: const BorderSide(color: AppColors.borderWarm),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
