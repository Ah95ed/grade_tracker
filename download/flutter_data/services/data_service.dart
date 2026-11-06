import 'dart:convert';
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
