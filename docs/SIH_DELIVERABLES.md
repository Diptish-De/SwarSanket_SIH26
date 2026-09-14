# SIH 2026 — Delivery Table

**Problem statement:** Hybrid quantum machine learning platform for early disease detection.
**Project:** SwarSanket — speech-based screening for cognitive impairment, including that caused by Alzheimer's disease.
**Last audited:** 2026-09-15

This maps every deliverable the problem statement asks for onto what exists in
this repository, with the evidence and the gap. It is written to be read by
someone who has not seen the code, including an evaluator checking claims.

---

## 1. Delivery table

| # | Required deliverable | Status | Evidence, or what is missing | Blocked on |
|---|---|---|---|---|
| 1 | Data ingestion and handling pipeline | Partial | `backend/benchmark_baselines.py` loads the corpus, builds the recording key and applies median imputation plus robust scaling. The original preprocessing still lives in `final.ipynb`. | Moving the notebook's pipeline into the platform |
| 2 | Hybrid quantum-classical model | **Done** | `backend/model_loader.py`. PyTorch encoder (22 → 16 → 8) into a PennyLane 8-qubit VQC, `AngleEmbedding` rotation Y plus `BasicEntanglerLayers`, quantum weights shaped (3, 8), classical skip path, decoder. Loads with `strict=True`, zero missing or unexpected keys. | — |
| 3 | Feature selection module | Partial | RFECV selected the 22 features; the list is frozen in `backend/models/swarsanket_qh_selected_features.json` and enforced at load. Selection itself runs only in the notebook. | Moving RFECV into the platform |
| 4 | Hybrid model training workflow | Partial | `benchmark_baselines.py` trains the shipped architecture from scratch on a chosen split, importing the class from `model_loader` so it cannot drift. It is a benchmark harness, not yet a general training command. | — |
| 5 | Prediction and inference workflow | **Done** | FastAPI with an asynchronous job pipeline (`POST /api/screenings`), Supabase Realtime progress, polling fallback, web and Android clients. See README. | — |
| 6 | Explainability module | **Done** | `backend/explainability.py`. Quantum gradient attribution averaged over the same 30 Monte Carlo dropout passes as the prediction, anchored to the reported probability. Median-imputed constants are excluded from the ranking so they cannot appear as patient-specific findings. | — |
| 7 | Performance evaluation | **Done** | `benchmark_baselines.py` reports ROC-AUC, PR-AUC, accuracy, sensitivity, specificity, F1 and MCC, under two split protocols, averaged over seeds. Results in `docs/benchmark_results.json`. | — |
| 8 | Benchmark against purely classical baselines | **Done** | Logistic regression, RBF SVM, random forest and XGBoost, on the identical split, features and preprocessing as the quantum arm. See §2. | — |
| 9 | Computational efficiency benchmark | **Done** | Fit time and inference time per sample recorded for every arm in the same run. End-to-end pipeline latency in §4. | — |
| 10 | Generalization performance | **Done** | Measured honestly for the first time by fixing the split defect in §3, and broken down by disease severity in §2.4. | — |
| 11 | Scalable, near-term hardware compatible | Partial | Eight qubits and three entangling layers run on `default.qubit` and fit the width of current NISQ devices. Never executed on physical hardware. | Optional hardware run |
| 12 | Comprehensive documentation | **Done** | This file, `README.md`, and `docs/MODEL_PROVENANCE_AUDIT.md`. | — |

---

## 2. Classical baseline comparison

Run it yourself:

```bash
python backend/benchmark_baselines.py --seeds 5
```

Every arm sees the identical split, the identical 22 features and the identical
preprocessing. The quantum arm imports its architecture from `model_loader`, so
the thing being benchmarked is the thing that ships.

### 2.1 Result

Five seeds, mean ROC-AUC. Full output in `docs/benchmark_results.json`.

| Model | AUC, leaky split | AUC, grouped split | Sensitivity | Specificity | Fit time |
|---|---|---|---|---|---|
| Logistic Regression | 0.880 | 0.871 | 0.806 | 0.801 | 0.01 s |
| SVM (RBF) | 0.929 | 0.880 | 0.815 | 0.780 | 0.02 s |
| Random Forest | 0.979 | 0.887 | 0.786 | 0.810 | 0.42 s |
| XGBoost | 0.987 | 0.873 | 0.766 | 0.829 | 0.16 s |
| **Quantum Hybrid (8-qubit VQC)** | **0.967** | **0.876** | **0.807** | **0.787** | **76.29 s** |

Two things follow, and both are reported rather than worked around.

**The leak was worth roughly a tenth of an AUC point.** Every arm fell when the
recording key was respected. The tree models fell furthest, which is what one
would expect from models able to memorise near-duplicate rows. The previously
published figure of 0.943 was measured under the leaky protocol and belongs in
the left-hand column, not the right.

**On a clean split no model is meaningfully ahead.** The five arms land between
0.871 and 0.887, inside one standard deviation of each other (0.027 to 0.064
across seeds). The hybrid sits mid-pack at 0.876. At 22 tabular features this is
the expected outcome: there is no high-dimensional structure here for a quantum
kernel to exploit, and the classical baselines are strong.

