import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/term_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import 'create_term_dialog.dart';

/// Top selector bar for Term models
class TermSelectorBar extends StatelessWidget {
  const TermSelectorBar({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<TermController>();
    final terms = controller.terms;
    final activeId = controller.activeTermId;

    return Container(
      height: 48.h,
      padding: EdgeInsets.symmetric(horizontal: 12.w),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: terms.length + 1,
        separatorBuilder: (context, index) => SizedBox(width: 8.w),
        itemBuilder: (context, index) {
          if (index == terms.length) {
            return OutlinedButton.icon(
              onPressed: () => showDialog(
                context: context,
                builder: (_) => const CreateTermDialog(),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.termRust, width: 1.2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                padding: EdgeInsets.symmetric(horizontal: 12.w),
              ),
              icon: Icon(Icons.add_rounded, size: 16.r, color: AppColors.termRust),
              label: Text(
                context.tr(AppKeys.addTerm),
                style: TextStyle(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.termRust,
                ),
              ),
            );
          }

          final term = terms[index];
          final isActive = term.id == activeId;

          return InkWell(
            onTap: () => controller.setActiveTerm(term.id),
            borderRadius: BorderRadius.circular(10.r),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
              decoration: BoxDecoration(
                color: isActive ? AppColors.termRust : AppColors.creamBackground,
                borderRadius: BorderRadius.circular(10.r),
                border: Border.all(
                  color: isActive ? AppColors.termRustDark : AppColors.borderWarm,
                  width: isActive ? 1.5 : 1.0,
                ),
                boxShadow: isActive
                    ? [
                        BoxShadow(
                          color: AppColors.termRust.withValues(alpha: 0.25),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        )
                      ]
                    : null,
              ),
              child: Center(
                child: Text(
                  term.name,
                  style: TextStyle(
                    fontSize: 12.sp,
                    fontWeight: FontWeight.bold,
                    color: isActive ? Colors.white : AppColors.textPrimary,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
