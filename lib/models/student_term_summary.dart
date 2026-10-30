/// Calculated term performance summary for a student
class StudentTermSummary {
  final String studentName;
  final String gradeLevel;
  final String section;
  final Map<String, double?> monthlyScores; // modelName -> score
  final double? rawTermScore;
  final double? finalTermScore;
  final double termMaxScore;
  final String ratingKey;
  final String status;

  const StudentTermSummary({
    required this.studentName,
    required this.gradeLevel,
    required this.section,
    required this.monthlyScores,
    this.rawTermScore,
    this.finalTermScore,
    this.termMaxScore = 100.0,
    required this.ratingKey,
    required this.status,
  });
}

