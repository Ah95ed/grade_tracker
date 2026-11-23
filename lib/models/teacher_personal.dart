import 'exam_paper.dart';

/// Supported weekdays for teacher schedule (Section 2.1)
enum WeekdayKey { sun, mon, tue, wed, thu, fri, sat }

/// Repeat frequency for teacher alarms/reminders (Section 2.1)
enum AlertRepeat { once, daily, weekly }

/// Note classification categories (Section 2.1)
enum NoteCategory { general, lessonPrep, classNote, admin }

extension WeekdayKeyExtension on WeekdayKey {
  String get arabicLabel {
    switch (this) {
      case WeekdayKey.sun:
        return 'الأحد';
      case WeekdayKey.mon:
        return 'الاثنين';
      case WeekdayKey.tue:
        return 'الثلاثاء';
      case WeekdayKey.wed:
        return 'الأربعاء';
      case WeekdayKey.thu:
        return 'الخميس';
      case WeekdayKey.fri:
        return 'الجمعة';
      case WeekdayKey.sat:
        return 'السبت';
    }
  }

  static WeekdayKey fromString(String? key) {
    switch (key?.toLowerCase()) {
      case 'mon':
        return WeekdayKey.mon;
      case 'tue':
        return WeekdayKey.tue;
      case 'wed':
        return WeekdayKey.wed;
      case 'thu':
        return WeekdayKey.thu;
      case 'fri':
        return WeekdayKey.fri;
      case 'sat':
        return WeekdayKey.sat;
      case 'sun':
      default:
        return WeekdayKey.sun;
    }
  }
}

extension NoteCategoryExtension on NoteCategory {
  String get arabicLabel {
    switch (this) {
      case NoteCategory.general:
        return 'عامة';
      case NoteCategory.lessonPrep:
        return 'تحضير درس';
      case NoteCategory.classNote:
        return 'ملاحظة صفية';
      case NoteCategory.admin:
        return 'إدارية';
    }
  }

  static NoteCategory fromString(String? cat) {
    switch (cat?.toLowerCase()) {
      case 'lessonprep':
        return NoteCategory.lessonPrep;
      case 'classnote':
        return NoteCategory.classNote;
      case 'admin':
        return NoteCategory.admin;
      case 'general':
      default:
        return NoteCategory.general;
    }
  }
}

extension AlertRepeatExtension on AlertRepeat {
  String get arabicLabel {
    switch (this) {
      case AlertRepeat.once:
        return 'مرة واحدة';
      case AlertRepeat.daily:
        return 'يومياً';
      case AlertRepeat.weekly:
        return 'أسبوعياً';
    }
  }

  static AlertRepeat fromString(String? r) {
    switch (r?.toLowerCase()) {
      case 'daily':
        return AlertRepeat.daily;
      case 'weekly':
        return AlertRepeat.weekly;
      case 'once':
      default:
        return AlertRepeat.once;
    }
  }
}

/// A single class period slot (Section 2.1 & 2.2)
class SchedulePeriod {
  final String id;
  final String label; // "الأولى"
  final String timeRange; // "08:00 - 08:45"

  const SchedulePeriod(this.id, this.label, this.timeRange);

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'timeRange': timeRange,
      };

  factory SchedulePeriod.fromJson(Map<String, dynamic> json) {
    return SchedulePeriod(
      json['id'] as String? ?? 'p1',
      json['label'] as String? ?? 'الأولى',
      json['timeRange'] as String? ?? '08:00 - 08:45',
    );
  }

  /// Default 6 standard periods (Section 2.2)
  static const List<SchedulePeriod> defaultPeriods = [
    SchedulePeriod('p1', 'الأولى', '08:00 - 08:45'),
    SchedulePeriod('p2', 'الثانية', '08:50 - 09:35'),
    SchedulePeriod('p3', 'الثالثة', '09:45 - 10:30'),
    SchedulePeriod('p4', 'الرابعة', '10:40 - 11:25'),
    SchedulePeriod('p5', 'الخامسة', '11:30 - 12:15'),
    SchedulePeriod('p6', 'السادسة', '12:20 - 01:05'),
  ];
}

