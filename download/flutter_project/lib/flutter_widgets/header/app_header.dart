import 'package:flutter/material.dart';
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
