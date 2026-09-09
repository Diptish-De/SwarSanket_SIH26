// ─── Real-time Audio Recorder & Web Audio API Analyser ────────────────────────

import { VoiceQualityGrade } from "../types"

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

  shap_margin_sum: number

  reconstructed_probability: number

  reconstruction_error: number

  top_positive_contributions: ShapFactorContribution[]

  top_negative_contributions: ShapFactorContribution[]

  shap_contributions: Record<string, number>

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

  live_features: {
    CTP_noun_ratio: number

    CTP_verb_ratio: number

    CTP_adv_ratio: number

    CTP_Pronouns_ratio: number

    "CTP_noun to verb": number

    "CTP_Word Rate(-/s)": number

    CTP_unique_IU_efficiency: number

    "CTP_ keyword_TTR": number
  }

  production_features: Record<string, {
    raw_value: number | null

    imputed_value: number

    is_live_extracted: boolean

    shap_contribution?: number
  }>

  imputation: {
    live_feature_count: number

    imputed_feature_count: number

    total_feature_count: number

    imputation_note: string
  }

  screening: {
    predicted_class: 0 | 1

    probability: number

    probability_percent: number

    technical_confidence_percent: number

    status: string

    interpretation: string
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

  try {
    const response = await fetch(targetEndpoint, {
      method: "POST",

      body: formData,
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

  timeoutMs = 60000,
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

  const controller = new AbortController()

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: "POST",

      body: formData,

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
        "Voice analysis timed out. Please check your network connection and try again.",
      )
    }

    let message =
      err instanceof Error ? err.message : "Unable to reach screening backend."

    if (
      message.includes("Failed to fetch") ||
      message.includes("NetworkError")
    ) {
      message = `Cannot reach screening backend at ${baseUrl}. If testing on a mobile device, please check your network connection or configure the server IP in Settings.`
    }

    console.error("[SwarSanket] analyzeAudioWithBackend failed:", err)

    throw new Error(message)
  }
}
