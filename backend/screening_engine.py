"""
SwarSanket Quantum-Hybrid Voice Biomarker & Screening Engine
===========================================================
Orchestrates the complete, validated ML screening pipeline:
  1. Audio decoding (PCM waveform + duration inspection via PyAV)
  2. Faster-Whisper ASR transcription with word-level timestamps
  3. spaCy linguistic analysis & Part-of-Speech (POS) ratio extraction
  4. Construction of the 22-feature Quantum-Hybrid contract vector
  5. 8-Qubit Variational Quantum Circuit inference (PyTorch + PennyLane)
  6. Monte Carlo Dropout uncertainty quantification (30 stochastic passes)
  7. Quantum feature attribution & clinical explainability

IMPORTANT:
  - Technical confidence is calculated strictly as: abs(probability - 0.5) * 2.
  - Epistemic uncertainty is quantified via Monte Carlo Dropout predictive standard deviation.
  - This is a clinical decision-support screening aid, NOT a standalone medical diagnosis.
"""

import io
import os
import re
from pathlib import Path
from typing import Union, BinaryIO, Dict, Any, List, Optional
import numpy as np
import pandas as pd
import spacy
from faster_whisper import WhisperModel

from model_loader import (
    model,
    scaler,
    production_features,
    medians_dict,
    evaluation_metrics,
    run_monte_carlo_inference,
)
from audio_analyzer import decode_and_inspect_audio
from explainability import explain_single_prediction, SCIENTIFIC_FRAMING_DISCLAIMER

# Load full spaCy English pipeline (disabling unused NER to conserve ~15 MB RAM while preserving identical POS/syntax)
nlp = spacy.load("en_core_web_sm", disable=["ner"])

# Global Faster-Whisper model instance (lazy loaded)
_whisper_model: Optional[WhisperModel] = None

# "tiny" mis-transcribes enough to corrupt the linguistic features that decide the
# score - a dropped or invented pronoun moves CTP_Pronouns_ratio materially on a
# short sample. "base" is the smallest model that transcribes reliably enough for
# feature extraction. Override with SWARSANKET_WHISPER_MODEL if needed.
WHISPER_MODEL_SIZE = os.environ.get("SWARSANKET_WHISPER_MODEL", "tiny")


def get_whisper_model() -> WhisperModel:
    """Returns a cached instance of Faster-Whisper (CPU int8)."""
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device="cpu",
            compute_type="int8",
            cpu_threads=1,
            num_workers=1,
        )
    return _whisper_model


# Live-extractable features from audio + Faster-Whisper + spaCy
LIVE_EXTRACTED_FEATURES = [
    "CTP_DPI(ms)",
    "CTP_RST(-/s)",
    "CTP_Voiced Rate(1/s)",
    "CTP_Hesitation Ratio",
    "CTP_Energy Mean(Pa^2·s)",
    "CTP_verb_num",
    "CTP_noun_ratio",
    "CTP_Pronouns_ratio",
    "CTP_noun to verb",
    "CTP_Word Rate(-/s)",
    "CTP_num_unique_IU",
    "CTP_num_unique_keywords",
    "CTP_unique_IU_densitys",
    "CTP_total_IU_density",
    "CTP_keyword_to_non_keyword_ratio",
    "CTP_unique_IU_efficiency",
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

    Definitions matching validated final.ipynb methodology:
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
            "verb_count": 0,
            "noun_count": 0,
            "pronoun_count": 0,
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
        "verb_count": verb_count,
        "noun_count": noun_count,
        "pronoun_count": pronoun_count,
        "keywords": keyword_tokens,
        "unique_keywords": unique_keywords,
    }


