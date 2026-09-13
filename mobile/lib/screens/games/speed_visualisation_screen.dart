import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/cognitive_game_models.dart';
import '../../services/cognitive_game_service.dart';
import '../../theme/app_theme.dart';

class VisualPattern {
  final List<String> symbols;

  const VisualPattern(this.symbols);

  bool matches(VisualPattern other) {
    if (symbols.length != other.symbols.length) return false;
    for (int i = 0; i < symbols.length; i++) {
      if (symbols[i] != other.symbols[i]) return false;
    }
    return true;
  }
}

const List<String> kSymbolPool = ['🔷', '🔶', '🟢', '🔺', '⭐', '🟣', '⬛', '💛'];

class SpeedVisualisationScreen extends StatefulWidget {
  final VoidCallback onBack;

  const SpeedVisualisationScreen({super.key, required this.onBack});

  @override
  State<SpeedVisualisationScreen> createState() => _SpeedVisualisationScreenState();
}

class _SpeedVisualisationScreenState extends State<SpeedVisualisationScreen> {
  static const int kTotalRounds = 10;
  int _currentRound = 1;
  int _score = 0;
  int _correctCount = 0;
  int _incorrectCount = 0;
  int _streak = 0;
  int _maxStreak = 0;
  final List<int> _responseTimes = []; // in ms

  late DateTime _roundStartTime;
  late DateTime _sessionStartTime;
  Timer? _sessionTimer;
  Timer? _advanceTimer;
  int _elapsedSeconds = 0;

  late VisualPattern _referencePattern;
  late List<VisualPattern> _choices;
  int _correctChoiceIndex = 0;

  String? _lastFeedback;
  Color _feedbackColor = AppColors.success;

  @override
  void initState() {
    super.initState();
    _startSession();
  }

  @override
  void dispose() {
    _sessionTimer?.cancel();
    _advanceTimer?.cancel();
    super.dispose();
  }

