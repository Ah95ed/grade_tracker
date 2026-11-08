import 'package:flutter/material.dart';

import '../models/monthly_model.dart';
import '../models/student_row.dart';
import '../models/custom_column.dart';
import '../models/attendance_record.dart';
import '../models/final_score_operation.dart';
import '../services/storage_service.dart';
import '../core/utils/grade_calculator.dart';

/// MVC Controller for managing monthly grade sheets and student scoring
class MonthlySheetController extends ChangeNotifier {
  final StorageService _storageService;
  List<MonthlyModel> _models = [];
  String _activeModelId = '';
  String _searchQuery = '';

  MonthlySheetController(this._storageService) {
    _models = _storageService.loadModels();
    if (_models.isNotEmpty) {
      _activeModelId = _models.first.id;
    }
  }

  List<MonthlyModel> get models => _models;
  String get activeModelId => _activeModelId;
  String get searchQuery => _searchQuery;

  MonthlyModel? get currentModel {
    if (_models.isEmpty) return null;
    return _models.firstWhere(
      (m) => m.id == _activeModelId,
      orElse: () => _models.first,
    );
  }

  String _selectedSection = 'ALL';
  String get selectedSection => _selectedSection;

  bool _showRatingColumn = false;
  bool get showRatingColumn => _showRatingColumn;

  void toggleRatingColumn() {
    _showRatingColumn = !_showRatingColumn;
    notifyListeners();
  }

  Future<void> updateWrittenScoreMode(String mode) async {
    final model = currentModel;
    if (model == null) return;
    await updateModel(model.copyWith(writtenScoreMode: mode));
  }

  Future<void> updateTotalMaxScore(double max) async {
    final model = currentModel;
    if (model == null) return;
    await updateModel(model.copyWith(totalMaxScore: max));
  }

  Future<void> updateWrittenMaxScore(double max) async {
    final model = currentModel;
    if (model == null) return;
    await updateModel(model.copyWith(writtenMaxScore: max));
  }

  List<String> get availableSections {
    final model = currentModel;
    if (model == null) return [];
    final secs = model.students
        .map((s) => s.section.trim())
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList();
    secs.sort();
    return secs;
  }

  void setSelectedSection(String section) {
    _selectedSection = section;
    notifyListeners();
  }

  List<StudentRow> get filteredStudents {
    final model = currentModel;
    if (model == null) return [];
    return model.students.where((s) {
      final matchesSection =
          _selectedSection == 'ALL' || s.section.trim() == _selectedSection;
      if (!matchesSection) return false;
      if (_searchQuery.trim().isEmpty) return true;
      final query = _searchQuery.trim().toLowerCase();
      return s.name.toLowerCase().contains(query) ||
          s.section.toLowerCase().contains(query);
    }).toList();
  }

