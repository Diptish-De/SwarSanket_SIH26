import React, { useState } from "react"
import { ScreeningSession } from "../../types"
import { AloisTab } from "./types"
import AloisHeader from "./AloisHeader"
import AloisHomeDashboard from "./AloisHomeDashboard"
import AloisMedicationTracker from "./AloisMedicationTracker"
import AloisDailyCare from "./AloisDailyCare"
import AloisWhereAmIModal from "./AloisWhereAmIModal"
import AloisDoctorBookingModal from "./AloisDoctorBookingModal"
import AloisBottomNav from "./AloisBottomNav"
import {
  User,
  Shield,
  History,
  Stethoscope,
  LogOut,
  FileText,
  CheckCircle2,
  QrCode,
} from "lucide-react"

interface AloisContainerProps {
  patientName: string
  caregiverName?: string
  isAssisted?: boolean
  selectedLanguageName: string
  latestSession?: ScreeningSession | null
  onStartVoiceCheck: () => void
  onViewReport: () => void
  onSwitchProfile: () => void
  onLogout: () => void
  onOpenLanguageModal?: () => void
  onOpenHistory?: () => void
  onOpenDoctorDash?: () => void
  fontFamily?: string
}

export default function AloisContainer({
  patientName,
  caregiverName,
  isAssisted = false,
  selectedLanguageName,
  latestSession,
  onStartVoiceCheck,
  onViewReport,
  onSwitchProfile,
  onLogout,
  onOpenLanguageModal,
  onOpenHistory,
  onOpenDoctorDash,
  fontFamily = "'Outfit', sans-serif",
}: AloisContainerProps) {
  const [activeTab, setActiveTab] = useState<AloisTab>("home")
  const [showSafetyModal, setShowSafetyModal] = useState(false)
  const [showDoctorModal, setShowDoctorModal] = useState(false)

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* ─── Alois Top Header ─────────────────────────────────────────── */}
      <AloisHeader
        patientName={patientName}
        caregiverName={caregiverName}
        isAssisted={isAssisted}
        selectedLanguageName={selectedLanguageName}
        onSwitchProfile={onSwitchProfile}
        onOpenLanguageModal={onOpenLanguageModal}
        fontFamily={fontFamily}
      />

      {/* ─── Active Tab Content View ─────────────────────────────────── */}
      {activeTab === "home" && (
        <AloisHomeDashboard
          patientName={patientName}
          latestSession={latestSession}
          onStartVoiceCheck={onStartVoiceCheck}
          onSelectTab={setActiveTab}
          onOpenDoctorModal={() => setShowDoctorModal(true)}
          onOpenSafetyModal={() => setShowSafetyModal(true)}
          onViewReport={onViewReport}
          fontFamily={fontFamily}
        />
      )}

      {activeTab === "meds" && (
        <AloisMedicationTracker fontFamily={fontFamily} />
      )}

      {activeTab === "routine" && (
        <AloisDailyCare
          onStartVoiceCheck={onStartVoiceCheck}
          fontFamily={fontFamily}
        />
      )}

      {activeTab === "profile" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24 text-left">
          {/* Profile Card */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/25">
                {patientName[0] || "P"}
              </div>
              <div>
                <h3
                  style={{ fontFamily }}
                  className="text-lg font-bold text-slate-900"
                >
                  {patientName}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAssisted
                    ? "Caregiver Supervised Profile"
                    : "Independent Senior Profile"}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Active Patient
                  </span>
                </div>
              </div>
            </div>

            {/* Optional ABHA Identity Card Display */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Ayushman Bharat Health Account (ABDM)
                </div>
                <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <span>91-4523-8812-4019</span>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded">
                    Linked
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ABHA Address: {patientName.toLowerCase().replace(/\s+/g, "")}
                  @abdm
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600">
                <QrCode className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-2">
            <h4
              style={{ fontFamily }}
              className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1"
            >
              Actions & Navigation
            </h4>

            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="w-full p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-between transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <History className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Past Voice Check History
                  </span>
                </div>
              </button>
            )}

            {latestSession && (
              <button
                type="button"
                onClick={onViewReport}
                className="w-full p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-between transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Print / Export Clinical PDF
                  </span>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={onSwitchProfile}
              className="w-full p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-between transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  Switch Household Member
                </span>
              </div>
            </button>

            {onOpenDoctorDash && (
              <button
                type="button"
                onClick={onOpenDoctorDash}
                className="w-full p-3.5 rounded-2xl bg-white border border-blue-200/80 hover:bg-blue-50/50 flex items-center justify-between transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-600 text-white">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-blue-900">
                    Doctor Clinical Hub (Desktop View)
                  </span>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="w-full p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-700 hover:bg-rose-100/70 flex items-center justify-between transition-colors mt-4"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-bold">Sign Out</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ─── Alois Floating Bottom Navigation ─────────────────────────── */}
      <AloisBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSafetyModal={() => setShowSafetyModal(true)}
      />

      {/* ─── Modals ───────────────────────────────────────────────────── */}
      <AloisWhereAmIModal
        isOpen={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        fontFamily={fontFamily}
      />

      <AloisDoctorBookingModal
        isOpen={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
        fontFamily={fontFamily}
      />
    </div>
  )
}
