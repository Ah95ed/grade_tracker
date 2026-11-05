import 'package:flutter/material.dart';
import '../models/term_model.dart';
import '../models/student_term_summary.dart';
import '../services/storage_service.dart';
import '../core/utils/grade_calculator.dart';
import 'monthly_sheet_controller.dart';

/// MVC Controller for managing term averages and multi-month calculations
class TermController extends ChangeNotifier {
  final StorageService _storageService;
  List<TermModel> _terms = [];
  String _activeTermId = '';

  TermController(this._storageService) {
    _terms = _storageService.loadTerms();
    if (_terms.isNotEmpty) {
      _activeTermId = _terms.first.id;
    }
  }

  List<TermModel> get terms => _terms;
  String get activeTermId => _activeTermId;

  TermModel? get currentTerm {
    if (_terms.isEmpty) return null;
    return _terms.firstWhere(
      (t) => t.id == _activeTermId,
      orElse: () => _terms.first,
    );
  }

  void setActiveTerm(String id) {
    _activeTermId = id;
    notifyListeners();
  }

  Future<void> setTerms(List<TermModel> terms) async {
    _terms = terms;
    if (_terms.isNotEmpty) {
      _activeTermId = _terms.first.id;
    }
    await _persist();
  }

  Future<void> addTerm(TermModel newTerm) async {
    _terms.add(newTerm);
    _activeTermId = newTerm.id;
    await _persist();
  }

  Future<void> updateTerm(TermModel updated) async {
    final index = _terms.indexWhere((t) => t.id == updated.id);
    if (index != -1) {
      _terms[index] = updated;
      await _persist();
    }
  }

  Future<void> deleteTerm(String termId) async {
    _terms.removeWhere((t) => t.id == termId);
    if (_activeTermId == termId && _terms.isNotEmpty) {
      _activeTermId = _terms.first.id;
    }
    await _persist();
  }

  Future<void> toggleModelSelection(String modelId) async {
    final term = currentTerm;
    if (term == null) return;
    final currentIds = List<String>.from(term.selectedModelIds);
    if (currentIds.contains(modelId)) {
      currentIds.remove(modelId);
    } else {
      currentIds.add(modelId);
    }
    await updateTerm(term.copyWith(selectedModelIds: currentIds));
  }

  /// Calculates term grade summaries for all students matching the selected models
  List<StudentTermSummary> calculateSummaries(
    MonthlySheetController sheetController,
  ) {
    final term = currentTerm;
    if (term == null || term.selectedModelIds.isEmpty) return [];

    final selectedModels = sheetController.models
        .where((m) => term.selectedModelIds.contains(m.id))
        .toList();
    if (selectedModels.isEmpty) return [];

    // Map unique students by name
    final Map<String, ({String grade, String section})> studentInfo = {};
    for (final model in selectedModels) {
      for (final s in model.students) {
        studentInfo.putIfAbsent(s.name.trim(), () => (grade: s.gradeLevel, section: s.section));
      }
    }

    final List<StudentTermSummary> results = [];

    studentInfo.forEach((name, info) {
      final Map<String, double?> monthlyScores = {};
      double sum = 0.0;
      int count = 0;

      for (final model in selectedModels) {
        final student = model.students.firstWhere(
          (s) => s.name.trim().toLowerCase() == name.toLowerCase(),
          orElse: () => model.students.first,
        );
        final score = sheetController.calculateFinalStudentScore(student, model);
        monthlyScores[model.name] = score;
        if (score != null) {
          sum += score;
          count++;
        }
      }

      double? rawTermScore;
      if (count > 0) {
        if (term.calculationMode == 'sum') {
          rawTermScore = sum;
        } else {
          rawTermScore = sum / (selectedModels.isNotEmpty ? selectedModels.length : 1);
        }
      }

      final double maxScore = selectedModels.first.totalMaxScore;
      final double? finalTermScore = GradeCalculator.applyRounding(
        rawTermScore,
        term.roundingMode,
        customThreshold: term.roundingThreshold,
        maxAllowed: maxScore,
      );

      final rating = GradeCalculator.getRating(finalTermScore, maxScore);

      results.add(StudentTermSummary(
        studentName: name,
        gradeLevel: info.grade,
        section: info.section,
        monthlyScores: monthlyScores,
        rawTermScore: rawTermScore,
        finalTermScore: finalTermScore,
        termMaxScore: maxScore,
        ratingKey: rating.key,
        status: rating.status,
      ));
    });

    return results;
  }

  Future<void> _persist() async {
    await _storageService.saveTerms(_terms);
    notifyListeners();
  }
}
