/// Custom dynamic column for a monthly sheet (oral, behavior, activity, attendance, etc.)
class CustomColumn {
  final String id;
  final String name;
  final double maxScore;
  final bool isAttendance;
  final bool affectsGrade;

  const CustomColumn({
    required this.id,
    required this.name,
    required this.maxScore,
    this.isAttendance = false,
    this.affectsGrade = true,
  });

  factory CustomColumn.fromJson(Map<String, dynamic> json) {
    final attendanceConfig = json['attendanceConfig'] as Map<String, dynamic>?;
    final configAffects = attendanceConfig != null ? (attendanceConfig['affectsGrade'] as bool?) : null;

    return CustomColumn(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      maxScore: (json['maxScore'] as num?)?.toDouble() ?? 10.0,
      isAttendance: json['isAttendance'] as bool? ?? (attendanceConfig != null),
      affectsGrade: json['affectsGrade'] as bool? ?? (configAffects ?? true),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'maxScore': maxScore,
        if (isAttendance) 'isAttendance': isAttendance,
        if (!affectsGrade) 'affectsGrade': affectsGrade,
      };

  CustomColumn copyWith({
    String? id,
    String? name,
    double? maxScore,
    bool? isAttendance,
    bool? affectsGrade,
  }) {
    return CustomColumn(
      id: id ?? this.id,
      name: name ?? this.name,
      maxScore: maxScore ?? this.maxScore,
      isAttendance: isAttendance ?? this.isAttendance,
      affectsGrade: affectsGrade ?? this.affectsGrade,
    );
  }
}


