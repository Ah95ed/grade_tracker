/// Centralized API Endpoints and Network Configuration
class ApiEndpoints {
  // Base URLs (Production & Development fallback)
  static const String defaultBaseUrl = 'https://daragathann.pages.dev';

  // API Endpoints
  static const String dataEndpoint = '/api/data';
  static const String usersEndpoint = '/api/users';
  static const String extractStudentsEndpoint = '/api/extract-students';
  static const String backupEndpoint = '/api/backup';

  // Timeout settings
  static const Duration requestTimeout = Duration(seconds: 25);
  static const Duration uploadTimeout = Duration(seconds: 60);

  // Default Headers
  static Map<String, String> getHeaders({String? token}) {
    final Map<String, String> headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }
}

