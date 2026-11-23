import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/app_constants.dart';
import '../models/teacher_personal.dart';
import '../models/exam_paper.dart';
import '../services/teacher_notification_service.dart';

/// MVC Controller for the Teacher Personal Workspace (Section 2)
class TeacherPersonalController extends ChangeNotifier {
  final SharedPreferences _prefs;
  String? _currentUserUid;

  List<ClassWeeklySchedule> _schedules = [];
  List<TeacherNote> _notes = [];
  List<TeacherAlert> _alerts = [];
  ExamBuilderData _exams = ExamBuilderData(
    draft: createDefaultExamPaper(),
    savedExams: const [],
  );
  String _activeScheduleId = '';

  TeacherPersonalController(this._prefs, {String? userUid})
      : _currentUserUid = userUid {
    loadWorkspace();
  }

  List<ClassWeeklySchedule> get schedules => _schedules;
  List<TeacherNote> get notes => _notes;
  List<TeacherAlert> get alerts => _alerts;
  ExamBuilderData get exams => _exams;
  SavedExamPaper get draftExam => _exams.draft;
  List<SavedExamPaper> get savedExams => _exams.savedExams;
  String? get activeExamId => _exams.activeExamId;
  String get activeScheduleId => _activeScheduleId;

  ClassWeeklySchedule? get currentSchedule {
    if (_schedules.isEmpty) return null;
    return _schedules.firstWhere(
      (s) => s.id == _activeScheduleId,
      orElse: () => _schedules.first,
    );
  }

  String get _storageKey {
    if (_currentUserUid != null && _currentUserUid!.isNotEmpty) {
      return '${AppConstants.keyPersonalWorkspace}_$_currentUserUid';
    }
    return AppConstants.keyPersonalWorkspace;
  }

  /// Changes active user, reloading data and cancelling/rescheduling alerts (Section 2.3)
  void switchUser(String? newUserUid) {
    if (_currentUserUid == newUserUid) return;
    _currentUserUid = newUserUid;
    loadWorkspace();
  }

