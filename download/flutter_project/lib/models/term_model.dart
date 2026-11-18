/// Term model used for averaging and calculating quarterly/annual performance
/// Supports aggregate terms (term of terms) as specified in Section 4
class TermModel {
  final String id;
  final String name;
  final String subject;
  final String gradeLevel;
  final String teacherName;
  final List<String> assignedSections;
  final List<String> selectedModelIds; // Monthly models included
  final List<String> selectedTermIds; // Source terms included (Section 4.1)
  final String sourceType; // 'models' (default), 'terms', or 'mixed' (Section 4.1)
  final Map<String, Map<String, dynamic>> termScoreDetails; // studentName -> {raw, final, isRounded}
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
    this.selectedTermIds = const [],
    this.sourceType = 'models',
    this.termScoreDetails = const {},
    this.calculationMode = 'average',
    this.roundingMode = 'none',
    this.roundingThreshold = 0.5,
    this.notes = '',
  });

  bool get isAggregate =>
      sourceType == 'terms' || selectedTermIds.isNotEmpty;

  factory TermModel.fromJson(Map<String, dynamic> json) {
    final rawDetails = json['termScoreDetails'] as Map<String, dynamic>? ?? {};
    final parsedDetails = <String, Map<String, dynamic>>{};
    rawDetails.forEach((k, v) {
      if (v is Map) {
        parsedDetails[k] = Map<String, dynamic>.from(v);
      }
    });

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
      selectedTermIds: (json['selectedTermIds'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      sourceType: json['sourceType'] as String? ?? 'models',
      termScoreDetails: parsedDetails,
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
        'selectedTermIds': selectedTermIds,
        'sourceType': sourceType,
        'termScoreDetails': termScoreDetails,
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
    List<String>? selectedTermIds,
    String? sourceType,
    Map<String, Map<String, dynamic>>? termScoreDetails,
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
      selectedTermIds: selectedTermIds ?? this.selectedTermIds,
      sourceType: sourceType ?? this.sourceType,
      termScoreDetails: termScoreDetails ?? this.termScoreDetails,
      calculationMode: calculationMode ?? this.calculationMode,
      roundingMode: roundingMode ?? this.roundingMode,
      roundingThreshold: roundingThreshold ?? this.roundingThreshold,
      notes: notes ?? this.notes,
    );
  }
}

bool _isAgg(TermModel t) =>
    t.sourceType == 'terms' || t.selectedTermIds.isNotEmpty;

/// Exact translation of `orderTermsWithAggregates` (Section 4.3)
List<TermModel> orderTermsWithAggregates(List<TermModel> terms) {
  if (terms.length <= 1) return terms;
  final regular = terms.where((t) => !_isAgg(t)).toList();
  final aggs = terms.where(_isAgg).toList();
  if (aggs.isEmpty) return terms;

  final result = [...regular];
  final unattached = <TermModel>[];

  for (final agg in aggs) {
    final ids = agg.selectedTermIds;
    var anchor = -1;
    for (var i = 0; i < result.length; i++) {
      if (ids.contains(result[i].id)) anchor = i;
    }
    if (anchor >= 0) {
      var idx = anchor + 1;
      while (idx < result.length && _isAgg(result[idx])) {
        final shares = result[idx].selectedTermIds.any(ids.contains);
        if (!shares) break;
        idx++;
      }
      result.insert(idx, agg);
    } else {
      unattached.add(agg);
    }
  }
  return [...result, ...unattached];
}
