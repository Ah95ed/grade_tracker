import 'custom_column.dart';
import 'student_row.dart';
import 'final_score_operation.dart';

/// Monthly grade model sheet representing a full class assessment table
class MonthlyModel {
  final String id;
  final String name;
  final String subject;
  final String gradeLevel;
  final String academicYear;
  final double totalMaxScore;
  final double? writtenWeight;
  final double writtenMaxScore;
  final String writtenScoreMode; // 'raw' or 'relative'
  final List<CustomColumn> customColumns;
  final List<StudentRow> students;
  final String roundingMode; // 'none', 'half_up', 'any_fraction', 'custom_threshold'
  final double roundingThreshold;
  final FinalScoreOperation finalScoreOperation;
  final String createdAt;

  const MonthlyModel({
    required this.id,
    required this.name,
    this.subject = '',
    this.gradeLevel = '',
    this.academicYear = '',
    this.totalMaxScore = 100.0,
    this.writtenWeight,
    this.writtenMaxScore = 100.0,
    this.writtenScoreMode = 'raw',
    this.customColumns = const [],
    this.students = const [],
    this.roundingMode = 'none',
    this.roundingThreshold = 0.5,
    this.finalScoreOperation = const FinalScoreOperation(),
    required this.createdAt,
  });

  factory MonthlyModel.fromJson(Map<String, dynamic> json) {
    return MonthlyModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      gradeLevel: json['gradeLevel'] as String? ?? '',
      academicYear: json['academicYear'] as String? ?? '',
      totalMaxScore: (json['totalMaxScore'] as num?)?.toDouble() ?? 100.0,
      writtenWeight: (json['writtenWeight'] as num?)?.toDouble(),
      writtenMaxScore: (json['writtenMaxScore'] as num?)?.toDouble() ?? 100.0,
      writtenScoreMode: json['writtenScoreMode'] as String? ?? 'raw',
      customColumns: (json['customColumns'] as List<dynamic>? ?? [])
          .map((c) => CustomColumn.fromJson(c as Map<String, dynamic>))
          .toList(),
      students: (json['students'] as List<dynamic>? ?? [])
          .map((s) => StudentRow.fromJson(s as Map<String, dynamic>))
          .toList(),
      roundingMode: json['roundingMode'] as String? ?? 'none',
      roundingThreshold: (json['roundingThreshold'] as num?)?.toDouble() ?? 0.5,
      finalScoreOperation: json['finalScoreOperation'] != null
          ? FinalScoreOperation.fromJson(json['finalScoreOperation'] as Map<String, dynamic>)
          : const FinalScoreOperation(),
      createdAt: json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'subject': subject,
        'gradeLevel': gradeLevel,
        'academicYear': academicYear,
        'totalMaxScore': totalMaxScore,
        'writtenWeight': writtenWeight,
        'writtenMaxScore': writtenMaxScore,
        'writtenScoreMode': writtenScoreMode,
        'customColumns': customColumns.map((c) => c.toJson()).toList(),
        'students': students.map((s) => s.toJson()).toList(),
        'roundingMode': roundingMode,
        'roundingThreshold': roundingThreshold,
        'finalScoreOperation': finalScoreOperation.toJson(),
        'createdAt': createdAt,
      };

  MonthlyModel copyWith({
    String? id,
    String? name,
    String? subject,
    String? gradeLevel,
    String? academicYear,
    double? totalMaxScore,
    double? writtenWeight,
    double? writtenMaxScore,
    String? writtenScoreMode,
    List<CustomColumn>? customColumns,
    List<StudentRow>? students,
    String? roundingMode,
    double? roundingThreshold,
    FinalScoreOperation? finalScoreOperation,
    String? createdAt,
  }) {
    return MonthlyModel(
      id: id ?? this.id,
      name: name ?? this.name,
      subject: subject ?? this.subject,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      academicYear: academicYear ?? this.academicYear,
      totalMaxScore: totalMaxScore ?? this.totalMaxScore,
      writtenWeight: writtenWeight ?? this.writtenWeight,
      writtenMaxScore: writtenMaxScore ?? this.writtenMaxScore,
      writtenScoreMode: writtenScoreMode ?? this.writtenScoreMode,
      customColumns: customColumns ?? this.customColumns,
      students: students ?? this.students,
      roundingMode: roundingMode ?? this.roundingMode,
      roundingThreshold: roundingThreshold ?? this.roundingThreshold,
      finalScoreOperation: finalScoreOperation ?? this.finalScoreOperation,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

