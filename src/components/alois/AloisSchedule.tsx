import React, { useState } from "react"
import {
  ChevronLeft,
  Bell,
  Settings,
  Search,
  Phone,
  MessageSquare,
  Sparkles,
  Eye,
  Brain,
  Timer,
  CheckCircle2,
  Calendar as CalendarIcon,
  Star,
  Clock,
} from "lucide-react"

interface AloisScheduleProps {
  onBack: () => void
  onStartVoiceCheck: () => void
  onOpenDoctorModal: () => void
  onOpenSettings: () => void
  fontFamily?: string
}

/**
 * Alois Schedule & Clinical Tests Screen — matching Figma node 449:14810 & 451:16134.
 * Incorporates the SwarSanket Quantum-ML Voice Screening and Cognitive Tests.
 */
export default function AloisSchedule({
  onBack,
  onStartVoiceCheck,
  onOpenDoctorModal,
  onOpenSettings,
  fontFamily = "'Outfit', sans-serif",
}: AloisScheduleProps) {
  const [activeSegment, setActiveSegment] = useState<"doctors" | "tests">(
    "tests",
  )
  const [selectedDay, setSelectedDay] = useState(15)
  const [searchQuery, setSearchQuery] = useState("")

  const days = [
    { day: "Sun", date: 13 },
    { day: "Mon", date: 14 },
    { day: "Tue", date: 15 },
    { day: "Wed", date: 16 },
    { day: "Thu", date: 17 },
    { day: "Fri", date: 18 },
    { day: "Sat", date: 19 },
  ]

  const doctors = [
    {
      id: "1",
      name: "Dr. Andrew Lucas",
      department: "Neurology & Cognitive Health",
      rating: 5.0,
      time: "10:30 AM",
      avatar: "AL",
      color: "from-blue-600 to-indigo-600",
    },
    {
      id: "2",
      name: "Dr. Kalvin Mathew",
      department: "Geriatric Psychiatry",
      rating: 4.9,
      time: "02:00 PM",
      avatar: "KM",
      color: "from-emerald-600 to-teal-600",
    },
    {
      id: "3",
      name: "Dr. Deccan Kay",
      department: "Cognitive Rehabilitation",
      rating: 4.8,
      time: "04:15 PM",
      avatar: "DK",
      color: "from-purple-600 to-violet-600",
    },
  ]

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
            Schedule & Tests
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

        {/* ─── Segmented Control: Doctors | Tests ──────────────────────── */}
        <div className="flex rounded-xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setActiveSegment("tests")}
            className={`flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${
              activeSegment === "tests"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Clinical Tests
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("doctors")}
            className={`flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${
              activeSegment === "doctors"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Doctors
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#6F6F6F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSegment === "tests"
                ? "Search clinical assessments..."
                : "Search doctors or department..."
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] placeholder:text-[#6F6F6F] focus:outline-hidden focus:border-[#0F62FE]"
          />
        </div>

        {/* ─── TAB 1: Clinical Tests (Incorporating the ML & Tests) ───── */}
        {activeSegment === "tests" && (
          <div className="space-y-3 pt-1">
            {/* HERO TEST: SwarSanket Quantum-ML Voice Screening */}
            <div className="rounded-2xl bg-gradient-to-br from-[#161616] via-[#242424] to-[#1a1a2e] text-white p-4 relative overflow-hidden shadow-md border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Primary Assessment
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Timer className="w-3 h-3" /> 10–15 sec
                </span>
              </div>

              <h3
                style={{ fontFamily }}
                className="text-[16px] font-bold text-white mb-1"
              >
                Vocal Biomarker Screening (Quantum ML)
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-3.5">
                Evaluates phonation jitter, shimmer, pause ratio, and speech
                stability using an 8-qubit variational quantum circuit.
              </p>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Calibrated & Ready</span>
                </div>
                <button
                  type="button"
                  onClick={onStartVoiceCheck}
                  className="px-4 py-2 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[12px] font-bold shadow-md shadow-blue-500/30 active:scale-95 transition-all"
                >
                  Start Test Now
                </button>
              </div>
            </div>

            {/* Test 2: Saccadic Eye Tracking Test */}
            <div className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-2xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h4
                      style={{ fontFamily }}
                      className="text-[14px] font-semibold text-[#161616]"
                    >
                      Saccadic Eye Tracking Test
                    </h4>
                    <p className="text-[11px] text-[#525252] mt-0.5">
                      Visual fixation stability and saccade latency
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-[#6F6F6F]">
                  2 min
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Last result: 92% normal
                </span>
                <button
                  type="button"
                  onClick={onStartVoiceCheck}
                  className="text-[12px] font-semibold text-[#0F62FE] hover:underline"
                >
                  Launch Test
                </button>
              </div>
            </div>

            {/* Test 3: Mini-Mental State Examination (MMSE) */}
            <div className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-2xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h4
                      style={{ fontFamily }}
                      className="text-[14px] font-semibold text-[#161616]"
                    >
                      Mini-Mental State Exam (MMSE)
                    </h4>
                    <p className="text-[11px] text-[#525252] mt-0.5">
                      Orientation, attention, and memory recall
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-[#6F6F6F]">
                  5 min
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Last score: 27/30 (Mild)
                </span>
                <button
                  type="button"
                  onClick={onStartVoiceCheck}
                  className="text-[12px] font-semibold text-[#0F62FE] hover:underline"
                >
                  Launch Test
                </button>
              </div>
            </div>

            {/* Test 4: Psychomotor Finger Tapping Speed */}
            <div className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-2xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4
                      style={{ fontFamily }}
                      className="text-[14px] font-semibold text-[#161616]"
                    >
                      Psychomotor Finger Tapping
                    </h4>
                    <p className="text-[11px] text-[#525252] mt-0.5">
                      Motor speed rhythm and neuromuscular cadence
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-[#6F6F6F]">
                  30 sec
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Cadence: 48 taps / 10s
                </span>
                <button
                  type="button"
                  onClick={onStartVoiceCheck}
                  className="text-[12px] font-semibold text-[#0F62FE] hover:underline"
                >
                  Launch Test
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: Doctors List (Figma appointments.tsx) ────────────── */}
        {activeSegment === "doctors" && (
          <div className="space-y-3 pt-1">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${doc.color} text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0`}
                  >
                    {doc.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        style={{ fontFamily }}
                        className="text-[14px] font-semibold text-[#161616] truncate"
                      >
                        {doc.name}
                      </h4>
                      <div className="flex items-center gap-1 text-amber-500 text-[11px] font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{doc.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#525252] truncate mt-0.5">
                      {doc.department}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                      <Clock className="w-3 h-3 text-blue-500" />
                      <span>Next Slot: Today at {doc.time}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
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
                        onClick={onOpenDoctorModal}
                        title="Message Doctor"
                        className="w-7 h-7 rounded-lg bg-[#393939] text-white flex items-center justify-center hover:bg-[#161616] transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={onOpenDoctorModal}
                        className="flex-1 py-1.5 rounded-lg bg-[#0F62FE] text-white text-[12px] font-semibold text-center hover:bg-[#0353e9] transition-colors"
                      >
                        Book Teleconsult
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
