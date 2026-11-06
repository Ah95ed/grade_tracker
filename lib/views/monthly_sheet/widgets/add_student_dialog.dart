import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/student_row.dart';

/// Comprehensive dialog to add a single student or batch import names from Excel/text
class AddStudentDialog extends StatefulWidget {
  const AddStudentDialog({super.key});

  @override
  State<AddStudentDialog> createState() => _AddStudentDialogState();
}

class _AddStudentDialogState extends State<AddStudentDialog> {
  int _activeTab = 0; // 0: Single, 1: Batch paste

  // Single mode controllers
  final _nameController = TextEditingController();
  final _sectionController = TextEditingController(text: 'أ');
  final _writtenController = TextEditingController();

  // Batch mode controllers
  final _batchTextController = TextEditingController();
  final _batchSectionController = TextEditingController(text: 'أ');

  @override
  void initState() {
    super.initState();
    final model = context.read<MonthlySheetController>().currentModel;
    if (model != null && model.assignedSections.isNotEmpty) {
      _sectionController.text = model.assignedSections.first;
      _batchSectionController.text = model.assignedSections.first;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _sectionController.dispose();
    _writtenController.dispose();
    _batchTextController.dispose();
    _batchSectionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final model = context.watch<MonthlySheetController>().currentModel;
    final availableSections = model?.assignedSections ?? ['أ', 'ب', 'ج', 'د'];

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
          width: 480.w,
          constraints: BoxConstraints(maxHeight: 620.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: BoxDecoration(
                  color: const Color(0xFF3E6D52), // Forest Green
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
                      child: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 18),
                    ),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Text(
                        _activeTab == 0 ? 'إضافة طالب جديد' : 'لصق واستيراد كشف الطلاب',
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

              // Mode Switcher Tabs
              Padding(
                padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 4.h),
                child: Container(
                  padding: EdgeInsets.all(3.r),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFE8D8),
                    borderRadius: BorderRadius.circular(10.r),
                    border: Border.all(color: const Color(0xFFD8CEBD)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _activeTab = 0),
                          borderRadius: BorderRadius.circular(8.r),
                          child: Container(
                            padding: EdgeInsets.symmetric(vertical: 6.h),
                            decoration: BoxDecoration(
                              color: _activeTab == 0 ? const Color(0xFF3E6D52) : Colors.transparent,
                              borderRadius: BorderRadius.circular(8.r),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'طالب واحد',
                              style: TextStyle(
                                fontSize: 11.5.sp,
                                fontWeight: FontWeight.w800,
                                color: _activeTab == 0 ? Colors.white : const Color(0xFF4A3D30),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _activeTab = 1),
                          borderRadius: BorderRadius.circular(8.r),
                          child: Container(
                            padding: EdgeInsets.symmetric(vertical: 6.h),
                            decoration: BoxDecoration(
                              color: _activeTab == 1 ? const Color(0xFF3E6D52) : Colors.transparent,
                              borderRadius: BorderRadius.circular(8.r),
                            ),
                            alignment: Alignment.center,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.content_paste_rounded,
                                  size: 14.r,
                                  color: _activeTab == 1 ? Colors.white : const Color(0xFF4A3D30),
                                ),
                                SizedBox(width: 4.w),
                                Text(
                                  'لصق كشف أسماء (Excel)',
                                  style: TextStyle(
                                    fontSize: 11.5.sp,
                                    fontWeight: FontWeight.w800,
                                    color: _activeTab == 1 ? Colors.white : const Color(0xFF4A3D30),
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

              // Content Body
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(16.r),
                  child: _activeTab == 0
                      ? _buildSingleStudentForm(availableSections)
                      : _buildBatchImportForm(availableSections),
                ),
              ),

              // Footer
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
                      child: Text('إلغاء', style: TextStyle(fontSize: 12.sp, color: const Color(0xFF7A6E61))),
                    ),
                    SizedBox(width: 8.w),
                    ElevatedButton.icon(
                      onPressed: _handleSubmit,
                      icon: const Icon(Icons.check_rounded, color: Colors.white, size: 16),
                      label: Text(
                        _activeTab == 0 ? 'إضافة الطالب' : 'استيراد الأسماء',
                        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF3E6D52),
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

  Widget _buildSingleStudentForm(List<String> availableSections) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildLabel('اسم الطالب الرباعي:'),
        SizedBox(height: 6.h),
        TextField(
          controller: _nameController,
          autofocus: true,
          style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
          decoration: _inputDecoration(hint: 'اكتب اسم الطالب...'),
        ),
        SizedBox(height: 12.h),

        _buildLabel('الشعبة:'),
        SizedBox(height: 6.h),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _sectionController,
                style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                decoration: _inputDecoration(hint: 'رمز الشعبة (مثال: أ، ب، A)...'),
              ),
            ),
          ],
        ),
        if (availableSections.isNotEmpty) ...[
          SizedBox(height: 6.h),
          Wrap(
            spacing: 6.w,
            children: availableSections.map((sec) {
              return InkWell(
                onTap: () => setState(() => _sectionController.text = sec),
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                  decoration: BoxDecoration(
                    color: _sectionController.text.trim() == sec ? const Color(0xFF3E6D52) : Colors.white,
                    borderRadius: BorderRadius.circular(6.r),
                    border: Border.all(color: const Color(0xFFD8CEBD)),
                  ),
                  child: Text(
                    'شعبة $sec',
                    style: TextStyle(
                      fontSize: 10.5.sp,
                      fontWeight: FontWeight.bold,
                      color: _sectionController.text.trim() == sec ? Colors.white : const Color(0xFF333333),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
        SizedBox(height: 12.h),

        _buildLabel('الدرجة التحريرية بالورقة (اختياري):'),
        SizedBox(height: 6.h),
        TextField(
          controller: _writtenController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
          decoration: _inputDecoration(hint: 'يمكن تركها فارغة للرصد لاحقاً...'),
        ),
      ],
    );
  }

  Widget _buildBatchImportForm(List<String> availableSections) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildLabel('الصق أسماء الطلاب هنا (كل اسم في سطر جديد):'),
        SizedBox(height: 6.h),
        TextField(
          controller: _batchTextController,
          autofocus: true,
          maxLines: 8,
          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w600),
          decoration: _inputDecoration(
            hint: 'أحمد محمد علي\nحسين كريم حسن\nعلي رضا كاظم\n\nأو الصق أسماء الطلاب مباشرة من جدول Excel...',
          ),
        ),
        SizedBox(height: 12.h),

        _buildLabel('تعيين الشعبة لجميع هذه الأسماء:'),
        SizedBox(height: 6.h),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _batchSectionController,
                style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w700),
                decoration: _inputDecoration(hint: 'رمز الشعبة...'),
              ),
            ),
          ],
        ),
        if (availableSections.isNotEmpty) ...[
          SizedBox(height: 6.h),
          Wrap(
            spacing: 6.w,
            children: availableSections.map((sec) {
              return InkWell(
                onTap: () => setState(() => _batchSectionController.text = sec),
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                  decoration: BoxDecoration(
                    color: _batchSectionController.text.trim() == sec ? const Color(0xFF3E6D52) : Colors.white,
                    borderRadius: BorderRadius.circular(6.r),
                    border: Border.all(color: const Color(0xFFD8CEBD)),
                  ),
                  child: Text(
                    'شعبة $sec',
                    style: TextStyle(
                      fontSize: 10.5.sp,
                      fontWeight: FontWeight.bold,
                      color: _batchSectionController.text.trim() == sec ? Colors.white : const Color(0xFF333333),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
        SizedBox(height: 8.h),
        Text(
          '💡 يمكنك نسخ عمود الأسماء بالكامل من Excel أو Word ولصقه هنا بنقرة واحدة.',
          style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF554A3E), fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  void _handleSubmit() {
    final sheetCtrl = context.read<MonthlySheetController>();
    final model = sheetCtrl.currentModel;
    final grade = model?.gradeLevel ?? '';

    if (_activeTab == 0) {
      final name = _nameController.text.trim();
      if (name.isEmpty) return;
      final section = _sectionController.text.trim().isNotEmpty ? _sectionController.text.trim() : 'أ';
      final written = double.tryParse(_writtenController.text.trim());

      final newStudent = StudentRow(
        id: 'st_${DateTime.now().millisecondsSinceEpoch}',
        name: name,
        gradeLevel: grade,
        section: section,
        writtenRawScore: written,
      );

      sheetCtrl.addStudent(newStudent);
      Navigator.of(context).pop();
    } else {
      final text = _batchTextController.text.trim();
      if (text.isEmpty) return;

      final section = _batchSectionController.text.trim().isNotEmpty ? _batchSectionController.text.trim() : 'أ';
      final lines = text.split('\n');
      int count = 0;

      for (int i = 0; i < lines.length; i++) {
        final line = lines[i].trim();
        if (line.isEmpty) continue;

        // Clean out index numbers like "1.", "1-", etc.
        final cleanedName = line.replaceFirst(RegExp(r'^\d+[\.\-\)\s]+'), '').trim();
        if (cleanedName.isEmpty) continue;

        final newStudent = StudentRow(
          id: 'st_${DateTime.now().millisecondsSinceEpoch}_$i',
          name: cleanedName,
          gradeLevel: grade,
          section: section,
        );

        sheetCtrl.addStudent(newStudent);
        count++;
      }

      Navigator.of(context).pop();
      if (mounted && count > 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF3E6D52),
            content: Text('تمت إضافة $count طالب بنجاح إلى شعبة $section'),
          ),
        );
      }
    }
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
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10.r),
        borderSide: const BorderSide(color: Color(0xFFD8CEBD)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10.r),
        borderSide: const BorderSide(color: Color(0xFF3E6D52), width: 1.8),
      ),
    );
  }
}
