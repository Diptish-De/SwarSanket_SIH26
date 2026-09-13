import React, { useState } from "react"

import {
  ChevronLeft,
  Bell,
  Settings,
  Search,
  Star,
  MoreVertical,
  ChevronRight,
  Activity,
  Mic,
  Brain,
  Eye,
  Clock,
} from "lucide-react"

interface AloisAppointmentsProps {
  onBack: () => void

  onSelectDoctor: (doctorId: string) => void

  onOpenSettings: () => void

  onStartVoiceCheck?: () => void

  onOpenDoctorModal?: () => void

  fontFamily?: string
}

interface Doctor {
  id: string

  name: string

  specialty: string

  rating: number

  reviewsCount: string

  avatarUrl: string

  fallbackInitials: string
}

const DOCTORS: Doctor[] = [
  {
    id: "andrew-lucas",

    name: "Dr. Andrew Lucas",

    specialty: "Neurologist",

    rating: 5,

    reviewsCount: "(122) Reviews",

    avatarUrl: "/doctors/doctor-andrew-lucas.jpg",

    fallbackInitials: "AL",
  },

  {
    id: "kalvin-mathew",

    name: "Dr. Kalvin Mathew",

    specialty: "Neurologist",

    rating: 5,

    reviewsCount: "(122) Reviews",

    avatarUrl: "/doctors/doctor-kalvin-portrait.jpg",

    fallbackInitials: "KM",
  },

  {
    id: "deccan-kay",

    name: "Dr. Deccan Kay",

    specialty: "Neurologist",

    rating: 5,

    reviewsCount: "(122) Reviews",

    avatarUrl: "/doctors/doctor-deccan-kay.jpg",

    fallbackInitials: "DK",
  },
]

/**
 * Appointments Screen — exact replica of Figma node 451:16134 (Screen 3 in canvas).
 * Clean, simple UI matching the provided screenshot and zip.
 */

