import 'package:flutter/foundation.dart';

@immutable
class TermSelectedModel {
  final String modelId;
  final double weight;
  final int orderIndex;

  const TermSelectedModel({
    required this.modelId,
    this.weight = 1.0,
    this.orderIndex = 0,
  });

  Map<String, dynamic> toJson() => {
    'modelId': modelId,
    'weight': weight,
    'orderIndex': orderIndex,
  };

  factory TermSelectedModel.fromJson(Map<String, dynamic> json) => TermSelectedModel(
    modelId: json['modelId'] as String? ?? json['model_id'] as String? ?? '',
    weight: (json['weight'] as num? ?? 1.0).toDouble(),
    orderIndex: json['orderIndex'] as int? ?? json['order_index'] as int? ?? 0,
  );
}

@immutable
class TermModel {
  final String id;
  final String name;
  final List<TermSelectedModel> selectedModels;
  final DateTime? createdAt;

  const TermModel({
    required this.id,
    required this.name,
    this.selectedModels = const [],
    this.createdAt,
  });

  TermModel copyWith({
    String? id,
    String? name,
    List<TermSelectedModel>? selectedModels,
    DateTime? createdAt,
  }) {
    return TermModel(
      id: id ?? this.id,
      name: name ?? this.name,
      selectedModels: selectedModels ?? this.selectedModels,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'selectedModels': selectedModels.map((m) => m.toJson()).toList(),
    'createdAt': createdAt?.toIso8601String(),
  };

  factory TermModel.fromJson(Map<String, dynamic> json) => TermModel(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    selectedModels: (json['selectedModels'] as List<dynamic>? ?? json['selected_models'] as List<dynamic>? ?? [])
        .map((e) => TermSelectedModel.fromJson(e as Map<String, dynamic>))
        .toList(),
    createdAt: json['createdAt'] != null
        ? DateTime.tryParse(json['createdAt'] as String)
        : (json['created_at'] != null ? DateTime.tryParse(json['created_at'] as String) : null),
  );
}
