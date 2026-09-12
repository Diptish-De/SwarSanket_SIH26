import { useState } from "react"

import { ShieldCheck, X } from "lucide-react"

import {
  hasCaregiverPin,
  setCaregiverPin,
  verifyCaregiverPin,
} from "../services/household"

/**
 * Caregiver gate for destructive or outbound actions - exporting a report,
 * deleting history, changing who gets alerted, opening the clinician view.
 *
 * Screening itself is never gated. The wording asks for a family member rather
 * than challenging the patient, so a person who cannot complete it is being
 * redirected, not told they failed a test.
 *
 * The PIN is salted and hashed on the device. That is a guard against a confused
 * or curious household member, not against someone with the device and technical
 * skill; no client-side secret can be the latter.
 */

export default function CaregiverGate({
  action,

  onUnlocked,

  onCancel,

  fontFamily,

  /** Plain description of what is about to happen, e.g. "delete all screenings". */
}: {
  action: string

  onUnlocked: () => void

  onCancel: () => void

  fontFamily?: string
}) {
  const isSetup = !hasCaregiverPin()

  const [pin, setPin] = useState("")

  const [confirmPin, setConfirmPin] = useState("")

  const [error, setError] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)

  const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 4)

  const handleSubmit = async () => {
    setError(null)

    if (pin.length !== 4) {
      setError("Please enter the 4-digit family PIN.")

      return
    }

    setBusy(true)

    try {
      if (isSetup) {
        if (confirmPin !== pin) {
          setError("The two PINs do not match. Please try again.")

          return
        }

        await setCaregiverPin(pin)

        onUnlocked()

        return
      }

      const ok = await verifyCaregiverPin(pin)

      if (ok) {
        onUnlocked()
      } else {
        // No attempt counter or lockout: locking a caregiver out of their own

        // relative's data during a mistyped entry causes more harm than the

        // brute-force risk it would prevent on a personal device.

        setError("That PIN is not correct. Please try again.")

        setPin("")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-xs rounded-3xl bg-white p-5 space-y-4 shadow-2xl border border-slate-100">
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-2xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center border border-[#cbe6ed]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3
            className="font-bold text-base text-slate-900"
            style={{ fontFamily }}
          >
            {isSetup ? "Create a Family PIN" : "Ask a Family Member"}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isSetup
              ? `Choose a 4-digit PIN that a family member will use to ${action}. The person being screened never needs this.`
              : `A family member's 4-digit PIN is needed to ${action}.`}
          </p>
        </div>

        <div className="space-y-2.5">
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pin}
            onChange={(e) => setPin(digitsOnly(e.target.value))}
            placeholder="• • • •"
            aria-label="Family PIN"
            className="w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-2xl tracking-[0.5em] font-bold text-slate-900 focus:outline-none focus:border-[#02738a]"
          />

          {isSetup && (
            <input
              type="tel"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(digitsOnly(e.target.value))}
              placeholder="Repeat PIN"
              aria-label="Repeat family PIN"
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-2xl tracking-[0.5em] font-bold text-slate-900 focus:outline-none focus:border-[#02738a]"
            />
          )}

          {error && (
            <p className="text-xs text-rose-600 font-medium text-center">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#02738a] to-[#01586a] text-white font-bold text-sm shadow-md disabled:opacity-60 transition-all"
          >
            {isSetup ? "Save PIN" : "Unlock"}
          </button>
        </div>

        <p className="text-[10px] text-slate-400 text-center leading-relaxed">
          Forgotten the PIN? A family member can reset it from Profile &amp;
          Settings.
        </p>
      </div>
    </div>
  )
}
