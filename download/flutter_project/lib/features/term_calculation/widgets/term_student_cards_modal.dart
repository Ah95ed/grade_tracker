import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/term_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../models/student_term_summary.dart';
import '../../../views/common/rating_badge.dart';

/// Modal displaying comprehensive student performance cards at the term level (Section 4.4)
class TermStudentCardsModal extends StatefulWidget {
  const TermStudentCardsModal({super.key});

  @override
  State<TermStudentCardsModal> createState() => _TermStudentCardsModalState();
}

class _TermStudentCardsModalState extends State<TermStudentCardsModal> {
  String _searchQuery = '';
  String _selectedSection = 'ALL';

  @override
  Widget build(BuildContext context) {
    final termCtrl = context.watch<TermController>();
    final sheetCtrl = context.watch<MonthlySheetController>();
    final profile = context.watch<TeacherProfileController>().profile;
    final term = termCtrl.currentTerm;

    if (term == null) {
      return const SizedBox.shrink();
    }

    final summaries = termCtrl.calculateSummaries(sheetCtrl);

    // Available sections in the term results
    final sections = summaries
        .map((s) => s.section.trim())
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList()..sort();

    // Filter summaries by search & section
    final filtered = summaries.where((s) {
      final matchesSearch = _searchQuery.isEmpty ||
          s.studentName.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesSection =
          _selectedSection == 'ALL' || s.section.trim() == _selectedSection;
      return matchesSearch && matchesSection;
    }).toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        backgroundColor: const Color(0xFFFAF7EC),
        insetPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 16.h),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20.r),
          side: const BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
        ),
        child: Container(
          width: 760.w,
          constraints: BoxConstraints(maxHeight: 780.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFB86848),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 24.r),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'بطاقات وكروت نتائج الطلاب (${term.name})',
                            style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w900, color: Colors.white),
                          ),
                          Text(
                            'المادة: ${term.subject.isNotEmpty ? term.subject : profile.subject} • ${term.gradeLevel.isNotEmpty ? term.gradeLevel : profile.gradeLevel}',
                            style: TextStyle(fontSize: 10.5.sp, color: Colors.white.withValues(alpha: 0.9)),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Filter & Search bar
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'بحث باسم الطالب...',
                          prefixIcon: const Icon(Icons.search_rounded, size: 20),
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: EdgeInsets.symmetric(vertical: 8.h),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10.r),
                            borderSide: const BorderSide(color: Color(0xFFD8CEBD)),
                          ),
                        ),
                        onChanged: (val) => setState(() => _searchQuery = val),
                      ),
                    ),
                    if (sections.isNotEmpty) ...[
                      SizedBox(width: 10.w),
                      DropdownButton<String>(
                        value: _selectedSection,
                        underline: const SizedBox(),
                        items: [
                          const DropdownMenuItem(value: 'ALL', child: Text('كافة الشُعب')),
                          ...sections.map((s) => DropdownMenuItem(value: s, child: Text('شعبة $s'))),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedSection = val);
                        },
                      ),
                    ],
                  ],
                ),
              ),

              // Cards Grid / List
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Text(
                          'لا توجد نتائج مطابقة لبحثك.',
                          style: TextStyle(fontSize: 13.sp, color: const Color(0xFF64748B)),
                        ),
                      )
                    : ListView.builder(
                        padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 6.h),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final student = filtered[index];
                          return _buildStudentCard(student);
                        },
                      ),
              ),

              // Footer
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'إجمالي الطلاب في الكروت: ${filtered.length} طالب',
                      style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: const Color(0xFF475569)),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFB86848)),
                      onPressed: () => Navigator.pop(context),
                      child: const Text('إغلاق', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStudentCard(StudentTermSummary s) {
    return Container(
      margin: EdgeInsets.only(bottom: 10.h),
      padding: EdgeInsets.all(12.r),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14.r),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 16.r,
                    backgroundColor: const Color(0xFFFAF7EC),
                    child: Icon(Icons.person_rounded, size: 18.r, color: const Color(0xFFB86848)),
                  ),
                  SizedBox(width: 8.w),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        s.studentName,
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w900, color: const Color(0xFF1E293B)),
                      ),
                      Text(
                        'الشعبة: ${s.section.isNotEmpty ? s.section : "-"} • ${s.gradeLevel}',
                        style: TextStyle(fontSize: 10.sp, color: const Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  RatingBadge(ratingKey: s.ratingKey, status: s.status),
                  SizedBox(width: 8.w),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Text(
                      'المعدل: ${s.finalTermScore != null ? s.finalTermScore!.toStringAsFixed(1).replaceAll('.0', '') : '-'}',
                      style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: const Color(0xFF92400E)),
                    ),
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: 8.h),
          const Divider(height: 1),
          SizedBox(height: 8.h),

          // Monthly / Source Breakdown
          Wrap(
            spacing: 8.w,
            runSpacing: 4.h,
            children: s.monthlyScores.entries.map((e) {
              return Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(6.r),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Text(
                  '${e.key}: ${e.value != null ? e.value!.toStringAsFixed(1).replaceAll('.0', '') : "-"}',
                  style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF334155), fontWeight: FontWeight.w600),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
