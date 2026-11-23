import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/controllers/teacher_profile_controller.dart';
import 'package:grade_tracker/controllers/term_controller.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/models/monthly_model.dart';
import 'package:grade_tracker/models/student_row.dart';
import 'package:grade_tracker/models/term_model.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/model_selector_bar.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/teacher_sections_swap_dialog.dart';
import 'package:grade_tracker/views/term_calculation/widgets/term_selector_bar.dart';

void main() {
  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.init();
  });

  testWidgets('ModelSelectorBar renders large organized card with all details and action buttons',
      (WidgetTester tester) async {
    final sheetController = MonthlySheetController(storage);
    final profileController = TeacherProfileController(storage);

    // Create a mock model
    final mockModel = MonthlyModel(
      id: 'm1',
      name: 'الشهر الأول',
      gradeLevel: 'الأول الابتدائي',
      subject: 'عربي',
      teacherName: 'أحمد علي',
      assignedSections: ['أ', 'ب'],
      students: [
        StudentRow(id: 's1', name: 'علي حسن', gradeLevel: 'الأول الابتدائي', section: 'أ'),
      ],
      customColumns: const [],
    );

    sheetController.models.add(mockModel);
    sheetController.setActiveModel('m1');

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: sheetController),
          ChangeNotifierProvider.value(value: profileController),
        ],
        child: ScreenUtilInit(
          designSize: const Size(1200, 800),
          minTextAdapt: true,
          builder: (_, _) => const MaterialApp(
            home: Scaffold(
              body: Directionality(
                textDirection: TextDirection.rtl,
                child: SingleChildScrollView(
                  child: ModelSelectorBar(),
                ),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Title & Badges
    expect(find.text('جدول درجات جديد'), findsOneWidget);
    expect(find.text('كشف درجات: '), findsOneWidget);
    expect(find.text('الشهر الأول'), findsOneWidget);
    expect(find.text('الأول الابتدائي'), findsOneWidget);
    expect(find.text('عربي'), findsOneWidget);

    // Verify Teacher and Sections
    expect(find.text('الأستاذ: أحمد علي'), findsOneWidget);
    expect(find.text('الشُعب: أ، ب'), findsOneWidget);

    // Verify Action buttons
    expect(find.text('تعديل بيانات الجدول (الاسم والمادة والأستاذ)'), findsOneWidget);
    expect(find.text('تبديل الشعبة بين الأساتذة'), findsOneWidget);

    // Tap "تبديل الشعبة بين الأساتذة" button to verify dialog opens
    await tester.tap(find.text('تبديل الشعبة بين الأساتذة'));
    await tester.pumpAndSettle();
    expect(find.byType(TeacherSectionsSwapDialog), findsOneWidget);
    expect(find.text('تبديل وتخصيص الشُعب'), findsOneWidget);
  });

  testWidgets('TermSelectorBar renders full comprehensive term card with months and actions',
      (WidgetTester tester) async {
    final termController = TermController(storage);
    final sheetController = MonthlySheetController(storage);

    // Add mock models to sheet controller
    sheetController.models.add(
      MonthlyModel(
        id: 'm1',
        name: 'الشهر الأول',
        gradeLevel: 'الأول الابتدائي',
        subject: 'عربي',
        teacherName: 'أحمد علي',
        assignedSections: ['أ'],
        students: const [],
        customColumns: const [],
      ),
    );

    // Add a term
    final mockTerm = TermModel(
      id: 't1',
      name: 'الفصل الأول',
      gradeLevel: 'الأول الابتدائي',
      subject: 'عربي',
      teacherName: 'أحمد علي',
      assignedSections: ['أ'],
      selectedModelIds: ['m1'],
      calculationMode: 'single',
    );

    termController.terms.add(mockTerm);
    termController.setActiveTerm('t1');

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: termController),
          ChangeNotifierProvider.value(value: sheetController),
        ],
        child: ScreenUtilInit(
          designSize: const Size(1200, 800),
          minTextAdapt: true,
          builder: (_, _) => const MaterialApp(
            home: Scaffold(
              body: Directionality(
                textDirection: TextDirection.rtl,
                child: SingleChildScrollView(
                  child: TermSelectorBar(),
                ),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Add Term and Result Cards buttons
    expect(find.text('إضافة فصل جديد'), findsOneWidget);
    expect(find.text('كروت النتائج'), findsOneWidget);

    // Verify Term Card Header
    expect(find.text('صفحة احتساب الدرجات'), findsOneWidget);
    expect(find.text('الفصل الأول'), findsOneWidget);
    expect(find.text('الأول الابتدائي'), findsOneWidget);
    expect(find.text('عربي'), findsOneWidget);

    // Verify Teacher & Section Details
    expect(find.text('الأستاذ: أحمد علي'), findsOneWidget);
    expect(find.text('الشُعب المخصصة: أ'), findsOneWidget);

    // Verify Month checkboxes section
    expect(find.text('الأشهر المحددة من الجدول:'), findsOneWidget);
    expect(find.text('(1 من 1)'), findsOneWidget);
    expect(find.text('الشهر الأول'), findsWidgets);

    // Verify compact Action buttons (تعديل / حذف)
    expect(find.text('تعديل'), findsOneWidget);
    expect(find.text('حذف'), findsOneWidget);
  });
}
