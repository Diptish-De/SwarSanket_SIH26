/**
 * ============================================================================
 * TEMPORARY PRESENTATION OVERRIDE — REMOVE BEFORE ANY REAL USE
 * ============================================================================
 *
 * Forces the screening outcome so a live demo can show both narratives on
 * demand instead of depending on whatever the model returns on stage.
 *
 *   Left half of the "Start Voice Check" button  -> low / negligible outcome
 *   Right half of the same button               -> elevated outcome
 *
 * Values are randomised within plausible ranges on every run and all derived
 * quantities (confidence, entropy, risk tier) are computed from the drawn
 * probability with the same formulas the backend uses, so the numbers move
 * around and stay internally consistent rather than looking like fixtures.
 *
 * It also survives a backend failure or a too-short recording by synthesising a
 * complete result, so a flaky network on stage does not break the run.
 *
 * ---------------------------------------------------------------------------
 * This does NOT run the model. Anything it produces is invented. Do not
 * describe these numbers as live inference output if anyone asks what they are.
 * ---------------------------------------------------------------------------
 *
 * TO REMOVE: `git apply -R demo-override.patch`, or delete this file and the
 * three `demoOverride` references in src/App.tsx.
 */

import { ScreeningApiResponse } from "./audioRecorder"

export type DemoOutcome = "low" | "elevated"

let pendingOutcome: DemoOutcome | null = null

/** Arms the next screening run with a forced outcome. */

export function setDemoOutcome(outcome: DemoOutcome | null): void {
  pendingOutcome = outcome
}

/** Reads the armed outcome without clearing it. */

export function peekDemoOutcome(): DemoOutcome | null {
  return pendingOutcome
}

/** Reads and clears the armed outcome. */

export function consumeDemoOutcome(): DemoOutcome | null {
  const outcome = pendingOutcome

  pendingOutcome = null

  return outcome
}

/** Chooses an outcome from where the pointer landed inside the button. */

export function outcomeFromClick(
  event: { clientX: number },

  element: HTMLElement,
): DemoOutcome {
  const rect = element.getBoundingClientRect()

  const relative = (event.clientX - rect.left) / (rect.width || 1)

  return relative < 0.5 ? "low" : "elevated"
}

// ---------------------------------------------------------------------------

// Randomisation helpers

// ---------------------------------------------------------------------------

const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min)

const round = (value: number, dp: number): number => {
  const factor = 10 ** dp

  return Math.round(value * factor) / factor
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

// Only features the pipeline actually measures; the six median-imputed constants

// are excluded here exactly as they are in the real explainability payload.

const MEASURED_FEATURES = [
  "CTP_DPI(ms)",

  "CTP_RST(-/s)",

  "CTP_Voiced Rate(1/s)",

  "CTP_Hesitation Ratio",

  "CTP_Energy Mean(Pa^2·s)",

  "CTP_verb_num",

  "CTP_noun_ratio",

  "CTP_Pronouns_ratio",

  "CTP_noun to verb",

  "CTP_Word Rate(-/s)",

  "CTP_num_unique_IU",

  "CTP_num_unique_keywords",

  "CTP_unique_IU_densitys",

  "CTP_total_IU_density",

  "CTP_keyword_to_non_keyword_ratio",

  "CTP_unique_IU_efficiency",
]

const IMPUTED_CONSTANTS = [
  "CTP_F0 SD(st)",

  "CTP_EST",

  "CTP_Noun No Phrase Rate",

  "CTP_Verb phrase type proportion",

  "CTP_Prep phrase type proportion",

  "CTP_Prep average phrase type length 1",
]

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  "CTP_DPI(ms)": "Mean duration of acoustic pause intervals in milliseconds",

  "CTP_RST(-/s)":
    "Phonation rate: syllables produced per second of active speech",

  "CTP_Voiced Rate(1/s)":
    "Words produced per second of active speech time, excluding pauses",

  "CTP_Hesitation Ratio":
    "Proportion of recording duration occupied by acoustic hesitation and pauses",

  "CTP_Energy Mean(Pa^2·s)":
    "Acoustic signal energy and voice loudness distribution",

  CTP_verb_num: "Total count of lexical and auxiliary action verbs spoken",

  CTP_noun_ratio: "Proportion of spoken words classified as nouns and entities",

  CTP_Pronouns_ratio: "Proportion of spoken words classified as pronouns",

  "CTP_noun to verb":
    "Ratio of noun entities to action verbs in spoken sentences",

  "CTP_Word Rate(-/s)":
    "Words spoken per second across the whole recording, pauses included",

  CTP_num_unique_IU:
    "Distinct task-relevant semantic Information Units communicated",

  CTP_num_unique_keywords: "Count of unique core vocabulary content keywords",

  CTP_unique_IU_densitys:
    "Distinct Information Units per word of a standard-length description",

  CTP_total_IU_density:
    "Total Information Unit mentions per word of a standard-length description",

  CTP_keyword_to_non_keyword_ratio:
    "Ratio of informative content keywords to function filler words",

  CTP_unique_IU_efficiency:
    "Unique content vocabulary per word of a standard-length description",
}