export default function AloisAppointments({
  onBack,

  onSelectDoctor,

  onOpenSettings,

  onStartVoiceCheck,

  onOpenDoctorModal,

  fontFamily = "'Outfit', sans-serif",
}: AloisAppointmentsProps) {
  const [tab, setTab] = useState<"Doctors" | "Tests">("Doctors")

  const [searchQuery, setSearchQuery] = useState("")

  const filteredDoctors = DOCTORS.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28">
      {/* ─── 1. Nav Bar (Figma node 888:32886: 375 x 72) ────────────────── */}
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
            Appointments
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
        {/* ─── 2. Search Field ─────────────────────────────────────────── */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8D8D8D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-[#E0E0E0] text-[14px] text-[#161616] placeholder-[#8D8D8D] focus:outline-hidden focus:border-[#0F62FE] transition-colors shadow-2xs"
          />
        </div>

        {/* ─── 3. Segmented Control (Doctors | Tests) ──────────────────── */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/80">
          {(["Doctors", "Tests"] as const).map((option) => {
            const active = tab === option

            return (
              <button
                key={option}
                type="button"
                onClick={() => setTab(option)}
                className={`py-2 text-[13px] font-semibold rounded-lg transition-all ${
                  active
                    ? "bg-white text-[#161616] shadow-xs"
                    : "text-[#525252] hover:text-[#161616]"
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>

        {/* ─── DOCTORS TAB CONTENT ─────────────────────────────────────── */}
        {tab === "Doctors" && (
          <div className="space-y-3 pt-1">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                onClick={() => onSelectDoctor(doctor.id)}
                className="w-full min-h-[104px] rounded-xl bg-white border border-[#E0E0E0] p-3 relative overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.06)] cursor-pointer hover:border-blue-300 active:scale-[0.99] transition-all group"
              >
                {/* Subtle Memphis Pattern watermark @ 5% */}
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
                  <img
                    src={doctor.avatarUrl}
                    alt={doctor.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-100 shadow-xs shrink-0"
                    onError={(e) => {
                      // Fallback if image fails

                      e.currentTarget.style.display = "none"
                    }}
                  />

                  {/* Doctor Info */}
                  <div className="flex-1 min-w-0 pr-6">
                    <h3
                      style={{ fontFamily }}
                      className="text-[14px] font-semibold text-[#161616] truncate group-hover:text-[#0F62FE] transition-colors"
                    >
                      {doctor.name}
                    </h3>
                    <p className="text-[12px] text-[#525252] truncate mt-0.5">
                      {doctor.specialty}
                    </p>

                    {/* Rating row: 5 Stars + Reviews count */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="flex items-center text-[#F1C21B]">
                        {[...Array(doctor.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-3.5 h-3.5 fill-[#F1C21B] text-[#F1C21B]"
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-[#6F6F6F]">
                        {doctor.reviewsCount}
                      </span>
                    </div>
                  </div>

                  {/* Overflow Menu */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()

                      if (onOpenDoctorModal) onOpenDoctorModal()
                    }}
                    className="absolute top-3 right-2 text-[#525252] hover:text-[#161616] p-1"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* See all button */}
            <div className="text-center pt-2 pb-1">
              <button
                type="button"
                onClick={() => {}}
                className="text-[13px] font-semibold text-[#0F62FE] hover:underline"
              >
                See all
              </button>
            </div>

            {/* List Rows */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {}}
                className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3.5 flex items-center justify-between text-left shadow-2xs hover:border-blue-300 transition-colors"
              >
                <span className="text-[13px] font-medium text-[#161616]">
                  Upcoming Appointments
                </span>
                <ChevronRight className="w-4 h-4 text-[#8D8D8D]" />
              </button>

              <button
                type="button"
                onClick={() => {}}
                className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3.5 flex items-center justify-between text-left shadow-2xs hover:border-blue-300 transition-colors"
              >
                <span className="text-[13px] font-medium text-[#161616]">
                  My Reminder
                </span>
                <ChevronRight className="w-4 h-4 text-[#8D8D8D]" />
              </button>

              <button
                type="button"
                onClick={() => {}}
                className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3.5 flex items-center justify-between text-left shadow-2xs hover:border-blue-300 transition-colors"
              >
                <span className="text-[13px] font-medium text-[#161616]">
                  Notes
                </span>
                <ChevronRight className="w-4 h-4 text-[#8D8D8D]" />
              </button>
            </div>
          </div>
        )}

        {/* ─── TESTS TAB CONTENT ───────────────────────────────────────── */}
        {tab === "Tests" && (
          <div className="space-y-3 pt-1">
            {/* Vocal Biomarker Test Card */}
            <div className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#0F62FE]/10 text-[#0F62FE] flex items-center justify-center shrink-0">
                  <Mic className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3
                      style={{ fontFamily }}
                      className="text-[14px] font-semibold text-[#161616]"
                    >
                      Vocal Biomarker Check
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                      Quantum ML
                    </span>
                  </div>
                  <p className="text-[12px] text-[#525252] mt-0.5">
                    8-qubit VQC speech & cognitive acoustic analysis
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-[#6F6F6F] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 2-3 mins
                    </span>
                    <button
                      type="button"
                      onClick={onStartVoiceCheck}
                      className="px-3 py-1 rounded-lg bg-[#0F62FE] text-white text-[12px] font-semibold hover:bg-[#0353e9] transition-colors"
                    >
                      Start Check
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* MMSE Cognitive Test */}
            <div className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Brain className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    style={{ fontFamily }}
                    className="text-[14px] font-semibold text-[#161616]"
                  >
                    Mini-Mental State Exam (MMSE)
                  </h3>
                  <p className="text-[12px] text-[#525252] mt-0.5">
                    Orientation, registration & recall test
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-[#6F6F6F] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 5 mins
                    </span>
                    <button
                      type="button"
                      onClick={onStartVoiceCheck}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 transition-colors"
                    >
                      Launch
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Saccadic Eye Tracking */}
            <div className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Eye className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    style={{ fontFamily }}
                    className="text-[14px] font-semibold text-[#161616]"
                  >
                    Saccadic Eye Tracking
                  </h3>
                  <p className="text-[12px] text-[#525252] mt-0.5">
                    Fixation stability & latency evaluation
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-[#6F6F6F] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 3 mins
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-[12px] font-semibold hover:bg-slate-200 transition-colors"
                    >
                      Calibrate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
