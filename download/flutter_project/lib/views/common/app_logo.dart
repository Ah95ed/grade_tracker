import 'package:flutter/material.dart';

/// Official App Logo for "Teacher Gradebook - دفتر درجات المعلم"
/// Vector implementation matching AppLogo.tsx from the web app
class AppLogo extends StatelessWidget {
  final double size;

  const AppLogo({super.key, this.size = 72});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        size: Size(size, size),
        painter: const _AppLogoPainter(),
      ),
    );
  }
}

class _AppLogoPainter extends CustomPainter {
  const _AppLogoPainter();

  @override
  void paint(Canvas canvas, Size size) {
    // Canvas coordinate space normalized to 512 x 512
    final double scale = size.width / 512.0;
    canvas.save();
    canvas.scale(scale, scale);

    // 1. Circular Background with Gradient
    final Rect bgRect = const Rect.fromLTWH(10, 10, 492, 492);
    final bgPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF1E3A8A), Color(0xFF0D9488)],
      ).createShader(bgRect);
    canvas.drawCircle(const Offset(256, 256), 246, bgPaint);

    // 2. Analytics Chart Bars
    final Rect chartRect = const Rect.fromLTWH(130, 220, 130, 170);
    final chartPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.bottomCenter,
        end: Alignment.topCenter,
        colors: [Color(0xFF2DD4BF), Color(0xFF5EEAD4)],
      ).createShader(chartRect);

    // Bar 1
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(130, 300, 34, 90), const Radius.circular(10)),
      chartPaint,
    );
    // Bar 2
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(176, 262, 34, 128), const Radius.circular(10)),
      chartPaint,
    );
    // Bar 3
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(222, 222, 34, 168), const Radius.circular(10)),
      chartPaint,
    );

    // 3. Performance Upward Trend Line
    final trendPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 12
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final trendPath = Path()
      ..moveTo(120, 330)
      ..lineTo(200, 270)
      ..lineTo(260, 240)
      ..lineTo(330, 180)
      ..lineTo(395, 150);
    canvas.drawPath(trendPath, trendPaint);

    // Trend circle dot
    final dotPaint = Paint()..color = const Color(0xFFFBBF24);
    final dotBorder = Paint()
      ..color = Colors.white
      ..strokeWidth = 6
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(const Offset(395, 150), 16, dotPaint);
    canvas.drawCircle(const Offset(395, 150), 16, dotBorder);

    // 4. Graduation Cap
    final Rect capRect = const Rect.fromLTWH(116, 52, 280, 180);
    final capPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
      ).createShader(capRect);

    // Diamond cap top
    final capTopPath = Path()
      ..moveTo(256, 52)
      ..lineTo(396, 116)
      ..lineTo(256, 180)
      ..lineTo(116, 116)
      ..close();
    canvas.drawPath(capTopPath, capPaint);

    // Skull cap underneath
    final skullPaint = Paint()..color = const Color(0xFFF59E0B);
    final skullPath = Path()
      ..moveTo(180, 146)
      ..lineTo(180, 198)
      ..cubicTo(180, 220, 214, 240, 256, 240)
      ..cubicTo(298, 240, 332, 220, 332, 198)
      ..lineTo(332, 146)
      ..lineTo(256, 180)
      ..close();
    canvas.drawPath(skullPath, skullPaint);

    // Tassel
    final tasselPaint = Paint()
      ..color = const Color(0xFFFDE68A)
      ..strokeWidth = 9
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(396, 116), const Offset(396, 196), tasselPaint);
    final tasselDot = Paint()..color = const Color(0xFFFDE68A);
    canvas.drawCircle(const Offset(396, 206), 13, tasselDot);

    // 5. Academic Excellence Star
    final starPaint = Paint()..color = const Color(0xFFFBBF24);
    final starBorder = Paint()
      ..color = Colors.white
      ..strokeWidth = 5
      ..style = PaintingStyle.stroke
      ..strokeJoin = StrokeJoin.round;

    final starPath = Path()
      ..moveTo(352, 298)
      ..lineTo(362, 321)
      ..lineTo(386, 322)
      ..lineTo(367, 337)
      ..lineTo(373, 361)
      ..lineTo(352, 347)
      ..lineTo(331, 361)
      ..lineTo(337, 337)
      ..lineTo(318, 322)
      ..lineTo(342, 321)
      ..close();

    canvas.drawPath(starPath, starPaint);
    canvas.drawPath(starPath, starBorder);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
