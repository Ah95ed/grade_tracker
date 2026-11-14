import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:grade_tracker/core/utils/arabic_helper.dart';
import 'package:grade_tracker/controllers/monthly_sheet_controller.dart';
import 'package:grade_tracker/models/monthly_model.dart';
import 'package:grade_tracker/models/student_row.dart';
import 'package:grade_tracker/services/storage_service.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/grade_numeric_keypad.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('ArabicHelper Tests', () {
    test('Arabic text normalization strips tashkeel and unifies alef/ta/ya', () {
      expect(ArabicHelper.normalizeArabic('مُحَمَّد'), 'محمد');
      expect(ArabicHelper.normalizeArabic('أَحْمَد'), 'احمد');
      expect(ArabicHelper.normalizeArabic('إِبْرَاهِيم'), 'ابراهيم');
      expect(ArabicHelper.normalizeArabic('فاطمة'), 'فاطمه');
      expect(ArabicHelper.normalizeArabic('مصطفى'), 'مصطفي');
    });

    test('Arabic alphabetical comparison orders names accurately', () {
      final names = ['يوسف', 'أحمد', 'باسم', 'تامر', 'محمد'];
      names.sort(ArabicHelper.compareArabic);
      expect(names, ['أحمد', 'باسم', 'تامر', 'محمد', 'يوسف']);
    });

    test('formatScore handles EN and AR numeral modes', () {
      expect(ArabicHelper.formatScore(25, 'EN'), '25');
      expect(ArabicHelper.formatScore(25, 'AR'), '٢٥');
      expect(ArabicHelper.formatScore(18.5, 'EN'), '18.5');
      expect(ArabicHelper.formatScore(18.5, 'AR'), '١٨،٥');
    });

    test('parseScore parses Arabic and English digits with dots or commas', () {
      expect(ArabicHelper.parseScore('25'), 25.0);
      expect(ArabicHelper.parseScore('٢٥'), 25.0);
      expect(ArabicHelper.parseScore('١٨،٥'), 18.5);
      expect(ArabicHelper.parseScore('18.5'), 18.5);
      expect(ArabicHelper.parseScore(''), null);
      expect(ArabicHelper.parseScore(null), null);
    });
  });

  group('MonthlySheetController Sorting Tests', () {
    late StorageService storageService;
    late MonthlySheetController controller;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      storageService = StorageService(prefs);
      controller = MonthlySheetController(storageService);

      final model = MonthlyModel(
        id: 'model-1',
        name: 'الشهر الأول',
        students: [
          const StudentRow(id: 's1', name: 'يوسف كريم', section: 'أ'),
          const StudentRow(id: 's2', name: 'أحمد علي', section: 'أ'),
          const StudentRow(id: 's3', name: 'باسم فؤاد', section: 'أ'),
        ],
      );
      await controller.addModel(model);
    });

    test('Toggling student sort cycles none -> asc -> desc -> none', () {
      expect(controller.sortMode, StudentSortMode.none);
      expect(controller.filteredStudents.map((s) => s.name).toList(), [
        'يوسف كريم',
        'أحمد علي',
        'باسم فؤاد',
      ]);

      controller.toggleStudentSort();
      expect(controller.sortMode, StudentSortMode.asc);
      expect(controller.filteredStudents.map((s) => s.name).toList(), [
        'أحمد علي',
        'باسم فؤاد',
        'يوسف كريم',
      ]);

      controller.toggleStudentSort();
      expect(controller.sortMode, StudentSortMode.desc);
      expect(controller.filteredStudents.map((s) => s.name).toList(), [
        'يوسف كريم',
        'باسم فؤاد',
        'أحمد علي',
      ]);

      controller.toggleStudentSort();
      expect(controller.sortMode, StudentSortMode.none);
    });

    test('Permanently sorting students persists alphabetical order', () async {
      await controller.sortStudentsPermanently();
      expect(controller.sortMode, StudentSortMode.none);
      final persistedModel = controller.currentModel!;
      expect(persistedModel.students.map((s) => s.name).toList(), [
        'أحمد علي',
        'باسم فؤاد',
        'يوسف كريم',
      ]);
    });
  });

  group('GradeNumericKeypad Widget Tests', () {
    testWidgets('GradeNumericKeypad renders buttons and updates score', (tester) async {
      double? updatedScore;
      bool nextCalled = false;
      bool closedCalled = false;

      const student1 = StudentRow(id: 's1', name: 'محمد علي', section: 'أ');
      const student2 = StudentRow(id: 's2', name: 'أحمد محمود', section: 'أ');

      await tester.pumpWidget(
        ScreenUtilInit(
          designSize: const Size(400, 800),
          builder: (context, child) => MaterialApp(
            home: Scaffold(
              body: GradeNumericKeypad(
                currentStudent: student1,
                nextStudent: student2,
                currentIndex: 0,
                totalStudents: 2,
                columnName: 'الامتحان الشفهي',
                maxScore: 20,
                currentValue: null,
                onValueChange: (val) => updatedScore = val,
                onNext: () => nextCalled = true,
                onPrev: () {},
                onClose: () => closedCalled = true,
                onNumeralModeChange: (_) {},
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check current student name
      expect(find.text('محمد علي'), findsOneWidget);
      expect(find.text('الامتحان الشفهي'), findsOneWidget);

      // Tap digit 1 then digit 8
      await tester.tap(find.text('1'));
      await tester.pumpAndSettle();
      expect(updatedScore, 1.0);

      await tester.tap(find.text('8'));
      await tester.pumpAndSettle();
      expect(updatedScore, 18.0);

      // Tap Next button
      await tester.tap(find.textContaining('تأكيد'));
      await tester.pumpAndSettle();
      expect(nextCalled, true);

      // Tap Close button
      await tester.tap(find.byIcon(Icons.close_rounded));
      await tester.pumpAndSettle();
      expect(closedCalled, true);
    });
  });
}