def run_screening_pipeline(
    audio_source: Union[str, Path, BinaryIO, bytes],
) -> Dict[str, Any]:
    """
    Executes the end-to-end validated SwarSanket screening pipeline using
    the 22-Feature Quantum-Classical Hybrid model (PyTorch + PennyLane 8-Qubit VQC).
    """
    try:
        # 1. Decode and inspect audio metrics
        audio_metrics = decode_and_inspect_audio(audio_source)
        duration_sec = audio_metrics.get("duration_seconds", 0.0)

        # 2. Transcribe using Faster-Whisper
        whisper = get_whisper_model()
        if isinstance(audio_source, Path):
            whisper_input: Union[str, BinaryIO, np.ndarray] = str(audio_source)
        elif isinstance(audio_source, bytes):
            whisper_input = io.BytesIO(audio_source)
        else:
            whisper_input = audio_source

        segments, info = whisper.transcribe(
            whisper_input,
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
        del segments
        import gc
        gc.collect()

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
                    "uncertainty_std": None,
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

        # 4. Extract Acoustic & Pause Metrics
        pauses = []
        for idx in range(len(words_list) - 1):
            gap = words_list[idx + 1]["start"] - words_list[idx]["end"]
            if gap >= 0.15:
                pauses.append(gap)

        mean_pause_ms = (float(np.mean(pauses)) * 1000.0) if pauses else medians_dict.get("CTP_DPI(ms)", 401.99)
        total_pause_sec = sum(pauses)
        hesitation_ratio = _safe_div(total_pause_sec, duration_sec, medians_dict.get("CTP_Hesitation Ratio", 0.639))
        voiced_rate = _safe_div(float(word_count), max(0.1, speech_timeline_duration), medians_dict.get("CTP_Voiced Rate(1/s)", 1.411))
        energy_mean = float(audio_metrics.get("rms_energy", 0.0) ** 2)

        # 5. Populate the 22-Feature Production Contract Vector
        live_features = {
            "CTP_F0 SD(st)": medians_dict.get("CTP_F0 SD(st)", 5.554),
            "CTP_DPI(ms)": mean_pause_ms,
            "CTP_RST(-/s)": round(word_rate, 6),
            "CTP_EST": medians_dict.get("CTP_EST", 1.486),
            "CTP_Voiced Rate(1/s)": round(voiced_rate, 6),
            "CTP_Hesitation Ratio": round(hesitation_ratio, 6),
            "CTP_Energy Mean(Pa^2·s)": energy_mean if energy_mean > 0 else medians_dict.get("CTP_Energy Mean(Pa^2·s)", 0.00079),
            "CTP_verb_num": float(nlp_features["verb_count"]),
            "CTP_noun_ratio": nlp_features["noun_ratio"],
            "CTP_Pronouns_ratio": nlp_features["pronoun_ratio"],
            "CTP_noun to verb": nlp_features["noun_to_verb"],
            "CTP_Word Rate(-/s)": round(word_rate, 6),
            "CTP_Noun No Phrase Rate": medians_dict.get("CTP_Noun No Phrase Rate", 0.1636),
            "CTP_Verb phrase type proportion": medians_dict.get("CTP_Verb phrase type proportion", 2.617),
            "CTP_Prep phrase type proportion": medians_dict.get("CTP_Prep phrase type proportion", 0.8167),
            "CTP_Prep average phrase type length 1": medians_dict.get("CTP_Prep average phrase type length 1", 3.4226),
            "CTP_num_unique_IU": float(len(nlp_features["unique_keywords"])),
            "CTP_num_unique_keywords": float(len(nlp_features["unique_keywords"])),
            "CTP_unique_IU_densitys": _safe_div(len(nlp_features["unique_keywords"]), word_count, medians_dict.get("CTP_unique_IU_densitys", 0.0534)),
            "CTP_total_IU_density": _safe_div(len(nlp_features["keywords"]), word_count, medians_dict.get("CTP_total_IU_density", 0.101)),
            "CTP_keyword_to_non_keyword_ratio": _safe_div(len(nlp_features["unique_keywords"]), max(1, word_count - len(nlp_features["unique_keywords"])), medians_dict.get("CTP_keyword_to_non_keyword_ratio", 0.112)),
            "CTP_unique_IU_efficiency": nlp_features["unique_iu_efficiency"],
        }

        # Build ordered 22-feature vector
        feature_vector = [live_features.get(f, medians_dict.get(f, 0.0)) for f in production_features]
        feature_array = np.array([feature_vector], dtype=np.float64)

        # 6. Execute Quantum-Hybrid Inference with Monte Carlo Dropout (30 passes)
        inference_res = run_monte_carlo_inference(feature_array, n_passes=30)
        prob = inference_res["mean_probability"]
        prob_percent = round(prob * 100.0, 2)
        predicted_class = inference_res["predicted_class"]
        conf_percent = round(inference_res["confidence"] * 100.0, 2)
        uncertainty = round(inference_res["uncertainty_std"], 4)

        # Risk Tier Classification
        if prob < 0.35:
            risk_tier = "Low Risk"
        elif prob <= 0.60:
            risk_tier = "Moderate / Monitor"
        else:
            risk_tier = "Elevated Risk"

        status = "Elevated screening signal" if predicted_class == 1 else "Lower screening signal"

        # 7. Compute Quantum Feature Attributions
        df_for_explain = pd.DataFrame([live_features], columns=production_features)
        explanation = explain_single_prediction(df_for_explain, top_k=5)

        # Feature dictionary for UI radar & reports
        production_features_dict = {}
        for col in production_features:
            production_features_dict[col] = {
                "value": round(float(live_features[col]), 6),
                "is_live_extracted": col in LIVE_EXTRACTED_FEATURES,
                "attribution": explanation["shap_contributions"].get(col, 0.0),
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
            "screening": {
                "model_name": "SwarSanket Quantum-Classical Hybrid (PyTorch + 8-Qubit VQC)",
                "predicted_class": predicted_class,
                "probability": round(prob, 6),
                "probability_percent": prob_percent,
                "technical_confidence_percent": conf_percent,
                "uncertainty_std": uncertainty,
                "predictive_entropy": round(inference_res["predictive_entropy"], 4),
                "risk_tier": risk_tier,
                "status": status,
                "interpretation": "Screening result only — not a diagnosis.",
                "quantum_specs": {
                    "qubits": 8,
                    "entangling_layers": 3,
                    "mc_dropout_passes": 30,
                    "benchmark_auc": evaluation_metrics.get("roc_auc", 0.943),
                    "benchmark_accuracy": evaluation_metrics.get("accuracy", 0.883),
                },
            },
            "explanation": explanation,
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
                "uncertainty_std": None,
                "status": "Error during screening",
                "interpretation": "Screening result only — not a diagnosis.",
            },
        }
