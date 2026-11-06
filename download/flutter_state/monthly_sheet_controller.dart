import 'package:flutter/foundation.dart';
import '../flutter_data/models/monthly_model.dart';
import '../flutter_data/models/student_row.dart';
import '../flutter_data/models/custom_column.dart';
import '../flutter_data/repositories/gradebook_repository.dart';

/// متحكم نماذج وسجلات الدرجات الشهرية باستخدام Provider
class MonthlySheetController extends ChangeNotifier {
  final GradebookRepository _repository;
  String? _currentUserUid;

  List<MonthlyModel> _models = [];
  String? _activeModelId;
  String _searchQuery = '';
  String? _selectedSection;
  bool _isLoaded = false;

  MonthlySheetController(this._repository) {
    loadData();
  }

  List<MonthlyModel> get models => _models;
  String? get activeModelId => _activeModelId;
  String get searchQuery => _searchQuery;
  String? get selectedSection => _selectedSection;

  MonthlyModel? get activeModel {
    if (_models.isEmpty) return null;
    if (_activeModelId == null) return _models.first;
    return _models.firstWhere((m) => m.id == _activeModelId, orElse: () => _models.first);
  }

  List<StudentRow> get filteredStudents {
    final model = activeModel;
    if (model == null) return [];

    return model.students.where((st) {
      final matchesSearch = _searchQuery.isEmpty || st.name.contains(_searchQuery);
      final matchesSection = _selectedSection == null || _selectedSection == 'الكل' || st.section == _selectedSection;
      return matchesSearch && matchesSection;
    }).toList();
  }

  void setUserUid(String? uid) {
    _currentUserUid = uid;
    loadData();
  }

  Future<void> loadData() async {
    _models = await _repository.getModels(userUid: _currentUserUid);
    if (_models.isNotEmpty && _activeModelId == null) {
      _activeModelId = _models.first.id;
    }
    _isLoaded = true;
    notifyListeners();
  }

  void selectModel(String modelId) {
    _activeModelId = modelId;
    notifyListeners();
  }

  void setSearchQuery(String q) {
    _searchQuery = q.trim();
    notifyListeners();
  }

  void setSelectedSection(String? sec) {
    _selectedSection = sec;
    notifyListeners();
  }

  Future<void> addModel(String name, {String gradeLevel = '', String section = 'أ'}) async {
    if (!_isLoaded) {
      _models = await _repository.getModels(userUid: _currentUserUid);
      _isLoaded = true;
    }

    final newModel = MonthlyModel(
      id: 'model_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      gradeLevel: gradeLevel,
      section: section,
      customColumns: const [
        CustomColumn(id: 'col_oral', name: 'الشفهي', maxScore: 10, orderIndex: 0),
        CustomColumn(id: 'col_daily', name: 'اليومي', maxScore: 10, orderIndex: 1),
      ],
      students: const [],
      createdAt: DateTime.now().toIso8601String(),
    );

    _models = [..._models, newModel];
    _activeModelId = newModel.id;
    await _repository.persistModels(_models, userUid: _currentUserUid);
    notifyListeners();
  }

  Future<void> updateStudentScore({
    required String studentId,
    String? columnId,
    double? score,
    double? writtenScore,
  }) async {
    final m = activeModel;
    if (m == null) return;

    final updatedStudents = m.students.map((st) {
      if (st.id != studentId) return st;
      if (writtenScore != null) {
        return st.copyWith(writtenRawScore: writtenScore);
      }
      if (columnId != null) {
        final newScores = Map<String, double?>.from(st.scores);
        newScores[columnId] = score;
        return st.copyWith(scores: newScores);
      }
      return st;
    }).toList();

    final updatedModel = m.copyWith(students: updatedStudents);
    _models = _models.map((mod) => mod.id == updatedModel.id ? updatedModel : mod).toList();
    await _repository.persistModels(_models, userUid: _currentUserUid);
    notifyListeners();
  }
}
