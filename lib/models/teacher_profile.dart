/// Teacher and School Profile Information
class TeacherProfile {
  final String teacherName;
  final String schoolName;
  final String subject;
  final String gradeLevel;
  final String academicYear;
  final String governorate;

  const TeacherProfile({
    this.teacherName = '',
    this.schoolName = '',
    this.subject = '',
    this.gradeLevel = '',
    this.academicYear = '',
    this.governorate = '',
  });

  factory TeacherProfile.fromJson(Map<String, dynamic> json) {
    return TeacherProfile(
      teacherName: json['teacherName'] as String? ?? '',
      schoolName: json['schoolName'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      gradeLevel: json['gradeLevel'] as String? ?? '',
      academicYear: json['academicYear'] as String? ?? '',
      governorate: json['governorate'] as String? ?? '',
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
