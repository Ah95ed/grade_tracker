import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/app_constants.dart';
import '../models/monthly_model.dart';
import '../models/term_model.dart';
import '../models/teacher_profile.dart';
import '../models/custom_column.dart';
import '../models/student_row.dart';

/// Local offline-first persistent storage service
class StorageService {
  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  // Teacher Profile
  Future<void> saveProfile(TeacherProfile profile) async {
    await _prefs.setString(AppConstants.keyProfile, jsonEncode(profile.toJson()));
  }

  TeacherProfile loadProfile() {
    final raw = _prefs.getString(AppConstants.keyProfile);
    if (raw != null) {
      try {
        return TeacherProfile.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } catch (_) {}
    }
    return const TeacherProfile();
  }

  // Monthly Models
  Future<void> saveModels(List<MonthlyModel> models) async {
    final list = models.map((m) => m.toJson()).toList();
    await _prefs.setString(AppConstants.keyModels, jsonEncode(list));
  }

  List<MonthlyModel> loadModels() {
    final raw = _prefs.getString(AppConstants.keyModels);
    if (raw != null) {
      try {
        final List<dynamic> list = jsonDecode(raw) as List<dynamic>;
        return list.map((e) => MonthlyModel.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {}
    }
    return _getDefaultModels();
  }

  // Terms
  Future<void> saveTerms(List<TermModel> terms) async {
    final list = terms.map((t) => t.toJson()).toList();
    await _prefs.setString(AppConstants.keyTerms, jsonEncode(list));
  }

  List<TermModel> loadTerms() {
    final raw = _prefs.getString(AppConstants.keyTerms);
    if (raw != null) {
      try {
        final List<dynamic> list = jsonDecode(raw) as List<dynamic>;
        return list.map((e) => TermModel.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {}
    }
    return _getDefaultTerms();
  }

  // Language Locale Code
  Future<void> saveLocale(String code) async => await _prefs.setString(AppConstants.keyLocale, code);
  String loadLocale() => _prefs.getString(AppConstants.keyLocale) ?? 'ar';

  // Reset all to defaults
  Future<void> clearAll() async => await _prefs.clear();

  // Initial Sample Models
  List<MonthlyModel> _getDefaultModels() {
    return [
      MonthlyModel(
        id: 'model-1',
        name: 'الشهر الأول',
        subject: 'الرياضيات',
        gradeLevel: 'الثالث متوسط',
        academicYear: '2024 - 2025',
        totalMaxScore: 100,
        writtenMaxScore: 100,
        writtenScoreMode: 'raw',
        roundingMode: 'half_up',
        customColumns: const [
          CustomColumn(id: 'col-1', name: 'الشفهي', maxScore: 10),
          CustomColumn(id: 'col-2', name: 'اليومي والنشاط', maxScore: 10),
        ],
        students: const [
          StudentRow(
            id: 'st-1',
            name: 'أحمد محمود عباس',
            gradeLevel: 'الثالث متوسط',
            section: 'أ',
            writtenRawScore: 75,
            scores: {'col-1': 9, 'col-2': 8},
          ),
          StudentRow(
            id: 'st-2',
            name: 'حسين علي كاظم',
            gradeLevel: 'الثالث متوسط',
            section: 'أ',
            writtenRawScore: 68,
            scores: {'col-1': 8, 'col-2': 9},
          ),
          StudentRow(
            id: 'st-3',
            name: 'مصطفى رائد سعد',
            gradeLevel: 'الثالث متوسط',
            section: 'ب',
            writtenRawScore: 82,
            scores: {'col-1': 10, 'col-2': 10},
          ),
          StudentRow(
            id: 'st-4',
            name: 'يوسف حيدر جاسم',
            gradeLevel: 'الثالث متوسط',
            section: 'ب',
            writtenRawScore: 45,
            scores: {'col-1': 6, 'col-2': 7},
          ),
        ],
        createdAt: DateTime.now().toIso8601String(),
      ),
      MonthlyModel(
        id: 'model-2',
        name: 'الشهر الثاني',
        subject: 'الرياضيات',
        gradeLevel: 'الثالث متوسط',
        academicYear: '2024 - 2025',
        totalMaxScore: 100,
        writtenMaxScore: 100,
        writtenScoreMode: 'raw',
        roundingMode: 'half_up',
        customColumns: const [
          CustomColumn(id: 'col-1', name: 'الشفهي', maxScore: 10),
          CustomColumn(id: 'col-2', name: 'اليومي والنشاط', maxScore: 10),
        ],
        students: const [
          StudentRow(
            id: 'st-1',
            name: 'أحمد محمود عباس',
            gradeLevel: 'الثالث متوسط',
            section: 'أ',
            writtenRawScore: 80,
            scores: {'col-1': 10, 'col-2': 9},
          ),
          StudentRow(
            id: 'st-2',
            name: 'حسين علي كاظم',
            gradeLevel: 'الثالث متوسط',
            section: 'أ',
            writtenRawScore: 72,
            scores: {'col-1': 8, 'col-2': 8},
          ),
          StudentRow(
            id: 'st-3',
            name: 'مصطفى رائد سعد',
            gradeLevel: 'الثالث متوسط',
            section: 'ب',
            writtenRawScore: 88,
            scores: {'col-1': 10, 'col-2': 10},
          ),
          StudentRow(
            id: 'st-4',
            name: 'يوسف حيدر جاسم',
            gradeLevel: 'الثالث متوسط',
            section: 'ب',
            writtenRawScore: 50,
            scores: {'col-1': 7, 'col-2': 6},
          ),
        ],
        createdAt: DateTime.now().toIso8601String(),
      ),
    ];
  }

  List<TermModel> _getDefaultTerms() {
    return [
      const TermModel(
        id: 'term-1',
        name: 'الفصل الأول',
        subject: 'الرياضيات',
        gradeLevel: 'الثالث متوسط',
        selectedModelIds: ['model-1', 'model-2'],
        calculationMode: 'average',
        roundingMode: 'half_up',
      ),
    ];
  }
}

