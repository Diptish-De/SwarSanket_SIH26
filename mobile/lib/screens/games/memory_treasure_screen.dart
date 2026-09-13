import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/cognitive_game_models.dart';
import '../../services/cognitive_game_service.dart';
import '../../theme/app_theme.dart';

class TreasureCardItem {
  final int id;
  final String icon;
  final String name;

  const TreasureCardItem({
    required this.id,
    required this.icon,
    required this.name,
  });
}

const List<TreasureCardItem> kTreasurePool = [
  TreasureCardItem(id: 0, icon: '💎', name: 'Ruby'),
  TreasureCardItem(id: 1, icon: '🪙', name: 'Coin'),
  TreasureCardItem(id: 2, icon: '👑', name: 'Crown'),
  TreasureCardItem(id: 3, icon: '🗝️', name: 'Key'),
  TreasureCardItem(id: 4, icon: '🏺', name: 'Vase'),
  TreasureCardItem(id: 5, icon: '🧭', name: 'Compass'),
  TreasureCardItem(id: 6, icon: '🗺️', name: 'Map'),
  TreasureCardItem(id: 7, icon: '💍', name: 'Ring'),
];

class MemoryTreasureScreen extends StatefulWidget {
  final VoidCallback onBack;

  const MemoryTreasureScreen({super.key, required this.onBack});

  @override
  State<MemoryTreasureScreen> createState() => _MemoryTreasureScreenState();
}

class _MemoryTreasureScreenState extends State<MemoryTreasureScreen> {
  int _level = 1;
  int _moves = 0;
  int _pairsFound = 0;
  int _elapsedSeconds = 0;
  Timer? _timer;
  DateTime _startTime = DateTime.now();

  late List<int> _deck; // 16 card IDs
  late List<bool> _isFlipped;
  late List<bool> _isMatched;

  int? _firstFlippedIndex;
  int? _secondFlippedIndex;
  bool _isProcessingPair = false;

  Timer? _pairActionTimer;

  @override
  void initState() {
    super.initState();
    _startNewGame();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pairActionTimer?.cancel();
    super.dispose();
  }

