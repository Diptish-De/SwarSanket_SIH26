"""
SwarSanket Quantum-Classical Hybrid Explainability Module
=========================================================
Implements feature attribution and explainability for the 22-feature
Quantum-Classical Hybrid model (PyTorch + PennyLane).

Methodology:
  - Differentiable input sensitivity (Gradient * Input attribution):
      Attribution_i = E_dropout[(dP / dx_i)] * x_norm_i
  - Gradients are averaged over the same Monte Carlo Dropout passes used for
    inference, so the attribution describes the reported predictive mean rather
    than a separate deterministic forward pass.
  - Attributions are L1-normalised to relative shares of the total sensitivity.
    They rank and proportion the biomarkers driving the score; they are a
    sensitivity decomposition, not an additive reconstruction of the probability,
    and no margin-reconstruction claim is made.
  - Generates patient-safe, non-causal explanations.
"""

import sys
import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

from model_loader import (
    model,
    scaler,
    production_features,
    medians_dict,
    evaluation_metrics,
)

logger = logging.getLogger("swarsanket.explainability")

SCIENTIFIC_FRAMING_DISCLAIMER = (
    "Biomarker attributions explain the mathematical behavior of the trained "
    "quantum-hybrid machine-learning model. They do not establish clinical causality, "
    "diagnosis, or medical significance."
)

# Plain English descriptions for the 22 production features
FEATURE_DESCRIPTIONS = {
    "CTP_F0 SD(st)": "Pitch variability / fundamental frequency standard deviation in semitones",
    "CTP_DPI(ms)": "Mean duration of acoustic pause intervals in milliseconds",
    "CTP_RST(-/s)": "Phonation rate: syllables produced per second of active speech",
    "CTP_EST": "Estimated speech timing and acoustic pacing marker",
    "CTP_Voiced Rate(1/s)": "Words produced per second of active speech time, excluding pauses",
    "CTP_Hesitation Ratio": "Proportion of recording duration occupied by acoustic hesitation and pauses",
    "CTP_Energy Mean(Pa^2·s)": "Acoustic signal energy and voice loudness distribution",
    "CTP_verb_num": "Total count of lexical and auxiliary action verbs spoken",
    "CTP_noun_ratio": "Proportion of spoken words classified as nouns and entities",
    "CTP_Pronouns_ratio": "Proportion of spoken words classified as pronouns",
    "CTP_noun to verb": "Ratio of noun entities to action verbs in spoken sentences",
    "CTP_Word Rate(-/s)": "Words spoken per second across the whole recording, pauses included",
    "CTP_Noun No Phrase Rate": "Syntactic noun phrase pacing rate without modifier expansion",
    "CTP_Verb phrase type proportion": "Syntactic complexity proportion of verb-headed phrases",
    "CTP_Prep phrase type proportion": "Prepositional phrase syntactic density",
    "CTP_Prep average phrase type length 1": "Average length and depth of prepositional clauses",
    "CTP_num_unique_IU": "Distinct task-relevant semantic Information Units communicated",
    "CTP_num_unique_keywords": "Count of unique core vocabulary content keywords",
    "CTP_unique_IU_densitys": "Distinct Information Units per word of a standard-length description",
    "CTP_total_IU_density": "Total Information Unit mentions per word of a standard-length description",
    "CTP_keyword_to_non_keyword_ratio": "Ratio of informative content keywords to function filler words",
    "CTP_unique_IU_efficiency": "Unique content vocabulary per word of a standard-length description",
}


