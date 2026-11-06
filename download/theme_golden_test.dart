import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'app_theme.dart';

void main() {
  Widget buildThemedShowcase({required ThemeData theme, required TextDirection direction}) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: theme,
      home: Directionality(
        textDirection: direction,
        child: Scaffold(
          appBar: AppBar(
            title: const Text('دفتر درجات المعلم - تجربة الثيم'),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. بطاقة كرتونية ورقية (Craft Card)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'عنوان البطاقة الورقية الكرافتية',
                          style: theme.textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'هذا النص يختبر ظهور الخط العربي الافتراضي Cairo بلون الحبر القديم الداكن.',
                          style: theme.textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // 2. حقل إدخال مخصص (Input Field)
                const TextField(
                  decoration: InputDecoration(
                    labelText: 'اسم الطالب الرباعي',
                    hintText: 'أدخل الاسم الثلاثي أو الرباعي...',
                    prefixIcon: Icon(Icons.person_rounded),
                  ),
                ),
                const SizedBox(height: 16),

                // 3. أزرار العمليات (Buttons)
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.add_rounded),
                      label: const Text('+ جدول درجات جديد'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.print_rounded),
                      label: const Text('طباعة الشهادات'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 4. ألوان الأقسام الدلالية الأربعة (Module Colors)
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppColors.monthlyAccent,
                          borderRadius: BorderRadius.circular(AppRadii.md),
                        ),
                        alignment: Alignment.center,
                        child: const Text('الجدول', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppColors.termAccent,
                          borderRadius: BorderRadius.circular(AppRadii.md),
                        ),
                        alignment: Alignment.center,
                        child: const Text('المعدل', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppColors.cardsAccent,
                          borderRadius: BorderRadius.circular(AppRadii.md),
                        ),
                        alignment: Alignment.center,
                        child: const Text('الكروت', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  testWidgets('AppTheme lightTheme renders correctly in RTL mode without overflow', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildThemedShowcase(theme: AppTheme.lightTheme, direction: AppTheme.defaultDirection));
    await tester.pumpAndSettle();

    // Verify key widgets rendered under AppTheme
    expect(find.text('دفتر درجات المعلم - تجربة الثيم'), findsOneWidget);
    expect(find.text('+ جدول درجات جديد'), findsOneWidget);
    expect(find.text('طباعة الشهادات'), findsOneWidget);
    expect(find.byType(Card), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('AppTheme darkTheme renders correctly in RTL mode without overflow', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(buildThemedShowcase(theme: AppTheme.darkTheme, direction: AppTheme.defaultDirection));
    await tester.pumpAndSettle();

    expect(find.text('دفتر درجات المعلم - تجربة الثيم'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
