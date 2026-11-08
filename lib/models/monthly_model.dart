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
  final String teacherName;
  final String section;
  final List<String> assignedSections;
  final Map<String, String> columnLabels;
  final Map<String, String> columnSlants;
  final String createdAt;
  final String updatedAt;

  const MonthlyModel({
    required this.id,
    required this.name,
    this.subject = '',
    this.gradeLevel = '',
    this.section = '',
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
    this.teacherName = '',
    this.assignedSections = const [],
    this.columnLabels = const {},
    this.columnSlants = const {},
    this.createdAt = '',
    this.updatedAt = '',
  });

  /// Compatibility getter for columns
  List<CustomColumn> get columns => customColumns;

  /// Effective column label (e.g. 'studentName', 'gradeLevel', 'section', 'subject', 'writtenExam', 'finalScore', 'rating')
  String getColumnLabel(String key, String defaultLabel) {
    final custom = columnLabels[key]?.trim();
    if (custom != null && custom.isNotEmpty) {
      return custom;
    }
    return defaultLabel;
  }

  /// Column text slant ('normal', 'italic', 'vertical')
  String getColumnSlant(String key) {
    return columnSlants[key] ?? 'normal';
  }

  /// Effective list of sections
  List<String> get effectiveSections => assignedSections.isNotEmpty
      ? assignedSections
      : (section.isNotEmpty ? [section] : const []);

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
      teacherName: json['teacherName'] as String? ?? '',
      assignedSections: (json['assignedSections'] as List<dynamic>? ?? [])
          .map((sec) => sec.toString())
          .toList(),
      columnLabels: (json['columnLabels'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v.toString()),
          ) ??
          const {},
      columnSlants: (json['columnSlants'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v.toString()),
          ) ??
          const {},
      createdAt: json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      updatedAt: json['updatedAt'] as String? ?? '',
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
        if (teacherName.isNotEmpty) 'teacherName': teacherName,
        if (assignedSections.isNotEmpty) 'assignedSections': assignedSections,
        if (columnLabels.isNotEmpty) 'columnLabels': columnLabels,
        if (columnSlants.isNotEmpty) 'columnSlants': columnSlants,
        'createdAt': createdAt,
        if (updatedAt.isNotEmpty) 'updatedAt': updatedAt,
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
    String? teacherName,
    List<String>? assignedSections,
    Map<String, String>? columnLabels,
    Map<String, String>? columnSlants,
    String? createdAt,
    String? updatedAt,
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
      teacherName: teacherName ?? this.teacherName,
      assignedSections: assignedSections ?? this.assignedSections,
      columnLabels: columnLabels ?? this.columnLabels,
      columnSlants: columnSlants ?? this.columnSlants,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
