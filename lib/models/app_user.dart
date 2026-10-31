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
  final String subscriptionType; // 'trial', 'monthly', 'yearly', 'lifetime'
  final String subscriptionStatus; // 'active', 'expired', 'cancelled'
  final String authProvider; // 'email', 'google', 'trial'
  final bool isAdmin;
  final String? token;

  const AppUser({
    required this.uid,
    required this.email,
    this.displayName = 'المعلم',
    this.photoURL,
    this.isTrial = false,
    required this.createdAt,
    this.expiresAt,
    required this.lastActiveAt,
    this.subscriptionType = 'lifetime',
    this.subscriptionStatus = 'active',
    this.authProvider = 'email',
    this.isAdmin = false,
    this.token,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      uid: json['uid'] as String? ?? 'user_${DateTime.now().millisecondsSinceEpoch}',
      email: json['email'] as String? ?? '',
      displayName: json['displayName'] as String? ?? 'المعلم',
      photoURL: json['photoURL'] as String?,
      isTrial: json['isTrial'] == true || json['subscriptionType'] == 'trial',
      createdAt: json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      expiresAt: json['expiresAt'] as String?,
      lastActiveAt: json['lastActiveAt'] as String? ?? DateTime.now().toIso8601String(),
      subscriptionType: json['subscriptionType'] as String? ?? 'monthly',
      subscriptionStatus: json['subscriptionStatus'] as String? ?? 'active',
      authProvider: json['authProvider'] as String? ?? 'email',
      isAdmin: json['isAdmin'] == true || json['isAdmin'] == 1,
      token: json['token'] as String?,
    );
  }

  bool get isExpired {
    if (subscriptionStatus == 'expired') return true;
    if (expiresAt != null) {
      final exp = DateTime.tryParse(expiresAt!);
      if (exp != null && exp.isBefore(DateTime.now())) return true;
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
    );
  }
}
