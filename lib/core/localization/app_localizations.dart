import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'ar_translations.dart';
import 'en_translations.dart';

/// AppLocalizations provides strictly-typed zero-hardcoding translation support
class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ??
        AppLocalizations(const Locale('ar'));
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const List<Locale> supportedLocales = [
    Locale('ar', ''),
    Locale('en', ''),
  ];

  late final Map<String, String> _localizedStrings;

  bool load() {
    if (locale.languageCode == 'en') {
      _localizedStrings = enTranslations;
    } else {
      _localizedStrings = arTranslations;
    }
    return true;
  }

  String translate(String key) {
    return _localizedStrings[key] ?? key;
  }

  bool get isArabic => locale.languageCode == 'ar';
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['ar', 'en'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) {
    final localizations = AppLocalizations(locale);
    localizations.load();
    return SynchronousFuture<AppLocalizations>(localizations);
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

/// Helper context extension for quick translation access
extension LocalizationExtension on BuildContext {
  String tr(String key) => AppLocalizations.of(this).translate(key);
  bool get isRtl => AppLocalizations.of(this).isArabic;
}

