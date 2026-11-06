/// Presets for Iraqi school and university education systems matching React translations.ts
class AcademicPresets {
  static const List<String> standardSchoolGrades = [
    'الأول الابتدائي',
    'الثاني الابتدائي',
    'الثالث الابتدائي',
    'الرابع الابتدائي',
    'الخامس الابتدائي',
    'السادس الابتدائي',
    'الأول متوسط',
    'الثاني متوسط',
    'الثالث متوسط',
    'الرابع الإعدادي',
    'الرابع العلمي',
    'الرابع الأدبي',
    'الخامس العلمي',
    'الخامس الأدبي',
    'الخامس التطبيقي',
    'الخامس الأحيائي',
    'السادس العلمي',
    'السادس الأدبي',
    'السادس التطبيقي',
    'السادس الأحيائي',
  ];

  static const List<String> standardUniversityStages = [
    'المرحلة الأولى',
    'المرحلة الثانية',
    'المرحلة الثالثة',
    'المرحلة الرابعة',
    'المرحلة الخامسة',
    'المرحلة السادسة',
    'الدراسات العليا (ماجستير)',
    'الدراسات العليا (دكتوراه)',
  ];

  static const List<String> standardSchoolSubjects = [
    'اللغة العربية',
    'الرياضيات',
    'اللغة الإنجليزية',
    'العلوم',
    'التربية الإسلامية',
    'الاجتماعيات',
    'الكيمياء',
    'الفيزياء',
    'الأحياء',
    'الحاسوب',
    'التربية الفنية',
    'التربية الرياضية',
  ];

  static const List<String> standardUniversitySubjects = [
    'نظري',
    'عملي',
    'الرياضيات الهندسية / العامة',
    'برمجة الحاسوب وتكنولوجيا المعلومات',
    'الإحصاء والاحتمالات',
    'اللغة الإنجليزية التخصصية',
    'حقوق الإنسان والديمقراطية',
    'اللغة العربية العامة',
    'مقرر تخصصي (1)',
    'مقرر تخصصي (2)',
    'مقرر تخصصي (3)',
    'مشروع التخرج / البحث',
  ];

  static const List<String> standardSchoolSections = [
    'أ', 'ب', 'ج', 'د', 'هـ', 'و', 'A', 'B', 'C', 'D'
  ];

  static const List<String> standardUniversitySections = [
    'شعبة A', 'شعبة B', 'شعبة C', 'شعبة D',
    'مجموعة 1', 'مجموعة 2', 'مجموعة 3',
    'شعبة أ', 'شعبة ب', 'شعبة ج', 'شعبة د',
    'الصباحي', 'المسائي'
  ];

  static List<String> getGrades(bool isUniversity) =>
      isUniversity ? standardUniversityStages : standardSchoolGrades;

  static List<String> getSubjects(bool isUniversity) =>
      isUniversity ? standardUniversitySubjects : standardSchoolSubjects;

  static List<String> getSections(bool isUniversity) =>
      isUniversity ? standardUniversitySections : standardSchoolSections;
}