  void _startNewGame() {
    _timer?.cancel();
    _pairActionTimer?.cancel();
    _startTime = DateTime.now();
    _elapsedSeconds = 0;
    _moves = 0;
    _pairsFound = 0;
    _firstFlippedIndex = null;
    _secondFlippedIndex = null;
    _isProcessingPair = false;

    // Create 8 pairs (16 cards)
    final pairs = <int>[];
    for (int i = 0; i < 8; i++) {
      pairs.add(i);
      pairs.add(i);
    }
    pairs.shuffle();
    _deck = pairs;
    _isFlipped = List<bool>.filled(16, false);
    _isMatched = List<bool>.filled(16, false);

    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() => _elapsedSeconds++);
      }
    });

    setState(() {});
  }

  void _onCardTap(int index) {
    if (_isProcessingPair) return;
    if (_isMatched[index]) return;
    if (_isFlipped[index]) return;

    setState(() {
      _isFlipped[index] = true;
    });

    if (_firstFlippedIndex == null) {
      _firstFlippedIndex = index;
    } else {
      _secondFlippedIndex = index;
      _moves++;
      _isProcessingPair = true;

      final card1 = _deck[_firstFlippedIndex!];
      final card2 = _deck[_secondFlippedIndex!];

      if (card1 == card2) {
        // MATCH!
        _pairActionTimer = Timer(const Duration(milliseconds: 300), () {
          if (!mounted) return;
          setState(() {
            _isMatched[_firstFlippedIndex!] = true;
            _isMatched[_secondFlippedIndex!] = true;
            _pairsFound++;
            _firstFlippedIndex = null;
            _secondFlippedIndex = null;
            _isProcessingPair = false;
          });

          if (_pairsFound == 8) {
            _onGameCompleted();
          }
        });
      } else {
        // MISMATCH -> Flip back after delay
        _pairActionTimer = Timer(const Duration(milliseconds: 600), () {
          if (!mounted) return;
          setState(() {
            _isFlipped[_firstFlippedIndex!] = false;
            _isFlipped[_secondFlippedIndex!] = false;
            _firstFlippedIndex = null;
            _secondFlippedIndex = null;
            _isProcessingPair = false;
          });
        });
      }
    }
  }

  Future<void> _onGameCompleted() async {
    _timer?.cancel();

    // Calculate score
    // 1000 base minus move and time penalties
    final movePenalty = (_moves - 8) * 30;
    final timePenalty = _elapsedSeconds * 4;
    final score = (1000 - movePenalty - timePenalty).clamp(250, 1000);

    int stars = 3;
    if (_moves > 22) {
      stars = 1;
    } else if (_moves > 16) {
      stars = 2;
    }

    final session = GameSession(
      id: 'mt_${DateTime.now().millisecondsSinceEpoch}',
      gameId: 'memory_treasure',
      startedAt: _startTime,
      completedAt: DateTime.now(),
      score: score,
      level: _level,
      durationSeconds: _elapsedSeconds,
      moves: _moves,
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
              Text('🏆', style: GoogleFonts.outfit(fontSize: 44)),
              const SizedBox(height: 8),
              Text(
                'Great Job!',
                style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.text),
              ),
              const SizedBox(height: 4),
              Text(
                'All 8 pairs discovered!',
                style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.muted),
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
                  _buildStatRow('Score', '$score pts'),
                  const Divider(height: 12),
                  _buildStatRow('Time', _formatTime(_elapsedSeconds)),
                  const Divider(height: 12),
                  _buildStatRow('Moves', '$_moves turns'),
                  const Divider(height: 12),
                  _buildStatRow('Accuracy', '${((8 / _moves) * 100).clamp(0, 100).toInt()}%'),
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
                    _startNewGame();
                  },
                  child: const Text('Play Again'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    setState(() => _level++);
                    _startNewGame();
                  },
                  child: const Text('Next Level'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                widget.onBack();
              },
              child: Text(
                'Back to Games',
                style: GoogleFonts.notoSans(color: AppColors.muted, fontWeight: FontWeight.bold),
              ),
            ),
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

  String _formatTime(int secs) {
    final m = (secs ~/ 60).toString().padLeft(2, '0');
    final s = (secs % 60).toString().padLeft(2, '0');
    return '$m:$s';
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
          'Memory Treasure',
          style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.text),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.primary),
            onPressed: _startNewGame,
            tooltip: 'Restart Game',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        child: Column(
          children: [
            // Top HUD: Level, Moves, Elapsed Time
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildHudItem('Pairs Found', '$_pairsFound / 8', Icons.check_circle_outline, AppColors.success),
                  Container(height: 28, width: 1, color: AppColors.border),
                  _buildHudItem('Moves', '$_moves', Icons.touch_app_outlined, AppColors.primary),
                  Container(height: 28, width: 1, color: AppColors.border),
                  _buildHudItem('Time', _formatTime(_elapsedSeconds), Icons.timer_outlined, const Color(0xFFD97706)),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Friendly prompt
            Text(
              'Tap cards to reveal hidden treasures and match the pairs.',
              textAlign: TextAlign.center,
              style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.muted),
            ),
            const SizedBox(height: 14),

            // 4x4 Grid of Cards
            AspectRatio(
              aspectRatio: 1.0,
              child: GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 4,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                ),
                itemCount: 16,
                itemBuilder: (context, index) {
                  final isFlipped = _isFlipped[index];
                  final isMatched = _isMatched[index];
                  final item = kTreasurePool[_deck[index]];

                  return InkWell(
                    onTap: () => _onCardTap(index),
                    borderRadius: BorderRadius.circular(16),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      curve: Curves.easeInOut,
                      decoration: BoxDecoration(
                        color: isMatched
                            ? const Color(0xFFDCFCE7)
                            : (isFlipped ? Colors.white : const Color(0xFF0891B2)),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isMatched
                              ? AppColors.success
                              : (isFlipped ? AppColors.primary : const Color(0xFF0E7490)),
                          width: isMatched ? 2 : 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: isMatched
                                ? AppColors.success.withValues(alpha: 0.2)
                                : Colors.black.withValues(alpha: 0.08),
                            blurRadius: 6,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Center(
                        child: (isFlipped || isMatched)
                            ? Text(item.icon, style: const TextStyle(fontSize: 32))
                            : const Icon(
                                Icons.help_outline_rounded,
                                color: Colors.white,
                                size: 28,
                              ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 20),

            // Legend / status message
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  const Text('💡', style: TextStyle(fontSize: 18)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Remember card positions to make fewer moves and score higher!',
                      style: GoogleFonts.notoSans(fontSize: 12, color: const Color(0xFF166534)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHudItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(label, style: GoogleFonts.notoSans(fontSize: 11, color: AppColors.muted)),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.text),
        ),
      ],
    );
  }
}
