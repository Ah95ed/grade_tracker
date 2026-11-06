import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import 'widgets/term_selector_bar.dart';
import 'widgets/term_summary_table.dart';

/// Main View for the Term Calculation Module (Tab 2: المعدل)
class TermCalculationView extends StatelessWidget {
  const TermCalculationView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.only(bottom: 24.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(height: 8.h),
          const TermSelectorBar(),
          SizedBox(height: 10.h),
          const TermSummaryTable(),
        ],
      ),
    );
  }
}
