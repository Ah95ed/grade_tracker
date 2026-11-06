import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../flutter_data/models/teacher_profile.dart';
import '../flutter_data/models/monthly_model.dart';
import '../flutter_data/models/student_row.dart';

/// قالب PDF لبطاقة درجات الطالب الفردية (A5 Landscape / Portrait)
Future<Uint8List> buildStudentIndividualCardPdf({
  required StudentRow student,
  required MonthlyModel model,
  required TeacherProfile profile,
  PdfPageFormat pageFormat = PdfPageFormat.a5,
}) async {
  final doc = pw.Document();
  final arabicFont = await PdfGoogleFonts.cairoMedium();
  final arabicFontBold = await PdfGoogleFonts.cairoBold();

  final finalScore = student.calculateFinalScore();
  final isPass = finalScore >= 50.0;

  doc.addPage(
    pw.Page(
      pageFormat: pageFormat,
      textDirection: pw.TextDirection.rtl,
      build: (pw.Context context) {
        return pw.Container(
          padding: const pw.EdgeInsets.all(16),
          decoration: pw.BoxDecoration(
            border: pw.Border.all(color: PdfColor.fromHex('#BA916C'), width: 2),
            borderRadius: const pw.BorderRadius.all(pw.Radius.circular(12)),
          ),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              // 1. Header Emblem
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      'جمهورية العراق - وزارة التربية',
                      style: pw.TextStyle(font: arabicFont, fontSize: 10, color: PdfColor.fromHex('#64748B')),
                    ),
                    pw.Text(
                      profile.schoolName.isNotEmpty ? profile.schoolName : 'المدرسة المعتمدة',
                      style: pw.TextStyle(font: arabicFontBold, fontSize: 13, color: PdfColor.fromHex('#2F2822')),
                    ),
                    pw.Text(
                      'بطاقة التقييم والدرجات الشهرية الفردية',
                      style: pw.TextStyle(font: arabicFontBold, fontSize: 12, color: PdfColor.fromHex('#5692BE')),
                    ),
                  ],
                ),
              ),
              pw.Divider(color: PdfColor.fromHex('#E2E8F0'), thickness: 1),
              pw.SizedBox(height: 8),

              // 2. Student Info Card
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: pw.BoxDecoration(
                  color: PdfColor.fromHex('#FAF6EC'),
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('اسم الطالب: ${student.name}', style: pw.TextStyle(font: arabicFontBold, fontSize: 11)),
                    pw.Text('الصف: ${student.gradeLevel.isNotEmpty ? student.gradeLevel : "المرحلة"}', style: pw.TextStyle(font: arabicFont, fontSize: 10)),
                    pw.Text('الشعبة: ${student.section}', style: pw.TextStyle(font: arabicFont, fontSize: 10)),
                  ],
                ),
              ),
              pw.SizedBox(height: 12),

              // 3. Score Breakdown Table
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: PdfColor.fromHex('#CBD5E1')),
                headerStyle: pw.TextStyle(font: arabicFontBold, fontSize: 9, color: PdfColors.white),
                headerDecoration: pw.BoxDecoration(color: PdfColor.fromHex('#4E7A68')),
                cellStyle: pw.TextStyle(font: arabicFont, fontSize: 9),
                cellAlignment: pw.Alignment.center,
                headers: ['المجال / النشاط', 'الدرجة المستحقة', 'الدرجة العظمى'],
                data: [
                  ['الامتحان التحريري', student.writtenRawScore?.toStringAsFixed(1) ?? '-', '100'],
                  ...model.columns.map((c) => [c.name, student.scores[c.id]?.toStringAsFixed(1) ?? '-', c.maxScore.toStringAsFixed(0)]),
                  ['المعدل الكلي', finalScore.toStringAsFixed(1), '100'],
                ],
              ),
              pw.SizedBox(height: 12),

              // 4. Result Evaluation Badge
              pw.Container(
                padding: const pw.EdgeInsets.all(8),
                decoration: pw.BoxDecoration(
                  color: isPass ? PdfColor.fromHex('#ECFDF5') : PdfColor.fromHex('#FEF2F2'),
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                  border: pw.Border.all(color: isPass ? PdfColor.fromHex('#10B981') : PdfColor.fromHex('#EF4444')),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'النتيجة النهائية: ${isPass ? "ناجح ومستوفي المتطلبات" : "راسب - يحتاج إلى متابعة"}',
                      style: pw.TextStyle(
                        font: arabicFontBold,
                        fontSize: 11,
                        color: isPass ? PdfColor.fromHex('#047857') : PdfColor.fromHex('#B91C1C'),
                      ),
                    ),
                    pw.Text(
                      'المعدل: ${finalScore.toStringAsFixed(1)}%',
                      style: pw.TextStyle(font: arabicFontBold, fontSize: 12),
                    ),
                  ],
                ),
              ),
              pw.Spacer(),

              // 5. Teacher Stamp & Remarks
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('ملاحظات الأستاذ: ........................................', style: pw.TextStyle(font: arabicFont, fontSize: 8)),
                  pw.Text('توقيع أستاذ المادة: ......................', style: pw.TextStyle(font: arabicFont, fontSize: 8)),
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
