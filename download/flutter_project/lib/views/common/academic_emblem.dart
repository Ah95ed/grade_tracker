import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/theme/app_colors.dart';

/// Academic Laurel Emblem Painter matching the original header logo
class AcademicEmblem extends StatelessWidget {
  final double? size;

  const AcademicEmblem({super.key, this.size});

  @override
  Widget build(BuildContext context) {
    final effectiveSize = size ?? 38.r;
    return Container(
      width: effectiveSize,
      height: effectiveSize,
      decoration: BoxDecoration(
        color: AppColors.creamBackground,
        borderRadius: BorderRadius.circular(10.r),
        border: Border.all(color: AppColors.borderWarm, width: 1.2),
      ),
      child: Center(
        child: CustomPaint(
          size: Size(effectiveSize * 0.75, effectiveSize * 0.75),
          painter: _LaurelEmblemPainter(),
        ),
      ),
    );
  }
}

class _LaurelEmblemPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.academicGold
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final double w = size.width;
    final double h = size.height;

    // Laurel Wreath Arcs
    final leftPath = Path()
      ..moveTo(w * 0.25, h * 0.75)
      ..cubicTo(w * 0.15, h * 0.6, w * 0.15, h * 0.35, w * 0.3, h * 0.2);
    canvas.drawPath(leftPath, paint);

    final rightPath = Path()
      ..moveTo(w * 0.75, h * 0.75)
      ..cubicTo(w * 0.85, h * 0.6, w * 0.85, h * 0.35, w * 0.7, h * 0.2);
    canvas.drawPath(rightPath, paint);

    // Graduation Cap Top (Diamond)
    final capPath = Path()
      ..moveTo(w * 0.5, h * 0.25)
      ..lineTo(w * 0.75, h * 0.35)
      ..lineTo(w * 0.5, h * 0.45)
      ..lineTo(w * 0.25, h * 0.35)
      ..close();
    canvas.drawPath(capPath, paint);

    // Cap Base & Tassel
    final baseCap = Path()
      ..moveTo(w * 0.35, h * 0.4)
      ..lineTo(w * 0.35, h * 0.5)
      ..cubicTo(w * 0.35, h * 0.58, w * 0.65, h * 0.58, w * 0.65, h * 0.5)
      ..lineTo(w * 0.65, h * 0.4);
    canvas.drawPath(baseCap, paint);

    // Open Book Below
    final bookPath = Path()
      ..moveTo(w * 0.3, h * 0.75)
      ..lineTo(w * 0.5, h * 0.7)
      ..lineTo(w * 0.7, h * 0.75)
      ..lineTo(w * 0.7, h * 0.6)
      ..lineTo(w * 0.5, h * 0.55)
      ..lineTo(w * 0.3, h * 0.6)
      ..close();
    canvas.drawPath(bookPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

