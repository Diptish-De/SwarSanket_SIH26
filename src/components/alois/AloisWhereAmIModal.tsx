import React, { useState } from "react"
import {
  X,
  MapPin,
  PhoneCall,
  Search,
  Sliders,
  Settings,
  ShieldCheck,
  Locate,
  Navigation,
} from "lucide-react"

interface AloisWhereAmIModalProps {
  isOpen: boolean
  onClose: () => void
  caregiverPhone?: string
  patientAddress?: string
  fontFamily?: string
}

/**
 * Alois Where Am I Screen / Modal — matching Figma node 591:24816 & app/(main)/where-am-i.tsx.
 */
export default function AloisWhereAmIModal({
  isOpen,
  onClose,
  caregiverPhone = "+91 98301 23456",
  patientAddress = "Coreys Mill Lane, Stevenage, Hertfordshire SG1 4AB",
  fontFamily = "'Outfit', sans-serif",
}: AloisWhereAmIModalProps) {
  const [searchQuery, setSearchQuery] = useState("")

  if (!isOpen) return null

  const handleCallCaregiver = () => {
    window.location.href = `tel:${caregiverPhone.replace(/\s+/g, "")}`
  }

  const handleCallEmergency = () => {
    window.location.href = "tel:112"
  }

  const handleOpenMaps = () => {
    const encoded = encodeURIComponent(
      "Lister Hospital, Coreys Mill Lane, Stevenage",
    )
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      "_blank",
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md h-[90vh] sm:h-[680px] bg-[#F4F4F4] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-[#E0E0E0] animate-fade-in-up relative">
        {/* ─── Transparent Nav Bar (Figma node 591:24816) ─────────────── */}
        <div className="h-16 px-4 bg-white/90 backdrop-blur-md border-b border-[#E0E0E0] flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-[#525252] flex items-center justify-center hover:text-[#161616]"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              style={{ fontFamily }}
              className="text-[17px] font-bold text-[#161616]"
            >
              Where Am I?
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-slate-100 text-[#525252] flex items-center justify-center hover:text-[#161616]"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-slate-100 text-[#525252] flex items-center justify-center hover:text-[#161616]"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Search Bar ─────────────────────────────────────────────── */}
        <div className="p-3 bg-white border-b border-[#E0E0E0] z-20">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6F6F6F] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search safe place or hospital..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-[12px] text-[#161616] placeholder:text-[#6F6F6F] focus:outline-hidden focus:border-[#0F62FE]"
            />
          </div>
        </div>

        {/* ─── Satellite Map Canvas (Figma Map View) ──────────────────── */}
        <div className="flex-1 relative bg-slate-300 overflow-hidden flex items-center justify-center">
          {/* Simulated Satellite Map Grid */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(#0F62FE 1.5px, transparent 1.5px), radial-gradient(#42BE65 1.5px, transparent 1.5px)",
              backgroundSize: "28px 28px",
              backgroundPosition: "0 0, 14px 14px",
              backgroundColor: "#2c3e50",
            }}
          />

          {/* Safe Zone Radius Rings */}
          <div className="absolute w-64 h-64 rounded-full border-2 border-dashed border-[#0F62FE]/60 bg-[#0F62FE]/10 animate-pulse pointer-events-none" />
          <div className="absolute w-40 h-40 rounded-full border border-emerald-400/80 bg-emerald-500/10 pointer-events-none" />

          {/* Tooltip Bubble (Figma Tooltip) */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-12 bg-white rounded-xl px-3 py-1.5 shadow-xl border border-slate-200 text-center z-10 animate-bounce">
            <span
              style={{ fontFamily }}
              className="text-[12px] font-bold text-[#161616] block"
            >
              Lister Hospital
            </span>
            <span className="text-[10px] text-[#525252]">
              Two Blocks from your home
            </span>
            <div className="w-2.5 h-2.5 bg-white border-r border-b border-slate-200 rotate-45 mx-auto -mb-2.5 mt-1" />
          </div>

          {/* Central Location Pin */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#0F62FE] text-white flex items-center justify-center shadow-lg shadow-blue-500/50 ring-4 ring-white">
              <MapPin className="w-5 h-5 fill-white text-white" />
            </div>
            <span className="w-2.5 h-1 rounded-full bg-slate-900/40 mt-1 blur-[1px]" />
          </div>

          {/* Floating Locate FAB Button */}
          <button
            type="button"
            title="Recenter GPS"
            className="absolute bottom-28 right-4 w-12 h-12 rounded-full bg-white text-[#0F62FE] border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all z-20"
          >
            <Locate className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Bottom Place Card & Emergency Speed Dials ──────────────── */}
        <div className="bg-white border-t border-[#E0E0E0] p-4 space-y-3 shrink-0 z-20">
          {/* Safe Zone Status Badge */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Safe Perimeter (Within 500m Home Radius)</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase">
              Active
            </span>
          </div>

          {/* Place Card: Lister Hospital */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex-1 min-w-0 pr-2">
              <h4
                style={{ fontFamily }}
                className="text-[13px] font-bold text-[#161616] truncate"
              >
                Lister Hospital
              </h4>
              <p className="text-[11px] text-[#525252] truncate">
                {patientAddress}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenMaps}
              className="p-2 rounded-lg bg-[#0F62FE] text-white flex items-center justify-center shadow-xs hover:bg-[#0353e9]"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Dial Buttons: 112 Emergency & Call Caregiver */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCallEmergency}
              className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20 active:scale-95 transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>112 Emergency</span>
            </button>

            <button
              type="button"
              onClick={handleCallCaregiver}
              className="py-2.5 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Marcus</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
