"""
SwarSanket Validated Live Screening Engine (Step 96G-D Aligned)
==============================================================
Orchestrates the complete, validated ML screening pipeline:
  1. Audio decoding (PCM waveform + duration inspection)
  2. Faster-Whisper ASR transcription with word-level timestamps
  3. spaCy linguistic analysis & Part-of-Speech (POS) ratio extraction
  4. Construction of the exact 20-feature production contract vector:
     - 8 Validated live features populated
     - 12 Unresolved CTP features explicitly set to np.nan
  5. Scikit-learn frozen median imputation (20 features)
  6. Frozen XGBoost classifier inference (predict + predict_proba)
  7. Structured clinical screening output

IMPORTANT:
  - Technical confidence is calculated strictly as: abs(probability - 0.5) * 2.
  - This is NOT a medical diagnosis.
"""

import os
import re
from pathlib import Path
from typing import Union, BinaryIO, Dict, Any, List, Optional
import numpy as np
import pandas as pd
import spacy
from faster_whisper import WhisperModel

from model_loader import model, imputer, production_features
from audio_analyzer import decode_and_inspect_audio
from explainability import explain_single_prediction, SCIENTIFIC_FRAMING_DISCLAIMER

# Load full spaCy English pipeline once
nlp = spacy.load("en_core_web_sm")

# Global Faster-Whisper model instance (lazy loaded)
_whisper_model: Optional[WhisperModel] = None


def get_whisper_model() -> WhisperModel:
    """Returns a cached instance of Faster-Whisper (tiny model, CPU int8)."""
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _whisper_model


# Exact 8 validated live production features
VALIDATED_LIVE_FEATURES = [
    "CTP_noun_ratio",
    "CTP_verb_ratio",
    "CTP_adv_ratio",
    "CTP_Pronouns_ratio",
    "CTP_noun to verb",
    "CTP_Word Rate(-/s)",
    "CTP_unique_IU_efficiency",
    "CTP_ keyword_TTR",
]

# Exact 12 unresolved production features requiring median imputation
UNRESOLVED_IMPUTED_FEATURES = [
    "CTP_DPI(ms)",
    "CTP_RST(-/s)",
    "CTP_EST",
    "CTP_Hesitation Ratio",
    "CTP_Energy Mean(Pa^2·s)",
    "CTP_Lexical Content Density",
    "CTP_Noun No Phrase Rate",
    "CTP_Adv No Phrase Rate",
    "CTP_Verb phrase type proportion",
    "CTP_Prep phrase type proportion",
    "CTP_num_unique_IU",
    "CTP_Disfluency ratio",
]


def _safe_div(num: float, den: float, default: float = 0.0) -> float:
    """Safely divide two numbers, returning default on zero or invalid division."""
    if den is None or den == 0 or np.isnan(den):
        return default
    val = num / den
    return default if np.isnan(val) or np.isinf(val) else float(val)


