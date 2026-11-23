const List<String> arabicIndicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const List<String> arabicAlphaLabels = [
  'أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل'
];

/// Converts western digits (0-9) to Eastern Arabic / Indic digits (٠-٩)
String toArabicDigits(dynamic input) {
  return input.toString().replaceAllMapped(RegExp(r'\d'), (m) {
    final digit = int.tryParse(m.group(0) ?? '') ?? 0;
    return arabicIndicDigits[digit];
  });
}

/// Formats numbers according to preference
String formatNumber(int num, bool useArabicDigits) {
  return useArabicDigits ? toArabicDigits(num) : num.toString();
}

enum ExamBranchStyle {
  arabicNum, // ١) ٢)
  latinNum,  // 1) 2)
  arabicAlpha, // أ) ب) ج)
  dash,      // -
  none,      // بدون ترقيم
}

extension ExamBranchStyleExt on ExamBranchStyle {
  String get label {
    switch (this) {
      case ExamBranchStyle.arabicNum:
        return 'ترقيم عربي (١، ٢، ٣)';
      case ExamBranchStyle.latinNum:
        return 'ترقيم إنجليزي (1, 2, 3)';
      case ExamBranchStyle.arabicAlpha:
        return 'أبجدي (أ، ب، ج)';
      case ExamBranchStyle.dash:
        return 'شحطة (-)';
      case ExamBranchStyle.none:
        return 'بدون ترقيم';
    }
  }

  static ExamBranchStyle fromString(String? val) {
    switch (val) {
      case 'arabic_num':
        return ExamBranchStyle.arabicNum;
      case 'latin_num':
        return ExamBranchStyle.latinNum;
      case 'arabic_alpha':
        return ExamBranchStyle.arabicAlpha;
      case 'dash':
        return ExamBranchStyle.dash;
      case 'none':
      default:
        return ExamBranchStyle.none;
    }
  }

  String toKey() {
    switch (this) {
      case ExamBranchStyle.arabicNum:
        return 'arabic_num';
      case ExamBranchStyle.latinNum:
        return 'latin_num';
      case ExamBranchStyle.arabicAlpha:
        return 'arabic_alpha';
      case ExamBranchStyle.dash:
        return 'dash';
      case ExamBranchStyle.none:
        return 'none';
    }
  }
}

enum ExamBranchLayout {
  vertical, // عمودي - سطر لكل فرع
  twoCol,   // شبكة من عمودين
  inline,   // مضمن في سطر واحد
}

extension ExamBranchLayoutExt on ExamBranchLayout {
  String get label {
    switch (this) {
      case ExamBranchLayout.vertical:
        return 'تخطيط عمودي (سطر لكل فرع)';
      case ExamBranchLayout.twoCol:
        return 'تخطيط عمودين (توفير مساحة)';
      case ExamBranchLayout.inline:
        return 'تخطيط مضمن (في نفس السطر)';
    }
  }

  static ExamBranchLayout fromString(String? val) {
    switch (val) {
      case 'two_col':
        return ExamBranchLayout.twoCol;
      case 'inline':
        return ExamBranchLayout.inline;
      case 'vertical':
      default:
        return ExamBranchLayout.vertical;
    }
  }

  String toKey() {
    switch (this) {
      case ExamBranchLayout.vertical:
        return 'vertical';
      case ExamBranchLayout.twoCol:
        return 'two_col';
      case ExamBranchLayout.inline:
        return 'inline';
    }
  }
}

class ExamQuestionBranch {
  final String id;
  final String? customLabel;
  final String text;

  const ExamQuestionBranch({
    required this.id,
    this.customLabel,
    required this.text,
  });

  String getPrefix(int index, ExamBranchStyle style, bool useArabicDigits) {
    if (customLabel != null && customLabel!.trim().isNotEmpty) {
      return customLabel!.trim();
    }
    switch (style) {
      case ExamBranchStyle.arabicNum:
        return '${toArabicDigits(index + 1)})';
      case ExamBranchStyle.latinNum:
        return '${index + 1})';
      case ExamBranchStyle.arabicAlpha:
        final char = index < arabicAlphaLabels.length
            ? arabicAlphaLabels[index]
            : formatNumber(index + 1, useArabicDigits);
        return '$char)';
      case ExamBranchStyle.dash:
        return '-';
      case ExamBranchStyle.none:
        return '';
    }
  }

