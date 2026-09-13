import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../models/screening_models.dart';
import '../services/tts_service.dart';
import '../services/audio_service.dart';
import 'dart:io';
import '../services/api_service.dart';
import '../services/storage_service.dart';

// ─── Step Indicator Dots (Figma: [ — ] [ • ] [ • ]) ───────────────────────────

class StepProgressHeader extends StatelessWidget {
  final int currentStep; // 1, 2, 3
  final VoidCallback onBack;
  final VoidCallback onClose;

  const StepProgressHeader({
    super.key,
    required this.currentStep,
    required this.onBack,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.text, size: 20),
            onPressed: onBack,
          ),
          Row(
            children: [
              _buildDot(1 == currentStep),
              const SizedBox(width: 6),
              _buildDot(2 == currentStep),
              const SizedBox(width: 6),
              _buildDot(3 == currentStep),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.close, color: AppColors.text, size: 20),
            onPressed: onClose,
          ),
        ],
      ),
    );
  }

  Widget _buildDot(bool isActive) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      width: isActive ? 22 : 7,
      height: 7,
      decoration: BoxDecoration(
        color: isActive ? AppColors.primary : AppColors.border,
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }
}

// ─── Screen 1: Voice Check Intro ("Let's begin") ──────────────────────────────

class VoiceCheckIntroScreen extends StatelessWidget {
  final String language;
  final VoidCallback onBegin;
  final VoidCallback onAssisted;
  final VoidCallback onBack;

