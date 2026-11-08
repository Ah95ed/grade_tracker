import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/custom_column.dart';
import '../../common/custom_button.dart';

/// Upgraded Add Column Dialog strictly matching the user specifications & Daragat Web App
class AddColumnDialog extends StatefulWidget {
  const AddColumnDialog({super.key});

  @override
  State<AddColumnDialog> createState() => _AddColumnDialogState();
}

class _AddColumnDialogState extends State<AddColumnDialog> {
  final _nameController = TextEditingController();
  final _maxScoreController = TextEditingController(text: '20');

  bool _isAttendance = false;
  bool _affectsGrade = true;
  String _selectedPresetName = '';

  static const List<Map<String, dynamic>> _presets = [
    {'name': 'درجة الشفهي', 'max': 20.0},
    {'name': 'المشاركة والنشاط', 'max': 10.0},
    {'name': 'الواجبات اليومية', 'max': 10.0},
    {'name': 'السلوك والمواظبة', 'max': 10.0},
  ];

  static const List<double> _quickScores = [5, 10, 15, 20, 25, 30, 40, 50];

  @override
  void dispose() {
    _nameController.dispose();
    _maxScoreController.dispose();
    super.dispose();
  }

  void _applyStandardPreset(String name, double maxScore) {
    setState(() {
      _isAttendance = false;
      _selectedPresetName = name;
      _nameController.text = name;
      _maxScoreController.text = maxScore.toInt().toString();
    });
  }

  void _applyAttendancePreset() {
    setState(() {
      _isAttendance = true;
      _selectedPresetName = 'الغياب والحضور';
      _nameController.text = 'الغياب والحضور';
      _maxScoreController.text = '10';
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final model = controller.currentModel;

    final double totalMax = model?.totalMaxScore ?? 100.0;
    final double existingCustomSum = (model?.customColumns ?? [])
        .where((c) => !c.isAttendance || c.affectsGrade)
        .fold<double>(0.0, (sum, c) => sum + c.maxScore);

    final double enteredScore = _isAttendance && !_affectsGrade
        ? 0.0
        : (double.tryParse(_maxScoreController.text.trim()) ?? 0.0);

    final double remainingForWritten = (totalMax - existingCustomSum - enteredScore).clamp(0.0, totalMax);
    final double currentWrittenWeight = (totalMax - existingCustomSum).clamp(0.0, totalMax);
    final int writtenPercentage = totalMax > 0 ? ((remainingForWritten / totalMax) * 100).round() : 100;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        insetPadding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 20.h),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
        child: Container(
          constraints: BoxConstraints(maxWidth: 500.w, maxHeight: 720.h),
          decoration: BoxDecoration(
            color: const Color(0xFFFAF7EC), // Craft cream parchment
            borderRadius: BorderRadius.circular(20.r),
            border: Border.all(color: const Color(0xFFD8CEBD), width: 1.2),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Header Banner matching Web App
              Container(
                padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 14.h),
                decoration: BoxDecoration(
                  color: const Color(0xFF5692BE), // Sky Slate Blue
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.tune_rounded, color: const Color(0xFFFDE68A), size: 20.r),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Text(
                        'إضافة حقل درجة جديد للجدول',
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white70),
                      onPressed: () => Navigator.of(context).pop(),
                      splashRadius: 18.r,
                    ),
                  ],
                ),
              ),

