"""
SwarSanket Frozen XGBoost Model Explainability Module (Step 97B)
================================================================
Implements Tree SHAP explainability for the frozen production XGBoost model
without modifying the model, imputer, or 20-feature contract.

Guarantees & Constraints:
  1. Uses Tree SHAP (Lundberg et al.) to compute exact feature attributions.
  2. Preserves exact 20-feature contract and feature ordering.
  3. Reconstructs probability from logit-margin additivity:
     margin = base_value + sum(shap_values)
     reconstructed_probability = 1 / (1 + exp(-margin))
  4. Formats human-readable explanations using neutral, non-causal language.
  5. Strictly avoids diagnostic or causal clinical assertions.
  6. Includes mandatory scientific framing disclaimer:
     "SHAP values explain the behavior of the trained machine-learning model.
      They do not establish clinical causality, diagnosis, or medical significance."
"""

import sys
import os
import types
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Tuple
import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# AppLocker / WDAC Safe Environment Shim for SHAP
# On Windows environments where numba._dynfunc.pyd is blocked by security
# policies, provide the lightweight stub for numba so shap can load its
# pure-python TreeExplainer and summary plotting without failure.
# ---------------------------------------------------------------------------
try:
    import shap
except ImportError as e:
    if "numba" in str(e) or "Application Control" in str(e):
        numba_stub = types.ModuleType("numba")
        numba_stub.njit = lambda *args, **kwargs: (lambda f: f) if args and callable(args[0]) else (lambda f: f)
        numba_stub.jit = numba_stub.njit
        numba_typed_stub = types.ModuleType("numba.typed")
        numba_typed_stub.List = list
        numba_typed_stub.Dict = dict
        sys.modules["numba"] = numba_stub
        sys.modules["numba.typed"] = numba_typed_stub
        import shap
    else:
        raise

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt

# Import frozen production artifacts
from model_loader import model, imputer, production_features, MODELS_DIR

logger = logging.getLogger("swarsanket.explainability")

SCIENTIFIC_FRAMING_DISCLAIMER = (
    "SHAP values explain the behavior of the trained machine-learning model. "
    "They do not establish clinical causality, diagnosis, or medical significance."
)

# Global cached TreeExplainer instance
_cached_explainer: Optional[shap.TreeExplainer] = None


def get_explainer() -> shap.TreeExplainer:
    """Returns the cached TreeExplainer for the frozen production XGBoost model."""
    global _cached_explainer
    if _cached_explainer is None:
        _cached_explainer = shap.TreeExplainer(model)
    return _cached_explainer


def _sigmoid(x: Union[float, np.ndarray]) -> Union[float, np.ndarray]:
    """Applies the standard logistic sigmoid function."""
    return 1.0 / (1.0 + np.exp(-np.clip(x, -50.0, 50.0)))


