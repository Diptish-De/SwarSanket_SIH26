import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'models/screening_models.dart';
import 'services/tts_service.dart';
import 'services/audio_service.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'screens/splash_screen.dart';
import 'screens/setup_screen.dart';
import 'screens/app_screens.dart';
import 'screens/voice_check_screens.dart';
import 'screens/doctor_dashboard_screen.dart';
import 'screens/games/cognitive_games_hub_screen.dart';
import 'screens/games/logic_puzzle_screen.dart';
import 'screens/games/memory_treasure_screen.dart';
import 'screens/games/selective_attention_screen.dart';
import 'screens/games/speed_visualisation_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.purgeLegacyData();
  await TtsService().init();
  await ApiService.initialize();
  runApp(const SwarSanketApp());
}

class SwarSanketApp extends StatelessWidget {
  const SwarSanketApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SwarSanket',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: const MainNavigationController(),
    );
  }
}

class MainNavigationController extends StatefulWidget {
  const MainNavigationController({super.key});

  @override
  State<MainNavigationController> createState() => _MainNavigationControllerState();
}

class _MainNavigationControllerState extends State<MainNavigationController> {
  int _activeTabIndex = 0;
  String _currentScreen = 'splash';
  final List<String> _screenHistory = [];
  String _selectedLanguage = 'en';
  String _userName = 'Rama Devi';
  int _patientAge = 72;
  String _selectedPatient = 'Rama Devi';
  final bool _hasPreviousCheck = true;

