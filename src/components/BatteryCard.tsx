import React from "react"
import { CheckCircle2, AlertTriangle, MinusCircle, Clock } from "lucide-react"
import type { BatteryTaskRecord } from "../types"

/**
 * Standardized test battery. Each task is scored against a published reference
 * range and shown on its own; the headline is "N of M in the typical range".
 * Nothing here is blended into the model's probability: a judge, a doctor and
 * the person being screened all see the same three numbers.
 */

const TASK_LABEL: Record<BatteryTaskRecord["task"], string> = {
  fluency: "Animal fluency (60 s)",
  recall: "Delayed 5-word recall",
  phonation: "Sustained vowel /a/",
}

const TASK_UNIT: Record<BatteryTaskRecord["task"], (
  r: BatteryTaskRecord,
) => string> = {
  fluency: (r) => (r.score === null ? "—" : `${r.score} animals`),
  recall: (r) => (r.score === null ? "—" : `${r.score} of 5 words`),
  phonation: (r) => (r.score === null ? "—" : `${r.score.toFixed(1)} s held`),
}

const TASK_RANGE: Record<BatteryTaskRecord["task"], string> = {
  fluency: "typical: 12 or more",
  recall: "typical: 3 or more",
  phonation: "typical: 10 s or more, steady voice",
}

export function summarizeBattery(battery: BatteryTaskRecord[]) {
  const scored = battery.filter((r) => r.status === "completed" && r.scored)
  const typical = scored.filter((r) => r.flag === false).length
  return { scored: scored.length, typical }
}

function extraDetail(r: BatteryTaskRecord): string | null {
  const d = r.details ?? {}
  if (r.task === "fluency") {
    const animals = d.animals as string[] | undefined
    if (animals && animals.length > 0) {
      return animals.slice(0, 8).join(", ") + (animals.length > 8 ? "…" : "")
    }
  }
  if (r.task === "recall") {
    const recalled = d.recalled as string[] | undefined
    const missed = d.missed as string[] | undefined
    if (recalled || missed) {
      return `recalled: ${(recalled ?? []).join(", ") || "none"}${
        missed && missed.length ? ` · missed: ${missed.join(", ")}` : ""
      }`
    }
  }
  if (r.task === "phonation") {
    const vq = d.voice_quality as {
      measured?: boolean
      jitter_local_percent?: number
      shimmer_local_db?: number
      hnr_db?: number
    } | undefined
    if (vq?.measured) {
      return `jitter ${vq.jitter_local_percent?.toFixed(2)} % · shimmer ${vq.shimmer_local_db?.toFixed(2)} dB · HNR ${vq.hnr_db?.toFixed(1)} dB`
    }
  }
  return null
}

export default function BatteryCard({
  battery,
  compact = false,
  fontFamily,
}: {
  battery: BatteryTaskRecord[]
  compact?: boolean
  fontFamily?: string
}) {
  if (!battery || battery.length === 0) return null

  const { scored, typical } = summarizeBattery(battery)
  const pending = battery.some((r) => r.status === "pending")

  return (
    <div className="w-full p-4 rounded-2xl bg-white border border-[#E0E0E0] shadow-xs text-left space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#6F6F6F]">
            Standardized tests
          </div>
          <div
            className="text-base font-bold text-[#161616] leading-tight"
            style={fontFamily ? { fontFamily } : undefined}
          >
            {scored > 0
              ? `${typical} of ${scored} in the typical range`
              : pending
                ? "Still scoring…"
                : "Not scored"}
          </div>
        </div>
        <div
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${
            scored > 0 && typical === scored
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : scored > 0
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-slate-50 border-[#E0E0E0] text-[#6F6F6F]"
          }`}
        >
          {scored > 0 && typical === scored ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : scored > 0 ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <MinusCircle className="w-5 h-5" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        {battery.map((r) => {
          const ok = r.status === "completed" && r.scored && r.flag === false
          const below = r.status === "completed" && r.scored && r.flag === true
          const detail = compact ? null : extraDetail(r)
          return (
            <div
              key={r.task}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E0E0E0]"
            >
              <div className="mt-0.5 shrink-0">
                {r.status === "pending" ? (
                  <Clock className="w-4 h-4 text-slate-400" />
                ) : ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : below ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : (
                  <MinusCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    {TASK_LABEL[r.task]}
                  </span>
                  <span
                    className={`text-xs font-bold tabular-nums shrink-0 ${
                      ok
                        ? "text-emerald-700"
                        : below
                          ? "text-amber-700"
                          : "text-slate-500"
                    }`}
                  >
                    {r.status === "completed"
                      ? TASK_UNIT[r.task](r)
                      : r.status === "pending"
                        ? "scoring…"
                        : "—"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {r.status === "failed"
                    ? r.error || "Could not be scored."
                    : r.status === "completed" && !r.scored
                      ? r.note || "Could not be scored."
                      : TASK_RANGE[r.task]}
                </div>
                {detail && (
                  <div className="text-[11px] text-slate-400 leading-snug mt-0.5 break-words">
                    {detail}
                  </div>
                )}
                {!compact && r.status === "completed" && r.scored && r.note && (
                  <div className="text-[10px] text-slate-400 leading-snug mt-0.5">
                    {r.note}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!compact && (
        <p className="text-[10px] text-slate-400 leading-snug">
          Scored against published reference ranges (Tombaugh 1999; MoCA,
          Nasreddine 2005; MDVP voice thresholds). Reported beside the model's
          result, never blended into it. A screening aid, not a diagnosis.
        </p>
      )}
    </div>
  )
}
