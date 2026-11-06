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

/// Result object for cloud sync operations
class SyncResult {
  final bool success;
  final String message;
  final bool isOffline;
  final bool isAuthError;

  const SyncResult({
    required this.success,
    required this.message,
    this.isOffline = false,
    this.isAuthError = false,
  });
}

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
        final refreshToken = data['refreshToken'] as String?;
        final expSec = int.tryParse(data['expiresIn']?.toString() ?? '3600') ?? 3600;
        final tokenExpiresAt = DateTime.now().millisecondsSinceEpoch + (expSec * 1000);
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
          expiresAt: serverInfo?['user']?['expiresAt'] as String?, lastActiveAt: now,
          token: idToken, refreshToken: refreshToken, tokenExpiresAt: tokenExpiresAt,
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
        final refreshToken = data['refreshToken'] as String?;
        final expSec = int.tryParse(data['expiresIn']?.toString() ?? '3600') ?? 3600;
        final tokenExpiresAt = DateTime.now().millisecondsSinceEpoch + (expSec * 1000);
        final localId = data['localId'] as String? ?? 'usr_${DateTime.now().millisecondsSinceEpoch}';
        try { await _apiService.registerUserWithCloudflare(uid: localId, email: cleanEmail, displayName: name, authProvider: 'email', token: idToken); } catch (_) {}
        final now = DateTime.now().toIso8601String();
        final user = AppUser(
          uid: localId, email: cleanEmail, displayName: name, subscriptionType: 'monthly',
          subscriptionStatus: 'active', createdAt: now, lastActiveAt: now,
          token: idToken, refreshToken: refreshToken, tokenExpiresAt: tokenExpiresAt,
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
      String? refreshToken;
      int? tokenExpiresAt;
      String cleanUid = uid ?? 'g_${gEmail.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}';
      if (idToken != null && idToken.isNotEmpty) {
        final idpRes = await _apiService.signInWithGoogleIdp(googleIdToken: idToken, googleAccessToken: accessToken);
        if (idpRes['success'] == true) {
          final idpData = idpRes['data'] as Map<String, dynamic>;
          fbToken = idpData['idToken'] as String? ?? fbToken;
          refreshToken = idpData['refreshToken'] as String?;
          cleanUid = idpData['localId'] as String? ?? cleanUid;
          final expSec = int.tryParse(idpData['expiresIn']?.toString() ?? '3600') ?? 3600;
          tokenExpiresAt = DateTime.now().millisecondsSinceEpoch + (expSec * 1000);
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
        lastActiveAt: now, authProvider: 'google',
        token: fbToken, refreshToken: refreshToken, tokenExpiresAt: tokenExpiresAt,
        isAdmin: gEmail == 'asmaomar5566@gmail.com' || gEmail == 'm11287137@gmail.com',
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

  /// Ensures the current user has a fresh, unexpired ID token, automatically refreshing if necessary
  Future<String?> ensureValidToken({bool forceRefresh = false}) async {
    if (_currentUser == null) return null;
    if (!forceRefresh && !_currentUser!.isTokenExpired && _currentUser!.token != null && _currentUser!.token!.isNotEmpty) {
      return _currentUser!.token;
    }
    if (_currentUser!.refreshToken != null && _currentUser!.refreshToken!.isNotEmpty) {
      try {
        final refreshRes = await _apiService.refreshIdToken(_currentUser!.refreshToken!);
        if (refreshRes['success'] == true) {
          final data = refreshRes['data'] as Map<String, dynamic>;
          final newToken = (data['id_token'] ?? data['idToken']) as String?;
          final newRefresh = (data['refresh_token'] ?? data['refreshToken']) as String? ?? _currentUser!.refreshToken;
          final expSec = int.tryParse((data['expires_in'] ?? data['expiresIn'])?.toString() ?? '3600') ?? 3600;
          if (newToken != null && newToken.isNotEmpty) {
            final updatedUser = _currentUser!.copyWith(
              token: newToken,
              refreshToken: newRefresh,
              tokenExpiresAt: DateTime.now().millisecondsSinceEpoch + (expSec * 1000),
            );
            _currentUser = updatedUser;
            await _storageService.saveCurrentUser(updatedUser);
            notifyListeners();
            return newToken;
          }
        }
      } catch (e) {
        debugPrint('Token refresh exception: $e');
      }
    }
    return _currentUser!.token;
  }

  /// Synchronizes all models, terms, and teacher profile to Cloudflare D1 with automatic token refresh
  Future<SyncResult> syncCloudData({
    required List<MonthlyModel> models,
    required List<TermModel> terms,
    required TeacherProfile profile,
  }) async {
    if (_currentUser == null) {
      return const SyncResult(
        success: false,
        message: 'يرجى تسجيل الدخول بحسابك أولاً لتفعيل المزامنة السحابية.',
      );
    }

    if (_currentUser!.isTrial || _currentUser!.uid.startsWith('trial-') || _currentUser!.authProvider == 'trial') {
      return const SyncResult(
        success: false,
        isOffline: false,
        message: 'أنت مسجل حالياً كـ (مستخدم تجريبي). للمزامنة السحابية مع الخادم وقاعدة البيانات، يرجى تسجيل الدخول بحسابك (بريد إلكتروني أو Google). بياناتك محفوظة بأمان محلياً على جهازك.',
      );
    }

    _isSyncing = true;
    notifyListeners();

    try {
      String? token = await ensureValidToken();
      if (token == null || token.isEmpty) {
        token = await ensureValidToken(forceRefresh: true);
      }

      var res = await _apiService.syncDataToServer(
        models: models,
        terms: terms,
        profile: profile,
        userUid: _currentUser!.uid,
        email: _currentUser!.email,
        token: token,
        isAdmin: _currentUser!.isAdmin,
        isTrial: _currentUser!.isTrial,
      );

      // If token expired (401), force refresh and retry once
      if (res['success'] != true && res['statusCode'] == 401 && _currentUser!.refreshToken != null) {
        final refreshRes = await _apiService.refreshIdToken(_currentUser!.refreshToken!);
        if (refreshRes['success'] == true) {
          final data = refreshRes['data'] as Map<String, dynamic>;
          final newToken = (data['id_token'] ?? data['idToken']) as String?;
          final newRefresh = (data['refresh_token'] ?? data['refreshToken']) as String? ?? _currentUser!.refreshToken;
          final expSec = int.tryParse((data['expires_in'] ?? data['expiresIn'])?.toString() ?? '3600') ?? 3600;
          if (newToken != null) {
            final updatedUser = _currentUser!.copyWith(
              token: newToken,
              refreshToken: newRefresh,
              tokenExpiresAt: DateTime.now().millisecondsSinceEpoch + (expSec * 1000),
            );
            _currentUser = updatedUser;
            await _storageService.saveCurrentUser(updatedUser);

            res = await _apiService.syncDataToServer(
              models: models,
              terms: terms,
              profile: profile,
              userUid: _currentUser!.uid,
              email: _currentUser!.email,
              token: newToken,
              isAdmin: _currentUser!.isAdmin,
              isTrial: _currentUser!.isTrial,
            );
          }
        }
      }

      final success = res['success'] == true;
      _isOnline = success;
      _isSyncing = false;
      notifyListeners();

      if (success) {
        return const SyncResult(
          success: true,
          message: 'تمت مزامنة جميع البيانات بنجاح مع السحابة (Cloudflare D1).',
        );
      } else {
        final statusCode = res['statusCode'] as int? ?? 0;
        final err = res['error']?.toString();
        if (statusCode == 401) {
          return const SyncResult(
            success: false,
            isAuthError: true,
            message: 'انتهت صلاحية جلسة الدخول. يرجى إعادة تسجيل الدخول لمتابعة المزامنة.',
          );
        }
        return SyncResult(
          success: false,
          isOffline: statusCode == 0 || err == 'NETWORK_ERROR',
          message: (err != null && err.isNotEmpty && err != 'NETWORK_ERROR')
              ? err
              : 'أنت غير متصل بالإنترنت حالياً. بياناتك محفوظة بأمان على جهازك.',
        );
      }
    } catch (e) {
      _isSyncing = false;
      notifyListeners();
      return const SyncResult(
        success: false,
        isOffline: true,
        message: 'تعذر الاتصال بالسحابة حالياً، بياناتك محفوظة 100% محلياً على جهازك.',
      );
    }
  }

  /// Fetches saved models, terms, and teacher profile from Cloudflare D1
  Future<Map<String, dynamic>?> fetchCloudData() async {
    if (_currentUser == null) return null;
    final token = await ensureValidToken();
    return await _apiService.fetchCloudData(
      userUid: _currentUser!.uid,
      email: _currentUser!.email,
      token: token,
      isAdmin: _currentUser!.isAdmin,
      isTrial: _currentUser!.isTrial,
    );
  }

  /// Restores cloud backup into local controllers if local is empty and cloud has data
  Future<bool> restoreCloudDataIfEmpty({
    required Function(List<MonthlyModel>) onModelsRestored,
    required Function(List<TermModel>) onTermsRestored,
    required Function(TeacherProfile) onProfileRestored,
  }) async {
    if (_currentUser == null) return false;
    try {
      final cloudData = await fetchCloudData();
      if (cloudData == null) return false;

      bool restoredAny = false;
      if (cloudData['models'] is List && (cloudData['models'] as List).isNotEmpty) {
        final modelsList = (cloudData['models'] as List)
            .map((m) => MonthlyModel.fromJson(m as Map<String, dynamic>))
            .toList();
        await onModelsRestored(modelsList);
        restoredAny = true;
      }
      if (cloudData['terms'] is List && (cloudData['terms'] as List).isNotEmpty) {
        final termsList = (cloudData['terms'] as List)
            .map((t) => TermModel.fromJson(t as Map<String, dynamic>))
            .toList();
        await onTermsRestored(termsList);
        restoredAny = true;
      }
      if (cloudData['profile'] is Map && (cloudData['profile'] as Map).isNotEmpty) {
        final profile = TeacherProfile.fromJson(cloudData['profile'] as Map<String, dynamic>);
        if (profile.teacherName.isNotEmpty) {
          await onProfileRestored(profile);
          restoredAny = true;
        }
      }
      return restoredAny;
    } catch (_) {
      return false;
    }
  }

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
