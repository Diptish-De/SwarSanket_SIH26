import { useEffect, useState } from "react"

import { Plus, UserRound } from "lucide-react"

import {
  HouseholdMember,
  avatarTint,
  initialsOf,
  listMembers,
} from "../services/household"

/**
 * "Who is using the app?"
 *
 * The patient identifies themselves by tapping their own photo. This is a
 * recognition task, which is retained far longer in Alzheimer's than recall of a
 * password or PIN, and the large tiles also suit unsteady hands and poor vision.
 *
 * The screen is skipped entirely when only one person uses the device, so a
 * single-user household never sees an identity step at all.
 */

export default function MemberPicker({
  title = "Who is using the app?",

  subtitle = "Tap your photo to begin.",

  onSelect,

  onAddMember,

  fontFamily,
}: {
  title?: string

  subtitle?: string

  onSelect: (member: HouseholdMember) => void

  onAddMember?: () => void

  fontFamily?: string
}) {
  const [members, setMembers] = useState<HouseholdMember[] | null>(null)

  useEffect(() => {
    let alive = true

    listMembers()

      .then((list) => {
        if (alive) setMembers(list)
      })

      .catch(() => {
        if (alive) setMembers([])
      })

    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-8 flex flex-col items-center justify-center gap-6 animate-fade-in-up">
        <div className="text-center space-y-1.5">
          <h1
            className="text-2xl font-bold text-[#0c1e27]"
            style={{ fontFamily }}
          >
            {title}
          </h1>
          <p className="text-sm text-[#5e7380]">{subtitle}</p>
        </div>

        {members === null ? (
          <div className="text-sm text-slate-400 py-8">Loading…</div>
        ) : (
          <div className="w-full grid grid-cols-2 gap-4">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => onSelect(member)}
                // Deliberately oversized: a comfortable target for tremor, and a

                // face large enough to recognise without sharp eyesight.

                className="flex flex-col items-center gap-2.5 p-4 rounded-3xl bg-white border-2 border-[#d7eaef] shadow-sm hover:border-[#02738a] hover:shadow-md transition-all active:scale-95 min-h-[10.5rem]"
              >
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt=""
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#e4f4f7]"
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-2 border-white/40"
                    style={{ backgroundColor: avatarTint(member.id) }}
                  >
                    {initialsOf(member.displayName)}
                  </div>
                )}

                <div className="text-center">
                  <div
                    className="text-base font-bold text-[#0c1e27] leading-tight"
                    style={{ fontFamily }}
                  >
                    {member.displayName}
                  </div>
                  {member.isPatient && (
                    <div className="text-[11px] text-[#5e7380] mt-0.5">
                      {member.age} years
                    </div>
                  )}
                </div>
              </button>
            ))}

            {onAddMember && (
              <button
                onClick={onAddMember}
                className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-3xl bg-white/70 border-2 border-dashed border-[#c6dfe6] text-[#02738a] hover:bg-white hover:border-[#02738a] transition-all active:scale-95 min-h-[10.5rem]"
              >
                <div className="w-24 h-24 rounded-full bg-[#e4f4f7] flex items-center justify-center">
                  <Plus className="w-10 h-10" />
                </div>
                <div className="text-base font-bold" style={{ fontFamily }}>
                  Add Someone
                </div>
              </button>
            )}
          </div>
        )}

        {members !== null && members.length === 0 && !onAddMember && (
          <div className="flex flex-col items-center gap-2 text-slate-400 py-6">
            <UserRound className="w-10 h-10" />
            <p className="text-sm">No one has been added to this device yet.</p>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center max-w-xs leading-relaxed">
          No password is needed. Just tap your picture.
        </p>
      </div>
    </div>
  )
}
