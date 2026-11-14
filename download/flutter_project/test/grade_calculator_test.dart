import 'package:flutter_test/flutter_test.dart';
import 'package:grade_tracker/core/utils/grade_calculator.dart';
import 'package:grade_tracker/models/final_score_operation.dart';

void main() {
  group('GradeCalculator Tests', () {
    test('calculateWrittenScore calculates proportionally', () {
      final score = GradeCalculator.calculateWrittenScore(
        rawScore: 80,
        maxScore: 100,
        effectiveWeight: 50,
        mode: 'relative',
      );
      expect(score, 40.0);
    });

    test('calculateWrittenScore direct mode returns raw score', () {
      final score = GradeCalculator.calculateWrittenScore(
        rawScore: 45,
        maxScore: 50,
        effectiveWeight: 50,
        mode: 'raw',
      );
      expect(score, 45.0);
    });

    test('applyRounding rounds half up by default', () {
      expect(GradeCalculator.applyRounding(85.5, 'half_up'), 86.0);
      expect(GradeCalculator.applyRounding(85.4, 'half_up'), 85.0);
    });

    test('applyRounding respects custom threshold', () {
      // Threshold 0.2: 85.2 becomes 86.0
      expect(GradeCalculator.applyRounding(85.2, 'custom_threshold', customThreshold: 0.2), 86.0);
      expect(GradeCalculator.applyRounding(85.1, 'custom_threshold', customThreshold: 0.2), 85.0);
    });

    test('getRating returns correct rating and status', () {
      final excellent = GradeCalculator.getRating(95, 100);
      expect(excellent.key, 'ratingExcellent');
      expect(excellent.status, 'passed');

      final weak = GradeCalculator.getRating(40, 100);
      expect(weak.key, 'ratingFail');
      expect(weak.status, 'failed');
    });

    test('applyOperation applies addition, multiplication, etc.', () {
      const addOp = FinalScoreOperation(type: 'add', value: 5);
      expect(GradeCalculator.applyOperation(80, addOp), 85.0);

      const subOp = FinalScoreOperation(type: 'subtract', value: 3);
      expect(GradeCalculator.applyOperation(80, subOp), 77.0);
    });
  });
}
