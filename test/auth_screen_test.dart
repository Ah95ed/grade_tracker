import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/controllers/auth_controller.dart';
import 'package:grade_tracker/controllers/locale_controller.dart';
import 'package:grade_tracker/core/localization/app_localizations.dart';
import 'package:grade_tracker/views/auth/auth_screen.dart';
import 'package:grade_tracker/views/common/custom_button.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

void main() {
  testWidgets('AuthScreen renders input fields and toggle buttons correctly', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final storage = await StorageService.init();
    final authCtrl = AuthController(storage);
    final localeCtrl = LocaleController(storage);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: authCtrl),
          ChangeNotifierProvider.value(value: localeCtrl),
        ],
        child: ScreenUtilInit(
          designSize: const Size(1440, 900),
          builder: (context, child) => const MaterialApp(
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            locale: Locale('ar'),
            home: AuthScreen(),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify initial fields for login
    expect(find.byType(TextField), findsNWidgets(2));

    // Toggle to Register mode
    final registerTab = find.text('إنشاء حساب جديد');
    expect(registerTab, findsWidgets);
    await tester.tap(registerTab.first);
    await tester.pumpAndSettle();

    // In Register mode, displayName field appears (total 3 text fields)
    expect(find.byType(TextField), findsNWidgets(3));

    // Tap submit button with empty fields
    final submitBtn = find.byType(CustomButton);
    expect(submitBtn, findsOneWidget);
    await tester.tap(submitBtn);
    await tester.pumpAndSettle();

    // Verify error SnackBar was shown for empty required fields
    expect(find.byType(SnackBar), findsOneWidget);
  });
}
