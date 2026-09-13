import React, { useState } from "react"

import {
  ChevronLeft,
  Bell,
  Settings,
  FileText,
  ChevronRight,
  TrendingUp,
  Activity,
  Award,
  Sparkles,
} from "lucide-react"

interface AloisProgressProps {
  onBack: () => void

  onViewReport: () => void

  onOpenSettings: () => void

  fontFamily?: string
}

/**
 * Alois Progress Screen — matching Figma node 512:19216 & app/(main)/progress.tsx.
 * Displays activity curve with Tuesday peak, 2x2 metrics grid, and Monthly Report ABHA export.
 */

export default function AloisProgress({
  onBack,

  onViewReport,

  onOpenSettings,

  fontFamily = "'Outfit', sans-serif",
}: AloisProgressProps) {
  const [activeSegment, setActiveSegment] =
    useState<"cognitive" | "overall" | "health">("overall")

  // Curve coordinates tracing the Tuesday peak (95%) from Figma design

  const points = [
    { x: 10, y: 55, day: "M" },

    { x: 55, y: 15, day: "T" }, // Tuesday Peak

    { x: 105, y: 48, day: "W" },

    { x: 155, y: 35, day: "T" },

    { x: 205, y: 62, day: "F" },

    { x: 255, y: 28, day: "S" },

    { x: 305, y: 40, day: "S" },
  ]

  const pathD = `M 10 55 Q 35 15 55 15 T 105 48 T 155 35 T 205 62 T 255 28 T 305 40`

  const areaD = `${pathD} L 305 85 L 10 85 Z`

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28">
      {/* ─── Nav Bar ─────────────────────────────────────────────────── */}
      <header className="h-[72px] px-4 flex items-center justify-between bg-[#F4F4F4] border-b border-[#E0E0E0] sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616] active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1
            style={{ fontFamily }}
            className="text-[20px] font-bold text-[#161616] tracking-tight"
          >
            Progress & Stability
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="w-9 h-9 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616] active:scale-95 transition-all"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="w-9 h-9 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616] active:scale-95 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-[375px] mx-auto">
        {/* ─── Segmented Control: Cognitive | Overall | Health ─────────── */}
        <div className="flex rounded-xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setActiveSegment("cognitive")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSegment === "cognitive"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Cognitive
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("overall")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSegment === "overall"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Overall
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("health")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSegment === "health"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Health
          </button>
        </div>

        {/* ─── Activity Line Chart (Figma node 994:33132: 327 x 192) ──── */}
        <div className="rounded-2xl bg-white border border-[#E0E0E0] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span
                style={{ fontFamily }}
                className="text-[14px] font-bold text-[#161616] block"
              >
                Weekly Stability Trend
              </span>
              <span className="text-[11px] text-[#525252]">
                Acoustic Fluency & Cognitive Cadence
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold flex items-center gap-1 border border-emerald-200">
              <TrendingUp className="w-3 h-3" /> +4.8%
            </span>
          </div>

          {/* SVG Smooth Curve Graph */}
          <div className="relative h-[110px] w-full mt-2">
            <svg
              viewBox="0 0 315 90"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient
                  id="chartGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#0F62FE" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0F62FE" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid guide lines */}
              <line
                x1="0"
                y1="25"
                x2="315"
                y2="25"
                stroke="#E0E0E0"
                strokeDasharray="3 3"
              />
              <line
                x1="0"
                y1="55"
                x2="315"
                y2="55"
                stroke="#E0E0E0"
                strokeDasharray="3 3"
              />
              <line
                x1="0"
                y1="85"
                x2="315"
                y2="85"
                stroke="#E0E0E0"
                strokeWidth="1"
              />

              {/* Shaded area */}
              <path d={areaD} fill="url(#chartGradient)" />

              {/* Spline curve */}
              <path
                d={pathD}
                fill="none"
                stroke="#0F62FE"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Tuesday Peak Marker (95%) */}
              <circle
                cx="55"
                cy="15"
                r="5"
                fill="#0F62FE"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text
                x="55"
                y="8"
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill="#0F62FE"
              >
                95%
              </text>

              {/* Day Labels */}
              {points.map((p) => (
                <text
                  key={p.day + p.x}
                  x={p.x}
                  y="102"
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6F6F6F"
                  fontWeight="500"
                >
                  {p.day}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* ─── 2x2 Metric Grid (Figma Daily Cares, Memory, Appointments, Meds) ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Daily Cares (78%) */}
          <div className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-[#525252]">
                Daily Cares
              </span>
              <span className="w-2 h-2 rounded-full bg-[#42BE65]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                style={{ fontFamily }}
                className="text-[22px] font-bold text-[#161616]"
              >
                78%
              </span>
              <span className="text-[10px] text-[#525252]">completed</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
              <div
                className="h-full bg-[#42BE65] rounded-full"
                style={{ width: "78%" }}
              />
            </div>
          </div>

          {/* Card 2: Voice Biomarker Stability (92%) */}
          <div className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-[#525252]">
                Voice Stability
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#0F62FE]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                style={{ fontFamily }}
                className="text-[22px] font-bold text-[#161616]"
              >
                92%
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">
                Stable
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
              <div
                className="h-full bg-[#0F62FE] rounded-full"
                style={{ width: "92%" }}
              />
            </div>
          </div>

          {/* Card 3: Clinical Appointments (100%) */}
          <div className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-[#525252]">
                Appointments
              </span>
              <span className="w-2 h-2 rounded-full bg-[#F1C21B]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                style={{ fontFamily }}
                className="text-[22px] font-bold text-[#161616]"
              >
                100%
              </span>
              <span className="text-[10px] text-[#525252]">on schedule</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
              <div
                className="h-full bg-[#F1C21B] rounded-full"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Card 4: Medication Adherence (85%) */}
          <div className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-[#525252]">
                Medication Adherence
              </span>
              <span className="w-2 h-2 rounded-full bg-[#FA4D56]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                style={{ fontFamily }}
                className="text-[22px] font-bold text-[#161616]"
              >
                85%
              </span>
              <span className="text-[10px] text-[#525252]">adherence</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
              <div
                className="h-full bg-[#FA4D56] rounded-full"
                style={{ width: "85%" }}
              />
            </div>
          </div>
        </div>

        {/* ─── List Rows (Figma Monthly Report, Support, Tips) ────────── */}
        <div className="space-y-2 pt-1">
          {/* Monthly Report Button -> Triggers ABHA Clinical PDF */}
          <button
            type="button"
            onClick={onViewReport}
            className="w-full p-3.5 rounded-xl bg-white border border-[#E0E0E0] hover:bg-slate-50 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span
                  style={{ fontFamily }}
                  className="text-[13px] font-semibold text-[#161616] block group-hover:text-blue-600 transition-colors"
                >
                  Monthly Clinical Report (ABDM)
                </span>
                <span className="text-[11px] text-[#6F6F6F]">
                  Download signed EHR summary PDF
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#525252] group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Communication and Support */}
          <button
            type="button"
            className="w-full p-3.5 rounded-xl bg-white border border-[#E0E0E0] hover:bg-slate-50 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <span
                style={{ fontFamily }}
                className="text-[13px] font-semibold text-[#161616] group-hover:text-emerald-600 transition-colors"
              >
                Communication and Support
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#525252] group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Tips and Recommendations */}
          <button
            type="button"
            className="w-full p-3.5 rounded-xl bg-white border border-[#E0E0E0] hover:bg-slate-50 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <span
                style={{ fontFamily }}
                className="text-[13px] font-semibold text-[#161616] group-hover:text-purple-600 transition-colors"
              >
                Tips and Recommendations
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#525252] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}
