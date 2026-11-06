import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../core/constants/academic_presets.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/monthly_model.dart';
import '../../../models/student_row.dart';
import '../../../models/custom_column.dart';
import '../../../models/final_score_operation.dart';

/// Comprehensive dialog for creating a new Monthly Grade Sheet Model (جدول درجات جديد)
/// Fully matching React CreateModelModal.tsx with all fields, presets, auto-transfer, and RTL styling.
class AddModelDialog extends StatefulWidget {
  const AddModelDialog({super.key});

  @override
  State<AddModelDialog> createState() => _AddModelDialogState();
}

class _AddModelDialogState extends State<AddModelDialog> {
  final _nameController = TextEditingController();
  final _maxScoreController = TextEditingController(text: '100');
  final _subjectController = TextEditingController();
  final _gradeController = TextEditingController();
  final _teacherNameController = TextEditingController();
  final _newSectionController = TextEditingController();
  final _newSubjectController = TextEditingController();

  final List<String> _selectedSections = [];
  final List<String> _customSections = [];
  final List<String> _customSubjects = [];

  bool _isSubjectLocked = true;
  bool _showAddSectionInput = false;
  bool _showAddSubjectInput = false;
  bool _showValidation = false;
  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      _isInitialized = true;
      final sheetCtrl = context.read<MonthlySheetController>();
      final profileCtrl = context.read<TeacherProfileController>();
      final profile = profileCtrl.profile;
      final models = sheetCtrl.models;

      // 1. Auto-suggest next month name
      final nextNum = models.length + 1;
      if (nextNum == 1) {
        _nameController.text = 'الشهر الأول';
      } else if (nextNum == 2) {
        _nameController.text = 'الشهر الثاني';
      } else if (nextNum == 3) {
        _nameController.text = 'الشهر الثالث';
      } else if (nextNum == 4) {
        _nameController.text = 'الشهر الرابع';
      } else {
        _nameController.text = 'الشهر $nextNum';
      }

      // 2. Prefill subject from profile or previous models
      final defaultSubject = profile.subject.isNotEmpty
          ? profile.subject
          : (models.isNotEmpty ? models.last.subject : '');
      _subjectController.text = defaultSubject;

      // In university mode, unlock subject by default to allow easy course selection
      if (profile.isUniversity) {
        _isSubjectLocked = false;
      }

      // 3. Prefill teacher name from profile
      _teacherNameController.text = profile.teacherName;

