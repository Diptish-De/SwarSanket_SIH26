import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

const String kApkDownloadUrl = 'https://github.com/Diptish-De/SwarSanket_SIH26/releases/latest/download/SwarSanket.apk';
const String kGitHubReleasesUrl = 'https://github.com/Diptish-De/SwarSanket_SIH26/releases';

class ApkDownloadDialog extends StatefulWidget {
  const ApkDownloadDialog({super.key});

  @override
  State<ApkDownloadDialog> createState() => _ApkDownloadDialogState();
}

class _ApkDownloadDialogState extends State<ApkDownloadDialog> {
  bool _copied = false;

  void _copyLink() {
    Clipboard.setData(const ClipboardData(text: kApkDownloadUrl));
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  void _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Container(
        padding: const EdgeInsets.all(24),
        constraints: const BoxConstraints(maxWidth: 400),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.android, color: AppColors.primaryDark, size: 26),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Download SwarSanket',
                            style: GoogleFonts.outfit(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.text,
                            ),
                          ),
                          Text(
                            'Android APK Release',
                            style: GoogleFonts.notoSans(
                              fontSize: 12,
                              color: AppColors.muted,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: AppColors.muted),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // QR Code Box
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    QrImageView(
                      data: kApkDownloadUrl,
                      version: QrVersions.auto,
                      size: 160.0,
                      backgroundColor: Colors.white,
                      padding: const EdgeInsets.all(12),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Scan with Android Camera',
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Scan to download SwarSanket.apk directly to phone',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.notoSans(
                        fontSize: 11,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Direct Download Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _openUrl(kApkDownloadUrl),
                  icon: const Icon(Icons.download, color: Colors.white),
                  label: const Text('Download SwarSanket APK'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _copyLink,
                      icon: Icon(
                        _copied ? Icons.check : Icons.copy,
                        size: 16,
                        color: _copied ? AppColors.success : AppColors.muted,
                      ),
                      label: Text(
                        _copied ? 'Copied!' : 'Copy Link',
                        style: TextStyle(
                          color: _copied ? AppColors.success : AppColors.textSub,
                          fontSize: 12,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        side: const BorderSide(color: AppColors.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _openUrl(kGitHubReleasesUrl),
                      icon: const Icon(Icons.open_in_new, size: 16, color: AppColors.muted),
                      label: const Text(
                        'Releases',
                        style: TextStyle(color: AppColors.textSub, fontSize: 12),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        side: const BorderSide(color: AppColors.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 3-step Instructions
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '3-Step Installation:',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.muted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text('1. Tap Download APK or scan QR code.', style: TextStyle(fontSize: 11, color: AppColors.textSub)),
                    Text('2. If prompted, allow "Download anyway".', style: TextStyle(fontSize: 11, color: AppColors.textSub)),
                    Text('3. Open file and tap Install to launch.', style: TextStyle(fontSize: 11, color: AppColors.textSub)),
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
