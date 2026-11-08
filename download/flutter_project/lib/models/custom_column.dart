/// Custom dynamic column for a monthly sheet (oral, behavior, activity, attendance, etc.)
class CustomColumn {
  final String id;
  final String name;
  final double maxScore;
  final bool isAttendance;
  final bool affectsGrade;
  final String absentAction; // 'deduct', 'add', 'none'
  final double absentPoints;
  final String excusedAction; // 'none', 'deduct', 'add'
  final double excusedPoints;
  final String presentAction; // 'none', 'add', 'deduct'
  final double presentPoints;
  final String crossMonthMode; // 'fresh' | 'merge'
  final List<String> priorModelIds;

  const CustomColumn({
    required this.id,
    required this.name,
    required this.maxScore,
    this.isAttendance = false,
    this.affectsGrade = true,
    this.absentAction = 'deduct',
    this.absentPoints = 1.0,
    this.excusedAction = 'none',
    this.excusedPoints = 0.0,
    this.presentAction = 'none',
    this.presentPoints = 0.0,
    this.crossMonthMode = 'fresh',
    this.priorModelIds = const [],
  });

  factory CustomColumn.fromJson(Map<String, dynamic> json) {
    final attendanceConfig = json['attendanceConfig'] as Map<String, dynamic>?;
    final configAffects = attendanceConfig != null ? (attendanceConfig['affectsGrade'] as bool?) : null;

    final absentMap = attendanceConfig?['absent'] as Map<String, dynamic>?;
    final excusedMap = attendanceConfig?['excused'] as Map<String, dynamic>?;
    final presentMap = attendanceConfig?['present'] as Map<String, dynamic>?;

    return CustomColumn(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      maxScore: (json['maxScore'] as num?)?.toDouble() ?? 10.0,
      isAttendance: json['isAttendance'] as bool? ?? (attendanceConfig != null),
      affectsGrade: json['affectsGrade'] as bool? ?? (configAffects ?? true),
      absentAction: json['absentAction'] as String? ?? (absentMap?['action'] as String? ?? 'deduct'),
      absentPoints: (json['absentPoints'] as num?)?.toDouble() ?? ((absentMap?['points'] as num?)?.toDouble() ?? 1.0),
      excusedAction: json['excusedAction'] as String? ?? (excusedMap?['action'] as String? ?? 'none'),
      excusedPoints: (json['excusedPoints'] as num?)?.toDouble() ?? ((excusedMap?['points'] as num?)?.toDouble() ?? 0.0),
      presentAction: json['presentAction'] as String? ?? (presentMap?['action'] as String? ?? 'none'),
      presentPoints: (json['presentPoints'] as num?)?.toDouble() ?? ((presentMap?['points'] as num?)?.toDouble() ?? 0.0),
      crossMonthMode: json['crossMonthMode'] as String? ?? (attendanceConfig?['crossMonthMode'] as String? ?? 'fresh'),
      priorModelIds: (json['priorModelIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          ((attendanceConfig?['importedFromModelIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const []),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'maxScore': maxScore,
        if (isAttendance) 'isAttendance': isAttendance,
        if (!affectsGrade) 'affectsGrade': affectsGrade,
        if (isAttendance) ...{
          'attendanceConfig': {
            'affectsGrade': affectsGrade,
            'absent': {'action': absentAction, 'points': absentPoints},
            'excused': {'action': excusedAction, 'points': excusedPoints},
            'present': {'action': presentAction, 'points': presentPoints},
            'crossMonthMode': crossMonthMode,
            'importedFromModelIds': priorModelIds,
          },
        },
      };

  CustomColumn copyWith({
    String? id,
    String? name,
    double? maxScore,
    bool? isAttendance,
    bool? affectsGrade,
    String? absentAction,
    double? absentPoints,
    String? excusedAction,
    double? excusedPoints,
    String? presentAction,
    double? presentPoints,
    String? crossMonthMode,
    List<String>? priorModelIds,
  }) {
    return CustomColumn(
      id: id ?? this.id,
      name: name ?? this.name,
      maxScore: maxScore ?? this.maxScore,
      isAttendance: isAttendance ?? this.isAttendance,
      affectsGrade: affectsGrade ?? this.affectsGrade,
      absentAction: absentAction ?? this.absentAction,
      absentPoints: absentPoints ?? this.absentPoints,
      excusedAction: excusedAction ?? this.excusedAction,
      excusedPoints: excusedPoints ?? this.excusedPoints,
      presentAction: presentAction ?? this.presentAction,
      presentPoints: presentPoints ?? this.presentPoints,
      crossMonthMode: crossMonthMode ?? this.crossMonthMode,
      priorModelIds: priorModelIds ?? this.priorModelIds,
    );
  }
}
