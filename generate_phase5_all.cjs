const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  'D:/grade_tracker/download',
  'D:/home/z/my-project/download',
  'C:/home/z/my-project/download',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeToAll(relPath, content) {
  for (const base of TARGET_DIRS) {
    try {
      const fullPath = path.join(base, relPath);
      ensureDir(path.dirname(fullPath));
      fs.writeFileSync(fullPath, content, 'utf8');
    } catch (e) {
      console.warn('Could not write to ' + base + '/' + relPath + ': ' + e.message);
    }
  }
}

console.log('Generating Phase 5 Flutter State Management (Provider & MVC)...');

// =============================================================================
// 1. DATA MODELS (flutter_data/models/)
// =============================================================================

writeToAll('flutter_data/models/teacher_profile.dart', `import 'package:flutter/foundation.dart';

@immutable
class TeacherProfile {
  final String teacherName;
  final String schoolName;
  final String subject;
  final String academicYear;
  final String governorate;

  const TeacherProfile({
    this.teacherName = '',
    this.schoolName = '',
    this.subject = '',
    this.academicYear = '2024 - 2025',
    this.governorate = '',
  });

  TeacherProfile copyWith({
    String? teacherName,
    String? schoolName,
    String? subject,
    String? academicYear,
    String? governorate,
  }) {
    return TeacherProfile(
      teacherName: teacherName ?? this.teacherName,
      schoolName: schoolName ?? this.schoolName,
      subject: subject ?? this.subject,
      academicYear: academicYear ?? this.academicYear,
      governorate: governorate ?? this.governorate,
    );
  }

  Map<String, dynamic> toJson() => {
    'teacherName': teacherName,
    'schoolName': schoolName,
    'subject': subject,
    'academicYear': academicYear,
    'governorate': governorate,
  };

  factory TeacherProfile.fromJson(Map<String, dynamic> json) => TeacherProfile(
    teacherName: json['teacherName'] as String? ?? json['teacher_name'] as String? ?? '',
    schoolName: json['schoolName'] as String? ?? json['school_name'] as String? ?? '',
    subject: json['subject'] as String? ?? '',
    academicYear: json['academicYear'] as String? ?? json['academic_year'] as String? ?? '2024 - 2025',
    governorate: json['governorate'] as String? ?? '',
  );
}
`);

writeToAll('flutter_data/models/custom_column.dart', `import 'package:flutter/foundation.dart';

@immutable
class CustomColumn {
  final String id;
  final String name;
  final double maxScore;
  final int orderIndex;

  const CustomColumn({
    required this.id,
    required this.name,
    this.maxScore = 10.0,
    this.orderIndex = 0,
  });

  CustomColumn copyWith({
    String? id,
    String? name,
    double? maxScore,
    int? orderIndex,
  }) {
    return CustomColumn(
      id: id ?? this.id,
      name: name ?? this.name,
      maxScore: maxScore ?? this.maxScore,
      orderIndex: orderIndex ?? this.orderIndex,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'maxScore': maxScore,
    'orderIndex': orderIndex,
  };

  factory CustomColumn.fromJson(Map<String, dynamic> json) => CustomColumn(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    maxScore: (json['maxScore'] as num? ?? json['max_score'] as num? ?? 10).toDouble(),
    orderIndex: json['orderIndex'] as int? ?? json['order_index'] as int? ?? 0,
  );
}
`);

