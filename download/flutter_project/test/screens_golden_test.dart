import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../flutter_widgets/views/monthly_sheet_view.dart';
import '../flutter_widgets/views/term_calculation_view.dart';
import '../flutter_widgets/views/report_cards_view.dart';

void main() {
  testWidgets('MonthlySheetView renders model chips and search input in RTL', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      MaterialApp(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            body: MonthlySheetView(
              models: const ['تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
              activeModel: 'تشرين الأول',
              onSelectModel: (_) {},
              onAddNewModel: () {},
            ),
          ),
        ),
      ),
    );
    expect(find.text('+ جدول درجات جديد'), findsOneWidget);
    expect(find.text('تشرين الأول'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('TermCalculationView renders metric cards and action button', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      MaterialApp(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            body: TermCalculationView(
              terms: const ['الفصل الأول', 'الفصل الثاني'],
              onAddTerm: () {},
            ),
          ),
        ),
      ),
    );
    expect(find.text('+ إضافة فصل جديد'), findsOneWidget);
    expect(find.text('نسبة النجاح'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ReportCardsView renders sage green banner and mode switcher', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      MaterialApp(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            body: ReportCardsView(
              onPrint: () {},
              onOpenPrintSettings: () {},
            ),
          ),
        ),
      ),
    );
    expect(find.text('فصول الدرجات المعتمدة في الشهادات'), findsOneWidget);
    expect(find.text('حسب المادة'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