  void _startSession() {
    _sessionTimer?.cancel();
    _sessionStartTime = DateTime.now();
    _currentRound = 1;
    _score = 0;
    _correctCount = 0;
    _incorrectCount = 0;
    _streak = 0;
    _maxStreak = 0;
    _elapsedSeconds = 0;
    _responseTimes.clear();

    _sessionTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsedSeconds++);
    });

    _setupRound(_currentRound);
  }

  void _setupRound(int round) {
    final random = Random();

    // Pattern length scales with round:
    // Round 1-4: 3 symbols
    // Round 5-10: 4 symbols
    final patternLen = round > 4 ? 4 : 3;

    final poolCopy = List<String>.from(kSymbolPool)..shuffle(random);
    final refSymbols = poolCopy.take(patternLen).toList();
    _referencePattern = VisualPattern(refSymbols);

    // Number of choices: 3 choices in early rounds, 4 in later rounds
    final choiceCount = round > 5 ? 4 : 3;
    _correctChoiceIndex = random.nextInt(choiceCount);

    _choices = [];
    for (int i = 0; i < choiceCount; i++) {
      if (i == _correctChoiceIndex) {
        _choices.add(VisualPattern(List.from(refSymbols)));
      } else {
        // Create distractor by swapping or altering 1 symbol
        final distractor = List<String>.from(refSymbols);
        final alterPos = random.nextInt(patternLen);
        final unusedSymbols = kSymbolPool.where((s) => !refSymbols.contains(s)).toList();
        if (unusedSymbols.isNotEmpty) {
          distractor[alterPos] = unusedSymbols[random.nextInt(unusedSymbols.length)];
        } else {
          // Swap two elements
          final swapPos = (alterPos + 1) % patternLen;
          final tmp = distractor[alterPos];
          distractor[alterPos] = distractor[swapPos];
          distractor[swapPos] = tmp;
        }
        _choices.add(VisualPattern(distractor));
      }
    }

    _roundStartTime = DateTime.now();
    setState(() {
      _lastFeedback = null;
    });
  }

  void _onChoiceSelected(int index) {
    final latency = DateTime.now().difference(_roundStartTime).inMilliseconds;
    _responseTimes.add(latency);

    final isCorrect = index == _correctChoiceIndex;

    if (isCorrect) {
      _correctCount++;
      _streak++;
      if (_streak > _maxStreak) _maxStreak = _streak;

      // Speed bonus
      int speedBonus = 50;
      if (latency < 800) {
        speedBonus = 150;
      } else if (latency < 1400) {
        speedBonus = 100;
      }

      final points = 100 + speedBonus + (_streak * 20);
      _score += points;

      setState(() {
        _lastFeedback = '⚡ Fast! ${latency}ms (+$points pts)';
        _feedbackColor = AppColors.success;
      });
    } else {
      _incorrectCount++;
      _streak = 0;
      setState(() {
        _lastFeedback = 'Mismatched pattern!';
        _feedbackColor = AppColors.danger;
      });
    }

    _advanceTimer = Timer(const Duration(milliseconds: 380), () {
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
    _sessionTimer?.cancel();

    final avgLatency = _responseTimes.isNotEmpty
        ? (_responseTimes.reduce((a, b) => a + b) / _responseTimes.length).round()
        : 0;

    final accuracy = kTotalRounds > 0 ? ((_correctCount / kTotalRounds) * 100).toInt() : 0;

    int stars = 1;
    if (accuracy >= 80 && avgLatency < 1300) {
      stars = 3;
    } else if (accuracy >= 60) {
      stars = 2;
    }

    final session = GameSession(
      id: 'sv_${DateTime.now().millisecondsSinceEpoch}',
      gameId: 'speed_visualisation',
      startedAt: _sessionStartTime,
      completedAt: DateTime.now(),
      score: _score,
      level: (_currentRound > 5 ? 2 : 1),
      durationSeconds: _elapsedSeconds,
      moves: kTotalRounds,
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
              Text('⚡', style: GoogleFonts.outfit(fontSize: 44)),
              const SizedBox(height: 8),
              Text(
                'Rapid Visual Complete!',
                style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.text),
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
                  _buildStatRow('Total Score', '$_score pts'),
                  const Divider(height: 12),
                  _buildStatRow('Avg Reaction Time', '${avgLatency}ms'),
                  const Divider(height: 12),
                  _buildStatRow('Accuracy', '$accuracy% ($_correctCount/$kTotalRounds)'),
                  const Divider(height: 12),
                  _buildStatRow('Best Streak', '$_maxStreak streak'),
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
          'Speed Visualisation',
          style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.text),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.speed_outlined, size: 16, color: Color(0xFF0284C7)),
                const SizedBox(width: 4),
                Text(
                  '${_elapsedSeconds}s',
                  style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.text),
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
            // Top HUD
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
                        const Text('⚡', style: TextStyle(fontSize: 13)),
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

            // Reference Pattern Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Text(
                    'REFERENCE PATTERN',
                    style: GoogleFonts.outfit(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF38BDF8),
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: _referencePattern.symbols.map((sym) {
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 6),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        child: Text(sym, style: const TextStyle(fontSize: 32)),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Tap the identical sequence below as fast as you can',
                    style: GoogleFonts.notoSans(fontSize: 11, color: Colors.white70),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Feedback alert
            if (_lastFeedback != null)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 14),
                decoration: BoxDecoration(
                  color: _feedbackColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _lastFeedback!,
                  style: GoogleFonts.notoSans(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: _feedbackColor,
                  ),
                ),
              )
            else
              const SizedBox(height: 24),
            const SizedBox(height: 10),

            // Options List
            Column(
              children: List.generate(_choices.length, (index) {
                final pattern = _choices[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    onTap: () => _onChoiceSelected(index),
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.border, width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: pattern.symbols.map((sym) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: Text(sym, style: const TextStyle(fontSize: 30)),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}
