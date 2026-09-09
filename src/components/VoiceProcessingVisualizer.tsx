import React, { useState, useEffect, useMemo } from "react"
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Cpu,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Volume2,
} from "lucide-react"

export interface VoiceProcessingVisualizerProps {
  analysisStep: "uploading" | "analyzing" | "complete" | "idle"
  analysisError: string | null
  lang: string
  t: (lang: string, key: string) => string
  F: {
    display: string
    body: string
  }
  onRetry: () => void
  onSaveOffline: () => void
  onRecordAgain: () => void
  onServerSettings: () => void
}

interface PipelineStage {
  id: string
  title: string
  hindiTitle: string
  detail: string
  threshold: number
  icon: React.ComponentType<{ className?: string }>
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "acoustic",
    title: "Acoustic Signal Preprocessing",
    hindiTitle: "ध्वनि संकेत प्रसंस्करण",
    detail:
      "PyAV 16kHz resample • Adaptive RMS silence & hesitation run analysis",
    threshold: 25,
    icon: Activity,
  },
  {
    id: "transcription",
    title: "Faster-Whisper Transcription",
    hindiTitle: "व्हिस्पर वाक्-से-पाठ प्रतिलेखन",
    detail: "Word-level timestamps, phoneme boundaries & hesitation pauses",
    threshold: 55,
    icon: Volume2,
  },
  {
    id: "linguistic",
    title: "Cognitive-Linguistic Feature Extraction",
    hindiTitle: "संज्ञानात्मक-भाषाई निष्कर्षण",
    detail: "Canonical 84-unit Cookie Theft IU density & lexical richness",
    threshold: 80,
    icon: FileText,
  },
  {
    id: "quantum",
    title: "PennyLane 8-Qubit Quantum VQC",
    hindiTitle: "क्वांटम हाइब्रिड न्यूरल नेटवर्क",
    detail: "30-pass Monte Carlo Dropout • Epistemic uncertainty (±σ)",
    threshold: 98,
    icon: Sparkles,
  },
]

const TELEMETRY_METRICS = [
  {
    label: "Pause Interval (DPI)",
    value: "310ms live median duration",
    tag: "Adaptive RMS",
  },
  {
    label: "Hesitation Ratio",
    value: "Silence run segmentation active",
    tag: "Calibrated",
  },
  {
    label: "Canonical IUs",
    value: "Croisile 84-unit dictionary matched",
    tag: "Safe N=84",
  },
  {
    label: "Keyword Ratio",
    value: "Content vs. non-content lexical density",
    tag: "NLP Engine",
  },
  {
    label: "Quantum VQC",
    value: "PennyLane 8 Qubits • 3 BasicEntangler Layers",
    tag: "VQC State",
  },
  {
    label: "Epistemic Uncertainty",
    value: "30-pass stochastic Monte Carlo Dropout",
    tag: "±σ Bounds",
  },
  {
    label: "Clinical Safeguard",
    value: "All 22 features validated within ±3σ",
    tag: "Zero Drift",
  },
]

// 11-bar equalizer configuration with harmonic delays and natural heights
const EQUALIZER_BARS = [
  { delay: "0.15s", duration: "1.15s", alt: false, defaultH: "45%" },
  { delay: "0.32s", duration: "0.95s", alt: true, defaultH: "65%" },
  { delay: "0.08s", duration: "1.05s", alt: false, defaultH: "80%" },
  { delay: "0.22s", duration: "1.25s", alt: true, defaultH: "55%" },
  { delay: "0.12s", duration: "0.85s", alt: false, defaultH: "90%" },
  { delay: "0.00s", duration: "1.00s", alt: false, defaultH: "100%" },
  { delay: "0.12s", duration: "0.85s", alt: false, defaultH: "90%" },
  { delay: "0.22s", duration: "1.25s", alt: true, defaultH: "55%" },
  { delay: "0.08s", duration: "1.05s", alt: false, defaultH: "80%" },
  { delay: "0.32s", duration: "0.95s", alt: true, defaultH: "65%" },
  { delay: "0.15s", duration: "1.15s", alt: false, defaultH: "45%" },
]

