import React, { useState, useEffect } from "react"
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"

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
  // Smooth realistic progress counter
  const [progress, setProgress] = useState<number>(() =>
    analysisStep === "uploading" ? 20 : 40,
  )

  useEffect(() => {
    if (analysisError) return

    if (analysisStep === "complete") {
      setProgress(100)
      return
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 25) {
          return Math.min(25, prev + 2.0)
        } else if (prev < 60) {
          return Math.min(60, prev + 1.2)
        } else if (prev < 88) {
          return Math.min(88, prev + 0.8)
        } else if (prev < 96) {
          return Math.min(96, prev + 0.3)
        }
        return prev
      })
    }, 100)

    return () => clearInterval(interval)
  }, [analysisStep, analysisError])

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto items-center justify-center px-7 bg-[#f3f9fb] animate-fade-in select-none">
      <div className="w-full max-w-sm flex flex-col items-center space-y-6">
        {analysisError ? (
          /* Error State */
          <div className="w-full space-y-4 animate-fade-in">
            <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-rose-800 leading-relaxed">
                {analysisError}
              </p>
            </div>

            <div className="w-full space-y-2 pt-1">
              <button
                onClick={onRetry}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
                style={{ fontFamily: F.display }}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={onSaveOffline}
                className="w-full py-2.5 px-4 rounded-2xl bg-white border border-[#d7eaef] hover:bg-[#f0f9fb] text-[#30434f] font-semibold text-xs shadow-xs active:scale-98 transition-all"
              >
                Save Offline & Sync Later
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onRecordAgain}
                  className="flex-1 py-2 text-xs font-semibold text-[#30434f] hover:text-[#0c1e27] border border-[#d7eaef] rounded-xl bg-white active:scale-98 transition-all"
                >
                  Record Again
                </button>
                <button
                  onClick={onServerSettings}
                  className="flex-1 py-2 text-xs font-semibold text-[#02738a] hover:text-[#01586a] border border-[#bce3eb] rounded-xl bg-[#e4f4f7] active:scale-98 transition-all"
                >
                  Server Settings
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Clean Simple Voice Processing View */
          <>
            {/* Simple Animated Audio Waveform Hero */}
            <div className="relative flex items-center justify-center my-2">
              <div
                className="absolute w-24 h-24 rounded-3xl bg-[#02738a]/10 animate-ping opacity-40 pointer-events-none"
                style={{ animationDuration: "2.8s" }}
              />
              <div className="w-24 h-24 rounded-3xl bg-[#e4f4f7] border border-[#d7eaef] text-[#02738a] flex items-center justify-center shadow-inner relative z-10">
                {/* 5-Bar Clean Audio Equalizer Waveform */}
                <div className="flex items-center gap-1.5 h-11">
                  {[
                    { h: "14px", delay: "0.15s" },
                    { h: "28px", delay: "0.35s" },
                    { h: "38px", delay: "0s" },
                    { h: "26px", delay: "0.2s" },
                    { h: "16px", delay: "0.4s" },
                  ].map((bar, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-[#02738a] animate-pulse"
                      style={{
                        height: bar.h,
                        animationDelay: bar.delay,
                        animationDuration: "1.3s",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-1">
              <h1
                className="text-2xl font-bold text-[#0c1e27]"
                style={{ fontFamily: F.display }}
              >
                {t(lang, "analyzingVoice")}
              </h1>
              <p className="text-xs text-[#5e7380]">{t(lang, "thisMayTake")}</p>
            </div>

            {/* Simple Clean Progress Bar */}
            <div className="w-full space-y-2">
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#02738a] to-[#015364] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, progress))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#5e7380] font-medium">
                <span>
                  {analysisStep === "uploading"
                    ? "Uploading voice recording…"
                    : progress < 85
                      ? "Extracting acoustic & linguistic features…"
                      : "Evaluating screening signal…"}
                </span>
                <span className="font-semibold text-[#02738a]">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Checklist Card */}
            <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] space-y-3 text-xs text-[#30434f] shadow-xs">
              {/* Step 1: Whisper ASR */}
              <div className="flex items-center gap-2.5">
                {progress >= 25 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-[#02738a] border-t-transparent animate-spin shrink-0" />
                )}
                <span
                  className={
                    progress >= 25
                      ? "font-medium text-[#0c1e27]"
                      : "text-[#5e7380]"
                  }
                >
                  Whisper ASR word-level transcription
                </span>
              </div>

              {/* Step 2: spaCy linguistic features */}
              <div className="flex items-center gap-2.5">
                {progress >= 60 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : progress >= 25 ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#02738a] border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                )}
                <span
                  className={
                    progress >= 60
                      ? "font-medium text-[#0c1e27]"
                      : "text-[#5e7380]"
                  }
                >
                  spaCy linguistic feature extraction
                </span>
              </div>

              {/* Step 3: Validated 22-feature Quantum-Hybrid VQC screening engine */}
              <div className="flex items-center gap-2.5">
                {progress >= 88 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : progress >= 60 ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#02738a] border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                )}
                <span
                  className={
                    progress >= 88
                      ? "font-medium text-[#0c1e27]"
                      : "text-[#5e7380]"
                  }
                >
                  Validated 22-feature Quantum-Hybrid VQC screening engine
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
