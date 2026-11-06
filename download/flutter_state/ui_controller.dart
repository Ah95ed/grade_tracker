import 'package:flutter/material.dart';

/// متحكم واجهة المستخدم وحالة علامات التبويب ولوحة المفاتيح
class UiController extends ChangeNotifier {
  int _activeTab = 0; // 0: monthly, 1: term, 2: cards, 3: admin
  bool _isScoreKeypadVisible = false;
  bool _isColumnSlantEnabled = true;

  int get activeTab => _activeTab;
  bool get isScoreKeypadVisible => _isScoreKeypadVisible;
  bool get isColumnSlantEnabled => _isColumnSlantEnabled;

  void setActiveTab(int tab) {
    if (_activeTab != tab) {
      _activeTab = tab;
      notifyListeners();
    }
  }

  void toggleScoreKeypad([bool? show]) {
    _isScoreKeypadVisible = show ?? !_isScoreKeypadVisible;
    notifyListeners();
  }

  void toggleColumnSlant() {
    _isColumnSlantEnabled = !_isColumnSlantEnabled;
    notifyListeners();
  }
}
