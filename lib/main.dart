import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import 'package:firebase_core/firebase_core.dart';

import 'firebase_options.dart';
import 'core/constants/app_constants.dart';
import 'core/localization/app_localizations.dart';
import 'core/theme/app_theme.dart';
import 'services/storage_service.dart';
import 'controllers/locale_controller.dart';
import 'controllers/teacher_profile_controller.dart';
import 'controllers/monthly_sheet_controller.dart';
import 'controllers/term_controller.dart';
import 'controllers/report_cards_controller.dart';
import 'controllers/auth_controller.dart';
import 'views/home/home_screen.dart';
import 'views/auth/auth_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final storageService = await StorageService.init();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (_) {}

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocaleController(storageService)),
        ChangeNotifierProvider(
          create: (_) => TeacherProfileController(storageService),
        ),
        ChangeNotifierProvider(
          create: (_) => MonthlySheetController(storageService),
        ),
        ChangeNotifierProvider(create: (_) => TermController(storageService)),
        ChangeNotifierProvider(create: (_) => ReportCardsController()),
        ChangeNotifierProvider(create: (_) => AuthController(storageService)),
      ],
      child: const GradeTrackerApp(),
    ),
  );
}

class GradeTrackerApp extends StatelessWidget {
  const GradeTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final localeCtrl = context.watch<LocaleController>();

    return LayoutBuilder(
      builder: (context, constraints) {
        final double width = constraints.maxWidth;
        // التوافق بين الشاششات والانظمة
        // Adaptive design baseline:
        // Mobile (< 600px): 390 x 844
        // Tablet (600px - 1024px): 768 x 1024
        // Desktop / Windows (>= 1024px): 1440 x 900
        final Size designSize = width >= 1024
            ? const Size(1440, 900)
            : (width >= 600 ? const Size(768, 1024) : const Size(390, 844));

        return ScreenUtilInit(
          designSize: designSize,
          minTextAdapt: true,
          splitScreenMode: true,
          fontSizeResolver: (fontSize, instance) {
            // Strictly clamp text scaling between 0.85 and 1.25
            // Prevents fonts from blowing up on Desktop/Windows monitors
            final scale = instance.scaleText.clamp(0.85, 1.25);
            return fontSize * scale;
          },
          builder: (context, child) {
            return MaterialApp(
              title: AppConstants.appName,
              debugShowCheckedModeBanner: false,
              theme: AppTheme.lightTheme,
              locale: localeCtrl.locale,
              supportedLocales: AppLocalizations.supportedLocales,
              localizationsDelegates: const [
                AppLocalizations.delegate,
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              home: Consumer<AuthController>(
                builder: (context, auth, _) {
                  return auth.isAuthenticated
                      ? const HomeScreen()
                      : const AuthScreen();
                },
              ),
            );
          },
        );
      },
    );
  }
}
