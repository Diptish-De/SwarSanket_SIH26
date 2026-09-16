import React, { useEffect, useRef, useState } from "react"

import {
  Bell,
  Settings,
  Sparkles,
  ChevronRight,
  Mic,
  Activity,
  Check,
  CalendarClock,
  MessageSquareQuote,
  Users,
  Flame,
  Upload,
} from "lucide-react"

import {
  computeTrend,
  listCheckIns,
  localDateKey,
  type DailyCheckIn,
  type DailyTrend,
} from "../../services/dailyCheckIn"

import { ScreeningSession } from "../../types"

import { AloisTab } from "./types"
import UploadVoiceModal from "../UploadVoiceModal"

interface AloisHomeDashboardProps {
  patientName: string

  latestSession?: ScreeningSession | null

  onStartVoiceCheck: () => void

  onUploadVoiceFile?: (file: File, task?: string, duration?: number) => void

  onSelectTab: (tab: AloisTab) => void

  onOpenDoctorModal?: () => void

  onOpenCognitiveModal?: () => void

  onViewReport?: () => void

  fontFamily?: string
}

/**
 * Alois Home Screen — Simple, focused UI.
 * Main: Cognitive Booster (Voice Screening).
 * Secondary: the daily check-in.
 * All extraneous sections (upcoming appointment, medications, appointments, events, news) removed.
 */

export default function AloisHomeDashboard({
  patientName,

  latestSession,

  onStartVoiceCheck,

  onUploadVoiceFile,

  onSelectTab,

  onViewReport,

  fontFamily = "'Outfit', sans-serif",
}: AloisHomeDashboardProps) {
  const [trend, setTrend] = useState<DailyTrend | null>(null)

  const [today, setToday] = useState<DailyCheckIn | null>(null)

  const [showUploadModal, setShowUploadModal] = useState(false)

  const [droppedFile, setDroppedFile] = useState<File | null>(null)

  const [isDraggingOverCard, setIsDraggingOverCard] = useState(false)

  // Loaded here rather than passed down: the card is the only consumer, and it

  // has to re-read after a check-in without the whole shell re-rendering.

  useEffect(() => {
    let cancelled = false

    const todayKey = localDateKey()

    listCheckIns()

      .then((all) => {
        if (cancelled) return

        setTrend(computeTrend(all, todayKey))

        setToday(all.find((c) => c.id === todayKey) ?? null)
      })

      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  const doneToday = today != null && today.recall.status !== "skipped"

  const isNormal = latestSession?.mlResult?.screeningRisk === "low"

  const confidencePct = latestSession?.mlResult
    ? Math.round(latestSession.mlResult.confidenceScore * 100)
    : null

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none">
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
            onClick={() => onSelectTab("profile")}
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
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDraggingOverCard(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDraggingOverCard(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDraggingOverCard(false)
              const file = e.dataTransfer.files?.[0]
              if (file) {
                setDroppedFile(file)
                setShowUploadModal(true)
              }
            }}
            className={`w-full rounded-2xl text-white p-5 relative overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.12)] cursor-pointer active:scale-[0.99] transition-all group ${
              isDraggingOverCard
                ? "bg-[#252525] ring-2 ring-[#4589FF]"
                : "bg-[#393939] hover:bg-[#2e2e2e]"
            }`}
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
                    Voice & Memory Test
                  </h3>
                </div>
                <p className="text-[13px] text-[#C6C6C6] mt-1 leading-snug">
                  A short voice test to check your memory and thinking.
                </p>
              </div>
            </div>

            {/* Action CTA Row */}
            <div className="mt-5 pt-4 border-t border-[#525252] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUploadModal(true)
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-[#F4F4F4] text-[12px] font-medium flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer shadow-2xs"
                title="Upload patient voice recording (.wav, .mp3, .m4a)"
              >
                <Upload className="w-3.5 h-3.5 text-[#4589FF]" />
                <span>Upload Voice</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()

                  onStartVoiceCheck()
                }}
                className="px-4 py-2 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
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

        {/* ─── 3. SECONDARY: Daily Check-in ──────────────────────────── */}
        {/*
          This slot used to hold a household-chore list. Chores belong in a
          caregiving app; this one is for early detection, and the earliest
          thing to change in Alzheimer's disease is memory for recent personal
          events. So the daily slot asks about the person's actual day, and
          reads it against their own earlier answers rather than a cut-off.
        */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2
              style={{ fontFamily }}
              className="text-[14px] font-semibold text-[#525252] uppercase tracking-wider text-[11px]"
            >
              Every day
            </h2>

            {trend && trend.streak > 0 && (
              <span className="text-[12px] font-semibold text-[#525252] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                {trend.streak} day{trend.streak === 1 ? "" : "s"} in a row
              </span>
            )}
          </div>

          <div
            onClick={() => onSelectTab("dailyCheckIn")}
            className="w-full rounded-2xl bg-[#393939] text-white p-4 relative overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.08)] cursor-pointer hover:bg-[#2e2e2e] active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform ${
                  doneToday ? "bg-[#42BE65]" : "bg-[#0F62FE]"
                }`}
              >
                {doneToday ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <MessageSquareQuote className="w-6 h-6 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  style={{ fontFamily }}
                  className="text-[16px] font-semibold text-white tracking-tight"
                >
                  Daily check-in
                </h3>

                <p className="text-[12px] text-[#C6C6C6] mt-0.5">
                  {doneToday
                    ? "Done for today — thank you"
                    : "About a minute. Tell us about your day."}
                </p>
              </div>

              <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:bg-[#0F62FE] transition-colors shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* What the check-in asks, or what it found once it is done. */}
          {doneToday ? (
            <div className="rounded-xl bg-white border border-[#E0E0E0] px-3.5 py-3 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-[#161616]">
                  {trend?.status === "building"
                    ? `Building your baseline · ${trend.needed} more day${
                        trend.needed === 1 ? "" : "s"
                      }`
                    : trend?.status === "typical"
                      ? "Usual amount of detail for you"
                      : trend?.status === "below"
                        ? "Less detail than your usual"
                        : "Recorded"}
                </span>

                {trend && trend.status !== "building" && (
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      trend.status === "typical"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {trend.recentMedian} vs {trend.baselineMedian}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-[#8D8D8D] leading-snug">
                Compared with your own earlier check-ins, never with other
                people.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[
                {
                  icon: CalendarClock,

                  title: "Two quick questions",

                  sub: "Day and month",
                },

                {
                  icon: Mic,

                  title: "Tell me about your day",

                  sub: "About 40 seconds",
                },

                {
                  icon: Users,

                  title: "One question for family",

                  sub: "Optional",
                },
              ].map((row) => (
                <div
                  key={row.title}
                  onClick={() => onSelectTab("dailyCheckIn")}
                  className="w-full rounded-xl bg-white border border-[#E0E0E0] px-3.5 py-3 flex items-center justify-between shadow-2xs cursor-pointer hover:border-[#0F62FE] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#0F62FE] flex items-center justify-center shrink-0">
                      <row.icon className="w-3.5 h-3.5" />
                    </span>

                    <span className="text-[13px] font-medium text-[#161616]">
                      {row.title}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#8D8D8D] shrink-0">
                    {row.sub}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <UploadVoiceModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false)
          setDroppedFile(null)
        }}
        initialFile={droppedFile}
        patientName={patientName}
        fontFamily={fontFamily}
        onStartAnalysis={(file, task, duration) => {
          if (onUploadVoiceFile) {
            onUploadVoiceFile(file, task, duration)
          }
        }}
      />
    </div>
  )
}
