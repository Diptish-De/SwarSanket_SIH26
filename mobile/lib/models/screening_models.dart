import "dart:convert";

class LanguageItem {
  final String code;
  final String native;
  final String name;

  const LanguageItem({
    required this.code,
    required this.native,
    required this.name,
  });
}

const List<LanguageItem> kAppLanguages = [
  LanguageItem(code: "hi", native: "हिन्दी", name: "Hindi"),
  LanguageItem(code: "bn", native: "বাংলা", name: "Bengali"),
  LanguageItem(code: "mr", native: "मराठी", name: "Marathi"),
  LanguageItem(code: "ta", native: "தமிழ்", name: "Tamil"),
  LanguageItem(code: "te", native: "తెలుగు", name: "Telugu"),
  LanguageItem(code: "en", native: "English", name: "English"),
  LanguageItem(code: "gu", native: "ગુજરાતી", name: "Gujarati"),
  LanguageItem(code: "kn", native: "ಕನ್ನಡ", name: "Kannada"),
  LanguageItem(code: "ml", native: "മലയാളം", name: "Malayalam"),
];

enum ScreeningRisk { low, elevated, uncertain }

class AcousticBiomarkers {
  final double speechRateWpm;
  final double pausePatternRatio;
  final double pitchVariationHz;
  final double jitterPercent;
  final double shimmerDb;
  final double hnrDb;

  AcousticBiomarkers({
    required this.speechRateWpm,
    required this.pausePatternRatio,
    required this.pitchVariationHz,
    required this.jitterPercent,
    required this.shimmerDb,
    required this.hnrDb,
  });

  Map<String, dynamic> toMap() => {
    "speechRateWpm": speechRateWpm,
    "pausePatternRatio": pausePatternRatio,
    "pitchVariationHz": pitchVariationHz,
    "jitterPercent": jitterPercent,
    "shimmerDb": shimmerDb,
    "hnrDb": hnrDb,
  };

  factory AcousticBiomarkers.fromMap(Map<String, dynamic> map) => AcousticBiomarkers(
    speechRateWpm: (map["speechRateWpm"] as num?)?.toDouble() ?? 70.0,
    pausePatternRatio: (map["pausePatternRatio"] as num?)?.toDouble() ?? 40.0,
    pitchVariationHz: (map["pitchVariationHz"] as num?)?.toDouble() ?? 75.0,
    jitterPercent: (map["jitterPercent"] as num?)?.toDouble() ?? 3.0,
    shimmerDb: (map["shimmerDb"] as num?)?.toDouble() ?? 4.0,
    hnrDb: (map["hnrDb"] as num?)?.toDouble() ?? 22.0,
  );
}

class ShapFactor {
  final String feature;
  final double weight;

  ShapFactor({required this.feature, required this.weight});

  Map<String, dynamic> toMap() => {"feature": feature, "weight": weight};
  factory ShapFactor.fromMap(Map<String, dynamic> map) => ShapFactor(
    feature: map["feature"] ?? "",
    weight: (map["weight"] as num?)?.toDouble() ?? 0.0,
  );
}

class MLInferenceResult {
  final ScreeningRisk risk;
  final double confidenceScore;
  final double classicalRiskScore;
  final double quantumRiskScore;
  final List<ShapFactor> shapFactors;

  MLInferenceResult({
    required this.risk,
    required this.confidenceScore,
    required this.classicalRiskScore,
    required this.quantumRiskScore,
    required this.shapFactors,
  });

  Map<String, dynamic> toMap() => {
    "risk": risk.name,
    "confidenceScore": confidenceScore,
    "classicalRiskScore": classicalRiskScore,
    "quantumRiskScore": quantumRiskScore,
    "shapFactors": shapFactors.map((s) => s.toMap()).toList(),
  };

  factory MLInferenceResult.fromMap(Map<String, dynamic> map) => MLInferenceResult(
    risk: ScreeningRisk.values.firstWhere((e) => e.name == map["risk"], orElse: () => ScreeningRisk.elevated),
    confidenceScore: (map["confidenceScore"] as num?)?.toDouble() ?? 0.88,
    classicalRiskScore: (map["classicalRiskScore"] as num?)?.toDouble() ?? 0.84,
    quantumRiskScore: (map["quantumRiskScore"] as num?)?.toDouble() ?? 0.89,
    shapFactors: (map["shapFactors"] as List?)?.map((s) => ShapFactor.fromMap(s as Map<String, dynamic>)).toList() ?? [],
  );
}

