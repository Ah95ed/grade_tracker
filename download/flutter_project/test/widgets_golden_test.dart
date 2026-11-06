import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../flutter_widgets/common/app_logo.dart';
import '../flutter_widgets/common/sync_status_badge.dart';
import '../flutter_widgets/common/bottom_score_keypad.dart';
import '../flutter_widgets/header/app_header.dart';

void main() {
  testWidgets('AppLogo renders properly at various sizes', (WidgetTester tester) async {
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.rtl,
        child: Center(child: AppLogo(size: 64)),
      ),
    );
    expect(find.byType(AppLogo), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('SyncStatusBadge renders online and offline states without overflow', (WidgetTester tester) async {
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.rtl,
        child: Material(
          child: Row(
            children: [
              SyncStatusBadge(isOnline: true, isSyncing: false),
              SizedBox(width: 8),
              SyncStatusBadge(isOnline: false, isSyncing: false),
              SizedBox(width: 8),
              SyncStatusBadge(isOnline: true, isSyncing: true),
            ],
          ),
        ),
      ),
    );
    expect(find.byType(SyncStatusBadge), findsNWidgets(3));
    expect(tester.takeException(), isNull);
  });

  testWidgets('BottomScoreKeypad renders keys and accepts input', (WidgetTester tester) async {
    String pressed = '';
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BottomScoreKeypad(
            onKeyPress: (k) => pressed = k,
            onDelete: () {},
            onNextStudent: () {},
            onClose: () {},
          ),
        ),
      ),
    );
    expect(find.text('5'), findsOneWidget);
    await tester.tap(find.text('5'));
    expect(pressed, '5');
  });

  testWidgets('AppHeader renders teacher name and sync indicator in RTL', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          appBar: AppHeader(
            activeTab: 0,
            teacherName: 'الأستاذ: علي محمد',
            subject: 'الرياضيات',
            schoolName: 'ثانوية المتميزين',
            isOnline: true,
            isSyncing: false,
            onOpenMenu: () {},
          ),
        ),
      ),
    );
    expect(find.text('الأستاذ: علي محمد'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
