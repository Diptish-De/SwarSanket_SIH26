import os
import sys
import json
from pathlib import Path

# Ensure backend directory is in python path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from model_loader import production_features, EXPECTED_FEATURE_COUNT
from screening_engine import (
    run_screening_pipeline,
    LIVE_EXTRACTED_FEATURES,
)

AUDIO_DIR = BACKEND_DIR / "uploads"
audio_files = list(AUDIO_DIR.glob("*.webm")) + list(AUDIO_DIR.glob("*.m4a")) + list(AUDIO_DIR.glob("*.wav"))

if not audio_files:
    AUDIO_DIR = BACKEND_DIR / "test_audio"
    audio_files = list(AUDIO_DIR.glob("*.webm")) + list(AUDIO_DIR.glob("*.m4a")) + list(AUDIO_DIR.glob("*.wav"))

if not audio_files:
    raise FileNotFoundError(f"No audio files found to run the screening engine test.")

test_audio_path = str(audio_files[0])

print("=" * 75)
print("SwarSanket Quantum-Hybrid Live Screening Engine Verification")
print("=" * 75)
print(f"Target Audio File: {test_audio_path}")

# Run 1: Full pipeline execution
print("\n[1/3] Running live screening engine on target audio...")
result_pass1 = run_screening_pipeline(test_audio_path)

if not result_pass1["success"]:
    print(f"ERROR in screening pipeline: {result_pass1.get('error')}")
    sys.exit(1)

# Verification checks
print("\n[2/3] Validating production contract integrity & feature extraction...")

transcript = result_pass1["transcript"]
print(f"  Transcript:            \"{transcript}\"")
assert len(transcript) > 0, "Transcript is empty!"

prod_feats = result_pass1["production_features"]
assert len(prod_feats) == EXPECTED_FEATURE_COUNT, f"Expected {EXPECTED_FEATURE_COUNT} production features, got {len(prod_feats)}"
assert list(prod_feats.keys()) == production_features, "Feature order does not match production contract!"

live_count = sum(1 for v in prod_feats.values() if v["is_live_extracted"])
imputed_count = sum(1 for v in prod_feats.values() if not v["is_live_extracted"])

print(f"  Total Prod Features:   {len(prod_feats)}")
print(f"  Live Extracted:        {live_count}")
print(f"  Median Imputed:        {imputed_count}")

screening = result_pass1["screening"]
predicted_class = screening["predicted_class"]
prob = screening["probability"]
prob_pct = screening["probability_percent"]
conf_pct = screening["technical_confidence_percent"]
risk_tier = screening.get("risk_tier", screening.get("status"))

print(f"  Predicted Class:       {predicted_class} ({risk_tier})")
print(f"  Probability:           {prob:.4f} ({prob_pct}%)")
print(f"  Epistemic Uncertainty: {screening.get('epistemic_uncertainty', 0.0):.4f}")
print(f"  Technical Confidence:  {conf_pct}%")
print(f"  Interpretation:        \"{screening['interpretation']}\"")

assert predicted_class in (0, 1), f"Invalid predicted class: {predicted_class}"
assert 0.0 <= prob <= 1.0, f"Invalid probability: {prob}"

# Display clean summary table
print("\n[3/3] Extracted 22-Feature Production Table:")
print("-" * 75)
print(f"{'#':<3} {'Feature Name':<38} {'Value':<12} {'Type'}")
print("-" * 75)
for idx, (fname, fmeta) in enumerate(prod_feats.items(), 1):
    val = fmeta.get("raw_value") if fmeta.get("is_live_extracted") else fmeta.get("imputed_value")
    val_str = f"{val:.6f}" if val is not None else "N/A"
    ftype = "LIVE_AUDIO_NLP" if fmeta["is_live_extracted"] else "MEDIAN_IMPUTED"
    print(f"{idx:<3} {fname:<38} {val_str:<12} {ftype}")

print("=" * 75)
print("QUANTUM-HYBRID SCREENING ENGINE PIPELINE: ALL CHECKS PASSED.")
print("=" * 75)
