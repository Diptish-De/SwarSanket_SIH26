import React, { useState, useEffect, useRef, useCallback } from "react"

import {
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ShieldCheck,
  Lock,
  Globe,
  Users,
  User,
  Home as HomeIcon,
  History as HistoryIcon,
  HelpCircle,
  Phone,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Download,
  Share2,
  FileText,
  Wifi,
  WifiOff,
  RefreshCw,
  Sliders,
  Calendar,
  Activity,
  Sparkles,
  Plus,
  Trash2,
  X,
  Maximize2,
  Minimize2,
  Smartphone,
  Stethoscope,
  Video,
  MessageSquare,
  Server,
  Bell,
  Edit3,
} from "lucide-react"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import {
  Screen,
  RecordingContext,
  LanguageCode,
  ScreeningRisk,
  ConfidenceLevel,
  VoiceQualityGrade,
  ScreeningSession,
  AudioTaskRecord,
  OfflineSyncItem,
} from "./types"

// TEMPORARY DEMO OVERRIDE - remove with: git apply -R demo-override.patch

import {
  consumeDemoOutcome,
  applyDemoOverride,
  outcomeFromClick,
  setDemoOutcome,
} from "./services/demoOverride"

import { loadSession, saveSession, clearSession } from "./services/sessionState"

import {
  getDB,
  saveScreeningSession,
  getAllScreenings,
  getOfflineQueue,
  markQueueItemSynced,
  seedInitialDemoData,
  addDoctorNote,
  getDoctorNotes,
  clearAllScreenings,
  deleteScreeningSession,
} from "./services/db"

import {
  VoiceRecorder,
  AudioRecordingResult,
  getLastRecordedAudioBlob,
  uploadAudioToBackend,
  analyzeAudioWithBackend,
  ScreeningApiResponse,
} from "./services/audioRecorder"

import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  checkBackendHealth,
  API_PRESETS,
  BackendHealthStatus,
  isCapacitorAndroid,
} from "./services/apiConfig"

import { speakText, stopSpeech, isSpeaking } from "./services/tts"

import { generateAndDownloadReport } from "./services/report"

import {
  ApkDownloadModal,
  APK_DOWNLOAD_URL,
  GITHUB_RELEASES_URL,
} from "./components/ApkDownloadModal"

import DemoAuth, { readDemoUser } from "./components/DemoAuth"

import VoiceProcessingVisualizer from "./components/VoiceProcessingVisualizer"

// ─── Design Tokens & Theme (Aligned with Official Logo Palette) ───────────────

const C = {
  primary: "#02738a",

  primaryDark: "#015364",

  primaryDeep: "#013a46",

  primaryLight: "#e4f4f7",

  warmGlow: "#fdfaf2",

  skyGlow: "#e8f5f8",

  bg: "#f3f9fb",

  surface: "#ffffff",

  text: "#0c1e27",

  textSub: "#30434f",

  muted: "#5e7380",

  border: "#d7eaef",

  borderHover: "#bce3eb",

  success: "#15803d",

  successBg: "#dcfce7",

  warning: "#c2410c",

  warningBg: "#fff7ed",

  amber: "#b45309",

  amberBg: "#fefce8",

  danger: "#dc2626",
}

const F = {
  display: "'Outfit', system-ui, sans-serif",

  body: "'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Bengali', 'Noto Sans Gujarati', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Noto Sans Tamil', 'Noto Sans Telugu', system-ui, sans-serif",
}

const formatBiomarkerName = (feature: string): string => {
  const map: Record<string, string> = {
    "CTP_F0 SD(st)": "Pitch Variation (F0 SD)",

    "CTP_DPI(ms)": "Pause Duration (DPI)",

    "CTP_RST(-/s)": "Phonation Rate (syll/s)",

    CTP_EST: "Speech Timing (EST)",

    "CTP_Voiced Rate(1/s)": "Voiced Speech Rate (words/s)",

    "CTP_Hesitation Ratio": "Hesitation Ratio",

    "CTP_Energy Mean(Pa^2·s)": "Acoustic Energy Mean",

    CTP_verb_num: "Verb Count",

    CTP_noun_ratio: "Noun Ratio",

    CTP_Pronouns_ratio: "Pronoun Ratio",

    "CTP_noun to verb": "Noun-to-Verb Ratio",

    "CTP_Word Rate(-/s)": "Word Rate (words/s)",

    "CTP_Noun No Phrase Rate": "Noun Non-Phrase Rate",

    "CTP_Verb phrase type proportion": "Verb Phrase Proportion",

    "CTP_Prep phrase type proportion": "Prepositional Density",

    "CTP_Prep average phrase type length 1": "Prepositional Length",

    CTP_num_unique_IU: "Unique Info Units",

    CTP_num_unique_keywords: "Unique Keywords",

    CTP_unique_IU_densitys: "Information Unit Density",

    CTP_total_IU_density: "Total Information Density",

    CTP_keyword_to_non_keyword_ratio: "Keyword-to-Filler Ratio",

    CTP_unique_IU_efficiency: "Information Efficiency",
  }

  return (
    map[feature] ||
    feature

      .replace(/^CTP_/, "")

      .replace(/_/g, " ")

      .replace(/\(st\)/, "")
  )
}

// ─── Languages & Translations ─────────────────────────────────────────────────

const LANGUAGES = [
  { code: "hi" as LanguageCode, native: "हिन्दी", name: "Hindi" },

  { code: "bn" as LanguageCode, native: "বাংলা", name: "Bengali" },

  { code: "mr" as LanguageCode, native: "मराठी", name: "Marathi" },

  { code: "ta" as LanguageCode, native: "தமிழ்", name: "Tamil" },

  { code: "te" as LanguageCode, native: "తెలుగు", name: "Telugu" },

  { code: "en" as LanguageCode, native: "English", name: "English" },

  { code: "gu" as LanguageCode, native: "ગુજરાતી", name: "Gujarati" },

  { code: "kn" as LanguageCode, native: "ಕನ್ನಡ", name: "Kannada" },

  { code: "ml" as LanguageCode, native: "മലയാളം", name: "Malayalam" },
]

const TX: Record<string, Record<string, string>> = {
  en: {
    greeting: "Hello",

    howFeeling: "How are you feeling today?",

    voiceCheckCard: "Voice Check",

    voiceCheckDesc:
      "Take a short 3–5 minute screening. Speak naturally — there are no right or wrong answers.",

    start: "START",

    previousCheck: "Previous Check",

    viewDetailsLabel: "View Report",

    readyWhen: "Daily Screening",

    lastCheck: "Last check",

    completed: "Completed",

    history: "History",

    help: "Help",

    caregiver: "Caregiver",

    welcomeSub: "Let's do a short Voice Check.",

    welcomeTime: "This takes about 3–5 minutes.",

    startVoiceCheck: "Start Voice Check",

    someoneHelping: "Someone is helping me",

    letsBegin: "Let's begin",

    voiceIntroSub: "This is a short voice check. It takes about 3–5 minutes.",

    step1: "Listen",

    step2: "Speak",

    step3: "Finish",

    beginVoiceCheck: "Begin Voice Check",

    listenToQuestion: "Listen to the question",

    playAgain: "Play Again",

    startSpeaking: "Start Speaking",

    tapToSpeak: "Tap to speak",

    speakNaturally: "Speak naturally…",

    finishRecording: "Finish Recording",

    pause: "Pause",

    resume: "Resume",

    recordingReady: "Your recording is ready",

    listenBefore: "Listen before you continue",

    play: "Play",

    recordAgain: "Record Again",

    continue: "Continue",

    whatDoYouSee: "What do you see?",

    clinicalProtocolTag: "Picture Description Task",

    describeSceneHint: "Take your time and describe as much as you notice.",

    pictureDescSub: "Tell us what you see in the picture.",

    listenCarefully: "Listen carefully",

    memorySub: "We will read some words. Try to remember them.",

    iHeardWords: "I heard the words — continue",

    whatRemember: "What do you remember?",

    rememberSub: "Tell us the words you remember.",

    listenAgain: "Listen Again",

    oneMore: "One more",

    conversationPrompt: "Tell us about something you enjoy doing.",

    conversationSub: "There are no right or wrong answers.",

    youreDone: "You're done!",

    completionSub: "Thank you. We're checking your voice now.",

    analyzingVoice: "Analyzing your voice…",

    thisMayTake: "This may take a moment.",

    voiceCheckComplete: "Your Voice Check is complete",

    noConcern: "No immediate concern detected",

    noConcernSub:
      "This screening did not identify patterns that require immediate follow-up. Continue regular health check-ups.",

    done: "Done",

    viewHistory: "View History",

    furtherEval: "Further evaluation recommended",

    furtherEvalSub:
      "The screening found some patterns that may benefit from professional assessment.",

    talkToPro: "Talk to a Healthcare Professional",

    viewDetails: "View Screening Details",

    disclaimer: "This screening does not replace a medical diagnosis.",

    needClearer: "We need a clearer recording",

    unclearSub: "We couldn't confidently analyze this recording.",

    tryAgain: "Try Again",

    highConfidence: "High confidence",

    home: "Home",

    profile: "Profile",

    vqGoodTitle: "Recording looks good",

    vqGoodSub: "Ready to continue.",

    vqPoorTitle: "We couldn't hear you clearly",

    vqPoorSub: "Please speak a little closer to the phone.",

    vqLowTitle: "We couldn't detect enough speech",

    vqLowSub: "Please try recording again.",

    continueAnyway: "Continue Anyway",

    notifyCaregiver: "Would you like to notify your caregiver?",

    notifySub: "They can help you get further support.",

    notifyBtn: "Notify Caregiver",

    notNow: "Not Now",

    healthcarePros: "Healthcare Professionals",

    referralSub: "Talk to a professional about your screening result.",

    startConsultation: "Start Consultation",

    neurologist: "Neurologist",

    generalPhysician: "General Physician",

    healthWorkerRole: "Health Worker",

    available: "Available",

    videoConsult: "Start Video Consultation",

    audioConsult: "Audio Consultation",

    shareScreening: "Share Screening",

    syncTitle: "Sync Status",

    waitingToSync: "Waiting to sync",

    syncComplete: "Sync complete",

    syncUploaded: "screenings uploaded",

    syncNow: "Sync Now",

    reminderTitle: "Your next Voice Check",

    reminderSub: "Regular screening helps track changes over time.",

    remindLater: "Remind Me Later",

    leaveTitle: "Leave Voice Check?",

    leaveSub: "You can continue later from where you left off.",

    continueCheck: "Continue Check",

    exit: "Exit",

    howCanWeHelp: "How can we help?",

    helpListen: "Listen to instructions",

    helpListenDesc: "Hear instructions in your language",

    helpAssist: "Get assistance",

    helpAssistDesc: "Get help from a family member",

    helpLang: "Change language",

    helpLangDesc: "Switch to a different language",

    helpContact: "Contact support",

    helpContactDesc: "Speak with our support team",

    helpHow: "How Voice Check works",

    helpHowDesc: "Learn about the screening",

    helpOffline: "What if I don't have internet?",

    helpOfflineDesc:
      "You can still record. Your data syncs when you reconnect.",

    micDeniedTitle: "Microphone access is needed",

    micDeniedSub:
      "To record your voice, please allow microphone access in your browser or phone settings.",

    allowMic: "Allow Microphone",

    noScreeningsTitle: "No Voice Checks yet",

    noScreeningsSub: "No worries. Your first check takes about 3–5 minutes.",
  },

  hi: {
    greeting: "नमस्ते",

    howFeeling: "आज आप कैसा महसूस कर रहे हैं?",

    voiceCheckCard: "Voice Check",

    voiceCheckDesc:
      "3–5 मिनट की छोटी जांच करें। स्वाभाविक रूप से बोलें — कोई सही या गलत जवाब नहीं है।",

    start: "शुरू करें",

    previousCheck: "पिछली जांच",

    lastCheck: "अंतिम जांच",

    completed: "पूरी हुई",

    history: "इतिहास",

    help: "मदद",

    caregiver: "देखभाल",

    welcomeSub: "चलिये एक छोटा Voice Check करते हैं।",

    welcomeTime: "इसमें लगभग 3–5 मिनट लगेंगे।",

    startVoiceCheck: "Voice Check शुरू करें",

    someoneHelping: "कोई मेरी मदद कर रहा है",

    letsBegin: "चलिये शुरू करते हैं",

    voiceIntroSub: "यह एक छोटी Voice Check है। इसमें लगभग 3–5 मिनट लगेंगे।",

    step1: "सुनें",

    step2: "बोलें",

    step3: "पूरा करें",

    beginVoiceCheck: "Voice Check शुरू करें",

    listenToQuestion: "सवाल सुनें",

    playAgain: "फिर से सुनें",

    startSpeaking: "बोलना शुरू करें",

    tapToSpeak: "बोलने के लिए टैप करें",

    speakNaturally: "स्वाभाविक रूप से बोलें…",

    finishRecording: "रिकॉर्डिंग समाप्त करें",

    pause: "रोकें",

    resume: "जारी रखें",

    recordingReady: "आपकी रिकॉर्डिंग तैयार है",

    listenBefore: "जारी रखने से पहले सुनें",

    play: "सुनें",

    recordAgain: "फिर से रिकॉर्ड करें",

    continue: "आगे बढ़ें",

    whatDoYouSee: "आप क्या देख रहे हैं?",

    clinicalProtocolTag: "चित्र वर्णन कार्य",

    describeSceneHint: "आराम से बताइए, जो कुछ भी आपको दिखे।",

    pictureDescSub: "तस्वीर में जो दिखे वो बताइए।",

    listenCarefully: "ध्यान से सुनें",

    memorySub: "हम कुछ शब्द पढ़ेंगे। उन्हें याद करने की कोशिश करें।",

    iHeardWords: "मैंने शब्द सुने — आगे बढ़ें",

    whatRemember: "आपको क्या याद है?",

    rememberSub: "जो शब्द याद हों वो बताइए।",

    listenAgain: "फिर से सुनें",

    oneMore: "एक और",

    conversationPrompt: "हमें बताइए कि आपको क्या करना पसंद है।",

    conversationSub: "कोई सही या गलत जवाब नहीं है।",

    youreDone: "आपका काम हो गया!",

    completionSub: "धन्यवाद। हम अभी आपकी आवाज़ जांच रहे हैं।",

    analyzingVoice: "आपकी आवाज़ का विश्लेषण हो रहा है…",

    thisMayTake: "इसमें थोड़ा समय लग सकता है।",

    voiceCheckComplete: "आपकी Voice Check पूरी हुई",

    noConcern: "कोई तत्काल चिंता नहीं",

    noConcernSub:
      "इस जांच में कोई ऐसे संकेत नहीं मिले जिन पर तुरंत ध्यान देने की जरूरत हो। नियमित स्वास्थ्य जांच जारी रखें।",

    done: "हो गया",

    viewHistory: "इतिहास देखें",

    furtherEval: "आगे की जांच की सलाह",

    furtherEvalSub: "जांच में कुछ ऐसे संकेत मिले जिन्हें पेशेवर मूल्यांकन से फायदा हो सकता है।",

    talkToPro: "स्वास्थ्य विशेषज्ञ से बात करें",

    viewDetails: "जांच विवरण देखें",

    disclaimer: "यह जांच किसी चिकित्सकीय निदान का विकल्प नहीं है।",

    needClearer: "हमें एक स्पष्ट रिकॉर्डिंग चाहिए",

    unclearSub: "हम इस रिकॉर्डिंग का विश्वास से विश्लेषण नहीं कर पाए।",

    tryAgain: "फिर से कोशिश करें",

    highConfidence: "उच्च विश्वसनीयता",

    home: "होम",

    profile: "प्रोफ़ाइल",

    vqGoodTitle: "रिकॉर्डिंग अच्छी है",

    vqGoodSub: "जारी रखने के लिए तैयार।",

    vqPoorTitle: "हम आपको स्पष्ट नहीं सुन पाए",

    vqPoorSub: "कृपया फोन के थोड़ा नजदीक बोलें।",

    vqLowTitle: "हम पर्याप्त बोली नहीं सुन पाए",

    vqLowSub: "कृपया फिर से रिकॉर्ड करें।",

    continueAnyway: "फिर भी जारी रखें",

    notifyCaregiver: "क्या आप अपने देखभालकर्ता को सूचित करना चाहेंगे?",

    notifySub: "वे आगे की सहायता में मदद कर सकते हैं।",

    notifyBtn: "देखभालकर्ता को सूचित करें",

    notNow: "अभी नहीं",

    healthcarePros: "स्वास्थ्य विशेषज्ञ",

    referralSub: "अपने परिणाम के बारे में किसी विशेषज्ञ से बात करें।",

    startConsultation: "परामर्श शुरू करें",

    neurologist: "न्यूरोलॉजिस्ट",

    generalPhysician: "सामान्य चिकित्सक",

    healthWorkerRole: "स्वास्थ्य कार्यकर्ता",

    available: "उपलब्ध",

    videoConsult: "वीडियो परामर्श शुरू करें",

    audioConsult: "ऑडियो परामर्श",

    shareScreening: "जांच साझा करें",

    syncTitle: "सिंक स्थिति",

    waitingToSync: "सिंक होने की प्रतीक्षा",

    syncComplete: "सिंक पूरा",

    syncUploaded: "जांचें अपलोड हुईं",

    syncNow: "अभी सिंक करें",

    reminderTitle: "आपकी अगली Voice Check",

    reminderSub: "नियमित जांच समय के साथ बदलाव को ट्रैक करने में मदद करती है।",

    remindLater: "बाद में याद दिलाएं",

    leaveTitle: "Voice Check छोड़ें?",

    leaveSub: "आप बाद में वहीं से जारी रख सकते हैं जहाँ आपने छोड़ा था।",

    continueCheck: "जांच जारी रखें",

    exit: "बाहर जाएं",

    howCanWeHelp: "हम कैसे मदद कर सकते हैं?",

    helpListen: "निर्देश सुनें",

    helpListenDesc: "अपनी भाषा में निर्देश सुनें",

    helpAssist: "सहायता प्राप्त करें",

    helpAssistDesc: "परिवार के किसी सदस्य से मदद लें",

    helpLang: "भाषा बदलें",

    helpLangDesc: "दूसरी भाषा चुनें",

    helpContact: "सहायता से संपर्क करें",

    helpContactDesc: "हमारी सहायता टीम से बात करें",

    helpHow: "Voice Check कैसे काम करती है",

    helpHowDesc: "जांच के बारे में जानें",

    helpOffline: "अगर इंटरनेट नहीं है तो क्या होगा?",

    helpOfflineDesc:
      "आप फिर भी रिकॉर्ड कर सकते हैं। इंटरनेट मिलने पर डेटा सिंक हो जाता है।",

    micDeniedTitle: "माइक्रोफोन की अनुमति चाहिए",

    micDeniedSub: "आवाज़ रिकॉर्ड करने के लिए कृपया फोन सेटिंग में माइक्रोफोन की अनुमति दें।",

    allowMic: "माइक्रोफोन की अनुमति दें",

    noScreeningsTitle: "अभी तक कोई Voice Check नहीं",

    noScreeningsSub: "कोई बात नहीं। पहली जांच में लगभग 3–5 मिनट लगते हैं।",
  },

  bn: {
    greeting: "নমস্কার",

    howFeeling: "আজ আপনি কেমন আছেন?",

    voiceCheckCard: "Voice Check",

    voiceCheckDesc:
      "৩–৫ মিনিটের একটি ছোট পরীক্ষা করুন। স্বাভাবিকভাবে কথা বলুন — কোনো সঠিক বা ভুল উত্তর নেই।",

    start: "শুরু করুন",

    previousCheck: "আগের পরীক্ষা",

    lastCheck: "শেষ পরীক্ষা",

    completed: "সম্পন্ন",

    history: "ইতিহাস",

    help: "সাহায্য",

    caregiver: "সেবাদাতা",

    welcomeSub: "আসুন একটি ছোট Voice Check করি।",

    welcomeTime: "এটি প্রায় ৩–৫ মিনিট সময় নেবে।",

    startVoiceCheck: "Voice Check শুরু করুন",

    someoneHelping: "কেউ আমাকে সাহায্য করছে",

    letsBegin: "শুরু করা যাক",

    voiceIntroSub: "এটি একটি ছোট Voice Check। প্রায় ৩–৫ মিনিট সময় লাগবে।",

    step1: "শুনুন",

    step2: "বলুন",

    step3: "শেষ করুন",

    beginVoiceCheck: "Voice Check শুরু করুন",

    listenToQuestion: "প্রশ্নটি শুনুন",

    playAgain: "আবার শুনুন",

    startSpeaking: "কথা বলুন",

    tapToSpeak: "কথা বলতে ট্যাপ করুন",

    speakNaturally: "স্বাভাবিকভাবে কথা বলুন…",

    finishRecording: "রেকর্ডিং শেষ করুন",

    pause: "থামুন",

    resume: "আবার শুরু করুন",

    recordingReady: "আপনার রেকর্ডিং প্রস্তুত",

    listenBefore: "চালিয়ে যাওয়ার আগে শুনুন",

    play: "শুনুন",

    recordAgain: "আবার রেকর্ড করুন",

    continue: "চালিয়ে যান",

    whatDoYouSee: "আপনি কী দেখছেন?",

    clinicalProtocolTag: "ছবি বর্ণনার কাজ",

    describeSceneHint: "সময় নিন, যা যা চোখে পড়ে সবই বলুন।",

    pictureDescSub: "ছবিতে যা দেখছেন তা বলুন।",

    listenCarefully: "মনোযোগ দিয়ে শুনুন",

    memorySub: "আমরা কিছু শব্দ পড়ব। সেগুলো মনে রাখার চেষ্টা করুন।",

    iHeardWords: "আমি শব্দগুলো শুনেছি — এগিয়ে যান",

    whatRemember: "আপনার কী মনে আছে?",

    rememberSub: "যে শব্দগুলো মনে আছে বলুন।",

    listenAgain: "আবার শুনুন",

    oneMore: "আরও একটি",

    conversationPrompt: "আপনি কী করতে পছন্দ করেন তা বলুন।",

    conversationSub: "কোনো সঠিক বা ভুল উত্তর নেই।",

    youreDone: "আপনি শেষ করেছেন!",

    completionSub: "ধন্যবাদ। আমরা এখন আপনার ভয়েস পরীক্ষা করছি।",

    analyzingVoice: "আপনার ভয়েস বিশ্লেষণ করা হচ্ছে…",

    thisMayTake: "এটি একটু সময় নিতে পারে।",

    voiceCheckComplete: "আপনার Voice Check সম্পন্ন হয়েছে",

    noConcern: "কোনো তাৎক্ষণিক উদ্বেগ নেই",

    noConcernSub:
      "এই পরীক্ষায় এমন কোনো নিদর্শন পাওয়া যায়নি যার জন্য তাৎক্ষণিক ফলো-আপ প্রয়োজন।",

    done: "সম্পন্ন",

    viewHistory: "ইতিহাস দেখুন",

    furtherEval: "আরও মূল্যায়নের পরামর্শ",

    furtherEvalSub:
      "পরীক্ষায় কিছু নিদর্শন পাওয়া গেছে যার পেশাদার মূল্যায়ন থেকে উপকার হতে পারে।",

    talkToPro: "একজন স্বাস্থ্যসেবা পেশাদারের সাথে কথা বলুন",

    viewDetails: "পরীক্ষার বিবরণ দেখুন",

    disclaimer: "এই পরীক্ষা চিকিৎসা নির্ণয়ের বিকল্প নয়।",

    needClearer: "আমাদের আরও স্পষ্ট রেকর্ডিং দরকার",

    unclearSub: "আমরা এই রেকর্ডিং আত্মবিশ্বাসের সাথে বিশ্লেষণ করতে পারিনি।",

    tryAgain: "আবার চেষ্টা করুন",

    highConfidence: "উচ্চ আস্থা",

    home: "হোম",

    profile: "প্রোফাইল",

    howCanWeHelp: "আমরা কীভাবে সাহায্য করতে পারি?",

    helpListen: "নির্দেশনা শুনুন",

    helpListenDesc: "আপনার ভাষায় নির্দেশনা শুনুন",

    helpAssist: "সহায়তা পান",

    helpAssistDesc: "পরিবারের কারো সাহায্য নিন",

    helpLang: "ভাষা পরিবর্তন করুন",

    helpLangDesc: "অন্য ভাষায় পরিবর্তন করুন",

    helpContact: "সহায়তায় যোগাযোগ করুন",

    helpContactDesc: "আমাদের সহায়তা দলের সাথে কথা বলুন",

    helpHow: "Voice Check কীভাবে কাজ করে",

    helpHowDesc: "স্ক্রীনিং সম্পর্কে জানুন",
  },
}