      // 4. If previous model exists, prefill grade level as suggestion
      if (models.isNotEmpty && models.last.gradeLevel.isNotEmpty) {
        _gradeController.text = models.last.gradeLevel;
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _maxScoreController.dispose();
    _subjectController.dispose();
    _gradeController.dispose();
    _teacherNameController.dispose();
    _newSectionController.dispose();
    _newSubjectController.dispose();
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

  void _addNewSubject() {
    final text = _newSubjectController.text.trim();
    if (text.isEmpty) return;
    if (!_customSubjects.contains(text)) {
      setState(() {
        _customSubjects.add(text);
        _subjectController.text = text;
        _newSubjectController.clear();
        _showAddSubjectInput = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final sheetCtrl = context.watch<MonthlySheetController>();
    final profileCtrl = context.watch<TeacherProfileController>();
    final profile = profileCtrl.profile;
    final isUniversity = profile.isUniversity;
    final models = sheetCtrl.models;
    final currentModel = sheetCtrl.currentModel;

    // Available presets
    final standardGrades = AcademicPresets.getGrades(isUniversity);
    final standardSubjects = AcademicPresets.getSubjects(isUniversity);
    final standardSections = AcademicPresets.getSections(isUniversity);

    // Existing grades from other models
    final existingModelGrades = models
        .map((m) => m.gradeLevel.trim())
        .where((g) => g.isNotEmpty)
        .toSet()
        .toList();

    // Calculate students eligible for auto-transfer
    final sourceStudents = (currentModel?.students.isNotEmpty ?? false)
        ? currentModel!.students
        : models.expand((m) => m.students).toList();

    final enteredGrade = _gradeController.text.trim();
    final matchingStudents = sourceStudents.where((st) {
      final stGrade = st.gradeLevel.trim().isNotEmpty
          ? st.gradeLevel.trim()
          : (currentModel?.gradeLevel.trim() ?? '');
      final gradeMatch = enteredGrade.isEmpty ||
          stGrade.isEmpty ||
          stGrade.toLowerCase() == enteredGrade.toLowerCase();
      final sectionMatch = _selectedSections.isEmpty ||
          _selectedSections.contains(st.section.trim());
      return gradeMatch && sectionMatch;
    }).toList();

    // Unique student count for transfer preview
    final uniqueNames = matchingStudents.map((s) => '${s.name}_${s.section}').toSet();
    final transferCount = uniqueNames.length;

    // Validation status
    final isNameValid = _nameController.text.trim().isNotEmpty;
    final maxScoreNum = double.tryParse(_maxScoreController.text.trim());
    final isMaxScoreValid = maxScoreNum != null && maxScoreNum > 0;
    final isSubjectValid = _subjectController.text.trim().isNotEmpty;
    final isGradeValid = _gradeController.text.trim().isNotEmpty;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        backgroundColor: const Color(0xFFFAF7EC), // craft cream
        insetPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 20.h),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20.r),
          side: const BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
        ),
        child: Container(
          width: 520.w,
          constraints: BoxConstraints(maxHeight: 740.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header - Sky Slate Blue matching React CreateModelModal (#5692BE)
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: BoxDecoration(
                  color: const Color(0xFF5692BE),
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
                      child: const Icon(
                        Icons.auto_awesome_rounded,
                        color: Color(0xFFFDE68A), // amber-200
                        size: 18,
                      ),
                    ),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isUniversity
                                ? 'إنشاء تقييم فصلي / كورس جديد'
                                : 'إنشاء نموذج جديد (شهر جديد)',
                            style: TextStyle(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            'جميع الحقول أدناه إجبارية لضبط درجات النموذج بدقة',
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFFE0EDF8),
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

              // Scrollable Content
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(18.r),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 1. Model Name Field
                      _buildSectionHeader(
                        title: isUniversity ? 'اسم التقييم / الكورس:' : 'اسم النموذج:',
                        isMandatory: true,
                      ),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _nameController,
                        style: TextStyle(
                          fontSize: 13.sp,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF2F2822),
                        ),
                        decoration: _inputDecoration(
                          hint: isUniversity
                              ? 'مثال: الكورس الأول، الكورس الثاني، السعي السنوي...'
                              : 'مثال: الشهر الأول، الشهر الثاني، نصف السنة...',
                          hasError: _showValidation && !isNameValid,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      if (_showValidation && !isNameValid) ...[
                        SizedBox(height: 4.h),
                        Text(
                          '⚠️ يرجى كتابة اسم النموذج (حقل إجباري)',
                          style: TextStyle(fontSize: 11.sp, color: Colors.red.shade700, fontWeight: FontWeight.bold),
                        ),
                      ],
                      SizedBox(height: 14.h),

                      // 2. Total Max Score Field
                      _buildSectionHeader(
                        title: 'الدرجة النهائية من:',
                        isMandatory: true,
                      ),
                      SizedBox(height: 6.h),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _maxScoreController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              style: TextStyle(
                                fontSize: 13.sp,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF2F2822),
                              ),
                              decoration: _inputDecoration(
                                hint: 'اكتب الدرجة الكلية (مثلاً 10 أو 100)...',
                                hasError: _showValidation && !isMaxScoreValid,
                              ),
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                          SizedBox(width: 8.w),
                          // Quick preset score buttons
                          ...['100', '10', '50', '20'].map((score) => Padding(
                                padding: EdgeInsets.only(left: 4.w),
                                child: InkWell(
                                  onTap: () {
                                    setState(() {
                                      _maxScoreController.text = score;
                                    });
                                  },
                                  borderRadius: BorderRadius.circular(8.r),
                                  child: Container(
                                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 8.h),
                                    decoration: BoxDecoration(
                                      color: _maxScoreController.text.trim() == score
                                          ? const Color(0xFF5692BE)
                                          : const Color(0xFFEBE3D3),
                                      borderRadius: BorderRadius.circular(8.r),
                                      border: Border.all(
                                        color: _maxScoreController.text.trim() == score
                                            ? const Color(0xFF3D7299)
                                            : const Color(0xFFD8CEBD),
                                      ),
                                    ),
                                    child: Text(
                                      score,
                                      style: TextStyle(
                                        fontSize: 11.sp,
                                        fontWeight: FontWeight.w800,
                                        color: _maxScoreController.text.trim() == score
                                            ? Colors.white
                                            : const Color(0xFF4A3D30),
                                      ),
                                    ),
                                  ),
                                ),
                              )),
                        ],
                      ),
                      if (_showValidation && !isMaxScoreValid) ...[
                        SizedBox(height: 4.h),
                        Text(
                          '⚠️ يرجى كتابة الدرجة النهائية مثل 10 أو 100 (حقل إجباري)',
                          style: TextStyle(fontSize: 11.sp, color: Colors.red.shade700, fontWeight: FontWeight.bold),
                        ),
                      ],
                      SizedBox(height: 14.h),

                      // 3. Subject Field
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: _buildSectionHeader(
                              title: isUniversity ? 'اسم المقرر الدراسي:' : 'اسم المادة:',
                              isMandatory: true,
                            ),
                          ),
                          if (_isSubjectLocked)
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEBF3FA),
                                borderRadius: BorderRadius.circular(6.r),
                                border: Border.all(color: const Color(0xFFC5DCEF)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.lock_rounded, size: 11, color: Color(0xFF2C5F8A)),
                                  SizedBox(width: 3.w),
                                  Text(
                                    'من البيانات (مقفل)',
                                    style: TextStyle(
                                      fontSize: 9.5.sp,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF2C5F8A),
                                    ),
                                  ),
                                  SizedBox(width: 3.w),
                                  InkWell(
                                    onTap: () => setState(() => _isSubjectLocked = false),
                                    child: const Icon(Icons.edit_rounded, size: 12, color: Color(0xFF5692BE)),
                                  ),
                                ],
                              ),
                            )
                          else
                            InkWell(
                              onTap: () => setState(() => _isSubjectLocked = true),
                              child: Text(
                                'قفل بالمادة الأساسية',
                                style: TextStyle(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF5692BE),
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                        ],
                      ),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _subjectController,
                        readOnly: _isSubjectLocked,
                        style: TextStyle(
                          fontSize: 13.sp,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF2F2822),
                        ),
                        decoration: _inputDecoration(
                          hint: isUniversity
                              ? 'مثال: برمجة 1، نظري، عملي، رياضيات هندسية...'
                              : 'مثال: الرياضيات، اللغة العربية، العلوم...',
                          hasError: _showValidation && !isSubjectValid,
                          fillColor: _isSubjectLocked ? const Color(0xFFF1F1EF) : Colors.white,
                          suffixIcon: _isSubjectLocked
                              ? const Icon(Icons.lock_outline_rounded, size: 16, color: Colors.black45)
                              : null,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      if (!_isSubjectLocked) ...[
                        SizedBox(height: 8.h),
                        Wrap(
                          spacing: 6.w,
                          runSpacing: 6.h,
                          children: [
                            ...standardSubjects.take(8).map((sub) => _buildChip(
                                  label: sub,
                                  isSelected: _subjectController.text.trim() == sub,
                                  onTap: () => setState(() => _subjectController.text = sub),
                                )),
                            ..._customSubjects.map((sub) => _buildChip(
                                  label: sub,
                                  isSelected: _subjectController.text.trim() == sub,
                                  onTap: () => setState(() => _subjectController.text = sub),
                                )),
                            if (!_showAddSubjectInput)
                              InkWell(
                                onTap: () => setState(() => _showAddSubjectInput = true),
                                child: Container(
                                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(8.r),
                                    border: Border.all(color: const Color(0xFFBA916C), style: BorderStyle.solid),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.add_rounded, size: 14, color: Color(0xFFBA916C)),
                                      SizedBox(width: 4.w),
                                      Text(
                                        'مادة أخرى',
                                        style: TextStyle(
                                          fontSize: 11.sp,
                                          fontWeight: FontWeight.w700,
                                          color: const Color(0xFFBA916C),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            else
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SizedBox(
                                    width: 120.w,
                                    height: 32.h,
                                    child: TextField(
                                      controller: _newSubjectController,
                                      style: TextStyle(fontSize: 11.sp),
                                      decoration: InputDecoration(
                                        hintText: 'اسم المادة...',
                                        contentPadding: EdgeInsets.symmetric(horizontal: 8.w),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(6.r)),
                                      ),
                                      onSubmitted: (_) => _addNewSubject(),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.check_rounded, color: Colors.green, size: 18),
                                    onPressed: _addNewSubject,
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close_rounded, color: Colors.grey, size: 18),
                                    onPressed: () => setState(() => _showAddSubjectInput = false),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ],
                      if (_showValidation && !isSubjectValid) ...[
                        SizedBox(height: 4.h),
                        Text(
                          '⚠️ يرجى تحديد اسم المادة (حقل إجباري)',
                          style: TextStyle(fontSize: 11.sp, color: Colors.red.shade700, fontWeight: FontWeight.bold),
                        ),
                      ],
                      SizedBox(height: 14.h),

                      // 4. Grade / Stage Field
                      _buildSectionHeader(
                        title: isUniversity
                            ? 'المرحلة الدراسية لهذا النموذج:'
                            : 'الصف الدراسي لهذا النموذج:',
                        isMandatory: true,
                      ),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _gradeController,
                        style: TextStyle(
                          fontSize: 13.sp,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF2F2822),
                        ),
                        decoration: _inputDecoration(
                          hint: isUniversity
                              ? 'مثال: المرحلة الأولى، المرحلة الثانية...'
                              : 'مثال: الأول متوسط، الثاني متوسط، الرابع العلمي...',
                          hasError: _showValidation && !isGradeValid,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      SizedBox(height: 8.h),
                      // Preset Grade chips
                      Wrap(
                        spacing: 6.w,
                        runSpacing: 6.h,
                        children: [
                          if (existingModelGrades.isNotEmpty)
                            ...existingModelGrades.map((g) => _buildChip(
                                  label: g,
                                  isSelected: _gradeController.text.trim() == g,
                                  onTap: () => setState(() => _gradeController.text = g),
                                  isHighlighted: true,
                                )),
                          ...standardGrades.take(7).map((g) => _buildChip(
                                label: g,
                                isSelected: _gradeController.text.trim() == g,
                                onTap: () => setState(() => _gradeController.text = g),
                              )),
                        ],
                      ),
                      if (_showValidation && !isGradeValid) ...[
                        SizedBox(height: 4.h),
                        Text(
                          '⚠️ يرجى كتابة أو اختيار الصف الدراسي (حقل إجباري)',
                          style: TextStyle(fontSize: 11.sp, color: Colors.red.shade700, fontWeight: FontWeight.bold),
                        ),
                      ],
                      SizedBox(height: 14.h),

                      // 5. Teacher Name Field
                      _buildSectionHeader(
                        title: isUniversity ? 'اسم أستاذ المادة / التدريسي:' : 'اسم معلم / مدرس المادة:',
                        isMandatory: false,
                      ),
                      SizedBox(height: 6.h),
                      TextField(
                        controller: _teacherNameController,
                        style: TextStyle(
                          fontSize: 13.sp,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF2F2822),
                        ),
                        decoration: _inputDecoration(
                          hint: 'اسم المعلم أو التدريسي...',
                          fillColor: Colors.white,
                        ),
                      ),
                      SizedBox(height: 14.h),

                      // 6. Assigned Sections Field
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildSectionHeader(
                            title: isUniversity
                                ? 'الشُعَب / المجموعات المخصصة:'
                                : 'الشُعَب المخصصة لهذا النموذج:',
                            isMandatory: false,
                          ),
                          Text(
                            _selectedSections.isEmpty
                                ? '(جميع الشُعَب)'
                                : '(${_selectedSections.length} شعبة محددة)',
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF554A3E),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 6.h),
                      Wrap(
                        spacing: 6.w,
                        runSpacing: 6.h,
                        children: [
                          // "All sections" button
                          InkWell(
                            onTap: () => setState(() => _selectedSections.clear()),
                            child: Container(
                              padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                              decoration: BoxDecoration(
                                color: _selectedSections.isEmpty
                                    ? const Color(0xFF5692BE)
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(8.r),
                                border: Border.all(
                                  color: _selectedSections.isEmpty
                                      ? const Color(0xFF3D7299)
                                      : const Color(0xFFD8CEBD),
                                ),
                              ),
                              child: Text(
                                'كل الشُعَب',
                                style: TextStyle(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.w800,
                                  color: _selectedSections.isEmpty ? Colors.white : const Color(0xFF4A3D30),
                                ),
                              ),
                            ),
                          ),
                          // Section chips
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
                                padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                                decoration: BoxDecoration(
                                  color: isSel ? const Color(0xFF2E7D32) : Colors.white,
                                  borderRadius: BorderRadius.circular(8.r),
                                  border: Border.all(
                                    color: isSel ? const Color(0xFF1B5E20) : const Color(0xFFD8CEBD),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (isSel) ...[
                                      const Icon(Icons.check_rounded, size: 13, color: Colors.white),
                                      SizedBox(width: 3.w),
                                    ],
                                    Text(
                                      'شعبة $sec',
                                      style: TextStyle(
                                        fontSize: 11.sp,
                                        fontWeight: FontWeight.w800,
                                        color: isSel ? Colors.white : const Color(0xFF333333),
                                      ),
                                    ),
                                  ],
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
                                padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                                decoration: BoxDecoration(
                                  color: isSel ? const Color(0xFF2E7D32) : Colors.white,
                                  borderRadius: BorderRadius.circular(8.r),
                                  border: Border.all(
                                    color: isSel ? const Color(0xFF1B5E20) : const Color(0xFFD8CEBD),
                                  ),
                                ),
                                child: Text(
                                  'شعبة $sec',
                                  style: TextStyle(
                                    fontSize: 11.sp,
                                    fontWeight: FontWeight.w800,
                                    color: isSel ? Colors.white : const Color(0xFF333333),
                                  ),
                                ),
                              ),
                            );
                          }),
                          // Add other section button
                          if (!_showAddSectionInput)
                            InkWell(
                              onTap: () => setState(() => _showAddSectionInput = true),
                              child: Container(
                                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8.r),
                                  border: Border.all(color: const Color(0xFF5692BE)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.add_rounded, size: 14, color: Color(0xFF2C5F8A)),
                                    SizedBox(width: 4.w),
                                    Text(
                                      'شعبة أخرى',
                                      style: TextStyle(
                                        fontSize: 11.sp,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF2C5F8A),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          else
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SizedBox(
                                  width: 80.w,
                                  height: 32.h,
                                  child: TextField(
                                    controller: _newSectionController,
                                    style: TextStyle(fontSize: 11.sp),
                                    decoration: InputDecoration(
                                      hintText: 'الرمز...',
                                      contentPadding: EdgeInsets.symmetric(horizontal: 6.w),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(6.r)),
                                    ),
                                    onSubmitted: (_) => _addNewSection(),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.check_rounded, color: Colors.green, size: 18),
                                  onPressed: _addNewSection,
                                ),
                                IconButton(
                                  icon: const Icon(Icons.close_rounded, color: Colors.grey, size: 18),
                                  onPressed: () => setState(() => _showAddSectionInput = false),
                                ),
                              ],
                            ),
                        ],
                      ),
                      SizedBox(height: 16.h),

                      // 7. Automatic Student Transfer Preview Card
                      if (transferCount > 0)
                        Container(
                          padding: EdgeInsets.all(12.r),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEEF5EB),
                            borderRadius: BorderRadius.circular(12.r),
                            border: Border.all(color: const Color(0xFFC5DDBE)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.people_alt_rounded, size: 16, color: Color(0xFF2E6B28)),
                                  SizedBox(width: 6.w),
                                  Text(
                                    'ترحيل بيانات الطلاب تلقائياً:',
                                    style: TextStyle(
                                      fontSize: 12.sp,
                                      fontWeight: FontWeight.w900,
                                      color: const Color(0xFF224A1E),
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 4.h),
                              Text(
                                'سيتم نقل جميع الطلاب ($transferCount طالب) مع صفوفهم وشُعبهم والأعمدة إلى النموذج الجديد مع تصفير الدرجات.',
                                style: TextStyle(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF2B5626),
                                  height: 1.4,
                                ),
                              ),
                              SizedBox(height: 6.h),
                              Divider(height: 1, color: const Color(0xFFC5DDBE).withValues(alpha: 0.6)),
                              SizedBox(height: 6.h),
                              Row(
                                children: [
                                  const Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF2E6B28)),
                                  SizedBox(width: 4.w),
                                  Expanded(
                                    child: Text(
                                      'لا حاجة لإعادة كتابة أسماء الطلاب أو الشعب مجدداً.',
                                      style: TextStyle(
                                        fontSize: 10.5.sp,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFF2E6B28),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        )
                      else
                        Container(
                          padding: EdgeInsets.all(12.r),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFAF7EC),
                            borderRadius: BorderRadius.circular(12.r),
                            border: Border.all(color: const Color(0xFFD8CEBD)),
                          ),
                          child: Text(
                            'سيتم إنشاء نموذج شهري جديد فارغ جاهز لإضافة الطلاب وتخصيص الأعمدة.',
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF6B5E51),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // Footer Actions
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
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF7A6E61),
                        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                      ),
                      child: Text(
                        'إلغاء',
                        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w700),
                      ),
                    ),
                    SizedBox(width: 8.w),
                    ElevatedButton.icon(
                      onPressed: () {
                        if (!isNameValid || !isMaxScoreValid || !isSubjectValid || !isGradeValid) {
                          setState(() => _showValidation = true);
                          return;
                        }

                        final name = _nameController.text.trim();
                        final maxScore = double.tryParse(_maxScoreController.text.trim()) ?? 100.0;
                        final subject = _subjectController.text.trim();
                        final grade = _gradeController.text.trim();
                        final teacher = _teacherNameController.text.trim();

                        // Transfer eligible students with cleared scores
                        final seenKeys = <String>{};
                        final transferredStudents = <StudentRow>[];

                        for (final st in matchingStudents) {
                          final key = '${st.name.trim()}_${st.section.trim()}';
                          if (!seenKeys.contains(key)) {
                            seenKeys.add(key);
                            transferredStudents.add(
                              StudentRow(
                                id: 'st_${DateTime.now().millisecondsSinceEpoch}_${transferredStudents.length}',
                                name: st.name.trim(),
                                gradeLevel: grade.isNotEmpty ? grade : st.gradeLevel,
                                section: st.section.isNotEmpty ? st.section : 'أ',
                                writtenRawScore: null,
                                scores: const {},
                                notes: '',
                              ),
                            );
                          }
                        }

                        // Clone custom columns from current model
                        final clonedColumns = (currentModel?.customColumns ?? []).map<CustomColumn>((col) {
                          return CustomColumn(
                            id: 'col_${DateTime.now().millisecondsSinceEpoch}_${col.id}',
                            name: col.name,
                            maxScore: col.maxScore,
                          );
                        }).toList();

                        final newModel = MonthlyModel(
                          id: 'month_${DateTime.now().millisecondsSinceEpoch}',
                          name: name,
                          subject: subject,
                          gradeLevel: grade,
                          academicYear: profile.academicYear.isNotEmpty ? profile.academicYear : '2024 - 2025',
                          totalMaxScore: maxScore,
                          writtenMaxScore: maxScore,
                          writtenScoreMode: currentModel?.writtenScoreMode ?? 'raw',
                          writtenWeight: currentModel?.writtenWeight,
                          customColumns: clonedColumns,
                          students: transferredStudents,
                          roundingMode: currentModel?.roundingMode ?? 'none',
                          roundingThreshold: currentModel?.roundingThreshold ?? 0.5,
                          finalScoreOperation: currentModel?.finalScoreOperation ?? FinalScoreOperation(),
                          teacherName: teacher,
                          assignedSections: List<String>.from(_selectedSections),
                          createdAt: DateTime.now().toIso8601String(),
                        );

                        context.read<MonthlySheetController>().addModel(newModel);
                        Navigator.of(context).pop();
                      },
                      icon: const Icon(Icons.check_rounded, color: Colors.white, size: 16),
                      label: Text(
                        'إنشاء (${_nameController.text.trim().isNotEmpty ? _nameController.text.trim() : "النموذج"})',
                        style: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.craftBrown,
                        elevation: 2,
                        padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 10.h),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
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

  Widget _buildSectionHeader({required String title, required bool isMandatory}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 12.sp,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF2F2822),
          ),
        ),
        if (isMandatory) ...[
          SizedBox(width: 3.w),
          Text(
            '*',
            style: TextStyle(
              fontSize: 14.sp,
              fontWeight: FontWeight.w900,
              color: Colors.red.shade600,
            ),
          ),
          SizedBox(width: 6.w),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 1.h),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(4.r),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Text(
              'إجباري',
              style: TextStyle(
                fontSize: 9.sp,
                fontWeight: FontWeight.w800,
                color: Colors.red.shade700,
              ),
            ),
          ),
        ],
      ],
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    bool hasError = false,
    Color? fillColor,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(
        fontSize: 11.5.sp,
        fontWeight: FontWeight.normal,
        color: const Color(0xFF9E9284),
      ),
      filled: true,
      fillColor: fillColor ?? (hasError ? Colors.red.shade50.withValues(alpha: 0.3) : Colors.white),
      contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 10.h),
      suffixIcon: suffixIcon,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10.r),
        borderSide: BorderSide(
          color: hasError ? Colors.red.shade400 : const Color(0xFFD8CEBD),
          width: hasError ? 1.5 : 1.0,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10.r),
        borderSide: BorderSide(
          color: hasError ? Colors.red.shade600 : const Color(0xFF5692BE),
          width: 1.8,
        ),
      ),
    );
  }

  Widget _buildChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    bool isHighlighted = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8.r),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 5.h),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF5692BE)
              : (isHighlighted ? const Color(0xFFFAF0DC) : Colors.white),
          borderRadius: BorderRadius.circular(8.r),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF3D7299)
                : (isHighlighted ? const Color(0xFFBA916C) : const Color(0xFFD8CEBD)),
            width: isSelected || isHighlighted ? 1.3 : 1.0,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isSelected)
              const Icon(Icons.check_rounded, size: 12, color: Colors.white)
            else
              Text(
                '+',
                style: TextStyle(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.w900,
                  color: isHighlighted ? const Color(0xFF8B5E34) : const Color(0xFF5692BE),
                ),
              ),
            SizedBox(width: 4.w),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.sp,
                fontWeight: isSelected || isHighlighted ? FontWeight.w800 : FontWeight.w600,
                color: isSelected
                    ? Colors.white
                    : (isHighlighted ? const Color(0xFF5C3B1E) : const Color(0xFF2F2822)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
