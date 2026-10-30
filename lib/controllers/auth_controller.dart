import 'package:flutter/material.dart';
import '../models/app_user.dart';
import '../services/storage_service.dart';

/// MVC Controller for user authentication, subscription, and cloud sync status
class AuthController extends ChangeNotifier {
  final StorageService _storageService;
  AppUser? _currentUser;
  bool _isSyncing = false;
  bool _isOnline = true;

  AuthController(this._storageService) {
    // Default active teacher user session
    _currentUser = const AppUser(
      uid: 'teacher-uid-1',
      email: 'teacher@school.iq',
      displayName: 'الأستاذ: علي حسن',
      subscriptionType: 'lifetime',
      subscriptionStatus: 'active',
      isAdmin: false,
    );
  }

  AppUser? get currentUser => _currentUser;
  bool get isSyncing => _isSyncing;
  bool get isOnline => _isOnline;
  bool get isAuthenticated => _currentUser != null;

  void setSyncing(bool syncing) {
    _isSyncing = syncing;
    notifyListeners();
  }

  void setOnline(bool online) {
    _isOnline = online;
    notifyListeners();
  }

  Future<void> logout() async {
    _currentUser = null;
    notifyListeners();
  }

  Future<void> deleteAccount() async {
    await _storageService.clearAll();
    _currentUser = null;
    notifyListeners();
  }
}

