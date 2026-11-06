import 'dart:convert';
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
