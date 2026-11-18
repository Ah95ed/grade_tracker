import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import '../models/teacher_personal.dart';

/// Background and foreground notification manager for teacher alarms (Section 2.4)
class TeacherNotificationService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  /// Initializes timezone data and notification channel handlers
  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      tz.initializeTimeZones();
      try {
        tz.setLocalLocation(tz.getLocation('Asia/Baghdad'));
      } catch (_) {}

      const androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const darwinSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );
      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: darwinSettings,
        macOS: darwinSettings,
      );

      await _notificationsPlugin.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (response) {
          debugPrint('Notification clicked: ${response.payload}');
        },
      );

      // Create Android Notification Channel
      const androidChannel = AndroidNotificationChannel(
        'teacher_alerts_channel',
        'تنبيهات ومواعيد المعلم',
        description: 'تنبيهات الجدول الدراسي والحصص والمذكرات الهامة للمعلم',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      );

      final androidImpl = _notificationsPlugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (androidImpl != null) {
        await androidImpl.createNotificationChannel(androidChannel);
        await androidImpl.requestNotificationsPermission();
      }

      _initialized = true;
    } catch (e) {
      debugPrint('TeacherNotificationService initialize warning: $e');
    }
  }

  /// Cancels an existing notification schedule
  static Future<void> cancelAlert(int notificationId) async {
    try {
      await _notificationsPlugin.cancel(id: notificationId);
    } catch (_) {}
  }

  /// Schedules a system notification matching AlertRepeat (once, daily, weekly, or snooze)
  static Future<void> scheduleTeacherAlert(TeacherAlert alert) async {
    if (!alert.isActive) {
      await cancelAlert(alert.id.hashCode);
      return;
    }
    await initialize();

    try {
      final parts = alert.time.split(':');
      final hour = parts.isNotEmpty ? int.tryParse(parts[0]) ?? 8 : 8;
      final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;

      final now = tz.TZDateTime.now(tz.local);

      final notificationDetails = NotificationDetails(
        android: AndroidNotificationDetails(
          'teacher_alerts_channel',
          'تنبيهات ومواعيد المعلم',
          channelDescription:
              'تنبيهات الجدول الدراسي والحصص والمذكرات الهامة للمعلم',
          importance: Importance.max,
          priority: Priority.high,
          playSound: alert.soundEnabled,
          enableVibration: true,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: alert.soundEnabled,
        ),
      );

      // Check if snoozed
      if (alert.snoozeUntil != null && alert.snoozeUntil!.isAfter(DateTime.now())) {
        final snoozeTz = tz.TZDateTime.from(alert.snoozeUntil!, tz.local);
        await _notificationsPlugin.zonedSchedule(
          id: alert.id.hashCode,
          title: alert.title,
          body: alert.note ?? 'تنبيه مؤجل من مواعيد المعلم',
          scheduledDate: snoozeTz,
          notificationDetails: notificationDetails,
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        );
        return;
      }

      switch (alert.repeat) {
        case AlertRepeat.once:
          DateTime parsedDate;
          try {
            parsedDate = DateTime.parse(alert.date);
          } catch (_) {
            parsedDate = DateTime.now();
          }
          var scheduledDate = tz.TZDateTime(
            tz.local,
            parsedDate.year,
            parsedDate.month,
            parsedDate.day,
            hour,
            minute,
          );
          if (scheduledDate.isBefore(now)) {
            return;
          }
          await _notificationsPlugin.zonedSchedule(
            id: alert.id.hashCode,
            title: alert.title,
            body: alert.note ?? 'تنبيه موعد في المفكرة',
            scheduledDate: scheduledDate,
            notificationDetails: notificationDetails,
            androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          );
          break;

        case AlertRepeat.daily:
          var scheduledDate = tz.TZDateTime(
            tz.local,
            now.year,
            now.month,
            now.day,
            hour,
            minute,
          );
          if (scheduledDate.isBefore(now)) {
            scheduledDate = scheduledDate.add(const Duration(days: 1));
          }
          await _notificationsPlugin.zonedSchedule(
            id: alert.id.hashCode,
            title: alert.title,
            body: alert.note ?? 'تنبيه يومي متكرر',
            scheduledDate: scheduledDate,
            notificationDetails: notificationDetails,
            androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
            matchDateTimeComponents: DateTimeComponents.time,
          );
          break;

        case AlertRepeat.weekly:
          final targetDayIndex = alert.repeatDay != null
              ? _weekdayToDateTimeDay(alert.repeatDay!)
              : DateTime.sunday;

          var scheduledDate = tz.TZDateTime(
            tz.local,
            now.year,
            now.month,
            now.day,
            hour,
            minute,
          );
          while (scheduledDate.weekday != targetDayIndex ||
              scheduledDate.isBefore(now)) {
            scheduledDate = scheduledDate.add(const Duration(days: 1));
          }

          await _notificationsPlugin.zonedSchedule(
            id: alert.id.hashCode,
            title: alert.title,
            body: alert.note ??
                'تنبيه أسبوعي: يوم ${alert.repeatDay?.arabicLabel ?? ""}',
            scheduledDate: scheduledDate,
            notificationDetails: notificationDetails,
            androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
            matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
          );
          break;
      }
    } catch (e) {
      debugPrint('scheduleTeacherAlert error: $e');
    }
  }

  static int _weekdayToDateTimeDay(WeekdayKey key) {
    switch (key) {
      case WeekdayKey.mon:
        return DateTime.monday;
      case WeekdayKey.tue:
        return DateTime.tuesday;
      case WeekdayKey.wed:
        return DateTime.wednesday;
      case WeekdayKey.thu:
        return DateTime.thursday;
      case WeekdayKey.fri:
        return DateTime.friday;
      case WeekdayKey.sat:
        return DateTime.saturday;
      case WeekdayKey.sun:
        return DateTime.sunday;
    }
  }
}
