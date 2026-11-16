import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/features/term_calculation/widgets/add_term_modal.dart';
import 'package:grade_tracker/features/monthly_sheets/widgets/grade_numeric_keypad.dart';
import 'package:grade_tracker/views/admin/admin_dashboard_dialog.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/controllers/term_controller.dart';
import 'package:grade_tracker/controllers/teacher_profile_controller.dart';
import 'package:grade_tracker/controllers/auth_controller.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/models/monthly_model.dart';
import 'package:grade_tracker/models/student_row.dart';

void main() {
  late StorageService storage;
  late MonthlySheetController sheetCtrl;
  late TermController termCtrl;
  late TeacherProfileController profileCtrl;
  late AuthController authCtrl;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.init();
    sheetCtrl = MonthlySheetController(storage);
    termCtrl = TermController(storage);
    profileCtrl = TeacherProfileController(storage);
    authCtrl = AuthController(storage);

    // Seed mock months
    final month1 = MonthlyModel(
      id: 'm1',
      name: 'الشهر الأول',
      gradeLevel: 'الأول متوسط',
      subject: 'الرياضيات',
      teacherName: 'أ. أحمد',
      section: 'شعبة أ',
      totalMaxScore: 100,
    );
    final month2 = MonthlyModel(
      id: 'm2',
      name: 'الشهر الثاني',
      gradeLevel: 'الأول متوسط',
      subject: 'الرياضيات',
      teacherName: 'أ. أحمد',
      section: 'شعبة ب',
      totalMaxScore: 100,
    );
    final month3 = MonthlyModel(
      id: 'm3',
      name: 'الشهر الأول - كيمياء',
      gradeLevel: 'الثاني متوسط',
      subject: 'الكيمياء',
      teacherName: 'أ. محمود',
      section: 'شعبة أ',
      totalMaxScore: 100,
    );

    sheetCtrl.models.addAll([month1, month2, month3]);
  });

  Widget buildApp(Widget child) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<MonthlySheetController>.value(value: sheetCtrl),
        ChangeNotifierProvider<TermController>.value(value: termCtrl),
        ChangeNotifierProvider<TeacherProfileController>.value(value: profileCtrl),
        ChangeNotifierProvider<AuthController>.value(value: authCtrl),
      ],
      child: ScreenUtilInit(
        designSize: const Size(1200, 900),
        minTextAdapt: true,
        builder: (context, _) => MaterialApp(
          home: Scaffold(
            body: child,
          ),
        ),
      ),
    );
  }

  group('AddTermModal Tests (17 Criteria Compliance)', () {
    testWidgets('AddTermModal renders with teacher selection, sections and months', (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(buildApp(const AddTermModal()));
      await tester.pumpAndSettle();

      // Check title
      expect(find.text('إضافة فصل دراسي جديد'), findsOneWidget);

      // Check headers
      expect(find.text('اسم الفصل الدراسي / الكورس:'), findsOneWidget);
      expect(find.text('الصف الدراسي:'), findsOneWidget);
      expect(find.text('المادة الدراسية:'), findsOneWidget);
      expect(find.text('اسم أستاذ المادة:'), findsOneWidget);

      // Check month header
      expect(find.text('الأشهر المشمولة باحتساب المعدل:'), findsOneWidget);

      // Check Select All and Deselect All buttons
      expect(find.text('تحديد الكل'), findsOneWidget);
      expect(find.text('إلغاء التحديد'), findsOneWidget);

      // Tap "إلغاء التحديد"
      await tester.tap(find.text('إلغاء التحديد'));
      await tester.pumpAndSettle();
      expect(find.textContaining('0 من'), findsOneWidget);

      // Tap "تحديد الكل"
      await tester.tap(find.text('تحديد الكل'));
      await tester.pumpAndSettle();

      // Verify Submit Button exists and allows creation
      expect(find.text('حفظ وإنشاء الفصل'), findsOneWidget);
    });

    testWidgets('AddTermModal allows creation without matching months', (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      sheetCtrl.models.clear();

      await tester.pumpWidget(buildApp(const AddTermModal()));
      await tester.pumpAndSettle();

      // Verify notice when no months exist
      expect(find.textContaining('لا توجد كشوف شهرية مطابقة لهذا الصف والمادة حالياً'), findsOneWidget);
      expect(find.text('حفظ وإنشاء الفصل'), findsOneWidget);
    });
  });

  group('GradeNumericKeypad Feature Tests', () {
    testWidgets('GradeNumericKeypad renders buttons and reacts to key taps', (tester) async {
      tester.view.physicalSize = const Size(800, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      const student = StudentRow(
        id: 's1',
        name: 'علي حسن',
        scores: {},
      );

      double? updatedValue;

      await tester.pumpWidget(
        ScreenUtilInit(
          designSize: const Size(800, 1000),
          minTextAdapt: true,
          builder: (context, _) => MaterialApp(
            home: Scaffold(
              body: GradeNumericKeypad(
                currentStudent: student,
                currentIndex: 0,
                totalStudents: 1,
                columnName: 'واجب',
                maxScore: 10,
                currentValue: null,
                onValueChange: (val) => updatedValue = val,
                onNext: () {},
                onPrev: () {},
                onClose: () {},
                onNumeralModeChange: (_) {},
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify digits 0-9
      expect(find.text('1'), findsOneWidget);
      expect(find.text('9'), findsOneWidget);
      expect(find.text('0'), findsOneWidget);
      expect(find.text('.'), findsOneWidget);

      // Tap '8'
      await tester.tap(find.text('8'));
      await tester.pumpAndSettle();

      expect(updatedValue, 8.0);
    });
  });

  group('AdminDashboardDialog Tests', () {
    testWidgets('AdminDashboardDialog renders statistics and users list', (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(buildApp(const AdminDashboardDialog()));
      await tester.pump();

      // Verify Admin Header
      expect(find.text('لوحة إدارة النظام والمشتركين'), findsOneWidget);
      expect(find.text('متابعة الحسابات، تفعيل الاشتراكات، وإدارة صلاحيات المعلمين'), findsOneWidget);

      // Verify Stats Cards
      expect(find.text('إجمالي المستخدمين'), findsOneWidget);
      expect(find.text('نشط ومفعل'), findsOneWidget);
      expect(find.text('منتهي الصلاحية'), findsOneWidget);
      expect(find.text('ملغي / مجمد'), findsOneWidget);
    });
  });
}
