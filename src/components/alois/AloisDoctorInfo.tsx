import React from "react"

import {
  ChevronLeft,
  Bell,
  Settings,
  Phone,
  MessageSquare,
  Star,
} from "lucide-react"

interface AloisDoctorInfoProps {
  doctorId?: string

  onBack: () => void

  onBookAppointment: () => void

  onOpenSettings: () => void

  onOpenChat?: () => void

  fontFamily?: string
}

interface DoctorDetail {
  id: string

  name: string

  specialty: string

  rating: number

  reviewsCount: string

  photoUrl: string

  bio: string

  locationMapUrl: string
}

const DOCTORS_DATA: Record<string, DoctorDetail> = {
  "kalvin-mathew": {
    id: "kalvin-mathew",

    name: "Dr. Kalvin Mathew",

    specialty: "Neurologist",

    rating: 5,

    reviewsCount: "(3,222) Reviews",

    photoUrl: "/doctors/doctor-kalvin-portrait.jpg",

    bio: "Dr. Kalvin Mathew is an expert consultant neurologist and active clinician scientist in London, with a focus on linguistic profiles of disorders of the nervous system. He has more than 15 years",

    locationMapUrl: "/doctors/map-preview.jpg",
  },

  "andrew-lucas": {
    id: "andrew-lucas",

    name: "Dr. Andrew Lucas",

    specialty: "Neurologist",

    rating: 5,

    reviewsCount: "(1,850) Reviews",

    photoUrl: "/doctors/doctor-andrew-lucas.jpg",

    bio: "Dr. Andrew Lucas is a leading neuro-cognitive specialist focusing on early-stage memory retention therapies and longitudinal neurological monitoring with over 18 years of clinical practice.",

    locationMapUrl: "/doctors/map-preview.jpg",
  },

  "deccan-kay": {
    id: "deccan-kay",

    name: "Dr. Deccan Kay",

    specialty: "Neurologist",

    rating: 5,

    reviewsCount: "(1,220) Reviews",

    photoUrl: "/doctors/doctor-deccan-kay.jpg",

    bio: "Dr. Deccan Kay specializes in neurodegenerative clinical diagnosis, computerized cognitive assessments, and patient-centered memory rehabilitation programs.",

    locationMapUrl: "/doctors/map-preview.jpg",
  },
}

/**
 * Doctor Info Screen — exact replica of Figma node 476:16578 (Screen 4 in canvas).
 * Clean, simple UI matching the provided screenshot and zip.
 */

export default function AloisDoctorInfo({
  doctorId = "kalvin-mathew",

  onBack,

  onBookAppointment,

  onOpenSettings,

  onOpenChat,

  fontFamily = "'Outfit', sans-serif",
}: AloisDoctorInfoProps) {
  const doctor = DOCTORS_DATA[doctorId] || DOCTORS_DATA["kalvin-mathew"]

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
            Info
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

      <div className="max-w-[375px] mx-auto">
        {/* ─── 2. Full-Width Doctor Portrait Photo ─────────────────────── */}
        <div className="w-full h-[280px] bg-slate-200 relative overflow-hidden">
          <img
            src={doctor.photoUrl}
            alt={doctor.name}
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* ─── 3. Dark Bottom Card (Figma node 476:16578: #393939) ─────── */}
        <div className="-mt-11 relative z-10 bg-[#393939] text-white rounded-t-[36px] px-6 pt-6 pb-8 shadow-[0_-8px_24px_rgba(0,0,0,0.18)]">
          {/* About Header (centered) */}
          <h2
            style={{ fontFamily }}
            className="text-[16px] font-semibold text-white text-center mb-4"
          >
            About
          </h2>

          {/* Doctor Header Row: Name & Role + Call & Chat Buttons */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex-1 min-w-0 pr-3">
              <h3
                style={{ fontFamily }}
                className="text-[20px] font-bold text-white tracking-tight truncate leading-tight"
              >
                {doctor.name}
              </h3>
              <p className="text-[13px] font-medium text-[#C6C6C6] mt-0.5">
                {doctor.specialty}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Phone Button: #0F62FE */}
              <button
                type="button"
                onClick={onBookAppointment}
                title="Call doctor"
                className="w-10 h-10 rounded-xl bg-[#0F62FE] text-white flex items-center justify-center hover:bg-[#0353e9] active:scale-95 transition-all shadow-sm"
              >
                <Phone className="w-4 h-4" />
              </button>

              {/* Chat Button: #0F62FE */}
              <button
                type="button"
                onClick={onOpenChat}
                className="px-4 h-10 rounded-xl bg-[#0F62FE] text-white text-[13px] font-semibold flex items-center gap-1.5 hover:bg-[#0353e9] active:scale-95 transition-all shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </button>
            </div>
          </div>

          {/* Rating Row: 5 Gold Stars, Reviews, See all reviews */}
          <div className="flex items-center justify-between py-3 border-t border-[#525252]">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center text-[#F1C21B]">
                {[...Array(doctor.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-[#F1C21B] text-[#F1C21B]"
                  />
                ))}
              </div>
              <span className="text-[12px] text-[#A8A8A8] ml-1">
                {doctor.reviewsCount}
              </span>
            </div>

            <button
              type="button"
              className="text-[12px] font-semibold text-white hover:text-blue-300 transition-colors"
            >
              See all reviews
            </button>
          </div>

          {/* Bio Text */}
          <p className="text-[12px] text-[#A8A8A8] leading-[19px] text-justify pt-1 pb-4">
            {doctor.bio}{" "}
            <span className="text-white font-semibold cursor-pointer hover:underline">
              More...
            </span>
          </p>

          {/* Location Heading */}
          <div className="pt-2 pb-2">
            <h4
              style={{ fontFamily }}
              className="text-[14px] font-semibold text-white mb-2"
            >
              Location
            </h4>

            {/* Map Preview Image */}
            <div className="w-full h-[132px] rounded-2xl overflow-hidden border border-[#525252] relative shadow-inner">
              <img
                src={doctor.locationMapUrl}
                alt="Clinic Location Map"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-3 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-medium text-white">
                St. Thomas' Hospital, Westminster Bridge Rd, London
              </div>
            </div>
          </div>

          {/* Footer Action Buttons: Go Back (Ghost) + Book Appointment (Primary) */}
          <div className="flex items-center justify-between gap-4 pt-6">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-3 rounded-xl text-[14px] font-semibold text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              Go Back
            </button>

            <button
              type="button"
              onClick={onBookAppointment}
              className="flex-1 py-3 px-5 rounded-xl bg-[#0F62FE] text-white text-[14px] font-semibold text-center hover:bg-[#0353e9] active:scale-95 transition-all shadow-md shadow-blue-500/20"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
