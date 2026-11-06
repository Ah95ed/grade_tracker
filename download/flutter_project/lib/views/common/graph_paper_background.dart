import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Painter that renders the authentic Graph Paper Grid (ورق الكراس المشبك)
/// identical to the Daragat Web App background (22px x 22px lines at rgba(195, 187, 170, 0.45))
class GraphPaperPainter extends CustomPainter {
  const GraphPaperPainter();

  @override
  void paint(Canvas canvas, Size size) {
    // Fill paper background
    final bgPaint = Paint()..color = AppColors.pageBg;
    canvas.drawRect(Offset.zero & size, bgPaint);

    // Draw grid lines
    final linePaint = Paint()
      ..color = AppColors.gridLine
      ..strokeWidth = 1.0;

    const double step = 22.0;

    // Vertical lines
    for (double x = 0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), linePaint);
    }

    // Horizontal lines
    for (double y = 0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Widget providing the Graph Paper Grid background to any screen
class GraphPaperBackground extends StatelessWidget {
  final Widget child;

  const GraphPaperBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: const GraphPaperPainter(),
      child: child,
    );
  }
}

