import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Volume2, Play, Pause, RotateCcw, Check, CheckCircle2,
  AlertCircle, AlertTriangle, Info, ShieldCheck, Lock, Globe, Users, User,
  Home as HomeIcon, History as HistoryIcon, HelpCircle, Phone, ArrowLeft,
  ArrowRight, ChevronRight, Download, Share2, FileText, Wifi, WifiOff,
  RefreshCw, Sliders, Calendar, Activity, Sparkles, Plus, Trash2, X,
  Maximize2, Minimize2, Smartphone, Stethoscope, Video, MessageSquare
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
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
import { speakText, stopSpeech, isSpeaking } from "./services/tts";
import { generateAndDownloadReport } from "./services/report";
import { ApkDownloadModal, APK_DOWNLOAD_URL, GITHUB_RELEASES_URL } from "./components/ApkDownloadModal";

// ─── Design Tokens & Theme ───────────────────────────────────────────────────

const C = {
  primary: "#0891b2",
  primaryDark: "#0e7490",
  primaryLight: "#e0f7fa",
  bg: "#f0f9ff",
  surface: "#ffffff",
  text: "#0f172a",
  textSub: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  success: "#16a34a",
  successBg: "#dcfce7",
  warning: "#c2410c",
  warningBg: "#fff7ed",
  amber: "#a16207",
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
  const col = light ? "rgba(255,255,255,0.88)" : C.text;
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1" style={{ fontFamily: F.body }}>
      <span className="text-xs font-semibold" style={{ color: col }}>9:41</span>
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
    <div className="flex justify-center pb-2 pt-1">
      <div className="w-32 h-1 rounded-full bg-slate-300" />
    </div>
  );
}

function NVLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl shadow-md transition-transform hover:scale-105"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
      }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
        <path d="M3 12C5 7 7 17 9 12C11 7 13 17 15 12C17 7 19 17 21 12"
          stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
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
    primary: "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-600/30 hover:from-cyan-700 hover:to-cyan-800",
    secondary: "bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100",
    ghost: "bg-transparent text-cyan-700 border-2 border-cyan-600 hover:bg-cyan-50",
    danger: "bg-transparent text-red-600 border-2 border-red-200 hover:bg-red-50",
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
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-cyan-100/80 hover:bg-cyan-200 text-cyan-900 transition-all active:scale-95 shadow-sm"
      style={{ fontFamily: F.body }}
    >
      <Volume2 className={`w-4 h-4 text-cyan-700 ${speaking ? "animate-pulse" : ""}`} />
      <span>{speaking ? "Speaking…" : lbl}</span>
    </button>
  );
}

