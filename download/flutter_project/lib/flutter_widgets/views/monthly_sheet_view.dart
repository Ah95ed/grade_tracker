import 'package:flutter/material.dart';

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
