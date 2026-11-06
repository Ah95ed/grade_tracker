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
import 'package:grade_tracker/models/teacher_profile.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/add_model_dialog.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/edit_model_dialog.dart';

void main() {
  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.init();
  });

  Widget buildTestWidget({
    required Widget child,
    MonthlySheetController? sheetCtrl,
    TeacherProfileController? profileCtrl,
  }) {
    final sCtrl = sheetCtrl ?? MonthlySheetController(storage);
    final pCtrl = profileCtrl ?? TeacherProfileController(storage);

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<MonthlySheetController>.value(value: sCtrl),
        ChangeNotifierProvider<TeacherProfileController>.value(value: pCtrl),
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

  testWidgets('AddModelDialog renders all mandatory fields and auto-suggests month name', (tester) async {
    final sheetCtrl = MonthlySheetController(storage);
    final profileCtrl = TeacherProfileController(storage);

    await profileCtrl.updateProfile(const TeacherProfile(
      teacherName: 'أ. أحمد علي',
      subject: 'الرياضيات',
      schoolName: 'ثانوية المتميزين',
      institutionType: 'school',
    ));

    await tester.pumpWidget(buildTestWidget(
      child: const AddModelDialog(),
      sheetCtrl: sheetCtrl,
      profileCtrl: profileCtrl,
    ));
    await tester.pumpAndSettle();

    // Check header
    expect(find.text('إنشاء نموذج جديد (شهر جديد)'), findsOneWidget);

    // Check prefilled month name
    expect(find.text('الشهر الأول'), findsOneWidget);

    // Check total max score prefilled with 100
    expect(find.text('100'), findsWidgets);

    // Check subject prefilled from profile
    expect(find.text('الرياضيات'), findsOneWidget);

    // Check teacher name prefilled from profile
    expect(find.text('أ. أحمد علي'), findsOneWidget);

    // Check all section button
    expect(find.text('كل الشُعَب'), findsOneWidget);

    // Check section chips
    expect(find.text('شعبة أ'), findsOneWidget);
    expect(find.text('شعبة ب'), findsOneWidget);
  });

  testWidgets('AddModelDialog displays automatic student transfer card when previous students exist', (tester) async {
    final sheetCtrl = MonthlySheetController(storage);
    final profileCtrl = TeacherProfileController(storage);

    // Add initial model with 2 students
    await sheetCtrl.addModel(MonthlyModel(
      id: 'month_1',
      name: 'الشهر الأول',
      subject: 'الفيزياء',
      gradeLevel: 'الرابع العلمي',
      students: const [
        StudentRow(id: 's1', name: 'محمد حسن', section: 'أ'),
        StudentRow(id: 's2', name: 'علي رضا', section: 'ب'),
      ],
      createdAt: DateTime.now().toIso8601String(),
    ));

    await tester.pumpWidget(buildTestWidget(
      child: const AddModelDialog(),
      sheetCtrl: sheetCtrl,
      profileCtrl: profileCtrl,
    ));
    await tester.pumpAndSettle();

    // Auto-suggest next month name should be "الشهر الثاني"
    expect(find.text('الشهر الثاني'), findsOneWidget);

    // Should display automatic student transfer guarantee card
    expect(find.text('ترحيل بيانات الطلاب تلقائياً:'), findsOneWidget);
    expect(find.textContaining('سيتم نقل جميع الطلاب (2 طالب)'), findsOneWidget);
  });

  testWidgets('EditModelDialog renders and updates model parameters', (tester) async {
    final sheetCtrl = MonthlySheetController(storage);
    final profileCtrl = TeacherProfileController(storage);

    final initialModel = MonthlyModel(
      id: 'month_test',
      name: 'الشهر الأول',
      subject: 'الكيمياء',
      gradeLevel: 'الثالث متوسط',
      totalMaxScore: 100.0,
      assignedSections: const ['أ', 'ب'],
      createdAt: DateTime.now().toIso8601String(),
    );

    await tester.pumpWidget(buildTestWidget(
      child: EditModelDialog(model: initialModel),
      sheetCtrl: sheetCtrl,
      profileCtrl: profileCtrl,
    ));
    await tester.pumpAndSettle();

    expect(find.text('تعديل بيانات الجدول (الشهر الأول)'), findsOneWidget);
    expect(find.text('الكيمياء'), findsOneWidget);
    expect(find.text('الثالث متوسط'), findsWidgets);
    expect(find.text('حفظ التعديلات'), findsOneWidget);
  });
}