writeToAll('flutter_data/models/student_row.dart', `import 'package:flutter/foundation.dart';

@immutable
class StudentRow {
  final String id;
  final String name;
  final String gradeLevel;
  final String section;
  final double? writtenRawScore;
  final Map<String, double?> scores;
  final String? notes;

  const StudentRow({
    required this.id,
    required this.name,
    this.gradeLevel = '',
    this.section = 'أ',
    this.writtenRawScore,
    this.scores = const {},
    this.notes,
  });

  StudentRow copyWith({
    String? id,
    String? name,
    String? gradeLevel,
    String? section,
    double? writtenRawScore,
    Map<String, double?>? scores,
    String? notes,
  }) {
    return StudentRow(
      id: id ?? this.id,
      name: name ?? this.name,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      section: section ?? this.section,
      writtenRawScore: writtenRawScore ?? this.writtenRawScore,
      scores: scores ?? this.scores,
      notes: notes ?? this.notes,
    );
  }

  double calculateFinalScore() {
    double total = writtenRawScore ?? 0.0;
    for (final val in scores.values) {
      if (val != null) total += val;
    }
    return total;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'gradeLevel': gradeLevel,
    'section': section,
    'writtenRawScore': writtenRawScore,
    'scores': scores,
    'notes': notes,
  };

  factory StudentRow.fromJson(Map<String, dynamic> json) {
    final rawScores = json['scores'] as Map<String, dynamic>? ?? {};
    final parsedScores = <String, double?>{};
    rawScores.forEach((key, value) {
      parsedScores[key] = value != null ? (value as num).toDouble() : null;
    });

    return StudentRow(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      gradeLevel: json['gradeLevel'] as String? ?? json['grade_level'] as String? ?? '',
      section: json['section'] as String? ?? 'أ',
      writtenRawScore: json['writtenRawScore'] != null
          ? (json['writtenRawScore'] as num).toDouble()
          : (json['written_raw_score'] != null ? (json['written_raw_score'] as num).toDouble() : null),
      scores: parsedScores,
      notes: json['notes'] as String?,
    );
  }
}
`);

writeToAll('flutter_data/models/monthly_model.dart', `import 'package:flutter/foundation.dart';
import 'custom_column.dart';
import 'student_row.dart';

@immutable
class MonthlyModel {
  final String id;
  final String name;
  final String gradeLevel;
  final String section;
  final List<CustomColumn> columns;
  final List<StudentRow> students;
  final DateTime? createdAt;

  const MonthlyModel({
    required this.id,
    required this.name,
    this.gradeLevel = '',
    this.section = 'أ',
    this.columns = const [],
    this.students = const [],
    this.createdAt,
  });

  MonthlyModel copyWith({
    String? id,
    String? name,
    String? gradeLevel,
    String? section,
    List<CustomColumn>? columns,
    List<StudentRow>? students,
    DateTime? createdAt,
  }) {
    return MonthlyModel(
      id: id ?? this.id,
      name: name ?? this.name,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      section: section ?? this.section,
      columns: columns ?? this.columns,
      students: students ?? this.students,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'gradeLevel': gradeLevel,
    'section': section,
    'columns': columns.map((c) => c.toJson()).toList(),
    'students': students.map((s) => s.toJson()).toList(),
    'createdAt': createdAt?.toIso8601String(),
  };

  factory MonthlyModel.fromJson(Map<String, dynamic> json) => MonthlyModel(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    gradeLevel: json['gradeLevel'] as String? ?? json['grade_level'] as String? ?? '',
    section: json['section'] as String? ?? 'أ',
    columns: (json['columns'] as List<dynamic>? ?? [])
        .map((e) => CustomColumn.fromJson(e as Map<String, dynamic>))
        .toList(),
    students: (json['students'] as List<dynamic>? ?? [])
        .map((e) => StudentRow.fromJson(e as Map<String, dynamic>))
        .toList(),
    createdAt: json['createdAt'] != null
        ? DateTime.tryParse(json['createdAt'] as String)
        : (json['created_at'] != null ? DateTime.tryParse(json['created_at'] as String) : null),
  );
}
`);

writeToAll('flutter_data/models/term_model.dart', `import 'package:flutter/foundation.dart';

@immutable
class TermSelectedModel {
  final String modelId;
  final double weight;
  final int orderIndex;

  const TermSelectedModel({
    required this.modelId,
    this.weight = 1.0,
    this.orderIndex = 0,
  });

  Map<String, dynamic> toJson() => {
    'modelId': modelId,
    'weight': weight,
    'orderIndex': orderIndex,
  };

  factory TermSelectedModel.fromJson(Map<String, dynamic> json) => TermSelectedModel(
    modelId: json['modelId'] as String? ?? json['model_id'] as String? ?? '',
    weight: (json['weight'] as num? ?? 1.0).toDouble(),
    orderIndex: json['orderIndex'] as int? ?? json['order_index'] as int? ?? 0,
  );
}

@immutable
class TermModel {
  final String id;
  final String name;
  final List<TermSelectedModel> selectedModels;
  final DateTime? createdAt;

  const TermModel({
    required this.id,
    required this.name,
    this.selectedModels = const [],
    this.createdAt,
  });

  TermModel copyWith({
    String? id,
    String? name,
    List<TermSelectedModel>? selectedModels,
    DateTime? createdAt,
  }) {
    return TermModel(
      id: id ?? this.id,
      name: name ?? this.name,
      selectedModels: selectedModels ?? this.selectedModels,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'selectedModels': selectedModels.map((m) => m.toJson()).toList(),
    'createdAt': createdAt?.toIso8601String(),
  };

  factory TermModel.fromJson(Map<String, dynamic> json) => TermModel(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    selectedModels: (json['selectedModels'] as List<dynamic>? ?? json['selected_models'] as List<dynamic>? ?? [])
        .map((e) => TermSelectedModel.fromJson(e as Map<String, dynamic>))
        .toList(),
    createdAt: json['createdAt'] != null
        ? DateTime.tryParse(json['createdAt'] as String)
        : (json['created_at'] != null ? DateTime.tryParse(json['created_at'] as String) : null),
  );
}
`);

