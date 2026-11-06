import 'package:flutter/foundation.dart';

@immutable
class StudentRow {
  final String id;
  final String name;
  final String gradeLevel;
  final String section;
  final double? writtenRawScore;
  final Map<String, double?> scores;
  final String? notes;

  const StudentRow({
    required this.id,
    required this.name,
    this.gradeLevel = '',
    this.section = 'أ',
    this.writtenRawScore,
    this.scores = const {},
    this.notes,
  });

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

  double calculateFinalScore() {
    double total = writtenRawScore ?? 0.0;
    for (final val in scores.values) {
      if (val != null) total += val;
    }
    return total;
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

  factory StudentRow.fromJson(Map<String, dynamic> json) {
    final rawScores = json['scores'] as Map<String, dynamic>? ?? {};
    final parsedScores = <String, double?>{};
    rawScores.forEach((key, value) {
      parsedScores[key] = value != null ? (value as num).toDouble() : null;
    });

    return StudentRow(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      gradeLevel: json['gradeLevel'] as String? ?? json['grade_level'] as String? ?? '',
      section: json['section'] as String? ?? 'أ',
      writtenRawScore: json['writtenRawScore'] != null
          ? (json['writtenRawScore'] as num).toDouble()
          : (json['written_raw_score'] != null ? (json['written_raw_score'] as num).toDouble() : null),
      scores: parsedScores,
      notes: json['notes'] as String?,
    );
  }
}