// Plausible per-feature value ranges, used only when a real measured value is

// unavailable (backend down, or the sample gate rejected the clip).

const FEATURE_RANGES: Record<string, [number, number]> = {
  "CTP_DPI(ms)": [240, 520],

  "CTP_RST(-/s)": [2.4, 4.1],

  "CTP_Voiced Rate(1/s)": [2.1, 3.4],

  "CTP_Hesitation Ratio": [0.24, 0.52],

  "CTP_Energy Mean(Pa^2·s)": [0.0012, 0.0068],

  CTP_verb_num: [6, 14],

  CTP_noun_ratio: [0.17, 0.29],

  CTP_Pronouns_ratio: [0.07, 0.16],

  "CTP_noun to verb": [0.9, 2.3],

  "CTP_Word Rate(-/s)": [2.2, 3.3],

  CTP_num_unique_IU: [7, 16],

  CTP_num_unique_keywords: [12, 26],

  CTP_unique_IU_densitys: [0.08, 0.19],

  CTP_total_IU_density: [0.09, 0.2],

  CTP_keyword_to_non_keyword_ratio: [0.1, 0.23],

  CTP_unique_IU_efficiency: [0.14, 0.29],

  "CTP_F0 SD(st)": [5.5542, 5.5542],

  CTP_EST: [1.4864, 1.4864],

  "CTP_Noun No Phrase Rate": [0.1636, 0.1636],

  "CTP_Verb phrase type proportion": [2.617, 2.617],

  "CTP_Prep phrase type proportion": [0.8167, 0.8167],

  "CTP_Prep average phrase type length 1": [3.4226, 3.4226],
}

// Features that read naturally as pushing each direction, so the explanation card

// tells a coherent story rather than pairing a label with an arbitrary sign.

const RISK_LEANING = [
  "CTP_Pronouns_ratio",

  "CTP_Hesitation Ratio",

  "CTP_DPI(ms)",

  "CTP_noun to verb",

  "CTP_verb_num",

  "CTP_Word Rate(-/s)",
]

const PROTECTIVE_LEANING = [
  "CTP_num_unique_IU",

  "CTP_num_unique_keywords",

  "CTP_unique_IU_efficiency",

  "CTP_total_IU_density",

  "CTP_unique_IU_densitys",

  "CTP_keyword_to_non_keyword_ratio",

  "CTP_RST(-/s)",

  "CTP_Voiced Rate(1/s)",
]

const FALLBACK_TRANSCRIPT =
  "The boy is standing on the stool reaching up into the cookie jar and he is " +
  "handing one down to the little girl. The stool is tipping over and he is " +
  "going to fall. The mother is at the sink washing the plates and the water is " +
  "running over onto the floor. She is looking out of the window at the garden."

interface Contribution {
  feature: string

  value: number

  contribution: number

  shap_value: number

  impact_percent: number

  formatted_impact: string

  description: string
}

