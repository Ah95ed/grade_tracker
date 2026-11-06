import 'package:flutter/material.dart';

/// نظام الألوان المستخرج بدقة من design_tokens.json الخاص بتطبيق درجات
class AppColors {
  AppColors._();

  // 1. الورق المشبك وخلفية الكراس
  static const Color pageBg = Color(0xFFF6F3E2);
  static const Color pageLine = Color(0xFFD8D4C8);
  static const Color gridLine = Color(0x73C3BBAA); // rgba(195, 187, 170, 0.45)

  // 2. ألوان الجلد الكرافتي (Craft Leather)
  static const Color craftBrown = Color(0xFFBA916C);
  static const Color craftBrownHover = Color(0xFFA67E56);
  static const Color craftBrownDark = Color(0xFF8C6544);
  static const Color craftBorder = Color(0xFFAA8362);
  static const Color craftCardBg = Color(0xFFFAF6EC);
  static const Color craftTableHeader = Color(0xFFE8D7C2);
  static const Color craftTableBorder = Color(0xFFC2A88F);
  static const Color craftBadgeBg = Color(0xFFE8D7C2);
  static const Color craftBadgeBorder = Color(0xFFC2A88F);

  // 3. الألوان الدلالية لأقسام وتطبيقات النظام (Module Themes)
  // الجدول الشهري (أزرق السماء الهادئ)
  static const Color monthlyAccent = Color(0xFF5692BE);
  static const Color monthlyDark = Color(0xFF4A82A8);
  static const Color monthlyButton = Color(0xFFBA916C);

  // حساب المعدل والفصول (تيراكوتا كرافتي)
  static const Color termAccent = Color(0xFFB86848);
  static const Color termDark = Color(0xFFA05537);
  static const Color termButton = Color(0xFFB56846);

  // الكروت والشهادات (ميرمية وزيتوني هادئ)
  static const Color cardsAccent = Color(0xFF4E7A68);
  static const Color cardsDark = Color(0xFF3B6554);
  static const Color cardsButton = Color(0xFF4E7A68);

  // لوحة الإدارة والاشتراكات (كحلي فولاذي)
  static const Color adminAccent = Color(0xFF3E5771);
  static const Color adminDark = Color(0xFF2F445B);
  static const Color adminButton = Color(0xFF3E5771);

  // 4. نصوص وألوان الحبر القديم (Typography & Ink)
  static const Color inkDark = Color(0xFF2F2822);
  static const Color inkMuted = Color(0xFF6B5E51);
  static const Color textMuted = Color(0xFF8C7E72);
  static const Color textWhite = Color(0xFFFFFFFF);

  // 5. التغذية الراجعة والحالات الدلالية (Semantic Feedback)
  static const Color success = Color(0xFF10B981);
  static const Color successDark = Color(0xFF047857);
  static const Color successLight = Color(0xFFD1FAE5);
  static const Color successBorder = Color(0xFFA7F3D0);

  static const Color warning = Color(0xFFF59E0B);
  static const Color warningDark = Color(0xFFB45309);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color warningBorder = Color(0xFFFDE68A);

  static const Color danger = Color(0xFFEF4444);
  static const Color dangerDark = Color(0xFFB91C1C);
  static const Color dangerLight = Color(0xFFFEE2E2);
  static const Color dangerBorder = Color(0xFFFECACA);

  static const Color info = Color(0xFF3B82F6);
  static const Color infoDark = Color(0xFF1D4ED8);
  static const Color infoLight = Color(0xFFDBEAFE);
  static const Color infoBorder = Color(0xFFBFDBFE);

  // 6. لوحة المفاتيح المدمجة لإدخال الدرجات (Keypad)
  static const Color keypadBg = Color(0xFFFFFFFF);
  static const Color keypadBorder = Color(0xFFD5C8B2);
  static const Color keypadHover = Color(0xFFF8F4EA);
  static const Color keypadActive = Color(0xFFEFE8D8);

