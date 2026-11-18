import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/term_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../models/monthly_model.dart';
import '../../../models/term_model.dart';

class TeacherInfo {
  final String teacherName;
  final List<String> sections;
  const TeacherInfo({required this.teacherName, required this.sections});
}

/// Standalone Modal Dialog for creating a new Term (فصل دراسي)
/// Fulfills all 17 requirements of Phase 6 matching React AddTermModal.tsx
class AddTermModal extends StatefulWidget {
  final String? initialGrade;
  final String? initialSubject;
  final String? initialTeacher;
  final List<String>? initialSections;
  final String? defaultName;
  final Function(TermModel)? onSubmit;

  const AddTermModal({
    super.key,
    this.initialGrade,
    this.initialSubject,
    this.initialTeacher,
    this.initialSections,
    this.defaultName,
    this.onSubmit,
  });

  @override
  State<AddTermModal> createState() => _AddTermModalState();
}

class _AddTermModalState extends State<AddTermModal> {
  final _nameController = TextEditingController();
  final _subjectController = TextEditingController();
  final _gradeController = TextEditingController();
  final _teacherController = TextEditingController();

  final String _calcMode = 'average';
  String _sourceType = 'models'; // 'models', 'terms', 'mixed'
  final Set<String> _selectedModelIds = {};
  final Set<String> _selectedTermIds = {};
  List<String> _selectedSections = [];
  bool _showAllMonths = false;
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

      // 1. Suggest Term Name
      if (widget.defaultName != null && widget.defaultName!.isNotEmpty) {
        _nameController.text = widget.defaultName!;
      } else {
        final nextNum = existingTerms.length + 1;
        if (profile.isUniversity) {
          _nameController.text = nextNum == 1
              ? 'الكورس الأول'
              : (nextNum == 2 ? 'الكورس الثاني' : 'السعي السنوي');
        } else {
          _nameController.text = nextNum == 1
              ? 'الفصل الأول'
              : (nextNum == 2 ? 'الفصل الثاني' : 'الفصل $nextNum');
        }
      }

      // 2. Prefill Subject
      final initSub = widget.initialSubject ??
          (profile.subject.isNotEmpty
              ? profile.subject
              : (models.isNotEmpty ? models.last.subject : ''));
      _subjectController.text = initSub;

      // 3. Prefill Grade
      final initGrade = widget.initialGrade ??
          (models.isNotEmpty && models.last.gradeLevel.isNotEmpty
              ? models.last.gradeLevel
              : '');
      _gradeController.text = initGrade;

      // 4. Prefill Teacher
      final initTeacher = widget.initialTeacher ??
          (profile.teacherName.isNotEmpty ? profile.teacherName : '');
      _teacherController.text = initTeacher;

      if (widget.initialSections != null && widget.initialSections!.isNotEmpty) {
        _selectedSections = List.from(widget.initialSections!);
      }

      // 7. Auto pre-select matching months
      for (final m in models) {
        if (_isMonthMatching(m, initGrade, initSub, initTeacher)) {
          _selectedModelIds.add(m.id);
        }
      }
      if (_selectedModelIds.isEmpty && models.isNotEmpty) {
        // If no strict match, pre-select all for convenience
        for (final m in models) {
          _selectedModelIds.add(m.id);
        }
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _subjectController.dispose();
    _gradeController.dispose();
    _teacherController.dispose();
    super.dispose();
  }

  bool _isMonthMatching(MonthlyModel m, String grade, String sub, String teacher) {
    final gradeMatch = grade.isEmpty || m.gradeLevel.trim() == grade.trim();
    final subMatch = sub.isEmpty || m.subject.trim() == sub.trim();
    return gradeMatch && subMatch;
  }

