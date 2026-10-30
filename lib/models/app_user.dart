/// Application user and subscription details
class AppUser {
  final String uid;
  final String email;
  final String displayName;
  final String subscriptionType; // 'trial', 'monthly', 'yearly', 'lifetime'
  final String subscriptionStatus; // 'active', 'expired', 'cancelled'
  final bool isAdmin;

  const AppUser({
    required this.uid,
    required this.email,
    this.displayName = 'المعلم',
    this.subscriptionType = 'lifetime',
    this.subscriptionStatus = 'active',
    this.isAdmin = false,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      uid: json['uid'] as String? ?? 'local-user',
      email: json['email'] as String? ?? 'teacher@school.edu',
      displayName: json['displayName'] as String? ?? 'المعلم',
      subscriptionType: json['subscriptionType'] as String? ?? 'lifetime',
      subscriptionStatus: json['subscriptionStatus'] as String? ?? 'active',
      isAdmin: json['isAdmin'] == true || json['isAdmin'] == 1,
    );
  }

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'email': email,
        'displayName': displayName,
        'subscriptionType': subscriptionType,
        'subscriptionStatus': subscriptionStatus,
        'isAdmin': isAdmin,
      };
}

