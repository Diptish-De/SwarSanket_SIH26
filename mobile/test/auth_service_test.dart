import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:swarsanket/services/auth_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('AuthService Setup and Profile Tests (Biometric-Free)', () {
    test('1. Initial onboarding setup state is incomplete', () async {
      final isComplete = await AuthService.isFirstTimeSetupComplete();
      expect(isComplete, isFalse);
    });

    test('2. Saving user profile marks setup complete and saves Edge/Age and profile', () async {
      await AuthService.saveUserProfile(
        name: 'Rama Devi',
        age: 72,
        language: 'en',
        selectedEdge: '70–79',
      );

      final isComplete = await AuthService.isFirstTimeSetupComplete();
      expect(isComplete, isTrue);

      final profile = await AuthService.getUserProfile();
      expect(profile['name'], 'Rama Devi');
      expect(profile['age'], 72);
      expect(profile['language'], 'en');
      expect(profile['selectedEdge'], '70–79');
    });

    test('3. Reset clears all stored profile and setup status', () async {
      await AuthService.saveUserProfile(
        name: 'Temp Patient',
        age: 65,
        language: 'hi',
        selectedEdge: '60–69',
      );
      expect(await AuthService.isFirstTimeSetupComplete(), isTrue);

      await AuthService.resetAll();

      expect(await AuthService.isFirstTimeSetupComplete(), isFalse);
    });

    test('4. Purge legacy data safely cleans up older biometric keys', () async {
      SharedPreferences.setMockInitialValues({
        'swarsanket_biometric_enabled': true,
        'swarsanket_pin': '1234',
        'swarsanket_use_biometric': true,
      });

      await AuthService.purgeLegacyData();

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey('swarsanket_biometric_enabled'), isFalse);
      expect(prefs.containsKey('swarsanket_pin'), isFalse);
      expect(prefs.containsKey('swarsanket_use_biometric'), isFalse);
    });
  });
}
