import React, { useState } from "react"

import {
  X,
  Sparkles,
  Play,
  HelpCircle,
  Award,
  ChevronRight,
  Brain,
  Layers,
  Compass,
  Zap,
  CheckCircle2,
} from "lucide-react"

interface AloisCognitiveBoosterModalProps {
  isOpen: boolean

  onClose: () => void

  onStartVoiceCheck: () => void

  onOpenCognitiveGames?: () => void

  fontFamily?: string
}

/**
 * Alois Cognitive Booster Modal / Screen — matching Figma node 530:18957 & app/game/memory-enhancement.tsx.
 * Features the hero SwarSanket voice screening launch card + 6 cognitive stimulation activities.
 */

export default function AloisCognitiveBoosterModal({
  isOpen,

  onClose,

  onStartVoiceCheck,

  onOpenCognitiveGames,

  fontFamily = "'Outfit', sans-serif",
}: AloisCognitiveBoosterModalProps) {
  const [activeSegment, setActiveSegment] =
    useState<"activities" | "assessments" | "goals">("activities")

  if (!isOpen) return null

  const activities = [
    {
      id: "1",

      title: "Planning",

      subtitle: "Problem Solving",

      icon: <Compass className="w-6 h-6 text-blue-600" />,

      color: "bg-blue-50 border-blue-100",

      description: "Route planning & step sequencing exercises",
    },

    {
      id: "2",

      title: "Attention",

      subtitle: "Selective",

      icon: <Brain className="w-6 h-6 text-emerald-600" />,

      color: "bg-emerald-50 border-emerald-100",

      description: "Target search under visual distractions",
    },

    {
      id: "3",

      title: "Treasure",

      subtitle: "Memory",

      icon: <Award className="w-6 h-6 text-amber-600" />,

      color: "bg-amber-50 border-amber-100",

      description: "Object pair matching & spatial recall",
    },

    {
      id: "4",

      title: "Visualisation",

      subtitle: "Speed",

      icon: <Zap className="w-6 h-6 text-purple-600" />,

      color: "bg-purple-50 border-purple-100",

      description: "Rapid pattern recognition & symbol match",
    },

    {
      id: "5",

      title: "Divided",

      subtitle: "Attention",

      icon: <Layers className="w-6 h-6 text-rose-600" />,

      color: "bg-rose-50 border-rose-100",

      description: "Dual-task auditory and visual sorting",
    },

    {
      id: "6",

      title: "Task Switching",

      subtitle: "Flexibility",

      icon: <Sparkles className="w-6 h-6 text-indigo-600" />,

      color: "bg-indigo-50 border-indigo-100",

      description: "Cognitive rule inversion & Stroop challenges",
    },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md h-[90vh] sm:h-[680px] bg-[#F4F4F4] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-[#E0E0E0] animate-fade-in-up">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="h-16 px-4 bg-white border-b border-[#E0E0E0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4589FF] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3
                style={{ fontFamily }}
                className="text-[16px] font-bold text-[#161616]"
              >
                Cognitive Booster
              </h3>
              <span className="text-[10px] text-[#525252]">
                Memory Aid & Brain Stimulation
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-[#525252] flex items-center justify-center hover:text-[#161616]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── Body Content ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Segmented Control: Activities | Assessments | Goals */}
          <div className="flex rounded-xl bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => setActiveSegment("activities")}
              className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                activeSegment === "activities"
                  ? "bg-white text-[#161616] shadow-xs"
                  : "text-[#525252] hover:text-[#161616]"
              }`}
            >
              Activities
            </button>
            <button
              type="button"
              onClick={() => setActiveSegment("assessments")}
              className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                activeSegment === "assessments"
                  ? "bg-white text-[#161616] shadow-xs"
                  : "text-[#525252] hover:text-[#161616]"
              }`}
            >
              Assessments
            </button>
            <button
              type="button"
              onClick={() => setActiveSegment("goals")}
              className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                activeSegment === "goals"
                  ? "bg-white text-[#161616] shadow-xs"
                  : "text-[#525252] hover:text-[#161616]"
              }`}
            >
              Goals
            </button>
          </div>

          {/* ─── HERO CARD: SwarSanket Quantum-ML Voice Screening ──────── */}
          <div className="rounded-2xl bg-gradient-to-br from-[#161616] via-[#2a2a2a] to-[#0d1f38] text-white p-4 relative overflow-hidden shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0F62FE]/30 text-blue-300 border border-blue-400/30 text-[10px] font-bold">
                Clinical Speech AI
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>

            <h4
              style={{ fontFamily }}
              className="text-[15px] font-bold text-white mb-1"
            >
              Voice Biomarker Check (8-Qubit VQC)
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
              10–15 second reading check to analyze phonation stability, pause
              durations, and acoustic jitter.
            </p>

            <button
              type="button"
              onClick={() => {
                onClose()

                onStartVoiceCheck()
              }}
              className="w-full py-2.5 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[12px] font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/30 active:scale-98 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Launch Voice Screening</span>
            </button>
          </div>

          {/* ─── Cognitive Booster Games Banner ──────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#0D9488] text-white p-4 shadow-md flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-teal-100 text-[10px] font-bold">
                Playable Games
              </span>
              <h4
                style={{ fontFamily }}
                className="text-sm font-bold text-white mt-1"
              >
                Cognitive Games Suite
              </h4>
              <p className="text-[11px] text-teal-100/90 mt-0.5 line-clamp-1">
                Logic Puzzle, Memory Treasure, Attention & Speed
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenCognitiveGames?.()
              }}
              className="px-3.5 py-2 rounded-xl bg-white text-teal-800 text-xs font-bold shadow-sm hover:bg-teal-50 active:scale-95 transition-all shrink-0"
            >
              Play Games
            </button>
          </div>

          {/* ─── 6 Cognitive Activity Cards (Figma Grid 124x176) ───────── */}
          <div>
            <h4
              style={{ fontFamily }}
              className="text-[13px] font-bold text-[#161616] mb-2.5 px-1 flex items-center justify-between"
            >
              <span>Daily Brain Exercises</span>
              {onOpenCognitiveGames && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenCognitiveGames()
                  }}
                  className="text-[11px] text-[#0F62FE] font-medium hover:underline"
                >
                  Open Games Hub →
                </button>
              )}
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              {activities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => {
                    onClose()
                    onOpenCognitiveGames?.()
                  }}
                  className={`p-3 rounded-2xl border ${act.color} bg-white flex flex-col justify-between h-[128px] shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-98`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      {act.icon}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                      Daily
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#525252] block leading-none">
                      {act.subtitle}
                    </span>
                    <h5
                      style={{ fontFamily }}
                      className="text-[13px] font-bold text-[#161616] mt-0.5 leading-tight"
                    >
                      {act.title}
                    </h5>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Links: Tips and Recommendations & Support ─────────────── */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              className="w-full p-3 rounded-xl bg-white border border-[#E0E0E0] hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
            >
              <span
                style={{ fontFamily }}
                className="text-[12px] font-semibold text-[#161616]"
              >
                Tips and Recommendations
              </span>
              <ChevronRight className="w-4 h-4 text-[#525252]" />
            </button>

            <button
              type="button"
              className="w-full p-3 rounded-xl bg-white border border-[#E0E0E0] hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#525252]" />
                <span
                  style={{ fontFamily }}
                  className="text-[12px] font-semibold text-[#161616]"
                >
                  Help and Support
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#525252]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
