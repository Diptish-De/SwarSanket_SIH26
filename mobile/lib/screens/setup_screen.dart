import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

/// First-time onboarding profile setup screen for SwarSanket patients.
///
/// Contains required profile fields (Name, Age / Edge Selection, Language)
/// and Screening Server Address, followed by Save & Get Started.
/// Biometric unlock and PIN have been completely removed.
class SetupScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const SetupScreen({super.key, required this.onComplete});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final TextEditingController _nameController = TextEditingController(text: 'Rama Devi');
  final TextEditingController _serverController = TextEditingController(text: ApiService.baseUrl);

  int _age = 72;
  String _selectedEdge = '70–79';
  String _language = 'en';
  bool _isSaving = false;

  // Available Edge / Age range options
  final List<Map<String, dynamic>> _edgeOptions = [
    {'label': '< 50', 'value': 45, 'key': 'edge_under_50'},
    {'label': '50–59', 'value': 55, 'key': 'edge_50_59'},
    {'label': '60–69', 'value': 65, 'key': 'edge_60_69'},
    {'label': '70–79', 'value': 72, 'key': 'edge_70_79'},
    {'label': '80+', 'value': 82, 'key': 'edge_80_plus'},
  ];

  final List<Map<String, String>> _languages = [
    {'code': 'en', 'label': 'English', 'native': 'English'},
    {'code': 'hi', 'label': 'Hindi', 'native': 'हिन्दी'},
    {'code': 'bn', 'label': 'Bengali', 'native': 'বাংলা'},
    {'code': 'ta', 'label': 'Tamil', 'native': 'தமிழ்'},
    {'code': 'te', 'label': 'Telugu', 'native': 'తెలుగు'},
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _serverController.dispose();
    super.dispose();
  }

  void _syncEdgeWithAge(int age) {
    if (age < 50) {
      _selectedEdge = '< 50';
    } else if (age < 60) {
      _selectedEdge = '50–59';
    } else if (age < 70) {
      _selectedEdge = '60–69';
    } else if (age < 80) {
      _selectedEdge = '70–79';
    } else {
      _selectedEdge = '80+';
    }
  }

  void _onSelectEdge(String label, int value) {
    setState(() {
      _selectedEdge = label;
      _age = value;
    });
  }

  Future<void> _handleSave() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your name')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      // Save configurable server address
      final serverUrl = _serverController.text.trim();
      if (serverUrl.isNotEmpty) {
        await ApiService.setBaseUrl(serverUrl);
      }

      // Save profile fields & mark setup complete
      await AuthService.saveUserProfile(
        name: name,
        age: _age,
        language: _language,
        selectedEdge: _selectedEdge,
      );

      if (mounted) {
        widget.onComplete();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving setup: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 10),

              // Header Waves / App Icon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Center(
                  child: Icon(Icons.waves_rounded, color: AppColors.primary, size: 36),
                ),
              ),
              const SizedBox(height: 16),

              Text(
                'Welcome to SwarSanket',
                style: GoogleFonts.outfit(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Set up your patient profile for voice screening. You only need to do this once.',
                style: GoogleFonts.notoSans(
                  fontSize: 14,
                  color: AppColors.muted,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),

              // ─── 1. Patient Name ──────────────────────────────────────────
              Text(
                'Your Name',
                style: GoogleFonts.outfit(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _nameController,
                style: GoogleFonts.notoSans(fontSize: 15, fontWeight: FontWeight.w500),
                decoration: InputDecoration(
                  hintText: 'Enter full name',
                  prefixIcon: const Icon(Icons.person_outline_rounded, color: AppColors.primary),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.primary, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // ─── 2. Age / Edge Selection ──────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Your Age / Edge',
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.text,
                    ),
                  ),
                  Flexible(
                    child: Text(
                      'Selected: $_selectedEdge ($_age yrs)',
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.notoSans(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Tappable Edge / Age Range Chips
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _edgeOptions.map((opt) {
                        final label = opt['label'] as String;
                        final val = opt['value'] as int;
                        final keyName = opt['key'] as String;
                        final isSelected = _selectedEdge == label;

                        return Material(
                          color: Colors.transparent,
                          child: InkWell(
                            key: ValueKey(keyName),
                            onTap: () => _onSelectEdge(label, val),
                            borderRadius: BorderRadius.circular(12),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                              decoration: BoxDecoration(
                                color: isSelected ? AppColors.primary : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isSelected ? AppColors.primary : const Color(0xFFCBD5E1),
                                  width: isSelected ? 1.8 : 1.0,
                                ),
                                boxShadow: isSelected
                                    ? [
                                        BoxShadow(
                                          color: AppColors.primary.withValues(alpha: 0.25),
                                          blurRadius: 6,
                                          offset: const Offset(0, 2),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Text(
                                label,
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                  color: isSelected ? Colors.white : AppColors.text,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    const Divider(height: 1, color: AppColors.border),
                    const SizedBox(height: 10),

                    // Precise +/- Stepper
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline, size: 28, color: AppColors.primary),
                          onPressed: () {
                            if (_age > 40) {
                              setState(() {
                                _age--;
                                _syncEdgeWithAge(_age);
                              });
                            }
                          },
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '$_age Years Old',
                          style: GoogleFonts.outfit(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, size: 28, color: AppColors.primary),
                          onPressed: () {
                            if (_age < 105) {
                              setState(() {
                                _age++;
                                _syncEdgeWithAge(_age);
                              });
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // ─── 3. Preferred Language ────────────────────────────────────
              Text(
                'Preferred Language',
                style: GoogleFonts.outfit(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _languages.map((lang) {
                  final isSelected = _language == lang['code'];
                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => setState(() => _language = lang['code']!),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.border,
                          ),
                        ),
                        child: Text(
                          '${lang['native']} (${lang['label']})',
                          style: GoogleFonts.notoSans(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? Colors.white : AppColors.text,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // ─── 4. Screening Server Address ──────────────────────────────
              Text(
                'Screening Server Address',
                style: GoogleFonts.outfit(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _serverController,
                style: GoogleFonts.notoSans(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'http://127.0.0.1:8001',
                  helperText: 'Configurable server endpoint for AI/QML screening analysis',
                  helperStyle: GoogleFonts.notoSans(fontSize: 11, color: AppColors.muted),
                  prefixIcon: const Icon(Icons.dns_outlined, color: AppColors.primary),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.primary, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // ─── 5. Save & Get Started Action Button ──────────────────────
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  key: const ValueKey('save_and_get_started_button'),
                  onPressed: _isSaving ? null : _handleSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : Text(
                          'Save & Get Started',
                          style: GoogleFonts.outfit(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