/// Weekly class schedule for a specific grade & section (Section 2.1)
class ClassWeeklySchedule {
  final String id;
  final String gradeLevel;
  final String section;
  final List<SchedulePeriod> periods;
  final Map<String, String> cells; // Key: "${day.name}::${periodId}"
  final bool showSaturday;
  final bool showFriday;
  final DateTime updatedAt;

  const ClassWeeklySchedule({
    required this.id,
    required this.gradeLevel,
    required this.section,
    required this.periods,
    required this.cells,
    this.showSaturday = false,
    this.showFriday = false,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'gradeLevel': gradeLevel,
        'section': section,
        'periods': periods.map((p) => p.toJson()).toList(),
        'cells': cells,
        'showSaturday': showSaturday,
        'showFriday': showFriday,
        'updatedAt': updatedAt.toIso8601String(),
      };

  factory ClassWeeklySchedule.fromJson(Map<String, dynamic> json) {
    final rawPeriods = json['periods'] as List<dynamic>? ?? [];
    return ClassWeeklySchedule(
      id: json['id'] as String? ?? 'schedule_default',
      gradeLevel: json['gradeLevel'] as String? ?? '',
      section: json['section'] as String? ?? '',
      periods: rawPeriods.isNotEmpty
          ? rawPeriods
              .map((p) => SchedulePeriod.fromJson(p as Map<String, dynamic>))
              .toList()
          : SchedulePeriod.defaultPeriods,
      cells: (json['cells'] as Map<String, dynamic>? ?? {})
          .map((k, v) => MapEntry(k, v.toString())),
      showSaturday: json['showSaturday'] == true,
      showFriday: json['showFriday'] == true,
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  ClassWeeklySchedule copyWith({
    String? id,
    String? gradeLevel,
    String? section,
    List<SchedulePeriod>? periods,
    Map<String, String>? cells,
    bool? showSaturday,
    bool? showFriday,
    DateTime? updatedAt,
  }) {
    return ClassWeeklySchedule(
      id: id ?? this.id,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      section: section ?? this.section,
      periods: periods ?? this.periods,
      cells: cells ?? this.cells,
      showSaturday: showSaturday ?? this.showSaturday,
      showFriday: showFriday ?? this.showFriday,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Teacher note/task item (Section 2.1)
class TeacherNote {
  final String id;
  final String title;
  final String content;
  final NoteCategory category;
  final bool isPinned;
  final bool isDone;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TeacherNote({
    required this.id,
    required this.title,
    required this.content,
    this.category = NoteCategory.general,
    this.isPinned = false,
    this.isDone = false,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'content': content,
        'category': category.name,
        'isPinned': isPinned,
        'isDone': isDone,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  factory TeacherNote.fromJson(Map<String, dynamic> json) {
    return TeacherNote(
      id: json['id'] as String? ??
          'note_${DateTime.now().millisecondsSinceEpoch}',
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      category: NoteCategoryExtension.fromString(json['category'] as String?),
      isPinned: json['isPinned'] == true,
      isDone: json['isDone'] == true,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  TeacherNote copyWith({
    String? id,
    String? title,
    String? content,
    NoteCategory? category,
    bool? isPinned,
    bool? isDone,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return TeacherNote(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      category: category ?? this.category,
      isPinned: isPinned ?? this.isPinned,
      isDone: isDone ?? this.isDone,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Teacher reminder / alarm with repeat options (Section 2.1)
class TeacherAlert {
  final String id;
  final String title;
  final String? note;
  final String date; // YYYY-MM-DD (for once repeat)
  final String time; // HH:MM (24-hour format)
  final AlertRepeat repeat;
  final WeekdayKey? repeatDay; // for weekly repeat
  final bool soundEnabled;
  final bool isActive;
  final String? lastTriggeredKey;
  final DateTime? snoozeUntil;
  final DateTime createdAt;

  const TeacherAlert({
    required this.id,
    required this.title,
    this.note,
    required this.date,
    required this.time,
    this.repeat = AlertRepeat.once,
    this.repeatDay,
    this.soundEnabled = true,
    this.isActive = true,
    this.lastTriggeredKey,
    this.snoozeUntil,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'note': note,
        'date': date,
        'time': time,
        'repeat': repeat.name,
        'repeatDay': repeatDay?.name,
        'soundEnabled': soundEnabled,
        'isActive': isActive,
        'lastTriggeredKey': lastTriggeredKey,
        'snoozeUntil': snoozeUntil?.toIso8601String(),
        'createdAt': createdAt.toIso8601String(),
      };

  factory TeacherAlert.fromJson(Map<String, dynamic> json) {
    return TeacherAlert(
      id: json['id'] as String? ??
          'alert_${DateTime.now().millisecondsSinceEpoch}',
      title: json['title'] as String? ?? '',
      note: json['note'] as String?,
      date: json['date'] as String? ?? '',
      time: json['time'] as String? ?? '08:00',
      repeat: AlertRepeatExtension.fromString(json['repeat'] as String?),
      repeatDay: json['repeatDay'] != null
          ? WeekdayKeyExtension.fromString(json['repeatDay'] as String?)
          : null,
      soundEnabled: json['soundEnabled'] != false,
      isActive: json['isActive'] != false,
      lastTriggeredKey: json['lastTriggeredKey'] as String?,
      snoozeUntil: DateTime.tryParse(json['snoozeUntil'] as String? ?? ''),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  TeacherAlert copyWith({
    String? id,
    String? title,
    String? note,
    String? date,
    String? time,
    AlertRepeat? repeat,
    WeekdayKey? repeatDay,
    bool? soundEnabled,
    bool? isActive,
    String? lastTriggeredKey,
    DateTime? snoozeUntil,
    DateTime? createdAt,
  }) {
    return TeacherAlert(
      id: id ?? this.id,
      title: title ?? this.title,
      note: note ?? this.note,
      date: date ?? this.date,
      time: time ?? this.time,
      repeat: repeat ?? this.repeat,
      repeatDay: repeatDay ?? this.repeatDay,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      isActive: isActive ?? this.isActive,
      lastTriggeredKey: lastTriggeredKey ?? this.lastTriggeredKey,
      snoozeUntil: snoozeUntil ?? this.snoozeUntil,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// Container object encapsulating the entire teacher personal workspace
class TeacherPersonalWorkspace {
  final List<ClassWeeklySchedule> schedules;
  final List<TeacherNote> notes;
  final List<TeacherAlert> alerts;
  final ExamBuilderData? exams;

  const TeacherPersonalWorkspace({
    this.schedules = const [],
    this.notes = const [],
    this.alerts = const [],
    this.exams,
  });

  Map<String, dynamic> toJson() => {
        'schedules': schedules.map((s) => s.toJson()).toList(),
        'notes': notes.map((n) => n.toJson()).toList(),
        'alerts': alerts.map((a) => a.toJson()).toList(),
        'exams': exams?.toJson(),
      };

  factory TeacherPersonalWorkspace.fromJson(Map<String, dynamic> json) {
    final rawSchedules = json['schedules'] as List<dynamic>? ?? [];
    final rawNotes = json['notes'] as List<dynamic>? ?? [];
    final rawAlerts = json['alerts'] as List<dynamic>? ?? [];
    final rawExams = json['exams'] as Map<String, dynamic>?;
    return TeacherPersonalWorkspace(
      schedules: rawSchedules
          .map((s) => ClassWeeklySchedule.fromJson(s as Map<String, dynamic>))
          .toList(),
      notes: rawNotes
          .map((n) => TeacherNote.fromJson(n as Map<String, dynamic>))
          .toList(),
      alerts: rawAlerts
          .map((a) => TeacherAlert.fromJson(a as Map<String, dynamic>))
          .toList(),
      exams: rawExams != null ? ExamBuilderData.fromJson(rawExams) : null,
    );
  }
}
