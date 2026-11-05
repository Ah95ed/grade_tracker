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
  static const String _defaultFirebaseApiKey = 'AIzaSyCt83OG0NioLFOMK2qHwoJHcu40cJnB5gw';
  static const String _rawFirebaseApiKey = String.fromEnvironment(
    'FIREBASE_API_KEY',
    defaultValue: _defaultFirebaseApiKey,
  );
  static String get firebaseApiKey =>
      _rawFirebaseApiKey.trim().isNotEmpty ? _rawFirebaseApiKey.trim() : _defaultFirebaseApiKey;

  static const String firebaseProjectId = 'gen-lang-client-0369327125';
  static const String firebaseAuthDomain = 'gen-lang-client-0369327125.firebaseapp.com';

  static const String _defaultWebClientId =
      '1059409489946-kpduqfvb1r9b8kka3cici5q4452ajp5n.apps.googleusercontent.com';
  static const String _rawGoogleWebClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
    defaultValue: _defaultWebClientId,
  );
  static String get googleOAuthClientId =>
      _rawGoogleWebClientId.trim().isNotEmpty ? _rawGoogleWebClientId.trim() : _defaultWebClientId;

  static const String googleOAuthDesktopClientId =
      String.fromEnvironment('GOOGLE_DESKTOP_CLIENT_ID');
  static const String googleOAuthDesktopClientSecret =
      String.fromEnvironment('GOOGLE_DESKTOP_CLIENT_SECRET');
  static const String googleOAuthAndroidClientId =
      String.fromEnvironment('GOOGLE_ANDROID_CLIENT_ID');

  static String get firebaseSignInUrl =>
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$firebaseApiKey';
  static String get firebaseSignUpUrl =>
      'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$firebaseApiKey';
  static String get firebaseResetPasswordUrl =>
      'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=$firebaseApiKey';
  static String get firebaseUpdateProfileUrl =>
      'https://identitytoolkit.googleapis.com/v1/accounts:update?key=$firebaseApiKey';
  static String get firebaseSignInWithIdpUrl =>
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=$firebaseApiKey';
  static String get firebaseRefreshTokenUrl =>
      'https://securetoken.googleapis.com/v1/token?key=$firebaseApiKey';

  // Timeout settings
  static const Duration requestTimeout = Duration(seconds: 12);
  static const Duration uploadTimeout = Duration(seconds: 40);

  // Default Headers matching Cloudflare Pages and SyncManager
  static Map<String, String> getHeaders({
    String? token,
    String? userUid,
    String? userEmail,
    bool isAdmin = false,
    bool isTrial = false,
  }) {
    final Map<String, String> headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    } else if (userUid != null && userUid.isNotEmpty) {
      headers['Authorization'] = 'Bearer $userUid';
    }
    if (userUid != null && userUid.isNotEmpty) {
      headers['x-user-uid'] = userUid;
    }
    if (userEmail != null && userEmail.isNotEmpty) {
      headers['x-user-email'] = userEmail.trim().toLowerCase();
    }
    if (isAdmin) {
      headers['x-user-admin'] = 'true';
    }
    if (isTrial) {
      headers['x-trial-user'] = 'true';
    }
    return headers;
  }
}
