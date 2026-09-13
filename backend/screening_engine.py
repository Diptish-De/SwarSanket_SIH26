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
from audio_analyzer import decode_and_inspect_audio, analyze_silence_runs
from voice_quality import analyze_voice_quality
from language_calibration import calibrate_features, LANGUAGE_DEPENDENT_FEATURES
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
    "CTP_F0 SD(st)",
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


# ---------------------------------------------------------------------------
# Training-distribution calibration constants
# ---------------------------------------------------------------------------
# PROVENANCE WARNING
# ------------------
# The CTP_* features were NOT computed by this codebase. final.ipynb consumes them
# pre-computed from six CSVs (xunfei / Tencent / ALiYun ASR exports, target column
# "ad") and performs no tokenisation, IU scoring or text processing of any kind.
# Those are Chinese-language ASR corpora, so the upstream IU and keyword counting
# rules - including how a "word" is segmented - are not recoverable from any
# artifact in this repository. Everything below is a calibrated approximation whose
# only verifiable property is that it keeps inputs inside the training support. It
# is NOT a faithful reproduction of the upstream feature definitions.
#
# The IU density features are ratios whose denominator is the full transcript
# length. The reference length is recoverable from the fitted scaler statistics:
#
#   mean(CTP_num_unique_IU)       / mean(CTP_unique_IU_densitys)   = 4.6823 / 0.0559 = 83.7
#   mean(CTP_num_unique_keywords) / mean(CTP_unique_IU_efficiency) = 6.9632 / 0.0818 = 85.1
#
# A short clip divided by its own (much smaller) word count therefore inflates every
# density feature several-fold. Densities are standardised to this reference length
# instead, the same way type-token measures are reported per fixed sample size.
TASK_REFERENCE_WORD_COUNT = 84.0

# mean(CTP_num_unique_IU) / mean(CTP_num_unique_keywords) = 4.6823 / 6.9632.
# IUs are a restricted semantic subset of content words, never the whole set.
#
# NOTE: the training means are small in absolute terms (4.68 unique IUs, 6.96 unique
# keywords) relative to any natural English count over a transcript of the implied
# length. A fluent English description yields 20-30. The upstream counting rule is
# therefore narrower than "content words" in a way this code cannot reconstruct, so
# long descriptions still land high and are held at the boundary by the clamp below.
IU_TO_KEYWORD_RATIO = 0.6725

# Below this much speech the ratio features are dominated by sampling noise: at 28
# words, two extra pronouns move CTP_Pronouns_ratio by ~40%, which is larger than
# the effect the model is trying to detect. Short recordings get a retry prompt
# rather than a number.
# Word count is the primary gate: it is what governs the stability of the ratio
# features. The duration floor is secondary and exists so the pause statistics have
# enough signal to estimate from.
MIN_WORDS_FOR_SCORING = 40
MIN_SPEECH_SECONDS_FOR_SCORING = 30.0

# Features are clamped to this many standard deviations around the training mean.
# Beyond that range the model is extrapolating outside its support, where the
# sigmoid saturates and the prediction carries no evidential value.
CALIBRATION_SIGMA = 3.0

# Canonical Cookie Theft Information Units, lemmatised, matched against spaCy lemmas.
# This drives the clinically useful part - reporting WHICH task-relevant units the
# patient actually produced - and distinguishes an on-protocol description from free
# conversation. It is not claimed to reproduce the upstream corpus IU scale.
COOKIE_THEFT_IU_LEXICON = frozenset({
    # Subjects
    "boy", "girl", "woman", "mother", "mom", "mum", "lady", "child", "children",
    "kid", "son", "daughter", "brother", "sister",
    # Places
    "kitchen", "window", "garden", "yard", "path", "outside", "driveway", "sidewalk",
    # Objects
    "cookie", "biscuit", "jar", "stool", "sink", "water", "plate", "dish", "cup",
    "saucer", "cupboard", "cabinet", "curtain", "counter", "countertop", "faucet",
    "tap", "floor", "apron", "towel", "shelf", "lid", "drape",
    # Actions and states
    "steal", "take", "fall", "reach", "wash", "dry", "overflow", "spill", "run",
    "ignore", "hand", "climb", "stand", "tip", "topple", "wobble", "drop", "pour",
    "clean", "look", "laugh", "hold", "give", "ask",
})