  List<TeacherInfo> _getMatchingTeachers(List<MonthlyModel> models, String grade, String sub) {
    if (grade.isEmpty || sub.isEmpty) return [];
    final matching = models.where((m) =>
        m.gradeLevel.trim() == grade.trim() &&
        m.subject.trim() == sub.trim() &&
        m.teacherName.trim().isNotEmpty).toList();

    final Map<String, Set<String>> teacherSectionsMap = {};
    for (final m in matching) {
      final t = m.teacherName.trim();
      if (!teacherSectionsMap.containsKey(t)) {
        teacherSectionsMap[t] = <String>{};
      }
      if (m.assignedSections.isNotEmpty) {
        teacherSectionsMap[t]!.addAll(m.assignedSections);
      } else {
        for (final s in m.students) {
          if (s.section.trim().isNotEmpty) {
            teacherSectionsMap[t]!.add(s.section.trim());
          }
        }
      }
    }

    return teacherSectionsMap.entries.map((e) => TeacherInfo(
      teacherName: e.key,
      sections: e.value.toList()..sort(),
    )).toList();
  }

  List<MonthlyModel> _getAvailableMonths(List<MonthlyModel> allModels, String grade, String sub, String teacher) {
    if (_showAllMonths) return allModels;

    // 1. Strict match by Grade, Subject, and Teacher
    final matching = allModels.where((m) {
      final matchG = grade.isEmpty || m.gradeLevel.trim() == grade.trim();
      final matchS = sub.isEmpty || m.subject.trim() == sub.trim();
      final matchT = teacher.isEmpty || m.teacherName.trim().isEmpty || m.teacherName.trim() == teacher.trim();
      return matchG && matchS && matchT;
    }).toList();

    if (matching.isNotEmpty) return matching;

    // 2. Fallback: match by Grade and Subject
    final matchGradeSub = allModels.where((m) {
      final matchG = grade.isEmpty || m.gradeLevel.trim() == grade.trim();
      final matchS = sub.isEmpty || m.subject.trim() == sub.trim();
      return matchG && matchS;
    }).toList();

    if (matchGradeSub.isNotEmpty) return matchGradeSub;

    // 3. Fallback: return all
    return allModels;
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<TeacherProfileController>().profile;
    final isUniversity = profile.isUniversity;
    final models = context.watch<MonthlySheetController>().models;

    final grade = _gradeController.text.trim();
    final subject = _subjectController.text.trim();
    final teacher = _teacherController.text.trim();

    final matchingTeachers = _getMatchingTeachers(models, grade, subject);
    final availableTerms = context.watch<TermController>().terms;
    final availableMonths = _getAvailableMonths(models, grade, subject, teacher);

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
          width: 520.w,
          constraints: BoxConstraints(maxHeight: 740.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
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
                              fontSize: 14.5.sp,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            'تحديد كشوف الأشهر واحتساب معدلها النهائي تلقائياً',
                            style: TextStyle(
                              fontSize: 10.5.sp,
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

              // Content Form Body
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(16.r),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 1. Term Name
                      _buildHeader('اسم الفصل الدراسي / الكورس:', isMandatory: true),
                      SizedBox(height: 5.h),
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

                      // 2. Grade & Subject
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildHeader(isUniversity ? 'المرحلة الدراسية:' : 'الصف الدراسي:', isMandatory: false),
                                SizedBox(height: 5.h),
                                TextField(
                                  controller: _gradeController,
                                  style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w700),
                                  decoration: _inputDecoration(
                                    hint: isUniversity ? 'المرحلة الأولى...' : 'الأول متوسط...',
                                  ),
                                  onChanged: (_) => setState(() {}),
                                ),
                                if (availableGrades.isNotEmpty) ...[
                                  SizedBox(height: 4.h),
                                  Wrap(
                                    spacing: 4.w,
                                    runSpacing: 4.h,
                                    children: availableGrades.take(4).map((g) {
                                      final isSel = _gradeController.text.trim() == g;
                                      return _buildChip(
                                        label: g,
                                        isSelected: isSel,
                                        onTap: () => setState(() => _gradeController.text = g),
                                      );
                                    }).toList(),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          SizedBox(width: 10.w),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildHeader(isUniversity ? 'المقرر الدراسي:' : 'المادة الدراسية:', isMandatory: false),
                                SizedBox(height: 5.h),
                                TextField(
                                  controller: _subjectController,
                                  style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w700),
                                  decoration: _inputDecoration(
                                    hint: 'اسم المادة...',
                                  ),
                                  onChanged: (_) => setState(() {}),
                                ),
                                if (availableSubjects.isNotEmpty) ...[
                                  SizedBox(height: 4.h),
                                  Wrap(
                                    spacing: 4.w,
                                    runSpacing: 4.h,
                                    children: availableSubjects.take(4).map((s) {
                                      final isSel = _subjectController.text.trim() == s;
                                      return _buildChip(
                                        label: s,
                                        isSelected: isSel,
                                        onTap: () => setState(() => _subjectController.text = s),
                                      );
                                    }).toList(),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 12.h),

                      // 4 & 5. Teacher selection & Multiple Teachers resolution
                      _buildHeader('اسم أستاذ المادة:', isMandatory: false),
                      SizedBox(height: 5.h),
                      if (matchingTeachers.length > 1) ...[
                        Container(
                          padding: EdgeInsets.all(8.r),
                          margin: EdgeInsets.only(bottom: 6.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(10.r),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'تم رصد أكثر من أستاذ لمادة ($subject) للصف ($grade). اختر الأستاذ لحصر كشوفه وشُعبه:',
                                style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF92400E)),
                              ),
                              SizedBox(height: 6.h),
                              Wrap(
                                spacing: 6.w,
                                runSpacing: 6.h,
                                children: matchingTeachers.map((t) {
                                  final isSel = _teacherController.text.trim() == t.teacherName;
                                  return InkWell(
                                    onTap: () {
                                      setState(() {
                                        _teacherController.text = t.teacherName;
                                        _selectedSections = List.from(t.sections);
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(8.r),
                                    child: Container(
                                      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 5.h),
                                      decoration: BoxDecoration(
                                        color: isSel ? const Color(0xFFB86848) : Colors.white,
                                        borderRadius: BorderRadius.circular(8.r),
                                        border: Border.all(
                                          color: isSel ? const Color(0xFF944D30) : const Color(0xFFCBD5E1),
                                          width: isSel ? 1.5 : 1.0,
                                        ),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            t.teacherName,
                                            style: TextStyle(
                                              fontSize: 11.sp,
                                              fontWeight: isSel ? FontWeight.w900 : FontWeight.bold,
                                              color: isSel ? Colors.white : const Color(0xFF1E293B),
                                            ),
                                          ),
                                          if (t.sections.isNotEmpty)
                                            Text(
                                              'شُعبه: ${t.sections.join("، ")}',
                                              style: TextStyle(
                                                fontSize: 9.5.sp,
                                                color: isSel ? Colors.white70 : const Color(0xFF64748B),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                          ),
                        ),
                      ],
                      TextField(
                        controller: _teacherController,
                        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w700),
                        decoration: _inputDecoration(
                          hint: 'اسم أستاذ المادة (مثال: أ. فاروق محمد)...',
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      if (_selectedSections.isNotEmpty) ...[
                        SizedBox(height: 4.h),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(6.r),
                            border: Border.all(color: const Color(0xFFA7F3D0)),
                          ),
                          child: Text(
                            'سيتم حصر هذا الفصل على شُعب هذا الأستاذ: (${_selectedSections.join("، ")}) فقط.',
                            style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF065F46)),
                          ),
                        ),
                      ],
                      SizedBox(height: 14.h),

                      // 6. Source Type Selector (Section 4.4: كشوف الشهور / فصول سابقة / كلاهما)
                      _buildHeader('مصدر بيانات الفصل الدراسي:', isMandatory: false),
                      SizedBox(height: 6.h),
                      Row(
                        children: [
                          Expanded(
                            child: _buildChip(
                              label: 'كشوف الشهور',
                              isSelected: _sourceType == 'models',
                              onTap: () => setState(() => _sourceType = 'models'),
                            ),
                          ),
                          SizedBox(width: 6.w),
                          Expanded(
                            child: _buildChip(
                              label: 'فصول سابقة (سعي سنوي)',
                              isSelected: _sourceType == 'terms',
                              onTap: () => setState(() => _sourceType = 'terms'),
                            ),
                          ),
                          SizedBox(width: 6.w),
                          Expanded(
                            child: _buildChip(
                              label: 'كلاهما (تجميعي)',
                              isSelected: _sourceType == 'mixed',
                              onTap: () => setState(() => _sourceType = 'mixed'),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 14.h),

                      // Previous Terms Selection (if terms or mixed)
                      if (_sourceType == 'terms' || _sourceType == 'mixed') ...[
                        Container(
                          padding: EdgeInsets.all(12.r),
                          margin: EdgeInsets.only(bottom: 14.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(14.r),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.layers_rounded, size: 18.r, color: const Color(0xFF16A34A)),
                                      SizedBox(width: 6.w),
                                      Text(
                                        'الفصول السابقة المعتمدة في التجميع:',
                                        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w900, color: const Color(0xFF14532D)),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    '${_selectedTermIds.length} من ${availableTerms.length} فصول',
                                    style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF16A34A)),
                                  ),
                                ],
                              ),
                              SizedBox(height: 8.h),
                              if (availableTerms.isEmpty)
                                Text(
                                  'لا توجد فصول دراسية سابقة مضافة حتى الآن.',
                                  style: TextStyle(fontSize: 11.sp, color: const Color(0xFF15803D)),
                                )
                              else
                                Wrap(
                                  spacing: 6.w,
                                  runSpacing: 6.h,
                                  children: availableTerms.map((t) {
                                    final isSel = _selectedTermIds.contains(t.id);
                                    return InkWell(
                                      onTap: () {
                                        setState(() {
                                          if (isSel) {
                                            _selectedTermIds.remove(t.id);
                                          } else {
                                            _selectedTermIds.add(t.id);
                                          }
                                        });
                                      },
                                      borderRadius: BorderRadius.circular(8.r),
                                      child: Container(
                                        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 5.h),
                                        decoration: BoxDecoration(
                                          color: isSel ? const Color(0xFF16A34A) : Colors.white,
                                          borderRadius: BorderRadius.circular(8.r),
                                          border: Border.all(color: isSel ? const Color(0xFF15803D) : const Color(0xFFCBD5E1)),
                                        ),
                                        child: Text(
                                          t.name,
                                          style: TextStyle(
                                            fontSize: 11.sp,
                                            fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                                            color: isSel ? Colors.white : const Color(0xFF1E293B),
                                          ),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                            ],
                          ),
                        ),
                      ],

                      // 7. Months Selection Container
                      if (_sourceType != 'terms')
                      Container(
                        padding: EdgeInsets.all(12.r),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFBF7F0),
                          borderRadius: BorderRadius.circular(14.r),
                          border: Border.all(color: const Color(0xFFD8CEBD)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.calendar_month_rounded, size: 18.r, color: const Color(0xFFB86848)),
                                      SizedBox(width: 6.w),
                                      Flexible(
                                        child: Text(
                                          'الأشهر المشمولة باحتساب المعدل:',
                                          style: TextStyle(
                                            fontSize: 12.sp,
                                            fontWeight: FontWeight.w900,
                                            color: const Color(0xFF2F2822),
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                SizedBox(width: 6.w),
                                Container(
                                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                                  decoration: BoxDecoration(
                                    color: _selectedModelIds.isNotEmpty ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(6.r),
                                    border: Border.all(
                                      color: _selectedModelIds.isNotEmpty ? const Color(0xFFFDE68A) : const Color(0xFFCBD5E1),
                                    ),
                                  ),
                                  child: Text(
                                    '${_selectedModelIds.length} من ${availableMonths.length} أشهر',
                                    style: TextStyle(
                                      fontSize: 10.5.sp,
                                      fontWeight: FontWeight.bold,
                                      color: _selectedModelIds.isNotEmpty ? const Color(0xFF92400E) : const Color(0xFF64748B),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 4.h),
                            Text(
                              'اختر الأشهر التي تم إضافتها في صفحة الجدول لاحتساب المعدل العام لطلابها (يمكنك تعديلها لاحقاً):',
                              style: TextStyle(fontSize: 11.sp, color: const Color(0xFF786A5B), fontWeight: FontWeight.w600),
                            ),
                            SizedBox(height: 8.h),

                            // 9 & 10. Select All & Deselect All
                            if (availableMonths.isNotEmpty) ...[
                              Row(
                                children: [
                                  InkWell(
                                    onTap: () {
                                      setState(() {
                                        _selectedModelIds.clear();
                                        _selectedModelIds.addAll(availableMonths.map((m) => m.id));
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(6.r),
                                    child: Container(
                                      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(6.r),
                                        border: Border.all(color: const Color(0xFFCBD5E1)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.done_all_rounded, size: 14.r, color: const Color(0xFF059669)),
                                          SizedBox(width: 4.w),
                                          Text(
                                            'تحديد الكل',
                                            style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF059669)),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  SizedBox(width: 6.w),
                                  InkWell(
                                    onTap: () {
                                      setState(() {
                                        _selectedModelIds.clear();
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(6.r),
                                    child: Container(
                                      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(6.r),
                                        border: Border.all(color: const Color(0xFFCBD5E1)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.remove_circle_outline_rounded, size: 14.r, color: const Color(0xFFDC2626)),
                                          SizedBox(width: 4.w),
                                          Text(
                                            'إلغاء التحديد',
                                            style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFFDC2626)),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 8.h),
                            ],

                            // 12. Month Chips List
                            if (availableMonths.isEmpty) ...[
                              Container(
                                padding: EdgeInsets.all(12.r),
                                decoration: BoxDecoration(
                                  color: Colors.amber.shade50,
                                  borderRadius: BorderRadius.circular(10.r),
                                  border: Border.all(color: Colors.amber.shade200),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(Icons.info_outline_rounded, color: Colors.amber.shade900, size: 18),
                                        SizedBox(width: 8.w),
                                        Expanded(
                                          child: Text(
                                            'لا توجد كشوف شهرية مطابقة لهذا الصف والمادة حالياً.',
                                            style: TextStyle(fontSize: 11.sp, color: Colors.amber.shade900, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                    SizedBox(height: 4.h),
                                    Text(
                                      'يمكنك إنشاء الفصل الآن وربط الكشوف لاحقاً، أو إظهار كافة كشوف الأشهر المتاحة.',
                                      style: TextStyle(fontSize: 10.5.sp, color: Colors.brown.shade700),
                                    ),
                                    if (!_showAllMonths && models.isNotEmpty) ...[
                                      SizedBox(height: 8.h),
                                      TextButton.icon(
                                        onPressed: () => setState(() => _showAllMonths = true),
                                        icon: const Icon(Icons.filter_list_rounded, size: 16),
                                        label: Text('عرض كافة الشهور المنشأة (${models.length})', style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold)),
                                        style: TextButton.styleFrom(
                                          foregroundColor: const Color(0xFFB86848),
                                          backgroundColor: Colors.white,
                                          padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(8.r),
                                            side: const BorderSide(color: Color(0xFFD8CEBD)),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ] else ...[
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: availableMonths.length,
                                separatorBuilder: (context, index) => SizedBox(height: 6.h),
                                itemBuilder: (context, index) {
                                  final m = availableMonths[index];
                                  final isChecked = _selectedModelIds.contains(m.id);
                                  return InkWell(
                                    onTap: () {
                                      setState(() {
                                        if (isChecked) {
                                          _selectedModelIds.remove(m.id);
                                        } else {
                                          _selectedModelIds.add(m.id);
                                        }
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(10.r),
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 150),
                                      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                                      decoration: BoxDecoration(
                                        color: isChecked ? const Color(0xFFFDF6EE) : Colors.white,
                                        borderRadius: BorderRadius.circular(10.r),
                                        border: Border.all(
                                          color: isChecked ? const Color(0xFFB86848) : const Color(0xFFE2E8F0),
                                          width: isChecked ? 1.5 : 1.0,
                                        ),
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 20.r,
                                            height: 20.r,
                                            decoration: BoxDecoration(
                                              color: isChecked ? const Color(0xFFB86848) : Colors.white,
                                              borderRadius: BorderRadius.circular(5.r),
                                              border: Border.all(
                                                color: isChecked ? const Color(0xFF944D30) : const Color(0xFF94A3B8),
                                                width: 1.5,
                                              ),
                                            ),
                                            child: isChecked
                                                ? Icon(Icons.check_rounded, size: 14.r, color: Colors.white)
                                                : null,
                                          ),
                                          SizedBox(width: 10.w),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  m.name,
                                                  style: TextStyle(
                                                    fontSize: 12.sp,
                                                    fontWeight: isChecked ? FontWeight.w900 : FontWeight.bold,
                                                    color: isChecked ? const Color(0xFF7A361D) : const Color(0xFF1E293B),
                                                  ),
                                                ),
                                                SizedBox(height: 2.h),
                                                Row(
                                                  children: [
                                                    Expanded(
                                                      child: Text(
                                                        '${m.subject.isNotEmpty ? "المادة: ${m.subject}" : ""}${m.subject.isNotEmpty && m.gradeLevel.isNotEmpty ? " • " : ""}${m.gradeLevel.isNotEmpty ? "الصف: ${m.gradeLevel}" : ""}',
                                                        style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF64748B)),
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                    SizedBox(width: 8.w),
                                                    Text(
                                                      '${m.students.length} طالب',
                                                      style: TextStyle(
                                                        fontSize: 10.5.sp,
                                                        fontWeight: FontWeight.bold,
                                                        color: const Color(0xFF059669),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ],

                            // Show all toggle if some were filtered out
                            if (!_showAllMonths && models.length > availableMonths.length && availableMonths.isNotEmpty) ...[
                              SizedBox(height: 6.h),
                              Center(
                                child: TextButton(
                                  onPressed: () => setState(() => _showAllMonths = true),
                                  child: Text(
                                    '+ إظهار كشوف الأشهر الأخرى التي لم تطابق الفلتر (${models.length - availableMonths.length})',
                                    style: TextStyle(fontSize: 10.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFFB86848)),
                                  ),
                                ),
                              ),
                            ],

                            // Live explanation banner
                            SizedBox(height: 8.h),
                            Container(
                              padding: EdgeInsets.all(8.r),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFFBEB),
                                borderRadius: BorderRadius.circular(8.r),
                                border: Border.all(color: const Color(0xFFFDE68A)),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.auto_awesome_rounded, size: 16.r, color: const Color(0xFFB45309)),
                                  SizedBox(width: 6.w),
                                  Expanded(
                                    child: Text(
                                      _selectedModelIds.length > 1
                                          ? 'سيتم احتساب المعدل الحسابي تلقائياً بين هذه الشهور المختارة (${_selectedModelIds.length} شهور) في عمود المعدل.'
                                          : (_selectedModelIds.length == 1
                                              ? 'تم اختيار شهر واحد فقط، وسيتم احتساب درجته تلقائياً في عمود المعدل.'
                                              : 'لم يتم تحديد أي شهر بعد، يمكنك إنشاء الفصل الآن وربط الكشوف لاحقاً.'),
                                      style: TextStyle(
                                        fontSize: 10.5.sp,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFF92400E),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Footer: Cancel & Create (Permits creation without months)
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
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
                        // 14. Allows creating the term even when no months are selected
                        if (!isNameValid) {
                          setState(() => _showValidation = true);
                          return;
                        }

                        final name = _nameController.text.trim();
                        final sub = _subjectController.text.trim();
                        final g = _gradeController.text.trim();
                        final t = _teacherController.text.trim();

                        final newTerm = TermModel(
                          id: 'term_${DateTime.now().millisecondsSinceEpoch}',
                          name: name,
                          subject: sub,
                          gradeLevel: g,
                          teacherName: t,
                          assignedSections: _selectedSections,
                          selectedModelIds: _sourceType == 'terms' ? const [] : _selectedModelIds.toList(),
                          selectedTermIds: _sourceType == 'models' ? const [] : _selectedTermIds.toList(),
                          sourceType: _sourceType,
                          calculationMode: (_selectedModelIds.length + _selectedTermIds.length) > 1 ? _calcMode : 'single',
                        );

                        if (widget.onSubmit != null) {
                          widget.onSubmit!(newTerm);
                        } else {
                          context.read<TermController>().addTerm(newTerm);
                        }
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
                        padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 9.h),
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
      contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 9.h),
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
        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.5.h),
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
}