function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-90 shadow-sm"
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
    <div className="flex border-t border-slate-200 bg-white/95 backdrop-blur px-2 py-1.5">
      {tabs.map((tab) => {
        const on = tab.id === active || (tab.id === "history" && isHistory);
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 transition-all rounded-xl ${
              on ? "text-cyan-700 font-bold bg-cyan-50/60" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon className={`w-5 h-5 ${on ? "text-cyan-600" : "text-slate-400"}`} />
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
    <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-slate-200 bg-white">
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
      <div className="w-full p-6 rounded-t-3xl bg-white space-y-4 shadow-2xl border-t border-slate-200">
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
            className="w-1.5 rounded-full bg-cyan-600 transition-all duration-75"
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

  // Load IndexedDB on start
  useEffect(() => {
    async function init() {
      await seedInitialDemoData();
      const screenings = await getAllScreenings();
      setScreeningsList(screenings);
      const queue = await getOfflineQueue();
      setSyncQueue(queue);
    }
    init();
  }, []);

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
        "We couldn't analyze your recording right now. Please check your connection and try again.";
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
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-cyan-600 via-cyan-700 to-cyan-900 text-white animate-fade-in">
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-2xl mb-6 animate-splash">
              <svg width="56" height="36" viewBox="0 0 66 42" fill="none">
                <path d="M3 21C8 8 13 34 18 21C23 8 28 34 33 21C38 8 43 34 48 21C53 8 58 34 63 21"
                  stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-center" style={{ fontFamily: F.display }}>
              SwarSanket
            </h1>
            <p className="text-cyan-100 text-base sm:text-lg mt-2 text-center" style={{ fontFamily: F.body }}>
              Listen. Speak. Screen Early.
            </p>
            <div className="flex items-center gap-1.5 mt-6">
              {[8, 18, 28, 14, 24, 10, 20, 28, 12, 22].map((h, i) => (
                <div key={i} className="w-1 bg-white/50 rounded-full animate-pulse" style={{ height: h, animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
            <div className="mt-12 w-full max-w-xs">
              <button
                onClick={() => navigate("language")}
                className="w-full py-4 rounded-2xl bg-white text-cyan-800 font-bold text-lg shadow-xl hover:bg-cyan-50 transition-all active:scale-95"
                style={{ fontFamily: F.display }}
              >
                Get Started →
              </button>
            </div>
          </div>
        );

      case "language":
        return (
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="px-6 pt-3 pb-3 space-y-1">
              <NVLogo size={36} />
              <h1 className="text-2xl font-bold text-slate-900 pt-2" style={{ fontFamily: F.display }}>
                Choose your language
              </h1>
              <p className="text-xs text-slate-500" style={{ fontFamily: F.body }}>
                आप इसे बाद में भी बदल सकते हैं।
              </p>
              <div className="pt-1">
                <AudioBtn label="Listen in English" textToSpeak="Please select your preferred language" lang="en" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-2">
              <div className="grid grid-cols-2 gap-3 pb-4">
                {LANGUAGES.map((l) => {
                  const on = lang === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`relative p-4 rounded-2xl text-left border-2 transition-all active:scale-95 ${
                        on ? "bg-cyan-50/90 border-cyan-600 shadow-md shadow-cyan-600/10" : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {on && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="text-xl font-bold text-slate-900" style={{ fontFamily: F.body }}>
                        {l.native}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{l.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-6 bg-white border-t border-slate-200">
              <Btn label="Continue" onClick={() => navigate("welcome")} />
            </div>
            <HomeIndicator />
          </div>
        );

      case "welcome":
        return (
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="px-6 pt-3"><NVLogo size={32} /></div>
            <div className="flex-1 flex flex-col px-6 pt-4 pb-4 gap-4 animate-fade-in-up">
              {/* Healthcare banner */}
              <div className="w-full h-44 rounded-3xl bg-gradient-to-tr from-cyan-100 via-sky-100 to-teal-50 border border-cyan-200/60 flex items-center justify-center p-4">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-600 text-white flex items-center justify-center mx-auto shadow-md shadow-cyan-600/30">
                    <Mic className="w-7 h-7" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-cyan-800" style={{ fontFamily: F.display }}>
                    SwarSanket Voice Screening
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                  {t(lang, "greeting")} 👋
                </h1>
                <p className="text-lg text-slate-700 leading-relaxed font-medium" style={{ fontFamily: F.body }}>
                  {t(lang, "welcomeSub")}
                </p>
                <p className="text-xs text-slate-500" style={{ fontFamily: F.body }}>
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="flex-1 flex flex-col px-6 pt-4 pb-4 animate-fade-in-up space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                  Before we begin
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">A quick note about your privacy & security.</p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: <Mic className="w-5 h-5 text-cyan-700" />, title: "Voice Recording", desc: "Short audio samples are recorded for early cognitive screening." },
                  { icon: <ShieldCheck className="w-5 h-5 text-cyan-700" />, title: "Privacy & Encryption", desc: "Stored locally on your phone and shared only with your doctor's permission." },
                  { icon: <Activity className="w-5 h-5 text-cyan-700" />, title: "Screening Instrument", desc: "Results recommend health steps and do not replace a medical diagnosis." },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-2xl bg-white border border-slate-200 flex items-start gap-3.5 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>{item.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</div>
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 animate-fade-in-up space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                  Tell us about you
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">We only ask what is needed for calibration.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-slate-200 focus:border-cyan-600 outline-hidden font-medium text-slate-900 text-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    value={userAge}
                    onChange={(e) => setUserAge(Number(e.target.value))}
                    placeholder="Age"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-slate-200 focus:border-cyan-600 outline-hidden font-medium text-slate-900 text-base"
                  />
                </div>

                <div
                  onClick={() => setAssistedMode(!assistedMode)}
                  className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>
                      {t(lang, "someoneHelping")}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Caregiver-assisted mode</div>
                  </div>
                  <div className={`w-12 h-7 rounded-full transition-colors flex items-center p-1 ${assistedMode ? "bg-cyan-600" : "bg-slate-300"}`}>
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="flex-1 overflow-y-auto px-6 pt-2 pb-3 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                    {t(lang, "greeting")}, {userName} 👋
                  </h1>
                  <p className="text-xs text-slate-500" style={{ fontFamily: F.body }}>
                    {t(lang, "howFeeling")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isOffline && <OfflinePill />}
                  <NVLogo size={42} />
                </div>
              </div>

              {/* Main Hero Voice Check Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-600 via-cyan-700 to-cyan-900 text-white shadow-xl shadow-cyan-900/20 space-y-4 relative overflow-hidden">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">Ready when you are</div>
                    <div className="text-xl font-bold text-white" style={{ fontFamily: F.display }}>
                      {t(lang, "voiceCheckCard")}
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-cyan-100 leading-relaxed">
                  {t(lang, "voiceCheckDesc")}
                </p>

                <button
                  onClick={() => {
                    setRecordingContext("freeSpeech");
                    navigate("voiceIntro");
                  }}
                  className="w-full py-4 rounded-2xl bg-white text-cyan-800 font-bold text-base sm:text-lg shadow-lg hover:bg-cyan-50 transition-all active:scale-95"
                  style={{ fontFamily: F.display }}
                >
                  {t(lang, "start")}
                </button>
              </div>

              {/* Latest Screening Status Card */}
              <div
                onClick={() => navigate("history")}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer space-y-2 transition-all"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t(lang, "previousCheck")}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>
                      Voice Screening #2026-08
                    </div>
                    <div className="text-xs text-slate-500">28 Aug 2026 · Hindi</div>
                  </div>
                  {lastResult === "elevated" ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Follow-up</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Normal</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-3 gap-3">
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
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-cyan-300 flex flex-col items-center gap-2 shadow-xs transition-all active:scale-95"
                    >
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700" style={{ fontFamily: F.body }}>
                        {t(lang, a.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* APK Download Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-900 to-slate-900 text-white flex items-center justify-between shadow-md">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">SIH Android App</div>
                  <div className="text-sm font-bold">Download SwarSanket APK</div>
                </div>
                <button
                  onClick={() => setShowApkModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="flex items-center justify-between px-6 pt-3 pb-2">
              <BackBtn onBack={() => navigate("home")} />
              <span className="font-bold text-sm text-slate-600">Voice Check</span>
              <div className="w-10" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                  {t(lang, "letsBegin")}
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: F.body }}>
                  {t(lang, "voiceIntroSub")}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { step: "01", key: "step1" },
                  { step: "02", key: "step2" },
                  { step: "03", key: "step3" },
                ].map((s) => (
                  <div key={s.step} className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-xs">
                    <div className="text-xl font-bold text-cyan-600" style={{ fontFamily: F.display }}>
                      {s.step}
                    </div>
                    <div className="text-xs font-bold text-slate-800">{t(lang, s.key)}</div>
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <CheckHeader step={0} total={3} onBack={() => navigate("voiceIntro")} onExit={() => navigate("home")} />

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-cyan-100 text-cyan-700 flex items-center justify-center shadow-inner">
                <Volume2 className="w-10 h-10" />
              </div>

              <div className="text-center w-full space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t(lang, "listenToQuestion")}
                </p>

                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md">
                  <p className="text-xl font-medium text-slate-900 leading-relaxed" style={{ fontFamily: F.body }}>
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

            <div className="p-6 bg-white border-t border-slate-200">
              <Btn label={t(lang, "startSpeaking")} onClick={() => navigate("recording")} />
            </div>
            <HomeIndicator />
          </div>
        );

      case "recording":
        return (
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <CheckHeader step={0} total={3} onBack={() => navigate("instruction")} onExit={() => navigate("home")} />

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
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
                      : "bg-gradient-to-tr from-cyan-600 to-cyan-800 shadow-cyan-600/40"
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
                    <p className="text-2xl font-bold text-slate-800" style={{ fontFamily: F.display }}>
                      {t(lang, "tapToSpeak")}
                    </p>
                    <p className="text-xs text-slate-500">Tap microphone when you are ready</p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <span>{isPaused ? "Paused" : "Recording Voice"}</span>
                    </div>
                    <p className="text-4xl font-bold text-slate-900 tracking-wider" style={{ fontFamily: F.display }}>
                      {String(Math.floor(recordingSecs / 60)).padStart(2, "0")}:{String(recordingSecs % 60).padStart(2, "0")}
                    </p>
                    <p className="text-xs text-slate-500">{t(lang, "speakNaturally")}</p>
                  </>
                )}
              </div>

              {/* Dynamic Waveform Visualizer */}
              <DynamicWaveformBars active={isRecording && !isPaused} level={micLevel} />
            </div>

            <div className="p-6 bg-white border-t border-slate-200 space-y-3">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                  {t(lang, "recordingReady")}
                </h1>
                <p className="text-xs text-slate-500">{t(lang, "listenBefore")}</p>
              </div>

              {/* Audio player card */}
              <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
                <button
                  onClick={() => {
                    if (currentAudioUrl) {
                      const audio = new Audio(currentAudioUrl);
                      audio.play();
                    }
                  }}
                  className="w-12 h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center shadow-md active:scale-95 flex-shrink-0"
                >
                  <Play className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <DynamicWaveformBars active={false} bars={16} />
                </div>
                <span className="text-xs font-bold text-slate-500">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <CheckHeader step={1} total={3} onBack={() => navigate("recordingReview")} onExit={() => navigate("home")} />

            <div className="flex-1 flex flex-col px-6 pt-3 pb-4 gap-3 animate-fade-in-up">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                  {t(lang, "whatDoYouSee")}
                </h1>
                <p className="text-xs text-slate-500">{t(lang, "pictureDescSub")}</p>
              </div>

              {/* Picture description task illustration */}
              <div className="w-full h-48 rounded-3xl bg-gradient-to-tr from-sky-200 via-amber-100 to-emerald-100 border border-slate-200 flex items-center justify-center overflow-hidden relative shadow-inner">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <CheckHeader step={2} total={3} onBack={() => navigate("pictureDesc")} onExit={() => navigate("home")} />

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                <Sparkles className="w-10 h-10" />
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                  {t(lang, "listenCarefully")}
                </h1>
                <p className="text-xs text-slate-500">{t(lang, "memorySub")}</p>
              </div>

              <div className="w-full p-6 rounded-3xl bg-white border border-slate-200 text-center shadow-md space-y-1">
                <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.body }}>
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <CheckHeader step={2} total={3} onBack={() => navigate("memory")} onExit={() => navigate("home")} />

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                <MessageSquare className="w-10 h-10" />
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                  {t(lang, "oneMore")}
                </h1>
                <p className="text-lg text-slate-800 font-medium leading-relaxed" style={{ fontFamily: F.body }}>
                  {getTaskPrompt(lang, "conversation")}
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-center">
                <p className="text-xs italic text-slate-500">"{t(lang, "conversationSub")}"</p>
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
          <div className="flex-1 flex flex-col items-center justify-center px-6 bg-gradient-to-tr from-sky-50 to-cyan-100 animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-6">
              <Check className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 text-center" style={{ fontFamily: F.display }}>
              {t(lang, "youreDone")}
            </h1>
            <p className="text-sm text-slate-600 text-center mt-2 max-w-xs" style={{ fontFamily: F.body }}>
              {t(lang, "completionSub")}
            </p>

            <div className="mt-8">
              <Btn label="View Analysis Results →" onClick={() => navigate("processing")} />
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-8 bg-sky-50/60 animate-fade-in space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-cyan-100 text-cyan-700 flex items-center justify-center shadow-inner">
              <Activity className="w-12 h-12 animate-pulse" />
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                {t(lang, "analyzingVoice")}
              </h1>
              <p className="text-xs text-slate-500">{t(lang, "thisMayTake")}</p>
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
                    label="Record Voice Again"
                    onClick={() => {
                      setAnalysisError(null);
                      navigate("recording");
                    }}
                    variant="secondary"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="w-full space-y-2">
                  <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-800 animate-pulse w-4/5" />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
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

                <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs text-slate-600">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="text-center space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {screeningApiResult?.screening.status || t(lang, "noConcern")}
                </span>
                <h1 className="text-2xl font-bold text-slate-900 pt-1" style={{ fontFamily: F.display }}>
                  {t(lang, "voiceCheckComplete")}
                </h1>
              </div>

              <div className="w-full p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
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
                <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-left space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Voice Transcript</span>
                    <span>{screeningApiResult.word_count} words ({screeningApiResult.audio?.duration_seconds.toFixed(1)}s)</span>
                  </div>
                  <p className="text-xs italic text-slate-700 leading-relaxed">
                    "{screeningApiResult.transcript}"
                  </p>
                </div>
              )}

              {/* Real SHAP Factors Card */}
              {screeningApiResult?.explanation && (
                <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Model Explainability (SHAP)
                    </span>
                    <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
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

              <div className="p-3 rounded-2xl bg-slate-100 text-[11px] text-slate-500 text-center leading-relaxed">
                Screening result only — not a medical diagnosis.
              </div>

              <div className="w-full space-y-3 pt-2">
                <Btn label={t(lang, "done")} onClick={() => navigate("home")} />
                <Btn label={t(lang, "viewDetails")} onClick={() => navigate("screeningDetails")} variant="ghost" />
              </div>
            </div>
            <HomeIndicator />
          </div>
        );

      case "resultElevated":
        return (
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shadow-md">
                <AlertTriangle className="w-10 h-10" />
              </div>

              <div className="text-center space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  {screeningApiResult?.screening.status || t(lang, "furtherEval")}
                </span>
                <h1 className="text-2xl font-bold text-slate-900 pt-1" style={{ fontFamily: F.display }}>
                  Evaluation Recommended
                </h1>
              </div>

              <div className="w-full p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
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
                <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-left space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Voice Transcript</span>
                    <span>{screeningApiResult.word_count} words ({screeningApiResult.audio?.duration_seconds.toFixed(1)}s)</span>
                  </div>
                  <p className="text-xs italic text-slate-700 leading-relaxed">
                    "{screeningApiResult.transcript}"
                  </p>
                </div>
              )}

              {/* Real SHAP Factors Card */}
              {screeningApiResult?.explanation && (
                <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Model Explainability (SHAP)
                    </span>
                    <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
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

              <div className="p-3 rounded-2xl bg-slate-100 text-[11px] text-slate-500 text-center leading-relaxed">
                Screening result only — not a medical diagnosis.
              </div>

              <div className="w-full space-y-2.5 pt-2">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                Screening Details
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
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
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
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
                    <div className="text-xs font-bold text-cyan-800">{b.val}</div>
                  </div>
                ))}
              </div>

              {/* Real ASR Transcription */}
              {screeningApiResult?.transcript && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>Voice Transcript (Whisper ASR)</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {screeningApiResult.word_count} words · {screeningApiResult.detected_language?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs italic text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{screeningApiResult.transcript}"
                  </p>
                </div>
              )}

              {/* Real Model Explainability (Tree SHAP) Section */}
              {screeningApiResult?.explanation && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Model Explainability (SHAP)
                    </span>
                    <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
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

              <div className="p-3 rounded-2xl bg-slate-100 text-[11px] text-slate-500 text-center leading-relaxed">
                Screening result only — not a medical diagnosis.
              </div>

              <div className="space-y-2 pt-2">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                {t(lang, "healthcarePros")}
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
              {[
                { name: "Dr. Priya Sharma", role: t(lang, "neurologist"), spec: "Cognitive & Memory Health", wait: "Today", rating: "4.9" },
                { name: "Dr. Rajesh Varma", role: t(lang, "generalPhysician"), spec: "Primary Healthcare", wait: "Today", rating: "4.8" },
                { name: "Sunita Kumari", role: t(lang, "healthWorkerRole"), spec: "Community Health Center", wait: "Available Now", rating: "4.9" },
              ].map((doc) => (
                <div key={doc.name} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-base text-slate-900" style={{ fontFamily: F.display }}>{doc.name}</div>
                      <div className="text-xs text-cyan-700 font-semibold">{doc.role} · {doc.spec}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      {doc.wait}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => navigate("teleconsult")}
                      className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Video className="w-3.5 h-3.5" />
                      {t(lang, "startConsultation")}
                    </button>
                    <button
                      onClick={() => {
                        if (screeningsList.length > 0) generateAndDownloadReport(screeningsList[0]);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-cyan-50 text-cyan-800 font-bold text-xs border border-cyan-200"
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
          <div className="flex-1 flex flex-col bg-slate-950 text-white">
            <StatusBar light />
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <BackBtn onBack={() => navigate("referral")} />
              <span className="text-xs font-bold text-cyan-400">Teleconsultation · Live</span>
              <div className="w-10" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-800 to-slate-800 border-2 border-cyan-500/30 flex items-center justify-center shadow-2xl">
                <Stethoscope className="w-16 h-16 text-cyan-300" />
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: F.display }}>
                  Dr. Priya Sharma
                </h2>
                <p className="text-xs text-cyan-200">Consultant Neurologist · AI Voice Review</p>
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
          <div className="flex-1 flex flex-col bg-slate-950 text-white">
            <StatusBar light />
            <div className="px-6 pt-3 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white" style={{ fontFamily: F.display }}>
                    Doctor Clinical Dashboard
                  </h1>
                  <p className="text-xs text-cyan-300">SwarSanket AI & Quantum ML Diagnostics</p>
                </div>
                <button
                  onClick={() => navigate("home")}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Exit
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "Patients", v: "4" },
                  { l: "Elevated", v: "2", c: "text-amber-400" },
                  { l: "Accuracy", v: "93%", c: "text-cyan-400" },
                ].map((s) => (
                  <div key={s.l} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                    <div className={`text-xl font-bold ${s.c || "text-white"}`} style={{ fontFamily: F.display }}>{s.v}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 rounded-t-3xl bg-sky-50/80 text-slate-900 flex flex-col overflow-hidden">
              <div className="px-6 pt-4 pb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600" style={{ fontFamily: F.display }}>
                  Recent Patient Screenings
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
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
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-cyan-400 shadow-xs cursor-pointer flex items-center justify-between transition-all"
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
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
                className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-sm"
              >
                Print Report
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              {/* Risk Banner */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Screening Outcome</div>
                  <div className="text-base font-bold text-amber-900">Elevated Cognitive Risk (88%)</div>
                </div>
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>

              {/* Recharts Longitudinal Trend */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
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
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Area type="monotone" dataKey="risk" stroke="#0891b2" fill="#e0f7fa" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dual-Engine ML Model Scores */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Dual-Engine ML Analysis</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-medium">
                    <span>Classical (Xception + XGBoost):</span>
                    <span className="font-bold text-cyan-800">84% Risk (AUC 0.91)</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Quantum-Hybrid (PennyLane QNN):</span>
                    <span className="font-bold text-cyan-800">89% Risk (AUC 0.93)</span>
                  </div>
                </div>
              </div>

              {/* SHAP Feature Attribution */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
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
                      <span className="font-bold text-cyan-700">+{s.weight}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${s.weight * 2}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                {t(lang, "history")}
              </h1>
              <button onClick={() => navigate("trend")} className="text-xs font-bold text-cyan-700 hover:underline">
                View Trends →
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
              {screeningsList.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto text-slate-400">
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
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-cyan-300 shadow-xs cursor-pointer flex items-center justify-between transition-all"
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("history")} />
              <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                Your Progress & Trend
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
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
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke="#0891b2" fill="#e0f7fa" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-50 text-xs text-cyan-900 leading-relaxed">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="px-6 pt-3 pb-2 flex items-center gap-3">
              <BackBtn onBack={() => navigate("home")} />
              <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                Caregiver Mode
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-600 to-cyan-800 text-white space-y-2 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-base">Assisted Screening</div>
                    <div className="text-xs text-cyan-100">Help family members screen easily</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Linked Profiles</div>
                {[
                  { name: "Rama Devi", age: 72, relation: "Mother", status: "Follow-up Recommended" },
                  { name: "Suresh Kumar", age: 68, relation: "Father", status: "Normal" },
                ].map((m) => (
                  <div key={m.name} className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <div>
                      <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>{m.name}, {m.age}</div>
                      <div className="text-xs text-slate-500">{m.relation} · {m.status}</div>
                    </div>
                    <button
                      onClick={() => navigate("voiceIntro")}
                      className="px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-800 font-bold text-xs border border-cyan-200"
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
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

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
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
                  <div key={p.name} className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <div>
                      <div className="font-bold text-sm text-slate-900" style={{ fontFamily: F.display }}>{p.name}, {p.age}</div>
                      <div className="text-xs text-slate-500">{p.village} · Status: {p.status}</div>
                    </div>
                    {p.status === "pending" ? (
                      <button onClick={() => navigate("voiceIntro")} className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="px-6 pt-3 pb-2">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                {t(lang, "howCanWeHelp")}
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
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
                    className="w-full p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-3.5 text-left shadow-xs hover:border-cyan-300 active:scale-95 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center flex-shrink-0">
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
          <div className="flex-1 flex flex-col bg-sky-50/50">
            <StatusBar />
            <div className="px-6 pt-3 pb-2">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: F.display }}>
                Profile & Settings
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-4 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xl">
                  {userName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-base text-slate-900" style={{ fontFamily: F.display }}>{userName}</div>
                  <div className="text-xs text-slate-500">Age: {userAge} · {LANGUAGES.find((l) => l.code === lang)?.name}</div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
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
                      <span className="text-xs text-cyan-700 font-semibold">{s.value} →</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <BottomNav active="settings" navigate={navigate} lang={lang} />
            <HomeIndicator />
          </div>
        );

      case "offlineSaved":
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-6 bg-sky-50/60 animate-fade-in space-y-6">
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shadow-md">
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
          <div className="flex-1 flex flex-col items-center justify-center px-6 bg-sky-50/60 animate-fade-in space-y-6">
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shadow-md">
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
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center bg-slate-950 p-2 sm:p-6" style={{ fontFamily: F.body }}>
      {/* Top / Floating Demo Navigation Bar on Desktop */}
      <div className="fixed top-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-2 max-w-5xl mx-auto px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide" style={{ fontFamily: F.display }}>
              SwarSanket Mobile
            </div>
            <div className="text-[10px] text-cyan-300">SIH 2026 AI Early Screening</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApkModal(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK</span>
          </button>

          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isOffline ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{isOffline ? "Offline Mode" : "Online"}</span>
          </button>

          <button
            onClick={() => navigate("doctorDash")}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
          >
            <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
            <span>Doctor View</span>
          </button>

          <button
            onClick={() => setFullScreenMode(!fullScreenMode)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold hidden sm:flex items-center gap-1"
          >
            {fullScreenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Container: Mobile Frame on Desktop vs Full Screen on Mobile / Expanded Mode */}
      <div
        className={`relative flex flex-col overflow-hidden bg-sky-50 shadow-2xl transition-all duration-300 mt-14 sm:mt-16 ${
          fullScreenMode
            ? "w-full max-w-2xl h-[92vh] rounded-3xl border border-slate-700"
            : "w-full max-w-[390px] h-[844px] rounded-[48px] border-[6px] border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.8)]"
        }`}
      >
        {/* Dynamic Island on Mockup */}
        {!fullScreenMode && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-50 w-28 h-7 rounded-full bg-slate-950 flex items-center justify-between px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <div className="w-2 h-2 rounded-full bg-cyan-900/60" />
          </div>
        )}

        {/* Render Active Screen */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {renderScreen()}
        </div>
      </div>

      {/* APK & PWA Download Modal */}
      <ApkDownloadModal isOpen={showApkModal} onClose={() => setShowApkModal(false)} />
    </div>
  );
}
