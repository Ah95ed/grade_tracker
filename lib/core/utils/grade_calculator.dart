import '../../models/final_score_operation.dart';

/// Grade and score calculation algorithms matching ministry & teacher specifications
class GradeCalculator {
  /// Applies score rounding according to selected mode
  static double? applyRounding(
    double? score,
    String? mode, {
    double customThreshold = 0.5,
    double? maxAllowed,
  }) {
    if (score == null || score.isNaN) return null;
    if (mode == null || mode == 'none') {
      return (score * 100).round() / 100;
    }

    final int integerPart = score.floor();
    final double fraction = ((score - integerPart) * 1000).round() / 1000;

    if (fraction == 0) return integerPart.toDouble();

    double threshold = 0.5;
    if (mode == 'half_up') {
      threshold = 0.5;
    } else if (mode == 'any_fraction') {
      threshold = 0.1;
    } else if (mode == 'custom_threshold') {
      threshold = (customThreshold > 0 && customThreshold < 1) ? customThreshold : 0.5;
    }

    double rounded = (fraction >= threshold) ? (integerPart + 1).toDouble() : integerPart.toDouble();
    if (maxAllowed != null && maxAllowed > 0 && rounded > maxAllowed) {
      rounded = maxAllowed;
    }
    return rounded;
  }

  /// Applies final score mathematical operation (division, multiplication, addition, subtraction)
  static double applyOperation(double rawScore, FinalScoreOperation? op) {
    if (op == null || op.type == 'none' || op.value <= 0) return rawScore;
    double result = rawScore;
    switch (op.type) {
      case 'divide':
        result = rawScore / op.value;
        break;
      case 'multiply':
        result = rawScore * op.value;
        break;
      case 'add':
        result = rawScore + op.value;
        break;
      case 'subtract':
        result = (rawScore - op.value).clamp(0, double.infinity);
        break;
    }
    return (result * 100).round() / 100;
  }

  /// Calculates written score according to mode (raw or relative)
  static double? calculateWrittenScore({
    required double? rawScore,
    required double maxScore,
    required double effectiveWeight,
    String mode = 'raw',
  }) {
    if (rawScore == null || rawScore.isNaN) return null;
    if (mode == 'raw') {
      return (rawScore * 100).round() / 100;
    }
    final double safeMax = maxScore > 0 ? maxScore : 100;
    final double calculated = (rawScore / safeMax) * effectiveWeight;
    return (calculated * 100).round() / 100;
  }

  /// Returns rating text key and status based on score normalized to 100
  static ({String key, String status}) getRating(double? score, double maxScore) {
    if (score == null) {
      return (key: 'ratingNotRecorded', status: 'incomplete');
    }
    final double safeMax = maxScore > 0 ? maxScore : 100;
    final double percentage = (score / safeMax) * 100;

    if (percentage >= 90) return (key: 'ratingExcellent', status: 'passed');
    if (percentage >= 80) return (key: 'ratingVeryGood', status: 'passed');
    if (percentage >= 70) return (key: 'ratingGood', status: 'passed');
    if (percentage >= 60) return (key: 'ratingMedium', status: 'passed');
    if (percentage >= 50) return (key: 'ratingPass', status: 'passed');
    return (key: 'ratingFail', status: 'failed');
  }
}