  void loadWorkspace() {
    final raw = _prefs.getString(_storageKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw) as Map<String, dynamic>;
        final workspace = TeacherPersonalWorkspace.fromJson(decoded);
        _schedules = workspace.schedules;
        _notes = workspace.notes;
        _alerts = workspace.alerts;
        _exams = workspace.exams ??
            ExamBuilderData(draft: createDefaultExamPaper(), savedExams: const []);
      } catch (e) {
        debugPrint('Error decoding teacher workspace: $e');
        _schedules = [];
        _notes = [];
        _alerts = [];
        _exams = ExamBuilderData(draft: createDefaultExamPaper(), savedExams: const []);
      }
    } else {
      _schedules = [];
      _notes = [];
      _alerts = [];
      _exams = ExamBuilderData(draft: createDefaultExamPaper(), savedExams: const []);
    }

    if (_schedules.isEmpty) {
      // Seed default schedule for the teacher
      final defaultSched = ClassWeeklySchedule(
        id: 'sched_${DateTime.now().millisecondsSinceEpoch}',
        gradeLevel: 'الأول متوسط',
        section: 'أ',
        periods: SchedulePeriod.defaultPeriods,
        cells: const {},
        showFriday: false,
        showSaturday: false,
        updatedAt: DateTime.now(),
      );
      _schedules.add(defaultSched);
      _activeScheduleId = defaultSched.id;
    } else {
      _activeScheduleId = _schedules.first.id;
    }

    notifyListeners();
  }

  Future<void> _persist({bool notify = true}) async {
    final workspace = TeacherPersonalWorkspace(
      schedules: _schedules,
      notes: _notes,
      alerts: _alerts,
      exams: _exams,
    );
    await _prefs.setString(_storageKey, jsonEncode(workspace.toJson()));
    if (notify) {
      notifyListeners();
    }
  }

  // --- Exam Builder Operations ---

  void updateDraftExam(SavedExamPaper draft, {bool notify = true}) {
    _exams = _exams.copyWith(draft: draft);
    _persist(notify: notify);
  }

  void saveCurrentExam([String? customTitle]) {
    final current = _exams.draft;
    final trimmed = customTitle?.trim() ?? '';
    String finalTitle = trimmed;
    if (finalTitle.isEmpty) {
      if (current.title.trim().isNotEmpty) {
        finalTitle = current.title.trim();
      } else {
        final subLine = current.header.rightLines.firstWhere(
          (l) => l.contains('المادة'),
          orElse: () => '',
        );
        final cleanSub = subLine.replaceAll(RegExp(r'^المادة\s*:\s*'), '').trim();
        if (cleanSub.isNotEmpty) {
          finalTitle = 'أسئلة $cleanSub';
        } else {
          finalTitle = 'نموذج أسئلة امتحانية';
        }
      }
    }

    // Assign a stable persistent exam ID if this is a new draft or sample
    final examId = (current.id.startsWith('exam_draft_') || current.id.startsWith('exam_sample_'))
        ? 'exam_${DateTime.now().millisecondsSinceEpoch}'
        : current.id;

    final paperToSave = current.copyWith(
      id: examId,
      title: finalTitle,
      updatedAt: DateTime.now().toIso8601String(),
    );

    final updatedList = List<SavedExamPaper>.from(_exams.savedExams);
    final existingIdx = updatedList.indexWhere((e) => e.id == paperToSave.id);
    if (existingIdx >= 0) {
      updatedList[existingIdx] = paperToSave;
    } else {
      updatedList.insert(0, paperToSave);
    }

    _exams = _exams.copyWith(
      activeExamId: paperToSave.id,
      draft: paperToSave,
      savedExams: updatedList,
    );
    _persist(notify: true);
  }

  void loadExam(String id) {
    final match = _exams.savedExams.firstWhere(
      (e) => e.id == id,
      orElse: () => _exams.draft,
    );
    _exams = _exams.copyWith(
      activeExamId: match.id,
      draft: match,
    );
    _persist(notify: true);
  }

  void deleteExam(String id) {
    final updatedList = _exams.savedExams.where((e) => e.id != id).toList();
    _exams = _exams.copyWith(
      activeExamId: _exams.activeExamId == id ? null : _exams.activeExamId,
      savedExams: updatedList,
    );
    _persist(notify: true);
  }

  void createNewExam({
    String? schoolName,
    String? subject,
    String? academicYear,
    String? teacherName,
    String? schoolLogo,
  }) {
    final newDraft = createDefaultExamPaper(
      schoolName: schoolName,
      subject: subject,
      academicYear: academicYear,
      teacherName: teacherName,
      schoolLogo: schoolLogo,
    );
    _exams = _exams.copyWith(
      activeExamId: null,
      draft: newDraft,
    );
    _persist(notify: true);
  }

  void loadSampleExam({String? schoolLogo}) {
    final sample = createSampleExamPaper(schoolLogo: schoolLogo);
    _exams = _exams.copyWith(
      activeExamId: sample.id,
      draft: sample,
    );
    _persist(notify: true);
  }

  // --- Schedules Operations ---

  void setActiveSchedule(String id) {
    _activeScheduleId = id;
    notifyListeners();
  }

  Future<void> saveScheduleCell(String dayKey, String periodId, String subject) async {
    final sched = currentSchedule;
    if (sched == null) return;
    final cellKey = '$dayKey::$periodId';
    final updatedCells = Map<String, String>.from(sched.cells);
    if (subject.trim().isEmpty) {
      updatedCells.remove(cellKey);
    } else {
      updatedCells[cellKey] = subject.trim();
    }
    await updateSchedule(sched.copyWith(cells: updatedCells, updatedAt: DateTime.now()));
  }

  Future<void> updateSchedule(ClassWeeklySchedule updated) async {
    final idx = _schedules.indexWhere((s) => s.id == updated.id);
    if (idx != -1) {
      _schedules[idx] = updated;
    } else {
      _schedules.add(updated);
    }
    await _persist();
  }

  Future<void> addSchedule(ClassWeeklySchedule schedule) async {
    _schedules.add(schedule);
    _activeScheduleId = schedule.id;
    await _persist();
  }

  Future<void> deleteSchedule(String id) async {
    _schedules.removeWhere((s) => s.id == id);
    if (_activeScheduleId == id && _schedules.isNotEmpty) {
      _activeScheduleId = _schedules.first.id;
    }
    await _persist();
  }

  // --- Notes Operations ---

  Future<void> addNote(TeacherNote note) async {
    _notes.insert(0, note);
    await _persist();
  }

  Future<void> updateNote(TeacherNote note) async {
    final idx = _notes.indexWhere((n) => n.id == note.id);
    if (idx != -1) {
      _notes[idx] = note;
      await _persist();
    }
  }

  Future<void> deleteNote(String id) async {
    _notes.removeWhere((n) => n.id == id);
    await _persist();
  }

  Future<void> togglePinNote(String id) async {
    final idx = _notes.indexWhere((n) => n.id == id);
    if (idx != -1) {
      final cur = _notes[idx];
      _notes[idx] = cur.copyWith(isPinned: !cur.isPinned, updatedAt: DateTime.now());
      await _persist();
    }
  }

  Future<void> toggleDoneNote(String id) async {
    final idx = _notes.indexWhere((n) => n.id == id);
    if (idx != -1) {
      final cur = _notes[idx];
      _notes[idx] = cur.copyWith(isDone: !cur.isDone, updatedAt: DateTime.now());
      await _persist();
    }
  }

  // --- Alerts Operations ---

  Future<void> addAlert(TeacherAlert alert) async {
    _alerts.insert(0, alert);
    await TeacherNotificationService.scheduleTeacherAlert(alert);
    await _persist();
  }

  Future<void> updateAlert(TeacherAlert alert) async {
    final idx = _alerts.indexWhere((a) => a.id == alert.id);
    if (idx != -1) {
      _alerts[idx] = alert;
      await TeacherNotificationService.scheduleTeacherAlert(alert);
      await _persist();
    }
  }

  Future<void> toggleAlertActive(String id) async {
    final idx = _alerts.indexWhere((a) => a.id == id);
    if (idx != -1) {
      final cur = _alerts[idx];
      final updated = cur.copyWith(isActive: !cur.isActive);
      _alerts[idx] = updated;
      await TeacherNotificationService.scheduleTeacherAlert(updated);
      await _persist();
    }
  }

  Future<void> snoozeAlert(String id, Duration duration) async {
    final idx = _alerts.indexWhere((a) => a.id == id);
    if (idx != -1) {
      final cur = _alerts[idx];
      final snoozed = cur.copyWith(snoozeUntil: DateTime.now().add(duration));
      _alerts[idx] = snoozed;
      await TeacherNotificationService.scheduleTeacherAlert(snoozed);
      await _persist();
    }
  }

  Future<void> deleteAlert(String id) async {
    _alerts.removeWhere((a) => a.id == id);
    await TeacherNotificationService.cancelAlert(id.hashCode);
    await _persist();
  }
}
