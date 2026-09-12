import React from "react"
import {
  MapPin,
  Bell,
  Settings,
  Phone,
  MessageSquare,
  MoreVertical,
  Pill,
  Calendar,
  CheckSquare,
  Sparkles,
  Activity,
  ArrowRight,
  ExternalLink,
} from "lucide-react"
import { ScreeningSession } from "../../types"
import { AloisTab } from "./types"

interface AloisHomeDashboardProps {
  patientName: string
  latestSession?: ScreeningSession | null
  onStartVoiceCheck: () => void
  onSelectTab: (tab: AloisTab) => void
  onOpenDoctorModal: () => void
  onOpenSafetyModal: () => void
  onOpenCognitiveModal: () => void
  onViewReport: () => void
  fontFamily?: string
}

/**
 * Alois Home Screen — exact replica of Figma node 222:13739 & app/(main)/home.tsx.
 * Incorporates SwarSanket Quantum-ML voice screening as the hero "Cognitive Booster".
 */
export default function AloisHomeDashboard({
  patientName,
  latestSession,
  onStartVoiceCheck,
  onSelectTab,
  onOpenDoctorModal,
  onOpenSafetyModal,
  onOpenCognitiveModal,
  onViewReport,
  fontFamily = "'Outfit', sans-serif",
}: AloisHomeDashboardProps) {
  const lastRisk = latestSession?.mlResult?.screeningRisk || "none"
  const isElevated = lastRisk === "elevated"
  const isLow = lastRisk === "low"

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28">
      {/* ─── 1. Home Nav Bar (Figma node 888:32886: 375 x 72pt) ───────────── */}
      <header className="h-[72px] px-4 flex items-center justify-between bg-[#F4F4F4] border-b border-[#E0E0E0] sticky top-0 z-20">
        <div>
          <span
            style={{ fontFamily }}
            className="text-[14px] font-semibold text-[#161616] block leading-none"
          >
            Hello,
          </span>
          <h1
            style={{ fontFamily }}
            className="text-[22px] font-bold text-[#161616] tracking-tight leading-tight mt-0.5"
          >
            {patientName || "Mr. Harrelson"}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Where Am I Action: Blue circular button */}
          <button
            type="button"
            onClick={onOpenSafetyModal}
            title="Where Am I?"
            aria-label="Where Am I"
            className="w-9 h-9 rounded-full bg-[#0F62FE] text-white flex items-center justify-center shadow-sm hover:bg-[#0353e9] active:scale-95 transition-all"
          >
            <MapPin className="w-4 h-4 text-white" />
          </button>

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

      <div className="px-4 pt-4 space-y-6 max-w-[375px] mx-auto">
        {/* ─── 2. Upcoming Appointment (Figma node 888:32983: 319 x 104) ──── */}
        <section>
          <h2
            style={{ fontFamily }}
            className="text-[14px] font-medium text-[#161616] mb-3 px-1"
          >
            Upcoming Appointment
          </h2>

          <div className="w-full min-h-[104px] rounded-xl bg-white border border-[#E0E0E0] p-3 relative overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
            {/* Memphis Pattern overlay watermark @ 5% */}
            <div
              className="absolute inset-0 pointer-events-none opacity-5"
              style={{
                backgroundImage:
                  "radial-gradient(#161616 1.5px, transparent 1.5px)",
                backgroundSize: "10px 10px",
              }}
            />

            <div className="flex items-start gap-3 relative z-10">
              {/* Doctor Avatar */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-lg shadow-sm shrink-0">
                <span>AL</span>
              </div>

              {/* Doctor Info */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center justify-between">
                  <h3
                    style={{ fontFamily }}
                    className="text-[14px] font-semibold text-[#161616] truncate"
                  >
                    Dr. Andrew Lucas
                  </h3>
                </div>
                <p className="text-[12px] text-[#525252] truncate mt-0.5">
                  Neurology & Cognitive Health
                </p>

                {/* Actions: Call, Message, Reschedule */}
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={onOpenDoctorModal}
                    title="Call Doctor"
                    className="w-7 h-7 rounded-lg bg-[#393939] text-white flex items-center justify-center hover:bg-[#161616] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab("messages")}
                    title="Message Doctor"
                    className="w-7 h-7 rounded-lg bg-[#393939] text-white flex items-center justify-center hover:bg-[#161616] transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenDoctorModal}
                    className="px-3 py-1 rounded-lg bg-[#0F62FE] text-white text-[12px] font-semibold hover:bg-[#0353e9] transition-colors ml-1"
                  >
                    Reschedule
                  </button>
                </div>
              </div>

              {/* Overflow Menu */}
              <button
                type="button"
                onClick={onOpenDoctorModal}
                className="absolute top-2.5 right-2 text-[#525252] hover:text-[#161616]"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ─── 3. Overview Cards (Figma nodes 871:32543-32545: 3 x 96x116) ─ */}
        <section>
          <h2
            style={{ fontFamily }}
            className="text-[14px] font-medium text-[#161616] mb-3 px-1"
          >
            Overview
          </h2>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Medications Card: #FA4D56 */}
            <button
              type="button"
              onClick={() => onSelectTab("medications")}
              className="h-[116px] rounded-xl bg-[#393939] text-white p-2.5 flex flex-col items-center justify-between relative overflow-hidden shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:bg-[#2c2c2c] active:scale-95 transition-all text-center group"
            >
              {/* Geometric mask decor */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  fill="currentColor"
                >
                  <circle cx="20" cy="20" r="30" />
                  <path d="M50 70 L90 20 L90 90 Z" />
                </svg>
              </div>

              <div className="w-[52px] h-[52px] rounded-lg bg-[#FA4D56] flex items-center justify-center shadow-sm shrink-0 mt-1">
                <Pill className="w-6 h-6 text-white" />
              </div>

              <span
                style={{ fontFamily }}
                className="text-[12px] font-semibold text-white tracking-tight group-hover:text-blue-200 transition-colors"
              >
                Medications
              </span>
            </button>

            {/* Appointments Card: #F1C21B */}
            <button
              type="button"
              onClick={() => onSelectTab("schedule")}
              className="h-[116px] rounded-xl bg-[#393939] text-white p-2.5 flex flex-col items-center justify-between relative overflow-hidden shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:bg-[#2c2c2c] active:scale-95 transition-all text-center group"
            >
              {/* Geometric mask decor */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  fill="currentColor"
                >
                  <rect
                    x="10"
                    y="10"
                    width="40"
                    height="40"
                    transform="rotate(45 30 30)"
                  />
                  <circle cx="80" cy="70" r="25" />
                </svg>
              </div>

              <div className="w-[52px] h-[52px] rounded-lg bg-[#F1C21B] flex items-center justify-center shadow-sm shrink-0 mt-1">
                <Calendar className="w-6 h-6 text-[#161616]" />
              </div>

              <span
                style={{ fontFamily }}
                className="text-[12px] font-semibold text-white tracking-tight group-hover:text-amber-200 transition-colors"
              >
                Appointments
              </span>
            </button>

            {/* Daily Care Card: #42BE65 */}
            <button
              type="button"
              onClick={() => onSelectTab("dailyCare")}
              className="h-[116px] rounded-xl bg-[#393939] text-white p-2.5 flex flex-col items-center justify-between relative overflow-hidden shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:bg-[#2c2c2c] active:scale-95 transition-all text-center group"
            >
              {/* Geometric mask decor */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  fill="currentColor"
                >
                  <circle cx="50" cy="50" r="35" strokeWidth="10" />
                  <path d="M10 80 Q 50 10 90 80" />
                </svg>
              </div>

              <div className="w-[52px] h-[52px] rounded-lg bg-[#42BE65] flex items-center justify-center shadow-sm shrink-0 mt-1">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>

              <span
                style={{ fontFamily }}
                className="text-[12px] font-semibold text-white tracking-tight group-hover:text-emerald-200 transition-colors"
              >
                Daily Care
              </span>
            </button>
          </div>
        </section>

        {/* ─── 4. Cognitive Booster Card (Figma node 871:32542: 319 x 80) ──── */}
        <section>
          <div
            onClick={onStartVoiceCheck}
            className="w-full h-[84px] rounded-xl bg-[#393939] hover:bg-[#2f2f2f] text-white p-3 flex items-center relative overflow-hidden shadow-[0_8px_16px_rgba(0,0,0,0.1)] cursor-pointer active:scale-[0.98] transition-all group"
          >
            {/* Wave decor in background */}
            <div className="absolute right-0 top-0 bottom-0 w-48 opacity-15 pointer-events-none">
              <svg
                viewBox="0 0 200 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <path
                  d="M0 40 C40 10, 80 70, 120 40 C160 10, 200 70, 240 40"
                  stroke="#4589FF"
                  strokeWidth="6"
                  fill="none"
                />
                <path
                  d="M0 55 C40 25, 80 85, 120 55 C160 25, 200 85, 240 55"
                  stroke="#0F62FE"
                  strokeWidth="3"
                  fill="none"
                />
              </svg>
            </div>

            {/* Cognitive Booster Icon: #4589FF */}
            <div className="w-[52px] h-[52px] rounded-lg bg-[#4589FF] text-white flex items-center justify-center shadow-md shrink-0 mr-3.5 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>

            {/* Title & Quantum ML Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3
                  style={{ fontFamily }}
                  className="text-[15px] font-semibold text-white truncate"
                >
                  Cognitive Booster
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <p className="text-[11px] text-slate-300 truncate mt-0.5 flex items-center gap-1">
                <span>Voice Biomarker Check (8-Qubit VQC)</span>
              </p>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {latestSession ? "Last: Stable Signal" : "Ready to Start"}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 group-hover:text-blue-300">
                  Tap to check <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            {/* View Activities button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenCognitiveModal()
              }}
              title="Browse Memory Games"
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-slate-300 shrink-0 ml-1 transition-colors"
            >
              Games
            </button>
          </div>
        </section>

        {/* ─── 5. Events (Figma nodes 888:33115 / 888:33116) ──────────────── */}
        <section>
          <h2
            style={{ fontFamily }}
            className="text-[14px] font-medium text-[#161616] mb-3 px-1"
          >
            Events
          </h2>

          <div className="space-y-3">
            {/* Event 1: Ride to End ALZ */}
            <div className="w-full min-h-[87px] rounded-xl bg-white border border-[#E0E0E0] p-3 flex items-center justify-between shadow-xs hover:border-blue-300 transition-colors">
              <div className="w-[90px] h-[64px] rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex flex-col items-center justify-center shrink-0 p-1 text-center shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Ride
                </span>
                <span className="text-[8px] opacity-80">TO END ALZ</span>
              </div>
              <div className="flex-1 ml-3 text-right">
                <h3
                  style={{ fontFamily }}
                  className="text-[13px] font-semibold text-[#161616]"
                >
                  Ride to End ALZ
                </h3>
                <p className="text-[11px] text-[#525252] mt-1 leading-snug">
                  A Ride to Fuel Alzheimer's Research.
                </p>
              </div>
            </div>

            {/* Event 2: Walk to End Alzheimer's */}
            <div className="w-full min-h-[87px] rounded-xl bg-white border border-[#E0E0E0] p-3 flex items-center justify-between shadow-xs hover:border-blue-300 transition-colors">
              <div className="w-[90px] h-[64px] rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex flex-col items-center justify-center shrink-0 p-1 text-center shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Walk
                </span>
                <span className="text-[8px] opacity-80">TO END ALZ</span>
              </div>
              <div className="flex-1 ml-3 text-right">
                <h3
                  style={{ fontFamily }}
                  className="text-[13px] font-semibold text-[#161616]"
                >
                  WALK TO END ALZHEIMER'S
                </h3>
                <p className="text-[11px] text-[#525252] mt-1 leading-snug">
                  Together, we can end Alzheimer's disease.
                </p>
              </div>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => onSelectTab("schedule")}
                className="text-[12px] font-medium text-[#0F62FE] hover:underline"
              >
                Browse more events
              </button>
            </div>
          </div>
        </section>

        {/* ─── 6. News (Figma node 888:33171: 316 x 116) ──────────────────── */}
        <section>
          <h2
            style={{ fontFamily }}
            className="text-[14px] font-medium text-[#161616] mb-3 px-1"
          >
            News
          </h2>

          <article className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="px-2 py-0.5 rounded bg-[#FFD7D9] text-[#A2191F] text-[11px] font-medium tracking-tight">
                Press Release
              </span>
              <span className="text-[11px] font-medium text-[#6F6F6F]">
                July 20, 2023
              </span>
            </div>
            <h3
              style={{ fontFamily }}
              className="text-[12px] font-semibold text-[#161616] leading-snug"
            >
              Advancements in Treatment, Diagnosis and Risk Reduction Strategies
              Highlighted at Alzheimer's Association International Conference
            </h3>
          </article>
        </section>

        {/* Clinical Report Export Trigger */}
        {latestSession && (
          <section className="pt-2">
            <button
              type="button"
              onClick={onViewReport}
              className="w-full p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-between text-xs font-semibold hover:bg-blue-100/70 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Export ABDM Clinical Referral Summary PDF
              </span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
