import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SplashScreen extends StatefulWidget {
  final VoidCallback onFinish;

  const SplashScreen({super.key, required this.onFinish});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _waveController;
  Timer? _transitionTimer;

  @override
  void initState() {
    super.initState();
    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();

    // Auto-advance after 3.2 seconds
    _transitionTimer = Timer(const Duration(milliseconds: 3200), widget.onFinish);
  }

  @override
  void dispose() {
    _waveController.dispose();
    _transitionTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onFinish, // Tap to skip
      child: Scaffold(
        backgroundColor: const Color(0xFF0891B2), // Rich Cyan/Teal matching Figma
        body: SafeArea(
          child: Stack(
            children: [
              // Centered Brand Content
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // App Logo Icon Card
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.12),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.waves_rounded,
                          color: Colors.white,
                          size: 52,
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // App Title
                    Text(
                      'SwarSanket',
                      style: GoogleFonts.outfit(
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Tagline
                    Text(
                      'Listen. Speak. Screen Early.',
                      style: GoogleFonts.notoSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: Colors.white.withValues(alpha: 0.9),
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 36),

                    // Animated Voice Recording Waveform
                    AnimatedBuilder(
                      animation: _waveController,
                      builder: (context, child) {
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(9, (index) {
                            // Sinusoidal wave simulation with staggered phase offsets
                            final phase = index * (pi / 4.5);
                            final sinVal = sin(_waveController.value * 2 * pi + phase);
                            final height = 8.0 + (sinVal.abs() * 26.0);

                            return Container(
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                              width: 4.5,
                              height: height,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(
                                  alpha: 0.7 + (sinVal.abs() * 0.3),
                                ),
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

              // Bottom Label
              Positioned(
                bottom: 24,
                left: 0,
                right: 0,
                child: Text(
                  'v1.0.2 • Tap to continue',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.notoSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
