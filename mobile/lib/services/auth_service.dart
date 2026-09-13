import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Service managing patient profile setup and persistent session state.
///
/// All biometric authentication has been completely removed.
/// No Face ID, fingerprint, PIN, or biometric prompts are used.
class AuthService {
  // Storage keys
  static const String _keySetupComplete = 'swarsanket_setup_complete';
  static const String _keyPatientName = 'swarsanket_patient_name';
  static const String _keyPatientAge = 'swarsanket_patient_age';
  static const String _keyPatientLanguage = 'swarsanket_patient_language';
  static const String _keySelectedEdge = 'swarsanket_selected_edge';

  // Legacy keys from earlier iterations purged to prevent stale device state
  static const List<String> _legacyKeys = [
    'swarsanket_biometric_enabled',
    'swarsanket_pin',
    'swarsanket_use_biometric',
    'swarsanket_password_hash',
    'swarsanket_session_token',
    'swarsanket_authenticated',
  ];

  /// Purges any legacy keys from older builds to ensure clean biometric-free operation.
  static Future<void> purgeLegacyData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      for (final key in _legacyKeys) {
        if (prefs.containsKey(key)) {
          await prefs.remove(key);
        }
      }
    } catch (e) {
      debugPrint('[AuthService] Error purging legacy data: ');
    }
  }

  /// Returns true if first-time onboarding/setup has been completed.
  static Future<bool> isFirstTimeSetupComplete() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_keySetupComplete) ?? false;
    } catch (e) {
      debugPrint('[AuthService] Error checking setup status: ');
      return false;
    }
  }

  /// Saves the patient profile and marks onboarding complete.
  static Future<void> saveUserProfile({
    required String name,
    required int age,
    required String language,
    String? selectedEdge,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final trimmedName = name.trim().isNotEmpty ? name.trim() : 'Rama Devi';

    await prefs.setString(_keyPatientName, trimmedName);
    await prefs.setInt(_keyPatientAge, age > 0 ? age : 72);
    await prefs.setString(_keyPatientLanguage, language.isNotEmpty ? language : 'en');
    if (selectedEdge != null && selectedEdge.isNotEmpty) {
      await prefs.setString(_keySelectedEdge, selectedEdge);
    }
    await prefs.setBool(_keySetupComplete, true);
    debugPrint('[AuthService] Saved profile for  (Age/Edge: , Lang: )');
  }

  /// Retrieves current patient profile data.
  static Future<Map<String, dynamic>> getUserProfile() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'name': prefs.getString(_keyPatientName) ?? 'Rama Devi',
      'age': prefs.getInt(_keyPatientAge) ?? 72,
      'language': prefs.getString(_keyPatientLanguage) ?? 'en',
      'selectedEdge': prefs.getString(_keySelectedEdge) ?? '70–79',
    };
  }

  /// Resets all stored user profile and setup flags.
  static Future<void> resetAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keySetupComplete);
    await prefs.remove(_keyPatientName);
    await prefs.remove(_keyPatientAge);
    await prefs.remove(_keyPatientLanguage);
    await prefs.remove(_keySelectedEdge);
    await purgeLegacyData();
    debugPrint('[AuthService] All setup and profile data reset.');
  }
}
