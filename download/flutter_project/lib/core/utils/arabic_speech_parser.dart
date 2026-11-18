/// Spoken Arabic digits & numbers parser for rapid voice grade entry (Section 3)
class ArabicSpeechParser {
  static const Map<String, String> _arabicIndic = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
  };

  /// Normalizes spoken digits and separators (Section 3)
  static String normalizeSpokenDigits(String input) {
    if (input.isEmpty) return '';
    var out = input.replaceAllMapped(
      RegExp(r'[٠-٩۰-۹]'),
      (m) => _arabicIndic[m[0]] ?? m[0]!,
    );
    out = out.replaceAll('٫', '.');
    out = out.replaceAllMapped(
      RegExp(r'(\d)[,،](\d)'),
      (m) => '${m[1]}.${m[2]}',
    );
    return out;
  }

  /// Spoken Arabic word-to-number dictionary
  static const Map<String, double> _arabicWordNumbers = {
    'صفر': 0.0,
    'واحد': 1.0,
    'اثنان': 2.0,
    'اثنين': 2.0,
    'ثلاثة': 3.0,
    'تلاثة': 3.0,
    'اربعة': 4.0,
    'أربعة': 4.0,
    'خمسة': 5.0,
    'ستة': 6.0,
    'سبعة': 7.0,
    'ثمانية': 8.0,
    'تسعة': 9.0,
    'عشرة': 10.0,
    'احد عشر': 11.0,
    'دعش': 11.0,
    'اثنا عشر': 12.0,
    'اثناعش': 12.0,
    'ثلاثة عشر': 13.0,
    'تلطعش': 13.0,
    'اربعة عشر': 14.0,
    'اربعطعش': 14.0,
    'خمسة عشر': 15.0,
    'خمسطعش': 15.0,
    'ستة عشر': 16.0,
    'سطعش': 16.0,
    'سبعة عشر': 17.0,
    'سبعطعش': 17.0,
    'ثمانية عشر': 18.0,
    'ثمنطعش': 18.0,
    'تسعة عشر': 19.0,
    'تسعطعش': 19.0,
    'عشرون': 20.0,
    'عشرين': 20.0,
    'ثلاثون': 30.0,
    'ثلاثين': 30.0,
    'اربعون': 40.0,
    'اربعين': 40.0,
    'خمسون': 50.0,
    'خمسين': 50.0,
    'ستون': 60.0,
    'ستين': 60.0,
    'سبعون': 70.0,
    'سبعين': 70.0,
    'ثمانون': 80.0,
    'ثمانين': 80.0,
    'تسعون': 90.0,
    'تسعين': 90.0,
    'مئة': 100.0,
    'مائة': 100.0,
    'مية': 100.0,
  };

  /// Attempts to extract a numeric grade score from speech transcript
  static double? parseGradeFromSpeech(String speech, {double maxScore = 100.0}) {
    if (speech.trim().isEmpty) return null;
    final normalized = normalizeSpokenDigits(speech.trim().toLowerCase());

    // 1. Direct number regex extraction (e.g. "85" or "14.5")
    final match = RegExp(r'\b\d+(?:\.\d+)?\b').firstMatch(normalized);
    if (match != null) {
      final parsed = double.tryParse(match.group(0)!);
      if (parsed != null && parsed >= 0 && parsed <= maxScore) {
        return parsed;
      }
    }

    // 2. Composite phrases like "خمسة وثمانين" or "ثمانين ونصف"
    final cleanWords = normalized
        .replaceAll(' و ', ' ')
        .replaceAll(' و', ' ')
        .replaceAll('،', ' ')
        .split(RegExp(r'\s+'));

    double total = 0.0;
    bool foundAny = false;
    bool hasHalf = false;

    for (final w in cleanWords) {
      if (w == 'نصف' || w == 'ونصف' || w == 'نص') {
        hasHalf = true;
        continue;
      }
      final stripped = w.startsWith('و') && w.length > 2 ? w.substring(1) : w;
      if (_arabicWordNumbers.containsKey(stripped)) {
        total += _arabicWordNumbers[stripped]!;
        foundAny = true;
      }
    }

    if (foundAny) {
      if (hasHalf) total += 0.5;
      if (total >= 0 && total <= maxScore) {
        return total;
      }
    }

    return null;
  }
}