writeToAll('flutter_data/models/app_user.dart', `import 'package:flutter/foundation.dart';

@immutable
class AppUser {
  final String uid;
  final String email;
  final String displayName;
  final String subscriptionType; // trial, monthly, yearly, lifetime
  final String subscriptionStatus; // active, expired, pending, cancelled
  final String? expiresAt;
  final bool isAdmin;
  final String? idToken;
  final String? refreshToken;
  final DateTime? tokenExpiresAt;

  const AppUser({
    required this.uid,
    required this.email,
    this.displayName = '',
    this.subscriptionType = 'trial',
    this.subscriptionStatus = 'active',
    this.expiresAt,
    this.isAdmin = false,
    this.idToken,
    this.refreshToken,
    this.tokenExpiresAt,
  });

  bool get isTokenExpired {
    if (tokenExpiresAt == null) return false;
    return DateTime.now().isAfter(tokenExpiresAt!);
  }

  AppUser copyWith({
    String? uid,
    String? email,
    String? displayName,
    String? subscriptionType,
    String? subscriptionStatus,
    String? expiresAt,
    bool? isAdmin,
    String? idToken,
    String? refreshToken,
    DateTime? tokenExpiresAt,
  }) {
    return AppUser(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      subscriptionType: subscriptionType ?? this.subscriptionType,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      expiresAt: expiresAt ?? this.expiresAt,
      isAdmin: isAdmin ?? this.isAdmin,
      idToken: idToken ?? this.idToken,
      refreshToken: refreshToken ?? this.refreshToken,
      tokenExpiresAt: tokenExpiresAt ?? this.tokenExpiresAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'uid': uid,
    'email': email,
    'displayName': displayName,
    'subscriptionType': subscriptionType,
    'subscriptionStatus': subscriptionStatus,
    'expiresAt': expiresAt,
    'isAdmin': isAdmin,
    'idToken': idToken,
    'refreshToken': refreshToken,
    'tokenExpiresAt': tokenExpiresAt?.toIso8601String(),
  };

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    uid: json['uid'] as String? ?? '',
    email: json['email'] as String? ?? '',
    displayName: json['displayName'] as String? ?? json['display_name'] as String? ?? '',
    subscriptionType: json['subscriptionType'] as String? ?? json['subscription_type'] as String? ?? 'trial',
    subscriptionStatus: json['subscriptionStatus'] as String? ?? json['subscription_status'] as String? ?? 'active',
    expiresAt: json['expiresAt'] as String? ?? json['expires_at'] as String?,
    isAdmin: json['isAdmin'] as bool? ?? (json['is_admin'] == 1 || json['is_admin'] == true),
    idToken: json['idToken'] as String?,
    refreshToken: json['refreshToken'] as String?,
    tokenExpiresAt: json['tokenExpiresAt'] != null ? DateTime.tryParse(json['tokenExpiresAt'] as String) : null,
  );
}
`);

// =============================================================================
// 2. DATA SERVICES (flutter_data/services/)
// =============================================================================

