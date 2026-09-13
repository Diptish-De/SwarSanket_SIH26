import React from "react"
import {
  Bell,
  Settings,
  Sparkles,
  CheckSquare,
  ChevronRight,
  Mic,
  Activity,
  Check,
} from "lucide-react"
import { ScreeningSession } from "../../types"
import { AloisTab } from "./types"

interface AloisHomeDashboardProps {
  patientName: string
  latestSession?: ScreeningSession | null
  onStartVoiceCheck: () => void
  onSelectTab: (tab: AloisTab) => void
  onOpenDoctorModal?: () => void
  onOpenCognitiveModal?: () => void
  onViewReport?: () => void
  fontFamily?: string
}

/**
 * Alois Home Screen — Simple, focused UI.
 * Main: Cognitive Booster (Voice Screening).
 * Secondary: Daily Care.
 * All extraneous sections (upcoming appointment, medications, appointments, events, news) removed.
 */
export default function AloisHomeDashboard({
  patientName,
  latestSession,
  onStartVoiceCheck,
  onSelectTab,
  onViewReport,
  fontFamily = "'Outfit', sans-serif",
}: AloisHomeDashboardProps) {
  const isNormal = latestSession?.mlResult?.screeningRisk === "low"
  const confidencePct = latestSession?.mlResult
    ? Math.round(latestSession.mlResult.confidenceScore * 100)
    : null

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28">
      {/* ─── 1. Home Nav Bar (Figma node 888:32886: 375 x 72pt) ───────────── */}
      <header className="h-[72px] px-4 flex items-center justify-between bg-[#F4F4F4] border-b border-[#E0E0E0] sticky top-0 z-20">
        <div>
          <span
            style={{ fontFamily }}
            className="text-[14px] font-medium text-[#525252] block leading-none"
          >
            Hello,
          </span>
          <h1
            style={{ fontFamily }}
            className="text-[22px] font-bold text-[#161616] tracking-tight leading-tight mt-0.5"
          >
            {patientName || "Jerrold Harrington"}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Notifications */}
          <button
            type="button"
            onClick={() => onSelectTab("messages")}
            aria-label="Notifications"
            className="w-9 h-9 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616] hover:border-slate-300 active:scale-95 transition-all"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Settings / Profile */}
          <button
            type="button"
            onClick={() => onSelectTab("profile")}
            aria-label="Settings"
            className="w-9 h-9 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616] hover:border-slate-300 active:scale-95 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6 max-w-[375px] mx-auto">
        {/* ─── 2. MAIN: Cognitive Booster Hero Card ────────────────────── */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2
              style={{ fontFamily }}
              className="text-[14px] font-semibold text-[#525252] uppercase tracking-wider text-[11px]"
            >
              Primary Screening
            </h2>
            {confidencePct !== null && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> Latest Score: {confidencePct}%
              </span>
            )}
          </div>

          <div
            onClick={onStartVoiceCheck}
            className="w-full rounded-2xl bg-[#393939] text-white p-5 relative overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.12)] cursor-pointer hover:bg-[#2e2e2e] active:scale-[0.99] transition-all group"
          >
            {/* Ambient decorative waves */}
            <div className="absolute right-0 top-0 bottom-0 w-48 opacity-10 pointer-events-none">
              <svg
                viewBox="0 0 200 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <path
                  d="M0 60 C40 20, 80 100, 120 60 C160 20, 200 100, 240 60"
                  stroke="#4589FF"
                  strokeWidth="8"
                  fill="none"
                />
              </svg>
            </div>

            <div className="relative z-10 flex items-start gap-4">
              {/* Cognitive Icon Container: 58x58, #4589FF */}
              <div className="w-[58px] h-[58px] rounded-2xl bg-[#4589FF] text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-7 h-7 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    style={{ fontFamily }}
                    className="text-[20px] font-bold text-white tracking-tight leading-tight"
                  >
                    Cognitive Booster
                  </h3>
                </div>
                <p className="text-[13px] text-[#C6C6C6] mt-1 leading-snug">
                  Voice Biomarker Screening with 8-Qubit Quantum ML Analysis
                </p>
              </div>
            </div>

            {/* Action CTA Row */}
            <div className="mt-5 pt-4 border-t border-[#525252] flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#A8A8A8] flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-[#4589FF]" />
                Tap to record voice
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartVoiceCheck()
                }}
                className="px-4 py-2 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <span>Start Check</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick status banner if previous session exists */}
          {latestSession && (
            <div
              onClick={onViewReport}
              className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3 flex items-center justify-between shadow-2xs cursor-pointer hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0F62FE] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#161616]">
                    Recent Health Summary
                  </div>
                  <div className="text-[11px] text-[#6F6F6F]">
                    {isNormal
                      ? "Normal acoustic pattern"
                      : "Moderate biomarker indicator"}{" "}
                    • Tap to view report
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8D8D8D]" />
            </div>
          )}
        </section>

        {/* ─── 3. SECONDARY: Daily Care Section ────────────────────────── */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2
              style={{ fontFamily }}
              className="text-[14px] font-semibold text-[#525252] uppercase tracking-wider text-[11px]"
            >
              Secondary Care
            </h2>
            <button
              type="button"
              onClick={() => onSelectTab("dailyCare")}
              className="text-[12px] font-medium text-[#0F62FE] hover:underline"
            >
              View all
            </button>
          </div>

          {/* Daily Care Card (Figma node styled) */}
          <div
            onClick={() => onSelectTab("dailyCare")}
            className="w-full rounded-2xl bg-[#393939] text-white p-4 relative overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.08)] cursor-pointer hover:bg-[#2e2e2e] active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-[52px] h-[52px] rounded-xl bg-[#42BE65] flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  style={{ fontFamily }}
                  className="text-[16px] font-semibold text-white tracking-tight"
                >
                  Daily Care
                </h3>
                <p className="text-[12px] text-[#C6C6C6] mt-0.5">
                  Daily plans, routines & household chores
                </p>
              </div>

              <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:bg-[#42BE65] transition-colors shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Daily Care Quick Tasks Preview */}
          <div className="space-y-2">
            {[
              { title: "Wash dishes after breakfast", done: true },
              { title: "Afternoon walking routine (15 mins)", done: false },
              { title: "Evening hydration reminder", done: false },
            ].map((task, idx) => (
              <div
                key={idx}
                onClick={() => onSelectTab("dailyCare")}
                className="w-full rounded-xl bg-white border border-[#E0E0E0] px-3.5 py-3 flex items-center justify-between shadow-2xs cursor-pointer hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                      task.done
                        ? "bg-[#42BE65] text-white"
                        : "border border-slate-300 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[13px] font-medium ${
                      task.done
                        ? "text-slate-400 line-through"
                        : "text-[#161616]"
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8D8D8D]" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
