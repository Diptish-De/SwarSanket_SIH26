import React, { useState, useEffect } from "react"
import {
  ChevronLeft,
  Fingerprint,
  Check,
  ShieldCheck,
  Calendar,
  Upload,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Heart,
  Globe,
  Phone,
  User,
  CheckCircle2,
  Lock,
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
  caregiverRelation: string
}

interface AloisAuthContainerProps {
  onAuthenticated: (fullName: string, caregiverName?: string) => void
  fontFamily?: string
}

type AuthScreen = "login" | "register" | "setup1" | "setup2" | "setup3" | "setup4" | "success"

type LoginTab = "credential" | "biometric" | "caregiver"

export const ALOIS_USER_STORAGE_KEY = "alois-user-profile"

export default function AloisAuthContainer({
  onAuthenticated,
  fontFamily = "'Outfit', sans-serif",
}: AloisAuthContainerProps) {
  const [screen, setScreen] = useState<AuthScreen>("login")
  const [loginTab, setLoginTab] = useState<LoginTab>("credential")

  // Login credentials
  const [username, setUsername] = useState("jerrold")
  const [password, setPassword] = useState("password123")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Registration & Account Setup State
  const [regUsername, setRegUsername] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regAgreeTerms, setRegAgreeTerms] = useState(true)

  // 4-Step Profile Form
  const [formData, setFormData] = useState<AloisAuthUser>({
    fullName: "Jerrold Harrington",
    gender: "Male",
    dob: "05/14/1954",
    email: "jerrold.h@example.com",
    phone: "+91 98301 23456",
    city: "Kolkata, West Bengal",
    diagnosis: "Early-stage Alzheimer's",
    stage: "Stage 1 Mild Cognitive Impairment",
    caregiverName: "Marcus Harrington",
    caregiverEmail: "marcus.h@example.com",
    caregiverPhone: "+91 98310 98765",
    caregiverRelation: "Son",
  })

  // Caregiver OTP
  const [otpDigits, setOtpDigits] = useState<string[]>(["7", "4", "2", "9"])
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [resendTimer, setResendTimer] = useState(56)

  // Biometric scanning simulation
  const [isScanningBiometric, setIsScanningBiometric] = useState(false)

  // Resend timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isOtpSent && resendTimer > 0) {
      timer = setInterval(() => setResendTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [isOtpSent, resendTimer])

  const handleLogin = () => {
    // Save to local storage
    localStorage.setItem(ALOIS_USER_STORAGE_KEY, JSON.stringify(formData))
    onAuthenticated(formData.fullName, formData.caregiverName)
  }

  const handleSimulateBiometric = () => {
    setIsScanningBiometric(true)
    setTimeout(() => {
      setIsScanningBiometric(false)
      handleLogin()
    }, 1200)
  }

  const handleCompleteSetup = () => {
    localStorage.setItem(ALOIS_USER_STORAGE_KEY, JSON.stringify(formData))
    setScreen("success")
  }

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center bg-[#031e26] p-2 sm:p-4 select-none">
      {/* Phone Frame Container */}
      <div className="w-full max-w-[390px] h-[844px] bg-[#F4F4F4] rounded-[44px] shadow-2xl border-[6px] border-slate-800 flex flex-col overflow-hidden relative">
        {/* iOS Notch / Island & Status bar */}
        <div className="h-10 px-6 pt-3 flex items-center justify-between text-[#161616] text-[13px] font-semibold shrink-0 z-20">
          <span>9:41</span>
          <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">5G</span>
            <div className="w-4 h-2.5 border border-[#161616] rounded-xs p-0.5 flex items-center">
              <div className="w-full h-full bg-[#161616] rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Top Alois Brand Icon */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0F62FE] to-[#4589FF] text-white flex items-center justify-center shadow-md shadow-blue-500/25">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* ─── SCREEN 1: LOGIN (Figma node 96:732 / 206:2535 / 222:13056) ── */}
        {screen === "login" && (
          <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
            <div>
              <div className="text-center mt-1 mb-4">
                <h2
                  style={{ fontFamily }}
                  className="text-[22px] font-bold text-[#161616] tracking-tight"
                >
                  Welcome Back!
                </h2>
                <p className="text-[13px] text-[#525252] mt-0.5">
                  Choose your login method
                </p>
              </div>

              {/* 3 Auth Tabs (Credential | Biometric | Caregiver) */}
              <div className="flex rounded-xl bg-slate-200/80 p-1 mb-5">
                <button
                  type="button"
                  onClick={() => setLoginTab("credential")}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                    loginTab === "credential"
                      ? "bg-white text-[#161616] shadow-xs"
                      : "text-[#525252] hover:text-[#161616]"
                  }`}
                >
                  Credential
                </button>
                <button
                  type="button"
                  onClick={() => setLoginTab("biometric")}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                    loginTab === "biometric"
                      ? "bg-white text-[#161616] shadow-xs"
                      : "text-[#525252] hover:text-[#161616]"
                  }`}
                >
                  Biometric
                </button>
                <button
                  type="button"
                  onClick={() => setLoginTab("caregiver")}
                  className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                    loginTab === "caregiver"
                      ? "bg-white text-[#161616] shadow-xs"
                      : "text-[#525252] hover:text-[#161616]"
                  }`}
                >
                  Caregiver
                </button>
              </div>

              {/* TAB A: Credential Mode */}
              {loginTab === "credential" && (
                <div className="space-y-3.5 animate-fade-in">
                  <div>
                    <label className="text-[12px] font-medium text-[#525252] block mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] placeholder:text-[#6F6F6F] focus:outline-hidden focus:border-[#0F62FE]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#525252] block mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] placeholder:text-[#6F6F6F] focus:outline-hidden focus:border-[#0F62FE]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#161616]"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-[#0F62FE] focus:ring-0"
                      />
                      <span className="text-[12px] text-[#525252]">
                        Remember me
                      </span>
                    </label>
                    <button
                      type="button"
                      className="text-[12px] font-medium text-[#0F62FE] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleLogin}
                      className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-bold shadow-md shadow-blue-500/25 active:scale-98 transition-all"
                    >
                      Login
                    </button>
                  </div>
                </div>
              )}

              {/* TAB B: Biometric Mode (Figma node 206:2535) */}
              {loginTab === "biometric" && (
                <div className="space-y-4 py-2 flex flex-col items-center text-center animate-fade-in">
                  <p className="text-[13px] text-[#525252]">
                    Confirm fingerprint to continue
                  </p>

                  <button
                    type="button"
                    onClick={handleSimulateBiometric}
                    className={`w-28 h-28 rounded-full bg-white border-2 flex items-center justify-center shadow-lg transition-all duration-300 relative ${
                      isScanningBiometric
                        ? "border-[#0F62FE] scale-105"
                        : "border-[#E0E0E0] hover:border-[#0F62FE]"
                    }`}
                  >
                    {isScanningBiometric && (
                      <span className="absolute inset-0 rounded-full border-4 border-[#0F62FE] animate-ping opacity-30" />
                    )}
                    <Fingerprint
                      className={`w-14 h-14 transition-colors ${
                        isScanningBiometric
                          ? "text-[#0F62FE]"
                          : "text-[#525252]"
                      }`}
                    />
                  </button>

                  <div>
                    <span
                      style={{ fontFamily }}
                      className="text-[14px] font-bold text-[#161616] block"
                    >
                      Touch Sensor Ready
                    </span>
                    <span className="text-[11px] text-[#6F6F6F]">
                      {isScanningBiometric
                        ? "Verifying biometrics..."
                        : "Touch the sensor or tap to verify"}
                    </span>
                  </div>

                  <div className="pt-2 w-full">
                    <button
                      type="button"
                      onClick={() => setLoginTab("credential")}
                      className="w-full py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[#525252] text-[13px] font-semibold hover:text-[#161616]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* TAB C: Caregiver Access / Verification (Figma node 222:13056) */}
              {loginTab === "caregiver" && (
                <div className="space-y-4 animate-fade-in">
                  {!isOtpSent ? (
                    <div className="text-center py-2 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0F62FE] flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <h4
                        style={{ fontFamily }}
                        className="text-[15px] font-bold text-[#161616]"
                      >
                        Authorized Caregiver Access
                      </h4>
                      <p className="text-[12px] text-[#525252] px-3 leading-relaxed">
                        A one-time 4-digit code will be dispatched to your
                        registered caregiver ({formData.caregiverName}).
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsOtpSent(true)}
                        className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-bold shadow-md shadow-blue-500/25 transition-all"
                      >
                        Generate Unique Code
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-[12px] text-[#525252]">
                          Your unique code was sent to {formData.caregiverName}
                        </p>
                      </div>

                      {/* 4-digit OTP Boxes */}
                      <div className="flex justify-center gap-3">
                        {otpDigits.map((d, i) => (
                          <input
                            key={i}
                            type="text"
                            maxLength={1}
                            value={d}
                            onChange={(e) => {
                              const newDigits = [...otpDigits]
                              newDigits[i] = e.target.value.slice(-1)
                              setOtpDigits(newDigits)
                            }}
                            className="w-12 h-14 rounded-xl bg-white border-2 border-[#0F62FE] text-[20px] font-bold text-center text-[#161616] shadow-xs focus:outline-hidden"
                          />
                        ))}
                      </div>

                      <div className="text-center text-[12px] text-[#6F6F6F]">
                        Resend code in:{" "}
                        <span className="font-semibold text-[#0F62FE]">
                          00:
                          {resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleLogin}
                        className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-bold shadow-md shadow-blue-500/25 transition-all"
                      >
                        Verify & Login
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer: Link to Register */}
            <div className="text-center py-4 border-t border-[#E0E0E0]">
              <span className="text-[12px] text-[#525252]">
                Don't have an account?{" "}
              </span>
              <button
                type="button"
                onClick={() => setScreen("register")}
                className="text-[12px] font-bold text-[#0F62FE] hover:underline"
              >
                Register
              </button>
            </div>
          </div>
        )}

        {/* ─── SCREEN 2: REGISTRATION (Figma node 1049:48629) ─────────────── */}
        {screen === "register" && (
          <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-center mt-1">
                <h2
                  style={{ fontFamily }}
                  className="text-[22px] font-bold text-[#161616] tracking-tight"
                >
                  Create Account
                </h2>
                <p className="text-[13px] text-[#525252] mt-0.5">
                  Begin your cognitive wellness journey
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] placeholder:text-[#6F6F6F] focus:outline-hidden focus:border-[#0F62FE]"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] placeholder:text-[#6F6F6F] focus:outline-hidden focus:border-[#0F62FE]"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={regAgreeTerms}
                    onChange={(e) => setRegAgreeTerms(e.target.checked)}
                    className="rounded text-[#0F62FE] mt-0.5"
                  />
                  <span className="text-[11px] text-[#525252] leading-snug">
                    I agree to the Alzheimer's Association Terms of Care, Data
                    Privacy and Clinical Screening Protocols.
                  </span>
                </label>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setScreen("setup1")}
                    className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-bold shadow-md shadow-blue-500/25 active:scale-98 transition-all"
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center py-4 border-t border-[#E0E0E0]">
              <span className="text-[12px] text-[#525252]">
                I already have an account,{" "}
              </span>
              <button
                type="button"
                onClick={() => setScreen("login")}
                className="text-[12px] font-bold text-[#0F62FE] hover:underline"
              >
                Login
              </button>
            </div>
          </div>
        )}

        {/* ─── SCREEN 3: ACCOUNT SETUP STEP 1 (Personal Details) ───────────── */}
        {screen === "setup1" && (
          <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setScreen("register")}
                  className="w-8 h-8 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-bold text-[#0F62FE] uppercase tracking-wider">
                  Step 1 of 4
                </span>
              </div>

              <div>
                <h2
                  style={{ fontFamily }}
                  className="text-[20px] font-bold text-[#161616]"
                >
                  Let's setup your account
                </h2>
                <p className="text-[12px] text-[#525252]">
                  A few steps ahead to go.
                </p>
                <span className="inline-block px-2.5 py-0.5 rounded bg-blue-50 text-[#0F62FE] text-[11px] font-bold mt-2">
                  Personal Details
                </span>
              </div>

              <div className="space-y-3 pt-1">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                  >
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                    />
                    <Calendar className="w-4 h-4 text-[#525252] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Progress Track: 25% */}
              <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                <div className="h-full bg-[#0F62FE] w-1/4 rounded-full" />
              </div>

              <p className="text-[11px] text-[#6F6F6F] text-center">
                From the house of{" "}
                <strong className="text-[#0F62FE]">
                  Alzheimer's Association
                </strong>
              </p>
            </div>

            <div className="py-4">
              <button
                type="button"
                onClick={() => setScreen("setup2")}
                className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-bold shadow-md shadow-blue-500/25 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ─── SCREEN 4: ACCOUNT SETUP STEP 2 (Contact Details) ────────────── */}
        {screen === "setup2" && (
          <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setScreen("setup1")}
                  className="w-8 h-8 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-bold text-[#0F62FE] uppercase tracking-wider">
                  Step 2 of 4
                </span>
              </div>

              <div>
                <h2
                  style={{ fontFamily }}
                  className="text-[20px] font-bold text-[#161616]"
                >
                  Contact Details
                </h2>
                <p className="text-[12px] text-[#525252]">
                  How your care team can reach you.
                </p>
              </div>

              <div className="space-y-3 pt-1">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Enter your phone number"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="e.g. Kolkata, West Bengal"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                  />
                </div>
              </div>

              {/* Progress Track: 50% */}
              <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                <div className="h-full bg-[#0F62FE] w-2/4 rounded-full" />
              </div>
            </div>

            <div className="py-4">
              <button
                type="button"
                onClick={() => setScreen("setup3")}
                className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-bold shadow-md shadow-blue-500/25 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ─── SCREEN 5: ACCOUNT SETUP STEP 3 (Medical History) ────────────── */}
        {screen === "setup3" && (
          <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setScreen("setup2")}
                  className="w-8 h-8 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-bold text-[#0F62FE] uppercase tracking-wider">
                  Step 3 of 4
                </span>
              </div>

              <div>
                <h2
                  style={{ fontFamily }}
                  className="text-[20px] font-bold text-[#161616]"
                >
                  Medical History
                </h2>
                <p className="text-[12px] text-[#525252]">
                  Helps calibrate AI screening biomarkers.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Diagnosis
                  </label>
                  <select
                    value={formData.diagnosis}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnosis: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                  >
                    <option value="Early-stage Alzheimer's">
                      Early-stage Alzheimer's
                    </option>
                    <option value="Mild Cognitive Impairment">
                      Mild Cognitive Impairment (MCI)
                    </option>
                    <option value="Vascular Dementia">Vascular Dementia</option>
                    <option value="None / Healthy Screening">
                      None / Baseline Voice Screening
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                  >
                    <option value="Stage 1 Mild Cognitive Impairment">
                      Stage 1 Mild Cognitive Impairment
                    </option>
                    <option value="Stage 2 Moderate Memory Decline">
                      Stage 2 Moderate Memory Decline
                    </option>
                    <option value="Stage 3 Advanced Care Needed">
                      Stage 3 Advanced Care Needed
                    </option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl border border-dashed border-[#0F62FE] bg-blue-50/40 text-center">
                  <Upload className="w-5 h-5 text-[#0F62FE] mx-auto mb-1" />
                  <span className="text-[12px] font-semibold text-[#0F62FE] block">
                    Upload Medical Reports (Optional)
                  </span>
                  <span className="text-[10px] text-[#525252]">
                    Max file size 5MB. Supports .pdf and .jpg
                  </span>
                </div>
              </div>

              {/* Progress Track: 75% */}
              <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                <div className="h-full bg-[#0F62FE] w-3/4 rounded-full" />
              </div>
            </div>

            <div className="py-4">
              <button
                type="button"
                onClick={() => setScreen("setup4")}
                className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-bold shadow-md shadow-blue-500/25 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ─── SCREEN 6: ACCOUNT SETUP STEP 4 (Caregiver Info) ────────────── */}
        {screen === "setup4" && (
          <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setScreen("setup3")}
                  className="w-8 h-8 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-bold text-[#0F62FE] uppercase tracking-wider">
                  Step 4 of 4
                </span>
              </div>

              <div>
                <h2
                  style={{ fontFamily }}
                  className="text-[20px] font-bold text-[#161616]"
                >
                  Primary Caregiver
                </h2>
                <p className="text-[12px] text-[#525252]">
                  Emergency contact and supervised care manager.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Caregiver Name
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Caregiver Email
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#525252] block mb-1">
                    Caregiver Phone
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
                    placeholder="Enter phone number"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E0E0E0] text-[13px] text-[#161616] focus:outline-hidden focus:border-[#0F62FE]"
                  />
                </div>
              </div>

              {/* Progress Track: 100% */}
              <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                <div className="h-full bg-[#198038] w-full rounded-full" />
              </div>
            </div>

            <div className="py-4">
              <button
                type="button"
                onClick={handleCompleteSetup}
                className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[13px] font-bold shadow-md shadow-blue-500/25 transition-all"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {/* ─── SCREEN 7: SUCCESSFUL MSG (Figma node 222:13264) ───────────── */}
        {screen === "success" && (
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center justify-between text-center animate-fade-in">
            <div className="w-full">
              <h2
                style={{ fontFamily }}
                className="text-[22px] font-bold text-[#161616] tracking-tight mt-2"
              >
                Good to go!
              </h2>

              {/* Happy Earth Illustration */}
              <div className="my-8 relative w-48 h-48 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-400 p-1 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                  <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center p-3">
                    <Globe className="w-16 h-16 text-emerald-500" />
                    <div className="flex items-center gap-1 mt-1 text-rose-500 animate-bounce">
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </div>
                  </div>
                </div>
              </div>

              <h3
                style={{ fontFamily }}
                className="text-[18px] font-bold text-[#161616]"
              >
                All done!
              </h3>
              <p className="text-[13px] text-[#525252] mt-1 px-4 leading-relaxed">
                Let's start our wonderful journey with alOis memory aid and
                SwarSanket voice screening.
              </p>
            </div>

            <div className="w-full space-y-4">
              {/* Green Progress Checkmark */}
              <div className="flex items-center justify-center gap-2 text-[#198038] text-[12px] font-bold">
                <CheckCircle2 className="w-4 h-4 fill-[#198038] text-white" />
                <span>Account Activated</span>
              </div>

              <button
                type="button"
                onClick={handleLogin}
                className="w-full py-3 rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white text-[14px] font-bold shadow-md shadow-blue-500/25 active:scale-98 transition-all"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* iOS Home Indicator Bar */}
        <div className="h-6 flex items-center justify-center shrink-0">
          <div className="w-32 h-1 bg-slate-400/60 rounded-full" />
        </div>
      </div>
    </div>
  )
}
