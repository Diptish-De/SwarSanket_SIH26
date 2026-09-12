import React, { useState } from "react"
import {
  CheckSquare,
  CheckCircle2,
  Circle,
  Sparkles,
  Heart,
  Footprints,
  Brain,
  Shield,
} from "lucide-react"
import { DailyChoreItem } from "./types"

const INITIAL_CHORES: DailyChoreItem[] = [
  {
    id: "c1",
    title: "Morning Hydration (Glass of warm water)",
    category: "personal",
    timeStr: "8:00 AM",
    completed: true,
  },
  {
    id: "c2",
    title: "15-Minute Garden Walk or Light Stretching",
    category: "activity",
    timeStr: "9:30 AM",
    completed: true,
  },
  {
    id: "c3",
    title: "SwarSanket Daily Voice Screening",
    category: "cognitive",
    timeStr: "11:00 AM",
    completed: false,
  },
  {
    id: "c4",
    title: "Review Family Album / Name 5 Relatives",
    category: "cognitive",
    timeStr: "4:00 PM",
    completed: false,
  },
  {
    id: "c5",
    title: "Evening Herbal Tea & Quiet Breathing",
    category: "personal",
    timeStr: "7:00 PM",
    completed: false,
  },
]

interface AloisDailyCareProps {
  onStartVoiceCheck?: () => void
  fontFamily?: string
}

export default function AloisDailyCare({
  onStartVoiceCheck,
  fontFamily = "'Outfit', sans-serif",
}: AloisDailyCareProps) {
  const [chores, setChores] = useState<DailyChoreItem[]>(INITIAL_CHORES)

  const toggleChore = (id: string) => {
    setChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c)),
    )
  }

  const completedCount = chores.filter((c) => c.completed).length
  const totalCount = chores.length
  const percent = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
      {/* Daily Progress Banner */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-200">
            Daily Routine Progress
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-white border border-emerald-400/40">
            {percent}% Completed
          </span>
        </div>

        <h2 style={{ fontFamily }} className="text-2xl font-bold">
          {completedCount} of {totalCount} Routines Finished
        </h2>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-emerald-950/30 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-emerald-300 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-xs text-emerald-100 mt-2">
          {percent >= 80
            ? "Fantastic progress today! Keep up the healthy habits."
            : "Steady routines reduce cognitive anxiety and maintain memory clarity."}
        </p>
      </div>

      {/* Routine Checklist */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3
            style={{ fontFamily }}
            className="text-sm font-bold text-slate-800 uppercase tracking-wider"
          >
            Today's Care Plan
          </h3>
          <span className="text-xs text-slate-400 font-medium">5 Tasks</span>
        </div>

        {chores.map((chore) => {
          const isVoiceTask = chore.id === "c3"
          return (
            <div
              key={chore.id}
              className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                chore.completed
                  ? "bg-slate-50/80 border-slate-200/80 text-slate-400 opacity-75"
                  : isVoiceTask
                    ? "bg-gradient-to-r from-blue-50/60 to-indigo-50/50 border-blue-200/90 shadow-xs text-slate-800"
                    : "bg-white border-slate-200/90 shadow-xs hover:shadow-md text-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleChore(chore.id)}
                  className={`p-1 rounded-xl transition-all active:scale-90 shrink-0 ${
                    chore.completed
                      ? "text-emerald-600"
                      : "text-slate-300 hover:text-slate-500"
                  }`}
                >
                  {chore.completed ? (
                    <CheckCircle2 className="w-6 h-6 fill-emerald-50 text-emerald-600" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-1.5">
                    {chore.category === "cognitive" ? (
                      <Brain className="w-3.5 h-3.5 text-indigo-600" />
                    ) : chore.category === "activity" ? (
                      <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {chore.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {chore.timeStr}
                    </span>
                  </div>

                  <h4
                    style={{ fontFamily }}
                    className={`text-sm font-semibold mt-0.5 ${
                      chore.completed
                        ? "line-through text-slate-400"
                        : "text-slate-900"
                    }`}
                  >
                    {chore.title}
                  </h4>
                </div>
              </div>

              {isVoiceTask && !chore.completed && onStartVoiceCheck && (
                <button
                  type="button"
                  onClick={onStartVoiceCheck}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 shadow-xs active:scale-95 transition-all"
                >
                  Start Check
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
