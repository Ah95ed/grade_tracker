import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/app_constants.dart';
import '../models/app_user.dart';
import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';

/// Local offline-first persistent storage service
class StorageService {
  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    final service = StorageService(prefs);
    service._purgeLegacyMockData();
    return service;
  }

  void _purgeLegacyMockData() {
    // Purge any stale mock models/profiles containing hardcoded student or teacher names
    final rawModels = _prefs.getString(AppConstants.keyModels);
    if (rawModels != null && rawModels.contains('أحمد محمود عباس')) {
      _prefs.remove(AppConstants.keyModels);
    }
    final rawProfile = _prefs.getString(AppConstants.keyProfile);
    if (rawProfile != null && rawProfile.contains('علي حسن')) {
      _prefs.remove(AppConstants.keyProfile);
    }
  }

  // App User & Session
  Future<void> saveCurrentUser(AppUser user) async =>
      await _prefs.setString(AppConstants.keyCurrentUser, jsonEncode(user.toJson()));

  AppUser? loadCurrentUser() {
    final raw = _prefs.getString(AppConstants.keyCurrentUser);
    if (raw != null) {
      try {
        return AppUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } catch (_) {}
    }
    return null;
  }

  Future<void> clearCurrentUser() async => await _prefs.remove(AppConstants.keyCurrentUser);

  // Teacher Profile
  Future<void> saveProfile(TeacherProfile profile, {String? userUid}) async {
    final key = userUid != null ? '${AppConstants.keyProfile}_$userUid' : AppConstants.keyProfile;
    await _prefs.setString(key, jsonEncode(profile.toJson()));
  }

  TeacherProfile loadProfile({String? userUid}) {
    final key = userUid != null ? '${AppConstants.keyProfile}_$userUid' : AppConstants.keyProfile;
    final raw = _prefs.getString(key) ?? _prefs.getString(AppConstants.keyProfile);
    if (raw != null) {
      try {
        final profile = TeacherProfile.fromJson(jsonDecode(raw) as Map<String, dynamic>);
        if (profile.teacherName != 'الأستاذ: علي حسن') return profile;
      } catch (_) {}
    }
    return const TeacherProfile();
  }

  // Monthly Models
  Future<void> saveModels(List<MonthlyModel> models, {String? userUid}) async {
    final key = userUid != null ? '${AppConstants.keyModels}_$userUid' : AppConstants.keyModels;
    await _prefs.setString(key, jsonEncode(models.map((m) => m.toJson()).toList()));
  }

  List<MonthlyModel> loadModels({String? userUid}) {
    final key = userUid != null ? '${AppConstants.keyModels}_$userUid' : AppConstants.keyModels;
    final raw = _prefs.getString(key) ?? _prefs.getString(AppConstants.keyModels);
    if (raw != null) {
      try {
        final List<dynamic> list = jsonDecode(raw) as List<dynamic>;
        final models = list.map((e) => MonthlyModel.fromJson(e as Map<String, dynamic>)).toList();
        return models.where((m) => !m.students.any((s) => s.name == 'أحمد محمود عباس')).toList();
      } catch (_) {}
    }
    return [];
  }

  // Terms
  Future<void> saveTerms(List<TermModel> terms, {String? userUid}) async {
    final key = userUid != null ? '${AppConstants.keyTerms}_$userUid' : AppConstants.keyTerms;
    await _prefs.setString(key, jsonEncode(terms.map((t) => t.toJson()).toList()));
  }

  List<TermModel> loadTerms({String? userUid}) {
    final key = userUid != null ? '${AppConstants.keyTerms}_$userUid' : AppConstants.keyTerms;
    final raw = _prefs.getString(key) ?? _prefs.getString(AppConstants.keyTerms);
    if (raw != null) {
      try {
        final List<dynamic> list = jsonDecode(raw) as List<dynamic>;
        return list.map((e) => TermModel.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {}
    }
    return [];
  }

  // Language Locale Code
  Future<void> saveLocale(String code) async => await _prefs.setString(AppConstants.keyLocale, code);
  String loadLocale() => _prefs.getString(AppConstants.keyLocale) ?? 'ar';

  // Backup Export and Import
  String exportBackupJson({String? userUid}) {
    final data = {
      'app': 'GradeTracker',
      'version': '1.0.0',
      'exportDate': DateTime.now().toIso8601String(),
      'profile': loadProfile(userUid: userUid).toJson(),
      'models': loadModels(userUid: userUid).map((m) => m.toJson()).toList(),
      'terms': loadTerms(userUid: userUid).map((t) => t.toJson()).toList(),
    };
    return const JsonEncoder.withIndent('  ').convert(data);
  }

  bool importBackupJson(String rawJson, {String? userUid}) {
    try {
      final decoded = jsonDecode(rawJson) as Map<String, dynamic>;
      if (decoded['models'] is List) {
        final list = (decoded['models'] as List).map((e) => MonthlyModel.fromJson(e as Map<String, dynamic>)).toList();
        saveModels(list, userUid: userUid);
      }
      if (decoded['terms'] is List) {
        final list = (decoded['terms'] as List).map((e) => TermModel.fromJson(e as Map<String, dynamic>)).toList();
        saveTerms(list, userUid: userUid);
      }
      if (decoded['profile'] is Map) {
        saveProfile(TeacherProfile.fromJson(decoded['profile'] as Map<String, dynamic>), userUid: userUid);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> deleteUserData({String? userUid}) async {
    final pKey = userUid != null ? '${AppConstants.keyProfile}_$userUid' : AppConstants.keyProfile;
    final mKey = userUid != null ? '${AppConstants.keyModels}_$userUid' : AppConstants.keyModels;
    final tKey = userUid != null ? '${AppConstants.keyTerms}_$userUid' : AppConstants.keyTerms;
    await _prefs.remove(pKey);
    await _prefs.remove(mKey);
    await _prefs.remove(tKey);
    await clearCurrentUser();
  }

  Future<void> clearAll() async => await _prefs.clear();
}
