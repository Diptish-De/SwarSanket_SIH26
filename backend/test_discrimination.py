"""
SwarSanket Pipeline Discrimination Test
=======================================
Asserts that the live feature pipeline separates a fluent, information-rich
picture description from an impaired one, and that each individual biomarker
moves in the direction the clinical literature predicts.

WHAT THIS TEST DOES AND DOES NOT ESTABLISH
------------------------------------------
Both recordings are SYNTHESISED (Windows SAPI, same voice, same speaker
characteristics). They differ only in what this test is about:

  - the narration content: 28 unique Information Units versus 5, with the
    impaired sample built from the documented "empty speech" pattern - pronouns
    and indefinites ("that thing", "the lady", "it") standing in for nouns the
    speaker cannot retrieve;
  - the delivery: normal rate versus a slowed rate with inserted pauses.

Holding the voice constant is what makes the comparison meaningful: any change
in the features is attributable to content and timing, not to two different
people's vocal tracts.

This test therefore establishes that THE PIPELINE RESPONDS CORRECTLY. It does
NOT establish clinical accuracy, sensitivity or specificity. Those require real
patient recordings with confirmed diagnoses, which this repository does not
contain - see docs/MODEL_PROVENANCE_AUDIT.md. A synthetic sample cannot
validate a screening instrument, and nothing here should be presented as if it
had.

Run:  python backend/test_discrimination.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from screening_engine import run_screening_pipeline  # noqa: E402

TEST_AUDIO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_audio")

CONTROL = os.path.join(TEST_AUDIO, "discrim_control_healthy.wav")
IMPAIRED = os.path.join(TEST_AUDIO, "discrim_impaired_ad_like.wav")

# (feature, expected direction control -> impaired, why)
EXPECTED = [
    ("CTP_Hesitation Ratio", "up", "more of the recording is silence"),
    ("CTP_DPI(ms)", "up", "pauses are longer"),
    ("CTP_Word Rate(-/s)", "down", "speech is slower"),
    ("CTP_RST(-/s)", "down", "phonation rate is slower"),
    ("CTP_num_unique_IU", "down", "fewer information units produced"),
    ("CTP_total_IU_density", "down", "content is sparser per word"),
    ("CTP_unique_IU_efficiency", "down", "fewer keywords per word spoken"),
    ("CTP_noun_ratio", "down", "noun retrieval failure"),
    ("CTP_Pronouns_ratio", "up", "pronouns substituted for nouns"),
    ("CTP_F0 SD(st)", "down", "flatter, more monotone delivery"),
]


def main() -> int:
    for path in (CONTROL, IMPAIRED):
        if not os.path.exists(path):
            print(f"[SKIP] Missing fixture: {os.path.basename(path)}")
            return 0

    print("=" * 74)
    print("PIPELINE DISCRIMINATION TEST (synthetic stimuli - not clinical validation)")
    print("=" * 74)

    runs = {}
    for label, path in (("control", CONTROL), ("impaired", IMPAIRED)):
        result = run_screening_pipeline(path)
        if not result.get("success"):
            print(f"[FAIL] {label}: pipeline error: {result.get('error')}")
            return 1
        if not result.get("sample_sufficient"):
            print(f"[FAIL] {label}: refused as insufficient sample")
            return 1
        runs[label] = result

        vq = result.get("voice_quality", {})
        sc = result["screening"]
        print(f"\n{label.upper()}")
        print(f"  words {result['word_count']} | duration {result['audio']['duration_seconds']}s")
        print(f"  P(elevated) {sc['probability_percent']}% +/- {sc['uncertainty_std']}")
        print(f"  tier        {sc.get('risk_tier')}")
        print(
            f"  voice       F0 {vq.get('f0_mean_hz')} Hz | SD {vq.get('f0_sd_semitones')} st"
            f" | RAP {vq.get('jitter_rap_percent')}% | HNR {vq.get('hnr_db')} dB"
        )
        if not vq.get("measured"):
            print("[FAIL] voice quality was not measured on a 30s+ speech sample")
            return 1

    failures = []

    # Raw features, before cross-lingual calibration and clamping, so the test
    # asserts on what the extractor measured rather than on a transformed value.
    c_raw = runs["control"]["raw_features"]
    i_raw = runs["impaired"]["raw_features"]

    print("\n" + "=" * 74)
    print("BIOMARKER DIRECTIONS")
    print("=" * 74)

    for feature, direction, why in EXPECTED:
        cv, iv = float(c_raw[feature]), float(i_raw[feature])
        moved_up = iv > cv
        ok = moved_up if direction == "up" else iv < cv
        pct = ((iv - cv) / cv * 100.0) if cv else float("nan")
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {feature:34s} {cv:9.4f} -> {iv:9.4f} ({pct:+7.1f}%)  {why}")
        if not ok:
            failures.append(f"{feature} moved {'up' if moved_up else 'down'}, expected {direction}")

    c_p = runs["control"]["screening"]["probability_percent"]
    i_p = runs["impaired"]["screening"]["probability_percent"]

    print("\n" + "=" * 74)
    print(f"  P(elevated): control {c_p}%  ->  impaired {i_p}%   delta {i_p - c_p:+.2f} pp")

    # A margin rather than a strict inequality: with 30-pass Monte Carlo Dropout
    # a difference of a few points is sampling noise, and a test that accepted it
    # would pass on a model that had learned nothing.
    if i_p - c_p < 25.0:
        failures.append(f"separation only {i_p - c_p:.2f} pp, expected >= 25 pp")
        print("  [FAIL] insufficient separation")
    else:
        print("  [PASS] impaired sample scores substantially higher")

    if runs["control"]["screening"].get("risk_tier") == runs["impaired"]["screening"].get("risk_tier"):
        failures.append("both samples landed in the same risk tier")
        print("  [FAIL] both samples in the same risk tier")
    else:
        print("  [PASS] samples land in different risk tiers")

    print("=" * 74)
    if failures:
        print(f"DISCRIMINATION TEST FAILED ({len(failures)} problem(s)):")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("ALL DISCRIMINATION CHECKS PASSED.")
    print("Reminder: synthetic stimuli. This is a pipeline check, not clinical validation.")
    print("=" * 74)
    return 0


if __name__ == "__main__":
    sys.exit(main())
