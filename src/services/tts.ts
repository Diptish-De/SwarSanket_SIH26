// ─── Multilingual Text-To-Speech (Web Speech API) ─────────────────────────────

import { LanguageCode } from "../types"

const LANG_BCP47: Record<LanguageCode, string> = {
  en: "en-IN",

  hi: "hi-IN",

  bn: "bn-IN",

  mr: "mr-IN",

  ta: "ta-IN",

  te: "te-IN",

  gu: "gu-IN",

  kn: "kn-IN",

  ml: "ml-IN",
}

let activeUtterance: SpeechSynthesisUtterance | null = null

export function stopSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel()

    activeUtterance = null
  }
}

export function isSpeaking(): boolean {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return window.speechSynthesis.speaking
  }

  return false
}

export function speakText(
  text: string,

  lang: string = "en",

  onStart?: () => void,

  onEnd?: () => void,
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis not supported in this browser.")

    onEnd?.()

    return
  }

  stopSpeech()

  const bcp = LANG_BCP47[(lang as LanguageCode)] || "en-IN"

  const utterance = new SpeechSynthesisUtterance(text)

  utterance.lang = bcp

  utterance.rate = 0.9 // Slightly slower, calm cadence for elderly users

  utterance.pitch = 1.0

  // Try to find a matching voice if available

  const voices = window.speechSynthesis.getVoices()

  const matchedVoice = voices.find(
    (v) => v.lang.startsWith(lang) || v.lang === bcp,
  )

  if (matchedVoice) {
    utterance.voice = matchedVoice
  }

  utterance.onstart = () => {
    onStart?.()
  }

  utterance.onend = () => {
    activeUtterance = null

    onEnd?.()
  }

  utterance.onerror = (e) => {
    console.warn("TTS playback issue:", e)

    activeUtterance = null

    onEnd?.()
  }

  activeUtterance = utterance

  window.speechSynthesis.speak(utterance)
}
