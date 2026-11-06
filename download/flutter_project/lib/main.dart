import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';

import 'app_theme.dart';
import 'flutter_data/services/api_client.dart';
import 'flutter_data/services/data_service.dart';
import 'flutter_data/services/users_service.dart';
import 'flutter_data/services/local_storage_service.dart';
import 'flutter_data/repositories/gradebook_repository.dart';
import 'flutter_state/auth_controller.dart';
import 'flutter_state/monthly_sheet_controller.dart';
import 'flutter_state/term_controller.dart';
import 'flutter_state/sync_controller.dart';
import 'flutter_state/ui_controller.dart';

import 'flutter_widgets/header/app_header.dart';
import 'flutter_widgets/views/monthly_sheet_view.dart';
import 'flutter_widgets/views/term_calculation_view.dart';
import 'flutter_widgets/views/report_cards_view.dart';
import 'flutter_widgets/common/bottom_score_keypad.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialise Local Offline Storage
  final localStorage = await LocalStorageService.init();

  // 2. Initialise HTTP REST Client & Services
  final apiClient = ApiClient();
  final dataService = DataService(apiClient);
  final usersService = UsersService(apiClient);
  final repository = GradebookRepository(localStorage: localStorage, dataService: dataService);

  // 3. Safe Firebase Initialization with Fallback Options
  try {
    await Firebase.initializeApp();
  } catch (e) {
    log('Firebase initialization notice: $e');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthController(
            storage: localStorage,
            apiClient: apiClient,
            usersService: usersService,
          ),
        ),
        ChangeNotifierProvider(create: (_) => MonthlySheetController(repository)),
        ChangeNotifierProvider(create: (_) => TermController(repository)),
        ChangeNotifierProvider(create: (_) => SyncController(repository)),
        ChangeNotifierProvider(create: (_) => UiController()),
      ],
      child: const DaragatTeacherApp(),
    ),
  );
}

class DaragatTeacherApp extends StatelessWidget {
  const DaragatTeacherApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'دفتر درجات المعلم',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,
      locale: const Locale('ar', 'IQ'),
      supportedLocales: const [Locale('ar', 'IQ'), Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const Directionality(
        textDirection: TextDirection.rtl,
        child: GradebookShellScreen(),
      ),
    );
  }
}

class GradebookShellScreen extends StatelessWidget {
  const GradebookShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ui = context.watch<UiController>();
    final sync = context.watch<SyncController>();
    final monthly = context.watch<MonthlySheetController>();
    final term = context.watch<TermController>();

    return Scaffold(
      appBar: AppHeader(
        activeTab: ui.activeTab,
        teacherName: 'الأستاذ: علي محمد',
        subject: 'الرياضيات',
        schoolName: 'ثانوية المتميزين',
        isOnline: sync.isOnline,
        isSyncing: sync.isSyncing,
        onOpenMenu: () {},
        onTriggerSync: () => sync.triggerSync(),
      ),
      body: Stack(
        children: [
          IndexedStack(
            index: ui.activeTab,
            children: [
              // 0: Monthly Sheet
              MonthlySheetView(
                models: monthly.models.map((m) => m.name).toList(),
                activeModel: monthly.activeModel?.name ?? 'بدون نماذج',
                onSelectModel: (name) {
                  final target = monthly.models.firstWhere((m) => m.name == name);
                  monthly.selectModel(target.id);
                },
                onAddNewModel: () => monthly.addModel('شهر جديد'),
              ),
              // 1: Term Calculation
              TermCalculationView(
                terms: term.terms.map((t) => t.name).toList(),
                onAddTerm: () => term.addTerm('الفصل الدراسي', const []),
              ),
              // 2: Report Cards
              ReportCardsView(
                onPrint: () {},
                onOpenPrintSettings: () {},
              ),
              // 3: Admin Dashboard
              const Center(child: Text('لوحة تحكم المشرف')),
            ],
          ),
          if (ui.isScoreKeypadVisible)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: BottomScoreKeypad(
                onKeyPress: (k) {},
                onDelete: () {},
                onNextStudent: () {},
                onClose: () => ui.toggleScoreKeypad(false),
              ),
            ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: ui.activeTab,
        onDestinationSelected: (idx) => ui.setActiveTab(idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.table_chart_rounded),
            label: 'الدرجات الشهرية',
          ),
          NavigationDestination(
            icon: Icon(Icons.calculate_rounded),
            label: 'حساب الفصول',
          ),
          NavigationDestination(
            icon: Icon(Icons.badge_rounded),
            label: 'كروت الشهادات',
          ),
          NavigationDestination(
            icon: Icon(Icons.admin_panel_settings_rounded),
            label: 'الإدارة',
          ),
        ],
      ),
    );
  }
}
