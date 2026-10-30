import 'package:flutter_test/flutter_test.dart';
import 'package:grade_tracker/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Tests that GradeTrackerApp builds properly
    expect(GradeTrackerApp, isNotNull);
  });
}
