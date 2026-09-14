import { useEffect, useRef, useState } from "react"

import { CheckCircle2, Ear, Loader2, RefreshCw, Volume2 } from "lucide-react"

import { measureAmbientNoise, NoiseReading } from "../services/noiseCheck"

/**
 * Ambient noise pre-flight, shown immediately before recording.
 *
 * Two deliberate choices for this audience:
 *
 *   - A noisy room NEVER hard-blocks. It warns and still offers to continue.
 *     Someone in a PHC waiting room or a one-room home may have no quieter
 *     option, and a screening they cannot start at all is worse than one
 *     recorded in imperfect conditions and flagged as such.
 *   - The instruction is to stay quiet, phrased as something being done FOR the
 *     person rather than a test they might fail.
 */

export default function NoiseCheckCard({
  onDone,

  onSkip,

  fontFamily,

  labels,
}: {
  onDone: (reading: NoiseReading) => void

  onSkip: () => void

  fontFamily?: string

  labels?: {
    title?: string

    instruction?: string

    listening?: string

    continueAnyway?: string

    checkAgain?: string

    begin?: string
  }
}) {
  const [reading, setReading] = useState<NoiseReading | null>(null)

  const [progress, setProgress] = useState(0)

  const [level, setLevel] = useState(-100)

  const [running, setRunning] = useState(false)

  const cancelled = useRef(false)

  const t = {
    title: labels?.title ?? "Checking the room",

    instruction:
      labels?.instruction ?? "Please stay quiet for a moment while we listen.",

    listening: labels?.listening ?? "Listening…",

    continueAnyway: labels?.continueAnyway ?? "Continue Anyway",

    checkAgain: labels?.checkAgain ?? "Check Again",

    begin: labels?.begin ?? "Start Recording",
  }

  const run = async () => {
    setRunning(true)

    setReading(null)

    setProgress(0)

    const result = await measureAmbientNoise(3000, (fraction, db) => {
      if (cancelled.current) return

      setProgress(fraction)

      setLevel(db)
    })

    if (cancelled.current) return

    setReading(result)

    setRunning(false)
  }

  useEffect(() => {
    cancelled.current = false

    void run()

    return () => {
      cancelled.current = true
    }

    // Runs once on mount; re-checking is driven by the button.

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Map dBFS onto a bar. -70 is inaudible, -30 is loud; anything outside clamps.

  const meterWidth = Math.max(0, Math.min(100, ((level + 70) / 40) * 100))

  const tone =
    reading?.verdict === "quiet"
      ? {
          bg: "bg-emerald-50",

          border: "border-emerald-200",

          text: "text-emerald-700",

          bar: "bg-emerald-500",
        }
      : reading?.verdict === "fair"
        ? {
            bg: "bg-amber-50",

            border: "border-amber-200",

            text: "text-amber-700",

            bar: "bg-amber-500",
          }
        : reading?.verdict === "noisy"
          ? {
              bg: "bg-rose-50",

              border: "border-rose-200",

              text: "text-rose-700",

              bar: "bg-rose-500",
            }
          : {
              bg: "bg-slate-50",

              border: "border-slate-200",

              text: "text-slate-600",

              bar: "bg-slate-400",
            }

  return (
    <div
      className={`rounded-3xl border-2 p-5 space-y-4 transition-colors ${tone.bg} ${tone.border}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-2xl bg-white flex items-center justify-center border ${tone.border} shrink-0`}
        >
          {running ? (
            <Loader2 className={`w-5 h-5 animate-spin ${tone.text}`} />
          ) : reading?.verdict === "quiet" ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          ) : (
            <Ear className={`w-5 h-5 ${tone.text}`} />
          )}
        </div>

        <div className="min-w-0">
          <h3
            className="font-bold text-base text-slate-900"
            style={{ fontFamily }}
          >
            {t.title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
            {running ? t.instruction : (reading?.message ?? t.instruction)}
          </p>
        </div>
      </div>

      {/* Live level meter. Movement here is what tells a patient the app is
          actually listening, which a spinner alone does not convey. */}
      <div className="space-y-1.5">
        <div className="h-2.5 rounded-full bg-white/80 overflow-hidden border border-black/5">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${tone.bar}`}
            style={{
              width: `${running ? meterWidth : progress > 0 ? 100 : 0}%`,
            }}
          />
        </div>

        {running && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Volume2 className="w-3 h-3" />
            <span>{t.listening}</span>
          </div>
        )}
      </div>

      {reading && !running && (
        <>
          {/* Numbers stay secondary: useful to a clinician reviewing the
              session, never the thing a patient has to interpret. */}
          {reading.verdict !== "unknown" && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>
                Background: <strong>{reading.noiseFloorDb} dB</strong>
              </span>
              <span>
                Expected clarity: <strong>{reading.projectedSnrDb} dB</strong>
              </span>
              {reading.steadyHum && <span>Fan or machine detected</span>}
              {reading.intermittent && <span>Noise coming and going</span>}
            </div>
          )}

          <div className="flex gap-2 pt-0.5">
            <button
              onClick={() => void run()}
              className="flex-1 py-3 rounded-2xl bg-white border border-[#E0E0E0] hover:border-[#0F62FE] text-[#161616] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t.checkAgain}
            </button>

            <button
              onClick={() => (reading ? onDone(reading) : onSkip())}
              className="flex-1 py-3 rounded-2xl bg-[#0F62FE] hover:bg-[#0353e9] text-white font-semibold text-sm shadow-xs transition-all active:scale-[0.98]"
              style={{ fontFamily }}
            >
              {reading.verdict === "quiet" ? t.begin : t.continueAnyway}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