const INDIC_TX: Record<string, Record<string, string>> = {
  hi: {
    voiceCheckCard: "आवाज़ की जांच",

    voiceCheckDesc:
      "3–5 मिनट की छोटी जांच करें। सहज रूप से बोलें—यहां सही या गलत उत्तर नहीं हैं।",

    welcomeSub: "आइए, आवाज़ की एक छोटी जांच करते हैं।",

    startVoiceCheck: "आवाज़ की जांच शुरू करें",

    letsBegin: "आइए शुरू करें",

    voiceIntroSub: "यह एक छोटी आवाज़ जांच है। इसमें लगभग 3–5 मिनट लगेंगे।",

    step1: "सुनें",

    step2: "बोलें",

    step3: "पूरा करें",

    beginVoiceCheck: "आवाज़ की जांच शुरू करें",

    listenToQuestion: "प्रश्न सुनें",

    playAgain: "दोबारा सुनें",

    startSpeaking: "बोलना शुरू करें",

    tapToSpeak: "बोलने के लिए टैप करें",

    speakNaturally: "स्वाभाविक रूप से बोलें…",

    finishRecording: "रिकॉर्डिंग पूरी करें",

    recordingReady: "आपकी रिकॉर्डिंग तैयार है",

    listenBefore: "आगे बढ़ने से पहले सुनें",

    recordAgain: "दोबारा रिकॉर्ड करें",

    continue: "आगे बढ़ें",

    whatDoYouSee: "आपको क्या दिखाई दे रहा है?",

    clinicalProtocolTag: "चित्र वर्णन कार्य",

    describeSceneHint: "आराम से बताइए, जो कुछ भी आपको दिखे।",

    pictureDescSub: "चित्र में जो दिखाई दे रहा है, उसके बारे में बताइए।",

    listenCarefully: "ध्यान से सुनें",

    memorySub: "हम कुछ शब्द पढ़ेंगे। उन्हें याद रखने की कोशिश करें।",

    iHeardWords: "मैंने शब्द सुन लिए हैं—आगे बढ़ें",

    oneMore: "एक और सवाल",

    conversationSub: "यहां कोई सही या गलत उत्तर नहीं है।",

    youreDone: "आपने पूरा कर लिया!",

    completionSub: "धन्यवाद। अब हम आपकी आवाज़ की जांच कर रहे हैं।",

    home: "होम",

    history: "पिछली जांचें",

    help: "मदद",

    caregiver: "देखभालकर्ता",

    profile: "प्रोफ़ाइल",
  },

  bn: {
    greeting: "নমস্কার",

    howFeeling: "আজ আপনি কেমন আছেন?",

    voiceCheckCard: "ভয়েস পরীক্ষা",

    voiceCheckDesc:
      "৩–৫ মিনিটের একটি ছোট পরীক্ষা করুন। স্বাভাবিকভাবে কথা বলুন—এখানে ঠিক বা ভুল উত্তর নেই।",

    welcomeSub: "চলুন একটি ছোট ভয়েস পরীক্ষা করি।",

    welcomeTime: "এতে প্রায় ৩–৫ মিনিট সময় লাগবে।",

    startVoiceCheck: "ভয়েস পরীক্ষা শুরু করুন",

    someoneHelping: "কেউ আমাকে সাহায্য করছেন",

    letsBegin: "চলুন শুরু করি",

    voiceIntroSub: "এটি একটি ছোট ভয়েস পরীক্ষা। এতে প্রায় ৩–৫ মিনিট সময় লাগবে।",

    step1: "শুনুন",

    step2: "বলুন",

    step3: "শেষ করুন",

    beginVoiceCheck: "ভয়েস পরীক্ষা শুরু করুন",

    listenToQuestion: "প্রশ্নটি শুনুন",

    playAgain: "আবার শুনুন",

    startSpeaking: "কথা বলা শুরু করুন",

    tapToSpeak: "কথা বলতে ট্যাপ করুন",

    speakNaturally: "স্বাভাবিকভাবে কথা বলুন…",

    finishRecording: "রেকর্ডিং শেষ করুন",

    recordingReady: "আপনার রেকর্ডিং প্রস্তুত",

    listenBefore: "এগিয়ে যাওয়ার আগে শুনুন",

    recordAgain: "আবার রেকর্ড করুন",

    continue: "এগিয়ে যান",

    whatDoYouSee: "আপনি কী দেখতে পাচ্ছেন?",

    clinicalProtocolTag: "ছবি বর্ণনার কাজ",

    describeSceneHint: "সময় নিন, যা যা চোখে পড়ে সবই বলুন।",

    pictureDescSub: "ছবিতে যা দেখতে পাচ্ছেন, সে সম্পর্কে বলুন।",

    listenCarefully: "মন দিয়ে শুনুন",

    memorySub: "আমরা কয়েকটি শব্দ পড়ব। সেগুলো মনে রাখার চেষ্টা করুন।",

    iHeardWords: "শব্দগুলো শুনেছি—এগিয়ে যান",

    oneMore: "আরও একটি প্রশ্ন",

    conversationSub: "এখানে ঠিক বা ভুল উত্তর নেই।",

    youreDone: "আপনার কাজ শেষ!",

    completionSub: "ধন্যবাদ। এখন আমরা আপনার কণ্ঠস্বর পরীক্ষা করছি।",

    home: "হোম",

    history: "আগের পরীক্ষাগুলি",

    help: "সহায়তা",

    caregiver: "পরিচর্যাকারী",

    profile: "প্রোফাইল",
  },

  mr: {
    greeting: "नमस्कार",

    howFeeling: "आज तुम्हाला कसे वाटत आहे?",

    voiceCheckCard: "आवाजाची तपासणी",

    voiceCheckDesc:
      "3–5 मिनिटांची छोटी तपासणी करा. सहजपणे बोला—यात बरोबर किंवा चूक उत्तर नाही.",

    welcomeSub: "चला, आवाजाची एक छोटी तपासणी करूया.",

    welcomeTime: "यासाठी सुमारे 3–5 मिनिटे लागतील.",

    startVoiceCheck: "आवाजाची तपासणी सुरू करा",

    someoneHelping: "कोणी तरी मला मदत करत आहे",

    letsBegin: "चला सुरू करूया",

    voiceIntroSub:
      "ही आवाजाची एक छोटी तपासणी आहे. यासाठी सुमारे 3–5 मिनिटे लागतील.",

    step1: "ऐका",

    step2: "बोला",

    step3: "पूर्ण करा",

    beginVoiceCheck: "आवाजाची तपासणी सुरू करा",

    listenToQuestion: "प्रश्न ऐका",

    playAgain: "पुन्हा ऐका",

    startSpeaking: "बोलायला सुरुवात करा",

    tapToSpeak: "बोलण्यासाठी टॅप करा",

    speakNaturally: "सहजपणे बोला…",

    finishRecording: "रेकॉर्डिंग पूर्ण करा",

    recordingReady: "तुमचे रेकॉर्डिंग तयार आहे",

    listenBefore: "पुढे जाण्यापूर्वी ऐका",

    recordAgain: "पुन्हा रेकॉर्ड करा",

    continue: "पुढे चला",

    whatDoYouSee: "तुम्हाला काय दिसत आहे?",

    clinicalProtocolTag: "चित्र वर्णन कार्य",

    describeSceneHint: "सावकाश सांगा, जे काही तुम्हाला दिसते ते सर्व.",

    pictureDescSub: "चित्रात तुम्हाला जे दिसते त्याबद्दल सांगा.",

    listenCarefully: "लक्षपूर्वक ऐका",

    memorySub: "आम्ही काही शब्द वाचू. ते लक्षात ठेवण्याचा प्रयत्न करा.",

    iHeardWords: "मी शब्द ऐकले आहेत—पुढे चला",

    oneMore: "आणखी एक प्रश्न",

    conversationSub: "यात बरोबर किंवा चूक उत्तर नाही.",

    youreDone: "तुम्ही पूर्ण केले!",

    completionSub: "धन्यवाद. आता आम्ही तुमच्या आवाजाची तपासणी करत आहोत.",

    home: "मुख्यपृष्ठ",

    history: "मागील तपासण्या",

    help: "मदत",

    caregiver: "काळजीवाहक",

    profile: "प्रोफाइल",
  },

  ta: {
    greeting: "வணக்கம்",

    howFeeling: "இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?",

    voiceCheckCard: "குரல் பரிசோதனை",

    voiceCheckDesc:
      "3–5 நிமிட சிறிய பரிசோதனையை மேற்கொள்ளுங்கள். இயல்பாகப் பேசுங்கள்—சரி அல்லது தவறு என்ற பதில் எதுவும் இல்லை.",

    welcomeSub: "சிறிய குரல் பரிசோதனையைத் தொடங்கலாம்.",

    welcomeTime: "இதற்கு சுமார் 3–5 நிமிடங்கள் ஆகும்.",

    startVoiceCheck: "குரல் பரிசோதனையைத் தொடங்குங்கள்",

    someoneHelping: "யாரோ எனக்கு உதவுகிறார்கள்",

    letsBegin: "தொடங்கலாம்",

    voiceIntroSub: "இது ஒரு சிறிய குரல் பரிசோதனை. இதற்கு சுமார் 3–5 நிமிடங்கள் ஆகும்.",

    step1: "கேளுங்கள்",

    step2: "பேசுங்கள்",

    step3: "முடிக்கவும்",

    beginVoiceCheck: "குரல் பரிசோதனையைத் தொடங்குங்கள்",

    listenToQuestion: "கேள்வியைக் கேளுங்கள்",

    playAgain: "மீண்டும் கேளுங்கள்",

    startSpeaking: "பேசத் தொடங்குங்கள்",

    tapToSpeak: "பேசத் தட்டுங்கள்",

    speakNaturally: "இயல்பாகப் பேசுங்கள்…",

    finishRecording: "பதிவை முடிக்கவும்",

    recordingReady: "உங்கள் பதிவு தயாராக உள்ளது",

    listenBefore: "தொடர்வதற்கு முன் கேளுங்கள்",

    recordAgain: "மீண்டும் பதிவு செய்யுங்கள்",

    continue: "தொடரவும்",

    whatDoYouSee: "உங்களுக்கு என்ன தெரிகிறது?",

    clinicalProtocolTag: "படம் விவரிக்கும் பணி",

    describeSceneHint: "நிதானமாக, நீங்கள் கவனிக்கும் அனைத்தையும் சொல்லுங்கள்.",

    pictureDescSub: "படத்தில் நீங்கள் காண்பதைப் பற்றி சொல்லுங்கள்.",

    listenCarefully: "கவனமாகக் கேளுங்கள்",

    memorySub:
      "சில சொற்களை நாங்கள் வாசிப்போம். அவற்றை நினைவில் வைத்துக்கொள்ள முயற்சி செய்யுங்கள்.",

    iHeardWords: "சொற்களைக் கேட்டுவிட்டேன்—தொடரவும்",

    oneMore: "இன்னொரு கேள்வி",

    conversationSub: "சரியான அல்லது தவறான பதில் என்று எதுவும் இல்லை.",

    youreDone: "முடித்துவிட்டீர்கள்!",

    completionSub: "நன்றி. இப்போது உங்கள் குரலைப் பரிசோதிக்கிறோம்.",

    home: "முகப்பு",

    history: "முந்தைய பரிசோதனைகள்",

    help: "உதவி",

    caregiver: "பராமரிப்பாளர்",

    profile: "சுயவிவரம்",
  },

  te: {
    greeting: "నమస్కారం",

    howFeeling: "ఈ రోజు మీకు ఎలా అనిపిస్తోంది?",

    voiceCheckCard: "వాయిస్ పరీక్ష",

    voiceCheckDesc:
      "3–5 నిమిషాల చిన్న పరీక్ష చేయండి. సహజంగా మాట్లాడండి—సరైన లేదా తప్పు సమాధానాలు ఉండవు.",

    welcomeSub: "చిన్న వాయిస్ పరీక్షను ప్రారంభిద్దాం.",

    welcomeTime: "దీనికి సుమారు 3–5 నిమిషాలు పడుతుంది.",

    startVoiceCheck: "వాయిస్ పరీక్షను ప్రారంభించండి",

    someoneHelping: "ఎవరో నాకు సహాయం చేస్తున్నారు",

    letsBegin: "ప్రారంభిద్దాం",

    voiceIntroSub: "ఇది చిన్న వాయిస్ పరీక్ష. దీనికి సుమారు 3–5 నిమిషాలు పడుతుంది.",

    step1: "వినండి",

    step2: "మాట్లాడండి",

    step3: "ముగించండి",

    beginVoiceCheck: "వాయిస్ పరీక్షను ప్రారంభించండి",

    listenToQuestion: "ప్రశ్నను వినండి",

    playAgain: "మళ్లీ వినండి",

    startSpeaking: "మాట్లాడటం ప్రారంభించండి",

    tapToSpeak: "మాట్లాడేందుకు ట్యాప్ చేయండి",

    speakNaturally: "సహజంగా మాట్లాడండి…",

    finishRecording: "రికార్డింగ్‌ను ముగించండి",

    recordingReady: "మీ రికార్డింగ్ సిద్ధంగా ఉంది",

    listenBefore: "కొనసాగించే ముందు వినండి",

    recordAgain: "మళ్లీ రికార్డ్ చేయండి",

    continue: "కొనసాగించండి",

    whatDoYouSee: "మీకు ఏమి కనిపిస్తోంది?",

    clinicalProtocolTag: "చిత్ర వర్ణన పని",

    describeSceneHint: "నెమ్మదిగా, మీరు గమనించినదంతా చెప్పండి.",

    pictureDescSub: "చిత్రంలో మీకు కనిపిస్తున్నదాన్ని చెప్పండి.",

    listenCarefully: "శ్రద్ధగా వినండి",

    memorySub: "మేము కొన్ని పదాలను చదువుతాము. వాటిని గుర్తుంచుకోవడానికి ప్రయత్నించండి.",

    iHeardWords: "పదాలను విన్నాను—కొనసాగించండి",

    oneMore: "మరో ప్రశ్న",

    conversationSub: "సరైన లేదా తప్పు సమాధానం ఏదీ లేదు.",

    youreDone: "మీరు పూర్తి చేశారు!",

    completionSub: "ధన్యవాదాలు. ఇప్పుడు మీ వాయిస్‌ను పరీక్షిస్తున్నాము.",

    home: "హోమ్",

    history: "మునుపటి పరీక్షలు",

    help: "సహాయం",

    caregiver: "సంరక్షకుడు",

    profile: "ప్రొఫైల్",
  },

  gu: {
    greeting: "નમસ્તે",

    howFeeling: "આજે તમને કેવું લાગે છે?",

    voiceCheckCard: "અવાજની તપાસ",

    voiceCheckDesc:
      "3–5 મિનિટની ટૂંકી તપાસ કરો. સ્વાભાવિક રીતે બોલો—અહીં સાચો કે ખોટો જવાબ નથી.",

    welcomeSub: "ચાલો, અવાજની એક ટૂંકી તપાસ કરીએ.",

    welcomeTime: "આમાં લગભગ 3–5 મિનિટ લાગશે.",

    startVoiceCheck: "અવાજની તપાસ શરૂ કરો",

    someoneHelping: "કોઈ મને મદદ કરી રહ્યું છે",

    letsBegin: "ચાલો શરૂ કરીએ",

    voiceIntroSub: "આ અવાજની એક ટૂંકી તપાસ છે. આમાં લગભગ 3–5 મિનિટ લાગશે.",

    step1: "સાંભળો",

    step2: "બોલો",

    step3: "પૂર્ણ કરો",

    beginVoiceCheck: "અવાજની તપાસ શરૂ કરો",

    listenToQuestion: "પ્રશ્ન સાંભળો",

    playAgain: "ફરી સાંભળો",

    startSpeaking: "બોલવાનું શરૂ કરો",

    tapToSpeak: "બોલવા માટે ટૅપ કરો",

    speakNaturally: "સ્વાભાવિક રીતે બોલો…",

    finishRecording: "રેકોર્ડિંગ પૂર્ણ કરો",

    recordingReady: "તમારું રેકોર્ડિંગ તૈયાર છે",

    listenBefore: "આગળ વધતા પહેલાં સાંભળો",

    recordAgain: "ફરી રેકોર્ડ કરો",

    continue: "આગળ વધો",

    whatDoYouSee: "તમને શું દેખાય છે?",

    clinicalProtocolTag: "ચિત્ર વર્ણન કાર્ય",

    describeSceneHint: "નિરાંતે, તમને જે કંઈ દેખાય તે બધું જણાવો.",

    pictureDescSub: "ચિત્રમાં તમને જે દેખાય છે તે જણાવો.",

    listenCarefully: "ધ્યાનથી સાંભળો",

    memorySub: "અમે કેટલાક શબ્દો વાંચીશું. તેમને યાદ રાખવાનો પ્રયાસ કરો.",

    iHeardWords: "મેં શબ્દો સાંભળ્યા છે—આગળ વધો",

    oneMore: "વધુ એક પ્રશ્ન",

    conversationSub: "અહીં સાચો કે ખોટો જવાબ નથી.",

    youreDone: "તમે પૂર્ણ કર્યું!",

    completionSub: "આભાર. હવે અમે તમારા અવાજની તપાસ કરી રહ્યા છીએ.",

    home: "હોમ",

    history: "અગાઉની તપાસો",

    help: "મદદ",

    caregiver: "સંભાળ રાખનાર",

    profile: "પ્રોફાઇલ",
  },

  kn: {
    greeting: "ನಮಸ್ಕಾರ",

    howFeeling: "ಇಂದು ನಿಮಗೆ ಹೇಗನಿಸುತ್ತಿದೆ?",

    voiceCheckCard: "ಧ್ವನಿ ಪರೀಕ್ಷೆ",

    voiceCheckDesc:
      "3–5 ನಿಮಿಷಗಳ ಸಣ್ಣ ಪರೀಕ್ಷೆ ಮಾಡಿ. ಸಹಜವಾಗಿ ಮಾತನಾಡಿ—ಸರಿಯಾದ ಅಥವಾ ತಪ್ಪಾದ ಉತ್ತರಗಳಿಲ್ಲ.",

    welcomeSub: "ಸಣ್ಣ ಧ್ವನಿ ಪರೀಕ್ಷೆಯನ್ನು ಪ್ರಾರಂಭಿಸೋಣ.",

    welcomeTime: "ಇದಕ್ಕೆ ಸುಮಾರು 3–5 ನಿಮಿಷಗಳು ಬೇಕಾಗುತ್ತವೆ.",

    startVoiceCheck: "ಧ್ವನಿ ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ",

    someoneHelping: "ಯಾರೋ ನನಗೆ ಸಹಾಯ ಮಾಡುತ್ತಿದ್ದಾರೆ",

    letsBegin: "ಪ್ರಾರಂಭಿಸೋಣ",

    voiceIntroSub: "ಇದು ಒಂದು ಸಣ್ಣ ಧ್ವನಿ ಪರೀಕ್ಷೆ. ಇದಕ್ಕೆ ಸುಮಾರು 3–5 ನಿಮಿಷಗಳು ಬೇಕಾಗುತ್ತವೆ.",

    step1: "ಆಲಿಸಿ",

    step2: "ಮಾತನಾಡಿ",

    step3: "ಮುಗಿಸಿ",

    beginVoiceCheck: "ಧ್ವನಿ ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ",

    listenToQuestion: "ಪ್ರಶ್ನೆಯನ್ನು ಆಲಿಸಿ",

    playAgain: "ಮತ್ತೆ ಆಲಿಸಿ",

    startSpeaking: "ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿ",

    tapToSpeak: "ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ",

    speakNaturally: "ಸಹಜವಾಗಿ ಮಾತನಾಡಿ…",

    finishRecording: "ರೆಕಾರ್ಡಿಂಗ್ ಮುಗಿಸಿ",

    recordingReady: "ನಿಮ್ಮ ರೆಕಾರ್ಡಿಂಗ್ ಸಿದ್ಧವಾಗಿದೆ",

    listenBefore: "ಮುಂದುವರಿಯುವ ಮೊದಲು ಆಲಿಸಿ",

    recordAgain: "ಮತ್ತೆ ರೆಕಾರ್ಡ್ ಮಾಡಿ",

    continue: "ಮುಂದುವರಿಸಿ",

    whatDoYouSee: "ನಿಮಗೆ ಏನು ಕಾಣುತ್ತಿದೆ?",

    clinicalProtocolTag: "ಚಿತ್ರ ವಿವರಣೆ ಕಾರ್ಯ",

    describeSceneHint: "ನಿಧಾನವಾಗಿ, ನಿಮಗೆ ಕಾಣುವ ಎಲ್ಲವನ್ನೂ ತಿಳಿಸಿ.",

    pictureDescSub: "ಚಿತ್ರದಲ್ಲಿ ನಿಮಗೆ ಕಾಣುತ್ತಿರುವುದನ್ನು ತಿಳಿಸಿ.",

    listenCarefully: "ಗಮನವಿಟ್ಟು ಆಲಿಸಿ",

    memorySub: "ನಾವು ಕೆಲವು ಪದಗಳನ್ನು ಓದುತ್ತೇವೆ. ಅವುಗಳನ್ನು ನೆನಪಿಟ್ಟುಕೊಳ್ಳಲು ಪ್ರಯತ್ನಿಸಿ.",

    iHeardWords: "ಪದಗಳನ್ನು ಆಲಿಸಿದ್ದೇನೆ—ಮುಂದುವರಿಸಿ",

    oneMore: "ಇನ್ನೊಂದು ಪ್ರಶ್ನೆ",

    conversationSub: "ಸರಿಯಾದ ಅಥವಾ ತಪ್ಪಾದ ಉತ್ತರ ಎಂಬುದಿಲ್ಲ.",

    youreDone: "ನೀವು ಮುಗಿಸಿದ್ದೀರಿ!",

    completionSub: "ಧನ್ಯವಾದಗಳು. ಈಗ ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಪರೀಕ್ಷಿಸುತ್ತಿದ್ದೇವೆ.",

    home: "ಮುಖಪುಟ",

    history: "ಹಿಂದಿನ ಪರೀಕ್ಷೆಗಳು",

    help: "ಸಹಾಯ",

    caregiver: "ಆರೈಕೆದಾರರು",

    profile: "ಪ್ರೊಫೈಲ್",
  },

  ml: {
    greeting: "നമസ്കാരം",

    howFeeling: "ഇന്ന് നിങ്ങൾക്ക് എങ്ങനെയുണ്ട്?",

    voiceCheckCard: "ശബ്ദ പരിശോധന",

    voiceCheckDesc:
      "3–5 മിനിറ്റ് ദൈർഘ്യമുള്ള ഒരു ചെറിയ പരിശോധന നടത്തൂ. സ്വാഭാവികമായി സംസാരിക്കൂ—ശരിയോ തെറ്റോ ആയ ഉത്തരങ്ങളില്ല.",

    welcomeSub: "ഒരു ചെറിയ ശബ്ദ പരിശോധന നടത്താം.",

    welcomeTime: "ഇതിന് ഏകദേശം 3–5 മിനിറ്റ് എടുക്കും.",

    startVoiceCheck: "ശബ്ദ പരിശോധന ആരംഭിക്കുക",

    someoneHelping: "ആരെങ്കിലും എന്നെ സഹായിക്കുന്നു",

    letsBegin: "തുടങ്ങാം",

    voiceIntroSub: "ഇതൊരു ചെറിയ ശബ്ദ പരിശോധനയാണ്. ഇതിന് ഏകദേശം 3–5 മിനിറ്റ് എടുക്കും.",

    step1: "കേൾക്കുക",

    step2: "സംസാരിക്കുക",

    step3: "പൂർത്തിയാക്കുക",

    beginVoiceCheck: "ശബ്ദ പരിശോധന ആരംഭിക്കുക",

    listenToQuestion: "ചോദ്യം കേൾക്കുക",

    playAgain: "വീണ്ടും കേൾക്കുക",

    startSpeaking: "സംസാരിക്കാൻ തുടങ്ങുക",

    tapToSpeak: "സംസാരിക്കാൻ ടാപ്പ് ചെയ്യുക",

    speakNaturally: "സ്വാഭാവികമായി സംസാരിക്കൂ…",

    finishRecording: "റെക്കോർഡിംഗ് പൂർത്തിയാക്കുക",

    recordingReady: "നിങ്ങളുടെ റെക്കോർഡിംഗ് തയ്യാറാണ്",

    listenBefore: "തുടരുന്നതിന് മുമ്പ് കേൾക്കുക",

    recordAgain: "വീണ്ടും റെക്കോർഡ് ചെയ്യുക",

    continue: "തുടരുക",

    whatDoYouSee: "നിങ്ങൾ എന്താണ് കാണുന്നത്?",

    clinicalProtocolTag: "ചിത്ര വിവരണ ദൗത്യം",

    describeSceneHint: "സാവധാനം, നിങ്ങൾ കാണുന്നതെല്ലാം പറയൂ.",

    pictureDescSub: "ചിത്രത്തിൽ നിങ്ങൾ കാണുന്നത് വിവരിക്കൂ.",

    listenCarefully: "ശ്രദ്ധയോടെ കേൾക്കുക",

    memorySub: "ഞങ്ങൾ കുറച്ച് വാക്കുകൾ വായിക്കും. അവ ഓർമ്മിക്കാൻ ശ്രമിക്കൂ.",

    iHeardWords: "വാക്കുകൾ കേട്ടു—തുടരുക",

    oneMore: "ഒരു ചോദ്യം കൂടി",

    conversationSub: "ശരിയോ തെറ്റോ ആയ ഉത്തരങ്ങളില്ല.",

    youreDone: "നിങ്ങൾ പൂർത്തിയാക്കി!",

    completionSub: "നന്ദി. ഇപ്പോൾ നിങ്ങളുടെ ശബ്ദം പരിശോധിക്കുകയാണ്.",

    home: "ഹോം",

    history: "മുൻ പരിശോധനകൾ",

    help: "സഹായം",

    caregiver: "പരിചരിക്കുന്നയാൾ",

    profile: "പ്രൊഫൈൽ",
  },
}