def extract_linguistic_pos_features(transcript: str, word_num: int) -> Dict[str, Any]:
    """
    Extracts Part-of-Speech (POS) ratios and content keywords using spaCy.

    Definitions matching validated 96E methodology:
      - Nouns: NOUN, PROPN
      - Verbs: Lexical verbs (VERB) + standalone auxiliary verbs (AUX), excluding contracted clitics ("'m", "'s")
      - Adverbs: ADV
      - Pronouns: PRON
      - Keywords (Content Words): NOUN, PROPN, VERB, ADJ, ADV (lemmatized)
      - unique_IU_efficiency: len(unique_keywords) / word_num
      - keyword_TTR: len(unique_keywords) / len(keywords)
    """
    raw_text = transcript.strip() if transcript else ""
    if not raw_text:
        return {
            "noun_ratio": 0.0,
            "verb_ratio": 0.0,
            "adv_ratio": 0.0,
            "pronoun_ratio": 0.0,
            "noun_to_verb": 0.0,
            "unique_iu_efficiency": 0.0,
            "keyword_ttr": 0.0,
            "keywords": [],
            "unique_keywords": [],
        }

    doc = nlp(raw_text)
    tokens = [t for t in doc if not t.is_punct and not t.is_space]
    total_words = word_num if word_num > 0 else len(tokens)

    # 1. POS category counts
    noun_tokens = [t for t in tokens if t.pos_ in ("NOUN", "PROPN")]
    verb_tokens = [t for t in tokens if t.pos_ == "VERB" or (t.pos_ == "AUX" and not t.text.startswith("'"))]
    adv_tokens = [t for t in tokens if t.pos_ == "ADV"]
    pronoun_tokens = [t for t in tokens if t.pos_ == "PRON"]

    noun_count = len(noun_tokens)
    verb_count = len(verb_tokens)
    adv_count = len(adv_tokens)
    pronoun_count = len(pronoun_tokens)

    noun_ratio = _safe_div(noun_count, total_words, 0.0)
    verb_ratio = _safe_div(verb_count, total_words, 0.0)
    adv_ratio = _safe_div(adv_count, total_words, 0.0)
    pronoun_ratio = _safe_div(pronoun_count, total_words, 0.0)
    noun_to_verb = _safe_div(noun_count, verb_count, 0.0)

    # 2. Keywords / Content words (lemmatized)
    keyword_tokens = [
        t.lemma_.lower() for t in tokens
        if t.pos_ in ("NOUN", "PROPN", "VERB", "ADJ", "ADV")
    ]
    unique_keywords = sorted(list(set(keyword_tokens)))
    
    unique_iu_efficiency = _safe_div(len(unique_keywords), total_words, 0.0)
    keyword_ttr = _safe_div(len(unique_keywords), len(keyword_tokens), 0.0)

    return {
        "noun_ratio": round(noun_ratio, 6),
        "verb_ratio": round(verb_ratio, 6),
        "adv_ratio": round(adv_ratio, 6),
        "pronoun_ratio": round(pronoun_ratio, 6),
        "noun_to_verb": round(noun_to_verb, 6),
        "unique_iu_efficiency": round(unique_iu_efficiency, 6),
        "keyword_ttr": round(keyword_ttr, 6),
        "keywords": keyword_tokens,
        "unique_keywords": unique_keywords,
    }


