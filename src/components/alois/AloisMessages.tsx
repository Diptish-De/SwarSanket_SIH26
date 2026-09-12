import React, { useState } from "react"
import {
  ChevronLeft,
  Bell,
  Settings,
  Search,
  Send,
  Phone,
  Video,
  X,
} from "lucide-react"

interface AloisMessagesProps {
  onBack: () => void
  onOpenSettings: () => void
  fontFamily?: string
}

interface ChatMessage {
  id: string
  sender: "doctor" | "patient"
  text: string
  time: string
}

/**
 * Alois Messages Screen — matching Figma node 520:18898 & app/(main)/inbox.tsx / chat.tsx.
 */
export default function AloisMessages({
  onBack,
  onOpenSettings,
  fontFamily = "'Outfit', sans-serif",
}: AloisMessagesProps) {
  const [activeSegment, setActiveSegment] =
    useState<"communities" | "chats" | "calls">("chats")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")

  const [chatThreads, setChatThreads] = useState<{
    [id: string]: ChatMessage[]
  }>({
    "1": [
      {
        id: "m1",
        sender: "doctor",
        text: "Hello Jerrold, your latest voice screening showed great phonation stability.",
        time: "10:15 AM",
      },
      {
        id: "m2",
        sender: "doctor",
        text: "Okay, let's start by taking your blood pressure and checking in at 10:30 tomorrow.",
        time: "10:18 AM",
      },
    ],
    "2": [
      {
        id: "m3",
        sender: "doctor",
        text: "Hi Jerrold, I have updated the morning pill reminder schedule.",
        time: "09:30 AM",
      },
    ],
  })

  const chats = [
    {
      id: "1",
      name: "Dr. Andrew Lucas",
      role: "Neurologist",
      preview: "Okay, let's start by taking your blood pre...",
      time: "10:18 AM",
      unread: 3,
      avatar: "AL",
      color: "from-blue-600 to-indigo-600",
    },
    {
      id: "2",
      name: "Marcus (Caregiver)",
      role: "Family Primary Contact",
      preview: "Everything is set for the evening walk and hydration.",
      time: "09:45 AM",
      unread: 0,
      avatar: "MC",
      color: "from-emerald-600 to-teal-600",
    },
    {
      id: "3",
      name: "Natasha (Care Specialist)",
      role: "Community Health Worker",
      preview: "Your weekly acoustic screening report is ready for download.",
      time: "Yesterday",
      unread: 1,
      avatar: "NS",
      color: "from-purple-600 to-pink-600",
    },
    {
      id: "4",
      name: "Alzheimer's Support Circle",
      role: "Memory Café Community",
      preview: "Join today's caregiver memory café session at 4 PM.",
      time: "2 days ago",
      unread: 0,
      avatar: "AC",
      color: "from-amber-600 to-orange-600",
    },
  ]

  const handleSendMessage = () => {
    if (!replyText.trim() || !selectedChat) return
    const newMsg: ChatMessage = {
      id: `p-${Date.now()}`,
      sender: "patient",
      text: replyText.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }

    setChatThreads((prev) => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), newMsg],
    }))
    setReplyText("")
  }

  const activeContact = chats.find((c) => c.id === selectedChat)

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28 relative">
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
            Messages
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

      <div className="px-4 pt-4 space-y-4 max-w-[375px] mx-auto">
        {/* ─── Segmented Control: Communities | Chats | Calls ─────────── */}
        <div className="flex rounded-xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setActiveSegment("communities")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSegment === "communities"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Communities
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("chats")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSegment === "chats"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Chats
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("calls")}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              activeSegment === "calls"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-[#525252] hover:text-[#161616]"
            }`}
          >
            Calls
          </button>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#6F6F6F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, doctors..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] placeholder:text-[#6F6F6F] focus:outline-hidden focus:border-[#0F62FE]"
          />
        </div>

        {/* ─── Chat List (Figma ChatListItem) ─────────────────────────── */}
        <div className="space-y-2 pt-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => setSelectedChat(chat.id)}
              className="w-full p-3 rounded-xl bg-white border border-[#E0E0E0] hover:bg-slate-50 flex items-center justify-between transition-colors shadow-2xs text-left group"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${chat.color} text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0`}
                >
                  {chat.avatar}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      style={{ fontFamily }}
                      className="text-[13px] font-semibold text-[#161616] truncate"
                    >
                      {chat.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#525252] truncate mt-0.5">
                    {chat.preview}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] text-[#6F6F6F]">{chat.time}</span>
                {chat.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#0F62FE] text-white text-[10px] font-bold flex items-center justify-center mt-1 shadow-xs">
                    {chat.unread}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Interactive Chat Modal Sheet ────────────────────────────── */}
      {selectedChat && activeContact && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md h-[520px] bg-[#F4F4F4] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-[#E0E0E0] animate-fade-in-up">
            {/* Chat Header */}
            <div className="h-16 px-4 bg-white border-b border-[#E0E0E0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${activeContact.color} text-white font-bold flex items-center justify-center text-xs shadow-xs`}
                >
                  {activeContact.avatar}
                </div>
                <div>
                  <h4
                    style={{ fontFamily }}
                    className="text-[13px] font-bold text-[#161616]"
                  >
                    {activeContact.name}
                  </h4>
                  <span className="text-[10px] text-[#525252]">
                    {activeContact.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Call"
                  className="w-8 h-8 rounded-full bg-slate-100 text-[#525252] flex items-center justify-center hover:text-[#161616]"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Video"
                  className="w-8 h-8 rounded-full bg-slate-100 text-[#525252] flex items-center justify-center hover:text-[#161616]"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChat(null)}
                  title="Close"
                  className="w-8 h-8 rounded-full bg-slate-100 text-[#525252] flex items-center justify-center hover:text-[#161616] ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(chatThreads[selectedChat] || []).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "patient" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl p-3 text-[12px] leading-relaxed shadow-xs ${
                      msg.sender === "patient"
                        ? "bg-[#0F62FE] text-white rounded-br-xs"
                        : "bg-white text-[#161616] border border-[#E0E0E0] rounded-bl-xs"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`text-[9px] mt-1 block text-right ${
                        msg.sender === "patient"
                          ? "text-blue-100"
                          : "text-[#6F6F6F]"
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-[#E0E0E0] flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-[12px] text-[#161616] placeholder:text-slate-400 focus:outline-hidden focus:border-[#0F62FE]"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                className="w-9 h-9 rounded-xl bg-[#0F62FE] text-white flex items-center justify-center hover:bg-[#0353e9] active:scale-95 shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
