import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/term_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../core/constants/academic_presets.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/term_model.dart';

/// Modal dialog to configure and create a new Term assessment (فصل دراسي / كورس)
/// Fully matching React TermModal.tsx
class CreateTermDialog extends StatefulWidget {
  const CreateTermDialog({super.key});

  @override
  State<CreateTermDialog> createState() => _CreateTermDialogState();
}

class _CreateTermDialogState extends State<CreateTermDialog> {
  final _nameController = TextEditingController();
  final _subjectController = TextEditingController();
  final _gradeController = TextEditingController();

  String _calcMode = 'average';
  final Set<String> _selectedIds = {};
  bool _showValidation = false;
  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      _isInitialized = true;
      final profile = context.read<TeacherProfileController>().profile;
      final models = context.read<MonthlySheetController>().models;
      final existingTerms = context.read<TermController>().terms;

      // Auto-suggest next term name
      final nextNum = existingTerms.length + 1;
      if (profile.isUniversity) {
        _nameController.text = nextNum == 1
            ? 'الكورس الأول'
            : (nextNum == 2 ? 'الكورس الثاني' : 'السعي السنوي');
      } else {
        _nameController.text = nextNum == 1
            ? 'الفصل الأول'
            : (nextNum == 2 ? 'الفصل الثاني' : 'امتحان نهاية السنة');
      }

      // Prefill subject
      final sub = profile.subject.isNotEmpty
          ? profile.subject
          : (models.isNotEmpty ? models.last.subject : '');
      _subjectController.text = sub;

      // Prefill grade
      if (models.isNotEmpty && models.last.gradeLevel.isNotEmpty) {
        _gradeController.text = models.last.gradeLevel;
      }

