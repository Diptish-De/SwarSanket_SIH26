import React, { useState, useEffect } from "react"

import {
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
  Fingerprint,
  Check,
  ArrowLeft,
  Delete,
} from "lucide-react"

export interface AloisAuthUser {
  fullName: string

  gender: string

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
  onAuthenticated: (fullName: string, caregiverName?: string) => void

  fontFamily?: string
}

type AuthScreen = "credential" | "biometric" | "caregiver" | "caregiverVerify" | "register" | "setup1" | "setup2" | "setup3" | "setup4" | "success"

export const ALOIS_USER_STORAGE_KEY = "alois-user-profile"

export const ALOIS_AUTH_SESSION_KEY = "alois-auth-session"

/**
 * Concentric circular blue ring logo matching Figma node 96:732 / 1049:48629.
 */

function AloisLogo() {
  return (
    <div className="w-10 h-10 flex items-center justify-center mx-auto mb-3">
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="18" cy="18" r="14" stroke="#0F62FE" strokeWidth="4.5" />
        <circle cx="18" cy="18" r="5" fill="#0F62FE" />
      </svg>
    </div>
  )
}

/**
 * Alois Authentication & Account Setup Suite — exact pixel-matching replica of
 * Figma node 1049:48629 / 96:732 / 206:2535 / 207:2205 / 222:13056 / 210:2277 /
 * 289:12988 / 307:13054 / 307:14675 / 308:14734 / 222:13264.
 */

