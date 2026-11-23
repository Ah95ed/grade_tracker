import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../controllers/teacher_personal_controller.dart';
import '../../controllers/teacher_profile_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../models/exam_paper.dart';
import '../../services/pdf/exam_paper_pdf_service.dart';

/// Full interactive Exam Paper Builder view matching authentic Iraqi educational standards
class ExamBuilderView extends StatefulWidget {
  final bool isStandalone;

  const ExamBuilderView({super.key, this.isStandalone = false});

  @override
  State<ExamBuilderView> createState() => _ExamBuilderViewState();
}

class _ExamBuilderViewState extends State<ExamBuilderView> {
  final TextEditingController _titleController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final controller = context.read<TeacherPersonalController>();
    _titleController.text = controller.draftExam.title;
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<TeacherPersonalController>();
    final profile = context.watch<TeacherProfileController>().profile;
    final draft = controller.draftExam;
    final digits = draft.useArabicDigits;

    final content = Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        color: const Color(0xFFF4F0E6), // Parchment workspace background
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Top Control Bar (حفظ، طباعة، نموذج وزاري، حجم الخط، أرقام)
            _buildTopControlBar(context, controller, profile, draft),

            // 2. Interactive A4 Paper Canvas
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
                child: Center(
                  child: Container(
                    width: 780.w,
                    constraints: BoxConstraints(minHeight: 1000.h),
                    padding: EdgeInsets.symmetric(horizontal: 28.w, vertical: 24.h),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4.r),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.14),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                      border: Border.all(color: const Color(0xFFCBD5E1), width: 1.0),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // A. Iraqi Ministerial Header ("الكليشة")
                        _buildExamHeader(controller, draft, digits),
                        SizedBox(height: 8.h),

                        // B. Student Info Row
                        if (draft.header.showStudentInfo) ...[
                          _buildStudentInfoRow(controller, draft),
                          SizedBox(height: 8.h),
                        ],

                        // C. General Exam Note ("ملاحظة: أجب عن...")
                        if (draft.header.showNote) ...[
                          _buildGeneralNote(controller, draft),
                          SizedBox(height: 10.h),
                        ],

                        // D. Questions List
                        ...draft.questions.asMap().entries.map((entry) {
                          final qIdx = entry.key;
                          final q = entry.value;
                          return _buildQuestionItem(controller, draft, q, qIdx, digits);
                        }),

