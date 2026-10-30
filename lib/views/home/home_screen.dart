import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
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

  void _openDrawerMenu() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
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