class ScreeningSession {
  final String id;
  final String patientName;
  final int patientAge;
  final String language;
  final bool assistedMode;
  final DateTime createdAt;
  final int durationSeconds;
  final AcousticBiomarkers biomarkers;
  final MLInferenceResult mlResult;
  final bool synced;
  final String? notes;

  ScreeningSession({
    required this.id,
    required this.patientName,
    required this.patientAge,
    required this.language,
    required this.assistedMode,
    required this.createdAt,
    required this.durationSeconds,
    required this.biomarkers,
    required this.mlResult,
    this.synced = true,
    this.notes,
  });

  Map<String, dynamic> toMap() => {
    "id": id,
    "patientName": patientName,
    "patientAge": patientAge,
    "language": language,
    "assistedMode": assistedMode,
    "createdAt": createdAt.toIso8601String(),
    "durationSeconds": durationSeconds,
    "biomarkers": biomarkers.toMap(),
    "mlResult": mlResult.toMap(),
    "synced": synced,
    "notes": notes,
  };

  factory ScreeningSession.fromMap(Map<String, dynamic> map) => ScreeningSession(
    id: map["id"] ?? "",
    patientName: map["patientName"] ?? "Patient",
    patientAge: map["patientAge"] ?? 70,
    language: map["language"] ?? "hi",
    assistedMode: map["assistedMode"] ?? false,
    createdAt: DateTime.tryParse(map["createdAt"] ?? "") ?? DateTime.now(),
    durationSeconds: map["durationSeconds"] ?? 200,
    biomarkers: AcousticBiomarkers.fromMap(map["biomarkers"] ?? {}),
    mlResult: MLInferenceResult.fromMap(map["mlResult"] ?? {}),
    synced: map["synced"] ?? true,
    notes: map["notes"],
  );

  String toJson() => json.encode(toMap());
  factory ScreeningSession.fromJson(String source) => ScreeningSession.fromMap(json.decode(source) as Map<String, dynamic>);

  factory ScreeningSession.fromApiResponse({
    required String patientName,
    required int patientAge,
    required String language,
    required bool assistedMode,
    required ScreeningApiResponse response,
  }) {
    final isElevated = response.screening.predictedClass == 1 ||
        response.screening.status.toLowerCase().contains("elevated") ||
        response.screening.riskTier.toLowerCase().contains("elevated");

    final risk = isElevated ? ScreeningRisk.elevated : ScreeningRisk.low;

    final shapList = <ShapFactor>[];
    if (response.explanation != null) {
      for (final p in response.explanation!.topPositiveContributions) {
        shapList.add(ShapFactor(feature: p.feature, weight: p.shapValue));
      }
      for (final n in response.explanation!.topNegativeContributions) {
        shapList.add(ShapFactor(feature: n.feature, weight: n.shapValue));
      }
    }

    final wordRate = (response.liveFeatures["CTP_Word Rate(-/s)"] as num?)?.toDouble() ?? 1.2;
    final wpm = (wordRate * 60).clamp(10.0, 240.0);
    final silencePercent = response.audio.silencePercentage;

    return ScreeningSession(
      id: "sc_${DateTime.now().millisecondsSinceEpoch}",
      patientName: patientName,
      patientAge: patientAge,
      language: response.detectedLanguage.isNotEmpty ? response.detectedLanguage : language,
      assistedMode: assistedMode,
      createdAt: DateTime.now(),
      durationSeconds: response.audio.durationSeconds > 0 ? response.audio.durationSeconds.round() : 15,
      biomarkers: AcousticBiomarkers(
        speechRateWpm: wpm,
        pausePatternRatio: silencePercent,
        pitchVariationHz: 75.0,
        jitterPercent: 2.1,
        shimmerDb: 3.2,
        hnrDb: 24.0,
      ),
      mlResult: MLInferenceResult(
        risk: risk,
        confidenceScore: response.screening.technicalConfidencePercent / 100.0,
        classicalRiskScore: response.screening.probability,
        quantumRiskScore: response.screening.probability,
        shapFactors: shapList,
      ),
      synced: true,
      notes: response.transcript.isNotEmpty ? "Transcript: ${response.transcript}" : null,
    );
  }
}

// ─── Real Backend Screening API Models ──────────────────────────────────────

class ShapContribution {
  final String feature;
  final double shapValue;
  final double featureValue;
  final String direction;
  final String description;

  ShapContribution({
    required this.feature,
    required this.shapValue,
    required this.featureValue,
    this.direction = "",
    this.description = "",
  });

