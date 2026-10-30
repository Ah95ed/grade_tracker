/// Teacher and School Profile Information
class TeacherProfile {
  final String teacherName;
  final String schoolName;
  final String subject;
  final String gradeLevel;
  final String academicYear;
  final String governorate;

  const TeacherProfile({
    this.teacherName = 'الأستاذ: علي حسن',
    this.schoolName = 'ثانوية المتميزين للبنين',
    this.subject = 'الرياضيات',
    this.gradeLevel = 'الثالث متوسط',
    this.academicYear = '2024 - 2025',
    this.governorate = 'بغداد',
  });

  factory TeacherProfile.fromJson(Map<String, dynamic> json) {
    return TeacherProfile(
      teacherName: json['teacherName'] as String? ?? 'الأستاذ: علي حسن',
      schoolName: json['schoolName'] as String? ?? 'ثانوية المتميزين للبنين',
      subject: json['subject'] as String? ?? 'الرياضيات',
      gradeLevel: json['gradeLevel'] as String? ?? 'الثالث متوسط',
      academicYear: json['academicYear'] as String? ?? '2024 - 2025',
      governorate: json['governorate'] as String? ?? 'بغداد',
    );
  }

  Map<String, dynamic> toJson() => {
        'teacherName': teacherName,
        'schoolName': schoolName,
        'subject': subject,
        'gradeLevel': gradeLevel,
        'academicYear': academicYear,
        'governorate': governorate,
      };

  TeacherProfile copyWith({
    String? teacherName,
    String? schoolName,
    String? subject,
    String? gradeLevel,
    String? academicYear,
    String? governorate,
  }) {
    return TeacherProfile(
      teacherName: teacherName ?? this.teacherName,
      schoolName: schoolName ?? this.schoolName,
      subject: subject ?? this.subject,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      academicYear: academicYear ?? this.academicYear,
      governorate: governorate ?? this.governorate,
    );
  }
}

