import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/models/teacher_profile.dart';
import 'package:grade_tracker/models/app_user.dart';

void main() {
  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.init();
  });

  test('StorageService contains zero hardcoded students or fake models by default', () {
    final models = storage.loadModels();
    final terms = storage.loadTerms();
    expect(models, isEmpty);
    expect(terms, isEmpty);
  });

  test('TeacherProfile defaults are completely empty with zero hardcoded names', () {
    const profile = TeacherProfile();
    expect(profile.teacherName, '');
    expect(profile.schoolName, '');
    expect(profile.subject, '');
    expect(profile.gradeLevel, '');
    expect(profile.academicYear, '');
    expect(profile.governorate, '');
  });

  test('Purge removes legacy mock data containing عباس or علي حسن', () async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('models', '[{"name":"أحمد محمود عباس"}]');
    await prefs.setString('teacher_profile', '{"teacherName":"الأستاذ: علي حسن"}');

    // Re-initialize storage should purge mock data
    final cleanedStorage = await StorageService.init();
    expect(cleanedStorage.loadModels(), isEmpty);
    expect(cleanedStorage.loadProfile().teacherName, '');
  });

  test('AppUser correctly reports isTokenExpired and serializes refreshToken', () {
    final now = DateTime.now().millisecondsSinceEpoch;
    final userValid = AppUser(
      uid: 'u1',
      email: 'test@example.com',
      createdAt: DateTime.now().toIso8601String(),
      lastActiveAt: DateTime.now().toIso8601String(),
      token: 'jwt_token',
      refreshToken: 'refresh_123',
      tokenExpiresAt: now + 3600000,
    );
    expect(userValid.isTokenExpired, isFalse);
    expect(userValid.refreshToken, 'refresh_123');

    final json = userValid.toJson();
    final restored = AppUser.fromJson(json);
    expect(restored.refreshToken, 'refresh_123');
    expect(restored.tokenExpiresAt, now + 3600000);
    expect(restored.isTokenExpired, isFalse);

    final userExpired = userValid.copyWith(tokenExpiresAt: now - 1000);
    expect(userExpired.isTokenExpired, isTrue);

    const userNoToken = AppUser(
      uid: 'u2',
      email: 'guest@example.com',
      createdAt: '',
      lastActiveAt: '',
    );
    expect(userNoToken.isTokenExpired, isTrue);
  });
}
