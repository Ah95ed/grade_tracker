import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../models/student_row.dart';
import '../../../core/utils/arabic_helper.dart';

/// Interactive custom bottom numeric keypad matching GradeNumericKeypad.tsx
/// Gives teachers rapid, one-tap grade entry without the virtual keyboard blocking student rows
class GradeNumericKeypad extends StatefulWidget {
  final StudentRow currentStudent;
  final StudentRow? nextStudent;
  final StudentRow? prevStudent;
  final int currentIndex;
  final int totalStudents;
  final String columnName;
  final double maxScore;
  final double? currentValue;
  final ValueChanged<double?> onValueChange;
  final VoidCallback onNext;
  final VoidCallback onPrev;
  final VoidCallback onClose;
  final String numeralMode;
  final ValueChanged<String> onNumeralModeChange;

  const GradeNumericKeypad({
    super.key,
    required this.currentStudent,
    this.nextStudent,
    this.prevStudent,
    required this.currentIndex,
    required this.totalStudents,
    required this.columnName,
    required this.maxScore,
    required this.currentValue,
    required this.onValueChange,
    required this.onNext,
    required this.onPrev,
    required this.onClose,
    this.numeralMode = 'EN',
    required this.onNumeralModeChange,
  });

  @override
  State<GradeNumericKeypad> createState() => _GradeNumericKeypadState();
}

class _GradeNumericKeypadState extends State<GradeNumericKeypad> {
  String _inputBuffer = '';

  @override
  void initState() {
    super.initState();
    _syncBuffer();
  }

