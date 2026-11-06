import 'package:flutter/material.dart';

/// خلفية الورق المشبك الرياضي 22px الدافئة (Graph Paper Grid)
class GraphPaperBackground extends StatelessWidget {
  final Widget child;
  const GraphPaperBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: Container(
            color: const Color(0xFFF6F3E2),
            child: CustomPaint(
              painter: _GraphPaperPainter(),
            ),
          ),
        ),
        child,
      ],
    );
  }
}

class _GraphPaperPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = const Color(0xFFC3BBAA).withValues(alpha: 0.45)
      ..strokeWidth = 1.0;

    const double cellSize = 22.0;

    for (double x = 0; x <= size.width; x += cellSize) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), linePaint);
    }
    for (double y = 0; y <= size.height; y += cellSize) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
