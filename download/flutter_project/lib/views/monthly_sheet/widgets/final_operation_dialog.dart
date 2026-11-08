import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../../controllers/monthly_sheet_controller.dart';
import '../../../models/final_score_operation.dart';
import '../../common/custom_button.dart';

/// Comprehensive modal dialog for Final Score Mathematical Operations (÷, ×, +, -)
/// Completely matching the Daragat Web App (FinalScoreOperationModal.tsx)
class FinalOperationDialog extends StatefulWidget {
  const FinalOperationDialog({super.key});

  @override
  State<FinalOperationDialog> createState() => _FinalOperationDialogState();
}

class _FinalOperationDialogState extends State<FinalOperationDialog> {
  late String _selectedType;
  late double _value;
  late final TextEditingController _customValController;
  late final TextEditingController _testScoreController;
  String _applyScope = 'current_only'; // 'current_only' | 'same_grade_subject'

  @override
  void initState() {
    super.initState();
    final model = context.read<MonthlySheetController>().currentModel;
    final currentOp = model?.finalScoreOperation ?? const FinalScoreOperation();
    _selectedType = currentOp.type;
    _value = currentOp.value > 0 ? currentOp.value : 2.0;

    _customValController = TextEditingController(
      text: _value.toString().replaceAll(RegExp(r'\.0$'), ''),
    );

    final totalMax = model?.totalMaxScore ?? 100.0;
    _testScoreController = TextEditingController(
      text: (totalMax * 0.8).round().toString(),
    );
  }

  @override
  void dispose() {
    _customValController.dispose();
    _testScoreController.dispose();
    super.dispose();
  }

  void _onTypeSelected(String type, List<double> presets) {
    setState(() {
      _selectedType = type;
      if (presets.isNotEmpty && !presets.contains(_value)) {
        _value = presets.first;
        _customValController.text = _value.toString().replaceAll(RegExp(r'\.0$'), '');
      } else if (type == 'none') {
        _value = 1.0;
        _customValController.text = '1';
      }
    });
  }

  void _onPresetSelected(double preset) {
    setState(() {
      _value = preset;
      _customValController.text = preset.toString().replaceAll(RegExp(r'\.0$'), '');
    });
  }

