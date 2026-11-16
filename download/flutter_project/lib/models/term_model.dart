/// Term model used for averaging and calculating quarterly/annual performance
class TermModel {
  final String id;
  final String name;
  final String subject;
  final String gradeLevel;
  final String teacherName;
  final List<String> assignedSections;
  final List<String> selectedModelIds;
  final String calculationMode; // 'average', 'single', 'sum'
  final String roundingMode;
  final double roundingThreshold;
  final String notes;

  const TermModel({
    required this.id,
    required this.name,
    this.subject = '',
    this.gradeLevel = '',
    this.teacherName = '',
    this.assignedSections = const [],
    this.selectedModelIds = const [],
    this.calculationMode = 'average',
    this.roundingMode = 'none',
    this.roundingThreshold = 0.5,
    this.notes = '',
  });

  factory TermModel.fromJson(Map<String, dynamic> json) {
    return TermModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      gradeLevel: json['gradeLevel'] as String? ?? '',
      teacherName: json['teacherName'] as String? ?? '',
      assignedSections: (json['assignedSections'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      selectedModelIds: (json['selectedModelIds'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      calculationMode: json['calculationMode'] as String? ?? 'average',
      roundingMode: json['roundingMode'] as String? ?? 'none',
      roundingThreshold: (json['roundingThreshold'] as num?)?.toDouble() ?? 0.5,
      notes: json['notes'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'subject': subject,
        'gradeLevel': gradeLevel,
        'teacherName': teacherName,
        'assignedSections': assignedSections,
        'selectedModelIds': selectedModelIds,
        'calculationMode': calculationMode,
        'roundingMode': roundingMode,
        'roundingThreshold': roundingThreshold,
        'notes': notes,
      };

  TermModel copyWith({
    String? id,
    String? name,
    String? subject,
    String? gradeLevel,
    String? teacherName,
    List<String>? assignedSections,
    List<String>? selectedModelIds,
    String? calculationMode,
    String? roundingMode,
    double? roundingThreshold,
    String? notes,
  }) {
    return TermModel(
      id: id ?? this.id,
      name: name ?? this.name,
      subject: subject ?? this.subject,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      teacherName: teacherName ?? this.teacherName,
      assignedSections: assignedSections ?? this.assignedSections,
      selectedModelIds: selectedModelIds ?? this.selectedModelIds,
      calculationMode: calculationMode ?? this.calculationMode,
      roundingMode: roundingMode ?? this.roundingMode,
      roundingThreshold: roundingThreshold ?? this.roundingThreshold,
      notes: notes ?? this.notes,
    );
  }
}