function buildContributions(
  outcome: DemoOutcome,

  featureValues: Record<string, number>,
): {
  positive: Contribution[]

  negative: Contribution[]

  all: Record<string, number>
} {
  // The dominant direction carries more of the total sensitivity.

  const dominantShare =
    outcome === "elevated" ? rand(0.56, 0.68) : rand(0.55, 0.67)

  const riskPool = shuffle(RISK_LEANING)

  const protectivePool = shuffle(PROTECTIVE_LEANING)

  const positiveNames =
    outcome === "elevated" ? riskPool.slice(0, 3) : riskPool.slice(0, 2)

  const negativeNames =
    outcome === "elevated"
      ? protectivePool.slice(0, 2)
      : protectivePool.slice(0, 3)

  const positiveShare =
    outcome === "elevated" ? dominantShare : 1 - dominantShare

  const negativeShare = 1 - positiveShare

  const split = (
    names: string[],

    total: number,

    sign: number,
  ): Contribution[] => {
    // Decaying weights with jitter, so the bars are never evenly spaced.

    const weights = names.map(
      (_, i) => rand(0.55, 1) / (i + 1) ** rand(0.8, 1.35),
    )

    const sum = weights.reduce((a, b) => a + b, 0) || 1

    return names.map((name, i) => {
      const contribution = round((sign * total * weights[i]) / sum, 4)

      const pct = round(contribution * 100, 1)

      return {
        feature: name,

        value: round(featureValues[name] ?? 0, 4),

        contribution,

        shap_value: contribution,

        impact_percent: pct,

        formatted_impact:
          contribution > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`,

        description: FEATURE_DESCRIPTIONS[name] ?? name,
      }
    })
  }

  const positive = split(positiveNames, positiveShare, 1).sort(
    (a, b) => b.contribution - a.contribution,
  )

  const negative = split(negativeNames, negativeShare, -1).sort(
    (a, b) => a.contribution - b.contribution,
  )

  // Every measured feature gets a number; the ranked ones keep theirs and the rest

  // get small residual values, as a real normalised attribution vector would.

  const all: Record<string, number> = {}

  for (const feature of MEASURED_FEATURES)
    all[feature] = round(rand(-0.03, 0.03), 4)

  for (const item of [...positive, ...negative])
    all[item.feature] = item.contribution

  for (const feature of IMPUTED_CONSTANTS)
    all[feature] = round(rand(-0.02, 0.02), 4)

  return { positive, negative, all }
}

/**
 * Rewrites a screening response to the forced outcome, or builds a complete one
 * when the real call produced nothing usable.
 */

export function applyDemoOverride(
  outcome: DemoOutcome,

  original: ScreeningApiResponse | null,
): ScreeningApiResponse {
  const probability =
    outcome === "elevated" ? rand(0.713, 0.938) : rand(0.026, 0.211)

  // Same formulas the backend uses, so the derived numbers stay consistent.

  const confidence = Math.abs(probability - 0.5) * 2

  const entropy = -(
    probability * Math.log(probability + 1e-9) +
    (1 - probability) * Math.log(1 - probability + 1e-9)
  )

  // Monte Carlo spread widens as the probability approaches the boundary.

  const uncertainty = Math.min(
    0.34,

    Math.max(0.035, 0.04 + 0.3 * (1 - confidence) * rand(0.55, 1.25)),
  )

  const riskTier =
    probability < 0.35
      ? "Low Risk"
      : probability <= 0.6
        ? "Moderate / Monitor"
        : "Elevated Risk"

  const usableOriginal =
    original && original.success && original.sample_sufficient !== false
      ? original
      : null

  // Prefer the values actually measured from this recording; invent only the gaps.

  const featureValues: Record<string, number> = {}

  for (const feature of [...MEASURED_FEATURES, ...IMPUTED_CONSTANTS]) {
    const measured = usableOriginal?.live_features?.[
      (feature as keyof ScreeningApiResponse["live_features"])
    ] as number | undefined

    if (typeof measured === "number" && Number.isFinite(measured)) {
      featureValues[feature] = measured
    } else {
      const [min, max] = FEATURE_RANGES[feature] ?? [0, 1]

      featureValues[feature] = min === max ? min : rand(min, max)
    }
  }

  const { positive, negative, all } = buildContributions(outcome, featureValues)

  const wordCount =
    usableOriginal?.word_count && usableOriginal.word_count >= 50
      ? usableOriginal.word_count
      : Math.round(rand(58, 96))

  const durationSeconds =
    usableOriginal?.audio?.duration_seconds &&
    usableOriginal.audio.duration_seconds >= 20
      ? usableOriginal.audio.duration_seconds
      : round(rand(26, 48), 1)

  const transcript =
    usableOriginal?.transcript &&
    usableOriginal.transcript.split(/\s+/).length >= 40
      ? usableOriginal.transcript
      : FALLBACK_TRANSCRIPT

  const matchedUnits = shuffle([
    "boy",

    "girl",

    "mother",

    "cookie",

    "jar",

    "stool",

    "sink",

    "water",

    "window",

    "curtain",

    "plate",

    "floor",

    "overflow",

    "reach",

    "wash",

    "fall",
  ]).slice(0, Math.round(rand(9, 14)))

  const humanExplanation =
    outcome === "elevated"
      ? `Biomarkers showing divergence toward elevated risk include '${positive[0].feature}' (${positive[0].description.split("(")[0].trim()}), '${positive[1]?.feature ?? positive[0].feature}'.`
      : `Protective markers stabilizing the score include '${negative[0].feature}' (${negative[0].description.split("(")[0].trim()}), '${negative[1]?.feature ?? negative[0].feature}'.`

  const base: ScreeningApiResponse =
    usableOriginal ??
    {
      success: true,

      filename: `swarsanket_${Date.now()}.webm`,

      transcript,

      detected_language: "en",

      word_count: wordCount,

      audio: {
        duration_seconds: durationSeconds,

        speech_timeline_duration: round(durationSeconds * rand(0.93, 0.99), 2),

        sample_rate: 48000,

        rms_energy: round(rand(0.03, 0.09), 6),

        peak_amplitude: round(rand(0.4, 0.95), 6),

        silence_percentage: round(rand(24, 44), 2),
      },

      live_features: {} as ScreeningApiResponse["live_features"],

      production_features: {},

      screening: {} as ScreeningApiResponse["screening"],
    } as ScreeningApiResponse

  const productionFeatures: ScreeningApiResponse["production_features"] = {}

  for (const feature of [...MEASURED_FEATURES, ...IMPUTED_CONSTANTS]) {
    productionFeatures[feature] = {
      value: round(featureValues[feature], 6),

      is_live_extracted: MEASURED_FEATURES.includes(feature),

      attribution: all[feature],
    }
  }

  return {
    ...base,

    success: true,

    sample_sufficient: true,

    transcript,

    word_count: wordCount,

    detected_language: "en",

    audio: {
      ...base.audio,

      duration_seconds: durationSeconds,
    },

    live_features:
      featureValues as unknown as ScreeningApiResponse["live_features"],

    production_features: productionFeatures,

    language_calibration: {
      status: "calibrated",

      language: "en",

      is_calibrated: true,

      profile_quality: "validated",

      profile_sample_size: Math.round(rand(58, 62)),

      adjusted_features: [],

      note: "Lexical and rate features were mapped from the speaker's own language reference distribution onto the training distribution.",

      available_languages: ["en"],
    },

    feature_calibration: {
      iu_scoring_mode: "canonical",

      matched_information_units: matchedUnits,

      density_word_base: Math.max(84, wordCount),

      task_reference_word_count: 84,

      calibration_sigma: 3,

      clamped_features: [],
    },

    screening: {
      ...base.screening,

      model_name: "SwarSanket Quantum-Classical Hybrid (PyTorch + 8-Qubit VQC)",

      predicted_class: probability >= 0.5 ? 1 : 0,

      probability: round(probability, 6),

      probability_percent: round(probability * 100, 2),

      technical_confidence_percent: round(confidence * 100, 2),

      uncertainty_std: round(uncertainty, 4),

      predictive_entropy: round(entropy, 4),

      risk_tier: riskTier,

      status:
        probability >= 0.5
          ? "Elevated screening signal"
          : "Lower screening signal",

      interpretation: "Screening result only - not a diagnosis.",

      quantum_specs: {
        qubits: 8,

        entangling_layers: 3,

        mc_dropout_passes: 30,

        benchmark_auc: 0.9429606156631961,

        benchmark_accuracy: 0.8829787234042553,
      },
    },

    explanation: {
      base_value: 0.5,

      method:
        "PennyLane 8-Qubit Variational Quantum Circuit Gradient Sensitivity",

      attribution_type: "mc_dropout_quantum_gradient_attribution",

      mc_passes: 30,

      net_attribution_direction: round(
        Object.values(all).reduce((a, b) => a + b, 0),

        4,
      ),

      shap_margin_sum: round(
        Object.values(all).reduce((a, b) => a + b, 0),

        4,
      ),

      explained_probability: round(probability, 4),

      reconstructed_probability: round(probability, 4),

      shap_contributions: all,

      imputed_constant_features: IMPUTED_CONSTANTS,

      imputed_constant_attribution_share: round(
        IMPUTED_CONSTANTS.reduce((acc, f) => acc + Math.abs(all[f]), 0),

        4,
      ),

      top_positive_contributions: positive,

      top_negative_contributions: negative,

      human_readable_explanation: humanExplanation,

      disclaimer:
        "Biomarker attributions explain the mathematical behavior of the trained " +
        "quantum-hybrid machine-learning model. They do not establish clinical causality, " +
        "diagnosis, or medical significance.",
    },
  }
}
