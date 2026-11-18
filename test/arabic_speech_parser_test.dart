import 'package:flutter_test/flutter_test.dart';
import 'package:grade_tracker/core/utils/arabic_speech_parser.dart';

void main() {
  group('ArabicSpeechParser Tests (Section 3)', () {
    test('normalizeSpokenDigits converts Eastern Arabic and Persian digits to standard digits', () {
      expect(ArabicSpeechParser.normalizeSpokenDigits('٩٥'), '95');
      expect(ArabicSpeechParser.normalizeSpokenDigits('۱۴.۵'), '14.5');
      expect(ArabicSpeechParser.normalizeSpokenDigits('١٠٠'), '100');
    });

    test('normalizeSpokenDigits converts Arabic decimal separators to dot', () {
      expect(ArabicSpeechParser.normalizeSpokenDigits('14٫5'), '14.5');
      expect(ArabicSpeechParser.normalizeSpokenDigits('8,5'), '8.5');
      expect(ArabicSpeechParser.normalizeSpokenDigits('19،5'), '19.5');
    });

    test('parseGradeFromSpeech extracts numeric grades correctly', () {
      expect(ArabicSpeechParser.parseGradeFromSpeech('درجة 85'), 85.0);
      expect(ArabicSpeechParser.parseGradeFromSpeech('14.5'), 14.5);
      expect(ArabicSpeechParser.parseGradeFromSpeech('تسعين'), 90.0);
      expect(ArabicSpeechParser.parseGradeFromSpeech('خمسة وثمانين'), 85.0);
      expect(ArabicSpeechParser.parseGradeFromSpeech('عشرة ونصف'), 10.5);
      expect(ArabicSpeechParser.parseGradeFromSpeech('مئة'), 100.0);
    });

    test('parseGradeFromSpeech respects maxScore constraints', () {
      expect(ArabicSpeechParser.parseGradeFromSpeech('105', maxScore: 100), isNull);
      expect(ArabicSpeechParser.parseGradeFromSpeech('25', maxScore: 20), isNull);
      expect(ArabicSpeechParser.parseGradeFromSpeech('20', maxScore: 20), 20.0);
    });
  });
}
