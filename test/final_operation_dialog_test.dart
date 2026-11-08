import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/controllers/teacher_profile_controller.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/models/monthly_model.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/final_operation_dialog.dart';

void main() {
  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.init();
  });

  Widget createTestWidget({
    required Widget child,
    required MonthlySheetController sheetCtrl,
  }) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<MonthlySheetController>.value(value: sheetCtrl),
        ChangeNotifierProvider<TeacherProfileController>(
          create: (_) => TeacherProfileController(storage),
        ),
      ],
      child: ScreenUtilInit(
        designSize: const Size(800, 1000),
        minTextAdapt: true,
        builder: (context, _) => MaterialApp(
          home: Scaffold(
            body: child,
          ),
        ),
      ),
    );
  }

  testWidgets('FinalOperationDialog renders all options and presets matching Web App', (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(1200, 900);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final sheetCtrl = MonthlySheetController(storage);
    final model1 = MonthlyModel(
      id: 'm1',
      name: 'الشهر الأول',
      gradeLevel: 'الأول',
      subject: 'الرياضيات',
      totalMaxScore: 100.0,
      customColumns: const [],
    );
    final model2 = MonthlyModel(
      id: 'm2',
      name: 'الشهر الثاني',
      gradeLevel: 'الأول',
      subject: 'الرياضيات',
      totalMaxScore: 100.0,
      customColumns: const [],
    );
    await sheetCtrl.addModel(model1);
    await sheetCtrl.addModel(model2);
    sheetCtrl.setActiveModel('m1');

    await tester.pumpWidget(
      createTestWidget(
        child: const FinalOperationDialog(),
        sheetCtrl: sheetCtrl,
      ),
    );
    await tester.pumpAndSettle();

    // Verify title and headers
    expect(find.text('العمليات الحسابية على الدرجة النهائية'), findsOneWidget);
    expect(find.text('الصف: الأول'), findsOneWidget);
    expect(find.text('المادة: الرياضيات'), findsOneWidget);

    // Verify all 5 operation options exist
    expect(find.text('بدون أي عملية (الدرجة الأصلية)'), findsOneWidget);
    expect(find.text('قسمة على عدد (÷)'), findsOneWidget);
    expect(find.text('ضرب في عدد (×)'), findsOneWidget);
    expect(find.text('جمع / إضافة درجات (+)'), findsOneWidget);
    expect(find.text('طرح / خصم درجات (-)'), findsOneWidget);

    // Tap divide (÷) option
    final divideFinder = find.text('قسمة على عدد (÷)');
    await tester.ensureVisible(divideFinder);
    await tester.tap(divideFinder);
    await tester.pumpAndSettle();

    // Verify presets are visible: 2, 3, 4, 5, 10
    expect(find.text('القسمة على:'), findsOneWidget);
    expect(find.text('2'), findsWidgets);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('4'), findsOneWidget);
    expect(find.text('5'), findsOneWidget);
    expect(find.text('10'), findsOneWidget);

    // Verify live calculation preview
    expect(find.text('معاينة حيّة للنتيجة (جرّب درجات طلابك):'), findsOneWidget);
    expect(find.text('من 50'), findsOneWidget);

    // Select Scope 2: Apply to same grade and subject
    final scopeFinder = find.textContaining('تطبيق على شهور نفس المادة والصف فقط');
    await tester.ensureVisible(scopeFinder);
    await tester.tap(scopeFinder);
    await tester.pumpAndSettle();

    // Save and apply
    final saveFinder = find.text('حفظ وتطبيق');
    await tester.ensureVisible(saveFinder);
    await tester.tap(saveFinder);
    await tester.pumpAndSettle();

    // Verify both models (m1 and m2) got updated with divide by 2!
    final updatedM1 = sheetCtrl.models.firstWhere((m) => m.id == 'm1');
    final updatedM2 = sheetCtrl.models.firstWhere((m) => m.id == 'm2');

    expect(updatedM1.finalScoreOperation.type, 'divide');
    expect(updatedM1.finalScoreOperation.value, 2.0);
    expect(updatedM2.finalScoreOperation.type, 'divide');
    expect(updatedM2.finalScoreOperation.value, 2.0);
  });
}
