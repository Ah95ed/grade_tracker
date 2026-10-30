import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../controllers/monthly_sheet_controller.dart';
import '../../controllers/term_controller.dart';
import '../../controllers/teacher_profile_controller.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/localization/translation_keys.dart';
import '../../core/theme/app_colors.dart';
import '../common/custom_button.dart';
import 'widgets/report_card_item.dart';
import 'widgets/print_settings_dialog.dart';
import 'widgets/single_student_card_dialog.dart';

/// Main View for the Report Cards Module (Tab 3: الكروت والشهادات)
class ReportCardsView extends StatelessWidget {
  const ReportCardsView({super.key});

  @override
  Widget build(BuildContext context) {
    final termController = context.watch<TermController>();
    final sheetController = context.watch<MonthlySheetController>();
    final profile = context.watch<TeacherProfileController>().profile;
    final summaries = termController.calculateSummaries(sheetController);

    return LayoutBuilder(
      builder: (context, constraints) {
        final double width = constraints.maxWidth;
        final bool isMobile = width < 600;
        final int crossAxisCount = width >= 1100 ? 3 : (width >= 650 ? 2 : 1);

        return SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Responsive Top Action Bar (Zero overflow on mobile & desktop)
              if (isMobile)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      '${context.tr(AppKeys.tabCards)} (${summaries.length})',
                      style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    SizedBox(height: 8.h),
                    Row(
                      children: [
                        Expanded(child: _buildSettingsBtn(context, isMobile: true)),
                        SizedBox(width: 8.w),
                        Expanded(child: _buildPrintBtn(context)),
                      ],
                    ),
                  ],
                )
              else
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${context.tr(AppKeys.tabCards)} (${summaries.length})',
                      style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    Row(
                      children: [
                        _buildSettingsBtn(context, isMobile: false),
                        SizedBox(width: 8.w),
                        _buildPrintBtn(context),
                      ],
                    ),
                  ],
                ),
              SizedBox(height: 12.h),
              if (summaries.isEmpty)
                Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 40.h),
                    child: Text(
                      context.tr(AppKeys.noStudentsYet),
                      style: TextStyle(fontSize: 13.sp, color: AppColors.textMuted),
                    ),
                  ),
                )
              else if (isMobile)
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: summaries.length,
                  separatorBuilder: (_, _) => SizedBox(height: 10.h),
                  itemBuilder: (context, index) {
                    final summary = summaries[index];
                    return ReportCardItem(
                      summary: summary,
                      profile: profile,
                      onTap: () => showDialog(
                        context: context,
                        builder: (_) => SingleStudentCardDialog(summary: summary, profile: profile),
                      ),
                    );
                  },
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    crossAxisSpacing: 12.w,
                    mainAxisSpacing: 12.h,
                    childAspectRatio: 1.45,
                  ),
                  itemCount: summaries.length,
                  itemBuilder: (context, index) {
                    final summary = summaries[index];
                    return ReportCardItem(
                      summary: summary,
                      profile: profile,
                      onTap: () => showDialog(
                        context: context,
                        builder: (_) => SingleStudentCardDialog(summary: summary, profile: profile),
                      ),
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSettingsBtn(BuildContext context, {required bool isMobile}) {
    return OutlinedButton.icon(
      onPressed: () => showDialog(context: context, builder: (_) => const PrintSettingsDialog()),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: AppColors.borderWarm),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 8.w : 12.w, vertical: 8.h),
      ),
      icon: Icon(Icons.settings_outlined, size: 16.r, color: AppColors.textSecondary),
      label: Text(
        context.tr(AppKeys.printSettings),
        style: TextStyle(fontSize: isMobile ? 11.sp : 12.sp, color: AppColors.textPrimary),
      ),
    );
  }

  Widget _buildPrintBtn(BuildContext context) {
    return CustomButton(
      label: context.tr(AppKeys.printCards),
      icon: Icons.print_rounded,
      backgroundColor: AppColors.cardsGreen,
      height: 38.h,
      onPressed: () {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr(AppKeys.printCards))));
      },
    );
  }
}
