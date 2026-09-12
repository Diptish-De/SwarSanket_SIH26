import React from "react"
import { Home, Pill, CheckSquare, MapPin, User } from "lucide-react"
import { AloisTab } from "./types"

interface AloisBottomNavProps {
  activeTab: AloisTab
  onSelectTab: (tab: AloisTab) => void
  onOpenSafetyModal: () => void
}

export default function AloisBottomNav({
  activeTab,
  onSelectTab,
  onOpenSafetyModal,
}: AloisBottomNavProps) {
  const tabs: {
    id: AloisTab
    label: string
    icon: React.ReactNode
    isModal?: boolean
  }[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: "meds",
      label: "Meds",
      icon: <Pill className="w-5 h-5" />,
    },
    {
      id: "routine",
      label: "Routine",
      icon: <CheckSquare className="w-5 h-5" />,
    },
    {
      id: "safety",
      label: "Safety",
      icon: <MapPin className="w-5 h-5" />,
      isModal: true,
    },
    {
      id: "profile",
      label: "Profile",
      icon: <User className="w-5 h-5" />,
    },
  ]

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.isModal) {
                onOpenSafetyModal()
              } else {
                onSelectTab(tab.id)
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 relative ${
              isActive
                ? "text-blue-600 font-semibold"
                : "text-slate-400 hover:text-slate-600 font-medium"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all duration-200 ${
                isActive ? "bg-blue-50 text-blue-600 scale-110" : ""
              }`}
            >
              {tab.icon}
            </div>
            <span className="text-[11px] tracking-tight mt-0.5">
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
            )}
          </button>
        )
      })}
    </div>
  )
}
