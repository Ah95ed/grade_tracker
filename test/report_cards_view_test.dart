import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/controllers/term_controller.dart';
import 'package:grade_tracker/controllers/teacher_profile_controller.dart';
import 'package:grade_tracker/core/localization/app_localizations.dart';
import 'package:grade_tracker/core/theme/app_theme.dart';
import 'package:grade_tracker/views/report_cards/report_cards_view.dart';

void main() {
  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    storage = StorageService(prefs);
  });

  Widget buildTestWidget({required Size physicalSize}) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => MonthlySheetController(storage)),
        ChangeNotifierProvider(create: (_) => TermController(storage)),
        ChangeNotifierProvider(create: (_) => TeacherProfileController(storage)),
      ],
      child: ScreenUtilInit(
        designSize: physicalSize.width >= 1024
            ? const Size(1440, 900)
            : (physicalSize.width >= 600 ? const Size(768, 1024) : const Size(390, 844)),
        minTextAdapt: true,
        builder: (context, _) => MaterialApp(
          theme: AppTheme.lightTheme,
          locale: const Locale('en'),
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: const Scaffold(body: ReportCardsView()),
        ),
      ),
    );
  }

  testWidgets('ReportCardsView renders without overflow on narrow width (650px)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(650, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildTestWidget(physicalSize: const Size(650, 900)));
    await tester.pumpAndSettle();

    expect(find.byType(ReportCardsView), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ReportCardsView renders without overflow on mobile width (390px)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildTestWidget(physicalSize: const Size(390, 844)));
    await tester.pumpAndSettle();

    expect(find.byType(ReportCardsView), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ReportCardsView renders without overflow on desktop width (1200px)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildTestWidget(physicalSize: const Size(1200, 900)));
    await tester.pumpAndSettle();

    expect(find.byType(ReportCardsView), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
