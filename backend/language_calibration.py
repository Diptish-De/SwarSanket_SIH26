"""
SwarSanket Cross-Lingual Feature Calibration
============================================
Corrects the systematic bias introduced by scoring non-Chinese speech against a
model whose features were derived from Chinese ASR corpora.

THE PROBLEM
-----------
The 22-feature contract was fitted on pre-computed CTP_* columns from Chinese ASR
exports (see docs/MODEL_PROVENANCE_AUDIT.md). Several of those features are
lexical or segmentation-bound, and their population means differ *structurally*
between languages rather than because of any cognitive difference. The clearest
case is CTP_Pronouns_ratio:

  - Mandarin is a pro-drop language: subject and object pronouns are routinely
    omitted where English grammar obliges an overt pronoun.
  - The fitted training mean is 0.064 (6.4% of tokens).
  - Ordinary English conversational speech runs materially higher.

An English speaker therefore starts out looking "pronoun-heavy" before saying
anything clinically unusual, and pronoun overuse is a dementia marker in this
model. The bias is directional: it pushes English input toward Elevated Risk.
The same applies to noun/verb ratios and to every count whose denominator is a
"word", since word segmentation is not comparable across the two scripts.

THE CORRECTION
--------------
Standard mean/standard-deviation domain transfer. For a language-dependent
feature f, given a reference distribution for the speaker's OWN language
(mu_ref, sd_ref) and the training distribution (mu_train, sd_train):

    z_speaker = (value - mu_ref) / sd_ref
    value'    = mu_train + z_speaker * sd_train

This preserves the clinically meaningful quantity - how unusual this speaker is
relative to healthy speakers of their own language - while presenting the model
with a value on the scale it was fitted on. A speaker who is perfectly typical
for their language maps to the training mean and contributes nothing, instead of
contributing a spurious signal.

WHAT THIS MODULE WILL NOT DO
----------------------------
It will not invent reference statistics. A language is calibrated only when a
profile built from real recordings of that language exists. With no profile the
module reports `status="uncalibrated"` and changes nothing, and the caller is
expected to withhold the clinical risk tier rather than present an uncorrected
score as if it were calibrated. Build profiles with build_language_profile.py.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("swarsanket.language_calibration")

PROFILES_DIR = Path(__file__).resolve().parent / "models" / "language_profiles"

# ---------------------------------------------------------------------------
# Feature taxonomy
# ---------------------------------------------------------------------------
# Lexical and part-of-speech features. Their population values depend on the
# grammar of the language (pro-drop, classifier use, morphology), not only on the
# speaker's cognition.
LEXICAL_FEATURES = [
    "CTP_verb_num",
    "CTP_noun_ratio",
    "CTP_Pronouns_ratio",
    "CTP_noun to verb",
    "CTP_num_unique_IU",
    "CTP_num_unique_keywords",
    "CTP_unique_IU_densitys",
    "CTP_total_IU_density",
    "CTP_keyword_to_non_keyword_ratio",
    "CTP_unique_IU_efficiency",
]

# Rate features. A "word" is not the same unit across scripts, so counts per
# second are not comparable even though the seconds are.
RATE_FEATURES = [
    "CTP_RST(-/s)",
    "CTP_Voiced Rate(1/s)",
    "CTP_Word Rate(-/s)",
]

# Acoustic timing and energy. These transfer across languages far better: a pause
# is a pause. Left uncorrected.
TRANSFERABLE_FEATURES = [
    "CTP_DPI(ms)",
    "CTP_Hesitation Ratio",
    "CTP_Energy Mean(Pa^2·s)",
]

LANGUAGE_DEPENDENT_FEATURES = LEXICAL_FEATURES + RATE_FEATURES


def profile_path(language: str) -> Path:
    return PROFILES_DIR / f"{language.lower()}.json"


def load_profile(language: str) -> Optional[Dict[str, Any]]:
    """Loads the reference profile for a language, or None if none has been built."""
    path = profile_path(language)
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            profile = json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Language profile %s is unreadable: %s", path.name, exc)
        return None

    stats = profile.get("statistics")
    if not isinstance(stats, dict) or not stats:
        logger.warning("Language profile %s has no statistics block", path.name)
        return None
    return profile


def available_languages() -> List[str]:
    """Language codes that currently have a reference profile on disk."""
    if not PROFILES_DIR.exists():
        return []
    return sorted(p.stem for p in PROFILES_DIR.glob("*.json"))


def calibrate_features(
    features: Dict[str, float],
    language: str,
    training_means: Dict[str, float],
    training_scales: Dict[str, float],
) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """
    Maps language-dependent features from the speaker's own language distribution
    onto the training distribution.

    Returns the (possibly unchanged) feature dict and a report describing what was
    done, including whether the result may be presented as a calibrated score.
    """
    profile = load_profile(language)

    if profile is None:
        return dict(features), {
            "status": "uncalibrated",
            "language": language,
            "is_calibrated": False,
            "profile_quality": None,
            "adjusted_features": [],
            "note": (
                f"No reference profile exists for '{language}'. The model's lexical "
                "features were fitted on Chinese ASR corpora and are not comparable "
                "across languages, so no clinical risk tier is reported for this "
                "recording. Build a profile with build_language_profile.py."
            ),
            "available_languages": available_languages(),
        }

    stats = profile["statistics"]
    quality = profile.get("quality", "provisional")

    calibrated = dict(features)
    adjusted: List[Dict[str, Any]] = []

    for feat in LANGUAGE_DEPENDENT_FEATURES:
        if feat not in features or feat not in stats:
            continue

        ref = stats[feat]
        ref_mean = float(ref.get("mean", 0.0))
        ref_sd = float(ref.get("sd", 0.0))

        # A reference SD of zero carries no information about spread, so there is
        # nothing to transfer; leaving the raw value would reintroduce the bias.
        if not np.isfinite(ref_sd) or ref_sd <= 1e-9:
            continue

        train_mean = float(training_means[feat])
        train_scale = float(training_scales[feat])

        raw = float(features[feat])
        z_speaker = (raw - ref_mean) / ref_sd
        transferred = train_mean + z_speaker * train_scale

        calibrated[feat] = transferred
        adjusted.append({
            "feature": feat,
            "raw_value": round(raw, 6),
            "calibrated_value": round(transferred, 6),
            "speaker_z_in_own_language": round(z_speaker, 3),
        })

    return calibrated, {
        "status": "calibrated",
        "language": language,
        "is_calibrated": True,
        "profile_quality": quality,
        "profile_sample_size": profile.get("sample_size"),
        "profile_built_at": profile.get("built_at"),
        "adjusted_features": adjusted,
        "note": (
            "Lexical and rate features were mapped from the speaker's own language "
            "reference distribution onto the training distribution."
            + (
                " This profile is PROVISIONAL: it was built from a small, "
                "clinically unlabelled sample and is not sufficient for clinical use."
                if quality != "validated"
                else ""
            )
        ),
        "available_languages": available_languages(),
    }
