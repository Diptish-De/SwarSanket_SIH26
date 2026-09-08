import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Volume2, Play, Pause, RotateCcw, Check, CheckCircle2,
  AlertCircle, AlertTriangle, Info, ShieldCheck, Lock, Globe, Users, User,
  Home as HomeIcon, History as HistoryIcon, HelpCircle, Phone, ArrowLeft,
  ArrowRight, ChevronRight, Download, Share2, FileText, Wifi, WifiOff,
  RefreshCw, Sliders, Calendar, Activity, Sparkles, Plus, Trash2, X,
  Maximize2, Minimize2, Smartphone, Stethoscope, Video, MessageSquare, Server
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

import {
  Screen, RecordingContext, LanguageCode, ScreeningRisk, ConfidenceLevel,
  VoiceQualityGrade, ScreeningSession, AudioTaskRecord, OfflineSyncItem
} from "./types";
import {
  getDB, saveScreeningSession, getAllScreenings, getOfflineQueue,
  markQueueItemSynced, seedInitialDemoData, addDoctorNote, getDoctorNotes
} from "./services/db";
import {
  VoiceRecorder,
  AudioRecordingResult,
  getLastRecordedAudioBlob,
  uploadAudioToBackend,
  analyzeAudioWithBackend,
  ScreeningApiResponse,
} from "./services/audioRecorder";
import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  checkBackendHealth,
  API_PRESETS,
  BackendHealthStatus,
  isCapacitorAndroid,
} from "./services/apiConfig";
import { speakText, stopSpeech, isSpeaking } from "./services/tts";
import { generateAndDownloadReport } from "./services/report";
import { ApkDownloadModal, APK_DOWNLOAD_URL, GITHUB_RELEASES_URL } from "./components/ApkDownloadModal";

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
};

const F = {
  display: "'Outfit', system-ui, sans-serif",
  body: "'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Bengali', system-ui, sans-serif",
};

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
];

const TX: Record<string, Record<string, string>> = {
  en: {
    greeting: "Hello",
    howFeeling: "How are you feeling today?",
    voiceCheckCard: "Voice Check",
    voiceCheckDesc: "Take a short 3–5 minute screening. Speak naturally — there are no right or wrong answers.",
    start: "START",
    previousCheck: "Previous Check",
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
    step1: "Listen", step2: "Speak", step3: "Finish",
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
    noConcernSub: "This screening did not identify patterns that require immediate follow-up. Continue regular health check-ups.",
    done: "Done",
    viewHistory: "View History",
    furtherEval: "Further evaluation recommended",
    furtherEvalSub: "The screening found some patterns that may benefit from professional assessment.",
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
    helpOfflineDesc: "You can still record. Your data syncs when you reconnect.",
    micDeniedTitle: "Microphone access is needed",
    micDeniedSub: "To record your voice, please allow microphone access in your browser or phone settings.",
    allowMic: "Allow Microphone",
    noScreeningsTitle: "No Voice Checks yet",
    noScreeningsSub: "No worries. Your first check takes about 3–5 minutes.",
  },
  hi: {
    greeting: "नमस्ते",
    howFeeling: "आज आप कैसा महसूस कर रहे हैं?",
    voiceCheckCard: "Voice Check",
    voiceCheckDesc: "3–5 मिनट की छोटी जांच करें। स्वाभाविक रूप से बोलें — कोई सही या गलत जवाब नहीं है।",
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
    step1: "सुनें", step2: "बोलें", step3: "पूरा करें",
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
    noConcernSub: "इस जांच में कोई ऐसे संकेत नहीं मिले जिन पर तुरंत ध्यान देने की जरूरत हो। नियमित स्वास्थ्य जांच जारी रखें।",
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
    helpOfflineDesc: "आप फिर भी रिकॉर्ड कर सकते हैं। इंटरनेट मिलने पर डेटा सिंक हो जाता है।",
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
    voiceCheckDesc: "৩–৫ মিনিটের একটি ছোট পরীক্ষা করুন। স্বাভাবিকভাবে কথা বলুন — কোনো সঠিক বা ভুল উত্তর নেই।",
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
    step1: "শুনুন", step2: "বলুন", step3: "শেষ করুন",
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
    noConcernSub: "এই পরীক্ষায় এমন কোনো নিদর্শন পাওয়া যায়নি যার জন্য তাৎক্ষণিক ফলো-আপ প্রয়োজন।",
    done: "সম্পন্ন",
    viewHistory: "ইতিহাস দেখুন",
    furtherEval: "আরও মূল্যায়নের পরামর্শ",
    furtherEvalSub: "পরীক্ষায় কিছু নিদর্শন পাওয়া গেছে যার পেশাদার মূল্যায়ন থেকে উপকার হতে পারে।",
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
};

function t(lang: string, key: string): string {
  return (TX[lang] ?? TX.en)[key] ?? TX.en[key] ?? key;
}

const TASK_PROMPTS: Record<string, Record<RecordingContext, string>> = {
  en: {
    freeSpeech: "Tell us about your day.",
    pictureDesc: "Tell us what you see in the picture.",
    memoryRecall: "Cow, River, Book, House, Flower",
    conversation: "Tell us about something you enjoy doing.",
  },
  hi: {
    freeSpeech: "हमें अपने दिन के बारे में बताइए।",
    pictureDesc: "आप इस तस्वीर में क्या देख रहे हैं? बताइए।",
    memoryRecall: "गाय, नदी, किताब, घर, फूल",
    conversation: "हमें बताइए कि आपको क्या करना पसंद है।",
  },
  bn: {
    freeSpeech: "আমাদের আপনার দিনের কথা বলুন।",
    pictureDesc: "আপনি এই ছবিতে কী দেখছেন? বলুন।",
    memoryRecall: "গাভী, নদী, বই, বাড়ি, ফুল",
    conversation: "আপনি কী করতে পছন্দ করেন তা বলুন।",
  },
};

function getTaskPrompt(lang: string, ctx: RecordingContext): string {
  return (TASK_PROMPTS[lang] ?? TASK_PROMPTS.en)[ctx] ?? TASK_PROMPTS.en[ctx];
}

// ─── Reusable UI Components ───────────────────────────────────────────────────

function StatusBar({ light = false }: { light?: boolean }) {
  const col = light ? "rgba(255,255,255,0.88)" : "#0c1e27";
  return (
    <div className="h-11 px-6 flex items-center justify-between flex-shrink-0 select-none" style={{ fontFamily: F.body }}>
      <span className="text-xs font-bold tracking-tight" style={{ color: col }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill={col}>
          <rect x="0" y="6" width="3" height="5" rx="0.5" opacity="0.4"/>
          <rect x="4.5" y="4" width="3" height="7" rx="0.5" opacity="0.6"/>
          <rect x="9" y="2" width="3" height="9" rx="0.5" opacity="0.8"/>
          <rect x="13.5" y="0" width="3" height="11" rx="0.5"/>
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill={col}>
          <path d="M7.5 2.5C9.8 2.5 11.8 3.5 13.2 5L14.5 3.7C12.7 1.9 10.2 0.8 7.5 0.8C4.8 0.8 2.3 1.9 0.5 3.7L1.8 5C3.2 3.5 5.2 2.5 7.5 2.5Z" opacity="0.4"/>
          <path d="M7.5 5.2C9 5.2 10.4 5.8 11.4 6.8L12.7 5.5C11.3 4.2 9.5 3.4 7.5 3.4S3.7 4.2 2.3 5.5L3.6 6.8C4.6 5.8 6 5.2 7.5 5.2Z" opacity="0.75"/>
          <circle cx="7.5" cy="9.5" r="1.5"/>
        </svg>
        <svg width="25" height="11" viewBox="0 0 25 11" fill={col}>
          <rect x="0.5" y="0.5" width="20" height="10" rx="2.5" stroke={col} strokeWidth="1" fill="none" opacity="0.4"/>
          <rect x="2" y="2" width="15" height="7" rx="1.5"/>
          <path d="M21.5 3.5v4a2 2 0 000-4z" opacity="0.5"/>
        </svg>
      </div>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div className="flex justify-center pb-2 pt-1 flex-shrink-0">
      <div className="w-32 h-1 rounded-full bg-slate-300" />
    </div>
  );
}

function NVLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="SwarSanket Logo"
      className={`rounded-2xl shadow-sm object-contain flex-shrink-0 transition-transform hover:scale-105 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function Btn({
  label, onClick, variant = "primary", size = "lg", disabled, icon,
}: {
  label: string; onClick: () => void;
  variant?: "primary" | "ghost" | "danger" | "secondary";
  size?: "lg" | "sm"; disabled?: boolean; icon?: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    primary: "bg-gradient-to-r from-[#02738a] via-[#027d95] to-[#01586a] hover:from-[#02849f] hover:to-[#01687d] text-white shadow-lg shadow-[#02738a]/25",
    secondary: "bg-[#e4f4f7] text-[#01586a] border border-[#c2e7ef] hover:bg-[#d5eff5]",
    ghost: "bg-white/80 text-[#02738a] border-2 border-[#02738a] hover:bg-[#e4f4f7]",
    danger: "bg-rose-50 text-rose-700 border-2 border-rose-200 hover:bg-rose-100",
  };

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
  );
}

function AudioBtn({ label, textToSpeak, lang }: { label?: string; textToSpeak?: string; lang?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const currentLang = lang || "en";
  const lbl = label ?? "Listen";

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
    } else {
      const text = textToSpeak || lbl;
      speakText(text, currentLang, () => setSpeaking(true), () => setSpeaking(false));
    }
  };

  return (
    <button
      onClick={handleSpeak}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#f0f9fb] to-[#e4f4f7] border border-[#cbe6ec] hover:border-[#02738a] hover:bg-[#dcf1f6] text-[#01586a] transition-all active:scale-95 shadow-xs"
      style={{ fontFamily: F.body }}
    >
      <Volume2 className={`w-4 h-4 text-[#02738a] ${speaking ? "animate-pulse" : ""}`} />
      <span>{speaking ? "Speaking…" : lbl}</span>
    </button>
  );
}

function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="w-10 h-10 rounded-2xl bg-white border border-[#d7eaef] flex items-center justify-center text-[#30434f] hover:text-[#0c1e27] hover:bg-slate-50 hover:border-[#02738a] transition-all active:scale-90 shadow-xs"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}

function OfflinePill() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
      <WifiOff className="w-3.5 h-3.5 text-amber-600" />
      <span>Offline</span>
    </div>
  );
}

