import 'attendance_record.dart';

/// Individual student record inside a monthly model
class StudentRow {
  final String id;
  final String name;
  final String gradeLevel;
  final String section;
  final double? writtenRawScore;
  final Map<String, double?> scores;
  final Map<String, List<AttendanceRecord>> attendanceRecords;
  final String notes;

  const StudentRow({
    required this.id,
    required this.name,
    this.gradeLevel = '',
    this.section = '',
    this.writtenRawScore,
    this.scores = const {},
    this.attendanceRecords = const {},
    this.notes = '',
  });

  factory StudentRow.fromJson(Map<String, dynamic> json) {
    final rawScores = json['scores'] as Map<String, dynamic>? ?? {};
    final Map<String, double?> parsedScores = {};
    rawScores.forEach((key, val) {
      parsedScores[key] = (val as num?)?.toDouble();
    });

    final rawAtt = json['attendanceRecords'] as Map<String, dynamic>? ?? {};
    final Map<String, List<AttendanceRecord>> parsedAtt = {};
    rawAtt.forEach((key, val) {
      if (val is List) {
        parsedAtt[key] = val
            .map((item) => AttendanceRecord.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    });

    return StudentRow(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      gradeLevel: json['gradeLevel'] as String? ?? '',
      section: json['section'] as String? ?? '',
      writtenRawScore: (json['writtenRawScore'] as num?)?.toDouble(),
      scores: parsedScores,
      attendanceRecords: parsedAtt,
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
        if (attendanceRecords.isNotEmpty)
          'attendanceRecords': attendanceRecords.map(
            (k, v) => MapEntry(k, v.map((r) => r.toJson()).toList()),
          ),
        'notes': notes,
      };

  StudentRow copyWith({
    String? id,
    String? name,
    String? gradeLevel,
    String? section,
    double? writtenRawScore,
    Map<String, double?>? scores,
    Map<String, List<AttendanceRecord>>? attendanceRecords,
    String? notes,
  }) {
    return StudentRow(
      id: id ?? this.id,
      name: name ?? this.name,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      section: section ?? this.section,
      writtenRawScore: writtenRawScore ?? this.writtenRawScore,
      scores: scores ?? this.scores,
      attendanceRecords: attendanceRecords ?? this.attendanceRecords,
      notes: notes ?? this.notes,
    );
  }
}