  // 7. تدرجات Slate الحيادية
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate900 = Color(0xFF0F172A);
  static const Color slate950 = Color(0xFF020617);
}

/// أنصاف الأقطار ومقاييس المسافات المطابقة لـ Tailwind في درجات
class AppRadii {
  AppRadii._();

  static const double sm = 4.0;
  static const double md = 8.0;
  static const double lg = 10.0;
  static const double xl = 12.0;
  static const double xxl = 16.0;
  static const double xxxl = 24.0;
  static const double full = 9999.0;

  static const BorderRadius buttonRadius = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius cardRadius = BorderRadius.all(Radius.circular(xxl));
  static const BorderRadius modalRadius = BorderRadius.all(Radius.circular(xxxl));
  static const BorderRadius inputRadius = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius badgeRadius = BorderRadius.all(Radius.circular(full));
}

/// ثيم تطبيق درجات (Light & Dark) مدمج ومخصص بالكامل لـ RTL وخط Cairo
class AppTheme {
  AppTheme._();

  static const String fontFamily = 'Cairo';
  static const List<String> fontFamilyFallback = [
    'Noto Sans Arabic',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ];

  /// الاتجاه الافتراضي لكافة نصوص وشاشات التطبيق (RTL)
  static const TextDirection defaultDirection = TextDirection.rtl;

