import { useRef, useState } from "react"

import { Camera, X } from "lucide-react"

import {
  HouseholdMember,
  avatarTint,
  createMemberId,
  initialsOf,
  preparePhoto,
  saveMember,
} from "../services/household"

import { LanguageCode } from "../types"

/**
 * Caregiver-led enrolment of one household member.
 *
 * This is the only place identity is established, and it is done WITH a caregiver
 * present - the patient is never asked to create or remember anything. The photo
 * captured here is what the patient later taps to identify themselves, so it is
 * the single most important field on this form.
 */

export default function AddMemberSheet({
  languages,

  defaultLanguage = "en",

  onSaved,

  onCancel,

  fontFamily,
}: {
  languages: {
    code: LanguageCode

    native: string

    name: string
  }[]

  defaultLanguage?: LanguageCode

  onSaved: (member: HouseholdMember) => void

  onCancel: () => void

  fontFamily?: string
}) {
  const [name, setName] = useState("")

  const [age, setAge] = useState("")

  const [photo, setPhoto] = useState("")

  const [language, setLanguage] = useState<LanguageCode>(defaultLanguage)

  const [isPatient, setIsPatient] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return

    // preparePhoto downscales and never throws; an empty result just means the

    // member falls back to initials, which must stay selectable.

    setPhoto(await preparePhoto(file))
  }

  const handleSave = async () => {
    setError(null)

    const trimmed = name.trim()

    if (!trimmed) {
      setError("Please enter a name.")

      return
    }

    const parsedAge = Number(age)

    if (isPatient && (!Number.isFinite(parsedAge) || parsedAge <= 0)) {
      setError("Please enter an age.")

      return
    }

    setBusy(true)

    try {
      const member: HouseholdMember = {
        id: createMemberId(),

        displayName: trimmed,

        age: Number.isFinite(parsedAge) ? parsedAge : 0,

        photo,

        language,

        isPatient,

        createdAt: new Date().toISOString(),
      }

      await saveMember(member)

      onSaved(member)
    } catch {
      setError("Could not save. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-slate-900/55 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-h-[92%] overflow-y-auto rounded-t-3xl bg-white p-5 space-y-4 shadow-2xl border-t border-[#d7eaef]">
        <div className="flex items-center justify-between">
          <h2
            className="text-lg font-bold text-slate-900"
            style={{ fontFamily }}
          >
            Add a Person
          </h2>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Photo - what the patient will tap to identify themselves */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-[#d7eaef] shadow-sm active:scale-95 transition-transform"
            aria-label="Choose a photo"
          >
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-3xl font-bold"
                style={{ backgroundColor: avatarTint(name || "new") }}
              >
                {name ? initialsOf(name) : <Camera className="w-9 h-9" />}
              </div>
            )}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs font-bold text-[#02738a]"
          >
            {photo ? "Change photo" : "Add a photo"}
          </button>
          <p className="text-[11px] text-slate-400 text-center max-w-[15rem] leading-relaxed">
            This photo is how they will find themselves on this device.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => void handlePhoto(e.target.files?.[0])}
          />
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-600">Full name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rama Devi"
            className="mt-1 w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#02738a]"
          />
        </label>

        <div className="flex gap-3">
          <label className="block flex-1">
            <span className="text-xs font-bold text-slate-600">Age</span>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="72"
              className="mt-1 w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#02738a]"
            />
          </label>

          <label className="block flex-1">
            <span className="text-xs font-bold text-slate-600">Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="mt-1 w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#02738a]"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={() => setIsPatient((v) => !v)}
          className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-left"
        >
          <div>
            <div className="text-xs font-bold text-slate-800">
              This person will take the voice check
            </div>
            <div className="text-[11px] text-slate-500">
              Turn off for a family member who only helps.
            </div>
          </div>
          <span
            className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${
              isPatient ? "bg-[#02738a]" : "bg-slate-300"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                isPatient ? "translate-x-5" : ""
              }`}
            />
          </span>
        </button>

        {error && (
          <p className="text-xs text-rose-600 font-medium text-center">
            {error}
          </p>
        )}

        <div className="flex gap-2 pb-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#02738a] to-[#01586a] text-white font-bold text-sm shadow-md disabled:opacity-60 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
