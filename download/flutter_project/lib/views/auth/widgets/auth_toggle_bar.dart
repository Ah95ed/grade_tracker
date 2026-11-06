import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';

/// Segmented tab toggle bar matching Daragat web app (bg-slate-100 rounded-2xl border border-slate-200)
class AuthToggleBar extends StatelessWidget {
  final bool isRegister;
  final ValueChanged<bool> onToggle;

  const AuthToggleBar({
    super.key,
    required this.isRegister,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(4.r),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9), // bg-slate-100
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: const Color(0xFFE2E8F0)), // border-slate-200
      ),
      child: Row(
        children: [
          // Login Tab
          Expanded(
            child: _buildTabButton(
              context,
              isActive: !isRegister,
              icon: Icons.login_rounded,
              label: context.tr(AppKeys.login),
              onTap: () => onToggle(false),
            ),
          ),
          // Register Tab
          Expanded(
            child: _buildTabButton(
              context,
              isActive: isRegister,
              icon: Icons.person_add_alt_1_rounded,
              label: context.tr(AppKeys.register),
              onTap: () => onToggle(true),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(
    BuildContext context, {
    required bool isActive,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12.r),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: EdgeInsets.symmetric(vertical: 8.h),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(12.r),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16.r,
              color: isActive ? const Color(0xFF2E485C) : const Color(0xFF64748B),
            ),
            SizedBox(width: 6.w),
            Text(
              label,
              style: TextStyle(
                fontSize: 12.sp,
                fontWeight: isActive ? FontWeight.w900 : FontWeight.bold,
                color: isActive ? const Color(0xFF2E485C) : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
