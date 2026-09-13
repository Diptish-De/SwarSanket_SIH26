import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:path_provider/path_provider.dart';

/// Audio recording service handling microphone permission, live recording,
/// duration tracking, file validation, and audio playback.
class AudioRecorderService {
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();

  bool _isRecording = false;
  bool _isPaused = false;
  String? _currentFilePath;
  DateTime? _recordingStartTime;
  int _recordedSeconds = 0;

  bool get isRecording => _isRecording;
  bool get isPaused => _isPaused;
  String? get currentFilePath => _currentFilePath;
  int get recordedSeconds => _recordedSeconds;

  Stream<Amplitude> get onAmplitudeChanged =>
      _recorder.onAmplitudeChanged(const Duration(milliseconds: 80));

  /// Checks and requests microphone permission.
  Future<bool> checkPermission() async {
    try {
      return await _recorder.hasPermission();
    } catch (e) {
      debugPrint('[AudioRecorderService] Permission check error: $e');
      return false;
    }
  }

  /// Starts audio recording after validating permissions and preparing storage.
  Future<bool> start() async {
    try {
      final hasPermission = await checkPermission();
      debugPrint('[AudioRecorderService] Microphone permission: $hasPermission');

      if (!hasPermission) {
        debugPrint('[AudioRecorderService] Microphone permission denied');
        return false;
      }

      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/swarsanket_${DateTime.now().millisecondsSinceEpoch}.m4a';
      _currentFilePath = path;
      _recordedSeconds = 0;
      _recordingStartTime = DateTime.now();

      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        ),
        path: path,
      );

      _isRecording = true;
      _isPaused = false;
      debugPrint('[AudioRecorderService] Recording started at $path');
      return true;
    } catch (e, stackTrace) {
      debugPrint('[AudioRecorderService] Recording start ERROR: $e');
      debugPrint('$stackTrace');
      return false;
    }
  }

  Future<void> pause() async {
    if (_isRecording && !_isPaused) {
      await _recorder.pause();
      _isPaused = true;
    }
  }

  Future<void> resume() async {
    if (_isRecording && _isPaused) {
      await _recorder.resume();
      _isPaused = false;
    }
  }

  /// Stops recording and returns the verified file path if valid.
  Future<String?> stop() async {
    if (_isRecording) {
      final path = await _recorder.stop();
      _isRecording = false;
      _isPaused = false;
      final resolvedPath = path ?? _currentFilePath;

      if (_recordingStartTime != null) {
        _recordedSeconds = DateTime.now().difference(_recordingStartTime!).inSeconds;
      }

      if (resolvedPath != null) {
        final file = File(resolvedPath);
        if (file.existsSync() && file.lengthSync() > 0) {
          debugPrint('[AudioRecorderService] Recording stopped. File size: ${file.lengthSync()} bytes at $resolvedPath');
          return resolvedPath;
        }
      }

      debugPrint('[AudioRecorderService] Recording stopped but file is invalid or missing.');
      return resolvedPath;
    }
    debugPrint('[AudioRecorderService] Stop called but not actively recording.');
    return null;
  }

  /// Validates that an audio file exists and contains at least minimum bytes.
  bool isAudioFileValid(String? path) {
    if (path == null || path.trim().isEmpty) return false;
    final file = File(path);
    return file.existsSync() && file.lengthSync() > 1024;
  }

  Future<void> playRecording(String? path, {Function()? onComplete}) async {
    final filePath = path ?? _currentFilePath;
    if (filePath != null) {
      await _player.stop();
      _player.onPlayerComplete.listen((_) => onComplete?.call());
      await _player.play(DeviceFileSource(filePath));
    }
  }

  Future<void> stopPlayback() async {
    await _player.stop();
  }

  void dispose() {
    _recorder.dispose();
    _player.dispose();
  }
}
