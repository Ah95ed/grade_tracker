import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../flutter_data/models/teacher_profile.dart';
import '../flutter_data/models/monthly_model.dart';

/// قالب PDF لجدول الدرجات الشهري (A4 Landscape / Portrait)
Future<Uint8List> buildMonthlySheetPdf({
  required MonthlyModel model,
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
              // 1. Header (School & Ministry Info)
              pw.Container(
                padding: const pw.EdgeInsets.all(10),
                decoration: pw.BoxDecoration(
                  color: PdfColor.fromHex('#FAF6EC'),
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                  border: pw.Border.all(color: PdfColor.fromHex('#AA8362'), width: 1),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          profile.schoolName.isNotEmpty ? profile.schoolName : 'المدرسة',
                          style: pw.TextStyle(font: arabicFontBold, fontSize: 13, color: PdfColor.fromHex('#2F2822')),
                        ),
                        pw.Text(
                          'المحافظة: ${profile.governorate.isNotEmpty ? profile.governorate : "العراق"}',
                          style: pw.TextStyle(font: arabicFont, fontSize: 9, color: PdfColor.fromHex('#64748B')),
                        ),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.center,
                      children: [
                        pw.Text(
                          'سجل درجات الطلاب الشهري',
                          style: pw.TextStyle(font: arabicFontBold, fontSize: 14, color: PdfColor.fromHex('#5692BE')),
                        ),
                        pw.Text(
                          'الجدول: ${model.name} - الشعبة: ${model.section}',
                          style: pw.TextStyle(font: arabicFont, fontSize: 10, color: PdfColor.fromHex('#2F2822')),
                        ),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text(
                          'أستاذ المادة: ${profile.teacherName.isNotEmpty ? profile.teacherName : "المعلم"}',
                          style: pw.TextStyle(font: arabicFontBold, fontSize: 10, color: PdfColor.fromHex('#2F2822')),
                        ),
                        pw.Text(
                          'العام الدراسي: ${profile.academicYear}',
                          style: pw.TextStyle(font: arabicFont, fontSize: 9, color: PdfColor.fromHex('#64748B')),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 12),

              // 2. Student Scores Table
              pw.Expanded(
                child: pw.TableHelper.fromTextArray(
                  border: pw.TableBorder.all(color: PdfColor.fromHex('#CBD5E1'), width: 0.8),
                  headerStyle: pw.TextStyle(font: arabicFontBold, fontSize: 9, color: PdfColors.white),
                  headerDecoration: pw.BoxDecoration(color: PdfColor.fromHex('#3E5771')),
                  cellStyle: pw.TextStyle(font: arabicFont, fontSize: 9),
                  cellAlignment: pw.Alignment.center,
                  headers: [
                    'ت',
                    'اسم الطالب الرباعي',
                    'التحريري',
                    ...model.columns.map((c) => c.name),
                    'المجموع النهائي',
                    'التقدير',
                  ],
                  data: List.generate(model.students.length, (index) {
                    final st = model.students[index];
                    final finalScore = st.calculateFinalScore();
                    String rating = 'ناجح';
                    if (finalScore >= 90) rating = 'ممتاز';
                    else if (finalScore >= 80) rating = 'جيد جداً';
                    else if (finalScore >= 70) rating = 'جيد';
                    else if (finalScore >= 60) rating = 'متوسط';
                    else if (finalScore >= 50) rating = 'مقبول';
                    else rating = 'راسب';

                    return [
                      '${index + 1}',
                      st.name,
                      st.writtenRawScore?.toStringAsFixed(1) ?? '-',
                      ...model.columns.map((c) => st.scores[c.id]?.toStringAsFixed(1) ?? '-'),
                      finalScore.toStringAsFixed(1),
                      rating,
                    ];
                  }),
                ),
              ),
              pw.SizedBox(height: 10),

              // 3. Signatures Footer
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
                children: [
                  pw.Text('توقيع أستاذ المادة: ......................', style: pw.TextStyle(font: arabicFont, fontSize: 9)),
                  pw.Text('توقيع مدير المدرسة: ......................', style: pw.TextStyle(font: arabicFont, fontSize: 9)),
                  pw.Text('ختم الإدارة المدرسية: [        ]', style: pw.TextStyle(font: arabicFont, fontSize: 9)),
                ],
              ),
            ],
          ),
        );
      },
    ),
  );

  return doc.save();
}
