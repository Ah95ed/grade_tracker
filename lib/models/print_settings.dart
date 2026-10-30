/// Configuration options for printing student report cards
class PrintSettings {
  final int cardsPerPage; // 1, 2, 4
  final bool showEmblem;
  final bool showSignatures;
  final bool showSchoolHeader;

  const PrintSettings({
    this.cardsPerPage = 2,
    this.showEmblem = true,
    this.showSignatures = true,
    this.showSchoolHeader = true,
  });

  factory PrintSettings.fromJson(Map<String, dynamic> json) {
    return PrintSettings(
      cardsPerPage: (json['cardsPerPage'] as num?)?.toInt() ?? 2,
      showEmblem: json['showEmblem'] as bool? ?? true,
      showSignatures: json['showSignatures'] as bool? ?? true,
      showSchoolHeader: json['showSchoolHeader'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'cardsPerPage': cardsPerPage,
        'showEmblem': showEmblem,
        'showSignatures': showSignatures,
        'showSchoolHeader': showSchoolHeader,
      };

  PrintSettings copyWith({
    int? cardsPerPage,
    bool? showEmblem,
    bool? showSignatures,
    bool? showSchoolHeader,
  }) {
    return PrintSettings(
      cardsPerPage: cardsPerPage ?? this.cardsPerPage,
      showEmblem: showEmblem ?? this.showEmblem,
      showSignatures: showSignatures ?? this.showSignatures,
      showSchoolHeader: showSchoolHeader ?? this.showSchoolHeader,
    );
  }
}