  void _onCustomValChanged(String valStr) {
    final parsed = double.tryParse(valStr.trim());
    if (parsed != null && parsed > 0) {
      setState(() {
        _value = parsed;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final model = controller.currentModel;

    if (model == null) {
      return const SizedBox.shrink();
    }

    final double totalMax = model.totalMaxScore > 0 ? model.totalMaxScore : 100.0;
    final double safeVal = _value > 0 ? _value : 1.0;
    final double testScore = double.tryParse(_testScoreController.text.trim()) ?? 0.0;

    // Calculate live preview outputs
    double previewResult = testScore;
    double effectiveMax = totalMax;
    String formulaDesc = 'بدون أي عملية حسابية (الدرجة الأصلية)';

    final safeValStr = safeVal.toString().replaceAll(RegExp(r'\.0$'), '');

    if (_selectedType == 'divide') {
      previewResult = ((testScore / safeVal) * 100).round() / 100;
      effectiveMax = ((totalMax / safeVal) * 100).round() / 100;
      final effStr = effectiveMax.toString().replaceAll(RegExp(r'\.0$'), '');
      formulaDesc = 'قسمة الدرجة على $safeValStr (المجموع النهائي يصبح من $effStr)';
    } else if (_selectedType == 'multiply') {
      previewResult = ((testScore * safeVal) * 100).round() / 100;
      effectiveMax = ((totalMax * safeVal) * 100).round() / 100;
      final effStr = effectiveMax.toString().replaceAll(RegExp(r'\.0$'), '');
      formulaDesc = 'ضرب الدرجة في $safeValStr (المجموع النهائي يصبح من $effStr)';
    } else if (_selectedType == 'add') {
      previewResult = ((testScore + safeVal) * 100).round() / 100;
      effectiveMax = ((totalMax + safeVal) * 100).round() / 100;
      formulaDesc = 'إضافة $safeValStr درجات إلى المحصلة النهائية';
    } else if (_selectedType == 'subtract') {
      previewResult = (((testScore - safeVal).clamp(0.0, double.infinity)) * 100).round() / 100;
      effectiveMax = (((totalMax - safeVal).clamp(1.0, double.infinity)) * 100).round() / 100;
      formulaDesc = 'طرح / خصم $safeValStr درجات من المحصلة النهائية';
    }

    final effectiveMaxStr = effectiveMax.toString().replaceAll(RegExp(r'\.0$'), '');
    final previewResultStr = previewResult.toString().replaceAll(RegExp(r'\.0$'), '');

    final gradeText = model.gradeLevel.isNotEmpty ? 'الصف: ${model.gradeLevel}' : 'الصف الحالي';
    final subjectText = model.subject.isNotEmpty ? 'المادة: ${model.subject}' : 'المادة الحالية';

    final hasExistingOp = model.finalScoreOperation.hasOperation;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        insetPadding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 20.h),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.r)),
        child: Container(
          constraints: BoxConstraints(maxWidth: 540.w, maxHeight: 760.h),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24.r),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Header Banner matching Web App
              Container(
                padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 14.h),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFF8FAFC), Color(0xFFEFF6FF)],
                    begin: Alignment.centerRight,
                    end: Alignment.centerLeft,
                  ),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
                  border: const Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38.r,
                      height: 38.r,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(12.r),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF2563EB).withValues(alpha: 0.25),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Icon(Icons.calculate_rounded, color: Colors.white, size: 22.r),
                    ),
                    SizedBox(width: 12.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'العمليات الحسابية على الدرجة النهائية',
                            style: TextStyle(
                              fontSize: 14.5.sp,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                          SizedBox(height: 4.h),
                          Wrap(
                            spacing: 6.w,
                            runSpacing: 4.h,
                            children: [
                              _buildHeaderPill(
                                label: gradeText,
                                bgColor: const Color(0xFFDBEAFE),
                                textColor: const Color(0xFF1E40AF),
                              ),
                              _buildHeaderPill(
                                label: subjectText,
                                bgColor: const Color(0xFFE2E8F0),
                                textColor: const Color(0xFF334155),
                              ),
                              _buildHeaderPill(
                                label: model.name,
                                bgColor: const Color(0xFFE0E7FF),
                                textColor: const Color(0xFF3730A3),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                      onPressed: () => Navigator.of(context).pop(),
                      splashRadius: 18.r,
                    ),
                  ],
                ),
              ),

              // 2. Scrollable Body
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 16.h),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Section Prompt
                      Text(
                        'اختر نوع العملية المراد تطبيقها على عنوان الدرجة النهائية:',
                        style: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF334155),
                        ),
                      ),
                      SizedBox(height: 10.h),

                      // Option 1: None (الدرجة الأصلية)
                      _buildOperationCard(
                        type: 'none',
                        title: 'بدون أي عملية (الدرجة الأصلية)',
                        description: 'تبقى الدرجة النهائية كما هي من مجموع التحريري والحقول المضافة بدون أي تعديل',
                        icon: Icons.restart_alt_rounded,
                        iconColor: const Color(0xFF64748B),
                        badgeText: 'الوضع الافتراضي',
                        presets: const [],
                        inputLabel: '',
                      ),
                      SizedBox(height: 8.h),

                      // Option 2: Divide (÷)
                      _buildOperationCard(
                        type: 'divide',
                        title: 'قسمة على عدد (÷)',
                        description: 'مثلاً قسمة الدرجة النهائية على 2 (الدرجة من 100 تصبح من 50 تلقائياً)',
                        icon: Icons.percent_rounded,
                        iconColor: const Color(0xFF2563EB),
                        presets: const [2, 3, 4, 5, 10],
                        inputLabel: 'القسمة على:',
                      ),
                      SizedBox(height: 8.h),

                      // Option 3: Multiply (×)
                      _buildOperationCard(
                        type: 'multiply',
                        title: 'ضرب في عدد (×)',
                        description: 'مضاعفة أو تكبير الدرجة (مثلاً ضرب الدرجة في 2 لتحويلها من 50 إلى 100)',
                        icon: Icons.close_rounded,
                        iconColor: const Color(0xFF4F46E5),
                        presets: const [2, 1.5, 3, 4, 5],
                        inputLabel: 'الضرب في:',
                      ),
                      SizedBox(height: 8.h),

                      // Option 4: Add (+)
                      _buildOperationCard(
                        type: 'add',
                        title: 'جمع / إضافة درجات (+)',
                        description: 'إضافة درجات نشاط أو مكافأة أو حضور إلى المحصلة النهائية للطلاب',
                        icon: Icons.add_rounded,
                        iconColor: const Color(0xFF059669),
                        presets: const [1, 2, 5, 10],
                        inputLabel: 'إضافة عدد:',
                      ),
                      SizedBox(height: 8.h),

                      // Option 5: Subtract (-)
                      _buildOperationCard(
                        type: 'subtract',
                        title: 'طرح / خصم درجات (-)',
                        description: 'خصم نقاط معينة من الدرجة النهائية لجميع الطلاب',
                        icon: Icons.remove_rounded,
                        iconColor: const Color(0xFFE11D48),
                        presets: const [1, 2, 5, 10],
                        inputLabel: 'خصم عدد:',
                      ),
                      SizedBox(height: 16.h),

                      // 3. Interactive Live Calculation Preview matching web
                      Container(
                        padding: EdgeInsets.all(14.r),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFF8FAFC), Color(0xFFEFF6FF)],
                            begin: Alignment.topRight,
                            end: Alignment.bottomLeft,
                          ),
                          borderRadius: BorderRadius.circular(16.r),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Wrap(
                              alignment: WrapAlignment.spaceBetween,
                              runAlignment: WrapAlignment.center,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8.w,
                              runSpacing: 4.h,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.auto_awesome_rounded, color: const Color(0xFF2563EB), size: 16.r),
                                    SizedBox(width: 6.w),
                                    Text(
                                      'معاينة حيّة للنتيجة (جرّب درجات طلابك):',
                                      style: TextStyle(
                                        fontSize: 11.5.sp,
                                        fontWeight: FontWeight.w900,
                                        color: const Color(0xFF1E3A8A),
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  'المجموع الكامل: ${totalMax.toInt()} ➔ المحصلة: $effectiveMaxStr',
                                  style: TextStyle(
                                    fontSize: 10.5.sp,
                                    fontWeight: FontWeight.bold,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 10.h),

                            // Comparison Cards
                            Row(
                              children: [
                                // Input Box
                                Expanded(
                                  child: Container(
                                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12.r),
                                      border: Border.all(color: const Color(0xFFCBD5E1)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'درجة الطالب قبل العملية (من ${totalMax.toInt()}):',
                                          style: TextStyle(
                                            fontSize: 10.sp,
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFF64748B),
                                          ),
                                        ),
                                        SizedBox(height: 4.h),
                                        TextFormField(
                                          controller: _testScoreController,
                                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                          textAlign: TextAlign.center,
                                          onChanged: (_) => setState(() {}),
                                          style: TextStyle(
                                            fontSize: 14.sp,
                                            fontWeight: FontWeight.w900,
                                            color: const Color(0xFF1E293B),
                                          ),
                                          decoration: InputDecoration(
                                            isDense: true,
                                            filled: true,
                                            fillColor: const Color(0xFFF8FAFC),
                                            contentPadding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 6.h),
                                            border: OutlineInputBorder(
                                              borderRadius: BorderRadius.circular(8.r),
                                              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                SizedBox(width: 8.w),

                                // Output Box
                                Expanded(
                                  child: Container(
                                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDBEAFE).withValues(alpha: 0.4),
                                      borderRadius: BorderRadius.circular(12.r),
                                      border: Border.all(color: const Color(0xFF93C5FD)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'الدرجة النهائية بعد العملية:',
                                          style: TextStyle(
                                            fontSize: 10.sp,
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFF1E40AF),
                                          ),
                                        ),
                                        SizedBox(height: 4.h),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          crossAxisAlignment: CrossAxisAlignment.baseline,
                                          textBaseline: TextBaseline.alphabetic,
                                          children: [
                                            Text(
                                              previewResultStr,
                                              style: TextStyle(
                                                fontSize: 18.sp,
                                                fontWeight: FontWeight.w900,
                                                color: const Color(0xFF1D4ED8),
                                              ),
                                            ),
                                            SizedBox(width: 4.w),
                                            Text(
                                              'من $effectiveMaxStr',
                                              style: TextStyle(
                                                fontSize: 11.sp,
                                                fontWeight: FontWeight.bold,
                                                color: const Color(0xFF64748B),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 8.h),

                            // Footnote explanation
                            Text(
                              '💡 $formulaDesc',
                              style: TextStyle(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF475569),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 14.h),

                      // 4. Application Scope Selection Box
                      Container(
                        padding: EdgeInsets.all(12.r),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16.r),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'نطاق تطبيق العملية الحسابية:',
                              style: TextStyle(
                                fontSize: 12.sp,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF1E293B),
                              ),
                            ),
                            SizedBox(height: 8.h),

                            // Scope 1: Current table only
                            _buildScopeOption(
                              scopeKey: 'current_only',
                              title: 'تطبيق على هذا الجدول فقط (الافتراضي والموصى به)',
                              subtitle:
                                  'خاص بـ: $gradeText - $subjectText - ${model.name}. لن تتأثر أي صفوف أخرى أو مواد أخرى أو شهور أخرى.',
                            ),
                            SizedBox(height: 6.h),

                            // Scope 2: Same grade and subject months
                            _buildScopeOption(
                              scopeKey: 'same_grade_subject',
                              title: 'تطبيق على شهور نفس المادة والصف فقط ($subjectText - $gradeText)',
                              subtitle:
                                  'يُطبق حصراً على شهور نفس الصف والمادة ولا يمس أي صفوف دراسية أخرى أو مواد أخرى في الدفتر.',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 5. Footer Actions
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 12.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
                  border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                ),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  runAlignment: WrapAlignment.center,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8.w,
                  runSpacing: 8.h,
                  children: [
                    // Reset Button (if active)
                    if (hasExistingOp)
                      InkWell(
                        onTap: () {
                          controller.setFinalScoreOperation(
                            const FinalScoreOperation(type: 'none', value: 1.0),
                            applyToSameGradeAndSubject: _applyScope == 'same_grade_subject',
                          );
                          Navigator.of(context).pop();
                        },
                        borderRadius: BorderRadius.circular(10.r),
                        child: Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 6.h),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.restart_alt_rounded, size: 16.r, color: const Color(0xFFE11D48)),
                              SizedBox(width: 4.w),
                              Text(
                                'إلغاء العملية الحسابية',
                                style: TextStyle(
                                  fontSize: 11.5.sp,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFFE11D48),
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      const SizedBox.shrink(),

                    // Action Buttons
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CustomButton(
                          label: 'إلغاء',
                          isOutlined: true,
                          textColor: const Color(0xFF64748B),
                          borderColor: const Color(0xFFCBD5E1),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                        SizedBox(width: 8.w),
                        CustomButton(
                          label: 'حفظ وتطبيق',
                          icon: Icons.check_rounded,
                          backgroundColor: const Color(0xFF2563EB),
                          onPressed: () {
                            final finalOp = FinalScoreOperation(
                              type: _selectedType,
                              value: _selectedType == 'none' ? 1.0 : safeVal,
                            );
                            controller.setFinalScoreOperation(
                              finalOp,
                              applyToSameGradeAndSubject: _applyScope == 'same_grade_subject',
                            );
                            Navigator.of(context).pop();
                          },
                        ),
                      ],
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

  Widget _buildHeaderPill({
    required String label,
    required Color bgColor,
    required Color textColor,
  }) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6.r),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10.sp,
          fontWeight: FontWeight.bold,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildOperationCard({
    required String type,
    required String title,
    required String description,
    required IconData icon,
    required Color iconColor,
    required List<double> presets,
    required String inputLabel,
    String? badgeText,
  }) {
    final isSelected = _selectedType == type;

    return InkWell(
      onTap: () => _onTypeSelected(type, presets),
      borderRadius: BorderRadius.circular(16.r),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: EdgeInsets.all(12.r),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(
            color: isSelected ? const Color(0xFF3B82F6) : const Color(0xFFE2E8F0),
            width: isSelected ? 1.5 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF3B82F6).withValues(alpha: 0.08),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Operation Icon Box
                Container(
                  width: 34.r,
                  height: 34.r,
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.white : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10.r),
                    border: Border.all(
                      color: isSelected ? const Color(0xFFE2E8F0) : Colors.transparent,
                    ),
                  ),
                  child: Icon(icon, color: iconColor, size: 18.r),
                ),
                SizedBox(width: 10.w),

                // Title + Description
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 6.w,
                        runSpacing: 2.h,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            title,
                            style: TextStyle(
                              fontSize: 12.5.sp,
                              fontWeight: FontWeight.w900,
                              color: isSelected ? const Color(0xFF1E40AF) : const Color(0xFF1E293B),
                            ),
                          ),
                          if (badgeText != null)
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 1.5.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE2E8F0),
                                borderRadius: BorderRadius.circular(10.r),
                              ),
                              child: Text(
                                badgeText,
                                style: TextStyle(
                                  fontSize: 9.sp,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF475569),
                                ),
                              ),
                            ),
                        ],
                      ),
                      SizedBox(height: 3.h),
                      Text(
                        description,
                        style: TextStyle(
                          fontSize: 10.5.sp,
                          color: const Color(0xFF64748B),
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),

                // Radio Indicator
                Container(
                  width: 18.r,
                  height: 18.r,
                  margin: EdgeInsets.only(top: 2.h),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isSelected ? const Color(0xFF2563EB) : Colors.white,
                    border: Border.all(
                      color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                      width: 2,
                    ),
                  ),
                  child: isSelected
                      ? Icon(Icons.check, size: 12.r, color: Colors.white)
                      : null,
                ),
              ],
            ),

            // Expanded Controls when Selected and type != 'none'
            if (isSelected && type != 'none') ...[
              SizedBox(height: 10.h),
              Divider(color: const Color(0xFFE2E8F0), height: 1.h),
              SizedBox(height: 8.h),
              Wrap(
                spacing: 6.w,
                runSpacing: 6.h,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    inputLabel,
                    style: TextStyle(
                      fontSize: 11.5.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF334155),
                    ),
                  ),

                  // Preset Buttons
                  ...presets.map((preset) {
                    final isPresetActive = _value == preset;
                    final presetStr = preset.toString().replaceAll(RegExp(r'\.0$'), '');
                    return InkWell(
                      onTap: () => _onPresetSelected(preset),
                      borderRadius: BorderRadius.circular(8.r),
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                        decoration: BoxDecoration(
                          color: isPresetActive ? const Color(0xFF2563EB) : Colors.white,
                          borderRadius: BorderRadius.circular(8.r),
                          border: Border.all(
                            color: isPresetActive ? const Color(0xFF1D4ED8) : const Color(0xFFCBD5E1),
                          ),
                        ),
                        child: Text(
                          presetStr,
                          style: TextStyle(
                            fontSize: 11.sp,
                            fontWeight: FontWeight.w900,
                            color: isPresetActive ? Colors.white : const Color(0xFF334155),
                          ),
                        ),
                      ),
                    );
                  }),

                  // Custom Input
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'أو رقم مخصص:',
                        style: TextStyle(
                          fontSize: 10.5.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                      SizedBox(width: 4.w),
                      SizedBox(
                        width: 60.w,
                        child: TextFormField(
                          controller: _customValController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          textAlign: TextAlign.center,
                          onChanged: _onCustomValChanged,
                          style: TextStyle(
                            fontSize: 12.sp,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF1E293B),
                          ),
                          decoration: InputDecoration(
                            isDense: true,
                            filled: true,
                            fillColor: Colors.white,
                            contentPadding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 5.h),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8.r),
                              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildScopeOption({
    required String scopeKey,
    required String title,
    required String subtitle,
  }) {
    final isSelected = _applyScope == scopeKey;

    return InkWell(
      onTap: () => setState(() => _applyScope = scopeKey),
      borderRadius: BorderRadius.circular(12.r),
      child: Container(
        padding: EdgeInsets.all(10.r),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(
            color: isSelected ? const Color(0xFF3B82F6) : const Color(0xFFE2E8F0),
            width: isSelected ? 1.4 : 1.0,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.only(top: 2.h),
              child: Icon(
                isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF94A3B8),
                size: 16.r,
              ),
            ),
            SizedBox(width: 8.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.w900,
                      color: isSelected ? const Color(0xFF1E40AF) : const Color(0xFF1E293B),
                    ),
                  ),
                  SizedBox(height: 2.h),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10.sp,
                      color: const Color(0xFF64748B),
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
