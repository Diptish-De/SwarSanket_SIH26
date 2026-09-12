"""
Build a cross-lingual reference profile for SwarSanket.
=======================================================
Computes the reference distribution of the language-dependent features for one
language, from recordings of speakers of that language.

    python backend/build_language_profile.py --language en --audio-dir backend/uploads
    python backend/build_language_profile.py --language en --audio-dir data/controls_en --quality validated

The profile is what lets language_calibration.py map a speaker onto the training
distribution without the Chinese-corpus bias described in
docs/MODEL_PROVENANCE_AUDIT.md.

WHAT MAKES A PROFILE TRUSTWORTHY
--------------------------------
The reference distribution must describe COGNITIVELY HEALTHY speakers of the
language, performing the SAME picture-description task, recorded under similar
conditions. A profile built from a handful of clips by one speaker describes that
speaker, not the population, and is written with quality="provisional". Pass
--quality validated only when all of the following hold:

  * recordings come from >= 30 distinct speakers,
  * every speaker is screened cognitively healthy by an independent instrument
    (MMSE / MoCA), not by this model,
  * the age and sex distribution approximates the intended screening population,
  * all recordings use the standardised picture-description prompt.

Anything less and the calibration will encode the quirks of the sample as if they
were the language's norm.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from language_calibration import LANGUAGE_DEPENDENT_FEATURES, PROFILES_DIR  # noqa: E402

AUDIO_SUFFIXES = (".webm", ".wav", ".m4a", ".mp3", ".ogg", ".flac")


def collect_audio(audio_dir: Path) -> List[Path]:
    return sorted(p for p in audio_dir.iterdir() if p.suffix.lower() in AUDIO_SUFFIXES)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a SwarSanket language reference profile.")
    parser.add_argument("--language", required=True, help="Language code, e.g. 'en', 'hi', 'bn'.")
    parser.add_argument("--audio-dir", required=True, type=Path, help="Directory of recordings.")
    parser.add_argument(
        "--quality",
        choices=("provisional", "validated"),
        default="provisional",
        help="Use 'validated' only when the sampling requirements in this file's docstring are met.",
    )
    parser.add_argument("--min-words", type=int, default=20, help="Skip recordings shorter than this.")
    args = parser.parse_args()

    if not args.audio_dir.is_dir():
        print(f"ERROR: {args.audio_dir} is not a directory.")
        return 1

    # Imported late: loading the pipeline pulls in torch, spaCy and Whisper.
    from screening_engine import run_screening_pipeline

    audio_files = collect_audio(args.audio_dir)
    if not audio_files:
        print(f"ERROR: no audio files found in {args.audio_dir}.")
        return 1

    print(f"Building '{args.language}' profile from {len(audio_files)} recording(s) in {args.audio_dir}")
    print("-" * 72)

    samples: Dict[str, List[float]] = {f: [] for f in LANGUAGE_DEPENDENT_FEATURES}
    used = 0
    skipped: List[str] = []

    for path in audio_files:
        try:
            result = run_screening_pipeline(path, require_minimum_sample=False)
        except Exception as exc:  # noqa: BLE001 - one bad file must not abort the build
            skipped.append(f"{path.name}: {exc}")
            continue

        if not result.get("success"):
            skipped.append(f"{path.name}: {result.get('error', 'pipeline failure')}")
            continue

        if result.get("word_count", 0) < args.min_words:
            skipped.append(f"{path.name}: only {result.get('word_count', 0)} words")
            continue

        # raw_features are pre-calibration and pre-clamp: the profile must describe
        # what this language actually produces, not what was fed to the model.
        features = result.get("raw_features") or result.get("live_features", {})
        for feat in LANGUAGE_DEPENDENT_FEATURES:
            if feat in features and np.isfinite(features[feat]):
                samples[feat].append(float(features[feat]))

        used += 1
        print(f"  [{used:3d}] {path.name}  ({result.get('word_count')} words)")

    if used < 2:
        print(f"\nERROR: only {used} usable recording(s); need at least 2 to estimate a spread.")
        for line in skipped:
            print(f"  skipped {line}")
        return 1

    statistics: Dict[str, Any] = {}
    for feat, values in samples.items():
        if len(values) < 2:
            continue
        arr = np.asarray(values, dtype=np.float64)
        statistics[feat] = {
            "mean": float(np.mean(arr)),
            "sd": float(np.std(arr, ddof=1)),
            "median": float(np.median(arr)),
            "n": int(arr.size),
        }

    profile = {
        "language": args.language.lower(),
        "quality": args.quality,
        "sample_size": used,
        "distinct_speakers": None,
        "built_at": datetime.now(timezone.utc).isoformat(),
        "source_directory": str(args.audio_dir),
        "warning": (
            "PROVISIONAL: built from an unlabelled convenience sample. Describes these "
            "recordings, not the language population. Not sufficient for clinical use."
            if args.quality == "provisional"
            else "Validated against the sampling requirements in build_language_profile.py."
        ),
        "statistics": statistics,
    }

    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROFILES_DIR / f"{args.language.lower()}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2, ensure_ascii=False)

    print("-" * 72)
    print(f"Wrote {out_path}")
    print(f"  quality    : {args.quality}")
    print(f"  recordings : {used} used, {len(skipped)} skipped")
    print(f"  features   : {len(statistics)} of {len(LANGUAGE_DEPENDENT_FEATURES)}")
    if skipped:
        print("\nSkipped:")
        for line in skipped:
            print(f"  - {line}")
    if args.quality == "provisional":
        print(
            "\nNOTE: this profile is provisional. The API will report it as such and the "
            "UI will not present it as a calibrated clinical result."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
