import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grade_tracker/models/teacher_personal.dart';
import 'package:grade_tracker/controllers/teacher_personal_controller.dart';

void main() {
  group('Teacher Personal Workspace Tests (Section 2)', () {
    late SharedPreferences prefs;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      prefs = await SharedPreferences.getInstance();
    });

    test('SchedulePeriod default periods initialize 6 standard periods', () {
      expect(SchedulePeriod.defaultPeriods.length, 6);
      expect(SchedulePeriod.defaultPeriods.first.label, 'الأولى');
      expect(SchedulePeriod.defaultPeriods.first.timeRange, '08:00 - 08:45');
    });

    test('ClassWeeklySchedule cells key mapping and copyWith', () {
      final sched = ClassWeeklySchedule(
        id: 's1',
        gradeLevel: 'الأول متوسط',
        section: 'أ',
        periods: SchedulePeriod.defaultPeriods,
        cells: {'sun::p1': 'رياضيات'},
        updatedAt: DateTime.now(),
      );

      expect(sched.cells['sun::p1'], 'رياضيات');
      expect(sched.showSaturday, isFalse);
      expect(sched.showFriday, isFalse);

      final updated = sched.copyWith(showSaturday: true);
      expect(updated.showSaturday, isTrue);
    });

    test('TeacherNote category and toggles', () async {
      final ctrl = TeacherPersonalController(prefs, userUid: 'teacher_1');
      final note = TeacherNote(
        id: 'n1',
        title: 'تحضير درس المعادلات',
        content: 'شرح الفرق بين المعادلة الخطية والتربيعية',
        category: NoteCategory.lessonPrep,
        createdAt: DateTime(2026, 11, 18),
        updatedAt: DateTime(2026, 11, 18),
      );

      await ctrl.addNote(note);
      expect(ctrl.notes.length, 1);
      expect(ctrl.notes.first.category, NoteCategory.lessonPrep);

      await ctrl.togglePinNote('n1');
      expect(ctrl.notes.first.isPinned, isTrue);

      await ctrl.toggleDoneNote('n1');
      expect(ctrl.notes.first.isDone, isTrue);
    });

    test('User isolation preserves separate workspaces per teacher UID', () async {
      final ctrlUser1 = TeacherPersonalController(prefs, userUid: 'user_A');
      await ctrlUser1.addNote(TeacherNote(
        id: 'note_A',
        title: 'ملاحظة المعلم الأول',
        content: 'تفاصيل 1',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ));
      expect(ctrlUser1.notes.length, 1);

      final ctrlUser2 = TeacherPersonalController(prefs, userUid: 'user_B');
      expect(ctrlUser2.notes, isEmpty);
    });
  });
}