const STATIC_INDIC_TX: Record<string, Record<string, string>> = {
  hi: {
    chooseLanguage: "अपनी भाषा चुनें",

    changeLanguageLater: "आप इसे बाद में भी बदल सकते हैं।",

    listenEnglish: "अंग्रेज़ी में सुनें",

    continueBtn: "आगे बढ़ें",

    screeningTitle: "आवाज़ की स्वास्थ्य जांच",

    screeningSubtitle: "आवाज़ के आधार पर शुरुआती संज्ञानात्मक जांच",

    beforeBegin: "शुरू करने से पहले",

    privacyNote: "आपकी गोपनीयता और सुरक्षा के बारे में एक ज़रूरी बात",

    voiceRecording: "आवाज़ की रिकॉर्डिंग",

    privacyEncryption: "गोपनीयता और सुरक्षा",

    screeningInstrument: "जांच की जानकारी",

    understandContinue: "समझ गया/गई, आगे बढ़ें",

    tellAboutYou: "अपने बारे में बताइए",

    calibrationNote: "सटीक परिणाम के लिए हम केवल ज़रूरी जानकारी पूछते हैं।",

    yourName: "आपका नाम",

    enterName: "अपना नाम लिखें",

    age: "उम्र",

    caregiverMode: "देखभालकर्ता की सहायता वाला तरीका",

    readyWhen: "जब आप तैयार हों",

    viewDetailsLabel: "विवरण देखें",

    apkTitle: "SwarSanket Android ऐप",

    installApk: "SwarSanket ऐप इंस्टॉल करें",

    getApk: "ऐप लें",
  },

  bn: {
    chooseLanguage: "আপনার ভাষা বেছে নিন",

    changeLanguageLater: "আপনি পরে ভাষা পরিবর্তন করতে পারবেন।",

    listenEnglish: "ইংরেজিতে শুনুন",

    continueBtn: "এগিয়ে যান",

    screeningTitle: "ভয়েসের মাধ্যমে স্বাস্থ্য পরীক্ষা",

    screeningSubtitle: "কণ্ঠস্বরের সাহায্যে প্রাথমিক স্মৃতি ও চিন্তাশক্তির পরীক্ষা",

    beforeBegin: "শুরু করার আগে",

    privacyNote: "আপনার গোপনীয়তা ও নিরাপত্তা সম্পর্কে একটি গুরুত্বপূর্ণ কথা",

    voiceRecording: "কণ্ঠস্বর রেকর্ড করা",

    privacyEncryption: "গোপনীয়তা ও নিরাপত্তা",

    screeningInstrument: "পরীক্ষা সম্পর্কে তথ্য",

    understandContinue: "বুঝেছি, এগিয়ে যান",

    tellAboutYou: "আপনার সম্পর্কে বলুন",

    calibrationNote: "সঠিক ফলাফলের জন্য আমরা শুধু প্রয়োজনীয় তথ্যই চাই।",

    yourName: "আপনার নাম",

    enterName: "আপনার নাম লিখুন",

    age: "বয়স",

    caregiverMode: "পরিচর্যাকারীর সহায়তায় পরীক্ষা",

    readyWhen: "আপনি প্রস্তুত হলেই শুরু করুন",

    viewDetailsLabel: "বিস্তারিত দেখুন",

    apkTitle: "SwarSanket অ্যান্ড্রয়েড অ্যাপ",

    installApk: "SwarSanket অ্যাপ ইনস্টল করুন",

    getApk: "অ্যাপ নিন",
  },

  mr: {
    chooseLanguage: "तुमची भाषा निवडा",

    changeLanguageLater: "तुम्ही हे नंतरही बदलू शकता.",

    listenEnglish: "इंग्रजीत ऐका",

    continueBtn: "पुढे चला",

    screeningTitle: "आवाजाची आरोग्य तपासणी",

    screeningSubtitle: "आवाजाच्या आधारे सुरुवातीची स्मरणशक्ती व विचारशक्ती तपासणी",

    beforeBegin: "सुरुवात करण्यापूर्वी",

    privacyNote: "तुमच्या गोपनीयतेबद्दल आणि सुरक्षिततेबद्दल महत्त्वाची माहिती",

    voiceRecording: "आवाजाचे रेकॉर्डिंग",

    privacyEncryption: "गोपनीयता आणि सुरक्षितता",

    screeningInstrument: "तपासणीची माहिती",

    understandContinue: "समजले, पुढे चला",

    tellAboutYou: "तुमच्याबद्दल सांगा",

    calibrationNote: "अचूक परिणामांसाठी आम्ही फक्त आवश्यक माहिती विचारतो.",

    yourName: "तुमचे नाव",

    enterName: "तुमचे नाव लिहा",

    age: "वय",

    caregiverMode: "काळजीवाहकाच्या मदतीने तपासणी",

    readyWhen: "तुम्ही तयार असाल तेव्हा सुरू करा",

    viewDetailsLabel: "तपशील पहा",

    apkTitle: "SwarSanket Android अॅप",

    installApk: "SwarSanket अॅप इंस्टॉल करा",

    getApk: "अॅप मिळवा",
  },

  ta: {
    chooseLanguage: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",

    changeLanguageLater: "இதைப் பின்னரும் மாற்றலாம்.",

    listenEnglish: "ஆங்கிலத்தில் கேளுங்கள்",

    continueBtn: "தொடரவும்",

    screeningTitle: "குரல் மூலம் உடல்நலப் பரிசோதனை",

    screeningSubtitle: "குரலின் அடிப்படையிலான ஆரம்பநிலை நினைவாற்றல் பரிசோதனை",

    beforeBegin: "தொடங்குவதற்கு முன்",

    privacyNote: "உங்கள் தனியுரிமை மற்றும் பாதுகாப்பு பற்றிய முக்கிய குறிப்பு",

    voiceRecording: "குரல் பதிவு",

    privacyEncryption: "தனியுரிமை மற்றும் பாதுகாப்பு",

    screeningInstrument: "பரிசோதனை பற்றிய தகவல்",

    understandContinue: "புரிந்துகொண்டேன், தொடரவும்",

    tellAboutYou: "உங்களைப் பற்றி சொல்லுங்கள்",

    calibrationNote: "துல்லியமான முடிவுகளுக்குத் தேவையான தகவல்களை மட்டுமே கேட்கிறோம்.",

    yourName: "உங்கள் பெயர்",

    enterName: "உங்கள் பெயரை உள்ளிடுங்கள்",

    age: "வயது",

    caregiverMode: "பராமரிப்பாளர் உதவியுடன் பரிசோதனை",

    readyWhen: "நீங்கள் தயாரானதும் தொடங்குங்கள்",

    viewDetailsLabel: "விவரங்களைப் பார்க்கவும்",

    apkTitle: "SwarSanket Android செயலி",

    installApk: "SwarSanket செயலியை நிறுவுங்கள்",

    getApk: "செயலியைப் பெறுங்கள்",
  },

  te: {
    chooseLanguage: "మీ భాషను ఎంచుకోండి",

    changeLanguageLater: "దీన్ని తర్వాత కూడా మార్చవచ్చు.",

    listenEnglish: "ఆంగ్లంలో వినండి",

    continueBtn: "కొనసాగించండి",

    screeningTitle: "వాయిస్ ఆరోగ్య పరీక్ష",

    screeningSubtitle: "వాయిస్ ఆధారంగా చేసే ప్రారంభ జ్ఞాపకశక్తి పరీక్ష",

    beforeBegin: "ప్రారంభించే ముందు",

    privacyNote: "మీ గోప్యత మరియు భద్రత గురించి ముఖ్యమైన సమాచారం",

    voiceRecording: "వాయిస్ రికార్డింగ్",

    privacyEncryption: "గోప్యత మరియు భద్రత",

    screeningInstrument: "పరీక్ష సమాచారం",

    understandContinue: "అర్థమైంది, కొనసాగించండి",

    tellAboutYou: "మీ గురించి చెప్పండి",

    calibrationNote: "ఖచ్చితమైన ఫలితాల కోసం అవసరమైన సమాచారాన్ని మాత్రమే అడుగుతాము.",

    yourName: "మీ పేరు",

    enterName: "మీ పేరు నమోదు చేయండి",

    age: "వయసు",

    caregiverMode: "సంరక్షకుడి సహాయంతో పరీక్ష",

    readyWhen: "మీరు సిద్ధమైనప్పుడు ప్రారంభించండి",

    viewDetailsLabel: "వివరాలను చూడండి",

    apkTitle: "SwarSanket Android యాప్",

    installApk: "SwarSanket యాప్‌ను ఇన్‌స్టాల్ చేయండి",

    getApk: "యాప్ పొందండి",
  },

  gu: {
    chooseLanguage: "તમારી ભાષા પસંદ કરો",

    changeLanguageLater: "તમે આ ભાષા પછી પણ બદલી શકો છો.",

    listenEnglish: "અંગ્રેજીમાં સાંભળો",

    continueBtn: "આગળ વધો",

    screeningTitle: "અવાજની આરોગ્ય તપાસ",

    screeningSubtitle: "અવાજના આધારે પ્રારંભિક સ્મરણશક્તિની તપાસ",

    beforeBegin: "શરૂ કરતાં પહેલાં",

    privacyNote: "તમારી ગોપનીયતા અને સુરક્ષા વિશે મહત્વની માહિતી",

    voiceRecording: "અવાજનું રેકોર્ડિંગ",

    privacyEncryption: "ગોપનીયતા અને સુરક્ષા",

    screeningInstrument: "તપાસ વિશે માહિતી",

    understandContinue: "સમજાયું, આગળ વધો",

    tellAboutYou: "તમારા વિશે જણાવો",

    calibrationNote: "ચોક્કસ પરિણામો માટે અમે ફક્ત જરૂરી માહિતી જ પૂછીએ છીએ.",

    yourName: "તમારું નામ",

    enterName: "તમારું નામ લખો",

    age: "ઉંમર",

    caregiverMode: "સંભાળ રાખનારની મદદથી તપાસ",

    readyWhen: "તમે તૈયાર હો ત્યારે શરૂ કરો",

    viewDetailsLabel: "વિગતો જુઓ",

    apkTitle: "SwarSanket Android ઍપ",

    installApk: "SwarSanket ઍપ ઇન્સ્ટોલ કરો",

    getApk: "ઍપ મેળવો",
  },

  kn: {
    chooseLanguage: "ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",

    changeLanguageLater: "ಇದನ್ನು ನಂತರವೂ ಬದಲಾಯಿಸಬಹುದು.",

    listenEnglish: "ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಆಲಿಸಿ",

    continueBtn: "ಮುಂದುವರಿಸಿ",

    screeningTitle: "ಧ್ವನಿ ಆರೋಗ್ಯ ಪರೀಕ್ಷೆ",

    screeningSubtitle: "ಧ್ವನಿಯ ಆಧಾರದ ಮೇಲಿನ ಆರಂಭಿಕ ಜ್ಞಾಪಕಶಕ್ತಿ ಪರೀಕ್ಷೆ",

    beforeBegin: "ಪ್ರಾರಂಭಿಸುವ ಮೊದಲು",

    privacyNote: "ನಿಮ್ಮ ಗೌಪ್ಯತೆ ಮತ್ತು ಸುರಕ್ಷತೆಯ ಕುರಿತು ಮುಖ್ಯ ಮಾಹಿತಿ",

    voiceRecording: "ಧ್ವನಿ ರೆಕಾರ್ಡಿಂಗ್",

    privacyEncryption: "ಗೌಪ್ಯತೆ ಮತ್ತು ಸುರಕ್ಷತೆ",

    screeningInstrument: "ಪರೀಕ್ಷೆಯ ಮಾಹಿತಿ",

    understandContinue: "ಅರ್ಥವಾಯಿತು, ಮುಂದುವರಿಸಿ",

    tellAboutYou: "ನಿಮ್ಮ ಬಗ್ಗೆ ತಿಳಿಸಿ",

    calibrationNote: "ನಿಖರ ಫಲಿತಾಂಶಕ್ಕಾಗಿ ಅಗತ್ಯವಿರುವ ಮಾಹಿತಿಯನ್ನು ಮಾತ್ರ ಕೇಳುತ್ತೇವೆ.",

    yourName: "ನಿಮ್ಮ ಹೆಸರು",

    enterName: "ನಿಮ್ಮ ಹೆಸರನ್ನು ನಮೂದಿಸಿ",

    age: "ವಯಸ್ಸು",

    caregiverMode: "ಆರೈಕೆದಾರರ ಸಹಾಯದೊಂದಿಗೆ ಪರೀಕ್ಷೆ",

    readyWhen: "ನೀವು ಸಿದ್ಧರಾದಾಗ ಪ್ರಾರಂಭಿಸಿ",

    viewDetailsLabel: "ವಿವರಗಳನ್ನು ನೋಡಿ",

    apkTitle: "SwarSanket Android ಆ್ಯಪ್",

    installApk: "SwarSanket ಆ್ಯಪ್ ಸ್ಥಾಪಿಸಿ",

    getApk: "ಆ್ಯಪ್ ಪಡೆಯಿರಿ",
  },

  ml: {
    chooseLanguage: "നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക",

    changeLanguageLater: "ഇത് പിന്നീട് മാറ്റാനും കഴിയും.",

    listenEnglish: "ഇംഗ്ലീഷിൽ കേൾക്കുക",

    continueBtn: "തുടരുക",

    screeningTitle: "ശബ്ദ ആരോഗ്യ പരിശോധന",

    screeningSubtitle: "ശബ്ദത്തെ അടിസ്ഥാനമാക്കിയുള്ള പ്രാഥമിക ഓർമ്മശക്തി പരിശോധന",

    beforeBegin: "തുടങ്ങുന്നതിന് മുമ്പ്",

    privacyNote: "നിങ്ങളുടെ സ്വകാര്യതയും സുരക്ഷയും സംബന്ധിച്ച പ്രധാന വിവരം",

    voiceRecording: "ശബ്ദ റെക്കോർഡിംഗ്",

    privacyEncryption: "സ്വകാര്യതയും സുരക്ഷയും",

    screeningInstrument: "പരിശോധനയെക്കുറിച്ചുള്ള വിവരം",

    understandContinue: "മനസ്സിലായി, തുടരുക",

    tellAboutYou: "നിങ്ങളെക്കുറിച്ച് പറയൂ",

    calibrationNote: "കൃത്യമായ ഫലങ്ങൾക്കായി ആവശ്യമായ വിവരങ്ങൾ മാത്രമേ ഞങ്ങൾ ചോദിക്കൂ.",

    yourName: "നിങ്ങളുടെ പേര്",

    enterName: "നിങ്ങളുടെ പേര് നൽകുക",

    age: "പ്രായം",

    caregiverMode: "പരിചരിക്കുന്നയാളുടെ സഹായത്തോടെയുള്ള പരിശോധന",

    readyWhen: "തയ്യാറാകുമ്പോൾ ആരംഭിക്കൂ",

    viewDetailsLabel: "വിശദാംശങ്ങൾ കാണുക",

    apkTitle: "SwarSanket Android ആപ്പ്",

    installApk: "SwarSanket ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക",

    getApk: "ആപ്പ് നേടുക",
  },
}

const FLOW_INDIC_TX: Record<string, Record<string, string>> = {
  hi: {
    listenSpeakScreen: "सुनें। बोलें। समय रहते जांच कराएं।",

    getStarted: "शुरू करें",

    pipelineTitle: "बहुभाषी जांच",

    pipelineDescription:
      "अंग्रेज़ी में आवाज़ की जांच के लिए प्रमाणित प्रणाली का उपयोग होता है। भारतीय भाषाओं में आवाज़ की पहचान और आवाज़ से जुड़े संकेतों की जांच की जाती है।",
  },

  bn: {
    listenSpeakScreen: "শুনুন। বলুন। সময় থাকতে পরীক্ষা করুন।",

    getStarted: "শুরু করুন",

    pipelineTitle: "বহুভাষিক পরীক্ষা",

    pipelineDescription:
      "ইংরেজি ভয়েস পরীক্ষায় যাচাই করা পদ্ধতি ব্যবহার করা হয়। ভারতীয় ভাষায় কণ্ঠস্বর শনাক্ত করে কণ্ঠস্বরের বৈশিষ্ট্য পরীক্ষা করা হয়।",
  },

  mr: {
    listenSpeakScreen: "ऐका. बोला. वेळेत तपासणी करा.",

    getStarted: "सुरू करा",

    pipelineTitle: "बहुभाषिक तपासणी",

    pipelineDescription:
      "इंग्रजी आवाजाच्या तपासणीसाठी प्रमाणित प्रणाली वापरली जाते. भारतीय भाषांमध्ये आवाज ओळखून आवाजाशी संबंधित संकेत तपासले जातात.",
  },

  ta: {
    listenSpeakScreen: "கேளுங்கள். பேசுங்கள். முன்கூட்டியே பரிசோதியுங்கள்.",

    getStarted: "தொடங்குங்கள்",

    pipelineTitle: "பலமொழிப் பரிசோதனை",

    pipelineDescription:
      "ஆங்கிலக் குரல் பரிசோதனைக்கு சரிபார்க்கப்பட்ட முறை பயன்படுத்தப்படுகிறது. இந்திய மொழிகளில் குரல் அடையாளம் காணப்பட்டு, குரல் சார்ந்த அறிகுறிகள் பரிசோதிக்கப்படுகின்றன.",
  },

  te: {
    listenSpeakScreen: "వినండి. మాట్లాడండి. ముందుగానే పరీక్షించుకోండి.",

    getStarted: "ప్రారంభించండి",

    pipelineTitle: "బహుభాషా పరీక్ష",

    pipelineDescription:
      "ఆంగ్ల వాయిస్ పరీక్షకు ధృవీకరించిన విధానం ఉపయోగించబడుతుంది. భారతీయ భాషల్లో వాయిస్‌ను గుర్తించి, వాయిస్‌కు సంబంధించిన సంకేతాలను పరీక్షిస్తాము.",
  },

  gu: {
    listenSpeakScreen: "સાંભળો. બોલો. સમયસર તપાસ કરાવો.",

    getStarted: "શરૂ કરો",

    pipelineTitle: "બહુભાષી તપાસ",

    pipelineDescription:
      "અંગ્રેજી અવાજની તપાસ માટે પ્રમાણિત પદ્ધતિનો ઉપયોગ થાય છે. ભારતીય ભાષાઓમાં અવાજ ઓળખીને અવાજ સાથે જોડાયેલા સંકેતોની તપાસ થાય છે.",
  },

  kn: {
    listenSpeakScreen: "ಆಲಿಸಿ. ಮಾತನಾಡಿ. ಮುಂಚಿತವಾಗಿ ಪರೀಕ್ಷಿಸಿಕೊಳ್ಳಿ.",

    getStarted: "ಪ್ರಾರಂಭಿಸಿ",

    pipelineTitle: "ಬಹುಭಾಷಾ ಪರೀಕ್ಷೆ",

    pipelineDescription:
      "ಇಂಗ್ಲಿಷ್ ಧ್ವನಿ ಪರೀಕ್ಷೆಗೆ ಪರಿಶೀಲಿತ ವಿಧಾನವನ್ನು ಬಳಸಲಾಗುತ್ತದೆ. ಭಾರತೀಯ ಭಾಷೆಗಳಲ್ಲಿ ಧ್ವನಿಯನ್ನು ಗುರುತಿಸಿ, ಧ್ವನಿಗೆ ಸಂಬಂಧಿಸಿದ ಸೂಚಕಗಳನ್ನು ಪರೀಕ್ಷಿಸಲಾಗುತ್ತದೆ.",
  },

  ml: {
    listenSpeakScreen: "കേൾക്കൂ. സംസാരിക്കൂ. നേരത്തെ പരിശോധന നടത്തൂ.",

    getStarted: "തുടങ്ങുക",

    pipelineTitle: "ബഹുഭാഷാ പരിശോധന",

    pipelineDescription:
      "ഇംഗ്ലീഷ് ശബ്ദ പരിശോധനയ്ക്ക് അംഗീകരിച്ച രീതിയാണ് ഉപയോഗിക്കുന്നത്. ഇന്ത്യൻ ഭാഷകളിൽ ശബ്ദം തിരിച്ചറിഞ്ഞ് ശബ്ദവുമായി ബന്ധപ്പെട്ട സൂചനകൾ പരിശോധിക്കുന്നു.",
  },
}

const CONSENT_INDIC_TX: Record<string, Record<string, string>> = {
  hi: {
    voiceRecordingDesc:
      "शुरुआती संज्ञानात्मक जांच के लिए आवाज़ के छोटे नमूने रिकॉर्ड किए जाते हैं।",

    privacyEncryptionDesc:
      "जानकारी आपके फोन में सुरक्षित रखी जाती है और आपकी अनुमति के बिना साझा नहीं की जाती।",

    screeningInstrumentDesc:
      "यह परिणाम स्वास्थ्य संबंधी अगले कदम सुझाता है; यह चिकित्सकीय निदान का विकल्प नहीं है।",
  },

  bn: {
    voiceRecordingDesc:
      "প্রাথমিক স্মৃতি ও চিন্তাশক্তির পরীক্ষার জন্য কণ্ঠস্বরের ছোট নমুনা রেকর্ড করা হয়।",

    privacyEncryptionDesc:
      "তথ্য আপনার ফোনে নিরাপদে রাখা হয় এবং আপনার অনুমতি ছাড়া কারও সঙ্গে শেয়ার করা হয় না।",

    screeningInstrumentDesc:
      "এই ফলাফল স্বাস্থ্য সম্পর্কে পরবর্তী পদক্ষেপের পরামর্শ দেয়; এটি চিকিৎসকের রোগ নির্ণয়ের বিকল্প নয়।",
  },

  mr: {
    voiceRecordingDesc:
      "सुरुवातीच्या संज्ञानात्मक तपासणीसाठी आवाजाचे छोटे नमुने रेकॉर्ड केले जातात.",

    privacyEncryptionDesc:
      "माहिती तुमच्या फोनमध्ये सुरक्षित ठेवली जाते आणि तुमच्या परवानगीशिवाय शेअर केली जात नाही.",

    screeningInstrumentDesc:
      "हा निकाल आरोग्यविषयक पुढील पावले सुचवतो; तो वैद्यकीय निदानाचा पर्याय नाही.",
  },

  ta: {
    voiceRecordingDesc:
      "ஆரம்பநிலை நினைவாற்றல் பரிசோதனைக்காக குரலின் சிறிய மாதிரிகள் பதிவு செய்யப்படும்.",

    privacyEncryptionDesc:
      "தகவல்கள் உங்கள் தொலைபேசியில் பாதுகாப்பாக வைக்கப்படும்; உங்கள் அனுமதியின்றி பகிரப்படாது.",

    screeningInstrumentDesc:
      "இந்த முடிவு அடுத்தகட்ட உடல்நல நடவடிக்கைகளைப் பரிந்துரைக்கும்; இது மருத்துவ நோயறிதலுக்கு மாற்றாகாது.",
  },

  te: {
    voiceRecordingDesc:
      "ప్రారంభ జ్ఞాపకశక్తి పరీక్ష కోసం వాయిస్ యొక్క చిన్న నమూనాలను రికార్డ్ చేస్తాము.",

    privacyEncryptionDesc:
      "సమాచారం మీ ఫోన్‌లో సురక్షితంగా ఉంచబడుతుంది; మీ అనుమతి లేకుండా పంచబడదు.",

    screeningInstrumentDesc:
      "ఈ ఫలితం ఆరోగ్యానికి సంబంధించిన తదుపరి చర్యలను సూచిస్తుంది; ఇది వైద్య నిర్ధారణకు ప్రత్యామ్నాయం కాదు.",
  },

  gu: {
    voiceRecordingDesc:
      "પ્રારંભિક સ્મરણશક્તિની તપાસ માટે અવાજના નાના નમૂના રેકોર્ડ કરવામાં આવે છે.",

    privacyEncryptionDesc:
      "માહિતી તમારા ફોનમાં સુરક્ષિત રાખવામાં આવે છે અને તમારી પરવાનગી વિના શેર કરવામાં આવતી નથી.",

    screeningInstrumentDesc:
      "આ પરિણામ આરોગ્ય માટેના આગળના પગલાં સૂચવે છે; તે તબીબી નિદાનનો વિકલ્પ નથી.",
  },

  kn: {
    voiceRecordingDesc:
      "ಆರಂಭಿಕ ಜ್ಞಾಪಕಶಕ್ತಿ ಪರೀಕ್ಷೆಗಾಗಿ ಧ್ವನಿಯ ಸಣ್ಣ ಮಾದರಿಗಳನ್ನು ರೆಕಾರ್ಡ್ ಮಾಡಲಾಗುತ್ತದೆ.",

    privacyEncryptionDesc:
      "ಮಾಹಿತಿಯನ್ನು ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ಇರಿಸಲಾಗುತ್ತದೆ; ನಿಮ್ಮ ಅನುಮತಿಯಿಲ್ಲದೆ ಹಂಚಲಾಗುವುದಿಲ್ಲ.",

    screeningInstrumentDesc:
      "ಈ ಫಲಿತಾಂಶವು ಆರೋಗ್ಯದ ಮುಂದಿನ ಹಂತಗಳನ್ನು ಸೂಚಿಸುತ್ತದೆ; ಇದು ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯಕ್ಕೆ ಪರ್ಯಾಯವಲ್ಲ.",
  },

  ml: {
    voiceRecordingDesc:
      "പ്രാഥമിക ഓർമ്മശക്തി പരിശോധനയ്ക്കായി ശബ്ദത്തിന്റെ ചെറിയ സാമ്പിളുകൾ റെക്കോർഡ് ചെയ്യും.",

    privacyEncryptionDesc:
      "വിവരങ്ങൾ നിങ്ങളുടെ ഫോണിൽ സുരക്ഷിതമായി സൂക്ഷിക്കും; നിങ്ങളുടെ അനുമതിയില്ലാതെ പങ്കിടില്ല.",

    screeningInstrumentDesc:
      "ഈ ഫലം ആരോഗ്യവുമായി ബന്ധപ്പെട്ട അടുത്ത നടപടികൾ നിർദ്ദേശിക്കുന്നു; ഇത് വൈദ്യപരമായ രോഗനിർണയത്തിന് പകരമല്ല.",
  },
}

const RECORDING_INDIC_TX: Record<string, Record<string, string>> = {
  hi: {
    tapMicrophone: "तैयार होने पर माइक्रोफ़ोन दबाएं",

    recordingVoice: "आवाज़ रिकॉर्ड हो रही है",
  },

  bn: {
    tapMicrophone: "প্রস্তুত হলে মাইক্রোফোনে ট্যাপ করুন",

    recordingVoice: "কণ্ঠস্বর রেকর্ড করা হচ্ছে",
  },

  mr: {
    tapMicrophone: "तयार झाल्यावर मायक्रोफोन दाबा",

    recordingVoice: "आवाज रेकॉर्ड होत आहे",
  },

  ta: {
    tapMicrophone: "தயாரானதும் ஒலிவாங்கியைத் தட்டுங்கள்",

    recordingVoice: "குரல் பதிவு செய்யப்படுகிறது",
  },

  te: {
    tapMicrophone: "సిద్ధమైనప్పుడు మైక్రోఫోన్‌ను ట్యాప్ చేయండి",

    recordingVoice: "వాయిస్ రికార్డ్ అవుతోంది",
  },

  gu: {
    tapMicrophone: "તૈયાર હો ત્યારે માઇક્રોફોન દબાવો",

    recordingVoice: "અવાજ રેકોર્ડ થઈ રહ્યો છે",
  },

  kn: {
    tapMicrophone: "ಸಿದ್ಧರಾದಾಗ ಮೈಕ್ರೋಫೋನ್ ಒತ್ತಿರಿ",

    recordingVoice: "ಧ್ವನಿ ರೆಕಾರ್ಡ್ ಆಗುತ್ತಿದೆ",
  },

  ml: {
    tapMicrophone: "തയ്യാറാകുമ്പോൾ മൈക്രോഫോണിൽ ടാപ്പ് ചെയ്യൂ",

    recordingVoice: "ശബ്ദം റെക്കോർഡ് ചെയ്യുന്നു",
  },
}

const BASE_UI_TX: Record<string, string> = {
  getStarted: "Get Started",

  listenSpeakScreen: "Listen. Speak. Screen Early.",

  chooseLanguage: "Choose your language",

  changeLanguageLater: "You can change this later.",

  listenEnglish: "Listen in English",

  continueBtn: "Continue",

  pipelineTitle: "Multilingual Pipeline Scope",

  pipelineDescription:
    "English voice screenings use the validated acoustic & linguistic feature pipeline. Indic languages currently feature live speech recognition with acoustic biomarker screening.",

  screeningTitle: "SwarSanket Voice Screening",

  screeningSubtitle: "AI-Powered Cognitive Biomarker Analysis",

  viewDetailsLabel: "View Report",

  readyWhen: "Daily Screening",
}

function t(lang: string, key: string): string {
  const locale = {
    ...TX.en,

    ...BASE_UI_TX,

    ...(TX[lang] ?? {}),

    ...(INDIC_TX[lang] ?? {}),

    ...(STATIC_INDIC_TX[lang] ?? {}),

    ...(FLOW_INDIC_TX[lang] ?? {}),

    ...(CONSENT_INDIC_TX[lang] ?? {}),

    ...(RECORDING_INDIC_TX[lang] ?? {}),
  }

  return (locale[key] ?? key).normalize("NFC")
}

