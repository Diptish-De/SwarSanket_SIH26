import React, { useState, useEffect } from "react"

import {
  Sparkles,
  ChevronRight,
  Info,
  Award,
  Brain,
  Zap,
  Compass,
  RotateCcw,
} from "lucide-react"

import { CognitiveGameId, COGNITIVE_GAMES_META, GameProgress } from "./types"

import { getAllGamesProgress, formatGameTime } from "./storage"

import LogicPuzzleGame from "./LogicPuzzleGame"

import MemoryTreasureGame from "./MemoryTreasureGame"

import SelectiveAttentionGame from "./SelectiveAttentionGame"

import SpeedVisualisationGame from "./SpeedVisualisationGame"

interface CognitiveGamesHubProps {
  onBack: () => void

  initialGame?: CognitiveGameId | null

  fontFamily?: string
}

export default function CognitiveGamesHub({
  onBack,

  initialGame = null,

  fontFamily = "'Outfit', sans-serif",
}: CognitiveGamesHubProps) {
  const [activeGame, setActiveGame] = useState<CognitiveGameId | null>(
    initialGame,
  )

  const [progressMap, setProgressMap] =
    useState<Record<CognitiveGameId, GameProgress>>(() => getAllGamesProgress())

  useEffect(() => {
    setProgressMap(getAllGamesProgress())
  }, [activeGame])

  // If a game is active, render that game

  if (activeGame === "logic_puzzle") {
    return (
      <LogicPuzzleGame
        onBack={() => setActiveGame(null)}
        fontFamily={fontFamily}
      />
    )
  }

  if (activeGame === "memory_treasure") {
    return (
      <MemoryTreasureGame
        onBack={() => setActiveGame(null)}
        fontFamily={fontFamily}
      />
    )
  }

  if (activeGame === "selective_attention") {
    return (
      <SelectiveAttentionGame
        onBack={() => setActiveGame(null)}
        fontFamily={fontFamily}
      />
    )
  }

  if (activeGame === "speed_visualisation") {
    return (
      <SpeedVisualisationGame
        onBack={() => setActiveGame(null)}
        fontFamily={fontFamily}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-y-auto select-none">
      {/* ─── Top Header ─────────────────────────────────────────────── */}
      <div className="h-[72px] px-4 flex items-center bg-[#F4F4F4] border-b border-[#E0E0E0] sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <h1
            style={{ fontFamily }}
            className="text-[20px] font-bold text-[#161616] tracking-tight"
          >
            Cognitive Games
          </h1>
        </div>
      </div>

      <div className="flex-1 max-w-xl w-full mx-auto p-4 pb-0 sm:p-6 sm:pb-0 space-y-4">
        {/* ─── Hero Banner: Cognitive Booster ────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0F766E] to-[#0D9488] text-white p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-teal-100 text-[11px] font-bold tracking-wide">
                Interactive Brain Booster
              </span>
              <h2
                style={{ fontFamily }}
                className="text-xl sm:text-2xl font-bold text-white mt-1 leading-tight"
              >
                Cognitive Booster
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-1 leading-relaxed">
                Play fun activities designed for cognitive engagement.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-teal-100">
            <span>4 Activities Available</span>
            <span className="font-semibold text-white">
              100% Offline & Private
            </span>
          </div>
        </div>

        {/* ─── 4 Games Cards Grid ────────────────────────────────────── */}
        <div className="space-y-3">
          {COGNITIVE_GAMES_META.map((meta) => {
            const prog = progressMap[meta.id]

            let statText = "New • Tap to play"

            if (prog && prog.bestScore > 0) {
              if (meta.id === "logic_puzzle") {
                statText = `Best: ${prog.bestScore} pts • Level ${prog.highestLevel}`
              } else if (meta.id === "memory_treasure") {
                statText = `Best: ${prog.bestScore} pts • Best Time: ${formatGameTime(prog.bestTimeSeconds)}`
              } else if (meta.id === "selective_attention") {
                statText = `Best: ${prog.bestScore} pts • Streak: ${prog.bestStreak}`
              } else if (meta.id === "speed_visualisation") {
                statText = `Best: ${prog.bestScore} pts • ${prog.gamesPlayed} played`
              }
            }

            return (
              <div
                key={meta.id}
                onClick={() => setActiveGame(meta.id)}
                className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex items-center gap-4 group"
              >
                {/* Game Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs group-hover:scale-105 transition-transform shrink-0 ${meta.bgLight}`}
                >
                  {meta.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      style={{ fontFamily }}
                      className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors"
                    >
                      {meta.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {meta.tag}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {meta.subtitle}
                  </p>

                  <div className="mt-2">
                    <span className="inline-block text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                      {statText}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── Medical Disclaimer Banner ─────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 text-xs text-slate-500 flex items-start gap-3 shadow-xs">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            These games are for cognitive engagement and entertainment. Game
            scores are not a medical diagnosis.
          </p>
        </div>
      </div>
    </div>
  )
}
