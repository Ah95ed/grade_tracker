import 'package:flutter/material.dart';
import '../models/print_settings.dart';

/// MVC Controller for managing student certificates and report cards
class ReportCardsController extends ChangeNotifier {
  PrintSettings _printSettings = const PrintSettings();
  String _selectedSectionFilter = '';
  String _searchQuery = '';

  PrintSettings get printSettings => _printSettings;
  String get selectedSectionFilter => _selectedSectionFilter;
  String get searchQuery => _searchQuery;

  void updatePrintSettings(PrintSettings settings) {
    _printSettings = settings;
    notifyListeners();
  }

  void setSectionFilter(String section) {
    _selectedSectionFilter = section;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }
}

