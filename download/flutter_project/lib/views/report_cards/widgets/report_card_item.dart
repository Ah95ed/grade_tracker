import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/student_term_summary.dart';
import '../../../models/teacher_profile.dart';
import '../../common/academic_emblem.dart';
import '../../common/rating_badge.dart';

/// Printable student report card certificate
class ReportCardItem extends StatelessWidget {
  final StudentTermSummary summary;
  final TeacherProfile profile;
  final VoidCallback? onTap;

  const ReportCardItem({
    super.key,
    required this.summary,
    required this.profile,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14.r),
      child: Container(
        padding: EdgeInsets.all(14.r),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14.r),
          border: Border.all(color: AppColors.borderWarm, width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Row: Emblem + School info
            Row(
              children: [
                const AcademicEmblem(),
                SizedBox(width: 10.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.schoolName.isNotEmpty
                            ? profile.schoolName
                            : (profile.teacherName.isNotEmpty ? profile.teacherName : context.tr(AppKeys.schoolName)),
                        style: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (profile.subject.isNotEmpty || profile.academicYear.isNotEmpty)
                        Text(
                          [
                            if (profile.subject.isNotEmpty) profile.subject,
                            if (profile.academicYear.isNotEmpty) profile.academicYear,
                          ].join(' • '),
                          style: TextStyle(
                            fontSize: 10.sp,
                            color: AppColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
                RatingBadge(
                  ratingKey: summary.ratingKey,
                  status: summary.status,
                ),
              ],
            ),
            Divider(height: 18.h, color: AppColors.borderLight),
            // Student Name & Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    summary.studentName,
                    style: TextStyle(
                      fontSize: 13.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                  decoration: BoxDecoration(
                    color: AppColors.creamBackground,
                    borderRadius: BorderRadius.circular(4.r),
                    border: Border.all(color: AppColors.borderWarm),
                  ),
                  child: Text(
                    '${context.tr(AppKeys.section)}: ${summary.section}',
                    style: TextStyle(
                      fontSize: 10.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 10.h),
            // Monthly scores breakdown
            Container(
              padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
              decoration: BoxDecoration(
                color: AppColors.warmCanvas,
                borderRadius: BorderRadius.circular(8.r),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: summary.monthlyScores.entries.map((e) {
                  return Column(
                    children: [
                      Text(
                        e.key,
                        style: TextStyle(fontSize: 10.sp, color: AppColors.textSecondary),
                      ),
                      SizedBox(height: 2.h),
                      Text(
                        e.value != null ? e.value.toString() : '-',
                        style: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
            SizedBox(height: 12.h),
            // Final Term Score
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  context.tr(AppKeys.finalScore),
                  style: TextStyle(
                    fontSize: 12.sp,
                    fontWeight: FontWeight.bold,
                    color: AppColors.cardsGreen,
                  ),
                ),
                Text(
                  '${summary.finalTermScore ?? '-'} / ${summary.termMaxScore.toInt()}',
                  style: TextStyle(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w900,
                    color: AppColors.cardsGreen,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
