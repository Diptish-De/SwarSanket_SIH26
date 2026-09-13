import React, { useState } from "react"

import { ScreeningSession } from "../../types"

import { AloisTab } from "./types"

import AloisHomeDashboard from "./AloisHomeDashboard"

import AloisAppointments from "./AloisAppointments"

import AloisDoctorInfo from "./AloisDoctorInfo"

import AloisProgress from "./AloisProgress"

import AloisProfile from "./AloisProfile"

import AloisMedicationTracker from "./AloisMedicationTracker"

import AloisDailyCare from "./AloisDailyCare"

import AloisDoctorBookingModal from "./AloisDoctorBookingModal"

import AloisCognitiveBoosterModal from "./AloisCognitiveBoosterModal"

import AloisBottomNav from "./AloisBottomNav"

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

/**
 * Alois Container Orchestrator — full patient shell coordinating the 5 Alois tabs,
 * sub-screens, modals, and the SwarSanket Quantum-ML screening pipeline.
 */

export default function AloisContainer({
  patientName,

  caregiverName = "Marcus",

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

  const [selectedDoctorId, setSelectedDoctorId] =
    useState<string>("kalvin-mathew")

  const [showDoctorModal, setShowDoctorModal] = useState(false)

  const [showCognitiveModal, setShowCognitiveModal] = useState(false)

  return (
    <div className="flex flex-col h-full bg-[#F4F4F4] relative overflow-hidden">
      {/* ─── Active Tab Content View ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "home" && (
          <AloisHomeDashboard
            patientName={patientName}
            latestSession={latestSession}
            onStartVoiceCheck={onStartVoiceCheck}
            onSelectTab={setActiveTab}
            onOpenDoctorModal={() => setShowDoctorModal(true)}
            onOpenCognitiveModal={() => setShowCognitiveModal(true)}
            onViewReport={onViewReport}
            fontFamily={fontFamily}
          />
        )}

        {activeTab === "appointments" && (
          <AloisAppointments
            onBack={() => setActiveTab("home")}
            onSelectDoctor={(id) => {
              setSelectedDoctorId(id)

              setActiveTab("doctorInfo")
            }}
            onOpenSettings={() => setActiveTab("profile")}
            onStartVoiceCheck={onStartVoiceCheck}
            onOpenDoctorModal={() => setShowDoctorModal(true)}
            fontFamily={fontFamily}
          />
        )}

        {activeTab === "doctorInfo" && (
          <AloisDoctorInfo
            doctorId={selectedDoctorId}
            onBack={() => setActiveTab("appointments")}
            onBookAppointment={() => setShowDoctorModal(true)}
            onOpenSettings={() => setActiveTab("profile")}
            onOpenChat={() => setShowDoctorModal(true)}
            fontFamily={fontFamily}
          />
        )}

        {activeTab === "progress" && (
          <AloisProgress
            onBack={() => setActiveTab("home")}
            onViewReport={onViewReport}
            onOpenSettings={() => setActiveTab("profile")}
            fontFamily={fontFamily}
          />
        )}

        {activeTab === "profile" && (
          <AloisProfile
            patientName={patientName}
            caregiverName={caregiverName}
            isAssisted={isAssisted}
            selectedLanguageName={selectedLanguageName}
            onBack={() => setActiveTab("home")}
            onOpenHistory={onOpenHistory}
            onViewReport={onViewReport}
            onSwitchProfile={onSwitchProfile}
            onOpenLanguageModal={onOpenLanguageModal}
            onOpenDoctorDash={onOpenDoctorDash}
            onLogout={onLogout}
            fontFamily={fontFamily}
          />
        )}

        {activeTab === "medications" && (
          <AloisMedicationTracker
            onBack={() => setActiveTab("home")}
            onOpenSettings={() => setActiveTab("profile")}
            fontFamily={fontFamily}
          />
        )}

        {activeTab === "dailyCare" && (
          <AloisDailyCare
            onBack={() => setActiveTab("home")}
            onStartVoiceCheck={onStartVoiceCheck}
            onOpenSettings={() => setActiveTab("profile")}
            fontFamily={fontFamily}
          />
        )}
      </main>

      {/* ─── Alois Floating Bottom Navigation (Figma TabBar) ─────────── */}
      <AloisBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        fontFamily={fontFamily}
      />

      {/* ─── Modals ───────────────────────────────────────────────────── */}
      <AloisDoctorBookingModal
        isOpen={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
        fontFamily={fontFamily}
      />

      <AloisCognitiveBoosterModal
        isOpen={showCognitiveModal}
        onClose={() => setShowCognitiveModal(false)}
        onStartVoiceCheck={onStartVoiceCheck}
        fontFamily={fontFamily}
      />
    </div>
  )
}
