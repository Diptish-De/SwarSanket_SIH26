/// Representation of the 4 cognitive engagement games.
enum CognitiveGameType {
  logicPuzzle,
  memoryTreasure,
  selectiveAttention,
  speedVisualisation,
}

extension CognitiveGameTypeExt on CognitiveGameType {
  String get id {
    switch (this) {
      case CognitiveGameType.logicPuzzle:
        return 'logic_puzzle';
      case CognitiveGameType.memoryTreasure:
        return 'memory_treasure';
      case CognitiveGameType.selectiveAttention:
        return 'selective_attention';
      case CognitiveGameType.speedVisualisation:
        return 'speed_visualisation';
    }
  }

  String get title {
    switch (this) {
      case CognitiveGameType.logicPuzzle:
        return 'Logic Puzzle';
      case CognitiveGameType.memoryTreasure:
        return 'Memory Treasure';
      case CognitiveGameType.selectiveAttention:
        return 'Selective Attention';
      case CognitiveGameType.speedVisualisation:
        return 'Speed Visualisation';
    }
  }

  String get subtitle {
    switch (this) {
      case CognitiveGameType.logicPuzzle:
        return '4x4 symbol deduction challenge';
      case CognitiveGameType.memoryTreasure:
        return 'Find hidden matching pairs';
      case CognitiveGameType.selectiveAttention:
        return 'Spot target symbols among distractors';
      case CognitiveGameType.speedVisualisation:
        return 'Rapid visual pattern matching';
    }
  }
}

/// A completed or active single game session.
class GameSession {
  final String id;
  final String gameId;
  final DateTime startedAt;
  final DateTime? completedAt;
  final int score;
  final int level;
  final int durationSeconds;
  final int moves;
  final int mistakes;
  final int streak;
  final int stars;

  const GameSession({
    required this.id,
    required this.gameId,
    required this.startedAt,
    this.completedAt,
    required this.score,
    required this.level,
    required this.durationSeconds,
    this.moves = 0,
    this.mistakes = 0,
    this.streak = 0,
    this.stars = 3,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'gameId': gameId,
        'startedAt': startedAt.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
        'score': score,
        'level': level,
        'durationSeconds': durationSeconds,
        'moves': moves,
        'mistakes': mistakes,
        'streak': streak,
        'stars': stars,
      };

  factory GameSession.fromJson(Map<String, dynamic> json) => GameSession(
        id: json['id'] as String? ?? '',
        gameId: json['gameId'] as String? ?? '',
        startedAt: DateTime.tryParse(json['startedAt'] as String? ?? '') ??
            DateTime.now(),
        completedAt: json['completedAt'] != null
            ? DateTime.tryParse(json['completedAt'] as String)
            : null,
        score: json['score'] as int? ?? 0,
        level: json['level'] as int? ?? 1,
        durationSeconds: json['durationSeconds'] as int? ?? 0,
        moves: json['moves'] as int? ?? 0,
        mistakes: json['mistakes'] as int? ?? 0,
        streak: json['streak'] as int? ?? 0,
        stars: json['stars'] as int? ?? 1,
      );
}

/// Aggregated user progress per game (best score, best time, level reached).
class GameProgress {
  final String gameId;
  final int bestScore;
  final int highestLevel;
  final int bestTimeSeconds;
  final int bestStreak;
  final int gamesPlayed;
  final DateTime? lastPlayed;

  const GameProgress({
    required this.gameId,
    this.bestScore = 0,
    this.highestLevel = 1,
    this.bestTimeSeconds = 0,
    this.bestStreak = 0,
    this.gamesPlayed = 0,
    this.lastPlayed,
  });

  GameProgress copyWith({
    int? bestScore,
    int? highestLevel,
    int? bestTimeSeconds,
    int? bestStreak,
    int? gamesPlayed,
    DateTime? lastPlayed,
  }) {
    return GameProgress(
      gameId: gameId,
      bestScore: bestScore ?? this.bestScore,
      highestLevel: highestLevel ?? this.highestLevel,
      bestTimeSeconds: bestTimeSeconds ?? this.bestTimeSeconds,
      bestStreak: bestStreak ?? this.bestStreak,
      gamesPlayed: gamesPlayed ?? this.gamesPlayed,
      lastPlayed: lastPlayed ?? this.lastPlayed,
    );
  }

  Map<String, dynamic> toJson() => {
        'gameId': gameId,
        'bestScore': bestScore,
        'highestLevel': highestLevel,
        'bestTimeSeconds': bestTimeSeconds,
        'bestStreak': bestStreak,
        'gamesPlayed': gamesPlayed,
        'lastPlayed': lastPlayed?.toIso8601String(),
      };

  factory GameProgress.fromJson(Map<String, dynamic> json) => GameProgress(
        gameId: json['gameId'] as String? ?? '',
        bestScore: json['bestScore'] as int? ?? 0,
        highestLevel: json['highestLevel'] as int? ?? 1,
        bestTimeSeconds: json['bestTimeSeconds'] as int? ?? 0,
        bestStreak: json['bestStreak'] as int? ?? 0,
        gamesPlayed: json['gamesPlayed'] as int? ?? 0,
        lastPlayed: json['lastPlayed'] != null
            ? DateTime.tryParse(json['lastPlayed'] as String)
            : null,
      );

  String get formattedBestTime {
    if (bestTimeSeconds <= 0) return '--:--';
    final minutes = (bestTimeSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (bestTimeSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }
}