def explain_single_prediction(
    input_df: pd.DataFrame,
    top_k: int = 5,
    n_passes: int = 30,
    reference_probability: Optional[float] = None,
    measured_features: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Computes biomarker feature attributions for a single sample using
    Gradient * Normalized Input backpropagation through the Quantum-Hybrid model.

    Args:
        input_df: single-row frame holding the 22-feature production contract.
        top_k: how many contributions to surface per direction.
        n_passes: Monte Carlo Dropout passes to average gradients over. Must match
            the inference regime for the attribution to describe the reported score.
        reference_probability: the probability actually reported to the caller. When
            given it is echoed back as the explained probability, so the explanation
            and the screening result can never describe two different numbers.
        measured_features: features actually extracted from this recording. Anything
            outside this list is a median-imputed constant - identical for every
            patient - and is excluded from the ranked contributions, because
            presenting a constant as "a biomarker influencing your result" tells the
            reader something about the model's defaults, not about themselves. Their
            attribution is still returned in shap_contributions for engineering use.
    """
    if not isinstance(input_df, pd.DataFrame):
        raise TypeError(f"Expected pandas DataFrame, got {type(input_df).__name__}")

    if len(input_df) != 1:
        raise ValueError(f"Expected single-row DataFrame, got {len(input_df)} rows")

    # Enforce exact 22-feature contract
    row_dict = {}
    for col in production_features:
        if col in input_df.columns:
            val = input_df[col].iloc[0]
            if val is None or pd.isna(val):
                row_dict[col] = medians_dict.get(col, 0.0)
            else:
                row_dict[col] = float(val)
        else:
            row_dict[col] = medians_dict.get(col, 0.0)

    # Standardize input
    features_arr = np.array([[row_dict[c] for c in production_features]], dtype=np.float64)
    feature_names = getattr(scaler, "feature_names_in_", None)
    if feature_names is not None:
        scaled_arr = scaler.transform(pd.DataFrame(features_arr, columns=feature_names))
    else:
        scaled_arr = scaler.transform(features_arr)

    # Monte Carlo Dropout gradient attribution.
    # Dropout stays stochastic while BatchNorm running statistics are frozen, exactly
    # as in run_monte_carlo_inference, so the averaged gradient is the sensitivity of
    # the Monte Carlo predictive mean rather than of a single deterministic pass.
    passes = max(1, int(n_passes))
    model.train()
    for module in model.modules():
        if isinstance(module, nn.BatchNorm1d):
            module.eval()

    # One batched forward and backward instead of `passes` sequential ones.
    #
    # Each row carries its own dropout mask and BatchNorm is frozen above, so
    # the rows are independent. Summing the outputs before backward therefore
    # leaves row i's gradient at x.grad[i] = d(p_i)/d(x_i), and averaging those
    # rows is the same average gradient the loop accumulated. Each pass costs a
    # quantum circuit evaluation, and that per-call overhead dominated: thirty
    # of them took about 6.2 s.
    x_tensor = torch.tensor(
        np.repeat(scaled_arr, passes, axis=0), dtype=torch.float64, requires_grad=True
    )
    p_batch = model(x_tensor)
    model.zero_grad(set_to_none=True)
    p_batch.sum().backward()

    if x_tensor.grad is not None:
        grad = x_tensor.grad.detach().cpu().numpy().mean(axis=0)
    else:
        grad = np.zeros(scaled_arr.shape[1], dtype=np.float64)

    mc_mean_probability = float(p_batch.detach().cpu().numpy().mean())

    model.eval()
    model.zero_grad(set_to_none=True)
    scaled_vals = scaled_arr.ravel()
    raw_attributions = grad * scaled_vals

    # L1-normalise into relative shares of total sensitivity. Raw gradients vanish when
    # the output sigmoid saturates, which would collapse every contribution to +0.000;
    # the normalised form preserves the ranking and the relative weight of each biomarker.
    abs_sum = float(np.sum(np.abs(raw_attributions)))
    if abs_sum > 1e-12:
        normalized_attributions = raw_attributions / abs_sum
    else:
        normalized_attributions = raw_attributions

    shap_contributions = {}
    for idx, col in enumerate(production_features):
        shap_contributions[col] = round(float(normalized_attributions[idx]), 4)

    # Rank top positive (pushing toward elevated risk) and negative (pushing toward low risk),
    # over measured features only.
    measured = set(measured_features) if measured_features is not None else set(production_features)
    imputed_constants = [c for c in production_features if c not in measured]

    sorted_features = sorted(
        ((col, val) for col, val in shap_contributions.items() if col in measured),
        key=lambda item: abs(item[1]),
        reverse=True,
    )

    top_pos = []
    top_neg = []
    for col, contrib in sorted_features:
        impact_pct = round(float(contrib * 100.0), 1)
        item_entry = {
            "feature": col,
            "value": round(float(row_dict[col]), 4),
            "contribution": contrib,
            "shap_value": contrib,
            "impact_percent": impact_pct,
            "formatted_impact": f"+{impact_pct:.1f}%" if contrib > 0 else f"{impact_pct:.1f}%",
            "description": FEATURE_DESCRIPTIONS.get(col, col),
        }
        if contrib > 0 and len(top_pos) < top_k:
            top_pos.append(item_entry)
        elif contrib < 0 and len(top_neg) < top_k:
            top_neg.append(item_entry)

    explained_probability = float(reference_probability) if reference_probability is not None else mc_mean_probability

    # Build patient-friendly clinical explanations
    explanation_sentences = []
    if top_pos:
        pos_names = [f"'{p['feature']}' ({p['description'].split('(')[0].strip()})" for p in top_pos[:2]]
        explanation_sentences.append(
            f"Biomarkers showing divergence toward elevated risk include {', '.join(pos_names)}."
        )
    if top_neg:
        neg_names = [f"'{n['feature']}' ({n['description'].split('(')[0].strip()})" for n in top_neg[:2]]
        explanation_sentences.append(
            f"Protective markers stabilizing the score include {', '.join(neg_names)}."
        )

    human_explanation = " ".join(explanation_sentences) if explanation_sentences else (
        "Voice biomarkers are aligned with typical control baseline distributions."
    )

    return {
        # Decision boundary of the output sigmoid, the reference the score is read against.
        "base_value": 0.5,
        "method": "PennyLane 8-Qubit Variational Quantum Circuit Gradient Sensitivity",
        "attribution_type": "mc_dropout_quantum_gradient_attribution",
        "mc_passes": passes,
        # Net signed direction of the normalised sensitivities. This is a directional
        # summary, NOT an additive decomposition of the probability margin.
        "net_attribution_direction": round(float(np.sum(normalized_attributions)), 4),
        "shap_margin_sum": round(float(np.sum(normalized_attributions)), 4),
        "explained_probability": round(explained_probability, 4),
        "reconstructed_probability": round(explained_probability, 4),
        "shap_contributions": shap_contributions,
        # Features never extracted from audio; held at their training median for every
        # patient. Excluded from the ranked contributions above.
        "imputed_constant_features": imputed_constants,
        "imputed_constant_attribution_share": round(
            float(sum(abs(shap_contributions[c]) for c in imputed_constants)), 4
        ),
        "top_positive_contributions": top_pos,
        "top_negative_contributions": top_neg,
        "human_readable_explanation": human_explanation,
        "disclaimer": SCIENTIFIC_FRAMING_DISCLAIMER,
    }
