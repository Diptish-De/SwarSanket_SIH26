import React from "react"
import { Users, Bell, Shield, Globe } from "lucide-react"

interface AloisHeaderProps {
  patientName: string
  caregiverName?: string
  isAssisted?: boolean
  selectedLanguageName: string
  onSwitchProfile: () => void
  onOpenLanguageModal?: () => void
  fontFamily?: string
}

export default function AloisHeader({
  patientName,
  caregiverName,
  isAssisted = false,
  selectedLanguageName,
  onSwitchProfile,
  onOpenLanguageModal,
  fontFamily = "'Outfit', sans-serif",
}: AloisHeaderProps) {
  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  // Get initials
  const initials =
    patientName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PT"

  return (
    <header className="px-5 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Profile Avatar with Switcher */}
        <button
          type="button"
          onClick={onSwitchProfile}
          title="Switch Profile / Household Member"
          className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
        >
          <span>{initials}</span>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </button>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {todayFormatted}
            </span>
            {isAssisted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                <Shield className="w-2.5 h-2.5" />
                Caregiver
              </span>
            )}
          </div>
          <h1
            style={{ fontFamily }}
            className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-1"
          >
            Hello, {patientName}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onOpenLanguageModal && (
          <button
            type="button"
            onClick={onOpenLanguageModal}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{selectedLanguageName}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onSwitchProfile}
          title="Switch Member"
          className="p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 active:scale-95 transition-all"
        >
          <Users className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
