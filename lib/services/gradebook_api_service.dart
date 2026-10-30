import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/constants/api_endpoints.dart';
import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';

/// Gradebook remote REST API client connecting to Cloudflare D1 and Firebase Auth
class GradebookApiService {
  final http.Client _client;
  final String baseUrl;

  GradebookApiService({
    http.Client? client,
    this.baseUrl = ApiEndpoints.defaultBaseUrl,
  }) : _client = client ?? http.Client();

  /// Authenticate with real Firebase Identity Toolkit REST API
  Future<Map<String, dynamic>> signInWithFirebase(String email, String password) async {
    try {
      final res = await _client.post(
        Uri.parse(ApiEndpoints.firebaseSignInUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password, 'returnSecureToken': true}),
      ).timeout(ApiEndpoints.requestTimeout);

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode == 200) return {'success': true, 'data': data};
      final errMsg = data['error']?['message'] as String? ?? 'LOGIN_FAILED';
      return {'success': false, 'error': errMsg};
    } catch (_) {
      return {'success': false, 'error': 'NETWORK_ERROR'};
    }
  }

  /// Register new user with Firebase Auth REST API
  Future<Map<String, dynamic>> signUpWithFirebase(String email, String password, String displayName) async {
    try {
      final res = await _client.post(
        Uri.parse(ApiEndpoints.firebaseSignUpUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password, 'returnSecureToken': true}),
      ).timeout(ApiEndpoints.requestTimeout);

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode == 200) {
        final idToken = data['idToken'] as String?;
        if (idToken != null && displayName.isNotEmpty) {
          await _client.post(
            Uri.parse(ApiEndpoints.firebaseUpdateProfileUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'idToken': idToken, 'displayName': displayName, 'returnSecureToken': true}),
          ).timeout(ApiEndpoints.requestTimeout);
        }
        return {'success': true, 'data': data};
      }
      final errMsg = data['error']?['message'] as String? ?? 'REGISTRATION_FAILED';
      return {'success': false, 'error': errMsg};
    } catch (_) {
      return {'success': false, 'error': 'NETWORK_ERROR'};
    }
  }

  /// Send password reset link to user email
  Future<bool> sendPasswordReset(String email) async {
    try {
      final res = await _client.post(
        Uri.parse(ApiEndpoints.firebaseResetPasswordUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'requestType': 'PASSWORD_RESET', 'email': email}),
      ).timeout(ApiEndpoints.requestTimeout);
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Register or verify user in Cloudflare D1 (/api/users)
  Future<Map<String, dynamic>?> registerUserWithCloudflare({
    required String uid,
    required String email,
    required String displayName,
    required String authProvider,
    String? token,
  }) async {
    try {
      final res = await _client.post(
        Uri.parse('$baseUrl${ApiEndpoints.usersEndpoint}'),
        headers: ApiEndpoints.getHeaders(token: token),
        body: jsonEncode({
          'uid': uid,
          'email': email,
          'displayName': displayName,
          'authProvider': authProvider,
        }),
      ).timeout(ApiEndpoints.requestTimeout);
      if (res.statusCode == 200 || res.statusCode == 201) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  /// Check user subscription and account status from Cloudflare D1 (/api/users)
  Future<Map<String, dynamic>?> fetchUserData({
    required String uid,
    required String email,
    String? token,
  }) async {
    try {
      final uri = Uri.parse(
        '$baseUrl${ApiEndpoints.usersEndpoint}?email=${Uri.encodeComponent(email)}&uid=${Uri.encodeComponent(uid)}',
      );
      final res = await _client.get(uri, headers: ApiEndpoints.getHeaders(token: token)).timeout(ApiEndpoints.requestTimeout);
      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  /// Fetches saved models, students, terms, and teacher profile from Cloudflare D1 (/api/data)
  Future<Map<String, dynamic>?> fetchCloudData({
    required String userUid,
    String? token,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl${ApiEndpoints.dataEndpoint}?uid=${Uri.encodeComponent(userUid)}');
      final res = await _client.get(uri, headers: ApiEndpoints.getHeaders(token: token)).timeout(ApiEndpoints.requestTimeout);
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body) as Map<String, dynamic>;
        if (decoded['success'] == true && decoded['data'] != null) {
          return decoded['data'] as Map<String, dynamic>;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Synchronizes all models, custom columns, students, and terms to Cloudflare D1 (/api/data)
  Future<bool> syncDataToServer({
    required List<MonthlyModel> models,
    required List<TermModel> terms,
    required TeacherProfile profile,
    String? token,
  }) async {
    try {
      final res = await _client.post(
        Uri.parse('$baseUrl${ApiEndpoints.dataEndpoint}'),
        headers: ApiEndpoints.getHeaders(token: token),
        body: jsonEncode({
          'models': models.map((m) => m.toJson()).toList(),
          'terms': terms.map((t) => t.toJson()).toList(),
          'profile': profile.toJson(),
        }),
      ).timeout(ApiEndpoints.requestTimeout);
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// AI OCR endpoint for extracting students and scores from photo
  Future<Map<String, dynamic>?> extractStudents({
    required String base64Image,
    required String mimeType,
    String? token,
  }) async {
    try {
      final res = await _client.post(
        Uri.parse('$baseUrl${ApiEndpoints.extractStudentsEndpoint}'),
        headers: ApiEndpoints.getHeaders(token: token),
        body: jsonEncode({'image': base64Image, 'mimeType': mimeType}),
      ).timeout(ApiEndpoints.uploadTimeout);
      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  void dispose() => _client.close();
}
