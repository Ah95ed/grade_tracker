import 'package:flutter/foundation.dart';
import '../flutter_data/models/term_model.dart';
import '../flutter_data/repositories/gradebook_repository.dart';

/// متحكم حساب المعدلات الفصلية والنهائية باستخدام Provider
class TermController extends ChangeNotifier {
  final GradebookRepository _repository;
  String? _currentUserUid;

  List<TermModel> _terms = [];
  String? _activeTermId;

  TermController(this._repository) {
    _loadTerms();
  }

  List<TermModel> get terms => _terms;
  String? get activeTermId => _activeTermId;

  TermModel? get activeTerm {
    if (_terms.isEmpty) return null;
    if (_activeTermId == null) return _terms.first;
    return _terms.firstWhere((t) => t.id == _activeTermId, orElse: () => _terms.first);
  }

  void setUserUid(String? uid) {
    _currentUserUid = uid;
    _loadTerms();
  }

  Future<void> _loadTerms() async {
    _terms = await _repository.getTerms(userUid: _currentUserUid);
    if (_terms.isNotEmpty && _activeTermId == null) {
      _activeTermId = _terms.first.id;
    }
    notifyListeners();
  }

  void selectTerm(String termId) {
    _activeTermId = termId;
    notifyListeners();
  }

  Future<void> addTerm(String name, List<TermSelectedModel> selectedModels) async {
    final term = TermModel(
      id: 'term_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      selectedModels: selectedModels,
      createdAt: DateTime.now(),
    );
    _terms = [..._terms, term];
    _activeTermId = term.id;
    await _repository.persistTerms(_terms, userUid: _currentUserUid);
    notifyListeners();
  }
}