export default function AloisAuthContainer({
  onAuthenticated,

  fontFamily = "'Outfit', sans-serif",
}: AloisAuthContainerProps) {
  const [screen, setScreen] = useState<AuthScreen>("credential")

  // Login credentials

  const [username, setUsername] = useState("jerrold")

  const [password, setPassword] = useState("password123")

  const [showPassword, setShowPassword] = useState(false)

  const [rememberMe, setRememberMe] = useState(false)

  // Registration

  const [regUsername, setRegUsername] = useState("")

  const [regPassword, setRegPassword] = useState("")

  const [showRegPassword, setShowRegPassword] = useState(false)

  const [regAgreeTerms, setRegAgreeTerms] = useState(false)

  // 4-Step Account Setup Form

  const [formData, setFormData] = useState<AloisAuthUser>({
    fullName: "Jerrold Harrington",

    gender: "Select your Gender",

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

  // Caregiver OTP

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""])

  const [resendCountdown, setResendCountdown] = useState(56)

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (screen === "caregiverVerify" && resendCountdown > 0) {
      timer = setInterval(() => setResendCountdown((c) => c - 1), 1000)
    }

    return () => clearInterval(timer)
  }, [screen, resendCountdown])

  const handleFinishLogin = () => {
    try {
      localStorage.setItem(ALOIS_USER_STORAGE_KEY, JSON.stringify(formData))

      localStorage.setItem(ALOIS_AUTH_SESSION_KEY, "active")
    } catch {
      // Ignore
    }

    onAuthenticated(
      formData.fullName || "Jerrold Harrington",

      formData.caregiverName || "Marcus Harrington",
    )
  }

  const handleKeypadPress = (val: string) => {
    if (val === "backspace") {
      for (let i = otpDigits.length - 1; i >= 0; i--) {
        if (otpDigits[i] !== "") {
          const next = [...otpDigits]

          next[i] = ""

          setOtpDigits(next)

          break
        }
      }
    } else {
      const idx = otpDigits.findIndex((d) => d === "")

      if (idx !== -1) {
        const next = [...otpDigits]

        next[idx] = val

        setOtpDigits(next)
      }
    }
  }

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center bg-[#031e26] p-2 sm:p-4 select-none">
      {/* 375pt Phone Frame */}
      <div className="w-full max-w-[375px] h-[812px] bg-white rounded-[44px] shadow-2xl border-[6px] border-slate-800 flex flex-col overflow-hidden relative text-[#161616]">
        {/* iOS Status Bar (9:41) */}
        <div className="h-11 px-6 pt-3 flex items-center justify-between text-[#161616] text-[14px] font-semibold shrink-0 z-20">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold">5G</span>
            <div className="w-5 h-2.5 border border-[#161616] rounded-xs p-0.5 flex items-center">
              <div className="w-full h-full bg-[#161616] rounded-2xs" />
            </div>
          </div>
        </div>

        {/* ─── SCREENS 1–4: LOGIN SCREENS (Credential / Biometric / Caregiver / Caregiver Verification) ── */}
        {(screen === "credential" ||
          screen === "biometric" ||
          screen === "caregiver" ||
          screen === "caregiverVerify") && (
          <div className="flex-1 overflow-y-auto px-6 pt-3 pb-6 flex flex-col justify-between">
            <div>
              <AloisLogo />

              {/* Title & Subtitle */}
              <div className="text-center mb-4">
                <h1
                  style={{ fontFamily }}
                  className="text-[20px] font-bold text-[#161616]"
                >
                  Welcome Back!
                </h1>
                <p className="text-[13px] text-[#525252] mt-0.5">
                  Choose your login method
                </p>
              </div>

              {/* Tab Navigation Row with Underline (Figma AuthTabs) */}
              <div className="flex border-b border-[#E0E0E0] mb-6">
                <button
                  type="button"
                  onClick={() => setScreen("credential")}
                  className={`flex-1 py-2 text-[14px] font-medium text-center transition-all relative ${
                    screen === "credential"
                      ? "text-[#161616] font-semibold"
                      : "text-[#525252]"
                  }`}
                >
                  Credential
                  {screen === "credential" && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-[#161616]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setScreen("biometric")}
                  className={`flex-1 py-2 text-[14px] font-medium text-center transition-all relative ${
                    screen === "biometric"
                      ? "text-[#161616] font-semibold"
                      : "text-[#525252]"
                  }`}
                >
                  Biometric
                  {screen === "biometric" && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-[#161616]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setScreen("caregiver")}
                  className={`flex-1 py-2 text-[14px] font-medium text-center transition-all relative ${
                    screen === "caregiver" || screen === "caregiverVerify"
                      ? "text-[#161616] font-semibold"
                      : "text-[#525252]"
                  }`}
                >
                  Caregiver
                  {(screen === "caregiver" || screen === "caregiverVerify") && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-[#161616]" />
                  )}
                </button>
              </div>

              {/* ── 1. CREDENTIAL LOGIN (Figma node 96:732) ── */}
              {screen === "credential" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[12px] font-medium text-[#525252] block mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full px-3.5 py-3 rounded-lg bg-[#F4F4F4] text-[14px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden focus:ring-1 focus:ring-[#0F62FE]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#525252] block mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-3.5 pr-10 py-3 rounded-lg bg-[#F4F4F4] text-[14px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden focus:ring-1 focus:ring-[#0F62FE]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#525252]"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0F62FE] focus:ring-0"
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-[12px] text-[#525252] cursor-pointer"
                    >
                      Remember me
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleFinishLogin}
                      className="w-full py-3 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
                    >
                      Login
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      className="text-[12px] text-[#525252] hover:underline"
                    >
                      Forgot my password
                    </button>
                  </div>
                </div>
              )}

              {/* ── 2. BIOMETRIC LOGIN (Figma node 206:2535) ── */}
              {screen === "biometric" && (
                <div className="space-y-4 text-center pt-2">
                  <p className="text-[13px] text-[#525252]">
                    Confirm fingerprint to continue
                  </p>

                  <div
                    onClick={handleFinishLogin}
                    className="w-32 h-32 rounded-2xl bg-white border border-[#E0E0E0] shadow-md flex items-center justify-center mx-auto my-4 cursor-pointer hover:border-[#0F62FE] transition-all"
                  >
                    <Fingerprint className="w-20 h-20 text-[#161616] stroke-[1.2]" />
                  </div>

                  <p className="text-[12px] text-[#525252]">Touch Sensor</p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setScreen("credential")}
                      className="w-full py-3 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="pt-2 text-[12px] text-[#525252]">
                    Touch id not working,{" "}
                    <button
                      type="button"
                      onClick={() => setScreen("credential")}
                      className="text-[#0F62FE] font-medium hover:underline"
                    >
                      Click here
                    </button>
                  </div>
                </div>
              )}

              {/* ── 3. CAREGIVER LOGIN (Figma node 207:2205) ── */}
              {screen === "caregiver" && (
                <div className="space-y-5 text-center pt-4">
                  <p className="text-[14px] text-[#525252]">
                    Generate your unique code
                  </p>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpDigits(["7", "4", "2", "9"])

                        setScreen("caregiverVerify")
                      }}
                      className="w-full py-3 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
                    >
                      Generate code
                    </button>
                  </div>
                </div>
              )}

              {/* ── 4. CAREGIVER VERIFICATION (Figma node 222:13056) ── */}
              {screen === "caregiverVerify" && (
                <div className="space-y-3 pt-1">
                  <p className="text-[12px] text-[#525252] text-center">
                    Your unique code send to your caregiver
                  </p>

                  {/* 4 OTP Boxes */}
                  <div className="flex justify-center gap-3 py-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-[22px] font-bold text-[#161616] ${
                          otpDigits[i]
                            ? "border-[#0F62FE] bg-blue-50/20"
                            : "border-[#E0E0E0] bg-white"
                        }`}
                      >
                        {otpDigits[i]}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleFinishLogin}
                    className="w-full py-2.5 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
                  >
                    Verify
                  </button>

                  <div className="text-center text-[12px] text-[#525252]">
                    Resend in,{" "}
                    <span className="text-[#0F62FE] font-medium">
                      00:
                      {resendCountdown < 10
                        ? `0${resendCountdown}`
                        : resendCountdown}
                    </span>
                  </div>

                  {/* iOS Numeric Keypad from Figma */}
                  <div className="grid grid-cols-3 gap-1 pt-2">
                    {[
                      { num: "1", sub: "" },

                      { num: "2", sub: "ABC" },

                      { num: "3", sub: "DEF" },

                      { num: "4", sub: "GHI" },

                      { num: "5", sub: "JKL" },

                      { num: "6", sub: "MNO" },

                      { num: "7", sub: "PQRS" },

                      { num: "8", sub: "TUV" },

                      { num: "9", sub: "WXYZ" },

                      { num: "", sub: "" },

                      { num: "0", sub: "" },

                      { num: "backspace", sub: "" },
                    ].map((key, kIdx) => {
                      if (!key.num) {
                        return <div key={kIdx} className="h-11" />
                      }

                      return (
                        <button
                          key={kIdx}
                          type="button"
                          onClick={() => handleKeypadPress(key.num)}
                          className="h-11 rounded-lg bg-[#F4F4F4] hover:bg-slate-200 active:bg-slate-300 flex flex-col items-center justify-center text-[#161616] transition-colors"
                        >
                          {key.num === "backspace" ? (
                            <Delete className="w-5 h-5 text-[#525252]" />
                          ) : (
                            <>
                              <span className="text-[17px] font-semibold leading-none">
                                {key.num}
                              </span>
                              {key.sub && (
                                <span className="text-[8px] font-semibold text-[#8D8D8D] leading-none mt-0.5">
                                  {key.sub}
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Register Link */}
            <div className="text-center pt-3 border-t border-[#E0E0E0]">
              <span className="text-[12px] text-[#525252]">
                I already have an account,{" "}
              </span>
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

        {/* ─── SCREEN 5: REGISTRATION (Figma node 210:2277) ─────────────── */}
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
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-3.5 py-3 rounded-lg bg-[#F4F4F4] text-[14px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden focus:ring-1 focus:ring-[#0F62FE]"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-3.5 pr-10 py-3 rounded-lg bg-[#F4F4F4] text-[14px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden focus:ring-1 focus:ring-[#0F62FE]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#525252]"
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={regAgreeTerms}
                    onChange={(e) => setRegAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#0F62FE] focus:ring-0"
                  />
                  <label
                    htmlFor="terms"
                    className="text-[11px] text-[#525252] leading-snug cursor-pointer"
                  >
                    Check here to indicate that you have agree to the terms of
                    the{" "}
                    <span className="text-[#0F62FE]">
                      Alzheimer's Association
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setScreen("setup1")}
                    className="w-full py-3 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-[#E0E0E0]">
              <span className="text-[12px] text-[#525252]">
                I already have an account,{" "}
              </span>
              <button
                type="button"
                onClick={() => setScreen("credential")}
                className="text-[12px] font-medium text-[#0F62FE] hover:underline"
              >
                Login
              </button>
            </div>
          </div>
        )}

        {/* ─── SCREEN 6: ACCOUNT SETUP STEP 1 (Figma node 289:12988) ──────── */}
        {screen === "setup1" && (
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 flex flex-col justify-between">
            <div>
              <AloisLogo />

              <div className="text-center mb-4">
                <h1
                  style={{ fontFamily }}
                  className="text-[18px] font-bold text-[#161616]"
                >
                  Let's setup your account
                </h1>
                <p className="text-[12px] text-[#525252] mt-0.5">
                  A few steps aheads to go.
                </p>
                <p className="text-[12px] text-[#525252] mt-1">
                  Personal Details
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] focus:outline-hidden"
                  >
                    <option value="Select your Gender">
                      Select your Gender
                    </option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.dob}
                      onChange={(e) =>
                        setFormData({ ...formData, dob: e.target.value })
                      }
                      placeholder="mm/dd/yyyy"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden"
                    />
                    <CalendarIcon className="w-4 h-4 text-[#161616] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Next Button on Right (Figma layout) */}
              <div className="flex justify-end pt-5">
                <button
                  type="button"
                  onClick={() => setScreen("setup2")}
                  className="px-6 py-2.5 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-semibold transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Bottom Progress Line (25%) & Attribution */}
            <div>
              <div className="w-full h-[2px] bg-slate-200 mb-3 overflow-hidden">
                <div className="h-full bg-[#0F62FE] w-1/4" />
              </div>
              <p className="text-[11px] text-[#525252] text-center">
                From the house of{" "}
                <span className="text-[#0F62FE]">Alzheimer's Association</span>
              </p>
            </div>
          </div>
        )}

        {/* ─── SCREEN 7: ACCOUNT SETUP STEP 2 (Figma node 307:13054) ──────── */}
        {screen === "setup2" && (
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 flex flex-col justify-between">
            <div>
              <AloisLogo />

              <div className="text-center mb-4">
                <h1
                  style={{ fontFamily }}
                  className="text-[18px] font-bold text-[#161616]"
                >
                  Let's setup your account
                </h1>
                <p className="text-[12px] text-[#525252] mt-0.5">
                  A few steps aheads to go.
                </p>
                <p className="text-[12px] text-[#525252] mt-1">
                  Contact Details
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter your email"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Enter your phone number"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    City/Location
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Enter your city name"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Back Arrow & Next Button (Figma layout) */}
              <div className="flex items-center justify-between pt-5">
                <button
                  type="button"
                  onClick={() => setScreen("setup1")}
                  className="text-[#161616] hover:text-[#0F62FE] p-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setScreen("setup3")}
                  className="px-6 py-2.5 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-semibold transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Bottom Progress Line (50%) & Attribution */}
            <div>
              <div className="w-full h-[2px] bg-slate-200 mb-3 overflow-hidden">
                <div className="h-full bg-[#0F62FE] w-2/4" />
              </div>
              <p className="text-[11px] text-[#525252] text-center">
                From the house of{" "}
                <span className="text-[#0F62FE]">Alzheimer's Association</span>
              </p>
            </div>
          </div>
        )}

        {/* ─── SCREEN 8: ACCOUNT SETUP STEP 3 (Figma node 307:14675) ──────── */}
        {screen === "setup3" && (
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 flex flex-col justify-between">
            <div>
              <AloisLogo />

              <div className="text-center mb-4">
                <h1
                  style={{ fontFamily }}
                  className="text-[18px] font-bold text-[#161616]"
                >
                  Let's setup your account
                </h1>
                <p className="text-[12px] text-[#525252] mt-0.5">
                  A few steps aheads to go.
                </p>
                <p className="text-[12px] text-[#525252] mt-1">
                  Medical History
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Diagnosis
                  </label>
                  <select
                    value={formData.diagnosis}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnosis: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] focus:outline-hidden"
                  >
                    <option value="Select">Select</option>
                    <option value="Alzheimer's Disease">
                      Alzheimer's Disease
                    </option>
                    <option value="Mild Cognitive Impairment">
                      Mild Cognitive Impairment (MCI)
                    </option>
                    <option value="Vascular Dementia">Vascular Dementia</option>
                    <option value="Healthy Senior / Baseline">
                      Healthy Senior / Baseline
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) =>
                      setFormData({ ...formData, stage: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] focus:outline-hidden"
                  >
                    <option value="Select">Select</option>
                    <option value="Early Stage">Early Stage</option>
                    <option value="Moderate Stage">Moderate Stage</option>
                    <option value="Advanced Stage">Advanced Stage</option>
                  </select>
                </div>

                {/* Medical Reports Uploader from Figma */}
                <div className="space-y-1 pt-1">
                  <label className="text-[12px] font-medium text-[#525252] block">
                    Medical Reports{" "}
                    <span className="text-[#8D8D8D] font-normal">
                      (Optional)
                    </span>
                  </label>
                  <p className="text-[11px] text-[#8D8D8D] leading-snug">
                    Max file size is 500kb. Supported file types are .jpg and
                    .pdf.
                  </p>
                  <button
                    type="button"
                    className="px-5 py-2 rounded-lg border border-[#0F62FE] text-[#0F62FE] text-[12px] font-semibold hover:bg-blue-50/50 mt-1 transition-colors"
                  >
                    Upload
                  </button>
                </div>
              </div>

              {/* Back Arrow & Next Button (Figma layout) */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setScreen("setup2")}
                  className="text-[#161616] hover:text-[#0F62FE] p-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setScreen("setup4")}
                  className="px-6 py-2.5 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-semibold transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Bottom Progress Line (75%) & Attribution */}
            <div>
              <div className="w-full h-[2px] bg-slate-200 mb-3 overflow-hidden">
                <div className="h-full bg-[#0F62FE] w-3/4" />
              </div>
              <p className="text-[11px] text-[#525252] text-center">
                From the house of{" "}
                <span className="text-[#0F62FE]">Alzheimer's Association</span>
              </p>
            </div>
          </div>
        )}

        {/* ─── SCREEN 9: ACCOUNT SETUP STEP 4 (Figma node 308:14734) ──────── */}
        {screen === "setup4" && (
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 flex flex-col justify-between">
            <div>
              <AloisLogo />

              <div className="text-center mb-4">
                <h1
                  style={{ fontFamily }}
                  className="text-[18px] font-bold text-[#161616]"
                >
                  Let's setup your account
                </h1>
                <p className="text-[12px] text-[#525252] mt-0.5">
                  A few steps aheads to go.
                </p>
                <p className="text-[12px] text-[#525252] mt-1">
                  Primary Caregiver Information
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Primary caregiver name
                  </label>
                  <input
                    type="text"
                    value={formData.caregiverName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,

                        caregiverName: e.target.value,
                      })
                    }
                    placeholder="Enter caregiver name"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.caregiverEmail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,

                        caregiverEmail: e.target.value,
                      })
                    }
                    placeholder="Enter email here"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.caregiverPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,

                        caregiverPhone: e.target.value,
                      })
                    }
                    placeholder="Enter phone number here"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F4F4F4] text-[13px] text-[#161616] placeholder:text-[#8D8D8D] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Back Arrow & Next Button (Figma layout) */}
              <div className="flex items-center justify-between pt-5">
                <button
                  type="button"
                  onClick={() => setScreen("setup3")}
                  className="text-[#161616] hover:text-[#0F62FE] p-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setScreen("success")}
                  className="px-6 py-2.5 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-semibold transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Bottom Progress Line (100%) & Attribution */}
            <div>
              <div className="w-full h-[2px] bg-slate-200 mb-3 overflow-hidden">
                <div className="h-full bg-[#0F62FE] w-full" />
              </div>
              <p className="text-[11px] text-[#525252] text-center">
                From the house of{" "}
                <span className="text-[#0F62FE]">Alzheimer's Association</span>
              </p>
            </div>
          </div>
        )}

        {/* ─── SCREEN 10: SUCCESSFUL MSG (Figma node 222:13264) ─────────── */}
        {screen === "success" && (
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 flex flex-col items-center justify-between text-center">
            <div className="w-full">
              <AloisLogo />

              <h1
                style={{ fontFamily }}
                className="text-[20px] font-bold text-[#525252] mb-3"
              >
                Good to go!
              </h1>

              {/* Happy Earth Illustration with Flowers, Butterfly, Heart Bubble */}
              <div className="my-5 relative w-48 h-48 mx-auto flex items-center justify-center">
                {/* Floating moon and clouds */}
                <div className="absolute top-2 left-6 w-5 h-5 rounded-full bg-slate-200/80" />
                {/* Earth Sphere */}
                <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-sky-400 via-blue-400 to-indigo-500 shadow-xl flex items-center justify-center relative">
                  {/* Closed happy eye lines */}
                  <div className="text-white text-lg font-bold">^ ◡ ^</div>
                  {/* Floral & leaf wreath */}
                  <span className="absolute -top-2 -left-2 text-xl">🌸</span>
                  <span className="absolute -top-1 -right-1 text-xl">🌿</span>
                  <span className="absolute -bottom-2 -left-1 text-xl">🌺</span>
                  <span className="absolute -bottom-1 -right-2 text-xl">
                    🌼
                  </span>
                  {/* Floating heart bubble */}
                  <div className="absolute -top-3 right-3 w-7 h-7 rounded-full bg-sky-200 text-rose-500 flex items-center justify-center shadow-xs">
                    ♥
                  </div>
                </div>
              </div>

              <h2
                style={{ fontFamily }}
                className="text-[16px] font-bold text-[#161616]"
              >
                All done!
              </h2>
              <p className="text-[13px] text-[#525252] mt-1 leading-snug">
                Let's start our wonderful journey with alOis.
              </p>
            </div>

            <div className="w-full space-y-4">
              <button
                type="button"
                onClick={handleFinishLogin}
                className="w-full py-2.5 rounded-lg bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-semibold shadow-xs transition-colors"
              >
                Continue
              </button>

              {/* Green Checkmark & Progress Bar from Figma */}
              <div className="flex items-center gap-2 pt-1">
                <div className="w-4 h-4 rounded-full bg-[#198038] text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <div className="flex-1 h-[3px] bg-[#198038] rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* iOS Home Indicator */}
        <div className="h-6 flex items-center justify-center shrink-0">
          <div className="w-32 h-1 bg-black rounded-full" />
        </div>
      </div>
    </div>
  )
}
