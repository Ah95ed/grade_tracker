import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../models/teacher_profile.dart';
import '../../models/monthly_model.dart';

/// PDF template for monthly grade sheets (A4 Landscape)
Future<Uint8List> buildMonthlySheetPdf({
  required MonthlyModel model,
  required TeacherProfile profile,
  PdfPageFormat pageFormat = PdfPageFormat.a4,
}) async {
  final doc = pw.Document();

  // Load Cairo fonts for Arabic calligraphy
  pw.Font arabicFont;
  pw.Font arabicFontBold;

  try {
    arabicFont = await PdfGoogleFonts.cairoMedium();
    arabicFontBold = await PdfGoogleFonts.cairoBold();
  } catch (_) {
    arabicFont = pw.Font.helvetica();
    arabicFontBold = pw.Font.helveticaBold();
  }

  final schoolName = profile.schoolName.isNotEmpty ? profile.schoolName : 'المدرسة';
  final governorate = profile.governorate.isNotEmpty ? profile.governorate : 'العراق';
  final teacherName = model.teacherName.isNotEmpty
      ? model.teacherName
      : (profile.teacherName.isNotEmpty ? profile.teacherName : 'أستاذ المادة');

  doc.addPage(
    pw.MultiPage(
      pageFormat: pageFormat.landscape,
      textDirection: pw.TextDirection.rtl,
      margin: const pw.EdgeInsets.all(20),
      build: (pw.Context context) {
        return [
          // 1. Header Banner
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: pw.BoxDecoration(
              color: PdfColor.fromHex('#FAF7EC'),
              borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
              border: pw.Border.all(color: PdfColor.fromHex('#D5C8B2'), width: 1.2),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      schoolName,
                      style: pw.TextStyle(font: arabicFontBold, fontSize: 13, color: PdfColor.fromHex('#2F2822')),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      'المحافظة: $governorate',
                      style: pw.TextStyle(font: arabicFont, fontSize: 10, color: PdfColor.fromHex('#64748B')),
                    ),
                    if (profile.schoolType.isNotEmpty)
                      pw.Text(
                        'نوع التعليم: ${profile.schoolType}',
                        style: pw.TextStyle(font: arabicFont, fontSize: 9, color: PdfColor.fromHex('#64748B')),
                      ),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Text(
                      'كشف درجات الطلاب الشهري',
                      style: pw.TextStyle(font: arabicFontBold, fontSize: 15, color: PdfColor.fromHex('#2B6CB0')),
                    ),
                    pw.SizedBox(height: 3),
                    pw.Text(
                      'النموذج: ${model.name}  |  المادة: ${model.subject.isNotEmpty ? model.subject : "-"}',
                      style: pw.TextStyle(font: arabicFontBold, fontSize: 11, color: PdfColor.fromHex('#1E293B')),
                    ),
                    pw.Text(
                      'الصف: ${model.gradeLevel.isNotEmpty ? model.gradeLevel : "-"}  |  الشعبة: ${model.section.isNotEmpty ? model.section : "جميع الشُعب"}',
                      style: pw.TextStyle(font: arabicFont, fontSize: 10, color: PdfColor.fromHex('#475569')),
                    ),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Text(
                      'الأستاذ: $teacherName',
                      style: pw.TextStyle(font: arabicFontBold, fontSize: 11, color: PdfColor.fromHex('#2F2822')),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      'السنة الدراسية: ${model.academicYear.isNotEmpty ? model.academicYear : profile.academicYear}',
                      style: pw.TextStyle(font: arabicFont, fontSize: 10, color: PdfColor.fromHex('#64748B')),
                    ),
                    pw.Text(
                      'الدرجة الكلية: ${model.totalMaxScore.toInt()} درجة',
                      style: pw.TextStyle(font: arabicFontBold, fontSize: 10, color: PdfColor.fromHex('#15803D')),
                    ),
                  ],
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 12),

          // 2. Data Table
          pw.TableHelper.fromTextArray(
            border: pw.TableBorder.all(color: PdfColor.fromHex('#CBD5E1'), width: 0.8),
            headerStyle: pw.TextStyle(font: arabicFontBold, fontSize: 9.5, color: PdfColors.white),
            headerDecoration: pw.BoxDecoration(color: PdfColor.fromHex('#2B6CB0')),
            cellStyle: pw.TextStyle(font: arabicFont, fontSize: 9),
            cellAlignment: pw.Alignment.center,
            headers: [
              'ت',
              model.getColumnLabel('studentName', 'اسم الطالب'),
              model.getColumnLabel('section', 'الشعبة'),
              '${model.getColumnLabel("writtenExam", "التحريري")} (${model.writtenMaxScore.toInt()})',
              ...model.customColumns.map((c) => '${c.name} (${c.maxScore.toInt()})'),
              '${model.getColumnLabel("finalScore", "النهائي")} (${model.totalMaxScore.toInt()})',
              model.getColumnLabel('rating', 'التقدير'),
            ],
            data: List.generate(model.students.length, (index) {
              final st = model.students[index];

              // Calculate final score
              double total = 0.0;
              bool hasScore = false;
              if (st.writtenRawScore != null) {
                total += st.writtenRawScore!;
                hasScore = true;
              }
              for (final col in model.customColumns) {
                final sc = st.scores[col.id];
                if (sc != null) {
                  total += sc;
                  hasScore = true;
                }
              }

              String finalScoreStr = '-';
              String rating = '-';
              if (hasScore) {
                finalScoreStr = total.toStringAsFixed(1).replaceAll('.0', '');
                final pct = (total / model.totalMaxScore) * 100;
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

              return [
                '${index + 1}',
                st.name,
                st.section,
                st.writtenRawScore != null ? st.writtenRawScore!.toStringAsFixed(1).replaceAll('.0', '') : '-',
                ...model.customColumns.map((c) =>
                    st.scores[c.id] != null ? st.scores[c.id]!.toStringAsFixed(1).replaceAll('.0', '') : '-'),
                finalScoreStr,
                rating,
              ];
            }),
          ),
          pw.SizedBox(height: 14),

          // 3. Signatures Footer
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
            children: [
              pw.Text('توقيع أستاذ المادة: ................................',
                  style: pw.TextStyle(font: arabicFont, fontSize: 10)),
              pw.Text('توقيع مدير المدرسة: ................................',
                  style: pw.TextStyle(font: arabicFont, fontSize: 10)),
              pw.Text('ختم الإدارة المدرسية: [                                ]',
                  style: pw.TextStyle(font: arabicFont, fontSize: 10)),
            ],
          ),
        ];
      },
    ),
  );

  return doc.save();
}
