import React, { useEffect, useState } from "react"

import {
  ArrowRight,
  CheckCircle2,
  Delete,
  Eye,
  EyeOff,
  MessageSquare,
} from "lucide-react"

import { getApiBaseUrl } from "../../../services/apiConfig"

import {
  getMyPatientProfile,
  upsertMyPatientProfile,
} from "../../../services/patientProfile"

import {
  isSupabaseConfigured,
  lookupVerifiedSupabaseUser,
  registerVerifiedSupabaseUser,
  supabase,
} from "../../../services/supabase"

export interface AloisAuthUser {
  patientId: string

  username: string

  fullName: string

  gender: string

  age: string

  dob: string

  email: string

  phone: string

  city: string

  diagnosis: string

  stage: string

  caregiverName: string

  caregiverEmail: string

  caregiverPhone: string
}

interface AloisAuthContainerProps {
  onAuthenticated: (user: AloisAuthUser) => void

  fontFamily?: string
}

type AuthScreen = "you" | "caregiver" | "caregiverVerify" | "register"

export const ALOIS_USER_STORAGE_KEY = "alois-user-profile"

export const ALOIS_AUTH_SESSION_KEY = "alois-auth-session"

function createPatientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `00000000-0000-4000-8000-${Date.now().toString().slice(-12).padStart(12, "0")}`
}

function getStoredPatientId(): string {
  try {
    const stored = localStorage.getItem(ALOIS_USER_STORAGE_KEY)

    const user = stored ? JSON.parse(stored) as Partial<AloisAuthUser> : null

    return user?.patientId || createPatientId()
  } catch {
    return createPatientId()
  }
}

function AloisLogo() {
  return (
    <div className="w-10 h-10 flex items-center justify-center mx-auto mb-3">
      <img
        src="/logo.jpeg"
        alt="SwarSanket Logo"
        className="w-9 h-9 rounded-xl object-contain"
      />
    </div>
  )
}

const inputClass =
  "w-full px-3.5 py-3 rounded-lg bg-[#F4F4F4] text-[14px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden focus:ring-1 focus:ring-[#0F62FE]"

