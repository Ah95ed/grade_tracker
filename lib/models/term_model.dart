/// Term model used for averaging and calculating quarterly/annual performance
class TermModel {
  final String id;
  final String name;
  final String subject;
  final String gradeLevel;
  final List<String> selectedModelIds;
  final String calculationMode; // 'average', 'single', 'sum'
  final String roundingMode;
  final double roundingThreshold;

  const TermModel({
    required this.id,
    required this.name,
    this.subject = '',
    this.gradeLevel = '',
    this.selectedModelIds = const [],
    this.calculationMode = 'average',
    this.roundingMode = 'none',
    this.roundingThreshold = 0.5,
  });

  factory TermModel.fromJson(Map<String, dynamic> json) {
    return TermModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      gradeLevel: json['gradeLevel'] as String? ?? '',
      selectedModelIds: (json['selectedModelIds'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      calculationMode: json['calculationMode'] as String? ?? 'average',
      roundingMode: json['roundingMode'] as String? ?? 'none',
      roundingThreshold: (json['roundingThreshold'] as num?)?.toDouble() ?? 0.5,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'subject': subject,
        'gradeLevel': gradeLevel,
        'selectedModelIds': selectedModelIds,
        'calculationMode': calculationMode,
        'roundingMode': roundingMode,
        'roundingThreshold': roundingThreshold,
      };

  TermModel copyWith({
    String? id,
    String? name,
    String? subject,
    String? gradeLevel,
    List<String>? selectedModelIds,
    String? calculationMode,
    String? roundingMode,
    double? roundingThreshold,
  }) {
    return TermModel(
      id: id ?? this.id,
      name: name ?? this.name,
      subject: subject ?? this.subject,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      selectedModelIds: selectedModelIds ?? this.selectedModelIds,
      calculationMode: calculationMode ?? this.calculationMode,
      roundingMode: roundingMode ?? this.roundingMode,
      roundingThreshold: roundingThreshold ?? this.roundingThreshold,
    );
  }
}