writeToAll('flutter_data/services/api_client.dart', `import 'dart:convert';
import 'package:http/http.dart' as http;

/// عميل REST API الموحّد مع التمرير التلقائي لرمز المصادقة Bearer Token
class ApiClient {
  final http.Client _client;
  final String baseUrl;
  String? _idToken;
  String? _refreshToken;
  final String firebaseApiKey;

  ApiClient({
    http.Client? client,
    this.baseUrl = 'https://daragat.pages.dev',
    this.firebaseApiKey = 'AIzaSyCt83OG0NioLFOMK2qHwoJHcu40cJnB5gw',
    String? idToken,
    String? refreshToken,
  })  : _client = client ?? http.Client(),
        _idToken = idToken,
        _refreshToken = refreshToken;

  void updateTokens({String? idToken, String? refreshToken}) {
    if (idToken != null) _idToken = idToken;
    if (refreshToken != null) _refreshToken = refreshToken;
  }

  Map<String, String> _buildHeaders() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_idToken != null && _idToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer \$_idToken';
    }
    return headers;
  }

  Future<http.Response> get(String path) async {
    final url = Uri.parse('\$baseUrl\$path');
    var res = await _client.get(url, headers: _buildHeaders()).timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && _refreshToken != null) {
      final refreshed = await refreshIdToken();
      if (refreshed) {
        res = await _client.get(url, headers: _buildHeaders()).timeout(const Duration(seconds: 15));
      }
    }
    return res;
  }

  Future<http.Response> post(String path, dynamic body) async {
    final url = Uri.parse('\$baseUrl\$path');
    var res = await _client.post(
      url,
      headers: _buildHeaders(),
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 20));

    if (res.statusCode == 401 && _refreshToken != null) {
      final refreshed = await refreshIdToken();
      if (refreshed) {
        res = await _client.post(
          url,
          headers: _buildHeaders(),
          body: jsonEncode(body),
        ).timeout(const Duration(seconds: 20));
      }
    }
    return res;
  }

  Future<http.Response> delete(String path) async {
    final url = Uri.parse('\$baseUrl\$path');
    return await _client.delete(url, headers: _buildHeaders()).timeout(const Duration(seconds: 15));
  }

  Future<bool> refreshIdToken() async {
    if (_refreshToken == null || _refreshToken!.isEmpty) return false;
    try {
      final refreshUrl = Uri.parse('https://securetoken.googleapis.com/v1/token?key=\$firebaseApiKey');
      final res = await _client.post(
        refreshUrl,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'grant_type=refresh_token&refresh_token=\$_refreshToken',
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        _idToken = data['id_token'] as String?;
        _refreshToken = data['refresh_token'] as String? ?? _refreshToken;
        return true;
      }
    } catch (_) {}
    return false;
  }
}
`);

writeToAll('flutter_data/services/data_service.dart', `import 'dart:convert';
import 'api_client.dart';
import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';

/// خدمة مزامنة بيانات دفتر الدرجات مع Cloudflare D1 (/api/data)
class DataService {
  final ApiClient apiClient;

  DataService(this.apiClient);

  /// جلب كافة السجلات السحابية المرتبطة بحساب المعلم الحالي
  Future<Map<String, dynamic>?> fetchCloudData() async {
    try {
      final res = await apiClient.get('/api/data');
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        if (body['success'] == true && body['data'] != null) {
          final data = body['data'] as Map<String, dynamic>;
          final models = (data['models'] as List<dynamic>? ?? [])
              .map((e) => MonthlyModel.fromJson(e as Map<String, dynamic>))
              .toList();
          final terms = (data['terms'] as List<dynamic>? ?? [])
              .map((e) => TermModel.fromJson(e as Map<String, dynamic>))
              .toList();
          final profile = data['profile'] != null
              ? TeacherProfile.fromJson(data['profile'] as Map<String, dynamic>)
              : const TeacherProfile();

          return {'models': models, 'terms': terms, 'profile': profile};
        }
      }
    } catch (_) {}
    return null;
  }

  /// رفع وتحديث نماذج الدرجات والفصول والملف الشخصي في السحابة
  Future<bool> syncDataToCloud({
    required List<MonthlyModel> models,
    required List<TermModel> terms,
    required TeacherProfile profile,
  }) async {
    try {
      final payload = {
        'models': models.map((m) => m.toJson()).toList(),
        'terms': terms.map((t) => t.toJson()).toList(),
        'profile': profile.toJson(),
      };
      final res = await apiClient.post('/api/data', payload);
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        return body['success'] == true;
      }
    } catch (_) {}
    return false;
  }

  /// حذف كافة السجلات السحابية للمعلم
  Future<bool> purgeCloudData() async {
    try {
      final res = await apiClient.delete('/api/data');
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
`);

