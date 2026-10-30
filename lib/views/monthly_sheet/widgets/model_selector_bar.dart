import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';
import 'add_model_dialog.dart';

/// Top horizontal selector bar for monthly models
class ModelSelectorBar extends StatelessWidget {
  const ModelSelectorBar({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final models = controller.models;
    final activeId = controller.activeModelId;

    return Container(
      height: 48.h,
      padding: EdgeInsets.symmetric(horizontal: 12.w),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: models.length + 1,
        separatorBuilder: (context, index) => SizedBox(width: 8.w),
        itemBuilder: (context, index) {
          if (index == models.length) {
            return OutlinedButton.icon(
              onPressed: () => showDialog(
                context: context,
                builder: (_) => const AddModelDialog(),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.monthlyBlue, width: 1.2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                padding: EdgeInsets.symmetric(horizontal: 12.w),
              ),
              icon: Icon(Icons.add_rounded, size: 16.r, color: AppColors.monthlyBlue),
              label: Text(
                context.tr(AppKeys.addNewModel),
                style: TextStyle(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.monthlyBlue,
                ),
              ),
            );
          }

          final model = models[index];
          final isActive = model.id == activeId;

          return InkWell(
            onTap: () => controller.setActiveModel(model.id),
            borderRadius: BorderRadius.circular(10.r),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
              decoration: BoxDecoration(
                color: isActive ? AppColors.monthlyBlue : AppColors.creamBackground,
                borderRadius: BorderRadius.circular(10.r),
                border: Border.all(
                  color: isActive ? AppColors.monthlyBlueDark : AppColors.borderWarm,
                  width: isActive ? 1.5 : 1.0,
                ),
                boxShadow: isActive
                    ? [
                        BoxShadow(
                          color: AppColors.monthlyBlue.withValues(alpha: 0.25),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        )
                      ]
                    : null,
              ),
              child: Center(
                child: Text(
                  model.name,
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
