import 'package:flutter/material.dart';
import '../services/storage_service.dart';

/// Controller for managing application language and locale (ar / en)
class LocaleController extends ChangeNotifier {
  final StorageService _storageService;
  Locale _locale;

  LocaleController(this._storageService)
      : _locale = Locale(_storageService.loadLocale());

  Locale get locale => _locale;
  bool get isArabic => _locale.languageCode == 'ar';

  Future<void> setLocale(Locale newLocale) async {
    if (_locale.languageCode == newLocale.languageCode) return;
    _locale = newLocale;
    await _storageService.saveLocale(newLocale.languageCode);
    notifyListeners();
  }

  Future<void> toggleLanguage() async {
    final nextCode = isArabic ? 'en' : 'ar';
    await setLocale(Locale(nextCode));
  }
}