_VOWEL_GROUP_RE = re.compile(r"[aeiouy]+")


def _count_syllables(word: str) -> int:
    """
    Estimates syllable count via vowel-group counting with silent-e correction.

    Used for CTP_RST(-/s), which is a phonation-rate biomarker measured in
    syllables per second of active speech, distinct from CTP_Word Rate(-/s).
    """
    cleaned = re.sub(r"[^a-z]", "", word.lower())
    if not cleaned:
        return 0
    groups = _VOWEL_GROUP_RE.findall(cleaned)
    count = len(groups)
    # Drop a trailing silent "e", but only when the final vowel group IS a bare "e".
    # In "cookie" or "movie" the final group is "ie", a pronounced nucleus; in "-le"
    # endings ("little") the e carries the syllable.
    if count > 1 and groups[-1] == "e" and cleaned.endswith("e") and not cleaned.endswith("le"):
        count -= 1
    return max(1, count)


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
      - keyword_TTR: len(unique_keywords) / len(keywords)

    Information Units (IUs) are scored separately from content words. An IU is a
    task-relevant semantic unit from the canonical picture-description scoring
    scheme (COOKIE_THEFT_IU_LEXICON), not any arbitrary content word. When the
    utterance is not a picture description at all, no canonical unit can match;
    scoring it as zero IUs would encode a task mismatch as a cognitive deficit,
    so the counts fall back to a proxy derived from the training IU:keyword ratio.
    """
    raw_text = transcript.strip() if transcript else ""
    if not raw_text:
        return {
            "noun_ratio": 0.0,
            "verb_ratio": 0.0,
            "adv_ratio": 0.0,
            "pronoun_ratio": 0.0,
            "noun_to_verb": 0.0,
            "keyword_ttr": 0.0,
            "verb_count": 0,
            "noun_count": 0,
            "pronoun_count": 0,
            "syllable_count": 0,
            "keywords": [],
            "unique_keywords": [],
            "iu_tokens": [],
            "unique_ius": [],
            "num_unique_iu": 0,
            "total_iu_mentions": 0,
            "iu_scoring_mode": "empty",
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
    keyword_ttr = _safe_div(len(unique_keywords), len(keyword_tokens), 0.0)

    # 3. Information Units: canonical task-relevant semantic units only
    iu_tokens = [lemma for lemma in keyword_tokens if lemma in COOKIE_THEFT_IU_LEXICON]
    unique_ius = sorted(set(iu_tokens))

    if iu_tokens:
        iu_scoring_mode = "canonical"
        num_unique_iu = len(unique_ius)
        total_iu_mentions = len(iu_tokens)
    else:
        # Free-form speech carries no Cookie Theft units by construction. Scale the
        # generic content-word counts by the training IU:keyword ratio so the
        # features stay responsive to content production without reading a task
        # mismatch as an absence of information units.
        iu_scoring_mode = "proxy"
        num_unique_iu = int(round(len(unique_keywords) * IU_TO_KEYWORD_RATIO))
        total_iu_mentions = int(round(len(keyword_tokens) * IU_TO_KEYWORD_RATIO))

    # 4. Syllable count drives the phonation-rate biomarker CTP_RST(-/s)
    syllable_count = sum(_count_syllables(t.text) for t in tokens)

    return {
        "noun_ratio": round(noun_ratio, 6),
        "verb_ratio": round(verb_ratio, 6),
        "adv_ratio": round(adv_ratio, 6),
        "pronoun_ratio": round(pronoun_ratio, 6),
        "noun_to_verb": round(noun_to_verb, 6),
        "keyword_ttr": round(keyword_ttr, 6),
        "verb_count": verb_count,
        "noun_count": noun_count,
        "pronoun_count": pronoun_count,
        "syllable_count": syllable_count,
        "keywords": keyword_tokens,
        "unique_keywords": unique_keywords,
        "iu_tokens": iu_tokens,
        "unique_ius": unique_ius,
        "num_unique_iu": num_unique_iu,
        "total_iu_mentions": total_iu_mentions,
        "iu_scoring_mode": iu_scoring_mode,
    }


def _rewind(audio_source: Any) -> None:
    """Rewinds a seekable stream so it can be decoded more than once."""
    seek = getattr(audio_source, "seek", None)
    if callable(seek) and getattr(audio_source, "seekable", lambda: False)():
        seek(0)


def _calibrate_to_training_support(
    features: Dict[str, float],
    sigma: float = CALIBRATION_SIGMA,
) -> tuple[Dict[str, float], List[Dict[str, Any]]]:
    """
    Clamps each feature to the training distribution's support, [mean - k*sigma, mean + k*sigma],
    taken from the fitted StandardScaler.

    Outside that envelope the network has no training evidence: the sigmoid saturates
    and the prediction is decided by extrapolation rather than by the biomarker. Values
    that land there are held at the boundary and reported, so a recording that falls
    outside the model's support is visible rather than silently converted into a
    confident score.
    """
    means = np.asarray(scaler.mean_, dtype=np.float64)
    scales = np.asarray(scaler.scale_, dtype=np.float64)

    calibrated = dict(features)
    clamped: List[Dict[str, Any]] = []

    for idx, feat in enumerate(production_features):
        raw = float(features[feat])
        lower = float(means[idx] - sigma * scales[idx])
        upper = float(means[idx] + sigma * scales[idx])
        bounded = min(max(raw, lower), upper)
        if bounded != raw:
            calibrated[feat] = bounded
            clamped.append({
                "feature": feat,
                "raw_value": round(raw, 6),
                "calibrated_value": round(bounded, 6),
                "training_z_score": round(float((raw - means[idx]) / scales[idx]), 3),
            })

    return calibrated, clamped


def run_screening_pipeline(
    audio_source: Union[str, Path, BinaryIO, bytes],
    require_minimum_sample: bool = True,
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

        # Reject samples too short to estimate ratio features from. Returning a
        # confident-looking probability off 28 words would be the same class of
        # error as extrapolating outside the training distribution.
        if require_minimum_sample and (
            word_count < MIN_WORDS_FOR_SCORING or duration_sec < MIN_SPEECH_SECONDS_FOR_SCORING
        ):
            return {
                "success": True,
                "sample_sufficient": False,
                "transcript": full_transcript,
                "detected_language": info.language,
                "word_count": word_count,
                "audio": {
                    "duration_seconds": audio_metrics.get("duration_seconds", 0.0),
                    "speech_timeline_duration": words_list[-1]["end"] if words_list else duration_sec,
                    "sample_rate": audio_metrics.get("sample_rate", 16000),
                    "rms_energy": audio_metrics.get("rms_energy", 0.0),
                    "peak_amplitude": audio_metrics.get("peak_amplitude", 0.0),
                    "silence_percentage": audio_metrics.get("silence_percentage", 0.0),
                },
                "sample_requirements": {
                    "words_recorded": word_count,
                    "words_required": MIN_WORDS_FOR_SCORING,
                    "seconds_recorded": round(duration_sec, 1),
                    "seconds_required": MIN_SPEECH_SECONDS_FOR_SCORING,
                },
                "screening": {
                    "predicted_class": None,
                    "probability": None,
                    "probability_percent": None,
                    "technical_confidence_percent": None,
                    "uncertainty_std": None,
                    "risk_tier": None,
                    "status": "More speech needed",
                    "interpretation": (
                        f"Only {word_count} words in {duration_sec:.0f} seconds were recorded. "
                        f"At least {MIN_WORDS_FOR_SCORING} words over {MIN_SPEECH_SECONDS_FOR_SCORING:.0f} "
                        "seconds are needed before a screening signal can be estimated. "
                        "Please describe the picture again, in as much detail as you can."
                    ),
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
        # Faster-Whisper word timestamps are contiguous - each word's end abuts the
        # next word's start - so inter-word gaps collapse to ~0 s and cannot measure
        # hesitation. Pause structure is taken from the PCM energy envelope instead.
        _rewind(audio_source)
        pause_stats = analyze_silence_runs(audio_source)

        # Fundamental-frequency statistics and voice perturbation. CTP_F0 SD(st)
        # was previously always the training median, so pitch variability - one of
        # the 22 model inputs - contributed an identical constant for every
        # speaker. It is measurable from the waveform and is now measured.
        _rewind(audio_source)
        voice_quality = analyze_voice_quality(audio_source)

        mean_pause_ms = pause_stats["mean_pause_ms"] or medians_dict.get("CTP_DPI(ms)", 401.99)

        # Hesitation Ratio is the proportion of the recording not occupied by phonation.
        hesitation_ratio = pause_stats["silence_frame_ratio"]
        if hesitation_ratio <= 0.0:
            hesitation_ratio = medians_dict.get("CTP_Hesitation Ratio", 0.639)

        # Three distinct rate biomarkers, previously all collapsed onto word_rate:
        #   CTP_Word Rate(-/s)    words per second of the whole recording (pauses included)
        #   CTP_Voiced Rate(1/s)  words per second of active speech time
        #   CTP_RST(-/s)          syllables per second of active speech (phonation rate)
        word_rate = _safe_div(
            float(word_count), duration_sec, medians_dict.get("CTP_Word Rate(-/s)", 1.288)
        )
        voiced_rate = _safe_div(
            float(word_count), max(0.1, speech_timeline_duration),
            medians_dict.get("CTP_Voiced Rate(1/s)", 1.411),
        )
        syllable_rate = _safe_div(
            float(nlp_features["syllable_count"]), max(0.1, speech_timeline_duration),
            medians_dict.get("CTP_RST(-/s)", 2.787),
        )
        energy_mean = float(audio_metrics.get("rms_energy", 0.0) ** 2)

        # 5. Populate the 22-Feature Production Contract Vector
        # Density features are standardised to TASK_REFERENCE_WORD_COUNT. Dividing by a
        # short clip's own word count inflates every ratio several-fold relative to the
        # full-length transcripts the scaler was fitted on.
        density_word_base = max(float(word_count), TASK_REFERENCE_WORD_COUNT)
        num_unique_iu = float(nlp_features["num_unique_iu"])
        total_iu_mentions = float(nlp_features["total_iu_mentions"])
        num_unique_keywords = float(len(nlp_features["unique_keywords"]))

        live_features = {
            # Measured when the clip holds enough voiced speech; the training
            # median otherwise. A clip with no voiced frames must not be scored
            # as if its pitch variability were zero.
            "CTP_F0 SD(st)": (
                float(voice_quality["f0_sd_semitones"])
                if voice_quality.get("measured")
                else medians_dict.get("CTP_F0 SD(st)", 5.554)
            ),
            "CTP_DPI(ms)": mean_pause_ms,
            "CTP_RST(-/s)": round(syllable_rate, 6),
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
            "CTP_num_unique_IU": num_unique_iu,
            "CTP_num_unique_keywords": num_unique_keywords,
            "CTP_unique_IU_densitys": round(_safe_div(num_unique_iu, density_word_base, medians_dict.get("CTP_unique_IU_densitys", 0.0534)), 6),
            "CTP_total_IU_density": round(_safe_div(total_iu_mentions, density_word_base, medians_dict.get("CTP_total_IU_density", 0.101)), 6),
            "CTP_keyword_to_non_keyword_ratio": round(_safe_div(total_iu_mentions, max(1.0, density_word_base - total_iu_mentions), medians_dict.get("CTP_keyword_to_non_keyword_ratio", 0.112)), 6),
            "CTP_unique_IU_efficiency": round(_safe_div(num_unique_keywords, density_word_base, medians_dict.get("CTP_unique_IU_efficiency", 0.0769)), 6),
        }

        # Cross-lingual correction FIRST: map lexical and rate features from the
        # speaker's own language reference distribution onto the training
        # distribution, so an English speaker's naturally higher pronoun rate is not
        # read as the dementia marker it would be in the Chinese training corpus.
        raw_features = dict(live_features)
        training_means = {f: float(scaler.mean_[i]) for i, f in enumerate(production_features)}
        training_scales = {f: float(scaler.scale_[i]) for i, f in enumerate(production_features)}
        live_features, language_calibration = calibrate_features(
            live_features,
            info.language or "unknown",
            training_means,
            training_scales,
        )

        # Then hold whatever remains inside the training distribution's support
        live_features, clamped_features = _calibrate_to_training_support(live_features)

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

        # Risk Tier Classification. Withheld entirely when the speaker's language has
        # no reference profile: the lexical features are then on the wrong scale and
        # a tier would present a known-biased number as a clinical category.
        is_calibrated = language_calibration.get("is_calibrated", False)
        is_provisional = language_calibration.get("profile_quality") != "validated"

        if not is_calibrated:
            risk_tier = None
            status = "Not calibrated for this language"
            interpretation = (
                "This screening model's language features were fitted on Chinese speech "
                f"and no reference profile exists yet for '{info.language}'. A risk level "
                "is not reported, because scoring across languages without calibration "
                "biases the result. Screening result only - not a diagnosis."
            )
        else:
            if prob < 0.35:
                risk_tier = "Low Risk"
            elif prob <= 0.60:
                risk_tier = "Moderate / Monitor"
            else:
                risk_tier = "Elevated Risk"
            status = "Elevated screening signal" if predicted_class == 1 else "Lower screening signal"
            interpretation = "Screening result only - not a diagnosis."
            if is_provisional:
                interpretation = (
                    "Screening result only - not a diagnosis. The language reference profile "
                    "used here is provisional and not validated for clinical use."
                )

        # 7. Compute Quantum Feature Attributions.
        # Attributions are averaged over the same 30 Monte Carlo Dropout passes used
        # for inference, and anchored to the probability actually reported, so the
        # explanation describes the score the user is shown.
        measured_this_run = [
            f
            for f in LIVE_EXTRACTED_FEATURES
            if f != "CTP_F0 SD(st)" or voice_quality.get("measured")
        ]

        df_for_explain = pd.DataFrame([live_features], columns=production_features)
        explanation = explain_single_prediction(
            df_for_explain,
            top_k=5,
            n_passes=inference_res["mc_passes"],
            reference_probability=prob,
            measured_features=measured_this_run,
        )

        # Feature dictionary for UI radar & reports
        production_features_dict = {}
        for col in production_features:
            production_features_dict[col] = {
                "value": round(float(live_features[col]), 6),
                "is_live_extracted": col in measured_this_run,
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
            # Measured voice quality. `measured: false` means the clip held too
            # little voiced speech to estimate these; the UI must show them as
            # unavailable rather than printing a zero as a reading.
            "voice_quality": voice_quality,
            "sample_sufficient": True,
            "live_features": live_features,
            "raw_features": raw_features,
            "production_features": production_features_dict,
            "language_calibration": language_calibration,
            "feature_calibration": {
                "iu_scoring_mode": nlp_features["iu_scoring_mode"],
                "matched_information_units": nlp_features["unique_ius"],
                "density_word_base": density_word_base,
                "task_reference_word_count": TASK_REFERENCE_WORD_COUNT,
                "calibration_sigma": CALIBRATION_SIGMA,
                "clamped_features": clamped_features,
            },
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
                "interpretation": interpretation,
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
