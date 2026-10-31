import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/models/teacher_profile.dart';

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
}
