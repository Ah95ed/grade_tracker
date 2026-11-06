import 'package:flutter/foundation.dart';

@immutable
class TeacherProfile {
  final String teacherName;
  final String schoolName;
  final String subject;
  final String academicYear;
  final String governorate;

  const TeacherProfile({
    this.teacherName = '',
    this.schoolName = '',
    this.subject = '',
    this.academicYear = '2024 - 2025',
    this.governorate = '',
  });

  TeacherProfile copyWith({
    String? teacherName,
    String? schoolName,
    String? subject,
    String? academicYear,
    String? governorate,
  }) {
    return TeacherProfile(
      teacherName: teacherName ?? this.teacherName,
      schoolName: schoolName ?? this.schoolName,
      subject: subject ?? this.subject,
      academicYear: academicYear ?? this.academicYear,
      governorate: governorate ?? this.governorate,
    );
  }

  Map<String, dynamic> toJson() => {
    'teacherName': teacherName,
    'schoolName': schoolName,
    'subject': subject,
    'academicYear': academicYear,
    'governorate': governorate,
  };

  factory TeacherProfile.fromJson(Map<String, dynamic> json) => TeacherProfile(
    teacherName: json['teacherName'] as String? ?? json['teacher_name'] as String? ?? '',
    schoolName: json['schoolName'] as String? ?? json['school_name'] as String? ?? '',
    subject: json['subject'] as String? ?? '',
    academicYear: json['academicYear'] as String? ?? json['academic_year'] as String? ?? '2024 - 2025',
    governorate: json['governorate'] as String? ?? '',
  );
}
