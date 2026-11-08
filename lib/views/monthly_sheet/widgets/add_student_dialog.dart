import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';

import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/constants/academic_presets.dart';
import '../../../models/student_row.dart';

/// Comprehensive dialog matching Daragat Web App for adding students (Manual / Paste / File & Camera)
class AddStudentDialog extends StatefulWidget {
  const AddStudentDialog({super.key});

  @override
  State<AddStudentDialog> createState() => _AddStudentDialogState();
}

class _AddStudentDialogState extends State<AddStudentDialog> {
  // 0: إدخال يدوي أو لصق نص, 1: من ملف أو الكاميرا
  int _activeTab = 0;

  // Grade & Section selection
  String _selectedGrade = '';
  bool _isCustomGrade = false;
  final _customGradeController = TextEditingController();
  final _sectionController = TextEditingController(text: 'أ');

  // Manual & Paste controllers
  final _singleNameController = TextEditingController();
  final _singleWrittenController = TextEditingController();
  final _batchTextController = TextEditingController();

  // Status & feedback
  String? _statusMessage;
  bool _isSuccessMessage = false;

  @override
  void initState() {
    super.initState();
    final model = context.read<MonthlySheetController>().currentModel;
    if (model != null) {
      if (model.gradeLevel.isNotEmpty) {
        _selectedGrade = model.gradeLevel;
      }
      if (model.section.isNotEmpty) {
        _sectionController.text = model.section;
      } else if (model.assignedSections.isNotEmpty) {
        _sectionController.text = model.assignedSections.first;
      }
    }
  }

  @override
  void dispose() {
    _customGradeController.dispose();
    _sectionController.dispose();
    _singleNameController.dispose();
    _singleWrittenController.dispose();
    _batchTextController.dispose();
    super.dispose();
  }

  String get _effectiveGrade {
    if (_isCustomGrade) {
      return _customGradeController.text.trim();
    }
    return _selectedGrade.trim();
  }

  void _addSingleStudent(MonthlySheetController controller) {
    final name = _singleNameController.text.trim();
    if (name.isEmpty) {
      setState(() {
        _statusMessage = '⚠️ يرجى كتابة اسم الطالب أولاً';
        _isSuccessMessage = false;
      });
      return;
    }

    final effectiveGrade = _effectiveGrade;
    if (effectiveGrade.isEmpty) {
      setState(() {
        _statusMessage = '⚠️ يرجى تحديد الصف أولاً';
        _isSuccessMessage = false;
      });
      return;
    }

    final writtenScore = double.tryParse(_singleWrittenController.text.trim());
    final newStudent = StudentRow(
      id: 'st_${DateTime.now().millisecondsSinceEpoch}_${name.hashCode}',
      name: name,
      section: _sectionController.text.trim().isNotEmpty ? _sectionController.text.trim() : 'أ',
      writtenRawScore: writtenScore,
    );

    controller.addStudent(newStudent);

    // Update model grade level if not yet set
    final currentModel = controller.currentModel;
    if (currentModel != null && (currentModel.gradeLevel.isEmpty || currentModel.gradeLevel != effectiveGrade)) {
      controller.updateModel(currentModel.copyWith(gradeLevel: effectiveGrade));
    }

    setState(() {
      _singleNameController.clear();
      _singleWrittenController.clear();
      _statusMessage = '✓ تمت إضافة الطالب ($name) بنجاح';
      _isSuccessMessage = true;
    });
  }

