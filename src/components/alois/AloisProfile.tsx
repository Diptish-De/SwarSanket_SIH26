import React from "react"

import {
  ChevronLeft,
  Edit2,
  Camera,
  User,
  FileText,
  Phone,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  QrCode,
  Globe,
  Stethoscope,
} from "lucide-react"

interface AloisProfileProps {
  patientName: string

  caregiverName?: string

  isAssisted?: boolean

  selectedLanguageName: string

  onBack: () => void

  onOpenHistory?: () => void

  onViewReport?: () => void

  onSwitchProfile: () => void

  onOpenLanguageModal?: () => void

  onOpenDoctorDash?: () => void

  onLogout: () => void

  fontFamily?: string
}

/**
 * Alois Profile Screen — matching Figma node 528:18409 & app/(main)/profile.tsx.
 * Integrates ABDM ABHA card, clinical records, language switcher, and settings.
 */

export default function AloisProfile({
  patientName,

  caregiverName = "Marcus",

  isAssisted = false,

  selectedLanguageName,

  onBack,

  onOpenHistory,

  onViewReport,

  onSwitchProfile,

  onOpenLanguageModal,

  onOpenDoctorDash,

  onLogout,

  fontFamily = "'Outfit', sans-serif",
}: AloisProfileProps) {
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
            Profile
          </h1>
        </div>

        <button
          type="button"
          aria-label="Edit Profile"
          className="w-9 h-9 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616] active:scale-95 transition-all"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-[375px] mx-auto">
        {/* ─── Avatar & Header (Figma 132x132 Avatar) ──────────────────── */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="relative">
            <div className="w-[110px] h-[110px] rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white font-bold text-3xl flex items-center justify-center shadow-lg shadow-blue-500/20 border-4 border-white">
              {patientName[0] || "J"}
            </div>
            <button
              type="button"
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0F62FE] text-white flex items-center justify-center border-2 border-white shadow-xs hover:bg-[#0353e9] transition-all"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <h2
            style={{ fontFamily }}
            className="text-[20px] font-bold text-[#161616] mt-3 tracking-tight"
          >
            {patientName || "Jerrold Harrington"}
          </h2>
          <p className="text-[12px] text-[#525252] mt-0.5">
            {isAssisted ? "Caregiver Assisted" : "Patient"} • Stage 1 MCI
          </p>
        </div>

        {/* ─── ABDM Ayushman Bharat Health Account (ABHA) Card ─────────── */}
        <div className="rounded-2xl bg-white border border-[#E0E0E0] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F62FE]">
              Ayushman Bharat Health Account
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Verified
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-bold text-[#161616] tracking-wide">
                91-4523-8812-4019
              </div>
              <div className="text-[11px] text-[#6F6F6F] mt-0.5">
                ABHA ID: {patientName.toLowerCase().replace(/\s+/g, "")}@abdm
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
              <QrCode className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ─── Menu Rows (Figma MenuRow) ──────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-[#E0E0E0] overflow-hidden shadow-2xs divide-y divide-slate-100">
          {/* Personal Data */}
          <button
            type="button"
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span
                style={{ fontFamily }}
                className="text-[13px] font-medium text-[#161616]"
              >
                Personal Data
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6F6F6F]" />
          </button>

          {/* Medical Record / Screening History */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span
                  style={{ fontFamily }}
                  className="text-[13px] font-medium text-[#161616] block"
                >
                  Medical Record & Reports
                </span>
                <span className="text-[10px] text-[#6F6F6F]">
                  Past Voice Screening & EHR
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6F6F6F]" />
          </button>

          {/* Emergency Contacts */}
          <button
            type="button"
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span
                  style={{ fontFamily }}
                  className="text-[13px] font-medium text-[#161616] block"
                >
                  Emergency Contacts
                </span>
                <span className="text-[10px] text-[#6F6F6F]">
                  Caregiver: {caregiverName}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6F6F6F]" />
          </button>

          {/* Language Selector */}
          <button
            type="button"
            onClick={onOpenLanguageModal}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span
                  style={{ fontFamily }}
                  className="text-[13px] font-medium text-[#161616] block"
                >
                  Language (Vernacular / ASHA)
                </span>
                <span className="text-[10px] text-blue-600 font-semibold">
                  {selectedLanguageName}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6F6F6F]" />
          </button>

          {/* Switch Household Member */}
          <button
            type="button"
            onClick={onSwitchProfile}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span
                style={{ fontFamily }}
                className="text-[13px] font-medium text-[#161616]"
              >
                Switch Household Profile
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6F6F6F]" />
          </button>

          {/* Doctor Clinical Hub (Desktop) */}
          {onOpenDoctorDash && (
            <button
              type="button"
              onClick={onOpenDoctorDash}
              className="w-full p-3.5 flex items-center justify-between hover:bg-blue-50/40 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <span
                  style={{ fontFamily }}
                  className="text-[13px] font-medium text-blue-900"
                >
                  Doctor View (Desktop)
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600" />
            </button>
          )}

          {/* Help & FAQs */}
          <button
            type="button"
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span
                style={{ fontFamily }}
                className="text-[13px] font-medium text-[#161616]"
              >
                Help & FAQs
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6F6F6F]" />
          </button>
        </div>

        {/* ─── Logout / Sign Out ───────────────────────────────────────── */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100/70 flex items-center justify-between text-left transition-colors mt-2"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-rose-600" />
            <span
              style={{ fontFamily }}
              className="text-[13px] font-bold text-rose-700"
            >
              Sign Out
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
