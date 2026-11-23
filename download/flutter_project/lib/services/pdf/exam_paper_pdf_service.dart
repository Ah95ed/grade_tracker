import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../models/exam_paper.dart';

/// PDF Generation and Printing Service for Iraqi Exam Papers
class ExamPaperPdfService {
  /// Generates a printable A4 PDF Document from a SavedExamPaper
  static Future<Uint8List> generateExamPdf(SavedExamPaper paper) async {
    final pdf = pw.Document();

    // Load Arabic Font using Google Fonts with safe offline fallback
    pw.Font ttfRegular;
    pw.Font ttfBold;

    try {
      ttfRegular = await PdfGoogleFonts.cairoMedium();
      ttfBold = await PdfGoogleFonts.cairoBold();
    } catch (_) {
      ttfRegular = pw.Font.helvetica();
      ttfBold = pw.Font.helveticaBold();
    }

    // Font size scaling
    double baseFontSize;
    double headerFontSize;
    double promptFontSize;
    if (paper.fontSize == 'sm') {
      baseFontSize = 10;
      headerFontSize = 11;
      promptFontSize = 11;
    } else if (paper.fontSize == 'lg') {
      baseFontSize = 13;
      headerFontSize = 14;
      promptFontSize = 14;
    } else {
      // 'md' default
      baseFontSize = 11.5;
      headerFontSize = 12.5;
      promptFontSize = 12.5;
    }

    final digits = paper.useArabicDigits;
    final h = paper.header;

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.symmetric(horizontal: 28, vertical: 24),
        textDirection: pw.TextDirection.rtl,
        theme: pw.ThemeData.withFont(base: ttfRegular, bold: ttfBold),
        build: (pw.Context context) {
          return [
            // 1. Top Header ("الكليشة الوزارية")
            pw.Container(
              padding: const pw.EdgeInsets.only(bottom: 6),
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 1.5)),
              ),
              child: pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  // Right Header Lines
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: h.rightLines.where((l) => l.trim().isNotEmpty).map((line) {
                        return pw.Padding(
                          padding: const pw.EdgeInsets.only(bottom: 2),
                          child: pw.Text(
                            formatTextDigits(line, digits),
                            style: pw.TextStyle(
                              fontSize: headerFontSize,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  // Center Logo / Title
                  if (h.showLogo)
                    pw.Container(
                      width: 50,
                      height: 50,
                      margin: const pw.EdgeInsets.symmetric(horizontal: 10),
                      child: pw.Center(
                        child: pw.Text(
                          'جمهورية العراق\nوزارة التربية',
                          textAlign: pw.TextAlign.center,
                          style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold),
                        ),
                      ),
                    ),

                  // Left Header Lines
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: h.leftLines.where((l) => l.trim().isNotEmpty).map((line) {
                        return pw.Padding(
                          padding: const pw.EdgeInsets.only(bottom: 2),
                          child: pw.Text(
                            formatTextDigits(line, digits),
                            style: pw.TextStyle(
                              fontSize: headerFontSize,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 6),

            // 2. Student Info Row
            if (h.showStudentInfo) ...[
              pw.Container(
                padding: const pw.EdgeInsets.only(bottom: 4),
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey600, width: 0.8)),
                ),
                child: pw.Row(
                  children: [
                    pw.Expanded(
                      flex: 3,
                      child: pw.Row(
                        children: [
                          pw.Text(
                            '${h.studentNameLabel} ',
                            style: pw.TextStyle(fontSize: baseFontSize, fontWeight: pw.FontWeight.bold),
                          ),
                          pw.Expanded(
                            child: pw.Container(
                              height: 1,
                              decoration: const pw.BoxDecoration(
                                border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey500, width: 0.8, style: pw.BorderStyle.dashed)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    pw.SizedBox(width: 20),
                    pw.Expanded(
                      flex: 2,
                      child: pw.Row(
                        children: [
                          pw.Text(
                            '${h.studentNumberLabel} ',
                            style: pw.TextStyle(fontSize: baseFontSize, fontWeight: pw.FontWeight.bold),
                          ),
                          pw.Expanded(
                            child: pw.Container(
                              height: 1,
                              decoration: const pw.BoxDecoration(
                                border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey500, width: 0.8, style: pw.BorderStyle.dashed)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 4),
            ],

            // 3. General Exam Note
            if (h.showNote && h.noteText.trim().isNotEmpty) ...[
              pw.Padding(
                padding: const pw.EdgeInsets.symmetric(vertical: 4),
                child: pw.Text(
                  formatTextDigits(h.noteText, digits),
                  style: pw.TextStyle(
                    fontSize: baseFontSize,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ),
              pw.SizedBox(height: 4),
            ],

            // 4. Questions List
            ...paper.questions.map((q) {
              return pw.Container(
                margin: const pw.EdgeInsets.only(bottom: 8),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    // Main Question Line: Label + Prompt + Marks
                    pw.Row(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          '${q.label} : ',
                          style: pw.TextStyle(
                            fontSize: promptFontSize,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.Expanded(
                          child: pw.Text(
                            formatTextDigits(q.prompt, digits),
                            style: pw.TextStyle(
                              fontSize: promptFontSize,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        ),
                        if (q.marks != null && q.marks!.trim().isNotEmpty) ...[
                          pw.SizedBox(width: 8),
                          pw.Text(
                            '( ${formatTextDigits(q.marks!, digits)} )',
                            style: pw.TextStyle(
                              fontSize: baseFontSize,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        ],
                      ],
                    ),

                    // Branches
                    if (q.branches.isNotEmpty) ...[
                      pw.SizedBox(height: 4),
                      pw.Padding(
                        padding: const pw.EdgeInsets.only(right: 18),
                        child: _buildBranchesPdf(q, baseFontSize, digits),
                      ),
                    ],

                    // Dividing Line between Questions
                    if (q.hasDivider) ...[
                      pw.SizedBox(height: 8),
                      pw.Container(
                        height: 0.8,
                        color: PdfColors.grey400,
                      ),
                    ],
                  ],
                ),
              );
            }),

            // 5. Footer Text & Teacher Signature
            pw.SizedBox(height: 12),
            pw.Container(
              padding: const pw.EdgeInsets.only(top: 8),
              decoration: const pw.BoxDecoration(
                border: pw.Border(top: pw.BorderSide(color: PdfColors.black, width: 1.0)),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  if (h.teacherName != null && h.teacherName!.trim().isNotEmpty)
                    pw.Text(
                      'مدرس المادة: ${h.teacherName}',
                      style: pw.TextStyle(fontSize: baseFontSize, fontWeight: pw.FontWeight.bold),
                    )
                  else
                    pw.SizedBox(),
                  if (h.footerText != null && h.footerText!.trim().isNotEmpty)
                    pw.Text(
                      h.footerText!,
                      style: pw.TextStyle(fontSize: baseFontSize, fontWeight: pw.FontWeight.bold),
                    ),
                ],
              ),
            ),
          ];
        },
      ),
    );

    return pdf.save();
  }

  /// Builds branches in PDF according to the chosen layout
  static pw.Widget _buildBranchesPdf(ExamQuestionItem q, double fontSize, bool useArabicDigits) {
    if (q.branchLayout == ExamBranchLayout.twoCol && q.branches.length > 1) {
      // Two-column layout
      final half = (q.branches.length / 2).ceil();
      final col1 = q.branches.sublist(0, half);
      final col2 = q.branches.sublist(half);

      return pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: col1.asMap().entries.map((entry) {
                final prefix = entry.value.getPrefix(entry.key, q.branchStyle, useArabicDigits);
                return _buildSingleBranchPdf(prefix, entry.value.text, fontSize, useArabicDigits);
              }).toList(),
            ),
          ),
          pw.SizedBox(width: 14),
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: col2.asMap().entries.map((entry) {
                final prefix = entry.value.getPrefix(half + entry.key, q.branchStyle, useArabicDigits);
                return _buildSingleBranchPdf(prefix, entry.value.text, fontSize, useArabicDigits);
              }).toList(),
            ),
          ),
        ],
      );
    } else if (q.branchLayout == ExamBranchLayout.inline) {
      // Inline layout
      return pw.Wrap(
        spacing: 12,
        runSpacing: 4,
        children: q.branches.asMap().entries.map((entry) {
          final prefix = entry.value.getPrefix(entry.key, q.branchStyle, useArabicDigits);
          return pw.Text(
            '${prefix.isNotEmpty ? '$prefix ' : ''}${formatTextDigits(entry.value.text, useArabicDigits)}',
            style: pw.TextStyle(fontSize: fontSize),
          );
        }).toList(),
      );
    } else {
      // Vertical layout
      return pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: q.branches.asMap().entries.map((entry) {
          final prefix = entry.value.getPrefix(entry.key, q.branchStyle, useArabicDigits);
          return _buildSingleBranchPdf(prefix, entry.value.text, fontSize, useArabicDigits);
        }).toList(),
      );
    }
  }

  static pw.Widget _buildSingleBranchPdf(String prefix, String text, double fontSize, bool useArabicDigits) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 3),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          if (prefix.isNotEmpty)
            pw.Text(
              '$prefix ',
              style: pw.TextStyle(fontSize: fontSize, fontWeight: pw.FontWeight.bold),
            ),
          pw.Expanded(
            child: pw.Text(
              formatTextDigits(text, useArabicDigits),
              style: pw.TextStyle(fontSize: fontSize),
            ),
          ),
        ],
      ),
    );
  }

  static String formatTextDigits(String text, bool useArabicDigits) {
    if (!useArabicDigits) return text;
    return text.replaceAllMapped(RegExp(r'\d'), (m) {
      final d = int.tryParse(m.group(0) ?? '') ?? 0;
      return arabicIndicDigits[d];
    });
  }

  /// Triggers direct printing or sharing dialog
  static Future<void> printExamPaper(SavedExamPaper paper) async {
    final pdfBytes = await generateExamPdf(paper);
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfBytes,
      name: '${paper.title.isNotEmpty ? paper.title : "اسئلة_امتحانية"}.pdf',
    );
  }

  /// Triggers sharing the generated PDF file
  static Future<void> shareExamPdf(SavedExamPaper paper) async {
    final pdfBytes = await generateExamPdf(paper);
    await Printing.sharePdf(
      bytes: pdfBytes,
      filename: '${paper.title.isNotEmpty ? paper.title : "اسئلة_امتحانية"}.pdf',
    );
  }
}
