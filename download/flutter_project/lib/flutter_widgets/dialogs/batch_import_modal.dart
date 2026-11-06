import 'package:flutter/material.dart';

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
                hintText: 'أحمد علي حسن\nمحمد قاسم كريم\nعلي حسين رضا...',
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
                    final lines = _textController.text.split('\n').map((s) => s.trim()).filter((s) => s.isNotEmpty).toList();
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
