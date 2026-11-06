import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'widgets/model_selector_bar.dart';
import 'widgets/sheet_toolbar.dart';
import 'widgets/student_data_table.dart';

/// Main View for the Monthly Sheet Module (Tab 1: الجدول)
class MonthlySheetView extends StatelessWidget {
  const MonthlySheetView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.only(bottom: 24.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(height: 8.h),
          const ModelSelectorBar(),
          const SheetToolbar(),
          const StudentDataTable(),
        ],
      ),
    );
  }
}

