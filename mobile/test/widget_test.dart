import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:swarsanket/main.dart';
import 'package:swarsanket/services/auth_service.dart';
import 'package:swarsanket/services/audio_service.dart';
import 'package:swarsanket/screens/splash_screen.dart';
import 'package:swarsanket/screens/setup_screen.dart';
import 'package:swarsanket/screens/app_screens.dart';
import 'package:swarsanket/screens/voice_check_screens.dart';

class FakeAudioRecorderService extends AudioRecorderService {
  bool _fakeRecording = true;
  @override
  bool get isRecording => _fakeRecording;
  @override
  bool get isPaused => false;
  @override
  Future<bool> checkPermission() async => true;
  @override
  Future<bool> start() async => true;
  @override
  Future<void> pause() async {}
  @override
  Future<void> resume() async {}
  @override
  Future<String?> stop() async {
    _fakeRecording = false;
    return '/fake/test_audio.m4a';
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('1. First launch shows SetupScreen without any biometric or PIN UI', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({}); // fresh install

    await tester.pumpWidget(const SwarSanketApp());
    expect(find.textContaining('SwarSanket'), findsWidgets);

    // Tap splash screen to advance
    await tester.tap(find.byType(SplashScreen));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    // First time should show SetupScreen
    expect(find.byType(SetupScreen), findsOneWidget);
    expect(find.text('Welcome to SwarSanket'), findsOneWidget);
    expect(find.text('Your Name'), findsOneWidget);
    expect(find.text('Your Age / Edge'), findsOneWidget);
    expect(find.text('Screening Server Address'), findsOneWidget);
    expect(find.text('Save & Get Started'), findsOneWidget);

    // Verify NO biometric or PIN prompts exist anywhere
    expect(find.textContaining('Biometric Unlock'), findsNothing);
    expect(find.textContaining('Face ID'), findsNothing);
    expect(find.textContaining('Fingerprint'), findsNothing);
    expect(find.textContaining('Backup 4-Digit PIN'), findsNothing);
    expect(find.textContaining('PIN'), findsNothing);
  });

  testWidgets('2. Edge / Age selection is interactive, tappable, highlights and updates state', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const SwarSanketApp());
    await tester.tap(find.byType(SplashScreen));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    // Initially 70–79 is selected by default
    expect(find.text('Selected: 70–79 (72 yrs)'), findsOneWidget);

    // Tap 60–69 Edge option
    final edge6069 = find.byKey(const ValueKey('edge_60_69'));
    expect(edge6069, findsOneWidget);
    await tester.tap(edge6069);
    await tester.pumpAndSettle();

    // Verify selection updated to 60–69
    expect(find.text('Selected: 60–69 (65 yrs)'), findsOneWidget);
    expect(find.text('65 Years Old'), findsOneWidget);

    // Tap 80+ Edge option
    final edge80plus = find.byKey(const ValueKey('edge_80_plus'));
    expect(edge80plus, findsOneWidget);
    await tester.tap(edge80plus);
    await tester.pumpAndSettle();

    // Verify selection changed to 80+
    expect(find.text('Selected: 80+ (82 yrs)'), findsOneWidget);
    expect(find.text('82 Years Old'), findsOneWidget);
  });

  testWidgets('3. Save & Get Started completes setup and navigates to Home', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const SwarSanketApp());
    await tester.tap(find.byType(SplashScreen));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    // Tap Save & Get Started
    final saveBtn = find.byKey(const ValueKey('save_and_get_started_button'));
    expect(saveBtn, findsOneWidget);
    await tester.ensureVisible(saveBtn);
    await tester.tap(saveBtn);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    // Should now be on MainTabScaffold (Home)
    expect(find.byType(MainTabScaffold), findsOneWidget);
    expect(find.textContaining('Hello,'), findsOneWidget);

    // Verify setup is marked complete in storage
    expect(await AuthService.isFirstTimeSetupComplete(), isTrue);
  });

  testWidgets('4. Relaunch with completed setup goes directly to Home', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      'swarsanket_setup_complete': true,
      'swarsanket_patient_name': 'Rama Devi',
      'swarsanket_patient_age': 72,
      'swarsanket_patient_language': 'en',
    });

    await tester.pumpWidget(const SwarSanketApp());
    await tester.tap(find.byType(SplashScreen));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    // Directly in Home without Setup screen or Biometrics
    expect(find.byType(MainTabScaffold), findsOneWidget);
    expect(find.byType(SetupScreen), findsNothing);
    expect(find.textContaining('Face ID'), findsNothing);
    expect(find.textContaining('Fingerprint'), findsNothing);
  });

  testWidgets('5. Back navigation returns to previous screen', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      'swarsanket_setup_complete': true,
      'swarsanket_patient_name': 'Rama Devi',
    });

    await tester.pumpWidget(const SwarSanketApp());
    await tester.tap(find.byType(SplashScreen));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    // From Home, tap 'Start Voice Screening'
    final startBtn = find.textContaining('Start Voice Screening');
    expect(startBtn, findsOneWidget);
    await tester.tap(startBtn);
    await tester.pumpAndSettle();

    // On VoiceCheckIntroScreen
    expect(find.byType(VoiceCheckIntroScreen), findsOneWidget);

    // Tap visible back button
    final backBtn = find.byIcon(Icons.arrow_back).first;
    await tester.tap(backBtn);
    await tester.pumpAndSettle();

    // Back in Home
    expect(find.byType(MainTabScaffold), findsOneWidget);
  });

  testWidgets('6. ActiveRecordingScreen back press shows confirmation dialog', (WidgetTester tester) async {
    final fakeRecorder = FakeAudioRecorderService();
    bool backCalled = false;

    await tester.pumpWidget(
      MaterialApp(
        home: ActiveRecordingScreen(
          recorder: fakeRecorder,
          stepIndex: 1,
          onFinish: (_) {},
          onBack: () => backCalled = true,
          onClose: () {},
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    // Tap header back button
    final backBtn = find.byIcon(Icons.arrow_back);
    expect(backBtn, findsOneWidget);
    await tester.tap(backBtn);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    // Stop recording dialog is shown!
    expect(find.text('Stop recording?'), findsOneWidget);
    expect(find.text('Continue Recording'), findsOneWidget);
    expect(find.text('Stop Recording'), findsOneWidget);
    expect(backCalled, isFalse);

    // Tap Continue Recording
    await tester.tap(find.text('Continue Recording'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Stop recording?'), findsNothing);
    expect(backCalled, isFalse);

    // Tap Back again, then choose Stop Recording
    await tester.tap(backBtn);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('Stop Recording'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    // onBack is triggered safely
    expect(backCalled, isTrue);
  });
}
