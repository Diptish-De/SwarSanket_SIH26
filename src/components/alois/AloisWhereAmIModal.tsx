import React from "react"
import {
  X,
  MapPin,
  PhoneCall,
  Compass,
  ShieldCheck,
  Navigation,
} from "lucide-react"

interface AloisWhereAmIModalProps {
  isOpen: boolean
  onClose: () => void
  caregiverPhone?: string
  patientAddress?: string
  fontFamily?: string
}

export default function AloisWhereAmIModal({
  isOpen,
  onClose,
  caregiverPhone = "+91 98301 23456",
  patientAddress = "Block CF, Sector 1, Salt Lake, Kolkata, West Bengal 700064",
  fontFamily = "'Outfit', sans-serif",
}: AloisWhereAmIModalProps) {
  if (!isOpen) return null

  const handleCallCaregiver = () => {
    window.location.href = `tel:${caregiverPhone.replace(/\s+/g, "")}`
  }

  const handleOpenMaps = () => {
    const encoded = encodeURIComponent(patientAddress)
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      "_blank",
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Wandering Safety Aid
              </span>
              <h3
                style={{ fontFamily }}
                className="text-lg font-bold text-slate-900"
              >
                Where Am I?
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stylized Simulated Map View */}
        <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-emerald-100/70 via-blue-50 to-slate-200 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
          {/* Street grid background simulation */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(#2563eb 1px, transparent 1px), radial-gradient(#10b981 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 10px 10px",
            }}
          />

          {/* Safe Zone perimeter ring */}
          <div className="absolute w-32 h-32 rounded-full border-2 border-dashed border-emerald-500/60 bg-emerald-500/10 flex items-center justify-center animate-pulse">
            <span className="text-[10px] font-bold text-emerald-800 bg-white/90 px-2 py-0.5 rounded-full shadow-xs">
              Safe Zone (500m)
            </span>
          </div>

          {/* User Location Pin */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 animate-bounce">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 bg-white/95 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 mt-1">
              You are here
            </span>
          </div>

          {/* Status Badge */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-emerald-700 shadow-xs border border-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Inside Safe Neighborhood Radius
            </span>
          </div>
        </div>

        {/* Current Address display */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-left">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Registered Home Address
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-0.5 leading-snug">
            {patientAddress}
          </div>
        </div>

        {/* Large Emergency Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleCallCaregiver}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-blue-600/25 active:scale-[0.98] transition-all"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Primary Caregiver</span>
          </button>

          <button
            type="button"
            onClick={handleOpenMaps}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all"
          >
            <Navigation className="w-4 h-4 text-blue-600" />
            <span>Navigate Me Home (Google Maps)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