  factory ShapContribution.fromMap(Map<String, dynamic> map) => ShapContribution(
    feature: map["feature"] as String? ?? "",
    shapValue: (map["shap_value"] as num?)?.toDouble() ?? 0.0,
    featureValue: (map["feature_value"] as num?)?.toDouble() ?? 0.0,
    direction: map["direction"] as String? ?? "",
    description: map["description"] as String? ?? "",
  );

  Map<String, dynamic> toMap() => {
    "feature": feature,
    "shap_value": shapValue,
    "feature_value": featureValue,
    "direction": direction,
    "description": description,
  };
}

class BackendExplanation {
  final double baseValue;
  final double shapMarginSum;
  final double reconstructedProbability;
  final double reconstructionError;
  final List<ShapContribution> topPositiveContributions;
  final List<ShapContribution> topNegativeContributions;
  final Map<String, dynamic> shapContributions;
  final String humanReadableExplanation;
  final String disclaimer;

  BackendExplanation({
    this.baseValue = 0.5,
    this.shapMarginSum = 0.0,
    this.reconstructedProbability = 0.0,
    this.reconstructionError = 0.0,
    required this.topPositiveContributions,
    required this.topNegativeContributions,
    this.shapContributions = const {},
    this.humanReadableExplanation = "",
    this.disclaimer = "Screening result only — not a medical diagnosis.",
  });

  factory BackendExplanation.fromMap(Map<String, dynamic> map) => BackendExplanation(
    baseValue: (map["base_value"] as num?)?.toDouble() ?? 0.5,
    shapMarginSum: (map["shap_margin_sum"] as num?)?.toDouble() ?? 0.0,
    reconstructedProbability: (map["reconstructed_probability"] as num?)?.toDouble() ?? 0.0,
    reconstructionError: (map["reconstruction_error"] as num?)?.toDouble() ?? 0.0,
    topPositiveContributions: (map["top_positive_contributions"] as List?)
        ?.map((m) => ShapContribution.fromMap(Map<String, dynamic>.from(m as Map)))
        .toList() ?? [],
    topNegativeContributions: (map["top_negative_contributions"] as List?)
        ?.map((m) => ShapContribution.fromMap(Map<String, dynamic>.from(m as Map)))
        .toList() ?? [],
    shapContributions: map["shap_contributions"] != null ? Map<String, dynamic>.from(map["shap_contributions"] as Map) : {},
    humanReadableExplanation: map["human_readable_explanation"] as String? ?? "",
    disclaimer: map["disclaimer"] as String? ?? "Screening result only — not a medical diagnosis.",
  );

  Map<String, dynamic> toMap() => {
    "base_value": baseValue,
    "shap_margin_sum": shapMarginSum,
    "reconstructed_probability": reconstructedProbability,
    "reconstruction_error": reconstructionError,
    "top_positive_contributions": topPositiveContributions.map((s) => s.toMap()).toList(),
    "top_negative_contributions": topNegativeContributions.map((s) => s.toMap()).toList(),
    "shap_contributions": shapContributions,
    "human_readable_explanation": humanReadableExplanation,
    "disclaimer": disclaimer,
  };
}

class BackendScreeningData {
  final String modelName;
  final int? predictedClass;
  final double probability;
  final double probabilityPercent;
  final double technicalConfidencePercent;
  final double? uncertaintyStd;
  final double? predictiveEntropy;
  final String riskTier;
  final String status;
  final String interpretation;

  BackendScreeningData({
    this.modelName = "",
    this.predictedClass,
    required this.probability,
    required this.probabilityPercent,
    required this.technicalConfidencePercent,
    this.uncertaintyStd,
    this.predictiveEntropy,
    this.riskTier = "",
    required this.status,
    this.interpretation = "Screening result only — not a diagnosis.",
  });

  factory BackendScreeningData.fromMap(Map<String, dynamic> map) => BackendScreeningData(
    modelName: map["model_name"] as String? ?? "",
    predictedClass: map["predicted_class"] as int?,
    probability: (map["probability"] as num?)?.toDouble() ?? 0.0,
    probabilityPercent: (map["probability_percent"] as num?)?.toDouble() ?? 0.0,
    technicalConfidencePercent: (map["technical_confidence_percent"] as num?)?.toDouble() ?? 0.0,
    uncertaintyStd: (map["uncertainty_std"] as num?)?.toDouble(),
    predictiveEntropy: (map["predictive_entropy"] as num?)?.toDouble(),
    riskTier: map["risk_tier"] as String? ?? "",
    status: map["status"] as String? ?? "Lower screening signal",
    interpretation: map["interpretation"] as String? ?? "Screening result only — not a diagnosis.",
  );