  const VoiceCheckIntroScreen({
    super.key,
    required this.language,
    required this.onBegin,
    required this.onAssisted,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    const guideText = 'This is a short voice check. It takes about 3–5 minutes.';

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.text),
          onPressed: onBack,
        ),
        title: Text(
          'Voice Check',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.text),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.close, color: AppColors.text),
            onPressed: onBack,
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Column(
            children: [
              const Spacer(),

              Text(
                'Let\'s begin',
                style: GoogleFonts.outfit(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                guideText,
                textAlign: TextAlign.center,
                style: GoogleFonts.notoSans(
                  fontSize: 14,
                  color: AppColors.textSub,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 32),

              // 3 Steps Grid (01 Listen, 02 Speak, 03 Finish)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildStepCard('01', 'Listen'),
                  const SizedBox(width: 14),
                  _buildStepCard('02', 'Speak'),
                  const SizedBox(width: 14),
                  _buildStepCard('03', 'Finish'),
                ],
              ),
              const SizedBox(height: 24),

              // Listen Button
              InkWell(
                onTap: () => TtsService().speak(
                  'Let\'s begin. This is a short voice check. It takes about 3 to 5 minutes.',
                  language,
                ),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.volume_up, size: 16, color: AppColors.primaryDark),
                      const SizedBox(width: 6),
                      Text(
                        'Listen',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const Spacer(),

              // Primary Action: Begin Voice Check
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: onBegin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Begin Voice Check',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Secondary Action: Someone is helping me
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: onAssisted,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Someone is helping me',
                    style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepCard(String number, String label) {
    return Container(
      width: 80,
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Text(
            number,
            style: GoogleFonts.outfit(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.notoSans(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppColors.primaryDark,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Task 1 of 3: Picture Description ("What do you see?") ────────────────────

class PictureDescriptionScreen extends StatelessWidget {
  final String language;
  final VoidCallback onStartSpeaking;
  final VoidCallback onBack;
  final VoidCallback onClose;

  const PictureDescriptionScreen({
    super.key,
    required this.language,
    required this.onStartSpeaking,
    required this.onBack,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    const prompt = 'Tell us what you see in the picture.';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            StepProgressHeader(currentStep: 1, onBack: onBack, onClose: onClose),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Column(
                  children: [
                    Text(
                      'What do you see?',
                      style: GoogleFonts.outfit(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      prompt,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.muted),
                    ),
                    const SizedBox(height: 12),

                    // Listen Pill
                    InkWell(
                      onTap: () => TtsService().speak(prompt, language),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.volume_up, size: 16, color: AppColors.primaryDark),
                            const SizedBox(width: 6),
                            Text(
                              'Listen',
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Countryside Illustrated Scene Card
                    Container(
                      width: double.infinity,
                      height: 220,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE0F2FE),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: AppColors.border),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(24),
                        child: CustomPaint(
                          painter: CountrysideScenePainter(),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Start Speaking Button
            Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: onStartSpeaking,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Start Speaking',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Custom Painter for Countryside Scene
class CountrysideScenePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Sun
    final sunPaint = Paint()..color = const Color(0xFFFDE047);
    final sunRayPaint = Paint()
      ..color = const Color(0xFFFACC15)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    final sunCenter = Offset(w * 0.82, h * 0.25);
    canvas.drawCircle(sunCenter, 22, sunPaint);
    for (int i = 0; i < 8; i++) {
      final angle = i * (pi / 4);
      final p1 = Offset(sunCenter.dx + cos(angle) * 26, sunCenter.dy + sin(angle) * 26);
      final p2 = Offset(sunCenter.dx + cos(angle) * 34, sunCenter.dy + sin(angle) * 34);
      canvas.drawLine(p1, p2, sunRayPaint);
    }

    // 2. White Cloud
    final cloudPaint = Paint()..color = Colors.white.withValues(alpha: 0.85);
    canvas.drawOval(Rect.fromLTWH(w * 0.15, h * 0.12, 80, 32), cloudPaint);
    canvas.drawCircle(Offset(w * 0.28, h * 0.2), 20, cloudPaint);

    // 3. Birds in distance
    final birdPaint = Paint()
      ..color = const Color(0xFF0F172A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawArc(Rect.fromLTWH(w * 0.45, h * 0.18, 12, 8), pi, pi, false, birdPaint);
    canvas.drawArc(Rect.fromLTWH(w * 0.48, h * 0.18, 12, 8), pi, pi, false, birdPaint);

    // 4. Green Ground
    final groundPaint = Paint()..color = const Color(0xFF86EFAC);
    canvas.drawRect(Rect.fromLTWH(0, h * 0.62, w, h * 0.38), groundPaint);

    // 5. House (Orange Roof & Body)
    final houseWall = Paint()..color = const Color(0xFFFED7AA);
    canvas.drawRect(Rect.fromLTWH(w * 0.12, h * 0.50, 70, 48), houseWall);

    final roofPath = Path()
      ..moveTo(w * 0.12 - 6, h * 0.50)
      ..lineTo(w * 0.12 + 35, h * 0.36)
      ..lineTo(w * 0.12 + 76, h * 0.50)
      ..close();
    final roofPaint = Paint()..color = const Color(0xFFFB923C);
    canvas.drawPath(roofPath, roofPaint);

    // House Window & Door
    final windowPaint = Paint()..color = const Color(0xFFBFDBFE);
    canvas.drawRect(Rect.fromLTWH(w * 0.15, h * 0.55, 14, 14), windowPaint);

    final doorPaint = Paint()..color = const Color(0xFFC084FC);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(w * 0.23, h * 0.60, 16, 26), const Radius.circular(4)),
      doorPaint,
    );

    // 6. Tree
    final trunkPaint = Paint()..color = const Color(0xFF94A3B8)..strokeWidth = 6;
    canvas.drawLine(Offset(w * 0.52, h * 0.54), Offset(w * 0.52, h * 0.72), trunkPaint);

    final foliagePaint = Paint()..color = const Color(0xFF4ADE80);
    canvas.drawCircle(Offset(w * 0.52, h * 0.48), 24, foliagePaint);

    // 7. Bicycle Wheels
    final bikePaint = Paint()
      ..color = const Color(0xFF0F172A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;
    canvas.drawCircle(Offset(w * 0.72, h * 0.72), 12, bikePaint);
    canvas.drawCircle(Offset(w * 0.84, h * 0.72), 12, bikePaint);
    canvas.drawLine(Offset(w * 0.72, h * 0.72), Offset(w * 0.78, h * 0.65), bikePaint);
    canvas.drawLine(Offset(w * 0.84, h * 0.72), Offset(w * 0.78, h * 0.65), bikePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─── Task 2A: Memory Recall ("Listen carefully") ──────────────────────────────

class MemoryRecallIntroScreen extends StatelessWidget {
  final String language;
  final VoidCallback onContinue;
  final VoidCallback onBack;
  final VoidCallback onClose;

  const MemoryRecallIntroScreen({
    super.key,
    required this.language,
    required this.onContinue,
    required this.onBack,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    const wordList = 'Cow · River · Book · House · Flower';
    const subText = 'We will read some words. Try to remember them.';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            StepProgressHeader(currentStep: 2, onBack: onBack, onClose: onClose),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  children: [
                    const SizedBox(height: 20),
                    // Large Cyan Audio Icon Box
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.volume_up_rounded,
                          size: 38,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    Text(
                      'Listen carefully',
                      style: GoogleFonts.outfit(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subText,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.muted),
                    ),
                    const SizedBox(height: 32),

                    // Words Display Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 26),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: AppColors.border),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Text(
                        wordList,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Continue Action
            Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: onContinue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'I heard the words — continue',
                    style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Task 2B: Memory Recall Prompt ("What do you remember?") ──────────────────

class MemoryRecallPromptScreen extends StatelessWidget {
  final String language;
  final VoidCallback onStartSpeaking;
  final VoidCallback onListenAgain;
  final VoidCallback onBack;
  final VoidCallback onClose;

  const MemoryRecallPromptScreen({
    super.key,
    required this.language,
    required this.onStartSpeaking,
    required this.onListenAgain,
    required this.onBack,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            StepProgressHeader(currentStep: 2, onBack: onBack, onClose: onClose),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  children: [
                    const SizedBox(height: 30),
                    // Info Icon Box (!)
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.info_outline_rounded,
                          size: 38,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    Text(
                      'What do you remember?',
                      style: GoogleFonts.outfit(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Tell us the words you remember.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.muted),
                    ),
                  ],
                ),
              ),
            ),

            // Actions
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: onStartSpeaking,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(
                        'Start Speaking',
                        style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton(
                      onPressed: onListenAgain,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary, width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(
                        'Listen Again',
                        style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
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
}

// ─── Task 3: Conversational Prompt ("One more") ───────────────────────────────

class ConversationalTaskScreen extends StatelessWidget {
  final String language;
  final VoidCallback onStartSpeaking;
  final VoidCallback onBack;
  final VoidCallback onClose;

  const ConversationalTaskScreen({
    super.key,
    required this.language,
    required this.onStartSpeaking,
    required this.onBack,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    const prompt = 'Tell us about something you enjoy doing.';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            StepProgressHeader(currentStep: 3, onBack: onBack, onClose: onClose),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  children: [
                    const SizedBox(height: 20),
                    // Chat Message Icon Box
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.chat_bubble_outline_rounded,
                          size: 36,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    Text(
                      'One more',
                      style: GoogleFonts.outfit(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      prompt,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.notoSans(fontSize: 14, color: AppColors.textSub),
                    ),
                    const SizedBox(height: 24),

                    // Quote Card: "There are no right or wrong answers."
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        '“There are no right or wrong answers.”',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.notoSans(
                          fontSize: 13,
                          fontStyle: FontStyle.italic,
                          color: AppColors.muted,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Listen Pill
                    InkWell(
                      onTap: () => TtsService().speak(prompt, language),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.volume_up, size: 16, color: AppColors.primaryDark),
                            const SizedBox(width: 6),
                            Text(
                              'Listen',
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Start Speaking Button
            Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: onStartSpeaking,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Start Speaking',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Step: Tap to Speak (Ready State) ─────────────────────────────────────────

class ReadyToSpeakScreen extends StatelessWidget {
  final int stepIndex; // 1, 2, 3
  final VoidCallback onStartRecording;
  final VoidCallback onBack;
  final VoidCallback onClose;

  const ReadyToSpeakScreen({
    super.key,
    required this.stepIndex,
    required this.onStartRecording,
    required this.onBack,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            StepProgressHeader(currentStep: stepIndex, onBack: onBack, onClose: onClose),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 10),

                    // Teal Mic Button
                    GestureDetector(
                      onTap: onStartRecording,
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.3),
                              blurRadius: 28,
                              spreadRadius: 4,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.mic,
                          color: Colors.white,
                          size: 54,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    Text(
                      'Ready to Speak',
                      style: GoogleFonts.outfit(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Please speak naturally for the requested task.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.notoSans(
                        fontSize: 14,
                        color: AppColors.muted,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Elderly-friendly instructions card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildTipRow(Icons.volume_off_rounded, 'Find a quiet place without background noise.'),
                          const SizedBox(height: 12),
                          _buildTipRow(Icons.timer_outlined, 'Speak for at least 20–30 seconds (around 50 words or more).'),
                          const SizedBox(height: 12),
                          _buildTipRow(Icons.record_voice_over_rounded, 'Speak clearly at your normal pace describing the picture.'),
                          const SizedBox(height: 12),
                          _buildTipRow(Icons.touch_app_rounded, 'Tap Start Recording when you are ready.'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Big Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton.icon(
                        onPressed: onStartRecording,
                        icon: const Icon(Icons.fiber_manual_record, color: Colors.white, size: 20),
                        label: Text(
                          'Start Recording',
                          style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTipRow(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.text, height: 1.4),
          ),
        ),
      ],
    );
  }
}

// ─── Step: Active Recording Screen with Glowing Pulse & Waveforms ──────────────

class ActiveRecordingScreen extends StatefulWidget {
  final AudioRecorderService recorder;
  final int stepIndex; // 1, 2, 3
  final void Function(String? recordedPath) onFinish;
  final VoidCallback onBack;
  final VoidCallback onClose;

  const ActiveRecordingScreen({
    super.key,
    required this.recorder,
    required this.stepIndex,
    required this.onFinish,
    required this.onBack,
    required this.onClose,
  });

  @override
  State<ActiveRecordingScreen> createState() => _ActiveRecordingScreenState();
}

class _ActiveRecordingScreenState extends State<ActiveRecordingScreen> with SingleTickerProviderStateMixin {
  int _seconds = 0;
  Timer? _timer;
  late AnimationController _waveAnim;
  bool _permissionDenied = false;

  @override
  void initState() {
    super.initState();
    _waveAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
    _startRecording();
  }

  void _startRecording() async {
    _timer?.cancel();
    setState(() {
      _seconds = 0;
      _permissionDenied = false;
    });

    final started = await widget.recorder.start();
    if (!started) {
      if (mounted) {
        setState(() => _permissionDenied = true);
      }
      return;
    }

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted && !widget.recorder.isPaused) {
        setState(() => _seconds++);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _waveAnim.dispose();
    super.dispose();
  }

  void _confirmAndExit({required VoidCallback onConfirm}) async {
    final wasRecording = widget.recorder.isRecording && !widget.recorder.isPaused;
    if (wasRecording) {
      widget.recorder.pause();
      _waveAnim.stop();
      if (mounted) setState(() {});
    }

    if (!mounted) return;

    final shouldStop = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(
          'Stop recording?',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.text),
        ),
        content: Text(
          'If you leave now, this audio recording will not be saved.',
          style: GoogleFonts.notoSans(fontSize: 14, color: AppColors.textSub, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Continue Recording',
              style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.primary),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(
              'Stop Recording',
              style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (shouldStop == true) {
      await widget.recorder.stop();
      onConfirm();
    } else {
      if (wasRecording) {
        widget.recorder.resume();
        _waveAnim.repeat();
        if (mounted) setState(() {});
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmtTime = '${(_seconds ~/ 60).toString().padLeft(2, '0')}:${(_seconds % 60).toString().padLeft(2, '0')}';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _confirmAndExit(onConfirm: widget.onBack);
      },
      child: Scaffold(
        backgroundColor: AppColors.bg,
        body: SafeArea(
          child: Column(
            children: [
              StepProgressHeader(
                currentStep: widget.stepIndex,
                onBack: () => _confirmAndExit(onConfirm: widget.onBack),
                onClose: () => _confirmAndExit(onConfirm: widget.onClose),
              ),
            if (_permissionDenied)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(28.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 90,
                        height: 90,
                        decoration: const BoxDecoration(
                          color: Color(0xFFFEE2E2),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(Icons.mic_off_rounded, color: Color(0xFFDC2626), size: 48),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Microphone Access Needed',
                        style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.text),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'SwarSanket needs permission to access your device microphone to record your voice screening. Please grant microphone permission to continue.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.notoSans(fontSize: 14, color: AppColors.muted, height: 1.4),
                      ),
                      const SizedBox(height: 28),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton.icon(
                          onPressed: _startRecording,
                          icon: const Icon(Icons.refresh_rounded),
                          label: Text('Try Again / Grant Permission', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Red Pulsating Pause/Record Button with Glowing Shadow
                  GestureDetector(
                    onTap: () {
                      if (widget.recorder.isPaused) {
                        widget.recorder.resume();
                        _waveAnim.repeat();
                      } else {
                        widget.recorder.pause();
                        _waveAnim.stop();
                      }
                      setState(() {});
                    },
                    child: Container(
                      width: 140,
                      height: 140,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFFDC2626), // Solid red
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFDC2626).withValues(alpha: 0.35),
                            blurRadius: 36,
                            spreadRadius: 8,
                          ),
                          BoxShadow(
                            color: const Color(0xFFDC2626).withValues(alpha: 0.15),
                            blurRadius: 56,
                            spreadRadius: 16,
                          ),
                        ],
                      ),
                      child: Icon(
                        widget.recorder.isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                        color: Colors.white,
                        size: 60,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Red status: "— recording"
                  Text(
                    widget.recorder.isPaused ? '— paused' : '— recording',
                    style: GoogleFonts.notoSans(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFFDC2626),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Big Timer (00:04)
                  Text(
                    fmtTime,
                    style: GoogleFonts.outfit(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Speak naturally…',
                    style: GoogleFonts.notoSans(
                      fontSize: 13,
                      color: AppColors.muted,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Live Dynamic Oscillating Waveform Bars
                  AnimatedBuilder(
                    animation: _waveAnim,
                    builder: (context, child) {
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(24, (index) {
                          final phase = index * (pi / 5.5);
                          final sinVal = widget.recorder.isPaused
                              ? 0.0
                              : sin(_waveAnim.value * 2 * pi + phase).abs();
                          final height = 6.0 + (sinVal * 32.0);

                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 2.5),
                            width: 3.5,
                            height: height,
                            decoration: BoxDecoration(
                              color: AppColors.primaryDark.withValues(alpha: 0.7 + (sinVal * 0.3)),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          );
                        }),
                      );
                    },
                  ),
                ],
              ),
            ),

            // Bottom Buttons: Finish Recording & Pause
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () async {
                        if (_seconds < 5) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Please speak for at least 5 seconds before finishing.',
                                style: GoogleFonts.notoSans(fontSize: 14),
                              ),
                              backgroundColor: const Color(0xFFDC2626),
                              duration: const Duration(seconds: 3),
                            ),
                          );
                          return;
                        }
                        if (_seconds < 20) {
                          final proceed = await showDialog<bool>(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: Text('More Speech Recommended', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                              content: Text(
                                'The screening engine needs at least 20 seconds (around 50 words) to calculate a full screening score. You recorded \$_seconds seconds.\n\nWould you like to keep speaking or finish anyway?',
                                style: GoogleFonts.notoSans(fontSize: 14, height: 1.4),
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(ctx, false),
                                  child: const Text('Keep Speaking'),
                                ),
                                ElevatedButton(
                                  onPressed: () => Navigator.pop(ctx, true),
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                                  child: const Text('Finish Anyway'),
                                ),
                              ],
                            ),
                          );
                          if (proceed != true) return;
                        }
                        final path = await widget.recorder.stop();
                        widget.onFinish(path);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(
                        'Finish Recording',
                        style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton(
                      onPressed: () {
                        if (widget.recorder.isPaused) {
                          widget.recorder.resume();
                          _waveAnim.repeat();
                        } else {
                          widget.recorder.pause();
                          _waveAnim.stop();
                        }
                        setState(() {});
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary, width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(
                        widget.recorder.isPaused ? 'Resume' : 'Pause',
                        style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
  }
}

// ─── Step: Voice Quality Check ("Recording looks good") ────────────────────────

class VoiceQualityCheckScreen extends StatelessWidget {
  final VoidCallback onContinue;

  const VoiceQualityCheckScreen({super.key, required this.onContinue});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const Spacer(),

              // Light Green Circle with Dark Green Checkmark
              Container(
                width: 90,
                height: 90,
                decoration: const BoxDecoration(
                  color: Color(0xFFDCFCE7), // Light green #DCFCE7
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.check_rounded,
                    size: 48,
                    color: Color(0xFF16A34A), // Forest green
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Green Badge: Voice Quality
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'Voice Quality',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF16A34A),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Text(
                'Recording looks good',
                style: GoogleFonts.outfit(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Ready to continue.',
                style: GoogleFonts.notoSans(
                  fontSize: 14,
                  color: AppColors.muted,
                ),
              ),

              const Spacer(),

              // Continue Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: onContinue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Continue',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Step: Recording Review ("Your recording is ready") ────────────────────────

class RecordingReviewScreen extends StatefulWidget {
  final VoidCallback onContinue;
  final VoidCallback onRecordAgain;

  const RecordingReviewScreen({
    super.key,
    required this.onContinue,
    required this.onRecordAgain,
  });

  @override
  State<RecordingReviewScreen> createState() => _RecordingReviewScreenState();
}

class _RecordingReviewScreenState extends State<RecordingReviewScreen> {
  bool _isPlaying = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const Spacer(),

              // Light Green Circle with Checkmark
              Container(
                width: 90,
                height: 90,
                decoration: const BoxDecoration(
                  color: Color(0xFFDCFCE7),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.check_rounded,
                    size: 48,
                    color: Color(0xFF16A34A),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              Text(
                'Your recording is ready',
                style: GoogleFonts.outfit(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Listen before you continue',
                style: GoogleFonts.notoSans(
                  fontSize: 14,
                  color: AppColors.muted,
                ),
              ),
              const SizedBox(height: 32),

              // Audio Playback Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Play / Pause Circle
                    GestureDetector(
                      onTap: () => setState(() => _isPlaying = !_isPlaying),
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                          color: Colors.white,
                          size: 26,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),

                    // Static/Animated Waveform Track
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: List.generate(20, (index) {
                          final h = (index % 4 == 0) ? 14.0 : ((index % 2 == 0) ? 8.0 : 4.0);
                          return Container(
                            width: 3,
                            height: h,
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.8),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          );
                        }),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Duration Timestamp (0:27)
                    Text(
                      '0:27',
                      style: GoogleFonts.notoSans(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Actions: Continue & Record Again
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: widget.onContinue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Continue',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: widget.onRecordAgain,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Record Again',
                    style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Step: Completion Screen ("You're done!") ──────────────────────────────────

class CompletionScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const CompletionScreen({super.key, required this.onComplete});

  @override
  State<CompletionScreen> createState() => _CompletionScreenState();
}

class _CompletionScreenState extends State<CompletionScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1400), widget.onComplete);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              Container(
                width: 90,
                height: 90,
                decoration: const BoxDecoration(
                  color: Color(0xFFDCFCE7),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.check_rounded,
                    size: 48,
                    color: Color(0xFF16A34A),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              Text(
                'You\'re done!',
                style: GoogleFonts.outfit(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Thank you. We\'re checking your voice now.',
                textAlign: TextAlign.center,
                style: GoogleFonts.notoSans(
                  fontSize: 14,
                  color: AppColors.muted,
                ),
              ),
              const SizedBox(height: 32),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Preparing analysis…',
                    style: GoogleFonts.notoSans(
                      fontSize: 13,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),

              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Step: ML Processing Screen (Real Backend HTTP Pipeline) ──────────────────────

class AnalyzingVoiceScreen extends StatefulWidget {
  final String? audioPath;
  final String patientName;
  final int patientAge;
  final String language;
  final bool assistedMode;
  final void Function(ScreeningApiResponse apiResponse, ScreeningSession session) onSuccess;
  final VoidCallback onCancel;

  const AnalyzingVoiceScreen({
    super.key,
    required this.audioPath,
    required this.patientName,
    required this.patientAge,
    required this.language,
    required this.assistedMode,
    required this.onSuccess,
    required this.onCancel,
  });

  @override
  State<AnalyzingVoiceScreen> createState() => _AnalyzingVoiceScreenState();
}

class _AnalyzingVoiceScreenState extends State<AnalyzingVoiceScreen> {
  bool _isAnalyzing = true;
  String? _errorMessage;
  final TextEditingController _ipController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _startAnalysis();
  }

  @override
  void dispose() {
    _ipController.dispose();
    super.dispose();
  }

  Future<void> _startAnalysis() async {
    setState(() {
      _isAnalyzing = true;
      _errorMessage = null;
    });

    final audioPath = widget.audioPath;
    if (audioPath == null || audioPath.trim().isEmpty) {
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
          _errorMessage = 'No recorded audio file was captured. Please record your voice and try again.';
        });
      }
      return;
    }

    final audioFile = File(audioPath);
    if (!audioFile.existsSync()) {
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
          _errorMessage = 'Recorded audio file could not be found on device storage. Please try recording again.';
        });
      }
      return;
    }

    try {
      debugPrint('[SwarSanket AnalyzingVoiceScreen] Calling real backend with ${audioFile.path}...');
      final apiResponse = await ApiService.analyzeAudio(audioFile);

      final session = ScreeningSession.fromApiResponse(
        patientName: widget.patientName,
        patientAge: widget.patientAge,
        language: widget.language,
        assistedMode: widget.assistedMode,
        response: apiResponse,
      );

      await StorageService.saveScreening(session);

      if (mounted) {
        widget.onSuccess(apiResponse, session);
      }
    } catch (e) {
      debugPrint('[SwarSanket AnalyzingVoiceScreen] Error during screening: $e');
      if (mounted) {
        String cleanMessage = e.toString()
            .replaceFirst(RegExp(r"^[A-Za-z]+Exception: "), "")
            .replaceFirst("HttpException: ", "");
        setState(() {
          _isAnalyzing = false;
          _errorMessage = cleanMessage;
        });
      }
    }
  }

  void _showConfigureIpDialog() {
    _ipController.text = ApiService.baseUrl;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Configure Screening Server IP', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'For physical phone testing, enter your development Mac local Wi-Fi IP (e.g. http://192.168.1.100:8001):',
              style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.textSub),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _ipController,
              decoration: InputDecoration(
                hintText: 'http://<MAC-LAN-IP>:8001',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              keyboardType: TextInputType.url,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final newUrl = _ipController.text.trim();
              if (newUrl.isNotEmpty) {
                await ApiService.setBaseUrl(newUrl);
              }
              if (ctx.mounted) Navigator.pop(ctx);
              _startAnalysis();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Save & Retry'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28.0),
          child: _isAnalyzing ? _buildAnalyzingView() : _buildErrorView(),
        ),
      ),
    );
  }

  Widget _buildAnalyzingView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Spacer(),

        // Light Cyan Wave Icon Box
        Container(
          width: 90,
          height: 90,
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: BorderRadius.circular(26),
          ),
          child: const Center(
            child: Icon(
              Icons.waves_rounded,
              size: 44,
              color: AppColors.primaryDark,
            ),
          ),
        ),
        const SizedBox(height: 28),

        Text(
          'Analyzing your voice…',
          style: GoogleFonts.outfit(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppColors.text,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Running Faster-Whisper ASR & Quantum-Hybrid ML inference.',
          textAlign: TextAlign.center,
          style: GoogleFonts.notoSans(
            fontSize: 13,
            color: AppColors.muted,
          ),
        ),
        const SizedBox(height: 36),

        // Indeterminate Progress Indicator for Real Network Call
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: const LinearProgressIndicator(
            minHeight: 10,
            backgroundColor: AppColors.border,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Extracting acoustic & linguistic biomarkers…',
          style: GoogleFonts.notoSans(
            fontSize: 12,
            color: AppColors.muted,
          ),
        ),
        const SizedBox(height: 24),

        // Privacy Pill
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_outline, size: 16, color: AppColors.primaryDark),
              const SizedBox(width: 8),
              Text(
                'Your information is processed securely.',
                style: GoogleFonts.notoSans(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
            ],
          ),
        ),

        const Spacer(),

        TextButton(
          onPressed: widget.onCancel,
          child: Text(
            'Cancel Check',
            style: GoogleFonts.notoSans(
              fontSize: 14,
              color: AppColors.muted,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildErrorView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Spacer(),

        Container(
          width: 80,
          height: 80,
          decoration: const BoxDecoration(
            color: Color(0xFFFEE2E2),
            shape: BoxShape.circle,
          ),
          child: const Center(
            child: Icon(
              Icons.error_outline_rounded,
              size: 44,
              color: Color(0xFFDC2626),
            ),
          ),
        ),
        const SizedBox(height: 24),

        Text(
          'Unable to Analyze Recording',
          style: GoogleFonts.outfit(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.text,
          ),
        ),
        const SizedBox(height: 10),

        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Text(
            _errorMessage ?? 'An error occurred during communication with the screening backend. Please check your connection and try again.',
            textAlign: TextAlign.center,
            style: GoogleFonts.notoSans(
              fontSize: 13,
              color: AppColors.textSub,
              height: 1.4,
            ),
          ),
        ),
        const SizedBox(height: 14),

        Text(
          'Active Server URL: ${ApiService.baseUrl}',
          style: GoogleFonts.notoSans(
            fontSize: 11,
            color: AppColors.muted,
          ),
        ),

        const Spacer(),

        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _startAnalysis,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text(
              'Try Again',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        const SizedBox(height: 10),

        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton(
            onPressed: _showConfigureIpDialog,
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: Text(
              'Change Server IP',
              style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
        ),
        const SizedBox(height: 10),

        TextButton(
          onPressed: widget.onCancel,
          child: Text(
            'Record Again',
            style: GoogleFonts.notoSans(fontSize: 14, color: AppColors.muted),
          ),
        ),
      ],
    );
  }
}
// ─── Result: Quality Error / Uncertain Screen ("Try Again") ────────────────────

class TryAgainErrorScreen extends StatelessWidget {
  final VoidCallback onTryAgain;
  final VoidCallback onHealthcare;

  const TryAgainErrorScreen({
    super.key,
    required this.onTryAgain,
    required this.onHealthcare,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const Spacer(),

              // Light Amber Warning Icon Box
              Container(
                width: 90,
                height: 90,
                decoration: const BoxDecoration(
                  color: Color(0xFFFEF3C7), // Light amber #FEF3C7
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.warning_rounded,
                    size: 46,
                    color: Color(0xFFD97706), // Amber warning
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Yellow Badge: We need a clearer recording
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'We need a clearer recording',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF92400E),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Text(
                'Try Again',
                style: GoogleFonts.outfit(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 24),

              // Explanation Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'We couldn\'t confidently analyze this recording.',
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1, color: AppColors.border),
                    const SizedBox(height: 14),
                    Text(
                      'Possible reasons:',
                      style: GoogleFonts.notoSans(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.muted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _buildReasonItem('Background noise'),
                    _buildReasonItem('Recording too short'),
                    _buildReasonItem('Poor audio quality'),
                  ],
                ),
              ),

              const Spacer(),

              // Actions: Try Again & Talk to a Healthcare Professional
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: onTryAgain,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Try Again',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: onHealthcare,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Talk to a Healthcare Professional',
                    style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReasonItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Container(width: 5, height: 5, decoration: const BoxDecoration(color: AppColors.muted, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Text(text, style: GoogleFonts.notoSans(fontSize: 12, color: AppColors.textSub)),
        ],
      ),
    );
  }
}

// ─── Result: Final Outcome Screen (Real Backend Model Output) ───────────────────

class ScreeningResultScreen extends StatefulWidget {
  final ScreeningApiResponse? apiResponse;
  final ScreeningSession? session;
  final ScreeningRisk risk;
  final VoidCallback onDone;
  final VoidCallback onDetails;

  const ScreeningResultScreen({
    super.key,
    this.apiResponse,
    this.session,
    this.risk = ScreeningRisk.elevated,
    required this.onDone,
    required this.onDetails,
  });

  @override
  State<ScreeningResultScreen> createState() => _ScreeningResultScreenState();
}

class _ScreeningResultScreenState extends State<ScreeningResultScreen> {
  bool _showTechnicalDetails = false;

  @override
  Widget build(BuildContext context) {
    final apiResponse = widget.apiResponse;
    final isMoreSpeech = apiResponse?.screening.status == 'More speech needed';
    final isElevated = !isMoreSpeech && (apiResponse != null
        ? (apiResponse.screening.predictedClass == 1 ||
            apiResponse.screening.status.toLowerCase().contains('elevated') ||
            apiResponse.screening.riskTier.toLowerCase().contains('elevated'))
        : (widget.risk == ScreeningRisk.elevated));

    final statusText = apiResponse?.screening.status ??
        (isElevated ? 'Elevated screening signal' : 'Lower screening signal');

    final interpretationText = isMoreSpeech
        ? (apiResponse?.screening.interpretation ?? 'More speech is needed to estimate a screening signal. Please describe the prompt in as much detail as you can.')
        : (isElevated
            ? 'Your voice sample showed acoustic and speech pacing patterns that may benefit from clinical follow-up. We recommend consulting your healthcare provider.'
            : 'Your voice metrics are within typical ranges for your age profile. Periodic voice checks can help monitor your cognitive wellness over time.');

    final confidencePercent = apiResponse?.screening.technicalConfidencePercent ??
        ((widget.session?.mlResult.confidenceScore ?? 0.88) * 100.0);

    final probabilityPercent = apiResponse?.screening.probabilityPercent ??
        ((widget.session?.mlResult.quantumRiskScore ?? 0.84) * 100.0);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            children: [
              const SizedBox(height: 10),

              // Status Icon Circle
              Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  color: isElevated ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    isMoreSpeech ? Icons.record_voice_over_rounded : (isElevated ? Icons.info_outline_rounded : Icons.check_circle_outline_rounded),
                    size: 46,
                    color: isElevated ? const Color(0xFFD97706) : const Color(0xFF16A34A),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isElevated ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  statusText,
                  style: GoogleFonts.outfit(
                    color: isElevated ? const Color(0xFF92400E) : const Color(0xFF16A34A),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              Text(
                isMoreSpeech ? 'More Speech Needed' : 'Your Screening Result',
                style: GoogleFonts.outfit(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Screening result only — not a diagnosis.',
                style: GoogleFonts.notoSans(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  color: AppColors.muted,
                ),
              ),
              const SizedBox(height: 16),

              // Patient-Friendly Interpretation Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      interpretationText,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.notoSans(
                        fontSize: 14,
                        color: AppColors.text,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Expandable Technical Metrics for Healthcare Providers
              InkWell(
                onTap: () => setState(() => _showTechnicalDetails = !_showTechnicalDetails),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.analytics_outlined, color: AppColors.primary, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _showTechnicalDetails ? 'Hide Technical Metrics' : 'Show Technical Metrics (Clinicians)',
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      Icon(
                        _showTechnicalDetails ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        color: AppColors.primary,
                      ),
                    ],
                  ),
                ),
              ),

              if (_showTechnicalDetails) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Column(
                            children: [
                              Text(
                                isMoreSpeech ? 'N/A' : '${confidencePercent.toStringAsFixed(1)}%',
                                style: GoogleFonts.outfit(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: isElevated ? const Color(0xFFD97706) : const Color(0xFF16A34A),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Technical Confidence',
                                style: GoogleFonts.notoSans(fontSize: 11, color: AppColors.muted),
                              ),
                            ],
                          ),
                          Container(width: 1, height: 32, color: AppColors.border),
                          Column(
                            children: [
                              Text(
                                isMoreSpeech ? 'N/A' : '${probabilityPercent.toStringAsFixed(1)}%',
                                style: GoogleFonts.outfit(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.text,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Screening Probability',
                                style: GoogleFonts.notoSans(fontSize: 11, color: AppColors.muted),
                              ),
                            ],
                          ),
                        ],
                      ),

                      if (apiResponse != null && apiResponse.transcript.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        const Divider(height: 1),
                        const SizedBox(height: 14),
                        Text(
                          'FASTER-WHISPER TRANSCRIPT',
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: AppColors.muted,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '"${apiResponse.transcript}"',
                            style: GoogleFonts.notoSans(
                              fontSize: 13,
                              fontStyle: FontStyle.italic,
                              color: AppColors.text,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],

                      if (apiResponse?.explanation != null) ...[
                        const SizedBox(height: 16),
                        const Divider(height: 1),
                        const SizedBox(height: 14),
                        Text(
                          'ACOUSTIC CONTRIBUTIONS (SHAP)',
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: AppColors.muted,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...apiResponse!.explanation!.topPositiveContributions.take(2).map((item) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  item.feature,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.notoSans(fontSize: 12, color: AppColors.text),
                                ),
                              ),
                              Text(
                                '+${item.shapValue.toStringAsFixed(3)}',
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFFD97706),
                                ),
                              ),
                            ],
                          ),
                        )),
                      ],
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 16),

              // Mandatory Medical Disclaimer Pill
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  'Screening result only — not a diagnosis. Does not replace clinical assessment by a healthcare professional.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.notoSans(
                    fontSize: 11,
                    color: AppColors.muted,
                    height: 1.4,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Primary Action: Return to Home
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: widget.onDone,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    isMoreSpeech ? 'Record More Speech' : 'Return to Home',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Secondary Action: Doctor Details
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: widget.onDetails,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'View Detailed Clinical Report',
                    style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }
}