function BottomNav({ active, navigate, lang }: { active: Screen; navigate: (s: Screen) => void; lang: string }) {
  const isHistory = active === "history" || active === "trend";
  const tabs = [
    { id: "home" as Screen, labelKey: "home", icon: HomeIcon },
    { id: "history" as Screen, labelKey: "history", icon: HistoryIcon },
    { id: "help" as Screen, labelKey: "help", icon: HelpCircle },
    { id: "settings" as Screen, labelKey: "profile", icon: User },
  ];
  return (
    <div className="flex border-t border-[#d7eaef] bg-white/95 backdrop-blur px-2 py-1.5 flex-shrink-0">
      {tabs.map((tab) => {
        const on = tab.id === active || (tab.id === "history" && isHistory);
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 transition-all rounded-xl ${
              on ? "text-[#02738a] font-bold bg-[#e4f4f7] shadow-xs" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon className={`w-5 h-5 ${on ? "text-[#02738a]" : "text-slate-400"}`} />
            <span className="text-[11px]" style={{ fontFamily: F.body }}>
              {t(lang, tab.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CheckProgress({ step, total }: { step: number; total: number }) {
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
  );
}

function CheckHeader({
  step, total, onBack, onExit,
}: {
  step: number; total: number;
  onBack: () => void; onExit: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#d7eaef] bg-white/95 backdrop-blur flex-shrink-0">
      <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <CheckProgress step={step} total={total} />
      <button onClick={onExit} className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ExitModal({ lang, onContinue, onExit }: { lang: string; onContinue: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full p-6 rounded-t-3xl bg-white space-y-4 shadow-2xl border-t border-[#d7eaef]">
        <div className="w-12 h-1 rounded-full bg-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-center text-slate-900" style={{ fontFamily: F.display }}>
          {t(lang, "leaveTitle")}
        </h2>
        <p className="text-sm text-center text-slate-500 leading-relaxed" style={{ fontFamily: F.body }}>
          {t(lang, "leaveSub")}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Btn label={t(lang, "continueCheck")} onClick={onContinue} />
          <Btn label={t(lang, "exit")} onClick={onExit} variant="ghost" />
        </div>
        <HomeIndicator />
      </div>
    </div>
  );
}

function DynamicWaveformBars({ active, level = 0.3, bars = 24 }: { active: boolean; level?: number; bars?: number }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-14">
      {Array.from({ length: bars }).map((_, i) => {
        const heightMultiplier = active ? 0.3 + 0.7 * Math.sin((i / bars) * Math.PI) * (0.4 + level * 0.8) : 0.2;
        const barHeight = Math.max(6, Math.min(48, heightMultiplier * 48));
        return (
          <div
            key={i}
            className="w-1.5 rounded-full bg-[#02738a] transition-all duration-75"
            style={{
              height: barHeight,
              opacity: active ? 0.7 + 0.3 * Math.sin(i) : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main Application Component ───────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [lang, setLang] = useState<LanguageCode>("hi");
  const [userName, setUserName] = useState<string>("Rama Devi");
  const [userAge, setUserAge] = useState<number>(72);
  const [assistedMode, setAssistedMode] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [recordingContext, setRecordingContext] = useState<RecordingContext>("freeSpeech");
  const [lastResult, setLastResult] = useState<ScreeningRisk | null>("elevated");
  const [fullScreenMode, setFullScreenMode] = useState<boolean>(false);
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const [screeningsList, setScreeningsList] = useState<ScreeningSession[]>([]);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncItem[]>([]);
  const [vqState, setVqState] = useState<VoiceQualityGrade>("good");
  const [selectedPatient, setSelectedPatient] = useState<string>("Rama Devi");
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>("");
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  // Real ML Screening state
  const [screeningApiResult, setScreeningApiResult] = useState<ScreeningApiResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState<"idle" | "uploading" | "analyzing" | "complete">("idle");

  // Backend API URL & Health state (Android & Web dynamic configuration)
  const [currentApiUrl, setCurrentApiUrl] = useState<string>(getApiBaseUrl());
  const [customApiUrlInput, setCustomApiUrlInput] = useState<string>(getApiBaseUrl());
  const [apiHealth, setApiHealth] = useState<BackendHealthStatus | null>(null);
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);

  // Recorder state
  const recorderRef = useRef<VoiceRecorder>(new VoiceRecorder());
  const [micLevel, setMicLevel] = useState<number>(0.2);
  const [recordingSecs, setRecordingSecs] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Recording seconds interval
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording && !isPaused) {
      timer = setInterval(() => {
        setRecordingSecs((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording, isPaused]);

  // Load IndexedDB and probe Backend Health on start
  useEffect(() => {
    async function init() {
      await seedInitialDemoData();
      const screenings = await getAllScreenings();
      setScreeningsList(screenings);
      const queue = await getOfflineQueue();
      setSyncQueue(queue);

      // Probe backend connectivity in background
      try {
        const health = await checkBackendHealth();
        setApiHealth(health);
      } catch {
        // quiet fail on init
      }
    }
    init();
  }, []);

  const handleTestApi = async (target?: string) => {
    setIsTestingApi(true);
    const toTest = target || customApiUrlInput;
    const res = await checkBackendHealth(toTest);
    setApiHealth(res);
    setIsTestingApi(false);
  };

  const handleApplyApiUrl = (newUrl: string) => {
    const saved = setApiBaseUrl(newUrl);
    setCurrentApiUrl(saved);
    setCustomApiUrlInput(saved);
    handleTestApi(saved);
  };

  const handleResetApi = () => {
    resetApiBaseUrl();
    const def = getApiBaseUrl();
    setCurrentApiUrl(def);
    setCustomApiUrlInput(def);
    handleTestApi(def);
  };

  const navigate = (s: Screen) => {
    stopSpeech();
    setScreen(s);
  };

  const handleStartRecording = async () => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordingSecs(0);
    await recorderRef.current.start((level) => {
      setMicLevel(level);
    });
  };

  const handlePauseRecording = () => {
    if (isPaused) {
      recorderRef.current.resume();
      setIsPaused(false);
    } else {
      recorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleFinishRecording = async (nextScreen: Screen = "recordingReview") => {
    setIsRecording(false);
    setIsPaused(false);
    try {
      const res: AudioRecordingResult = await recorderRef.current.stop();
      setCurrentAudioUrl(res.audioUrl);
      setCurrentAudioBlob(res.blob);
      audioBlobRef.current = res.blob;
      setVqState(res.quality);

      // Log the exact recording details: MIME type, file size in bytes, duration, and object URL
      console.log("[SwarSanket] Real audio recording captured successfully:", {
        mimeType: res.blob.type,
        sizeBytes: res.blob.size,
        duration: `${res.durationSeconds}s`,
        objectUrl: res.audioUrl,
      });

      // Retain globally so it can be accessed anywhere (backend upload, debugging, etc.)
      if (typeof window !== "undefined") {
        (window as unknown as {
          __lastRecordedVoiceBlob?: Blob;
          __lastAudioRecording?: AudioRecordingResult;
          getAudioBlobForUpload?: () => Blob | null;
        }).__lastRecordedVoiceBlob = res.blob;
        (window as unknown as {
          __lastRecordedVoiceBlob?: Blob;
          __lastAudioRecording?: AudioRecordingResult;
          getAudioBlobForUpload?: () => Blob | null;
        }).__lastAudioRecording = res;
        (window as unknown as {
          __lastRecordedVoiceBlob?: Blob;
          __lastAudioRecording?: AudioRecordingResult;
          getAudioBlobForUpload?: () => Blob | null;
        }).getAudioBlobForUpload = () => audioBlobRef.current;
      }

      if (isOffline) {
        navigate("offlineSaved");
        return;
      }

      if (res.quality === "poor" || res.quality === "low") {
        navigate("voiceQuality");
      } else {
        navigate(nextScreen);
      }
    } catch (err) {
      console.error("[SwarSanket] handleFinishRecording error:", err);
    }
  };

  const handleRunRealScreening = useCallback(async () => {
    const audioBlob = audioBlobRef.current || currentAudioBlob || getLastRecordedAudioBlob();

    if (!audioBlob || audioBlob.size < 1000) {
      console.warn("[SwarSanket] Recorded audio Blob is empty or too short:", audioBlob?.size);
      setAnalysisError("Recording is too short or quiet. Please record for at least 3-5 seconds speaking clearly into the microphone.");
      setIsAnalyzing(false);
      setAnalysisStep("idle");
      return;
    }

    if (isOffline) {
      console.log("[SwarSanket] Offline mode active, queuing recording for later sync.");
      handleSaveCompletedSession("uncertain");
      navigate("offlineSaved");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep("uploading");

    console.log("[SwarSanket] Recording complete");
    console.log("[SwarSanket] Audio size:", audioBlob.size, "bytes");
    console.log("[SwarSanket] Sending audio for analysis to backend...");

    try {
      setAnalysisStep("analyzing");
      const apiResult = await analyzeAudioWithBackend(audioBlob, "voice_check.webm");

      console.log("[SwarSanket] Analysis complete");
      console.log("[SwarSanket] Predicted class:", apiResult.screening.predicted_class);
      console.log("[SwarSanket] Screening probability:", apiResult.screening.probability);
      console.log("[SwarSanket] Technical confidence:", apiResult.screening.technical_confidence_percent + "%");
      if (apiResult.explanation) {
        console.log("[SwarSanket] Top positive SHAP:", apiResult.explanation.top_positive_contributions);
        console.log("[SwarSanket] Top negative SHAP:", apiResult.explanation.top_negative_contributions);
      }

      setScreeningApiResult(apiResult);
      setAnalysisStep("complete");

      const risk: ScreeningRisk = apiResult.screening.predicted_class === 1 ? "elevated" : "low";
      const confidenceLevel: ConfidenceLevel =
        apiResult.screening.technical_confidence_percent >= 70
          ? "high"
          : apiResult.screening.technical_confidence_percent >= 40
          ? "moderate"
          : "low";

      const wordRate = apiResult.live_features?.["CTP_Word Rate(-/s)"] || 0;
      const speechRateWpm = Math.max(10, Math.round(wordRate * 60));
      const pauseRatio = Math.round(apiResult.audio?.silence_percentage || 20);

      // Extract real SHAP factors if available from backend
      const realShapContributions: Array<{ feature: string; impact: "positive" | "negative"; weight: number }> = [];
      if (apiResult.explanation?.top_positive_contributions) {
        for (const item of apiResult.explanation.top_positive_contributions.slice(0, 3)) {
          realShapContributions.push({
            feature: item.feature,
            impact: "positive",
            weight: Number(item.shap_value.toFixed(4)),
          });
        }
      }
      if (apiResult.explanation?.top_negative_contributions) {
        for (const item of apiResult.explanation.top_negative_contributions.slice(0, 3)) {
          realShapContributions.push({
            feature: item.feature,
            impact: "negative",
            weight: Number(item.shap_value.toFixed(4)),
          });
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
            durationSeconds: Math.round(apiResult.audio?.duration_seconds || 15),
            quality: vqState,
            timestamp: new Date().toISOString(),
          },
        ],
        biomarkers: {
          speechRateWpm,
          pausePatternRatio: pauseRatio,
          pitchVariationHz: Math.round((apiResult.audio?.rms_energy || 0.05) * 1000),
          jitterPercent: 1.5,
          shimmerDb: 2.3,
          hnrDb: 24.5,
        },
        mlResult: {
          screeningRisk: risk,
          confidenceScore: apiResult.screening.probability,
          confidenceLevel,
          classicalModel: {
            name: "Production XGBoost (20-Feature Contract)",
            riskScore: apiResult.screening.probability,
            aucScore: 0.898,
          },
          quantumHybridModel: {
            name: "Tree SHAP Factor Attribution",
            riskScore: apiResult.screening.probability,
            aucScore: 0.898,
          },
          shapContributions: realShapContributions.length > 0 ? realShapContributions : [
            {
              feature: "Word Rate (-/s)",
              impact: wordRate < 2.5 ? "positive" : "negative",
              weight: Number(wordRate.toFixed(2)),
            },
            {
              feature: "Unique IU Efficiency",
              impact: "positive",
              weight: Number((apiResult.live_features?.CTP_unique_IU_efficiency || 0).toFixed(2)),
            },
            {
              feature: "Keyword TTR",
              impact: "positive",
              weight: Number((apiResult.live_features?.["CTP_ keyword_TTR"] || 0).toFixed(2)),
            },
          ],
        },
        synced: true,
      };

      const audioBlobs = [
        {
          taskId: recordingContext,
          blob: audioBlob,
          durationSeconds: Math.round(apiResult.audio?.duration_seconds || 15),
        },
      ];

      await saveScreeningSession(newSession, audioBlobs);
      const updated = await getAllScreenings();
      setScreeningsList(updated);
      setLastResult(risk);
      setIsAnalyzing(false);

      if (risk === "elevated") {
        navigate("resultElevated");
      } else {
        navigate("resultLow");
      }
    } catch (err: unknown) {
      setIsAnalyzing(false);
      setAnalysisStep("idle");
      console.error("[SwarSanket] Real screening analysis failed:", err);
      const userMessage =
        err instanceof Error && err.message
          ? err.message
          : "We couldn't analyze your recording right now. Please check your connection and try again.";
      setAnalysisError(userMessage);
    }
  }, [audioBlobRef, currentAudioBlob, isOffline, lang, userName, userAge, assistedMode, vqState, recordingContext]);

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
        classicalModel: { name: "Production XGBoost", riskScore: risk === "low" ? 0.15 : 0.85, aucScore: 0.91 },
        quantumHybridModel: { name: "NLP Feature Engine", riskScore: risk === "low" ? 0.15 : 0.85, aucScore: 0.91 },
        shapContributions: [
          { feature: "Speech pause duration", impact: "positive", weight: +0.32 },
          { feature: "Word Rate", impact: "positive", weight: +0.28 },
        ],
      },
      synced: !isOffline,
    };

    const audioBlobs = audioBlobRef.current
      ? [{ taskId: recordingContext, blob: audioBlobRef.current, durationSeconds: 24 }]
      : undefined;

    await saveScreeningSession(newSession, audioBlobs);
    const updated = await getAllScreenings();
    setScreeningsList(updated);
    setLastResult(risk);
  };

  useEffect(() => {
    if (screen === "processing" && !isAnalyzing && !analysisError) {
      handleRunRealScreening();
    }
  }, [screen, isAnalyzing, analysisError, handleRunRealScreening]);

  // ─── Individual Screen Views ───────────────────────────────────────────────

  const renderScreen = () => {
    switch (screen) {
      case "splash":
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#02738a] via-[#01586a] to-[#013540] text-white animate-fade-in select-none">
            <div className="relative mb-6 animate-splash">
              <div className="absolute inset-0 rounded-[32px] bg-[#02738a]/40 blur-2xl animate-pulse" />
              <img
                src="/logo.png"
                alt="SwarSanket Logo"
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] shadow-2xl object-contain border border-white/40"
              />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-center" style={{ fontFamily: F.display }}>
              SwarSanket
            </h1>
            <p className="text-cyan-100 text-base sm:text-lg mt-2 text-center" style={{ fontFamily: F.body }}>
              Listen. Speak. Screen Early.
            </p>
            <div className="flex items-center gap-1.5 mt-6">
              {[8, 18, 28, 14, 24, 10, 20, 28, 12, 22].map((h, i) => (
                <div key={i} className="w-1 bg-white/60 rounded-full animate-pulse" style={{ height: h, animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
            <div className="mt-12 w-full max-w-xs">
              <button
                onClick={() => navigate("language")}
                className="w-full py-4 rounded-2xl bg-white text-[#01586a] font-bold text-lg shadow-xl shadow-black/20 hover:bg-[#f0f9fb] transition-all active:scale-95"
                style={{ fontFamily: F.display }}
              >
                Get Started →
              </button>
            </div>
          </div>
        );

      case "language":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="px-6 pt-2 pb-2 space-y-1 shrink-0">
              <NVLogo size={36} />
              <h1 className="text-xl font-bold text-[#0c1e27] pt-1" style={{ fontFamily: F.display }}>
                Choose your language
              </h1>
              <p className="text-xs text-[#5e7380]" style={{ fontFamily: F.body }}>
                आप इसे बाद में भी बदल सकते हैं।
              </p>
              <div className="pt-0.5">
                <AudioBtn label="Listen in English" textToSpeak="Please select your preferred language" lang="en" />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              <div className="grid grid-cols-2 gap-2.5 pb-3">
                {LANGUAGES.map((l) => {
                  const on = lang === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`relative p-3.5 rounded-2xl text-left border-2 transition-all active:scale-95 ${
                        on ? "bg-[#e4f4f7] border-[#02738a] shadow-md shadow-[#02738a]/15 text-[#01586a]" : "bg-white border-[#d7eaef] hover:border-[#bce3eb]"
                      }`}
                    >
                      {on && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#02738a] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="text-lg font-bold text-[#0c1e27]" style={{ fontFamily: F.body }}>
                        {l.native}
                      </div>
                      <div className="text-xs text-[#5e7380] mt-0.5">{l.name}</div>
                    </button>
                  );
                })}
              </div>
              <div className="p-3 rounded-2xl bg-[#eef8fa] border border-[#cbe6ec] text-[11px] text-[#01586a] leading-relaxed mb-3">
                <span className="font-bold">Multilingual Pipeline Scope:</span> English voice screenings use the validated acoustic &amp; linguistic feature pipeline. Indic languages (Hindi, Bengali, etc.) currently feature live speech recognition with acoustic biomarker screening.
              </div>
            </div>
            <div className="p-4 sm:p-5 bg-white border-t border-[#d7eaef] shrink-0 shadow-lg z-10">
              <Btn label="Continue" onClick={() => navigate("welcome")} />
            </div>
            <HomeIndicator />
          </div>
        );

      case "welcome":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="px-6 pt-2"><NVLogo size={36} /></div>
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-3 pb-4 flex flex-col gap-4 animate-fade-in-up">
              {/* Healthcare banner with official logo */}
              <div className="w-full h-44 rounded-3xl bg-gradient-to-tr from-[#fdfcf7] via-[#f0f8fa] to-[#e4f4f7] border border-[#cbe6ec] flex items-center justify-center p-4 shadow-sm relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-[#02738a]/10 blur-xl" />
                <div className="text-center space-y-2 relative z-10">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-[#bce3eb] bg-white">
                    <img src="/logo.png" alt="SwarSanket Logo" className="w-14 h-14 object-contain rounded-xl" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#01586a]" style={{ fontFamily: F.display }}>
                    SwarSanket Voice Screening
                  </div>
                  <div className="text-[11px] text-[#5e7380]">AI-Powered Cognitive Biomarker Analysis</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-3xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                  {t(lang, "greeting")} 👋
                </h1>
                <p className="text-lg text-[#30434f] leading-relaxed font-medium" style={{ fontFamily: F.body }}>
                  {t(lang, "welcomeSub")}
                </p>
                <p className="text-xs text-[#5e7380]" style={{ fontFamily: F.body }}>
                  {t(lang, "welcomeTime")}
                </p>
                <AudioBtn textToSpeak={`${t(lang, "greeting")}. ${t(lang, "welcomeSub")}`} lang={lang} />
              </div>

              <div className="flex-1" />

              <div className="space-y-3 pt-2">
                <Btn label={t(lang, "startVoiceCheck")} onClick={() => navigate("consent")} />
                <Btn
                  label={t(lang, "someoneHelping")}
                  onClick={() => { setAssistedMode(true); navigate("consent"); }}
                  variant="ghost"
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "consent":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-4 pb-4 animate-fade-in-up space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                  Before we begin
                </h1>
                <p className="text-xs text-[#5e7380] mt-0.5">A quick note about your privacy & security.</p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: <Mic className="w-5 h-5 text-[#02738a]" />, title: "Voice Recording", desc: "Short audio samples are recorded for early cognitive screening." },
                  { icon: <ShieldCheck className="w-5 h-5 text-[#02738a]" />, title: "Privacy & Encryption", desc: "Stored locally on your phone and shared only with your doctor's permission." },
                  { icon: <Activity className="w-5 h-5 text-[#02738a]" />, title: "Screening Instrument", desc: "Results recommend health steps and do not replace a medical diagnosis." },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-start gap-3.5 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-[#e4f4f7] flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#0c1e27]" style={{ fontFamily: F.display }}>{item.title}</div>
                      <div className="text-xs text-[#5e7380] mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <AudioBtn textToSpeak="We will record your voice for a short health screening. Your data is encrypted and secure." lang={lang} />

              <div className="flex-1" />

              <div className="space-y-2 pt-2">
                <Btn label="I Understand & Continue" onClick={() => navigate("profile")} />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "profile":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-4 pb-4 animate-fade-in-up space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                  Tell us about you
                </h1>
                <p className="text-xs text-[#5e7380] mt-0.5">We only ask what is needed for calibration.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#30434f] uppercase tracking-wider block mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-[#d7eaef] focus:border-[#02738a] outline-hidden font-medium text-[#0c1e27] text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#30434f] uppercase tracking-wider block mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    value={userAge}
                    onChange={(e) => setUserAge(Number(e.target.value))}
                    placeholder="Age"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-[#d7eaef] focus:border-[#02738a] outline-hidden font-medium text-[#0c1e27] text-base"
                  />
                </div>

                <div
                  onClick={() => setAssistedMode(!assistedMode)}
                  className="p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-bold text-sm text-[#0c1e27]" style={{ fontFamily: F.display }}>
                      {t(lang, "someoneHelping")}
                    </div>
                    <div className="text-xs text-[#5e7380] mt-0.5">Caregiver-assisted mode</div>
                  </div>
                  <div className={`w-12 h-7 rounded-full transition-colors flex items-center p-1 ${assistedMode ? "bg-[#02738a]" : "bg-slate-300"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${assistedMode ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Btn label={t(lang, "continue")} onClick={() => navigate("home")} />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "home":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-2 pb-3 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h1 className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                    {t(lang, "greeting")}, {userName} 👋
                  </h1>
                  <p className="text-xs text-[#5e7380]" style={{ fontFamily: F.body }}>
                    {t(lang, "howFeeling")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isOffline && <OfflinePill />}
                  <NVLogo size={42} />
                </div>
              </div>

              {/* Main Hero Voice Check Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#02738a] via-[#02697e] to-[#014755] text-white shadow-xl shadow-[#02738a]/20 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 shadow-inner">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">Ready when you are</div>
                    <div className="text-xl font-bold text-white" style={{ fontFamily: F.display }}>
                      {t(lang, "voiceCheckCard")}
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-cyan-50/90 leading-relaxed relative z-10">
                  {t(lang, "voiceCheckDesc")}
                </p>

                <button
                  onClick={() => {
                    setRecordingContext("freeSpeech");
                    navigate("voiceIntro");
                  }}
                  className="w-full py-4 rounded-2xl bg-white text-[#01586a] font-bold text-base sm:text-lg shadow-lg hover:bg-cyan-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ fontFamily: F.display }}
                >
                  <Play className="w-4 h-4 fill-[#01586a]" />
                  <span>{t(lang, "startVoiceCheck")}</span>
                </button>
              </div>

              {/* Latest Screening Status Card */}
              <div
                onClick={() => navigate("history")}
                className="p-4 rounded-2xl bg-white border border-[#d7eaef] hover:border-[#02738a] shadow-xs cursor-pointer space-y-2 transition-all group"
              >
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#5e7380]">
                  <span>{t(lang, "previousCheck")}</span>
                  <span className="text-[#02738a] group-hover:underline text-[11px] font-semibold lowercase first-letter:uppercase">view details →</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-[#0c1e27]" style={{ fontFamily: F.display }}>
                      Voice Screening #2026-08
                    </div>
                    <div className="text-xs text-[#5e7380] mt-0.5">28 Aug 2026 · Hindi · 68 WPM</div>
                  </div>
                  {lastResult === "elevated" ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Follow-up</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Normal</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { icon: HistoryIcon, labelKey: "history", to: "history" as Screen },
                  { icon: HelpCircle, labelKey: "help", to: "help" as Screen },
                  { icon: Users, labelKey: "caregiver", to: "caregiver" as Screen },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.labelKey}
                      onClick={() => navigate(a.to)}
                      className="p-3.5 rounded-2xl bg-white border border-[#d7eaef] hover:border-[#bce3eb] hover:bg-[#f8fcfd] flex flex-col items-center gap-2 shadow-xs transition-all active:scale-95"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-[#30434f]" style={{ fontFamily: F.body }}>
                        {t(lang, a.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* APK Download Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#03222a] to-[#04333f] text-white flex items-center justify-between shadow-md border border-[#09414e]">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="SwarSanket APK" className="w-10 h-10 rounded-xl object-contain border border-[#0f5968]" />
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">SIH Android App</div>
                    <div className="text-xs sm:text-sm font-bold">Install SwarSanket APK</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowApkModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#02738a] hover:bg-[#02849f] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Get APK
                </button>
              </div>
            </div>

            <BottomNav active="home" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        );

      case "voiceIntro":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="flex items-center justify-between px-6 pt-2 pb-2 shrink-0">
              <BackBtn onBack={() => navigate("home")} />
              <span className="font-bold text-sm text-[#0c1e27]">Voice Check</span>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                  {t(lang, "letsBegin")}
                </h1>
                <p className="text-sm text-[#5e7380] leading-relaxed" style={{ fontFamily: F.body }}>
                  {t(lang, "voiceIntroSub")}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { step: "01", key: "step1" },
                  { step: "02", key: "step2" },
                  { step: "03", key: "step3" },
                ].map((s) => (
                  <div key={s.step} className="p-4 rounded-2xl bg-white border border-[#d7eaef] text-center space-y-1 shadow-xs">
                    <div className="text-xl font-bold text-[#02738a]" style={{ fontFamily: F.display }}>
                      {s.step}
                    </div>
                    <div className="text-xs font-bold text-[#30434f]">{t(lang, s.key)}</div>
                  </div>
                ))}
              </div>

              <AudioBtn textToSpeak={`${t(lang, "letsBegin")}. ${t(lang, "voiceIntroSub")}`} lang={lang} />

              <div className="w-full space-y-3 pt-4">
                <Btn label={t(lang, "beginVoiceCheck")} onClick={() => navigate("instruction")} />
                <Btn label={t(lang, "someoneHelping")} onClick={() => navigate("instruction")} variant="ghost" />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "instruction":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader step={0} total={3} onBack={() => navigate("voiceIntro")} onExit={() => navigate("home")} />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center shadow-inner">
                <Volume2 className="w-10 h-10" />
              </div>

              <div className="text-center w-full space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#5e7380]">
                  {t(lang, "listenToQuestion")}
                </p>

                <div className="p-6 rounded-3xl bg-white border border-[#d7eaef] shadow-md">
                  <p className="text-xl font-medium text-[#0c1e27] leading-relaxed" style={{ fontFamily: F.body }}>
                    {getTaskPrompt(lang, recordingContext)}
                  </p>
                </div>
              </div>

              <AudioBtn
                label={t(lang, "playAgain")}
                textToSpeak={getTaskPrompt(lang, recordingContext)}
                lang={lang}
              />
            </div>

            <div className="p-5 bg-white border-t border-[#d7eaef] shrink-0">
              <Btn label={t(lang, "startSpeaking")} onClick={() => navigate("recording")} />
            </div>
            <HomeIndicator />
          </div>
        );

      case "recording":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader step={0} total={3} onBack={() => navigate("instruction")} onExit={() => navigate("home")} />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-8">
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
                    if (!isRecording) handleStartRecording();
                    else handlePauseRecording();
                  }}
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform active:scale-90 ${
                    isRecording
                      ? "bg-gradient-to-tr from-red-600 to-rose-500 shadow-red-600/40"
                      : "bg-gradient-to-tr from-[#02738a] to-[#015364] shadow-[#02738a]/40"
                  }`}
                >
                  {isRecording ? (
                    isPaused ? <Play className="w-12 h-12" /> : <Pause className="w-12 h-12" />
                  ) : (
                    <Mic className="w-12 h-12" />
                  )}
                </button>
              </div>

              {/* Status and timer */}
              <div className="text-center space-y-2">
                {!isRecording ? (
                  <>
                    <p className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                      {t(lang, "tapToSpeak")}
                    </p>
                    <p className="text-xs text-[#5e7380]">Tap microphone when you are ready</p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <span>{isPaused ? "Paused" : "Recording Voice"}</span>
                    </div>
                    <p className="text-4xl font-bold text-[#0c1e27] tracking-wider" style={{ fontFamily: F.display }}>
                      {String(Math.floor(recordingSecs / 60)).padStart(2, "0")}:{String(recordingSecs % 60).padStart(2, "0")}
                    </p>
                    <p className="text-xs text-[#5e7380]">{t(lang, "speakNaturally")}</p>
                  </>
                )}
              </div>

              {/* Dynamic Waveform Visualizer */}
              <DynamicWaveformBars active={isRecording && !isPaused} level={micLevel} />
            </div>

            <div className="p-5 bg-white border-t border-[#d7eaef] shrink-0 space-y-3">
              {isRecording ? (
                <Btn label={t(lang, "finishRecording")} onClick={() => handleFinishRecording("recordingReview")} />
              ) : (
                <Btn label="Start Speaking" onClick={handleStartRecording} />
              )}
            </div>
            <HomeIndicator />
          </div>
        );

      case "recordingReview":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                  {t(lang, "recordingReady")}
                </h1>
                <p className="text-xs text-[#5e7380]">{t(lang, "listenBefore")}</p>
              </div>

              {/* Audio player card */}
              <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-sm flex items-center gap-4">
                <button
                  onClick={() => {
                    if (currentAudioUrl) {
                      const audio = new Audio(currentAudioUrl);
                      audio.play();
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
                  {String(Math.floor(recordingSecs / 60)).padStart(2, "0")}:{String(recordingSecs % 60).padStart(2, "0")}
                </span>
              </div>

              <div className="w-full space-y-3 pt-4">
                <Btn
                  label={t(lang, "continue")}
                  onClick={() => {
                    if (recordingContext === "freeSpeech") {
                      navigate("pictureDesc");
                    } else if (recordingContext === "pictureDesc") {
                      navigate("memory");
                    } else if (recordingContext === "memoryRecall") {
                      navigate("conversation");
                    } else {
                      navigate("completion");
                    }
                  }}
                />
                <Btn label={t(lang, "recordAgain")} onClick={() => navigate("recording")} variant="ghost" />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "pictureDesc":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader step={1} total={3} onBack={() => navigate("recordingReview")} onExit={() => navigate("home")} />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col px-6 pt-3 pb-4 gap-3 animate-fade-in-up">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                  {t(lang, "whatDoYouSee")}
                </h1>
                <p className="text-xs text-[#5e7380]">{t(lang, "pictureDescSub")}</p>
              </div>

              {/* Picture description task illustration */}
              <div className="w-full h-48 rounded-3xl bg-gradient-to-tr from-sky-200 via-amber-100 to-emerald-100 border border-[#d7eaef] flex items-center justify-center overflow-hidden relative shadow-inner">
                <svg width="100%" height="100%" viewBox="0 0 360 200" fill="none" preserveAspectRatio="xMidYMid meet">
                  <rect width="360" height="200" fill="#e0f2fe"/>
                  <circle cx="300" cy="40" r="24" fill="#fde68a"/>
                  <ellipse cx="90" cy="30" rx="40" ry="16" fill="white" opacity="0.9"/>
                  <rect x="0" y="140" width="360" height="60" fill="#86efac"/>
                  <rect x="36" y="90" width="90" height="55" rx="6" fill="#fed7aa"/>
                  <polygon points="36,90 81,54 126,90" fill="#f97316"/>
                  <rect x="68" y="112" width="26" height="33" rx="4" fill="#6d28d9" opacity="0.6"/>
                  <rect x="190" y="100" width="10" height="45" rx="3" fill="#a8a29e"/>
                  <ellipse cx="195" cy="85" rx="26" ry="28" fill="#22c55e" opacity="0.8"/>
                  <circle cx="260" cy="155" r="12" stroke="#374151" strokeWidth="2.5" fill="none"/>
                  <circle cx="286" cy="155" r="12" stroke="#374151" strokeWidth="2.5" fill="none"/>
                  <path d="M260 155 L273 135 L286 155" stroke="#374151" strokeWidth="2" fill="none"/>
                </svg>
              </div>

              <div className="flex justify-center">
                <AudioBtn textToSpeak={t(lang, "pictureDescSub")} lang={lang} />
              </div>

              <div className="flex-1" />

              <div className="pt-2">
                <Btn
                  label={t(lang, "startSpeaking")}
                  onClick={() => {
                    setRecordingContext("pictureDesc");
                    navigate("recording");
                  }}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "memory":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader step={2} total={3} onBack={() => navigate("pictureDesc")} onExit={() => navigate("home")} />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center shadow-inner">
                <Sparkles className="w-10 h-10" />
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                  {t(lang, "listenCarefully")}
                </h1>
                <p className="text-xs text-[#5e7380]">{t(lang, "memorySub")}</p>
              </div>

              <div className="w-full p-6 rounded-3xl bg-white border border-[#d7eaef] text-center shadow-md space-y-1">
                <p className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.body }}>
                  {getTaskPrompt(lang, "memoryRecall")}
                </p>
                <p className="text-xs text-slate-400">Remember these 5 words</p>
              </div>

              <AudioBtn textToSpeak={getTaskPrompt(lang, "memoryRecall")} lang={lang} />

              <div className="w-full space-y-3 pt-4">
                <Btn
                  label={t(lang, "iHeardWords")}
                  onClick={() => {
                    setRecordingContext("memoryRecall");
                    navigate("conversation");
                  }}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "conversation":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
            <StatusBar />
            <CheckHeader step={2} total={3} onBack={() => navigate("memory")} onExit={() => navigate("home")} />

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center shadow-inner">
                <MessageSquare className="w-10 h-10" />
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                  {t(lang, "oneMore")}
                </h1>
                <p className="text-lg text-[#0c1e27] font-medium leading-relaxed" style={{ fontFamily: F.body }}>
                  {getTaskPrompt(lang, "conversation")}
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] text-center">
                <p className="text-xs italic text-[#5e7380]">"{t(lang, "conversationSub")}"</p>
              </div>

              <AudioBtn textToSpeak={getTaskPrompt(lang, "conversation")} lang={lang} />

              <div className="w-full pt-4">
                <Btn
                  label={t(lang, "startSpeaking")}
                  onClick={() => {
                    setRecordingContext("conversation");
                    navigate("completion");
                  }}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "completion":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden items-center justify-center px-6 bg-gradient-to-tr from-[#fbfdfd] via-[#f0f8fa] to-[#e4f4f7] animate-fade-in">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-3xl bg-[#02738a]/20 blur-xl animate-pulse" />
              <img src="/logo.png" alt="SwarSanket Logo" className="w-24 h-24 rounded-3xl object-contain border border-[#bce3eb] shadow-xl relative z-10" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md z-20">
                <Check className="w-5 h-5" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-[#0c1e27] text-center" style={{ fontFamily: F.display }}>
              {t(lang, "youreDone")}
            </h1>
            <p className="text-sm text-[#5e7380] text-center mt-2 max-w-xs" style={{ fontFamily: F.body }}>
              {t(lang, "completionSub")}
            </p>

            <div className="mt-8">
              <Btn label="View Analysis Results →" onClick={() => navigate("processing")} />
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden items-center justify-center px-8 bg-[#f3f9fb] animate-fade-in space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center shadow-inner">
              <Activity className="w-12 h-12 animate-pulse" />
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-[#0c1e27]" style={{ fontFamily: F.display }}>
                {t(lang, "analyzingVoice")}
              </h1>
              <p className="text-xs text-[#5e7380]">{t(lang, "thisMayTake")}</p>
            </div>

            {analysisError ? (
              <div className="w-full space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-rose-800 leading-relaxed">
                    {analysisError}
                  </p>
                </div>

                <div className="w-full space-y-2 pt-2">
                  <Btn
                    label="Try Again"
                    onClick={() => {
                      setAnalysisError(null);
                      handleRunRealScreening();
                    }}
                  />
                  <Btn
                    label="Save Offline & Sync Later"
                    onClick={() => {
                      setAnalysisError(null);
                      handleSaveCompletedSession("uncertain");
                      navigate("offlineSaved");
                    }}
                    variant="secondary"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setAnalysisError(null);
                        navigate("recording");
                      }}
                      className="flex-1 py-2 text-xs font-semibold text-[#30434f] hover:text-[#0c1e27] border border-[#d7eaef] rounded-xl bg-white"
                    >
                      Record Again
                    </button>
                    <button
                      onClick={() => {
                        setAnalysisError(null);
                        navigate("settings");
                      }}
                      className="flex-1 py-2 text-xs font-semibold text-[#02738a] hover:text-[#01586a] border border-[#bce3eb] rounded-xl bg-[#e4f4f7]"
                    >
                      Server Settings
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="w-full space-y-2">
                  <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#02738a] to-[#015364] animate-pulse w-4/5" />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#5e7380] font-medium">
                    <span>
                      {analysisStep === "uploading"
                        ? "Uploading voice recording…"
                        : analysisStep === "analyzing"
                        ? "Extracting acoustic & linguistic features…"
                        : "Evaluating screening signal…"}
                    </span>
                    <span>{analysisStep === "uploading" ? "35%" : "85%"}</span>
                  </div>
                </div>

                <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] space-y-2 text-xs text-[#30434f]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Whisper ASR word-level transcription</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>spaCy linguistic feature extraction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Validated 20-feature XGBoost screening engine</span>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "resultLow":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4 animate-fade-in">
              <div className="flex flex-col items-center justify-center pt-2 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {screeningApiResult?.screening.status || t(lang, "noConcern")}
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900 pt-0.5" style={{ fontFamily: F.display }}>
                    {t(lang, "voiceCheckComplete")}
                  </h1>
                </div>
              </div>

              <div className="w-full p-5 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed text-center">
                  {screeningApiResult?.screening.interpretation || t(lang, "noConcernSub")}
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
                  <Check className="w-4 h-4" />
                  <span>
                    Decision Confidence:{" "}
                    {screeningApiResult
                      ? `${screeningApiResult.screening.technical_confidence_percent.toFixed(1)}%`
                      : "94%"}
                  </span>
                </div>
              </div>

              {/* Real ASR Transcript */}
              {screeningApiResult?.transcript && (
                <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs text-left space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Voice Transcript</span>
                    <span>{screeningApiResult.word_count} words ({screeningApiResult.audio?.duration_seconds.toFixed(1)}s)</span>
                  </div>
                  <p className="text-xs italic text-slate-700 leading-relaxed bg-[#f8fbfd] p-3 rounded-xl border border-slate-100">
                    "{screeningApiResult.transcript}"
                  </p>
                </div>
              )}

              {/* Real SHAP Factors Card */}
              {screeningApiResult?.explanation && (
                <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Model Explainability (SHAP)
                    </span>
                    <span className="text-[10px] font-bold text-[#015364] bg-[#e4f4f7] px-2 py-0.5 rounded-full border border-[#cbe6ed]">
                      Tree SHAP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Model factors contributing most to this screening signal:
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {screeningApiResult.explanation.top_positive_contributions?.slice(0, 2).map((item) => (
                      <div key={item.feature} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-1.5 truncate mr-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="text-slate-700 font-medium truncate">{item.feature}</span>
                        </div>
                        <span className="font-bold text-amber-700 flex-shrink-0">+{item.shap_value.toFixed(3)}</span>
                      </div>
                    ))}
                    {screeningApiResult.explanation.top_negative_contributions?.slice(0, 2).map((item) => (
                      <div key={item.feature} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-1.5 truncate mr-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-slate-700 font-medium truncate">{item.feature}</span>
                        </div>
                        <span className="font-bold text-emerald-700 flex-shrink-0">{item.shap_value.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                    {screeningApiResult.explanation.disclaimer}
                  </p>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-slate-100/80 text-[11px] text-slate-500 text-center leading-relaxed">
                Screening result only — not a medical diagnosis.
              </div>

              <div className="w-full space-y-2.5 pt-1 pb-4">
                <Btn label={t(lang, "done")} onClick={() => navigate("home")} />
                <Btn label={t(lang, "viewDetails")} onClick={() => navigate("screeningDetails")} variant="ghost" />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "resultElevated":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4 animate-fade-in">
              <div className="flex flex-col items-center justify-center pt-2 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    {screeningApiResult?.screening.status || t(lang, "furtherEval")}
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900 pt-0.5" style={{ fontFamily: F.display }}>
                    Evaluation Recommended
                  </h1>
                </div>
              </div>

              <div className="w-full p-5 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed text-center">
                  {screeningApiResult?.screening.interpretation || t(lang, "furtherEvalSub")}
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-bold text-amber-700">
                  <Info className="w-4 h-4" />
                  <span>
                    Decision Confidence:{" "}
                    {screeningApiResult
                      ? `${screeningApiResult.screening.technical_confidence_percent.toFixed(1)}%`
                      : "88%"}
                    {screeningApiResult?.live_features
                      ? ` · Word Rate: ${screeningApiResult.live_features["CTP_Word Rate(-/s)"].toFixed(2)}/s`
                      : " · Acoustic Pause Indicators"}
                  </span>
                </div>
              </div>

              {/* Real ASR Transcript */}
              {screeningApiResult?.transcript && (
                <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs text-left space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Voice Transcript</span>
                    <span>{screeningApiResult.word_count} words ({screeningApiResult.audio?.duration_seconds.toFixed(1)}s)</span>
                  </div>
                  <p className="text-xs italic text-slate-700 leading-relaxed bg-[#f8fbfd] p-3 rounded-xl border border-slate-100">
                    "{screeningApiResult.transcript}"
                  </p>
                </div>
              )}

              {/* Real SHAP Factors Card */}
              {screeningApiResult?.explanation && (
                <div className="w-full p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Model Explainability (SHAP)
                    </span>
                    <span className="text-[10px] font-bold text-[#015364] bg-[#e4f4f7] px-2 py-0.5 rounded-full border border-[#cbe6ed]">
                      Tree SHAP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Model factors contributing most to this screening signal:
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {screeningApiResult.explanation.top_positive_contributions?.slice(0, 3).map((item) => (
                      <div key={item.feature} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-1.5 truncate mr-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="text-slate-700 font-medium truncate">{item.feature}</span>
                        </div>
                        <span className="font-bold text-amber-700 flex-shrink-0">+{item.shap_value.toFixed(3)}</span>
                      </div>
                    ))}
                    {screeningApiResult.explanation.top_negative_contributions?.slice(0, 3).map((item) => (
                      <div key={item.feature} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-1.5 truncate mr-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-slate-700 font-medium truncate">{item.feature}</span>
                        </div>
                        <span className="font-bold text-emerald-700 flex-shrink-0">{item.shap_value.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                    {screeningApiResult.explanation.disclaimer}
                  </p>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-slate-100/80 text-[11px] text-slate-500 text-center leading-relaxed">
                Screening result only — not a medical diagnosis.
              </div>

              <div className="w-full space-y-2.5 pt-1 pb-4">
                <Btn label={t(lang, "talkToPro")} onClick={() => navigate("referral")} />
                <Btn label={t(lang, "viewDetails")} onClick={() => navigate("screeningDetails")} variant="ghost" />
                <Btn label="Notify Caregiver" onClick={() => navigate("caregiverAlert")} variant="secondary" size="sm" />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "screeningDetails": {
        const activeScreening = screeningsList[0];
        const displayStatus =
          screeningApiResult?.screening.status ||
          (lastResult === "elevated" ? "Elevated Screening Signal" : "Low Risk Screening Signal");
        const displayConfidence = screeningApiResult
          ? `${screeningApiResult.screening.technical_confidence_percent.toFixed(1)}%`
          : "88% (High)";
        const displayWordRate = screeningApiResult?.live_features
          ? `${(screeningApiResult.live_features["CTP_Word Rate(-/s)"] * 60).toFixed(0)} WPM (${screeningApiResult.live_features["CTP_Word Rate(-/s)"].toFixed(2)} words/s)`
          : "68 WPM";
        const displayPauseRatio = screeningApiResult?.audio
          ? `${screeningApiResult.audio.silence_percentage.toFixed(1)}%`
          : "45%";
        const displayIU = screeningApiResult?.live_features
          ? `${screeningApiResult.live_features.CTP_unique_IU_efficiency.toFixed(3)}`
          : "0.412";
        const displayTTR = screeningApiResult?.live_features
          ? `${screeningApiResult.live_features["CTP_ keyword_TTR"].toFixed(3)}`
          : "0.933";

        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                Screening Details
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-[#d7eaef] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Overall Screening Signal</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      screeningApiResult?.screening.predicted_class === 1 || lastResult === "elevated"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {displayStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Technical Decision Confidence</span>
                  <span className="text-xs font-bold text-slate-900">{displayConfidence}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Audio Quality</span>
                  <span className="text-xs font-bold text-emerald-600">
                    {vqState.toUpperCase()}{" "}
                    {screeningApiResult?.audio
                      ? `(${screeningApiResult.audio.duration_seconds.toFixed(1)}s)`
                      : "(SNR 25.4 dB)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Screening Date</span>
                  <span className="text-xs font-bold text-slate-900">
                    {activeScreening ? new Date(activeScreening.createdAt).toLocaleDateString() : "Today"}
                  </span>
                </div>
              </div>

              {/* Biomarkers list */}
              <div className="p-5 rounded-2xl bg-white border border-[#d7eaef] space-y-3 shadow-xs">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Speech & Language Indicators
                </div>
                {[
                  { label: "Speech Word Rate", val: displayWordRate, sub: "Faster-Whisper temporal speech rate" },
                  { label: "Silence / Pause Ratio", val: displayPauseRatio, sub: "Energy-based silence detection" },
                  { label: "Unique IU Efficiency", val: displayIU, sub: "Information unit lexical density" },
                  { label: "Keyword Type-Token Ratio", val: displayTTR, sub: "Lexical keyword vocabulary diversity" },
                ].map((b) => (
                  <div key={b.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{b.label}</div>
                      <div className="text-[11px] text-slate-400">{b.sub}</div>
                    </div>
                    <div className="text-xs font-bold text-[#02738a]">{b.val}</div>
                  </div>
                ))}
              </div>

              {/* Real ASR Transcription */}
              {screeningApiResult?.transcript && (
                <div className="p-5 rounded-2xl bg-white border border-[#d7eaef] space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>Voice Transcript (Whisper ASR)</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {screeningApiResult.word_count} words · {screeningApiResult.detected_language?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs italic text-slate-700 leading-relaxed bg-[#f8fbfd] p-3 rounded-xl border border-slate-100">
                    "{screeningApiResult.transcript}"
                  </p>
                </div>
              )}

              {/* Real Model Explainability (Tree SHAP) Section */}
              {screeningApiResult?.explanation && (
                <div className="p-5 rounded-2xl bg-white border border-[#d7eaef] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Model Explainability (SHAP)
                    </span>
                    <span className="text-[10px] font-bold text-[#015364] bg-[#e4f4f7] px-2 py-0.5 rounded-full border border-[#cbe6ed]">
                      Additive Tree Attribution
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Model factors contributing most to this screening signal:
                  </p>

                  <div className="space-y-2 pt-1">
                    {screeningApiResult.explanation.top_positive_contributions?.length > 0 && (
                      <>
                        <div className="text-[11px] font-bold text-amber-800">
                          Factors associated with higher screening signal:
                        </div>
                        {screeningApiResult.explanation.top_positive_contributions.map((item) => (
                          <div key={item.feature} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-700 font-medium truncate mr-2">{item.feature}</span>
                              <span className="font-bold text-amber-700 flex-shrink-0">+{item.shap_value.toFixed(4)}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, Math.abs(item.shap_value) * 90))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {screeningApiResult.explanation.top_negative_contributions?.length > 0 && (
                      <>
                        <div className="text-[11px] font-bold text-emerald-800 pt-2">
                          Factors associated with lower screening signal:
                        </div>
                        {screeningApiResult.explanation.top_negative_contributions.map((item) => (
                          <div key={item.feature} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-700 font-medium truncate mr-2">{item.feature}</span>
                              <span className="font-bold text-emerald-700 flex-shrink-0">{item.shap_value.toFixed(4)}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, Math.abs(item.shap_value) * 90))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 italic leading-relaxed">
                    {screeningApiResult.explanation.disclaimer}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-slate-100/80 text-[11px] text-slate-500 text-center leading-relaxed">
                Screening result only — not a medical diagnosis.
              </div>

              <div className="space-y-2 pt-1 pb-4">
                <Btn
                  label="Download Clinical Summary (PDF)"
                  onClick={() => {
                    if (screeningsList.length > 0) generateAndDownloadReport(screeningsList[0]);
                  }}
                  size="sm"
                />
                <Btn label="Consult Healthcare Professional" onClick={() => navigate("referral")} variant="ghost" size="sm" />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );
      }

      case "referral":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                {t(lang, "healthcarePros")}
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-3 pb-4">
              {[
                { name: "Dr. Priya Sharma", role: t(lang, "neurologist"), spec: "Cognitive & Memory Health", wait: "Today", rating: "4.9" },
                { name: "Dr. Rajesh Varma", role: t(lang, "generalPhysician"), spec: "Primary Healthcare", wait: "Today", rating: "4.8" },
                { name: "Sunita Kumari", role: t(lang, "healthWorkerRole"), spec: "Community Health Center", wait: "Available Now", rating: "4.9" },
              ].map((doc) => (
                <div key={doc.name} className="p-5 rounded-2xl bg-white border border-[#d7eaef] space-y-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-base text-slate-900" style={{ fontFamily: F.display }}>{doc.name}</div>
                      <div className="text-xs text-[#02738a] font-semibold">{doc.role} · {doc.spec}</div>
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
                        if (screeningsList.length > 0) generateAndDownloadReport(screeningsList[0]);
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
        );

      case "teleconsult":
        return (
          <div className="h-full flex flex-col bg-[#021820] text-white min-h-0 overflow-hidden">
            <StatusBar light />
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <BackBtn onBack={() => navigate("referral")} />
              <span className="text-xs font-bold text-[#38bdf8]">Teleconsultation · Live</span>
              <div className="w-10" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 min-h-0">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#02738a] to-[#013540] border-2 border-[#02738a]/40 flex items-center justify-center shadow-2xl">
                <Stethoscope className="w-16 h-16 text-[#e4f4f7]" />
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: F.display }}>
                  Dr. Priya Sharma
                </h2>
                <p className="text-xs text-slate-300">Consultant Neurologist · AI Voice Review</p>
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
                { icon: X, label: "End Call", bg: "bg-red-600 text-white", fn: () => navigate("home") },
              ].map((btn) => {
                const Icon = btn.icon;
                return (
                  <div key={btn.label} className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={btn.fn}
                      className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform ${
                        btn.bg || "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </button>
                    <span className="text-[11px] text-slate-400">{btn.label}</span>
                  </div>
                );
              })}
            </div>
            <HomeIndicator />
          </div>
        );

      case "doctorDash":
        return (
          <div className="h-full flex flex-col bg-[#021820] text-white min-h-0 overflow-hidden">
            <StatusBar light />
            <div className="px-6 pt-3 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="SwarSanket Logo" className="w-8 h-8 rounded-xl object-contain border border-[#02738a]/40" />
                  <div>
                    <h1 className="text-xl font-bold text-white" style={{ fontFamily: F.display }}>
                      Doctor Clinical Hub
                    </h1>
                    <p className="text-[11px] text-[#38bdf8]">SwarSanket AI Diagnostics</p>
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
                  <div key={s.l} className="p-3 rounded-2xl bg-[#03232c] border border-[#094250] text-center">
                    <div className={`text-xl font-bold ${s.c || "text-white"}`} style={{ fontFamily: F.display }}>{s.v}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 rounded-t-3xl bg-[#f3f9fb] text-slate-900 flex flex-col min-h-0 overflow-hidden">
              <div className="px-6 pt-4 pb-2 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600" style={{ fontFamily: F.display }}>
                  Recent Patient Screenings
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-4 space-y-3">
                {[
                  { name: "Rama Devi", age: 72, risk: "elevated", date: "28 Aug 2026", lang: "Hindi", wpm: 68 },
                  { name: "Suresh Kumar", age: 68, risk: "low", date: "15 Aug 2026", lang: "Hindi", wpm: 92 },
                  { name: "Meera Bai", age: 80, risk: "elevated", date: "12 Aug 2026", lang: "Bengali", wpm: 60 },
                  { name: "Lakshmi Devi", age: 75, risk: "low", date: "09 Aug 2026", lang: "Hindi", wpm: 88 },
                ].map((p) => (
                  <div
                    key={p.name}
                    onClick={() => {
                      setSelectedPatient(p.name);
                      navigate("doctorPatient");
                    }}
                    className="p-4 rounded-2xl bg-white border border-[#d7eaef] hover:border-[#02738a] shadow-xs cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>
                        {p.name}, {p.age}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{p.lang} · {p.date} · {p.wpm} WPM</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        p.risk === "elevated" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
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
        );

      case "doctorPatient":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BackBtn onBack={() => navigate("doctorDash")} />
                <div>
                  <h1 className="text-lg font-bold text-slate-900" style={{ fontFamily: F.display }}>
                    {selectedPatient}, 72
                  </h1>
                  <p className="text-xs text-slate-500">Patient Longitudinal Report</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (screeningsList.length > 0) generateAndDownloadReport(screeningsList[0]);
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
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Screening Outcome</div>
                  <div className="text-base font-bold text-amber-900">Elevated Cognitive Risk (88%)</div>
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
                    <AreaChart data={[
                      { month: "Jun", risk: 22 },
                      { month: "Jul", risk: 25 },
                      { month: "Aug", risk: 38 },
                      { month: "Sep", risk: 88 },
                    ]}>
                      <defs>
                        <linearGradient id="patientRiskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#02738a" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#02738a" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Area type="monotone" dataKey="risk" stroke="#02738a" fill="url(#patientRiskGrad)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dual-Engine ML Model Scores */}
              <div className="p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Dual-Engine ML Analysis</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-medium">
                    <span>Classical (Xception + XGBoost):</span>
                    <span className="font-bold text-[#02738a]">84% Risk (AUC 0.91)</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Quantum-Hybrid (PennyLane QNN):</span>
                    <span className="font-bold text-[#02738a]">89% Risk (AUC 0.93)</span>
                  </div>
                </div>
              </div>

              {/* SHAP Feature Attribution */}
              <div className="p-4 rounded-2xl bg-white border border-[#d7eaef] shadow-xs space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">SHAP Explainability Factors</div>
                {[
                  { factor: "Speech Pause Duration (>1.2s)", weight: 38 },
                  { factor: "Vocal Pitch Jitter (3.2%)", weight: 30 },
                  { factor: "Phonetic Latency Delay", weight: 22 },
                  { factor: "Semantic Recall Variance", weight: 10 },
                ].map((s) => (
                  <div key={s.factor} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">{s.factor}</span>
                      <span className="font-bold text-[#02738a]">+{s.weight}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#02738a] to-[#015364] rounded-full" style={{ width: `${s.weight * 2}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 pb-4">
                <Btn
                  label="Download Printable Medical Report"
                  onClick={() => {
                    if (screeningsList.length > 0) generateAndDownloadReport(screeningsList[0]);
                  }}
                />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "history":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                {t(lang, "history")}
              </h1>
              <button onClick={() => navigate("trend")} className="text-xs font-bold text-[#02738a] hover:underline">
                View Trends →
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-3 pb-4">
              {screeningsList.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-200/70 flex items-center justify-center mx-auto text-slate-400">
                    <HistoryIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">{t(lang, "noScreeningsTitle")}</p>
                  <p className="text-xs text-slate-500">{t(lang, "noScreeningsSub")}</p>
                </div>
              ) : (
                screeningsList.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate("screeningDetails")}
                    className="p-4 rounded-2xl bg-white border border-[#d7eaef] hover:border-[#02738a] shadow-xs cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>
                        {s.patientName} · {s.durationSeconds}s
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        s.mlResult.screeningRisk === "elevated"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {s.mlResult.screeningRisk.toUpperCase()}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <BottomNav active="history" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        );

      case "trend":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("history")} />
              <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
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
                    <AreaChart data={[
                      { month: "Jun", score: 22 },
                      { month: "Jul", score: 25 },
                      { month: "Aug", score: 38 },
                      { month: "Sep", score: 88 },
                    ]}>
                      <defs>
                        <linearGradient id="trendScoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#02738a" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#02738a" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke="#02738a" fill="url(#trendScoreGrad)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#e4f4f7] border border-[#cbe6ed] text-xs text-[#015364] leading-relaxed">
                Regular monthly voice check-ups allow early tracking of subtle linguistic, temporal, and acoustic variations.
              </div>

              <Btn
                label="Share Report with Doctor"
                onClick={() => {
                  if (screeningsList.length > 0) generateAndDownloadReport(screeningsList[0]);
                }}
              />
            </div>

            <BottomNav active="history" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        );

      case "caregiver":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
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
                    <div className="font-bold text-base">Assisted Screening</div>
                    <div className="text-xs text-[#e4f4f7]">Help family members screen easily</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Linked Profiles</div>
                {[
                  { name: "Rama Devi", age: 72, relation: "Mother", status: "Follow-up Recommended" },
                  { name: "Suresh Kumar", age: 68, relation: "Father", status: "Normal" },
                ].map((m) => (
                  <div key={m.name} className="p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-center justify-between shadow-xs">
                    <div>
                      <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>{m.name}, {m.age}</div>
                      <div className="text-xs text-slate-500">{m.relation} · {m.status}</div>
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

              <Btn label="+ Add Family Member" onClick={() => navigate("profile")} variant="ghost" />
            </div>
            <HomeIndicator />
          </div>
        );

      case "healthWorker":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <div>
                <h1 className="text-lg font-bold text-slate-900" style={{ fontFamily: F.display }}>
                  Health Worker Hub
                </h1>
                <p className="text-[11px] text-slate-500">Rampur PHC · Community Offline Field Mode</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4 pb-4">
              {/* Sync Status Banner */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <WifiOff className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="font-bold text-xs text-amber-900">Offline Queue</div>
                    <div className="text-[11px] text-amber-700">{syncQueue.length || 3} screenings pending sync</div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    for (const q of syncQueue) {
                      await markQueueItemSynced(q.id);
                    }
                    setSyncQueue([]);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs active:scale-95"
                >
                  Sync All
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Village Screening Queue</div>
                {[
                  { name: "Rama Devi", age: 72, village: "Rampur", status: "completed" },
                  { name: "Suresh Kumar", age: 68, village: "Rampur", status: "completed" },
                  { name: "Lakshmi Bai", age: 75, village: "Kashipur", status: "pending" },
                ].map((p) => (
                  <div key={p.name} className="p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-center justify-between shadow-xs">
                    <div>
                      <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>{p.name}, {p.age}</div>
                      <div className="text-xs text-slate-500">{p.village} · Status: {p.status}</div>
                    </div>
                    {p.status === "pending" ? (
                      <button onClick={() => navigate("voiceIntro")} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white text-xs font-bold shadow-xs">
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

              <Btn label="+ Register New Patient" onClick={() => navigate("profile")} />
            </div>
            <HomeIndicator />
          </div>
        );

      case "help":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                {t(lang, "howCanWeHelp")}
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-3 pb-4">
              {[
                { icon: Volume2, key: "helpListen", descKey: "helpListenDesc" },
                { icon: Users, key: "helpAssist", descKey: "helpAssistDesc" },
                { icon: Globe, key: "helpLang", descKey: "helpLangDesc", to: "language" as Screen },
                { icon: Phone, key: "helpContact", descKey: "helpContactDesc", to: "referral" as Screen },
                { icon: Info, key: "helpHow", descKey: "helpHowDesc" },
                { icon: Wifi, key: "helpOffline", descKey: "helpOfflineDesc" },
              ].map((h) => {
                const Icon = h.icon;
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
                      <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>
                        {t(lang, h.key)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{t(lang, h.descKey)}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <BottomNav active="help" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        );

      case "settings":
        return (
          <div className="h-full flex flex-col bg-[#f3f9fb] min-h-0 overflow-hidden">
            <StatusBar />
            <div className="px-6 pt-3 pb-2">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                Profile &amp; Settings
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 space-y-4 pb-4">
              <div className="p-4 rounded-2xl bg-white border border-[#d7eaef] flex items-center gap-4 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#02738a] to-[#0398b7] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                  {userName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-base text-slate-900" style={{ fontFamily: F.display }}>{userName}</div>
                  <div className="text-xs text-slate-500">Age: {userAge} · {LANGUAGES.find((l) => l.code === lang)?.name}</div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-[#d7eaef] overflow-hidden divide-y divide-slate-100 shadow-xs">
                {[
                  { icon: Globe, label: "Language", value: LANGUAGES.find((l) => l.code === lang)?.native, to: "language" as Screen },
                  { icon: Users, label: "Caregiver Hub", value: "Manage", to: "caregiver" as Screen },
                  { icon: Stethoscope, label: "Health Worker Mode", value: "Access", to: "healthWorker" as Screen },
                  { icon: Activity, label: "Doctor Dashboard", value: "Open", to: "doctorDash" as Screen },
                  { icon: Download, label: "Download Android APK", value: "Direct Link", action: () => setShowApkModal(true) },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      onClick={() => (s.action ? s.action() : s.to ? navigate(s.to) : null)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-slate-500" />
                        <span className="font-bold text-sm text-slate-800" style={{ fontFamily: F.display }}>{s.label}</span>
                      </div>
                      <span className="text-xs text-[#02738a] font-semibold">{s.value} →</span>
                    </button>
                  );
                })}
              </div>

              {/* Backend Server & Android Connectivity Section */}
              <div className="rounded-2xl bg-white border border-[#d7eaef] p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#e4f4f7] text-[#02738a] flex items-center justify-center">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>
                        Backend Server &amp; Connectivity
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isCapacitorAndroid() ? "Android App Mode" : "Web Client Mode"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestApi()}
                    disabled={isTestingApi}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${
                      apiHealth?.ok
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${apiHealth?.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <span>{isTestingApi ? "Testing…" : apiHealth?.ok ? `Connected (${apiHealth.latencyMs || 25}ms)` : "Offline"}</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-[#f8fbfd] border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Active API Target:</span>
                    <span className="font-mono font-bold text-slate-800 truncate max-w-[200px]">{currentApiUrl}</span>
                  </div>
                  {apiHealth?.pipeline && (
                    <div className="text-[10px] text-slate-500 border-t border-slate-200/60 pt-1 flex items-center justify-between">
                      <span>Pipeline:</span>
                      <span className="font-medium text-slate-700">{apiHealth.pipeline}</span>
                    </div>
                  )}
                  {apiHealth && !apiHealth.ok && (
                    <div className="text-[10px] text-rose-600 border-t border-rose-100 pt-1">
                      {apiHealth.message}
                    </div>
                  )}
                </div>

                {/* Toggle configuration panel */}
                <div className="pt-1">
                  <button
                    onClick={() => setShowApiSettings(!showApiSettings)}
                    className="text-xs font-semibold text-[#02738a] hover:text-[#015364] flex items-center gap-1"
                  >
                    <span>{showApiSettings ? "Hide Server Settings ▲" : "Configure Target Server URL ▼"}</span>
                  </button>
                </div>

                {showApiSettings && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 animate-fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Custom Backend Server URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customApiUrlInput}
                          onChange={(e) => setCustomApiUrlInput(e.target.value)}
                          placeholder="http://192.168.1.100:8001"
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:border-[#02738a] outline-hidden"
                        />
                        <button
                          onClick={() => handleApplyApiUrl(customApiUrlInput)}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white font-bold text-xs active:scale-95 transition-all shadow-xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Presets */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Environment Presets:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {API_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleApplyApiUrl(p.url)}
                            className={`p-2 rounded-xl text-left border transition-all ${
                              currentApiUrl === p.url
                                ? "bg-[#e4f4f7] border-[#02738a] text-[#015364]"
                                : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700"
                            }`}
                          >
                            <div className="font-bold text-[11px]">{p.name}</div>
                            <div className="font-mono text-[9px] text-slate-500 truncate">{p.url}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <button
                        onClick={handleResetApi}
                        className="text-slate-400 hover:text-slate-600 underline"
                      >
                        Reset to Platform Default
                      </button>
                      <button
                        onClick={() => handleTestApi(customApiUrlInput)}
                        disabled={isTestingApi}
                        className="text-[#02738a] font-bold hover:underline"
                      >
                        {isTestingApi ? "Probing…" : "Test This URL"}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                      Tip: On an Android phone or emulator, localhost (127.0.0.1) refers to the phone itself. Point to your computer's LAN IP (e.g. 10.54.93.168:8001) or a cloud HTTPS endpoint.
                    </p>
                  </div>
                )}
              </div>

              {/* Multilingual Scope Disclosure */}
              <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                <div className="font-bold text-slate-700">Validated Model Scope</div>
                <p className="leading-relaxed">
                  English voice recordings utilize the validated 20-feature acoustic &amp; linguistic contract. Indic languages (Hindi, Bengali, etc.) currently demonstrate live speech recognition with acoustic biomarker screening.
                </p>
              </div>
            </div>

            <BottomNav active="settings" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        );

      case "offlineSaved":
        return (
          <div className="h-full flex flex-col items-center justify-center px-6 bg-[#f3f9fb] min-h-0 overflow-hidden animate-fade-in space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
              <WifiOff className="w-10 h-10" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                Saved Safely Offline
              </h1>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                Your audio recording is stored securely in IndexedDB on this device. It will automatically sync when connection is restored.
              </p>
            </div>
            <div className="w-full space-y-3 pt-4">
              <Btn label="Continue to Home" onClick={() => navigate("home")} />
            </div>
            <HomeIndicator />
          </div>
        );

      case "voiceQuality":
        return (
          <div className="h-full flex flex-col items-center justify-center px-6 bg-[#f3f9fb] min-h-0 overflow-hidden animate-fade-in space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                {t(lang, "vqPoorTitle")}
              </h1>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                {t(lang, "vqPoorSub")}
              </p>
            </div>
            <div className="w-full space-y-3 pt-4">
              <Btn label={t(lang, "recordAgain")} onClick={() => navigate("recording")} />
              <Btn label={t(lang, "continueAnyway")} onClick={() => navigate("recordingReview")} variant="ghost" />
            </div>
            <HomeIndicator />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#031d25] via-[#02171e] to-[#010e13] p-0 sm:p-4 md:p-6" style={{ fontFamily: F.body }}>
      {/* Top / Floating Demo Navigation Bar on Desktop */}
      <div className="fixed top-3 sm:top-4 left-3 right-3 sm:left-4 sm:right-4 z-40 flex flex-wrap items-center justify-between gap-2 max-w-5xl mx-auto px-4 py-2 rounded-2xl bg-[#03222a]/90 border border-[#0d4f5e] backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="SwarSanket Logo"
            className="w-8 h-8 rounded-xl shadow-md object-contain border border-[#0e5666]"
          />
          <div>
            <div className="text-xs font-bold text-white tracking-wide" style={{ fontFamily: F.display }}>
              SwarSanket Mobile
            </div>
            <div className="text-[10px] text-[#38bdf8] font-medium">SIH 2026 AI Early Screening</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApkModal(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#02738a] to-[#015364] hover:from-[#02849f] hover:to-[#02738a] text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK</span>
          </button>

          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isOffline ? "bg-amber-600 text-white" : "bg-[#042a35] border border-[#0d4f5e] text-slate-200 hover:bg-[#073c4b]"
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{isOffline ? "Offline Mode" : "Online"}</span>
          </button>

          <button
            onClick={() => navigate("doctorDash")}
            className="px-3 py-1.5 rounded-xl bg-[#042a35] border border-[#0d4f5e] hover:bg-[#073c4b] text-slate-200 text-xs font-bold flex items-center gap-1"
          >
            <Stethoscope className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Doctor View</span>
          </button>

          <button
            onClick={() => setFullScreenMode(!fullScreenMode)}
            className="px-2.5 py-1.5 rounded-xl bg-[#042a35] border border-[#0d4f5e] hover:bg-[#073c4b] text-slate-300 text-xs font-bold hidden sm:flex items-center gap-1"
          >
            {fullScreenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Container: Native 100% on actual mobile vs polished mockup on desktop */}
      <div
        className={`relative flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ${
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
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-[#fbfdfd] via-[#f3f9fb] to-[#eaf5f8]">
          {renderScreen()}
        </div>
      </div>

      {/* APK & PWA Download Modal */}
      <ApkDownloadModal isOpen={showApkModal} onClose={() => setShowApkModal(false)} />
    </div>
  );
}
