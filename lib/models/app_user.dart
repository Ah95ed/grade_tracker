import '../core/constants/app_constants.dart';

/// Supported subscription plans (Section 1.2)
enum SubscriptionType { yearly, monthly, lifetime }

/// Supported subscription lifecycle statuses (Section 1.2)
enum SubscriptionStatus { active, pending, expired, cancelled }

const Duration trialDuration = AppConstants.trialDuration; // 48 hours
const Duration clockRollbackTolerance =
    AppConstants.clockRollbackTolerance; // 15 minutes

SubscriptionType? parseSubscriptionType(String? raw) {
  switch (raw?.toLowerCase().trim()) {
    case 'yearly':
      return SubscriptionType.yearly;
    case 'monthly':
      return SubscriptionType.monthly;
    case 'lifetime':
      return SubscriptionType.lifetime;
    default:
      return null;
  }
}

SubscriptionStatus parseSubscriptionStatus(String? raw) {
  switch (raw?.toLowerCase().trim()) {
    case 'active':
      return SubscriptionStatus.active;
    case 'expired':
      return SubscriptionStatus.expired;
    case 'cancelled':
      return SubscriptionStatus.cancelled;
    case 'pending':
    default:
      return SubscriptionStatus.pending;
  }
}

/// Exact translation of `isSubscriptionExpired` (Section 1.3).
/// Condition order 0..6 is strictly preserved.
bool isSubscriptionExpired(AppUser u, DateTime now) {
  // 0. الأدمن لا ينتهي أبداً
  if (u.isAdmin) return false;

  // 1. ملغي أو منتهي صراحة
  if (u.status == SubscriptionStatus.expired ||
      u.status == SubscriptionStatus.cancelled) {
    return true;
  }

  // 2. مدى الحياة ونشط
  if (u.type == SubscriptionType.lifetime &&
      u.status == SubscriptionStatus.active) {
    return false;
  }

  // 3. تاريخ الانتهاء الصريح (سنوي/شهري/تجريبي/معلّق) - يعمل أوفلاين
  final timed = u.type == SubscriptionType.yearly ||
      u.type == SubscriptionType.monthly ||
      u.isTrial ||
      u.status == SubscriptionStatus.pending;
  final exp = u.expiresAtDateTime;
  if (exp != null && timed && !now.isBefore(exp)) {
    return true;
  }

  // 4. نشط ولم ينتهِ تاريخه
  if (u.status == SubscriptionStatus.active) return false;

  // 5. التجريبي: 48 ساعة من التسجيل
  final created = u.createdAtDateTime;
  if ((u.status == SubscriptionStatus.pending || u.isTrial) &&
      created != null &&
      now.difference(created) >= trialDuration) {
    return true;
  }

  // 6. حماية من إرجاع ساعة الجهاز للخلف (أكثر من 15 دقيقة)
  final lastActive = u.lastActiveAtDateTime;
  if (lastActive != null &&
      now.isBefore(lastActive.subtract(clockRollbackTolerance))) {
    return true;
  }

  return false;
}

/// UI message for expired / inactive subscription (Section 1.5)
String subscriptionExpiryMessage(AppUser u) {
  if (u.type == SubscriptionType.yearly && !u.isTrial) {
    return 'انتهى اشتراكك السنوي — يرجى التجديد';
  }
  return 'يلزم تفعيل الاشتراك للمتابعة';
}

/// Ready-to-send WhatsApp activation message including Name, Email, UID, and plan (Section 1.5)
String buildWhatsAppActivationMessage(AppUser? u) {
  final name = (u?.displayName.isNotEmpty ?? false) ? u!.displayName : 'غير محدد';
  final email = (u?.email.isNotEmpty ?? false) ? u!.email : 'غير محدد';
  final uid = (u?.uid.isNotEmpty ?? false) ? u!.uid : 'غير محدد';
  return 'مرحباً، أرغب بتفعيل الاشتراك في تطبيق ${AppConstants.appName}:\n'
      '• نوع الطلب: اشتراك سنوي (5,000 دينار / 365 يوماً)\n'
      '• الاسم: $name\n'
      '• البريد الإلكتروني: $email\n'
      '• المعرف (UID): $uid';
}

