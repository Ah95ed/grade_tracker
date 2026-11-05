import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/app_user.dart';
import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';
import '../services/storage_service.dart';
import '../services/gradebook_api_service.dart';
import '../services/desktop_auth_service.dart';
import '../core/constants/api_endpoints.dart';

/// MVC Controller for Authentication, Cloudflare D1 Backend, and Google Auth
class AuthController extends ChangeNotifier {
  final StorageService _storageService;
  final GradebookApiService _apiService;
  AppUser? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isSyncing = false;
  bool _isOnline = true;
  static bool _googleSignInInitialized = false;

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
  StorageService get storageService => _storageService;
  void clearError() { _errorMessage = null; notifyListeners(); }

  Future<void> _ensureGoogleSignInInitialized() async {
    if (_googleSignInInitialized) return;
    try {
      final sId = ApiEndpoints.googleOAuthClientId.trim().isNotEmpty
          ? ApiEndpoints.googleOAuthClientId.trim()
          : null;
      await GoogleSignIn.instance.initialize(serverClientId: sId);
      _googleSignInInitialized = true;
    } catch (e) {
      debugPrint('GoogleSignIn initialize warning: $e');
    }
  }

  Future<bool> loginWithEmail(String email, String password) async {
    final cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.isEmpty || !cleanEmail.contains('@') || password.isEmpty) {
      _errorMessage = 'يرجى إدخال بريد إلكتروني صالح وكلمة المرور.';
      notifyListeners();
      return false;
    }
    _setLoading(true);
    try {
      final result = await _apiService.signInWithFirebase(cleanEmail, password);
      if (result['success'] == true) {
        final data = result['data'] as Map<String, dynamic>;
        final idToken = data['idToken'] as String?;
        final localId = data['localId'] as String? ?? 'usr_${DateTime.now().millisecondsSinceEpoch}';
        final dispName = (data['displayName'] as String?)?.isNotEmpty == true ? data['displayName'] as String : cleanEmail.split('@')[0];
        Map<String, dynamic>? serverInfo;
        try { serverInfo = await _apiService.fetchUserData(uid: localId, email: cleanEmail, token: idToken); } catch (_) {}
        final status = serverInfo?['user']?['subscriptionStatus'] as String? ?? 'active';
        if (status == 'cancelled' || status == 'suspended') {
          _errorMessage = 'تم إلغاء حسابك أو تعليقه من قِبل إدارة النظام.';
          _setLoading(false);
          return false;
        }
        final now = DateTime.now().toIso8601String();
        final user = AppUser(
          uid: localId, email: cleanEmail, displayName: serverInfo?['user']?['displayName'] as String? ?? dispName,
          subscriptionType: serverInfo?['user']?['subscriptionType'] as String? ?? 'monthly',
          subscriptionStatus: status, createdAt: serverInfo?['user']?['createdAt'] as String? ?? now,
          expiresAt: serverInfo?['user']?['expiresAt'] as String?, lastActiveAt: now, token: idToken,
          authProvider: 'email', isAdmin: cleanEmail == 'asmaomar5566@gmail.com' || cleanEmail == 'm11287137@gmail.com',
        );
        _currentUser = user;
        await _storageService.saveCurrentUser(user);
        final profile = _storageService.loadProfile(userUid: user.uid);
        if (profile.teacherName.isEmpty) {
          await _storageService.saveProfile(profile.copyWith(teacherName: user.displayName), userUid: user.uid);
        }
        _setLoading(false);
        return true;
      }
      final err = result['error'] as String?;
      _errorMessage = (err == 'INVALID_LOGIN_CREDENTIALS' || err == 'EMAIL_NOT_FOUND' || err == 'INVALID_PASSWORD')
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
          : (err == 'USER_DISABLED' ? 'تم تعطيل الحساب.' : 'فشل تسجيل الدخول. تحقق من الاتصال.');
      _setLoading(false);
      return false;
    } catch (_) {
      _errorMessage = 'حدث خطأ في الاتصال. يرجى التحقق من الإنترنت وإعادة المحاولة.';
      _setLoading(false);
      return false;
    }
  }

  Future<bool> registerWithEmail(String email, String password, String displayName) async {
    final cleanEmail = email.trim().toLowerCase();
    final name = displayName.trim();
    if (name.isEmpty) { _errorMessage = 'يرجى إدخال اسم المدرس الكامل.'; notifyListeners(); return false; }
    if (cleanEmail.isEmpty || !cleanEmail.contains('@') || password.length < 6) {
      _errorMessage = password.length < 6 ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' : 'يرجى إدخال بريد إلكتروني صالح.';
      notifyListeners();
      return false;
    }
    _setLoading(true);
    try {
      final result = await _apiService.signUpWithFirebase(cleanEmail, password, name);
      if (result['success'] == true) {
        final data = result['data'] as Map<String, dynamic>;
        final idToken = data['idToken'] as String?;
        final localId = data['localId'] as String? ?? 'usr_${DateTime.now().millisecondsSinceEpoch}';
        try { await _apiService.registerUserWithCloudflare(uid: localId, email: cleanEmail, displayName: name, authProvider: 'email', token: idToken); } catch (_) {}
        final now = DateTime.now().toIso8601String();
        final user = AppUser(
          uid: localId, email: cleanEmail, displayName: name, subscriptionType: 'monthly',
          subscriptionStatus: 'active', createdAt: now, lastActiveAt: now, token: idToken,
          authProvider: 'email', isAdmin: cleanEmail == 'asmaomar5566@gmail.com',
        );
        _currentUser = user;
        await _storageService.saveCurrentUser(user);
        final profile = _storageService.loadProfile(userUid: user.uid);
        await _storageService.saveProfile(profile.copyWith(teacherName: name), userUid: user.uid);
        _setLoading(false);
        return true;
      }
      final err = result['error'] as String?;
      _errorMessage = err == 'EMAIL_EXISTS' ? 'هذا البريد مسجل بالفعل.' : 'تعذر إنشاء الحساب. تحقق من الاتصال.';
      _setLoading(false);
      return false;
    } catch (_) {
      _errorMessage = 'حدث خطأ أثناء إنشاء الحساب. يرجى إعادة المحاولة.';
      _setLoading(false);
      return false;
    }
  }

  /// Sends a password reset email to the specified address
  Future<bool> sendPasswordReset(String email) async {
    final cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.isEmpty || !cleanEmail.contains('@')) {
      _errorMessage = 'يرجى إدخال بريد إلكتروني صالح.';
      notifyListeners();
      return false;
    }
    _setLoading(true);
    _errorMessage = null;
    try {
      final success = await _apiService.sendPasswordReset(cleanEmail);
      if (!success) {
        _errorMessage = 'تعذر إرسال رابط إعادة التعيين. تأكد من صحة البريد.';
      }
      _setLoading(false);
      return success;
    } catch (_) {
      _errorMessage = 'تعذر إرسال رابط إعادة التعيين. تحقق من اتصال الإنترنت.';
      _setLoading(false);
      return false;
    }
  }

  Future<bool> loginWithGoogle() async {
    _setLoading(true);
    try {
      String? gEmail;
      String? gName;
      String? idToken;
      String? accessToken;
      String? uid;

      if (Platform.isAndroid || Platform.isIOS) {
        bool nativeSuccess = false;
        try {
          await _ensureGoogleSignInInitialized();
          final account = await GoogleSignIn.instance.authenticate();
          gEmail = account.email;
          gName = account.displayName ?? gEmail.split('@')[0];
          idToken = account.authentication.idToken;
          uid = 'g_${account.id}';
          nativeSuccess = true;
        } on GoogleSignInException catch (e) {
          debugPrint('GoogleSignIn native exception: ${e.code} - ${e.description}');
          if (e.code == GoogleSignInExceptionCode.canceled) {
            _errorMessage = 'تم إلغاء عملية تسجيل الدخول.';
            _setLoading(false);
            return false;
          }
          // Native sign-in failed (e.g. SHA-1 not yet added in Firebase). Fall back to browser OAuth!
          debugPrint('Falling back to browser OAuth flow...');
        } catch (e) {
          debugPrint('GoogleSignIn native error: $e. Falling back to browser OAuth...');
        }

        if (!nativeSuccess) {
          final res = await DesktopAuthService.authenticateWithGoogle();
          if (!res.success) {
            final isCancel = res.error == 'USER_CANCELLED' || res.error == 'TIMEOUT';
            _errorMessage = isCancel ? 'تم إلغاء عملية تسجيل الدخول.' : 'تعذر تسجيل الدخول بـ Google (${res.error}).';
            _setLoading(false);
            return false;
          }
          gEmail = res.email;
          gName = (res.displayName?.isNotEmpty == true) ? res.displayName : gEmail?.split('@')[0];
          idToken = res.idToken;
          accessToken = res.accessToken;
          uid = res.uid;
        }
      } else {
        final res = await DesktopAuthService.authenticateWithGoogle();
        if (!res.success) {
          final isCancel = res.error == 'USER_CANCELLED' || res.error == 'TIMEOUT';
          _errorMessage = isCancel ? 'تم إلغاء عملية تسجيل الدخول.' : 'تعذر تسجيل الدخول بـ Google (${res.error}).';
          _setLoading(false);
          return false;
        }
        gEmail = res.email;
        gName = (res.displayName?.isNotEmpty == true) ? res.displayName : gEmail?.split('@')[0];
        idToken = res.idToken;
        accessToken = res.accessToken;
        uid = res.uid;
      }

      if (gEmail == null || gEmail.isEmpty) {
        _errorMessage = 'تعذر الحصول على معلومات الحساب.';
        _setLoading(false);
        return false;
      }

      String? fbToken = idToken;
      String cleanUid = uid ?? 'g_${gEmail.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}';
      if (idToken != null && idToken.isNotEmpty) {
        final idpRes = await _apiService.signInWithGoogleIdp(googleIdToken: idToken, googleAccessToken: accessToken);
        if (idpRes['success'] == true) {
          final idpData = idpRes['data'] as Map<String, dynamic>;
          fbToken = idpData['idToken'] as String? ?? fbToken;
          cleanUid = idpData['localId'] as String? ?? cleanUid;
        }
      }
      final now = DateTime.now().toIso8601String();
      try { await _apiService.registerUserWithCloudflare(uid: cleanUid, email: gEmail, displayName: gName ?? '', authProvider: 'google', token: fbToken); } catch (_) {}
      Map<String, dynamic>? serverInfo;
      try { serverInfo = await _apiService.fetchUserData(uid: cleanUid, email: gEmail, token: fbToken); } catch (_) {}
      final status = serverInfo?['user']?['subscriptionStatus'] as String? ?? 'active';
      final user = AppUser(
        uid: cleanUid, email: gEmail, displayName: serverInfo?['user']?['displayName'] as String? ?? gName ?? '',
        subscriptionType: serverInfo?['user']?['subscriptionType'] as String? ?? 'monthly', subscriptionStatus: status,
        createdAt: serverInfo?['user']?['createdAt'] as String? ?? now, expiresAt: serverInfo?['user']?['expiresAt'] as String?,
        lastActiveAt: now, authProvider: 'google', token: fbToken, isAdmin: gEmail == 'asmaomar5566@gmail.com' || gEmail == 'm11287137@gmail.com',
      );
      _currentUser = user;
      await _storageService.saveCurrentUser(user);
      final profile = _storageService.loadProfile(userUid: user.uid);
      await _storageService.saveProfile(profile.copyWith(teacherName: gName ?? ''), userUid: user.uid);
      _setLoading(false);
      return true;
    } catch (e, st) {
      debugPrint('loginWithGoogle top-level error: $e\n$st');
      _errorMessage = 'تعذر إتمام الدخول بحساب Google ($e).';
      _setLoading(false);
      return false;
    }
  }

  Future<void> startFreeTrial() async {
    final rnd = DateTime.now().millisecondsSinceEpoch % 100000;
    final now = DateTime.now();
    final trialUser = AppUser(
      uid: 'trial-$rnd', email: 'demo_$rnd@daragat.local', displayName: 'مستخدم تجريبي ($rnd)',
      isTrial: true, subscriptionType: 'trial', subscriptionStatus: 'active',
      createdAt: now.toIso8601String(), expiresAt: now.add(const Duration(minutes: 5)).toIso8601String(),
      lastActiveAt: now.toIso8601String(), authProvider: 'trial',
    );
    _currentUser = trialUser;
    await _storageService.saveCurrentUser(trialUser);
    notifyListeners();
  }

  Future<bool> syncCloudData({required List<MonthlyModel> models, required List<TermModel> terms, required TeacherProfile profile}) async {
    if (_currentUser == null) return false;
    _isSyncing = true;
    notifyListeners();
    final success = await _apiService.syncDataToServer(models: models, terms: terms, profile: profile, token: _currentUser!.token);
    _isSyncing = false;
    _isOnline = success;
    notifyListeners();
    return success;
  }

  Future<Map<String, dynamic>?> fetchCloudData() async =>
      _currentUser == null ? null : await _apiService.fetchCloudData(userUid: _currentUser!.uid, token: _currentUser!.token);

  Future<void> deleteAccount() async {
    await _storageService.deleteUserData(userUid: _currentUser?.uid);
    _currentUser = null;
    notifyListeners();
  }

  Future<void> logout() async {
    await _storageService.clearCurrentUser();
    _currentUser = null;
    notifyListeners();
  }

  void _setLoading(bool val) { _isLoading = val; if (val) _errorMessage = null; notifyListeners(); }
}
