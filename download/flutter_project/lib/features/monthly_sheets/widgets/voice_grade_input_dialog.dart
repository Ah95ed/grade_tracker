import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../../../core/utils/arabic_speech_parser.dart';
import '../../../models/student_row.dart';

/// Modal dialog for interactive Arabic voice input of student grades (Section 3)
class VoiceGradeInputDialog extends StatefulWidget {
  final StudentRow student;
  final String columnName;
  final double maxScore;
  final ValueChanged<double> onGradeConfirmed;
  final VoidCallback onNextStudent;
  final VoidCallback onPrevStudent;

  const VoiceGradeInputDialog({
    super.key,
    required this.student,
    required this.columnName,
    required this.maxScore,
    required this.onGradeConfirmed,
    required this.onNextStudent,
    required this.onPrevStudent,
  });

  @override
  State<VoiceGradeInputDialog> createState() => _VoiceGradeInputDialogState();
}

class _VoiceGradeInputDialogState extends State<VoiceGradeInputDialog> {
  late stt.SpeechToText _speech;
  bool _isListening = false;
  bool _isAvailable = false;
  String _wordsSpoken = '';
  double? _detectedGrade;
  String? _statusText;

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    try {
      final available = await _speech.initialize(
        onStatus: (val) {
          if (mounted) {
            setState(() {
              if (val == 'done' || val == 'notListening') {
                _isListening = false;
              }
            });
          }
        },
        onError: (val) {
          if (mounted) {
            setState(() {
              _isListening = false;
              _statusText = 'تعذر التعرف: ${val.errorMsg}';
            });
          }
        },
      );
      if (mounted) {
        setState(() {
          _isAvailable = available;
          if (available) {
            _startListening();
          } else {
            _statusText = 'الميكروفون غير متاح أو لم تُمنح الصلاحية.';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isAvailable = false;
          _statusText = 'خطأ في تهيئة التعرف الصوتي: $e';
        });
      }
    }
  }

  void _startListening() async {
    if (!_isAvailable) return;
    setState(() {
      _isListening = true;
      _wordsSpoken = '';
      _detectedGrade = null;
      _statusText = 'استمع الآن... انطق الدرجة (مثال: "تسعين" أو "14.5")';
    });

    try {
      await _speech.listen(
        onResult: (val) {
          if (!mounted) return;
          final words = val.recognizedWords;
          final parsed = ArabicSpeechParser.parseGradeFromSpeech(
            words,
            maxScore: widget.maxScore,
          );
          setState(() {
            _wordsSpoken = words;
            _detectedGrade = parsed;
            if (parsed != null) {
              _statusText = 'تم رصد الدرجة: $parsed من ${widget.maxScore.toInt()}';
            }
          });
        },
        localeId: 'ar_IQ',
        listenOptions: stt.SpeechListenOptions(
          listenMode: stt.ListenMode.confirmation,
          cancelOnError: false,
          partialResults: true,
        ),
      );
    } catch (_) {
      try {
        await _speech.listen(localeId: 'ar_SA');
      } catch (_) {}
    }
  }

  void _stopListening() async {
    await _speech.stop();
    if (mounted) {
      setState(() => _isListening = false);
    }
  }

  void _confirmAndNext() {
    if (_detectedGrade != null) {
      widget.onGradeConfirmed(_detectedGrade!);
    }
    widget.onNextStudent();
  }

  @override
  void dispose() {
    _speech.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22.r)),
        child: Container(
          width: 420.w,
          padding: EdgeInsets.all(20.r),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: EdgeInsets.all(8.r),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10.r),
                        ),
                        child: Icon(Icons.mic_rounded, color: const Color(0xFF2563EB), size: 24.r),
                      ),
                      SizedBox(width: 10.w),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'الإدخال الصوتي للدرجات',
                            style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                          ),
                          Text(
                            'العمود: ${widget.columnName} (الدرجة القصوى: ${widget.maxScore.toInt()})',
                            style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              Divider(height: 20.h),

              // Active Student Card
              Container(
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF7EC),
                  borderRadius: BorderRadius.circular(12.r),
                  border: Border.all(color: const Color(0xFFD8CEBD)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.person_outline_rounded, color: const Color(0xFFB86848), size: 22.r),
                    SizedBox(width: 8.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.student.name,
                            style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w900, color: const Color(0xFF2F2822)),
                          ),
                          Text(
                            'الشعبة: ${widget.student.section}',
                            style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF78695A)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 16.h),

              // Listening Pulse / Mic Icon
              GestureDetector(
                onTap: () {
                  if (_isListening) {
                    _stopListening();
                  } else {
                    _startListening();
                  }
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: 80.r,
                  height: 80.r,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _isListening ? const Color(0xFFDC2626) : const Color(0xFF2563EB),
                    boxShadow: [
                      BoxShadow(
                        color: (_isListening ? const Color(0xFFDC2626) : const Color(0xFF2563EB))
                            .withValues(alpha: _isListening ? 0.4 : 0.2),
                        blurRadius: _isListening ? 20 : 8,
                        spreadRadius: _isListening ? 6 : 2,
                      ),
                    ],
                  ),
                  child: Icon(
                    _isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
                    color: Colors.white,
                    size: 40.r,
                  ),
                ),
              ),
              SizedBox(height: 12.h),

              // Status message
              Text(
                _statusText ?? 'انقر على الميكروفون لبدء التحدث',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11.5.sp,
                  fontWeight: FontWeight.bold,
                  color: _detectedGrade != null ? const Color(0xFF15803D) : const Color(0xFF64748B),
                ),
              ),

              if (_wordsSpoken.isNotEmpty) ...[
                SizedBox(height: 8.h),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8.r),
                  ),
                  child: Text(
                    'الكلام المسموع: "$_wordsSpoken"',
                    style: TextStyle(fontSize: 11.sp, color: const Color(0xFF475569)),
                  ),
                ),
              ],

              if (_detectedGrade != null) ...[
                SizedBox(height: 14.h),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(12.r),
                    border: Border.all(color: const Color(0xFF86EFAC)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A)),
                      SizedBox(width: 8.w),
                      Text(
                        'الدرجة المكتشفة: ${_detectedGrade.toString()}',
                        style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w900, color: const Color(0xFF15803D)),
                      ),
                    ],
                  ),
                ),
              ],
              SizedBox(height: 20.h),

              // Navigation & Confirmation Buttons
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: widget.onPrevStudent,
                    icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                    label: const Text('السابق'),
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                    ),
                  ),
                  SizedBox(width: 8.w),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _detectedGrade != null ? _confirmAndNext : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(vertical: 10.h),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                      ),
                      icon: const Icon(Icons.check_rounded, size: 18),
                      label: Text(
                        'تأكيد وحفظ',
                        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  SizedBox(width: 8.w),
                  OutlinedButton.icon(
                    onPressed: widget.onNextStudent,
                    icon: const Icon(Icons.arrow_back_rounded, size: 16),
                    label: const Text('التالي'),
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
