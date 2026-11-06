import 'package:flutter/foundation.dart';
import '../flutter_data/models/app_user.dart';
import '../flutter_data/services/local_storage_service.dart';
import '../flutter_data/services/api_client.dart';
import '../flutter_data/services/users_service.dart';

/// متحكم المصادقة وإدارة الجلسات باستخدام Provider
class AuthController extends ChangeNotifier {
  final LocalStorageService _storage;
  final ApiClient _apiClient;
  final UsersService _usersService;

  AppUser? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  AuthController({
    required LocalStorageService storage,
    required ApiClient apiClient,
    required UsersService usersService,
  })  : _storage = storage,
        _apiClient = apiClient,
        _usersService = usersService {
    _loadPersistedUser();
  }

  AppUser? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void _loadPersistedUser() {
    _currentUser = _storage.loadCurrentUser();
    if (_currentUser != null && _currentUser!.idToken != null) {
      _apiClient.updateTokens(
        idToken: _currentUser!.idToken,
        refreshToken: _currentUser!.refreshToken,
      );
    }
  }

  Future<bool> setAuthenticatedUser(AppUser user) async {
    _currentUser = user;
    _apiClient.updateTokens(idToken: user.idToken, refreshToken: user.refreshToken);
    await _storage.saveCurrentUser(user);
    notifyListeners();
    return true;
  }

  Future<void> signOut() async {
    _currentUser = null;
    _apiClient.updateTokens(idToken: null, refreshToken: null);
    await _storage.clearCurrentUser();
    notifyListeners();
  }

  void enterGuestMode() {
    _currentUser = const AppUser(
      uid: 'guest_local_user',
      email: 'guest@daragat.local',
      displayName: 'المعلم (وضع محلي)',
      subscriptionType: 'lifetime',
      subscriptionStatus: 'active',
    );
    notifyListeners();
  }
}
