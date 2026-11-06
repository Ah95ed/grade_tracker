import 'package:flutter/material.dart';

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
