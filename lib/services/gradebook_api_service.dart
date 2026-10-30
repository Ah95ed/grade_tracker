import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/constants/api_endpoints.dart';
import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';

/// Gradebook remote REST API client service
class GradebookApiService {
  final http.Client _client;
  final String baseUrl;

  GradebookApiService({
    http.Client? client,
    this.baseUrl = ApiEndpoints.defaultBaseUrl,
  }) : _client = client ?? http.Client();

  /// Fetches remote gradebook data from cloud API
  Future<Map<String, dynamic>?> fetchCloudData({String? token}) async {
    try {
      final uri = Uri.parse('$baseUrl${ApiEndpoints.dataEndpoint}');
      final response = await _client
          .get(uri, headers: ApiEndpoints.getHeaders(token: token))
          .timeout(ApiEndpoints.requestTimeout);

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {
      // Offline fallback
    }
    return null;
  }

  /// Synchronizes local gradebook data with remote server
  Future<bool> syncDataToServer({
    required List<MonthlyModel> models,
    required List<TermModel> terms,
    required TeacherProfile profile,
    String? token,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl${ApiEndpoints.dataEndpoint}');
      final payload = jsonEncode({
        'models': models.map((m) => m.toJson()).toList(),
        'terms': terms.map((t) => t.toJson()).toList(),
        'profile': profile.toJson(),
      });

      final response = await _client
          .post(uri, headers: ApiEndpoints.getHeaders(token: token), body: payload)
          .timeout(ApiEndpoints.requestTimeout);

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  void dispose() {
    _client.close();
  }
}

