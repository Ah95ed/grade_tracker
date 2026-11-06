import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../controllers/monthly_sheet_controller.dart';
import '../../controllers/term_controller.dart';
import '../../controllers/teacher_profile_controller.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/localization/translation_keys.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/report_card_item.dart';
import 'widgets/print_settings_dialog.dart';
import 'widgets/single_student_card_dialog.dart';

/// Main View for the Report Cards Module matching Daragat Web App (ReportCardsView.tsx)
class ReportCardsView extends StatefulWidget {
  const ReportCardsView({super.key});

  @override
  State<ReportCardsView> createState() => _ReportCardsViewState();
}

class _ReportCardsViewState extends State<ReportCardsView> {
  String _searchQuery = '';
  String _groupingMode = 'by_subject'; // 'by_subject' or 'by_student'

  @override
  Widget build(BuildContext context) {
    final termController = context.watch<TermController>();
    final sheetController = context.watch<MonthlySheetController>();
    final profile = context.watch<TeacherProfileController>().profile;
    final terms = termController.terms;
    final allSummaries = termController.calculateSummaries(sheetController);

    final filteredSummaries = allSummaries.where((s) {
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.trim().toLowerCase();
      return s.studentName.toLowerCase().contains(q) || s.section.toLowerCase().contains(q);
    }).toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final double width = constraints.maxWidth;
        final bool isCompact = width < 720;
        final int crossAxisCount = width >= 1150 ? 3 : 2;

        return SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Top Sage Green Banner matching Daragat Web
              Container(
                padding: EdgeInsets.all(16.r),
                decoration: BoxDecoration(
                  color: AppColors.cardsGreen, // #4E7A68
                  borderRadius: BorderRadius.circular(16.r),
                  border: Border.all(color: AppColors.cardsGreenDark, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.cardsGreen.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 36.r,
                          height: 36.r,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(10.r),
                          ),
                          child: Icon(Icons.layers_rounded, size: 20.r, color: Colors.white),
                        ),
                        SizedBox(width: 10.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Wrap(
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: 8.w,
                                runSpacing: 4.h,
                                children: [
                                  Text(
                                    'فصول الدرجات المعتمدة في المعدل',
                                    style: TextStyle(
                                      fontSize: 13.5.sp,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Container(
                                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(999),
                                      border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                                    ),
                                    child: Text(
                                      '${terms.length} ${terms.length == 1 ? 'فصل' : 'فصول'}',
                                      style: TextStyle(
                                        fontSize: 10.sp,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 2.h),
                              Text(
                                'تظهر هنا أسماء الفصول المعرفة في صفحة المعدل، وتُعرض درجاتها مباشرة لكل صف وشعبة أدناه.',
                                style: TextStyle(
                                  fontSize: 10.5.sp,
                                  color: Colors.white.withValues(alpha: 0.9),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (terms.isNotEmpty) ...[
                      SizedBox(height: 12.h),
                      Wrap(
                        spacing: 8.w,
                        runSpacing: 6.h,
                        children: terms.map((t) {
                          return Container(
                            padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10.r),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 8.r,
                                  height: 8.r,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Color(0xFFFDE047), // amber-300
                                  ),
                                ),
                                SizedBox(width: 6.w),
                                Text(
                                  t.name,
                                  style: TextStyle(
                                    fontSize: 11.5.sp,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),

              SizedBox(height: 10.h),

              // 2. Mode Selector: By Subject vs By Student Name
              Container(
                padding: EdgeInsets.all(12.r),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF7EC),
                  borderRadius: BorderRadius.circular(16.r),
                  border: Border.all(color: const Color(0xFFD8CEBD)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 3,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 10.w,
                  runSpacing: 8.h,
                  children: [
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8.w,
                      runSpacing: 6.h,
                      children: [
                        Text(
                          'طريقة عرض الكروت:',
                          style: TextStyle(
                            fontSize: 11.5.sp,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF554A3E),
                          ),
                        ),
                        Container(
                          padding: EdgeInsets.all(3.r),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEBE1CF),
                            borderRadius: BorderRadius.circular(10.r),
                            border: Border.all(color: const Color(0xFFD4C4AA)),
                          ),
                          child: Wrap(
                            spacing: 2.w,
                            runSpacing: 2.h,
                            children: [
                              _buildModePill(
                                label: 'حسب المادة',
                                icon: Icons.layers_rounded,
                                isSelected: _groupingMode == 'by_subject',
                                onTap: () => setState(() => _groupingMode = 'by_subject'),
                              ),
                              _buildModePill(
                                label: 'حسب اسم الطالب',
                                icon: Icons.person_rounded,
                                isSelected: _groupingMode == 'by_student',
                                onTap: () => setState(() => _groupingMode = 'by_student'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // Print & Settings Action Buttons
                    Wrap(
                      spacing: 8.w,
                      runSpacing: 6.h,
                      children: [
                        _buildSettingsBtn(context),
                        _buildPrintBtn(context),
                      ],
                    ),
                  ],
                ),
              ),

              SizedBox(height: 10.h),

              // 3. Search Bar
              SizedBox(
                height: 40.h,
                child: TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  style: TextStyle(fontSize: 12.sp, color: AppColors.inkDark),
                  decoration: InputDecoration(
                    hintText: 'بحث باسم الطالب أو الشعبة في الكروت...',
                    hintStyle: TextStyle(fontSize: 11.5.sp, color: AppColors.textMuted),
                    prefixIcon: Icon(Icons.search_rounded, size: 18.r, color: AppColors.textSecondary),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: EdgeInsets.zero,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12.r),
                      borderSide: const BorderSide(color: Color(0xFFD8CEBD)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12.r),
                      borderSide: const BorderSide(color: Color(0xFFD8CEBD)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12.r),
                      borderSide: const BorderSide(color: AppColors.cardsGreen, width: 1.5),
                    ),
                  ),
                ),
              ),

              SizedBox(height: 12.h),

              // 4. Cards Grid / List
              if (filteredSummaries.isEmpty)
                Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 40.h),
                    child: Text(
                      context.tr(AppKeys.noStudentsYet),
                      style: TextStyle(fontSize: 13.sp, color: AppColors.textMuted),
                    ),
                  ),
                )
              else if (isCompact)
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filteredSummaries.length,
                  separatorBuilder: (context, index) => SizedBox(height: 10.h),
                  itemBuilder: (context, index) {
                    final summary = filteredSummaries[index];
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
                  itemCount: filteredSummaries.length,
                  itemBuilder: (context, index) {
                    final summary = filteredSummaries[index];
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

  Widget _buildModePill({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8.r),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 5.h),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.cardsGreen : Colors.transparent,
          borderRadius: BorderRadius.circular(8.r),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 3,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14.r,
              color: isSelected ? Colors.white : const Color(0xFF4A3B2C),
            ),
            SizedBox(width: 4.w),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.sp,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                color: isSelected ? Colors.white : const Color(0xFF4A3B2C),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsBtn(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () => showDialog(
        context: context,
        builder: (_) => const PrintSettingsDialog(),
      ),
      style: OutlinedButton.styleFrom(
        backgroundColor: Colors.white,
        side: const BorderSide(color: Color(0xFFD8CEBD)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
      ),
      icon: Icon(Icons.tune_rounded, size: 16.r, color: AppColors.cardsGreen),
      label: Text(
        context.tr(AppKeys.printSettings),
        style: TextStyle(
          fontSize: 11.5.sp,
          fontWeight: FontWeight.bold,
          color: AppColors.cardsGreen,
        ),
      ),
    );
  }

  Widget _buildPrintBtn(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('جاري إعداد الكروت للطباعة...'),
            duration: Duration(seconds: 2),
          ),
        );
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.cardsGreen,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
        padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
        elevation: 1,
      ),
      icon: Icon(Icons.print_rounded, size: 16.r, color: Colors.white),
      label: Text(
        context.tr(AppKeys.printCards),
        style: TextStyle(
          fontSize: 11.5.sp,
          fontWeight: FontWeight.w900,
          color: Colors.white,
        ),
      ),
    );
  }
}
