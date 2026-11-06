import 'package:flutter/material.dart';

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