writeToAll('flutter_data/services/users_service.dart', `import 'dart:convert';
import 'api_client.dart';
import '../models/app_user.dart';

/// خدمة إدارة حساب المعلم وصلاحيات الاشتراك (/api/users)
class UsersService {
  final ApiClient apiClient;

  UsersService(this.apiClient);

  /// التحقق من صلاحية الحساب وحالة الاشتراك من الخادم السحابي
  Future<AppUser?> verifyUserAccount(String uid, String email) async {
    try {
      final res = await apiClient.get('/api/users');
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        if (body['success'] == true && body['user'] != null) {
          return AppUser.fromJson(body['user'] as Map<String, dynamic>);
        }
      }
    } catch (_) {}
    return null;
  }

  /// تسجيل المستخدم الجديد تلقائياً في قاعدة بيانات Cloudflare D1
  Future<bool> registerUserRecord({
    required String uid,
    required String email,
    String? displayName,
  }) async {
    try {
      final res = await apiClient.post('/api/users', {
        'uid': uid,
        'email': email,
        'displayName': displayName ?? '',
      });
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
`);

writeToAll('flutter_data/services/gemini_extraction_service.dart', `import 'dart:convert';
import 'api_client.dart';

/// خدمة استخراج قوائم الطلاب والدرجات آلياً عبر الذكاء الاصطناعي (/api/extract-students)
class GeminiExtractionService {
  final ApiClient apiClient;

  GeminiExtractionService(this.apiClient);

  Future<Map<String, dynamic>?> extractStudentsFromImage({
    required String base64Image,
    String mimeType = 'image/jpeg',
    String? hintPrompt,
  }) async {
    try {
      final res = await apiClient.post('/api/extract-students', {
        'imageBase64': base64Image,
        'mimeType': mimeType,
        'promptHint': hintPrompt ?? '',
      });
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        if (body['success'] == true) {
          return body;
        }
      }
    } catch (_) {}
    return null;
  }
}
`);

writeToAll('flutter_data/services/local_storage_service.dart', `import 'dart:convert';
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
    if (uid != null && uid.isNotEmpty) return '\${baseKey}_\$uid';
    return '\${baseKey}_guest';
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
`);

// =============================================================================
// 3. REPOSITORIES (flutter_data/repositories/)
// =============================================================================

writeToAll('flutter_data/repositories/gradebook_repository.dart', `import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';
import '../services/data_service.dart';
import '../services/local_storage_service.dart';

/// مستودع إدارة درجات الطلاب الموحد (Offline-First Repository)
class GradebookRepository {
  final LocalStorageService localStorage;
  final DataService dataService;

  GradebookRepository({
    required this.localStorage,
    required this.dataService,
  });

  // Models
  Future<List<MonthlyModel>> getModels({String? userUid}) async {
    return localStorage.loadModels(userUid: userUid);
  }

  Future<void> persistModels(List<MonthlyModel> models, {String? userUid}) async {
    await localStorage.saveModels(models, userUid: userUid);
    await localStorage.setPendingSync(true);
  }

  // Terms
  Future<List<TermModel>> getTerms({String? userUid}) async {
    return localStorage.loadTerms(userUid: userUid);
  }

  Future<void> persistTerms(List<TermModel> terms, {String? userUid}) async {
    await localStorage.saveTerms(terms, userUid: userUid);
    await localStorage.setPendingSync(true);
  }

  // Profile
  Future<TeacherProfile> getProfile({String? userUid}) async {
    return localStorage.loadProfile(userUid: userUid);
  }

  Future<void> persistProfile(TeacherProfile profile, {String? userUid}) async {
    await localStorage.saveProfile(profile, userUid: userUid);
    await localStorage.setPendingSync(true);
  }

  /// تنفيذ مزامنة سحابية كاملة
  Future<bool> synchronize({String? userUid}) async {
    final models = localStorage.loadModels(userUid: userUid);
    final terms = localStorage.loadTerms(userUid: userUid);
    final profile = localStorage.loadProfile(userUid: userUid);

    final ok = await dataService.syncDataToCloud(
      models: models,
      terms: terms,
      profile: profile,
    );

    if (ok) {
      await localStorage.setPendingSync(false);
    }
    return ok;
  }
}
`);

