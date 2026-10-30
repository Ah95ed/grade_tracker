/// Represents a mathematical operation applied to the final calculated score
class FinalScoreOperation {
  final String type; // 'none', 'divide', 'multiply', 'add', 'subtract'
  final double value;

  const FinalScoreOperation({
    this.type = 'none',
    this.value = 1.0,
  });

  factory FinalScoreOperation.fromJson(Map<String, dynamic> json) {
    return FinalScoreOperation(
      type: json['type'] as String? ?? 'none',
      value: (json['value'] as num?)?.toDouble() ?? 1.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'value': value,
      };

  FinalScoreOperation copyWith({
    String? type,
    double? value,
  }) {
    return FinalScoreOperation(
      type: type ?? this.type,
      value: value ?? this.value,
    );
  }
}

