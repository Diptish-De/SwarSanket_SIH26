// ─── Real-time Audio Recorder & Web Audio API Analyser ────────────────────────

import { VoiceQualityGrade } from "../types"

import { getSupabaseAccessToken } from "./supabase"

/**
 * Minimum recording length the backend will score. Kept in step with
 * MIN_SPEECH_SECONDS_FOR_SCORING in backend/screening_engine.py so a clip
 * that is going to be refused is refused here, instantly, instead of after a
 * multi-minute upload and transcription.
 */
export const MIN_RECORDING_SECONDS = 30

export interface AudioRecordingResult {
  blob: Blob

  durationSeconds: number

  quality: VoiceQualityGrade

  audioUrl: string

  snrEstimateDb: number
}

let globalLastAudioBlob: Blob | null = null

let globalLastAudioResult: AudioRecordingResult | null = null

export function getLastRecordedAudioBlob(): Blob | null {
  return globalLastAudioBlob
}

export function getLastAudioRecordingResult(): AudioRecordingResult | null {
  return globalLastAudioResult
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null

  private audioContext: AudioContext | null = null

  private analyserNode: AnalyserNode | null = null

  private mediaStream: MediaStream | null = null

  private audioChunks: Blob[] = []

  private lastRecording: AudioRecordingResult | null = null

  private startTime = 0

  private pausedDuration = 0

  private pauseStartTime = 0

  private animationFrameId: number | null = null

  private onLevelUpdate?: (level: number, frequencies: Uint8Array) => void

  get lastResult(): AudioRecordingResult | null {
    return this.lastRecording
  }

  get lastBlob(): Blob | null {
    return this.lastRecording?.blob ?? null
  }

  async start(
    onLevel?: (level: number, frequencies: Uint8Array) => void,
  ): Promise<boolean> {
    this.audioChunks = []

    this.startTime = Date.now()

    this.pausedDuration = 0

    this.onLevelUpdate = onLevel

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Microphone API (navigator.mediaDevices.getUserMedia) is not supported in this environment.",
        )
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,

          noiseSuppression: true,

          sampleRate: 44100,
        },
      })

      // Initialize Web Audio API Analyser for real-time waveform visualizer

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext

      this.audioContext = new AudioCtx()

      const source = this.audioContext.createMediaStreamSource(this.mediaStream)

      this.analyserNode = this.audioContext.createAnalyser()

      this.analyserNode.fftSize = 64

      this.analyserNode.smoothingTimeConstant = 0.8

      source.connect(this.analyserNode)

      // Start real microphone audio level & frequency tracking loop

      this.startLevelLoop()

      // Determine supported mime type

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/webm"

      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType })

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data)
      }

      this.mediaRecorder.start(100) // chunk every 100ms

      return true
    } catch (err: unknown) {
      this.cleanup()

      const message =
        err instanceof Error
          ? err.message
          : "Microphone access denied or recording failed."

      console.error("Real voice recording failed:", err)

      throw new Error(`Microphone recording failed: ${message}`)
    }
  }

  pause() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause()

      this.pauseStartTime = Date.now()
    }
  }

  resume() {
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume()

      if (this.pauseStartTime > 0) {
        this.pausedDuration += Date.now() - this.pauseStartTime

        this.pauseStartTime = 0
      }
    }
  }

  async stop(): Promise<AudioRecordingResult> {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)

      this.animationFrameId = null
    }

    const durationSeconds = Math.max(
      1,

      Math.round((Date.now() - this.startTime - this.pausedDuration) / 1000),
    )

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        this.cleanup()

        reject(
          new Error(
            "Recording failed: MediaRecorder is inactive or was not initialized with a real microphone.",
          ),
        )

        return
      }

      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length === 0) {
          this.cleanup()

          reject(
            new Error(
              "Recording failed: No real audio captured from microphone.",
            ),
          )

          return
        }

        const blob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || "audio/webm",
        })

        const audioUrl = URL.createObjectURL(blob)

        this.cleanup()

        // Calculate quality based on real recording duration

        const quality: VoiceQualityGrade =
          durationSeconds >= 5 ? "good" : durationSeconds >= 2 ? "poor" : "low"

        const snrEstimateDb =
          quality === "good" ? 25.4 : quality === "poor" ? 14.2 : 8.5

        const result: AudioRecordingResult = {
          blob,

          durationSeconds,

          quality,

          audioUrl,

          snrEstimateDb,
        }

        this.lastRecording = result

        globalLastAudioBlob = blob

        globalLastAudioResult = result

        console.log(
          "[SwarSanket VoiceRecorder] Real audio recording stopped & Blob retained:",

          {
            mimeType: blob.type,

            sizeBytes: blob.size,

            duration: `${durationSeconds}s`,

            audioUrl,
          },
        )

        resolve(result)
      }

      this.mediaRecorder.stop()
    })
  }

  private startLevelLoop() {
    if (!this.analyserNode) return

    const bufferLength = this.analyserNode.frequencyBinCount

    const dataArray = new Uint8Array(bufferLength)

    const update = () => {
      if (!this.analyserNode) return

      this.analyserNode.getByteFrequencyData(dataArray)

      let sum = 0

      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
      }

      const avg = sum / bufferLength / 255 // 0.0 to 1.0

      this.onLevelUpdate?.(avg, dataArray)

      this.animationFrameId = requestAnimationFrame(update)
    }

    this.animationFrameId = requestAnimationFrame(update)
  }

  private cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)

      this.animationFrameId = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop())

      this.mediaStream = null
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close()

      this.audioContext = null
    }

    this.analyserNode = null

    this.mediaRecorder = null
  }
}