      // Pre-select matching models
      for (final m in models) {
        _selectedIds.add(m.id);
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _subjectController.dispose();
    _gradeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<TeacherProfileController>().profile;
    final isUniversity = profile.isUniversity;
    final models = context.watch<MonthlySheetController>().models;

    // Available subjects and grades from models
    final availableSubjects = models
        .map((m) => m.subject.trim())
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList();

    final availableGrades = models
        .map((m) => m.gradeLevel.trim())
        .where((g) => g.isNotEmpty)
        .toSet()
        .toList();

    final isNameValid = _nameController.text.trim().isNotEmpty;
    final isSubjectValid = _subjectController.text.trim().isNotEmpty;
    final isGradeValid = _gradeController.text.trim().isNotEmpty;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        backgroundColor: const Color(0xFFFAF7EC),
        insetPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 20.h),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20.r),
          side: const BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
        ),
        child: Container(
          width: 500.w,
          constraints: BoxConstraints(maxHeight: 720.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header - Rust Brown (#B86848)
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFB86848),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32.r,
                      height: 32.r,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.22),
                        borderRadius: BorderRadius.circular(10.r),
                      ),
                      child: const Icon(Icons.add_rounded, color: Colors.white, size: 20),
                    ),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isUniversity ? 'إضافة كورس / فصل دراسي جديد' : 'إضافة فصل دراسي جديد',
                            style: TextStyle(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            'تخصيص الفصل لمادة وصف دراسي محدد لمنع خلط الدرجات',
                            style: TextStyle(
                              fontSize: 11.sp,
                              color: const Color(0xFFFFE5DB),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),

              // Content
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(18.r),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Term Name
                      _buildHeader('اسم الفصل الدراسي / الكورس:', isMandatory: true),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _nameController,
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                        decoration: _inputDecoration(
                          hint: isUniversity ? 'مثال: الكورس الأول، السعي السنوي...' : 'مثال: الفصل الأول، الفصل الثاني...',
                          hasError: _showValidation && !isNameValid,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      if (_showValidation && !isNameValid) ...[
                        SizedBox(height: 4.h),
                        Text('⚠️ يرجى كتابة اسم الفصل (حقل إجباري)',
                            style: TextStyle(fontSize: 10.5.sp, color: Colors.red.shade700, fontWeight: FontWeight.bold)),
                      ],
                      SizedBox(height: 12.h),

                      // Subject
                      _buildHeader(isUniversity ? 'المقرر الدراسي:' : 'المادة الدراسية:', isMandatory: true),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _subjectController,
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                        decoration: _inputDecoration(
                          hint: 'اسم المادة...',
                          hasError: _showValidation && !isSubjectValid,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      if (availableSubjects.isNotEmpty) ...[
                        SizedBox(height: 6.h),
                        Wrap(
                          spacing: 6.w,
                          runSpacing: 6.h,
                          children: availableSubjects.map((sub) {
                            final isSel = _subjectController.text.trim() == sub;
                            return _buildChip(
                              label: sub,
                              isSelected: isSel,
                              onTap: () => setState(() => _subjectController.text = sub),
                            );
                          }).toList(),
                        ),
                      ],
                      if (_showValidation && !isSubjectValid) ...[
                        SizedBox(height: 4.h),
                        Text('⚠️ يرجى تحديد المادة (حقل إجباري)',
                            style: TextStyle(fontSize: 10.5.sp, color: Colors.red.shade700, fontWeight: FontWeight.bold)),
                      ],
                      SizedBox(height: 12.h),

                      // Grade
                      _buildHeader(isUniversity ? 'المرحلة الدراسية:' : 'الصف الدراسي:', isMandatory: true),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _gradeController,
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                        decoration: _inputDecoration(
                          hint: isUniversity ? 'مثال: المرحلة الأولى...' : 'مثال: الأول متوسط...',
                          hasError: _showValidation && !isGradeValid,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      if (availableGrades.isNotEmpty) ...[
                        SizedBox(height: 6.h),
                        Wrap(
                          spacing: 6.w,
                          runSpacing: 6.h,
                          children: availableGrades.map((g) {
                            final isSel = _gradeController.text.trim() == g;
                            return _buildChip(
                              label: g,
                              isSelected: isSel,
                              onTap: () => setState(() => _gradeController.text = g),
                            );
                          }).toList(),
                        ),
                      ],
                      if (_showValidation && !isGradeValid) ...[
                        SizedBox(height: 4.h),
                        Text('⚠️ يرجى كتابة أو اختيار الصف (حقل إجباري)',
                            style: TextStyle(fontSize: 10.5.sp, color: Colors.red.shade700, fontWeight: FontWeight.bold)),
                      ],
                      SizedBox(height: 14.h),

                      // Select Models
                      _buildHeader('الجداول الشهرية المشمولة بالحساب:', isMandatory: false),
                      SizedBox(height: 6.h),
                      if (models.isEmpty)
                        Container(
                          padding: EdgeInsets.all(10.r),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(10.r),
                            border: Border.all(color: Colors.amber.shade200),
                          ),
                          child: Text(
                            'تنبيه: لا توجد نماذج شهرية حالياً. يمكنك إنشاء الجداول الشهرية أولاً لحساب معدلاتها.',
                            style: TextStyle(fontSize: 11.sp, color: Colors.amber.shade900),
                          ),
                        )
                      else
                        Wrap(
                          spacing: 8.w,
                          runSpacing: 6.h,
                          children: models.map((m) {
                            final isChecked = _selectedIds.contains(m.id);
                            return FilterChip(
                              label: Text(
                                '${m.name}${m.gradeLevel.isNotEmpty ? " (${m.gradeLevel})" : ""}',
                                style: TextStyle(
                                  fontSize: 11.sp,
                                  fontWeight: isChecked ? FontWeight.w800 : FontWeight.w600,
                                  color: isChecked ? Colors.white : const Color(0xFF333333),
                                ),
                              ),
                              selected: isChecked,
                              selectedColor: const Color(0xFFB86848),
                              checkmarkColor: Colors.white,
                              backgroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8.r),
                                side: BorderSide(
                                  color: isChecked ? const Color(0xFF964B2F) : const Color(0xFFD8CEBD),
                                ),
                              ),
                              onSelected: (selected) {
                                setState(() {
                                  if (selected) {
                                    _selectedIds.add(m.id);
                                  } else {
                                    _selectedIds.remove(m.id);
                                  }
                                });
                              },
                            );
                          }).toList(),
                        ),
                      SizedBox(height: 14.h),

                      // Calc mode
                      _buildHeader('طريقة الحساب الرياضي:', isMandatory: false),
                      SizedBox(height: 6.h),
                      _buildRadioOption('average', 'حساب المتوسط الحسابي (معدل الدرجات)'),
                      _buildRadioOption('sum', 'مجموع الدرجات المباشر'),
                      _buildRadioOption('single', 'اعتماد درجة جدول شهري واحد'),
                    ],
                  ),
                ),
              ),

              // Footer
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 12.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F4EA),
                  border: const Border(top: BorderSide(color: Color(0xFFE0D5C3))),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(20.r)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text('إلغاء', style: TextStyle(fontSize: 12.sp, color: const Color(0xFF7A6E61))),
                    ),
                    SizedBox(width: 8.w),
                    ElevatedButton.icon(
                      onPressed: () {
                        if (!isNameValid || !isSubjectValid || !isGradeValid) {
                          setState(() => _showValidation = true);
                          return;
                        }

                        final name = _nameController.text.trim();
                        final subject = _subjectController.text.trim();
                        final grade = _gradeController.text.trim();

                        final newTerm = TermModel(
                          id: 'term_${DateTime.now().millisecondsSinceEpoch}',
                          name: name,
                          subject: subject,
                          gradeLevel: grade,
                          selectedModelIds: _selectedIds.toList(),
                          calculationMode: _calcMode,
                        );

                        context.read<TermController>().addTerm(newTerm);
                        Navigator.of(context).pop();
                      },
                      icon: const Icon(Icons.check_rounded, color: Colors.white, size: 16),
                      label: Text(
                        'حفظ وإنشاء الفصل',
                        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFB86848),
                        elevation: 2,
                        padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 10.h),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                      ),
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

  Widget _buildHeader(String title, {required bool isMandatory}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w800, color: const Color(0xFF2F2822)),
        ),
        if (isMandatory) ...[
          SizedBox(width: 3.w),
          Text('*', style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold, color: Colors.red.shade600)),
        ],
      ],
    );
  }

  InputDecoration _inputDecoration({required String hint, bool hasError = false}) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: Colors.white,
      contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 10.h),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10.r),
        borderSide: BorderSide(color: hasError ? Colors.red.shade400 : const Color(0xFFD8CEBD)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10.r),
        borderSide: BorderSide(color: hasError ? Colors.red.shade600 : const Color(0xFFB86848), width: 1.8),
      ),
    );
  }

  Widget _buildChip({required String label, required bool isSelected, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8.r),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFB86848) : Colors.white,
          borderRadius: BorderRadius.circular(8.r),
          border: Border.all(
            color: isSelected ? const Color(0xFF964B2F) : const Color(0xFFD8CEBD),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10.5.sp,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF333333),
          ),
        ),
      ),
    );
  }

  Widget _buildRadioOption(String val, String title) {
    final isSelected = _calcMode == val;
    return InkWell(
      onTap: () => setState(() => _calcMode = val),
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 4.h),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 18.r,
              color: isSelected ? const Color(0xFFB86848) : AppColors.textMuted,
            ),
            SizedBox(width: 8.w),
            Text(
              title,
              style: TextStyle(
                fontSize: 12.sp,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
