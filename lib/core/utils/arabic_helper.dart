/// Helper utilities for Arabic text comparison, normalization, and numeral formatting
class ArabicHelper {
  static const List<String> arabicDigits = [
    '٠',
    '١',
    '٢',
    '٣',
    '٤',
    '٥',
    '٦',
    '٧',
    '٨',
    '٩',
  ];

  static const List<String> englishDigits = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
  ];

  /// Normalizes Arabic text for accurate searching and alphabetical sorting
  static String normalizeArabic(String input) {
    if (input.isEmpty) return '';

    var s = input.trim();

    // 1. Remove Tashkeel (diacritics: Fatha, Damma, Kasra, Sukun, Shadda, Tanween)
    s = s.replaceAll(RegExp(r'[\u064B-\u065F\u0670]'), '');

    // 2. Normalize Alef variants (أ, إ, آ, ٱ -> ا)
    s = s.replaceAll(RegExp(r'[أإآٱ]'), 'ا');

    // 3. Normalize Ta Marbuta (ة -> ه)
    s = s.replaceAll('ة', 'ه');

    // 4. Normalize Alef Maqsura (ى -> ي)
    s = s.replaceAll('ى', 'ي');

    // 5. Replace multiple whitespaces with single space
    s = s.replaceAll(RegExp(r'\s+'), ' ');

    return s.toLowerCase();
  }

  /// Compares two Arabic strings for collation / alphabetical order
  static int compareArabic(String a, String b) {
    final normA = normalizeArabic(a);
    final normB = normalizeArabic(b);
    return normA.compareTo(normB);
  }

  /// Formats score according to numeral mode ('EN' for 123 or 'AR' for ١٢٣)
  static String formatScore(dynamic val, [String numeralMode = 'EN']) {
    if (val == null) return '';
    var text = val.toString();
    if (val is double) {
      if (val == val.roundToDouble()) {
        text = val.toInt().toString();
      }
    }

    if (numeralMode == 'AR') {
      for (int i = 0; i < 10; i++) {
        text = text.replaceAll(englishDigits[i], arabicDigits[i]);
      }
      text = text.replaceAll('.', '،');
      return text;
    } else {
      for (int i = 0; i < 10; i++) {
        text = text.replaceAll(arabicDigits[i], englishDigits[i]);
      }
      text = text.replaceAll('،', '.');
      return text;
    }
  }

  /// Parses score string that might contain Arabic or English digits or commas
  static double? parseScore(String? text) {
    if (text == null || text.trim().isEmpty) return null;
    var clean = text.trim();

    // Convert Arabic digits to English
    for (int i = 0; i < 10; i++) {
      clean = clean.replaceAll(arabicDigits[i], englishDigits[i]);
    }
    // Replace Arabic comma with dot
    clean = clean.replaceAll('،', '.').replaceAll(',', '.');

    return double.tryParse(clean);
  }
}

