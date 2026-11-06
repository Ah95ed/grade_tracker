import 'package:flutter/material.dart';

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
