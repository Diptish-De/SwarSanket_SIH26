// ─── SwarSanket Clinical Doctor Hub: Patient Case Profiles ─────────────────────

export interface AcousticComparisonItem {
  metric: string
  patientValue: string
  normalRange: string
  status: "normal" | "elevated" | "reduced"
  note: string
}

export interface VqcSensitivityFactor {
  factor: string
  impact: number // e.g. 38 for +38% or -26 for -26%
  clinicalMeaning: string
}

export interface TrendPoint {
  month: string
  risk: number
}

export interface ModelMetric {
  name: string
  score: number
  auc: number
}

export interface DoctorPatientProfile {
  id: string
  name: string
  age: number
  gender: "Female" | "Male"
  lang: string
  date: string
  wpm: number
  risk: "elevated" | "low" | "moderate"
  riskScore: number // percentage, e.g. 84.5
  statusLabel: string
  chiefComplaint: string
  clinicalImpression: string
  protocolMode: string
  trendData: TrendPoint[]
  classicalModel: ModelMetric
  quantumModel: ModelMetric
  vqcSensitivity: VqcSensitivityFactor[]
  acousticComparison: AcousticComparisonItem[]
  clinicalRecommendation: string
  prescribedNextSteps: string[]
  initialNotes: string[]
}

export const DOCTOR_PATIENT_PROFILES: DoctorPatientProfile[] = [
  {
    id: "pat_rama_devi",
    name: "Rama Devi",
    age: 72,
    gender: "Female",
    lang: "Hindi",
    date: "28 Aug 2026",
    wpm: 64,
    risk: "elevated",
    riskScore: 84.5,
    statusLabel: "Elevated Cognitive Risk (84.5%)",
    chiefComplaint:
      "Progressive word-finding hesitation noticed by family over past 6 months.",
    clinicalImpression:
      "Acoustic speech markers demonstrate prolonged hesitation pauses (>1.4s), marked reduction in noun-to-verb transitions, and reduced information unit lexical density (0.38). Pattern is characteristic of early amnestic Mild Cognitive Impairment (MCI).",
    protocolMode: "Canonical Picture Description (Standardized Cookie Theft)",
    trendData: [
      { month: "Jun", risk: 22 },
      { month: "Jul", risk: 36 },
      { month: "Aug", risk: 58 },
      { month: "Sep", risk: 85 },
    ],
    classicalModel: {
      name: "XGBoost + Wav2Vec2 Temporal Features",
      score: 81.4,
      auc: 0.91,
    },
    quantumModel: {
      name: "PennyLane 8-Qubit VQC (QNN)",
      score: 87.6,
      auc: 0.94,
    },
    vqcSensitivity: [
      {
        factor: "Speech Pause Duration (>1.4s)",
        impact: 38,
        clinicalMeaning:
          "Reflects delayed lexical retrieval in temporal lobe pathways",
      },
      {
        factor: "Noun-to-Verb Transition Gap",
        impact: 28,
        clinicalMeaning:
          "Syntactic formulation latency and object naming hesitation",
      },
      {
        factor: "Vocal Pitch Jitter (3.1%)",
        impact: 20,
        clinicalMeaning:
          "Micro-tremor in phonation breath control during recall stress",
      },
      {
        factor: "Phonation Voicing Continuity",
        impact: -24,
        clinicalMeaning: "Decreased continuous speech energy across utterances",
      },
    ],
    acousticComparison: [
      {
        metric: "Speech Word Rate",
        patientValue: "64 WPM",
        normalRange: "90 – 120 WPM",
        status: "reduced",
        note: "29% below age-matched healthy baseline",
      },
      {
        metric: "Pause / Silence Ratio",
        patientValue: "44.5%",
        normalRange: "15 – 25%",
        status: "elevated",
        note: "Frequent pauses (>1.2s) between semantic clauses",
      },
      {
        metric: "Pitch Jitter (Perturbation)",
        patientValue: "3.12%",
        normalRange: "< 1.80%",
        status: "elevated",
        note: "Subtle vocal instability during picture recall",
      },
      {
        metric: "Info Unit (IU) Density",
        patientValue: "0.38 IU/s",
        normalRange: "> 0.55 IU/s",
        status: "reduced",
        note: "Fewer key nouns recalled per speech second",
      },
    ],
    clinicalRecommendation:
      "Administer full MoCA battery and order non-contrast brain MRI. Schedule follow-up cognitive counseling with family caregiver in 30 days.",
    prescribedNextSteps: [
      "Schedule Formal MoCA (Montreal Cognitive Assessment)",
      "Order Brain Volumetric MRI / Vascular Screening",
      "Notify Caregiver (Ramesh Kumar - Son)",
      "Recommend Speech & Memory Cognitive Stimulation Exercises",
    ],
    initialNotes: [
      "Patient is cooperative. Word-finding hesitation noticeable during Cookie Theft scene.",
      "VQC gradient analysis shows hesitation ratio as primary statistical driver.",
    ],
  },
  {
    id: "pat_suresh_kumar",
    name: "Suresh Kumar",
    age: 68,
    gender: "Male",
    lang: "Hindi",
    date: "15 Aug 2026",
    wpm: 104,
    risk: "low",
    riskScore: 12.4,
    statusLabel: "Normal Cognitive Baseline (12.4%)",
    chiefComplaint:
      "Routine preventative health checkup requested during annual family medicine visit.",
    clinicalImpression:
      "Fluent prosody, rapid keyword formulation, and balanced silence distribution. All acoustic biomarkers lie comfortably within healthy age-adjusted reference intervals. No indications of focal cognitive impairment.",
    protocolMode: "Canonical Picture Description (Standardized Cookie Theft)",
    trendData: [
      { month: "Jun", risk: 14 },
      { month: "Jul", risk: 12 },
      { month: "Aug", risk: 15 },
      { month: "Sep", risk: 12 },
    ],
    classicalModel: {
      name: "XGBoost + Wav2Vec2 Temporal Features",
      score: 11.2,
      auc: 0.91,
    },
    quantumModel: {
      name: "PennyLane 8-Qubit VQC (QNN)",
      score: 13.6,
      auc: 0.94,
    },
    vqcSensitivity: [
      {
        factor: "High Lexical Information Density",
        impact: -34,
        clinicalMeaning: "Strong semantic recall with rapid noun association",
      },
      {
        factor: "Speech Prosody Rhythm Regularity",
        impact: -26,
        clinicalMeaning: "Natural cadence with fluent clause transitions",
      },
      {
        factor: "Vocal Harmonic Stability (HNR 24dB)",
        impact: -21,
        clinicalMeaning:
          "Healthy phonation energy with minimal acoustic jitter",
      },
      {
        factor: "Brief Natural Hesitation (<0.5s)",
        impact: -16,
        clinicalMeaning:
          "Normal conversational pauses without retrieval blocks",
      },
    ],
    acousticComparison: [
      {
        metric: "Speech Word Rate",
        patientValue: "104 WPM",
        normalRange: "90 – 120 WPM",
        status: "normal",
        note: "Normal conversational velocity",
      },
      {
        metric: "Pause / Silence Ratio",
        patientValue: "18.2%",
        normalRange: "15 – 25%",
        status: "normal",
        note: "Optimal breath and clause spacing",
      },
      {
        metric: "Pitch Jitter (Perturbation)",
        patientValue: "1.12%",
        normalRange: "< 1.80%",
        status: "normal",
        note: "Clear vocal stability and prosody",
      },
      {
        metric: "Info Unit (IU) Density",
        patientValue: "0.68 IU/s",
        normalRange: "> 0.55 IU/s",
        status: "normal",
        note: "Accurate recall of 12 distinct scene elements",
      },
    ],
    clinicalRecommendation:
      "Patient displays healthy cognitive biomarkers and high linguistic efficiency. No interventions required; maintain routine annual screening.",
    prescribedNextSteps: [
      "Maintain Annual Cognitive Screening Schedule",
      "Encourage Regular Cardiovascular Exercise",
      "Re-screen in August 2027",
    ],
    initialNotes: [
      "Clear, confident description of the scene.",
      "High information unit density with rapid syntactic delivery.",
    ],
  },
  {
    id: "pat_meera_mukherjee",
    name: "Meera Mukherjee",
    age: 80,
    gender: "Female",
    lang: "Bengali",
    date: "12 Aug 2026",
    wpm: 56,
    risk: "elevated",
    riskScore: 89.2,
    statusLabel: "Elevated Neurocognitive Concern (89.2%)",
    chiefComplaint:
      "Recent disorientation in familiar neighborhood, forgetting grandchildren's names, repetitive questioning.",
    clinicalImpression:
      "Severe temporal slowing (56 WPM) with extensive hesitation clusters (>2.1s). Information unit retrieval density is critically diminished (0.29). Quantum variational circuit factors demonstrate profound attenuation in syntactic transitions.",
    protocolMode: "Canonical Picture Description (Standardized Cookie Theft)",
    trendData: [
      { month: "Jun", risk: 52 },
      { month: "Jul", risk: 65 },
      { month: "Aug", risk: 78 },
      { month: "Sep", risk: 89 },
    ],
    classicalModel: {
      name: "XGBoost + Wav2Vec2 Temporal Features",
      score: 86.8,
      auc: 0.91,
    },
    quantumModel: {
      name: "PennyLane 8-Qubit VQC (QNN)",
      score: 91.6,
      auc: 0.94,
    },
    vqcSensitivity: [
      {
        factor: "Extended Hesitation Clusters (>2.0s)",
        impact: 42,
        clinicalMeaning:
          "Severe working memory search delays in temporal-parietal network",
      },
      {
        factor: "Vocabulary Diversity Reduction",
        impact: 34,
        clinicalMeaning:
          "Heavy reliance on generic filler words ('jinis', 'sheta', 'manush')",
      },
      {
        factor: "Phonation Latency Delay",
        impact: 26,
        clinicalMeaning:
          "Initiation difficulty before starting descriptive sentences",
      },
      {
        factor: "Fundamental Frequency Instability",
        impact: 18,
        clinicalMeaning:
          "Irregular vocal pitch envelope across short phrase segments",
      },
    ],
    acousticComparison: [
      {
        metric: "Speech Word Rate",
        patientValue: "56 WPM",
        normalRange: "85 – 115 WPM",
        status: "reduced",
        note: "Severe temporal bradyphasia",
      },
      {
        metric: "Pause / Silence Ratio",
        patientValue: "52.1%",
        normalRange: "15 – 26%",
        status: "elevated",
        note: "Over half of recorded time consists of silent blocks",
      },
      {
        metric: "Pitch Jitter (Perturbation)",
        patientValue: "3.78%",
        normalRange: "< 1.90%",
        status: "elevated",
        note: "Significant acoustic jitter and frequency tremors",
      },
      {
        metric: "Info Unit (IU) Density",
        patientValue: "0.29 IU/s",
        normalRange: "> 0.50 IU/s",
        status: "reduced",
        note: "Only 4 information units identified across 45 seconds",
      },
    ],
    clinicalRecommendation:
      "Urgent neurological workup recommended. Initiate ACE-R or CDR scale evaluation; discuss caregiver support structures and safety planning.",
    prescribedNextSteps: [
      "Priority Neurological Clinical Consultation",
      "Caregiver Safety Assessment (Home Medication & Cooking Safety)",
      "Neuropsychological Battery (ACE-R / CDR)",
      "Brain MRI with Hippocampal Volumetry",
    ],
    initialNotes: [
      "Daughter accompanied patient. Patient paused frequently, asking for confirmation.",
      "High epistemic confidence in acoustic model (>92%).",
    ],
  },
  {
    id: "pat_rajeshwar_singh",
    name: "Col. Rajeshwar Singh (Retd.)",
    age: 76,
    gender: "Male",
    lang: "Punjabi / English",
    date: "04 Sep 2026",
    wpm: 82,
    risk: "moderate",
    riskScore: 46.8,
    statusLabel: "Moderate Risk / Longitudinal Monitoring (46.8%)",
    chiefComplaint:
      "Subjective complaint of mild slowing in multi-step recall following a viral illness last month.",
    clinicalImpression:
      "Borderline acoustic parameters. Speech tempo is mildly depressed (82 WPM) with moderate pause duration, yet semantic recall and lexical richness remain intact (0.52 IU/s). Suggests reversible fatigue or mild subcortical deceleration rather than classical cortical degeneration.",
    protocolMode: "Conversational & Picture Description Combined",
    trendData: [
      { month: "Jun", risk: 32 },
      { month: "Jul", risk: 35 },
      { month: "Aug", risk: 41 },
      { month: "Sep", risk: 47 },
    ],
    classicalModel: {
      name: "XGBoost + Wav2Vec2 Temporal Features",
      score: 44.5,
      auc: 0.91,
    },
    quantumModel: {
      name: "PennyLane 8-Qubit VQC (QNN)",
      score: 49.1,
      auc: 0.94,
    },
    vqcSensitivity: [
      {
        factor: "Acoustic Jitter (2.38%)",
        impact: 24,
        clinicalMeaning:
          "Mild vocal fatigue and breath exhaustion towards sentence endings",
      },
      {
        factor: "Sentence Production Latency",
        impact: 19,
        clinicalMeaning:
          "Slight hesitation when selecting technical military terminology",
      },
      {
        factor: "Preserved Vocabulary Density",
        impact: -18,
        clinicalMeaning:
          "Robust vocabulary richness buffers against elevated risk",
      },
      {
        factor: "Information Retrieval Consistency",
        impact: -14,
        clinicalMeaning:
          "Accurate chronologic sequencing of descriptive details",
      },
    ],
    acousticComparison: [
      {
        metric: "Speech Word Rate",
        patientValue: "82 WPM",
        normalRange: "85 – 115 WPM",
        status: "reduced",
        note: "Borderline low; influenced by deliberate speaking style",
      },
      {
        metric: "Pause / Silence Ratio",
        patientValue: "31.4%",
        normalRange: "15 – 26%",
        status: "elevated",
        note: "Mild elevation in clause interval pauses",
      },
      {
        metric: "Pitch Jitter (Perturbation)",
        patientValue: "2.38%",
        normalRange: "< 1.80%",
        status: "elevated",
        note: "Post-viral vocal cord dryness noted",
      },
      {
        metric: "Info Unit (IU) Density",
        patientValue: "0.52 IU/s",
        normalRange: "> 0.50 IU/s",
        status: "normal",
        note: "Strong conceptual retention across all prompt units",
      },
    ],
    clinicalRecommendation:
      "Rule out secondary metabolic causes (thyroid profile, Serum B12/D3). Re-screen with SwarSanket voice check in 60 days to measure trajectory.",
    prescribedNextSteps: [
      "Serum B12, Vitamin D3, and TSH Diagnostic Panel",
      "Repeat Voice Screening in 60 Days (November 2026)",
      "Sleep Hygiene & Hydration Assessment",
    ],
    initialNotes: [
      "Articulate and self-aware. Described deliberate military articulation style.",
      "Recommend monitoring trajectory rather than immediate invasive diagnostics.",
    ],
  },
  {
    id: "pat_lakshmi_sundaram",
    name: "Lakshmi Sundaram",
    age: 74,
    gender: "Female",
    lang: "Tamil",
    date: "09 Aug 2026",
    wpm: 115,
    risk: "low",
    riskScore: 8.9,
    statusLabel: "Optimal Cognitive Reserve (8.9%)",
    chiefComplaint:
      "Voluntary baseline enrollment in community healthy brain longevity registry.",
    clinicalImpression:
      "Exceptional cognitive vitality. Fluent bilingual cadence, zero abnormal acoustic pause clusters, and superior information unit efficiency (0.74). Represents top decile healthy control benchmark.",
    protocolMode: "Canonical Picture Description (Standardized Cookie Theft)",
    trendData: [
      { month: "Jun", risk: 10 },
      { month: "Jul", risk: 8 },
      { month: "Aug", risk: 9 },
      { month: "Sep", risk: 9 },
    ],
    classicalModel: {
      name: "XGBoost + Wav2Vec2 Temporal Features",
      score: 8.2,
      auc: 0.91,
    },
    quantumModel: {
      name: "PennyLane 8-Qubit VQC (QNN)",
      score: 9.6,
      auc: 0.94,
    },
    vqcSensitivity: [
      {
        factor: "High Lexical Entropy & Variety",
        impact: -38,
        clinicalMeaning: "Rich descriptive adjectives and active verb usage",
      },
      {
        factor: "Fluid Prosodic Rhythmic Cadence",
        impact: -30,
        clinicalMeaning:
          "Continuous vocal track excitation with natural intonation",
      },
      {
        factor: "Vocal Resonance SNR (28.4 dB)",
        impact: -22,
        clinicalMeaning: "Crisp acoustic envelope without phonatory tremor",
      },
      {
        factor: "Zero Pathological Pauses (>1.0s)",
        impact: -16,
        clinicalMeaning:
          "Rapid lexical access and immediate semantic formulation",
      },
    ],
    acousticComparison: [
      {
        metric: "Speech Word Rate",
        patientValue: "115 WPM",
        normalRange: "90 – 120 WPM",
        status: "normal",
        note: "Vibrant, natural conversational speed",
      },
      {
        metric: "Pause / Silence Ratio",
        patientValue: "15.8%",
        normalRange: "15 – 25%",
        status: "normal",
        note: "Excellent acoustic fluency",
      },
      {
        metric: "Pitch Jitter (Perturbation)",
        patientValue: "0.94%",
        normalRange: "< 1.80%",
        status: "normal",
        note: "Outstanding phonatory stability",
      },
      {
        metric: "Info Unit (IU) Density",
        patientValue: "0.74 IU/s",
        normalRange: "> 0.55 IU/s",
        status: "normal",
        note: "14 scene details accurately named in under 30 seconds",
      },
    ],
    clinicalRecommendation:
      "Exemplary baseline. Continue active bilingual engagement, crossword puzzles, and annual wellness checks.",
    prescribedNextSteps: [
      "Annual Routine Voice Screening (August 2027)",
      "Congratulate Patient on Excellent Cognitive Markers",
    ],
    initialNotes: [
      "Active retired educator. Highly enthusiastic during recording.",
      "Provided comprehensive narrative of Cookie Theft illustration in under 25s.",
    ],
  },
  {
    id: "pat_harish_patel",
    name: "Harish Chandra Patel",
    age: 70,
    gender: "Male",
    lang: "Gujarati",
    date: "01 Sep 2026",
    wpm: 68,
    risk: "elevated",
    riskScore: 77.1,
    statusLabel: "Elevated Risk / Vascular MCI Pattern (77.1%)",
    chiefComplaint:
      "History of hypertension; family reports sporadic conversational hesitations and difficulty balancing bank accounts.",
    clinicalImpression:
      "Speech acoustic envelope indicates intermittent processing delay with phrase-initial pause elongation (39.4% silence). Subcortical processing latency profile correlated with microvascular risk factors.",
    protocolMode: "Canonical Picture Description (Standardized Cookie Theft)",
    trendData: [
      { month: "Jun", risk: 38 },
      { month: "Jul", risk: 46 },
      { month: "Aug", risk: 62 },
      { month: "Sep", risk: 77 },
    ],
    classicalModel: {
      name: "XGBoost + Wav2Vec2 Temporal Features",
      score: 74.2,
      auc: 0.91,
    },
    quantumModel: {
      name: "PennyLane 8-Qubit VQC (QNN)",
      score: 80.0,
      auc: 0.94,
    },
    vqcSensitivity: [
      {
        factor: "Phrase-Initial Latency Delays",
        impact: 35,
        clinicalMeaning: "Delayed motor speech planning before sentence onset",
      },
      {
        factor: "Subcortical Pause Stutter (39%)",
        impact: 27,
        clinicalMeaning:
          "Intermittent pauses during syntactic clause construction",
      },
      {
        factor: "Syntactic Non-Phrase Rate",
        impact: 19,
        clinicalMeaning:
          "Incomplete grammatical sentences when describing action",
      },
      {
        factor: "Vocal Amplitude Shimmer (2.8%)",
        impact: 14,
        clinicalMeaning:
          "Amplitude modulation instability during prolonged vowels",
      },
    ],
    acousticComparison: [
      {
        metric: "Speech Word Rate",
        patientValue: "68 WPM",
        normalRange: "90 – 120 WPM",
        status: "reduced",
        note: "24% below age baseline",
      },
      {
        metric: "Pause / Silence Ratio",
        patientValue: "39.4%",
        normalRange: "15 – 26%",
        status: "elevated",
        note: "Frequent hesitations at sentence starts",
      },
      {
        metric: "Pitch Jitter (Perturbation)",
        patientValue: "2.94%",
        normalRange: "< 1.80%",
        status: "elevated",
        note: "Mild vocal perturbation",
      },
      {
        metric: "Info Unit (IU) Density",
        patientValue: "0.42 IU/s",
        normalRange: "> 0.55 IU/s",
        status: "reduced",
        note: "Reduced detail specificity",
      },
    ],
    clinicalRecommendation:
      "Optimize blood pressure and vascular risk management. Administer Montreal Cognitive Assessment (MoCA) and schedule brain MRI with white matter FLAIR sequence.",
    prescribedNextSteps: [
      "Cardiovascular & Blood Pressure Optimization Review",
      "MoCA Cognitive Battery focused on Executive Function",
      "Brain MRI (T2 FLAIR for White Matter Hyperintensities)",
      "Follow-up Teleconsultation in 45 Days",
    ],
    initialNotes: [
      "Patient noted feeling slightly anxious. Systolic BP 148/92 on intake.",
      "VQC gradients highlight phrase-initial latency as predominant marker.",
    ],
  },
]

export function getDoctorPatient(nameOrId: string): DoctorPatientProfile {
  const found = DOCTOR_PATIENT_PROFILES.find(
    (p) => p.name.toLowerCase() === nameOrId.toLowerCase() || p.id === nameOrId,
  )
  return found || DOCTOR_PATIENT_PROFILES[0]
}

export function getDoctorStats() {
  const total = DOCTOR_PATIENT_PROFILES.length
  const elevated = DOCTOR_PATIENT_PROFILES.filter(
    (p) => p.risk === "elevated",
  ).length
  const low = DOCTOR_PATIENT_PROFILES.filter((p) => p.risk === "low").length
  const moderate = DOCTOR_PATIENT_PROFILES.filter(
    (p) => p.risk === "moderate",
  ).length
  return { total, elevated, low, moderate, accuracy: "94.2%" }
}
