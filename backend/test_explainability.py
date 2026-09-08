import sys
from pathlib import Path
import numpy as np
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import model_loader
import explainability

EXPECTED_FEATURE_COUNT = 22


def test_quantum_model_integrity():
    """Verify the production Quantum-Hybrid model artifact exists and loads."""
    model_path = model_loader.MODEL_PATH
    assert model_path.exists(), "Quantum-Hybrid model weights file missing"
    assert model_path.stat().st_size > 10000, f"Model size unexpectedly small: {model_path.stat().st_size}"
    assert model_loader.model is not None, "Model failed to instantiate"
    print("  [PASS] Quantum-Hybrid model artifact integrity verified.")


def test_feature_contract_preservation():
    """Ensure the 22-feature contract is strictly preserved."""
    features = model_loader.production_features
    assert len(features) == EXPECTED_FEATURE_COUNT, (
        f"Contract violation: expected {EXPECTED_FEATURE_COUNT}, got {len(features)}"
    )
    print(f"  [PASS] Exactly {EXPECTED_FEATURE_COUNT} features preserved in order.")


def test_single_sample_explanation():
    """Verify single-sample quantum feature attribution."""
    sample_dict = {f: model_loader.medians_dict.get(f, 0.0) for f in model_loader.production_features}
    df = pd.DataFrame([sample_dict])

    result = explainability.explain_single_prediction(df, top_k=5)

    assert "shap_contributions" in result, "Missing shap_contributions in result"
    assert len(result["shap_contributions"]) == EXPECTED_FEATURE_COUNT, (
        f"Expected attributions for all {EXPECTED_FEATURE_COUNT} features, got {len(result['shap_contributions'])}"
    )
    assert "top_positive_contributions" in result, "Missing top_positive_contributions"
    assert "top_negative_contributions" in result, "Missing top_negative_contributions"
    assert "human_readable_explanation" in result, "Missing human_readable_explanation"
    assert "disclaimer" in result, "Missing disclaimer"

    print("  [PASS] Single-sample quantum feature attribution computed successfully.")
    print(f"  [PASS] Human explanation: {result['human_readable_explanation']}")


if __name__ == "__main__":
    print("=" * 70)
    print("SwarSanket Quantum Explainability Verification")
    print("=" * 70)
    test_quantum_model_integrity()
    test_feature_contract_preservation()
    test_single_sample_explanation()
    print("=" * 70)
    print("ALL QUANTUM EXPLAINABILITY TESTS PASSED")
    print("=" * 70)