  void setActiveModel(String id) {
    _activeModelId = id;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  Future<void> setModels(List<MonthlyModel> models) async {
    _models = models;
    if (_models.isNotEmpty) {
      _activeModelId = _models.first.id;
    }
    await _persist();
  }

  Future<void> addModel(MonthlyModel newModel) async {
    _models.add(newModel);
    _activeModelId = newModel.id;
    await _persist();
  }

  Future<void> updateModel(MonthlyModel updated) async {
    final index = _models.indexWhere((m) => m.id == updated.id);
    if (index != -1) {
      _models[index] = updated;
      await _persist();
    }
  }

  Future<void> deleteModel(String modelId) async {
    _models.removeWhere((m) => m.id == modelId);
    if (_activeModelId == modelId && _models.isNotEmpty) {
      _activeModelId = _models.first.id;
    }
    await _persist();
  }

  Future<void> addColumn(CustomColumn column) async {
    final model = currentModel;
    if (model == null) return;

    List<StudentRow> updatedStudents = List<StudentRow>.from(model.students);
    if (column.isAttendance && column.crossMonthMode == 'merge' && column.priorModelIds.isNotEmpty) {
      updatedStudents = updatedStudents.map((st) {
        final List<AttendanceRecord> mergedRecords = [];
        for (final pModelId in column.priorModelIds) {
          final pModel = _models.firstWhere((m) => m.id == pModelId, orElse: () => model);
          if (pModel.id == model.id) continue;
          final pStudent = pModel.students.firstWhere(
            (s) => s.id == st.id || s.name.trim() == st.name.trim(),
            orElse: () => const StudentRow(id: '', name: ''),
          );
          if (pStudent.id.isEmpty) continue;
          for (final entry in pStudent.attendanceRecords.entries) {
            final pCol = pModel.customColumns.firstWhere(
              (c) => c.id == entry.key && c.isAttendance,
              orElse: () => const CustomColumn(id: '', name: '', maxScore: 0),
            );
            if (pCol.id.isNotEmpty) {
              mergedRecords.addAll(entry.value.map((r) => r.copyWith(
                    id: 'imp-${r.id}-${DateTime.now().millisecondsSinceEpoch}',
                    modelId: pModel.id,
                    modelName: pModel.name,
                  )));
            }
          }
        }
        if (mergedRecords.isNotEmpty) {
          final updatedMap = Map<String, List<AttendanceRecord>>.from(st.attendanceRecords);
          updatedMap[column.id] = mergedRecords;
          return st.copyWith(attendanceRecords: updatedMap);
        }
        return st;
      }).toList();
    }

    final updatedCols = List<CustomColumn>.from(model.customColumns)..add(column);
    await updateModel(model.copyWith(students: updatedStudents, customColumns: updatedCols));
  }

  Future<void> updateCustomColumn(
    String colId, {
    String? name,
    double? maxScore,
    bool? isAttendance,
    bool? affectsGrade,
  }) async {
    final model = currentModel;
    if (model == null) return;
    final updatedCols = model.customColumns.map((col) {
      if (col.id == colId) {
        return col.copyWith(
          name: name,
          maxScore: maxScore,
          isAttendance: isAttendance,
          affectsGrade: affectsGrade,
        );
      }
      return col;
    }).toList();
    await updateModel(model.copyWith(customColumns: updatedCols));
  }

  Future<void> deleteColumn(String colId) async {
    final model = currentModel;
    if (model == null) return;
    final updatedCols = model.customColumns
        .where((c) => c.id != colId)
        .toList();
    final updatedStudents = model.students.map((st) {
      if (!st.scores.containsKey(colId)) return st;
      final newScores = Map<String, double?>.from(st.scores)..remove(colId);
      return st.copyWith(scores: newScores);
    }).toList();
    await updateModel(
      model.copyWith(customColumns: updatedCols, students: updatedStudents),
    );
  }

  Future<void> setColumnLabel(String key, String newLabel) async {
    final model = currentModel;
    if (model == null) return;
    final updatedLabels = Map<String, String>.from(model.columnLabels);
    final trimmed = newLabel.trim();
    if (trimmed.isEmpty) {
      updatedLabels.remove(key);
    } else {
      updatedLabels[key] = trimmed;
    }
    await updateModel(model.copyWith(columnLabels: updatedLabels));
  }

  Future<void> setColumnLabels(Map<String, String> labels) async {
    final model = currentModel;
    if (model == null) return;
    await updateModel(
      model.copyWith(columnLabels: Map<String, String>.from(labels)),
    );
  }

  Future<void> resetColumnLabels() async {
    final model = currentModel;
    if (model == null) return;
    await updateModel(model.copyWith(columnLabels: const {}));
  }

  Future<void> toggleColumnSlant(String key) async {
    final model = currentModel;
    if (model == null) return;
    final current = model.getColumnSlant(key);
    final next = current == 'normal'
        ? 'italic'
        : current == 'italic'
        ? 'vertical'
        : 'normal';
    final updatedSlants = Map<String, String>.from(model.columnSlants)
      ..[key] = next;
    await updateModel(model.copyWith(columnSlants: updatedSlants));
  }

  Future<void> addStudent(StudentRow student) async {
    final model = currentModel;
    if (model == null) return;
    final updatedStudents = List<StudentRow>.from(model.students)..add(student);
    await updateModel(model.copyWith(students: updatedStudents));
  }

  Future<void> updateStudentScore(
    String studentId, {
    double? writtenScore,
    String? colId,
    double? colScore,
  }) async {
    final model = currentModel;
    if (model == null) return;
    final students = model.students.map((st) {
      if (st.id != studentId) return st;
      if (writtenScore != null) {
        return st.copyWith(writtenRawScore: writtenScore);
      }
      if (colId != null) {
        final newScores = Map<String, double?>.from(st.scores)
          ..[colId] = colScore;
        return st.copyWith(scores: newScores);
      }
      return st;
    }).toList();
    await updateModel(model.copyWith(students: students));
  }

  Future<void> updateStudent(StudentRow student) async {
    final model = currentModel;
    if (model == null) return;
    final updatedStudents = model.students
        .map((s) => s.id == student.id ? student : s)
        .toList();
    await updateModel(model.copyWith(students: updatedStudents));
  }

  Future<void> deleteStudent(String studentId) async {
    final model = currentModel;
    if (model == null) return;
    final updatedStudents = model.students
        .where((s) => s.id != studentId)
        .toList();
    await updateModel(model.copyWith(students: updatedStudents));
  }

  Future<void> setRoundingMode(String mode, double threshold) async {
    final model = currentModel;
    if (model == null) return;
    await updateModel(
      model.copyWith(roundingMode: mode, roundingThreshold: threshold),
    );
  }

  Future<void> setFinalScoreOperation(
    FinalScoreOperation op, {
    bool applyToSameGradeAndSubject = false,
  }) async {
    final model = currentModel;
    if (model == null) return;
    if (applyToSameGradeAndSubject) {
      for (final m in _models) {
        if (m.gradeLevel == model.gradeLevel && m.subject == model.subject) {
          await updateModel(m.copyWith(finalScoreOperation: op));
        }
      }
    } else {
      await updateModel(model.copyWith(finalScoreOperation: op));
    }
  }

  double? calculateFinalStudentScore(StudentRow student, MonthlyModel model) {
    double total = 0.0;
    bool hasScore = false;

    if (student.writtenRawScore != null) {
      final customSum = model.customColumns
          .where((c) => !c.isAttendance || c.affectsGrade)
          .fold<double>(0.0, (sum, c) => sum + c.maxScore);
      final autoWeight = (model.totalMaxScore - customSum).clamp(
        0.0,
        double.infinity,
      );
      final written = GradeCalculator.calculateWrittenScore(
        rawScore: student.writtenRawScore,
        maxScore: model.writtenMaxScore,
        effectiveWeight: autoWeight,
        mode: model.writtenScoreMode,
      );
      if (written != null) {
        total += written;
        hasScore = true;
      }
    }

    for (final col in model.customColumns) {
      if (col.isAttendance) continue;
      final score = student.scores[col.id];
      if (score != null) {
        total += score;
        hasScore = true;
      }
    }

    // Attendance columns impact (increases or decreases final score)
    double attendanceDelta = 0.0;
    for (final col in model.customColumns) {
      if (!col.isAttendance) continue;
      final records = student.attendanceRecords[col.id] ?? const [];
      if (records.isNotEmpty) {
        hasScore = true;
      }
      if (col.affectsGrade) {
        for (final r in records) {
          if (r.status == 'absent') {
            if (col.absentAction == 'deduct') {
              attendanceDelta -= col.absentPoints;
            } else if (col.absentAction == 'add') {
              attendanceDelta += col.absentPoints;
            }
          } else if (r.status == 'excused') {
            if (col.excusedAction == 'deduct') {
              attendanceDelta -= col.excusedPoints;
            } else if (col.excusedAction == 'add') {
              attendanceDelta += col.excusedPoints;
            }
          } else if (r.status == 'present') {
            if (col.presentAction == 'add') {
              attendanceDelta += col.presentPoints;
            } else if (col.presentAction == 'deduct') {
              attendanceDelta -= col.presentPoints;
            }
          }
        }
      }
    }

    if (!hasScore) return null;

    // Add attendance adjustment (clamped so total score cannot fall below 0)
    total = (total + attendanceDelta).clamp(0.0, double.infinity);

    final operated = GradeCalculator.applyOperation(
      total,
      model.finalScoreOperation,
    );
    return GradeCalculator.applyRounding(
      operated,
      model.roundingMode,
      customThreshold: model.roundingThreshold,
      maxAllowed: model.totalMaxScore,
    );
  }

  Future<void> saveStudentAttendanceRecords(
    String studentId,
    String columnId,
    List<AttendanceRecord> records,
  ) async {
    final model = currentModel;
    if (model == null) return;
    final stIndex = model.students.indexWhere((s) => s.id == studentId);
    if (stIndex < 0) return;

    final student = model.students[stIndex];
    final updatedMap = Map<String, List<AttendanceRecord>>.from(
      student.attendanceRecords,
    );
    updatedMap[columnId] = records;

    final updatedStudent = student.copyWith(attendanceRecords: updatedMap);
    await updateStudent(updatedStudent);
  }

  double calculateStudentAttendanceDelta(StudentRow student, CustomColumn col) {
    if (!col.isAttendance || !col.affectsGrade) return 0.0;
    final records = student.attendanceRecords[col.id] ?? const [];
    double delta = 0.0;
    for (final r in records) {
      if (r.status == 'absent') {
        if (col.absentAction == 'deduct') {
          delta -= col.absentPoints;
        } else if (col.absentAction == 'add') {
          delta += col.absentPoints;
        }
      } else if (r.status == 'excused') {
        if (col.excusedAction == 'deduct') {
          delta -= col.excusedPoints;
        } else if (col.excusedAction == 'add') {
          delta += col.excusedPoints;
        }
      } else if (r.status == 'present') {
        if (col.presentAction == 'add') {
          delta += col.presentPoints;
        } else if (col.presentAction == 'deduct') {
          delta -= col.presentPoints;
        }
      }
    }
    return delta;
  }

  Future<void> _persist() async {
    await _storageService.saveModels(_models);
    notifyListeners();
  }
}
