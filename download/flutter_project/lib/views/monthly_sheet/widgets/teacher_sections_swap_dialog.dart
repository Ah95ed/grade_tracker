import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../../controllers/monthly_sheet_controller.dart';
import '../../../controllers/teacher_profile_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/monthly_model.dart';

/// Modal dialog for swapping and reassigning sections between teachers
/// Matches TeacherSectionsSwapModal in Daragat Web App
class TeacherSectionsSwapDialog extends StatefulWidget {
  final MonthlyModel model;

  const TeacherSectionsSwapDialog({super.key, required this.model});

  @override
  State<TeacherSectionsSwapDialog> createState() => _TeacherSectionsSwapDialogState();
}

class _TeacherSectionsSwapDialogState extends State<TeacherSectionsSwapDialog> {
  late List<String> _assignedSections;
  final TextEditingController _newSectionController = TextEditingController();
  final List<String> _defaultSections = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

  @override
  void initState() {
    super.initState();
    _assignedSections = List.from(widget.model.assignedSections);
  }

  @override
  void dispose() {
    _newSectionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MonthlySheetController>();
    final profile = context.watch<TeacherProfileController>().profile;
    final effectiveTeacher = widget.model.teacherName.isNotEmpty
        ? widget.model.teacherName
        : (profile.teacherName.isNotEmpty ? profile.teacherName : 'الأستاذ الحالي');

    // Collect all unique sections that exist across students and other models
    final allKnownSections = <String>{..._defaultSections};
    for (final s in widget.model.students) {
      if (s.section.trim().isNotEmpty) {
        allKnownSections.add(s.section.trim());
      }
    }
    for (final m in controller.models) {
      if (m.gradeLevel == widget.model.gradeLevel) {
        allKnownSections.addAll(m.assignedSections);
      }
    }
    allKnownSections.addAll(_assignedSections);
    final sortedSections = allKnownSections.toList()..sort();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        backgroundColor: const Color(0xFFFAF7EC),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18.r),
          side: const BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
        ),
        insetPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 24.h),
        child: Container(
          width: 480.w,
          padding: EdgeInsets.all(18.r),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: EdgeInsets.all(8.r),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEEF2FF),
                            borderRadius: BorderRadius.circular(10.r),
                            border: Border.all(color: const Color(0xFFC7D2FE)),
                          ),
                          child: Icon(Icons.swap_horiz_rounded, size: 20.r, color: const Color(0xFF4338CA)),
                        ),
                        SizedBox(width: 10.w),
                        Text(
                          'تبديل وتخصيص الشُعب',
                          style: TextStyle(
                            fontSize: 15.sp,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF2F2822),
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: Icon(Icons.close_rounded, size: 20.r, color: Colors.grey.shade600),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                SizedBox(height: 12.h),

                // Info Banner
                Container(
                  padding: EdgeInsets.all(10.r),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12.r),
                    border: Border.all(color: const Color(0xFFE2D9CC)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (widget.model.gradeLevel.isNotEmpty) ...[
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6.r),
                                border: Border.all(color: const Color(0xFFBFDBFE)),
                              ),
                              child: Text(
                                widget.model.gradeLevel,
                                style: TextStyle(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1E40AF),
                                ),
                              ),
                            ),
                            SizedBox(width: 6.w),
                          ],
                          if (widget.model.subject.isNotEmpty) ...[
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD1FAE5),
                                borderRadius: BorderRadius.circular(6.r),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: Text(
                                widget.model.subject,
                                style: TextStyle(
                                  fontSize: 11.sp,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF065F46),
                                ),
                              ),
                            ),
                            SizedBox(width: 6.w),
                          ],
                        ],
                      ),
                      SizedBox(height: 6.h),
                      Row(
                        children: [
                          Icon(Icons.person_rounded, size: 14.r, color: const Color(0xFF4338CA)),
                          SizedBox(width: 4.w),
                          Text(
                            'الأستاذ: $effectiveTeacher',
                            style: TextStyle(
                              fontSize: 11.5.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF3730A3),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 14.h),

                // Section Selection Heading
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'اختر الشُعب التابعة لهذا الأستاذ / الجدول:',
                        style: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF4A3B2C),
                        ),
                      ),
                    ),
                    SizedBox(width: 8.w),
                    InkWell(
                      onTap: () {
                        setState(() {
                          if (_assignedSections.length == sortedSections.length) {
                            _assignedSections.clear();
                          } else {
                            _assignedSections = List.from(sortedSections);
                          }
                        });
                      },
                      child: Text(
                        _assignedSections.length == sortedSections.length ? 'إلغاء الكل' : 'تحديد الكل',
                        style: TextStyle(
                          fontSize: 11.sp,
                          fontWeight: FontWeight.bold,
                          color: AppColors.craftBrown,
                        ),
                      ),
                    ),
                  ],
                ),
              SizedBox(height: 8.h),

              // Section Pills
              Wrap(
                spacing: 8.w,
                runSpacing: 8.h,
                children: sortedSections.map((sec) {
                  final isSelected = _assignedSections.contains(sec);
                  return InkWell(
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _assignedSections.remove(sec);
                        } else {
                          _assignedSections.add(sec);
                        }
                      });
                    },
                    borderRadius: BorderRadius.circular(10.r),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 7.h),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF4338CA) : Colors.white,
                        borderRadius: BorderRadius.circular(10.r),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF3730A3) : const Color(0xFFD8CEBD),
                          width: 1.2,
                        ),
                        boxShadow: [
                          if (isSelected)
                            BoxShadow(
                              color: const Color(0xFF4338CA).withValues(alpha: 0.2),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (isSelected) ...[
                            Icon(Icons.check_rounded, size: 14.r, color: Colors.white),
                            SizedBox(width: 4.w),
                          ],
                          Text(
                            'شعبة $sec',
                            style: TextStyle(
                              fontSize: 11.5.sp,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? Colors.white : const Color(0xFF2F2822),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              SizedBox(height: 12.h),

              // Add custom section input
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _newSectionController,
                      decoration: InputDecoration(
                        hintText: 'إضافة شعبة جديدة (مثلاً: ز أو 1)...',
                        hintStyle: TextStyle(fontSize: 11.sp, color: Colors.grey.shade500),
                        contentPadding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 8.h),
                        isDense: true,
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8.r),
                          borderSide: const BorderSide(color: Color(0xFFD8CEBD)),
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 6.w),
                  ElevatedButton(
                    onPressed: () {
                      final val = _newSectionController.text.trim();
                      if (val.isNotEmpty && !_assignedSections.contains(val)) {
                        setState(() {
                          _assignedSections.add(val);
                          _newSectionController.clear();
                        });
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4338CA),
                      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                    ),
                    child: const Text('إضافة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              SizedBox(height: 18.h),

              // Footer Actions
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text('إلغاء', style: TextStyle(fontSize: 12.sp, color: Colors.grey.shade700)),
                  ),
                  SizedBox(width: 8.w),
                  ElevatedButton.icon(
                    onPressed: () async {
                      final updated = widget.model.copyWith(assignedSections: _assignedSections);
                      await controller.updateModel(updated);
                      if (context.mounted) {
                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              _assignedSections.isEmpty
                                  ? 'تم ضبط التعيين لجميع الشُعب'
                                  : 'تم حفظ تعيين الشُعب: ${_assignedSections.join('، ')}',
                            ),
                            backgroundColor: const Color(0xFF4338CA),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    },
                    icon: const Icon(Icons.check_rounded, color: Colors.white, size: 16),
                    label: Text(
                      'حفظ التوزيع',
                      style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4338CA),
                      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
}
