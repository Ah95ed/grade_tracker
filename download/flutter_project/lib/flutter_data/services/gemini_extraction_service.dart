import 'dart:convert';
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
