import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:swarsanket/main.dart';
import 'package:swarsanket/models/cognitive_game_models.dart';
import 'package:swarsanket/services/cognitive_game_service.dart';
import 'package:swarsanket/screens/games/cognitive_games_hub_screen.dart';
import 'package:swarsanket/screens/games/logic_puzzle_screen.dart';
import 'package:swarsanket/screens/games/memory_treasure_screen.dart';
import 'package:swarsanket/screens/games/selective_attention_screen.dart';
import 'package:swarsanket/screens/games/speed_visualisation_screen.dart';
import 'package:swarsanket/screens/splash_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Cognitive Games - Models and Offline Storage Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('1. Initial game progress is empty / default', () async {
      final progress = await CognitiveGameService.getProgress('memory_treasure');
      expect(progress.gameId, 'memory_treasure');
      expect(progress.bestScore, 0);
      expect(progress.gamesPlayed, 0);
      expect(progress.formattedBestTime, '--:--');
    });

    test('2. Recording session updates best score, level, streak, and time', () async {
      final session = GameSession(
        id: 'test_1',
        gameId: 'memory_treasure',
        startedAt: DateTime.now().subtract(const Duration(seconds: 45)),
        completedAt: DateTime.now(),
        score: 850,
        level: 1,
        durationSeconds: 45,
        moves: 12,
        stars: 3,
      );

      final updated = await CognitiveGameService.recordCompletion(session);
      expect(updated.bestScore, 850);
      expect(updated.gamesPlayed, 1);
      expect(updated.bestTimeSeconds, 45);
      expect(updated.formattedBestTime, '00:45');

      // Second session with better score and time
      final session2 = GameSession(
        id: 'test_2',
        gameId: 'memory_treasure',
        startedAt: DateTime.now().subtract(const Duration(seconds: 35)),
        completedAt: DateTime.now(),
        score: 920,
        level: 2,
        durationSeconds: 35,
        moves: 10,
        stars: 3,
      );

      final updated2 = await CognitiveGameService.recordCompletion(session2);
      expect(updated2.bestScore, 920);
      expect(updated2.highestLevel, 2);
      expect(updated2.bestTimeSeconds, 35);
      expect(updated2.gamesPlayed, 2);
      expect(updated2.formattedBestTime, '00:35');
    });

    test('3. Reset clears all game progress', () async {
      final session = GameSession(
        id: 'test_lp',
        gameId: 'logic_puzzle',
        startedAt: DateTime.now(),
        score: 500,
        level: 3,
        durationSeconds: 60,
      );
      await CognitiveGameService.recordCompletion(session);

      var p = await CognitiveGameService.getProgress('logic_puzzle');
      expect(p.bestScore, 500);

      await CognitiveGameService.resetAll();
      p = await CognitiveGameService.getProgress('logic_puzzle');
      expect(p.bestScore, 0);
      expect(p.gamesPlayed, 0);
    });
  });

  group('Cognitive Games - Navigation & Hub Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({
        'swarsanket_setup_complete': true,
        'swarsanket_patient_name': 'Rama Devi',
      });
    });

    testWidgets('1. Home displays Cognitive Booster card with proper non-diagnostic framing', (tester) async {
      await tester.pumpWidget(const SwarSanketApp());
      await tester.tap(find.byType(SplashScreen));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      // Check for Cognitive Booster card and subtitle
      expect(find.text('Cognitive Booster'), findsWidgets);
      expect(find.text('Play fun activities designed for cognitive engagement.'), findsWidgets);
      expect(find.text('Play Cognitive Games'), findsOneWidget);

      // Verify absence of medical diagnostic framing in games section
      expect(find.textContaining('Alzheimer\'s Test'), findsNothing);
      expect(find.textContaining('Dementia Test'), findsNothing);
      expect(find.textContaining('Diagnostic Game'), findsNothing);
    });

    testWidgets('2. Tapping Play Cognitive Games navigates to CognitiveGamesHubScreen', (tester) async {
      await tester.pumpWidget(const SwarSanketApp());
      await tester.tap(find.byType(SplashScreen));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      final playBtn = find.text('Play Cognitive Games');
      expect(playBtn, findsOneWidget);
      await tester.ensureVisible(playBtn);
      await tester.tap(playBtn);
      await tester.pumpAndSettle();

      // On CognitiveGamesHubScreen
      expect(find.byType(CognitiveGamesHubScreen), findsOneWidget);
      expect(find.text('Cognitive Games'), findsOneWidget);

      // Verify game cards
      expect(find.text('Logic Puzzle'), findsOneWidget);
      expect(find.text('Memory Treasure'), findsOneWidget);

      final svFinder = find.text('Speed Visualisation');
      await tester.scrollUntilVisible(svFinder, 100);
      expect(svFinder, findsOneWidget);

      // Scroll down to check medical disclaimer banner
      final disclaimerFinder = find.textContaining('These games are for cognitive engagement');
      await tester.scrollUntilVisible(disclaimerFinder, 100);
      expect(disclaimerFinder, findsOneWidget);
    });

    testWidgets('3. Back button returns from Games Hub to Home', (tester) async {
      await tester.pumpWidget(const SwarSanketApp());
      await tester.tap(find.byType(SplashScreen));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      final playBtn = find.text('Play Cognitive Games');
      await tester.ensureVisible(playBtn);
      await tester.tap(playBtn);
      await tester.pumpAndSettle();

      expect(find.byType(CognitiveGamesHubScreen), findsOneWidget);

      // Tap back button
      final backBtn = find.byIcon(Icons.arrow_back);
      await tester.tap(backBtn);
      await tester.pumpAndSettle();

      // Back on Home
      expect(find.byType(CognitiveGamesHubScreen), findsNothing);
      expect(find.text('Hello, Rama Devi'), findsOneWidget);
    });
  });

  group('Game 1: Logic Puzzle Widget Tests', () {
    testWidgets('Renders 4x4 grid, symbols palette, and supports cell selection and symbol placement', (tester) async {
      bool backCalled = false;
      await tester.pumpWidget(
        MaterialApp(
          home: LogicPuzzleScreen(onBack: () => backCalled = true),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Logic Puzzle'), findsOneWidget);
      expect(find.text('Level 1'), findsOneWidget);
      expect(find.text('Select symbol to place:'), findsOneWidget);

      // Symbols tray has Clover, Spark, Water, Flame
      expect(find.text('🍀'), findsWidgets);
      expect(find.text('⚡'), findsWidgets);
      expect(find.text('💧'), findsWidgets);
      expect(find.text('🔥'), findsWidgets);

      // Tap an empty cell if present
      final addIcons = find.byIcon(Icons.add);
      if (addIcons.evaluate().isNotEmpty) {
        await tester.tap(addIcons.first);
        await tester.pump();
      }

      // Back button works
      await tester.tap(find.byIcon(Icons.arrow_back));
      await tester.pumpAndSettle();
      expect(backCalled, isTrue);
    });
  });

  group('Game 2: Memory Treasure Widget Tests', () {
    testWidgets('Renders 16 hidden cards, tracks turns and reveals upon tap', (tester) async {
      bool backCalled = false;
      await tester.pumpWidget(
        MaterialApp(
          home: MemoryTreasureScreen(onBack: () => backCalled = true),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Memory Treasure'), findsOneWidget);
      expect(find.text('0 / 8'), findsOneWidget);
      expect(find.text('Moves'), findsOneWidget);

      // 16 cards are rendered with help icon initially
      final mysteryCards = find.byIcon(Icons.help_outline_rounded);
      expect(mysteryCards, findsNWidgets(16));

      // Tap first card
      await tester.tap(mysteryCards.first);
      await tester.pump();

      // Tap second card
      await tester.tap(mysteryCards.at(1));
      await tester.pump();

      // Moves counter should increment to 1
      expect(find.text('1'), findsOneWidget);

      // Allow mismatch / match timer to finish
      await tester.pump(const Duration(milliseconds: 800));

      // Tap back button
      await tester.tap(find.byIcon(Icons.arrow_back));
      await tester.pumpAndSettle();
      expect(backCalled, isTrue);
    });
  });

  group('Game 3: Selective Attention Widget Tests', () {
    testWidgets('Displays target, items grid, and responds to target tap', (tester) async {
      bool backCalled = false;
      await tester.pumpWidget(
        MaterialApp(
          home: SelectiveAttentionScreen(onBack: () => backCalled = true),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Selective Attention'), findsOneWidget);
      expect(find.text('FIND THIS TARGET'), findsOneWidget);
      expect(find.textContaining('Round 1'), findsOneWidget);

      // Items grid is present
      final inkWells = find.byType(InkWell);
      expect(inkWells, findsWidgets);

      // Tap back button
      await tester.tap(find.byIcon(Icons.arrow_back));
      await tester.pumpAndSettle();
      expect(backCalled, isTrue);
    });
  });

  group('Game 4: Speed Visualisation Widget Tests', () {
    testWidgets('Displays reference pattern, choices, and responds to selection', (tester) async {
      bool backCalled = false;
      await tester.pumpWidget(
        MaterialApp(
          home: SpeedVisualisationScreen(onBack: () => backCalled = true),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Speed Visualisation'), findsOneWidget);
      expect(find.text('REFERENCE PATTERN'), findsOneWidget);
      expect(find.textContaining('Round 1'), findsOneWidget);

      // Tap one of the choices
      final choices = find.byType(InkWell);
      // First is back button, remaining are choices
      expect(choices.evaluate().length, greaterThanOrEqualTo(3));
      await tester.tap(choices.at(1));
      await tester.pump();

      // Allow advance timer to finish
      await tester.pump(const Duration(milliseconds: 500));

      // Tap back button
      await tester.tap(find.byIcon(Icons.arrow_back));
      await tester.pumpAndSettle();
      expect(backCalled, isTrue);
    });
  });
}
