"""
Unit & Integration Tests for SwarSanket XGBoost Explainability (Step 97B)
=========================================================================
Covers:
  - 20-feature contract preservation
  - Single-sample SHAP calculation
  - Reconstructed probability additivity (margin sigmoid)
  - Deterministic repeated explanation
  - Missing feature handling (median imputer integration)
  - Invalid input handling
  - Global SHAP calculation
  - Safe human-readable text framing (non-causal compliance)
  - Frozen model artifact integrity (hash & size check)
"""

import sys
import hashlib
from pathlib import Path
import numpy as np
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import model_loader
import explainability

EXPECTED_MODEL_SIZE = 219239
EXPECTED_MODEL_SHA256 = "abf95dc0967cb02d887f891e3e18a7077a0f4ca515fefa863535e2a660bfb137"


def test_frozen_model_integrity():
    """Verify the production XGBoost model has not been modified or retrained."""
    model_path = model_loader.MODEL_PATH
    assert model_path.exists(), "Model file missing"
    assert model_path.stat().st_size == EXPECTED_MODEL_SIZE, (
        f"Model size altered: expected {EXPECTED_MODEL_SIZE}, got {model_path.stat().st_size}"
    )

    hasher = hashlib.sha256()
    with open(model_path, "rb") as f:
        hasher.update(f.read())
    computed_hash = hasher.hexdigest().lower()
    assert computed_hash == EXPECTED_MODEL_SHA256, (
        f"Model SHA256 altered: expected {EXPECTED_MODEL_SHA256}, got {computed_hash}"
    )


def test_feature_contract_preservation():
    """Verify exact 20-feature production contract and ordering."""
    features = model_loader.production_features
    assert len(features) == 20, f"Expected 20 features, got {len(features)}"

    # Check key contract features exist
    assert "CTP_Energy Mean(Pa^2·s)" in features
    assert "CTP_Word Rate(-/s)" in features
    assert "CTP_ keyword_TTR" in features
    assert "CTP_unique_IU_efficiency" in features


def test_single_sample_explanation():
    """Verify single prediction explanation on a 20-feature input."""
    # Test vector (20 zeros)
    dummy_input = np.zeros(20)
    res = explainability.explain_single_prediction(dummy_input)

    assert "predicted_class" in res
    assert res["predicted_class"] in (0, 1)
    assert "probability" in res
    assert 0.0 <= res["probability"] <= 1.0
    assert "base_value" in res
    assert "top_positive_contributions" in res
    assert "top_negative_contributions" in res
    assert "shap_contributions" in res
    assert len(res["shap_contributions"]) == 20
    assert "human_readable_explanation" in res
    assert "disclaimer" in res


def test_reconstructed_probability_additivity():
    """
    Verify exact mathematical additivity:
      margin = base_value + sum(shap_values)
      reconstructed_prob = 1 / (1 + exp(-margin))
      abs(model_prob - reconstructed_prob) < 1e-5
    """
    test_inputs = [
        np.zeros(20),
        np.ones(20) * 0.5,
        np.array([
            0.2, 1.5, 0.4, 0.1, 0.05, 0.15, 0.25, 0.05,
            0.12, 0.6, 0.45, 2.5, 0.3, 0.1, 0.2, 0.15,
            12.0, 0.4, 0.85, 0.05
        ]),
    ]

    for vec in test_inputs:
        res = explainability.explain_single_prediction(vec)
        assert res["reconstruction_error"] < 1e-5, (
            f"Additivity reconstruction error too high: {res['reconstruction_error']}"
        )


def test_deterministic_repeated_explanation():
    """Verify repeated explanations on the same input return identical results."""
    vec = np.array([
        0.1, 0.9, 0.3, 0.05, 0.02, 0.12, 0.22, 0.04,
        0.10, 0.5, 0.40, 2.1, 0.25, 0.08, 0.18, 0.12,
        10.0, 0.35, 0.80, 0.04
    ])

    first = explainability.explain_single_prediction(vec)
    for _ in range(5):
        repeat = explainability.explain_single_prediction(vec)
        assert first["predicted_class"] == repeat["predicted_class"]
        assert first["probability"] == repeat["probability"]
        assert first["shap_margin_sum"] == repeat["shap_margin_sum"]
        for feat in model_loader.production_features:
            assert first["shap_contributions"][feat] == repeat["shap_contributions"][feat]


