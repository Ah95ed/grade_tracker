import 'package:flutter/material.dart';
import '../models/term_model.dart';
import '../models/student_term_summary.dart';
import '../services/storage_service.dart';
import '../core/utils/grade_calculator.dart';
import 'monthly_sheet_controller.dart';

/// MVC Controller for managing term averages, aggregate terms, and multi-source calculations (Section 4)
class TermController extends ChangeNotifier {
  final StorageService _storageService;
  List<TermModel> _terms = [];
  String _activeTermId = '';

  TermController(this._storageService) {
    _terms = orderTermsWithAggregates(_storageService.loadTerms());
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
    _terms = orderTermsWithAggregates(terms);
    if (_terms.isNotEmpty && !_terms.any((t) => t.id == _activeTermId)) {
      _activeTermId = _terms.first.id;
    }
    await _persist();
  }

  Future<void> addTerm(TermModel newTerm) async {
    _terms.add(newTerm);
    _terms = orderTermsWithAggregates(_terms);
    _activeTermId = newTerm.id;
    await _persist();
  }

  Future<void> updateTerm(TermModel updated) async {
    final index = _terms.indexWhere((t) => t.id == updated.id);
    if (index != -1) {
      _terms[index] = updated;
      _terms = orderTermsWithAggregates(_terms);
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

  Future<void> toggleSourceTermSelection(String sourceTermId) async {
    final term = currentTerm;
    if (term == null) return;
    final currentIds = List<String>.from(term.selectedTermIds);
    if (currentIds.contains(sourceTermId)) {
      currentIds.remove(sourceTermId);
    } else {
      currentIds.add(sourceTermId);
    }
    final newSourceType = currentIds.isNotEmpty
        ? (term.selectedModelIds.isNotEmpty ? 'mixed' : 'terms')
        : (term.selectedModelIds.isNotEmpty ? 'models' : 'models');
    await updateTerm(term.copyWith(
      selectedTermIds: currentIds,
      sourceType: newSourceType,
    ));
  }

  /// Calculates term grade summaries for all students matching the selected models and source terms.
  /// Uses [visitedTermIds] to prevent circular dependencies (Section 4.2).
  List<StudentTermSummary> calculateSummaries(
    MonthlySheetController sheetController, {
    Set<String>? visitedTermIds,
  }) {
    final term = currentTerm;
    if (term == null) return [];

    final visited = Set<String>.from(visitedTermIds ?? {})..add(term.id);

    final bool hasModels = term.selectedModelIds.isNotEmpty;
    final bool hasSourceTerms = term.selectedTermIds.isNotEmpty;

    // Rule: If neither monthly models nor source terms are selected, return empty list (Section 4.2)
    if (!hasModels && !hasSourceTerms) return [];

    final selectedModels = sheetController.models
        .where((m) => term.selectedModelIds.contains(m.id))
        .toList();

    // Collect valid source terms preventing cycles
    final List<TermModel> validSourceTerms = [];
    if (hasSourceTerms) {
      for (final sId in term.selectedTermIds) {
        if (!visited.contains(sId)) {
          final sTerm = _terms.firstWhere(
            (t) => t.id == sId,
            orElse: () => const TermModel(id: '', name: ''),
          );
          if (sTerm.id.isNotEmpty) {
            validSourceTerms.add(sTerm);
          }
        }
      }
    }

    // Map unique students by name
    final Map<String, ({String grade, String section})> studentInfo = {};
    for (final model in selectedModels) {
      for (final s in model.students) {
        studentInfo.putIfAbsent(
            s.name.trim(), () => (grade: s.gradeLevel, section: s.section));
      }
    }

    // Precalculate source terms summaries
    final Map<String, Map<String, double?>> sourceTermScoresPerStudent = {};
    for (final st in validSourceTerms) {
      final oldActive = _activeTermId;
      _activeTermId = st.id;
      final stSummaries = calculateSummaries(
        sheetController,
        visitedTermIds: visited,
      );
      _activeTermId = oldActive;

      for (final sum in stSummaries) {
        studentInfo.putIfAbsent(
          sum.studentName.trim(),
          () => (grade: sum.gradeLevel, section: sum.section),
        );
        sourceTermScoresPerStudent.putIfAbsent(
          sum.studentName.trim(),
          () => {},
        )[st.name] = sum.finalTermScore;
      }
    }

    final List<StudentTermSummary> results = [];
    final Map<String, Map<String, dynamic>> scoreDetails = {};

    studentInfo.forEach((name, info) {
      final Map<String, double?> componentScores = {};
      double sum = 0.0;
      int count = 0;

      // 1. From Monthly Models
      for (final model in selectedModels) {
        final student = model.students.firstWhere(
          (s) => s.name.trim().toLowerCase() == name.toLowerCase(),
          orElse: () => model.students.first,
        );
        final score = sheetController.calculateFinalStudentScore(student, model);
        componentScores[model.name] = score;
        if (score != null) {
          sum += score;
          count++;
        }
      }

      // 2. From Source Terms (Section 4.1 & 4.2)
      for (final st in validSourceTerms) {
        final stScore = sourceTermScoresPerStudent[name]?[st.name];
        componentScores[st.name] = stScore;
        if (stScore != null) {
          sum += stScore;
          count++;
        }
      }

      final totalSources = selectedModels.length + validSourceTerms.length;

      double? rawTermScore;
      if (count > 0) {
        if (term.calculationMode == 'sum') {
          rawTermScore = sum;
        } else {
          rawTermScore = sum / (totalSources > 0 ? totalSources : 1);
        }
      }

      final double maxScore = selectedModels.isNotEmpty
          ? selectedModels.first.totalMaxScore
          : 100.0;

      final double? finalTermScore = GradeCalculator.applyRounding(
        rawTermScore,
        term.roundingMode,
        customThreshold: term.roundingThreshold,
        maxAllowed: maxScore,
      );

      final rating = GradeCalculator.getRating(finalTermScore, maxScore);

      // Section 4.1: Record termScoreDetails {raw, final, isRounded}
      scoreDetails[name] = {
        'raw': rawTermScore,
        'final': finalTermScore,
        'isRounded': finalTermScore != null &&
            rawTermScore != null &&
            (finalTermScore - rawTermScore).abs() > 0.0001,
      };

      results.add(StudentTermSummary(
        studentName: name,
        gradeLevel: info.grade,
        section: info.section,
        monthlyScores: componentScores,
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
