import 'package:flutter/material.dart';
import '../models/app_user.dart';
import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';
import '../services/storage_service.dart';
import '../services/gradebook_api_service.dart';

/// MVC Controller for Authentication, Cloudflare D1 Backend, and Firebase Auth
class AuthController extends ChangeNotifier {
  final StorageService _storageService;
  final GradebookApiService _apiService;
  AppUser? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isSyncing = false;
  bool _isOnline = true;

  AuthController(this._storageService, {GradebookApiService? apiService})
      : _apiService = apiService ?? GradebookApiService() {
    _currentUser = _storageService.loadCurrentUser();
  }

  AppUser? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isSyncing => _isSyncing;
  bool get isOnline => _isOnline;
  GradebookApiService get apiService => _apiService;

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// Sign in with Firebase Auth & verify against Cloudflare D1
  Future<bool> loginWithEmail(String email, String password) async {
    final cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.isEmpty || !cleanEmail.contains('@') || password.isEmpty) {
      _errorMessage = 'يرجى إدخال بريد إلكتروني صالح وكلمة المرور.';
      notifyListeners();
      return false;
    }
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _apiService.signInWithFirebase(cleanEmail, password);
    if (result['success'] == true) {
      final data = result['data'] as Map<String, dynamic>;
      final idToken = data['idToken'] as String?;
      final localId = data['localId'] as String? ?? 'usr_${DateTime.now().millisecondsSinceEpoch}';
      final dispName = data['displayName'] as String? ?? 'الأستاذ: ${cleanEmail.split('@')[0]}';

      final serverInfo = await _apiService.fetchUserData(uid: localId, email: cleanEmail, token: idToken);
      final status = serverInfo?['user']?['subscriptionStatus'] as String? ?? 'active';
      if (status == 'cancelled' || status == 'suspended') {
        _errorMessage = 'تم إلغاء حسابك أو تعليقه من قِبل إدارة النظام.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final now = DateTime.now().toIso8601String();
      final user = AppUser(
        uid: localId,
        email: cleanEmail,
        displayName: serverInfo?['user']?['displayName'] as String? ?? dispName,
        subscriptionType: serverInfo?['user']?['subscriptionType'] as String? ?? 'monthly',
        subscriptionStatus: status,
        createdAt: serverInfo?['user']?['createdAt'] as String? ?? now,
        expiresAt: serverInfo?['user']?['expiresAt'] as String?,
        lastActiveAt: now,
        token: idToken,
        authProvider: 'email',
        isAdmin: cleanEmail == 'asmaomar5566@gmail.com' || cleanEmail == 'm11287137@gmail.com',
      );
      _currentUser = user;
      await _storageService.saveCurrentUser(user);
      _isLoading = false;
      notifyListeners();
      return true;
    }

    final err = result['error'] as String?;
    _errorMessage = (err == 'INVALID_LOGIN_CREDENTIALS' || err == 'EMAIL_NOT_FOUND' || err == 'INVALID_PASSWORD')
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
        : (err == 'USER_DISABLED' ? 'تم تعطيل هذا الحساب من قِبل إدارة النظام.' : 'فشل تسجيل الدخول. يرجى التحقق من الاتصال.');
    _isLoading = false;
    notifyListeners();
    return false;
  }

  /// Register new user with Firebase & Cloudflare D1
  Future<bool> registerWithEmail(String email, String password, String displayName) async {
    final cleanEmail = email.trim().toLowerCase();
    final name = displayName.trim().isEmpty ? 'الأستاذ' : displayName.trim();
    if (cleanEmail.isEmpty || !cleanEmail.contains('@') || password.length < 6) {
      _errorMessage = password.length < 6 ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' : 'يرجى إدخال بريد إلكتروني صالح.';
      notifyListeners();
      return false;
    }
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _apiService.signUpWithFirebase(cleanEmail, password, name);
    if (result['success'] == true) {
      final data = result['data'] as Map<String, dynamic>;
      final idToken = data['idToken'] as String?;
      final localId = data['localId'] as String? ?? 'usr_${DateTime.now().millisecondsSinceEpoch}';

      await _apiService.registerUserWithCloudflare(uid: localId, email: cleanEmail, displayName: name, authProvider: 'email', token: idToken);
      final now = DateTime.now().toIso8601String();
      final user = AppUser(
        uid: localId,
        email: cleanEmail,
        displayName: name,
        subscriptionType: 'monthly',
        subscriptionStatus: 'active',
        createdAt: now,
        lastActiveAt: now,
        token: idToken,
        authProvider: 'email',
        isAdmin: cleanEmail == 'asmaomar5566@gmail.com',
      );
      _currentUser = user;
      await _storageService.saveCurrentUser(user);
      _isLoading = false;
      notifyListeners();
      return true;
    }

    final err = result['error'] as String?;
    _errorMessage = err == 'EMAIL_EXISTS'
        ? 'هذا البريد مسجل بالفعل. يرجى تسجيل الدخول.'
        : (err == 'WEAK_PASSWORD' ? 'كلمة المرور ضعيفة جداً.' : 'تعذر إنشاء الحساب. تحقق من الاتصال بالإنترنت.');
    _isLoading = false;
    notifyListeners();
    return false;
  }

  /// Start Free Trial (5 minutes local session)
  Future<void> startFreeTrial() async {
    final rnd = DateTime.now().millisecondsSinceEpoch % 100000;
    final now = DateTime.now();
    final trialUser = AppUser(
      uid: 'trial-$rnd',
      email: 'demo_$rnd@daragat.local',
      displayName: 'مستخدم تجريبي ($rnd)',
      isTrial: true,
      subscriptionType: 'trial',
      subscriptionStatus: 'active',
      createdAt: now.toIso8601String(),
      expiresAt: now.add(const Duration(minutes: 5)).toIso8601String(),
      lastActiveAt: now.toIso8601String(),
      authProvider: 'trial',
    );
    _currentUser = trialUser;
    await _storageService.saveCurrentUser(trialUser);
    notifyListeners();
  }

  /// Sync local gradebook data with Cloudflare D1 (/api/data)
  Future<bool> syncCloudData({
    required List<MonthlyModel> models,
    required List<TermModel> terms,
    required TeacherProfile profile,
  }) async {
    if (_currentUser == null) return false;
    _isSyncing = true;
    notifyListeners();

    final success = await _apiService.syncDataToServer(
      models: models,
      terms: terms,
      profile: profile,
      token: _currentUser!.token,
    );
    _isSyncing = false;
    _isOnline = success;
    notifyListeners();
    return success;
  }

  /// Fetch remote gradebook data from Cloudflare D1 (/api/data)
  Future<Map<String, dynamic>?> fetchCloudData() async {
    if (_currentUser == null) return null;
    return await _apiService.fetchCloudData(userUid: _currentUser!.uid, token: _currentUser!.token);
  }

  Future<void> logout() async {
    await _storageService.clearCurrentUser();
    _currentUser = null;
    notifyListeners();
  }
}
