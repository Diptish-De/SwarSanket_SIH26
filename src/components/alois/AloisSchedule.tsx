import React, { useState } from "react"

import {
  ChevronLeft,
  Bell,
  Settings,
  Phone,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Pill,
  Calendar as CalendarIcon,
} from "lucide-react"

interface AloisScheduleProps {
  onBack: () => void

  onStartVoiceCheck?: () => void

  onOpenDoctorModal: () => void

  onSelectDoctor?: (doctorId: string) => void

  onOpenAppointments?: () => void

  onOpenSettings: () => void

  fontFamily?: string
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"]

const WEEKS: (number | null)[][] = [
  [null, null, null, null, 1, 2, 3],

  [4, 5, 6, 7, 8, 9, 10],

  [11, 12, 13, 14, 15, 16, 17],

  [18, 19, 20, 21, 22, 23, 24],

  [25, 26, 27, 28, 29, 30, null],
]

/**
 * Schedule Screen — exact replica of Figma node 449:14810 & app/(main)/schedule.tsx.
 */

export default function AloisSchedule({
  onBack,

  onStartVoiceCheck: _onStartVoiceCheck,

  onOpenDoctorModal,

  onSelectDoctor,

  onOpenAppointments,

  onOpenSettings,

  fontFamily = "'Outfit', sans-serif",
}: AloisScheduleProps) {
  const [selectedDay, setSelectedDay] = useState(15)

  const [activeTab, setActiveTab] =
    useState<"Medications" | "Appointments" | "Events">("Appointments")

  const availableDoctors = [
    {
      id: "deccan-kay",

      name: "Dr. Deccan Kay",

      specialty: "Neurologist",

      avatarUrl: "/doctors/doctor-deccan-kay.jpg",

      color: "from-purple-600 to-indigo-600",
    },

    {
      id: "andrew-lucas",

      name: "Dr. Andrew Lucas",

      specialty: "Neurologist",

      avatarUrl: "/doctors/doctor-andrew-lucas.jpg",

      color: "from-blue-600 to-indigo-600",
    },

    {
      id: "kalvin-mathew",

      name: "Dr. Kalvin Mathew",

      specialty: "Neurologist",

      avatarUrl: "/doctors/doctor-kalvin-portrait.jpg",

      color: "from-emerald-600 to-teal-600",
    },
  ]

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
            Schedule
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

      <div className="px-4 pt-3 space-y-5 max-w-[375px] mx-auto">
        {/* ─── 2. Full Month Calendar (Figma node 816:31813) ─────────────── */}
        <div className="w-full rounded-2xl bg-white border border-[#E0E0E0] p-4 shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
          {/* Calendar Header: Year & Month Dropdowns */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              className="flex items-center gap-1.5 text-[14px] font-semibold text-[#161616] hover:text-[#0F62FE] transition-colors"
            >
              <span>2023</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#525252]" />
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 text-[14px] font-semibold text-[#161616] hover:text-[#0F62FE] transition-colors"
            >
              <span>Aug</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#525252]" />
            </button>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((day, idx) => (
              <span
                key={idx}
                className="text-[12px] font-medium text-[#8D8D8D] py-1"
              >
                {day}
              </span>
            ))}
          </div>

          {/* 5-Row Dates Grid */}
          <div className="space-y-1">
            {WEEKS.map((week, rIdx) => (
              <div key={rIdx} className="grid grid-cols-7 gap-1 text-center">
                {week.map((d, cIdx) => {
                  if (d === null) {
                    return <div key={cIdx} className="h-8" />
                  }

                  const isSelected = d === selectedDay

                  return (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => setSelectedDay(d)}
                      className={`h-8 w-8 mx-auto rounded-full text-[13px] font-medium flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[#0F62FE] text-white font-semibold shadow-xs"
                          : "text-[#161616] hover:bg-slate-100"
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ─── 3. Segmented Control Tabs (Medications, Appointments, Events) ── */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/80">
          {(["Medications", "Appointments", "Events"] as const).map((tab) => {
            const active = activeTab === tab

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-2 text-[12px] font-semibold rounded-lg transition-all ${
                  active
                    ? "bg-white text-[#161616] shadow-xs"
                    : "text-[#525252] hover:text-[#161616]"
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* ─── TAB CONTENT: Appointments (Default in Screenshot) ───────── */}
        {activeTab === "Appointments" && (
          <div className="space-y-5">
            {/* Upcoming Doctor Card */}
            <div>
              <h2
                style={{ fontFamily }}
                className="text-[14px] font-medium text-[#161616] mb-3 px-1"
              >
                Upcoming
              </h2>

              <div
                onClick={() => {
                  if (onSelectDoctor) onSelectDoctor("kalvin-mathew")
                  else onOpenDoctorModal()
                }}
                className="w-full min-h-[104px] rounded-xl bg-white border border-[#E0E0E0] p-3 relative overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.06)] cursor-pointer hover:border-blue-300 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-bold flex items-center justify-center text-lg shadow-sm shrink-0 border border-slate-100">
                    <img
                      src="/doctors/doctor-kalvin-portrait.jpg"
                      alt="Dr. Kalvin Mathew"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <h3
                      style={{ fontFamily }}
                      className="text-[14px] font-semibold text-[#161616] truncate group-hover:text-[#0F62FE] transition-colors"
                    >
                      Dr. Kalvin Mathew
                    </h3>
                    <p className="text-[12px] text-[#525252] truncate mt-0.5">
                      Neurologist
                    </p>

                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDoctorModal()
                        }}
                        title="Call"
                        className="w-7 h-7 rounded-lg bg-[#393939] text-white flex items-center justify-center hover:bg-[#161616] transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDoctorModal()
                        }}
                        title="Message"
                        className="w-7 h-7 rounded-lg bg-[#393939] text-white flex items-center justify-center hover:bg-[#161616] transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDoctorModal()
                        }}
                        className="px-3 py-1 rounded-lg bg-[#0F62FE] text-white text-[12px] font-semibold hover:bg-[#0353e9] transition-colors ml-1"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Doctors (Horizontal Carousel) */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2
                  style={{ fontFamily }}
                  className="text-[14px] font-medium text-[#161616]"
                >
                  Available Doctors
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAppointments) onOpenAppointments()
                    else onOpenDoctorModal()
                  }}
                  className="text-[12px] font-medium text-[#0F62FE] hover:underline"
                >
                  See all
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                {availableDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (onSelectDoctor) onSelectDoctor(doc.id)
                      else onOpenDoctorModal()
                    }}
                    className="min-w-[200px] rounded-xl bg-white border border-[#E0E0E0] p-3 shadow-xs flex flex-col justify-between shrink-0 cursor-pointer hover:border-blue-300 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className={`w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-tr ${doc.color} text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 border border-slate-100`}
                      >
                        <img
                          src={doc.avatarUrl}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4
                          style={{ fontFamily }}
                          className="text-[13px] font-semibold text-[#161616] truncate group-hover:text-[#0F62FE] transition-colors"
                        >
                          {doc.name}
                        </h4>
                        <p className="text-[11px] text-[#525252] truncate mt-0.5">
                          {doc.specialty}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDoctorModal()
                        }}
                        title="Call"
                        className="w-7 h-7 rounded-lg bg-[#393939] text-white flex items-center justify-center hover:bg-[#161616] transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDoctorModal()
                        }}
                        title="Message"
                        className="w-7 h-7 rounded-lg bg-[#393939] text-white flex items-center justify-center hover:bg-[#161616] transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onSelectDoctor) onSelectDoctor(doc.id)
                          else onOpenDoctorModal()
                        }}
                        className="flex-1 py-1 rounded-lg bg-[#0F62FE] text-white text-[12px] font-semibold text-center hover:bg-[#0353e9] transition-colors"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* List Rows */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={onOpenDoctorModal}
                className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3.5 flex items-center justify-between text-left shadow-2xs hover:border-blue-300 transition-colors"
              >
                <span className="text-[13px] font-medium text-[#161616]">
                  Previous Appointments
                </span>
                <ChevronRight className="w-4 h-4 text-[#8D8D8D]" />
              </button>

              <button
                type="button"
                onClick={onOpenDoctorModal}
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

        {/* ─── TAB CONTENT: Medications ────────────────────────────────── */}
        {activeTab === "Medications" && (
          <div className="space-y-3">
            {[
              {
                name: "Donepezil (Aricept)",

                dose: "10 mg",

                time: "08:00 AM",

                taken: true,
              },

              {
                name: "Memantine HCl",

                dose: "10 mg",

                time: "01:00 PM",

                taken: false,
              },

              {
                name: "Coenzyme Q10",

                dose: "100 mg",

                time: "08:00 PM",

                taken: false,
              },
            ].map((med, idx) => (
              <div
                key={idx}
                className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3 flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FA4D56]/15 text-[#FA4D56] flex items-center justify-center">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-[#161616]">
                      {med.name}
                    </h4>
                    <p className="text-[11px] text-[#6F6F6F]">
                      {med.dose} • {med.time}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                    med.taken
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {med.taken ? "Taken" : "Scheduled"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB CONTENT: Events ─────────────────────────────────────── */}
        {activeTab === "Events" && (
          <div className="space-y-3">
            <div className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3 flex items-center justify-between shadow-2xs">
              <div className="w-[90px] h-[64px] rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex flex-col items-center justify-center shrink-0 p-1 text-center shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Ride
                </span>
                <span className="text-[8px] opacity-80">TO END ALZ</span>
              </div>
              <div className="flex-1 ml-3 text-right">
                <h4 className="text-[13px] font-semibold text-[#161616]">
                  Ride to End ALZ®
                </h4>
                <p className="text-[11px] text-[#525252] mt-1 leading-snug">
                  A Ride to Fuel Alzheimer's Research.
                </p>
              </div>
            </div>

            <div className="w-full rounded-xl bg-white border border-[#E0E0E0] p-3 flex items-center justify-between shadow-2xs">
              <div className="w-[90px] h-[64px] rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex flex-col items-center justify-center shrink-0 p-1 text-center shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Walk
                </span>
                <span className="text-[8px] opacity-80">TO END ALZ</span>
              </div>
              <div className="flex-1 ml-3 text-right">
                <h4 className="text-[13px] font-semibold text-[#161616]">
                  WALK TO END ALZHEIMER’S®
                </h4>
                <p className="text-[11px] text-[#525252] mt-1 leading-snug">
                  Together, we can end Alzheimer's disease.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
