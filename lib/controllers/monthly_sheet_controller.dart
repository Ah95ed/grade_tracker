import 'package:flutter/material.dart';
import '../models/monthly_model.dart';
import '../models/student_row.dart';
import '../models/custom_column.dart';
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
      final matchesSection = _selectedSection == 'ALL' || s.section.trim() == _selectedSection;
      if (!matchesSection) return false;
      if (_searchQuery.trim().isEmpty) return true;
      final query = _searchQuery.trim().toLowerCase();
      return s.name.toLowerCase().contains(query) || s.section.toLowerCase().contains(query);
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
    final updatedCols = List<CustomColumn>.from(model.customColumns)..add(column);
    await updateModel(model.copyWith(customColumns: updatedCols));
  }

  Future<void> addStudent(StudentRow student) async {
    final model = currentModel;
    if (model == null) return;
    final updatedStudents = List<StudentRow>.from(model.students)..add(student);
    await updateModel(model.copyWith(students: updatedStudents));
  }

  Future<void> updateStudentScore(String studentId, {double? writtenScore, String? colId, double? colScore}) async {
    final model = currentModel;
    if (model == null) return;
    final students = model.students.map((st) {
      if (st.id != studentId) return st;
      if (writtenScore != null) {
        return st.copyWith(writtenRawScore: writtenScore);
      }
      if (colId != null) {
        final newScores = Map<String, double?>.from(st.scores)..[colId] = colScore;
        return st.copyWith(scores: newScores);
      }
      return st;
    }).toList();
    await updateModel(model.copyWith(students: students));
  }

  Future<void> deleteStudent(String studentId) async {
    final model = currentModel;
    if (model == null) return;
    final updatedStudents = model.students.where((s) => s.id != studentId).toList();
    await updateModel(model.copyWith(students: updatedStudents));
  }

  Future<void> setRoundingMode(String mode, double threshold) async {
    final model = currentModel;
    if (model == null) return;
    await updateModel(model.copyWith(roundingMode: mode, roundingThreshold: threshold));
  }

  Future<void> setFinalScoreOperation(FinalScoreOperation op) async {
    final model = currentModel;
    if (model == null) return;
    await updateModel(model.copyWith(finalScoreOperation: op));
  }

  double? calculateFinalStudentScore(StudentRow student, MonthlyModel model) {
    double total = 0.0;
    bool hasScore = false;

    if (student.writtenRawScore != null) {
      final customSum = model.customColumns.fold<double>(0.0, (sum, c) => sum + c.maxScore);
      final autoWeight = (model.totalMaxScore - customSum).clamp(0.0, double.infinity);
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
      final score = student.scores[col.id];
      if (score != null) {
        total += score;
        hasScore = true;
      }
    }

    if (!hasScore) return null;

    final operated = GradeCalculator.applyOperation(total, model.finalScoreOperation);
    return GradeCalculator.applyRounding(
      operated,
      model.roundingMode,
      customThreshold: model.roundingThreshold,
      maxAllowed: model.totalMaxScore,
    );
  }

  Future<void> _persist() async {
    await _storageService.saveModels(_models);
    notifyListeners();
  }
}

