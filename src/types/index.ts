// ─── SwarSanket System Types & Data Contracts ─────────────────────────────────

export type Screen = "splash" | "language" | "welcome" | "consent" | "profile" | "home" | "voiceIntro" | "instruction" | "recording" | "voiceQuality" | "recordingReview" | "pictureDesc" | "memory" | "conversation" | "completion" | "processing" | "needMoreSpeech" | "resultLow" | "resultElevated" | "resultUncertain" | "screeningDetails" | "shareWithDoctor" | "offlineSaved" | "syncStatus" | "caregiverAlert" | "referral" | "teleconsult" | "privacyScreen" | "reminder" | "doctorDash" | "doctorPatient" | "doctorReport" | "history" | "trend" | "help" | "caregiver" | "healthWorker" | "settings" | "errorScreen" | "emptyHistory" | "cognitiveGamesHub"

export type RecordingContext = "freeSpeech" | "pictureDesc" | "memoryRecall" | "conversation"

export type LanguageCode = "en" | "hi" | "bn" | "mr" | "ta" | "te" | "gu" | "kn" | "ml"

export type ScreeningRisk = "low" | "elevated" | "uncertain"

export type ConfidenceLevel = "high" | "moderate" | "low"

export type VoiceQualityGrade = "good" | "poor" | "low"

export interface AudioTaskRecord {
  taskId: RecordingContext

  prompt: string

  durationSeconds: number

  audioBlobId?: string // Stored in IndexedDB

  audioUrl?: string

  quality: VoiceQualityGrade

  snrEstimateDb?: number

  speechRateWpm?: number

  timestamp: string
}

export interface AcousticBiomarkers {
  speechRateWpm: number

  pausePatternRatio: number // percentage

  /** Standard deviation of F0 across voiced frames, in Hz. */

  pitchVariationHz: number

  /** Mean fundamental frequency across voiced frames, in Hz. */

  f0MeanHz?: number

  jitterPercent: number // vocal frequency perturbation, RAP

  shimmerDb: number // vocal amplitude perturbation

  hnrDb: number // Harmonics-to-Noise Ratio

  /**
   * Whether the three perturbation measures above were actually measured.
   * False means the recording held too little voiced speech, and they must be
   * reported as unavailable rather than printed as numbers.
   */

  voiceQualityMeasured?: boolean
}

export interface MLInferenceResult {
  screeningRisk: ScreeningRisk

  confidenceScore: number // 0.0 - 1.0

  confidenceLevel: ConfidenceLevel

  classicalModel: {
    name: string // "Quantum-Classical Hybrid"

    riskScore: number

    aucScore: number
  }

  quantumHybridModel: {
    name: string // "PennyLane + PyTorch QNN"

    riskScore: number

    aucScore: number
  }

  shapContributions: {
    feature: string

    impact: "positive" | "negative" | "neutral"

    weight: number
  }[]

  /**
   * Monte Carlo Dropout predictive standard deviation (epistemic uncertainty).
   * Persisted alongside confidence so a stored result cannot be read back as more
   * settled than it was. Optional: absent on demo seeds and pre-existing records.
   */

  uncertaintyStd?: number

  /** Which protocol the recording was scored under by the backend. */

  iuScoringMode?: "canonical" | "proxy" | "empty"

  /** Canonical Information Units recognised in the description. */

  matchedInformationUnits?: number

  /**
   * How many of the 22 biomarkers fell outside the training support and were held
   * at the +/-3 sigma boundary. A non-zero count means the score is lower quality
   * than its confidence figure suggests.
   */

  clampedFeatureCount?: number
}

export interface ScreeningSession {
  id: string

  /** Stable cloud patient profile, absent on older local/demo records. */
  patientId?: string

  patientName: string

  patientAge: number

  language: LanguageCode

  assistedMode: boolean

  createdAt: string

  durationSeconds: number

  audioQuality: VoiceQualityGrade

  tasks: AudioTaskRecord[]

  biomarkers: AcousticBiomarkers

  mlResult: MLInferenceResult

  synced: boolean

  notes?: string
}

export interface OfflineSyncItem {
  id: string

  sessionId: string

  patientName: string

  createdAt: string

  sizeBytes: number

  status: "pending" | "syncing" | "synced" | "failed"

  retryCount: number

  lastAttempt?: string
}

export interface UserProfile {
  name: string

  age: number

  language: LanguageCode

  assistedMode: boolean

  caregiverPhone?: string

  dataSaver: boolean

  audioInstructions: boolean
}

export interface MonthlyTrendPoint {
  month: string

  riskScore: number
}

export interface DoctorPatientRecord {
  id: string

  name: string

  age: number

  village?: string

  language: string

  lastScreeningDate: string

  risk: ScreeningRisk

  confidence: ConfidenceLevel

  trend: MonthlyTrendPoint[]

  audioQuality: VoiceQualityGrade

  notes: string[]
}
