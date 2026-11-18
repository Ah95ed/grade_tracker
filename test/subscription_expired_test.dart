import 'package:flutter_test/flutter_test.dart';
import 'package:grade_tracker/models/app_user.dart';

void main() {
  group('isSubscriptionExpired (Section 1.3 - Conditions 0 to 6)', () {
    final now = DateTime(2026, 11, 18, 12, 0, 0);

    test('Condition 0: Admin never expires', () {
      final admin = AppUser(
        uid: 'admin_1',
        email: 'admin@school.iq',
        isAdmin: true,
        subscriptionStatus: 'expired',
        subscriptionType: 'yearly',
        createdAt: now.subtract(const Duration(days: 400)).toIso8601String(),
        expiresAt: now.subtract(const Duration(days: 30)).toIso8601String(),
        lastActiveAt: now.toIso8601String(),
      );
      expect(isSubscriptionExpired(admin, now), isFalse);
    });

    test('Condition 1: Expired or Cancelled status explicitly expires', () {
      final cancelledUser = AppUser(
        uid: 'u_cancelled',
        email: 'user1@school.iq',
        subscriptionType: 'lifetime',
        subscriptionStatus: 'cancelled',
        createdAt: now.toIso8601String(),
        lastActiveAt: now.toIso8601String(),
      );
      expect(isSubscriptionExpired(cancelledUser, now), isTrue);

      final expiredUser = AppUser(
        uid: 'u_expired',
        email: 'user2@school.iq',
        subscriptionType: 'yearly',
        subscriptionStatus: 'expired',
        createdAt: now.toIso8601String(),
        lastActiveAt: now.toIso8601String(),
      );
      expect(isSubscriptionExpired(expiredUser, now), isTrue);
    });

    test('Condition 2: Lifetime active user never expires', () {
      final lifetimeUser = AppUser(
        uid: 'u_lifetime',
        email: 'user3@school.iq',
        subscriptionType: 'lifetime',
        subscriptionStatus: 'active',
        createdAt: now.subtract(const Duration(days: 800)).toIso8601String(),
        lastActiveAt: now.toIso8601String(),
      );
      expect(isSubscriptionExpired(lifetimeUser, now), isFalse);
    });

    test('Condition 3: Explicit expiresAt passed expires timed accounts offline', () {
      final pastExpiry = AppUser(
        uid: 'u_yearly_past',
        email: 'user4@school.iq',
        subscriptionType: 'yearly',
        subscriptionStatus: 'active',
        createdAt: now.subtract(const Duration(days: 370)).toIso8601String(),
        expiresAt: now.subtract(const Duration(minutes: 1)).toIso8601String(),
        lastActiveAt: now.toIso8601String(),
      );
      expect(isSubscriptionExpired(pastExpiry, now), isTrue);

      final futureExpiry = AppUser(
        uid: 'u_yearly_future',
        email: 'user5@school.iq',
        subscriptionType: 'yearly',
        subscriptionStatus: 'active',
        createdAt: now.subtract(const Duration(days: 10)).toIso8601String(),
        expiresAt: now.add(const Duration(days: 355)).toIso8601String(),
        lastActiveAt: now.toIso8601String(),
      );
      expect(isSubscriptionExpired(futureExpiry, now), isFalse);
    });

    test('Condition 4: Active status with no explicit expiration does not expire', () {
      final activeNoExp = AppUser(
        uid: 'u_active_no_exp',
        email: 'user6@school.iq',
        subscriptionType: 'yearly',
        subscriptionStatus: 'active',
        createdAt: now.subtract(const Duration(days: 100)).toIso8601String(),
        expiresAt: null,
        lastActiveAt: now.toIso8601String(),
      );
      expect(isSubscriptionExpired(activeNoExp, now), isFalse);
    });

    test('Condition 5: Trial expires after 48 hours from registration', () {
      final within48h = AppUser(
        uid: 'u_trial_ok',
        email: 'trial1@school.iq',
        isTrial: true,
        subscriptionStatus: 'pending',
        createdAt: now.subtract(const Duration(hours: 47)).toIso8601String(),
        lastActiveAt: now.toIso8601String(),
      );
      expect(isSubscriptionExpired(within48h, now), isFalse);

      final over48h = AppUser(
        uid: 'u_trial_expired',
        email: 'trial2@school.iq',
        isTrial: true,
        subscriptionStatus: 'pending',
        createdAt: now.subtract(const Duration(hours: 48, minutes: 1)).toIso8601String(),
        lastActiveAt: now.toIso8601String(),
      );
      expect(isSubscriptionExpired(over48h, now), isTrue);
    });

    test('Condition 6: Clock rollback protection (> 15 minutes) expires pending/trial accounts', () {
      final rollbacked = AppUser(
        uid: 'u_rollback',
        email: 'trial3@school.iq',
        subscriptionStatus: 'pending',
        isTrial: false,
        createdAt: now.subtract(const Duration(hours: 10)).toIso8601String(),
        lastActiveAt: now.toIso8601String(),
      );
      // Clock set backward by 20 minutes
      final hackedClock = now.subtract(const Duration(minutes: 20));
      expect(isSubscriptionExpired(rollbacked, hackedClock), isTrue);

      // Clock set backward by only 5 minutes (within tolerance)
      final withinTolerance = now.subtract(const Duration(minutes: 5));
      expect(isSubscriptionExpired(rollbacked, withinTolerance), isFalse);
    });
  });
}
