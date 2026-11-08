import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';

import '../../controllers/teacher_profile_controller.dart';
import '../../models/teacher_profile.dart';

/// نافذة إعدادات المعلم والمدرسة / الجامعة المتطابقة بصرياً ووظيفياً مع TeacherSettingsModal.tsx
class TeacherProfileDialog extends StatefulWidget {
  const TeacherProfileDialog({super.key});

  @override
  State<TeacherProfileDialog> createState() => _TeacherProfileDialogState();
}

class _TeacherProfileDialogState extends State<TeacherProfileDialog> {
  late String _institutionType;
  late final TextEditingController _nameController;
  late final TextEditingController _schoolController;
  late final TextEditingController _universityController;
  late final TextEditingController _collegeController;
  late final TextEditingController _departmentController;
  late final TextEditingController _subjectController;
  late final TextEditingController _yearController;
  late final TextEditingController _govController;
  String _schoolLogo = '';

  @override
  void initState() {
    super.initState();
    final profile = context.read<TeacherProfileController>().profile;
    _institutionType = profile.institutionType.isNotEmpty ? profile.institutionType : 'school';
    _nameController = TextEditingController(text: profile.teacherName);
    _schoolController = TextEditingController(text: profile.schoolName);
    _universityController = TextEditingController(text: profile.universityName);
    _collegeController = TextEditingController(text: profile.collegeName);
    _departmentController = TextEditingController(text: profile.departmentName);
    _subjectController = TextEditingController(text: profile.subject);
    _yearController = TextEditingController(text: profile.academicYear.isNotEmpty ? profile.academicYear : '2024 - 2025');
    _govController = TextEditingController(text: profile.governorate);
    _schoolLogo = profile.schoolLogo;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _schoolController.dispose();
    _universityController.dispose();
    _collegeController.dispose();
    _departmentController.dispose();
    _subjectController.dispose();
    _yearController.dispose();
    _govController.dispose();
    super.dispose();
  }

  bool get _isUniversity => _institutionType == 'university';

  Future<void> _pickLogoImage() async {
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
      );

