import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/monthly_sheet_controller.dart';
import '../../controllers/term_controller.dart';
import '../../controllers/teacher_profile_controller.dart';
import '../../models/monthly_model.dart';
import '../../models/term_model.dart';
import '../../models/teacher_profile.dart';
import 'widgets/home_header.dart';
import 'widgets/home_tab_bar.dart';
import 'widgets/home_drawer_menu.dart';
import '../monthly_sheet/monthly_sheet_view.dart';
import '../term_calculation/term_calculation_view.dart';
import '../report_cards/report_cards_view.dart';

/// Main application root view managing active tabs and top level components
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _activeTabIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndHydrateCloudData();
    });
  }

  Future<void> _checkAndHydrateCloudData() async {
    final auth = context.read<AuthController>();
    final sheetCtrl = context.read<MonthlySheetController>();
    final termCtrl = context.read<TermController>();
    final profileCtrl = context.read<TeacherProfileController>();

    if (auth.isAuthenticated && !auth.currentUser!.isTrial) {
      final cloudData = await auth.fetchCloudData();
      if (cloudData != null && mounted) {
        if (cloudData['models'] != null && (cloudData['models'] as List).isNotEmpty) {
          final raw = cloudData['models'] as List<dynamic>;
          sheetCtrl.setModels(raw.map((e) => MonthlyModel.fromJson(e as Map<String, dynamic>)).toList());
        }
        if (cloudData['terms'] != null && (cloudData['terms'] as List).isNotEmpty) {
          final raw = cloudData['terms'] as List<dynamic>;
          termCtrl.setTerms(raw.map((e) => TermModel.fromJson(e as Map<String, dynamic>)).toList());
        }
        if (cloudData['profile'] != null) {
          profileCtrl.updateProfile(TeacherProfile.fromJson(cloudData['profile'] as Map<String, dynamic>));
        }
      }
      if (mounted && profileCtrl.profile.teacherName.isEmpty && (auth.currentUser?.displayName.isNotEmpty ?? false)) {
        profileCtrl.updateProfile(profileCtrl.profile.copyWith(teacherName: auth.currentUser!.displayName));
      }
    }
  }

  void _openDrawerMenu() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const HomeDrawerMenu(),
    );
  }

  Widget _buildBody() {
    switch (_activeTabIndex) {
      case 0:
        return const MonthlySheetView();
      case 1:
        return const TermCalculationView();
      case 2:
        return const ReportCardsView();
      default:
        return const MonthlySheetView();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.warmCanvas,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1350),
            child: Column(
              children: [
                HomeHeader(
                  activeIndex: _activeTabIndex,
                  onOpenMenu: _openDrawerMenu,
                ),
                HomeTabBar(
                  activeIndex: _activeTabIndex,
                  onTabSelected: (index) => setState(() => _activeTabIndex = index),
                ),
                Expanded(child: _buildBody()),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
