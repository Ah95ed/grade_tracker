import 'package:flutter/foundation.dart';

@immutable
class CustomColumn {
  final String id;
  final String name;
  final double maxScore;
  final int orderIndex;

  const CustomColumn({
    required this.id,
    required this.name,
    this.maxScore = 10.0,
    this.orderIndex = 0,
  });

  CustomColumn copyWith({
    String? id,
    String? name,
    double? maxScore,
    int? orderIndex,
  }) {
    return CustomColumn(
      id: id ?? this.id,
      name: name ?? this.name,
      maxScore: maxScore ?? this.maxScore,
      orderIndex: orderIndex ?? this.orderIndex,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'maxScore': maxScore,
    'orderIndex': orderIndex,
  };

  factory CustomColumn.fromJson(Map<String, dynamic> json) => CustomColumn(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    maxScore: (json['maxScore'] as num? ?? json['max_score'] as num? ?? 10).toDouble(),
    orderIndex: json['orderIndex'] as int? ?? json['order_index'] as int? ?? 0,
  );
}
