import 'package:flutter_test/flutter_test.dart';
import 'package:pdf/pdf.dart';

import '../flutter_data/models/teacher_profile.dart';
import '../flutter_data/models/monthly_model.dart';
import '../flutter_data/models/student_row.dart';
import '../flutter_data/models/custom_column.dart';
import '../flutter_data/models/term_model.dart';
import '../report_cards_pdf_templates/monthly_sheet_pdf_template.dart';
import '../report_cards_pdf_templates/term_summary_pdf_template.dart';
import '../report_cards_pdf_templates/student_individual_card_pdf_template.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const profile = TeacherProfile(
    teacherName: 'الأستاذ: علي محمد',
    schoolName: 'ثانوية المتميزين للبنين',
    subject: 'الرياضيات',
    academicYear: '2024 - 2025',
    governorate: 'بغداد - الكرخ الأولى',
  );

  const model = MonthlyModel(
    id: 'm1',
    name: 'تشرين الأول',
    gradeLevel: 'الثالث متوسط',
    section: 'أ',
    customColumns: [
      CustomColumn(id: 'col_oral', name: 'الشفهي', maxScore: 10),
      CustomColumn(id: 'col_daily', name: 'اليومي', maxScore: 10),
    ],
    students: [
      StudentRow(
        id: 's1',
        name: 'كرار حيدر جاسم',
        writtenRawScore: 88,
        scores: {'col_oral': 10, 'col_daily': 9},
      ),
      StudentRow(
        id: 's2',
        name: 'محمد باقر أحمد',
        writtenRawScore: 45,
        scores: {'col_oral': 4, 'col_daily': 5},
      ),
    ],
  );

  const term = TermModel(
    id: 't1',
    name: 'الفصل الأول',
    selectedModels: [TermSelectedModel(modelId: 'm1', weight: 1.0)],
  );

  test('buildMonthlySheetPdf generates valid non-empty PDF bytes', () async {
    final bytes = await buildMonthlySheetPdf(model: model, profile: profile);
    expect(bytes, isNotNull);
    expect(bytes.isNotEmpty, isTrue);
    expect(bytes.length, greaterThan(1000));
  });

  test('buildTermSummaryPdf generates valid non-empty PDF bytes', () async {
    final bytes = await buildTermSummaryPdf(term: term, models: [model], profile: profile);
    expect(bytes, isNotNull);
    expect(bytes.isNotEmpty, isTrue);
    expect(bytes.length, greaterThan(1000));
  });

  test('buildStudentIndividualCardPdf generates valid A5 card PDF bytes for passing student', () async {
    final bytes = await buildStudentIndividualCardPdf(
      student: model.students.first,
      model: model,
      profile: profile,
      pageFormat: PdfPageFormat.a5,
    );
    expect(bytes, isNotNull);
    expect(bytes.isNotEmpty, isTrue);
    expect(bytes.length, greaterThan(1000));
  });
}
