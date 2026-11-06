import 'package:flutter/foundation.dart';

@immutable
class AppUser {
  final String uid;
  final String email;
  final String displayName;
  final String subscriptionType; // trial, monthly, yearly, lifetime
  final String subscriptionStatus; // active, expired, pending, cancelled
  final String? expiresAt;
  final bool isAdmin;
  final String? idToken;
  final String? refreshToken;
  final DateTime? tokenExpiresAt;

  const AppUser({
    required this.uid,
    required this.email,
    this.displayName = '',
    this.subscriptionType = 'trial',
    this.subscriptionStatus = 'active',
    this.expiresAt,
    this.isAdmin = false,
    this.idToken,
    this.refreshToken,
    this.tokenExpiresAt,
  });

  bool get isTokenExpired {
    if (tokenExpiresAt == null) return false;
    return DateTime.now().isAfter(tokenExpiresAt!);
  }

  AppUser copyWith({
    String? uid,
    String? email,
    String? displayName,
    String? subscriptionType,
    String? subscriptionStatus,
    String? expiresAt,
    bool? isAdmin,
    String? idToken,
    String? refreshToken,
    DateTime? tokenExpiresAt,
  }) {
    return AppUser(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      subscriptionType: subscriptionType ?? this.subscriptionType,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      expiresAt: expiresAt ?? this.expiresAt,
      isAdmin: isAdmin ?? this.isAdmin,
      idToken: idToken ?? this.idToken,
      refreshToken: refreshToken ?? this.refreshToken,
      tokenExpiresAt: tokenExpiresAt ?? this.tokenExpiresAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'uid': uid,
    'email': email,
    'displayName': displayName,
    'subscriptionType': subscriptionType,
    'subscriptionStatus': subscriptionStatus,
    'expiresAt': expiresAt,
    'isAdmin': isAdmin,
    'idToken': idToken,
    'refreshToken': refreshToken,
    'tokenExpiresAt': tokenExpiresAt?.toIso8601String(),
  };

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    uid: json['uid'] as String? ?? '',
    email: json['email'] as String? ?? '',
    displayName: json['displayName'] as String? ?? json['display_name'] as String? ?? '',
    subscriptionType: json['subscriptionType'] as String? ?? json['subscription_type'] as String? ?? 'trial',
    subscriptionStatus: json['subscriptionStatus'] as String? ?? json['subscription_status'] as String? ?? 'active',
    expiresAt: json['expiresAt'] as String? ?? json['expires_at'] as String?,
    isAdmin: json['isAdmin'] as bool? ?? (json['is_admin'] == 1 || json['is_admin'] == true),
    idToken: json['idToken'] as String?,
    refreshToken: json['refreshToken'] as String?,
    tokenExpiresAt: json['tokenExpiresAt'] != null ? DateTime.tryParse(json['tokenExpiresAt'] as String) : null,
  );
}
