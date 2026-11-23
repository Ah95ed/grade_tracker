import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/controllers/teacher_personal_controller.dart';
import 'package:grade_tracker/controllers/teacher_profile_controller.dart';
import 'package:grade_tracker/models/exam_paper.dart';
import 'package:grade_tracker/models/monthly_model.dart';
import 'package:grade_tracker/models/student_row.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/services/pdf/exam_paper_pdf_service.dart';
import 'package:grade_tracker/views/exam_builder/exam_builder_view.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/model_selector_bar.dart';

void main() {
  late StorageService storage;
  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    storage = await StorageService.init();
  });

  group('Multi-Table GridView & Horizontal Scroll Tests', () {
    testWidgets('6 tables on mobile screen renders horizontal scroll view', (tester) async {
      final sheetController = MonthlySheetController(storage);
      final profileController = TeacherProfileController(storage);

      // Add 6 tables
      for (int i = 1; i <= 6; i++) {
        sheetController.models.add(
          MonthlyModel(
            id: 'm_$i',
            name: 'الشهر $i',
            gradeLevel: 'الأول متوسط',
            subject: 'الرياضيات',
            teacherName: 'أحمد علي',
            assignedSections: ['أ', 'ب'],
            students: [
              StudentRow(id: 's_$i', name: 'طالب $i', gradeLevel: 'الأول متوسط', section: 'أ'),
            ],
            customColumns: const [],
          ),
        );
      }
      sheetController.setActiveModel('m_1');

      // Test on mobile width (400px)
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider.value(value: sheetController),
            ChangeNotifierProvider.value(value: profileController),
          ],
          child: ScreenUtilInit(
            designSize: const Size(400, 800),
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

      // Mobile should show the horizontal scroll indicator
      expect(find.text('الجداول المنشأة (6): اسحب أفقياً'), findsOneWidget);
      expect(find.text('كشف درجات: '), findsWidgets);
      expect(find.text('الشهر 1'), findsOneWidget);
    });

    testWidgets('6 tables on tablet/desktop renders responsive GridView', (tester) async {
      final sheetController = MonthlySheetController(storage);
      final profileController = TeacherProfileController(storage);

      for (int i = 1; i <= 6; i++) {
        sheetController.models.add(
          MonthlyModel(
            id: 'm_$i',
            name: 'الشهر $i',
            gradeLevel: 'الأول متوسط',
            subject: 'الرياضيات',
            teacherName: 'أحمد علي',
            assignedSections: ['أ'],
            students: const [],
            customColumns: const [],
          ),
        );
      }
      sheetController.setActiveModel('m_1');

      // Test on desktop width (1200px)
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider.value(value: sheetController),
            ChangeNotifierProvider.value(value: profileController),
          ],
          child: ScreenUtilInit(
            designSize: const Size(1200, 900),
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

      // Desktop should show the grid header
      expect(find.text('كشوف الدرجات المتاحة (6):'), findsOneWidget);
      expect(find.text('انقر على أي جدول لعرض تفاصيله ورصد درجاته'), findsOneWidget);
      expect(find.text('الشهر 1'), findsOneWidget);
      expect(find.text('الشهر 6'), findsOneWidget);
    });
  });

  group('Exam Questions Builder Tests (Iraqi Standard)', () {
    test('createSampleExamPaper generates ministerial Iraqi exam structure', () {
      final sample = createSampleExamPaper();

      expect(sample.title, contains('وزاري عراقي'));
      expect(sample.header.rightLines.first, equals('اللجنة الدائمة للامتحانات'));
      expect(sample.header.leftLines.first, equals('جمهورية العراق - وزارة التربية'));
      expect(sample.header.noteText, contains('خمسة أسئلة فقط'));
      expect(sample.questions.length, equals(4));

      // Q1: Definitions (Inline)
      expect(sample.questions[0].label, equals('س١'));
      expect(sample.questions[0].branchLayout, equals(ExamBranchLayout.inline));
      expect(sample.questions[0].branches.length, equals(6));

      // Q2: Fill in the blanks with dotted lines (Vertical)
      expect(sample.questions[1].label, equals('س٢'));
      expect(sample.questions[1].branches.first.text, contains('............'));

      // Q3: Answer 2 branches (Arabic alpha أ، ب، ج)
      expect(sample.questions[2].label, equals('س٣'));
      expect(sample.questions[2].branchStyle, equals(ExamBranchStyle.arabicAlpha));

      // Q4: Multiple Choice (parentheses)
      expect(sample.questions[3].label, equals('س٤'));
      expect(sample.questions[3].branches.first.text, contains('البذور'));
    });

    testWidgets('ExamBuilderView renders paper canvas, toolbar and ministerial controls',
        (tester) async {
      final personalController = TeacherPersonalController(prefs);
      final profileController = TeacherProfileController(storage);

      // Load sample exam for visual test
      personalController.loadSampleExam();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider.value(value: personalController),
            ChangeNotifierProvider.value(value: profileController),
          ],
          child: ScreenUtilInit(
            designSize: const Size(1200, 900),
            minTextAdapt: true,
            builder: (_, _) => const MaterialApp(
              home: Scaffold(
                body: ExamBuilderView(isStandalone: true),
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Toolbar Controls
      expect(find.text('حفظ النموذج'), findsOneWidget);
      expect(find.text('طباعة / PDF'), findsOneWidget);
      expect(find.text('نموذج وزاري جاهز'), findsOneWidget);

      // Verify Canvas Header Content
      expect(find.text('جمهورية العراق\nوزارة التربية'), findsOneWidget);

      // Verify Questions rendered
      expect(find.text('س١'), findsOneWidget);
      expect(find.text('س٢'), findsOneWidget);
      expect(find.text('س٣'), findsOneWidget);
      expect(find.text('س٤'), findsOneWidget);

      // Verify Footer Text
      expect(find.text('مع تمنياتنا لكم بالنجاح والتوفيق'), findsWidgets);
    });

    test('saveCurrentExam persists exam to savedExams list and updates activeExamId', () {
      final personalController = TeacherPersonalController(prefs);
      expect(personalController.savedExams.length, equals(0));

      personalController.loadSampleExam();
      expect(personalController.draftExam.title, contains('وزاري عراقي'));

      personalController.saveCurrentExam('امتحان العلوم الوزاري');
      expect(personalController.savedExams.length, equals(1));
      expect(personalController.savedExams.first.title, equals('امتحان العلوم الوزاري'));
      expect(personalController.activeExamId, isNotNull);

      // Verify persistence by reloading from prefs
      final reloadedController = TeacherPersonalController(prefs);
      expect(reloadedController.savedExams.length, equals(1));
      expect(reloadedController.savedExams.first.title, equals('امتحان العلوم الوزاري'));
    });

    test('generateExamPdf creates valid PDF bytes without font loading errors', () async {
      final sample = createSampleExamPaper();
      final pdfBytes = await ExamPaperPdfService.generateExamPdf(sample);

      expect(pdfBytes, isNotEmpty);
      // PDF documents start with %PDF
      final headerStr = String.fromCharCodes(pdfBytes.take(4));
      expect(headerStr, equals('%PDF'));
    });
  });
}
