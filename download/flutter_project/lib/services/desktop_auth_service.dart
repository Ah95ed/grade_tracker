import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/api_endpoints.dart';

/// Result object for Desktop OAuth authentication flow
class DesktopAuthResult {
  final bool success;
  final String? email;
  final String? displayName;
  final String? photoUrl;
  final String? idToken;
  final String? accessToken;
  final String? uid;
  final String? error;

  const DesktopAuthResult({
    required this.success,
    this.email,
    this.displayName,
    this.photoUrl,
    this.idToken,
    this.accessToken,
    this.uid,
    this.error,
  });
}

/// Standards-compliant OAuth 2.0 PKCE loopback authentication service for Desktop Windows
class DesktopAuthService {
  static String _generateRandomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
    final rand = Random.secure();
    return List.generate(length, (_) => chars[rand.nextInt(chars.length)]).join();
  }

  static String _generateCodeChallenge(String verifier) {
    final bytes = utf8.encode(verifier);
    final digest = sha256.convert(bytes);
    return base64UrlEncode(digest.bytes).replaceAll('=', '');
  }

  static String _buildHtmlResponse({required bool isSuccess}) {
    return '''<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>راصد الدرجات</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #FAF8F5; }
    .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 32px; max-width: 400px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    h1 { color: #1E293B; font-size: 20px; margin: 12px 0 8px; }
    p { color: #64748B; font-size: 14px; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${isSuccess ? 'تم تسجيل الدخول بنجاح!' : 'تم إلغاء تسجيل الدخول'}</h1>
    <p>${isSuccess ? 'تم التحقق من حسابك. يمكنك إغلاق هذا المتصفح والعودة إلى تطبيق راصد الدرجات.' : 'لم يكتمل تسجيل الدخول. يمكنك إغلاق هذه النافذة.'}</p>
  </div>
</body>
</html>''';
  }

  /// Launch external browser with Google OAuth consent screen & capture loopback response
  static Future<DesktopAuthResult> authenticateWithGoogle({
    String? clientId,
    String? clientSecret,
  }) async {
    final activeClientId = clientId ?? ApiEndpoints.googleOAuthDesktopClientId;
    final activeClientSecret = clientSecret ?? ApiEndpoints.googleOAuthDesktopClientSecret;

    if (activeClientId.isEmpty || activeClientSecret.isEmpty) {
      return const DesktopAuthResult(
        success: false,
        error: 'GOOGLE_KEYS_MISSING (يرجى تمرير مفاتيح الدخول عبر dart-define)',
      );
    }

    final verifier = _generateRandomString(64);
    final challenge = _generateCodeChallenge(verifier);

    HttpServer? server;
    try {
      server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final port = server.port;
      final redirectUri = 'http://127.0.0.1:$port';

      final authUri = Uri.https('accounts.google.com', '/o/oauth2/v2/auth', {
        'client_id': activeClientId,
        'redirect_uri': redirectUri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'code_challenge': challenge,
        'code_challenge_method': 'S256',
        'access_type': 'offline',
        'prompt': 'select_account',
      });

      if (!await launchUrl(authUri, mode: LaunchMode.externalApplication)) {
        await server.close(force: true);
        return const DesktopAuthResult(success: false, error: 'COULD_NOT_LAUNCH_BROWSER');
      }

      final completer = Completer<String?>();
      final sub = server.listen((HttpRequest request) async {
        final code = request.uri.queryParameters['code'];
        final error = request.uri.queryParameters['error'];

        request.response.headers.contentType = ContentType.html;
        request.response.write(_buildHtmlResponse(isSuccess: code != null));
        await request.response.close();

        if (!completer.isCompleted) {
          if (code != null) {
            completer.complete(code);
          } else {
            completer.completeError(error ?? 'USER_CANCELLED');
          }
        }
      });

      final authCode = await completer.future.timeout(
        const Duration(minutes: 2),
        onTimeout: () => null,
      );

      await sub.cancel();
      await server.close(force: true);

      if (authCode == null) {
        return const DesktopAuthResult(success: false, error: 'TIMEOUT');
      }

      // Exchange code for tokens
      final tokenBody = <String, String>{
        'client_id': activeClientId,
        'code': authCode,
        'code_verifier': verifier,
        'grant_type': 'authorization_code',
        'redirect_uri': redirectUri,
      };
      if (activeClientSecret.isNotEmpty) {
        tokenBody['client_secret'] = activeClientSecret;
      }

      final tokenRes = await http.post(
        Uri.parse('https://oauth2.googleapis.com/token'),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: tokenBody,
      );

      final tokenData = jsonDecode(tokenRes.body) as Map<String, dynamic>;
      final accessToken = tokenData['access_token'] as String?;
      final idToken = tokenData['id_token'] as String?;

      if (accessToken == null) {
        final err = tokenData['error_description']?.toString() ??
            tokenData['error']?.toString() ?? 'TOKEN_EXCHANGE_FAILED';
        return DesktopAuthResult(success: false, error: err);
      }

      // Fetch user profile info from Google UserInfo endpoint
      final userRes = await http.get(
        Uri.parse('https://www.googleapis.com/oauth2/v3/userinfo'),
        headers: {'Authorization': 'Bearer $accessToken'},
      );

      if (userRes.statusCode == 200) {
        final userData = jsonDecode(userRes.body) as Map<String, dynamic>;
        return DesktopAuthResult(
          success: true,
          email: userData['email'] as String?,
          displayName: userData['name'] as String?,
          photoUrl: userData['picture'] as String?,
          idToken: idToken,
          accessToken: accessToken,
          uid: 'g_${userData['sub']}',
        );
      }

      return const DesktopAuthResult(success: false, error: 'FETCH_PROFILE_FAILED');
    } catch (e) {
      await server?.close(force: true);
      return DesktopAuthResult(success: false, error: e.toString());
    }
  }
}
