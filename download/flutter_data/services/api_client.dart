import 'dart:convert';
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
      headers['Authorization'] = 'Bearer $_idToken';
    }
    return headers;
  }

  Future<http.Response> get(String path) async {
    final url = Uri.parse('$baseUrl$path');
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
    final url = Uri.parse('$baseUrl$path');
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
    final url = Uri.parse('$baseUrl$path');
    return await _client.delete(url, headers: _buildHeaders()).timeout(const Duration(seconds: 15));
  }

  Future<bool> refreshIdToken() async {
    if (_refreshToken == null || _refreshToken!.isEmpty) return false;
    try {
      final refreshUrl = Uri.parse('https://securetoken.googleapis.com/v1/token?key=$firebaseApiKey');
      final res = await _client.post(
        refreshUrl,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'grant_type=refresh_token&refresh_token=$_refreshToken',
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