  Map<String, dynamic> toMap() => {
    "model_name": modelName,
    "predicted_class": predictedClass,
    "probability": probability,
    "probability_percent": probabilityPercent,
    "technical_confidence_percent": technicalConfidencePercent,
    "uncertainty_std": uncertaintyStd,
    "predictive_entropy": predictiveEntropy,
    "risk_tier": riskTier,
    "status": status,
    "interpretation": interpretation,
  };
}

class BackendAudioMetrics {
  final double durationSeconds;
  final double speechTimelineDuration;
  final int sampleRate;
  final double rmsEnergy;
  final double peakAmplitude;
  final double silencePercentage;

  BackendAudioMetrics({
    this.durationSeconds = 0.0,
    this.speechTimelineDuration = 0.0,
    this.sampleRate = 16000,
    this.rmsEnergy = 0.0,
    this.peakAmplitude = 0.0,
    this.silencePercentage = 0.0,
  });

  factory BackendAudioMetrics.fromMap(Map<String, dynamic> map) => BackendAudioMetrics(
    durationSeconds: (map["duration_seconds"] as num?)?.toDouble() ?? 0.0,
    speechTimelineDuration: (map["speech_timeline_duration"] as num?)?.toDouble() ?? 0.0,
    sampleRate: (map["sample_rate"] as num?)?.toInt() ?? 16000,
    rmsEnergy: (map["rms_energy"] as num?)?.toDouble() ?? 0.0,
    peakAmplitude: (map["peak_amplitude"] as num?)?.toDouble() ?? 0.0,
    silencePercentage: (map["silence_percentage"] as num?)?.toDouble() ?? 0.0,
  );

  Map<String, dynamic> toMap() => {
    "duration_seconds": durationSeconds,
    "speech_timeline_duration": speechTimelineDuration,
    "sample_rate": sampleRate,
    "rms_energy": rmsEnergy,
    "peak_amplitude": peakAmplitude,
    "silence_percentage": silencePercentage,
  };
}

class ScreeningApiResponse {
  final bool success;
  final String filename;
  final String transcript;
  final String detectedLanguage;
  final int wordCount;
  final BackendAudioMetrics audio;
  final Map<String, dynamic> liveFeatures;
  final Map<String, dynamic> productionFeatures;
  final BackendScreeningData screening;
  final BackendExplanation? explanation;
  final String? error;

  ScreeningApiResponse({
    required this.success,
    this.filename = "",
    this.transcript = "",
    this.detectedLanguage = "",
    this.wordCount = 0,
    required this.audio,
    this.liveFeatures = const {},
    this.productionFeatures = const {},
    required this.screening,
    this.explanation,
    this.error,
  });

  factory ScreeningApiResponse.fromMap(Map<String, dynamic> map) => ScreeningApiResponse(
    success: map["success"] as bool? ?? false,
    filename: map["filename"] as String? ?? "",
    transcript: map["transcript"] as String? ?? "",
    detectedLanguage: map["detected_language"] as String? ?? "",
    wordCount: (map["word_count"] as num?)?.toInt() ?? 0,
    audio: BackendAudioMetrics.fromMap(map["audio"] != null ? Map<String, dynamic>.from(map["audio"] as Map) : {}),
    liveFeatures: map["live_features"] != null ? Map<String, dynamic>.from(map["live_features"] as Map) : {},
    productionFeatures: map["production_features"] != null ? Map<String, dynamic>.from(map["production_features"] as Map) : {},
    screening: BackendScreeningData.fromMap(map["screening"] != null ? Map<String, dynamic>.from(map["screening"] as Map) : {}),
    explanation: map["explanation"] != null ? BackendExplanation.fromMap(Map<String, dynamic>.from(map["explanation"] as Map)) : null,
    error: map["error"] as String?,
  );

  factory ScreeningApiResponse.fromJson(String source) => ScreeningApiResponse.fromMap(json.decode(source) as Map<String, dynamic>);

  Map<String, dynamic> toMap() => {
    "success": success,
    "filename": filename,
    "transcript": transcript,
    "detected_language": detectedLanguage,
    "word_count": wordCount,
    "audio": audio.toMap(),
    "live_features": liveFeatures,
    "production_features": productionFeatures,
    "screening": screening.toMap(),
    "explanation": explanation?.toMap(),
    "error": error,
  };

  String toJson() => json.encode(toMap());
}
