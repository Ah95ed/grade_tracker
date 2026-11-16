import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../controllers/auth_controller.dart';

/// Full-featured Admin Dashboard Dialog for managing subscribers & system users
/// Matching React AdminDashboardView.tsx
class AdminDashboardDialog extends StatefulWidget {
  const AdminDashboardDialog({super.key});

  @override
  State<AdminDashboardDialog> createState() => _AdminDashboardDialogState();
}

class _AdminDashboardDialogState extends State<AdminDashboardDialog> {
  List<Map<String, dynamic>> _users = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedFilter = 'ALL'; // ALL, active, pending, expired, cancelled

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoading = true);
    try {
      final auth = context.read<AuthController>();
      final token = await auth.ensureValidToken();
      final users = await auth.apiService.fetchAllUsers(
        token: token,
        adminEmail: auth.currentUser?.email,
      );
      if (mounted) {
        setState(() {
          _users = users;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _updateSubscription(Map<String, dynamic> user, String type, String status, {int? days}) async {
    final auth = context.read<AuthController>();
    final token = await auth.ensureValidToken();
    String? expiresAt;
    if (days != null) {
      expiresAt = DateTime.now().add(Duration(days: days)).toIso8601String();
    }
    final success = await auth.apiService.updateUserSubscription(
      uid: user['uid']?.toString() ?? '',
      email: user['email']?.toString() ?? '',
      subscriptionType: type,
      subscriptionStatus: status,
      expiresAt: expiresAt,
      token: token,
      adminEmail: auth.currentUser?.email,
    );

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم تحديث اشتراك (${user['displayName'] ?? user['email']}) بنجاح.'),
            backgroundColor: const Color(0xFF16A34A),
          ),
        );
        _loadUsers();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تعذر تحديث الاشتراك. تحقق من الاتصال.'),
            backgroundColor: Color(0xFFDC2626),
          ),
        );
      }
    }
  }

  Future<void> _deleteUser(Map<String, dynamic> user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('تأكيد حذف المستخدم'),
        content: Text('هل أنت متأكد من حذف (${user['displayName'] ?? user['email']}) نهائياً من قاعدة البيانات؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('حذف نهائي', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final auth = context.read<AuthController>();
      final token = await auth.ensureValidToken();
      final success = await auth.apiService.deleteUserByAdmin(
        uid: user['uid']?.toString() ?? '',
        email: user['email']?.toString() ?? '',
        token: token,
        adminEmail: auth.currentUser?.email,
      );
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('تم حذف المستخدم بنجاح'), backgroundColor: Colors.red),
          );
          _loadUsers();
        }
      }
    }
  }

  List<Map<String, dynamic>> get _filteredUsers {
    return _users.where((u) {
      final email = (u['email']?.toString() ?? '').toLowerCase();
      final name = (u['displayName']?.toString() ?? '').toLowerCase();
      final q = _searchQuery.toLowerCase();
      final matchesSearch = q.isEmpty || email.contains(q) || name.contains(q);

      final status = (u['subscriptionStatus']?.toString() ?? 'pending').toLowerCase();
      final matchesFilter = _selectedFilter == 'ALL' || status == _selectedFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final total = _users.length;
    final activeCount = _users.where((u) => u['subscriptionStatus'] == 'active').length;
    final expiredCount = _users.where((u) => u['subscriptionStatus'] == 'expired').length;
    final cancelledCount = _users.where((u) => u['subscriptionStatus'] == 'cancelled').length;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        backgroundColor: const Color(0xFFFAF7EC),
        insetPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 16.h),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20.r),
          side: const BorderSide(color: Color(0xFFD8CEBD), width: 1.2),
        ),
        child: Container(
          width: 720.w,
          constraints: BoxConstraints(maxHeight: 780.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 14.h),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32.r,
                      height: 32.r,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B),
                        borderRadius: BorderRadius.circular(10.r),
                      ),
                      child: const Icon(Icons.shield_rounded, color: Colors.white, size: 20),
                    ),
                    SizedBox(width: 10.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'لوحة إدارة النظام والمشتركين',
                            style: TextStyle(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            'متابعة الحسابات، تفعيل الاشتراكات، وإدارة صلاحيات المعلمين',
                            style: TextStyle(fontSize: 10.5.sp, color: const Color(0xFF94A3B8)),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
                      tooltip: 'تحديث القائمة',
                      onPressed: _loadUsers,
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white70),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Metrics Row
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
                child: Row(
                  children: [
                    Expanded(child: _metricCard('إجمالي المستخدمين', '$total', const Color(0xFF2563EB), const Color(0xFFEFF6FF))),
                    SizedBox(width: 6.w),
                    Expanded(child: _metricCard('نشط ومفعل', '$activeCount', const Color(0xFF16A34A), const Color(0xFFF0FDF4))),
                    SizedBox(width: 6.w),
                    Expanded(child: _metricCard('منتهي الصلاحية', '$expiredCount', const Color(0xFFD97706), const Color(0xFFFFFBEB))),
                    SizedBox(width: 6.w),
                    Expanded(child: _metricCard('ملغي / مجمد', '$cancelledCount', const Color(0xFFDC2626), const Color(0xFFFEF2F2))),
                  ],
                ),
              ),

              // Search & Filter
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 14.w),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'بحث بالاسم أو البريد...',
                          prefixIcon: const Icon(Icons.search_rounded, size: 20),
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10.r),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                        ),
                        onChanged: (v) => setState(() => _searchQuery = v),
                      ),
                    ),
                    SizedBox(width: 8.w),
                    DropdownButton<String>(
                      value: _selectedFilter,
                      dropdownColor: Colors.white,
                      items: const [
                        DropdownMenuItem(value: 'ALL', child: Text('جميع الحالات')),
                        DropdownMenuItem(value: 'active', child: Text('نشط فقط')),
                        DropdownMenuItem(value: 'pending', child: Text('معلق فقط')),
                        DropdownMenuItem(value: 'expired', child: Text('منتهي فقط')),
                        DropdownMenuItem(value: 'cancelled', child: Text('ملغي فقط')),
                      ],
                      onChanged: (v) => setState(() => _selectedFilter = v ?? 'ALL'),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 10.h),

              // Users List
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _filteredUsers.isEmpty
                        ? Center(
                            child: Text(
                              'لا يوجد مستخدمون مطابقون',
                              style: TextStyle(fontSize: 13.sp, color: Colors.grey.shade600),
                            ),
                          )
                        : ListView.separated(
                            padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 6.h),
                            itemCount: _filteredUsers.length,
                            separatorBuilder: (context, index) => SizedBox(height: 6.h),
                            itemBuilder: (context, index) {
                              final u = _filteredUsers[index];
                              final status = u['subscriptionStatus']?.toString() ?? 'pending';
                              final subType = u['subscriptionType']?.toString() ?? 'trial';
                              final name = u['displayName']?.toString() ?? 'معلم';
                              final email = u['email']?.toString() ?? '';
                              final isAdmin = u['isAdmin'] == true || u['isAdmin'] == 1;

                              return Container(
                                padding: EdgeInsets.all(10.r),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12.r),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 18.r,
                                      backgroundColor: isAdmin ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                                      child: Icon(
                                        isAdmin ? Icons.star_rounded : Icons.person_rounded,
                                        color: isAdmin ? const Color(0xFFD97706) : const Color(0xFF64748B),
                                        size: 20.r,
                                      ),
                                    ),
                                    SizedBox(width: 10.w),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Flexible(
                                                child: Text(
                                                  name,
                                                  style: TextStyle(fontSize: 12.5.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              SizedBox(width: 6.w),
                                              _statusBadge(status),
                                              SizedBox(width: 4.w),
                                              _typeBadge(subType),
                                            ],
                                          ),
                                          SizedBox(height: 2.h),
                                          Text(
                                            email,
                                            style: TextStyle(fontSize: 11.sp, color: const Color(0xFF64748B)),
                                          ),
                                        ],
                                      ),
                                    ),
                                    PopupMenuButton<String>(
                                      icon: const Icon(Icons.more_vert_rounded),
                                      onSelected: (action) {
                                        switch (action) {
                                          case 'activate_month':
                                            _updateSubscription(u, 'monthly', 'active', days: 30);
                                            break;
                                          case 'activate_year':
                                            _updateSubscription(u, 'yearly', 'active', days: 365);
                                            break;
                                          case 'activate_lifetime':
                                            _updateSubscription(u, 'lifetime', 'active');
                                            break;
                                          case 'freeze':
                                            _updateSubscription(u, subType, 'cancelled');
                                            break;
                                          case 'unfreeze':
                                            _updateSubscription(u, subType, 'active');
                                            break;
                                          case 'delete':
                                            _deleteUser(u);
                                            break;
                                        }
                                      },
                                      itemBuilder: (_) => [
                                        const PopupMenuItem(
                                          value: 'activate_month',
                                          child: Text('تفعيل لمدة شهر (30 يوم)'),
                                        ),
                                        const PopupMenuItem(
                                          value: 'activate_year',
                                          child: Text('تفعيل سنوي (365 يوم)'),
                                        ),
                                        const PopupMenuItem(
                                          value: 'activate_lifetime',
                                          child: Text('تفعيل دائم (مدى الحياة)'),
                                        ),
                                        if (status != 'cancelled')
                                          const PopupMenuItem(
                                            value: 'freeze',
                                            child: Text('تجميد / إلغاء الحساب', style: TextStyle(color: Colors.red)),
                                          )
                                        else
                                          const PopupMenuItem(
                                            value: 'unfreeze',
                                            child: Text('إلغاء التجميد والتفعيل', style: TextStyle(color: Colors.green)),
                                          ),
                                        const PopupMenuItem(
                                          value: 'delete',
                                          child: Text('حذف الحساب نهائياً', style: TextStyle(color: Colors.red)),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
              ),

              // Footer
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                decoration: const BoxDecoration(
                  color: Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                      onPressed: () => Navigator.pop(context),
                      child: const Text('إغلاق', style: TextStyle(color: Colors.white)),
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

  Widget _metricCard(String label, String count, Color color, Color bg) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10.r),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 9.5.sp, color: color, fontWeight: FontWeight.bold)),
          SizedBox(height: 2.h),
          Text(count, style: TextStyle(fontSize: 14.sp, color: color, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _statusBadge(String status) {
    Color bg = const Color(0xFFF1F5F9);
    Color text = const Color(0xFF64748B);
    String label = status;

    if (status == 'active') {
      bg = const Color(0xFFDCFCE7);
      text = const Color(0xFF15803D);
      label = 'نشط';
    } else if (status == 'pending') {
      bg = const Color(0xFFFEF3C7);
      text = const Color(0xFFB45309);
      label = 'معلق';
    } else if (status == 'expired') {
      bg = const Color(0xFFFFEDD5);
      text = const Color(0xFFC2410C);
      label = 'منتهي';
    } else if (status == 'cancelled' || status == 'suspended') {
      bg = const Color(0xFFFEE2E2);
      text = const Color(0xFFB91C1C);
      label = 'ملغي';
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 1.5.h),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(4.r)),
      child: Text(label, style: TextStyle(fontSize: 9.sp, fontWeight: FontWeight.bold, color: text)),
    );
  }

  Widget _typeBadge(String type) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 1.5.h),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(4.r),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Text(type, style: TextStyle(fontSize: 9.sp, color: const Color(0xFF64748B))),
    );
  }
}
