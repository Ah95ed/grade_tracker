import 'package:flutter/material.dart';

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
