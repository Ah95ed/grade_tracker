/// Centralized API Endpoints and Network Configuration
class ApiEndpoints {
  // Cloudflare Pages Live Base URL
  static const String defaultBaseUrl = 'https://daragat.pages.dev';

  // Cloudflare Pages Functions API Endpoints
  static const String dataEndpoint = '/api/data';
  static const String usersEndpoint = '/api/users';
  static const String extractStudentsEndpoint = '/api/extract-students';
  static const String backupEndpoint = '/api/backup';

  // Firebase Auth Configuration & REST Endpoints
  static const String firebaseApiKey = 'AIzaSyCt83OG0NioLFOMK2qHwoJHcu40cJnB5gw';
  static const String firebaseProjectId = 'gen-lang-client-0369327125';
  static const String firebaseAuthDomain = 'gen-lang-client-0369327125.firebaseapp.com';

  static const String firebaseSignInUrl =
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$firebaseApiKey';
  static const String firebaseSignUpUrl =
      'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$firebaseApiKey';
  static const String firebaseResetPasswordUrl =
      'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=$firebaseApiKey';
  static const String firebaseUpdateProfileUrl =
      'https://identitytoolkit.googleapis.com/v1/accounts:update?key=$firebaseApiKey';

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
