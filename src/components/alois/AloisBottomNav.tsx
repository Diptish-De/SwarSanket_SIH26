import React from "react"

import { Home, Activity, User } from "lucide-react"

import { AloisTab } from "./types"

interface AloisBottomNavProps {
  activeTab: AloisTab

  onSelectTab: (tab: AloisTab) => void

  fontFamily?: string
}

/**
 * Alois Tab Bar Light — 3 primary columns (Home, Progress, Profile) with floating active blue pill.
 */

export default function AloisBottomNav({
  activeTab,

  onSelectTab,

  fontFamily = "'Outfit', sans-serif",
}: AloisBottomNavProps) {
  const tabs: {
    id: AloisTab

    label: string

    icon: React.ReactNode
  }[] = [
    {
      id: "home",

      label: "Home",

      icon: <Home className="w-5 h-5" />,
    },

    {
      id: "progress",

      label: "Progress",

      icon: <Activity className="w-5 h-5" />,
    },

    {
      id: "profile",

      label: "Profile",

      icon: <User className="w-5 h-5" />,
    },
  ]

  return (
    <nav
      aria-label="Alois Navigation"
      className="sticky bottom-0 left-0 right-0 z-30 h-[74px] bg-[#F4F4F4] border-t border-[#E0E0E0] rounded-t-[24px] px-2 flex items-center justify-between shadow-[0_-4px_24px_rgba(0,0,0,0.06)] select-none"
    >
      {tabs.map((tab) => {
        // Map sub-tabs like 'medications', 'appointments', 'doctorInfo' or 'dailyCare' to 'home'
        const isActive =
          activeTab === tab.id ||
          (tab.id === "home" &&
            (activeTab === "dailyCare" ||
              activeTab === "medications" ||
              activeTab === "appointments" ||
              activeTab === "doctorInfo"))

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className="flex-1 flex flex-col items-center justify-center relative h-full focus:outline-hidden transition-all duration-200"
          >
            {isActive ? (
              <div className="flex flex-col items-center -mt-3 animate-fade-in">
                {/* Active Raised Pill: 56x41, #0F62FE, radius 24px */}
                <div className="w-14 h-[41px] rounded-[24px] bg-[#0F62FE] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(15,98,254,0.38)] transition-transform duration-200 hover:scale-105 active:scale-95">
                  {tab.icon}
                </div>
                {/* Active Label: 12 SemiBold #161616 */}
                <span
                  style={{ fontFamily }}
                  className="text-[12px] font-semibold text-[#161616] mt-1 tracking-tight"
                >
                  {tab.label}
                </span>
              </div>
            ) : (
              <div className="text-[#525252] hover:text-[#161616] p-2 transition-colors duration-150">
                {tab.icon}
              </div>
            )}
          </button>
        )
      })}
    </nav>
  )
}