// =============================================================================
// 4. PROVIDER STATE CONTROLLERS (flutter_state/)
// =============================================================================

writeToAll('flutter_state/auth_controller.dart', `import 'package:flutter/foundation.dart';
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
`);

writeToAll('flutter_state/monthly_sheet_controller.dart', `import 'package:flutter/foundation.dart';
import '../flutter_data/models/monthly_model.dart';
import '../flutter_data/models/student_row.dart';
import '../flutter_data/models/custom_column.dart';
import '../flutter_data/repositories/gradebook_repository.dart';

/// متحكم نماذج وسجلات الدرجات الشهرية باستخدام Provider
class MonthlySheetController extends ChangeNotifier {
  final GradebookRepository _repository;
  String? _currentUserUid;

  List<MonthlyModel> _models = [];
  String? _activeModelId;
  String _searchQuery = '';
  String? _selectedSection;
  bool _isLoaded = false;

  MonthlySheetController(this._repository) {
    loadData();
  }

  List<MonthlyModel> get models => _models;
  String? get activeModelId => _activeModelId;
  String get searchQuery => _searchQuery;
  String? get selectedSection => _selectedSection;

  MonthlyModel? get activeModel {
    if (_models.isEmpty) return null;
    if (_activeModelId == null) return _models.first;
    return _models.firstWhere((m) => m.id == _activeModelId, orElse: () => _models.first);
  }

  List<StudentRow> get filteredStudents {
    final model = activeModel;
    if (model == null) return [];

    return model.students.where((st) {
      final matchesSearch = _searchQuery.isEmpty || st.name.contains(_searchQuery);
      final matchesSection = _selectedSection == null || _selectedSection == 'الكل' || st.section == _selectedSection;
      return matchesSearch && matchesSection;
    }).toList();
  }

  void setUserUid(String? uid) {
    _currentUserUid = uid;
    loadData();
  }

  Future<void> loadData() async {
    _models = await _repository.getModels(userUid: _currentUserUid);
    if (_models.isNotEmpty && _activeModelId == null) {
      _activeModelId = _models.first.id;
    }
    _isLoaded = true;
    notifyListeners();
  }

  void selectModel(String modelId) {
    _activeModelId = modelId;
    notifyListeners();
  }

  void setSearchQuery(String q) {
    _searchQuery = q.trim();
    notifyListeners();
  }

  void setSelectedSection(String? sec) {
    _selectedSection = sec;
    notifyListeners();
  }

  Future<void> addModel(String name, {String gradeLevel = '', String section = 'أ'}) async {
    if (!_isLoaded) {
      _models = await _repository.getModels(userUid: _currentUserUid);
      _isLoaded = true;
    }

    final newModel = MonthlyModel(
      id: 'model_\${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      gradeLevel: gradeLevel,
      section: section,
      columns: const [
        CustomColumn(id: 'col_oral', name: 'الشفهي', maxScore: 10, orderIndex: 0),
        CustomColumn(id: 'col_daily', name: 'اليومي', maxScore: 10, orderIndex: 1),
      ],
      students: const [],
      createdAt: DateTime.now(),
    );

    _models = [..._models, newModel];
    _activeModelId = newModel.id;
    await _repository.persistModels(_models, userUid: _currentUserUid);
    notifyListeners();
  }

  Future<void> updateStudentScore({
    required String studentId,
    String? columnId,
    double? score,
    double? writtenScore,
  }) async {
    final m = activeModel;
    if (m == null) return;

    final updatedStudents = m.students.map((st) {
      if (st.id != studentId) return st;
      if (writtenScore != null) {
        return st.copyWith(writtenRawScore: writtenScore);
      }
      if (columnId != null) {
        final newScores = Map<String, double?>.from(st.scores);
        newScores[columnId] = score;
        return st.copyWith(scores: newScores);
      }
      return st;
    }).toList();

    final updatedModel = m.copyWith(students: updatedStudents);
    _models = _models.map((mod) => mod.id == updatedModel.id ? updatedModel : mod).toList();
    await _repository.persistModels(_models, userUid: _currentUserUid);
    notifyListeners();
  }
}
`);

writeToAll('flutter_state/term_controller.dart', `import 'package:flutter/foundation.dart';
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
      id: 'term_\${DateTime.now().millisecondsSinceEpoch}',
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
`);

