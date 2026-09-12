/**
 * Measured test-set performance of the production quantum-hybrid model.
 *
 * GENERATED FROM backend/models/swarsanket_qh_evaluation.json - the artifact
 * written by the training run itself. Do not hand-edit these numbers, and do not
 * add a metric here that no artifact reports.
 *
 * Two caveats belong with any presentation of these figures:
 *
 *   1. The test set is 94 samples.
 *   2. It is drawn from Chinese ASR corpora (Xunfei / Tencent / ALiYun). See
 *      docs/MODEL_PROVENANCE_AUDIT.md. Performance on Indic-language or English
 *      speech is NOT established by these numbers.
 *
 * There is no classical baseline to compare against: final.ipynb trains only the
 * hybrid model and states "No XGBoost anywhere in this notebook". Any
 * side-by-side comparison must train one first.
 */

export const MODEL_EVAL = {
  rocAuc: 0.943,

  prAuc: 0.8931,

  accuracy: 0.883,

  precision: 0.8913,

  recall: 0.8723,

  specificity: 0.8936,

  f1: 0.8817,

  balancedAccuracy: 0.883,

  matthewsCorrCoef: 0.7661,

  cohenKappa: 0.766,

  brierScore: 0.0948,

  logLoss: 0.3814,

  testSamples: 94,

  confusionMatrix: [
    [42, 5],

    [6, 41],
  ],

  corpusProvenance: "Chinese ASR corpora (Xunfei / Tencent / ALiYun)",

  hasClassicalBaseline: false,
} as const
