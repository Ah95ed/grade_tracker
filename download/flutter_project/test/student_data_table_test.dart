import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/controllers/teacher_profile_controller.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/models/monthly_model.dart';
import 'package:grade_tracker/models/student_row.dart';
import 'package:grade_tracker/models/custom_column.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/student_data_table.dart';

void main() {
  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.init();
  });

  Widget buildTestWidget({
    required Widget child,
    required MonthlySheetController sheetCtrl,
    double devicePixelRatio = 1.0,
    Size surfaceSize = const Size(1200, 800),
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

  testWidgets('StudentDataTable renders empty state with zero overflow on 1.3 dpr', (tester) async {
    tester.view.devicePixelRatio = 1.3;
    tester.view.physicalSize = const Size(1040 * 1.3, 800 * 1.3);
    addTearDown(() {
      tester.view.resetDevicePixelRatio();
      tester.view.resetPhysicalSize();
    });

    final sheetCtrl = MonthlySheetController(storage);
    final model = MonthlyModel(
      id: 'm1',
      name: 'الشهر الأول',
      gradeLevel: 'الاول',
      subject: 'الرياضيات',
      writtenMaxScore: 91,
      totalMaxScore: 91,
      createdAt: DateTime.now().toIso8601String(),
    );
    await sheetCtrl.addModel(model);

    await tester.pumpWidget(buildTestWidget(
      child: const StudentDataTable(),
      sheetCtrl: sheetCtrl,
    ));
    await tester.pumpAndSettle();

    final exception = tester.takeException();
    if (exception is FlutterError) {
      for (final d in exception.diagnostics) {
        debugPrint('DIAGNOSTIC: $d');
      }
    }
    expect(exception, isNull);
    expect(find.text('الصف'), findsOneWidget);
    expect(find.textContaining('الدرجة النهائية من'), findsOneWidget);
    expect(find.textContaining('لا يوجد طلاب مضافين'), findsOneWidget);
    expect(find.text('إضافة أو استيراد كشف الطلاب'), findsOneWidget);
  });

  testWidgets('StudentDataTable renders rows with students and custom columns without overflow', (tester) async {
    tester.view.devicePixelRatio = 1.3;
    tester.view.physicalSize = const Size(1280 * 1.3, 900 * 1.3);
    addTearDown(() {
      tester.view.resetDevicePixelRatio();
      tester.view.resetPhysicalSize();
    });

    final sheetCtrl = MonthlySheetController(storage);
    final model = MonthlyModel(
      id: 'm1',
      name: 'الشهر الأول',
      gradeLevel: 'الاول',
      subject: 'الرياضيات',
      writtenMaxScore: 70,
      totalMaxScore: 100,
      createdAt: DateTime.now().toIso8601String(),
      customColumns: const [
        CustomColumn(id: 'c1', name: 'الشفهي', maxScore: 15),
        CustomColumn(id: 'c2', name: 'النشاط', maxScore: 15),
      ],
      students: const [
        StudentRow(
          id: 's1',
          name: 'علي حسن أحمد',
          gradeLevel: 'الاول',
          section: 'أ',
          writtenRawScore: 65,
          scores: {'c1': 14, 'c2': 15},
        ),
      ],
    );
    await sheetCtrl.addModel(model);

    await tester.pumpWidget(buildTestWidget(
      child: const StudentDataTable(),
      sheetCtrl: sheetCtrl,
    ));
    await tester.pumpAndSettle();

    final exception = tester.takeException();
    if (exception is FlutterError) {
      for (final d in exception.diagnostics) {
        debugPrint('DIAGNOSTIC: $d');
      }
    }
    expect(exception, isNull);
    expect(find.text('علي حسن أحمد'), findsOneWidget);
    expect(find.text('الشفهي'), findsOneWidget);
    expect(find.text('النشاط'), findsOneWidget);
  });

  testWidgets('StudentDataTable expands to 100% full width on wide desktop screen', (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(1600, 900);
    addTearDown(() {
      tester.view.resetDevicePixelRatio();
      tester.view.resetPhysicalSize();
    });

    final sheetCtrl = MonthlySheetController(storage);
    final model = MonthlyModel(
      id: 'm_desktop',
      name: 'الشهر الأول',
      gradeLevel: 'الاول',
      subject: 'الرياضيات',
      writtenMaxScore: 70,
      totalMaxScore: 100,
      createdAt: DateTime.now().toIso8601String(),
      students: const [
        StudentRow(
          id: 's1',
          name: 'محمد صادق جاسم',
          gradeLevel: 'الاول',
          section: 'ب',
          writtenRawScore: 68,
        ),
      ],
    );
    await sheetCtrl.addModel(model);

    await tester.pumpWidget(buildTestWidget(
      child: const StudentDataTable(),
      sheetCtrl: sheetCtrl,
      surfaceSize: const Size(1600, 900),
    ));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('محمد صادق جاسم'), findsOneWidget);
  });

  testWidgets('StudentDataTable renders 6 custom columns and enables horizontal scrolling with navigation buttons', (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(1000, 800);
    addTearDown(() {
      tester.view.resetDevicePixelRatio();
      tester.view.resetPhysicalSize();
    });

    final sheetCtrl = MonthlySheetController(storage);
    final model = MonthlyModel(
      id: 'm_many_cols',
      name: 'الشهر الأول',
      gradeLevel: 'الاول',
      subject: 'الرياضيات',
      writtenMaxScore: 40,
      totalMaxScore: 100,
      createdAt: DateTime.now().toIso8601String(),
      customColumns: const [
        CustomColumn(id: 'c1', name: 'الشفهي', maxScore: 10),
        CustomColumn(id: 'c2', name: 'النشاط', maxScore: 10),
        CustomColumn(id: 'c3', name: 'الواجبات', maxScore: 10),
        CustomColumn(id: 'c4', name: 'المواظبة', maxScore: 10),
        CustomColumn(id: 'c5', name: 'المشاركة', maxScore: 10),
        CustomColumn(id: 'c6', name: 'امتحان قصير', maxScore: 10),
      ],
      students: const [
        StudentRow(
          id: 's1',
          name: 'طالب ذو حقول متعددة',
          gradeLevel: 'الاول',
          section: 'أ',
          writtenRawScore: 35,
          scores: {
            'c1': 10,
            'c2': 9,
            'c3': 8,
            'c4': 10,
            'c5': 9,
            'c6': 10,
          },
        ),
      ],
    );
    await sheetCtrl.addModel(model);

    await tester.pumpWidget(buildTestWidget(
      child: const StudentDataTable(),
      sheetCtrl: sheetCtrl,
    ));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.textContaining('الجدول عريض (6 حقول إضافية)'), findsOneWidget);
    expect(find.text('يمين'), findsOneWidget);
    expect(find.text('يسار'), findsOneWidget);

    expect(find.text('الشفهي'), findsOneWidget);
    expect(find.text('النشاط'), findsOneWidget);
    expect(find.text('الواجبات'), findsOneWidget);
    expect(find.text('المواظبة'), findsOneWidget);
    expect(find.text('المشاركة'), findsOneWidget);
    expect(find.text('امتحان قصير'), findsOneWidget);

    // Test clicking the navigation scroll button
    await tester.tap(find.text('يسار'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