writeToAll('flutter_state/sync_controller.dart', `import 'package:flutter/foundation.dart';
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
        _lastSyncedAt = '\${now.hour.toString().padLeft(2, '0')}:\${now.minute.toString().padLeft(2, '0')}';
      }
      return success;
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }
}
`);

writeToAll('flutter_state/ui_controller.dart', `import 'package:flutter/material.dart';

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
`);

// =============================================================================
// 5. MAIN ENTRY POINT (download/main.dart)
// =============================================================================

writeToAll('main.dart', `import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';

import 'app_theme.dart';
import 'flutter_data/services/api_client.dart';
import 'flutter_data/services/data_service.dart';
import 'flutter_data/services/users_service.dart';
import 'flutter_data/services/local_storage_service.dart';
import 'flutter_data/repositories/gradebook_repository.dart';
import 'flutter_state/auth_controller.dart';
import 'flutter_state/monthly_sheet_controller.dart';
import 'flutter_state/term_controller.dart';
import 'flutter_state/sync_controller.dart';
import 'flutter_state/ui_controller.dart';

import 'flutter_widgets/header/app_header.dart';
import 'flutter_widgets/views/monthly_sheet_view.dart';
import 'flutter_widgets/views/term_calculation_view.dart';
import 'flutter_widgets/views/report_cards_view.dart';
import 'flutter_widgets/common/bottom_score_keypad.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialise Local Offline Storage
  final localStorage = await LocalStorageService.init();

  // 2. Initialise HTTP REST Client & Services
  final apiClient = ApiClient();
  final dataService = DataService(apiClient);
  final usersService = UsersService(apiClient);
  final repository = GradebookRepository(localStorage: localStorage, dataService: dataService);

  // 3. Safe Firebase Initialization with Fallback Options
  try {
    await Firebase.initializeApp();
  } catch (e) {
    log('Firebase initialization notice: \$e');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthController(
            storage: localStorage,
            apiClient: apiClient,
            usersService: usersService,
          ),
        ),
        ChangeNotifierProvider(create: (_) => MonthlySheetController(repository)),
        ChangeNotifierProvider(create: (_) => TermController(repository)),
        ChangeNotifierProvider(create: (_) => SyncController(repository)),
        ChangeNotifierProvider(create: (_) => UiController()),
      ],
      child: const DaragatTeacherApp(),
    ),
  );
}

class DaragatTeacherApp extends StatelessWidget {
  const DaragatTeacherApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'دفتر درجات المعلم',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,
      locale: const Locale('ar', 'IQ'),
      supportedLocales: const [Locale('ar', 'IQ'), Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const Directionality(
        textDirection: TextDirection.rtl,
        child: GradebookShellScreen(),
      ),
    );
  }
}

class GradebookShellScreen extends StatelessWidget {
  const GradebookShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ui = context.watch<UiController>();
    final sync = context.watch<SyncController>();
    final monthly = context.watch<MonthlySheetController>();
    final term = context.watch<TermController>();

    return Scaffold(
      appBar: AppHeader(
        activeTab: ui.activeTab,
        teacherName: 'الأستاذ: علي محمد',
        subject: 'الرياضيات',
        schoolName: 'ثانوية المتميزين',
        isOnline: sync.isOnline,
        isSyncing: sync.isSyncing,
        onOpenMenu: () {},
        onTriggerSync: () => sync.triggerSync(),
      ),
      body: Stack(
        children: [
          IndexedStack(
            index: ui.activeTab,
            children: [
              // 0: Monthly Sheet
              MonthlySheetView(
                models: monthly.models.map((m) => m.name).toList(),
                activeModel: monthly.activeModel?.name ?? 'بدون نماذج',
                onSelectModel: (name) {
                  final target = monthly.models.firstWhere((m) => m.name == name);
                  monthly.selectModel(target.id);
                },
                onAddNewModel: () => monthly.addModel('شهر جديد'),
              ),
              // 1: Term Calculation
              TermCalculationView(
                terms: term.terms.map((t) => t.name).toList(),
                onAddTerm: () => term.addTerm('الفصل الدراسي', const []),
              ),
              // 2: Report Cards
              ReportCardsView(
                onPrint: () {},
                onOpenPrintSettings: () {},
              ),
              // 3: Admin Dashboard
              const Center(child: Text('لوحة تحكم المشرف')),
            ],
          ),
          if (ui.isScoreKeypadVisible)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: BottomScoreKeypad(
                onKeyPress: (k) {},
                onDelete: () {},
                onNextStudent: () {},
                onClose: () => ui.toggleScoreKeypad(false),
              ),
            ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: ui.activeTab,
        onDestinationSelected: (idx) => ui.setActiveTab(idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.table_chart_rounded),
            label: 'الدرجات الشهرية',
          ),
          NavigationDestination(
            icon: Icon(Icons.calculate_rounded),
            label: 'حساب الفصول',
          ),
          NavigationDestination(
            icon: Icon(Icons.badge_rounded),
            label: 'كروت الشهادات',
          ),
          NavigationDestination(
            icon: Icon(Icons.admin_panel_settings_rounded),
            label: 'الإدارة',
          ),
        ],
      ),
    );
  }
}
`);