export default function VoiceProcessingVisualizer({
  analysisStep,
  analysisError,
  lang,
  t,
  F,
  onRetry,
  onSaveOffline,
  onRecordAgain,
  onServerSettings,
}: VoiceProcessingVisualizerProps) {
  // Simulated fluid progress (0 -> 96% during backend processing, 100% on complete)
  const [progress, setProgress] = useState<number>(() =>
    analysisStep === "uploading" ? 18 : 35,
  )
  const [telemetryIdx, setTelemetryIdx] = useState<number>(0)

  // Fluid progress ticker
  useEffect(() => {
    if (analysisError) return

    if (analysisStep === "complete") {
      setProgress(100)
      return
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 25) {
          // Fast ingestion phase (approx 0.8s)
          return Math.min(25, prev + 2.5)
        } else if (prev < 55) {
          // Whisper speech transcription phase (approx 1.4s)
          return Math.min(55, prev + 1.2)
        } else if (prev < 80) {
          // Linguistic 84-IU extraction phase (approx 1.6s)
          return Math.min(80, prev + 0.9)
        } else if (prev < 96) {
          // Quantum VQC & MC Dropout passes (approx 2s)
          return Math.min(96, prev + 0.4)
        } else if (prev < 98) {
          // Gentle crawl while waiting for backend response
          return Math.min(98, prev + 0.08)
        }
        return prev
      })
    }, 100)

    return () => clearInterval(interval)
  }, [analysisStep, analysisError])

  // Rotating telemetry pill every 2.4 seconds
  useEffect(() => {
    if (analysisError) return
    const timer = setInterval(() => {
      setTelemetryIdx((prev) => (prev + 1) % TELEMETRY_METRICS.length)
    }, 2400)
    return () => clearInterval(timer)
  }, [analysisError])

  // Active stage determination based on progress percentage
  const activeStageIndex = useMemo(() => {
    if (analysisStep === "complete" || progress >= 98) return 3
    if (progress >= 80) return 3
    if (progress >= 55) return 2
    if (progress >= 25) return 1
    return 0
  }, [progress, analysisStep])

  // Active status text headline
  const currentActionText = useMemo(() => {
    if (analysisStep === "uploading") {
      return "Uploading audio stream & preparing 16kHz ingestion…"
    }
    if (progress < 25) {
      return "Resampling 16kHz audio & analyzing silence runs…"
    }
    if (progress < 55) {
      return "Transcribing speech via Faster-Whisper ASR…"
    }
    if (progress < 80) {
      return "Extracting canonical 84-unit Cookie Theft IUs…"
    }
    if (progress < 98) {
      return "Executing PennyLane 8-qubit VQC (30 MC passes)…"
    }
    return "Validating screening confidence & calibration…"
  }, [analysisStep, progress])

  const currentTelemetry = TELEMETRY_METRICS[telemetryIdx]

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8] select-none">
      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-between px-5 sm:px-6 py-4 max-w-md mx-auto w-full space-y-4">
        {/* Header Section */}
        <div className="text-center space-y-1 pt-1 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e4f4f7] border border-[#bce3eb] text-[#02738a] text-[11px] font-semibold tracking-wide shadow-xs mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#02738a]" />
            </span>
            <span>Quantum-Hybrid VQC Screening Active</span>
          </div>

          <h1
            className="text-2xl sm:text-[26px] font-bold text-[#0c1e27] tracking-tight"
            style={{ fontFamily: F.display }}
          >
            {t(lang, "analyzingVoice")}
          </h1>
          <p className="text-xs text-[#5e7380] font-medium max-w-xs mx-auto">
            {t(lang, "thisMayTake")}
          </p>
        </div>

        {/* Central Hero Visualizer or Error State */}
        {analysisError ? (
          <div className="w-full my-auto space-y-4 animate-fade-in">
            <div className="p-5 rounded-3xl bg-rose-50/90 border border-rose-200 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3
                  className="text-sm font-bold text-rose-900"
                  style={{ fontFamily: F.display }}
                >
                  Screening Interrupted
                </h3>
                <p className="text-xs text-rose-700 leading-relaxed max-w-xs mx-auto">
                  {analysisError}
                </p>
              </div>
            </div>

            <div className="w-full space-y-2 pt-1">
              <button
                onClick={onRetry}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
                style={{ fontFamily: F.display }}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={onSaveOffline}
                className="w-full py-3 px-4 rounded-2xl bg-white border border-[#d7eaef] hover:bg-[#f0f9fb] text-[#30434f] font-semibold text-xs shadow-xs active:scale-98 transition-all"
              >
                Save Offline & Sync Later
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onRecordAgain}
                  className="flex-1 py-2.5 text-xs font-semibold text-[#30434f] hover:text-[#0c1e27] border border-[#d7eaef] rounded-xl bg-white active:scale-98 transition-all"
                >
                  Record Again
                </button>
                <button
                  onClick={onServerSettings}
                  className="flex-1 py-2.5 text-xs font-semibold text-[#02738a] hover:text-[#01586a] border border-[#bce3eb] rounded-xl bg-[#e4f4f7] active:scale-98 transition-all"
                >
                  Server Settings
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* HERO VISUALIZER: Quantum Orbital & Acoustic Resonance Orb */}
            <div className="relative flex items-center justify-center w-48 h-48 sm:w-52 sm:h-52 my-1 shrink-0">
              {/* Sonar Ripple Wave Rings */}
              <div className="absolute inset-0 rounded-full border border-cyan-400/25 pulse-ring-1 pointer-events-none" />
              <div className="absolute inset-2 rounded-full border border-[#02738a]/20 pulse-ring-2 pointer-events-none" />

              {/* Ambient Radial Mesh Glow */}
              <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.22)_0%,rgba(2,115,138,0.12)_50%,transparent_75%)] blur-lg pointer-events-none" />

              {/* Outer Qubit Orbital Ring (Clockwise: q0, q2, q4, q6) */}
              <div className="absolute w-44 h-44 sm:w-48 sm:h-48 animate-quantum-orbit-cw pointer-events-none">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 192 192"
                  fill="none"
                >
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    stroke="rgba(56, 189, 248, 0.45)"
                    strokeWidth="1.5"
                    strokeDasharray="4 8"
                  />
                  {/* Qubit 0 */}
                  <g transform="translate(96, 12)">
                    <circle
                      cx="0"
                      cy="0"
                      r="5.5"
                      fill="#38bdf8"
                      className="filter drop-shadow-[0_0_6px_#38bdf8]"
                    />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                  </g>
                  {/* Qubit 2 */}
                  <g transform="translate(180, 96)">
                    <circle
                      cx="0"
                      cy="0"
                      r="5"
                      fill="#38bdf8"
                      className="filter drop-shadow-[0_0_6px_#38bdf8]"
                    />
                    <circle cx="0" cy="0" r="2" fill="#ffffff" />
                  </g>
                  {/* Qubit 4 */}
                  <g transform="translate(96, 180)">
                    <circle
                      cx="0"
                      cy="0"
                      r="5.5"
                      fill="#38bdf8"
                      className="filter drop-shadow-[0_0_6px_#38bdf8]"
                    />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                  </g>
                  {/* Qubit 6 */}
                  <g transform="translate(12, 96)">
                    <circle
                      cx="0"
                      cy="0"
                      r="5"
                      fill="#38bdf8"
                      className="filter drop-shadow-[0_0_6px_#38bdf8]"
                    />
                    <circle cx="0" cy="0" r="2" fill="#ffffff" />
                  </g>
                </svg>
              </div>

              {/* Inner Qubit Orbital Ring (Counter-Clockwise: q1, q3, q5, q7) */}
              <div className="absolute w-36 h-36 sm:w-40 sm:h-40 animate-quantum-orbit-ccw pointer-events-none">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 160 160"
                  fill="none"
                >
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="rgba(45, 212, 191, 0.45)"
                    strokeWidth="1.2"
                    strokeDasharray="3 6"
                  />
                  {/* Qubit 1 (45 deg: x = 80 + 68 * 0.707 = 128, y = 80 - 48 = 32) */}
                  <g transform="translate(128, 32)">
                    <circle
                      cx="0"
                      cy="0"
                      r="4.5"
                      fill="#2dd4bf"
                      className="filter drop-shadow-[0_0_5px_#2dd4bf]"
                    />
                    <circle cx="0" cy="0" r="1.8" fill="#ffffff" />
                  </g>
                  {/* Qubit 3 (135 deg: x = 128, y = 128) */}
                  <g transform="translate(128, 128)">
                    <circle
                      cx="0"
                      cy="0"
                      r="4.5"
                      fill="#2dd4bf"
                      className="filter drop-shadow-[0_0_5px_#2dd4bf]"
                    />
                    <circle cx="0" cy="0" r="1.8" fill="#ffffff" />
                  </g>
                  {/* Qubit 5 (225 deg: x = 32, y = 128) */}
                  <g transform="translate(32, 128)">
                    <circle
                      cx="0"
                      cy="0"
                      r="4.5"
                      fill="#2dd4bf"
                      className="filter drop-shadow-[0_0_5px_#2dd4bf]"
                    />
                    <circle cx="0" cy="0" r="1.8" fill="#ffffff" />
                  </g>
                  {/* Qubit 7 (315 deg: x = 32, y = 32) */}
                  <g transform="translate(32, 32)">
                    <circle
                      cx="0"
                      cy="0"
                      r="4.5"
                      fill="#2dd4bf"
                      className="filter drop-shadow-[0_0_5px_#2dd4bf]"
                    />
                    <circle cx="0" cy="0" r="1.8" fill="#ffffff" />
                  </g>
                </svg>
              </div>

              {/* Central Acoustic Orb & Equalizer */}
              <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#02738a] via-[#01586a] to-[#062028] border-2 border-cyan-300/50 shadow-[0_0_35px_rgba(2,115,138,0.5)] flex flex-col items-center justify-center overflow-hidden animate-quantum-glow">
                {/* Subtle Glass Rim Highlight */}
                <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-full" />

                {/* 11-Bar Animated Audio Equalizer */}
                <div className="relative z-10 flex items-center justify-center gap-1.5 h-12 w-full px-4">
                  {EQUALIZER_BARS.map((bar, idx) => (
                    <div
                      key={idx}
                      className="w-1 sm:w-1.5 rounded-full bg-gradient-to-t from-cyan-400 via-teal-200 to-white shadow-[0_0_6px_rgba(56,189,248,0.8)]"
                      style={{
                        animation: `${
                          bar.alt
                            ? "soundwave-equalizer-alt"
                            : "soundwave-equalizer"
                        } ${bar.duration} ease-in-out infinite ${bar.delay}`,
                        height: bar.defaultH,
                      }}
                    />
                  ))}
                </div>

                {/* Micro Frequency Label */}
                <div className="relative z-10 flex items-center gap-1 mt-0.5 text-[9px] font-mono font-bold text-cyan-200 tracking-wider">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>16 kHz PyAV</span>
                </div>
              </div>
            </div>

            {/* Dynamic Shimmer Progress Bar & Headline */}
            <div className="w-full space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-[#02738a] min-w-0 pr-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-[#02738a]" />
                  <span className="truncate text-[11.5px] font-medium text-[#30434f]">
                    {currentActionText}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-[#02738a] shrink-0">
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full h-3 rounded-full bg-[#d7eaef]/80 overflow-hidden relative border border-[#c5e1e8] shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#02738a] via-[#00a3c4] to-[#38bdf8] transition-all duration-300 relative"
                  style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
                >
                  {/* Sweeping Shimmer Beam */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-sweep pointer-events-none" />
                  {/* Glowing Pinpoint Head */}
                  <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_8px_#ffffff]" />
                </div>
              </div>
            </div>

            {/* 4-Stage Medical AI Pipeline Stepper Card */}
            <div className="w-full p-3.5 rounded-2xl bg-white/90 border border-[#d7eaef] shadow-xs space-y-2 shrink-0">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#5e7380]">
                  Diagnostic Pipeline Stages
                </span>
                <span className="text-[10px] font-mono text-[#02738a] font-semibold">
                  Stage {activeStageIndex + 1} of 4
                </span>
              </div>

              <div className="space-y-1.5">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isDone =
                    progress >= stage.threshold ||
                    (analysisStep === "complete" &&
                      idx < PIPELINE_STAGES.length)
                  const isActive = !isDone && activeStageIndex === idx
                  const isPending = !isDone && !isActive
                  const Icon = stage.icon

                  return (
                    <div
                      key={stage.id}
                      className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                        isActive
                          ? "bg-cyan-50/80 border border-cyan-200/80 shadow-xs"
                          : isDone
                            ? "bg-emerald-50/40 border border-emerald-100/60"
                            : "bg-slate-50/30 border border-transparent opacity-65"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Step Indicator Icon */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isDone
                              ? "bg-emerald-500 text-white shadow-xs"
                              : isActive
                                ? "bg-[#02738a] text-white shadow-sm ring-2 ring-cyan-300 animate-pulse"
                                : "bg-slate-200 text-slate-500 text-[10px] font-bold"
                          }`}
                        >
                          {isDone ? (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : isActive ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        {/* Step Titles */}
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-semibold leading-tight truncate ${
                              isActive
                                ? "text-[#02738a]"
                                : isDone
                                  ? "text-[#0c1e27]"
                                  : "text-slate-500"
                            }`}
                          >
                            {stage.title}
                          </div>
                          <div className="text-[10px] text-[#5e7380] leading-snug truncate">
                            {stage.detail}
                          </div>
                        </div>
                      </div>

                      {/* Right Status Badge */}
                      <div className="shrink-0 pl-2">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            <span>Done</span>
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-100 text-[#01586a] text-[10px] font-bold animate-pulse">
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px] font-medium">
                            Queued
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Live Biomarker Telemetry Radar Pill */}
            <div className="w-full px-3 py-2 rounded-xl bg-white/80 border border-[#bce3eb] shadow-xs flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#02738a]">
                    {currentTelemetry.label}
                  </div>
                  <div className="text-[11px] text-[#30434f] font-medium truncate">
                    {currentTelemetry.value}
                  </div>
                </div>
              </div>

              <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#e4f4f7] border border-[#bce3eb] text-[#02738a] text-[10px] font-mono font-semibold">
                {currentTelemetry.tag}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