/// Application user and subscription details matching the server schema
class AppUser {
  final String uid;
  final String email;
  final String displayName;
  final String? photoURL;
  final bool isTrial;
  final String createdAt;
  final String? expiresAt;
  final String lastActiveAt;
  final String subscriptionType; // 'yearly', 'monthly', 'lifetime', 'trial'
  final String subscriptionStatus; // 'active', 'pending', 'expired', 'cancelled'
  final String authProvider; // 'email', 'google', 'trial'
  final bool isAdmin;
  final String? token;
  final String? refreshToken;
  final int? tokenExpiresAt;

  const AppUser({
    required this.uid,
    required this.email,
    this.displayName = 'المعلم',
    this.photoURL,
    this.isTrial = false,
    required this.createdAt,
    this.expiresAt,
    required this.lastActiveAt,
    this.subscriptionType = 'yearly',
    this.subscriptionStatus = 'pending',
    this.authProvider = 'email',
    this.isAdmin = false,
    this.token,
    this.refreshToken,
    this.tokenExpiresAt,
  });

  SubscriptionType? get type => parseSubscriptionType(subscriptionType);
  SubscriptionStatus get status => parseSubscriptionStatus(subscriptionStatus);

  DateTime? get createdAtDateTime =>
      createdAt.isEmpty ? null : DateTime.tryParse(createdAt);
  DateTime? get expiresAtDateTime =>
      (expiresAt == null || expiresAt!.isEmpty) ? null : DateTime.tryParse(expiresAt!);
  DateTime? get lastActiveAtDateTime =>
      lastActiveAt.isEmpty ? null : DateTime.tryParse(lastActiveAt);

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      uid: json['uid'] as String? ??
          'user_${DateTime.now().millisecondsSinceEpoch}',
      email: json['email'] as String? ?? '',
      displayName: json['displayName'] as String? ?? 'المعلم',
      photoURL: json['photoURL'] as String?,
      isTrial: json['isTrial'] == true || json['subscriptionType'] == 'trial',
      createdAt:
          json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      expiresAt: json['expiresAt'] as String?,
      lastActiveAt:
          json['lastActiveAt'] as String? ?? DateTime.now().toIso8601String(),
      subscriptionType: json['subscriptionType'] as String? ?? 'yearly',
      subscriptionStatus: json['subscriptionStatus'] as String? ?? 'pending',
      authProvider: json['authProvider'] as String? ?? 'email',
      isAdmin: json['isAdmin'] == true || json['isAdmin'] == 1,
      token: json['token'] as String?,
      refreshToken: json['refreshToken'] as String?,
      tokenExpiresAt: json['tokenExpiresAt'] as int?,
    );
  }

  /// Checks offline subscription expiration using the exact 6-step rule set
  bool isExpiredAt(DateTime now) => isSubscriptionExpired(this, now);

  bool get isExpired => isSubscriptionExpired(this, DateTime.now());

  bool get isTokenExpired {
    if (token == null || token!.isEmpty) return true;
    if (tokenExpiresAt != null) {
      return DateTime.now().millisecondsSinceEpoch >= (tokenExpiresAt! - 60000);
    }
    return false;
  }

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'email': email,
        'displayName': displayName,
        'photoURL': photoURL,
        'isTrial': isTrial,
        'createdAt': createdAt,
        'expiresAt': expiresAt,
        'lastActiveAt': lastActiveAt,
        'subscriptionType': subscriptionType,
        'subscriptionStatus': subscriptionStatus,
        'authProvider': authProvider,
        'isAdmin': isAdmin,
        'token': token,
        'refreshToken': refreshToken,
        'tokenExpiresAt': tokenExpiresAt,
      };

  AppUser copyWith({
    String? uid,
    String? email,
    String? displayName,
    String? photoURL,
    bool? isTrial,
    String? createdAt,
    String? expiresAt,
    String? lastActiveAt,
    String? subscriptionType,
    String? subscriptionStatus,
    String? authProvider,
    bool? isAdmin,
    String? token,
    String? refreshToken,
    int? tokenExpiresAt,
  }) {
    return AppUser(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      photoURL: photoURL ?? this.photoURL,
      isTrial: isTrial ?? this.isTrial,
      createdAt: createdAt ?? this.createdAt,
      expiresAt: expiresAt ?? this.expiresAt,
      lastActiveAt: lastActiveAt ?? this.lastActiveAt,
      subscriptionType: subscriptionType ?? this.subscriptionType,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      authProvider: authProvider ?? this.authProvider,
      isAdmin: isAdmin ?? this.isAdmin,
      token: token ?? this.token,
      refreshToken: refreshToken ?? this.refreshToken,
      tokenExpiresAt: tokenExpiresAt ?? this.tokenExpiresAt,
    );
  }
}