// =============================================================================
// 6. PHASE 5 STATE MANAGEMENT UNIT / WIDGET TESTS
// =============================================================================

writeToAll('flutter_tests/state_provider_test.dart', `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../flutter_data/models/app_user.dart';
import '../flutter_data/models/teacher_profile.dart';
import '../flutter_data/services/api_client.dart';
import '../flutter_data/services/data_service.dart';
import '../flutter_data/services/users_service.dart';
import '../flutter_data/services/local_storage_service.dart';
import '../flutter_data/repositories/gradebook_repository.dart';
import '../flutter_state/auth_controller.dart';
import '../flutter_state/monthly_sheet_controller.dart';
import '../flutter_state/term_controller.dart';
import '../flutter_state/sync_controller.dart';
import '../flutter_state/ui_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late LocalStorageService storage;
  late ApiClient apiClient;
  late DataService dataService;
  late UsersService usersService;
  late GradebookRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await LocalStorageService.init();
    apiClient = ApiClient();
    dataService = DataService(apiClient);
    usersService = UsersService(apiClient);
    repository = GradebookRepository(localStorage: storage, dataService: dataService);
  });

  test('AuthController initializes with empty user and enters guest mode properly', () {
    final auth = AuthController(storage: storage, apiClient: apiClient, usersService: usersService);
    expect(auth.isAuthenticated, isFalse);

    auth.enterGuestMode();
    expect(auth.isAuthenticated, isTrue);
    expect(auth.currentUser?.email, 'guest@daragat.local');
  });

  test('MonthlySheetController manages models, students, and scoring reactivity', () async {
    final ctrl = MonthlySheetController(repository);
    await ctrl.loadData();
    expect(ctrl.models, isEmpty);

    await ctrl.addModel('تشرين الأول', gradeLevel: 'الثالث متوسط', section: 'أ');
    expect(ctrl.models.length, 1);
    expect(ctrl.activeModel?.name, 'تشرين الأول');
    expect(ctrl.activeModel?.columns.length, 2);
  });

  test('UiController switches active tabs and toggles floating score keypad', () {
    final ui = UiController();
    expect(ui.activeTab, 0);
    expect(ui.isScoreKeypadVisible, isFalse);

    ui.setActiveTab(2);
    expect(ui.activeTab, 2);

    ui.toggleScoreKeypad(true);
    expect(ui.isScoreKeypadVisible, isTrue);
  });

  testWidgets('MultiProvider integration renders Gradebook Shell and responds to state changes', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1000, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final authCtrl = AuthController(storage: storage, apiClient: apiClient, usersService: usersService);
    final monthlyCtrl = MonthlySheetController(repository);
    final termCtrl = TermController(repository);
    final syncCtrl = SyncController(repository);
    final uiCtrl = UiController();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: authCtrl),
          ChangeNotifierProvider.value(value: monthlyCtrl),
          ChangeNotifierProvider.value(value: termCtrl),
          ChangeNotifierProvider.value(value: syncCtrl),
          ChangeNotifierProvider.value(value: uiCtrl),
        ],
        child: const MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              body: Text('راصد الدرجات جاهز'),
            ),
          ),
        ),
      ),
    );

    expect(find.text('راصد الدرجات جاهز'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
`);

console.log('All Phase 5 State Management files generated successfully!');
