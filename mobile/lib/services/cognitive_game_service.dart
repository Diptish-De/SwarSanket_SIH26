import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cognitive_game_models.dart';

/// Local offline storage service for Cognitive Games progress and sessions.
/// Completely independent from the screening/diagnostic ML backend.
class CognitiveGameService {
  static const String _progressPrefix = 'swarsanket_game_progress_';
  static const String _sessionsKey = 'swarsanket_game_recent_sessions';

  /// Get progress for a specific game.
  static Future<GameProgress> getProgress(String gameId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('$_progressPrefix$gameId');
      if (raw != null && raw.isNotEmpty) {
        final data = jsonDecode(raw) as Map<String, dynamic>;
        return GameProgress.fromJson(data);
      }
    } catch (_) {}
    return GameProgress(gameId: gameId);
  }

  /// Get progress map for all 4 games.
  static Future<Map<String, GameProgress>> getAllProgress() async {
    final result = <String, GameProgress>{};
    for (final type in CognitiveGameType.values) {
      result[type.id] = await getProgress(type.id);
    }
    return result;
  }

  /// Record completion of a game session and update high scores.
  static Future<GameProgress> recordCompletion(GameSession session) async {
    final prefs = await SharedPreferences.getInstance();
    final current = await getProgress(session.gameId);

    final newBestScore = session.score > current.bestScore ? session.score : current.bestScore;
    final newHighestLevel = session.level > current.highestLevel ? session.level : current.highestLevel;
    final newBestStreak = session.streak > current.bestStreak ? session.streak : current.bestStreak;

    int newBestTime = current.bestTimeSeconds;
    if (session.durationSeconds > 0) {
      if (current.bestTimeSeconds == 0 || session.durationSeconds < current.bestTimeSeconds) {
        newBestTime = session.durationSeconds;
      }
    }

    final updated = current.copyWith(
      bestScore: newBestScore,
      highestLevel: newHighestLevel,
      bestStreak: newBestStreak,
      bestTimeSeconds: newBestTime,
      gamesPlayed: current.gamesPlayed + 1,
      lastPlayed: session.completedAt ?? DateTime.now(),
    );

    await prefs.setString(
      '$_progressPrefix${session.gameId}',
      jsonEncode(updated.toJson()),
    );

    // Also append session to recent history (cap at 20)
    try {
      final rawList = prefs.getStringList(_sessionsKey) ?? [];
      final updatedList = [
        jsonEncode(session.toJson()),
        ...rawList,
      ];
      if (updatedList.length > 20) {
        updatedList.removeRange(20, updatedList.length);
      }
      await prefs.setStringList(_sessionsKey, updatedList);
    } catch (_) {}

    return updated;
  }

  /// Reset all game progress (for testing / reset profile).
  static Future<void> resetAll() async {
    final prefs = await SharedPreferences.getInstance();
    for (final type in CognitiveGameType.values) {
      await prefs.remove('$_progressPrefix${type.id}');
    }
    await prefs.remove(_sessionsKey);
  }
}
