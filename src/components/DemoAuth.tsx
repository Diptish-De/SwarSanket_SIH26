import React, { useState } from "react"

export const DEMO_USER_KEY = "swarsanket-demo-user"

export interface DemoUser {
  fullName: string

  phone: string

  password: string
}

interface DemoAuthProps {
  onAuthenticated: (fullName?: string) => void
}

type AuthMode = "login" | "register"

export function readDemoUser(): DemoUser | null {
  try {
    const stored = localStorage.getItem(DEMO_USER_KEY)

    return stored ? JSON.parse(stored) as DemoUser : null
  } catch {
    return null
  }
}

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, "")
}

function isValidIndianPhone(value: string): boolean {
  return /^(?:\+91)?[6-9]\d{9}$/.test(normalizePhone(value))
}

const inputClass =
  "w-full rounded-2xl border-2 border-[#d7eaef] bg-white px-4 py-3.5 text-base font-medium text-[#0c1e27] outline-none transition focus:border-[#02738a]"

export default function DemoAuth({ onAuthenticated }: DemoAuthProps) {
  const [mode, setMode] = useState<AuthMode>("login")

  const [fullName, setFullName] = useState("")

  const [phone, setPhone] = useState("")

  const [password, setPassword] = useState("")

  const [confirmPassword, setConfirmPassword] = useState("")

  const [error, setError] = useState("")

  const [success, setSuccess] = useState("")

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)

    setError("")

    setSuccess("")

    setPassword("")

    setConfirmPassword("")
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError("")

    setSuccess("")

    const cleanPhone = normalizePhone(phone)

    if (mode === "register" && !fullName.trim()) {
      setError("Please enter your full name.")

      return
    }

    if (!cleanPhone) {
      setError("Please enter your phone number.")

      return
    }

    if (!isValidIndianPhone(cleanPhone)) {
      setError(
        "Enter a valid Indian mobile number (10 digits or +91 followed by 10 digits).",
      )

      return
    }

    if (!password) {
      setError("Please enter your password.")

      return
    }

    if (mode === "register" && password.length < 6) {
      setError("Password must be at least 6 characters.")

      return
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.")

      return
    }

    if (mode === "register") {
      localStorage.setItem(
        DEMO_USER_KEY,

        JSON.stringify({
          fullName: fullName.trim(),
          phone: cleanPhone,
          password,
        }),
      )

      localStorage.setItem("swarsanket-demo-session", "active")

      setSuccess("Demo account created. Opening SwarSanket...")

      window.setTimeout(() => onAuthenticated(fullName.trim()), 350)

      return
    }

    const user = readDemoUser()

    if (!user || user.phone !== cleanPhone || user.password !== password) {
      setError(
        "Phone number or password is incorrect. Register for the demo first.",
      )

      return
    }

    localStorage.setItem("swarsanket-demo-session", "active")

    setSuccess(`Welcome back, ${user.fullName}.`)

    window.setTimeout(() => onAuthenticated(user.fullName), 350)
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#031d25] via-[#02171e] to-[#010e13] p-0 sm:p-4 md:p-6"
      style={{ fontFamily: "'Noto Sans', system-ui, sans-serif" }}
    >
      <div className="fixed top-3 left-3 right-3 z-40 mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-[#0d4f5e] bg-[#03222a]/90 px-4 py-2 shadow-2xl backdrop-blur-md sm:top-4 sm:left-4 sm:right-4">
        <img
          src="/logo.jpeg"
          alt="SwarSanket Logo"
          className="h-8 w-8 rounded-xl border border-[#0e5666] object-contain shadow-md"
        />
        <div>
          <div
            className="text-xs font-bold tracking-wide text-white"
            style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
          >
            SwarSanket Mobile
          </div>
          <div className="text-[10px] font-medium text-[#38bdf8]">
            SIH 2026 AI Early Screening
          </div>
        </div>
      </div>

      <div className="nv-app-shell relative mt-16 flex h-[844px] max-h-[calc(100vh-5.5rem)] w-full max-w-[390px] flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl ring-1 ring-[#0d4f5e]/30 sm:rounded-[48px] sm:border-[8px] sm:border-[#07252f] sm:shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(2,115,138,0.15)]">
        <div className="absolute top-2.5 left-1/2 z-50 hidden h-7 w-28 -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-[#02151c] px-3 shadow-inner sm:flex">
          <div className="h-2.5 w-2.5 rounded-full bg-[#04232c]" />
          <div className="h-2 w-2 rounded-full bg-[#02738a]/40" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
          <div className="flex h-11 flex-shrink-0 items-center justify-between px-6 select-none">
            <span className="text-xs font-bold tracking-tight text-[#0c1e27]">
              9:41
            </span>
            <span className="text-[10px] font-semibold text-[#5e7380]">
              SwarSanket
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-4 pt-2">
            <div className="mb-4 flex justify-center">
              <img
                src="/logo.jpeg"
                alt="SwarSanket Logo"
                className="h-16 w-16 rounded-2xl border border-[#bce3eb] object-contain shadow-sm"
              />
            </div>

            <div className="mb-5 text-center">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#02738a]">
                SwarSanket
              </p>
              <h1
                className="text-2xl font-bold text-[#0c1e27]"
                style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
              >
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-[#5e7380]">
                {mode === "login"
                  ? "Sign in to continue your Voice Check."
                  : "Start your SwarSanket voice screening journey."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {mode === "register" && (
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#30434f]">
                    Full Name
                  </span>
                  <input
                    className={inputClass}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#30434f]">
                  Phone Number
                </span>
                <input
                  className={inputClass}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="9876543210 or +919876543210"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#30434f]">
                  Password
                </span>
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </label>

              {mode === "register" && (
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#30434f]">
                    Confirm Password
                  </span>
                  <input
                    type="password"
                    className={inputClass}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                </label>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-red-700"
                >
                  {error}
                </p>
              )}
              {success && (
                <p
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-emerald-700"
                >
                  {success}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-[#02738a] via-[#027d95] to-[#01586a] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-[#02738a]/25 transition hover:from-[#02849f] hover:to-[#01687d] active:scale-[0.98]"
                style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
              >
                {mode === "login" ? "Login" : "Create Account"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-[#5e7380]">
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() =>
                  switchMode(mode === "login" ? "register" : "login")
                }
                className="font-bold text-[#02738a] hover:underline"
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
          <div className="flex flex-shrink-0 justify-center pb-2 pt-1">
            <div className="h-1 w-32 rounded-full bg-slate-300" />
          </div>
        </div>
      </div>
    </main>
  )
}
