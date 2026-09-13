import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/cognitive_game_models.dart';
import '../../services/cognitive_game_service.dart';
import '../../theme/app_theme.dart';

class PuzzleSymbol {
  final int id;
  final String label;
  final String icon;
  final Color color;
  final Color bgColor;

  const PuzzleSymbol({
    required this.id,
    required this.label,
    required this.icon,
    required this.color,
    required this.bgColor,
  });
}

const List<PuzzleSymbol> kPuzzleSymbols = [
  PuzzleSymbol(id: 0, label: 'Clover', icon: '🍀', color: Color(0xFF16A34A), bgColor: Color(0xFFDCFCE7)),
  PuzzleSymbol(id: 1, label: 'Spark', icon: '⚡', color: Color(0xFFD97706), bgColor: Color(0xFFFEF3C7)),
  PuzzleSymbol(id: 2, label: 'Water', icon: '💧', color: Color(0xFF0284C7), bgColor: Color(0xFFE0F2FE)),
  PuzzleSymbol(id: 3, label: 'Flame', icon: '🔥', color: Color(0xFFDC2626), bgColor: Color(0xFFFEE2E2)),
];

/// 4x4 Latin Square solution templates
const List<List<int>> kSolutionTemplates = [
  // Template 0
  [
    0, 1, 2, 3,
    2, 3, 0, 1,
    3, 0, 1, 2,
    1, 2, 3, 0,
  ],
  // Template 1
  [
    1, 2, 3, 0,
    3, 0, 1, 2,
    0, 1, 2, 3,
    2, 3, 0, 1,
  ],
  // Template 2
  [
    2, 3, 0, 1,
    0, 1, 2, 3,
    1, 2, 3, 0,
    3, 0, 1, 2,
  ],
];

class LogicPuzzleScreen extends StatefulWidget {
  final VoidCallback onBack;

  const LogicPuzzleScreen({super.key, required this.onBack});

  @override
  State<LogicPuzzleScreen> createState() => _LogicPuzzleScreenState();
}

class _LogicPuzzleScreenState extends State<LogicPuzzleScreen> {
  int _currentLevel = 1;
  int _score = 0;
  int _lives = 3;
  int _selectedCellIndex = -1;
  int _elapsedSeconds = 0;
  Timer? _timer;
  DateTime _startTime = DateTime.now();

  late List<int> _solution;
  late List<int?> _board; // null for empty, 0..3 for filled
  late List<bool> _isGivenClue;
  String? _feedbackMessage;

