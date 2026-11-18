/// Application-wide constants for Daragat / رصد الدرجات للطلاب
class AppConstants {
  // App Identity (Section 7)
  static const String appName = 'رصد الدرجات للطلاب';
  static const String appShortName = 'رصد الدرجات';
  static const String appTagline =
      'نظام رصد الدرجات للطلاب الذكي • يعمل أونلاين وبدون إنترنت';
  static const String appVersion = '2.0.0';

  // Design Sizing for ScreenUtil (Base: iPhone 13/14 Pro dimensions)
  static const double designWidth = 390.0;
  static const double designHeight = 844.0;

  // Local Storage Keys
  static const String keyLocale = 'gradebook_locale';
  static const String keyModels = 'gradebook_monthly_models';
  static const String keyTerms = 'gradebook_terms';
  static const String keyProfile = 'gradebook_teacher_profile';
  static const String keyCurrentUser = 'gradebook_current_user';
  static const String keyPrintSettings = 'gradebook_print_settings';
  static const String keyPersonalWorkspace = 'teacher_personal_workspace_v1';

  // Subscription & Trial Defaults (Section 1.1)
  static const int yearlySubscriptionPriceIqd = 5000;
  static const int yearlySubscriptionDays = 365;
  static const int monthlySubscriptionDays = 30;
  static const Duration trialDuration = Duration(hours: 48);
  static const Duration clockRollbackTolerance = Duration(minutes: 15);

  // Support & Contact (Single source of truth)
  static const String supportPhoneLocal = '07706118992';
  static const String supportPhone = '+9647706118992';
  static const String supportWhatsAppDigits = '9647706118992';
  static const String supportEmail = 'asmaomar5566@gmail.com';
}
