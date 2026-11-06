import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_user.dart';
import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';

/// التخزين المحلي المعزول لكل مستخدم Offline-First Local Storage
class LocalStorageService {
  final SharedPreferences _prefs;

  static const String _keyCurrentUser = 'gradebook_auth_current_user_v2';
  static const String _keyModels = 'teacher_gradebook_models_v2';
  static const String _keyTerms = 'teacher_gradebook_terms_v2';
  static const String _keyProfile = 'teacher_gradebook_profile_v2';
  static const String _keyPendingSync = 'gradebook_pending_sync_flag_v2';

  LocalStorageService(this._prefs);

  static Future<LocalStorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return LocalStorageService(prefs);
  }

  String _scoped(String baseKey, String? uid) {
    if (uid != null && uid.isNotEmpty) return '${baseKey}_$uid';
    return '${baseKey}_guest';
  }

  // App User
  Future<void> saveCurrentUser(AppUser user) async =>
      await _prefs.setString(_keyCurrentUser, jsonEncode(user.toJson()));

  AppUser? loadCurrentUser() {
    final raw = _prefs.getString(_keyCurrentUser);
    if (raw != null) {
      try {
        return AppUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } catch (_) {}
    }
    return null;
  }

  Future<void> clearCurrentUser() async => await _prefs.remove(_keyCurrentUser);

  // Models
  Future<void> saveModels(List<MonthlyModel> models, {String? userUid}) async {
    final key = _scoped(_keyModels, userUid);
    await _prefs.setString(key, jsonEncode(models.map((m) => m.toJson()).toList()));
  }

  List<MonthlyModel> loadModels({String? userUid}) {
    final key = _scoped(_keyModels, userUid);
    final raw = _prefs.getString(key);
    if (raw != null) {
      try {
        final list = jsonDecode(raw) as List<dynamic>;
        return list.map((e) => MonthlyModel.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {}
    }
    return [];
  }

  // Terms
  Future<void> saveTerms(List<TermModel> terms, {String? userUid}) async {
    final key = _scoped(_keyTerms, userUid);
    await _prefs.setString(key, jsonEncode(terms.map((t) => t.toJson()).toList()));
  }

  List<TermModel> loadTerms({String? userUid}) {
    final key = _scoped(_keyTerms, userUid);
    final raw = _prefs.getString(key);
    if (raw != null) {
      try {
        final list = jsonDecode(raw) as List<dynamic>;
        return list.map((e) => TermModel.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {}
    }
    return [];
  }

  // Teacher Profile
  Future<void> saveProfile(TeacherProfile profile, {String? userUid}) async {
    final key = _scoped(_keyProfile, userUid);
    await _prefs.setString(key, jsonEncode(profile.toJson()));
  }

  TeacherProfile loadProfile({String? userUid}) {
    final key = _scoped(_keyProfile, userUid);
    final raw = _prefs.getString(key);
    if (raw != null) {
      try {
        return TeacherProfile.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } catch (_) {}
    }
    return const TeacherProfile();
  }

  // Sync Flags
  Future<void> setPendingSync(bool pending) async =>
      await _prefs.setBool(_keyPendingSync, pending);

  bool hasPendingSync() => _prefs.getBool(_keyPendingSync) ?? false;
}
