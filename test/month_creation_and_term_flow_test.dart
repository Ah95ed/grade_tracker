import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/controllers/term_controller.dart';
import 'package:grade_tracker/controllers/teacher_profile_controller.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/models/monthly_model.dart';
import 'package:grade_tracker/models/student_row.dart';
import 'package:grade_tracker/models/teacher_profile.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/add_model_dialog.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/add_student_dialog.dart';
import 'package:grade_tracker/views/term_calculation/widgets/create_term_dialog.dart';

void main() {
  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.init();
  });

  Widget buildTestApp({
    required Widget child,
    MonthlySheetController? sheetCtrl,
    TermController? termCtrl,
    TeacherProfileController? profileCtrl,
  }) {
    final sCtrl = sheetCtrl ?? MonthlySheetController(storage);
    final tCtrl = termCtrl ?? TermController(storage);
    final pCtrl = profileCtrl ?? TeacherProfileController(storage);

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<MonthlySheetController>.value(value: sCtrl),
        ChangeNotifierProvider<TermController>.value(value: tCtrl),
        ChangeNotifierProvider<TeacherProfileController>.value(value: pCtrl),
      ],
      child: ScreenUtilInit(
        designSize: const Size(800, 1200),
        minTextAdapt: true,
        builder: (context, _) => MaterialApp(
          home: Scaffold(
            body: child,
          ),
        ),
      ),
    );
  }

  group('Month creation and automatic AddStudentDialog flow', () {
    testWidgets('Creating a month with 0 students returns true to open AddStudentDialog', (tester) async {
      final sheetCtrl = MonthlySheetController(storage);
      final profileCtrl = TeacherProfileController(storage);

      await profileCtrl.updateProfile(const TeacherProfile(
        teacherName: 'أحمد',
        subject: 'الرياضيات',
        schoolName: 'المدرسة النموذجية',
      ));

      bool? dialogResult;

      await tester.pumpWidget(buildTestApp(
        sheetCtrl: sheetCtrl,
        profileCtrl: profileCtrl,
        child: Builder(
          builder: (context) => ElevatedButton(
            onPressed: () async {
              dialogResult = await showDialog<bool>(
                context: context,
                builder: (_) => const AddModelDialog(),
              );
            },
            child: const Text('Open Dialog'),
          ),
        ),
      ));
      await tester.pumpAndSettle();

      // Open AddModelDialog
      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      // Tap preset grade chip 'الأول متوسط'
      final gradeChip = find.text('الأول متوسط');
      expect(gradeChip, findsWidgets);
      await tester.ensureVisible(gradeChip.first);
      await tester.pumpAndSettle();
      await tester.tap(gradeChip.first);
      await tester.pumpAndSettle();

      // Click create button
      final createBtn = find.textContaining('إنشاء (الشهر الأول)');
      await tester.ensureVisible(createBtn);
      await tester.pumpAndSettle();
      expect(createBtn, findsOneWidget);
      await tester.tap(createBtn);
      await tester.pumpAndSettle();

      // Should have returned true to trigger AddStudentDialog
      expect(dialogResult, isTrue);
      expect(sheetCtrl.models.length, equals(1));
      expect(sheetCtrl.models.first.students.isEmpty, isTrue);
    });
  });

  group('AddStudentDialog Grade Field validation and dropdown', () {
    testWidgets('Grade field starts empty and mandatory with warning', (tester) async {
      final sheetCtrl = MonthlySheetController(storage);
      final profileCtrl = TeacherProfileController(storage);

      // Add a model with previous grade
      await sheetCtrl.addModel(MonthlyModel(
        id: 'm1',
        name: 'الشهر الأول',
        subject: 'الرياضيات',
        gradeLevel: 'الأول متوسط',
        students: const [
          StudentRow(id: 's1', name: 'ياسر علي', gradeLevel: 'الأول متوسط', section: 'أ'),
        ],
        createdAt: DateTime.now().toIso8601String(),
      ));

      await tester.pumpWidget(buildTestApp(
        sheetCtrl: sheetCtrl,
        profileCtrl: profileCtrl,
        child: const AddStudentDialog(),
      ));
      await tester.pumpAndSettle();

      // Mandatory indicator
      expect(find.text('* (مطلوب)'), findsOneWidget);
      expect(find.text('⚠️ يرجى تحديد الصف أولاً'), findsOneWidget);

      // Attempt to add a student without selecting grade
      final singleAddBtn = find.widgetWithText(ElevatedButton, 'إضافة');
      await tester.tap(singleAddBtn);
      await tester.pumpAndSettle();

      // Error message should appear
      expect(find.textContaining('يرجى تحديد الصف أولاً'), findsWidgets);
    });
  });

  group('CreateTermDialog months selection at the bottom', () {
    testWidgets('Displays months created in table sheet at the bottom for selection', (tester) async {
      final sheetCtrl = MonthlySheetController(storage);
      final termCtrl = TermController(storage);
      final profileCtrl = TeacherProfileController(storage);

      // Add 2 monthly models
      await sheetCtrl.addModel(MonthlyModel(
        id: 'm_oct',
        name: 'شهر تشرين الأول',
        subject: 'الفيزياء',
        gradeLevel: 'الثالث متوسط',
        students: const [
          StudentRow(id: 's1', name: 'حسين علي', section: 'أ', writtenRawScore: 90),
        ],
        createdAt: DateTime.now().toIso8601String(),
      ));

      await sheetCtrl.addModel(MonthlyModel(
        id: 'm_nov',
        name: 'شهر تشرين الثاني',
        subject: 'الفيزياء',
        gradeLevel: 'الثالث متوسط',
        students: const [
          StudentRow(id: 's1', name: 'حسين علي', section: 'أ', writtenRawScore: 85),
        ],
        createdAt: DateTime.now().toIso8601String(),
      ));

      await tester.pumpWidget(buildTestApp(
        sheetCtrl: sheetCtrl,
        termCtrl: termCtrl,
        profileCtrl: profileCtrl,
        child: const CreateTermDialog(),
      ));
      await tester.pumpAndSettle();

      // Header for selecting months at bottom
      expect(find.text('الأشهر المشمولة باحتساب المعدل:'), findsOneWidget);
      expect(find.textContaining('اختر الأشهر التي تم إضافتها في صفحة الجدول'), findsOneWidget);

      // Both months should be visible
      expect(find.text('شهر تشرين الأول'), findsOneWidget);
      expect(find.text('شهر تشرين الثاني'), findsOneWidget);

      // Action buttons
      expect(find.text('تحديد الكل'), findsOneWidget);
      expect(find.text('إلغاء التحديد'), findsOneWidget);

      // Submit form
      final submitBtn = find.text('حفظ وإنشاء الفصل');
      await tester.tap(submitBtn);
      await tester.pumpAndSettle();

      // Verify term was created with the selected months
      expect(termCtrl.terms.length, equals(1));
      final createdTerm = termCtrl.terms.first;
      expect(createdTerm.selectedModelIds, containsAll(['m_oct', 'm_nov']));
    });
  });
}