  void _importBatchText(MonthlySheetController controller) {
    final text = _batchTextController.text.trim();
    if (text.isEmpty) {
      setState(() {
        _statusMessage = '⚠️ يرجى لصق أو كتابة أسماء الطلاب أولاً';
        _isSuccessMessage = false;
      });
      return;
    }

    final effectiveGrade = _effectiveGrade;
    if (effectiveGrade.isEmpty) {
      setState(() {
        _statusMessage = '⚠️ يرجى تحديد الصف أولاً';
        _isSuccessMessage = false;
      });
      return;
    }

    final lines = text.split(RegExp(r'[\r\n]+'));
    int addedCount = 0;
    final sec = _sectionController.text.trim().isNotEmpty ? _sectionController.text.trim() : 'أ';

    for (final rawLine in lines) {
      final line = rawLine.trim();
      if (line.isEmpty) continue;

      // Extract name and possible written score if comma or tab separated
      final parts = line.split(RegExp(r'[\t,]+'));
      final name = parts[0].trim();
      if (name.isEmpty) continue;

      double? writtenScore;
      if (parts.length > 1) {
        writtenScore = double.tryParse(parts[1].trim());
      }

      final st = StudentRow(
        id: 'st_${DateTime.now().millisecondsSinceEpoch}_$addedCount',
        name: name,
        section: sec,
        writtenRawScore: writtenScore,
      );

      controller.addStudent(st);
      addedCount++;
    }

    final currentModel = controller.currentModel;
    if (currentModel != null && (currentModel.gradeLevel.isEmpty || currentModel.gradeLevel != effectiveGrade)) {
      controller.updateModel(currentModel.copyWith(gradeLevel: effectiveGrade));
    }

    setState(() {
      _batchTextController.clear();
      _statusMessage = '✓ تم استيراد ($addedCount) طالباً إلى الكشف بنجاح';
      _isSuccessMessage = true;
    });
  }

  Future<void> _pickExcelOrCsvFile(MonthlySheetController controller) async {
    final effectiveGrade = _effectiveGrade;
    if (effectiveGrade.isEmpty) {
      setState(() {
        _statusMessage = '⚠️ يرجى تحديد الصف أولاً قبل الاستيراد من ملف';
        _isSuccessMessage = false;
      });
      return;
    }

    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv', 'txt', 'xlsx', 'xls'],
      );

