import React, { useState } from "react"
import {
  Pill,
  CheckCircle2,
  Clock,
  Plus,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import { MedicationItem } from "./types"

const INITIAL_MEDS: MedicationItem[] = [
  {
    id: "med-1",
    name: "Donepezil HCl",
    dosage: "5 mg (1 tablet)",
    timeOfDay: "morning",
    timeStr: "8:00 AM",
    instructions: "Take with breakfast and a glass of water",
    taken: true,
    color: "#3b82f6",
  },
  {
    id: "med-2",
    name: "Vitamin B-Complex & D3",
    dosage: "1 capsule",
    timeOfDay: "afternoon",
    timeStr: "1:30 PM",
    instructions: "After lunch for neuroprotection",
    taken: true,
    color: "#10b981",
  },
  {
    id: "med-3",
    name: "Melatonin",
    dosage: "3 mg (1 tablet)",
    timeOfDay: "night",
    timeStr: "9:30 PM",
    instructions: "30 minutes before sleep for restorative sleep cycles",
    taken: false,
    color: "#8b5cf6",
  },
]

interface AloisMedicationTrackerProps {
  fontFamily?: string
}

export default function AloisMedicationTracker({
  fontFamily = "'Outfit', sans-serif",
}: AloisMedicationTrackerProps) {
  const [meds, setMeds] = useState<MedicationItem[]>(INITIAL_MEDS)

  const toggleTaken = (id: string) => {
    setMeds((prev) =>
      prev.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)),
    )
  }

  const takenCount = meds.filter((m) => m.taken).length
  const totalCount = meds.length
  const progressPercent = Math.round((takenCount / totalCount) * 100)

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
      {/* Top Header Card with Circular Progress */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-5 shadow-lg shadow-blue-500/20 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-200">
            Daily Adherence
          </span>
          <h2 style={{ fontFamily }} className="text-2xl font-bold mt-0.5">
            {takenCount} of {totalCount} Taken
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            {progressPercent === 100
              ? "All medicines taken for today! Excellent."
              : `${totalCount - takenCount} remaining for this evening.`}
          </p>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-blue-400/30"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-emerald-300 transition-all duration-500 ease-out"
              strokeDasharray={`${progressPercent}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span
            style={{ fontFamily }}
            className="absolute text-sm font-extrabold text-white"
          >
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Pill List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3
            style={{ fontFamily }}
            className="text-sm font-bold text-slate-800 uppercase tracking-wider"
          >
            Today's Schedule
          </h3>
          <span className="text-xs text-slate-400 font-medium">3 Doses</span>
        </div>

        {meds.map((med) => {
          return (
            <div
              key={med.id}
              className={`p-4 rounded-2xl border transition-all duration-200 ${
                med.taken
                  ? "bg-slate-50/80 border-slate-200 text-slate-400 opacity-80"
                  : "bg-white border-slate-200/90 shadow-xs hover:shadow-md text-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: med.taken ? "#e2e8f0" : `${med.color}15`,
                      color: med.taken ? "#94a3b8" : med.color,
                    }}
                  >
                    <Pill className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4
                        style={{ fontFamily }}
                        className={`text-base font-bold ${
                          med.taken
                            ? "line-through text-slate-500"
                            : "text-slate-900"
                        }`}
                      >
                        {med.name}
                      </h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {med.dosage}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{med.timeStr}</span>
                      <span>•</span>
                      <span className="capitalize">{med.timeOfDay}</span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1.5 italic">
                      "{med.instructions}"
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleTaken(med.id)}
                  className={`p-2 rounded-xl transition-all active:scale-90 ${
                    med.taken
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                  title={med.taken ? "Mark as Not Taken" : "Mark as Taken"}
                >
                  <CheckCircle2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Safety Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          Medication schedules are configured by your primary caregiver or
          treating neurologist. Do not alter dosages without professional
          advice.
        </span>
      </div>
    </div>
  )
}
