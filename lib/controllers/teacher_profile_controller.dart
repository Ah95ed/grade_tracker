import 'package:flutter/material.dart';
import '../models/teacher_profile.dart';
import '../services/storage_service.dart';

/// Controller for Teacher and School profile management
class TeacherProfileController extends ChangeNotifier {
  final StorageService _storageService;
  TeacherProfile _profile;

  TeacherProfileController(this._storageService)
      : _profile = _storageService.loadProfile();

  TeacherProfile get profile => _profile;

  Future<void> updateProfile(TeacherProfile updated) async {
    _profile = updated;
    await _storageService.saveProfile(updated);
    notifyListeners();
  }
}

