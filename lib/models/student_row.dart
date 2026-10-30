/// Individual student record inside a monthly model
class StudentRow {
  final String id;
  final String name;
  final String gradeLevel;
  final String section;
  final double? writtenRawScore;
  final Map<String, double?> scores;
  final String notes;

  const StudentRow({
    required this.id,
    required this.name,
    this.gradeLevel = '',
    this.section = '',
    this.writtenRawScore,
    this.scores = const {},
    this.notes = '',
  });

  factory StudentRow.fromJson(Map<String, dynamic> json) {
    final rawScores = json['scores'] as Map<String, dynamic>? ?? {};
    final Map<String, double?> parsedScores = {};
    rawScores.forEach((key, val) {
      parsedScores[key] = (val as num?)?.toDouble();
    });

    return StudentRow(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      gradeLevel: json['gradeLevel'] as String? ?? '',
      section: json['section'] as String? ?? '',
      writtenRawScore: (json['writtenRawScore'] as num?)?.toDouble(),
      scores: parsedScores,
      notes: json['notes'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'gradeLevel': gradeLevel,
        'section': section,
        'writtenRawScore': writtenRawScore,
        'scores': scores,
        'notes': notes,
      };

  StudentRow copyWith({
    String? id,
    String? name,
    String? gradeLevel,
    String? section,
    double? writtenRawScore,
    Map<String, double?>? scores,
    String? notes,
  }) {
    return StudentRow(
      id: id ?? this.id,
      name: name ?? this.name,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      section: section ?? this.section,
      writtenRawScore: writtenRawScore ?? this.writtenRawScore,
      scores: scores ?? this.scores,
      notes: notes ?? this.notes,
    );
  }
}