export default function AloisAuthContainer({
  onAuthenticated,

  fontFamily = "'Outfit', sans-serif",
}: AloisAuthContainerProps) {
  const [screen, setScreen] = useState<AuthScreen>("you")

  const [loginIdentifier, setLoginIdentifier] = useState("")

  const [password, setPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)

  const [showRegPassword, setShowRegPassword] = useState(false)

  const [regAgreeTerms, setRegAgreeTerms] = useState(false)

  const [otpDigits, setOtpDigits] = useState(["", "", "", ""])

  const [resendCountdown, setResendCountdown] = useState(56)

  const [authError, setAuthError] = useState<string | null>(null)

  const [authSuccess, setAuthSuccess] = useState<string | null>(null)

  const [isBusy, setIsBusy] = useState(false)

  // WhatsApp confirmation dialog state

  const [whatsAppData, setWhatsAppModal] = useState<{
    open: boolean

    phone: string

    password: string

    fullName: string

    waUrl: string

    userToAuthenticate?: AloisAuthUser
  } | null>(null)

  const [formData, setFormData] = useState<AloisAuthUser>({
    patientId: getStoredPatientId(),

    username: "",

    fullName: "",

    gender: "",

    age: "",

    dob: "",

    email: "",

    phone: "",

    city: "",

    diagnosis: "Select",

    stage: "Select",

    caregiverName: "",

    caregiverEmail: "",

    caregiverPhone: "",
  })

  useEffect(() => {
    if (screen !== "caregiverVerify" || resendCountdown <= 0) return

    const timer = window.setInterval(() => {
      setResendCountdown((countdown) => countdown - 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [screen, resendCountdown])

  const completeAuthentication = (user: AloisAuthUser) => {
    const authenticatedUser = {
      ...user,

      patientId: user.patientId || createPatientId(),
    }

    try {
      localStorage.setItem(
        ALOIS_USER_STORAGE_KEY,

        JSON.stringify(authenticatedUser),
      )

      localStorage.setItem(ALOIS_AUTH_SESSION_KEY, "active")
    } catch {
      // Ignore storage errors and continue into the app.
    }

    onAuthenticated(authenticatedUser)
  }

  const updateForm = (field: keyof AloisAuthUser, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSendPasswordToWhatsApp = async () => {
    const raw = loginIdentifier.trim()

    if (!raw) {
      setAuthError("Please enter your name or WhatsApp number above first.")

      return
    }

    const digits = raw.replace(/\D/g, "")

    let phoneWithCode = ""

    if (digits.length >= 10) {
      phoneWithCode = digits.length === 10 ? `91${digits}` : digits
    } else {
      // Direct Cloud Supabase lookup + backend fallback

      try {
        const lookup = await lookupVerifiedSupabaseUser(raw)

        if (lookup.found && lookup.phone) {
          const d = lookup.phone.replace(/\D/g, "")

          phoneWithCode = d.length === 10 ? `91${d}` : d
        }
      } catch {
        // fallback
      }

      if (!phoneWithCode) {
        try {
          const res = await fetch(`${getApiBaseUrl()}/api/auth/lookup`, {
            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ identifier: raw }),
          })

          if (res.ok) {
            const data = await res.json()

            if (data.phone) {
              const d = data.phone.replace(/\D/g, "")

              phoneWithCode = d.length === 10 ? `91${d}` : d
            }
          }
        } catch {
          // Backend offline fallback
        }
      }
    }

    if (!phoneWithCode) {
      phoneWithCode = digits || "919876543210"
    }

    const msg = `*SwarSanket Password Assistance* 🩺\n\nHello SwarSanket, I need help accessing my account for: ${raw}. Please provide my login credentials.`

    const waUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`

    window.open(waUrl, "_blank")

    setAuthSuccess(
      `Opened WhatsApp for credentials assistance (+${phoneWithCode}).`,
    )
  }

  const handleFinishLogin = async (registration = false) => {
    setAuthError(null)

    setAuthSuccess(null)

    if (registration) {
      // Validate Registration Inputs

      if (!formData.fullName.trim()) {
        setAuthError("Please enter your full name.")

        return
      }

      const digits = formData.phone.replace(/\D/g, "")

      if (digits.length < 10) {
        setAuthError("Please enter a valid 10-digit WhatsApp phone number.")

        return
      }

      if (!password.trim() || password.length < 6) {
        setAuthError("Password must be at least 6 characters.")

        return
      }

      if (
        !formData.age ||
        Number(formData.age) < 1 ||
        Number(formData.age) > 120
      ) {
        setAuthError("Please enter a valid age (1-120).")

        return
      }

      if (!formData.gender) {
        setAuthError("Please select your gender.")

        return
      }

      if (!regAgreeTerms) {
        setAuthError("Please accept the terms of the Alzheimer's Association.")

        return
      }

      setIsBusy(true)

      const phoneKey = digits.slice(-10)

      const phoneWithCode = digits.length === 10 ? `91${digits}` : digits

      const virtualEmail = `${phoneKey}@swarsanket.app`

      const waText = `*SwarSanket Healthcare Credentials* 🩺\n\nHello *${formData.fullName.trim()}*,\n\nYour SwarSanket account is created successfully.\n\n🔑 *Password:* ${password}\n📱 *WhatsApp Number:* +${phoneWithCode}\n\nYou can sign in using your Name or WhatsApp number anytime!`

      const waUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(waText)}`

      // Open WhatsApp to deliver credentials

      try {
        window.open(waUrl, "_blank")
      } catch {
        // Popup blocker fallback
      }

      // Step 1: Register or sync user directly in Supabase Cloud

      const regResult = await registerVerifiedSupabaseUser({
        fullName: formData.fullName.trim(),

        phone: formData.phone.trim(),

        password: password.trim(),

        age: Number(formData.age),

        gender: formData.gender,
      })

      // Also notify backend in background if available

      fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({
          full_name: formData.fullName.trim(),

          phone: formData.phone.trim(),

          password: password.trim(),

          age: Number(formData.age),

          gender: formData.gender,
        }),
      }).catch(() => {})

      // Step 2: Sign in with Supabase Auth to obtain a session

      try {
        const authResult = await supabase.auth.signInWithPassword({
          email: regResult.email || virtualEmail,

          password: password.trim(),
        })

        if (authResult.error) {
          throw new Error(authResult.error.message)
        }

        // Step 3: Persist patient profile in Supabase DB

        await upsertMyPatientProfile({
          patientId: formData.patientId,

          username: formData.fullName.trim(),

          fullName: formData.fullName.trim(),

          age: Number(formData.age),

          gender: formData.gender,

          phone: formData.phone.trim(),
        }).catch((err) => {
          console.warn("Supabase profile sync note:", err)
        })

        const authenticatedUser: AloisAuthUser = {
          ...formData,

          username: formData.fullName.trim(),

          fullName: formData.fullName.trim(),

          email: regResult.email || virtualEmail,

          phone: formData.phone.trim(),
        }

        // Show WhatsApp verification modal

        setWhatsAppModal({
          open: true,

          phone: phoneWithCode,

          password,

          fullName: formData.fullName.trim(),

          waUrl,

          userToAuthenticate: authenticatedUser,
        })
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Registration failed. Please try again."

        setAuthError(message)
      } finally {
        setIsBusy(false)
      }
    } else {
      // LOGIN FLOW: Name or WhatsApp Number

      const raw = loginIdentifier.trim()

      if (!raw) {
        setAuthError("Please enter your name or WhatsApp number.")

        return
      }

      if (!password.trim()) {
        setAuthError("Please enter your password.")

        return
      }

      setIsBusy(true)

      let emailToUse = ""

      let resolvedName = raw

      if (raw.includes("@")) {
        emailToUse = raw.toLowerCase()
      } else {
        const digits = raw.replace(/\D/g, "")

        if (digits.length >= 10) {
          const phoneKey = digits.slice(-10)

          emailToUse = `${phoneKey}@swarsanket.app`
        } else {
          // Name lookup: check local storage first

          try {
            const stored = localStorage.getItem(ALOIS_USER_STORAGE_KEY)

            if (stored) {
              const parsed = JSON.parse(stored) as Partial<AloisAuthUser>

              if (
                parsed.fullName?.toLowerCase() === raw.toLowerCase() ||
                parsed.username?.toLowerCase() === raw.toLowerCase()
              ) {
                if (parsed.email) emailToUse = parsed.email
                else if (parsed.phone) {
                  const storedDigits = parsed.phone.replace(/\D/g, "")

                  if (storedDigits.length >= 10) {
                    emailToUse = `${storedDigits.slice(-10)}@swarsanket.app`
                  }
                }
              }
            }
          } catch {
            // ignore
          }

          // If not in local storage, query backend lookup

          if (!emailToUse) {
            // Direct Cloud Supabase lookup + backend fallback

            try {
              const lookup = await lookupVerifiedSupabaseUser(raw)

              if (lookup.found && lookup.email) {
                emailToUse = lookup.email

                if (lookup.fullName) resolvedName = lookup.fullName
              }
            } catch {
              // fallback
            }

            if (!emailToUse) {
              try {
                const lookupRes = await fetch(
                  `${getApiBaseUrl()}/api/auth/lookup`,

                  {
                    method: "POST",

                    headers: { "Content-Type": "application/json" },

                    body: JSON.stringify({ identifier: raw }),
                  },
                )

                if (lookupRes.ok) {
                  const data = await lookupRes.json()

                  if (data.found && data.email) {
                    emailToUse = data.email

                    if (data.full_name) resolvedName = data.full_name
                  }
                }
              } catch {
                // Backend offline
              }
            }
          }

          if (!emailToUse) {
            setAuthError(
              "Could not find an account with this name. Please enter your 10-digit WhatsApp number.",
            )

            setIsBusy(false)

            return
          }
        }
      }

      try {
        const authResult = await supabase.auth.signInWithPassword({
          email: emailToUse,

          password: password.trim(),
        })

        if (authResult.error) {
          const message =
            authResult.error.message.includes("Invalid login") ||
            authResult.error.message.includes("invalid") ||
            authResult.error.message.includes("password")
              ? "Invalid name/WhatsApp number or password."
              : authResult.error.message

          throw new Error(message)
        }

        let authenticatedUser: AloisAuthUser = {
          ...formData,

          fullName: resolvedName,

          username: resolvedName,

          email: emailToUse,
        }

        // Pull latest profile from Supabase

        try {
          const dbProfile = await getMyPatientProfile()

          if (dbProfile) {
            authenticatedUser = {
              ...authenticatedUser,

              fullName: dbProfile.full_name || authenticatedUser.fullName,

              username: dbProfile.username || authenticatedUser.username,

              phone: dbProfile.phone || authenticatedUser.phone,

              age: dbProfile.age
                ? String(dbProfile.age)
                : authenticatedUser.age,

              gender: dbProfile.gender || authenticatedUser.gender,

              caregiverName:
                dbProfile.caregiver_name || authenticatedUser.caregiverName,

              caregiverPhone:
                dbProfile.caregiver_phone || authenticatedUser.caregiverPhone,

              caregiverEmail:
                dbProfile.caregiver_email || authenticatedUser.caregiverEmail,
            }
          }
        } catch {
          // Use default user
        }

        completeAuthentication(authenticatedUser)
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Invalid name/WhatsApp number or password."

        setAuthError(message)
      } finally {
        setIsBusy(false)
      }
    }
  }

  const handleKeypadPress = (value: string) => {
    if (value === "backspace") {
      for (let index = otpDigits.length - 1; index >= 0; index -= 1) {
        if (otpDigits[index]) {
          const next = [...otpDigits]

          next[index] = ""

          setOtpDigits(next)

          break
        }
      }

      return
    }

    const index = otpDigits.findIndex((digit) => digit === "")

    if (index >= 0) {
      const next = [...otpDigits]

      next[index] = value

      setOtpDigits(next)
    }
  }

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center bg-[#031e26] p-2 sm:p-4 select-none">
      <div className="w-full max-w-[375px] h-[812px] bg-white rounded-[44px] shadow-2xl border-[6px] border-slate-800 flex flex-col overflow-hidden relative text-[#161616]">
        {/* Top Status Bar */}
        <div className="h-11 px-6 pt-3 flex items-center justify-between text-[#161616] text-[14px] font-semibold shrink-0 z-20">
          <span>9:41</span>
          <span className="text-[11px] font-bold">5G</span>
        </div>

        {/* WhatsApp Credential Dispatch Modal */}
        {whatsAppData?.open && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="w-full bg-white rounded-3xl p-6 shadow-2xl text-center space-y-4 border border-emerald-100">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-[#161616]">
                  Account Created!
                </h3>
                <p className="text-[12px] text-[#525252] mt-1">
                  Your login password was sent to WhatsApp:
                </p>
                <div className="mt-2 py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-800 text-[13px] font-semibold border border-emerald-200 inline-block">
                  +{whatsAppData.phone}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-left text-[12px] space-y-1 text-slate-700 border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-900">Name:</span>{" "}
                  {whatsAppData.fullName}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">
                    Password:
                  </span>{" "}
                  <span className="font-mono font-bold text-blue-600">
                    {whatsAppData.password}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href={whatsAppData.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open WhatsApp Message
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (whatsAppData.userToAuthenticate) {
                      completeAuthentication(whatsAppData.userToAuthenticate)
                    }

                    setWhatsAppModal(null)
                  }}
                  className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <span>Continue to App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOGIN SCREENS: You & Caregiver */}
        {(screen === "you" ||
          screen === "caregiver" ||
          screen === "caregiverVerify") && (
          <div className="flex-1 overflow-y-auto px-6 pt-3 pb-6 flex flex-col justify-between">
            <div>
              <AloisLogo />
              <div className="text-center mb-4">
                <h1
                  style={{ fontFamily }}
                  className="text-[20px] font-bold text-[#161616]"
                >
                  Welcome Back!
                </h1>
                <p className="text-[13px] text-[#525252] mt-0.5">
                  Choose who is signing in
                </p>
                {authError && (
                  <p className="text-[12px] text-rose-600 mt-2">{authError}</p>
                )}
                {authSuccess && (
                  <p className="text-[12px] text-emerald-600 mt-2">
                    {authSuccess}
                  </p>
                )}
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-[#E0E0E0] mb-6">
                {([
                  ["you", "You"],

                  ["caregiver", "Caregiver"],
                ] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setAuthError(null)

                      setAuthSuccess(null)

                      setScreen(tab)
                    }}
                    className={`flex-1 py-2 text-[14px] font-medium text-center transition-all relative ${
                      screen === tab ||
                      (tab === "caregiver" && screen === "caregiverVerify")
                        ? "text-[#161616] font-semibold"
                        : "text-[#525252]"
                    }`}
                  >
                    {label}
                    {(screen === tab ||
                      (tab === "caregiver" &&
                        screen === "caregiverVerify")) && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-[#161616]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Patient Login View */}
              {screen === "you" && (
                <div className="space-y-4">
                  <label className="text-[12px] font-medium text-[#525252] block">
                    Name or WhatsApp Number
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(event) =>
                        setLoginIdentifier(event.target.value)
                      }
                      placeholder="Enter your name or WhatsApp number"
                      className={`${inputClass} mt-1.5`}
                    />
                  </label>

                  <label className="text-[12px] font-medium text-[#525252] block">
                    Password
                    <span className="relative block mt-1.5">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#525252]"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </span>
                  </label>

                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={() => void handleSendPasswordToWhatsApp()}
                      className="text-[11px] text-[#0F62FE] hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>💬</span>
                      <span>Send password to WhatsApp</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleFinishLogin(false)}
                    disabled={isBusy}
                    className="w-full py-3 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors disabled:opacity-60"
                  >
                    {isBusy ? "Logging in..." : "Login"}
                  </button>
                </div>
              )}

              {/* Caregiver View */}
              {screen === "caregiver" && (
                <div className="space-y-5 text-center pt-4">
                  <p className="text-[14px] text-[#525252]">
                    Generate your unique code
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpDigits(["7", "4", "2", "9"])

                      setResendCountdown(56)

                      setScreen("caregiverVerify")
                    }}
                    className="w-full py-3 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
                  >
                    Generate code
                  </button>
                </div>
              )}

              {/* Caregiver Verification View */}
              {screen === "caregiverVerify" && (
                <div className="space-y-3 pt-1">
                  <p className="text-[12px] text-[#525252] text-center">
                    Your unique code was sent to your caregiver
                  </p>
                  <div className="flex justify-center gap-3 py-1">
                    {otpDigits.map((digit, index) => (
                      <div
                        key={index}
                        className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-[22px] font-bold text-[#161616] ${
                          digit
                            ? "border-[#0F62FE] bg-blue-50/20"
                            : "border-[#E0E0E0] bg-white"
                        }`}
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      completeAuthentication({
                        ...formData,

                        fullName: formData.fullName || "Caregiver Patient",

                        username: formData.username || "Caregiver Patient",
                      })
                    }}
                    disabled={isBusy}
                    className="w-full py-2.5 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
                  >
                    Verify
                  </button>
                  <div className="text-center text-[12px] text-[#525252]">
                    Resend in 00:
                    {resendCountdown < 10
                      ? `0${resendCountdown}`
                      : resendCountdown}
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-2">
                    {[
                      "1",

                      "2",

                      "3",

                      "4",

                      "5",

                      "6",

                      "7",

                      "8",

                      "9",

                      "",

                      "0",

                      "backspace",
                    ].map((key, index) =>
                      key ? (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleKeypadPress(key)}
                          className="h-11 rounded-lg bg-[#F4F4F4] hover:bg-slate-200 flex items-center justify-center text-[#161616]"
                        >
                          {key === "backspace" ? (
                            <Delete className="w-5 h-5 text-[#525252]" />
                          ) : (
                            key
                          )}
                        </button>
                      ) : (
                        <div key={index} className="h-11" />
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center pt-3 border-t border-[#E0E0E0]">
              <span className="text-[12px] text-[#525252]">New here? </span>
              <button
                type="button"
                onClick={() => {
                  setAuthError(null)

                  setAuthSuccess(null)

                  setScreen("register")
                }}
                className="text-[12px] font-medium text-[#0F62FE] hover:underline"
              >
                Register
              </button>
            </div>
          </div>
        )}

        {/* REGISTER SCREEN: Name & WhatsApp Number */}
        {screen === "register" && (
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 flex flex-col justify-between">
            <div>
              <AloisLogo />
              <div className="text-center mb-4">
                <h1
                  style={{ fontFamily }}
                  className="text-[20px] font-bold text-[#161616]"
                >
                  Register
                </h1>
                <p className="text-[13px] text-[#525252] mt-0.5">
                  Create your account
                </p>
                {authError && (
                  <p className="text-[12px] text-rose-600 mt-2">{authError}</p>
                )}
                {authSuccess && (
                  <p className="text-[12px] text-emerald-600 mt-2">
                    {authSuccess}
                  </p>
                )}
              </div>

              <div className="space-y-3.5">
                {/* Full Name in place of Email */}
                <label className="text-[12px] font-medium text-[#525252] block">
                  Full Name
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(event) =>
                      updateForm("fullName", event.target.value)
                    }
                    placeholder="Enter your full name"
                    className={`${inputClass} mt-1.5`}
                  />
                </label>

                {/* WhatsApp Phone Number */}
                <label className="text-[12px] font-medium text-[#525252] block">
                  WhatsApp Number
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) =>
                      updateForm("phone", event.target.value)
                    }
                    placeholder="Enter your WhatsApp number (e.g. 9876543210)"
                    className={`${inputClass} mt-1.5`}
                  />
                </label>

                {/* Age and Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[12px] font-medium text-[#525252] block">
                    Age
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={formData.age}
                      onChange={(event) =>
                        updateForm("age", event.target.value)
                      }
                      placeholder="Age"
                      className={`${inputClass} mt-1.5`}
                    />
                  </label>
                  <label className="text-[12px] font-medium text-[#525252] block">
                    Gender
                    <select
                      value={formData.gender}
                      onChange={(event) =>
                        updateForm("gender", event.target.value)
                      }
                      className={`${inputClass} mt-1.5`}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>

                {/* Password with WhatsApp Dispatch Indicator */}
                <label className="text-[12px] font-medium text-[#525252] block">
                  Password
                  <span className="relative block mt-1.5">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Create a password"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((visible) => !visible)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#525252]"
                      aria-label={
                        showRegPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </span>
                </label>

                {/* WhatsApp Dispatch Notice */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] leading-tight">
                  <span className="text-[14px]">📱</span>
                  <span>
                    Your password will be securely sent to your{" "}
                    <strong>WhatsApp number</strong> upon registration.
                  </span>
                </div>

                {/* Terms Agreement */}
                <label className="flex items-start gap-2 pt-1 text-[11px] text-[#525252] leading-snug cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regAgreeTerms}
                    onChange={(event) => setRegAgreeTerms(event.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#0F62FE] focus:ring-0"
                  />
                  <span>
                    I agree to the terms of the Alzheimer's Association.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => void handleFinishLogin(true)}
                  disabled={isBusy}
                  className="w-full py-3 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors disabled:opacity-60"
                >
                  {isBusy ? "Creating account..." : "Register & Send Password"}
                </button>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-[#E0E0E0]">
              <span className="text-[12px] text-[#525252]">
                I already have an account,{" "}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAuthError(null)

                  setAuthSuccess(null)

                  setScreen("you")
                }}
                className="text-[12px] font-medium text-[#0F62FE] hover:underline"
              >
                Login
              </button>
            </div>
          </div>
        )}

        {/* Bottom Home Indicator */}
        <div className="h-6 flex items-center justify-center shrink-0">
          <div className="w-32 h-1 bg-black rounded-full" />
        </div>
      </div>
    </div>
  )
}