  @override
  void initState() {
    super.initState();
    _startLevel(_currentLevel);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startLevel(int level) {
    _timer?.cancel();
    _startTime = DateTime.now();
    _elapsedSeconds = 0;
    _lives = 3;
    _selectedCellIndex = -1;
    _feedbackMessage = null;

    final templateIndex = (level - 1) % kSolutionTemplates.length;
    _solution = List<int>.from(kSolutionTemplates[templateIndex]);

    // Determine how many clues to keep based on level:
    // Level 1: 10 clues (6 empty)
    // Level 2: 8 clues (8 empty)
    // Level 3: 6 clues (10 empty)
    final cluesCount = (12 - level * 2).clamp(4, 10);

    final allIndices = List<int>.generate(16, (i) => i)..shuffle();
    final givenIndices = allIndices.take(cluesCount).toSet();

    _board = List<int?>.generate(16, (i) {
      return givenIndices.contains(i) ? _solution[i] : null;
    });

    _isGivenClue = List<bool>.generate(16, (i) => givenIndices.contains(i));

    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() => _elapsedSeconds++);
      }
    });

    setState(() {});
  }

  void _onCellTapped(int index) {
    if (_isGivenClue[index]) return; // Cannot edit pre-filled clues
    setState(() {
      _selectedCellIndex = index;
      _feedbackMessage = null;
    });
  }

  void _onSelectSymbol(int symbolId) {
    if (_selectedCellIndex < 0 || _isGivenClue[_selectedCellIndex]) return;

    final row = _selectedCellIndex ~/ 4;
    final col = _selectedCellIndex % 4;

    // Check row conflict
    bool rowConflict = false;
    for (int c = 0; c < 4; c++) {
      final idx = row * 4 + c;
      if (idx != _selectedCellIndex && _board[idx] == symbolId) {
        rowConflict = true;
        break;
      }
    }

    // Check col conflict
    bool colConflict = false;
    for (int r = 0; r < 4; r++) {
      final idx = r * 4 + col;
      if (idx != _selectedCellIndex && _board[idx] == symbolId) {
        colConflict = true;
        break;
      }
    }

    // Check if correct per solution
    final isSolutionMatch = _solution[_selectedCellIndex] == symbolId;

    if (rowConflict || colConflict || !isSolutionMatch) {
      // Invalid placement
      setState(() {
        _lives--;
        _feedbackMessage = 'Duplicate symbol in row or column!';
      });

      if (_lives <= 0) {
        _showGameOverDialog();
      }
      return;
    }

    // Valid placement!
    setState(() {
      _board[_selectedCellIndex] = symbolId;
      _score += 100;
      _feedbackMessage = 'Nice deduction! ⭐';
    });

    // Check if board complete
    final isComplete = !_board.any((val) => val == null);
    if (isComplete) {
      _onLevelComplete();
    }
  }

  void _onClearCell() {
    if (_selectedCellIndex < 0 || _isGivenClue[_selectedCellIndex]) return;
    setState(() {
      _board[_selectedCellIndex] = null;
      _feedbackMessage = null;
    });
  }

  Future<void> _onLevelComplete() async {
    _timer?.cancel();
    final bonus = (_lives * 50) + (100 - _elapsedSeconds).clamp(10, 100);
    final finalScore = _score + bonus;

    int stars = 3;
    if (_lives == 2) stars = 2;
    if (_lives == 1) stars = 1;

    final session = GameSession(
      id: 'lp_${DateTime.now().millisecondsSinceEpoch}',
      gameId: 'logic_puzzle',
      startedAt: _startTime,
      completedAt: DateTime.now(),
      score: finalScore,
      level: _currentLevel,
      durationSeconds: _elapsedSeconds,
      mistakes: 3 - _lives,
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
              Text('🎉', style: GoogleFonts.outfit(fontSize: 42)),
              const SizedBox(height: 8),
              Text(
                'Level $_currentLevel Solved!',
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
                  size: 36,
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
                  _buildStatRow('Score', '$finalScore pts'),
                  const Divider(height: 12),
                  _buildStatRow('Time', '${_elapsedSeconds}s'),
                  const Divider(height: 12),
                  _buildStatRow('Lives Remaining', '$_lives / 3'),
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
                    _startLevel(_currentLevel);
                  },
                  child: const Text('Play Again'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    setState(() => _currentLevel++);
                    _startLevel(_currentLevel);
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

  void _showGameOverDialog() {
    _timer?.cancel();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Center(
          child: Text(
            'Out of Lives',
            style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.danger),
          ),
        ),
        content: Text(
          'Don\'t worry! Take your time to inspect the rows and columns, then try again.',
          textAlign: TextAlign.center,
          style: GoogleFonts.notoSans(fontSize: 14, color: AppColors.textSub),
        ),
        actions: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    widget.onBack();
                  },
                  child: const Text('Exit'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    _startLevel(_currentLevel);
                  },
                  child: const Text('Retry Level'),
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
    final progress = _board.where((x) => x != null).length / 16.0;

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
          'Logic Puzzle',
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
                const Icon(Icons.timer_outlined, size: 16, color: AppColors.primary),
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
            // Top Stats Bar: Level, Lives, Score
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
                    'Level $_currentLevel',
                    style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                  ),
                ),
                // Lives
                Row(
                  children: List.generate(
                    3,
                    (i) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Icon(
                        i < _lives ? Icons.favorite : Icons.favorite_border,
                        color: AppColors.danger,
                        size: 20,
                      ),
                    ),
                  ),
                ),
                Text(
                  '$_score pts',
                  style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.text),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 6,
                backgroundColor: AppColors.border,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),
            const SizedBox(height: 10),

            // Objective instruction
            Text(
              'Each row & column must contain 🍀, ⚡, 💧, 🔥 without duplicates.',
              textAlign: TextAlign.center,
              style: GoogleFonts.notoSans(fontSize: 12, color: AppColors.muted),
            ),
            if (_feedbackMessage != null) ...[
              const SizedBox(height: 6),
              Text(
                _feedbackMessage!,
                textAlign: TextAlign.center,
                style: GoogleFonts.notoSans(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: _feedbackMessage!.contains('Duplicate') ? AppColors.danger : AppColors.success,
                ),
              ),
            ],
            const SizedBox(height: 14),

            // 4x4 Puzzle Grid
            AspectRatio(
              aspectRatio: 1.0,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: GridView.builder(
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    mainAxisSpacing: 6,
                    crossAxisSpacing: 6,
                  ),
                  itemCount: 16,
                  itemBuilder: (context, index) {
                    final value = _board[index];
                    final isGiven = _isGivenClue[index];
                    final isSelected = _selectedCellIndex == index;

                    Color cellBg = Colors.grey.shade50;
                    Border border = Border.all(color: AppColors.border);

                    if (isSelected) {
                      cellBg = const Color(0xFFE0F2FE);
                      border = Border.all(color: AppColors.primary, width: 2.5);
                    } else if (isGiven) {
                      cellBg = const Color(0xFFF1F5F9);
                      border = Border.all(color: Colors.grey.shade300);
                    } else if (value != null) {
                      cellBg = Colors.white;
                    }

                    return InkWell(
                      onTap: () => _onCellTapped(index),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        decoration: BoxDecoration(
                          color: cellBg,
                          borderRadius: BorderRadius.circular(12),
                          border: border,
                        ),
                        child: Center(
                          child: value != null
                              ? Text(
                                  kPuzzleSymbols[value].icon,
                                  style: const TextStyle(fontSize: 28),
                                )
                              : (isSelected
                                  ? const Icon(Icons.add, color: AppColors.primary, size: 20)
                                  : null),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Symbol Selection Tray
            Text(
              'Select symbol to place:',
              style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSub),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ...kPuzzleSymbols.map((sym) {
                  return InkWell(
                    onTap: () => _onSelectSymbol(sym.id),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: sym.bgColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: sym.color.withValues(alpha: 0.5), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: sym.color.withValues(alpha: 0.15),
                            blurRadius: 6,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(sym.icon, style: const TextStyle(fontSize: 28)),
                      ),
                    ),
                  );
                }),
                // Erase/Clear button
                InkWell(
                  onTap: _onClearCell,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    width: 50,
                    height: 60,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Icon(Icons.backspace_outlined, color: AppColors.muted, size: 22),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
