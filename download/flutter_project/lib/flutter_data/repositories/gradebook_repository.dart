import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';
import '../services/data_service.dart';
import '../services/local_storage_service.dart';

/// مستودع إدارة درجات الطلاب الموحد (Offline-First Repository)
class GradebookRepository {
  final LocalStorageService localStorage;
  final DataService dataService;

  GradebookRepository({
    required this.localStorage,
    required this.dataService,
  });

  // Models
  Future<List<MonthlyModel>> getModels({String? userUid}) async {
    return localStorage.loadModels(userUid: userUid);
  }

  Future<void> persistModels(List<MonthlyModel> models, {String? userUid}) async {
    await localStorage.saveModels(models, userUid: userUid);
    await localStorage.setPendingSync(true);
  }

  // Terms
  Future<List<TermModel>> getTerms({String? userUid}) async {
    return localStorage.loadTerms(userUid: userUid);
  }

  Future<void> persistTerms(List<TermModel> terms, {String? userUid}) async {
    await localStorage.saveTerms(terms, userUid: userUid);
    await localStorage.setPendingSync(true);
  }

  // Profile
  Future<TeacherProfile> getProfile({String? userUid}) async {
    return localStorage.loadProfile(userUid: userUid);
  }

  Future<void> persistProfile(TeacherProfile profile, {String? userUid}) async {
    await localStorage.saveProfile(profile, userUid: userUid);
    await localStorage.setPendingSync(true);
  }

  /// تنفيذ مزامنة سحابية كاملة
  Future<bool> synchronize({String? userUid}) async {
    final models = localStorage.loadModels(userUid: userUid);
    final terms = localStorage.loadTerms(userUid: userUid);
    final profile = localStorage.loadProfile(userUid: userUid);

    final ok = await dataService.syncDataToCloud(
      models: models,
      terms: terms,
      profile: profile,
    );

    if (ok) {
      await localStorage.setPendingSync(false);
    }
    return ok;
  }
}
