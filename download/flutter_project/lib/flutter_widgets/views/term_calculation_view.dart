import 'package:flutter/material.dart';

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
