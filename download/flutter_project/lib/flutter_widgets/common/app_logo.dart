import 'package:flutter/material.dart';

/// الشعار المتجهي لتطبيق درجات (AppLogo.tsx)
class AppLogo extends StatelessWidget {
  final double size;
  const AppLogo({super.key, this.size = 40.0});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _AppLogoPainter(),
      ),
    );
  }
}

class _AppLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final center = Offset(w / 2, h / 2);
    final radius = w / 2;

    // 1. Circular Gradient Background (#1E3A8A -> #0D9488)
    final bgPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF1E3A8A), Color(0xFF0D9488)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, bgPaint);

    // Inner subtle border
    final borderPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.04;
    canvas.drawCircle(center, radius * 0.94, borderPaint);

    // 2. Bar Chart Columns
    final barPaint1 = Paint()..color = const Color(0xFF60A5FA).withValues(alpha: 0.85);
    final barPaint2 = Paint()..color = const Color(0xFF34D399).withValues(alpha: 0.85);
    final barPaint3 = Paint()..color = const Color(0xFFFBBF24).withValues(alpha: 0.9);

    final bW = w * 0.12;
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(w * 0.22, h * 0.58, bW, h * 0.22), Radius.circular(w * 0.02)), barPaint1);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(w * 0.38, h * 0.46, bW, h * 0.34), Radius.circular(w * 0.02)), barPaint2);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(w * 0.54, h * 0.36, bW, h * 0.44), Radius.circular(w * 0.02)), barPaint3);

    // 3. Upward Trend Line
    final linePaint = Paint()
      ..color = Colors.white
      ..strokeWidth = w * 0.05
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    final path = Path()
      ..moveTo(w * 0.24, h * 0.56)
      ..lineTo(w * 0.44, h * 0.42)
      ..lineTo(w * 0.62, h * 0.32);
    canvas.drawPath(path, linePaint);

    // 4. Academic Graduation Cap (Gold)
    final capPaint = Paint()..color = const Color(0xFFFDE047);
    final capPath = Path()
      ..moveTo(w * 0.5, h * 0.16)
      ..lineTo(w * 0.76, h * 0.26)
      ..lineTo(w * 0.5, h * 0.36)
      ..lineTo(w * 0.24, h * 0.26)
      ..close();
    canvas.drawPath(capPath, capPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
