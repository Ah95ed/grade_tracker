import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../flutter_data/models/app_user.dart';
import '../flutter_data/models/teacher_profile.dart';
import '../flutter_data/services/api_client.dart';
import '../flutter_data/services/data_service.dart';
import '../flutter_data/services/users_service.dart';
import '../flutter_data/services/local_storage_service.dart';
import '../flutter_data/repositories/gradebook_repository.dart';
import '../flutter_state/auth_controller.dart';
import '../flutter_state/monthly_sheet_controller.dart';
import '../flutter_state/term_controller.dart';
import '../flutter_state/sync_controller.dart';
import '../flutter_state/ui_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late LocalStorageService storage;
  late ApiClient apiClient;
  late DataService dataService;
  late UsersService usersService;
  late GradebookRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await LocalStorageService.init();
    apiClient = ApiClient();
    dataService = DataService(apiClient);
    usersService = UsersService(apiClient);
    repository = GradebookRepository(localStorage: storage, dataService: dataService);
  });

  test('AuthController initializes with empty user and enters guest mode properly', () {
    final auth = AuthController(storage: storage, apiClient: apiClient, usersService: usersService);
    expect(auth.isAuthenticated, isFalse);

    auth.enterGuestMode();
    expect(auth.isAuthenticated, isTrue);
    expect(auth.currentUser?.email, 'guest@daragat.local');
  });

  test('MonthlySheetController manages models, students, and scoring reactivity', () async {
    final ctrl = MonthlySheetController(repository);
    await ctrl.loadData();
    expect(ctrl.models, isEmpty);

    await ctrl.addModel('تشرين الأول', gradeLevel: 'الثالث متوسط', section: 'أ');
    expect(ctrl.models.length, 1);
    expect(ctrl.activeModel?.name, 'تشرين الأول');
    expect(ctrl.activeModel?.columns.length, 2);
  });

  test('UiController switches active tabs and toggles floating score keypad', () {
    final ui = UiController();
    expect(ui.activeTab, 0);
    expect(ui.isScoreKeypadVisible, isFalse);

    ui.setActiveTab(2);
    expect(ui.activeTab, 2);

    ui.toggleScoreKeypad(true);
    expect(ui.isScoreKeypadVisible, isTrue);
  });

  testWidgets('MultiProvider integration renders Gradebook Shell and responds to state changes', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1000, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final authCtrl = AuthController(storage: storage, apiClient: apiClient, usersService: usersService);
    final monthlyCtrl = MonthlySheetController(repository);
    final termCtrl = TermController(repository);
    final syncCtrl = SyncController(repository);
    final uiCtrl = UiController();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: authCtrl),
          ChangeNotifierProvider.value(value: monthlyCtrl),
          ChangeNotifierProvider.value(value: termCtrl),
          ChangeNotifierProvider.value(value: syncCtrl),
          ChangeNotifierProvider.value(value: uiCtrl),
        ],
        child: const MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              body: Text('راصد الدرجات جاهز'),
            ),
          ),
        ),
      ),
    );

    expect(find.text('راصد الدرجات جاهز'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
