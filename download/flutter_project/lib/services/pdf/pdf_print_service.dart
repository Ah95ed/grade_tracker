import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';

import '../../models/teacher_profile.dart';
import '../../models/monthly_model.dart';
import 'monthly_sheet_pdf_template.dart';

/// PDF Printing Service for generating, previewing, and sending grade reports to printers
class PdfPrintService {
  /// Print or preview the full monthly grades table
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

    final cleanFileName = 'كشف_درجات_${model.name}_${model.gradeLevel}_${model.section}'
        .replaceAll(' ', '_')
        .replaceAll('/', '_');

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfBytes,
      name: '$cleanFileName.pdf',
    );
  }
}
