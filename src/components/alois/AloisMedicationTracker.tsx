import React, { useState } from "react"

import {
  ChevronLeft,
  Bell,
  Settings,
  MoreVertical,
  Plus,
  Check,
  Pill,
} from "lucide-react"

interface AloisMedicationTrackerProps {
  onBack?: () => void

  onOpenSettings?: () => void

  fontFamily?: string
}

interface MedItem {
  id: string

  name: string

  dose: string

  tags: {
    label: string

    bg: string

    fg: string
  }[]

  taken: boolean

  color: string
}

/**
 * Alois Medications Screen — matching Figma node 496:20424 & app/(main)/medications.tsx.
 */

export default function AloisMedicationTracker({
  onBack,

  onOpenSettings,

  fontFamily = "'Outfit', sans-serif",
}: AloisMedicationTrackerProps) {
  const [tab, setTab] = useState<"week" | "today" | "month">("today")

  const [selectedDay, setSelectedDay] = useState(15)

  const [medsList, setMedsList] = useState<MedItem[]>([
    {
      id: "1",

      name: "Rivastigmine",

      dose: "4.6 mg / 24 hr",

      tags: [
        { label: "09:00 AM", bg: "#F4F4F4", fg: "#161616" },

        { label: "After Meal", bg: "#F4F4F4", fg: "#161616" },
      ],

      taken: true,

      color: "#FA4D56",
    },

    {
      id: "2",

      name: "Donepezil",

      dose: "10 mg",

      tags: [
        { label: "08:00 PM", bg: "#F4F4F4", fg: "#161616" },

        { label: "Before Sleep", bg: "#F4F4F4", fg: "#161616" },
      ],

      taken: true,

      color: "#0F62FE",
    },

    {
      id: "3",

      name: "Galantamine",

      dose: "8 mg",

      tags: [
        { label: "01:00 PM", bg: "#F4F4F4", fg: "#161616" },

        { label: "After Lunch", bg: "#F4F4F4", fg: "#161616" },
      ],

      taken: false,

      color: "#42BE65",
    },
  ])

  const toggleTaken = (id: string) => {
    setMedsList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)),
    )
  }

  const days = [
    { day: "Sun", date: 13 },

    { day: "Mon", date: 14 },

    { day: "Tue", date: 15 },

    { day: "Wed", date: 16 },

    { day: "Thu", date: 17 },

    { day: "Fri", date: 18 },

    { day: "Sat", date: 19 },
  ]

  const takenCount = medsList.filter((m) => m.taken).length

  const totalCount = medsList.length

  const percent = Math.round((takenCount / totalCount) * 100)

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28">
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
            Medications
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
        {/* ─── Calendar Day Strip (Figma Calendar Component) ───────────── */}
        <div className="bg-white rounded-2xl border border-[#E0E0E0] p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span
              style={{ fontFamily }}
              className="text-[13px] font-bold text-[#161616]"
            >
              August 2026
            </span>
            <span className="text-[11px] text-[#6F6F6F]">Week 3</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {days.map((item) => {
              const isSelected = item.date === selectedDay

              return (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => setSelectedDay(item.date)}
                  className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? "bg-[#0F62FE] text-white font-bold shadow-xs scale-105"
                      : "hover:bg-slate-100 text-[#525252]"
                  }`}
                >
                  <span className="text-[10px] uppercase font-medium">
                    {item.day}
                  </span>
                  <span className="text-[14px] font-semibold mt-0.5">
                    {item.date}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── Segmented Control: Week | Today | Month ─────────────────── */}
        <div className="flex rounded-xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setTab("week")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              tab === "week"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setTab("today")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              tab === "today"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setTab("month")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              tab === "month"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Month
          </button>
        </div>

        {/* ─── Adherence Donut Progress Card ───────────────────────────── */}
        <div className="rounded-2xl bg-white border border-[#E0E0E0] p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F62FE]">
              Daily Adherence
            </span>
            <h3
              style={{ fontFamily }}
              className="text-[18px] font-bold text-[#161616] mt-0.5"
            >
              {takenCount} of {totalCount} Taken
            </h3>
            <p className="text-[11px] text-[#525252] mt-0.5">
              {percent === 100
                ? "All pills completed for today!"
                : `${totalCount - takenCount} dosage pending`}
            </p>
          </div>

          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#0F62FE] transition-all duration-500 ease-out"
                strokeDasharray={`${percent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-[#161616]">
              {percent}%
            </span>
          </div>
        </div>

        {/* ─── Medication Cards (Figma node 496:20424) ─────────────────── */}
        <div className="space-y-3 pt-1">
          {medsList.map((med) => (
            <div
              key={med.id}
              className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 flex items-start gap-3 shadow-2xs relative"
            >
              {/* Medicine Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs"
                style={{ backgroundColor: med.color }}
              >
                <Pill className="w-6 h-6" />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 pr-8">
                <h4
                  style={{ fontFamily }}
                  className="text-[14px] font-semibold text-[#161616] truncate"
                >
                  {med.name}
                </h4>
                <p className="text-[12px] text-[#525252] truncate mt-0.5">
                  {med.dose}
                </p>

                {/* Tags */}
                <div className="flex items-center gap-1.5 mt-2">
                  {med.tags.map((tag) => (
                    <span
                      key={tag.label}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Overflow Menu */}
              <button
                type="button"
                className="absolute top-3 right-3 text-[#525252] hover:text-[#161616]"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Interactive Checkbox */}
              <button
                type="button"
                onClick={() => toggleTaken(med.id)}
                title={med.taken ? "Mark not taken" : "Mark taken"}
                className={`absolute bottom-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  med.taken
                    ? "bg-[#42BE65] text-white shadow-xs"
                    : "border-2 border-slate-300 hover:border-slate-400 text-transparent"
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          ))}
        </div>

        {/* ─── Add Medication Button ───────────────────────────────────── */}
        <div className="pt-2">
          <button
            type="button"
            className="w-full py-3 rounded-xl bg-white border border-dashed border-[#0F62FE] text-[#0F62FE] text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-blue-50/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medication Reminder</span>
          </button>
        </div>
      </div>
    </div>
  )
}
