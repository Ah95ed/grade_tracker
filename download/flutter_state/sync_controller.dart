import 'package:flutter/foundation.dart';
import '../flutter_data/repositories/gradebook_repository.dart';

/// متحكم المزامنة اللحظية وحالة الاتصال بالسحابة باستخدام Provider
class SyncController extends ChangeNotifier {
  final GradebookRepository _repository;
  bool _isOnline = true;
  bool _isSyncing = false;
  int _pendingCount = 0;
  String? _lastSyncedAt;

  SyncController(this._repository) {
    _checkPendingStatus();
  }

  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;
  int get pendingCount => _pendingCount;
  String? get lastSyncedAt => _lastSyncedAt;

  void setConnectivity(bool online) {
    _isOnline = online;
    notifyListeners();
  }

  void markPending() {
    _pendingCount = 1;
    notifyListeners();
  }

  void _checkPendingStatus() {
    _pendingCount = _repository.localStorage.hasPendingSync() ? 1 : 0;
    notifyListeners();
  }

  Future<bool> triggerSync({String? userUid}) async {
    if (_isSyncing || !_isOnline) return false;
    _isSyncing = true;
    notifyListeners();

    try {
      final success = await _repository.synchronize(userUid: userUid);
      if (success) {
        _pendingCount = 0;
        final now = DateTime.now();
        _lastSyncedAt = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
      }
      return success;
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }
}
