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
      expect(arTranslations[AppKeys.subscriptionDetails], isNotEmpty);
      expect(arTranslations[AppKeys.googleInstantLogin], isNotEmpty);
      expect(arTranslations[AppKeys.contactUsAllChannels], isNotEmpty);
      expect(arTranslations[AppKeys.deleteAccountPermanent], isNotEmpty);
      expect(arTranslations[AppKeys.privacyPolicy], isNotEmpty);
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
      expect(enTranslations[AppKeys.subscriptionDetails], isNotEmpty);
      expect(enTranslations[AppKeys.googleInstantLogin], isNotEmpty);
      expect(enTranslations[AppKeys.contactUsAllChannels], isNotEmpty);
      expect(enTranslations[AppKeys.deleteAccountPermanent], isNotEmpty);
      expect(enTranslations[AppKeys.privacyPolicy], isNotEmpty);
    });

    test('All keys in Arabic also exist in English', () {
      for (final key in arTranslations.keys) {
        expect(enTranslations.containsKey(key), isTrue, reason: 'Key $key missing in enTranslations');
      }
    });

    test('All keys in English also exist in Arabic', () {
      for (final key in enTranslations.keys) {
        expect(arTranslations.containsKey(key), isTrue, reason: 'Key $key missing in arTranslations');
      }
    });
  });
}
