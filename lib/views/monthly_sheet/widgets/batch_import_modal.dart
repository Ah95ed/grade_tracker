import 'dart:convert';
import 'package:excel/excel.dart' as xl;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../models/student_row.dart';

/// Modal dialog for batch importing students and grades from Excel (.xlsx) and CSV files (Section 6)
class BatchImportModal extends StatefulWidget {
  const BatchImportModal({super.key});

  @override
  State<BatchImportModal> createState() => _BatchImportModalState();
}

class _BatchImportModalState extends State<BatchImportModal> {
  bool _isLoading = false;
  String? _fileName;
  List<StudentRow> _parsedStudents = [];
  String? _errorMessage;

  Future<void> _pickAndParseFile() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['xlsx', 'xls', 'csv'],
      );

      if (files.isEmpty) {
        setState(() => _isLoading = false);
        return;
      }

      final file = files.first;
      _fileName = file.name;
      final bytes = await file.readAsBytes();

      if (bytes.isEmpty) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'تعذر قراءة بيانات الملف المختار.';
        });
        return;
      }

      final students = <StudentRow>[];
      final ext = file.extension?.toLowerCase() ?? '';

      if (ext == 'csv') {
        final content = utf8.decode(bytes, allowMalformed: true);
        final lines = const LineSplitter().convert(content);
        for (var i = 0; i < lines.length; i++) {
          final line = lines[i].trim();
          if (line.isEmpty) continue;
          final parts = line.split(RegExp(r',|;|\t'));
          if (parts.isEmpty) continue;
          final name = parts[0].replaceAll('"', '').trim();
          // Skip header row if contains 'اسم' or 'name'
          if (name.contains('اسم') || name.toLowerCase().contains('name') || name == 'ت') {
            continue;
          }
          final section = parts.length > 1 ? parts[1].replaceAll('"', '').trim() : 'أ';
          double? score;
          if (parts.length > 2) {
            score = double.tryParse(parts[2].replaceAll('"', '').trim());
          }
          students.add(StudentRow(
            id: 'import_${DateTime.now().millisecondsSinceEpoch}_$i',
            name: name,
            section: section,
            writtenRawScore: score,
          ));
        }
      } else {
        // Excel format (.xlsx / .xls)
        final excel = xl.Excel.decodeBytes(bytes);
        for (final table in excel.tables.keys) {
          final rows = excel.tables[table]?.rows ?? [];
          for (var i = 0; i < rows.length; i++) {
            final row = rows[i];
            if (row.isEmpty) continue;
            final nameVal = row[0]?.value?.toString().trim() ?? '';
            if (nameVal.isEmpty ||
                nameVal.contains('اسم') ||
                nameVal.toLowerCase().contains('name') ||
                nameVal == 'ت') {
              continue;
            }
            final sectionVal = row.length > 1 ? row[1]?.value?.toString().trim() ?? 'أ' : 'أ';
            double? score;
            if (row.length > 2) {
              score = double.tryParse(row[2]?.value?.toString().trim() ?? '');
            }
            students.add(StudentRow(
              id: 'import_${DateTime.now().millisecondsSinceEpoch}_$i',
              name: nameVal,
              section: sectionVal,
              writtenRawScore: score,
            ));
          }
        }
      }

      setState(() {
        _parsedStudents = students;
        _isLoading = false;
        if (students.isEmpty) {
          _errorMessage = 'لم يتم العثور على سجلات طلاب صالحة داخل الملف.';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'حدث خطأ أثناء معالجة الملف: $e';
      });
    }
  }

  void _applyImport() {
    if (_parsedStudents.isEmpty) return;
    final ctrl = context.read<MonthlySheetController>();
    final currentModel = ctrl.currentModel;
    if (currentModel == null) return;

    final existing = List<StudentRow>.from(currentModel.students);
    for (final newSt in _parsedStudents) {
      // Avoid duplicate names if present
      final idx = existing.indexWhere((s) => s.name.trim().toLowerCase() == newSt.name.trim().toLowerCase());
      if (idx != -1) {
        existing[idx] = existing[idx].copyWith(
          writtenRawScore: newSt.writtenRawScore ?? existing[idx].writtenRawScore,
          section: newSt.section.isNotEmpty ? newSt.section : existing[idx].section,
        );
      } else {
        existing.add(newSt);
      }
    }

    ctrl.updateModel(currentModel.copyWith(students: existing));
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تم استيراد وتحديث ${_parsedStudents.length} طالب بنجاح.'),
        backgroundColor: const Color(0xFF16A34A),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
          width: 580.w,
          constraints: BoxConstraints(maxHeight: 650.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.file_upload_rounded, color: Colors.white, size: 24.r),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'الاستيراد الدفعي للطلاب والدرجات',
                            style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          Text(
                            'استيراد قوائم الأسماء والشُعب والدرجات من ملفات Excel و CSV',
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

              // File Selection Box
              Padding(
                padding: EdgeInsets.all(16.r),
                child: InkWell(
                  onTap: _isLoading ? null : _pickAndParseFile,
                  borderRadius: BorderRadius.circular(14.r),
                  child: Container(
                    padding: EdgeInsets.symmetric(vertical: 20.h, horizontal: 16.w),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14.r),
                      border: Border.all(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.4),
                        width: 1.5,
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.cloud_upload_rounded, size: 40.r, color: const Color(0xFF2563EB)),
                        SizedBox(height: 8.h),
                        Text(
                          _fileName != null ? 'الملف المختار: $_fileName' : 'انقر لاختيار ملف Excel (.xlsx) أو CSV',
                          style: TextStyle(fontSize: 12.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                        ),
                        SizedBox(height: 4.h),
                        Text(
                          'الترتيب المدعوم في الأعمدة: [اسم الطالب]، [الشعبة]، [الدرجة/الامتحان التحريري]',
                          style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              if (_isLoading)
                const Center(child: Padding(
                  padding: EdgeInsets.all(20),
                  child: CircularProgressIndicator(),
                )),

              if (_errorMessage != null)
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16.w),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(fontSize: 11.sp, color: Colors.red.shade700, fontWeight: FontWeight.bold),
                  ),
                ),

              // Preview Table
              if (_parsedStudents.isNotEmpty) ...[
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 4.h),
                  child: Text(
                    'معاينة الطلاب المكتشفين (${_parsedStudents.length} طالب):',
                    style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                  ),
                ),
                Expanded(
                  child: Container(
                    margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10.r),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: ListView.separated(
                      padding: EdgeInsets.all(8.r),
                      itemCount: _parsedStudents.length,
                      separatorBuilder: (context, index) => const Divider(height: 1),
                      itemBuilder: (context, idx) {
                        final st = _parsedStudents[idx];
                        return Padding(
                          padding: EdgeInsets.symmetric(vertical: 4.h, horizontal: 6.w),
                          child: Row(
                            children: [
                              Text('${idx + 1}', style: TextStyle(fontSize: 10.sp, color: const Color(0xFF64748B))),
                              SizedBox(width: 8.w),
                              Expanded(
                                child: Text(st.name, style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold)),
                              ),
                              Text('الشعبة: ${st.section}', style: TextStyle(fontSize: 11.sp, color: const Color(0xFF475569))),
                              if (st.writtenRawScore != null) ...[
                                SizedBox(width: 12.w),
                                Text(
                                  'الدرجة: ${st.writtenRawScore!.toStringAsFixed(1).replaceAll('.0', '')}',
                                  style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.bold, color: const Color(0xFF16A34A)),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],

              // Footer Actions
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('إلغاء'),
                    ),
                    ElevatedButton.icon(
                      onPressed: _parsedStudents.isNotEmpty ? _applyImport : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                      ),
                      icon: const Icon(Icons.check_rounded, size: 18),
                      label: Text('تأكيد الاستيراد (${_parsedStudents.length})'),
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
}