              // 2. Scrollable Body
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Score Distribution Overview Box matching web layout
                      Container(
                        padding: EdgeInsets.all(12.r),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Flexible(
                                  child: Text(
                                    'إجمالي الدرجة النهائية للمادة:',
                                    style: TextStyle(
                                      fontSize: 12.sp,
                                      fontWeight: FontWeight.bold,
                                      color: const Color(0xFF1E3A8A),
                                    ),
                                  ),
                                ),
                                SizedBox(width: 8.w),
                                Text(
                                  '${totalMax.toInt()} درجة',
                                  style: TextStyle(
                                    fontSize: 14.sp,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF2B6CB0),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 4.h),
                            Text(
                              'الحصة الحالية للتحريري: ${currentWrittenWeight.toInt()} = ${totalMax.toInt()}.',
                              style: TextStyle(
                                fontSize: 11.5.sp,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1E40AF),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 14.h),

                      // Presets Section matching exact prompt
                      Text(
                        'حقول مقترحة وشائعة (انقر لاختيار الاسم وتحديد درجته بالأسفل):',
                        style: TextStyle(
                          fontSize: 11.5.sp,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF475569),
                        ),
                      ),
                      SizedBox(height: 8.h),
                      Wrap(
                        spacing: 7.w,
                        runSpacing: 7.h,
                        children: [
                          ..._presets.map((preset) {
                            final name = preset['name'] as String;
                            final max = preset['max'] as double;
                            final isSelected = !_isAttendance && _selectedPresetName == name;
                            return InkWell(
                              onTap: () => _applyStandardPreset(name, max),
                              borderRadius: BorderRadius.circular(8.r),
                              child: Container(
                                padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                                decoration: BoxDecoration(
                                  color: isSelected ? const Color(0xFF2B6CB0) : Colors.white,
                                  borderRadius: BorderRadius.circular(8.r),
                                  border: Border.all(
                                    color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFFCBD5E1),
                                    width: isSelected ? 1.4 : 1.0,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.04),
                                      blurRadius: 3,
                                      offset: const Offset(0, 1),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.add,
                                      size: 13.r,
                                      color: isSelected ? Colors.white : const Color(0xFF2B6CB0),
                                    ),
                                    SizedBox(width: 4.w),
                                    Text(
                                      name,
                                      style: TextStyle(
                                        fontSize: 11.5.sp,
                                        fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                                        color: isSelected ? Colors.white : const Color(0xFF1E293B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),

                          // Special Attendance Preset Button
                          InkWell(
                            onTap: _applyAttendancePreset,
                            borderRadius: BorderRadius.circular(8.r),
                            child: Container(
                              padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                              decoration: BoxDecoration(
                                color: _isAttendance ? const Color(0xFF2D5A43) : const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(8.r),
                                border: Border.all(
                                  color: _isAttendance ? const Color(0xFF224432) : const Color(0xFFA7F3D0),
                                  width: _isAttendance ? 1.4 : 1.0,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.calendar_month_rounded,
                                    size: 13.r,
                                    color: _isAttendance ? Colors.white : const Color(0xFF059669),
                                  ),
                                  SizedBox(width: 4.w),
                                  Text(
                                    'الغياب والحضور',
                                    style: TextStyle(
                                      fontSize: 11.5.sp,
                                      fontWeight: FontWeight.w900,
                                      color: _isAttendance ? Colors.white : const Color(0xFF065F46),
                                    ),
                                  ),
                                  SizedBox(width: 5.w),
                                  Container(
                                    padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
                                    decoration: BoxDecoration(
                                      color: _isAttendance
                                          ? Colors.white.withValues(alpha: 0.25)
                                          : const Color(0xFFA7F3D0),
                                      borderRadius: BorderRadius.circular(4.r),
                                    ),
                                    child: Text(
                                      'خاص',
                                      style: TextStyle(
                                        fontSize: 9.5.sp,
                                        fontWeight: FontWeight.w900,
                                        color: _isAttendance ? Colors.white : const Color(0xFF064E3B),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 16.h),

                      // Input 1: Field Name
                      Text(
                        'اسم الحقل الجديد',
                        style: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF334155),
                        ),
                      ),
                      SizedBox(height: 5.h),
                      TextFormField(
                        controller: _nameController,
                        onChanged: (_) => setState(() {}),
                        style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold),
                        decoration: InputDecoration(
                          hintText: 'مثلا (درجة الشفهي)',
                          hintStyle: TextStyle(fontSize: 12.sp, color: const Color(0xFF94A3B8)),
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 10.h),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10.r),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10.r),
                            borderSide: const BorderSide(color: Color(0xFF2B6CB0), width: 1.5),
                          ),
                        ),
                      ),
                      SizedBox(height: 14.h),

                      // Input 2: Max Score
                      if (!_isAttendance || _affectsGrade) ...[
                        Text(
                          'الدرجة الكاملة لهذا الحقل (يمكنك تعديلها وتحديدها هنا):',
                          style: TextStyle(
                            fontSize: 12.sp,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF334155),
                          ),
                        ),
                        SizedBox(height: 6.h),
                        Wrap(
                          spacing: 10.w,
                          runSpacing: 8.h,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SizedBox(
                                  width: 95.w,
                                  child: TextFormField(
                                    controller: _maxScoreController,
                                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                    textAlign: TextAlign.center,
                                    onChanged: (_) => setState(() {}),
                                    style: TextStyle(
                                      fontSize: 16.sp,
                                      fontWeight: FontWeight.w900,
                                      color: const Color(0xFF1E293B),
                                    ),
                                    decoration: InputDecoration(
                                      filled: true,
                                      fillColor: Colors.white,
                                      contentPadding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(10.r),
                                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(10.r),
                                        borderSide: const BorderSide(color: Color(0xFF2B6CB0), width: 1.5),
                                      ),
                                    ),
                                  ),
                                ),
                                SizedBox(width: 8.w),
                                Text(
                                  'درجة.',
                                  style: TextStyle(
                                    fontSize: 13.sp,
                                    fontWeight: FontWeight.bold,
                                    color: const Color(0xFF475569),
                                  ),
                                ),
                              ],
                            ),
                            Wrap(
                              spacing: 5.w,
                              runSpacing: 4.h,
                              children: _quickScores.map((score) {
                                final isCurrent = _maxScoreController.text.trim() == score.toInt().toString();
                                return InkWell(
                                  onTap: () {
                                    setState(() {
                                      _maxScoreController.text = score.toInt().toString();
                                    });
                                  },
                                  borderRadius: BorderRadius.circular(6.r),
                                  child: Container(
                                    padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 3.h),
                                    decoration: BoxDecoration(
                                      color: isCurrent ? const Color(0xFF2B6CB0) : Colors.white,
                                      borderRadius: BorderRadius.circular(6.r),
                                      border: Border.all(
                                        color: isCurrent ? const Color(0xFF1D4ED8) : const Color(0xFFCBD5E1),
                                      ),
                                    ),
                                    child: Text(
                                      '${score.toInt()}',
                                      style: TextStyle(
                                        fontSize: 10.5.sp,
                                        fontWeight: FontWeight.bold,
                                        color: isCurrent ? Colors.white : const Color(0xFF1E293B),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                        SizedBox(height: 10.h),

                        // Dynamic live calculation feedback banner matching web
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                          decoration: BoxDecoration(
                            color: remainingForWritten >= 0 ? const Color(0xFFECFDF5) : const Color(0xFFFFF1F2),
                            borderRadius: BorderRadius.circular(10.r),
                            border: Border.all(
                              color: remainingForWritten >= 0 ? const Color(0xFFA7F3D0) : const Color(0xFFFECDD3),
                            ),
                          ),
                          child: Text(
                            remainingForWritten >= 0
                                ? '✓ عند وضع ${enteredScore.toInt()} درجة لهذا الحقل: ستُحتسب درجة التحريري تلقائياً من ${remainingForWritten.toInt()} ($writtenPercentage% من الدرجة النهائية) دون الحاجة لإدخال أي نسبة!'
                                : '⚠️ تنبيه: وضع ${enteredScore.toInt()} درجة سيتجاوز سقف الدرجة النهائية بـ ${(enteredScore + existingCustomSum - totalMax).toInt()} درجات زائدة.',
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.w700,
                              color: remainingForWritten >= 0 ? const Color(0xFF065F46) : const Color(0xFF9F1239),
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],

                      // Special Attendance Options
                      if (_isAttendance) ...[
                        SizedBox(height: 14.h),
                        Container(
                          padding: EdgeInsets.all(12.r),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12.r),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'هل يؤثر حقل الحضور والغياب على الدرجة النهائية للطالب؟',
                                style: TextStyle(
                                  fontSize: 11.5.sp,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF1E293B),
                                ),
                              ),
                              SizedBox(height: 8.h),
                              Row(
                                children: [
                                  Expanded(
                                    child: InkWell(
                                      onTap: () => setState(() => _affectsGrade = true),
                                      borderRadius: BorderRadius.circular(8.r),
                                      child: Container(
                                        padding: EdgeInsets.all(8.r),
                                        decoration: BoxDecoration(
                                          color: _affectsGrade ? const Color(0xFFECFDF5) : const Color(0xFFF8FAFC),
                                          borderRadius: BorderRadius.circular(8.r),
                                          border: Border.all(
                                            color: _affectsGrade ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                                            width: _affectsGrade ? 1.5 : 1.0,
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'نعم، يؤثر على الدرجة',
                                              style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.w900, color: const Color(0xFF065F46)),
                                            ),
                                            Text(
                                              'خصم أو إضافة من الدرجة',
                                              style: TextStyle(fontSize: 9.5.sp, color: const Color(0xFF64748B)),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                  SizedBox(width: 8.w),
                                  Expanded(
                                    child: InkWell(
                                      onTap: () => setState(() => _affectsGrade = false),
                                      borderRadius: BorderRadius.circular(8.r),
                                      child: Container(
                                        padding: EdgeInsets.all(8.r),
                                        decoration: BoxDecoration(
                                          color: !_affectsGrade ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
                                          borderRadius: BorderRadius.circular(8.r),
                                          border: Border.all(
                                            color: !_affectsGrade ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                                            width: !_affectsGrade ? 1.5 : 1.0,
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'لا، توثيق وحفظ فقط',
                                              style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.w900, color: const Color(0xFF1E40AF)),
                                            ),
                                            Text(
                                              'تسجيل التواريخ دون درجات',
                                              style: TextStyle(fontSize: 9.5.sp, color: const Color(0xFF64748B)),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // 3. Footer Actions
              Container(
                padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 12.h),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F4EA),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(20.r)),
                  border: const Border(top: BorderSide(color: Color(0xFFE0D5C3))),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    CustomButton(
                      label: 'إلغاء',
                      isOutlined: true,
                      textColor: AppColors.textSecondary,
                      borderColor: const Color(0xFFCBD5E1),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                    SizedBox(width: 10.w),
                    CustomButton(
                      label: 'إضافة الحقل للجدول',
                      backgroundColor: const Color(0xFF2B6CB0),
                      onPressed: () {
                        final name = _nameController.text.trim();
                        if (name.isEmpty) return;

                        final maxScore = _isAttendance
                            ? 0.0
                            : (double.tryParse(_maxScoreController.text.trim()) ?? 20.0);
                        final newCol = CustomColumn(
                          id: 'col_${DateTime.now().millisecondsSinceEpoch}',
                          name: name,
                          maxScore: maxScore,
                          isAttendance: _isAttendance,
                          affectsGrade: _affectsGrade,
                        );

                        controller.addColumn(newCol);
                        Navigator.of(context).pop();
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
