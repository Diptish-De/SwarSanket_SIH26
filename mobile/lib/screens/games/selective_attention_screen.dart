import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/cognitive_game_models.dart';
import '../../services/cognitive_game_service.dart';
import '../../theme/app_theme.dart';

class AttentionSymbol {
  final int id;
  final String icon;
  final String name;

  const AttentionSymbol({required this.id, required this.icon, required this.name});
}

const List<AttentionSymbol> kAttentionPool = [
  AttentionSymbol(id: 0, icon: '🌟', name: 'Star'),
  AttentionSymbol(id: 1, icon: '⭐', name: 'Glow Star'),
  AttentionSymbol(id: 2, icon: '✨', name: 'Sparkles'),
  AttentionSymbol(id: 3, icon: '🌙', name: 'Crescent'),
  AttentionSymbol(id: 4, icon: '☀️', name: 'Sun'),
  AttentionSymbol(id: 5, icon: '⚡', name: 'Bolt'),
  AttentionSymbol(id: 6, icon: '🎯', name: 'Target'),
  AttentionSymbol(id: 7, icon: '🔥', name: 'Fire'),
  AttentionSymbol(id: 8, icon: '💎', name: 'Diamond'),
  AttentionSymbol(id: 9, icon: '🍀', name: 'Clover'),
  AttentionSymbol(id: 10, icon: '🌸', name: 'Flower'),
  AttentionSymbol(id: 11, icon: '🍎', name: 'Apple'),
  AttentionSymbol(id: 12, icon: '🍓', name: 'Berry'),
  AttentionSymbol(id: 13, icon: '🍒', name: 'Cherry'),
  AttentionSymbol(id: 14, icon: '🎈', name: 'Balloon'),
  AttentionSymbol(id: 15, icon: '🔔', name: 'Bell'),
];

class SelectiveAttentionScreen extends StatefulWidget {
  final VoidCallback onBack;

  const SelectiveAttentionScreen({super.key, required this.onBack});

  @override
  State<SelectiveAttentionScreen> createState() => _SelectiveAttentionScreenState();
}

class _SelectiveAttentionScreenState extends State<SelectiveAttentionScreen> {
  int _currentRound = 1;
  static const int kTotalRounds = 10;
  int _score = 0;
  int _correctCount = 0;
  int _incorrectCount = 0;
  int _streak = 0;
  int _maxStreak = 0;
  int _roundTimeRemaining = 12;
  int _elapsedSeconds = 0;

  Timer? _roundTimer;
  Timer? _gameTimer;
  Timer? _advanceTimer;
  DateTime _startTime = DateTime.now();

  late AttentionSymbol _targetSymbol;
  late List<AttentionSymbol> _gridItems;
  late int _targetGridIndex;

  String? _feedbackText;
  Color _feedbackColor = AppColors.success;

  @override
  void initState() {
    super.initState();
    _startSession();
  }

  @override
  void dispose() {
    _roundTimer?.cancel();
    _gameTimer?.cancel();
    _advanceTimer?.cancel();
    super.dispose();
  }