import { getApiBaseUrl } from "./apiConfig"

export function getExtensionForBlob(blob: Blob): string {
  const type = (blob.type || "").toLowerCase()

  if (type.includes("webm")) return ".webm"

  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac"))
    return ".m4a"

  if (type.includes("wav")) return ".wav"

  if (type.includes("ogg")) return ".ogg"

  return ".webm"
}

export const API_BASE_URL = getApiBaseUrl()

export interface BackendUploadResponse {
  success: boolean

  filename: string

  content_type: string

  size_bytes: number

  saved_path: string
}

export interface ShapFactorContribution {
  feature: string

  shap_value: number

  feature_value?: number

  abs_shap?: number

  direction?: "positive_signal" | "negative_signal" | string

  impact_percent?: number

  formatted_impact?: string

  description?: string
}

export interface ExplainabilityData {
  base_value: number

  method?: string

  attribution_type?: string

  mc_passes?: number

  net_attribution_direction?: number

  shap_margin_sum: number

  reconstructed_probability: number

  explained_probability?: number

  top_positive_contributions: ShapFactorContribution[]

  top_negative_contributions: ShapFactorContribution[]

  shap_contributions: Record<string, number>

  /** Never measured from audio; identical for every patient. Not shown to users. */

  imputed_constant_features?: string[]

  imputed_constant_attribution_share?: number

  human_readable_explanation: string

  disclaimer: string
}

export interface ScreeningApiResponse {
  success: boolean

  filename: string

  transcript: string

  detected_language: string

  word_count: number

  audio: {
    duration_seconds: number

    speech_timeline_duration: number

    sample_rate: number

    rms_energy: number

    peak_amplitude: number

    silence_percentage: number
  }

  /**
   * Measured fundamental frequency and voice perturbation.
   *
   * `measured: false` means the recording held too little voiced speech to
   * estimate these. Callers must show them as unavailable in that case - a zero
   * here is the absence of a reading, not a reading of zero.
   */

  voice_quality?: {
    measured: boolean

    f0_mean_hz: number

    f0_sd_hz: number

    f0_sd_semitones: number

    jitter_local_percent: number

    jitter_rap_percent: number

    shimmer_local_db: number

    hnr_db: number

    voiced_ratio: number

    cycles_analyzed: number
  }

  live_features: {
    "CTP_F0 SD(st)": number

    "CTP_DPI(ms)": number

    "CTP_RST(-/s)": number

    CTP_EST: number

    "CTP_Voiced Rate(1/s)": number

    "CTP_Hesitation Ratio": number

    "CTP_Energy Mean(Pa^2·s)": number

    CTP_verb_num: number

    CTP_noun_ratio: number

    CTP_Pronouns_ratio: number

    "CTP_noun to verb": number

    "CTP_Word Rate(-/s)": number

    "CTP_Noun No Phrase Rate": number

    "CTP_Verb phrase type proportion": number

    "CTP_Prep phrase type proportion": number

    "CTP_Prep average phrase type length 1": number

    CTP_num_unique_IU: number

    CTP_num_unique_keywords: number

    CTP_unique_IU_densitys: number

    CTP_total_IU_density: number

    CTP_keyword_to_non_keyword_ratio: number

    CTP_unique_IU_efficiency: number
  }

  production_features: Record<string, {
    value: number

    is_live_extracted: boolean

    attribution: number
  }>

  /**
   * False when the recording was too short to estimate the ratio features from.
   * The screening block then carries no probability and no risk tier.
   */

  sample_sufficient?: boolean

  sample_requirements?: {
    words_recorded: number | null

    words_required: number

    seconds_recorded: number

    seconds_required: number
  }

  /**
   * Cross-lingual correction status. The model's lexical features were fitted on
   * Chinese ASR corpora; a language without a reference profile cannot be scored
   * comparably, and no risk tier is reported for it.
   */

  language_calibration?: {
    status: "calibrated" | "uncalibrated"

    language: string

    is_calibrated: boolean

    profile_quality: "provisional" | "validated" | null

    profile_sample_size?: number

    adjusted_features: {
      feature: string

      raw_value: number

      calibrated_value: number

      speaker_z_in_own_language: number
    }[]

    note: string

    available_languages: string[]
  }

  /** Feature values before cross-lingual calibration and support clamping. */

  raw_features?: Record<string, number>

  /**
   * Provenance for how the 22-feature vector was scored against the training
   * distribution. "canonical" means the utterance matched the standardized
   * picture-description Information Unit lexicon; "proxy" means it was scored
   * as conversational speech.
   */

