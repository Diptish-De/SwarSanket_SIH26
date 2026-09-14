"""
Hybrid quantum-classical vs purely classical baselines
======================================================
The SIH problem statement asks for this three times: in the Description, in
Objective 3 ("Improve detection accuracy, sensitivity, and specificity compared
with classical machine learning baselines") and in Objective 6 ("Benchmark the
hybrid approach against classical models in terms of accuracy, computational
efficiency, and generalization performance"). This script is that benchmark.

It also fixes a defect in how the released model was evaluated.

THE SPLIT DEFECT
----------------
`final.ipynb` concatenates all six source CSVs and then carves a fresh random
80/20 split:

    all_dfs = [df.copy() for _, df in sorted(datasets.items())]
    full_data = pd.concat(all_dfs, axis=0, ignore_index=True)
    train_data, test_data = train_test_split(...)

The six files are three Chinese ASR engines (iFlytek/Xunfei, Tencent, AliYun)
transcribing the same recordings, so every recording appears three times. A
random split over rows puts one engine's transcript of a recording in training
and another engine's transcript of that same recording in test. The model is
then scored partly on people it has already seen.

The `id` column does not protect against this: it runs 1..108 in the train files
and 1..48 in the test files, and rows sharing an id across those two roles have
different age and sex. It is a per-file row index, not a subject identifier.
Rows sharing an id *within* a role agree on age, sex and label across all three
engines, which is what identifies one physical recording.

    recording key = file role + id      ->  108 + 48 = 156 recordings
    156 recordings x 3 engines          ->  468 rows

So this script evaluates under two protocols and reports both:

    random_row  reproduces the notebook's split, leak included
    grouped     splits on the recording key, so a recording's three
                transcripts never straddle the split

Reporting both is deliberate. The difference between them *is* the finding.

WHAT IS COMPARED
----------------
Every arm sees the identical split, the identical 22 selected features and the
identical preprocessing. The quantum arm imports its architecture from
model_loader, so it cannot drift from the model actually shipped, and trains
with the hyperparameters recovered from the notebook.

Usage:
    python backend/benchmark_baselines.py                    # everything
    python backend/benchmark_baselines.py --seeds 3          # fewer repeats
    python backend/benchmark_baselines.py --no-quantum       # classical only
    python backend/benchmark_baselines.py --data-dir <path>
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys
import time
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

BACKEND_DIR = Path(__file__).resolve().parent
REPO_DIR = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sklearn.ensemble import RandomForestClassifier  # noqa: E402
from sklearn.impute import SimpleImputer  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    matthews_corrcoef,
    roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit, train_test_split  # noqa: E402
from sklearn.pipeline import make_pipeline  # noqa: E402
from sklearn.preprocessing import RobustScaler  # noqa: E402
from sklearn.svm import SVC  # noqa: E402

# Recovered from final.ipynb so the quantum arm trains the way the released
# model did. Early stopping was explicitly disabled there.
EPOCHS = 120
BATCH_SIZE = 16
LEARNING_RATE = 0.01
WEIGHT_DECAY = 1e-4
ETA_MIN = 1e-4

TARGET = "ad"

# Where the six CSVs may live. The notebook searched /kaggle/input and ./data.
SEARCH_DIRS = [
    REPO_DIR / "SwarSanket(Kaggle)" / "rad csv",
    REPO_DIR / "data",
    BACKEND_DIR / "data",
    Path("/kaggle/input"),
]


# ── data ────────────────────────────────────────────────────────────────────


def find_data_dir(explicit: Optional[str]) -> Path:
    if explicit:
        p = Path(explicit)
        if not p.exists():
            raise SystemExit(f"--data-dir does not exist: {p}")
        return p
    for d in SEARCH_DIRS:
        if d.exists() and glob.glob(str(d / "**" / "*asr*.csv"), recursive=True):
            return d
    raise SystemExit(
        "Could not find the corpus. Looked in:\n  "
        + "\n  ".join(str(d) for d in SEARCH_DIRS)
        + "\nPass --data-dir <path> to the folder holding the six *_asr.csv files."
    )


def load_corpus(data_dir: Path) -> pd.DataFrame:
    """
    Loads the six CSVs and attaches the recording key.

    `role` is train or test according to which upstream file a row came from.
    `engine` is which ASR system produced the transcript. Together with `id`,
    role identifies one physical recording; engine identifies one transcript
    of it.
    """
    paths = sorted(glob.glob(str(data_dir / "**" / "*asr*.csv"), recursive=True))
    if not paths:
        raise SystemExit(f"No *asr*.csv files under {data_dir}")

    frames = []
    for path in paths:
        name = os.path.basename(path)
        df = pd.read_csv(path)
        df["role"] = "train" if "train" in name.lower() else "test"
        df["engine"] = name.split("_")[0].lower()
        df["recording"] = df["role"] + "_" + df["id"].astype(str)
        frames.append(df)

    full = pd.concat(frames, ignore_index=True)
    return full


def load_features() -> List[str]:
    cfg = json.loads(
        (BACKEND_DIR / "models" / "swarsanket_qh_selected_features.json").read_text()
    )
    return cfg if isinstance(cfg, list) else cfg["selected_features"]


# ── metrics ─────────────────────────────────────────────────────────────────


def score(y_true: np.ndarray, proba: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
    """The metrics the problem statement names, plus the ones already published."""
    pred = (proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    return {
        "roc_auc": float(roc_auc_score(y_true, proba)),
        "pr_auc": float(average_precision_score(y_true, proba)),
        "accuracy": float(accuracy_score(y_true, pred)),
        # Sensitivity and specificity are named explicitly in Objective 3.
        "sensitivity": float(tp / (tp + fn)) if (tp + fn) else float("nan"),
        "specificity": float(tn / (tn + fp)) if (tn + fp) else float("nan"),
        "f1": float(f1_score(y_true, pred, zero_division=0)),
        "mcc": float(matthews_corrcoef(y_true, pred)),
    }


# ── models ──────────────────────────────────────────────────────────────────


def classical_models() -> Dict[str, Any]:
    """Purely classical baselines. Same preprocessing as the quantum arm."""

    def pipe(estimator):
        return make_pipeline(
            SimpleImputer(strategy="median"), RobustScaler(), estimator
        )

    models: Dict[str, Any] = {
        "Logistic Regression": lambda seed: pipe(
            LogisticRegression(max_iter=5000, random_state=seed)
        ),
        "SVM (RBF)": lambda seed: pipe(
            SVC(probability=True, random_state=seed)
        ),
        "Random Forest": lambda seed: pipe(
            RandomForestClassifier(n_estimators=400, random_state=seed, n_jobs=-1)
        ),
    }

    try:
        from xgboost import XGBClassifier

        models["XGBoost"] = lambda seed: pipe(
            XGBClassifier(
                n_estimators=400,
                max_depth=4,
                learning_rate=0.05,
                subsample=0.9,
                colsample_bytree=0.9,
                eval_metric="logloss",
                random_state=seed,
                n_jobs=-1,
            )
        )
    except ImportError:
        print("  note: xgboost not installed, that arm is skipped")

    return models


def train_quantum(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    seed: int,
) -> tuple:
    """
    Trains the shipped hybrid architecture on this split.

    The class is imported from model_loader rather than redefined, so this can
    never silently diverge from the model the product actually runs.
    """
    import torch
    from torch.utils.data import DataLoader, TensorDataset

    from model_loader import QuantumClassicalModel

    torch.manual_seed(seed)
    np.random.seed(seed)

    model = QuantumClassicalModel(n_features=X_train.shape[1]).double()
    optimizer = torch.optim.Adam(
        model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=EPOCHS, eta_min=ETA_MIN
    )
    loss_fn = torch.nn.BCELoss()

    xb = torch.tensor(X_train, dtype=torch.float64)
    yb = torch.tensor(y_train, dtype=torch.float64).reshape(-1, 1)
    # drop_last keeps BatchNorm1d from seeing a single-row final batch.
    loader = DataLoader(
        TensorDataset(xb, yb), batch_size=BATCH_SIZE, shuffle=True, drop_last=True
    )

    t0 = time.perf_counter()
    model.train()
    for _ in range(EPOCHS):
        for bx, by in loader:
            optimizer.zero_grad()
            loss = loss_fn(model(bx), by)
            loss.backward()
            optimizer.step()
        scheduler.step()
    fit_seconds = time.perf_counter() - t0

    model.eval()
    xt = torch.tensor(X_test, dtype=torch.float64)
    t1 = time.perf_counter()
    with torch.no_grad():
        proba = model(xt).numpy().ravel()
    infer_ms = (time.perf_counter() - t1) * 1000.0 / max(1, len(X_test))

    return proba, fit_seconds, infer_ms


# ── splits ──────────────────────────────────────────────────────────────────


def make_split(protocol: str, y: np.ndarray, groups: np.ndarray, seed: int):
    n = len(y)
    if protocol == "random_row":
        # Exactly what the notebook does: random over rows, leak included.
        return train_test_split(
            np.arange(n), test_size=0.2, stratify=y, random_state=seed
        )
    if protocol == "grouped":
        # A recording's three transcripts stay on the same side.
        splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=seed)
        return next(splitter.split(np.arange(n), y, groups))
    raise ValueError(protocol)


# ── run ─────────────────────────────────────────────────────────────────────


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--data-dir", default=None)
    ap.add_argument("--seeds", type=int, default=5)
    ap.add_argument("--no-quantum", action="store_true")
    ap.add_argument(
        "--out",
        default=str(REPO_DIR / "docs" / "benchmark_results.json"),
    )
    args = ap.parse_args()

    data_dir = find_data_dir(args.data_dir)
    full = load_corpus(data_dir)
    feats = load_features()

    missing = [f for f in feats if f not in full.columns]
    if missing:
        raise SystemExit(f"Features missing from the corpus: {missing}")

    X = full[feats].to_numpy(dtype=float)
    y = full[TARGET].to_numpy(dtype=int)
    groups = full["recording"].to_numpy()

    print("=" * 78)
    print("Hybrid quantum-classical vs classical baselines")
    print("=" * 78)
    print(f"corpus            {data_dir}")
    print(f"rows              {len(full)}")
    print(f"recordings        {full['recording'].nunique()}   (rows / 3 engines)")
    print(f"engines           {sorted(full['engine'].unique())}")
    print(f"features          {len(feats)}")
    print(f"class balance     {dict(pd.Series(y).value_counts().sort_index())}")
    print(f"seeds             {args.seeds}")

    models = classical_models()
    protocols = ["random_row", "grouped"]
    results: Dict[str, Dict[str, Any]] = {}

    for protocol in protocols:
        print(f"\n--- split protocol: {protocol} ---")
        results[protocol] = {}

        arms = list(models.items())
        if not args.no_quantum:
            arms.append(("Quantum Hybrid (8-qubit VQC)", None))

        for name, factory in arms:
            runs: List[Dict[str, float]] = []
            fits: List[float] = []
            infers: List[float] = []

            for seed in range(args.seeds):
                itr, ite = make_split(protocol, y, groups, seed)

                if factory is None:
                    # The quantum arm needs the same preprocessing applied
                    # outside the model, since it is not an sklearn pipeline.
                    imp = SimpleImputer(strategy="median").fit(X[itr])
                    sc = RobustScaler().fit(imp.transform(X[itr]))
                    xtr = sc.transform(imp.transform(X[itr]))
                    xte = sc.transform(imp.transform(X[ite]))
                    proba, fit_s, inf_ms = train_quantum(xtr, y[itr], xte, seed)
                else:
                    model = factory(seed)
                    t0 = time.perf_counter()
                    model.fit(X[itr], y[itr])
                    fit_s = time.perf_counter() - t0
                    t1 = time.perf_counter()
                    proba = model.predict_proba(X[ite])[:, 1]
                    inf_ms = (time.perf_counter() - t1) * 1000.0 / max(1, len(ite))

                runs.append(score(y[ite], proba))
                fits.append(fit_s)
                infers.append(inf_ms)

            agg = {
                k: {
                    "mean": float(np.mean([r[k] for r in runs])),
                    "sd": float(np.std([r[k] for r in runs])),
                }
                for k in runs[0]
            }
            agg["fit_seconds"] = {"mean": float(np.mean(fits)), "sd": float(np.std(fits))}
            agg["inference_ms_per_sample"] = {
                "mean": float(np.mean(infers)),
                "sd": float(np.std(infers)),
            }
            results[protocol][name] = agg

            print(
                f"  {name:30s} AUC {agg['roc_auc']['mean']:.3f}"
                f" +/- {agg['roc_auc']['sd']:.3f}"
                f"   sens {agg['sensitivity']['mean']:.3f}"
                f"   spec {agg['specificity']['mean']:.3f}"
                f"   fit {agg['fit_seconds']['mean']:7.2f}s"
            )

    # ── severity: does it work on the mild cases, which is the whole point ──
    severity = severity_breakdown(full, feats, y, groups, args.seeds)

    payload = {
        "corpus": {
            "path": str(data_dir),
            "rows": int(len(full)),
            "recordings": int(full["recording"].nunique()),
            "engines": sorted(full["engine"].unique().tolist()),
            "features": feats,
            "class_balance": {str(k): int(v) for k, v in pd.Series(y).value_counts().items()},
        },
        "protocol_note": (
            "random_row reproduces final.ipynb and leaks: the three ASR "
            "transcripts of one recording can straddle the split. grouped "
            "splits on role+id so they cannot. Compare like with like."
        ),
        "hyperparameters": {
            "epochs": EPOCHS,
            "batch_size": BATCH_SIZE,
            "learning_rate": LEARNING_RATE,
            "weight_decay": WEIGHT_DECAY,
            "seeds": args.seeds,
        },
        "results": results,
        "severity": severity,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2))
    print(f"\nwrote {out}")

    print_markdown(results, severity)
    return 0


def severity_breakdown(
    full: pd.DataFrame,
    feats: List[str],
    y: np.ndarray,
    groups: np.ndarray,
    seeds: int,
) -> Dict[str, Any]:
    """
    Discrimination against the mild cases only, on the honest split.

    Early detection is the claim; separating advanced disease from healthy is
    not evidence for it. MMSE is the severity anchor the corpus already carries,
    so a positive case with a high MMSE is the closest thing available to the
    early case the product claims to catch. Controls are kept intact and only
    the positive group is restricted, so this measures whether the signal
    survives when the disease is mild.
    """
    if "mmse" not in full.columns:
        return {"available": False, "reason": "no mmse column"}

    X = full[feats].to_numpy(dtype=float)
    mmse = full["mmse"].to_numpy(dtype=float)

    bands = {"mild (MMSE >= 21)": 21.0, "moderate or worse (MMSE < 21)": None}
    out: Dict[str, Any] = {"available": True, "model": "Logistic Regression", "bands": {}}

    print("\n--- discrimination by severity, grouped split, logistic regression ---")
    for label, floor in bands.items():
        aucs = []
        sizes = []
        for seed in range(seeds):
            itr, ite = make_split("grouped", y, groups, seed)
            keep = []
            for i in ite:
                if np.isnan(mmse[i]):
                    continue
                if y[i] == 0:
                    keep.append(i)  # controls always kept
                elif floor is None and mmse[i] < 21.0:
                    keep.append(i)
                elif floor is not None and mmse[i] >= floor:
                    keep.append(i)
            keep = np.array(keep, dtype=int)
            if len(keep) < 10 or len(np.unique(y[keep])) < 2:
                continue
            model = make_pipeline(
                SimpleImputer(strategy="median"),
                RobustScaler(),
                LogisticRegression(max_iter=5000, random_state=seed),
            ).fit(X[itr], y[itr])
            aucs.append(roc_auc_score(y[keep], model.predict_proba(X[keep])[:, 1]))
            sizes.append(int(len(keep)))
        if aucs:
            out["bands"][label] = {
                "roc_auc_mean": float(np.mean(aucs)),
                "roc_auc_sd": float(np.std(aucs)),
                "test_rows_mean": float(np.mean(sizes)),
            }
            print(
                f"  {label:32s} AUC {np.mean(aucs):.3f} +/- {np.std(aucs):.3f}"
                f"   (n~{np.mean(sizes):.0f} rows)"
            )
        else:
            out["bands"][label] = {"roc_auc_mean": None, "reason": "too few rows"}
            print(f"  {label:32s} too few rows to score")
    return out


def print_markdown(results: Dict[str, Any], severity: Dict[str, Any]) -> None:
    print("\n" + "=" * 78)
    print("Markdown, paste straight into the report")
    print("=" * 78 + "\n")
    names = list(results["grouped"].keys())
    print("| Model | AUC (leaky split) | AUC (grouped split) | Sensitivity | Specificity | Fit time |")
    print("|---|---|---|---|---|---|")
    for n in names:
        g = results["grouped"][n]
        r = results["random_row"][n]
        print(
            f"| {n} | {r['roc_auc']['mean']:.3f} | {g['roc_auc']['mean']:.3f} "
            f"| {g['sensitivity']['mean']:.3f} | {g['specificity']['mean']:.3f} "
            f"| {g['fit_seconds']['mean']:.2f} s |"
        )
    if severity.get("available") and severity.get("bands"):
        print("\n| Severity of the positive cases | AUC, grouped split |")
        print("|---|---|")
        for label, v in severity["bands"].items():
            val = v.get("roc_auc_mean")
            print(f"| {label} | {val:.3f} |" if val is not None else f"| {label} | not enough rows |")


if __name__ == "__main__":
    raise SystemExit(main())