                        // E. Add Question Button
                        SizedBox(height: 12.h),
                        Center(
                          child: InkWell(
                            onTap: () {
                              final newId = 'q_${DateTime.now().millisecondsSinceEpoch}';
                              final nextNum = draft.questions.length + 1;
                              final newQ = ExamQuestionItem(
                                id: newId,
                                label: 'س${formatNumber(nextNum, digits)}',
                                prompt: '',
                                marks: '20 درجة',
                                branchStyle: ExamBranchStyle.arabicAlpha,
                                branchLayout: ExamBranchLayout.vertical,
                                branches: [
                                  ExamQuestionBranch(
                                    id: 'b_${DateTime.now().millisecondsSinceEpoch}_1',
                                    text: '',
                                  ),
                                ],
                              );
                              final updatedQuestions = List<ExamQuestionItem>.from(draft.questions)..add(newQ);
                              controller.updateDraftExam(draft.copyWith(questions: updatedQuestions));
                            },
                            borderRadius: BorderRadius.circular(10.r),
                            child: Container(
                              padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 8.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFAF7EC),
                                borderRadius: BorderRadius.circular(10.r),
                                border: Border.all(color: AppColors.craftBrown, width: 1.5),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.add_circle_outline_rounded, size: 16.r, color: AppColors.craftBrown),
                                  SizedBox(width: 6.w),
                                  Text(
                                    'إضافة سؤال جديد (س${formatNumber(draft.questions.length + 1, digits)})',
                                    style: TextStyle(
                                      fontSize: 12.sp,
                                      fontWeight: FontWeight.bold,
                                      color: const Color(0xFF6D4C2F),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        SizedBox(height: 24.h),

                        // F. Exam Footer & Teacher Name
                        _buildExamFooter(controller, draft),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );

    if (widget.isStandalone) {
      return Scaffold(
        appBar: AppBar(
          title: Text(
            'كتابة وبناء الأسئلة الامتحانية',
            style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          backgroundColor: const Color(0xFF4338CA),
          elevation: 2,
          actions: [
            IconButton(
              icon: const Icon(Icons.print_rounded, color: Colors.white),
              tooltip: 'طباعة ورقة الأسئلة',
              onPressed: () => ExamPaperPdfService.printExamPaper(draft),
            ),
            IconButton(
              icon: const Icon(Icons.share_rounded, color: Colors.white),
              tooltip: 'مشاركة PDF',
              onPressed: () => ExamPaperPdfService.shareExamPdf(draft),
            ),
          ],
        ),
        body: content,
      );
    }

    return content;
  }

  // --- 1. Top Control Bar ---
  Widget _buildTopControlBar(
    BuildContext context,
    TeacherPersonalController controller,
    dynamic profile,
    SavedExamPaper draft,
  ) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 8.h),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(bottom: BorderSide(color: Color(0xFFD8CEBD), width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 8.w,
        runSpacing: 8.h,
        children: [
          // Left Action Buttons: Save, Rename, Print, Sample, New Exam, Saved Models
          Wrap(
            spacing: 6.w,
            runSpacing: 6.h,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              // 1. Direct Save Button (1-Click Instant Save)
              ElevatedButton.icon(
                onPressed: () {
                  controller.saveCurrentExam();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('تم حفظ نموذج الأسئلة بنجاح: "${controller.draftExam.title}"'),
                      backgroundColor: const Color(0xFF15803D),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
                icon: const Icon(Icons.save_rounded, size: 15, color: Colors.white),
                label: Text(
                  'حفظ النموذج',
                  style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.craftBrown,
                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 7.h),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                ),
              ),

              // 2. Rename Model Dialog Button
              Tooltip(
                message: 'تعديل عنوان النموذج',
                child: InkWell(
                  onTap: () => _showSaveExamDialog(context, controller, draft),
                  borderRadius: BorderRadius.circular(8.r),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 7.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAF7EC),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: const Color(0xFFD8CEBD)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.edit_note_rounded, size: 15.r, color: const Color(0xFF6D4C2F)),
                        SizedBox(width: 3.w),
                        ConstrainedBox(
                          constraints: BoxConstraints(maxWidth: 120.w),
                          child: Text(
                            draft.title.isNotEmpty ? draft.title : 'تسمية النموذج',
                            style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF6D4C2F)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // 3. Print / PDF Button with Loading & Error Handling
              ElevatedButton.icon(
                onPressed: () async {
                  try {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Row(
                          children: [
                            SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                            SizedBox(width: 10),
                            Text('جاري تجهيز ورقة الأسئلة للطباعة والتصدير...'),
                          ],
                        ),
                        duration: Duration(seconds: 1),
                        backgroundColor: Color(0xFF4338CA),
                      ),
                    );
                    await ExamPaperPdfService.printExamPaper(draft);
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('تعذر تجهيز ملف الطباعة: $e'),
                          backgroundColor: Colors.red.shade700,
                        ),
                      );
                    }
                  }
                },
                icon: const Icon(Icons.print_rounded, size: 15, color: Colors.white),
                label: Text(
                  'طباعة / PDF',
                  style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4338CA),
                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 7.h),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                ),
              ),

              // 4. Load Sample Button
              OutlinedButton.icon(
                onPressed: () {
                  controller.loadSampleExam(schoolLogo: profile.schoolLogo);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('تم تحميل النموذج الوزاري الاسترشادي العراقي'),
                      backgroundColor: Color(0xFF0D9488),
                    ),
                  );
                },
                icon: Icon(Icons.auto_awesome_rounded, size: 14, color: AppColors.craftBrown),
                label: Text(
                  'نموذج وزاري جاهز',
                  style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: AppColors.craftBrown),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppColors.craftBrown),
                  padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                ),
              ),

              // 5. New Blank Exam Button
              OutlinedButton.icon(
                onPressed: () {
                  controller.createNewExam(
                    schoolName: profile.schoolName,
                    subject: profile.subject,
                    academicYear: profile.academicYear,
                    teacherName: profile.teacherName,
                    schoolLogo: profile.schoolLogo,
                  );
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('تم إنشاء ورقة أسئلة جديدة فارغة'),
                      backgroundColor: Color(0xFF0284C7),
                    ),
                  );
                },
                icon: const Icon(Icons.note_add_rounded, size: 14, color: Color(0xFF0284C7)),
                label: Text(
                  'ورقة جديدة',
                  style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: const Color(0xFF0284C7)),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF0284C7)),
                  padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                ),
              ),

              // 6. Saved Templates Dropdown with Delete & Load
              if (controller.savedExams.isNotEmpty)
                PopupMenuButton<String>(
                  tooltip: 'النماذج المحفوظة',
                  onSelected: (val) {
                    if (val.startsWith('del_')) {
                      final delId = val.substring(4);
                      controller.deleteExam(delId);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('تم حذف النموذج المحفوظ')),
                      );
                    } else {
                      controller.loadExam(val);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('تم فتح النموذج: ${controller.draftExam.title}'),
                          backgroundColor: const Color(0xFF15803D),
                        ),
                      );
                    }
                  },
                  itemBuilder: (_) => controller.savedExams.map((e) {
                    return PopupMenuItem(
                      value: e.id,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              e.title.isNotEmpty ? e.title : 'نموذج أسئلة',
                              style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          InkWell(
                            onTap: () {
                              Navigator.pop(context);
                              controller.deleteExam(e.id);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('تم حذف النموذج المحفوظ')),
                              );
                            },
                            child: Padding(
                              padding: EdgeInsets.all(4.r),
                              child: Icon(Icons.delete_outline_rounded, size: 16.r, color: Colors.red.shade400),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAF7EC),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(color: const Color(0xFFD8CEBD)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.folder_open_rounded, size: 14.r, color: const Color(0xFF6D4C2F)),
                        SizedBox(width: 4.w),
                        Text(
                          'النماذج المحفوظة (${controller.savedExams.length})',
                          style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: const Color(0xFF6D4C2F)),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),

          // Right Toolbar Options: Digits toggle & Font Size selector
          Wrap(
            spacing: 6.w,
            runSpacing: 6.h,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              // Digits switch
              InkWell(
                onTap: () {
                  controller.updateDraftExam(draft.copyWith(useArabicDigits: !draft.useArabicDigits));
                },
                borderRadius: BorderRadius.circular(8.r),
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAF7EC),
                    borderRadius: BorderRadius.circular(8.r),
                    border: Border.all(color: const Color(0xFFD8CEBD)),
                  ),
                  child: Text(
                    draft.useArabicDigits ? 'الأرقام: عربية (١ ٢ ٣)' : 'الأرقام: إنجليزية (1 2 3)',
                    style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF3D2E21)),
                  ),
                ),
              ),

              // Font Size Selector
              Container(
                padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 1.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF7EC),
                  borderRadius: BorderRadius.circular(8.r),
                  border: Border.all(color: const Color(0xFFD8CEBD)),
                ),
                child: DropdownButton<String>(
                  value: draft.fontSize,
                  underline: const SizedBox(),
                  isDense: true,
                  style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: const Color(0xFF3D2E21)),
                  items: const [
                    DropdownMenuItem(value: 'sm', child: Text('خط صغير (A4 مكثف)')),
                    DropdownMenuItem(value: 'md', child: Text('خط متوسط (قياسي)')),
                    DropdownMenuItem(value: 'lg', child: Text('خط كبير')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      controller.updateDraftExam(draft.copyWith(fontSize: val));
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- A. Iraqi Ministerial Header ("الكليشة") ---
  Widget _buildExamHeader(
    TeacherPersonalController controller,
    SavedExamPaper draft,
    bool digits,
  ) {
    final h = draft.header;

    return Container(
      padding: EdgeInsets.only(bottom: 10.h),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.black, width: 2.0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Right Lines (المدرسة، الصف، المادة...)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ...h.rightLines.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final text = entry.value;
                  return Padding(
                    padding: EdgeInsets.only(bottom: 3.h),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            key: ValueKey('header_right_${idx}_${draft.id}'),
                            initialValue: text,
                            style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.black),
                            decoration: const InputDecoration(
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(vertical: 2),
                              border: InputBorder.none,
                            ),
                            onChanged: (val) {
                              final updated = List<String>.from(h.rightLines);
                              updated[idx] = val;
                              controller.updateDraftExam(
                                draft.copyWith(header: h.copyWith(rightLines: updated)),
                                notify: false,
                              );
                            },
                          ),
                        ),
                        InkWell(
                          onTap: () {
                            final updated = List<String>.from(h.rightLines)..removeAt(idx);
                            controller.updateDraftExam(draft.copyWith(
                              header: h.copyWith(rightLines: updated),
                            ));
                          },
                          child: Icon(Icons.close_rounded, size: 14.r, color: Colors.grey.shade400),
                        ),
                      ],
                    ),
                  );
                }),
                InkWell(
                  onTap: () {
                    final updated = List<String>.from(h.rightLines)..add('سطر جديد : ');
                    controller.updateDraftExam(draft.copyWith(header: h.copyWith(rightLines: updated)));
                  },
                  child: Text(
                    '+ إضافة سطر',
                    style: TextStyle(fontSize: 10.sp, color: Colors.grey.shade500, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),

          // Center Logo / Title
          Container(
            padding: EdgeInsets.symmetric(horizontal: 10.w),
            child: Column(
              children: [
                Text(
                  'جمهورية العراق\nوزارة التربية',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.w900, color: Colors.black),
                ),
              ],
            ),
          ),

          // Left Lines (الدور، العام الدراسي، الوقت...)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                ...h.leftLines.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final text = entry.value;
                  return Padding(
                    padding: EdgeInsets.only(bottom: 3.h),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        InkWell(
                          onTap: () {
                            final updated = List<String>.from(h.leftLines)..removeAt(idx);
                            controller.updateDraftExam(draft.copyWith(
                              header: h.copyWith(leftLines: updated),
                            ));
                          },
                          child: Icon(Icons.close_rounded, size: 14.r, color: Colors.grey.shade400),
                        ),
                        SizedBox(width: 4.w),
                        Expanded(
                          child: TextFormField(
                            key: ValueKey('header_left_${idx}_${draft.id}'),
                            initialValue: text,
                            textAlign: TextAlign.left,
                            style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.black),
                            decoration: const InputDecoration(
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(vertical: 2),
                              border: InputBorder.none,
                            ),
                            onChanged: (val) {
                              final updated = List<String>.from(h.leftLines);
                              updated[idx] = val;
                              controller.updateDraftExam(
                                draft.copyWith(header: h.copyWith(leftLines: updated)),
                                notify: false,
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  );
                }),
                InkWell(
                  onTap: () {
                    final updated = List<String>.from(h.leftLines)..add('سطر جديد : ');
                    controller.updateDraftExam(draft.copyWith(header: h.copyWith(leftLines: updated)));
                  },
                  child: Text(
                    '+ إضافة سطر',
                    style: TextStyle(fontSize: 10.sp, color: Colors.grey.shade500, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- B. Student Info Row ---
  Widget _buildStudentInfoRow(TeacherPersonalController controller, SavedExamPaper draft) {
    final h = draft.header;
    return Container(
      padding: EdgeInsets.only(bottom: 4.h),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey, width: 0.8)),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Row(
              children: [
                Text(
                  '${h.studentNameLabel} ',
                  style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.black),
                ),
                Expanded(
                  child: Container(
                    height: 1,
                    color: Colors.grey.shade400,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: 20.w),
          Expanded(
            flex: 2,
            child: Row(
              children: [
                Text(
                  '${h.studentNumberLabel} ',
                  style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.black),
                ),
                Expanded(
                  child: Container(
                    height: 1,
                    color: Colors.grey.shade400,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- C. General Exam Note ---
  Widget _buildGeneralNote(TeacherPersonalController controller, SavedExamPaper draft) {
    final h = draft.header;
    return TextFormField(
      key: ValueKey('exam_note_${draft.id}'),
      initialValue: h.noteText,
      style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.black),
      decoration: InputDecoration(
        hintText: 'ملاحظة : أجب عن خمسة أسئلة فقط ، ولكل سؤال ( ٢٠ ) درجة .',
        hintStyle: TextStyle(fontSize: 11.5.sp, color: Colors.grey.shade400),
        isDense: true,
        contentPadding: EdgeInsets.symmetric(vertical: 4.h),
        border: InputBorder.none,
      ),
      onChanged: (val) {
        controller.updateDraftExam(draft.copyWith(header: h.copyWith(noteText: val)), notify: false);
      },
    );
  }

  // --- D. Question Item ---
  Widget _buildQuestionItem(
    TeacherPersonalController controller,
    SavedExamPaper draft,
    ExamQuestionItem q,
    int qIdx,
    bool digits,
  ) {
    return Container(
      margin: EdgeInsets.only(bottom: 10.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Question Prompt Line: Label + Prompt + Marks
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Label (س١)
              SizedBox(
                width: 42.w,
                child: TextFormField(
                  key: ValueKey('q_label_${q.id}_${draft.id}'),
                  initialValue: q.label,
                  style: TextStyle(fontSize: 13.5.sp, fontWeight: FontWeight.w900, color: Colors.black),
                  decoration: const InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    border: InputBorder.none,
                  ),
                  onChanged: (val) {
                    _updateQuestion(controller, draft, q.id, q.copyWith(label: val), notify: false);
                  },
                ),
              ),
              Text(' : ', style: TextStyle(fontSize: 13.5.sp, fontWeight: FontWeight.w900, color: Colors.black)),

              // Main Prompt
              Expanded(
                child: TextFormField(
                  key: ValueKey('q_prompt_${q.id}_${draft.id}'),
                  initialValue: q.prompt,
                  maxLines: null,
                  style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold, color: Colors.black),
                  decoration: InputDecoration(
                    hintText: 'اكتب نص السؤال هنا...',
                    hintStyle: TextStyle(fontSize: 12.sp, color: Colors.grey.shade400),
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    border: InputBorder.none,
                  ),
                  onChanged: (val) {
                    _updateQuestion(controller, draft, q.id, q.copyWith(prompt: val), notify: false);
                  },
                ),
              ),

              // Marks
              SizedBox(
                width: 70.w,
                child: TextFormField(
                  key: ValueKey('q_marks_${q.id}_${draft.id}'),
                  initialValue: q.marks ?? '',
                  textAlign: TextAlign.left,
                  style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: Colors.black87),
                  decoration: InputDecoration(
                    hintText: '(الدرجة)',
                    hintStyle: TextStyle(fontSize: 11.sp, color: Colors.grey.shade400),
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    border: InputBorder.none,
                  ),
                  onChanged: (val) {
                    _updateQuestion(controller, draft, q.id, q.copyWith(marks: val), notify: false);
                  },
                ),
              ),
            ],
          ),
          SizedBox(height: 4.h),

          // 2. Question Branches
          if (q.branches.isNotEmpty)
            Padding(
              padding: EdgeInsets.only(right: 28.w),
              child: _buildBranchesView(controller, draft, q, digits),
            ),

          // 3. Question Quick Toolbar
          Padding(
            padding: EdgeInsets.only(right: 28.w, top: 4.h),
            child: Wrap(
              spacing: 6.w,
              runSpacing: 4.h,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                // Add Branch Button
                InkWell(
                  onTap: () {
                    final newBId = 'b_${DateTime.now().millisecondsSinceEpoch}';
                    final updatedBranches = List<ExamQuestionBranch>.from(q.branches)
                      ..add(ExamQuestionBranch(id: newBId, text: ''));
                    _updateQuestion(controller, draft, q.id, q.copyWith(branches: updatedBranches));
                  },
                  borderRadius: BorderRadius.circular(6.r),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6.r),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add, size: 12.r, color: Colors.black87),
                        SizedBox(width: 3.w),
                        Text(
                          '+ فرع (أ / ب)',
                          style: TextStyle(fontSize: 10.sp, fontWeight: FontWeight.bold, color: Colors.black87),
                        ),
                      ],
                    ),
                  ),
                ),

                // Branch Style Selector
                DropdownButton<ExamBranchStyle>(
                  value: q.branchStyle,
                  isDense: true,
                  underline: const SizedBox(),
                  style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: Colors.black87),
                  items: ExamBranchStyle.values.map((s) {
                    return DropdownMenuItem(value: s, child: Text(s.label));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      _updateQuestion(controller, draft, q.id, q.copyWith(branchStyle: val));
                    }
                  },
                ),

                // Branch Layout Selector
                DropdownButton<ExamBranchLayout>(
                  value: q.branchLayout,
                  isDense: true,
                  underline: const SizedBox(),
                  style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: Colors.black87),
                  items: ExamBranchLayout.values.map((l) {
                    return DropdownMenuItem(value: l, child: Text(l.label));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      _updateQuestion(controller, draft, q.id, q.copyWith(branchLayout: val));
                    }
                  },
                ),

                // Divider Line Toggle
                InkWell(
                  onTap: () {
                    _updateQuestion(controller, draft, q.id, q.copyWith(hasDivider: !q.hasDivider));
                  },
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        q.hasDivider ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                        size: 14.r,
                        color: q.hasDivider ? AppColors.craftBrown : Colors.grey,
                      ),
                      SizedBox(width: 3.w),
                      Text('خط فاصل', style: TextStyle(fontSize: 10.sp, color: Colors.black87)),
                    ],
                  ),
                ),

                // Delete Question
                IconButton(
                  icon: Icon(Icons.delete_outline_rounded, size: 16.r, color: Colors.red.shade400),
                  tooltip: 'حذف هذا السؤال',
                  onPressed: () {
                    final updated = List<ExamQuestionItem>.from(draft.questions)..removeWhere((item) => item.id == q.id);
                    controller.updateDraftExam(draft.copyWith(questions: updated));
                  },
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),

          // 4. Dividing Line between questions
          if (q.hasDivider) ...[
            SizedBox(height: 8.h),
            Divider(color: Colors.grey.shade400, height: 1.0, thickness: 1.0),
          ],
        ],
      ),
    );
  }

  Widget _buildBranchesView(
    TeacherPersonalController controller,
    SavedExamPaper draft,
    ExamQuestionItem q,
    bool digits,
  ) {
    if (q.branchLayout == ExamBranchLayout.twoCol && q.branches.length > 1) {
      final half = (q.branches.length / 2).ceil();
      final col1 = q.branches.sublist(0, half);
      final col2 = q.branches.sublist(half);

      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              children: col1.asMap().entries.map((entry) {
                return _buildSingleBranchRow(controller, draft, q, entry.value, entry.key, digits);
              }).toList(),
            ),
          ),
          SizedBox(width: 14.w),
          Expanded(
            child: Column(
              children: col2.asMap().entries.map((entry) {
                return _buildSingleBranchRow(controller, draft, q, entry.value, half + entry.key, digits);
              }).toList(),
            ),
          ),
        ],
      );
    } else {
      // Vertical or Inline
      return Column(
        children: q.branches.asMap().entries.map((entry) {
          return _buildSingleBranchRow(controller, draft, q, entry.value, entry.key, digits);
        }).toList(),
      );
    }
  }

  Widget _buildSingleBranchRow(
    TeacherPersonalController controller,
    SavedExamPaper draft,
    ExamQuestionItem q,
    ExamQuestionBranch b,
    int bIdx,
    bool digits,
  ) {
    final prefix = b.getPrefix(bIdx, q.branchStyle, digits);

    return Padding(
      padding: EdgeInsets.only(bottom: 4.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Prefix
          if (prefix.isNotEmpty)
            Text(
              '$prefix ',
              style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.black),
            ),

          // Branch Textfield
          Expanded(
            child: TextFormField(
              key: ValueKey('b_text_${b.id}_${draft.id}_${b.text.length}'),
              initialValue: b.text,
              maxLines: null,
              style: TextStyle(fontSize: 12.sp, color: Colors.black),
              decoration: InputDecoration(
                hintText: 'اكتب الفرع هنا...',
                hintStyle: TextStyle(fontSize: 11.sp, color: Colors.grey.shade400),
                isDense: true,
                contentPadding: EdgeInsets.symmetric(vertical: 2.h),
                border: InputBorder.none,
              ),
              onChanged: (val) {
                _updateBranch(controller, draft, q.id, b.id, b.copyWith(text: val), notify: false);
              },
            ),
          ),

          // Quick Insert Blank (فراغ)
          InkWell(
            onTap: () {
              final newText = b.text.isNotEmpty ? '${b.text} ............ ' : '............ ';
              _updateBranch(controller, draft, q.id, b.id, b.copyWith(text: newText), notify: true);
            },
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 2.h),
              margin: EdgeInsets.symmetric(horizontal: 2.w),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(4.r),
              ),
              child: Text('فراغ', style: TextStyle(fontSize: 9.sp, color: Colors.black87)),
            ),
          ),

          // Quick Insert Options Parentheses (أقواس)
          InkWell(
            onTap: () {
              final newText = b.text.isNotEmpty ? '${b.text} (   ،   ،   ) ' : '(   ،   ،   )';
              _updateBranch(controller, draft, q.id, b.id, b.copyWith(text: newText), notify: true);
            },
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 2.h),
              margin: EdgeInsets.symmetric(horizontal: 2.w),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(4.r),
              ),
              child: Text('(،)', style: TextStyle(fontSize: 9.sp, color: Colors.black87)),
            ),
          ),

          // Delete Branch
          InkWell(
            onTap: () {
              final updatedBranches = List<ExamQuestionBranch>.from(q.branches)..removeWhere((item) => item.id == b.id);
              _updateQuestion(controller, draft, q.id, q.copyWith(branches: updatedBranches), notify: true);
            },
            child: Icon(Icons.close_rounded, size: 14.r, color: Colors.grey.shade400),
          ),
        ],
      ),
    );
  }

  // --- E. Exam Footer & Teacher Name ---
  Widget _buildExamFooter(TeacherPersonalController controller, SavedExamPaper draft) {
    final h = draft.header;

    return Container(
      padding: EdgeInsets.only(top: 10.h),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Colors.black, width: 1.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Teacher Name
          Expanded(
            child: TextFormField(
              key: ValueKey('footer_teacher_${draft.id}'),
              initialValue: h.teacherName ?? '',
              style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold, color: Colors.black),
              decoration: InputDecoration(
                hintText: 'مدرس المادة: أ. [اسم المدرس]',
                hintStyle: TextStyle(fontSize: 11.sp, color: Colors.grey.shade400),
                isDense: true,
                border: InputBorder.none,
              ),
              onChanged: (val) {
                controller.updateDraftExam(draft.copyWith(header: h.copyWith(teacherName: val)), notify: false);
              },
            ),
          ),

          // Footer Text
          Expanded(
            child: TextFormField(
              key: ValueKey('footer_text_${draft.id}'),
              initialValue: h.footerText ?? '',
              textAlign: TextAlign.left,
              style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold, color: Colors.black),
              decoration: InputDecoration(
                hintText: 'مع تمنياتنا لكم بالنجاح والتوفيق',
                hintStyle: TextStyle(fontSize: 11.sp, color: Colors.grey.shade400),
                isDense: true,
                border: InputBorder.none,
              ),
              onChanged: (val) {
                controller.updateDraftExam(draft.copyWith(header: h.copyWith(footerText: val)), notify: false);
              },
            ),
          ),
        ],
      ),
    );
  }

  // Helper updates
  void _updateQuestion(
    TeacherPersonalController controller,
    SavedExamPaper draft,
    String qId,
    ExamQuestionItem updatedQ, {
    bool notify = true,
  }) {
    final updatedList = draft.questions.map((q) => q.id == qId ? updatedQ : q).toList();
    controller.updateDraftExam(draft.copyWith(questions: updatedList), notify: notify);
  }

  void _updateBranch(
    TeacherPersonalController controller,
    SavedExamPaper draft,
    String qId,
    String bId,
    ExamQuestionBranch updatedB, {
    bool notify = true,
  }) {
    final q = draft.questions.firstWhere((item) => item.id == qId);
    final updatedBranches = q.branches.map((b) => b.id == bId ? updatedB : b).toList();
    _updateQuestion(controller, draft, qId, q.copyWith(branches: updatedBranches), notify: notify);
  }

  void _showSaveExamDialog(
    BuildContext context,
    TeacherPersonalController controller,
    SavedExamPaper draft,
  ) {
    final textController = TextEditingController(
      text: draft.title.isNotEmpty ? draft.title : 'نموذج أسئلة الشهر الأول',
    );

    showDialog(
      context: context,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: Text('حفظ ورقة الأسئلة كنموذج', style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold)),
          content: TextField(
            controller: textController,
            decoration: InputDecoration(
              labelText: 'عنوان النموذج',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.r)),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('إلغاء'),
            ),
            ElevatedButton(
              onPressed: () {
                controller.saveCurrentExam(textController.text.trim());
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('تم حفظ النموذج: ${textController.text}'),
                    backgroundColor: const Color(0xFF15803D),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.craftBrown),
              child: const Text('حفظ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
