import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/cognitive_game_models.dart';
import '../../services/cognitive_game_service.dart';
import '../../theme/app_theme.dart';

class CognitiveGamesHubScreen extends StatefulWidget {
  final VoidCallback onBack;
  final Function(String gameRoute) onSelectGame;

  const CognitiveGamesHubScreen({
    super.key,
    required this.onBack,
    required this.onSelectGame,
  });

  @override
  State<CognitiveGamesHubScreen> createState() => _CognitiveGamesHubScreenState();
}

class _CognitiveGamesHubScreenState extends State<CognitiveGamesHubScreen> {
  Map<String, GameProgress> _progressMap = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProgress();
  }

  Future<void> _loadProgress() async {
    final map = await CognitiveGameService.getAllProgress();
    if (mounted) {
      setState(() {
        _progressMap = map;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final lpProgress = _progressMap['logic_puzzle'] ?? const GameProgress(gameId: 'logic_puzzle');
    final mtProgress = _progressMap['memory_treasure'] ?? const GameProgress(gameId: 'memory_treasure');
    final saProgress = _progressMap['selective_attention'] ?? const GameProgress(gameId: 'selective_attention');
    final svProgress = _progressMap['speed_visualisation'] ?? const GameProgress(gameId: 'speed_visualisation');

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
          'Cognitive Games',
          style: GoogleFonts.outfit(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.text,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadProgress,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                children: [
                  // Hero Header
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F766E), Color(0xFF0D9488)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F766E).withValues(alpha: 0.3),
                          blurRadius: 14,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.psychology_outlined, color: Colors.white, size: 26),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Cognitive Booster',
                                    style: GoogleFonts.outfit(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Text(
                                    'Play fun activities designed for cognitive engagement.',
                                    style: GoogleFonts.notoSans(
                                      fontSize: 12,
                                      color: Colors.white.withValues(alpha: 0.9),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Games List
                  _buildGameCard(
                    title: 'Logic Puzzle',
                    subtitle: '4x4 symbol deduction challenge',
                    icon: '🧩',
                    color: const Color(0xFF16A34A),
                    bgColor: const Color(0xFFDCFCE7),
                    statsBadge: lpProgress.bestScore > 0
                        ? 'Best: ${lpProgress.bestScore} • Level ${lpProgress.highestLevel}'
                        : 'New • Tap to play',
                    onTap: () => widget.onSelectGame('game_logic_puzzle'),
                  ),

                  _buildGameCard(
                    title: 'Memory Treasure',
                    subtitle: 'Find hidden matching pairs of treasure cards',
                    icon: '🃏',
                    color: const Color(0xFF0284C7),
                    bgColor: const Color(0xFFE0F2FE),
                    statsBadge: mtProgress.bestScore > 0
                        ? 'Best: ${mtProgress.bestScore} • Best Time: ${mtProgress.formattedBestTime}'
                        : 'New • Tap to play',
                    onTap: () => widget.onSelectGame('game_memory_treasure'),
                  ),

                  _buildGameCard(
                    title: 'Selective Attention',
                    subtitle: 'Spot target symbols quickly among distractors',
                    icon: '🎯',
                    color: const Color(0xFFD97706),
                    bgColor: const Color(0xFFFEF3C7),
                    statsBadge: saProgress.bestScore > 0
                        ? 'Best: ${saProgress.bestScore} • Streak: ${saProgress.bestStreak}'
                        : 'New • Tap to play',
                    onTap: () => widget.onSelectGame('game_selective_attention'),
                  ),

                  _buildGameCard(
                    title: 'Speed Visualisation',
                    subtitle: 'Rapid visual pattern matching against the clock',
                    icon: '⚡',
                    color: const Color(0xFF9333EA),
                    bgColor: const Color(0xFFF3E8FF),
                    statsBadge: svProgress.bestScore > 0
                        ? 'Best: ${svProgress.bestScore} • ${svProgress.gamesPlayed} played'
                        : 'New • Tap to play',
                    onTap: () => widget.onSelectGame('game_speed_visualisation'),
                  ),

                  const SizedBox(height: 16),

                  // Medical Disclaimer Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline, color: AppColors.muted, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'These games are for cognitive engagement and entertainment. Game scores are not a medical diagnosis.',
                            style: GoogleFonts.notoSans(
                              fontSize: 12,
                              color: AppColors.muted,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildGameCard({
    required String title,
    required String subtitle,
    required String icon,
    required Color color,
    required Color bgColor,
    required String statsBadge,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(22),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Icon Box
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Center(
                    child: Text(icon, style: const TextStyle(fontSize: 28)),
                  ),
                ),
                const SizedBox(width: 14),
                // Texts
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.outfit(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: GoogleFonts.notoSans(
                          fontSize: 12,
                          color: AppColors.textSub,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Stats pill
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.bg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          statsBadge,
                          style: GoogleFonts.notoSans(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: color,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: AppColors.muted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