  ExamQuestionBranch copyWith({
    String? id,
    String? customLabel,
    String? text,
  }) {
    return ExamQuestionBranch(
      id: id ?? this.id,
      customLabel: customLabel ?? this.customLabel,
      text: text ?? this.text,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'customLabel': customLabel,
        'text': text,
      };

  factory ExamQuestionBranch.fromJson(Map<String, dynamic> json) {
    return ExamQuestionBranch(
      id: json['id'] as String? ?? 'b_${DateTime.now().millisecondsSinceEpoch}',
      customLabel: json['customLabel'] as String?,
      text: json['text'] as String? ?? '',
    );
  }
}

class ExamQuestionItem {
  final String id;
  final String label;
  final String prompt;
  final String? marks;
  final ExamBranchStyle branchStyle;
  final ExamBranchLayout branchLayout;
  final List<ExamQuestionBranch> branches;
  final bool hasDivider;

  const ExamQuestionItem({
    required this.id,
    required this.label,
    required this.prompt,
    this.marks,
    this.branchStyle = ExamBranchStyle.none,
    this.branchLayout = ExamBranchLayout.vertical,
    this.branches = const [],
    this.hasDivider = true,
  });

  ExamQuestionItem copyWith({
    String? id,
    String? label,
    String? prompt,
    String? marks,
    ExamBranchStyle? branchStyle,
    ExamBranchLayout? branchLayout,
    List<ExamQuestionBranch>? branches,
    bool? hasDivider,
  }) {
    return ExamQuestionItem(
      id: id ?? this.id,
      label: label ?? this.label,
      prompt: prompt ?? this.prompt,
      marks: marks ?? this.marks,
      branchStyle: branchStyle ?? this.branchStyle,
      branchLayout: branchLayout ?? this.branchLayout,
      branches: branches ?? this.branches,
      hasDivider: hasDivider ?? this.hasDivider,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'prompt': prompt,
        'marks': marks,
        'branchStyle': branchStyle.toKey(),
        'branchLayout': branchLayout.toKey(),
        'branches': branches.map((b) => b.toJson()).toList(),
        'hasDivider': hasDivider,
      };

  factory ExamQuestionItem.fromJson(Map<String, dynamic> json) {
    return ExamQuestionItem(
      id: json['id'] as String? ?? 'q_${DateTime.now().millisecondsSinceEpoch}',
      label: json['label'] as String? ?? 'س١',
      prompt: json['prompt'] as String? ?? '',
      marks: json['marks'] as String?,
      branchStyle: ExamBranchStyleExt.fromString(json['branchStyle'] as String?),
      branchLayout: ExamBranchLayoutExt.fromString(json['branchLayout'] as String?),
      branches: (json['branches'] as List<dynamic>?)
              ?.map((b) => ExamQuestionBranch.fromJson(b as Map<String, dynamic>))
              .toList() ??
          const [],
      hasDivider: json['hasDivider'] as bool? ?? true,
    );
  }
}

class ExamPaperHeader {
  final List<String> rightLines;
  final List<String> leftLines;
  final bool showLogo;
  final String? logoDataUrl;
  final bool showStudentInfo;
  final String studentNameLabel;
  final String studentNumberLabel;
  final bool showNote;
  final String noteText;
  final String? footerText;
  final String? teacherName;

  const ExamPaperHeader({
    this.rightLines = const ['المدرسة : ', 'الصف : ', 'المادة : '],
    this.leftLines = const ['اسم الامتحان : ', 'الوقت : ساعة واحدة', 'العام الدراسي : '],
    this.showLogo = false,
    this.logoDataUrl,
    this.showStudentInfo = true,
    this.studentNameLabel = 'اسم الطالب :',
    this.studentNumberLabel = 'الشعبة / الرقم :',
    this.showNote = true,
    this.noteText = '',
    this.footerText = 'مع تمنياتنا لكم بالنجاح والتوفيق',
    this.teacherName,
  });

  ExamPaperHeader copyWith({
    List<String>? rightLines,
    List<String>? leftLines,
    bool? showLogo,
    String? logoDataUrl,
    bool? showStudentInfo,
    String? studentNameLabel,
    String? studentNumberLabel,
    bool? showNote,
    String? noteText,
    String? footerText,
    String? teacherName,
  }) {
    return ExamPaperHeader(
      rightLines: rightLines ?? this.rightLines,
      leftLines: leftLines ?? this.leftLines,
      showLogo: showLogo ?? this.showLogo,
      logoDataUrl: logoDataUrl ?? this.logoDataUrl,
      showStudentInfo: showStudentInfo ?? this.showStudentInfo,
      studentNameLabel: studentNameLabel ?? this.studentNameLabel,
      studentNumberLabel: studentNumberLabel ?? this.studentNumberLabel,
      showNote: showNote ?? this.showNote,
      noteText: noteText ?? this.noteText,
      footerText: footerText ?? this.footerText,
      teacherName: teacherName ?? this.teacherName,
    );
  }