  @override
  void didUpdateWidget(covariant GradeNumericKeypad oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentStudent.id != widget.currentStudent.id ||
        oldWidget.columnName != widget.columnName ||
        oldWidget.currentValue != widget.currentValue) {
      _syncBuffer();
    }
  }

  void _syncBuffer() {
    if (widget.currentValue != null) {
      if (widget.currentValue == widget.currentValue!.roundToDouble()) {
        _inputBuffer = widget.currentValue!.toInt().toString();
      } else {
        _inputBuffer = widget.currentValue!.toString();
      }
    } else {
      _inputBuffer = '';
    }
  }

  String _displayDigit(int num) {
    if (widget.numeralMode == 'AR') {
      return ArabicHelper.arabicDigits[num];
    }
    return num.toString();
  }

  void _handleKeyPress(String char) {
    var nextStr = _inputBuffer;
    if (char == '.' || char == '،') {
      if (!nextStr.contains('.')) {
        nextStr = nextStr.isEmpty ? '0.' : '$nextStr.';
      }
    } else {
      if (nextStr == '0') {
        nextStr = char;
      } else {
        nextStr += char;
      }
    }

    final val = double.tryParse(nextStr);
    if (val != null && val > widget.maxScore) {
      // Don't append if exceeds max score
      return;
    }

    setState(() => _inputBuffer = nextStr);
    widget.onValueChange(val);
  }

  void _handleBackspace() {
    if (_inputBuffer.length <= 1) {
      setState(() => _inputBuffer = '');
      widget.onValueChange(null);
    } else {
      final nextStr = _inputBuffer.substring(0, _inputBuffer.length - 1);
      setState(() => _inputBuffer = nextStr);
      if (nextStr.isEmpty || nextStr == '.') {
        widget.onValueChange(null);
      } else {
        widget.onValueChange(double.tryParse(nextStr));
      }
    }
  }

  void _handleClear() {
    setState(() => _inputBuffer = '');
    widget.onValueChange(null);
  }

  @override
  Widget build(BuildContext context) {
    final displayScore = _inputBuffer.isNotEmpty
        ? ArabicHelper.formatScore(_inputBuffer, widget.numeralMode)
        : (widget.currentValue != null
            ? ArabicHelper.formatScore(widget.currentValue, widget.numeralMode)
            : '—');

    final maxScoreDisplay = ArabicHelper.formatScore(widget.maxScore, widget.numeralMode);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFFAF7EC), // #FAF7EC craft cream
          border: const Border(
            top: BorderSide(color: Color(0xFFCBB69F), width: 2.0),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.18),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 1. Sleek Top Bar above the keys
              Container(
                padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF2ECE0),
                  border: Border(
                    bottom: BorderSide(color: Color(0xFFD8CEBD)),
                  ),
                ),
                child: Row(
                  children: [
                    // Active Student Badge with Distinctive Brown-Gold Gradient
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFBA916C), Color(0xFF9E744E)],
                        ),
                        borderRadius: BorderRadius.circular(10.r),
                        border: Border.all(color: const Color(0xFF8C6544)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6.r,
                            height: 6.r,
                            decoration: const BoxDecoration(
                              color: Color(0xFFFEF08A),
                              shape: BoxShape.circle,
                            ),
                          ),
                          SizedBox(width: 6.w),
                          Text(
                            widget.currentStudent.name,
                            style: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          if (widget.currentStudent.section.isNotEmpty) ...[
                            SizedBox(width: 4.w),
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 1.h),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.25),
                                borderRadius: BorderRadius.circular(4.r),
                              ),
                              child: Text(
                                widget.currentStudent.section,
                                style: TextStyle(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFFFEF3C7),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    SizedBox(width: 8.w),

                    // Column Name & Score Preview
                    Expanded(
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8.r),
                          border: Border.all(color: const Color(0xFFD8CEBD)),
                        ),
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                widget.columnName,
                                style: TextStyle(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF5A4D3E),
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                              SizedBox(width: 6.w),
                              Container(
                                padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 1.h),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFFBEB),
                                  borderRadius: BorderRadius.circular(5.r),
                                  border: Border.all(color: const Color(0xFFFDE68A)),
                                ),
                                child: Text(
                                  '$displayScore / $maxScoreDisplay',
                                  style: TextStyle(
                                    fontSize: 12.sp,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFFB45309),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    SizedBox(width: 8.w),

                    // Next Student Button
                    if (widget.nextStudent != null)
                      InkWell(
                        onTap: widget.onNext,
                        borderRadius: BorderRadius.circular(10.r),
                        child: Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD7EBDC),
                            borderRadius: BorderRadius.circular(10.r),
                            border: Border.all(color: const Color(0xFFA8D5B2)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                widget.nextStudent!.name,
                                style: TextStyle(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF1C452C),
                                ),
                              ),
                              SizedBox(width: 4.w),
                              Icon(
                                Icons.chevron_left_rounded,
                                size: 16.r,
                                color: const Color(0xFF1C452C),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 3.h),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(6.r),
                        ),
                        child: Text(
                          '(نهاية القائمة)',
                          style: TextStyle(fontSize: 10.sp, color: Colors.grey.shade600),
                        ),
                      ),
                    SizedBox(width: 6.w),

                    // Close Keypad button
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF7A6A58)),
                      onPressed: widget.onClose,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),

              // 2. Custom Keypad Grid (Top Row & Bottom Row)
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 8.h),
                child: Column(
                  children: [
                    // Top Row: [EN] [ 9 ] [ ، ] [ . ] [ 0 ] [AR]
                    Row(
                      children: [
                        Expanded(
                          child: _buildModeButton(
                            label: 'EN',
                            isSelected: widget.numeralMode == 'EN',
                            onTap: () => widget.onNumeralModeChange('EN'),
                          ),
                        ),
                        SizedBox(width: 5.w),
                        Expanded(child: _buildDigitButton('9', () => _handleKeyPress('9'))),
                        SizedBox(width: 5.w),
                        Expanded(child: _buildDigitButton('،', () => _handleKeyPress('،'))),
                        SizedBox(width: 5.w),
                        Expanded(child: _buildDigitButton('.', () => _handleKeyPress('.'))),
                        SizedBox(width: 5.w),
                        Expanded(child: _buildDigitButton(_displayDigit(0), () => _handleKeyPress('0'))),
                        SizedBox(width: 5.w),
                        Expanded(
                          child: _buildModeButton(
                            label: 'AR',
                            isSelected: widget.numeralMode == 'AR',
                            onTap: () => widget.onNumeralModeChange('AR'),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 6.h),

                    // Bottom Row: [ 8 ] [ 7 ] [ 6 ] [ 5 ] [ 4 ] [ 3 ] [ 2 ] [ 1 ]
                    Row(
                      children: [8, 7, 6, 5, 4, 3, 2, 1].map((digit) {
                        return Expanded(
                          child: Padding(
                            padding: EdgeInsets.symmetric(horizontal: 2.w),
                            child: _buildDigitButton(
                              _displayDigit(digit),
                              () => _handleKeyPress(digit.toString()),
                              height: 44.h,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    SizedBox(height: 8.h),

                    // Auxiliary Controls: Backspace & Next
                    Row(
                      children: [
                        // Backspace
                        Expanded(
                          flex: 1,
                          child: InkWell(
                            onTap: _handleBackspace,
                            borderRadius: BorderRadius.circular(10.r),
                            child: Container(
                              height: 38.h,
                              decoration: BoxDecoration(
                                color: const Color(0xFFFAF2EB),
                                borderRadius: BorderRadius.circular(10.r),
                                border: Border.all(color: const Color(0xFFD8BEB0)),
                              ),
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 4.w),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.backspace_outlined, size: 16.r, color: const Color(0xFFBA916C)),
                                      SizedBox(width: 4.w),
                                      Text(
                                        'مسح ⌫',
                                        style: TextStyle(
                                          fontSize: 12.sp,
                                          fontWeight: FontWeight.bold,
                                          color: const Color(0xFF7C482A),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: 8.w),

                        // Clear Button
                        InkWell(
                          onTap: _handleClear,
                          borderRadius: BorderRadius.circular(10.r),
                          child: Container(
                            height: 38.h,
                            padding: EdgeInsets.symmetric(horizontal: 8.w),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3ECE0),
                              borderRadius: BorderRadius.circular(10.r),
                              border: Border.all(color: const Color(0xFFD8CEBD)),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'مسح الكل',
                              style: TextStyle(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF7A6A58),
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: 8.w),

                        // Confirm & Next Student
                        Expanded(
                          flex: 2,
                          child: InkWell(
                            onTap: widget.onNext,
                            borderRadius: BorderRadius.circular(10.r),
                            child: Container(
                              height: 38.h,
                              decoration: BoxDecoration(
                                color: const Color(0xFFBA916C),
                                borderRadius: BorderRadius.circular(10.r),
                                border: Border.all(color: const Color(0xFF9E7752)),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF5A4128).withValues(alpha: 0.15),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 6.w),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.check_rounded, size: 18, color: Colors.white),
                                      SizedBox(width: 4.w),
                                      Text(
                                        widget.nextStudent != null ? 'تأكيد والتالي ◄' : 'تأكيد وحفظ',
                                        style: TextStyle(
                                          fontSize: 12.5.sp,
                                          fontWeight: FontWeight.w900,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDigitButton(String text, VoidCallback onTap, {double? height}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10.r),
      child: Container(
        height: height ?? 44.h,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFFFA726), // Orange 400
              Color(0xFFFB8C00), // Orange 600
              Color(0xFFE65100), // Orange 900
            ],
          ),
          borderRadius: BorderRadius.circular(10.r),
          border: Border.all(color: const Color(0xFFBF360C)),
          boxShadow: const [
            BoxShadow(
              color: Color(0xFF9E2D00),
              offset: Offset(0, 2.5),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: Text(
          text,
          style: TextStyle(
            fontSize: 18.sp,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildModeButton({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10.r),
      child: Container(
        height: 44.h,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isSelected
                ? const [Color(0xFFECDDC6), Color(0xFFC9B390)]
                : const [Color(0xFFE2D4BF), Color(0xFFBFA989)],
          ),
          borderRadius: BorderRadius.circular(10.r),
          border: Border.all(
            color: isSelected ? const Color(0xFF7E6649) : const Color(0xFFA89885),
            width: isSelected ? 2.0 : 1.0,
          ),
          boxShadow: const [
            BoxShadow(
              color: Colors.black12,
              offset: Offset(0, 2),
              blurRadius: 2,
            ),
          ],
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13.sp,
            fontWeight: FontWeight.w900,
            color: isSelected ? const Color(0xFF1E1E1E) : const Color(0xFF4A3828),
          ),
        ),
      ),
    );
  }
}

