"""
Runner script for Step 97B: Compute Global Explainability on Held-Out Test Set (N=144)
=======================================================================================
Reads the curated held-out test set (N=144), runs Tree SHAP explainability
using the frozen XGBoost model, and generates:
  - backend/models/swarsanket_shap_feature_importance.json
  - backend/models/swarsanket_shap_test_summary.json
  - backend/models/swarsanket_shap_summary.png
  - backend/models/swarsanket_shap_importance_bar.png

Constraints:
  - ZERO retraining or tuning.
  - Exactly preserves the 20-feature contract.
"""

import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Ensure backend directory is in python path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import model_loader
import explainability

TEST_DATA_PATH = Path(r"C:\Users\dedip\Downloads\sih curation\swarsanket_curated_test.csv")
MODELS_DIR = BACKEND_DIR / "models"


def run_analysis():
    print("=" * 70)
    print("SWARSANKET STEP 97B — FROZEN XGBOOST MODEL EXPLAINABILITY")
    print("=" * 70)
    print(f"Loading test set from: {TEST_DATA_PATH}")

    if not TEST_DATA_PATH.exists():
        raise FileNotFoundError(f"Test dataset not found at {TEST_DATA_PATH}")

    df_test = pd.read_csv(TEST_DATA_PATH)
    print(f"Test dataset loaded: {df_test.shape[0]} rows, {df_test.shape[1]} columns.")

    features = model_loader.production_features
    X_test = df_test[features]
    y_test = df_test["ad"] if "ad" in df_test.columns else None

    print(f"Running Tree SHAP explainability across {len(X_test)} samples...")
    summary = explainability.compute_global_explainability(
        X=X_test,
        y=y_test,
        output_dir=MODELS_DIR,
        dataset_name="Held-Out Test Set (N=144)",
    )

    print("\n" + "=" * 70)
    print("GLOBAL FEATURE IMPORTANCE — TOP 10 FEATURES (by mean |SHAP|)")
    print("=" * 70)
    header = f"{'Rank':<5} | {'Feature Name':<35} | {'Mean |SHAP|':<12} | {'Mean SHAP':<12}"
    print(header)
    print("-" * len(header))

    for item in summary["top_10_features"]:
        print(
            f"{item['rank']:<5} | {item['feature']:<35} | {item['mean_abs_shap']:<12.6f} | {item['mean_shap']:<12.6f}"
        )

    print("-" * len(header))
    print(f"Base Value (Expected log-odds): {summary['base_value']:.6f}")
    print(f"SHAP Version: {summary['shap_version']}")
    print(f"Model Architecture: {summary['model_architecture']}")
    print("\nArtifacts created:")
    print(f"  - {MODELS_DIR / 'swarsanket_shap_feature_importance.json'}")
    print(f"  - {MODELS_DIR / 'swarsanket_shap_test_summary.json'}")
    if "summary_plot_path" in summary:
        print(f"  - {summary['summary_plot_path']}")
    if "bar_plot_path" in summary:
        print(f"  - {summary['bar_plot_path']}")

    print("\nScientific Framing Note:")
    print(f"  \"{summary['disclaimer']}\"")
    print("=" * 70)


if __name__ == "__main__":
    run_analysis()
