import 'package:flutter/material.dart';

/// App-wide Color Palette matching the Daragat (درجات) Web Design Identity exactly
class AppColors {
  // 1. الورق المشبك وخلفية الكراس (Graph Paper & Page Background)
  static const Color pageBg = Color(0xFFF6F3E2);
  static const Color pageLine = Color(0xFFD8D4C8);
  static const Color gridLine = Color(0x73C3BBAA); // rgba(195, 187, 170, 0.45)

  // 2. ألوان الجلد الكرافتي (Craft Brown & Leather Accents)
  static const Color craftBrown = Color(0xFFBA916C);
  static const Color craftBrownHover = Color(0xFFA67E56);
  static const Color craftBrownDark = Color(0xFF8C6544);
  static const Color craftBorder = Color(0xFFAA8362);
  static const Color craftBadgeBg = Color(0xFFE8D7C2);
  static const Color craftBadgeBorder = Color(0xFFC2A88F);

  // 3. الألوان المميزة لكل صفحة (Module Color Signatures)
  // صفحة الجدول: أزرق السماء الهادئ (Monthly Sheet: Sky Blue)
  static const Color monthlyBlue = Color(0xFF5692BE);
  static const Color monthlyBlueDark = Color(0xFF3D7299);
  static const Color monthlyBlueLight = Color(0xFFEEF4F8);
  static const Color monthlyBlueBtn = Color(0xFFBA916C);

  // صفحة المعدل: تراكوتا وبرونز كرافتي (Term Average: Terracotta Rust)
  static const Color termRust = Color(0xFFB86848);
  static const Color termRustDark = Color(0xFF9C5133);
  static const Color termRustLight = Color(0xFFEFE3DC);
  static const Color termRustBtn = Color(0xFFB56846);

  // صفحة الكروت: ميرمية وزيتوني هادئ (Cards: Sage Green)
  static const Color cardsGreen = Color(0xFF4E7A68);
  static const Color cardsGreenDark = Color(0xFF385F4F);
  static const Color cardsGreenLight = Color(0xFFFAF7EC);
  static const Color cardsGreenBtn = Color(0xFF4E7A68);

  // لوحة الإدارة: كحلي فولاذي (Admin: Steel Navy)
  static const Color adminNavy = Color(0xFF3E5771);
  static const Color adminNavyDark = Color(0xFF2F445B);

  // 4. نصوص ونغمات الورق والمداد (Ink & Typography)
  static const Color inkDark = Color(0xFF2F2822);
  static const Color inkMuted = Color(0xFF6B5E51);
  static const Color textPrimary = Color(0xFF2E2B27);
  static const Color textSecondary = Color(0xFF7A746B);
  static const Color textMuted = Color(0xFF9A9388);
  static const Color textLabel = Color(0xFF4A463F);

  // 5. الأسطح والبطاقات الورقية (Surfaces & Cards)
  static const Color craftCardBg = Color(0xFFFAF6EC);
  static const Color craftCardHeader = Color(0xFFF8F4EA);
  static const Color whiteSurface = Colors.white;
  static const Color inputBg = Color(0xFFFAF8F5);
  static const Color inputBorder = Color(0xFFD5CFC4);
  static const Color warmCanvas = Color(0xFFF4EFEA);

  // 6. الفواصل والحدود (Borders & Dividers)
  static const Color borderWarm = Color(0xFFD8CEBD);
  static const Color borderLight = Color(0xFFE8E4DA);
  static const Color borderDark = Color(0xFFC7B5A0);
  static const Color borderSubtle = Color(0xFFE2E8F0);

  // 7. شارات التقديرات الأكاديمية (Academic Rating Badges)
  static const Color gradeExcellent = Color(0xFF059669);
  static const Color gradeVeryGood = Color(0xFF2563EB);
  static const Color gradeGood = Color(0xFF0D9488);
  static const Color gradeMedium = Color(0xFFD97706);
  static const Color gradePass = Color(0xFFEA580C);
  static const Color gradeFail = Color(0xFFE11D48);

  // 8. تنبيهات وظيفية (Functional Alerts)
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Compatibility aliases
  static const Color slateDark = Color(0xFF2E485C);
  static const Color slateNavy = Color(0xFF3E5771);
  static const Color slateLight = Color(0xFF557A95);
  static const Color academicGold = Color(0xFF9C7756);
  static const Color creamBackground = Color(0xFFFAF6EC);
}
