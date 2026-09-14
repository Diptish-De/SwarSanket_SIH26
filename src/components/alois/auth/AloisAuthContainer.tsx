import React, { useEffect, useState } from "react"

import { Delete, Eye, EyeOff } from "lucide-react"

import { upsertMyPatientProfile } from "../../../services/patientProfile"

import { isSupabaseConfigured, supabase } from "../../../services/supabase"

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

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)

  const [showRegPassword, setShowRegPassword] = useState(false)

  const [regAgreeTerms, setRegAgreeTerms] = useState(false)

  const [otpDigits, setOtpDigits] = useState(["", "", "", ""])

  const [resendCountdown, setResendCountdown] = useState(56)

  const [authError, setAuthError] = useState<string | null>(null)

  const [isBusy, setIsBusy] = useState(false)

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

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim())

  const authenticateWithSupabase = async (
    user: AloisAuthUser,

    registration: boolean,
  ): Promise<boolean> => {
    if (!supabase || !isSupabaseConfigured()) {
      setAuthError("Supabase authentication is not configured.")

      return true
    }

    const normalizedEmail = registration
      ? (user.email || formData.email || "").trim()
      : email.trim()

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setAuthError("Please enter a valid email address.")

      return true
    }

    if (!password.trim()) {
      setAuthError("Please enter your password.")

      return true
    }

    setIsBusy(true)

    setAuthError(null)

    try {
      const authResult = registration
        ? await supabase.auth.signUp({
            email: normalizedEmail,

            password,

            options: {
              data: {
                username: user.username || normalizedEmail,

                full_name: user.fullName || user.username || normalizedEmail,
              },
            },
          })
        : await supabase.auth.signInWithPassword({
            email: normalizedEmail,

            password,
          })

      if (authResult.error) {
        const message =
          authResult.error.message.includes("Invalid login") ||
          authResult.error.message.includes("invalid") ||
          authResult.error.message.includes("password")
            ? "Invalid email or password."
            : authResult.error.message

        throw new Error(message)
      }

      if (registration && !authResult.data.user) {
        setAuthError(
          "Unable to create your account right now. Please try again.",
        )

        return true
      }

      if (!registration && !authResult.data.session) {
        setAuthError("Please confirm your email before signing in.")

        return true
      }

      await upsertMyPatientProfile({
        patientId: user.patientId,

        username: user.username || normalizedEmail,

        fullName: user.fullName || user.username || normalizedEmail,

        age: Number.isFinite(Number(user.age)) ? Number(user.age) : undefined,

        gender: user.gender,

        phone: user.phone,

        caregiverName: user.caregiverName,

        caregiverPhone: user.caregiverPhone,

        caregiverEmail: user.caregiverEmail,
      })

      completeAuthentication(user)

      return true
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to authenticate with Supabase."

      setAuthError(
        message === "AuthApiError" ? "Invalid email or password." : message,
      )

      return true
    } finally {
      setIsBusy(false)
    }
  }

  const handleFinishLogin = async (user = formData, registration = false) => {
    await authenticateWithSupabase(user, registration)
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

  const updateForm = (field: keyof AloisAuthUser, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center bg-[#031e26] p-2 sm:p-4 select-none">
      <div className="w-full max-w-[375px] h-[812px] bg-white rounded-[44px] shadow-2xl border-[6px] border-slate-800 flex flex-col overflow-hidden relative text-[#161616]">
        <div className="h-11 px-6 pt-3 flex items-center justify-between text-[#161616] text-[14px] font-semibold shrink-0 z-20">
          <span>9:41</span>
          <span className="text-[11px] font-bold">5G</span>
        </div>

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
              </div>

              <div className="flex border-b border-[#E0E0E0] mb-6">
                {([
                  ["you", "You"],

                  ["caregiver", "Caregiver"],
                ] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setScreen(tab)}
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

              {screen === "you" && (
                <div className="space-y-4">
                  <label className="text-[12px] font-medium text-[#525252] block">
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email"
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

                  <button
                    type="button"
                    onClick={() => void handleFinishLogin()}
                    disabled={isBusy}
                    className="w-full py-3 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
                  >
                    Login
                  </button>
                </div>
              )}

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
                    onClick={() => void handleFinishLogin()}
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
                onClick={() => setScreen("register")}
                className="text-[12px] font-medium text-[#0F62FE] hover:underline"
              >
                Register
              </button>
            </div>
          </div>
        )}

        {screen === "register" && (
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 flex flex-col justify-between">
            <div>
              <AloisLogo />
              <div className="text-center mb-5">
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
              </div>

              <div className="space-y-3.5">
                <label className="text-[12px] font-medium text-[#525252] block">
                  Email
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    placeholder="Enter your email"
                    className={`${inputClass} mt-1.5`}
                  />
                </label>
                <label className="text-[12px] font-medium text-[#525252] block">
                  Username
                  <input
                    value={formData.username}
                    onChange={(event) =>
                      updateForm("username", event.target.value)
                    }
                    placeholder="Enter your username"
                    className={`${inputClass} mt-1.5`}
                  />
                </label>
                <label className="text-[12px] font-medium text-[#525252] block">
                  Phone number
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) =>
                      updateForm("phone", event.target.value)
                    }
                    placeholder="Enter your phone number"
                    className={`${inputClass} mt-1.5`}
                  />
                </label>
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
                  onClick={() => {
                    void handleFinishLogin(
                      {
                        ...formData,

                        fullName: formData.username,
                      },

                      true,
                    )
                  }}
                  disabled={isBusy}
                  className="w-full py-3 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
                >
                  Register
                </button>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-[#E0E0E0]">
              <span className="text-[12px] text-[#525252]">
                I already have an account,{" "}
              </span>
              <button
                type="button"
                onClick={() => setScreen("you")}
                className="text-[12px] font-medium text-[#0F62FE] hover:underline"
              >
                Login
              </button>
            </div>
          </div>
        )}

        <div className="h-6 flex items-center justify-center shrink-0">
          <div className="w-32 h-1 bg-black rounded-full" />
        </div>
      </div>
    </div>
  )
}
