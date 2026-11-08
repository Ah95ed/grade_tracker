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

  bool get hasOperation => type != 'none' && value > 0;

  String get label {
    final vStr = value.toString().replaceAll(RegExp(r'\.0$'), '');
    switch (type) {
      case 'divide':
        return '÷ $vStr';
      case 'multiply':
        return '× $vStr';
      case 'add':
        return '+ $vStr';
      case 'subtract':
        return '- $vStr';
      default:
        return '';
    }
  }

  double calculateEffectiveMax(double baseMax) {
    if (!hasOperation) return baseMax;
    switch (type) {
      case 'divide':
        return value > 0 ? (baseMax / value) : baseMax;
      case 'multiply':
        return baseMax * value;
      case 'add':
        return baseMax + value;
      case 'subtract':
        return (baseMax - value).clamp(1.0, double.infinity);
      default:
        return baseMax;
    }
  }

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