const TASK_PROMPTS: Record<string, Record<RecordingContext, string>> = {
  en: {
    freeSpeech: "Tell us about your day.",

    pictureDesc:
      "Describe everything you see happening in this picture (who is there, what they are doing, and what is happening around them).",

    memoryRecall: "Cow, River, Book, House, Flower",

    conversation: "Tell us about something you enjoy doing.",
  },

  hi: {
    freeSpeech: "हमें अपने दिन के बारे में बताइए।",

    pictureDesc:
      "इस तस्वीर में जो कुछ हो रहा है, वह सब बताइए — वहाँ कौन-कौन है, वे क्या कर रहे हैं, और उनके आसपास क्या हो रहा है।",

    memoryRecall: "गाय, नदी, किताब, घर, फूल",

    conversation: "हमें बताइए कि आपको क्या करना पसंद है।",
  },

  bn: {
    freeSpeech: "আপনার আজকের দিনটি কেমন কেটেছে, সে সম্পর্কে বলুন।",

    pictureDesc:
      "এই ছবিতে যা কিছু ঘটছে সব বলুন — সেখানে কে কে আছে, তাঁরা কী করছেন, এবং তাঁদের চারপাশে কী ঘটছে।",

    memoryRecall: "গরু, নদী, বই, বাড়ি, ফুল",

    conversation: "আপনি যে কাজটি করতে ভালোবাসেন, সে সম্পর্কে বলুন।",
  },

  mr: {
    freeSpeech: "तुमचा आजचा दिवस कसा गेला, याबद्दल आम्हाला सांगा.",

    pictureDesc:
      "या चित्रात जे काही घडत आहे ते सर्व सांगा — तिथे कोण कोण आहे, ते काय करत आहेत, आणि त्यांच्या आजूबाजूला काय घडत आहे.",

    memoryRecall: "गाय, नदी, पुस्तक, घर, फूल",

    conversation: "तुम्हाला आवडणाऱ्या एखाद्या गोष्टीबद्दल आम्हाला सांगा.",
  },

  ta: {
    freeSpeech: "இன்று உங்கள் நாள் எப்படி சென்றது என்பதைப் பற்றி சொல்லுங்கள்.",

    pictureDesc:
      "இந்தப் படத்தில் நடப்பது அனைத்தையும் விவரியுங்கள் — அங்கு யார் யார் இருக்கிறார்கள், அவர்கள் என்ன செய்கிறார்கள், அவர்களைச் சுற்றி என்ன நடக்கிறது.",

    memoryRecall: "பசு, ஆறு, புத்தகம், வீடு, பூ",

    conversation: "உங்களுக்கு பிடித்த ஒரு செயலைப் பற்றி சொல்லுங்கள்.",
  },

  te: {
    freeSpeech: "ఈ రోజు మీ రోజు ఎలా గడిచిందో మాకు చెప్పండి.",

    pictureDesc:
      "ఈ చిత్రంలో జరుగుతున్నదంతా చెప్పండి — అక్కడ ఎవరెవరు ఉన్నారు, వారు ఏమి చేస్తున్నారు, వారి చుట్టూ ఏమి జరుగుతోంది.",

    memoryRecall: "ఆవు, నది, పుస్తకం, ఇల్లు, పువ్వు",

    conversation: "మీకు ఇష్టమైన ఒక పని గురించి మాకు చెప్పండి.",
  },

  gu: {
    freeSpeech: "તમારો આજનો દિવસ કેવો રહ્યો તે અમને જણાવો.",

    pictureDesc:
      "આ ચિત્રમાં જે કંઈ થઈ રહ્યું છે તે બધું જણાવો — ત્યાં કોણ કોણ છે, તેઓ શું કરી રહ્યા છે, અને તેમની આસપાસ શું થઈ રહ્યું છે.",

    memoryRecall: "ગાય, નદી, પુસ્તક, ઘર, ફૂલ",

    conversation: "તમને ગમતી કોઈ એક પ્રવૃત્તિ વિશે અમને જણાવો.",
  },

  kn: {
    freeSpeech: "ನಿಮ್ಮ ಇಂದಿನ ದಿನ ಹೇಗಿತ್ತು ಎಂಬುದನ್ನು ನಮಗೆ ತಿಳಿಸಿ.",

    pictureDesc:
      "ಈ ಚಿತ್ರದಲ್ಲಿ ನಡೆಯುತ್ತಿರುವ ಎಲ್ಲವನ್ನೂ ವಿವರಿಸಿ — ಅಲ್ಲಿ ಯಾರು ಯಾರು ಇದ್ದಾರೆ, ಅವರು ಏನು ಮಾಡುತ್ತಿದ್ದಾರೆ, ಮತ್ತು ಅವರ ಸುತ್ತಲೂ ಏನು ನಡೆಯುತ್ತಿದೆ.",

    memoryRecall: "ಹಸು, ನದಿ, ಪುಸ್ತಕ, ಮನೆ, ಹೂವು",

    conversation: "ನಿಮಗೆ ಇಷ್ಟವಾದ ಒಂದು ಕೆಲಸದ ಬಗ್ಗೆ ನಮಗೆ ತಿಳಿಸಿ.",
  },

  ml: {
    freeSpeech: "നിങ്ങളുടെ ഇന്നത്തെ ദിവസം എങ്ങനെയായിരുന്നു എന്ന് ഞങ്ങളോട് പറയൂ.",

    pictureDesc:
      "ഈ ചിത്രത്തിൽ നടക്കുന്നതെല്ലാം വിവരിക്കൂ — അവിടെ ആരൊക്കെയുണ്ട്, അവർ എന്തു ചെയ്യുന്നു, അവർക്കു ചുറ്റും എന്തു സംഭവിക്കുന്നു.",

    memoryRecall: "പശു, നദി, പുസ്തകം, വീട്, പൂവ്",

    conversation: "നിങ്ങൾക്ക് ഇഷ്ടമുള്ള ഒരു കാര്യത്തെക്കുറിച്ച് ഞങ്ങളോട് പറയൂ.",
  },
}

function getTaskPrompt(lang: string, ctx: RecordingContext): string {
  return ((TASK_PROMPTS[lang] ?? TASK_PROMPTS.en)[ctx] ?? TASK_PROMPTS.en[ctx])

    .normalize("NFC")
}

// ─── Reusable UI Components ───────────────────────────────────────────────────

/**
 * Plain-language explanations of every measurement the report can show, written
 * for the person who was recorded rather than for a clinician. Keyed by the raw
 * backend feature name so any biomarker the model surfaces has an explanation,
 * including the ones that only appear occasionally.
 *
 * Six of the twenty-two features are never measured from audio - they sit at the
 * training median for everyone - so their entries say so plainly instead of
 * implying the number describes the speaker.
 */
const PATIENT_FEATURE_HINTS: Record<string, string> = {
  // ---- Acoustic timing and voice ----
  "CTP_DPI(ms)":
    "How long your silent pauses lasted on average, in thousandths of a second. Everyone pauses to breathe and think; consistently long pauses can sometimes mean finding the next word took more effort.",
  "CTP_Hesitation Ratio":
    "The share of your recording that was silence rather than speech. Pausing is completely normal - this simply measures how much of the time you were not speaking.",
  "CTP_Energy Mean(Pa^2·s)":
    "How loud and strong your voice was overall. This mostly reflects your microphone and how close you sat to it, so it carries little on its own.",
  "CTP_RST(-/s)":
    "How many syllables you produced per second while actually speaking. It measures the physical pace of your voice, separately from how often you paused.",
  "CTP_Voiced Rate(1/s)":
    "How many words you spoke per second of actual talking time, ignoring the pauses in between.",
  "CTP_Word Rate(-/s)":
    "How quickly you spoke across the whole recording, counting the pauses. Speaking slowly is not a problem in itself - it is only one signal among many.",
  "CTP_F0 SD(st)":
    "How much your pitch rose and fell while speaking. NOT MEASURED in this version - a standard reference value is used for everyone, so it says nothing about you.",
  CTP_EST:
    "A measure of overall speech timing and pacing. NOT MEASURED in this version - a standard reference value is used for everyone, so it says nothing about you.",

  // ---- Words and grammar ----
  CTP_verb_num:
    "How many action words you used - words like washing, falling, reaching. Verbs carry the events in a description: who is doing what.",
  CTP_noun_ratio:
    'The share of your words that named people or things. Naming things specifically, rather than saying "that" or "stuff", usually means a richer description.',
  CTP_Pronouns_ratio:
    "The share of your words that were pronouns - he, she, it, they. Leaning heavily on pronouns instead of names is one pattern researchers watch, though it varies a lot between people and languages.",
  "CTP_noun to verb":
    "The balance between the things you named and the actions you described. A description usually needs both.",

  // ---- Content and information ----
  CTP_num_unique_IU:
    "How many different key elements of the picture you mentioned - the boy, the cookie jar, the overflowing water. Mentioning more of them reflects a fuller description.",
  CTP_num_unique_keywords:
    "How many different meaningful words you used in total, not counting repeats.",
  CTP_unique_IU_densitys:
    "How many key picture elements you mentioned relative to how much you said - a measure of how much you covered per word.",
  CTP_total_IU_density:
    "How often you referred to the picture's key elements across your whole description, including repeats.",
  CTP_keyword_to_non_keyword_ratio:
    'How much of your speech carried real content - naming things and actions - compared with filler words like "thing", "stuff" or "um".',
  CTP_unique_IU_efficiency:
    "How much distinct information you fitted into the words you used. Higher means you conveyed more different ideas rather than repeating yourself.",

  // ---- Sentence structure (not measured) ----
  "CTP_Noun No Phrase Rate":
    "A measure of sentence structure around the things you named. NOT MEASURED in this version - a standard reference value is used for everyone.",
  "CTP_Verb phrase type proportion":
    "A measure of how complex your sentences were around action words. NOT MEASURED in this version - a standard reference value is used for everyone.",
  "CTP_Prep phrase type proportion":
    "How often you described where things were - on, under, beside. NOT MEASURED in this version - a standard reference value is used for everyone.",
  "CTP_Prep average phrase type length 1":
    "How detailed your descriptions of position and place were. NOT MEASURED in this version - a standard reference value is used for everyone.",
}

/** Explanations for the summary numbers and section headings on the report. */
const REPORT_SECTION_HINTS = {
  protocol:
    'Which speaking task you did. "Standardized Picture Description" means you described the standard clinical picture - the task this system was built around, which gives the most comparable reading. "Conversational" means you spoke freely, which is a weaker basis for comparison.',
  informationUnits:
    "The number of key things from the picture you actually mentioned - people, objects and actions such as the boy, the cookie jar, or the water overflowing. It is counted from your transcript.",
  riskChance:
    "How closely your speech pattern resembles the patterns this model was trained on. It is NOT a prediction that you will develop Alzheimer's, and not a diagnosis. Only a doctor can say what it means for you.",
  riskBand:
    "A simple band based on the percentage: below 35% is Low, 35-60% suggests keeping an eye on it, and above 60% suggests speaking to a professional.",
  confidence:
    "How firmly the model holds its answer - not the chance of disease. It measures how far the result sits from an undecided 50/50. A result far from the middle gives high confidence, whichever direction it points.",
  uncertainty:
    "The system runs itself 30 times, each time switching off random parts of its network, and checks how much the answer moves. A small number means all 30 runs agreed. A large number means the model is unsettled and the result deserves caution.",
  transcript:
    "What the speech recognition heard, written out. Every language measurement below is calculated from this text, so occasional transcription mistakes can shift the numbers slightly.",
  sensitivity:
    "How much each part of your speech pushed the score up or down. The percentages are shares of the total influence on this one result - they are not probabilities and do not add up to your risk.",
  wordRate:
    "How quickly you spoke, in words per minute across the whole recording. Typical conversation sits roughly between 100 and 160 words per minute.",
  pauseRatio:
    "The share of the recording that was silence rather than speech, measured from the sound itself rather than from the words.",
}

/**
 * A label with an attached plain-language explanation.
 *
 * Opens on hover for a mouse and on tap for touch, because the phone view has no
 * hover at all and an explanation only reachable by hovering would be invisible to
 * exactly the people it is written for.
 */
function Hint({
  text,
  children,
  align = "left",
}: {
  text: string
  children: React.ReactNode
  align?: "left" | "right"
}) {
  const [open, setOpen] = useState(false)

  return (
    <span
      className="relative inline-flex items-start gap-1"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        aria-label="What does this mean?"
        className="inline-flex items-start gap-1 text-left cursor-help"
      >
        <span className="underline decoration-dotted decoration-slate-300 underline-offset-2">
          {children}
        </span>
        <Info className="w-3 h-3 mt-[1px] text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 top-full mt-1.5 w-60 max-w-[15rem] p-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-normal leading-relaxed shadow-xl normal-case tracking-normal ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {text}
        </span>
      )}
    </span>
  )
}

/**
 * The standardized "Cookie Theft" kitchen scene used by the clinical picture
 * description protocol. Every element here is a scorable Information Unit in the
 * backend's canonical lexicon (boy, girl, mother, cookie, jar, stool, sink, water,
 * window, curtain, dish, cupboard, floor), so describing it naturally produces the
 * in-distribution vocabulary the screening model was trained on.
 */

function CookieTheftScene() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 400 250"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="A kitchen. A boy stands on a tipping three-legged stool taking cookies from a cookie jar in an open cupboard, handing one down to a girl who reaches up for it. Beside them a mother stands at the sink washing a plate; the tap is running and water overflows the sink onto the floor. A curtained window above the sink looks onto a garden."
    >
      <rect width="400" height="250" fill="#fffdf7" />

      {/* ---- Room: wall, floor, skirting ---- */}
      <rect x="0" y="182" width="400" height="68" fill="#f0e4cf" />
      <rect x="0" y="182" width="400" height="5" fill="#b99b70" />

      {/* ================= CUPBOARD, open, cookie jar inside ================= */}
      <rect
        x="16"
        y="14"
        width="118"
        height="74"
        rx="2"
        fill="#c98f4e"
        stroke="#5d4326"
        strokeWidth="3"
      />
      <rect
        x="22"
        y="20"
        width="106"
        height="62"
        fill="#f5e6cf"
        stroke="#5d4326"
        strokeWidth="2"
      />
      <path
        d="M16 14 L-4 4 L-4 96 L16 88 Z"
        fill="#b57f42"
        stroke="#5d4326"
        strokeWidth="3"
      />
      <line
        x1="22"
        y1="56"
        x2="128"
        y2="56"
        stroke="#5d4326"
        strokeWidth="2.5"
      />

      {/* cookie jar, lid tilted off, cookies visible inside */}
      <path
        d="M58 30 q18 -5 36 0 l4 24 q-22 6 -44 0 z"
        fill="#eaf3f7"
        stroke="#5d4326"
        strokeWidth="2.5"
      />
      <ellipse
        cx="76"
        cy="30"
        rx="19"
        ry="5"
        fill="#dceaf1"
        stroke="#5d4326"
        strokeWidth="2.5"
      />
      <path
        d="M96 20 q14 -3 20 4 q-8 6 -20 3 z"
        fill="#c98f4e"
        stroke="#5d4326"
        strokeWidth="2.5"
      />
      <circle
        cx="68"
        cy="42"
        r="5"
        fill="#c98f4e"
        stroke="#5d4326"
        strokeWidth="1.8"
      />
      <circle
        cx="83"
        cy="45"
        r="5"
        fill="#c98f4e"
        stroke="#5d4326"
        strokeWidth="1.8"
      />
      <circle cx="66.5" cy="41" r="1" fill="#5d4326" />
      <circle cx="70" cy="44" r="1" fill="#5d4326" />
      <circle cx="82" cy="44" r="1" fill="#5d4326" />

      {/* a cookie already dropped on the floor */}
      <circle
        cx="120"
        cy="176"
        r="6"
        fill="#c98f4e"
        stroke="#5d4326"
        strokeWidth="1.8"
      />
      <circle cx="118" cy="175" r="1.1" fill="#5d4326" />
      <circle cx="122" cy="178" r="1.1" fill="#5d4326" />

      {/* ================= TIPPING THREE-LEGGED STOOL ================= */}
      <g transform="rotate(-16 92 168)">
        <rect
          x="60"
          y="128"
          width="66"
          height="10"
          rx="3"
          fill="#d8a566"
          stroke="#5d4326"
          strokeWidth="3"
        />
        <line
          x1="68"
          y1="138"
          x2="60"
          y2="180"
          stroke="#5d4326"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="118"
          y1="138"
          x2="126"
          y2="180"
          stroke="#5d4326"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="93"
          y1="138"
          x2="93"
          y2="180"
          stroke="#5d4326"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="64"
          y1="160"
          x2="122"
          y2="160"
          stroke="#5d4326"
          strokeWidth="3.5"
        />
      </g>

      {/* ================= BOY ================= */}
      <circle
        cx="86"
        cy="98"
        r="15"
        fill="#f7dcc0"
        stroke="#4a4038"
        strokeWidth="2.5"
      />
      <path
        d="M71 94 q15 -19 30 -2 q-4 -11 -15 -11 q-12 0 -15 13 z"
        fill="#4a3423"
      />
      <circle cx="81" cy="99" r="1.7" fill="#4a4038" />
      <circle cx="92" cy="99" r="1.7" fill="#4a4038" />
      <path
        d="M82 106 q4 3 8 0"
        stroke="#4a4038"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M72 118 q14 -8 28 0 l3 30 l-34 0 z"
        fill="#5fa8d3"
        stroke="#4a4038"
        strokeWidth="2.5"
      />
      <path
        d="M75 120 q-12 -30 5 -48"
        stroke="#f7dcc0"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M75 120 q-12 -30 5 -48"
        stroke="#4a4038"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M100 124 q22 8 32 22"
        stroke="#f7dcc0"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M100 124 q22 8 32 22"
        stroke="#4a4038"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle
        cx="134"
        cy="148"
        r="6"
        fill="#c98f4e"
        stroke="#5d4326"
        strokeWidth="2"
      />
      <path
        d="M69 148 l34 0 l-2 14 l-30 0 z"
        fill="#3f6f96"
        stroke="#4a4038"
        strokeWidth="2.5"
      />
      <line
        x1="78"
        y1="162"
        x2="74"
        y2="182"
        stroke="#f7dcc0"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="94"
        y1="162"
        x2="98"
        y2="182"
        stroke="#f7dcc0"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* ================= GIRL reaching up ================= */}
      <circle
        cx="158"
        cy="132"
        r="14"
        fill="#f7dcc0"
        stroke="#4a4038"
        strokeWidth="2.5"
      />
      <path
        d="M144 130 q14 -20 28 -2 q3 16 -2 22 q3 -20 -12 -21 q-14 -1 -14 1 z"
        fill="#7a4a22"
      />
      <path
        d="M172 140 q8 10 4 22"
        stroke="#7a4a22"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="153" cy="133" r="1.7" fill="#4a4038" />
      <circle cx="164" cy="133" r="1.7" fill="#4a4038" />
      <path
        d="M154 140 q4 3 8 0"
        stroke="#4a4038"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M145 150 q13 -8 26 0 l7 32 l-40 0 z"
        fill="#ef9bb8"
        stroke="#4a4038"
        strokeWidth="2.5"
      />
      <path
        d="M148 152 q-8 -14 -12 -20"
        stroke="#f7dcc0"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M148 152 q-8 -14 -12 -20"
        stroke="#4a4038"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M172 154 q10 6 12 16"
        stroke="#f7dcc0"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      <line
        x1="152"
        y1="182"
        x2="152"
        y2="190"
        stroke="#f7dcc0"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="168"
        y1="182"
        x2="168"
        y2="190"
        stroke="#f7dcc0"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* ================= WINDOW, curtains, garden ================= */}
      <rect
        x="264"
        y="20"
        width="104"
        height="72"
        rx="2"
        fill="#cdeaf8"
        stroke="#5d4326"
        strokeWidth="3"
      />
      <line
        x1="316"
        y1="20"
        x2="316"
        y2="92"
        stroke="#5d4326"
        strokeWidth="2.5"
      />
      <line
        x1="264"
        y1="56"
        x2="368"
        y2="56"
        stroke="#5d4326"
        strokeWidth="2.5"
      />
      <rect x="266" y="76" width="100" height="14" fill="#8fce8f" />
      <line
        x1="330"
        y1="66"
        x2="330"
        y2="78"
        stroke="#7a4a22"
        strokeWidth="4"
      />
      <circle cx="330" cy="60" r="11" fill="#5fae5f" />
      <ellipse cx="285" cy="80" rx="12" ry="7" fill="#5fae5f" />
      <path
        d="M252 12 q16 40 0 86 l16 0 q-9 -44 0 -86 z"
        fill="#e4746f"
        stroke="#8f3f3c"
        strokeWidth="2"
      />
      <path
        d="M380 12 q-16 40 0 86 l-16 0 q9 -44 0 -86 z"
        fill="#e4746f"
        stroke="#8f3f3c"
        strokeWidth="2"
      />
      <rect x="248" y="8" width="136" height="7" rx="3" fill="#5d4326" />

      {/* ================= SINK, RUNNING TAP, OVERFLOW ================= */}
      <rect
        x="236"
        y="120"
        width="150"
        height="12"
        rx="2"
        fill="#d9c3a0"
        stroke="#5d4326"
        strokeWidth="2.5"
      />
      <rect
        x="272"
        y="126"
        width="82"
        height="34"
        rx="3"
        fill="#e9f1f5"
        stroke="#5d4326"
        strokeWidth="3"
      />
      <path
        d="M300 106 q0 -14 16 -14 q14 0 14 12"
        stroke="#5d4326"
        strokeWidth="4"
        fill="none"
      />
      <line
        x1="330"
        y1="104"
        x2="330"
        y2="118"
        stroke="#5d4326"
        strokeWidth="4"
      />
      <path
        d="M330 118 l0 12"
        stroke="#63b6e0"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="275" y="129" width="76" height="9" rx="3" fill="#9ed4ef" />
      <path
        d="M276 138 q-14 18 -18 44"
        stroke="#63b6e0"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M286 140 q-10 20 -10 42"
        stroke="#9ed4ef"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="262" cy="196" rx="46" ry="10" fill="#9ed4ef" />
      <ellipse cx="240" cy="204" rx="24" ry="6" fill="#c3e5f5" />

      {/* dishes drying on the counter */}
      <ellipse
        cx="368"
        cy="116"
        rx="14"
        ry="5"
        fill="#f4f8fa"
        stroke="#5d4326"
        strokeWidth="2"
      />
      <ellipse
        cx="368"
        cy="110"
        rx="11"
        ry="4"
        fill="#f4f8fa"
        stroke="#5d4326"
        strokeWidth="2"
      />

      {/* ================= MOTHER at the sink ================= */}
      <circle
        cx="228"
        cy="96"
        r="15"
        fill="#f7dcc0"
        stroke="#4a4038"
        strokeWidth="2.5"
      />
      <path
        d="M213 92 q15 -20 30 -2 q2 -16 -15 -16 q-16 0 -15 18 z"
        fill="#5b3a1e"
      />
      <circle
        cx="243"
        cy="84"
        r="8"
        fill="#5b3a1e"
        stroke="#4a4038"
        strokeWidth="1.5"
      />
      <circle cx="223" cy="97" r="1.7" fill="#4a4038" />
      <circle cx="234" cy="97" r="1.7" fill="#4a4038" />
      <path
        d="M212 118 q16 -9 32 0 l5 64 l-42 0 z"
        fill="#8fbf9f"
        stroke="#4a4038"
        strokeWidth="2.5"
      />
      <path
        d="M220 122 l16 0 l4 46 l-24 0 z"
        fill="#f7f2e4"
        stroke="#4a4038"
        strokeWidth="2"
      />
      <path
        d="M244 126 q26 4 34 12"
        stroke="#f7dcc0"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M244 126 q26 4 34 12"
        stroke="#4a4038"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle
        cx="286"
        cy="140"
        r="10"
        fill="#f4f8fa"
        stroke="#5d4326"
        strokeWidth="2.5"
      />
      <path
        d="M212 128 q-10 10 -8 22"
        stroke="#f7dcc0"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="219" cy="186" rx="9" ry="4.5" fill="#4a4038" />
      <ellipse cx="240" cy="186" rx="9" ry="4.5" fill="#4a4038" />
    </svg>
  )
}

/**
 * Which protocol the recording was actually scored under. The backend reports
 * "canonical" when the utterance matched the standardized picture-description
 * Information Unit lexicon, and "proxy" when it was scored as free conversation.
 * The distinction matters clinically: the model was trained on picture
 * descriptions, so a proxy-mode result is the weaker of the two.
 */

function protocolLabel(result: ScreeningApiResponse | null): string {
  return result?.feature_calibration?.iu_scoring_mode === "canonical"
    ? "Standardized Picture Description"
    : "Conversational Voice Check"
}

/**
 * Protocol provenance plus the honest uncertainty pair: the confidence the model
 * reports, and the Monte Carlo Dropout spread behind it. Showing confidence alone
 * would hide how unsettled the 30 stochastic passes actually were.
 */