def _ensure_dataframe(
    features_input: Union[Dict[str, Any], pd.DataFrame, pd.Series, np.ndarray, List[float]],
    apply_imputation: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Validates and standardizes input features into a 20-feature production DataFrame.
    
    Returns:
        (df_raw, df_imputed):
          df_raw: exact 20 features in contract order (may contain NaN)
          df_imputed: fully imputed 20 features ready for model/SHAP inference
    """
    if isinstance(features_input, dict):
        # Dict of feature_name -> value
        ordered_data = {feat: features_input.get(feat, np.nan) for feat in production_features}
        df_raw = pd.DataFrame([ordered_data], columns=production_features)
    elif isinstance(features_input, pd.Series):
        ordered_data = {feat: features_input.get(feat, np.nan) for feat in production_features}
        df_raw = pd.DataFrame([ordered_data], columns=production_features)
    elif isinstance(features_input, pd.DataFrame):
        if set(production_features).issubset(set(features_input.columns)):
            df_raw = features_input[production_features].copy()
        elif features_input.shape[1] == len(production_features):
            df_raw = features_input.copy()
            df_raw.columns = production_features
        else:
            raise ValueError(
                f"DataFrame input must have exactly {len(production_features)} columns matching "
                f"production features contract. Got {features_input.shape[1]} columns."
            )
    elif isinstance(features_input, (np.ndarray, list)):
        arr = np.asarray(features_input, dtype=np.float64)
        if arr.ndim == 1:
            if len(arr) != len(production_features):
                raise ValueError(
                    f"Array length mismatch: expected {len(production_features)} features, got {len(arr)}."
                )
            df_raw = pd.DataFrame(arr.reshape(1, -1), columns=production_features)
        elif arr.ndim == 2:
            if arr.shape[1] != len(production_features):
                raise ValueError(
                    f"Array shape mismatch: expected {len(production_features)} columns, got {arr.shape[1]}."
                )
            df_raw = pd.DataFrame(arr, columns=production_features)
        else:
            raise ValueError(f"Unsupported array dimensions: {arr.ndim}")
    else:
        raise TypeError(f"Unsupported input type for features: {type(features_input).__name__}")

    # Validate no unexpected non-numeric types
    df_raw = df_raw.astype(np.float64)

    # Impute missing values if requested
    if apply_imputation and df_raw.isna().any().any():
        imputed_vals = imputer.transform(df_raw)
        df_imputed = pd.DataFrame(imputed_vals, columns=production_features)
    else:
        df_imputed = df_raw.copy()

    return df_raw, df_imputed


def format_human_readable_explanation(
    top_positive: List[Dict[str, Any]],
    top_negative: List[Dict[str, Any]],
    predicted_class: int,
    probability: float,
) -> str:
    """
    Constructs a safe, non-causal human-readable summary of model factor contributions.

    Strict Compliance:
      - Uses non-causal language ("associated with", "contributed to the model's output").
      - No medical diagnoses or assertions of causality.
    """
    signal_type = "elevated screening signal" if predicted_class == 1 else "lower screening signal"
    lines = [
        f"Model Output Interpretation: {signal_type.upper()} (estimated model score: {probability:.1%}).",
        "",
        "Model factors contributing most to this screening signal:",
    ]

    if top_positive:
        lines.append("  Factors associated with higher screening signal:")
        for item in top_positive:
            feat = item["feature"]
            val = item["feature_value"]
            shap_val = item["shap_value"]
            lines.append(f"    - {feat} (value: {val:.4f}, contribution: +{shap_val:.4f})")

    if top_negative:
        lines.append("  Factors associated with lower screening signal:")
        for item in top_negative:
            feat = item["feature"]
            val = item["feature_value"]
            shap_val = item["shap_value"]
            lines.append(f"    - {feat} (value: {val:.4f}, contribution: {shap_val:.4f})")

    lines.append("")
    lines.append(f"Note: {SCIENTIFIC_FRAMING_DISCLAIMER}")

    return "\n".join(lines)


def explain_single_prediction(
    features_input: Union[Dict[str, Any], pd.DataFrame, pd.Series, np.ndarray, List[float]],
    top_k: int = 5,
    apply_imputation: bool = True,
) -> Dict[str, Any]:
    """
    Generates local SHAP explanation for a single production feature vector.

    Args:
        features_input: 20-feature dict, array, or DataFrame.
        top_k: Number of top positive and negative contributing features to return.
        apply_imputation: Whether to apply frozen median imputer for missing values.

    Returns:
        Structured dictionary containing:
          - predicted_class: int (0 or 1)
          - probability: float (model predicted probability)
          - base_value: float (expected value in margin space)
          - shap_margin_sum: float (base_value + sum of SHAP values)
          - reconstructed_probability: float (sigmoid of shap_margin_sum)
          - reconstruction_error: float (absolute difference)
          - top_positive_contributions: list of top features pushing toward class 1
          - top_negative_contributions: list of top features pushing toward class 0
          - shap_contributions: dict of feature -> SHAP value
          - feature_values: dict of feature -> input value
          - human_readable_explanation: safe formatted text
          - disclaimer: scientific framing disclaimer
    """
    df_raw, df_imputed = _ensure_dataframe(features_input, apply_imputation=apply_imputation)

    if len(df_imputed) != 1:
        raise ValueError(
            f"explain_single_prediction expects exactly 1 sample, received {len(df_imputed)}."
        )

    # Model inference
    pred_class = int(model.predict(df_imputed)[0])
    prob_class_1 = float(model.predict_proba(df_imputed)[0, 1])

    # Tree SHAP calculation
    explainer = get_explainer()
    shap_vals = explainer.shap_values(df_imputed)  # shape: (1, 20)
    sample_shap = shap_vals[0]
    base_value = float(explainer.expected_value)

    # Verify mathematical additivity: margin = base_value + sum(shap)
    margin_sum = float(base_value + float(np.sum(sample_shap)))
    reconstructed_prob = float(_sigmoid(margin_sum))
    reconstruction_error = float(abs(prob_class_1 - reconstructed_prob))

    # Build feature contribution mappings
    contributions = []
    shap_dict = {}
    feat_val_dict = {}

    for idx, feat_name in enumerate(production_features):
        s_val = float(sample_shap[idx])
        f_val = float(df_imputed.iloc[0, idx])
        shap_dict[feat_name] = round(s_val, 6)
        feat_val_dict[feat_name] = round(f_val, 6)
        contributions.append({
            "feature": feat_name,
            "shap_value": round(s_val, 6),
            "feature_value": round(f_val, 6),
            "abs_shap": abs(s_val),
            "direction": "positive_signal" if s_val > 0 else "negative_signal"
        })

    # Sort positive and negative contributions
    positive_contribs = sorted(
        [c for c in contributions if c["shap_value"] > 0],
        key=lambda x: x["shap_value"],
        reverse=True
    )[:top_k]

    negative_contribs = sorted(
        [c for c in contributions if c["shap_value"] < 0],
        key=lambda x: x["shap_value"]
    )[:top_k]

    # Human-readable safe explanation
    human_explanation = format_human_readable_explanation(
        top_positive=positive_contribs,
        top_negative=negative_contribs,
        predicted_class=pred_class,
        probability=prob_class_1,
    )

    return {
        "predicted_class": pred_class,
        "probability": round(prob_class_1, 6),
        "base_value": round(base_value, 6),
        "shap_margin_sum": round(margin_sum, 6),
        "reconstructed_probability": round(reconstructed_prob, 6),
        "reconstruction_error": round(reconstruction_error, 8),
        "top_positive_contributions": positive_contribs,
        "top_negative_contributions": negative_contribs,
        "shap_contributions": shap_dict,
        "feature_values": feat_val_dict,
        "human_readable_explanation": human_explanation,
        "disclaimer": SCIENTIFIC_FRAMING_DISCLAIMER,
    }


def compute_global_explainability(
    X: Union[pd.DataFrame, np.ndarray],
    y: Optional[Union[pd.Series, np.ndarray]] = None,
    output_dir: Optional[Union[str, Path]] = None,
    dataset_name: str = "Held-Out Test Set (N=144)",
) -> Dict[str, Any]:
    """
    Computes global SHAP feature importance across a dataset (e.g. held-out test set).

    Args:
        X: 20-feature dataset (DataFrame or array).
        y: Optional true ground truth labels for computing cohort-level SHAP.
        output_dir: Directory to save JSON artifacts and plot files.
        dataset_name: Name of the evaluation set.

    Returns:
        Structured global explainability summary dictionary.
    """
    df_raw, df_imputed = _ensure_dataframe(X, apply_imputation=True)
    num_samples = len(df_imputed)

    explainer = get_explainer()
    shap_matrix = explainer.shap_values(df_imputed)  # shape: (N, 20)
    base_value = float(explainer.expected_value)

    # Compute feature-level statistics
    mean_abs_shap = np.mean(np.abs(shap_matrix), axis=0)
    mean_shap = np.mean(shap_matrix, axis=0)
    std_shap = np.std(shap_matrix, axis=0)
    min_shap = np.min(shap_matrix, axis=0)
    max_shap = np.max(shap_matrix, axis=0)

    # Build ranked feature importance list
    ranked_indices = np.argsort(mean_abs_shap)[::-1]
    ranked_features = []
    for rank, idx in enumerate(ranked_indices, start=1):
        feat_name = production_features[idx]
        ranked_features.append({
            "rank": rank,
            "feature": feat_name,
            "mean_abs_shap": round(float(mean_abs_shap[idx]), 6),
            "mean_shap": round(float(mean_shap[idx]), 6),
            "std_shap": round(float(std_shap[idx]), 6),
            "min_shap": round(float(min_shap[idx]), 6),
            "max_shap": round(float(max_shap[idx]), 6),
        })

    top_10_features = ranked_features[:10]

    # Global summary dictionary
    summary_data = {
        "dataset_name": dataset_name,
        "sample_count": num_samples,
        "feature_count": len(production_features),
        "base_value": round(base_value, 6),
        "shap_version": getattr(shap, "__version__", "unknown"),
        "model_architecture": "Gradient Boosted Decision Trees (XGBClassifier)",
        "disclaimer": SCIENTIFIC_FRAMING_DISCLAIMER,
        "top_10_features": top_10_features,
        "ranked_feature_importance": ranked_features,
    }

    # If output directory specified, save artifacts
    if output_dir:
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        # 1. Save machine-readable JSON artifacts
        importance_json_path = out_path / "swarsanket_shap_feature_importance.json"
        with open(importance_json_path, "w", encoding="utf-8") as f:
            json.dump({
                "top_10_features": top_10_features,
                "all_features_ranked": ranked_features,
                "disclaimer": SCIENTIFIC_FRAMING_DISCLAIMER,
            }, f, indent=2)

        summary_json_path = out_path / "swarsanket_shap_test_summary.json"
        with open(summary_json_path, "w", encoding="utf-8") as f:
            json.dump(summary_data, f, indent=2)

        # 2. Generate SHAP Summary Plot (Beeswarm)
        try:
            plt.figure(figsize=(10, 8), dpi=200)
            shap.summary_plot(
                shap_matrix,
                df_imputed,
                feature_names=production_features,
                max_display=15,
                show=False,
            )
            plt.title(f"SwarSanket SHAP Feature Impact Distribution ({dataset_name})", fontsize=12, pad=15)
            plt.tight_layout()
            summary_plot_path = out_path / "swarsanket_shap_summary.png"
            plt.savefig(summary_plot_path, bbox_inches="tight")
            plt.close()
            summary_data["summary_plot_path"] = str(summary_plot_path)
        except Exception as e:
            logger.warning(f"Could not generate SHAP beeswarm plot: {e}")

        # 3. Generate Top 10 Feature Importance Bar Plot
        try:
            plt.figure(figsize=(9, 5), dpi=200)
            top_names = [f["feature"] for f in reversed(top_10_features)]
            top_vals = [f["mean_abs_shap"] for f in reversed(top_10_features)]
            bars = plt.barh(top_names, top_vals, color="#1e40af", edgecolor="#172554")
            plt.xlabel("Mean Absolute SHAP Value (|SHAP|)", fontsize=10)
            plt.title(f"Top 10 Features by Global SHAP Importance ({dataset_name})", fontsize=12)
            plt.grid(axis="x", linestyle="--", alpha=0.6)
            for bar in bars:
                w = bar.get_width()
                plt.text(w + 0.005, bar.get_y() + bar.get_height() / 2, f"{w:.4f}", va="center", fontsize=8)
            plt.tight_layout()
            bar_plot_path = out_path / "swarsanket_shap_importance_bar.png"
            plt.savefig(bar_plot_path, bbox_inches="tight")
            plt.close()
            summary_data["bar_plot_path"] = str(bar_plot_path)
        except Exception as e:
            logger.warning(f"Could not generate feature importance bar plot: {e}")

    return summary_data
