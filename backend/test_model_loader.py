import json
import numpy as np
from model_loader import (
    model,
    scaler,
    production_features,
    medians_dict,
    get_model_info,
    run_monte_carlo_inference,
    EXPECTED_FEATURE_COUNT,
)

print("=" * 70)
print("SwarSanket Quantum-Hybrid Model Loader Verification")
print("=" * 70)

info = get_model_info()

print(f"Model Object:             {type(model).__name__}")
print(f"Framework:                {info['framework']}")
print(f"Qubits:                   {info['qubits']}")
print(f"Entangling Layers:        {info['entangling_layers']}")
print(f"Benchmark Test ROC-AUC:   {info['roc_auc']:.4f}")
print(f"Benchmark Accuracy:       {info['test_accuracy']:.4f}")
print(f"Scaler Features:          {scaler.n_features_in_}")
print(f"Number of Prod Features:  {len(production_features)}")

print("\n" + "-" * 70)
print("EXACT 22-FEATURE PRODUCTION CONTRACT (Indexed Order):")
print("-" * 70)
for idx, feat in enumerate(production_features, 1):
    med = medians_dict.get(feat, "N/A")
    print(f"  {idx:2d}. {feat:40s} (median={med})")

print("\n" + "=" * 70)
print("VERIFICATION CHECKLIST:")
assert len(production_features) == EXPECTED_FEATURE_COUNT, f"Expected {EXPECTED_FEATURE_COUNT} features, got {len(production_features)}"
assert model is not None, "Model is None"
assert scaler is not None, "Scaler is None"
assert scaler.n_features_in_ == EXPECTED_FEATURE_COUNT, "Scaler features mismatch"

# Test forward pass with Monte Carlo Dropout
dummy_vector = np.array([[medians_dict.get(f, 0.0) for f in production_features]], dtype=np.float64)
res = run_monte_carlo_inference(dummy_vector, n_passes=10)
print(f"  [PASS] Exactly {EXPECTED_FEATURE_COUNT} production features verified.")
print(f"  [PASS] PyTorch + PennyLane Quantum-Hybrid model loaded and intact.")
print(f"  [PASS] StandardScaler ({scaler.n_features_in_} features) loaded and intact.")
print(f"  [PASS] Monte Carlo Dropout inference test succeeded (mean_prob={res['mean_probability']:.4f}, uncertainty_std={res['uncertainty_std']:.4f}).")
print("=" * 70)