  final AudioRecorderService _audioRecorder = AudioRecorderService();
  String? _recordedAudioPath;
  ScreeningApiResponse? _latestApiResponse;
  ScreeningSession? _latestSession;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    final profile = await AuthService.getUserProfile();
    if (mounted) {
      setState(() {
        _userName = profile['name'] as String? ?? 'Rama Devi';
        _patientAge = profile['age'] as int? ?? 72;
        _selectedLanguage = profile['language'] as String? ?? 'en';
        _selectedPatient = _userName;
      });
    }
  }

  @override
  void dispose() {
    _audioRecorder.dispose();
    super.dispose();
  }

  void _navigateTo(String screen, {bool clearHistory = false}) {
    if (clearHistory) {
      _screenHistory.clear();
    } else if (_currentScreen != screen &&
        _currentScreen != 'splash' &&
        _currentScreen != 'setup') {
      _screenHistory.add(_currentScreen);
    }
    setState(() => _currentScreen = screen);
  }

  bool _navigateBack() {
    if (_screenHistory.isNotEmpty) {
      final previous = _screenHistory.removeLast();
      setState(() => _currentScreen = previous);
      return true;
    } else if (_currentScreen != 'tabs' &&
        _currentScreen != 'setup' &&
        _currentScreen != 'splash') {
      setState(() => _currentScreen = 'tabs');
      return true;
    } else if (_currentScreen == 'tabs' && _activeTabIndex != 0) {
      setState(() => _activeTabIndex = 0);
      return true;
    }
    return false;
  }

  Widget _buildScreenContent() {
    switch (_currentScreen) {
      case 'splash':
        return SplashScreen(
          onFinish: () async {
            final isSetupComplete = await AuthService.isFirstTimeSetupComplete();
            if (isSetupComplete) {
              await _loadUserProfile();
              _navigateTo('tabs', clearHistory: true);
            } else {
              _navigateTo('setup', clearHistory: true);
            }
          },
        );

      case 'setup':
        return SetupScreen(
          onComplete: () async {
            await _loadUserProfile();
            _navigateTo('tabs', clearHistory: true);
          },
        );

      // ─── Voice Check Intro ─────────────────────────────────────────
      case 'intro':
        return VoiceCheckIntroScreen(
          language: _selectedLanguage,
          onBegin: () => _navigateTo('task1'),
          onAssisted: () => _navigateTo('task1'),
          onBack: () => _navigateBack(),
        );

      // ─── Task 1 of 3: Picture Description ─────────────────────────
      case 'task1':
        return PictureDescriptionScreen(
          language: _selectedLanguage,
          onStartSpeaking: () => _navigateTo('ready1'),
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'ready1':
        return ReadyToSpeakScreen(
          stepIndex: 1,
          onStartRecording: () => _navigateTo('rec1'),
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'rec1':
        return ActiveRecordingScreen(
          recorder: _audioRecorder,
          stepIndex: 1,
          onFinish: (path) {
            setState(() => _recordedAudioPath = path ?? _audioRecorder.currentFilePath);
            _navigateTo('quality1');
          },
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'quality1':
        return VoiceQualityCheckScreen(
          onContinue: () => _navigateTo('review1'),
        );

      case 'review1':
        return RecordingReviewScreen(
          onContinue: () => _navigateTo('task2_intro'),
          onRecordAgain: () => _navigateTo('ready1'),
        );

      // ─── Task 2 of 3: Memory Recall ──────────────────────────────
      case 'task2_intro':
        return MemoryRecallIntroScreen(
          language: _selectedLanguage,
          onContinue: () => _navigateTo('task2_prompt'),
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'task2_prompt':
        return MemoryRecallPromptScreen(
          language: _selectedLanguage,
          onStartSpeaking: () => _navigateTo('ready2'),
          onListenAgain: () => _navigateTo('task2_intro'),
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'ready2':
        return ReadyToSpeakScreen(
          stepIndex: 2,
          onStartRecording: () => _navigateTo('rec2'),
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'rec2':
        return ActiveRecordingScreen(
          recorder: _audioRecorder,
          stepIndex: 2,
          onFinish: (path) {
            setState(() => _recordedAudioPath = path ?? _audioRecorder.currentFilePath);
            _navigateTo('quality2');
          },
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'quality2':
        return VoiceQualityCheckScreen(
          onContinue: () => _navigateTo('review2'),
        );

      case 'review2':
        return RecordingReviewScreen(
          onContinue: () => _navigateTo('task3'),
          onRecordAgain: () => _navigateTo('ready2'),
        );

      // ─── Task 3 of 3: Conversational Task ─────────────────────────
      case 'task3':
        return ConversationalTaskScreen(
          language: _selectedLanguage,
          onStartSpeaking: () => _navigateTo('ready3'),
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'ready3':
        return ReadyToSpeakScreen(
          stepIndex: 3,
          onStartRecording: () => _navigateTo('rec3'),
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'rec3':
        return ActiveRecordingScreen(
          recorder: _audioRecorder,
          stepIndex: 3,
          onFinish: (path) {
            setState(() => _recordedAudioPath = path ?? _audioRecorder.currentFilePath);
            _navigateTo('quality3');
          },
          onBack: () => _navigateBack(),
          onClose: () => _navigateTo('tabs', clearHistory: true),
        );

      case 'quality3':
        return VoiceQualityCheckScreen(
          onContinue: () => _navigateTo('review3'),
        );

      case 'review3':
        return RecordingReviewScreen(
          onContinue: () => _navigateTo('completion'),
          onRecordAgain: () => _navigateTo('ready3'),
        );

      // ─── Completion & ML Analysis ─────────────────────────────────
      case 'completion':
        return CompletionScreen(
          onComplete: () => _navigateTo('processing'),
        );

      case 'processing':
        return AnalyzingVoiceScreen(
          audioPath: _recordedAudioPath ?? _audioRecorder.currentFilePath,
          patientName: _userName,
          patientAge: _patientAge,
          language: _selectedLanguage,
          assistedMode: false,
          onSuccess: (apiResponse, session) {
            setState(() {
              _latestApiResponse = apiResponse;
              _latestSession = session;
            });
            _navigateTo('result');
          },
          onCancel: () => _navigateTo('tabs', clearHistory: true),
        );

      // ─── Quality Error State: Try Again ───────────────────────────
      case 'tryAgain':
        return TryAgainErrorScreen(
          onTryAgain: () => _navigateTo('intro'),
          onHealthcare: () => _navigateTo('doctorPatient'),
        );

      // ─── Result Screen ────────────────────────────────────────────
      case 'result':
        return ScreeningResultScreen(
          apiResponse: _latestApiResponse,
          session: _latestSession,
          risk: _latestSession?.mlResult.risk ?? ScreeningRisk.elevated,
          onDone: () {
            setState(() => _activeTabIndex = 0);
            _navigateTo('tabs', clearHistory: true);
          },
          onDetails: () => _navigateTo('doctorPatient'),
        );

      // ─── Doctor Clinical Dashboard & Longitudinal Trends ──────────
      case 'doctorDash':
        return DoctorDashboardScreen(
          onBack: () => _navigateBack(),
          onSelectPatient: (name) {
            setState(() => _selectedPatient = name);
            _navigateTo('doctorPatient');
          },
        );

      case 'doctorPatient':
        return DoctorPatientDetailScreen(
          patientName: _selectedPatient,
          onBack: () => _navigateBack(),
        );

      // ─── Cognitive Games (Completely independent from clinical screening)
      case 'cognitiveGamesHub':
        return CognitiveGamesHubScreen(
          onBack: () => _navigateBack(),
          onSelectGame: (gameRoute) => _navigateTo(gameRoute),
        );

      case 'game_logic_puzzle':
        return LogicPuzzleScreen(
          onBack: () => _navigateBack(),
        );

      case 'game_memory_treasure':
        return MemoryTreasureScreen(
          onBack: () => _navigateBack(),
        );

      case 'game_selective_attention':
        return SelectiveAttentionScreen(
          onBack: () => _navigateBack(),
        );

      case 'game_speed_visualisation':
        return SpeedVisualisationScreen(
          onBack: () => _navigateBack(),
        );

      // ─── Main Persistent Tabs ─────────────────────────────────────
      case 'tabs':
      default:
        return MainTabScaffold(
          activeIndex: _activeTabIndex,
          onTabChange: (idx) => setState(() => _activeTabIndex = idx),
          userName: _userName,
          language: _selectedLanguage,
          hasPreviousCheck: _hasPreviousCheck,
          hasError: false,
          onStartCheck: () => _navigateTo('intro'),
          onDoctorPatient: () => _navigateTo('doctorPatient'),
          onCognitiveGames: () => _navigateTo('cognitiveGamesHub'),
          onLanguageChanged: (lang) => setState(() => _selectedLanguage = lang),
          onLogout: () async {
            await AuthService.resetAll();
            _screenHistory.clear();
            _navigateTo('setup', clearHistory: true);
          },
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _currentScreen == 'setup' ||
          (_currentScreen == 'tabs' && _activeTabIndex == 0),
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _navigateBack();
      },
      child: FigmaPhoneFrame(
        child: _buildScreenContent(),
      ),
    );
  }
}
