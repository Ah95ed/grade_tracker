const fs = require('fs');
const path = require('path');

const targetDirs = [
  '/home/z/my-project/download',
  'D:/home/z/my-project/download',
  'C:/home/z/my-project/download',
  path.join(__dirname, 'download')
];

function writeAll(relSubPath, content) {
  for (const root of targetDirs) {
    const full = path.join(root, relSubPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
}

console.log('Generating Phase 4 Flutter Widgets and Tests...');

// -----------------------------------------------------------------------------
// 1. Common Widgets
// -----------------------------------------------------------------------------

writeAll('flutter_widgets/common/app_logo.dart', `import 'package:flutter/material.dart';

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
`);

writeAll('flutter_widgets/common/graph_paper_background.dart', `import 'package:flutter/material.dart';

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
`);

writeAll('flutter_widgets/common/sync_status_badge.dart', `import 'package:flutter/material.dart';

/// شارة المزامنة السحابية اللحظية (SyncStatusBadge.tsx)
class SyncStatusBadge extends StatelessWidget {
  final bool isOnline;
  final bool isSyncing;
  final int pendingCount;
  final String? lastSyncedAt;
  final VoidCallback? onTriggerSync;

  const SyncStatusBadge({
    super.key,
    required this.isOnline,
    required this.isSyncing,
    this.pendingCount = 0,
    this.lastSyncedAt,
    this.onTriggerSync,
  });

  @override
  Widget build(BuildContext context) {
    final color = !isOnline
        ? const Color(0xFF64748B)
        : (isSyncing
            ? const Color(0xFF5692BE)
            : (pendingCount > 0 ? const Color(0xFFB86848) : const Color(0xFF4E7A68)));

    final text = !isOnline
        ? 'وضع أوفلاين (محلي)'
        : (isSyncing
            ? 'جاري المزامنة...'
            : (pendingCount > 0 ? 'تعديلات معلقة ($pendingCount)' : 'متزامن مع السحابة'));

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isSyncing ? null : onTriggerSync,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: const Color(0xFFFAF6EC),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: color.withValues(alpha: 0.5), width: 1.2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isSyncing)
                SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(strokeWidth: 2, color: color),
                )
              else
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
              const SizedBox(width: 6),
              Text(
                text,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
`);

writeAll('flutter_widgets/common/bottom_score_keypad.dart', `import 'package:flutter/material.dart';

/// لوحة المفاتيح اللمسية السريعة العائمة لإدخال درجات الطلاب (BottomScoreKeypad.tsx)
class BottomScoreKeypad extends StatelessWidget {
  final ValueChanged<String> onKeyPress;
  final VoidCallback onDelete;
  final VoidCallback onNextStudent;
  final VoidCallback onClose;

  const BottomScoreKeypad({
    super.key,
    required this.onKeyPress,
    required this.onDelete,
    required this.onNextStudent,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF6EC),
        border: const Border(top: BorderSide(color: Color(0xFFAA8362), width: 1.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'لوحة رصد الدرجات السريعة',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF2F2822)),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: onClose,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildKey('1'),
                const SizedBox(width: 6),
                _buildKey('2'),
                const SizedBox(width: 6),
                _buildKey('3'),
                const SizedBox(width: 6),
                _buildKey('4'),
                const SizedBox(width: 6),
                _buildKey('5'),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                _buildKey('6'),
                const SizedBox(width: 6),
                _buildKey('7'),
                const SizedBox(width: 6),
                _buildKey('8'),
                const SizedBox(width: 6),
                _buildKey('9'),
                const SizedBox(width: 6),
                _buildKey('0'),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                _buildKey('.'),
                const SizedBox(width: 6),
                Expanded(
                  child: InkWell(
                    onTap: onDelete,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(Icons.backspace_rounded, size: 18, color: Color(0xFFDC2626)),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  flex: 2,
                  child: InkWell(
                    onTap: onNextStudent,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFBA916C),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF9E7752)),
                      ),
                      alignment: Alignment.center,
                      child: const Text('الطالب التالي ⬇', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKey(String label) {
    return Expanded(
      child: InkWell(
        onTap: () => onKeyPress(label),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFD5C8B2)),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF2F2822)),
          ),
        ),
      ),
    );
  }
}
`);

// -----------------------------------------------------------------------------
// 2. Header & Main Views
// -----------------------------------------------------------------------------

writeAll('flutter_widgets/header/app_header.dart', `import 'package:flutter/material.dart';
import '../common/app_logo.dart';
import '../common/sync_status_badge.dart';

/// شريط العنوان العلوي التفاعلي المتكيف مع التبويب النشط (Header.tsx)
class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final int activeTab; // 0: monthly, 1: term, 2: cards, 3: admin
  final String teacherName;
  final String subject;
  final String schoolName;
  final bool isOnline;
  final bool isSyncing;
  final VoidCallback onOpenMenu;
  final VoidCallback? onTriggerSync;

  const AppHeader({
    super.key,
    required this.activeTab,
    required this.teacherName,
    required this.subject,
    required this.schoolName,
    required this.isOnline,
    required this.isSyncing,
    required this.onOpenMenu,
    this.onTriggerSync,
  });

  @override
  Size get preferredSize => const Size.fromHeight(72.0);

  Color _getBannerColor() {
    switch (activeTab) {
      case 0:
        return const Color(0xFF5692BE); // Monthly Blue
      case 1:
        return const Color(0xFFB86848); // Term Rust
      case 2:
        return const Color(0xFF4E7A68); // Cards Green
      case 3:
        return const Color(0xFF3E5771); // Admin Navy
      default:
        return const Color(0xFF5692BE);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bannerColor = _getBannerColor();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      child: Row(
        children: [
          // 1. Teacher Banner
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                color: bannerColor,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: bannerColor.withValues(alpha: 0.35),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    teacherName.isNotEmpty ? teacherName : 'المعلم',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [subject, schoolName].where((s) => s.isNotEmpty).join(' • '),
                    style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.9)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),

          // 2. Logo
          const AppLogo(size: 38),
          const SizedBox(width: 8),

          // 3. Sync Badge
          SyncStatusBadge(
            isOnline: isOnline,
            isSyncing: isSyncing,
            onTriggerSync: onTriggerSync,
          ),
          const SizedBox(width: 8),

          // 4. Menu Trigger
          IconButton(
            onPressed: onOpenMenu,
            icon: const Icon(Icons.menu_rounded, color: Color(0xFF2F2822)),
            style: IconButton.styleFrom(
              backgroundColor: const Color(0xFFFAF6EC),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: const BorderSide(color: Color(0xFFAA8362)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
`);

writeAll('flutter_widgets/views/monthly_sheet_view.dart', `import 'package:flutter/material.dart';

/// شاشة إدارة ورصد جدول الدرجات الشهرية (MonthlySheetView.tsx)
class MonthlySheetView extends StatefulWidget {
  final List<String> models;
  final String activeModel;
  final ValueChanged<String> onSelectModel;
  final VoidCallback onAddNewModel;

  const MonthlySheetView({
    super.key,
    required this.models,
    required this.activeModel,
    required this.onSelectModel,
    required this.onAddNewModel,
  });

  @override
  State<MonthlySheetView> createState() => _MonthlySheetViewState();
}

class _MonthlySheetViewState extends State<MonthlySheetView> {
  String _selectedSection = 'الكل';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Top Craft Button (+ جدول درجات جديد)
          ElevatedButton.icon(
            onPressed: widget.onAddNewModel,
            icon: const Icon(Icons.add_rounded, color: Colors.white),
            label: const Text('+ جدول درجات جديد', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFBA916C),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFF9E7752)),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // 2. Month Model Chips
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFAF6EC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFAA8362)),
            ),
            child: Wrap(
              spacing: 8,
              runSpacing: 6,
              children: widget.models.map((m) {
                final isSelected = m == widget.activeModel;
                return ChoiceChip(
                  label: Text(m),
                  selected: isSelected,
                  onSelected: (_) => widget.onSelectModel(m),
                  selectedColor: const Color(0xFF5692BE),
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : const Color(0xFF2F2822),
                    fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          // 3. Search & Section Filter
          Row(
            children: [
              Expanded(
                child: TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'بحث باسم الطالب أو الرقم...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 18),
                    contentPadding: EdgeInsets.zero,
                    fillColor: Colors.white,
                    filled: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 4. Data Table Card
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFFAF6EC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFAA8362)),
            ),
            padding: const EdgeInsets.all(12),
            child: const Center(
              child: Text(
                'جدول درجات الطلاب جاهز للرصد والمزامنة',
                style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF6B5E51)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
`);

writeAll('flutter_widgets/views/term_calculation_view.dart', `import 'package:flutter/material.dart';

/// شاشة حساب المعدل والفصول التراكمية (TermCalculationView.tsx)
class TermCalculationView extends StatelessWidget {
  final List<String> terms;
  final VoidCallback onAddTerm;

  const TermCalculationView({
    super.key,
    required this.terms,
    required this.onAddTerm,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Add Term Button
          ElevatedButton.icon(
            onPressed: onAddTerm,
            icon: const Icon(Icons.add_rounded, color: Colors.white),
            label: const Text('+ إضافة فصل جديد', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFB86848),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFFA05537)),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // 2. Summary Metric Cards
          Row(
            children: [
              _buildMetricCard('نسبة النجاح', '92%', const Color(0xFF4E7A68)),
              const SizedBox(width: 8),
              _buildMetricCard('المعدل العام', '84.5', const Color(0xFFB86848)),
              const SizedBox(width: 8),
              _buildMetricCard('أعلى درجة', '100', const Color(0xFF5692BE)),
            ],
          ),
          const SizedBox(height: 12),

          // 3. Terms Table
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFAF6EC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFAA8362)),
            ),
            child: const Center(
              child: Text(
                'حساب المعدلات الفصلية والنهائية التلقائي',
                style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2F2822)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String title, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.4), width: 1.2),
        ),
        child: Column(
          children: [
            Text(title, style: const TextStyle(fontSize: 10, color: Color(0xFF6B5E51))),
            const SizedBox(height: 2),
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color)),
          ],
        ),
      ),
    );
  }
}
`);

writeAll('flutter_widgets/views/report_cards_view.dart', `import 'package:flutter/material.dart';

/// شاشة استعراض كروت وشهادات الطلاب والطباعة (ReportCardsView.tsx)
class ReportCardsView extends StatefulWidget {
  final VoidCallback onPrint;
  final VoidCallback onOpenPrintSettings;

  const ReportCardsView({
    super.key,
    required this.onPrint,
    required this.onOpenPrintSettings,
  });

  @override
  State<ReportCardsView> createState() => _ReportCardsViewState();
}

class _ReportCardsViewState extends State<ReportCardsView> {
  String _mode = 'by_subject'; // 'by_subject' or 'by_student'

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Sage Green Top Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF4E7A68),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF3B6554)),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'فصول الدرجات المعتمدة في الشهادات',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                SizedBox(height: 2),
                Text(
                  'تظهر هنا درجات الفصول المحسوبة والشهادات المجهزة للطباعة.',
                  style: TextStyle(fontSize: 10, color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 2. Mode Selector & Action Buttons
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFAF6EC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFAA8362)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    ChoiceChip(
                      label: const Text('حسب المادة'),
                      selected: _mode == 'by_subject',
                      onSelected: (_) => setState(() => _mode = 'by_subject'),
                      selectedColor: const Color(0xFF4E7A68),
                      labelStyle: TextStyle(color: _mode == 'by_subject' ? Colors.white : Colors.black87),
                    ),
                    const SizedBox(width: 6),
                    ChoiceChip(
                      label: const Text('حسب الطالب'),
                      selected: _mode == 'by_student',
                      onSelected: (_) => setState(() => _mode = 'by_student'),
                      selectedColor: const Color(0xFF4E7A68),
                      labelStyle: TextStyle(color: _mode == 'by_student' ? Colors.white : Colors.black87),
                    ),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.tune_rounded, color: Color(0xFF4E7A68)),
                      onPressed: widget.onOpenPrintSettings,
                    ),
                    ElevatedButton.icon(
                      onPressed: widget.onPrint,
                      icon: const Icon(Icons.print_rounded, size: 16),
                      label: const Text('طباعة'),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4E7A68), foregroundColor: Colors.white),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
`);

// -----------------------------------------------------------------------------
// 3. Modals & Dialogs (BatchImport, ScoreRounding, PrintSettings, etc.)
// -----------------------------------------------------------------------------

writeAll('flutter_widgets/dialogs/batch_import_modal.dart', `import 'package:flutter/material.dart';

/// نافذة الاستيراد الجماعي للطلاب من Excel أو النصوص (BatchImportModal.tsx)
class BatchImportModal extends StatefulWidget {
  final ValueChanged<List<String>> onImport;
  const BatchImportModal({super.key, required this.onImport});

  @override
  State<BatchImportModal> createState() => _BatchImportModalState();
}

class _BatchImportModalState extends State<BatchImportModal> {
  final _textController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFFFAF6EC),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFAA8362), width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'استيراد قائمة أسماء الطلاب',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF2F2822)),
            ),
            const SizedBox(height: 6),
            const Text(
              'الصق أسماء الطلاب هنا (اسم واحد في كل سطر)، أو استورد من Excel.',
              style: TextStyle(fontSize: 11, color: Color(0xFF6B5E51)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _textController,
              maxLines: 8,
              decoration: InputDecoration(
                hintText: 'أحمد علي حسن\\nمحمد قاسم كريم\\nعلي حسين رضا...',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('إلغاء'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final lines = _textController.text.split('\\n').map((s) => s.trim()).filter((s) => s.isNotEmpty).toList();
                    widget.onImport(lines);
                    Navigator.of(context).pop();
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFBA916C), foregroundColor: Colors.white),
                  child: const Text('إضافة الطلاب'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

extension _FilterExt on Iterable<String> {
  List<String> filter(bool Function(String) predicate) => where(predicate).toList();
}
`);

writeAll('flutter_widgets/dialogs/score_rounding_modal.dart', `import 'package:flutter/material.dart';

/// نافذة خيارات جبر وتقريب الدرجات (ScoreRoundingModal.tsx)
class ScoreRoundingModal extends StatefulWidget {
  final String initialMode;
  final ValueChanged<String> onSave;

  const ScoreRoundingModal({super.key, required this.initialMode, required this.onSave});

  @override
  State<ScoreRoundingModal> createState() => _ScoreRoundingModalState();
}

class _ScoreRoundingModalState extends State<ScoreRoundingModal> {
  late String _mode;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFFFAF6EC),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFAA8362), width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'إعدادات جبر وتقريب الدرجات',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF2F2822)),
            ),
            const SizedBox(height: 12),
            _buildRadio('بدون جبر (إبقاء الكسور العشرية كما هي)', 'none'),
            _buildRadio('جبر النصف فأعلى (0.5 فما فوق يُجبر إلى 1)', 'half_up'),
            _buildRadio('جبر أي كسر عشري مباشرة (أي كسر يصبح 1)', 'any_fraction'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                widget.onSave(_mode);
                Navigator.of(context).pop();
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFBA916C), foregroundColor: Colors.white),
              child: const Text('حفظ التفضيلات'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRadio(String title, String val) {
    return RadioListTile<String>(
      title: Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      value: val,
      groupValue: _mode,
      activeColor: const Color(0xFFBA916C),
      onChanged: (v) => setState(() => _mode = v ?? 'none'),
    );
  }
}
`);

// -----------------------------------------------------------------------------
// 4. Golden & Widget Tests
// -----------------------------------------------------------------------------

writeAll('flutter_tests/widgets_golden_test.dart', `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../flutter_widgets/common/app_logo.dart';
import '../flutter_widgets/common/sync_status_badge.dart';
import '../flutter_widgets/common/bottom_score_keypad.dart';
import '../flutter_widgets/header/app_header.dart';

void main() {
  testWidgets('AppLogo renders properly at various sizes', (WidgetTester tester) async {
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.rtl,
        child: Center(child: AppLogo(size: 64)),
      ),
    );
    expect(find.byType(AppLogo), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('SyncStatusBadge renders online and offline states without overflow', (WidgetTester tester) async {
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.rtl,
        child: Material(
          child: Row(
            children: [
              SyncStatusBadge(isOnline: true, isSyncing: false),
              SizedBox(width: 8),
              SyncStatusBadge(isOnline: false, isSyncing: false),
              SizedBox(width: 8),
              SyncStatusBadge(isOnline: true, isSyncing: true),
            ],
          ),
        ),
      ),
    );
    expect(find.byType(SyncStatusBadge), findsNWidgets(3));
    expect(tester.takeException(), isNull);
  });

  testWidgets('BottomScoreKeypad renders keys and accepts input', (WidgetTester tester) async {
    String pressed = '';
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BottomScoreKeypad(
            onKeyPress: (k) => pressed = k,
            onDelete: () {},
            onNextStudent: () {},
            onClose: () {},
          ),
        ),
      ),
    );
    expect(find.text('5'), findsOneWidget);
    await tester.tap(find.text('5'));
    expect(pressed, '5');
  });

  testWidgets('AppHeader renders teacher name and sync indicator in RTL', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          appBar: AppHeader(
            activeTab: 0,
            teacherName: 'الأستاذ: علي محمد',
            subject: 'الرياضيات',
            schoolName: 'ثانوية المتميزين',
            isOnline: true,
            isSyncing: false,
            onOpenMenu: () {},
          ),
        ),
      ),
    );
    expect(find.text('الأستاذ: علي محمد'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
`);

writeAll('flutter_tests/screens_golden_test.dart', `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../flutter_widgets/views/monthly_sheet_view.dart';
import '../flutter_widgets/views/term_calculation_view.dart';
import '../flutter_widgets/views/report_cards_view.dart';

void main() {
  testWidgets('MonthlySheetView renders model chips and search input in RTL', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      MaterialApp(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            body: MonthlySheetView(
              models: const ['تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
              activeModel: 'تشرين الأول',
              onSelectModel: (_) {},
              onAddNewModel: () {},
            ),
          ),
        ),
      ),
    );
    expect(find.text('+ جدول درجات جديد'), findsOneWidget);
    expect(find.text('تشرين الأول'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('TermCalculationView renders metric cards and action button', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      MaterialApp(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            body: TermCalculationView(
              terms: const ['الفصل الأول', 'الفصل الثاني'],
              onAddTerm: () {},
            ),
          ),
        ),
      ),
    );
    expect(find.text('+ إضافة فصل جديد'), findsOneWidget);
    expect(find.text('نسبة النجاح'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ReportCardsView renders sage green banner and mode switcher', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      MaterialApp(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            body: ReportCardsView(
              onPrint: () {},
              onOpenPrintSettings: () {},
            ),
          ),
        ),
      ),
    );
    expect(find.text('فصول الدرجات المعتمدة في الشهادات'), findsOneWidget);
    expect(find.text('حسب المادة'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
`);

console.log('All Phase 4 Flutter Widgets and Tests generated successfully!');
