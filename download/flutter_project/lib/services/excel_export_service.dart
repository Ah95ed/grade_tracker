import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';

import '../models/monthly_model.dart';
import '../models/teacher_profile.dart';
import '../controllers/monthly_sheet_controller.dart';

/// Service to export grade tables into Excel-compatible CSV files with UTF-8 BOM
class ExcelExportService {
  /// Generates CSV content with UTF-8 BOM (\uFEFF) for full Arabic character support in MS Excel
  static String generateCsvContent(MonthlyModel model, MonthlySheetController controller, TeacherProfile? profile) {
    final buffer = StringBuffer();

    // UTF-8 BOM signature for Excel to open Arabic text correctly without garbled symbols
    buffer.write('\uFEFF');

    // Header metadata lines
    if (profile != null && profile.schoolName.isNotEmpty) {
      buffer.writeln('المدرسة:,"${profile.schoolName}","المحافظة:","${profile.governorate}","نوع التعليم:","${profile.schoolType}"');
    }
    buffer.writeln('كشف درجات:,"${model.name}","المادة:","${model.subject}","الصف:","${model.gradeLevel}","الشعبة:","${model.section}"');
    buffer.writeln('الأستاذ:,"${model.teacherName.isNotEmpty ? model.teacherName : profile?.teacherName ?? ''}","العام الدراسي:","${model.academicYear}"');
    buffer.writeln(''); // Empty spacer line

    // Column Headers
    final headers = <String>[
      'ت',
      model.getColumnLabel('studentName', 'اسم الطالب'),
      model.getColumnLabel('section', 'الشعبة'),
      '${model.getColumnLabel("writtenExam", "التحريري")} (${model.writtenMaxScore.toInt()})',
      ...model.customColumns.map((c) => '${c.name} (${c.maxScore.toInt()})'),
      '${model.getColumnLabel("finalScore", "الدرجة النهائية")} (${model.totalMaxScore.toInt()})',
      model.getColumnLabel('rating', 'التقدير'),
    ];

    buffer.writeln(headers.map((h) => '"$h"').join(','));

    // Student Rows
    for (int i = 0; i < model.students.length; i++) {
      final st = model.students[i];
      final finalScore = controller.calculateFinalStudentScore(st, model);

      String rating = '-';
      if (finalScore != null) {
        final pct = (finalScore / model.totalMaxScore) * 100;
        if (pct >= 90) {
          rating = 'ممتاز';
        } else if (pct >= 80) {
          rating = 'جيد جداً';
        } else if (pct >= 70) {
          rating = 'جيد';
        } else if (pct >= 60) {
          rating = 'متوسط';
        } else if (pct >= 50) {
          rating = 'مقبول';
        } else {
          rating = 'راسب';
        }
      }

      final row = <String>[
        '${i + 1}',
        st.name,
        st.section,
        st.writtenRawScore != null ? st.writtenRawScore!.toStringAsFixed(1).replaceAll('.0', '') : '',
        ...model.customColumns.map((c) {
          final sc = st.scores[c.id];
          return sc != null ? sc.toStringAsFixed(1).replaceAll('.0', '') : '';
        }),
        finalScore != null ? finalScore.toStringAsFixed(1).replaceAll('.0', '') : '',
        rating,
      ];

      buffer.writeln(row.map((cell) => '"$cell"').join(','));
    }

    return buffer.toString();
  }

  /// Exports the table to a file or copies to clipboard
  static Future<String?> exportMonthlySheet({
    required MonthlyModel model,
    required MonthlySheetController controller,
    TeacherProfile? profile,
  }) async {
    final csvContent = generateCsvContent(model, controller, profile);

    // Always copy to clipboard as instantaneous fallback
    await Clipboard.setData(ClipboardData(text: csvContent));

    final defaultFileName = 'كشف_درجات_${model.name}_${model.gradeLevel}_${model.section}.csv'
        .replaceAll(' ', '_')
        .replaceAll('/', '_');

    if (kIsWeb) {
      return 'تم نسخ بيانات Excel للحافظة بنجاح';
    }

    try {
      final bytes = Uint8List.fromList(utf8.encode(csvContent));
      final savedUri = await FilePicker.saveFile(
        dialogTitle: 'اختر مكان حفظ ملف إكسل:',
        fileName: defaultFileName,
        bytes: bytes,
        mimeType: 'text/csv',
      );

      if (savedUri != null) {
        return 'تم حفظ ملف الإكسل بنجاح ($defaultFileName)';
      }
    } catch (_) {
      // Fallback
    }

    return 'تم نسخ جدول الدرجات بصيغة Excel المتوافقة مع العربية بنجاح';
  }
}
