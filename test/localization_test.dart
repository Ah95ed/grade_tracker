import 'package:flutter_test/flutter_test.dart';
import 'package:grade_tracker/core/localization/ar_translations.dart';
import 'package:grade_tracker/core/localization/en_translations.dart';
import 'package:grade_tracker/core/localization/translation_keys.dart';

void main() {
  group('Localization Integrity Tests', () {
    test('Arabic dictionary contains essential keys without hardcoding', () {
      expect(arTranslations[AppKeys.appTitle], isNotEmpty);
      expect(arTranslations[AppKeys.tabMonthly], isNotEmpty);
      expect(arTranslations[AppKeys.tabTerm], isNotEmpty);
      expect(arTranslations[AppKeys.tabCards], isNotEmpty);
      expect(arTranslations[AppKeys.login], isNotEmpty);
      expect(arTranslations[AppKeys.register], isNotEmpty);
      expect(arTranslations[AppKeys.freeTrial], isNotEmpty);
      expect(arTranslations[AppKeys.syncSuccess], isNotEmpty);
      expect(arTranslations[AppKeys.syncError], isNotEmpty);
    });

    test('English dictionary contains essential keys without hardcoding', () {
      expect(enTranslations[AppKeys.appTitle], isNotEmpty);
      expect(enTranslations[AppKeys.tabMonthly], isNotEmpty);
      expect(enTranslations[AppKeys.tabTerm], isNotEmpty);
      expect(enTranslations[AppKeys.tabCards], isNotEmpty);
      expect(enTranslations[AppKeys.login], isNotEmpty);
      expect(enTranslations[AppKeys.register], isNotEmpty);
      expect(enTranslations[AppKeys.freeTrial], isNotEmpty);
      expect(enTranslations[AppKeys.syncSuccess], isNotEmpty);
      expect(enTranslations[AppKeys.syncError], isNotEmpty);
    });

    test('All keys in Arabic also exist in English', () {
      for (final key in arTranslations.keys) {
        expect(enTranslations.containsKey(key), isTrue, reason: 'Key $key missing in enTranslations');
      }
    });
  });
}

