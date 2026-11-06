import 'package:flutter/foundation.dart';
import 'custom_column.dart';
import 'student_row.dart';

@immutable
class MonthlyModel {
  final String id;
  final String name;
  final String gradeLevel;
  final String section;
  final List<CustomColumn> columns;
  final List<StudentRow> students;
  final DateTime? createdAt;

  const MonthlyModel({
    required this.id,
    required this.name,
    this.gradeLevel = '',
    this.section = 'أ',
    this.columns = const [],
    this.students = const [],
    this.createdAt,
  });

  MonthlyModel copyWith({
    String? id,
    String? name,
    String? gradeLevel,
    String? section,
    List<CustomColumn>? columns,
    List<StudentRow>? students,
    DateTime? createdAt,
  }) {
    return MonthlyModel(
      id: id ?? this.id,
      name: name ?? this.name,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      section: section ?? this.section,
      columns: columns ?? this.columns,
      students: students ?? this.students,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'gradeLevel': gradeLevel,
    'section': section,
    'columns': columns.map((c) => c.toJson()).toList(),
    'students': students.map((s) => s.toJson()).toList(),
    'createdAt': createdAt?.toIso8601String(),
  };

  factory MonthlyModel.fromJson(Map<String, dynamic> json) => MonthlyModel(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    gradeLevel: json['gradeLevel'] as String? ?? json['grade_level'] as String? ?? '',
    section: json['section'] as String? ?? 'أ',
    columns: (json['columns'] as List<dynamic>? ?? [])
        .map((e) => CustomColumn.fromJson(e as Map<String, dynamic>))
        .toList(),
    students: (json['students'] as List<dynamic>? ?? [])
        .map((e) => StudentRow.fromJson(e as Map<String, dynamic>))
        .toList(),
    createdAt: json['createdAt'] != null
        ? DateTime.tryParse(json['createdAt'] as String)
        : (json['created_at'] != null ? DateTime.tryParse(json['created_at'] as String) : null),
  );
}