function ScreeningQualityCard({
  result,

  tone = "neutral",
}: {
  result: ScreeningApiResponse | null

  tone?: "low" | "elevated" | "neutral"
}) {
  const canonical = result?.feature_calibration?.iu_scoring_mode === "canonical"

  const clampedCount =
    result?.feature_calibration?.clamped_features?.length ?? 0

  const lc = result?.language_calibration

  const accent =
    tone === "low"
      ? "text-emerald-700"
      : tone === "elevated"
        ? "text-amber-700"
        : "text-[#02738a]"

  return (
    <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-2.5 text-left">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <Hint text={REPORT_SECTION_HINTS.protocol}>Screening Protocol</Hint>
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            canonical
              ? "bg-[#e4f4f7] text-[#015364] border-[#cbe6ed]"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {canonical ? "Canonical Mode" : "Proxy Mode"}
        </span>
      </div>

      <div className="text-xs font-bold text-slate-800">
        {protocolLabel(result)}
      </div>

      {!canonical && (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Scored as conversational speech. A standardized picture description
          gives the model the task vocabulary it was trained on.
        </p>
      )}

      {canonical &&
        (result?.feature_calibration?.matched_information_units?.length ?? 0) >
          0 && (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <Hint text={REPORT_SECTION_HINTS.informationUnits}>
              {result?.feature_calibration?.matched_information_units.length}{" "}
              information units recognised in the description.
            </Hint>
          </p>
        )}

      {/* Alzheimer's Risk Chance */}
      {(() => {
        const rawProb =
          result?.screening.probability_percent !== undefined &&
          result?.screening.probability_percent !== null
            ? result.screening.probability_percent
            : result?.screening.probability !== null &&
                result?.screening.probability !== undefined
              ? result.screening.probability * 100
              : tone === "elevated"
                ? 78.4
                : 7.1

        const isElevated = rawProb >= 50

        const isModerate = rawProb >= 35 && rawProb < 50

        return (
          <div className="pt-2.5 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  <Hint text={REPORT_SECTION_HINTS.riskChance}>
                    Alzheimer's Screening Risk Chance
                  </Hint>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Biomarker screening probability
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-lg font-extrabold ${
                    isElevated
                      ? "text-amber-800"
                      : isModerate
                        ? "text-yellow-700"
                        : "text-emerald-700"
                  }`}
                >
                  {rawProb.toFixed(1)}%
                </div>
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isElevated
                      ? "bg-amber-100 text-amber-800"
                      : isModerate
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isElevated
                    ? "Elevated Risk Signal"
                    : isModerate
                      ? "Moderate / Monitoring"
                      : "Low Risk Signal"}
                </span>
              </div>
            </div>

            {/* Visual Risk Gauge Meter */}
            <div className="w-full space-y-1">
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isElevated
                      ? "bg-gradient-to-r from-amber-500 to-rose-600"
                      : isModerate
                        ? "bg-gradient-to-r from-emerald-400 to-amber-400"
                        : "bg-gradient-to-r from-emerald-400 to-[#02738a]"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(3, rawProb))}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                <span>0% (Low Risk)</span>
                <span>35% (Monitor)</span>
                <span>100% (High Concern)</span>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            <Hint text={REPORT_SECTION_HINTS.confidence}>Model Confidence</Hint>
          </div>
          <div className={`text-sm font-bold ${accent}`}>
            {result
              ? `${result.screening.technical_confidence_percent.toFixed(1)}%`
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            <Hint text={REPORT_SECTION_HINTS.uncertainty} align="right">
              Epistemic Uncertainty
            </Hint>
          </div>
          <div className="text-sm font-bold text-slate-700">
            {result ? `±${result.screening.uncertainty_std.toFixed(2)}` : "—"}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Uncertainty is the spread across{" "}
        {result?.screening.quantum_specs?.mc_dropout_passes ?? 30} Monte Carlo
        Dropout passes. A wider spread means the model is less settled on this
        recording.
      </p>

      {lc && !lc.is_calibrated && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[10px] text-rose-800 leading-relaxed">
          <span className="font-bold">
            No risk level is shown for this recording.
          </span>{" "}
          This model learned its language features from Chinese speech, where
          pronouns and word counts behave differently. Until a reference profile
          for {lc.language.toUpperCase()} is built, scoring across languages
          would bias the result, so the number is withheld rather than guessed.
        </div>
      )}

      {lc?.is_calibrated && lc.profile_quality !== "validated" && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 leading-relaxed">
          <span className="font-bold">Provisional language calibration.</span>{" "}
          Adjusted for {lc.language.toUpperCase()} speech using a reference
          built from {lc.profile_sample_size ?? "a small number of"} recordings.
          That sample is not clinically validated, so treat this result as
          exploratory.
        </div>
      )}

      {clampedCount > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 leading-relaxed">
          <span className="font-bold">
            {clampedCount} of 22 biomarkers fell outside the training range
          </span>{" "}
          and were held at the boundary before scoring. Treat this result as
          lower quality than the confidence figure alone suggests.
        </div>
      )}
    </div>
  )
}

/**
 * Clinical picture-description task card. Shown wherever the patient needs the
 * scene in front of them: the instruction screen, the live recording screen, and
 * the dedicated picture task screen.
 */

function PictureTaskCard({
  lang,

  compact = false,
}: {
  lang: LanguageCode

  compact?: boolean
}) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#015364] bg-[#e4f4f7] px-2.5 py-1 rounded-full border border-[#cbe6ed]">
          {t(lang, "clinicalProtocolTag")}
        </span>
      </div>

      <div
        className={`w-full ${
          compact ? "h-32" : "h-48"
        } rounded-3xl bg-white border border-[#d7eaef] overflow-hidden shadow-inner`}
      >
        <CookieTheftScene />
      </div>

      {!compact && (
        <div className="p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs">
          <p
            className="text-sm font-medium text-[#0c1e27] leading-relaxed text-center"
            style={{ fontFamily: F.body }}
          >
            {getTaskPrompt(lang, "pictureDesc")}
          </p>
        </div>
      )}
    </div>
  )
}

function StatusBar({ light = false }: { light?: boolean }) {
  const col = light ? "rgba(255,255,255,0.88)" : "#0c1e27"

  return (
    <div
      className="h-11 px-6 flex items-center justify-between flex-shrink-0 select-none"
      style={{ fontFamily: F.body }}
    >
      <span className="text-xs font-bold tracking-tight" style={{ color: col }}>
        9:41
      </span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill={col}>
          <rect x="0" y="6" width="3" height="5" rx="0.5" opacity="0.4" />
          <rect x="4.5" y="4" width="3" height="7" rx="0.5" opacity="0.6" />
          <rect x="9" y="2" width="3" height="9" rx="0.5" opacity="0.8" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill={col}>
          <path
            d="M7.5 2.5C9.8 2.5 11.8 3.5 13.2 5L14.5 3.7C12.7 1.9 10.2 0.8 7.5 0.8C4.8 0.8 2.3 1.9 0.5 3.7L1.8 5C3.2 3.5 5.2 2.5 7.5 2.5Z"
            opacity="0.4"
          />
          <path
            d="M7.5 5.2C9 5.2 10.4 5.8 11.4 6.8L12.7 5.5C11.3 4.2 9.5 3.4 7.5 3.4S3.7 4.2 2.3 5.5L3.6 6.8C4.6 5.8 6 5.2 7.5 5.2Z"
            opacity="0.75"
          />
          <circle cx="7.5" cy="9.5" r="1.5" />
        </svg>
        <svg width="25" height="11" viewBox="0 0 25 11" fill={col}>
          <rect
            x="0.5"
            y="0.5"
            width="20"
            height="10"
            rx="2.5"
            stroke={col}
            strokeWidth="1"
            fill="none"
            opacity="0.4"
          />
          <rect x="2" y="2" width="15" height="7" rx="1.5" />
          <path d="M21.5 3.5v4a2 2 0 000-4z" opacity="0.5" />
        </svg>
      </div>
    </div>
  )
}

function HomeIndicator() {
  return (
    <div className="flex justify-center pb-2 pt-1 flex-shrink-0">
      <div className="w-32 h-1 rounded-full bg-slate-300" />
    </div>
  )
}

function NVLogo({
  size = 40,

  className = "",
}: {
  size?: number

  className?: string
}) {
  return (
    <img
      src="/logo.jpeg"
      alt="SwarSanket Logo"
      className={`rounded-none shadow-sm object-contain flex-shrink-0 transition-transform hover:scale-105 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

function Btn({
  label,

  onClick,

  variant = "primary",

  size = "lg",

  disabled,

  icon,
}: {
  label: string

  onClick: () => void

  variant?: "primary" | "ghost" | "danger" | "secondary"

  size?: "lg" | "sm"

  disabled?: boolean

  icon?: React.ReactNode
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-[#02738a] via-[#027d95] to-[#01586a] hover:from-[#02849f] hover:to-[#01687d] text-white shadow-lg shadow-[#02738a]/25",

    secondary:
      "bg-[#e4f4f7] text-[#01586a] border border-[#c2e7ef] hover:bg-[#d5eff5]",

    ghost:
      "bg-white/80 text-[#02738a] border-2 border-[#02738a] hover:bg-[#e4f4f7]",

    danger:
      "bg-rose-50 text-rose-700 border-2 border-rose-200 hover:bg-rose-100",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${styles[variant]} ${
        size === "lg" ? "py-4 px-6 text-base sm:text-lg" : "py-2.5 px-4 text-sm"
      }`}
      style={{ fontFamily: F.display }}
    >
      {icon}
      {label}
    </button>
  )
}

function AudioBtn({
  label,

  textToSpeak,

  lang,
}: {
  label?: string

  textToSpeak?: string

  lang?: string
}) {
  const [speaking, setSpeaking] = useState(false)

  const currentLang = lang || "en"

  const lbl = label ?? "Listen"

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (speaking) {
      stopSpeech()

      setSpeaking(false)
    } else {
      const text = textToSpeak || lbl

      speakText(
        text,

        currentLang,

        () => setSpeaking(true),

        () => setSpeaking(false),
      )
    }
  }

  return (
    <button
      onClick={handleSpeak}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#f0f9fb] to-[#e4f4f7] border border-[#cbe6ec] hover:border-[#02738a] hover:bg-[#dcf1f6] text-[#01586a] transition-all active:scale-95 shadow-xs"
      style={{ fontFamily: F.body }}
    >
      <Volume2
        className={`w-4 h-4 text-[#02738a] ${speaking ? "animate-pulse" : ""}`}
      />
      <span>{speaking ? "Speaking…" : lbl}</span>
    </button>
  )
}

function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="w-10 h-10 rounded-2xl bg-white border border-[#d7eaef] flex items-center justify-center text-[#30434f] hover:text-[#0c1e27] hover:bg-slate-50 hover:border-[#02738a] transition-all active:scale-90 shadow-xs"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}

function OfflinePill() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
      <WifiOff className="w-3.5 h-3.5 text-amber-600" />
      <span>Offline</span>
    </div>
  )
}

function BottomNav({
  active,

  navigate,

  lang,
}: {
  active: Screen

  navigate: (s: Screen) => void

  lang: string
}) {
  const isHistory = active === "history" || active === "trend"

  const tabs = [
    { id: "home" as Screen, labelKey: "home", icon: HomeIcon },

    { id: "history" as Screen, labelKey: "history", icon: HistoryIcon },

    { id: "settings" as Screen, labelKey: "profile", icon: User },
  ]

  return (
    <div className="flex items-center justify-around border-t border-[#d8ebef] bg-white/95 backdrop-blur-md px-3 py-2 flex-shrink-0 shadow-[0_-4px_16px_rgba(2,115,138,0.04)]">
      {tabs.map((tab) => {
        const on = tab.id === active || (tab.id === "history" && isHistory)

        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-200 active:scale-95 ${
              on
                ? "bg-gradient-to-r from-[#e3f4f7] to-[#d5eef3] text-[#01586a] font-bold shadow-xs ring-1 ring-[#02738a]/15"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/80"
            }`}
          >
            <Icon
              className={`w-5 h-5 transition-transform ${
                on ? "text-[#02738a] scale-105" : "text-slate-400"
              }`}
            />
            <span
              className={`text-xs tracking-tight ${
                on ? "font-bold text-[#01586a]" : "font-medium"
              }`}
              style={{ fontFamily: F.display }}
            >
              {t(lang, tab.labelKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface CheckProgressProps {
  step: number

  total: number
}

function CheckProgress({ step, total }: CheckProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: i === step ? 28 : 8,

            background: i <= step ? C.primary : C.border,
          }}
        />
      ))}
    </div>
  )
}

function CheckHeader({
  step,

  total,

  onBack,

  onExit,
}: {
  step: number

  total: number

  onBack: () => void

  onExit: () => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#d7eaef] bg-white/95 backdrop-blur flex-shrink-0">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <CheckProgress step={step} total={total} />
      <button
        onClick={onExit}
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function ExitModal({
  lang,

  onContinue,

  onExit,
}: {
  lang: string

  onContinue: () => void

  onExit: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full p-6 rounded-t-3xl bg-white space-y-4 shadow-2xl border-t border-[#d7eaef]">
        <div className="w-12 h-1 rounded-full bg-slate-300 mx-auto" />
        <h2
          className="text-xl font-bold text-center text-slate-900"
          style={{ fontFamily: F.display }}
        >
          {t(lang, "leaveTitle")}
        </h2>
        <p
          className="text-sm text-center text-slate-500 leading-relaxed"
          style={{ fontFamily: F.body }}
        >
          {t(lang, "leaveSub")}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Btn label={t(lang, "continueCheck")} onClick={onContinue} />
          <Btn label={t(lang, "exit")} onClick={onExit} variant="ghost" />
        </div>
        <HomeIndicator />
      </div>
    </div>
  )
}

function DynamicWaveformBars({
  active,

  level = 0.3,

  bars = 24,
}: {
  active: boolean

  level?: number

  bars?: number
}) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-14">
      {Array.from({ length: bars }).map((_, i) => {
        const heightMultiplier = active
          ? 0.3 + 0.7 * Math.sin((i / bars) * Math.PI) * (0.4 + level * 0.8)
          : 0.2

        const barHeight = Math.max(6, Math.min(48, heightMultiplier * 48))

        return (
          <div
            key={i}
            className="w-1.5 rounded-full bg-[#02738a] transition-all duration-75"
            style={{
              height: barHeight,

              opacity: active ? 0.7 + 0.3 * Math.sin(i) : 0.3,
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Main Application Component ───────────────────────────────────────────────

function SwarSanketApp({
  authenticatedName,

  onLogout,
}: {
  authenticatedName: string

  onLogout: () => void
}) {
  // Restored once, synchronously, so the very first render is already the right

  // screen and the splash never flashes past on a reload.

  const restoredSession = useRef(loadSession()).current

  const [screen, setScreen] = useState<Screen>(
    restoredSession?.screen ?? "splash",
  )

  const [lang, setLang] = useState<LanguageCode>(restoredSession?.lang ?? "en")

  const [userName, setUserName] = useState<string>(
    restoredSession?.userName || authenticatedName || "Rama Devi",
  )

  const [userAge, setUserAge] = useState<number>(restoredSession?.userAge || 72)

  const [ageInput, setAgeInput] = useState<string>(
    String(restoredSession?.userAge || 72),
  )

  const [assistedMode, setAssistedMode] = useState<boolean>(
    restoredSession?.assistedMode ?? false,
  )

  const [isOffline, setIsOffline] = useState<boolean>(false)

  // Picture description is the primary clinical protocol: it is the task the

  // screening model was trained on, and it elicits the canonical Information Unit

  // vocabulary the backend scores against.

  const [recordingContext, setRecordingContext] = useState<RecordingContext>(
    restoredSession?.recordingContext ?? "pictureDesc",
  )

  const [lastResult, setLastResult] = useState<ScreeningRisk | null>(
    restoredSession?.lastResult ?? "elevated",
  )

  const [fullScreenMode, setFullScreenMode] = useState<boolean>(false)

  const [showApkModal, setShowApkModal] = useState<boolean>(false)

  const [screeningsList, setScreeningsList] = useState<ScreeningSession[]>([])

  const [syncQueue, setSyncQueue] = useState<OfflineSyncItem[]>([])

  const [vqState, setVqState] = useState<VoiceQualityGrade>("good")

  const [selectedPatient, setSelectedPatient] = useState<string>("Rama Devi")

  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>("")

  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null)

  const audioBlobRef = useRef<Blob | null>(null)

  // Functional Profile & Settings state

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false)

  const [editName, setEditName] = useState<string>("Rama Devi")

  const [editAge, setEditAge] = useState<string>("72")

  const [caregiverName, setCaregiverName] =
    useState<string>("Ramesh Kumar (Son)")

  const [caregiverPhone, setCaregiverPhone] =
    useState<string>("+91 98765 43210")

  const [caregiverAlerts, setCaregiverAlerts] = useState<boolean>(true)

  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(true)

  const [reminderFreq, setReminderFreq] = useState<"monthly" | "biweekly">(
    "monthly",
  )

  const [ttsSpeed, setTtsSpeed] = useState<"normal" | "slow">("slow")

  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false)

  const [settingsToast, setSettingsToast] = useState<string | null>(null)

  const [isTestingAudio, setIsTestingAudio] = useState<boolean>(false)

  // Real ML Screening state

  const [screeningApiResult, setScreeningApiResult] =
    useState<ScreeningApiResponse | null>(
      restoredSession?.screeningApiResult ?? null,
    )

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)

  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [detailedReportFocus, setDetailedReportFocus] =
    useState<"doctor" | "clinical">("clinical")

  const [sessionToDelete, setSessionToDelete] =
    useState<ScreeningSession | null>(null)

  const [isDeletingSession, setIsDeletingSession] = useState<boolean>(false)

  const [historyToast, setHistoryToast] = useState<string | null>(null)

  const [selectedScreeningId, setSelectedScreeningId] = useState<string | null>(
    null,
  )

  const [analysisStep, setAnalysisStep] =
    useState<"idle" | "uploading" | "analyzing" | "complete">("idle")

  // Backend API URL & Health state (Android & Web dynamic configuration)

  const [currentApiUrl, setCurrentApiUrl] = useState<string>(getApiBaseUrl())

  const [customApiUrlInput, setCustomApiUrlInput] = useState<string>(
    getApiBaseUrl(),
  )

  const [apiHealth, setApiHealth] = useState<BackendHealthStatus | null>(null)

  const [isTestingApi, setIsTestingApi] = useState<boolean>(false)

  const [showApiSettings, setShowApiSettings] = useState<boolean>(false)

  // Recorder state

  const recorderRef = useRef<VoiceRecorder>(new VoiceRecorder())

  const [micLevel, setMicLevel] = useState<number>(0.2)

  const [recordingSecs, setRecordingSecs] = useState<number>(0)

  const [isRecording, setIsRecording] = useState<boolean>(false)

  const [isPaused, setIsPaused] = useState<boolean>(false)

  // Recording seconds interval

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (isRecording && !isPaused) {
      timer = setInterval(() => {
        setRecordingSecs((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isRecording, isPaused])

  // Load IndexedDB and probe Backend Health on start

  useEffect(() => {
    async function init() {
      await seedInitialDemoData()

      const screenings = await getAllScreenings()

      setScreeningsList(screenings)

      const queue = await getOfflineQueue()

      setSyncQueue(queue)

      // Probe backend connectivity in background

      try {
        const health = await checkBackendHealth()

        setApiHealth(health)
      } catch {
        // quiet fail on init
      }
    }

    init()
  }, [])

  const handleTestApi = async (target?: string) => {
    setIsTestingApi(true)

    const toTest = target || customApiUrlInput

    const res = await checkBackendHealth(toTest)

    setApiHealth(res)

    setIsTestingApi(false)
  }

  const handleApplyApiUrl = (newUrl: string) => {
    const saved = setApiBaseUrl(newUrl)

    setCurrentApiUrl(saved)

    setCustomApiUrlInput(saved)

    handleTestApi(saved)
  }

  const handleResetApi = () => {
    resetApiBaseUrl()

    const def = getApiBaseUrl()

    setCurrentApiUrl(def)

    setCustomApiUrlInput(def)

    handleTestApi(def)
  }

  const handleDeleteSession = async (session: ScreeningSession) => {
    setIsDeletingSession(true)
    try {
      await deleteScreeningSession(session.id)
      setScreeningsList((prev) => prev.filter((s) => s.id !== session.id))
      setSessionToDelete(null)
      setHistoryToast("Report deleted successfully")
      setTimeout(() => setHistoryToast(null), 3000)
      if (screen === "screeningDetails") {
        navigate("history")
      }
    } catch (err) {
      console.error("Failed to delete screening session:", err)
      setHistoryToast("Failed to delete report")
      setTimeout(() => setHistoryToast(null), 3000)
    } finally {
      setIsDeletingSession(false)
    }
  }

  const navigate = (s: Screen) => {
    stopSpeech()

    setScreen(s)
  }

  // Mirror the screen and the state it needs into storage on every change, so a

  // reload - including Vite reloading the page mid-demo - resumes where the user

  // was instead of dropping them back at the splash screen.

  useEffect(() => {
    saveSession({
      screen,

      lang,

      recordingContext,

      lastResult,

      screeningApiResult,

      userName,

      userAge,

      assistedMode,
    })
  }, [
    screen,

    lang,

    recordingContext,

    lastResult,

    screeningApiResult,

    userName,

    userAge,

    assistedMode,
  ])

  const handleStartRecording = async () => {
    setIsRecording(true)

    setIsPaused(false)

    setRecordingSecs(0)

    await recorderRef.current.start((level) => {
      setMicLevel(level)
    })
  }

  const handlePauseRecording = () => {
    if (isPaused) {
      recorderRef.current.resume()

      setIsPaused(false)
    } else {
      recorderRef.current.pause()

      setIsPaused(true)
    }
  }

  const handleFinishRecording = async (
    nextScreen: Screen = "recordingReview",
  ) => {
    setIsRecording(false)

    setIsPaused(false)

    try {
      const res: AudioRecordingResult = await recorderRef.current.stop()

      setCurrentAudioUrl(res.audioUrl)

      setCurrentAudioBlob(res.blob)

      audioBlobRef.current = res.blob

      setVqState(res.quality)

      // Log the exact recording details: MIME type, file size in bytes, duration, and object URL

      console.log("[SwarSanket] Real audio recording captured successfully:", {
        mimeType: res.blob.type,

        sizeBytes: res.blob.size,

        duration: `${res.durationSeconds}s`,

        objectUrl: res.audioUrl,
      })

      // Retain globally so it can be accessed anywhere (backend upload, debugging, etc.)

      if (typeof window !== "undefined") {
        ;(window as unknown as {
          __lastRecordedVoiceBlob?: Blob

          __lastAudioRecording?: AudioRecordingResult

          getAudioBlobForUpload?: () => Blob | null
        }).__lastRecordedVoiceBlob = res.blob
        ;(window as unknown as {
          __lastRecordedVoiceBlob?: Blob

          __lastAudioRecording?: AudioRecordingResult

          getAudioBlobForUpload?: () => Blob | null
        }).__lastAudioRecording = res
        ;(window as unknown as {
          __lastRecordedVoiceBlob?: Blob

          __lastAudioRecording?: AudioRecordingResult

          getAudioBlobForUpload?: () => Blob | null
        }).getAudioBlobForUpload = () => audioBlobRef.current
      }

      if (isOffline) {
        navigate("offlineSaved")

        return
      }

      if (res.quality === "poor" || res.quality === "low") {
        navigate("voiceQuality")
      } else {
        navigate(nextScreen)
      }
    } catch (err) {
      console.error("[SwarSanket] handleFinishRecording error:", err)
    }
  }

  const handleRunRealScreening = useCallback(async () => {
    const audioBlob =
      audioBlobRef.current || currentAudioBlob || getLastRecordedAudioBlob()

    if (!audioBlob || audioBlob.size < 1000) {
      console.warn(
        "[SwarSanket] Recorded audio Blob is empty or too short:",

        audioBlob?.size,
      )

      setAnalysisError(
        "Recording is too short or quiet. Please record for at least 3-5 seconds speaking clearly into the microphone.",
      )

      setIsAnalyzing(false)

      setAnalysisStep("idle")

      return
    }

    if (isOffline) {
      console.log(
        "[SwarSanket] Offline mode active, queuing recording for later sync.",
      )

      handleSaveCompletedSession("uncertain")

      navigate("offlineSaved")

      return
    }

    setIsAnalyzing(true)

    setAnalysisError(null)

    setAnalysisStep("uploading")

    console.log("[SwarSanket] Recording complete")

    console.log("[SwarSanket] Audio size:", audioBlob.size, "bytes")

    console.log("[SwarSanket] Sending audio for analysis to backend...")

    try {
      setAnalysisStep("analyzing")

      let apiResult = await analyzeAudioWithBackend(
        audioBlob,

        "voice_check.webm",
      )

      console.log("[SwarSanket] Analysis complete")

      console.log(
        "[SwarSanket] Predicted class:",

        apiResult.screening.predicted_class,
      )

      console.log(
        "[SwarSanket] Screening probability:",

        apiResult.screening.probability,
      )

      console.log(
        "[SwarSanket] Technical confidence:",

        apiResult.screening.technical_confidence_percent + "%",
      )

      if (apiResult.explanation) {
        console.log(
          "[SwarSanket] Top positive SHAP:",

          apiResult.explanation.top_positive_contributions,
        )

        console.log(
          "[SwarSanket] Top negative SHAP:",

          apiResult.explanation.top_negative_contributions,
        )
      }

      // TEMPORARY DEMO OVERRIDE - rewrites the outcome when a side of the CTA armed

      // one. Leaves the real result untouched when nothing is armed.

      const demoOutcome = consumeDemoOutcome()

      if (demoOutcome) {
        apiResult = applyDemoOverride(demoOutcome, apiResult)
      }

      setScreeningApiResult(apiResult)

      setAnalysisStep("complete")

      // Too little speech to estimate the ratio features from. Ask for more rather

      // than presenting a number built on a sample that cannot support one.

      if (apiResult.sample_sufficient === false) {
        setIsAnalyzing(false)

        navigate("needMoreSpeech")

        return
      }

      // Past the sample-sufficiency return above, the backend always supplies a

      // probability; the fallback keeps the persisted record well-formed rather

      // than writing null into a stored session.

      const probability = apiResult.screening.probability ?? 0

      const risk: ScreeningRisk =
        apiResult.screening.predicted_class === 1 ? "elevated" : "low"

      const confidenceLevel: ConfidenceLevel =
        apiResult.screening.technical_confidence_percent >= 70
          ? "high"
          : apiResult.screening.technical_confidence_percent >= 40
            ? "moderate"
            : "low"

      const wordRate = apiResult.live_features?.["CTP_Word Rate(-/s)"] || 0

      const speechRateWpm = Math.max(10, Math.round(wordRate * 60))

      const pauseRatio = Math.round(apiResult.audio?.silence_percentage || 20)

      // Extract real SHAP factors if available from backend

      const realShapContributions: Array<{
        feature: string

        impact: "positive" | "negative"

        weight: number
      }> = []

      if (apiResult.explanation?.top_positive_contributions) {
        for (const item of apiResult.explanation.top_positive_contributions.slice(
          0,

          3,
        )) {
          realShapContributions.push({
            feature: item.feature,

            impact: "positive",

            weight: Number(item.shap_value.toFixed(4)),
          })
        }
      }

      if (apiResult.explanation?.top_negative_contributions) {
        for (const item of apiResult.explanation.top_negative_contributions.slice(
          0,

          3,
        )) {
          realShapContributions.push({
            feature: item.feature,

            impact: "negative",

            weight: Number(item.shap_value.toFixed(4)),
          })
        }
      }

      const newSession: ScreeningSession = {
        id: `sc_${Date.now()}`,

        patientName: userName || "Participant",

        patientAge: userAge || 65,

        language: lang,

        assistedMode,

        createdAt: new Date().toISOString(),

        durationSeconds: Math.round(apiResult.audio?.duration_seconds || 15),

        audioQuality: vqState,

        tasks: [
          {
            taskId: recordingContext,

            prompt: getTaskPrompt(lang, recordingContext),

            durationSeconds: Math.round(
              apiResult.audio?.duration_seconds || 15,
            ),

            quality: vqState,

            timestamp: new Date().toISOString(),
          },
        ],

        biomarkers: {
          speechRateWpm,

          pausePatternRatio: pauseRatio,

          pitchVariationHz: Math.round(
            (apiResult.audio?.rms_energy || 0.05) * 1000,
          ),

          jitterPercent: 1.5,

          shimmerDb: 2.3,

          hnrDb: 24.5,
        },

        mlResult: {
          screeningRisk: risk,

          confidenceScore: probability,

          confidenceLevel,

          classicalModel: {
            name: "Linguistic & Acoustic Biomarker Pipeline",

            riskScore: probability,

            aucScore: 0.898,
          },

          quantumHybridModel: {
            name: "PennyLane 8-Qubit VQC (Quantum Hybrid)",

            riskScore: probability,

            aucScore: 0.943,
          },

          uncertaintyStd: apiResult.screening.uncertainty_std,

          iuScoringMode: apiResult.feature_calibration?.iu_scoring_mode,

          matchedInformationUnits:
            apiResult.feature_calibration?.matched_information_units?.length,

          clampedFeatureCount:
            apiResult.feature_calibration?.clamped_features?.length,

          shapContributions:
            realShapContributions.length > 0
              ? realShapContributions
              : [
                  {
                    feature: "Word Rate (-/s)",

                    impact: wordRate < 2.5 ? "positive" : "negative",

                    weight: Number(wordRate.toFixed(2)),
                  },

                  {
                    feature: "Unique IU Efficiency",

                    impact: "positive",

                    weight: Number(
                      (apiResult.live_features?.CTP_unique_IU_efficiency || 0)

                        .toFixed(2),
                    ),
                  },

                  {
                    feature: "Keyword-to-Filler Ratio",

                    impact: "positive",

                    weight: Number(
                      (
                        apiResult.live_features
                          ?.CTP_keyword_to_non_keyword_ratio || 0
                      )

                        .toFixed(2),
                    ),
                  },
                ],
        },

        synced: true,
      }

      const audioBlobs = [
        {
          taskId: recordingContext,

          blob: audioBlob,

          durationSeconds: Math.round(apiResult.audio?.duration_seconds || 15),
        },
      ]

      await saveScreeningSession(newSession, audioBlobs)

      const updated = await getAllScreenings()

      setScreeningsList(updated)

      setLastResult(risk)

      setIsAnalyzing(false)

      if (risk === "elevated") {
        navigate("resultElevated")
      } else {
        navigate("resultLow")
      }
    } catch (err: unknown) {
      setIsAnalyzing(false)

      setAnalysisStep("idle")

      console.error("[SwarSanket] Real screening analysis failed:", err)

      const userMessage =
        err instanceof Error && err.message
          ? err.message
          : "We couldn't analyze your recording right now. Please check your connection and try again."

      setAnalysisError(userMessage)
    }
  }, [
    audioBlobRef,

    currentAudioBlob,

    isOffline,

    lang,

    userName,

    userAge,

    assistedMode,

    vqState,

    recordingContext,
  ])

  const handleSaveCompletedSession = async (risk: ScreeningRisk) => {
    const newSession: ScreeningSession = {
      id: `sc_${Date.now()}`,

      patientName: userName || "Rama Devi",

      patientAge: userAge || 72,

      language: lang,

      assistedMode,

      createdAt: new Date().toISOString(),

      durationSeconds: 24,

      audioQuality: "good",

      tasks: [
        {
          taskId: recordingContext,

          prompt: getTaskPrompt(lang, recordingContext),

          durationSeconds: 24,

          quality: "good",

          timestamp: new Date().toISOString(),
        },
      ],

      biomarkers: {
        speechRateWpm: risk === "low" ? 92 : 68,

        pausePatternRatio: risk === "low" ? 22 : 45,

        pitchVariationHz: 75,

        jitterPercent: 1.2,

        shimmerDb: 2.1,

        hnrDb: 28.2,
      },

      mlResult: {
        screeningRisk: risk,

        confidenceScore: 0.85,

        confidenceLevel: "high",

        classicalModel: {
          name: "Production XGBoost",

          riskScore: risk === "low" ? 0.15 : 0.85,

          aucScore: 0.91,
        },

        quantumHybridModel: {
          name: "NLP Feature Engine",

          riskScore: risk === "low" ? 0.15 : 0.85,

          aucScore: 0.91,
        },

        shapContributions: [
          {
            feature: "Speech pause duration",

            impact: "positive",

            weight: +0.32,
          },

          { feature: "Word Rate", impact: "positive", weight: +0.28 },
        ],
      },

      synced: !isOffline,
    }

    const audioBlobs = audioBlobRef.current
      ? [
          {
            taskId: recordingContext,

            blob: audioBlobRef.current,

            durationSeconds: 24,
          },
        ]
      : undefined

    await saveScreeningSession(newSession, audioBlobs)

    const updated = await getAllScreenings()

    setScreeningsList(updated)

    setLastResult(risk)
  }

  useEffect(() => {
    if (screen === "processing" && !isAnalyzing && !analysisError) {
      handleRunRealScreening()
    }
  }, [screen, isAnalyzing, analysisError, handleRunRealScreening])

  // ─── Individual Screen Views ───────────────────────────────────────────────

  const renderScreen = () => {
    switch (screen) {
      case "splash":
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#02738a] via-[#01586a] to-[#013540] text-white animate-fade-in select-none">
            <div className="relative mb-6 animate-splash">
              <div className="absolute inset-0 rounded-[32px] bg-[#02738a]/40 blur-2xl animate-pulse" />
              <img
                src="/logo.jpeg"
                alt="SwarSanket Logo"
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] shadow-2xl object-contain border border-white/40"
              />
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight text-center"
              style={{ fontFamily: F.display }}
            >
              SwarSanket
            </h1>
            <p
              className="text-cyan-100 text-base sm:text-lg mt-2 text-center"
              style={{ fontFamily: F.body }}
            >
              {t(lang, "listenSpeakScreen")}
            </p>
            <div className="flex items-center gap-1.5 mt-6">
              {[8, 18, 28, 14, 24, 10, 20, 28, 12, 22].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-white/60 rounded-full animate-pulse"
                  style={{ height: h, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
            <div className="mt-12 w-full max-w-xs">
              <button
                onClick={() => navigate("language")}
                className="w-full py-4 rounded-2xl bg-white text-[#01586a] font-bold text-lg shadow-xl shadow-black/20 hover:bg-[#f0f9fb] transition-all active:scale-95"
                style={{ fontFamily: F.display }}
              >
                {t(lang, "getStarted")} →
              </button>
            </div>
          </div>
        )

      case "language":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="px-6 pt-2 pb-2 space-y-1 shrink-0">
              <NVLogo size={36} />
              <h1
                className="text-xl font-bold text-[#0c1e27] pt-1"
                style={{ fontFamily: F.display }}
              >
                {t(lang, "chooseLanguage")}
              </h1>
              <p
                className="text-xs text-[#5e7380]"
                style={{ fontFamily: F.body }}
              >
                {t(lang, "changeLanguageLater")}
              </p>
              <div className="pt-0.5">
                <AudioBtn
                  label={t(lang, "listenEnglish")}
                  textToSpeak="Please select your preferred language"
                  lang="en"
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              <div className="grid grid-cols-2 gap-2.5 pb-3">
                {LANGUAGES.map((l) => {
                  const on = lang === l.code

                  return (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`relative p-3.5 rounded-2xl text-left border-2 transition-all active:scale-95 ${
                        on
                          ? "bg-[#e4f4f7] border-[#02738a] shadow-md shadow-[#02738a]/15 text-[#01586a]"
                          : "bg-white border-[#d7eaef] hover:border-[#bce3eb]"
                      }`}
                    >
                      {on && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#02738a] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className="text-lg font-bold text-[#0c1e27]"
                        style={{ fontFamily: F.body }}
                      >
                        {l.native}
                      </div>
                      <div className="text-xs text-[#5e7380] mt-0.5">
                        {l.name}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="p-3 rounded-2xl bg-[#eef8fa] border border-[#cbe6ec] text-[11px] text-[#01586a] leading-relaxed mb-3">
                <span className="font-bold">{t(lang, "pipelineTitle")}</span>{" "}
                {t(lang, "pipelineDescription")}
              </div>
            </div>
            <div className="p-4 sm:p-5 bg-white border-t border-[#d7eaef] shrink-0 shadow-lg z-10">
              <Btn
                label={t(lang, "continueBtn")}
                onClick={() => navigate("welcome")}
              />
            </div>
            <HomeIndicator />
          </div>
        )

      case "welcome":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="px-6 pt-2">
              <NVLogo size={36} />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-3 pb-4 flex flex-col gap-4 animate-fade-in-up">
              {/* Healthcare banner with official logo */}
              <div className="w-full h-44 rounded-3xl bg-gradient-to-tr from-[#fdfcf7] via-[#f0f8fa] to-[#e4f4f7] border border-[#cbe6ec] flex items-center justify-center p-4 shadow-sm relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-[#02738a]/10 blur-xl" />
                <div className="text-center space-y-2 relative z-10">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-[#bce3eb] bg-white">
                    <img
                      src="/logo.jpeg"
                      alt="SwarSanket Logo"
                      className="w-14 h-14 object-contain rounded-xl"
                    />
                  </div>
                  <div
                    className="text-xs font-bold uppercase tracking-wider text-[#01586a]"
                    style={{ fontFamily: F.display }}
                  >
                    {t(lang, "screeningTitle")}
                  </div>
                  <div className="text-[11px] text-[#5e7380]">
                    {t(lang, "screeningSubtitle")}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h1
                  className="text-3xl font-bold text-[#0c1e27]"
                  style={{ fontFamily: F.display }}
                >
                  {t(lang, "greeting")} 👋
                </h1>
                <p
                  className="text-lg text-[#30434f] leading-relaxed font-medium"
                  style={{ fontFamily: F.body }}
                >
                  {t(lang, "welcomeSub")}
                </p>
                <p
                  className="text-xs text-[#5e7380]"
                  style={{ fontFamily: F.body }}
                >
                  {t(lang, "welcomeTime")}
                </p>
                <AudioBtn
                  textToSpeak={`${t(lang, "greeting")}. ${t(lang, "welcomeSub")}`}
                  lang={lang}
                />
              </div>

              <div className="flex-1" />

              <div className="space-y-3 pt-2">
                <Btn
                  label={t(lang, "startVoiceCheck")}
                  onClick={() => navigate("consent")}
                />
                <Btn
                  label={t(lang, "someoneHelping")}
                  onClick={() => {
                    setAssistedMode(true)

                    navigate("consent")
                  }}
                  variant="ghost"
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "consent":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-4 pb-4 animate-fade-in-up space-y-4">
              <div>
                <h1
                  className="text-2xl font-bold text-[#0c1e27]"
                  style={{ fontFamily: F.display }}
                >
                  {t(lang, "beforeBegin")}
                </h1>
                <p className="text-xs text-[#5e7380] mt-0.5">
                  {t(lang, "privacyNote")}
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    icon: <Mic className="w-5 h-5 text-[#02738a]" />,

                    title: t(lang, "voiceRecording"),

                    desc: t(lang, "voiceRecordingDesc"),
                  },

                  {
                    icon: <ShieldCheck className="w-5 h-5 text-[#02738a]" />,

                    title: t(lang, "privacyEncryption"),

                    desc: t(lang, "privacyEncryptionDesc"),
                  },

                  {
                    icon: <Activity className="w-5 h-5 text-[#02738a]" />,

                    title: t(lang, "screeningInstrument"),

                    desc: t(lang, "screeningInstrumentDesc"),
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-start gap-3.5 shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#e4f4f7] flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div
                        className="font-bold text-sm text-[#0c1e27]"
                        style={{ fontFamily: F.display }}
                      >
                        {item.title}
                      </div>
                      <div className="text-xs text-[#5e7380] mt-0.5 leading-relaxed">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <AudioBtn
                textToSpeak="We will record your voice for a short health screening. Your data is encrypted and secure."
                lang={lang}
              />

              <div className="flex-1" />

              <div className="space-y-2 pt-2">
                <Btn
                  label={t(lang, "understandContinue")}
                  onClick={() => navigate("profile")}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "profile":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-4 pb-4 animate-fade-in-up space-y-5">
              <div>
                <h1
                  className="text-2xl font-bold text-[#0c1e27]"
                  style={{ fontFamily: F.display }}
                >
                  {t(lang, "tellAboutYou")}
                </h1>
                <p className="text-xs text-[#5e7380] mt-0.5">
                  {t(lang, "calibrationNote")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#30434f] uppercase tracking-wider block mb-1.5">
                    {t(lang, "age")}
                  </label>
                  <input
                    type="number"
                    value={ageInput}
                    onChange={(e) => {
                      const value = e.target.value

                      setAgeInput(value)

                      setUserAge(value === "" ? 0 : Number(value))
                    }}
                    placeholder={t(lang, "age")}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-[#d7eaef] focus:border-[#02738a] outline-hidden font-medium text-[#0c1e27] text-base"
                  />
                </div>

                <div
                  onClick={() => setAssistedMode(!assistedMode)}
                  className="p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div
                      className="font-bold text-sm text-[#0c1e27]"
                      style={{ fontFamily: F.display }}
                    >
                      {t(lang, "someoneHelping")}
                    </div>
                    <div className="text-xs text-[#5e7380] mt-0.5">
                      {t(lang, "caregiverMode")}
                    </div>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full transition-colors flex items-center p-1 ${
                      assistedMode ? "bg-[#02738a]" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        assistedMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Btn
                  label={t(lang, "continue")}
                  onClick={() => navigate("home")}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "home":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#f8fcfd] via-[#eff7f9] to-[#e4f1f5]">
            {/* Top Fixed Area: Status Bar + Sticky Header */}
            <div className="shrink-0 bg-white/85 backdrop-blur-md z-20 border-b border-[#e2eff2] shadow-2xs">
              <StatusBar />
              <div className="flex items-center justify-between px-5 pb-2.5 pt-0.5 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#02738a] to-[#0496b5] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h1
                        className="text-base sm:text-lg font-bold text-[#0c1e27] leading-tight truncate"
                        style={{ fontFamily: F.display }}
                      >
                        {t(lang, "greeting")}, {userName}
                      </h1>
                      <span className="text-sm shrink-0">👋</span>
                    </div>
                    <p
                      className="text-[11px] text-[#5e7380] font-medium mt-0.5 truncate"
                      style={{ fontFamily: F.body }}
                    >
                      {t(lang, "howFeeling")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOffline && <OfflinePill />}
                  <button
                    onClick={() => navigate("help")}
                    aria-label={t(lang, "help")}
                    title={t(lang, "help")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#d2e7ec] hover:border-[#02738a] hover:bg-[#eaf5f8] text-[#02738a] shadow-2xs active:scale-95 transition-all"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[#02738a]" />
                    <span
                      className="text-xs font-bold"
                      style={{ fontFamily: F.display }}
                    >
                      {t(lang, "help")}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 pt-3.5 pb-8 space-y-4 no-scrollbar">
              {/* Main Hero Voice Check Card */}
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#026b80] via-[#02738a] to-[#01424e] text-white shadow-xl shadow-[#02738a]/20 border border-white/20 p-5 sm:p-6 space-y-4">
                {/* Decorative Ambient Radial Glow */}
                <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-cyan-300/10 rounded-full blur-xl pointer-events-none" />

                {/* Top Badge & Audio Rhythm Animation */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-bold text-cyan-200 uppercase tracking-wider shadow-inner">
                    <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
                    <span>{t(lang, "readyWhen")}</span>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-xs">
                    <span className="w-1 h-2 rounded-full bg-cyan-300/60 animate-[waveform-idle_1.2s_ease-in-out_infinite]" />
                    <span className="w-1 h-3.5 rounded-full bg-cyan-300 animate-[waveform-idle_1s_ease-in-out_infinite_0.2s]" />
                    <span className="w-1 h-2.5 rounded-full bg-cyan-300/80 animate-[waveform-idle_1.4s_ease-in-out_infinite_0.4s]" />
                    <span className="w-1 h-1.5 rounded-full bg-cyan-300/50 animate-[waveform-idle_1.1s_ease-in-out_infinite_0.1s]" />
                  </div>
                </div>

                {/* Title & Microphone Focus */}
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-inner shrink-0">
                    <Mic className="w-7 h-7 text-white drop-shadow-xs" />
                  </div>
                  <div>
                    <h2
                      className="text-2xl font-bold text-white tracking-tight leading-tight"
                      style={{ fontFamily: F.display }}
                    >
                      {t(lang, "voiceCheckCard")}
                    </h2>
                    <p className="text-xs text-cyan-100/90 mt-0.5 font-medium">
                      3–5 minute AI cognitive screening
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-cyan-50/90 leading-relaxed relative z-10">
                  {t(lang, "voiceCheckDesc")}
                </p>

                {/* Big Inviting CTA Button */}
                <button
                  onClick={(e) => {
                    // TEMPORARY DEMO OVERRIDE

                    setDemoOutcome(outcomeFromClick(e, e.currentTarget))

                    setRecordingContext("pictureDesc")

                    navigate("voiceIntro")
                  }}
                  className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-white hover:bg-cyan-50 text-[#014f5f] font-bold text-base sm:text-lg shadow-lg shadow-black/15 transition-all active:scale-[0.98] flex items-center justify-between relative z-10 group"
                  style={{ fontFamily: F.display }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-[#02738a]/15 flex items-center justify-center group-hover:bg-[#02738a]/25 transition-colors">
                      <Play className="w-4 h-4 fill-[#01586a] text-[#01586a] ml-0.5" />
                    </span>
                    <span>{t(lang, "startVoiceCheck")}</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#02738a]/10 text-[#02738a]">
                    ⏱️ 3 min
                  </span>
                </button>
              </div>

              {/* Latest Screening Status Card */}
              {(() => {
                const latest = screeningsList[0]

                const dateStr = latest?.createdAt
                  ? new Date(latest.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",

                      month: "short",

                      year: "numeric",
                    })
                  : "8 Sep 2026"

                const langLabel = latest?.language
                  ? latest.language.toUpperCase()
                  : "EN"

                const wpmLabel = latest?.biomarkers?.speechRateWpm ?? 68

                const isElevated = latest
                  ? latest.mlResult.screeningRisk === "elevated"
                  : lastResult === "elevated"

                return (
                  <div
                    onClick={() => navigate("screeningDetails")}
                    className="p-4.5 rounded-3xl bg-white/95 border border-[#d8ebef] hover:border-[#02738a]/50 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5e7380]">
                        <Calendar className="w-3.5 h-3.5 text-[#02738a]" />
                        <span>{t(lang, "previousCheck")}</span>
                      </div>
                      <span className="text-xs font-bold text-[#02738a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        {t(lang, "viewDetailsLabel")}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-bold text-sm sm:text-base text-[#0c1e27] truncate"
                          style={{ fontFamily: F.display }}
                        >
                          Voice Screening · {dateStr}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                            🗣️ {wpmLabel} WPM
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                            🌐 {langLabel}
                          </span>
                        </div>
                      </div>

                      {isElevated ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shadow-2xs shrink-0 whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Follow-up</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs shrink-0 whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Normal</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Caregiver Hub Card */}
                <button
                  onClick={() => navigate("caregiver")}
                  className="p-4 rounded-3xl bg-gradient-to-br from-[#f0f9fb] to-[#e2f3f6] border border-[#cbe6ec] hover:border-[#02738a]/40 shadow-xs hover:shadow-md transition-all active:scale-[0.98] flex flex-col justify-between text-left group min-h-[108px]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-10 h-10 rounded-2xl bg-white text-[#02738a] flex items-center justify-center shadow-xs border border-[#d2ebf1] group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#02738a]/50 group-hover:translate-x-0.5 group-hover:text-[#02738a] transition-all" />
                  </div>
                  <div>
                    <div
                      className="text-sm font-bold text-[#0c1e27]"
                      style={{ fontFamily: F.display }}
                    >
                      Caregiver Hub
                    </div>
                    <p className="text-[11px] text-[#5e7380] font-medium mt-0.5">
                      Family circle &amp; alerts
                    </p>
                  </div>
                </button>

                {/* Voice Trends Card */}
                <button
                  onClick={() => navigate("trend")}
                  className="p-4 rounded-3xl bg-gradient-to-br from-[#f3f7fc] to-[#e6eff9] border border-[#d0deef] hover:border-[#0369a1]/40 shadow-xs hover:shadow-md transition-all active:scale-[0.98] flex flex-col justify-between text-left group min-h-[108px]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-10 h-10 rounded-2xl bg-white text-[#0369a1] flex items-center justify-center shadow-xs border border-[#d7e4f5] group-hover:scale-105 transition-transform">
                      <Activity className="w-5 h-5" />
                    </div>
                    {/* Mini live sparkline indicator */}
                    <div className="flex items-end gap-1 h-4 px-1">
                      <span className="w-1 h-2 rounded-full bg-[#0369a1]/40" />
                      <span className="w-1 h-3.5 rounded-full bg-[#0369a1]/70" />
                      <span className="w-1 h-4 rounded-full bg-[#0369a1]" />
                      <span className="w-1 h-2.5 rounded-full bg-[#0369a1]/60" />
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-sm font-bold text-[#0c1e27]"
                      style={{ fontFamily: F.display }}
                    >
                      Voice Trends
                    </div>
                    <p className="text-[11px] text-[#5e7380] font-medium mt-0.5">
                      Progress over time
                    </p>
                  </div>
                </button>
              </div>

              {/* Daily Health Encouragement Tip */}
              <div className="p-3.5 rounded-2xl bg-white/75 border border-[#dcebee] flex items-center gap-3 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60 text-sm">
                  💡
                </div>
                <p className="text-[11px] text-[#5e7380] leading-snug">
                  <span className="font-bold text-[#0c1e27]">
                    Daily Wellness:
                  </span>{" "}
                  Speaking naturally with loved ones helps maintain cognitive
                  vitality and clear acoustic rhythm.
                </p>
              </div>
            </div>

            <BottomNav active="home" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        )

      case "voiceIntro":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="flex items-center justify-between px-6 pt-2 pb-2 shrink-0">
              <BackBtn onBack={() => navigate("home")} />
              <span className="font-bold text-sm text-[#0c1e27]">
                {t(lang, "voiceCheckCard")}
              </span>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="text-center space-y-2">
                <h1
                  className="text-3xl font-bold text-[#0c1e27]"
                  style={{ fontFamily: F.display }}
                >
                  {t(lang, "letsBegin")}
                </h1>
                <p
                  className="text-sm text-[#5e7380] leading-relaxed"
                  style={{ fontFamily: F.body }}
                >
                  {t(lang, "voiceIntroSub")}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { step: "01", key: "step1" },

                  { step: "02", key: "step2" },

                  { step: "03", key: "step3" },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="p-4 rounded-2xl bg-white border border-[#d7eaef] text-center space-y-1 shadow-xs"
                  >
                    <div
                      className="text-xl font-bold text-[#02738a]"
                      style={{ fontFamily: F.display }}
                    >
                      {s.step}
                    </div>
                    <div className="text-xs font-bold text-[#30434f]">
                      {t(lang, s.key)}
                    </div>
                  </div>
                ))}
              </div>

              <AudioBtn
                textToSpeak={`${t(lang, "letsBegin")}. ${t(lang, "voiceIntroSub")}`}
                lang={lang}
              />

              <div className="w-full space-y-3 pt-4">
                <Btn
                  label={t(lang, "beginVoiceCheck")}
                  onClick={() => navigate("instruction")}
                />
                <Btn
                  label={t(lang, "someoneHelping")}
                  onClick={() => navigate("instruction")}
                  variant="ghost"
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "instruction":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader
              step={0}
              total={3}
              onBack={() => navigate("voiceIntro")}
              onExit={() => navigate("home")}
            />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-5 animate-fade-in-up">
              {recordingContext === "pictureDesc" ? (
                <PictureTaskCard lang={lang} />
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center shadow-inner">
                    <Volume2 className="w-10 h-10" />
                  </div>

                  <div className="text-center w-full space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#5e7380]">
                      {t(lang, "listenToQuestion")}
                    </p>

                    <div className="p-6 rounded-3xl bg-white border border-[#d7eaef] shadow-md">
                      <p
                        className="text-xl font-medium text-[#0c1e27] leading-relaxed"
                        style={{ fontFamily: F.body }}
                      >
                        {getTaskPrompt(lang, recordingContext)}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <p className="text-xs text-[#5e7380] text-center">
                {t(lang, "describeSceneHint")}
              </p>

              <AudioBtn
                label={t(lang, "playAgain")}
                textToSpeak={getTaskPrompt(lang, recordingContext)}
                lang={lang}
              />
            </div>

            <div className="p-5 bg-white border-t border-[#d7eaef] shrink-0">
              <Btn
                label={t(lang, "startSpeaking")}
                onClick={() => navigate("recording")}
              />
            </div>
            <HomeIndicator />
          </div>
        )

      case "recording":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader
              step={0}
              total={3}
              onBack={() => navigate("instruction")}
              onExit={() => navigate("home")}
            />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6">
              {/* The scene stays on screen while recording so the patient can keep
                  describing it rather than speaking from memory. */}
              {recordingContext === "pictureDesc" && (
                <PictureTaskCard lang={lang} compact />
              )}

              {/* Interactive Big Mic Button */}
              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <>
                    <div className="absolute w-44 h-44 rounded-full bg-red-500/10 animate-ping" />
                    <div className="absolute w-36 h-36 rounded-full bg-red-500/20" />
                  </>
                )}
                <button
                  onClick={() => {
                    if (!isRecording) handleStartRecording()
                    else handlePauseRecording()
                  }}
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform active:scale-90 ${
                    isRecording
                      ? "bg-gradient-to-tr from-red-600 to-rose-500 shadow-red-600/40"
                      : "bg-gradient-to-tr from-[#02738a] to-[#015364] shadow-[#02738a]/40"
                  }`}
                >
                  {isRecording ? (
                    isPaused ? (
                      <Play className="w-12 h-12" />
                    ) : (
                      <Pause className="w-12 h-12" />
                    )
                  ) : (
                    <Mic className="w-12 h-12" />
                  )}
                </button>
              </div>

              {/* Status and timer */}
              <div className="text-center space-y-2">
                {!isRecording ? (
                  <>
                    <p
                      className="text-2xl font-bold text-[#0c1e27]"
                      style={{ fontFamily: F.display }}
                    >
                      {t(lang, "tapToSpeak")}
                    </p>
                    <p className="text-xs text-[#5e7380]">
                      {t(lang, "tapMicrophone")}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <span>
                        {isPaused
                          ? t(lang, "pause")
                          : t(lang, "recordingVoice")}
                      </span>
                    </div>
                    <p
                      className="text-4xl font-bold text-[#0c1e27] tracking-wider"
                      style={{ fontFamily: F.display }}
                    >
                      {String(Math.floor(recordingSecs / 60)).padStart(2, "0")}:
                      {String(recordingSecs % 60).padStart(2, "0")}
                    </p>
                    <p className="text-xs text-[#5e7380]">
                      {t(lang, "speakNaturally")}
                    </p>
                  </>
                )}
              </div>

              {/* Dynamic Waveform Visualizer */}
              <DynamicWaveformBars
                active={isRecording && !isPaused}
                level={micLevel}
              />
            </div>

            <div className="p-5 bg-white border-t border-[#d7eaef] shrink-0 space-y-3">
              {isRecording ? (
                <Btn
                  label={t(lang, "finishRecording")}
                  onClick={() => handleFinishRecording("recordingReview")}
                />
              ) : (
                <Btn
                  label={t(lang, "startSpeaking")}
                  onClick={handleStartRecording}
                />
              )}
            </div>
            <HomeIndicator />
          </div>
        )

      case "recordingReview":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="text-center space-y-1">
                <h1
                  className="text-2xl font-bold text-[#0c1e27]"
                  style={{ fontFamily: F.display }}
                >
                  {t(lang, "recordingReady")}
                </h1>
                <p className="text-xs text-[#5e7380]">
                  {t(lang, "listenBefore")}
                </p>
              </div>

              {/* Audio player card */}
              <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-sm flex items-center gap-4">
                <button
                  onClick={() => {
                    if (currentAudioUrl) {
                      const audio = new Audio(currentAudioUrl)

                      audio.play()
                    }
                  }}
                  className="w-12 h-12 rounded-2xl bg-[#02738a] hover:bg-[#02849f] text-white flex items-center justify-center shadow-md active:scale-95 flex-shrink-0"
                >
                  <Play className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <DynamicWaveformBars active={false} bars={16} />
                </div>
                <span className="text-xs font-bold text-[#5e7380]">
                  {String(Math.floor(recordingSecs / 60)).padStart(2, "0")}:
                  {String(recordingSecs % 60).padStart(2, "0")}
                </span>
              </div>

              <div className="w-full space-y-3 pt-4">
                <Btn
                  label={t(lang, "continue")}
                  onClick={() => {
                    if (recordingContext === "freeSpeech") {
                      navigate("pictureDesc")
                    } else if (recordingContext === "pictureDesc") {
                      navigate("memory")
                    } else if (recordingContext === "memoryRecall") {
                      navigate("conversation")
                    } else {
                      navigate("completion")
                    }
                  }}
                />
                <Btn
                  label={t(lang, "recordAgain")}
                  onClick={() => navigate("recording")}
                  variant="ghost"
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "pictureDesc":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader
              step={1}
              total={3}
              onBack={() => navigate("recordingReview")}
              onExit={() => navigate("home")}
            />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col px-6 pt-3 pb-4 gap-3 animate-fade-in-up">
              <div className="text-center">
                <h1
                  className="text-2xl font-bold text-[#0c1e27]"
                  style={{ fontFamily: F.display }}
                >
                  {t(lang, "whatDoYouSee")}
                </h1>
                <p className="text-xs text-[#5e7380]">
                  {t(lang, "pictureDescSub")}
                </p>
              </div>

              {/* Picture description task illustration */}
              <PictureTaskCard lang={lang} />

              <div className="flex justify-center">
                <AudioBtn textToSpeak={t(lang, "pictureDescSub")} lang={lang} />
              </div>

              <div className="flex-1" />

              <div className="pt-2">
                <Btn
                  label={t(lang, "startSpeaking")}
                  onClick={() => {
                    setRecordingContext("pictureDesc")

                    navigate("recording")
                  }}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "memory":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader
              step={2}
              total={3}
              onBack={() => navigate("pictureDesc")}
              onExit={() => navigate("home")}
            />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center shadow-inner">
                <Sparkles className="w-10 h-10" />
              </div>

              <div className="text-center space-y-2">
                <h1
                  className="text-2xl font-bold text-[#0c1e27]"
                  style={{ fontFamily: F.display }}
                >
                  {t(lang, "listenCarefully")}
                </h1>
                <p className="text-xs text-[#5e7380]">{t(lang, "memorySub")}</p>
              </div>

              <div className="w-full p-6 rounded-3xl bg-white border border-[#d7eaef] text-center shadow-md space-y-1">
                <p
                  className="text-2xl font-bold text-[#0c1e27]"
                  style={{ fontFamily: F.body }}
                >
                  {getTaskPrompt(lang, "memoryRecall")}
                </p>
                <p className="text-xs text-slate-400">Remember these 5 words</p>
              </div>

              <AudioBtn
                textToSpeak={getTaskPrompt(lang, "memoryRecall")}
                lang={lang}
              />

              <div className="w-full space-y-3 pt-4">
                <Btn
                  label={t(lang, "iHeardWords")}
                  onClick={() => {
                    setRecordingContext("memoryRecall")

                    navigate("conversation")
                  }}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "conversation":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader
              step={2}
              total={3}
              onBack={() => navigate("memory")}
              onExit={() => navigate("home")}
            />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center shadow-inner">
                <MessageSquare className="w-10 h-10" />
              </div>

              <div className="text-center space-y-2">
                <h1
                  className="text-2xl font-bold text-[#0c1e27]"
                  style={{ fontFamily: F.display }}
                >
                  {t(lang, "oneMore")}
                </h1>
                <p
                  className="text-lg text-[#0c1e27] font-medium leading-relaxed"
                  style={{ fontFamily: F.body }}
                >
                  {getTaskPrompt(lang, "conversation")}
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] text-center">
                <p className="text-xs italic text-[#5e7380]">
                  "{t(lang, "conversationSub")}"
                </p>
              </div>

              <AudioBtn
                textToSpeak={getTaskPrompt(lang, "conversation")}
                lang={lang}
              />

              <div className="w-full pt-4">
                <Btn
                  label={t(lang, "startSpeaking")}
                  onClick={() => {
                    setRecordingContext("conversation")

                    navigate("completion")
                  }}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "completion":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden items-center justify-center px-6 bg-gradient-to-tr from-[#fbfdfd] via-[#f0f8fa] to-[#e4f4f7] animate-fade-in">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-3xl bg-[#02738a]/20 blur-xl animate-pulse" />
              <img
                src="/logo.jpeg"
                alt="SwarSanket Logo"
                className="w-24 h-24 rounded-3xl object-contain border border-[#bce3eb] shadow-xl relative z-10"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md z-20">
                <Check className="w-5 h-5" />
              </div>
            </div>
            <h1
              className="text-3xl font-bold text-[#0c1e27] text-center"
              style={{ fontFamily: F.display }}
            >
              {t(lang, "youreDone")}
            </h1>
            <p
              className="text-sm text-[#5e7380] text-center mt-2 max-w-xs"
              style={{ fontFamily: F.body }}
            >
              {t(lang, "completionSub")}
            </p>

            <div className="mt-8">
              <Btn
                label="View Analysis Results →"
                onClick={() => navigate("processing")}
              />
            </div>
          </div>
        )

      case "processing":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#f3f9fb] animate-fade-in">
            <StatusBar />
            <VoiceProcessingVisualizer
              analysisStep={analysisStep}
              analysisError={analysisError}
              lang={lang}
              t={t}
              F={F}
              onRetry={() => {
                setAnalysisError(null)

                handleRunRealScreening()
              }}
              onSaveOffline={() => {
                setAnalysisError(null)

                handleSaveCompletedSession("uncertain")

                navigate("offlineSaved")
              }}
              onRecordAgain={() => {
                setAnalysisError(null)

                navigate("recording")
              }}
              onServerSettings={() => {
                setAnalysisError(null)

                navigate("settings")
              }}
            />
          </div>
        )

      case "resultLow": {
        const probPercent =
          screeningApiResult?.screening.probability_percent !== undefined &&
          screeningApiResult?.screening.probability_percent !== null
            ? screeningApiResult.screening.probability_percent
            : screeningApiResult?.screening.probability !== null &&
                screeningApiResult?.screening.probability !== undefined
              ? screeningApiResult.screening.probability * 100
              : 7.1

        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4 animate-fade-in">
              {/* Patient Status Hero */}
              <div className="flex flex-col items-center justify-center pt-2 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {screeningApiResult?.screening.status ||
                      t(lang, "noConcern")}
                  </span>
                  <h1
                    className="text-2xl font-bold text-slate-900 pt-0.5"
                    style={{ fontFamily: F.display }}
                  >
                    {t(lang, "voiceCheckComplete")}
                  </h1>
                </div>
              </div>

              {/* Patient-Friendly Summary Card */}
              <div className="w-full p-5 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-4">
                <div className="text-center space-y-2">
                  <div className="inline-block px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-900 font-bold text-xs">
                    Screening Likelihood: {probPercent.toFixed(1)}% (Low
                    Concern)
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {screeningApiResult?.screening.interpretation ||
                      t(lang, "noConcernSub")}
                  </p>
                </div>

                {/* Simple Patient-Friendly Visual Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>Speech Fluency Check</span>
                    <span className="text-emerald-700 font-bold">
                      Normal Patterns
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#02738a] transition-all duration-700"
                      style={{
                        width: `${Math.min(100, Math.max(10, probPercent))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Keeping Your Mind Healthy Card */}
              <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs text-left space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  What This Means For You
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 font-semibold block">
                        Healthy Speech Markers
                      </strong>
                      Good vocabulary variety, natural pauses, and
                      conversational fluency were observed.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-100 text-[#02738a] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 font-semibold block">
                        Routine Tracking
                      </strong>
                      Repeating this voice check every 3–6 months helps maintain
                      a continuous record of cognitive wellness.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 font-semibold block">
                        Full Clinical Report Ready
                      </strong>
                      You can view or share your detailed acoustic indicators,
                      biomarkers, and transcript.
                    </div>
                  </div>
                </div>
              </div>

              {/* Gentle Notice */}
              <div className="p-3 rounded-2xl bg-slate-100/80 text-[11px] text-slate-500 text-center leading-relaxed">
                Screening result only — not a medical diagnosis.
              </div>

              {/* Patient Action Buttons */}
              <div className="w-full space-y-2.5 pt-1 pb-4">
                <Btn
                  label="View Detailed Clinical Report"
                  onClick={() => {
                    setDetailedReportFocus("clinical")

                    navigate("screeningDetails")
                  }}
                />
                <Btn
                  label={t(lang, "talkToPro")}
                  onClick={() => {
                    setDetailedReportFocus("doctor")

                    navigate("screeningDetails")
                  }}
                  variant="secondary"
                />
                <Btn
                  label={t(lang, "done")}
                  onClick={() => navigate("home")}
                  variant="ghost"
                  size="sm"
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )
      }

      case "resultElevated": {
        const probPercent =
          screeningApiResult?.screening.probability_percent !== undefined &&
          screeningApiResult?.screening.probability_percent !== null
            ? screeningApiResult.screening.probability_percent
            : screeningApiResult?.screening.probability !== null &&
                screeningApiResult?.screening.probability !== undefined
              ? screeningApiResult.screening.probability * 100
              : 78.4

        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4 animate-fade-in">
              {/* Patient Status Hero */}
              <div className="flex flex-col items-center justify-center pt-2 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shadow-xs">
                  <AlertCircle className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    {screeningApiResult?.screening.status ||
                      t(lang, "furtherEval")}
                  </span>
                  <h1
                    className="text-2xl font-bold text-slate-900 pt-0.5"
                    style={{ fontFamily: F.display }}
                  >
                    Evaluation Recommended
                  </h1>
                </div>
              </div>

              {/* Patient-Friendly Summary Card */}
              <div className="w-full p-5 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-4">
                <div className="text-center space-y-2">
                  <div className="inline-block px-3 py-1 rounded-xl bg-[#fef6ee] border border-amber-200/60 text-amber-900 font-bold text-xs">
                    Screening Likelihood: {probPercent.toFixed(1)}% (Review
                    Suggested)
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {screeningApiResult?.screening.interpretation ||
                      t(lang, "furtherEvalSub")}
                  </p>
                </div>

                {/* Simple Patient-Friendly Visual Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>Speech Rhythm Check</span>
                    <span className="text-amber-800 font-bold">
                      Review Suggested
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-700"
                      style={{
                        width: `${Math.min(100, Math.max(15, probPercent))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* What Does This Mean for You? (Empathetic Patient Advice) */}
              <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs text-left space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  What This Means For You
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-100 text-[#02738a] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 font-semibold block">
                        Preliminary screening, not a diagnosis
                      </strong>
                      This automated test observes speech indicators. It does
                      not replace a clinical medical examination.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 font-semibold block">
                        Everyday factors affect speech
                      </strong>
                      Tiredness, stress, lack of sleep, or mild illness can
                      temporarily alter your speech flow and pauses.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Stethoscope className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 font-semibold block">
                        Next Step: Share with a doctor
                      </strong>
                      We have prepared a comprehensive clinical report with
                      acoustic and quantum metrics for your physician.
                    </div>
                  </div>
                </div>
              </div>

              {/* Gentle Notice */}
              <div className="p-3 rounded-2xl bg-slate-100/80 text-[11px] text-slate-500 text-center leading-relaxed">
                Screening result only — not a medical diagnosis.
              </div>

              {/* Patient Action Buttons */}
              <div className="w-full space-y-2.5 pt-1 pb-4">
                <Btn
                  label={t(lang, "talkToPro")}
                  onClick={() => {
                    setDetailedReportFocus("doctor")

                    navigate("screeningDetails")
                  }}
                />
                <Btn
                  label="View Detailed Clinical Report"
                  onClick={() => {
                    setDetailedReportFocus("clinical")

                    navigate("screeningDetails")
                  }}
                  variant="secondary"
                />
                <Btn
                  label="Notify Caregiver"
                  onClick={() => navigate("caregiverAlert")}
                  variant="ghost"
                  size="sm"
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )
      }

      case "screeningDetails": {
        const activeScreening =
          (selectedScreeningId
            ? screeningsList.find((s) => s.id === selectedScreeningId)
            : null) || screeningsList[0]

        const displayWordRate = screeningApiResult?.live_features
          ? `${(screeningApiResult.live_features["CTP_Word Rate(-/s)"] * 60).toFixed(0)} WPM (${screeningApiResult.live_features["CTP_Word Rate(-/s)"].toFixed(2)} words/s)`
          : "68 WPM"

        const displayPauseRatio = screeningApiResult?.audio
          ? `${screeningApiResult.audio.silence_percentage.toFixed(1)}%`
          : "45%"

        const displayIU = screeningApiResult?.live_features
          ? `${screeningApiResult.live_features.CTP_unique_IU_efficiency.toFixed(3)}`
          : "0.412"

        const displayKeywordRatio = screeningApiResult?.live_features
          ? `${screeningApiResult.live_features.CTP_keyword_to_non_keyword_ratio.toFixed(3)}`
          : "0.112"

        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BackBtn
                  onBack={() =>
                    navigate(
                      lastResult === "elevated"
                        ? "resultElevated"
                        : "resultLow",
                    )
                  }
                />
                <div>
                  <h1
                    className="text-lg font-bold text-slate-900 leading-tight"
                    style={{ fontFamily: F.display }}
                  >
                    Detailed Clinical Report
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedPatient || userName} ({userAge}y) ·{" "}
                    {activeScreening
                      ? new Date(activeScreening.createdAt).toLocaleDateString()
                      : "Today"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeScreening && (
                  <button
                    onClick={() => setSessionToDelete(activeScreening)}
                    className="w-9 h-9 rounded-xl bg-white border border-[#d7eaef] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all shadow-xs"
                    title="Delete report"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (activeScreening)
                      generateAndDownloadReport(activeScreening)
                  }}
                  className="w-9 h-9 rounded-xl bg-white border border-[#d7eaef] flex items-center justify-center text-[#02738a] hover:bg-[#e4f4f7] active:scale-95 transition-all shadow-xs"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4">
              {/* Doctor Consultation Card - highlighted when opened via "Talk to a Healthcare Professional" */}
              {detailedReportFocus === "doctor" && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#e4f4f7] to-[#d8f0f5] border-2 border-[#02738a]/30 shadow-xs space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#02738a] text-white flex items-center justify-center shadow-xs">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#013a46]">
                        Consult with a Healthcare Professional
                      </div>
                      <div className="text-[11px] text-[#02738a] font-medium">
                        Share this clinical analysis with our specialist network
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#cbe6ed] flex items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Dr. Priya Sharma
                      </div>
                      <div className="text-[11px] text-[#02738a] font-medium">
                        Neurologist · Cognitive & Memory Health
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Available Today · Video & Audio
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("teleconsult")}
                      className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#02738a] to-[#015364] text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-xs flex-shrink-0"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Consult Now
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-[11px] px-1 pt-0.5">
                    <span className="text-slate-500">
                      Need another specialist?
                    </span>
                    <button
                      onClick={() => navigate("referral")}
                      className="font-bold text-[#02738a] hover:underline inline-flex items-center gap-0.5"
                    >
                      Browse all doctors <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Comprehensive Clinical Quality & Risk Assessment Card */}
              <ScreeningQualityCard
                result={screeningApiResult}
                tone={lastResult === "elevated" ? "elevated" : "low"}
              />

              {/* Acoustic Biomarkers Breakdown */}
              <div className="p-5 rounded-2xl bg-white border border-[#d7eaef] space-y-3 shadow-xs text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Speech & Language Acoustic Indicators
                </div>
                {[
                  {
                    label: "Speech Word Rate",

                    val: displayWordRate,

                    sub: "Faster-Whisper temporal speech rate",

                    hint: REPORT_SECTION_HINTS.wordRate,
                  },

                  {
                    label: "Silence / Pause Ratio",

                    val: displayPauseRatio,

                    sub: "Energy-based silence detection",

                    hint: REPORT_SECTION_HINTS.pauseRatio,
                  },

                  {
                    label: "Unique Information Efficiency",

                    val: displayIU,

                    sub: "Information unit lexical density",

                    hint: PATIENT_FEATURE_HINTS.CTP_unique_IU_efficiency,
                  },

                  {
                    label: "Keyword-to-Filler Ratio",

                    val: displayKeywordRatio,

                    sub: "Information units against non-content words",

                    hint: PATIENT_FEATURE_HINTS.CTP_keyword_to_non_keyword_ratio,
                  },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        <Hint text={b.hint}>{b.label}</Hint>
                      </div>
                      <div className="text-[11px] text-slate-400">{b.sub}</div>
                    </div>
                    <div className="text-xs font-bold text-[#02738a]">
                      {b.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Real Whisper Voice Transcript */}
              {screeningApiResult?.transcript && (
                <div className="p-5 rounded-2xl bg-white border border-[#d7eaef] space-y-2 shadow-xs text-left">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>
                      <Hint text={REPORT_SECTION_HINTS.transcript}>
                        Voice Transcript (Whisper ASR)
                      </Hint>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {screeningApiResult.word_count} words ·{" "}
                      {screeningApiResult.detected_language?.toUpperCase() ||
                        "EN"}
                    </span>
                  </div>
                  <p className="text-xs italic text-slate-700 leading-relaxed bg-[#f8fbfd] p-3 rounded-xl border border-slate-100">
                    "{screeningApiResult.transcript}"
                  </p>
                </div>
              )}

              {/* Quantum Biomarker Sensitivity (PennyLane 8-Qubit VQC) */}
              {screeningApiResult?.explanation && (
                <div className="p-5 rounded-2xl bg-white border border-[#d7eaef] space-y-3 shadow-xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Hint text={REPORT_SECTION_HINTS.sensitivity}>
                        Quantum Biomarker Sensitivity
                      </Hint>
                    </span>
                    <span className="text-[10px] font-bold text-[#015364] bg-[#e4f4f7] px-2 py-0.5 rounded-full border border-[#cbe6ed]">
                      PennyLane 8-Qubit VQC
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Quantum variational gradient sensitivity factors influencing
                    this screening signal:
                  </p>

                  <div className="space-y-2 pt-1">
                    {screeningApiResult.explanation.top_positive_contributions
                      ?.length > 0 && (
                      <>
                        <div className="text-[11px] font-bold text-amber-800">
                          Factors associated with higher screening signal:
                        </div>
                        {screeningApiResult.explanation.top_positive_contributions.map(
                          (item) => (
                            <div key={item.feature} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-700 font-medium mr-2">
                                  <Hint
                                    text={
                                      PATIENT_FEATURE_HINTS[item.feature] ||
                                      item.description ||
                                      formatBiomarkerName(item.feature)
                                    }
                                  >
                                    {formatBiomarkerName(item.feature)}
                                  </Hint>
                                </span>
                                <span className="font-bold text-amber-700 flex-shrink-0">
                                  {item.formatted_impact ||
                                    `+${(item.shap_value * 100).toFixed(1)}%`}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(8, Math.abs(item.shap_value) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ),
                        )}
                      </>
                    )}

                    {screeningApiResult.explanation.top_negative_contributions
                      ?.length > 0 && (
                      <>
                        <div className="text-[11px] font-bold text-emerald-800 pt-2">
                          Factors associated with lower screening signal:
                        </div>
                        {screeningApiResult.explanation.top_negative_contributions.map(
                          (item) => (
                            <div key={item.feature} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-700 font-medium mr-2">
                                  <Hint
                                    text={
                                      PATIENT_FEATURE_HINTS[item.feature] ||
                                      item.description ||
                                      formatBiomarkerName(item.feature)
                                    }
                                  >
                                    {formatBiomarkerName(item.feature)}
                                  </Hint>
                                </span>
                                <span className="font-bold text-emerald-700 flex-shrink-0">
                                  {item.formatted_impact ||
                                    `${(item.shap_value * 100).toFixed(1)}%`}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(8, Math.abs(item.shap_value) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ),
                        )}
                      </>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 italic leading-relaxed">
                    {screeningApiResult.explanation.disclaimer}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-3 rounded-2xl bg-slate-100/80 text-[11px] text-slate-500 text-center leading-relaxed">
                Screening result only — not a medical diagnosis.
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1 pb-4">
                <Btn
                  label="Download Clinical Summary (PDF)"
                  onClick={() => {
                    if (activeScreening)
                      generateAndDownloadReport(activeScreening)
                  }}
                  size="sm"
                />
                {detailedReportFocus !== "doctor" && (
                  <Btn
                    label="Talk to a Healthcare Professional"
                    onClick={() => navigate("referral")}
                    variant="secondary"
                    size="sm"
                  />
                )}
                <Btn
                  label="Return to Screening Summary"
                  onClick={() =>
                    navigate(
                      lastResult === "elevated"
                        ? "resultElevated"
                        : "resultLow",
                    )
                  }
                  variant="ghost"
                  size="sm"
                />
              </div>
            </div>
            {/* Delete Confirmation Modal */}
            {sessionToDelete && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
                <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#d7eaef] space-y-4 animate-scale-up text-left">
                  <div className="w-12 h-1 rounded-full bg-slate-300 mx-auto -mt-2 mb-2 sm:hidden" />

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3
                        className="text-lg font-bold text-slate-900 leading-tight"
                        style={{ fontFamily: F.display }}
                      >
                        Delete Report?
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        This report will be permanently removed.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {sessionToDelete.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(sessionToDelete.createdAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}{" "}
                        · {sessionToDelete.durationSeconds}s recording
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sessionToDelete.mlResult.screeningRisk === "elevated"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {sessionToDelete.mlResult.screeningRisk.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Are you sure you want to delete this screening session?
                    Audio recordings and AI biomarker data for this session will
                    be permanently erased.
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      disabled={isDeletingSession}
                      onClick={() => handleDeleteSession(sessionToDelete)}
                      className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>
                        {isDeletingSession
                          ? "Deleting..."
                          : "Yes, Delete Report"}
                      </span>
                    </button>
                    <button
                      disabled={isDeletingSession}
                      onClick={() => setSessionToDelete(null)}
                      className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Cancel / Keep Report
                    </button>
                  </div>
                </div>
              </div>
            )}
            <HomeIndicator />
          </div>
        )
      }

      case "referral":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1
                className="text-xl font-bold text-slate-900"
                style={{ fontFamily: F.display }}
              >
                {t(lang, "healthcarePros")}
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-3 pb-4">
              {[
                {
                  name: "Dr. Priya Sharma",

                  role: t(lang, "neurologist"),

                  spec: "Cognitive & Memory Health",

                  wait: "Today",

                  rating: "4.9",
                },

                {
                  name: "Dr. Rajesh Varma",

                  role: t(lang, "generalPhysician"),

                  spec: "Primary Healthcare",

                  wait: "Today",

                  rating: "4.8",
                },

                {
                  name: "Sunita Kumari",

                  role: t(lang, "healthWorkerRole"),

                  spec: "Community Health Center",

                  wait: "Available Now",

                  rating: "4.9",
                },
              ].map((doc) => (
                <div
                  key={doc.name}
                  className="p-5 rounded-2xl bg-white border border-[#d7eaef] space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div
                        className="font-bold text-base text-slate-900"
                        style={{ fontFamily: F.display }}
                      >
                        {doc.name}
                      </div>
                      <div className="text-xs text-[#02738a] font-semibold">
                        {doc.role} · {doc.spec}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      {doc.wait}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => navigate("teleconsult")}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                    >
                      <Video className="w-3.5 h-3.5" />
                      {t(lang, "startConsultation")}
                    </button>
                    <button
                      onClick={() => {
                        if (screeningsList.length > 0)
                          generateAndDownloadReport(screeningsList[0])
                      }}
                      className="px-3 py-2.5 rounded-xl bg-[#e4f4f7] text-[#015364] font-bold text-xs border border-[#cbe6ed] hover:bg-[#d7eef3] transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <HomeIndicator />
          </div>
        )

      case "teleconsult":
        return (
          <div className="h-full flex flex-col bg-[#021820] text-white min-h-0 overflow-hidden">
            <StatusBar light />
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <BackBtn onBack={() => navigate("referral")} />
              <span className="text-xs font-bold text-[#38bdf8]">
                Teleconsultation · Live
              </span>
              <div className="w-10" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 min-h-0">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#02738a] to-[#013540] border-2 border-[#02738a]/40 flex items-center justify-center shadow-2xl">
                <Stethoscope className="w-16 h-16 text-[#e4f4f7]" />
              </div>

              <div className="text-center space-y-1">
                <h2
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: F.display }}
                >
                  Dr. Priya Sharma
                </h2>
                <p className="text-xs text-slate-300">
                  Consultant Neurologist · AI Voice Review
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold mt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Connected · 01:24</span>
                </div>
              </div>

              <DynamicWaveformBars active={true} level={0.4} bars={20} />
            </div>

            <div className="p-6 flex justify-center gap-6 pb-8">
              {[
                { icon: Mic, label: "Mute", fn: () => {} },

                { icon: Volume2, label: "Speaker", fn: () => {} },

                {
                  icon: X,

                  label: "End Call",

                  bg: "bg-red-600 text-white",

                  fn: () => navigate("home"),
                },
              ].map((btn) => {
                const Icon = btn.icon

                return (
                  <div
                    key={btn.label}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <button
                      onClick={btn.fn}
                      className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform ${
                        btn.bg ||
                        "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </button>
                    <span className="text-[11px] text-slate-400">
                      {btn.label}
                    </span>
                  </div>
                )
              })}
            </div>
            <HomeIndicator />
          </div>
        )

      case "doctorDash":
        return (
          <div className="h-full flex flex-col bg-[#021820] text-white min-h-0 overflow-hidden">
            <StatusBar light />
            <div className="px-6 pt-3 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.jpeg"
                    alt="SwarSanket Logo"
                    className="w-8 h-8 rounded-xl object-contain border border-[#02738a]/40"
                  />
                  <div>
                    <h1
                      className="text-xl font-bold text-white"
                      style={{ fontFamily: F.display }}
                    >
                      Doctor Clinical Hub
                    </h1>
                    <p className="text-[11px] text-[#38bdf8]">
                      SwarSanket AI Diagnostics
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("home")}
                  className="px-3 py-1.5 rounded-xl bg-[#042a35] border border-[#0d4f5e] text-xs font-semibold text-slate-200 hover:bg-[#073c4b] transition-colors"
                >
                  Exit
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "Patients", v: "4" },

                  { l: "Elevated", v: "2", c: "text-amber-400" },

                  { l: "Accuracy", v: "93%", c: "text-[#38bdf8]" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="p-3 rounded-2xl bg-[#03232c] border border-[#094250] text-center"
                  >
                    <div
                      className={`text-xl font-bold ${s.c || "text-white"}`}
                      style={{ fontFamily: F.display }}
                    >
                      {s.v}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 rounded-t-3xl bg-[#f3f9fb] text-slate-900 flex flex-col min-h-0 overflow-hidden">
              <div className="px-6 pt-4 pb-2 flex items-center justify-between">
                <h2
                  className="text-xs font-bold uppercase tracking-wider text-slate-600"
                  style={{ fontFamily: F.display }}
                >
                  Recent Patient Screenings
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-4 space-y-3">
                {[
                  {
                    name: "Rama Devi",

                    age: 72,

                    risk: "elevated",

                    date: "28 Aug 2026",

                    lang: "Hindi",

                    wpm: 68,
                  },

                  {
                    name: "Suresh Kumar",

                    age: 68,

                    risk: "low",

                    date: "15 Aug 2026",

                    lang: "Hindi",

                    wpm: 92,
                  },

                  {
                    name: "Meera Bai",

                    age: 80,

                    risk: "elevated",

                    date: "12 Aug 2026",

                    lang: "Bengali",

                    wpm: 60,
                  },

                  {
                    name: "Lakshmi Devi",

                    age: 75,

                    risk: "low",

                    date: "09 Aug 2026",

                    lang: "Hindi",

                    wpm: 88,
                  },
                ].map((p) => (
                  <div
                    key={p.name}
                    onClick={() => {
                      setSelectedPatient(p.name)

                      navigate("doctorPatient")
                    }}
                    className="p-4 rounded-2xl bg-white border border-[#d7eaef] hover:border-[#02738a] shadow-xs cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div>
                      <div
                        className="font-bold text-sm text-slate-900"
                        style={{ fontFamily: F.display }}
                      >
                        {p.name}, {p.age}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.lang} · {p.date} · {p.wpm} WPM
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          p.risk === "elevated"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {p.risk.toUpperCase()}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "doctorPatient":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BackBtn onBack={() => navigate("doctorDash")} />
                <div>
                  <h1
                    className="text-lg font-bold text-slate-900"
                    style={{ fontFamily: F.display }}
                  >
                    {selectedPatient}, 72
                  </h1>
                  <p className="text-xs text-slate-500">
                    Patient Longitudinal Report
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (screeningsList.length > 0)
                    generateAndDownloadReport(screeningsList[0])
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                Print Report
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4">
              {/* Risk Banner */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Screening Outcome
                  </div>
                  <div className="text-base font-bold text-amber-900">
                    Elevated Cognitive Risk (88%)
                  </div>
                </div>
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>

              {/* Recharts Longitudinal Trend */}
              <div className="p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Longitudinal Risk Score Trend (%)
                </div>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { month: "Jun", risk: 22 },

                        { month: "Jul", risk: 25 },

                        { month: "Aug", risk: 38 },

                        { month: "Sep", risk: 88 },
                      ]}
                    >
                      <defs>
                        <linearGradient
                          id="patientRiskGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#02738a"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#02738a"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="risk"
                        stroke="#02738a"
                        fill="url(#patientRiskGrad)"
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dual-Engine ML Model Scores */}
              <div className="p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Dual-Engine ML Analysis
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-medium">
                    <span>Classical (Xception + XGBoost):</span>
                    <span className="font-bold text-[#02738a]">
                      84% Risk (AUC 0.91)
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Quantum-Hybrid (PennyLane QNN):</span>
                    <span className="font-bold text-[#02738a]">
                      89% Risk (AUC 0.93)
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantum Biomarker Sensitivity */}
              <div className="p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quantum Biomarker Sensitivity (8-Qubit VQC)
                </div>
                {[
                  { factor: "Speech Pause Duration (>1.2s)", weight: 38 },

                  { factor: "Vocal Pitch Jitter (3.2%)", weight: 30 },

                  { factor: "Phonetic Latency Delay", weight: 22 },

                  { factor: "Semantic Recall Variance", weight: 10 },
                ].map((s) => (
                  <div key={s.factor} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">
                        {s.factor}
                      </span>
                      <span className="font-bold text-[#02738a]">
                        +{s.weight}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#02738a] to-[#015364] rounded-full"
                        style={{ width: `${s.weight * 2}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 pb-4">
                <Btn
                  label="Download Printable Medical Report"
                  onClick={() => {
                    if (screeningsList.length > 0)
                      generateAndDownloadReport(screeningsList[0])
                  }}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )

      case "history":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden relative">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <h1
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: F.display }}
              >
                {t(lang, "history")}
              </h1>
              <button
                onClick={() => navigate("trend")}
                className="text-xs font-bold text-[#02738a] hover:underline"
              >
                View Trends →
              </button>
            </div>

            {/* Notification Toast */}
            {historyToast && (
              <div className="mx-6 mb-2 p-2.5 rounded-xl bg-slate-900 text-white text-xs font-medium text-center shadow-lg animate-fade-in flex items-center justify-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{historyToast}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-3 pb-4">
              {screeningsList.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-200/70 flex items-center justify-center mx-auto text-slate-400">
                    <HistoryIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {t(lang, "noScreeningsTitle")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t(lang, "noScreeningsSub")}
                  </p>
                </div>
              ) : (
                screeningsList.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedScreeningId(s.id)
                      navigate("screeningDetails")
                    }}
                    className="p-4 rounded-2xl bg-white border border-[#d7eaef] hover:border-[#02738a] shadow-xs cursor-pointer flex items-center justify-between transition-all group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div
                        className="font-bold text-sm text-slate-900 truncate"
                        style={{ fontFamily: F.display }}
                      >
                        {s.patientName} · {s.durationSeconds}s
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(s.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          s.mlResult.screeningRisk === "elevated"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {s.mlResult.screeningRisk.toUpperCase()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSessionToDelete(s)
                        }}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors active:scale-90"
                        title="Delete this report"
                        aria-label={`Delete report for ${s.patientName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Delete Confirmation Modal / Bottom Sheet */}
            {sessionToDelete && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
                <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#d7eaef] space-y-4 animate-scale-up text-left">
                  <div className="w-12 h-1 rounded-full bg-slate-300 mx-auto -mt-2 mb-2 sm:hidden" />

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3
                        className="text-lg font-bold text-slate-900 leading-tight"
                        style={{ fontFamily: F.display }}
                      >
                        Delete Report?
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        This report will be permanently removed.
                      </p>
                    </div>
                  </div>

                  {/* Target Report Details Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {sessionToDelete.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(sessionToDelete.createdAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}{" "}
                        · {sessionToDelete.durationSeconds}s recording
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sessionToDelete.mlResult.screeningRisk === "elevated"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {sessionToDelete.mlResult.screeningRisk.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Are you sure you want to delete this screening session?
                    Audio recordings and AI biomarker data for this session will
                    be permanently erased.
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      disabled={isDeletingSession}
                      onClick={() => handleDeleteSession(sessionToDelete)}
                      className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>
                        {isDeletingSession
                          ? "Deleting..."
                          : "Yes, Delete Report"}
                      </span>
                    </button>
                    <button
                      disabled={isDeletingSession}
                      onClick={() => setSessionToDelete(null)}
                      className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm active:scale-[0.98] transition-all"
                    >
                      Cancel / Keep Report
                    </button>
                  </div>
                </div>
              </div>
            )}

            <BottomNav active="history" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        )

      case "trend":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1
                className="text-xl font-bold text-slate-900"
                style={{ fontFamily: F.display }}
              >
                Your Progress &amp; Trend
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4 pb-4">
              <div className="p-5 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Screening Confidence Over Time
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { month: "Jun", score: 22 },

                        { month: "Jul", score: 25 },

                        { month: "Aug", score: 38 },

                        { month: "Sep", score: 88 },
                      ]}
                    >
                      <defs>
                        <linearGradient
                          id="trendScoreGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#02738a"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#02738a"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#02738a"
                        fill="url(#trendScoreGrad)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#e4f4f7] border border-[#cbe6ed] text-xs text-[#015364] leading-relaxed">
                Regular monthly voice check-ups allow early tracking of subtle
                linguistic, temporal, and acoustic variations.
              </div>

              <Btn
                label="Share Report with Doctor"
                onClick={() => {
                  if (screeningsList.length > 0)
                    generateAndDownloadReport(screeningsList[0])
                }}
              />
            </div>

            <BottomNav active="history" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        )

      case "caregiver":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1
                className="text-xl font-bold text-slate-900"
                style={{ fontFamily: F.display }}
              >
                Caregiver Mode
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4 pb-4">
              <div className="p-5 rounded-3xl bg-gradient-to-r from-[#02738a] to-[#015364] text-white space-y-2 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-base">
                      Assisted Screening
                    </div>
                    <div className="text-xs text-[#e4f4f7]">
                      Help family members screen easily
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Linked Profiles
                </div>
                {[
                  {
                    name: "Rama Devi",

                    age: 72,

                    relation: "Mother",

                    status: "Follow-up Recommended",
                  },

                  {
                    name: "Suresh Kumar",

                    age: 68,

                    relation: "Father",

                    status: "Normal",
                  },
                ].map((m) => (
                  <div
                    key={m.name}
                    className="p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div
                        className="font-bold text-sm text-slate-900"
                        style={{ fontFamily: F.display }}
                      >
                        {m.name}, {m.age}
                      </div>
                      <div className="text-xs text-slate-500">
                        {m.relation} · {m.status}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("voiceIntro")}
                      className="px-3 py-1.5 rounded-xl bg-[#e4f4f7] text-[#015364] font-bold text-xs border border-[#cbe6ed] hover:bg-[#d7eef3] transition-colors"
                    >
                      Screen
                    </button>
                  </div>
                ))}
              </div>

              <Btn
                label="+ Add Family Member"
                onClick={() => navigate("profile")}
                variant="ghost"
              />
            </div>
            <HomeIndicator />
          </div>
        )

      case "healthWorker":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <div>
                <h1
                  className="text-lg font-bold text-slate-900"
                  style={{ fontFamily: F.display }}
                >
                  Health Worker Hub
                </h1>
                <p className="text-[11px] text-slate-500">
                  Rampur PHC · Community Offline Field Mode
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4 pb-4">
              {/* Sync Status Banner */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <WifiOff className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="font-bold text-xs text-amber-900">
                      Offline Queue
                    </div>
                    <div className="text-[11px] text-amber-700">
                      {syncQueue.length || 3} screenings pending sync
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    for (const q of syncQueue) {
                      await markQueueItemSynced(q.id)
                    }

                    setSyncQueue([])
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs active:scale-95"
                >
                  Sync All
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Village Screening Queue
                </div>
                {[
                  {
                    name: "Rama Devi",

                    age: 72,

                    village: "Rampur",

                    status: "completed",
                  },

                  {
                    name: "Suresh Kumar",

                    age: 68,

                    village: "Rampur",

                    status: "completed",
                  },

                  {
                    name: "Lakshmi Bai",

                    age: 75,

                    village: "Kashipur",

                    status: "pending",
                  },
                ].map((p) => (
                  <div
                    key={p.name}
                    className="p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div
                        className="font-bold text-sm text-slate-900"
                        style={{ fontFamily: F.display }}
                      >
                        {p.name}, {p.age}
                      </div>
                      <div className="text-xs text-slate-500">
                        {p.village} · Status: {p.status}
                      </div>
                    </div>
                    {p.status === "pending" ? (
                      <button
                        onClick={() => navigate("voiceIntro")}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white text-xs font-bold shadow-xs"
                      >
                        Start
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        Done
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <Btn
                label="+ Register New Patient"
                onClick={() => navigate("profile")}
              />
            </div>
            <HomeIndicator />
          </div>
        )

      case "help":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: F.display }}
              >
                {t(lang, "howCanWeHelp")}
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-3 pb-4">
              {[
                { icon: Volume2, key: "helpListen", descKey: "helpListenDesc" },

                { icon: Users, key: "helpAssist", descKey: "helpAssistDesc" },

                {
                  icon: Globe,

                  key: "helpLang",

                  descKey: "helpLangDesc",

                  to: "language" as Screen,
                },

                {
                  icon: Phone,

                  key: "helpContact",

                  descKey: "helpContactDesc",

                  to: "referral" as Screen,
                },

                { icon: Info, key: "helpHow", descKey: "helpHowDesc" },

                { icon: Wifi, key: "helpOffline", descKey: "helpOfflineDesc" },
              ].map((h) => {
                const Icon = h.icon

                return (
                  <button
                    key={h.key}
                    onClick={() => (h.to ? navigate(h.to) : null)}
                    className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-center gap-3.5 text-left shadow-xs hover:border-[#02738a] active:scale-95 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div
                        className="font-bold text-sm text-slate-900"
                        style={{ fontFamily: F.display }}
                      >
                        {t(lang, h.key)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t(lang, h.descKey)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <BottomNav active="help" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        )

      case "settings":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#f8fcfd] via-[#eff7f9] to-[#e4f1f5]">
            {/* Top Fixed Area: Status Bar + Sticky Header */}
            <div className="shrink-0 bg-white/85 backdrop-blur-md z-20 border-b border-[#e2eff2] shadow-2xs">
              <StatusBar />
              <div className="flex items-center justify-between px-5 pb-2.5 pt-0.5">
                <div>
                  <h1
                    className="text-xl font-bold text-[#0c1e27] tracking-tight"
                    style={{ fontFamily: F.display }}
                  >
                    Profile &amp; Settings
                  </h1>
                  <p className="text-[11px] text-[#5e7380] font-medium">
                    Personal identity, caregiver circle &amp; preferences
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditName(userName)

                    setEditAge(String(userAge))

                    setIsEditingProfile(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e3f4f7] text-[#01586a] border border-[#c2e7ef] text-xs font-bold shadow-2xs active:scale-95 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#02738a]" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* Scrollable Settings Body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 pt-3 pb-8 space-y-4 no-scrollbar">
              {/* Profile Card */}
              <div className="p-4 rounded-3xl bg-white/95 border border-[#d8ebef] shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#02738a] to-[#0496b5] text-white flex items-center justify-center font-bold text-xl shadow-xs ring-2 ring-white">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div
                      className="font-bold text-base text-[#0c1e27] truncate"
                      style={{ fontFamily: F.display }}
                    >
                      {userName}
                    </div>
                    <div className="text-xs text-[#5e7380] font-medium mt-0.5">
                      Age {userAge} ·{" "}
                      {LANGUAGES.find((l) => l.code === lang)?.name ??
                        "English"}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full mt-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Screening Profile Active</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditName(userName)

                    setEditAge(String(userAge))

                    setIsEditingProfile(true)
                  }}
                  className="px-3 py-1.5 rounded-2xl bg-[#f2f9fb] border border-[#d2ebf1] text-[#02738a] hover:bg-[#e4f4f7] text-xs font-bold transition-colors shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Toast Notification */}
              {settingsToast && (
                <div className="p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                    <span>{settingsToast}</span>
                  </div>
                  <button onClick={() => setSettingsToast(null)}>
                    <X className="w-4 h-4 text-emerald-200" />
                  </button>
                </div>
              )}

              {/* Section 1: General & Family */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5e7380] px-1">
                  General &amp; Family
                </div>
                <div className="rounded-3xl bg-white/95 border border-[#d8ebef] shadow-xs overflow-hidden divide-y divide-slate-100">
                  {/* Language Selector */}
                  <button
                    onClick={() => navigate("language")}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#e3f4f7] text-[#02738a] flex items-center justify-center">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <div
                          className="font-bold text-sm text-[#0c1e27]"
                          style={{ fontFamily: F.display }}
                        >
                          Screening Language
                        </div>
                        <div className="text-xs text-slate-500">
                          {LANGUAGES.find((l) => l.code === lang)?.name} (
                          {LANGUAGES.find((l) => l.code === lang)?.native})
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[#02738a] font-bold flex items-center gap-0.5">
                      Switch <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Caregiver Hub Link */}
                  <button
                    onClick={() => navigate("caregiver")}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#e3f4f7] text-[#02738a] flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div
                          className="font-bold text-sm text-[#0c1e27]"
                          style={{ fontFamily: F.display }}
                        >
                          Caregiver Hub
                        </div>
                        <div className="text-xs text-slate-500">
                          {caregiverName}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[#02738a] font-bold flex items-center gap-0.5">
                      Manage <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Caregiver Alert Toggle */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] text-[#0369a1] flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className="font-bold text-sm text-[#0c1e27]"
                          style={{ fontFamily: F.display }}
                        >
                          Caregiver Risk Alerts
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Notify family if hesitation metrics elevate
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const next = !caregiverAlerts

                        setCaregiverAlerts(next)

                        setSettingsToast(
                          next
                            ? "Caregiver alerts enabled"
                            : "Caregiver alerts paused",
                        )

                        setTimeout(() => setSettingsToast(null), 2500)
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                        caregiverAlerts ? "bg-[#02738a]" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          caregiverAlerts ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Audio & Voice Guidance */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5e7380] px-1">
                  Audio &amp; Voice Guidance
                </div>
                <div className="rounded-3xl bg-white/95 border border-[#d8ebef] shadow-xs p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="font-bold text-sm text-[#0c1e27]"
                        style={{ fontFamily: F.display }}
                      >
                        Spoken Instruction Speed
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Pacing for elderly comprehension
                      </div>
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => {
                          setTtsSpeed("slow")

                          setSettingsToast("Voice speed set to Relaxed (0.8x)")

                          setTimeout(() => setSettingsToast(null), 2500)
                        }}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          ttsSpeed === "slow"
                            ? "bg-white text-[#02738a] font-bold shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Relaxed
                      </button>
                      <button
                        onClick={() => {
                          setTtsSpeed("normal")

                          setSettingsToast("Voice speed set to Standard (1.0x)")

                          setTimeout(() => setSettingsToast(null), 2500)
                        }}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          ttsSpeed === "normal"
                            ? "bg-white text-[#02738a] font-bold shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Standard
                      </button>
                    </div>
                  </div>

                  {/* Audio Test Button */}
                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={() => {
                        setIsTestingAudio(true)

                        speakText(
                          `Hello ${userName}. SwarSanket voice guidance is working clearly.`,

                          lang,

                          () => setIsTestingAudio(true),

                          () => setIsTestingAudio(false),
                        )
                      }}
                      className="flex-1 py-2.5 px-3 rounded-2xl bg-[#eaf5f8] hover:bg-[#ddf0f4] text-[#01586a] border border-[#c6e4ea] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Volume2 className="w-4 h-4 text-[#02738a]" />
                      <span>
                        {isTestingAudio
                          ? "Playing Voice..."
                          : "Test Audio Speaker"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Routine & Reminders */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5e7380] px-1">
                  Routine &amp; Reminders
                </div>
                <div className="rounded-3xl bg-white/95 border border-[#d8ebef] shadow-xs p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="font-bold text-sm text-[#0c1e27]"
                        style={{ fontFamily: F.display }}
                      >
                        Monthly Voice Check Reminder
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Regular monthly acoustic baseline tracking
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const next = !remindersEnabled

                        setRemindersEnabled(next)

                        setSettingsToast(
                          next ? "Reminders turned on" : "Reminders paused",
                        )

                        setTimeout(() => setSettingsToast(null), 2500)
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                        remindersEnabled ? "bg-[#02738a]" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          remindersEnabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {remindersEnabled && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-600 font-medium">
                        Frequency
                      </span>
                      <div className="flex gap-1">
                        {(["biweekly", "monthly"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setReminderFreq(f)}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                              reminderFreq === f
                                ? "bg-[#e4f4f7] text-[#02738a] font-bold border border-[#c2e7ef]"
                                : "bg-slate-50 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {f === "biweekly" ? "Every 2 Weeks" : "Monthly"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Health Data & Storage */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5e7380] px-1">
                  Health Data &amp; Storage
                </div>
                <div className="rounded-3xl bg-white/95 border border-[#d8ebef] shadow-xs p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="font-bold text-sm text-[#0c1e27]"
                        style={{ fontFamily: F.display }}
                      >
                        Local Voice Sessions
                      </div>
                      <div className="text-xs text-slate-500">
                        {screeningsList.length} session
                        {screeningsList.length === 1 ? "" : "s"} stored in
                        IndexedDB
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                      {isOffline ? "Offline Ready" : "Local Encrypted"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (screeningsList.length > 0) {
                          generateAndDownloadReport(screeningsList[0])

                          setSettingsToast("Clinical PDF report downloaded!")

                          setTimeout(() => setSettingsToast(null), 3000)
                        } else {
                          setSettingsToast(
                            "No screening records found to export.",
                          )

                          setTimeout(() => setSettingsToast(null), 3000)
                        }
                      }}
                      className="py-2.5 px-3 rounded-2xl bg-[#e3f4f7] hover:bg-[#d4eff4] text-[#01586a] border border-[#cbe6ed] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export PDF</span>
                    </button>

                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Data</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 5: Clinical Architecture & Compliance */}
              <div className="p-4 rounded-3xl bg-slate-100/80 border border-slate-200/70 text-xs text-slate-500 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-700 text-xs">
                  <span>SwarSanket AI v2.4</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold">
                    ABHA Ready
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Powered by 8-Qubit PennyLane Quantum Variational Circuits
                  &amp; Faster-Whisper. Data is encrypted and remains locally
                  stored on your device under DPDP guidelines.
                </p>
              </div>

              <button
                onClick={onLogout}
                className="w-full rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 active:scale-[0.98]"
                style={{ fontFamily: F.display }}
              >
                Logout
              </button>
            </div>

            {/* Edit Profile Modal */}
            {isEditingProfile && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-3xl bg-white p-5 space-y-4 shadow-2xl border border-slate-100 animate-fade-in-up">
                  <div className="flex items-center justify-between">
                    <h2
                      className="text-lg font-bold text-[#0c1e27]"
                      style={{ fontFamily: F.display }}
                    >
                      Edit Patient Profile
                    </h2>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#cbe6ed] focus:outline-none focus:border-[#02738a] font-medium text-slate-800"
                        placeholder="e.g. Rama Devi"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Age
                      </label>
                      <input
                        type="number"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#cbe6ed] focus:outline-none focus:border-[#02738a] font-medium text-slate-800"
                        placeholder="e.g. 72"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Caregiver Name &amp; Role
                      </label>
                      <input
                        type="text"
                        value={caregiverName}
                        onChange={(e) => setCaregiverName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#cbe6ed] focus:outline-none focus:border-[#02738a] font-medium text-slate-800"
                        placeholder="e.g. Ramesh Kumar (Son)"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Caregiver Emergency Phone
                      </label>
                      <input
                        type="tel"
                        value={caregiverPhone}
                        onChange={(e) => setCaregiverPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#cbe6ed] focus:outline-none focus:border-[#02738a] font-medium text-slate-800"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const trimmedName = editName.trim() || "Rama Devi"

                        const parsedAge = parseInt(editAge, 10) || 72

                        setUserName(trimmedName)

                        setUserAge(parsedAge)

                        setIsEditingProfile(false)

                        setSettingsToast("Patient profile updated!")

                        setTimeout(() => setSettingsToast(null), 3000)
                      }}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#02738a] to-[#01586a] hover:from-[#02849f] hover:to-[#02738a] text-white font-bold text-xs shadow-md shadow-[#02738a]/20 transition-all"
                    >
                      Save Profile
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Clear History Confirmation Modal */}
            {showClearConfirm && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="w-full max-w-xs rounded-3xl bg-white p-5 space-y-3 shadow-2xl border border-slate-100 text-center animate-fade-in-up">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h3
                    className="font-bold text-base text-slate-900"
                    style={{ fontFamily: F.display }}
                  >
                    Clear Local Test History?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This will delete all past voice screenings and audio records
                    saved on this device.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await clearAllScreenings()

                        setScreeningsList([])

                        setShowClearConfirm(false)

                        setSettingsToast("Local screening history cleared!")

                        setTimeout(() => setSettingsToast(null), 3000)
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all"
                    >
                      Delete All
                    </button>
                  </div>
                </div>
              </div>
            )}

            <BottomNav active="settings" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        )

      case "needMoreSpeech": {
        const req = screeningApiResult?.sample_requirements

        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4 animate-fade-in">
              <div className="flex flex-col items-center justify-center pt-4 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 text-[#02738a] flex items-center justify-center shadow-xs">
                  <Mic className="w-9 h-9" />
                </div>
                <h1
                  className="text-2xl font-bold text-slate-900"
                  style={{ fontFamily: F.display }}
                >
                  A Little More, Please
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We need a bit more speech before we can look at it properly.
                </p>
              </div>

              {req && (
                <div className="w-full p-5 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Words recorded</span>
                    <span className="font-bold text-slate-900">
                      {req.words_recorded} of {req.words_required} needed
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#02738a]"
                      style={{
                        width: `${Math.min(100, (req.words_recorded / req.words_required) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">Time recorded</span>
                    <span className="font-bold text-slate-900">
                      {req.seconds_recorded.toFixed(0)}s of{" "}
                      {req.seconds_required.toFixed(0)}s needed
                    </span>
                  </div>
                </div>
              )}

              {screeningApiResult?.transcript && (
                <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs text-left space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    What we heard
                  </div>
                  <p className="text-xs italic text-slate-700 leading-relaxed bg-[#f8fbfd] p-3 rounded-xl border border-slate-100">
                    "{screeningApiResult.transcript}"
                  </p>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-[#015364] leading-relaxed">
                <span className="font-bold">Tip:</span> describe everyone in the
                picture, what each person is doing, and what is happening around
                them. Take your time — there is no rush, and nothing here is a
                test you can fail.
              </div>

              <div className="w-full space-y-2.5 pt-1 pb-4">
                <Btn
                  label="Try Again"
                  onClick={() => {
                    setRecordingContext("pictureDesc")

                    navigate("instruction")
                  }}
                />
                <Btn
                  label={t(lang, "done")}
                  onClick={() => navigate("home")}
                  variant="ghost"
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        )
      }

      case "offlineSaved":
        return (
          <div className="h-full flex flex-col items-center justify-center px-6 bg-[#f3f9fb] min-h-0 overflow-hidden animate-fade-in space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
              <WifiOff className="w-10 h-10" />
            </div>
            <div className="text-center space-y-1">
              <h1
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: F.display }}
              >
                Saved Safely Offline
              </h1>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                Your audio recording is stored securely in IndexedDB on this
                device. It will automatically sync when connection is restored.
              </p>
            </div>
            <div className="w-full space-y-3 pt-4">
              <Btn label="Continue to Home" onClick={() => navigate("home")} />
            </div>
            <HomeIndicator />
          </div>
        )

      case "voiceQuality":
        return (
          <div className="h-full flex flex-col items-center justify-center px-6 bg-[#f3f9fb] min-h-0 overflow-hidden animate-fade-in space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="text-center space-y-1">
              <h1
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: F.display }}
              >
                {t(lang, "vqPoorTitle")}
              </h1>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                {t(lang, "vqPoorSub")}
              </p>
            </div>
            <div className="w-full space-y-3 pt-4">
              <Btn
                label={t(lang, "recordAgain")}
                onClick={() => navigate("recording")}
              />
              <Btn
                label={t(lang, "continueAnyway")}
                onClick={() => navigate("recordingReview")}
                variant="ghost"
              />
            </div>
            <HomeIndicator />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#031d25] via-[#02171e] to-[#010e13] p-0 sm:p-4 md:p-6"
      style={{ fontFamily: F.body }}
    >
      {/* Top / Floating Demo Navigation Bar on Desktop */}
      <div className="nv-demo-nav fixed top-3 sm:top-4 left-3 right-3 sm:left-4 sm:right-4 z-40 flex flex-wrap items-center justify-between gap-2 max-w-5xl mx-auto px-4 py-2 rounded-2xl bg-[#03222a]/90 border border-[#0d4f5e] backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpeg"
            alt="SwarSanket Logo"
            className="w-8 h-8 rounded-xl shadow-md object-contain border border-[#0e5666]"
          />
          <div>
            <div
              className="text-xs font-bold text-white tracking-wide"
              style={{ fontFamily: F.display }}
            >
              SwarSanket Mobile
            </div>
            <div className="text-[10px] text-[#38bdf8] font-medium">
              SIH 2026 AI Early Screening
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("home")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
              screen !== "doctorDash"
                ? "bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white"
                : "bg-[#042a35] border border-[#0d4f5e] hover:bg-[#073c4b] text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient View</span>
          </button>

          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isOffline
                ? "bg-amber-600 text-white"
                : "bg-[#042a35] border border-[#0d4f5e] text-slate-200 hover:bg-[#073c4b]"
            }`}
          >
            {isOffline ? (
              <WifiOff className="w-3.5 h-3.5" />
            ) : (
              <Wifi className="w-3.5 h-3.5" />
            )}
            <span>{isOffline ? "Offline Mode" : "Online"}</span>
          </button>

          <button
            onClick={() => navigate("doctorDash")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
              screen === "doctorDash"
                ? "bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white"
                : "bg-[#042a35] border border-[#0d4f5e] hover:bg-[#073c4b] text-slate-200"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Doctor View</span>
          </button>

          <button
            onClick={() => setFullScreenMode(!fullScreenMode)}
            className="px-2.5 py-1.5 rounded-xl bg-[#042a35] border border-[#0d4f5e] hover:bg-[#073c4b] text-slate-300 text-xs font-bold hidden sm:flex items-center gap-1"
          >
            {fullScreenMode ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Container: Native 100% on actual mobile vs polished mockup on desktop */}
      <div
        className={`nv-app-shell relative flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ${
          fullScreenMode
            ? "w-full max-w-2xl h-[92vh] rounded-3xl border border-[#0d4f5e] mt-14 sm:mt-16"
            : "w-full max-w-[390px] h-[844px] max-h-[calc(100vh-4.8rem)] rounded-none sm:rounded-[48px] border-0 sm:border-[8px] border-[#07252f] shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(2,115,138,0.15)] ring-1 ring-[#0d4f5e]/30 mt-12 sm:mt-16"
        }`}
      >
        {/* Dynamic Island on Mockup (Hidden on fullScreenMode and mobile viewports) */}
        {!fullScreenMode && (
          <div className="hidden sm:flex absolute top-2.5 left-1/2 -translate-x-1/2 z-50 w-28 h-7 rounded-full bg-[#02151c] border border-white/10 items-center justify-between px-3 pointer-events-none shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-[#04232c]" />
            <div className="w-2 h-2 rounded-full bg-[#02738a]/40" />
          </div>
        )}

        {/* Render Active Screen */}
        <div
          lang={lang}
          className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]"
        >
          {renderScreen()}
        </div>
      </div>

      {/* APK & PWA Download Modal */}
      <ApkDownloadModal
        isOpen={showApkModal}
        onClose={() => setShowApkModal(false)}
      />
    </div>
  )
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem("swarsanket-demo-session") === "active"
    } catch {
      return false
    }
  })

  const [authenticatedName, setAuthenticatedName] = useState<string>(
    () => readDemoUser()?.fullName || "Participant",
  )

  const handleLogout = () => {
    localStorage.removeItem("swarsanket-demo-session")

    // Signing out should return to the start of the flow, not resume someone

    // else mid-screening.

    clearSession()

    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return (
      <DemoAuth
        onAuthenticated={(fullName) => {
          setAuthenticatedName(
            fullName || readDemoUser()?.fullName || "Participant",
          )

          setIsAuthenticated(true)
        }}
      />
    )
  }

  return (
    <SwarSanketApp
      authenticatedName={authenticatedName}
      onLogout={handleLogout}
    />
  )
}