**The hybrid costs about 200 times more to train** than random forest and roughly
7,000 times more than logistic regression, for equal accuracy. Inference stays
sub-second, so the cost falls on training rather than on the user.

### 2.2 What the comparison is for

Objective 3 of the problem statement asks whether the hybrid model improves on
classical baselines. That question only has a meaningful answer on a split that
does not leak, which is why §3 exists. Quoting a hybrid score measured on the
leaking split against classical scores measured on a clean one would not be a
comparison.

### 2.3 Reporting rule adopted

If the classical baselines match or beat the hybrid at 22 tabular features, that
is reported as the result. The problem statement asks for a benchmark, not for a
particular outcome, and 22 features is a scale at which a quantum advantage is
not expected on theoretical grounds.

### 2.4 Severity breakdown

Separating advanced disease from healthy controls is not evidence of *early*
detection. The corpus carries an `mmse` column, so discrimination is reported
separately for positive cases with MMSE at or above 21, which is the closest
available proxy for the early case this product claims to catch. Controls are
kept intact; only the positive group is restricted.

| Severity of the positive cases | AUC, grouped split |
|---|---|
| Mild, MMSE 21 or above | 0.810 |
| Moderate or worse, MMSE below 21 | 0.866 |

The signal survives on the mild cases, weaker but present. That is the first
evidence in this project that speaks to *early* detection rather than to
separating advanced disease from health. It rests on about 41 test rows, so the
interval around it is wide.

---

## 3. The split defect, and the fix

`final.ipynb` concatenates all six source CSVs and then carves a fresh random
80/20 split:

```python
all_dfs = [df.copy() for _, df in sorted(datasets.items())]
full_data = pd.concat(all_dfs, axis=0, ignore_index=True)
train_data, test_data = train_test_split(...)
```

The six files are three Chinese ASR engines transcribing the same recordings.
Every recording therefore appears three times, and a random split over rows puts
one engine's transcript of a recording into training while another engine's
transcript of that same recording goes into test.

The `id` column does not protect against this. It runs 1 to 108 in the train
files and 1 to 48 in the test files, and rows sharing an `id` across those two
roles disagree on age and sex. It is a per-file row index, not a subject
identifier. Rows sharing an `id` *within* a role agree on age, sex and label
across all three engines, which is what identifies one physical recording.

| | |
|---|---|
| Rows in the concatenated pool | 468 |
| Distinct recordings behind them | 156 |
| Upstream train recordings | 108 |
| Upstream test recordings | 48 |
| Transcripts per recording | 3 |

The correct grouping key is therefore **file role plus id**, and
`benchmark_baselines.py` reports both protocols side by side:

- `random_row` reproduces the notebook exactly, leak included.
- `grouped` keeps a recording's three transcripts on the same side of the split.

The published figure of ROC-AUC 0.943 was measured under `random_row`. It is an
upper bound, not a generalization estimate, and it should not be quoted as
screening performance.

---

## 4. Computational efficiency

Measured on the deployment target, a single container with one vCPU share.

| Stage | Time |
|---|---|
| Imports: torch, PennyLane, spaCy, faster-whisper | 12.9 s |
| Whisper `tiny` model load, once per process | 24.0 s |
| Whisper transcription, 34.7 s clip, 110 words | 10.8 s |
| Full screening pipeline, warm | 8.3 s |
| VQC Monte Carlo inference, 30 passes | 0.55 s |
| VQC Monte Carlo inference, 10 passes | 0.18 s |
| Quantum gradient attribution, 30 passes | 0.55 s |
| Quantum gradient attribution, 10 passes | 0.14 s |

Per-arm training and inference times are recorded alongside accuracy in
`docs/benchmark_results.json`, so the accuracy and efficiency comparisons come
from the same run rather than from separate measurements.

The quantum arm dominates training cost: simulating an 8-qubit circuit with
backpropagation for every sample in every epoch is orders of magnitude slower to
fit than any of the classical baselines, while inference remains sub-second.
That asymmetry is the practical trade-off this architecture makes, and it is
reported rather than hidden.

---

## 5. Known limitations

Stated here so an evaluator does not have to find them.

| Limitation | Consequence |
|---|---|
| Corpus is Chinese ASR output; the product runs on English and Indic speech | Cross-lingual calibration is applied, but the English reference profile is provisional |
| The 22 `CTP_*` features arrive pre-computed in the CSVs; the upstream extraction code is not in this repository | The English extraction layer is a re-implementation that cannot be validated against the training semantics. See `docs/MODEL_PROVENANCE_AUDIT.md` §2 |
| Roughly six of 22 features clamp at the training distribution boundary on fluent English input | Reduces discrimination on exactly the population the product serves |
| Five features are median-imputed constants, identical for every patient | They carry no patient-specific information and are excluded from explanations |
| 156 recordings is a small corpus | Confidence intervals are wide; seeds are averaged and standard deviations reported |
| Simulator only | No physical quantum hardware run |

---

## 6. What this system does not claim

It screens; it does not diagnose. A speech test cannot identify Alzheimer's
disease specifically, because cognitive impairment also follows from vascular
disease, depression, thyroid disorder, B12 deficiency and medication effects.
Diagnosis requires clinical assessment and biomarkers. Every screening output in
the product is labelled a screening signal, carries its uncertainty, and is
withheld entirely when the recording or the language cannot support one.
