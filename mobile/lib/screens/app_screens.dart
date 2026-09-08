import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../models/screening_models.dart';
import '../services/tts_service.dart';

// ─── Smartphone Shell Wrapper (Clean Responsive Viewport) ─────────────────────

class FigmaPhoneFrame extends StatelessWidget {
  final Widget child;

  const FigmaPhoneFrame({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth > 600;

    if (!isDesktop) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        body: SafeArea(child: child),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0B1120),
      body: Center(
        child: Container(
          width: 390,
          height: 844,
          decoration: BoxDecoration(
            color: AppColors.bg,
            borderRadius: BorderRadius.circular(36),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.5),
                blurRadius: 40,
                spreadRadius: 4,
                offset: const Offset(0, 16),
              ),
            ],
            border: Border.all(color: const Color(0xFF1E293B), width: 2),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(34),
            child: Scaffold(
              backgroundColor: AppColors.bg,
              body: SafeArea(
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Main Scaffold with Persistent Bottom Navigation ──────────────────────────

class MainTabScaffold extends StatelessWidget {
  final int activeIndex;
  final Function(int index) onTabChange;
  final String userName;
  final String language;
  final bool hasPreviousCheck;
  final bool hasError;
  final VoidCallback onStartCheck;
  final VoidCallback onDoctorPatient;
  final Function(String lang) onLanguageChanged;

  const MainTabScaffold({
    super.key,
    required this.activeIndex,
    required this.onTabChange,
    required this.userName,
    required this.language,
    required this.hasPreviousCheck,
    required this.hasError,
    required this.onStartCheck,
    required this.onDoctorPatient,
    required this.onLanguageChanged,
  });

  @override
  Widget build(BuildContext context) {
    Widget currentTab;
    switch (activeIndex) {
      case 1:
        currentTab = HistoryTab(onSelectDetail: onDoctorPatient);
        break;
      case 2:
        currentTab = HelpTab(language: language);
        break;
      case 3:
        currentTab = ProfileTab(
          userName: userName,
          currentLang: language,
          onLanguageChanged: onLanguageChanged,
          onHelp: () => onTabChange(2),
        );
        break;
      case 0:
      default:
        currentTab = HomeTab(
          userName: userName,
          language: language,
          hasPreviousCheck: hasPreviousCheck,
          hasError: hasError,
          onStartCheck: onStartCheck,
          onHistory: () => onTabChange(1),
          onHelp: () => onTabChange(2),
          onCaregiver: onDoctorPatient,
          onSettings: () => onTabChange(3),
          onTrend: onDoctorPatient,
        );
        break;
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: currentTab,
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildNavItem(Icons.home_filled, 'Home', 0),
            _buildNavItem(Icons.history, 'History', 1),
            _buildNavItem(Icons.help_outline, 'Help', 2),
            _buildNavItem(Icons.person_outline, 'Profile', 3),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isSelected = activeIndex == index;
    return InkWell(
      onTap: () => onTabChange(index),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: isSelected ? AppColors.primary : AppColors.muted,
            size: 22,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.notoSans(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected ? AppColors.primary : AppColors.muted,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── 1. Home Tab ──────────────────────────────────────────────────────────────

class HomeTab extends StatelessWidget {
  final String userName;
  final String language;
  final bool hasPreviousCheck;
  final bool hasError;
  final VoidCallback onStartCheck;
  final VoidCallback onHistory;
  final VoidCallback onHelp;
  final VoidCallback onCaregiver;
  final VoidCallback onSettings;
  final VoidCallback onTrend;

  const HomeTab({
    super.key,
    required this.userName,
    required this.language,
    required this.hasPreviousCheck,
    required this.hasError,
    required this.onStartCheck,
    required this.onHistory,
    required this.onHelp,
    required this.onCaregiver,
    required this.onSettings,
    required this.onTrend,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Hello, Friend 👋 + Sound wave button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            'Hello, $userName',
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.outfit(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppColors.text,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text('👋', style: TextStyle(fontSize: 20)),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'How are you feeling today?',
                      style: GoogleFonts.notoSans(
                        fontSize: 13,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              InkWell(
                onTap: onHelp,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.help_outline, color: AppColors.primary, size: 20),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Error Banner
          if (hasError)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: AppColors.danger, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Unable to connect to server. Results saved locally.',
                      style: GoogleFonts.notoSans(fontSize: 12, color: Colors.red.shade900),
                    ),
                  ),
                ],
              ),
            ),

          // Hero Voice Check Card (Teal Card)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0891B2), Color(0xFF0E7490)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(26),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.35),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
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
                      child: const Icon(Icons.mic, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Ready when you are',
                          style: GoogleFonts.notoSans(
                            fontSize: 12,
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                        Text(
                          'Voice Check',
                          style: GoogleFonts.outfit(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  'Take a short 3–5 minute screening. Speak naturally — there are no right or wrong answers.',
                  style: GoogleFonts.notoSans(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.9),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: onStartCheck,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primaryDark,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Text(
                      'START',
                      style: GoogleFonts.outfit(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // PREVIOUS CHECK Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PREVIOUS CHECK',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.muted,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hasPreviousCheck ? 'Last check' : 'No previous checks',
                          style: GoogleFonts.outfit(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          hasPreviousCheck ? '12 Aug 2026' : 'Start your first screening',
                          style: GoogleFonts.notoSans(fontSize: 12, color: AppColors.muted),
                        ),
                      ],
                    ),
                    if (hasPreviousCheck)
                      Row(
                        children: [
                          Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle)),
                          const SizedBox(width: 6),
                          Text(
                            'Completed',
                            style: GoogleFonts.notoSans(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppColors.success,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                if (hasPreviousCheck) ...[
                  const Divider(height: 24, color: AppColors.border),
                  InkWell(
                    onTap: onTrend,
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Center(
                        child: Text(
                          'View Progress Trend →',
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF0284C7),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 18),

          // 2 Quick Action Tiles
          Row(
            children: [
              _buildQuickAction('Caregiver', Icons.people_outline, onCaregiver),
              const SizedBox(width: 10),
              _buildQuickAction('Trends', Icons.show_chart, onTrend),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAction(String title, IconData icon, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              Icon(icon, color: AppColors.primary, size: 26),
              const SizedBox(height: 6),
              Text(
                title,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── 2. History Tab ───────────────────────────────────────────────────────────

class HistoryTab extends StatelessWidget {
  final VoidCallback onSelectDetail;

  const HistoryTab({super.key, required this.onSelectDetail});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('Screening History', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.text)),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        children: [
          _buildHistoryCard('Voice Check #2026-08', '28 Aug 2026', 'Elevated (88%)', AppColors.warning, AppColors.warningBg),
          _buildHistoryCard('Voice Check #2026-07', '15 Aug 2026', 'Normal (12%)', AppColors.success, AppColors.successBg),
          _buildHistoryCard('Voice Check #2026-06', '01 Aug 2026', 'Normal (15%)', AppColors.success, AppColors.successBg),
          _buildHistoryCard('Voice Check #2026-05', '14 Jul 2026', 'Normal (18%)', AppColors.success, AppColors.successBg),
        ],
      ),
    );
  }

  Widget _buildHistoryCard(String title, String date, String status, Color statusColor, Color statusBg) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.text)),
              const SizedBox(height: 2),
              Text(date, style: GoogleFonts.notoSans(fontSize: 12, color: AppColors.muted)),
            ],
          ),
          InkWell(
            onTap: onSelectDetail,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(12)),
              child: Text(
                status,
                style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── 3. Help Tab ──────────────────────────────────────────────────────────────

class HelpTab extends StatelessWidget {
  final String language;

  const HelpTab({super.key, required this.language});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('Help & Guidance', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.text)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF0891B2), Color(0xFF0E7490)]),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('How Voice Check Works', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 6),
                Text(
                  'SwarSanket analyzes speech cadence, pause patterns, and acoustic biomarkers to screen for early signs of cognitive decline.',
                  style: GoogleFonts.notoSans(fontSize: 13, color: Colors.white.withValues(alpha: 0.9), height: 1.4),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () => TtsService().speak('SwarSanket is a voice-first Alzheimer\'s early screening app.', language),
                  icon: const Icon(Icons.volume_up, size: 16, color: AppColors.primaryDark),
                  label: const Text('Listen to Guide', style: TextStyle(color: AppColors.primaryDark, fontSize: 12)),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.white, elevation: 0),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _buildFaqItem('Is my voice data private?', 'Yes. All audio recordings are stored securely in local device storage and encrypted during transmission.'),
          _buildFaqItem('Does this replace a doctor?', 'No. SwarSanket is an AI screening tool designed to recommend clinical follow-ups, not replace medical diagnosis.'),
          _buildFaqItem('Can I use it offline?', 'Yes! You can take voice checks completely offline. Results will automatically sync when back online.'),
        ],
      ),
    );
  }

  Widget _buildFaqItem(String question, String answer) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(question, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.text)),
          const SizedBox(height: 6),
          Text(answer, style: GoogleFonts.notoSans(fontSize: 12, color: AppColors.textSub, height: 1.4)),
        ],
      ),
    );
  }
}

// ─── 4. Profile Tab (Exact Figma Design) ──────────────────────────────────────

class ProfileTab extends StatefulWidget {
  final String userName;
  final String currentLang;
  final Function(String lang) onLanguageChanged;
  final VoidCallback onHelp;

  const ProfileTab({
    super.key,
    required this.userName,
    required this.currentLang,
    required this.onLanguageChanged,
    required this.onHelp,
  });

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  bool _audioInstructions = true;
  bool _dataSaver = false;

  String get _currentLanguageName {
    final match = kAppLanguages.firstWhere(
      (l) => l.code == widget.currentLang,
      orElse: () => const LanguageItem(code: 'en', native: 'English', name: 'English'),
    );
    return match.name;
  }

  void _showLanguageSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Choose Language (भाषा)',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close, color: AppColors.muted),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: kAppLanguages.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
                  itemBuilder: (context, index) {
                    final lang = kAppLanguages[index];
                    final isSelected = lang.code == widget.currentLang;
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      title: Text(
                        lang.native,
                        style: GoogleFonts.notoSans(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? AppColors.primary : AppColors.text,
                        ),
                      ),
                      subtitle: Text(lang.name, style: GoogleFonts.notoSans(fontSize: 12, color: AppColors.muted)),
                      trailing: isSelected
                          ? const Icon(Icons.check_circle, color: AppColors.primary)
                          : null,
                      onTap: () {
                        widget.onLanguageChanged(lang.code);
                        Navigator.pop(ctx);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showPrivacyModal() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Row(
          children: [
            const Icon(Icons.lock_outline, color: AppColors.primary),
            const SizedBox(width: 10),
            Text('Privacy & Data', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Your voice recordings are securely stored on your local device. Inferences are processed with privacy-preserving feature extraction (MFCCs & acoustic parameters only). You can clear all cached voice data anytime.',
          style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.textSub, height: 1.45),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  void _showCaregiverModal() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Row(
          children: [
            const Icon(Icons.people_outline, color: AppColors.primary),
            const SizedBox(width: 10),
            Text('Caregiver Setup', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Primary Contact:', style: GoogleFonts.notoSans(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.muted)),
            const SizedBox(height: 4),
            Text('Ananya Devi (Daughter) · +91 98765 43210', style: GoogleFonts.notoSans(fontSize: 13, color: AppColors.text)),
            const SizedBox(height: 12),
            Text('Automatic Alerts:', style: GoogleFonts.notoSans(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.muted)),
            const SizedBox(height: 4),
            Text('Send SMS notification if screening indicates elevated risk.', style: GoogleFonts.notoSans(fontSize: 12, color: AppColors.textSub)),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteRecordings() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(
          'Delete Voice Recordings?',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppColors.danger),
        ),
        content: const Text(
          'This will permanently remove all stored voice audio files from your device. Historical risk scores and screening summaries will be retained.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('All local voice recordings deleted successfully.'),
                  backgroundColor: AppColors.danger,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            Text(
              'Profile & Settings',
              style: GoogleFonts.outfit(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 16),

            // User Info Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
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
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.person,
                      color: AppColors.primary,
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.userName == 'Friend' ? 'Rama Devi' : widget.userName,
                        style: GoogleFonts.outfit(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Age 72 · $_currentLanguageName',
                        style: GoogleFonts.notoSans(
                          fontSize: 13,
                          color: AppColors.muted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Toggles Card (Audio Instructions & Data Saver)
            Container(
              width: double.infinity,
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
                children: [
                  // Audio Instructions
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Audio Instructions',
                              style: GoogleFonts.outfit(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppColors.text,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Hear instructions spoken aloud',
                              style: GoogleFonts.notoSans(
                                fontSize: 12,
                                color: AppColors.muted,
                              ),
                            ),
                          ],
                        ),
                        Switch(
                          value: _audioInstructions,
                          onChanged: (val) => setState(() => _audioInstructions = val),
                          activeColor: AppColors.primary,
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: AppColors.border),

                  // Data Saver
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Data Saver',
                              style: GoogleFonts.outfit(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppColors.text,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Sync recordings when connection is better',
                              style: GoogleFonts.notoSans(
                                fontSize: 12,
                                color: AppColors.muted,
                              ),
                            ),
                          ],
                        ),
                        Switch(
                          value: _dataSaver,
                          onChanged: (val) => setState(() => _dataSaver = val),
                          activeColor: AppColors.primary,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Navigation Options Card (Language, Privacy, Caregiver, Help)
            Container(
              width: double.infinity,
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
                children: [
                  _buildListRow(
                    icon: Icons.language,
                    title: 'Language',
                    trailingText: _currentLanguageName,
                    onTap: _showLanguageSelector,
                  ),
                  const Divider(height: 1, color: AppColors.border),
                  _buildListRow(
                    icon: Icons.lock_outline,
                    title: 'Privacy',
                    trailingText: 'Manage →',
                    onTap: _showPrivacyModal,
                  ),
                  const Divider(height: 1, color: AppColors.border),
                  _buildListRow(
                    icon: Icons.people_outline,
                    title: 'Caregiver',
                    trailingText: 'Set up →',
                    onTap: _showCaregiverModal,
                  ),
                  const Divider(height: 1, color: AppColors.border),
                  _buildListRow(
                    icon: Icons.help_outline,
                    title: 'Help',
                    trailingText: 'View →',
                    onTap: widget.onHelp,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Delete my voice recordings Button
            InkWell(
              onTap: _confirmDeleteRecordings,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Center(
                  child: Text(
                    'Delete my voice recordings',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.danger,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListRow({
    required IconData icon,
    required String title,
    required String trailingText,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Row(
          children: [
            Icon(icon, color: AppColors.textSub, size: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: GoogleFonts.outfit(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                ),
              ),
            ),
            Text(
              trailingText,
              style: GoogleFonts.notoSans(
                fontSize: 13,
                color: AppColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