def test_missing_feature_handling():
    """Verify input with missing (NaN) values is imputed and explained without error."""
    # 8 live features, 12 NaNs (matches live inference engine)
    sparse_input = {
        "CTP_noun_ratio": 0.1471,
        "CTP_verb_ratio": 0.2353,
        "CTP_adv_ratio": 0.1176,
        "CTP_Pronouns_ratio": 0.1471,
        "CTP_noun to verb": 0.625,
        "CTP_Word Rate(-/s)": 2.7687,
        "CTP_unique_IU_efficiency": 0.4118,
        "CTP_ keyword_TTR": 0.9333,
    }

    res = explainability.explain_single_prediction(sparse_input, apply_imputation=True)
    assert res["predicted_class"] in (0, 1)
    assert not np.isnan(res["probability"])
    assert not np.isinf(res["probability"])
    assert len(res["shap_contributions"]) == 20
    for feat, val in res["shap_contributions"].items():
        assert not np.isnan(val), f"NaN SHAP value for {feat}"
        assert not np.isinf(val), f"Inf SHAP value for {feat}"


def test_invalid_input_handling():
    """Verify input dimension and type mismatches are caught cleanly."""
    # 15 features (should raise ValueError)
    threw_len_error = False
    try:
        explainability.explain_single_prediction(np.zeros(15))
    except ValueError:
        threw_len_error = True
    assert threw_len_error, "Failed to reject 15-feature input"

    # 25 features (should raise ValueError)
    threw_len_error2 = False
    try:
        explainability.explain_single_prediction(np.zeros(25))
    except ValueError:
        threw_len_error2 = True
    assert threw_len_error2, "Failed to reject 25-feature input"

    # String input (should raise TypeError)
    threw_type_error = False
    try:
        explainability.explain_single_prediction("invalid_string_input")
    except TypeError:
        threw_type_error = True
    assert threw_type_error, "Failed to reject invalid string input"


def test_global_shap_calculation():
    """Verify global explainability computation produces ranked output and top 10."""
    dummy_data = np.random.RandomState(42).randn(10, 20)
    summary = explainability.compute_global_explainability(dummy_data, dataset_name="Test Set")

    assert summary["sample_count"] == 10
    assert summary["feature_count"] == 20
    assert len(summary["top_10_features"]) == 10
    assert len(summary["ranked_feature_importance"]) == 20

    # Ensure ranked in descending order of mean_abs_shap
    vals = [f["mean_abs_shap"] for f in summary["ranked_feature_importance"]]
    assert vals == sorted(vals, reverse=True)


def test_safe_human_readable_framing():
    """Verify output contains strictly non-causal language and mandatory disclaimer."""
    res = explainability.explain_single_prediction(np.zeros(20))
    text = res["human_readable_explanation"].lower()

    # Prohibited causal claims
    prohibited = [
        "caused alzheimer",
        "proves alzheimer",
        "has alzheimer's because",
        "patient has alzheimer",
        "clinical diagnosis",
        "proven disease",
    ]
    for phrase in prohibited:
        assert phrase not in text, f"Prohibited phrase found: '{phrase}'"

    # Mandatory disclaimer present
    assert "shap values explain the behavior of the trained machine-learning model" in text
    assert "they do not establish clinical causality" in text


def run_all_tests():
    """Standalone test runner requiring zero external test runners."""
    tests = [
        ("Frozen Model Integrity", test_frozen_model_integrity),
        ("20-Feature Contract Preservation", test_feature_contract_preservation),
        ("Single-Sample SHAP Explanation", test_single_sample_explanation),
        ("Reconstructed Probability Additivity", test_reconstructed_probability_additivity),
        ("Deterministic Repeated Explanation", test_deterministic_repeated_explanation),
        ("Missing Feature Handling (Median Imputer)", test_missing_feature_handling),
        ("Invalid Input Handling", test_invalid_input_handling),
        ("Global SHAP Calculation", test_global_shap_calculation),
        ("Safe Human-Readable Text Framing", test_safe_human_readable_framing),
    ]

    print("=" * 70)
    print("RUNNING SWARSANKET EXPLAINABILITY TEST SUITE (Step 97B)")
    print("=" * 70)
    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_func()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1

    print("=" * 70)
    print(f"RESULTS: {passed} passed, {failed} failed.")
    print("=" * 70)
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()

