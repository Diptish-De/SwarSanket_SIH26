import "dart:async";
import "dart:convert";
import "dart:io";
import "package:flutter/foundation.dart";
import "package:http/http.dart" as http;
import "package:shared_preferences/shared_preferences.dart";
import "../models/screening_models.dart";

/// Service responsible for real HTTP communications with the SwarSanket FastAPI backend.
class ApiService {
  static const String _storageKeyBaseUrl = "swarsanket_api_base_url";

  /// Default API base URL for local development.
  /// Change this or use [setBaseUrl] to point to your physical Mac LAN IP (e.g. http://192.168.1.100:8001).
  static const String _envBaseUrl = String.fromEnvironment("BACKEND_URL", defaultValue: "");
  static const String defaultBaseUrl = _envBaseUrl != "" ? _envBaseUrl : "http://127.0.0.1:8001";

  static String _activeBaseUrl = defaultBaseUrl;

  /// Returns the current active base URL.
  static String get baseUrl => _activeBaseUrl;

  /// Initializes base URL from SharedPreferences if previously saved.
  static Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString(_storageKeyBaseUrl);
      if (savedUrl != null && savedUrl.trim().isNotEmpty) {
        _activeBaseUrl = _sanitizeUrl(savedUrl);
        debugPrint("[SwarSanket ApiService] Loaded base URL: $_activeBaseUrl");
      }
    } catch (e) {
      debugPrint("[SwarSanket ApiService] Failed to load saved base URL: $e");
    }
  }

  /// Sets and persists a new API base URL (e.g. http://192.168.1.100:8001 for physical phone).
  static Future<void> setBaseUrl(String newUrl) async {
    final sanitized = _sanitizeUrl(newUrl);
    _activeBaseUrl = sanitized.isNotEmpty ? sanitized : defaultBaseUrl;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKeyBaseUrl, _activeBaseUrl);
      debugPrint("[SwarSanket ApiService] Saved base URL: $_activeBaseUrl");
    } catch (e) {
      debugPrint("[SwarSanket ApiService] Failed to persist base URL: $e");
    }
  }

  /// Resets base URL to default.
  static Future<void> resetBaseUrl() async {
    _activeBaseUrl = defaultBaseUrl;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_storageKeyBaseUrl);
    } catch (_) {}
  }

  static String _sanitizeUrl(String url) {
    return url.trim().replaceAll(RegExp(r"/+$"), "");
  }

  /// Tests connectivity to GET /api/health
  static Future<bool> checkHealth({Duration timeout = const Duration(seconds: 5)}) async {
    try {
      final uri = Uri.parse("$_activeBaseUrl/api/health");
      final response = await http.get(uri).timeout(timeout);
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data["status"] == "ok";
      }
      return false;
    } catch (e) {
      debugPrint("[SwarSanket ApiService] Health check failed: $e");
      return false;
    }
  }

  /// Uploads a recorded audio [File] to POST /api/analyze-audio and returns the parsed [ScreeningApiResponse].
  ///
  /// Strictly follows the backend contract:
  /// - Field name: "audio"
  /// - Real File upload via multipart/form-data
  /// - No simulated, random, or placeholder results on error
  static Future<ScreeningApiResponse> analyzeAudio(
    File audioFile, {
    Duration timeout = const Duration(seconds: 60),
  }) async {
    if (!audioFile.existsSync()) {
      throw const FileSystemException("Recorded audio file does not exist on device.");
    }

    final fileLength = await audioFile.length();
    if (fileLength == 0) {
      throw const FormatException("Audio recording is empty (0 bytes). Please try recording again.");
    }

    final uri = Uri.parse("$_activeBaseUrl/api/analyze-audio");
    debugPrint("[SwarSanket ApiService] Uploading real audio to $uri (${audioFile.path}, size: $fileLength bytes)");

    final request = http.MultipartRequest("POST", uri);

    // Determine filename with appropriate extension
    final pathLower = audioFile.path.toLowerCase();
    String uploadFilename = "voice_check.m4a";
    if (pathLower.endsWith(".webm")) {
      uploadFilename = "voice_check.webm";
    } else if (pathLower.endsWith(".wav")) {
      uploadFilename = "voice_check.wav";
    }

    // Attach real recorded audio file with exact field name "audio"
    request.files.add(
      await http.MultipartFile.fromPath(
        "audio",
        audioFile.path,
        filename: uploadFilename,
      ),
    );

    try {
      final streamedResponse = await request.send().timeout(timeout);
      final response = await http.Response.fromStream(streamedResponse);

      debugPrint("[SwarSanket ApiService] HTTP status: ${response.statusCode}");

      if (response.statusCode != 200) {
        String detailMessage = "Server returned error (HTTP ${response.statusCode})";
        try {
          final errorBody = json.decode(response.body);
          if (errorBody is Map && errorBody["detail"] != null) {
            detailMessage = errorBody["detail"].toString();
          }
        } catch (_) {
          if (response.body.isNotEmpty) {
            detailMessage = response.body;
          }
        }
        throw HttpException(detailMessage, uri: uri);
      }

      if (response.body.trim().isEmpty) {
        throw const FormatException("Received empty response body from screening server.");
      }

      final Map<String, dynamic> responseData;
      try {
        responseData = json.decode(response.body) as Map<String, dynamic>;
      } catch (e) {
        throw const FormatException("Malformed JSON received from screening server.");
      }

      final parsed = ScreeningApiResponse.fromMap(responseData);

      if (!parsed.success) {
        throw HttpException(
          parsed.error ?? "Screening analysis rejected by server. Please check speech clarity.",
          uri: uri,
        );
      }

      debugPrint("[SwarSanket ApiService] Real ML screening response parsed successfully: class=${parsed.screening.predictedClass}, prob=${parsed.screening.probability}");
      return parsed;

    } on TimeoutException {
      throw TimeoutException(
        "Analysis request timed out after ${timeout.inSeconds} seconds. The screening engine may be busy or your connection is slow. Please try again.",
      );
    } on SocketException catch (e) {
      throw SocketException(
        "Unable to connect to screening server at $_activeBaseUrl. Please check that the FastAPI server is running and your device is connected to the same network. ($e)",
      );
    } on http.ClientException catch (e) {
      throw SocketException(
        "Network connection failed while uploading audio to $_activeBaseUrl: ${e.message}",
      );
    } catch (e) {
      debugPrint("[SwarSanket ApiService] Analysis error: $e");
      rethrow;
    }
  }
}
