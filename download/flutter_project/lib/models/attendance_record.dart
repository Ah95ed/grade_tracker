/// Represents an attendance entry for a student on a specific date
class AttendanceRecord {
  final String id;
  final String date; // YYYY-MM-DD
  final String dayName; // الأحد، الإثنين، الثلاثاء...
  final String status; // 'present', 'excused', 'absent'
  final String? note;
  final String? createdAt;
  final String? modelId;
  final String? modelName;

  const AttendanceRecord({
    required this.id,
    required this.date,
    required this.dayName,
    required this.status,
    this.note,
    this.createdAt,
    this.modelId,
    this.modelName,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] as String? ?? '',
      date: json['date'] as String? ?? '',
      dayName: json['dayName'] as String? ?? '',
      status: json['status'] as String? ?? 'absent',
      note: json['note'] as String?,
      createdAt: json['createdAt'] as String?,
      modelId: json['modelId'] as String?,
      modelName: json['modelName'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'date': date,
        'dayName': dayName,
        'status': status,
        if (note != null && note!.isNotEmpty) 'note': note,
        if (createdAt != null) 'createdAt': createdAt,
        if (modelId != null) 'modelId': modelId,
        if (modelName != null) 'modelName': modelName,
      };

  AttendanceRecord copyWith({
    String? id,
    String? date,
    String? dayName,
    String? status,
    String? note,
    String? createdAt,
    String? modelId,
    String? modelName,
  }) {
    return AttendanceRecord(
      id: id ?? this.id,
      date: date ?? this.date,
      dayName: dayName ?? this.dayName,
      status: status ?? this.status,
      note: note ?? this.note,
      createdAt: createdAt ?? this.createdAt,
      modelId: modelId ?? this.modelId,
      modelName: modelName ?? this.modelName,
    );
  }
}

