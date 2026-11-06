import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/translation_keys.dart';
import '../../../core/theme/app_colors.dart';

/// Modal dialog explaining data privacy and offline-first storage security
class PrivacyPolicyDialog extends StatelessWidget {
  const PrivacyPolicyDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.r)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: 440.w, maxHeight: 520.h),
        child: Column(
          children: [
            Container(
              padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
              color: AppColors.slateDark,
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(Icons.close_rounded, color: Colors.white, size: 20.r),
                  ),
                  const Spacer(),
                  Text(
                    context.tr(AppKeys.privacyPolicy),
                    style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  SizedBox(width: 8.w),
                  Icon(Icons.shield_outlined, color: Colors.white, size: 22.r),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.all(18.r),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildSection(
                      title: 'سرية وأمان بيانات الطلاب والدرجات',
                      body: 'نحن ندرك الأهمية البالغة لخصوصية درجات الطلاب وسجلاتهم المدرسية. صُمم التطبيق ليعمل وفق نموذج Offline-First؛ حيث تُخزن كافة الدرجات أولاً وبشكل مشفر محلياً على جهازك، ولا يتم نقلها إلا عند قيامك بالمزامنة السحابية المباشرة.',
                    ),
                    SizedBox(height: 12.h),
                    _buildSection(
                      title: 'الربط السحابي وقاعدة بيانات D1 (SQLite)',
                      body: 'يتم تشفير وتأمين طلبات المزامنة السحابية عبر بروتوكول HTTPS وتوكنات Firebase الموقعة برمجياً عبر مفاتيح Google المشفرة (RS256)، بما يمنع أي وصول غير مصرح به أو تعديل للسجلات من غير صاحب الحساب.',
                    ),
                    SizedBox(height: 12.h),
                    _buildSection(
                      title: 'حق المستخدم في محو البيانات',
                      body: 'يحق للمعلم في أي وقت تصدير نسخة احتياطية من كافة سجلاته بصيغة JSON، أو تفريغ السجلات، أو حذف حسابه نهائياً من قاعدة البيانات السحابية والتخزين المحلي بضغطة زر واحدة دون ترك أي أثر.',
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.monthlyBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                  ),
                  child: Text(context.tr(AppKeys.close), style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({required String title, required String body}) {
    return Container(
      padding: EdgeInsets.all(12.r),
      decoration: BoxDecoration(
        color: AppColors.creamBackground,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: AppColors.borderWarm),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          SizedBox(height: 6.h),
          Text(body, style: TextStyle(fontSize: 11.sp, height: 1.5, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

