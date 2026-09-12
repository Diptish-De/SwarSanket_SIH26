import React from "react"
import {
  Mic,
  Calendar,
  Pill,
  CheckSquare,
  MapPin,
  Stethoscope,
  ChevronRight,
  Sparkles,
  Activity,
  FileText,
  Clock,
  ShieldCheck,
  PhoneCall,
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
  onViewReport: () => void
  fontFamily?: string
}

export default function AloisHomeDashboard({
  patientName,
  latestSession,
  onStartVoiceCheck,
  onSelectTab,
  onOpenDoctorModal,
  onOpenSafetyModal,
  onViewReport,
  fontFamily = "'Outfit', sans-serif",
}: AloisHomeDashboardProps) {
  const lastCheckDate = latestSession
    ? new Date(latestSession.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      })
    : "No recent check"

  const lastRisk = latestSession?.mlResult?.screeningRisk || "none"
  const isElevated = lastRisk === "elevated"
  const isLow = lastRisk === "low"

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
      {/* ─── 1. Upcoming Appointment Banner ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-100/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700">
                Upcoming Appointment
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <h3
              style={{ fontFamily }}
              className="text-sm font-bold text-slate-800 leading-tight"
            >
              Dr. Arvind Sharma (Neurology)
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-blue-500" />
              <span>Tomorrow at 10:30 AM (Teleconsult)</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDoctorModal}
          className="p-2 rounded-xl bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 text-xs font-semibold shadow-2xs transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ─── 2. HERO CARD: Cognitive Booster / Voice Check ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white p-5 shadow-xl shadow-slate-900/15 border border-slate-700/50">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Cognitive Booster
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              10–15s Acoustic Screening
            </span>
          </div>

          <h2
            style={{ fontFamily }}
            className="text-xl font-bold tracking-tight text-white mb-1.5 leading-snug"
          >
            Voice Health Check
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Speak naturally to analyze speech fluency, pause cadence, and
            cognitive stability powered by Quantum-Hybrid AI.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onStartVoiceCheck}
              className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all"
            >
              <Mic className="w-4 h-4 text-white animate-pulse" />
              <span>Take Voice Check</span>
            </button>

            {latestSession && (
              <button
                type="button"
                onClick={onViewReport}
                title="View Latest Clinical Report"
                className="py-3 px-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Report</span>
              </button>
            )}
          </div>

          {/* Quick Screening status footer */}
          <div className="mt-3.5 pt-3 border-t border-slate-750/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Last Check: {lastCheckDate}</span>
            </span>
            {latestSession && (
              <span
                className={`font-semibold capitalize ${
                  isElevated
                    ? "text-amber-300"
                    : isLow
                      ? "text-emerald-300"
                      : "text-slate-300"
                }`}
              >
                {lastRisk === "low"
                  ? "🟢 Stable Signal"
                  : isElevated
                    ? "🟡 Follow-up Advised"
                    : "⚪ Completed"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. Quick Action Cards (2x2 Grid) ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3
            style={{ fontFamily }}
            className="text-sm font-bold text-slate-800 uppercase tracking-wider"
          >
            Daily Care & Essentials
          </h3>
          <span className="text-xs text-blue-600 font-semibold cursor-pointer">
            Overview
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Medications */}
          <button
            type="button"
            onClick={() => onSelectTab("meds")}
            className="p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 shadow-xs text-left transition-all hover:shadow-md group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Pill className="w-5 h-5" />
            </div>
            <div
              className="text-sm font-bold text-slate-800"
              style={{ fontFamily }}
            >
              Medications
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              3 scheduled today
            </div>
            <div className="mt-2 text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-0.5">
              <span>View Pills</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* Card 2: Daily Care / Chores */}
          <button
            type="button"
            onClick={() => onSelectTab("routine")}
            className="p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 shadow-xs text-left transition-all hover:shadow-md group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div
              className="text-sm font-bold text-slate-800"
              style={{ fontFamily }}
            >
              Daily Routines
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              2 of 4 tasks finished
            </div>
            <div className="mt-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-0.5">
              <span>Checklist</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* Card 3: Doctor Teleconsult */}
          <button
            type="button"
            onClick={onOpenDoctorModal}
            className="p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 shadow-xs text-left transition-all hover:shadow-md group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div
              className="text-sm font-bold text-slate-800"
              style={{ fontFamily }}
            >
              Doctor Connect
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Consult Neurologist
            </div>
            <div className="mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-0.5">
              <span>Book / Chat</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* Card 4: Where Am I? (Safety) */}
          <button
            type="button"
            onClick={onOpenSafetyModal}
            className="p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 shadow-xs text-left transition-all hover:shadow-md group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <div
              className="text-sm font-bold text-slate-800"
              style={{ fontFamily }}
            >
              Where Am I?
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Safe Zone Active
            </div>
            <div className="mt-2 text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-0.5">
              <span>Find Location</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>

      {/* ─── 4. Daily Memory & Wellness Tip ─────────────────────────────── */}
      <div className="bg-gradient-to-tr from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200/80 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4
              style={{ fontFamily }}
              className="text-xs font-bold text-slate-800 uppercase tracking-wider"
            >
              Daily Cognitive Tip
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Describing familiar photos or telling a short story about your
              morning stimulates semantic recall and keeps neural speech
              pathways active!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
