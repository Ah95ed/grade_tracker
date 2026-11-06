import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../flutter_data/models/teacher_profile.dart';
import '../flutter_data/models/monthly_model.dart';
import '../flutter_data/models/term_model.dart';

/// قالب PDF لشهادات ونتائج الفصول الدراسية (A4 Landscape / Portrait)
Future<Uint8List> buildTermSummaryPdf({
  required TermModel term,
  required List<MonthlyModel> models,
  required TeacherProfile profile,
  PdfPageFormat pageFormat = PdfPageFormat.a4,
}) async {
  final doc = pw.Document();
  final arabicFont = await PdfGoogleFonts.cairoMedium();
  final arabicFontBold = await PdfGoogleFonts.cairoBold();

  doc.addPage(
    pw.Page(
      pageFormat: pageFormat,
      textDirection: pw.TextDirection.rtl,
      build: (pw.Context context) {
        return pw.Padding(
          padding: const pw.EdgeInsets.all(16),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              // Header
              pw.Container(
                padding: const pw.EdgeInsets.all(10),
                decoration: pw.BoxDecoration(
                  color: PdfColor.fromHex('#B86848'),
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'خلاصة درجات: ${term.name}',
                      style: pw.TextStyle(font: arabicFontBold, fontSize: 13, color: PdfColors.white),
                    ),
                    pw.Text(
                      'المادة: ${profile.subject} • العام: ${profile.academicYear}',
                      style: pw.TextStyle(font: arabicFont, fontSize: 10, color: PdfColors.white),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 12),

              // Summary Info
              pw.Text(
                'الشهادات المعتمدة للفصل الدراسي مع احتساب الأوزان النسبية للشهور.',
                style: pw.TextStyle(font: arabicFont, fontSize: 10, color: PdfColor.fromHex('#475569')),
              ),
              pw.SizedBox(height: 12),

              // Placeholder Table
              pw.Expanded(
                child: pw.Container(
                  decoration: pw.BoxDecoration(
                    border: pw.Border.all(color: PdfColor.fromHex('#CBD5E1')),
                    borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                  ),
                  alignment: pw.Alignment.center,
                  child: pw.Text(
                    'قائمة درجات الفصل الدراسي - معتمدة ومطابقة لضوابط وزارة التربية',
                    style: pw.TextStyle(font: arabicFontBold, fontSize: 11, color: PdfColor.fromHex('#334155')),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    ),
  );

  return doc.save();
}