  void _startSession() {
    _roundTimer?.cancel();
    _gameTimer?.cancel();
    _startTime = DateTime.now();
    _currentRound = 1;
    _score = 0;
    _correctCount = 0;
    _incorrectCount = 0;
    _streak = 0;
    _maxStreak = 0;
    _elapsedSeconds = 0;

    _gameTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsedSeconds++);
    });

    _setupRound(_currentRound);
  }

  void _setupRound(int round) {
    _roundTimer?.cancel();

    // Difficulty scaling:
    // Round 1-2: 6 items, 15 seconds
    // Round 3-5: 9 items, 12 seconds
    // Round 6-8: 12 items, 10 seconds
    // Round 9-10: 16 items, 8 seconds
    int itemCount = 6;
    int timeForRound = 14;

    if (round > 8) {
      itemCount = 16;
      timeForRound = 8;
    } else if (round > 5) {
      itemCount = 12;
      timeForRound = 10;
    } else if (round > 2) {
      itemCount = 9;
      timeForRound = 12;
    }

    _roundTimeRemaining = timeForRound;

    final random = Random();
    // Pick random target
    final targetIndexInPool = random.nextInt(kAttentionPool.length);
    _targetSymbol = kAttentionPool[targetIndexInPool];

    // Pick distractors (excluding target)
    final poolCopy = List<AttentionSymbol>.from(kAttentionPool)..removeAt(targetIndexInPool);
    poolCopy.shuffle(random);

    final distractors = <AttentionSymbol>[];
    for (int i = 0; i < itemCount - 1; i++) {
      distractors.add(poolCopy[i % poolCopy.length]);
    }

    // Place target randomly in grid
    _targetGridIndex = random.nextInt(itemCount);
    _gridItems = List<AttentionSymbol>.from(distractors);
    _gridItems.insert(_targetGridIndex, _targetSymbol);

    _roundTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_roundTimeRemaining > 1) {
          _roundTimeRemaining--;
        } else {
          // Time expired for this round!
          _onTimeExpired();
        }
      });
    });

    setState(() {
      _feedbackText = null;
    });
  }

  void _onTimeExpired() {
    _incorrectCount++;
    _streak = 0;
    _feedbackText = 'Time up!';
    _feedbackColor = AppColors.warning;

    _advanceNextRound();
  }

  void _onItemTapped(int index) {
    final tapped = _gridItems[index];

    if (tapped.id == _targetSymbol.id) {
      // CORRECT!
      final speedBonus = (_roundTimeRemaining * 10);
      final streakBonus = _streak * 15;
      final roundPoints = 100 + speedBonus + streakBonus;

      setState(() {
        _correctCount++;
        _streak++;
        if (_streak > _maxStreak) _maxStreak = _streak;
        _score += roundPoints;
        _feedbackText = 'Match found! +$roundPoints pts';
        _feedbackColor = AppColors.success;
      });

      _advanceNextRound();
    } else {
      // INCORRECT!
      setState(() {
        _incorrectCount++;
        _streak = 0;
        _score = (_score - 20).clamp(0, 99999);
        _feedbackText = 'Not that one! Keep searching';
        _feedbackColor = AppColors.danger;
      });
    }
  }

  void _advanceNextRound() {
    _roundTimer?.cancel();
    _advanceTimer = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      if (_currentRound >= kTotalRounds) {
        _onGameCompleted();
      } else {
        setState(() => _currentRound++);
        _setupRound(_currentRound);
      }
    });
  }

  Future<void> _onGameCompleted() async {
    _roundTimer?.cancel();
    _gameTimer?.cancel();

    final totalAttempts = _correctCount + _incorrectCount;
    final accuracy = totalAttempts > 0 ? ((_correctCount / totalAttempts) * 100).toInt() : 0;

    int stars = 1;
    if (accuracy >= 85 && _correctCount >= 7) {
      stars = 3;
    } else if (accuracy >= 65 && _correctCount >= 5) {
      stars = 2;
    }

    final session = GameSession(
      id: 'sa_${DateTime.now().millisecondsSinceEpoch}',
      gameId: 'selective_attention',
      startedAt: _startTime,
      completedAt: DateTime.now(),
      score: _score,
      level: (_currentRound > 5 ? 2 : 1),
      durationSeconds: _elapsedSeconds,
      moves: totalAttempts,
      mistakes: _incorrectCount,
      streak: _maxStreak,
      stars: stars,
    );

    await CognitiveGameService.recordCompletion(session);

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        title: Center(
          child: Column(
            children: [
              Text('🎯', style: GoogleFonts.outfit(fontSize: 44)),
              const SizedBox(height: 8),
              Text(
                'Focus Complete!',
                style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.text),
              ),
            ],
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                3,
                (i) => Icon(
                  i < stars ? Icons.star_rounded : Icons.star_outline_rounded,
                  color: const Color(0xFFF59E0B),
                  size: 38,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _buildStatRow('Score', '$_score pts'),
                  const Divider(height: 12),
                  _buildStatRow('Accuracy', '$accuracy% ($_correctCount/$totalAttempts)'),
                  const Divider(height: 12),
                  _buildStatRow('Best Streak', '$_maxStreak in a row'),
                  const Divider(height: 12),
                  _buildStatRow('Total Time', '${_elapsedSeconds}s'),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    _startSession();
                  },
                  child: const Text('Play Again'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    widget.onBack();
                  },
                  child: const Text('Back to Games'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String val) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.muted)),
        Text(val, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.text)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    int crossAxisCount = 3;
    if (_gridItems.length == 16) {
      crossAxisCount = 4;
    } else if (_gridItems.length == 6) {
      crossAxisCount = 3;
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.text),
          onPressed: widget.onBack,
        ),
        title: Text(
          'Selective Attention',
          style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.text),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: _roundTimeRemaining <= 3 ? const Color(0xFFFEE2E2) : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _roundTimeRemaining <= 3 ? AppColors.danger : AppColors.border,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.timer_outlined,
                  size: 16,
                  color: _roundTimeRemaining <= 3 ? AppColors.danger : AppColors.primary,
                ),
                const SizedBox(width: 4),
                Text(
                  '${_roundTimeRemaining}s',
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: _roundTimeRemaining <= 3 ? AppColors.danger : AppColors.text,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        child: Column(
          children: [
            // Top HUD: Round, Streak, Score
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'Round $_currentRound / $kTotalRounds',
                    style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                  ),
                ),
                if (_streak > 1)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Text('🔥', style: TextStyle(fontSize: 13)),
                        const SizedBox(width: 4),
                        Text(
                          '$_streak Streak',
                          style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFFD97706)),
                        ),
                      ],
                    ),
                  ),
                Text(
                  '$_score pts',
                  style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.text),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Target banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0284C7), Color(0xFF0369A1)],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.25),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Text(
                        _targetSymbol.icon,
                        style: const TextStyle(fontSize: 34),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'FIND THIS TARGET',
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.white.withValues(alpha: 0.8),
                            letterSpacing: 0.5,
                          ),
                        ),
                        Text(
                          _targetSymbol.name,
                          style: GoogleFonts.outfit(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          'Ignore distractors and tap as quickly as possible',
                          style: GoogleFonts.notoSans(
                            fontSize: 11,
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Feedback alert
            if (_feedbackText != null)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
                decoration: BoxDecoration(
                  color: _feedbackColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _feedbackText!,
                  style: GoogleFonts.notoSans(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: _feedbackColor,
                  ),
                ),
              )
            else
              const SizedBox(height: 24),
            const SizedBox(height: 12),

            // Items grid (targets + distractors)
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 360),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                  ),
                  itemCount: _gridItems.length,
                  itemBuilder: (context, index) {
                    final item = _gridItems[index];
                    return InkWell(
                      onTap: () => _onItemTapped(index),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Center(
                          child: Text(
                            item.icon,
                            style: const TextStyle(fontSize: 34),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
