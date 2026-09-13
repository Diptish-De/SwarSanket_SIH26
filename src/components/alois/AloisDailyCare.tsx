import React, { useState } from "react"

import {
  ChevronLeft,
  Bell,
  Settings,
  Search,
  ThumbsUp,
  ChevronRight,
  Check,
  Sparkles,
  X,
} from "lucide-react"

interface AloisDailyCareProps {
  onBack?: () => void

  onStartVoiceCheck?: () => void

  onOpenSettings?: () => void

  fontFamily?: string
}

interface ChoreTask {
  id: string

  title: string

  completed: boolean
}

/**
 * Alois Daily Care Screen — matching Figma node 508:18094 & app/(main)/daily-plans.tsx / household-chores.tsx.
 */

export default function AloisDailyCare({
  onBack,

  onStartVoiceCheck,

  onOpenSettings,

  fontFamily = "'Outfit', sans-serif",
}: AloisDailyCareProps) {
  const [activeSegment, setActiveSegment] =
    useState<"pending" | "todo" | "done">("todo")

  const [searchQuery, setSearchQuery] = useState("")

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const [householdChores, setHouseholdChores] = useState<ChoreTask[]>([
    { id: "c1", title: "Wash dishes after breakfast", completed: true },

    { id: "c2", title: "Set the table for lunch", completed: false },

    { id: "c3", title: "Light living room dusting", completed: false },

    { id: "c4", title: "Water balcony plants", completed: false },
  ])

  const toggleChore = (id: string) => {
    setHouseholdChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c)),
    )
  }

  const tasks = [
    {
      id: "chores",

      title: "Household chores",

      desc: "Wash dishes, set the table, prepare food, sweep the floor, dust, etc...",

      percent: Math.round(
        (householdChores.filter((c) => c.completed).length /
          householdChores.length) *
          100,
      ),

      color: "from-blue-600 to-indigo-600",

      avatar: "🧹",
    },

    {
      id: "meals",

      title: "Mealtimes",

      desc: "Provide a balanced diet with hydration and rich variety of foods.",

      percent: 48,

      color: "from-amber-500 to-orange-500",

      avatar: "🥗",
    },

    {
      id: "personal",

      title: "Personal care",

      desc: "Bathing, dressing, morning grooming, and dental care routine.",

      percent: 85,

      color: "from-emerald-600 to-teal-600",

      avatar: "🛁",
    },

    {
      id: "creative",

      title: "Creative activities",

      desc: "Cognitive puzzles, adult coloring, music therapy, and reading.",

      percent: 30,

      color: "from-purple-600 to-violet-600",

      avatar: "🎨",
    },

    {
      id: "physical",

      title: "Physical activity",

      desc: "Gentle 15-minute garden walk and light stretching exercises.",

      percent: 10,

      color: "from-rose-500 to-pink-600",

      avatar: "🚶",
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28 relative">
      {/* ─── Nav Bar ─────────────────────────────────────────────────── */}
      <header className="h-[72px] px-4 flex items-center justify-between bg-[#F4F4F4] border-b border-[#E0E0E0] sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="w-9 h-9 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616] active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1
            style={{ fontFamily }}
            className="text-[20px] font-bold text-[#161616] tracking-tight"
          >
            Daily Cares
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
        {/* ─── Head Row: "You have 10 tasks in this month" + ThumbsUp ─── */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span
              style={{ fontFamily }}
              className="text-[14px] font-medium text-[#161616]"
            >
              You have <strong className="text-[#0F62FE]">10 tasks</strong> in
              this month
            </span>
            <span className="w-6 h-6 rounded-full bg-blue-50 text-[#0F62FE] flex items-center justify-center">
              <ThumbsUp className="w-3.5 h-3.5 fill-[#0F62FE]" />
            </span>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#6F6F6F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search daily care tasks..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] placeholder:text-[#6F6F6F] focus:outline-hidden focus:border-[#0F62FE]"
          />
        </div>

        {/* ─── Segmented Control: Pending | To-Do | Done ───────────────── */}
        <div className="flex rounded-xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setActiveSegment("pending")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSegment === "pending"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("todo")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSegment === "todo"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            To-Do
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("done")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSegment === "done"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Done
          </button>
        </div>

        {/* ─── Task Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <h2
            style={{ fontFamily }}
            className="text-[14px] font-semibold text-[#161616]"
          >
            Today's Tasks
          </h2>
          <span className="text-[11px] text-[#6F6F6F] hover:text-[#0F62FE] cursor-pointer">
            See All
          </span>
        </div>

        {/* ─── Task Cards (Figma TaskCard) ─────────────────────────────── */}
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() =>
                task.id === "chores" && setSelectedCategory("chores")
              }
              className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-2xs hover:border-blue-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                {/* Emoji / Icon Avatar */}
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                  <span>{task.avatar}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3
                      style={{ fontFamily }}
                      className="text-[14px] font-semibold text-[#161616] truncate group-hover:text-blue-600 transition-colors"
                    >
                      {task.title}
                    </h3>
                    <span className="text-[11px] font-bold text-[#0F62FE]">
                      {task.percent}%
                    </span>
                  </div>

                  <p className="text-[11px] text-[#525252] line-clamp-2 mt-0.5 leading-snug">
                    {task.desc}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2.5 overflow-hidden">
                    <div
                      className="h-full bg-[#0F62FE] rounded-full transition-all duration-300"
                      style={{ width: `${task.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Household Chores Subtask Modal (household-chores.tsx) ──── */}
      {selectedCategory === "chores" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[#E0E0E0] animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3
                  style={{ fontFamily }}
                  className="text-[16px] font-bold text-[#161616]"
                >
                  Household Chores
                </h3>
                <span className="text-[11px] text-[#525252]">
                  Gentle physical & cognitive routine
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-[#525252] flex items-center justify-center hover:text-[#161616]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 mb-5">
              {householdChores.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChore(c.id)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-left hover:bg-blue-50/40 transition-colors"
                >
                  <span
                    className={`text-[13px] ${
                      c.completed
                        ? "line-through text-slate-400"
                        : "text-slate-800 font-medium"
                    }`}
                  >
                    {c.title}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      c.completed
                        ? "bg-[#42BE65] text-white shadow-xs"
                        : "border-2 border-slate-300"
                    }`}
                  >
                    {c.completed && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="w-full py-2.5 rounded-xl bg-[#0F62FE] text-white text-[13px] font-semibold hover:bg-[#0353e9] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
