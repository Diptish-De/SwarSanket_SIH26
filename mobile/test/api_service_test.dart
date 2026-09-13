import "dart:convert";
import "dart:io";
import "package:flutter_test/flutter_test.dart";
import "package:shared_preferences/shared_preferences.dart";
import "package:swarsanket/models/screening_models.dart";
import "package:swarsanket/services/api_service.dart";

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});
  group("SwarSanket API & Model Tests", () {
    test("ScreeningApiResponse parses real backend JSON structure", () {
      final mockBackendJson = {
        "success": true,
        "filename": "swarsanket_20260909_120000_abc123.m4a",
        "transcript": "Today is a beautiful sunny morning in the countryside.",
        "detected_language": "en",
        "word_count": 9,
        "audio": {
          "duration_seconds": 8.5,
          "speech_timeline_duration": 7.8,
          "sample_rate": 16000,
          "rms_energy": 0.042,
          "peak_amplitude": 0.58,
          "silence_percentage": 18.2
        },
        "live_features": {
          "CTP_noun_ratio": 0.33,
          "CTP_verb_ratio": 0.11,
          "CTP_Word Rate(-/s)": 1.15
        },
        "production_features": {
          "CTP_Word Rate(-/s)": {
            "value": 1.15,
            "is_live_extracted": true,
            "attribution": -0.082
          }
        },
        "screening": {
          "model_name": "SwarSanket Quantum-Classical Hybrid (PyTorch + 8-Qubit VQC)",
          "predicted_class": 0,
          "probability": 0.182,
          "probability_percent": 18.2,
          "technical_confidence_percent": 88.5,
          "uncertainty_std": 0.015,
          "predictive_entropy": 0.31,
          "risk_tier": "Low Risk",
          "status": "Lower screening signal",
          "interpretation": "Screening result only — not a diagnosis.",
          "quantum_specs": {
            "qubits": 8,
            "entangling_layers": 3,
            "mc_dropout_passes": 30
          }
        },
        "explanation": {
          "base_value": 0.5,
          "shap_margin_sum": -1.4,
          "reconstructed_probability": 0.182,
          "reconstruction_error": 0.001,
          "top_positive_contributions": [
            {
              "feature": "CTP_Hesitation Ratio",
              "shap_value": 0.045,
              "feature_value": 0.42,
              "direction": "positive_signal",
              "description": "Slight hesitation pattern"
            }
          ],
          "top_negative_contributions": [
            {
              "feature": "CTP_Word Rate(-/s)",
              "shap_value": -0.082,
              "feature_value": 1.15,
              "direction": "negative_signal",
              "description": "Fluent word pacing"
            }
          ],
          "shap_contributions": {},
          "human_readable_explanation": "Voice metrics are within typical ranges.",
          "disclaimer": "Screening result only — not a medical diagnosis."
        }
      };

      final response = ScreeningApiResponse.fromJson(json.encode(mockBackendJson));

      expect(response.success, isTrue);
      expect(response.filename, "swarsanket_20260909_120000_abc123.m4a");
      expect(response.transcript, "Today is a beautiful sunny morning in the countryside.");
      expect(response.wordCount, 9);
      expect(response.detectedLanguage, "en");
      expect(response.audio.durationSeconds, 8.5);
      expect(response.audio.silencePercentage, 18.2);

      expect(response.screening.predictedClass, 0);
      expect(response.screening.probability, 0.182);
      expect(response.screening.probabilityPercent, 18.2);
      expect(response.screening.technicalConfidencePercent, 88.5);
      expect(response.screening.status, "Lower screening signal");

      expect(response.explanation, isNotNull);
      expect(response.explanation!.topPositiveContributions.length, 1);
      expect(response.explanation!.topPositiveContributions.first.feature, "CTP_Hesitation Ratio");
      expect(response.explanation!.topNegativeContributions.length, 1);
      expect(response.explanation!.topNegativeContributions.first.feature, "CTP_Word Rate(-/s)");
    });

    test("ScreeningSession.fromApiResponse safely converts backend response", () {
      final mockData = {
        "success": true,
        "transcript": "Hello world",
        "detected_language": "en",
        "word_count": 2,
        "audio": {
          "duration_seconds": 5.0,
          "speech_timeline_duration": 4.5,
          "sample_rate": 16000,
          "rms_energy": 0.03,
          "peak_amplitude": 0.4,
          "silence_percentage": 10.0
        },
        "live_features": {
          "CTP_Word Rate(-/s)": 1.5
        },
        "production_features": {},
        "screening": {
          "predicted_class": 0,
          "probability": 0.22,
          "probability_percent": 22.0,
          "technical_confidence_percent": 91.0,
          "status": "Lower screening signal",
          "risk_tier": "Low Risk",
          "interpretation": "Screening result only — not a diagnosis."
        },
        "explanation": {
          "base_value": 0.5,
          "shap_margin_sum": 0.0,
          "reconstructed_probability": 0.22,
          "reconstruction_error": 0.0,
          "top_positive_contributions": [],
          "top_negative_contributions": [],
          "shap_contributions": {},
          "human_readable_explanation": "",
          "disclaimer": "Screening result only — not a medical diagnosis."
        }
      };

      final apiResponse = ScreeningApiResponse.fromMap(mockData);
      final session = ScreeningSession.fromApiResponse(
        patientName: "Rama Devi",
        patientAge: 72,
        language: "en",
        assistedMode: false,
        response: apiResponse,
      );

      expect(session.patientName, "Rama Devi");
      expect(session.mlResult.risk, ScreeningRisk.low);
      expect(session.mlResult.confidenceScore, 0.91);
      expect(session.biomarkers.speechRateWpm, 90.0);
      expect(session.biomarkers.pausePatternRatio, 10.0);
      expect(session.notes, contains("Hello world"));
    });

    test("ApiService rejects nonexistent file without making network call", () async {
      final nonExistentFile = File("/tmp/nonexistent_audio_file_${DateTime.now().millisecondsSinceEpoch}.m4a");
      expect(
        () => ApiService.analyzeAudio(nonExistentFile),
        throwsA(isA<FileSystemException>()),
      );
    });

    test("ApiService rejects empty 0-byte file", () async {
      final tempFile = File("${Directory.systemTemp.path}/empty_test_audio.m4a");
      await tempFile.writeAsBytes([]);
      try {
        expect(
          () => ApiService.analyzeAudio(tempFile),
          throwsA(isA<FormatException>()),
        );
      } finally {
        if (tempFile.existsSync()) await tempFile.delete();
      }
    });

    test("ApiService URL configuration and sanitization", () async {
      await ApiService.setBaseUrl("http://192.168.1.150:8001///");
      expect(ApiService.baseUrl, "http://192.168.1.150:8001");

      await ApiService.resetBaseUrl();
      expect(ApiService.baseUrl, ApiService.defaultBaseUrl);
    });
    test('ScreeningApiResponse handles More speech needed when sample < 50 words', () {
      final sampleJson = {
        'success': true,
        'sample_sufficient': false,
        'transcript': 'In the kitchen the boy is taking a cookie from the jar.',
        'detected_language': 'en',
        'word_count': 12,
        'audio': {
          'duration_seconds': 5.2,
          'speech_timeline_duration': 4.8,
          'sample_rate': 16000,
          'rms_energy': 0.05,
          'peak_amplitude': 0.7,
          'silence_percentage': 25.0
        },
        'sample_requirements': {
          'words_recorded': 12,
          'words_required': 50,
          'seconds_recorded': 5.2,
          'seconds_required': 20.0
        },
        'screening': {
          'predicted_class': null,
          'probability': null,
          'probability_percent': null,
          'technical_confidence_percent': null,
          'uncertainty_std': null,
          'risk_tier': null,
          'status': 'More speech needed',
          'interpretation': 'Only 12 words in 5 seconds were recorded. At least 50 words over 20 seconds are needed.'
        },
        'filename': 'test_short_speech.wav',
        'supabase_url': null,
        'supabase_saved': false
      };

      final response = ScreeningApiResponse.fromMap(sampleJson);
      expect(response.success, isTrue);
      expect(response.wordCount, 12);
      expect(response.screening.status, 'More speech needed');
      expect(response.screening.predictedClass, isNull);
      expect(response.screening.probability, 0.0);
      expect(response.screening.technicalConfidencePercent, 0.0);
      expect(response.screening.interpretation, contains('At least 50 words'));
    });
  });
}
