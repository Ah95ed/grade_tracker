import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../core/constants/academic_presets.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/monthly_model.dart';

/// Dialog to edit an existing Monthly Model Assessment
/// Matching React EditModelModal.tsx
class EditModelDialog extends StatefulWidget {
  final MonthlyModel model;

  const EditModelDialog({super.key, required this.model});

  @override
  State<EditModelDialog> createState() => _EditModelDialogState();
}

class _EditModelDialogState extends State<EditModelDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _maxScoreController;
  late final TextEditingController _subjectController;
  late final TextEditingController _gradeController;
  late final TextEditingController _teacherNameController;
  final _newSectionController = TextEditingController();

  final List<String> _selectedSections = [];
  final List<String> _customSections = [];
  bool _showAddSectionInput = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.model.name);
    _maxScoreController = TextEditingController(text: widget.model.totalMaxScore.toStringAsFixed(0));
    _subjectController = TextEditingController(text: widget.model.subject);
    _gradeController = TextEditingController(text: widget.model.gradeLevel);
    _teacherNameController = TextEditingController(text: widget.model.teacherName);
    _selectedSections.addAll(widget.model.assignedSections);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _maxScoreController.dispose();
    _subjectController.dispose();
    _gradeController.dispose();
    _teacherNameController.dispose();
    _newSectionController.dispose();
    super.dispose();
  }

  void _addNewSection() {
    final text = _newSectionController.text.trim();
    if (text.isEmpty) return;
    if (!_customSections.contains(text)) {
      setState(() {
        _customSections.add(text);
        if (!_selectedSections.contains(text)) {
          _selectedSections.add(text);
        }
        _newSectionController.clear();
        _showAddSectionInput = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<TeacherProfileController>().profile;
    final isUniversity = profile.isUniversity;
    final standardGrades = AcademicPresets.getGrades(isUniversity);
    final standardSections = AcademicPresets.getSections(isUniversity);

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
          constraints: BoxConstraints(maxHeight: 700.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: BoxDecoration(
                  color: AppColors.craftBrown,
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
                      child: const Icon(Icons.edit_note_rounded, color: Colors.white, size: 20),
                    ),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Text(
                        'تعديل بيانات الجدول (${widget.model.name})',
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
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

              // Form fields
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(18.r),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Name
                      _buildLabel('اسم الجدول / النموذج:'),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _nameController,
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                        decoration: _inputDecoration(hint: 'اسم النموذج...'),
                      ),
                      SizedBox(height: 12.h),

                      // Max Score
                      _buildLabel('الدرجة النهائية من:'),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _maxScoreController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                        decoration: _inputDecoration(hint: 'مثلاً 100 أو 10...'),
                      ),
                      SizedBox(height: 12.h),

                      // Subject
                      _buildLabel(isUniversity ? 'المقرر الدراسي:' : 'المادة الدراسية:'),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _subjectController,
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                        decoration: _inputDecoration(hint: 'المادة الدراسية...'),
                      ),
                      SizedBox(height: 12.h),

                      // Grade
                      _buildLabel(isUniversity ? 'المرحلة الدراسية:' : 'الصف الدراسي:'),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _gradeController,
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                        decoration: _inputDecoration(hint: 'الصف أو المرحلة...'),
                      ),
                      SizedBox(height: 6.h),
                      Wrap(
                        spacing: 6.w,
                        runSpacing: 6.h,
                        children: standardGrades.take(6).map((g) {
                          final isSel = _gradeController.text.trim() == g;
                          return InkWell(
                            onTap: () => setState(() => _gradeController.text = g),
                            child: Container(
                              padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                              decoration: BoxDecoration(
                                color: isSel ? const Color(0xFF5692BE) : Colors.white,
                                borderRadius: BorderRadius.circular(6.r),
                                border: Border.all(
                                  color: isSel ? const Color(0xFF3D7299) : const Color(0xFFD8CEBD),
                                ),
                              ),
                              child: Text(
                                g,
                                style: TextStyle(
                                  fontSize: 10.5.sp,
                                  fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                  color: isSel ? Colors.white : const Color(0xFF333333),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      SizedBox(height: 12.h),

                      // Teacher Name
                      _buildLabel('أستاذ / معلم المادة:'),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _teacherNameController,
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                        decoration: _inputDecoration(hint: 'اسم المعلم...'),
                      ),
                      SizedBox(height: 12.h),

                      // Sections
                      _buildLabel('الشُعَب المخصصة:'),
                      SizedBox(height: 6.h),
                      Wrap(
                        spacing: 6.w,
                        runSpacing: 6.h,
                        children: [
                          InkWell(
                            onTap: () => setState(() => _selectedSections.clear()),
                            child: Container(
                              padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
                              decoration: BoxDecoration(
                                color: _selectedSections.isEmpty ? const Color(0xFF5692BE) : Colors.white,
                                borderRadius: BorderRadius.circular(6.r),
                                border: Border.all(
                                  color: _selectedSections.isEmpty ? const Color(0xFF3D7299) : const Color(0xFFD8CEBD),
                                ),
                              ),
                              child: Text(
                                'كل الشُعَب',
                                style: TextStyle(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.bold,
                                  color: _selectedSections.isEmpty ? Colors.white : const Color(0xFF4A3D30),
                                ),
                              ),
                            ),
                          ),
                          ...standardSections.take(8).map((sec) {
                            final isSel = _selectedSections.contains(sec);
                            return InkWell(
                              onTap: () {
                                setState(() {
                                  if (isSel) {
                                    _selectedSections.remove(sec);
                                  } else {
                                    _selectedSections.add(sec);
                                  }
                                });
                              },
                              child: Container(
                                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
                                decoration: BoxDecoration(
                                  color: isSel ? const Color(0xFF2E7D32) : Colors.white,
                                  borderRadius: BorderRadius.circular(6.r),
                                  border: Border.all(
                                    color: isSel ? const Color(0xFF1B5E20) : const Color(0xFFD8CEBD),
                                  ),
                                ),
                                child: Text(
                                  'شعبة $sec',
                                  style: TextStyle(
                                    fontSize: 11.sp,
                                    fontWeight: FontWeight.bold,
                                    color: isSel ? Colors.white : const Color(0xFF333333),
                                  ),
                                ),
                              ),
                            );
                          }),
                          ..._customSections.map((sec) {
                            final isSel = _selectedSections.contains(sec);
                            return InkWell(
                              onTap: () {
                                setState(() {
                                  if (isSel) {
                                    _selectedSections.remove(sec);
                                  } else {
                                    _selectedSections.add(sec);
                                  }
                                });
                              },
                              child: Container(
                                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
                                decoration: BoxDecoration(
                                  color: isSel ? const Color(0xFF2E7D32) : Colors.white,
                                  borderRadius: BorderRadius.circular(6.r),
                                  border: Border.all(
                                    color: isSel ? const Color(0xFF1B5E20) : const Color(0xFFD8CEBD),
                                  ),
                                ),
                                child: Text(
                                  'شعبة $sec',
                                  style: TextStyle(
                                    fontSize: 11.sp,
                                    fontWeight: FontWeight.bold,
                                    color: isSel ? Colors.white : const Color(0xFF333333),
                                  ),
                                ),
                              ),
                            );
                          }),
                          if (!_showAddSectionInput)
                            InkWell(
                              onTap: () => setState(() => _showAddSectionInput = true),
                              child: Container(
                                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(6.r),
                                  border: Border.all(color: const Color(0xFF5692BE)),
                                ),
                                child: const Icon(Icons.add_rounded, size: 16, color: Color(0xFF2C5F8A)),
                              ),
                            )
                          else
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SizedBox(
                                  width: 70.w,
                                  height: 28.h,
                                  child: TextField(
                                    controller: _newSectionController,
                                    style: TextStyle(fontSize: 11.sp),
                                    decoration: InputDecoration(
                                      hintText: 'رمز...',
                                      contentPadding: EdgeInsets.symmetric(horizontal: 4.w),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(4.r)),
                                    ),
                                    onSubmitted: (_) => _addNewSection(),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.check_rounded, color: Colors.green, size: 16),
                                  onPressed: _addNewSection,
                                ),
                                IconButton(
                                  icon: const Icon(Icons.close_rounded, color: Colors.grey, size: 16),
                                  onPressed: () => setState(() => _showAddSectionInput = false),
                                ),
                              ],
                            ),
                        ],
                      ),
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
                        final name = _nameController.text.trim();
                        if (name.isEmpty) return;

                        final maxScore = double.tryParse(_maxScoreController.text.trim()) ?? widget.model.totalMaxScore;
                        final subject = _subjectController.text.trim();
                        final grade = _gradeController.text.trim();
                        final teacher = _teacherNameController.text.trim();

                        final updated = widget.model.copyWith(
                          name: name,
                          totalMaxScore: maxScore,
                          subject: subject,
                          gradeLevel: grade,
                          teacherName: teacher,
                          assignedSections: List<String>.from(_selectedSections),
                          updatedAt: DateTime.now().toIso8601String(),
                        );

                        context.read<MonthlySheetController>().updateModel(updated);
                        Navigator.of(context).pop();
                      },
                      icon: const Icon(Icons.check_rounded, color: Colors.white, size: 16),
                      label: Text(
                        'حفظ التعديلات',
                        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.craftBrown,
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

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w800, color: const Color(0xFF2F2822)),
    );
  }

  InputDecoration _inputDecoration({required String hint}) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: Colors.white,
      contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 10.h),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10.r),
        borderSide: const BorderSide(color: Color(0xFFD8CEBD)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10.r),
        borderSide: const BorderSide(color: Color(0xFFD8CEBD)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10.r),
        borderSide: const BorderSide(color: Color(0xFF5692BE), width: 1.8),
      ),
    );
  }
}
