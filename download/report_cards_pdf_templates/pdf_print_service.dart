import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../flutter_data/models/teacher_profile.dart';
import '../flutter_data/models/monthly_model.dart';
import '../flutter_data/models/term_model.dart';
import '../flutter_data/models/student_row.dart';
import 'monthly_sheet_pdf_template.dart';
import 'term_summary_pdf_template.dart';
import 'student_individual_card_pdf_template.dart';

/// خدمة تصدير وطباعة كروت وتقارير الدرجات المعتمدة (Printing & PDF Service)
class PdfPrintService {
  /// طباعة جدول الدرجات الشهري المعتمد لمرحلة وشعبة معينة
  static Future<void> printMonthlySheet({
    required MonthlyModel model,
    required TeacherProfile profile,
    PdfPageFormat pageFormat = PdfPageFormat.a4,
  }) async {
    final pdfBytes = await buildMonthlySheetPdf(
      model: model,
      profile: profile,
      pageFormat: pageFormat,
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfBytes,
      name: 'جدول_درجات_${model.name}_${model.section}.pdf',
    );
  }

  /// طباعة شهادات نتائج الفصول والمعدلات النهائية
  static Future<void> printTermSummary({
    required TermModel term,
    required List<MonthlyModel> models,
    required TeacherProfile profile,
    PdfPageFormat pageFormat = PdfPageFormat.a4,
  }) async {
    final pdfBytes = await buildTermSummaryPdf(
      term: term,
      models: models,
      profile: profile,
      pageFormat: pageFormat,
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfBytes,
      name: 'نتيجة_${term.name}.pdf',
    );
  }

  /// طباعة بطاقة درجات فردية للطالب (A5)
  static Future<void> printIndividualStudentCard({
    required StudentRow student,
    required MonthlyModel model,
    required TeacherProfile profile,
    PdfPageFormat pageFormat = PdfPageFormat.a5,
  }) async {
    final pdfBytes = await buildStudentIndividualCardPdf(
      student: student,
      model: model,
      profile: profile,
      pageFormat: pageFormat,
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfBytes,
      name: 'بطاقة_${student.name}.pdf',
    );
  }
}