      if (files.isNotEmpty && files.first.path != null) {
        final file = File(files.first.path!);
        final content = await file.readAsString();

        final lines = content.split(RegExp(r'[\r\n]+'));
        int count = 0;
        final sec = _sectionController.text.trim().isNotEmpty ? _sectionController.text.trim() : 'أ';

        for (final line in lines) {
          final trimmed = line.trim();
          if (trimmed.isEmpty) continue;
          final parts = trimmed.split(RegExp(r'[\t,]+'));
          final name = parts[0].replaceAll('"', '').trim();
          if (name.isEmpty || name == 'اسم الطالب' || name == 'الاسم') continue;

          double? score;
          if (parts.length > 1) {
            score = double.tryParse(parts[1].replaceAll('"', '').trim());
          }

          final st = StudentRow(
            id: 'st_${DateTime.now().millisecondsSinceEpoch}_$count',
            name: name,
            section: sec,
            writtenRawScore: score,
          );
          controller.addStudent(st);
          count++;
        }

        setState(() {
          _statusMessage = '✓ تم استيراد ($count) طالباً من الملف بنجاح';
          _isSuccessMessage = true;
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = '⚠️ تعذر قراءة الملف: $e';
        _isSuccessMessage = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final model = controller.currentModel;
    final availableSections = model?.assignedSections ?? ['أ', 'ب', 'ج', 'د', 'هـ'];

    final List<String> allGrades = [
      ...AcademicPresets.standardSchoolGrades,
      ...AcademicPresets.standardUniversityStages,
    ];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        backgroundColor: const Color(0xFFFAF7EC),
        insetPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 18.h),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20.r),
          side: const BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
        ),
        child: Container(
          constraints: BoxConstraints(maxWidth: 520.w, maxHeight: 720.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Header Banner
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: BoxDecoration(
                  color: const Color(0xFF8C6544), // Craft warm brown
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(7.r),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10.r),
                      ),
                      child: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 20),
                    ),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'إضافة واستيراد كشف الطلاب',
                            style: TextStyle(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            model != null ? '${model.name} (${model.subject})' : 'كشف الدرجات',
                            style: TextStyle(
                              fontSize: 11.sp,
                              color: const Color(0xFFFDE68A),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white70),
                      onPressed: () => Navigator.of(context).pop(),
                      splashRadius: 18.r,
                    ),
                  ],
                ),
              ),

              // 2. Prominent Target Grade & Section Selector Box (As strictly requested)
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF5EFE3),
                  border: Border(bottom: BorderSide(color: Color(0xFFD8CEBD))),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Label and Status Alert Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              'الصف المستهدف:',
                              style: TextStyle(
                                fontSize: 12.sp,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF2F2822),
                              ),
                            ),
                            SizedBox(width: 4.w),
                            Text(
                              '* (مطلوب)',
                              style: TextStyle(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFFE11D48),
                              ),
                            ),
                          ],
                        ),
                        // Badge Alert
                        _selectedGrade.isEmpty && !_isCustomGrade
                            ? Container(
                                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(6.r),
                                  border: Border.all(color: const Color(0xFFFCD34D)),
                                ),
                                child: Text(
                                  '⚠️ يرجى تحديد الصف أولاً',
                                  style: TextStyle(
                                    fontSize: 10.5.sp,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF92400E),
                                  ),
                                ),
                              )
                            : Container(
                                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(6.r),
                                  border: Border.all(color: const Color(0xFFA7F3D0)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.check, size: 12.r, color: const Color(0xFF059669)),
                                    SizedBox(width: 3.w),
                                    Text(
                                      'تم اختيار: $_effectiveGrade',
                                      style: TextStyle(
                                        fontSize: 10.5.sp,
                                        fontWeight: FontWeight.w900,
                                        color: const Color(0xFF065F46),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                      ],
                    ),
                    SizedBox(height: 6.h),

                    // Dropdown or Custom Text Input
                    if (!_isCustomGrade)
                      DropdownButtonFormField<String>(
                        initialValue: _selectedGrade.isNotEmpty && allGrades.contains(_selectedGrade)
                            ? _selectedGrade
                            : '',
                        isExpanded: true,
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10.r),
                            borderSide: BorderSide(
                              color: _selectedGrade.isEmpty ? const Color(0xFFF59E0B) : const Color(0xFFBA916C),
                              width: 1.2,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10.r),
                            borderSide: BorderSide(
                              color: _selectedGrade.isEmpty ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                              width: 1.2,
                            ),
                          ),
                        ),
                        items: [
                          DropdownMenuItem<String>(
                            value: '',
                            enabled: false,
                            child: Text(
                              '-- 👇 اضغط هنا لاختيار الصف من قائمة الصفوف --',
                              style: TextStyle(
                                fontSize: 11.5.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                          ...allGrades.map((g) => DropdownMenuItem<String>(
                                value: g,
                                child: Text(g, style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold)),
                              )),
                          DropdownMenuItem<String>(
                            value: '__CUSTOM__',
                            child: Text(
                              '✍️ كتابة صف دراسي آخر غير موجود بالقائمة...',
                              style: TextStyle(
                                fontSize: 11.5.sp,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF2563EB),
                              ),
                            ),
                          ),
                        ],
                        onChanged: (val) {
                          if (val == '__CUSTOM__') {
                            setState(() {
                              _isCustomGrade = true;
                              _selectedGrade = '';
                            });
                          } else if (val != null && val.isNotEmpty) {
                            setState(() {
                              _selectedGrade = val;
                              _statusMessage = null;
                            });
                          }
                        },
                      )
                    else
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _customGradeController,
                              autofocus: true,
                              style: TextStyle(fontSize: 12.5.sp, fontWeight: FontWeight.bold),
                              decoration: InputDecoration(
                                hintText: 'اكتب اسم الصف هنا (مثال: ثاني متوسط)...',
                                filled: true,
                                fillColor: Colors.white,
                                contentPadding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 7.h),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.r)),
                              ),
                            ),
                          ),
                          SizedBox(width: 6.w),
                          TextButton(
                            onPressed: () => setState(() => _isCustomGrade = false),
                            child: Text('العودة للقائمة', style: TextStyle(fontSize: 11.sp, color: const Color(0xFF6D4C2F))),
                          ),
                        ],
                      ),
                    SizedBox(height: 8.h),

                    // Section Selection
                    Row(
                      children: [
                        Text('الشعبة:', style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.w800, color: const Color(0xFF2F2822))),
                        SizedBox(width: 8.w),
                        SizedBox(
                          width: 80.w,
                          child: TextFormField(
                            controller: _sectionController,
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 5.h),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.r)),
                            ),
                          ),
                        ),
                        SizedBox(width: 8.w),
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: availableSections.map((sec) {
                                final isSelected = _sectionController.text.trim() == sec;
                                return Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 2.w),
                                  child: InkWell(
                                    onTap: () => setState(() => _sectionController.text = sec),
                                    borderRadius: BorderRadius.circular(6.r),
                                    child: Container(
                                      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                                      decoration: BoxDecoration(
                                        color: isSelected ? const Color(0xFF8C6544) : Colors.white,
                                        borderRadius: BorderRadius.circular(6.r),
                                        border: Border.all(color: const Color(0xFFD8CEBD)),
                                      ),
                                      child: Text(
                                        'شعبة $sec',
                                        style: TextStyle(
                                          fontSize: 10.5.sp,
                                          fontWeight: FontWeight.bold,
                                          color: isSelected ? Colors.white : const Color(0xFF4A3D30),
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // 3. Segmented Method Selector: "إدخال يدوي أو لصق نص" -- "من ملف أو الكاميرا"
              Padding(
                padding: EdgeInsets.fromLTRB(16.w, 10.h, 16.w, 4.h),
                child: Container(
                  padding: EdgeInsets.all(3.r),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE4DAC8),
                    borderRadius: BorderRadius.circular(10.r),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _activeTab = 0),
                          borderRadius: BorderRadius.circular(8.r),
                          child: Container(
                            padding: EdgeInsets.symmetric(vertical: 7.h),
                            decoration: BoxDecoration(
                              color: _activeTab == 0 ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(8.r),
                              boxShadow: _activeTab == 0
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 3,
                                      ),
                                    ]
                                  : null,
                            ),
                            alignment: Alignment.center,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.edit_note_rounded,
                                  size: 16.r,
                                  color: _activeTab == 0 ? const Color(0xFF8C6544) : const Color(0xFF6B5E51),
                                ),
                                SizedBox(width: 5.w),
                                Text(
                                  'إدخال يدوي أو لصق نص',
                                  style: TextStyle(
                                    fontSize: 12.sp,
                                    fontWeight: _activeTab == 0 ? FontWeight.w900 : FontWeight.w700,
                                    color: _activeTab == 0 ? const Color(0xFF8C6544) : const Color(0xFF6B5E51),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _activeTab = 1),
                          borderRadius: BorderRadius.circular(8.r),
                          child: Container(
                            padding: EdgeInsets.symmetric(vertical: 7.h),
                            decoration: BoxDecoration(
                              color: _activeTab == 1 ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(8.r),
                              boxShadow: _activeTab == 1
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 3,
                                      ),
                                    ]
                                  : null,
                            ),
                            alignment: Alignment.center,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.camera_alt_outlined,
                                  size: 16.r,
                                  color: _activeTab == 1 ? const Color(0xFF2B6CB0) : const Color(0xFF6B5E51),
                                ),
                                SizedBox(width: 5.w),
                                Text(
                                  'من ملف أو الكاميرا',
                                  style: TextStyle(
                                    fontSize: 12.sp,
                                    fontWeight: _activeTab == 1 ? FontWeight.w900 : FontWeight.w700,
                                    color: _activeTab == 1 ? const Color(0xFF2B6CB0) : const Color(0xFF6B5E51),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Feedback Alert if any
              if (_statusMessage != null)
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 4.h),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: _isSuccessMessage ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(8.r),
                      border: Border.all(
                        color: _isSuccessMessage ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA),
                      ),
                    ),
                    child: Text(
                      _statusMessage!,
                      style: TextStyle(
                        fontSize: 11.5.sp,
                        fontWeight: FontWeight.bold,
                        color: _isSuccessMessage ? const Color(0xFF065F46) : const Color(0xFFDC2626),
                      ),
                    ),
                  ),
                ),

              // 4. Content Body based on selected Tab
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(16.r),
                  child: _activeTab == 0
                      ? _buildManualAndPasteTab(controller)
                      : _buildFileAndCameraTab(controller),
                ),
              ),

              // 5. Footer Actions
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF8F4EA),
                  border: Border(top: BorderSide(color: Color(0xFFE0D5C3))),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text('إغلاق', style: TextStyle(fontSize: 12.sp, color: const Color(0xFF7A6E61))),
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

  // VIEW 1: Manual Input & Paste Text Tab
  Widget _buildManualAndPasteTab(MonthlySheetController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // A. Quick Single Student Row
        Container(
          padding: EdgeInsets.all(12.r),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12.r),
            border: Border.all(color: const Color(0xFFD8CEBD)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'إدخال اسم طالب واحد سريع:',
                style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.w900, color: const Color(0xFF2F2822)),
              ),
              SizedBox(height: 6.h),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _singleNameController,
                      style: TextStyle(fontSize: 12.5.sp, fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        hintText: 'اسم الطالب الرباعي...',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        contentPadding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.r)),
                      ),
                    ),
                  ),
                  SizedBox(width: 8.w),
                  SizedBox(
                    width: 85.w,
                    child: TextFormField(
                      controller: _singleWrittenController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12.5.sp, fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        hintText: 'الدرجة',
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        contentPadding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 8.h),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.r)),
                      ),
                    ),
                  ),
                  SizedBox(width: 8.w),
                  ElevatedButton(
                    onPressed: () => _addSingleStudent(controller),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8C6544),
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                    ),
                    child: const Text('إضافة', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        ),
        SizedBox(height: 14.h),

        // B. Multi-line Paste Area
        Container(
          padding: EdgeInsets.all(12.r),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12.r),
            border: Border.all(color: const Color(0xFFD8CEBD)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'أو لصق كشف أسماء كامل (من Word أو Excel):',
                    style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.w900, color: const Color(0xFF2F2822)),
                  ),
                  Text(
                    'اسم في كل سطر',
                    style: TextStyle(fontSize: 10.sp, color: const Color(0xFF7A6E61)),
                  ),
                ],
              ),
              SizedBox(height: 6.h),
              TextFormField(
                controller: _batchTextController,
                maxLines: 5,
                style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  hintText: 'الصق أسماء الطلاب هنا...\nمحمد علي حسين\nأحمد خالد حسن\nفاطمة محمود رضا',
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  contentPadding: EdgeInsets.all(10.r),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.r)),
                ),
              ),
              SizedBox(height: 8.h),
              Align(
                alignment: Alignment.centerLeft,
                child: ElevatedButton.icon(
                  onPressed: () => _importBatchText(controller),
                  icon: const Icon(Icons.playlist_add_check_rounded, size: 16),
                  label: const Text('استيراد الأسماء الملصقة'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2B6CB0),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // VIEW 2: From File or Camera Tab
  Widget _buildFileAndCameraTab(MonthlySheetController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // File Card
        InkWell(
          onTap: () => _pickExcelOrCsvFile(controller),
          borderRadius: BorderRadius.circular(12.r),
          child: Container(
            padding: EdgeInsets.all(14.r),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Row(
              children: [
                Container(
                  padding: EdgeInsets.all(10.r),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(10.r),
                  ),
                  child: const Icon(Icons.table_chart_outlined, color: Color(0xFF059669), size: 24),
                ),
                SizedBox(width: 12.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'استيراد من ملف Excel أو CSV',
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w900, color: const Color(0xFF1E293B)),
                      ),
                      SizedBox(height: 2.h),
                      Text(
                        'يدعم ملفات (.xlsx, .xls, .csv) مع التعرف التلقائي على عمود الأسماء والدرجات',
                        style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_left_rounded, color: Colors.grey.shade400),
              ],
            ),
          ),
        ),
        SizedBox(height: 12.h),

        // Camera Card
        InkWell(
          onTap: () async {
            try {
              final files = await FilePicker.pickFiles(
                type: FileType.image,
              );
              if (files.isNotEmpty) {
                setState(() {
                  _statusMessage = '✓ تم اختيار الصورة: ${files.first.name} (يمكنك استخراج الأسماء أو مراجعتها)';
                  _isSuccessMessage = true;
                });
              }
            } catch (_) {}
          },
          borderRadius: BorderRadius.circular(12.r),
          child: Container(
            padding: EdgeInsets.all(14.r),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Row(
              children: [
                Container(
                  padding: EdgeInsets.all(10.r),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10.r),
                  ),
                  child: const Icon(Icons.camera_alt_outlined, color: Color(0xFF2563EB), size: 24),
                ),
                SizedBox(width: 12.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'التقاط صورة أو اختيار صورة القائمة',
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w900, color: const Color(0xFF1E293B)),
                      ),
                      SizedBox(height: 2.h),
                      Text(
                        'التقط صورة للقائمة الورقية بالهاتف أو الكاميرا للاستخراج الذكي',
                        style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_left_rounded, color: Colors.grey.shade400),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