  // ---------------------------------------------------------------------------
  // ColorSchemes
  // ---------------------------------------------------------------------------

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.craftBrown,
    onPrimary: AppColors.textWhite,
    primaryContainer: AppColors.craftTableHeader,
    onPrimaryContainer: AppColors.inkDark,
    secondary: AppColors.monthlyAccent,
    onSecondary: AppColors.textWhite,
    secondaryContainer: AppColors.slate100,
    onSecondaryContainer: AppColors.monthlyDark,
    tertiary: AppColors.termAccent,
    onTertiary: AppColors.textWhite,
    error: AppColors.danger,
    onError: AppColors.textWhite,
    errorContainer: AppColors.dangerLight,
    onErrorContainer: AppColors.dangerDark,
    surface: AppColors.craftCardBg,
    onSurface: AppColors.inkDark,
    surfaceContainerHighest: AppColors.pageBg,
    outline: AppColors.craftBorder,
    outlineVariant: AppColors.craftTableBorder,
    shadow: Color(0x14000000),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: AppColors.craftBrown,
    onPrimary: AppColors.textWhite,
    primaryContainer: AppColors.craftBrownDark,
    onPrimaryContainer: AppColors.craftCardBg,
    secondary: AppColors.monthlyAccent,
    onSecondary: AppColors.textWhite,
    tertiary: AppColors.termAccent,
    onTertiary: AppColors.textWhite,
    error: AppColors.danger,
    onError: AppColors.textWhite,
    surface: Color(0xFF1E1A16),
    onSurface: Color(0xFFF6F3E2),
    surfaceContainerHighest: Color(0xFF141210),
    outline: AppColors.craftBrownDark,
    outlineVariant: Color(0xFF4A3D30),
    shadow: Colors.black,
  );

  // ---------------------------------------------------------------------------
  // TextTheme (Cairo)
  // ---------------------------------------------------------------------------

  static TextTheme _buildTextTheme(Color textColor, Color mutedColor) {
    return TextTheme(
      displayLarge: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 48,
        fontWeight: FontWeight.w900,
        color: textColor,
        height: 1.1,
      ),
      displayMedium: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 36,
        fontWeight: FontWeight.w800,
        color: textColor,
        height: 1.15,
      ),
      displaySmall: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 30,
        fontWeight: FontWeight.w700,
        color: textColor,
        height: 1.2,
      ),
      headlineLarge: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: textColor,
        height: 1.25,
      ),
      headlineMedium: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: textColor,
        height: 1.3,
      ),
      headlineSmall: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: textColor,
        height: 1.3,
      ),
      titleLarge: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: textColor,
        height: 1.35,
      ),
      titleMedium: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: textColor,
        height: 1.4,
      ),
      titleSmall: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: mutedColor,
        height: 1.4,
      ),
      bodyLarge: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: textColor,
        height: 1.5,
      ),
      bodyMedium: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: textColor,
        height: 1.5,
      ),
      bodySmall: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: mutedColor,
        height: 1.4,
      ),
      labelLarge: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: textColor,
      ),
      labelMedium: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: mutedColor,
      ),
      labelSmall: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fontFamilyFallback,
        fontSize: 10,
        fontWeight: FontWeight.w600,
        color: mutedColor,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // ThemeData Light
  // ---------------------------------------------------------------------------

  static ThemeData get lightTheme {
    final textTheme = _buildTextTheme(AppColors.inkDark, AppColors.inkMuted);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: lightColorScheme,
      scaffoldBackgroundColor: AppColors.pageBg,
      fontFamily: fontFamily,
      fontFamilyFallback: fontFamilyFallback,
      textTheme: textTheme,

      // AppBar Theme
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.pageBg,
        foregroundColor: AppColors.inkDark,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 18,
          fontWeight: FontWeight.w900,
          color: AppColors.inkDark,
        ),
      ),

      // Card Theme (craft-card)
      cardTheme: const CardThemeData(
        color: AppColors.craftCardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadii.xxl)),
          side: BorderSide(color: AppColors.craftBorder, width: 1.5),
        ),
        margin: EdgeInsets.zero,
      ),

      // ElevatedButton (craft-btn-primary)
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.craftBrown,
          foregroundColor: AppColors.textWhite,
          elevation: 1,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppRadii.xl)),
            side: BorderSide(color: Color(0xFF9E7752), width: 1),
          ),
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),

      // OutlinedButton
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.craftBrown,
          side: const BorderSide(color: AppColors.craftBorder, width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppRadii.xl)),
          ),
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // InputDecorationTheme
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: Color(0xFFFAF8F5),
        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 13,
          color: AppColors.textMuted,
        ),
        labelStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.inkMuted,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadii.xl)),
          borderSide: BorderSide(color: Color(0xFFD5CFC4), width: 1.2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadii.xl)),
          borderSide: BorderSide(color: Color(0xFFD5CFC4), width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadii.xl)),
          borderSide: BorderSide(color: AppColors.monthlyAccent, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadii.xl)),
          borderSide: BorderSide(color: AppColors.danger, width: 1.5),
        ),
      ),

      // DialogTheme
      dialogTheme: const DialogThemeData(
        backgroundColor: AppColors.craftCardBg,
        elevation: 6,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadii.xxxl)),
          side: BorderSide(color: AppColors.craftBorder, width: 1.5),
        ),
      ),

      // DividerTheme
      dividerTheme: const DividerThemeData(
        color: AppColors.pageLine,
        thickness: 1,
        space: 16,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // ThemeData Dark
  // ---------------------------------------------------------------------------

  static ThemeData get darkTheme {
    final textTheme = _buildTextTheme(const Color(0xFFF6F3E2), const Color(0xFFB8AFA4));

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: darkColorScheme,
      scaffoldBackgroundColor: const Color(0xFF141210),
      fontFamily: fontFamily,
      fontFamilyFallback: fontFamilyFallback,
      textTheme: textTheme,
      cardTheme: const CardThemeData(
        color: Color(0xFF1E1A16),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadii.xxl)),
          side: BorderSide(color: Color(0xFF5A4836), width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.craftBrown,
          foregroundColor: AppColors.textWhite,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppRadii.xl)),
          ),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: Color(0xFF26201B),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadii.xl)),
          borderSide: BorderSide(color: Color(0xFF5A4836)),
        ),
      ),
    );
  }
}
