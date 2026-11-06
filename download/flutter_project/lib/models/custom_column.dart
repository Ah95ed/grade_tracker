/// Custom dynamic column for a monthly sheet (oral, behavior, activity, etc.)
class CustomColumn {
  final String id;
  final String name;
  final double maxScore;

  const CustomColumn({
    required this.id,
    required this.name,
    required this.maxScore,
  });

  factory CustomColumn.fromJson(Map<String, dynamic> json) {
    return CustomColumn(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      maxScore: (json['maxScore'] as num?)?.toDouble() ?? 10.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'maxScore': maxScore,
      };

  CustomColumn copyWith({
    String? id,
    String? name,
    double? maxScore,
  }) {
    return CustomColumn(
      id: id ?? this.id,
      name: name ?? this.name,
      maxScore: maxScore ?? this.maxScore,
    );
  }
}

