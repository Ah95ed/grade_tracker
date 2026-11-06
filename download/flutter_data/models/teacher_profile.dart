/// Teacher and School/University Profile Information matching React TeacherSettingsModal
class TeacherProfile {
  final String institutionType; // 'school' | 'university'
  final String teacherName;
  final String schoolName;
  final String universityName;
  final String collegeName;
  final String departmentName;
  final String subject;
  final String gradeLevel;
  final String academicYear;
  final String governorate;
  final String schoolLogo; // Base64 data URL or local image path

  const TeacherProfile({
    this.institutionType = 'school',
    this.teacherName = '',
    this.schoolName = '',
    this.universityName = '',
    this.collegeName = '',
    this.departmentName = '',
    this.subject = '',
    this.gradeLevel = '',
    this.academicYear = '2024 - 2025',
    this.governorate = '',
    this.schoolLogo = '',
  });

  bool get isUniversity => institutionType == 'university';

  String get effectiveInstitutionName {
    if (isUniversity) {
      final parts = [universityName, collegeName, departmentName].where((s) => s.trim().isNotEmpty).toList();
      return parts.isNotEmpty ? parts.join(' - ') : (schoolName.isNotEmpty ? schoolName : 'الجامعة');
    }
    return schoolName.isNotEmpty ? schoolName : 'المدرسة';
  }

  factory TeacherProfile.fromJson(Map<String, dynamic> json) {
    return TeacherProfile(
      institutionType: json['institutionType'] as String? ?? json['institution_type'] as String? ?? 'school',
      teacherName: json['teacherName'] as String? ?? json['teacher_name'] as String? ?? '',
      schoolName: json['schoolName'] as String? ?? json['school_name'] as String? ?? '',
      universityName: json['universityName'] as String? ?? json['university_name'] as String? ?? '',
      collegeName: json['collegeName'] as String? ?? json['college_name'] as String? ?? '',
      departmentName: json['departmentName'] as String? ?? json['department_name'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      gradeLevel: json['gradeLevel'] as String? ?? json['grade_level'] as String? ?? '',
      academicYear: json['academicYear'] as String? ?? json['academic_year'] as String? ?? '2024 - 2025',
      governorate: json['governorate'] as String? ?? '',
      schoolLogo: json['schoolLogo'] as String? ?? json['school_logo'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'institutionType': institutionType,
    'teacherName': teacherName,
    'schoolName': schoolName,
    'universityName': universityName,
    'collegeName': collegeName,
    'departmentName': departmentName,
    'subject': subject,
    'gradeLevel': gradeLevel,
    'academicYear': academicYear,
    'governorate': governorate,
    'schoolLogo': schoolLogo,
  };

  TeacherProfile copyWith({
    String? institutionType,
    String? teacherName,
    String? schoolName,
    String? universityName,
    String? collegeName,
    String? departmentName,
    String? subject,
    String? gradeLevel,
    String? academicYear,
    String? governorate,
    String? schoolLogo,
  }) {
    return TeacherProfile(
      institutionType: institutionType ?? this.institutionType,
      teacherName: teacherName ?? this.teacherName,
      schoolName: schoolName ?? this.schoolName,
      universityName: universityName ?? this.universityName,
      collegeName: collegeName ?? this.collegeName,
      departmentName: departmentName ?? this.departmentName,
      subject: subject ?? this.subject,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      academicYear: academicYear ?? this.academicYear,
      governorate: governorate ?? this.governorate,
      schoolLogo: schoolLogo ?? this.schoolLogo,
    );
  }
}
