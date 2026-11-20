import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/term_controller.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/term_model.dart';
import '../../common/confirm_dialog.dart';
import 'create_term_dialog.dart';
import '../../../features/term_calculation/widgets/term_student_cards_modal.dart';

/// Full Term Selector and Comprehensive Term Card matching Daragat Web App
class TermSelectorBar extends StatelessWidget {
  const TermSelectorBar({super.key});

  @override
  Widget build(BuildContext context) {
    final termController = context.watch<TermController>();
    final sheetController = context.watch<MonthlySheetController>();
    final terms = termController.terms;
    final activeTerm = termController.currentTerm;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 14.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Full-width "+ إضافة فصل جديد" & "كروت النتائج" Row
          Row(
            children: [
              Expanded(
                flex: 2,
                child: InkWell(
                  onTap: () => showDialog(
                    context: context,
                    builder: (_) => const CreateTermDialog(),
                  ),
                  borderRadius: BorderRadius.circular(16.r),
                  child: Container(
                    padding: EdgeInsets.symmetric(vertical: 12.h, horizontal: 16.w),
                    decoration: BoxDecoration(
                      color: AppColors.termRust, // #B86848
                      borderRadius: BorderRadius.circular(16.r),
                      border: Border.all(color: const Color(0xFF944D30), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.termRust.withValues(alpha: 0.28),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_rounded, size: 20.r, color: Colors.white),
                        SizedBox(width: 6.w),
                        Text(
                          'إضافة فصل جديد',
                          style: TextStyle(
                            fontSize: 13.5.sp,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (activeTerm != null) ...[
                SizedBox(width: 8.w),
                Expanded(
                  flex: 1,
                  child: InkWell(
                    onTap: () => showDialog(
                      context: context,
                      builder: (_) => const TermStudentCardsModal(),
                    ),
                    borderRadius: BorderRadius.circular(16.r),
                    child: Container(
                      padding: EdgeInsets.symmetric(vertical: 12.h, horizontal: 10.w),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAF7EC),
                        borderRadius: BorderRadius.circular(16.r),
                        border: Border.all(color: const Color(0xFFB86848), width: 1.5),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.badge_outlined, size: 18.r, color: const Color(0xFFB86848)),
                          SizedBox(width: 4.w),
                          Text(
                            'كروت النتائج',
                            style: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFFB86848),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          SizedBox(height: 10.h),

          // 2. Terms Switcher Tabs (when multiple terms exist)
          if (terms.length > 1) ...[
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: terms.map((term) {
                  final isActive = term.id == activeTerm?.id;
                  final monthsCount = term.selectedModelIds.length;
                  return Padding(
                    padding: EdgeInsets.only(left: 8.w),
                    child: InkWell(
                      onTap: () => termController.setActiveTerm(term.id),
                      borderRadius: BorderRadius.circular(12.r),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 7.h),
                        decoration: BoxDecoration(
                          color: isActive ? AppColors.termRust : const Color(0xFFEFE3DC),
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(
                            color: isActive ? const Color(0xFF944D30) : const Color(0xFFD6BFB2),
                            width: 1.2,
                          ),
                          boxShadow: isActive
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.12),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              term.name,
                              style: TextStyle(
                                fontSize: 12.sp,
                                fontWeight: FontWeight.w900,
                                color: isActive ? Colors.white : const Color(0xFF4A2818),
                              ),
                            ),
                            SizedBox(width: 6.w),
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 1.5.h),
                              decoration: BoxDecoration(
                                color: isActive
                                    ? Colors.white.withValues(alpha: 0.22)
                                    : const Color(0xFFDDC9BD),
                                borderRadius: BorderRadius.circular(6.r),
                              ),
                              child: Text(
                                '$monthsCount أشهر',
                                style: TextStyle(
                                  fontSize: 9.5.sp,
                                  fontWeight: FontWeight.bold,
                                  color: isActive ? Colors.white : const Color(0xFF4A2818),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            SizedBox(height: 10.h),
          ],

          // 3. Full, Comprehensive Term Card (بطاقة الفصل الكاملة)
          if (activeTerm != null)
            _buildFullTermCard(
              context: context,
              termController: termController,
              sheetController: sheetController,
              term: activeTerm,
              terms: terms,
            ),
        ],
      ),
    );
  }

  /// Builds the complete Term Card showing all required details
  Widget _buildFullTermCard({
    required BuildContext context,
    required TermController termController,
    required MonthlySheetController sheetController,
    required TermModel term,
    required List<TermModel> terms,
  }) {
    final models = sheetController.models;
    final otherTerms = terms.where((t) => t.id != term.id).toList();

    return Container(
      padding: EdgeInsets.all(14.r),
      decoration: BoxDecoration(
        color: AppColors.termRust, // #B86848 Terracotta container matching web
        borderRadius: BorderRadius.circular(18.r),
        border: Border.all(color: AppColors.termRustDark, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.termRust.withValues(alpha: 0.25),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Header Row: Tag, Name, Grade & Subject Badges, and Action Icons
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Wrap(
                  spacing: 8.w,
                  runSpacing: 6.h,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAF0EB),
                        borderRadius: BorderRadius.circular(6.r),
                      ),
                      child: Text(
                        'صفحة احتساب الدرجات',
                        style: TextStyle(
                          fontSize: 10.5.sp,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF7A361D),
                        ),
                      ),
                    ),
                    Text(
                      term.name,
                      style: TextStyle(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    if (term.gradeLevel.isNotEmpty)
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8.r),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.school_rounded, size: 13.r, color: Colors.white),
                            SizedBox(width: 4.w),
                            Text(
                              term.gradeLevel,
                              style: TextStyle(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (term.subject.isNotEmpty)
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7).withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(8.r),
                          border: Border.all(color: const Color(0xFFFDE68A).withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.menu_book_rounded, size: 13.r, color: const Color(0xFFFEF3C7)),
                            SizedBox(width: 4.w),
                            Text(
                              term.subject,
                              style: TextStyle(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFFFEF3C7),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),

              // Top Action Buttons: Edit & Delete
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Edit Term Button
                  Tooltip(
                    message: 'تعديل بيانات فصل ${term.name}',
                    child: InkWell(
                      onTap: () => showDialog(
                        context: context,
                        builder: (_) => AddTermModal(termToEdit: term),
                      ),
                      borderRadius: BorderRadius.circular(8.r),
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(8.r),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.edit_rounded, size: 13.r, color: Colors.white),
                            SizedBox(width: 3.w),
                            Text(
                              'تعديل',
                              style: TextStyle(
                                fontSize: 10.5.sp,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 6.w),

                  // Delete Term Button
                  Tooltip(
                    message: 'حذف فصل ${term.name}',
                    child: InkWell(
                      onTap: () => _confirmDeleteTerm(context, termController, term),
                      borderRadius: BorderRadius.circular(8.r),
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDC2626).withValues(alpha: 0.85),
                          borderRadius: BorderRadius.circular(8.r),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.delete_outline_rounded, size: 13.r, color: Colors.white),
                            SizedBox(width: 3.w),
                            Text(
                              'حذف',
                              style: TextStyle(
                                fontSize: 10.5.sp,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: 10.h),

          // 2. Middle Row: Teacher, Sections, and Calculation Mode Badges
          Wrap(
            spacing: 8.w,
            runSpacing: 6.h,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              // Teacher Badge
              if (term.teacherName.isNotEmpty)
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.5.h),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8.r),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.person_rounded, size: 13.r, color: Colors.white),
                      SizedBox(width: 4.w),
                      Text(
                        'الأستاذ: ${term.teacherName}',
                        style: TextStyle(
                          fontSize: 10.5.sp,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),

              // Assigned Sections Badge
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.5.h),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8.r),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.groups_rounded, size: 13.r, color: Colors.white),
                    SizedBox(width: 4.w),
                    Text(
                      'الشُعب المخصصة: ${term.assignedSections.isNotEmpty ? term.assignedSections.join('، ') : 'جميع الشُعب'}',
                      style: TextStyle(
                        fontSize: 10.5.sp,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),

              // Calculation Mode Badge
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.5.h),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8.r),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: Text(
                  term.calculationMode == 'average' ? 'احتساب: معدل درجات' : 'احتساب: درجة واحدة',
                  style: TextStyle(
                    fontSize: 10.sp,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFFFEF3C7),
                  ),
                ),
              ),

              // Source Type Badge (if aggregate)
              if (term.sourceType != 'models')
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.5.h),
                  decoration: BoxDecoration(
                    color: const Color(0xFF78350F).withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(8.r),
                    border: Border.all(color: const Color(0xFFFDE68A).withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    term.sourceType == 'terms' ? 'المصدر: فصول سابقة' : 'المصدر: أشهر وفصول',
                    style: TextStyle(
                      fontSize: 10.sp,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFFFDE68A),
                    ),
                  ),
                ),
            ],
          ),
          SizedBox(height: 12.h),

          // Divider
          Container(height: 1, color: Colors.white.withValues(alpha: 0.2)),
          SizedBox(height: 10.h),

          // 3. Monthly Models Selection Checkboxes for Active Term (الأشهر المحددة من الجدول)
          if (models.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.calendar_month_rounded, size: 16.r, color: Colors.white),
                    SizedBox(width: 6.w),
                    Text(
                      'الأشهر المحددة من الجدول:',
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(width: 6.w),
                    Text(
                      '(${term.selectedModelIds.length} من ${models.length})',
                      style: TextStyle(
                        fontSize: 11.sp,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFFFEF3C7),
                      ),
                    ),
                  ],
                ),

                // Select All / Deselect All
                if (models.length > 1)
                  Row(
                    children: [
                      InkWell(
                        onTap: () {
                          for (final m in models) {
                            if (!term.selectedModelIds.contains(m.id)) {
                              termController.toggleModelSelection(m.id);
                            }
                          }
                        },
                        child: Text(
                          'تحديد الكل',
                          style: TextStyle(
                            fontSize: 10.5.sp,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFFFFE5DB),
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 4.w),
                        child: Text('•', style: TextStyle(color: Colors.white.withValues(alpha: 0.6))),
                      ),
                      InkWell(
                        onTap: () {
                          for (final m in models) {
                            if (term.selectedModelIds.contains(m.id)) {
                              termController.toggleModelSelection(m.id);
                            }
                          }
                        },
                        child: Text(
                          'إلغاء الكل',
                          style: TextStyle(
                            fontSize: 10.5.sp,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFFFFE5DB),
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            SizedBox(height: 8.h),

            // Checkbox Pills
            Wrap(
              spacing: 8.w,
              runSpacing: 8.h,
              children: models.map((model) {
                final isSelected = term.selectedModelIds.contains(model.id);
                return InkWell(
                  onTap: () => termController.toggleModelSelection(model.id),
                  borderRadius: BorderRadius.circular(10.r),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF8C3E21) : Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10.r),
                      border: Border.all(
                        color: isSelected ? const Color(0xFFF2C5B3) : Colors.white.withValues(alpha: 0.3),
                        width: 1.2,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 16.r,
                          height: 16.r,
                          decoration: BoxDecoration(
                            color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4.r),
                            border: Border.all(color: Colors.white, width: 1.2),
                          ),
                          child: isSelected
                              ? Icon(Icons.check_rounded, size: 12.r, color: const Color(0xFF7A361D))
                              : null,
                        ),
                        SizedBox(width: 6.w),
                        Text(
                          model.name,
                          style: TextStyle(
                            fontSize: 11.5.sp,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],

          // 4. Source Terms Selection Checkboxes (الفصول المنشأة) - if aggregate
          if (otherTerms.isNotEmpty && term.sourceType != 'models') ...[
            SizedBox(height: 10.h),
            Text(
              'الفصول المنشأة المعتمدة في الاحتساب:',
              style: TextStyle(
                fontSize: 11.5.sp,
                fontWeight: FontWeight.w900,
                color: const Color(0xFFFEF3C7),
              ),
            ),
            SizedBox(height: 6.h),
            Wrap(
              spacing: 8.w,
              runSpacing: 8.h,
              children: otherTerms.map((otherTerm) {
                final isSelected = term.selectedTermIds.contains(otherTerm.id);
                return InkWell(
                  onTap: () {
                    final currentSelected = List<String>.from(term.selectedTermIds);
                    if (isSelected) {
                      currentSelected.remove(otherTerm.id);
                    } else {
                      currentSelected.add(otherTerm.id);
                    }
                    termController.updateTerm(term.copyWith(selectedTermIds: currentSelected));
                  },
                  borderRadius: BorderRadius.circular(10.r),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF78350F) : Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10.r),
                      border: Border.all(
                        color: isSelected ? const Color(0xFFFDE68A) : Colors.white.withValues(alpha: 0.3),
                        width: 1.2,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 16.r,
                          height: 16.r,
                          decoration: BoxDecoration(
                            color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4.r),
                            border: Border.all(color: Colors.white, width: 1.2),
                          ),
                          child: isSelected
                              ? Icon(Icons.check_rounded, size: 12.r, color: const Color(0xFF78350F))
                              : null,
                        ),
                        SizedBox(width: 6.w),
                        Text(
                          otherTerm.name,
                          style: TextStyle(
                            fontSize: 11.5.sp,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  void _confirmDeleteTerm(
    BuildContext context,
    TermController controller,
    TermModel term,
  ) {
    showDialog(
      context: context,
      builder: (_) => ConfirmDialog(
        title: 'تأكيد حذف فصل (${term.name})',
        message:
            'هل أنت متأكد من حذف فصل (${term.name})؟ سيتم حذف جميع إعدادات واحتسابات هذا الفصل.',
        confirmLabel: 'نعم، احذف الفصل',
        isDestructive: true,
        onConfirm: () async {
          final termName = term.name;
          controller.deleteTerm(term.id);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('تم حذف فصل ($termName) بنجاح'),
                backgroundColor: const Color(0xFFDC2626),
                duration: const Duration(seconds: 3),
              ),
            );
          }
        },
      ),
    );
  }
}
