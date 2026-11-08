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
import 'package:grade_tracker/models/attendance_record.dart';
import 'package:grade_tracker/views/monthly_sheet/widgets/student_data_table.dart';

void main() {
  testWidgets('Attendance tracking and Table Layout verify with exact web fidelity', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final storage = await StorageService.init();
    final sheetController = MonthlySheetController(storage);
    final profileController = TeacherProfileController(storage);

    final testModel = MonthlyModel(
      id: 'm1',
      name: 'الشهر الأول',
      gradeLevel: 'الاول متوسط',
      subject: 'الرياضيات',
      writtenMaxScore: 80.0,
      totalMaxScore: 100.0,
      customColumns: [
        const CustomColumn(
          id: 'c_att',
          name: 'الغياب والحضور',
          maxScore: 0.0,
          isAttendance: true,
          affectsGrade: true,
          absentAction: 'deduct',
          absentPoints: 1.0,
        ),
      ],
      students: [
        StudentRow(
          id: 's1',
          name: 'محمد أحمد',
          gradeLevel: 'الاول متوسط',
          section: 'أ',
          writtenRawScore: 75.0,
          attendanceRecords: {
            'c_att': [
              AttendanceRecord(
                id: 'r1',
                date: '2026-11-08',
                dayName: 'الأحد',
                status: 'absent',
                note: 'بدون عذر',
                createdAt: DateTime.now().toIso8601String(),
              ),
            ],
          },
        ),
      ],
    );

    await sheetController.setModels([testModel]);

    tester.view.physicalSize = const Size(1280, 800);
    addTearDown(() {
      tester.view.resetPhysicalSize();
    });

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: sheetController),
          ChangeNotifierProvider.value(value: profileController),
        ],
        child: ScreenUtilInit(
          designSize: const Size(1280, 800),
          builder: (_, _) => const MaterialApp(
            home: Scaffold(
              body: StudentDataTable(),
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Header Columns: 'حذف', '#', 'اسم الطالب', 'الغياب والحضور'
    expect(find.text('حذف'), findsOneWidget);
    expect(find.text('#'), findsOneWidget);
    expect(find.text('اسم الطالب'), findsOneWidget);
    expect(find.text('الغياب والحضور'), findsOneWidget);

    // Verify Row 1: Student row index '1' and student name 'محمد أحمد'
    expect(find.text('1'), findsWidgets);
    expect(find.text('محمد أحمد'), findsOneWidget);

    // Verify attendance badge 'غ: 1' and deduction '(-1.0)'
    expect(find.text('غ: 1'), findsOneWidget);
    expect(find.text('(-1.0)'), findsOneWidget);

    // Final score: 75.0 - 1.0 = 74
    final finalScore = sheetController.calculateFinalStudentScore(
      testModel.students.first,
      testModel,
    );
    expect(finalScore, 74.0);
  });
}