def run_screening_pipeline(
    audio_source: Union[str, Path, BinaryIO, bytes],
) -> Dict[str, Any]:
    """
    Executes the end-to-end validated SwarSanket screening pipeline.
    """
    try:
        # 1. Decode and inspect audio metrics
        audio_metrics = decode_and_inspect_audio(audio_source)
        duration_sec = audio_metrics.get("duration_seconds", 0.0)

        # 2. Transcribe using Faster-Whisper
        whisper = get_whisper_model()
        segments, info = whisper.transcribe(
            audio_source,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
        )

        words_list = []
        transcript_parts = []
        for seg in segments:
            transcript_parts.append(seg.text.strip())
            if seg.words:
                for w in seg.words:
                    words_list.append({
                        "word": w.word.strip(),
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "probability": round(w.probability, 3) if hasattr(w, "probability") else 1.0,
                    })

        full_transcript = " ".join(transcript_parts).strip()
        word_count = len(words_list)

        # Safety check: Reject pure silence or recordings with no audible speech
        if word_count == 0 or len(full_transcript) == 0:
            return {
                "success": False,
                "error": "No audible speech detected. Please ensure the recording is clear and contains audible speech.",
                "transcript": "",
                "word_count": 0,
                "audio": {
                    "duration_seconds": audio_metrics.get("duration_seconds", 0.0),
                    "speech_timeline_duration": 0.0,
                    "sample_rate": audio_metrics.get("sample_rate", 16000),
                    "rms_energy": audio_metrics.get("rms_energy", 0.0),
                    "peak_amplitude": audio_metrics.get("peak_amplitude", 0.0),
                    "silence_percentage": audio_metrics.get("silence_percentage", 100.0),
                },
                "screening": {
                    "predicted_class": None,
                    "probability": None,
                    "probability_percent": None,
                    "technical_confidence_percent": None,
                    "status": "Audio Quality Rejected",
                    "interpretation": "Screening result only — not a diagnosis.",
                },
            }

        # Active speech timeline duration (from first word start to last word end)
        speech_timeline_duration = words_list[-1]["end"] if words_list else duration_sec
        if speech_timeline_duration <= 0:
            speech_timeline_duration = duration_sec

        word_rate = _safe_div(word_count, speech_timeline_duration, 0.0)

        # 3. Extract spaCy linguistic POS ratios & keywords
        nlp_features = extract_linguistic_pos_features(full_transcript, word_count)

        # 4. Populate the 8 validated live production features
        live_features = {
            "CTP_noun_ratio": nlp_features["noun_ratio"],
            "CTP_verb_ratio": nlp_features["verb_ratio"],
            "CTP_adv_ratio": nlp_features["adv_ratio"],
            "CTP_Pronouns_ratio": nlp_features["pronoun_ratio"],
            "CTP_noun to verb": nlp_features["noun_to_verb"],
            "CTP_Word Rate(-/s)": round(word_rate, 6),
            "CTP_unique_IU_efficiency": nlp_features["unique_iu_efficiency"],
            "CTP_ keyword_TTR": nlp_features["keyword_ttr"],
        }

        # 5. Construct exact 20-feature production dictionary with 12 NaNs
        raw_production_vector = {}
        for feature_name in production_features:
            if feature_name in live_features:
                raw_production_vector[feature_name] = live_features[feature_name]
            else:
                raw_production_vector[feature_name] = np.nan

        # 6. Construct DataFrame matching exact feature contract order
        df_raw = pd.DataFrame([raw_production_vector], columns=production_features)

        # 7. Apply frozen median imputation
        imputed_array = imputer.transform(df_raw)
        df_imputed = pd.DataFrame(imputed_array, columns=production_features)

        # 8. Run frozen XGBoost model inference
        predicted_class_raw = model.predict(df_imputed)[0]
        predicted_class = int(predicted_class_raw)
        
        probabilities = model.predict_proba(df_imputed)[0]
        prob_class_1 = float(probabilities[1])
        prob_percent = round(prob_class_1 * 100.0, 2)
        
        # Technical confidence: abs(probability - 0.5) * 2
        tech_confidence = abs(prob_class_1 - 0.5) * 2.0
        tech_confidence_percent = round(tech_confidence * 100.0, 2)

        status = "Elevated screening signal" if predicted_class == 1 else "Lower screening signal"

        # 9. Compute local Tree SHAP explanation for the production vector
        shap_explanation = explain_single_prediction(df_imputed, top_k=5, apply_imputation=False)

        # Production features dictionary for reporting
        production_features_dict = {}
        for idx, col in enumerate(production_features):
            production_features_dict[col] = {
                "raw_value": None if np.isnan(raw_production_vector[col]) else round(float(raw_production_vector[col]), 6),
                "imputed_value": round(float(imputed_array[0, idx]), 6),
                "is_live_extracted": col in VALIDATED_LIVE_FEATURES,
                "shap_contribution": shap_explanation["shap_contributions"].get(col, 0.0),
            }

        return {
            "success": True,
            "transcript": full_transcript,
            "detected_language": info.language,
            "word_count": word_count,
            "audio": {
                "duration_seconds": audio_metrics.get("duration_seconds", 0.0),
                "speech_timeline_duration": speech_timeline_duration,
                "sample_rate": audio_metrics.get("sample_rate", 16000),
                "rms_energy": audio_metrics.get("rms_energy", 0.0),
                "peak_amplitude": audio_metrics.get("peak_amplitude", 0.0),
                "silence_percentage": audio_metrics.get("silence_percentage", 0.0),
            },
            "live_features": live_features,
            "production_features": production_features_dict,
            "imputation": {
                "imputed_feature_count": len(UNRESOLVED_IMPUTED_FEATURES),
                "live_feature_count": len(VALIDATED_LIVE_FEATURES),
                "total_feature_count": len(production_features),
                "imputation_note": "12 of 20 production features currently rely on training-time median imputation because their original CTP definitions have not been reconstructed.",
            },
            "screening": {
                "predicted_class": predicted_class,
                "probability": round(prob_class_1, 6),
                "probability_percent": prob_percent,
                "technical_confidence_percent": tech_confidence_percent,
                "status": status,
                "interpretation": "Screening result only — not a diagnosis.",
            },
            "explanation": {
                "base_value": shap_explanation["base_value"],
                "shap_margin_sum": shap_explanation["shap_margin_sum"],
                "reconstructed_probability": shap_explanation["reconstructed_probability"],
                "reconstruction_error": shap_explanation["reconstruction_error"],
                "top_positive_contributions": shap_explanation["top_positive_contributions"],
                "top_negative_contributions": shap_explanation["top_negative_contributions"],
                "shap_contributions": shap_explanation["shap_contributions"],
                "human_readable_explanation": shap_explanation["human_readable_explanation"],
                "disclaimer": shap_explanation["disclaimer"],
            },
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "transcript": "",
            "screening": {
                "predicted_class": None,
                "probability": None,
                "probability_percent": None,
                "technical_confidence_percent": None,
                "status": "Error during screening",
                "interpretation": "Screening result only — not a diagnosis.",
            },
        }