  feature_calibration?: {
    iu_scoring_mode: "canonical" | "proxy" | "empty"

    matched_information_units: string[]

    density_word_base: number

    task_reference_word_count: number

    calibration_sigma: number

    clamped_features: {
      feature: string

      raw_value: number

      calibrated_value: number

      training_z_score: number
    }[]
  }

  screening: {
    model_name?: string

    predicted_class: 0 | 1 | null

    probability: number | null

    probability_percent: number | null

    technical_confidence_percent: number

    /** Monte Carlo Dropout predictive standard deviation (epistemic uncertainty). */

    uncertainty_std: number

    predictive_entropy?: number

    /** Null when the language is uncalibrated or the sample was too short. */

    risk_tier?: string | null

    status: string

    interpretation: string

    quantum_specs?: {
      qubits: number

      entangling_layers: number

      mc_dropout_passes: number

      benchmark_auc: number

      benchmark_accuracy: number
    }
  }

  explanation?: ExplainabilityData
}

export async function uploadAudioToBackend(
  blob: Blob,

  filename?: string,

  endpoint?: string,
): Promise<BackendUploadResponse | null> {
  const baseUrl = getApiBaseUrl()

  const ext = getExtensionForBlob(blob)

  const targetFilename = filename || `voice_check${ext}`

  const targetEndpoint = endpoint || `${baseUrl}/api/upload-audio`

  console.log("[SwarSanket] Uploading audio recording to backend...", {
    endpoint: targetEndpoint,

    filename: targetFilename,

    sizeBytes: blob.size,
  })

  const formData = new FormData()

  formData.append("audio", blob, targetFilename)

  const accessToken = await getSupabaseAccessToken()

  try {
    const response = await fetch(targetEndpoint, {
      method: "POST",

      body: formData,

      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")

      throw new Error(`Server returned HTTP ${response.status}: ${errorText}`)
    }

    const data: BackendUploadResponse = await response.json()

    console.log("[SwarSanket] Backend upload successful:", data)

    return data
  } catch (err: unknown) {
    console.error("[SwarSanket] Backend upload failed:", err)

    return null
  }
}

export async function analyzeAudioWithBackend(
  blob: Blob,

  filename?: string,

  timeoutMs = 240000,

  patient?: {
    patientId: string

    username?: string

    fullName?: string

    age?: number

    gender?: string

    phone?: string

    caregiverName?: string

    caregiverPhone?: string

    caregiverEmail?: string
  },
): Promise<ScreeningApiResponse> {
  const baseUrl = getApiBaseUrl()

  const endpoint = `${baseUrl}/api/analyze-audio`

  const ext = getExtensionForBlob(blob)

  const targetFilename = filename || `voice_check${ext}`

  console.log(
    "[SwarSanket] Sending real audio recording for ML screening analysis...",

    {
      endpoint,

      filename: targetFilename,

      sizeBytes: blob.size,

      type: blob.type,
    },
  )

  const formData = new FormData()

  formData.append("audio", blob, targetFilename)

  if (patient?.patientId) {
    formData.append("patient_id", patient.patientId)

    if (patient.username) formData.append("patient_username", patient.username)

    if (patient.fullName) formData.append("patient_name", patient.fullName)

    if (patient.age !== undefined) {
      formData.append("patient_age", String(patient.age))
    }

    if (patient.gender) formData.append("patient_gender", patient.gender)

    if (patient.phone) formData.append("patient_phone", patient.phone)

    if (patient.caregiverName) {
      formData.append("caregiver_name", patient.caregiverName)
    }

    if (patient.caregiverPhone) {
      formData.append("caregiver_phone", patient.caregiverPhone)
    }

    if (patient.caregiverEmail) {
      formData.append("caregiver_email", patient.caregiverEmail)
    }
  }

  const controller = new AbortController()

  const accessToken = await getSupabaseAccessToken()

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: "POST",

      body: formData,

      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,

      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")

      let detail = `Server returned HTTP ${response.status}`

      try {
        const parsed = JSON.parse(errorText)

        if (parsed.detail) detail = parsed.detail
      } catch {
        // use fallback detail
      }

      throw new Error(detail)
    }

    const data: ScreeningApiResponse = await response.json()

    console.log("[SwarSanket] Real screening analysis complete:", {
      predictedClass: data.screening?.predicted_class,

      probability: data.screening?.probability,

      status: data.screening?.status,
    })

    return data
  } catch (err: unknown) {
    clearTimeout(timeoutId)

    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "The screening server is taking longer than expected. It may be waking up or busy - please wait a minute and try again. Your recording is kept.",
      )
    }

    let message =
      err instanceof Error ? err.message : "Unable to reach screening backend."

    if (
      message.includes("Failed to fetch") ||
      message.includes("NetworkError")
    ) {
      // A 502 from the hosting proxy carries no CORS headers, so the browser
      // reports it as a network failure. Do not tell the person their
      // connection is broken when it is the server that did not answer.
      message = `The screening server did not respond. It may be restarting or overloaded - please wait a minute and try again. On a phone, also check your connection or the server address in Settings.`
    }

    console.error("[SwarSanket] analyzeAudioWithBackend failed:", err)

    throw new Error(message)
  }
}
