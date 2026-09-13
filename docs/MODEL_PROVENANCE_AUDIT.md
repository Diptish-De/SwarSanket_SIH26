# Model Provenance & Feature-Contract Audit

**System:** SwarSanket (स्वरसंकेत) — Quantum-Hybrid Acoustic Screening for Alzheimer's & MCI
**Model:** `backend/models/swarsanket_quantum_hybrid_model.pt` — PyTorch encoder → PennyLane 8-qubit VQC → decoder
**Audit date:** 2026-09-09
**Scope:** Backend inference pipeline, 22-feature production contract, explainability layer, and the live feature-extraction code that feeds them.

> **Bottom line:** the model artifact, the 22-feature contract and the quantum inference path are internally sound and verified. The **feature-extraction layer that produces those 22 values from live audio is an unvalidated approximation** of a feature set this repository never computed. Screening probabilities should not be treated as calibrated until the gap in §2 is closed.

---

## 1. Model artifact integrity — verified

| Check | Result |
|---|---|
| Feature contract length | 22, identical and same-order across `selected_features.json`, `model_config.json`, `evaluation.json` |
| Checkpoint input width | `encoder.0.weight` = `(16, 22)` |
| Quantum weights | `quantum.weights` = `(3, 8)` — confirms `BasicEntanglerLayers`, 3 layers × 8 qubits |
| Strict weight load | `load_state_dict(strict=True)` — 0 missing, 0 unexpected keys |
| Scaler alignment | `feature_names_in_` identical and same-order to the contract; no zero entries in `scale_` |
| Imputer medians | All 22 present and finite (name-mapped out of the imputer's 91 training columns) |
| MC Dropout | 30 passes genuinely stochastic (σ = 0.14 on the median vector); BatchNorm correctly frozen |
| Silent failures | None. No synthetic fallbacks, no swallowed exceptions in the quantum path |

The reported benchmark (accuracy 0.883, ROC-AUC 0.943, n = 94) belongs to this artifact and is not disputed by this audit. It describes performance **on the upstream corpus's own feature representation** — which is precisely the thing production cannot reproduce.

---

## 2. Upstream training-data provenance — the core finding

`final.ipynb` is the training notebook. Reading it establishes two facts:

**2.1 The corpus is Chinese-language ASR output.** The notebook loads six CSVs and asserts all six are present:

```
xunfei_train_asr.csv     xunfei_test_asr.csv
Tencent_train_asr.csv    Tencent_test_asr.csv
ALiYun_train_asr (1).csv ALiYun_test_asr (1).csv
```

Xunfei (iFlytek), Tencent and AliYun are Chinese commercial ASR engines. The target column is `ad`. The same recordings appear transcribed three times, once per engine.

**2.2 The notebook performs no feature extraction whatsoever.** Across all 33,815 characters of its code, these substrings occur **zero** times:

```
jieba · spacy · nltk · tokeniz · IU · keyword · cookie · transcript
```

Its pipeline is: `read_csv` → drop `{id, mmse, sex, age, ad}` and vector columns → RFECV feature selection → impute → scale → train. Every `CTP_*` column arrives **pre-computed** in the CSVs.

### Consequence

The definitions of `CTP_num_unique_IU`, `CTP_num_unique_keywords`, the three IU-density ratios and `CTP_keyword_to_non_keyword_ratio` — including how a "word" is counted for their denominators — exist in **no artifact in this repository**. `backend/screening_engine.py` re-implements them for English audio by inference from the fitted scaler's moments. That re-implementation cannot be validated against ground truth.

**An earlier draft of this work attributed the corpus to the English Pitt/Cookie Theft dataset. That attribution was wrong** and is corrected here; the provenance warning now sits at the top of `backend/screening_engine.py`.

---

## 3. The cross-linguistic tokenization discrepancy

The training moments are recoverable from `swarsanket_qh_scaler.pkl` and are mutually consistent about the denominator:

```
mean(num_unique_IU)       / mean(unique_IU_densitys)   = 4.6823 / 0.0559 = 83.7
mean(num_unique_keywords) / mean(unique_IU_efficiency) = 6.9632 / 0.0818 = 85.1
```

Two independent ratios agree on a denominator of ≈ 84 units, and the exact fractions `0.101010 = 10/99` (`total_IU_density`) and `0.112360 = 10/89` (`keyword_to_non_keyword_ratio`) corroborate a transcript basis of ~90–99 units carrying ~10 IU mentions.

The discrepancy is in the **numerators**:

| Feature | Training mean | Training +3σ | Fluent English equivalent |
|---|---|---|---|
| `CTP_num_unique_IU` | 4.68 | 13.6 | **25** (82-word scene description) |
| `CTP_num_unique_keywords` | 6.96 | 20.6 | **30** |

A transcript of ~84–99 units containing only ~5 distinct information units and ~7 distinct content words is not a plausible count for *any* natural English counting rule — ordinary English yields 25–30. The reconciliation is that the upstream units are **not English words**. Chinese ASR output is segmented very differently: a ~90-unit Chinese transcript is far shorter in propositional content than a 90-word English one, and the upstream "keyword" rule is evidently narrower than "content word".

The English extraction layer and the Chinese-derived training features are therefore **on different scales that cannot be reconciled from available artifacts**. This is the root cause of the saturation described next.

### Observed effect

| Recording | Extreme features (\|z\| > 3) | Max \|z\| | Output |
|---|---|---|---|
| 34-word English clip, **before** remediation | 6 of 22 | **+10.07** | **99.18 %** "Elevated", uncertainty 0.070 |
| Same clip, **after** remediation | 0 of 22 | +2.30 | 74.63 %, uncertainty 0.335 |
| 82-word on-protocol Cookie Theft description | 6 of 22 (IU family) | **+6.82** | held at boundary by §4.4 |

The pre-remediation 99.18 % was not a clinical signal. It was a `+10σ` extrapolation into a region where the output sigmoid saturates. Note the honest consequence of the fix: uncertainty rose from 0.070 to **0.335**. The model was never confident about this recording; it only appeared to be.

Note also that the standardized picture-description protocol **does not resolve** the scale mismatch — a thorough English description drives the IU family further out (+6.82σ), not closer in.

---

## 4. Safeguards implemented

### 4.1 Adaptive acoustic silence envelope
`analyze_silence_runs()` in `backend/audio_analyzer.py`.

Faster-Whisper word timestamps are contiguous — each word's end abuts the next word's start — so inter-word gaps collapse to ≈ 0 s and **cannot** measure hesitation. On the reference clip, summed phonation was 12.0 s of a 12.28 s timeline, producing `CTP_Hesitation Ratio = 0.000` (−4.51σ) and forcing `CTP_DPI(ms)` onto its median fallback.

Pause structure is now derived from a 20 ms RMS envelope with a threshold adaptive to the recording's own 90th-percentile speech level, so it tracks microphone gain rather than assuming a fixed amplitude. Result: 6 genuine pauses, mean 310 ms (`DPI` z = −0.68, now live rather than imputed), silence fraction 0.344 (`Hesitation Ratio` z = −2.09).

### 4.2 Canonical Cookie Theft Information Unit lexicon
`COOKIE_THEFT_IU_LEXICON` in `backend/screening_engine.py` — ~70 lemmas across subjects, places, objects and actions, matched against spaCy lemmas.

Previously **every** content word counted as an Information Unit, which is what inflated the IU family. The lexicon restricts IUs to task-relevant semantic units and cleanly separates two features that had been assigned the same value:

- `CTP_num_unique_IU` — task-relevant semantic units
- `CTP_num_unique_keywords` — all unique content words

It correctly identifies on-protocol speech (25 units matched on a full description; `canonical` mode). Its **validated** contribution is clinical reporting — surfacing *which* units the patient produced — not scale alignment, which §3 shows is not achievable.

### 4.3 Proxy fallback mode
Free-form speech matches no canonical unit by construction. Scoring it as zero IUs would encode a **task mismatch as a cognitive deficit** — low IU count is a dementia signal in this model. When no canonical unit matches, counts fall back to content words scaled by the training ratio `mean(num_unique_IU)/mean(num_unique_keywords) = 0.6725`, and the response reports `iu_scoring_mode: "proxy"` so the weaker provenance is visible to the clinician and in the UI.

### 4.4 ±3σ calibration bounding
`_calibrate_to_training_support()` clamps every feature to `[mean − 3σ, mean + 3σ]` from the fitted scaler.

Beyond that envelope the network has no training evidence; the sigmoid saturates and the output is decided by extrapolation rather than by the biomarker. Clamped values are held at the boundary and **reported** — `feature_calibration.clamped_features` carries the raw value, the bounded value and the true z-score for each. The patient UI shows "*N* of 22 biomarkers fell outside the training range". A recording outside the model's support is now visible instead of being silently converted into a confident score.

### 4.5 Explainability corrections
`backend/explainability.py`.

- Removed `reconstruction_error: 0.0`, which asserted zero reconstruction error while the attributions are L1-normalised and never reconstructed the probability margin.
- Gradients are averaged over the **same 30 MC-dropout passes** as inference (BatchNorm frozen identically), so the attribution describes the reported predictive mean rather than a separate deterministic pass. `explained_probability` now equals `screening.probability` exactly.
- `net_attribution_direction` added with accurate naming; the legacy `shap_*` keys are retained only for API compatibility. **No SHAP library is used anywhere** — `grep` for `shap.|TreeExplainer|xgboost|lightgbm|RandomForest` across `backend/*.py` returns nothing.

### 4.6 Cross-lingual calibration layer
`backend/language_calibration.py`, with profiles built by `backend/build_language_profile.py`.

Several contract features are lexical or segmentation-bound, and their population
values differ between languages for grammatical reasons rather than cognitive ones.
Measured against a 59-recording English reference:

| Feature | English mean | Training (Chinese) mean | Ratio |
|---|---|---|---|
| `CTP_Pronouns_ratio` | 0.1188 | 0.0643 | **1.85x** |
| `CTP_unique_IU_efficiency` | 0.2127 | 0.0818 | 2.60x |
| `CTP_num_unique_keywords` | 17.86 | 6.96 | 2.57x |
| `CTP_num_unique_IU` | 10.61 | 4.68 | 2.27x |
| `CTP_Word Rate(-/s)` | 2.83 | 1.33 | 2.12x |
| `CTP_verb_num` | 8.88 | 21.94 | 0.40x |

The pronoun result confirms the predicted mechanism: **Mandarin is pro-drop**,
omitting pronouns where English grammar requires them, so an English speaker reads as
pronoun-heavy - and pronoun overuse is a dementia marker in this model. The bias is
directional, pushing English input toward Elevated Risk.

The correction is mean/standard-deviation domain transfer. For a language-dependent
feature the speaker is scored as a z-score within their **own** language reference,
then mapped onto the training distribution:

```
z_speaker = (value - mu_reference) / sd_reference
value'    = mu_training + z_speaker * sd_training
```

A speaker typical for their language maps to the training mean and contributes
nothing, instead of contributing a spurious signal. On a 68-word English sample the
pronoun ratio went from a raw 0.103 (reading as elevated against the Chinese mean) to
a calibrated 0.045, correctly reflecting that the speaker sits at z = -0.37 within
English. The screening flipped from a spurious elevated reading to Low Risk.

The module **will not invent reference statistics.** A language is calibrated only
when a profile built from real recordings exists; otherwise it reports
`status="uncalibrated"`, changes nothing, and the pipeline withholds the clinical risk
tier entirely rather than presenting a known-biased score as a category.

### 4.7 Minimum-sample gate
At 28 words, two extra pronouns move `CTP_Pronouns_ratio` by ~40% - larger than the
effect the model is trying to detect. Recordings below 50 words or 20 seconds now
return `sample_sufficient: false` with no probability, no risk tier and no feature
vector, and the UI asks for more speech instead of showing a number.

### 4.8 Imputed constants excluded from attributions
Six of the 22 features are never extracted from audio and sit at their training median
for every patient: `CTP_F0 SD(st)`, `CTP_EST`, `CTP_Noun No Phrase Rate` and the three
phrase-type features. They were being ranked and shown to patients as biomarkers
"influencing this screening signal" while carrying zero information about the
individual. They are now excluded from the ranked contributions and reported
separately as `imputed_constant_features`.

### 4.9 ASR accuracy
Faster-Whisper was upgraded from `tiny` to `base`. `tiny` mis-transcribed enough to
corrupt the linguistic features that decide the score - a dropped or invented pronoun
moves the deciding feature materially on a short sample. Override with
`SWARSANKET_WHISPER_MODEL`.

---

## 5. Clinical recommendation

### 5.1 Report uncertainty alongside every probability — implemented
Confidence alone is misleading on this pipeline. The reference recording reports **74.6 % with epistemic uncertainty ±0.33**: a spread that wide across 30 stochastic passes means the model is genuinely unsettled, and that must reach the clinician. Every result surface now shows the confidence/uncertainty pair, the protocol mode (Canonical vs Proxy), and any out-of-support clamping. `uncertaintyStd`, `iuScoringMode`, `matchedInformationUnits` and `clampedFeatureCount` are persisted with each offline session so a stored result cannot later be read back as more settled than it was.

### 5.2 Do not pilot clinically until feature provenance is closed
Two paths, in order of preference:

1. **Obtain the upstream extraction code** that produced the six CSVs. This is the only route that makes `screening_engine.py` reproduce the training features faithfully rather than approximate them, and it preserves the existing trained artifact and its 0.943 AUC.
2. **Retrain on English/Indic speech using features this codebase computes itself.** Extraction and training definitions then match *by construction*, which removes the entire class of defect documented here. The reported AUC would need re-establishing on the new corpus.

Until one is done, the system is defensible as an engineering demonstrator, not as a screening instrument.

### 5.3 Indic / English fine-tuning roadmap (ABHA alignment)
The UI already ships 11 languages; the model behind it is monolingual Chinese-derived. Recommended sequence:

1. **Corpus** — collect picture-description recordings in English plus priority Indic languages, with clinical labels (MMSE/MoCA-anchored) and consent recorded under DPDP Act 2023.
2. **Extraction parity** — freeze a single extraction module used for both training and inference; version the feature contract alongside the model artifact so a mismatch fails loudly at load.
3. **Per-language normalisation** — fit separate scalers/medians per language. Word-count denominators are not comparable across scripts and must never be shared, which is the generalisation of the defect in §3.
4. **Validation** — report per-language sensitivity/specificity separately; a pooled metric would hide exactly the cross-linguistic failure documented here.
5. **ABHA / ABDM compliance** — ABHA ID linkage, FHIR R4 `DiagnosticReport` output, audit-logged consent, and data residency. Screening output must remain labelled decision-support, never diagnosis, in every locale.

---

## 6. Verification performed

| Gate | Result |
|---|---|
| `python backend/test_api_analyze.py` | 4/4 pass — health, analyze contract, safe 400 with no traceback leak, explainability framing |
| `backend/test_explainability.py`, `test_screening_engine.py`, `test_model_loader.py` | Pass |
| `npx pyright backend` | 0 errors, 0 warnings |
| `npx tsc --noEmit` | 0 errors |
| `npx oxfmt src` | Clean |
| `npm run build` | Succeeds |
| IndexedDB record shapes | 7/7 structured-clone checks pass, including backward compatibility with records lacking the new fields |

**Verification boundary:** IndexedDB persistence was verified by structured-clone equivalence and type checking, not by executing against a browser IndexedDB implementation — the repository has no browser test harness. The claim in §3 that upstream units are Chinese-segmented is an inference from the corpus filenames combined with the numeric impossibility of the English reading; the upstream extraction code was not available to confirm the mechanism directly.

---

## 7. Known open items

| # | Item | Severity |
|---|---|---|
| 1 | IU/keyword feature definitions unrecoverable; English extraction unvalidated against training semantics (§2, §3) | **High** — blocks clinical calibration |
| 2 | On-protocol English descriptions clamp ~6 of 22 features at +3σ, degrading discrimination | **High** |
| 2a | *Mitigated* by the cross-lingual calibration layer (§4.6). The English reference profile currently shipped is **provisional** — built from an unlabelled convenience sample — so results remain exploratory until a validated profile replaces it. | **High** |
| 3 | `CTP_F0 SD(st)`, `CTP_EST` and the four syntactic-phrase features remain median-imputed — never extracted live | Medium |
| 4 | Expanded picture-description prompts for 10 Indic locales were authored without native review | Medium |
| 5 | `CTP_Voiced Rate(1/s)` semantics inferred, not recovered; currently words per second of active speech | Low |
| 6 | ~~Doctor-view model comparison card still names "Xception + XGBoost", a pipeline no longer in use~~ **RESOLVED.** The doctor-view card now reports the measured ROC-AUC from `swarsanket_qh_evaluation.json`, and the GitHub Release notes no longer advertise Xception or XGBoost. Neither has ever existed in this project. | Closed |
| 7 | `clearAllScreenings()` intentionally leaves `doctor_notes` intact; the confirmation copy is scoped accordingly | Low — by design, noted for review |
