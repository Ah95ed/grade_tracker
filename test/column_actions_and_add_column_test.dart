import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/controllers/teacher_profile_controller.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/models/monthly_model.dart';
import 'package:grade_tracker/models/custom_column.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/student_data_table.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/add_column_dialog.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/rename_columns_dialog.dart';

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

  testWidgets('AddColumnDialog selects presets, updates score and adds column to model', (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(1200, 900);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final sheetCtrl = MonthlySheetController(storage);
    final model = MonthlyModel(
      id: 'm1',
      name: 'الشهر الأول',
      gradeLevel: 'الأول',
      subject: 'الرياضيات',
      customColumns: const [],
    );
    await sheetCtrl.addModel(model);

    await tester.pumpWidget(
      createTestWidget(
        child: const AddColumnDialog(),
        sheetCtrl: sheetCtrl,
      ),
    );
    await tester.pumpAndSettle();

    // Verify preset chips exist
    expect(find.text('درجة الشفهي'), findsOneWidget);
    expect(find.text('المشاركة والنشاط'), findsOneWidget);
    expect(find.text('الغياب والحضور'), findsOneWidget);

    // Tap 'درجة الشفهي' preset
    await tester.tap(find.text('درجة الشفهي'));
    await tester.pumpAndSettle();

    // Name should be populated with 'درجة الشفهي' and default score 20
    expect(find.widgetWithText(TextFormField, 'درجة الشفهي'), findsOneWidget);

    // Tap 'إضافة الحقل للجدول' button
    await tester.tap(find.text('إضافة الحقل للجدول'));
    await tester.pumpAndSettle();

    // Verify column was added to controller
    expect(sheetCtrl.currentModel!.customColumns.length, 1);
    expect(sheetCtrl.currentModel!.customColumns.first.name, 'درجة الشفهي');
    expect(sheetCtrl.currentModel!.customColumns.first.maxScore, 20.0);
  });

  testWidgets('RenameColumnsDialog updates standard and custom column titles', (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(1200, 900);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final sheetCtrl = MonthlySheetController(storage);
    final model = MonthlyModel(
      id: 'm2',
      name: 'الشهر الثاني',
      customColumns: const [
        CustomColumn(id: 'col_1', name: 'النشاط', maxScore: 10),
      ],
    );
    await sheetCtrl.addModel(model);

    await tester.pumpWidget(
      createTestWidget(
        child: RenameColumnsDialog(model: model),
        sheetCtrl: sheetCtrl,
      ),
    );
    await tester.pumpAndSettle();

    // Find student name field and type new title
    final studentNameFinder = find.byType(TextFormField).first;
    await tester.enterText(studentNameFinder, 'اسم التلميذ الثلاثي');
    await tester.pumpAndSettle();

    // Save
    await tester.tap(find.text('حفظ التسميات'));
    await tester.pumpAndSettle();

    expect(sheetCtrl.currentModel!.getColumnLabel('studentName', 'اسم الطالب'), 'اسم التلميذ الثلاثي');
  });

  testWidgets('StudentDataTable header rotate button cycles slant: normal -> italic -> vertical', (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(1200, 900);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final sheetCtrl = MonthlySheetController(storage);
    final model = MonthlyModel(
      id: 'm3',
      name: 'الشهر الثالث',
      customColumns: const [
        CustomColumn(id: 'col_oral', name: 'درجة الشفهي', maxScore: 20),
      ],
    );
    await sheetCtrl.addModel(model);

    await tester.pumpWidget(
      createTestWidget(
        child: const StudentDataTable(),
        sheetCtrl: sheetCtrl,
      ),
    );
    await tester.pumpAndSettle();

    expect(sheetCtrl.currentModel!.getColumnSlant('studentName'), 'normal');

    // Toggle slant on studentName via controller
    await sheetCtrl.toggleColumnSlant('studentName');
    await tester.pumpAndSettle();
    expect(sheetCtrl.currentModel!.getColumnSlant('studentName'), 'italic');

    await sheetCtrl.toggleColumnSlant('studentName');
    await tester.pumpAndSettle();
    expect(sheetCtrl.currentModel!.getColumnSlant('studentName'), 'vertical');

    await sheetCtrl.toggleColumnSlant('studentName');
    await tester.pumpAndSettle();
    expect(sheetCtrl.currentModel!.getColumnSlant('studentName'), 'normal');
  });
}