      if (files.isNotEmpty) {
        final file = files.first;
        final bytes = await file.xFile.readAsBytes();
        final base64String = base64Encode(bytes);
        final ext = file.extension?.toLowerCase() ?? 'png';
        final mime = ext == 'svg' ? 'image/svg+xml' : 'image/$ext';
        setState(() {
          _schoolLogo = 'data:$mime;base64,$base64String';
        });
      }
    } catch (e) {
      debugPrint('Error picking logo: $e');
    }
  }

  void _removeLogo() {
    setState(() {
      _schoolLogo = '';
    });
  }

  void _saveProfile() {
    String finalSchool = _schoolController.text.trim();
    if (_isUniversity) {
      final parts = [
        _universityController.text.trim(),
        _collegeController.text.trim(),
        _departmentController.text.trim(),
      ].where((s) => s.isNotEmpty).toList();
      if (parts.isNotEmpty) {
        finalSchool = parts.join(' - ');
      }
    }

    final updated = TeacherProfile(
      institutionType: _institutionType,
      teacherName: _nameController.text.trim(),
      schoolName: finalSchool,
      universityName: _universityController.text.trim(),
      collegeName: _collegeController.text.trim(),
      departmentName: _departmentController.text.trim(),
      subject: _subjectController.text.trim(),
      academicYear: _yearController.text.trim().isNotEmpty ? _yearController.text.trim() : '2024 - 2025',
      governorate: _govController.text.trim(),
      schoolLogo: _schoolLogo,
    );

    context.read<TeacherProfileController>().updateProfile(updated);
    Navigator.of(context).pop();
  }

  Widget _buildLogoPreview() {
    if (_schoolLogo.isEmpty) {
      return Container(
        width: 54.w,
        height: 54.w,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid, width: 1.5),
        ),
        child: const Icon(Icons.image_outlined, color: Color(0xFF94A3B8), size: 26),
      );
    }

    try {
      if (_schoolLogo.startsWith('data:image')) {
        final commaIdx = _schoolLogo.indexOf(',');
        if (commaIdx != -1) {
          final bytes = base64Decode(_schoolLogo.substring(commaIdx + 1));
          return Container(
            width: 54.w,
            height: 54.w,
            padding: EdgeInsets.all(4.r),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
            ),
            child: Image.memory(bytes, fit: BoxFit.contain),
          );
        }
      } else if (_schoolLogo.startsWith('http')) {
        return Container(
          width: 54.w,
          height: 54.w,
          padding: EdgeInsets.all(4.r),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12.r),
            border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
          ),
          child: Image.network(_schoolLogo, fit: BoxFit.contain),
        );
      }
    } catch (_) {}

    return Container(
      width: 54.w,
      height: 54.w,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: const Color(0xFFCBD5E1)),
      ),
      child: const Icon(Icons.broken_image_rounded, color: Colors.grey),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 20.h),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.r)),
      clipBehavior: Clip.antiAlias,
      child: Container(
        width: 520.w,
        constraints: BoxConstraints(maxHeight: 760.h),
        color: Colors.white,
        child: Column(
          children: [
            // 1. Header with Gradient and Icons matching TeacherSettingsModal.tsx
            Container(
              padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 14.h),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: _isUniversity
                      ? const [Color(0xFF1E3A8A), Color(0xFF1D4ED8), Color(0xFF2563EB)]
                      : const [Color(0xFF312E81), Color(0xFF4338CA), Color(0xFF4F46E5)],
                  begin: Alignment.centerRight,
                  end: Alignment.centerLeft,
                ),
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, color: Colors.white70),
                    tooltip: 'إغلاق',
                  ),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _isUniversity ? 'بيانات الأستاذ الجامعي والكلية' : 'بيانات المعلم والمدرسة',
                        style: TextStyle(
                          fontSize: 16.sp,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 2.h),
                      Text(
                        'تظهر هذه البيانات في ترويسة الجداول وكشوفات ونتائج الطلاب',
                        style: TextStyle(
                          fontSize: 10.sp,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(width: 12.w),
                  Container(
                    width: 40.w,
                    height: 40.w,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(12.r),
                    ),
                    child: Icon(
                      _isUniversity ? Icons.school_rounded : Icons.verified_user_rounded,
                      color: Colors.white,
                      size: 22.sp,
                    ),
                  ),
                ],
              ),
            ),

            // 2. Scrollable Body
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.all(20.w),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Segmented Institution Switcher
                    Container(
                      padding: EdgeInsets.all(4.r),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(16.r),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _institutionType = 'school'),
                              borderRadius: BorderRadius.circular(12.r),
                              child: Container(
                                padding: EdgeInsets.symmetric(vertical: 9.h),
                                decoration: BoxDecoration(
                                  color: !_isUniversity ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(12.r),
                                  boxShadow: !_isUniversity
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4, offset: const Offset(0, 2))]
                                      : null,
                                  border: !_isUniversity ? Border.all(color: const Color(0xFF6EE7B7)) : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.domain_rounded, size: 16.sp, color: !_isUniversity ? const Color(0xFF065F46) : const Color(0xFF64748B)),
                                    SizedBox(width: 6.w),
                                    Text(
                                      'تعليم مدرسي (مدرسة / ثانوية)',
                                      style: TextStyle(
                                        fontSize: 11.5.sp,
                                        fontWeight: FontWeight.bold,
                                        color: !_isUniversity ? const Color(0xFF065F46) : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          SizedBox(width: 4.w),
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _institutionType = 'university'),
                              borderRadius: BorderRadius.circular(12.r),
                              child: Container(
                                padding: EdgeInsets.symmetric(vertical: 9.h),
                                decoration: BoxDecoration(
                                  color: _isUniversity ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(12.r),
                                  boxShadow: _isUniversity
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4, offset: const Offset(0, 2))]
                                      : null,
                                  border: _isUniversity ? Border.all(color: const Color(0xFF93C5FD)) : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.school_rounded, size: 16.sp, color: _isUniversity ? const Color(0xFF1E40AF) : const Color(0xFF64748B)),
                                    SizedBox(width: 6.w),
                                    Text(
                                      'تعليم جامعي (كلية / معهد)',
                                      style: TextStyle(
                                        fontSize: 11.5.sp,
                                        fontWeight: FontWeight.bold,
                                        color: _isUniversity ? const Color(0xFF1E40AF) : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 16.h),

                    // Teacher / Professor Name
                    _buildFieldLabel(_isUniversity ? 'اسم الأستاذ الجامعي / التدريسي' : 'اسم المعلم / المدرس'),
                    _buildTextField(
                      controller: _nameController,
                      hint: _isUniversity ? 'مثال: أ.د. فاروق محمد، م.م. سارة أحمد...' : 'اكتب اسم المعلم أو المدرس',
                    ),
                    SizedBox(height: 14.h),

                    // University or School Fields
                    if (_isUniversity) ...[
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildFieldLabel('اسم الجامعة / المعهد'),
                                _buildTextField(controller: _universityController, hint: 'مثال: جامعة بغداد'),
                              ],
                            ),
                          ),
                          SizedBox(width: 10.w),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildFieldLabel('الكلية'),
                                _buildTextField(controller: _collegeController, hint: 'مثال: كلية العلوم'),
                              ],
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 14.h),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildFieldLabel('القسم / الفرع العلمي'),
                                _buildTextField(controller: _departmentController, hint: 'مثال: علوم الحاسوب'),
                              ],
                            ),
                          ),
                          SizedBox(width: 10.w),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildFieldLabel('المادة / المقرر الدراسي'),
                                _buildTextField(controller: _subjectController, hint: 'مثال: هياكل البيانات'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildFieldLabel('اسم المدرسة / الثانوية'),
                                _buildTextField(controller: _schoolController, hint: 'اكتب اسم المدرسة'),
                              ],
                            ),
                          ),
                          SizedBox(width: 10.w),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildFieldLabel('المادة الدراسية'),
                                _buildTextField(controller: _subjectController, hint: 'مثال: الرياضيات، العلوم...'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                    SizedBox(height: 14.h),

                    // Academic Year & Governorate Row
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _buildFieldLabel(_isUniversity ? 'العام الأكاديمي / الجامعي' : 'العام الدراسي'),
                              _buildTextField(
                                controller: _yearController,
                                hint: '2024 - 2025',
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                        SizedBox(width: 10.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _buildFieldLabel(_isUniversity ? 'المحافظة / المدينة' : 'المحافظة / المديرية العامة'),
                              _buildTextField(
                                controller: _govController,
                                hint: _isUniversity ? 'مثال: بغداد، البصرة...' : 'مثال: بغداد / الكرخ...',
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 16.h),

                    // School Logo Section
                    Container(
                      padding: EdgeInsets.all(12.w),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16.r),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              if (_schoolLogo.isNotEmpty)
                                TextButton.icon(
                                  onPressed: _removeLogo,
                                  icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFDC2626), size: 16),
                                  label: const Text('حذف الشعار', style: TextStyle(color: Color(0xFFDC2626), fontSize: 11, fontWeight: FontWeight.bold)),
                                )
                              else
                                const SizedBox.shrink(),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    _isUniversity ? 'شعار الجامعة أو الكلية (اختياري)' : 'شعار المدرسة (اختياري)',
                                    style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                                  ),
                                  Text(
                                    'يُطبع أعلى كشوفات النتائج والشهادات لإضفاء طابع رسمي أنيق',
                                    style: TextStyle(fontSize: 9.5.sp, color: const Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          SizedBox(height: 8.h),
                          Row(
                            children: [
                              _buildLogoPreview(),
                              SizedBox(width: 12.w),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    OutlinedButton.icon(
                                      onPressed: _pickLogoImage,
                                      icon: const Icon(Icons.upload_file_rounded, size: 16, color: Color(0xFF4F46E5)),
                                      label: Text(
                                        _schoolLogo.isNotEmpty ? 'تغيير الشعار' : 'اختيار صورة الشعار',
                                        style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF334155)),
                                      ),
                                      style: OutlinedButton.styleFrom(
                                        backgroundColor: Colors.white,
                                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.r)),
                                      ),
                                    ),
                                    SizedBox(height: 3.h),
                                    Text('صيغ PNG, JPG, WebP أو SVG', style: TextStyle(fontSize: 9.sp, color: const Color(0xFF94A3B8))),
                                  ],
                                ),
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

            // 3. Action Buttons Footer
            Container(
              padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 14.h),
              decoration: const BoxDecoration(
                color: Color(0xFFFAF6EC),
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.symmetric(vertical: 11.h),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                      ),
                      child: Text('إلغاء', style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.bold, color: const Color(0xFF475569))),
                    ),
                  ),
                  SizedBox(width: 12.w),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: _saveProfile,
                      icon: const Icon(Icons.check_rounded, color: Colors.white, size: 18),
                      label: Text('حفظ البيانات والترويسة', style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w900, color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isUniversity ? const Color(0xFF2563EB) : const Color(0xFF4F46E5),
                        padding: EdgeInsets.symmetric(vertical: 11.h),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                        elevation: 1,
                      ),
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

  Widget _buildFieldLabel(String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: 5.h),
      child: Text(
        text,
        textAlign: TextAlign.right,
        style: TextStyle(fontSize: 11.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    TextAlign textAlign = TextAlign.right,
  }) {
    return TextField(
      controller: controller,
      textAlign: textAlign,
      style: TextStyle(fontSize: 12.5.sp, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(fontSize: 11.5.sp, color: const Color(0xFF94A3B8)),
        contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: BorderSide(color: _isUniversity ? const Color(0xFF2563EB) : const Color(0xFF4F46E5), width: 1.5),
        ),
      ),
    );
  }
}
