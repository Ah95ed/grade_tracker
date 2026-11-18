import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/models/term_model.dart';
import 'package:grade_tracker/models/monthly_model.dart';
import 'package:grade_tracker/models/student_row.dart';
import 'package:grade_tracker/controllers/term_controller.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/services/storage_service.dart';

void main() {
  group('TermModel Aggregate & Ordering Tests (Section 4)', () {
    test('orderTermsWithAggregates anchors aggregate terms behind their source terms', () {
      const t1 = TermModel(id: 't1', name: 'الفصل الأول');
      const t2 = TermModel(id: 't2', name: 'الفصل الثاني');
      const tAnnual = TermModel(
        id: 't_annual',
        name: 'السعي السنوي',
        sourceType: 'terms',
        selectedTermIds: ['t1', 't2'],
      );

      final unordered = [tAnnual, t1, t2];
      final ordered = orderTermsWithAggregates(unordered);

      expect(ordered.map((t) => t.id).toList(), ['t1', 't2', 't_annual']);
    });

    test('Circular dependency is prevented in term calculations', () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final sheetCtrl = MonthlySheetController(storage);
      final termCtrl = TermController(storage);

      // Create a test student in a monthly model
      const student = StudentRow(
        id: 's1',
        name: 'حيدر علي',
        gradeLevel: 'الأول متوسط',
        section: 'أ',
        writtenRawScore: 90.0,
      );
      final month1 = MonthlyModel(
        id: 'm1',
        name: 'شهر تشرين',
        students: [student],
        totalMaxScore: 100.0,
      );
      sheetCtrl.setModels([month1]);

      // Term A points to Month 1
      const termA = TermModel(
        id: 'term_a',
        name: 'فصل أ',
        selectedModelIds: ['m1'],
      );

      // Term B points to Term A
      const termB = TermModel(
        id: 'term_b',
        name: 'فصل ب',
        sourceType: 'terms',
        selectedTermIds: ['term_a'],
      );

      // Term C points to Term B and erroneously back to Term C or Term B (cycle)
      const termC = TermModel(
        id: 'term_c',
        name: 'فصل ج (تجميعي مع دورة)',
        sourceType: 'terms',
        selectedTermIds: ['term_b', 'term_c'],
      );

      await termCtrl.setTerms([termA, termB, termC]);
      termCtrl.setActiveTerm('term_c');

      // Calculation should terminate normally without stack overflow
      final summaries = termCtrl.calculateSummaries(sheetCtrl);
      expect(summaries, isNotEmpty);
      expect(summaries.first.studentName, 'حيدر علي');
      expect(summaries.first.finalTermScore, 90.0);
    });
  });
}