  Map<String, dynamic> toJson() => {
        'rightLines': rightLines,
        'leftLines': leftLines,
        'showLogo': showLogo,
        'logoDataUrl': logoDataUrl,
        'showStudentInfo': showStudentInfo,
        'studentNameLabel': studentNameLabel,
        'studentNumberLabel': studentNumberLabel,
        'showNote': showNote,
        'noteText': noteText,
        'footerText': footerText,
        'teacherName': teacherName,
      };

  factory ExamPaperHeader.fromJson(Map<String, dynamic> json) {
    return ExamPaperHeader(
      rightLines: (json['rightLines'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          const ['المدرسة : ', 'الصف : ', 'المادة : '],
      leftLines: (json['leftLines'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          const ['اسم الامتحان : ', 'الوقت : ساعة واحدة', 'العام الدراسي : '],
      showLogo: json['showLogo'] as bool? ?? false,
      logoDataUrl: json['logoDataUrl'] as String?,
      showStudentInfo: json['showStudentInfo'] as bool? ?? true,
      studentNameLabel: json['studentNameLabel'] as String? ?? 'اسم الطالب :',
      studentNumberLabel: json['studentNumberLabel'] as String? ?? 'الشعبة / الرقم :',
      showNote: json['showNote'] as bool? ?? true,
      noteText: json['noteText'] as String? ?? '',
      footerText: json['footerText'] as String? ?? 'مع تمنياتنا لكم بالنجاح والتوفيق',
      teacherName: json['teacherName'] as String?,
    );
  }
}

class SavedExamPaper {
  final String id;
  final String title;
  final ExamPaperHeader header;
  final List<ExamQuestionItem> questions;
  final bool useArabicDigits;
  final String fontSize; // 'sm', 'md', 'lg'
  final String updatedAt;

  const SavedExamPaper({
    required this.id,
    required this.title,
    required this.header,
    required this.questions,
    this.useArabicDigits = true,
    this.fontSize = 'md',
    required this.updatedAt,
  });

  SavedExamPaper copyWith({
    String? id,
    String? title,
    ExamPaperHeader? header,
    List<ExamQuestionItem>? questions,
    bool? useArabicDigits,
    String? fontSize,
    String? updatedAt,
  }) {
    return SavedExamPaper(
      id: id ?? this.id,
      title: title ?? this.title,
      header: header ?? this.header,
      questions: questions ?? this.questions,
      useArabicDigits: useArabicDigits ?? this.useArabicDigits,
      fontSize: fontSize ?? this.fontSize,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'header': header.toJson(),
        'questions': questions.map((q) => q.toJson()).toList(),
        'useArabicDigits': useArabicDigits,
        'fontSize': fontSize,
        'updatedAt': updatedAt,
      };

  factory SavedExamPaper.fromJson(Map<String, dynamic> json) {
    return SavedExamPaper(
      id: json['id'] as String? ?? 'exam_${DateTime.now().millisecondsSinceEpoch}',
      title: json['title'] as String? ?? '',
      header: json['header'] != null
          ? ExamPaperHeader.fromJson(json['header'] as Map<String, dynamic>)
          : const ExamPaperHeader(),
      questions: (json['questions'] as List<dynamic>?)
              ?.map((q) => ExamQuestionItem.fromJson(q as Map<String, dynamic>))
              .toList() ??
          const [],
      useArabicDigits: json['useArabicDigits'] as bool? ?? true,
      fontSize: json['fontSize'] as String? ?? 'md',
      updatedAt: json['updatedAt'] as String? ?? DateTime.now().toIso8601String(),
    );
  }
}

class ExamBuilderData {
  final String? activeExamId;
  final SavedExamPaper draft;
  final List<SavedExamPaper> savedExams;

  const ExamBuilderData({
    this.activeExamId,
    required this.draft,
    this.savedExams = const [],
  });

  ExamBuilderData copyWith({
    String? activeExamId,
    SavedExamPaper? draft,
    List<SavedExamPaper>? savedExams,
  }) {
    return ExamBuilderData(
      activeExamId: activeExamId ?? this.activeExamId,
      draft: draft ?? this.draft,
      savedExams: savedExams ?? this.savedExams,
    );
  }

  Map<String, dynamic> toJson() => {
        'activeExamId': activeExamId,
        'draft': draft.toJson(),
        'savedExams': savedExams.map((e) => e.toJson()).toList(),
      };

  factory ExamBuilderData.fromJson(Map<String, dynamic> json) {
    final draftJson = json['draft'] as Map<String, dynamic>?;
    return ExamBuilderData(
      activeExamId: json['activeExamId'] as String?,
      draft: draftJson != null
          ? SavedExamPaper.fromJson(draftJson)
          : createDefaultExamPaper(),
      savedExams: (json['savedExams'] as List<dynamic>?)
              ?.map((e) => SavedExamPaper.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}

/// Creates a blank default exam paper
SavedExamPaper createDefaultExamPaper({
  String? schoolName,
  String? subject,
  String? academicYear,
  String? teacherName,
  String? schoolLogo,
}) {
  final nowIso = DateTime.now().toIso8601String();
  return SavedExamPaper(
    id: 'exam_draft_${DateTime.now().millisecondsSinceEpoch}',
    title: '',
    header: ExamPaperHeader(
      rightLines: [
        schoolName != null && schoolName.isNotEmpty ? 'المدرسة : $schoolName' : 'المدرسة : ',
        'الصف : ',
        subject != null && subject.isNotEmpty ? 'المادة : $subject' : 'المادة : ',
      ],
      leftLines: [
        'اسم الامتحان : ',
        'الوقت : ساعة واحدة',
        academicYear != null && academicYear.isNotEmpty ? 'العام الدراسي : ( $academicYear )' : 'العام الدراسي : ',
      ],
      showLogo: schoolLogo != null && schoolLogo.isNotEmpty,
      logoDataUrl: schoolLogo,
      showStudentInfo: true,
      studentNameLabel: 'اسم الطالب :',
      studentNumberLabel: 'الشعبة / الرقم :',
      showNote: true,
      noteText: 'ملاحظة : أجب عن جميع الأسئلة ، ولكل سؤال درجة محددة .',
      footerText: 'مع تمنياتنا لكم بالنجاح والتوفيق',
      teacherName: teacherName,
    ),
    questions: [
      ExamQuestionItem(
        id: 'q_default_1',
        label: 'س١',
        prompt: 'عرّف ما يأتي :',
        marks: '20 درجة',
        branchStyle: ExamBranchStyle.none,
        branchLayout: ExamBranchLayout.inline,
        branches: [
          ExamQuestionBranch(id: 'b_1_1', text: 'المصطلح الأول'),
          ExamQuestionBranch(id: 'b_1_2', text: 'المصطلح الثاني'),
          ExamQuestionBranch(id: 'b_1_3', text: 'المصطلح الثالث'),
        ],
      ),
      ExamQuestionItem(
        id: 'q_default_2',
        label: 'س٢',
        prompt: 'أجب عن فرعين مما يأتي :',
        marks: '20 درجة',
        branchStyle: ExamBranchStyle.arabicAlpha,
        branchLayout: ExamBranchLayout.vertical,
        branches: [
          ExamQuestionBranch(id: 'b_2_1', text: 'الفرع الأول...'),
          ExamQuestionBranch(id: 'b_2_2', text: 'الفرع الثاني...'),
          ExamQuestionBranch(id: 'b_2_3', text: 'الفرع الثالث...'),
        ],
      ),
    ],
    useArabicDigits: true,
    fontSize: 'md',
    updatedAt: nowIso,
  );
}

/// Creates a comprehensive sample exam paper based on authentic Iraqi ministerial exam standards
SavedExamPaper createSampleExamPaper({String? schoolLogo}) {
  final now = DateTime.now().millisecondsSinceEpoch;
  return SavedExamPaper(
    id: 'exam_sample_$now',
    title: 'نموذج أسئلة استرشادي (وزاري عراقي)',
    header: ExamPaperHeader(
      rightLines: [
        'اللجنة الدائمة للامتحانات',
        'الدراسة : الإبتدائية',
        'المادة : العلوم',
      ],
      leftLines: [
        'جمهورية العراق - وزارة التربية',
        'الدور الأول : ( ٢٠٢٥ / ٢٠٢٦ )',
        'الوقت : ساعتان فقط',
      ],
      showLogo: schoolLogo != null && schoolLogo.isNotEmpty,
      logoDataUrl: schoolLogo,
      showStudentInfo: true,
      studentNameLabel: 'اسم التلميذ :',
      studentNumberLabel: 'الرقم الامتحاني :',
      showNote: true,
      noteText: 'ملاحظة : أجب عن خمسة أسئلة فقط ، ولكل سؤال ( ٢٠ ) درجة .',
      footerText: 'مع تمنياتنا لكم بالنجاح والتوفيق',
      teacherName: 'مدرس المادة',
    ),
    questions: [
      ExamQuestionItem(
        id: 'sq_${now}_1',
        label: 'س١',
        prompt: 'عرّف ( خمسة ) مما يأتي :',
        marks: '20 درجة',
        branchStyle: ExamBranchStyle.none,
        branchLayout: ExamBranchLayout.inline,
        branches: [
          ExamQuestionBranch(id: 'sb_${now}_11', text: 'الفلق'),
          ExamQuestionBranch(id: 'sb_${now}_12', text: 'التطعيم بالبراعم'),
          ExamQuestionBranch(id: 'sb_${now}_13', text: 'الجمجمة'),
          ExamQuestionBranch(id: 'sb_${now}_14', text: 'الأظافر'),
          ExamQuestionBranch(id: 'sb_${now}_15', text: 'التأريض'),
          ExamQuestionBranch(id: 'sb_${now}_16', text: 'العضلات'),
        ],
        hasDivider: true,
      ),
      ExamQuestionItem(
        id: 'sq_${now}_2',
        label: 'س٢',
        prompt: 'إملأ ( خمسة ) من الفراغات الآتية بما يناسبها :',
        marks: '20 درجة',
        branchStyle: ExamBranchStyle.arabicNum,
        branchLayout: ExamBranchLayout.vertical,
        branches: [
          ExamQuestionBranch(id: 'sb_${now}_21', text: '............ هو ارتفاع الماء في البحار والمحيطات عند الشواطئ في أوقات معينة .'),
          ExamQuestionBranch(id: 'sb_${now}_22', text: '............ هو نبات عشبي معمّر ينمو بكثرة في المناطق الرملية الرطبة على شواطئ الأنهار .'),
          ExamQuestionBranch(id: 'sb_${now}_23', text: 'يتكون الجهاز العصبي الـ ............ من الدماغ والحبل الشوكي .'),
          ExamQuestionBranch(id: 'sb_${now}_24', text: '............ هو مادة تسمح بسريان التيار الكهربائي خلالها بسهولة مثل النحاس .'),
          ExamQuestionBranch(id: 'sb_${now}_25', text: 'الضوء هو شكل من أشكال الطاقة ، وإنه يسير بخطوط ............ في جميع الاتجاهات .'),
        ],
        hasDivider: true,
      ),
      ExamQuestionItem(
        id: 'sq_${now}_3',
        label: 'س٣',
        prompt: 'أجب عن فرعين مما يأتي :',
        marks: '20 درجة',
        branchStyle: ExamBranchStyle.arabicAlpha,
        branchLayout: ExamBranchLayout.vertical,
        branches: [
          ExamQuestionBranch(id: 'sb_${now}_31', text: 'ما المعادلة الكيميائية ؟ وما أهميتها ؟'),
          ExamQuestionBranch(id: 'sb_${now}_32', text: 'ما هي طبقات العين ؟ عددها واشرح واحدة منها .'),
          ExamQuestionBranch(id: 'sb_${now}_33', text: 'قارن بين البروتونات والنيوترونات .'),
        ],
        hasDivider: true,
      ),
      ExamQuestionItem(
        id: 'sq_${now}_4',
        label: 'س٤',
        prompt: 'اختر الإجابة الصحيحة من بين الأقواس لـ ( ثلاث ) مما يأتي :',
        marks: '20 درجة',
        branchStyle: ExamBranchStyle.arabicNum,
        branchLayout: ExamBranchLayout.vertical,
        branches: [
          ExamQuestionBranch(id: 'sb_${now}_41', text: 'التكاثر الخضري هو نوع من أنواع التكاثر الطبيعي دون الحاجة لـ ( البذور ، الفسيلة ، القلم ) .'),
          ExamQuestionBranch(id: 'sb_${now}_42', text: 'براعم الحلاوة تقع في : ( القسم الخلفي للسان ، مقدمة اللسان ، جانبي اللسان ) .'),
          ExamQuestionBranch(id: 'sb_${now}_43', text: 'أصغر وحدة في المادة تحمل خواص تلك المادة الأصلية : ( العنصر ، الجزيء ، المركب ) .'),
          ExamQuestionBranch(id: 'sb_${now}_44', text: 'الصفائح التي تقع أسفل المحيطات تدعى بالصفائح : ( القارية ، المتباعدة ، المحيطية ) .'),
        ],
        hasDivider: true,
      ),
    ],
    useArabicDigits: true,
    fontSize: 'md',
    updatedAt: DateTime.now().toIso8601String(),
  );
}
