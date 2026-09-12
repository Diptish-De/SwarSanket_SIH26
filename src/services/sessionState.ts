/**
 * Session persistence
 * ===================
 * Keeps the app on the screen the user was actually looking at when the page
 * reloads, instead of dropping them back at the splash screen and making them
 * walk the whole flow again.
 *
 * Beyond the screen name it also restores the small amount of state those screens
 * need in order to render the same thing they were showing: the chosen language,
 * the active task, and the last screening result. Without the result payload a
 * restored result page would render its empty-state placeholders, which looks
 * broken rather than restored.
 *
 * Screens that depend on something live - an open microphone, an in-flight
 * request - cannot be resumed, because that resource does not survive a reload.
 * Those fall back to the nearest screen the user can actually act from.
 */

import { LanguageCode, RecordingContext, Screen, ScreeningRisk } from "../types"
import { ScreeningApiResponse } from "./audioRecorder"

const STORAGE_KEY = "swarsanket.session.v1"

/** Stale state is worse than no state; a day-old screen is not where you are now. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Screens backed by a live resource. Reloading destroys the recorder stream and
 * any in-flight analysis, so resuming them would show a dead microphone button or
 * a spinner that never resolves.
 */
const NON_RESUMABLE: Partial<Record<Screen, Screen>> = {
  recording: "instruction",
  processing: "instruction",
}

export interface PersistedSession {
  screen: Screen
  lang: LanguageCode
  recordingContext: RecordingContext
  lastResult: ScreeningRisk | null
  screeningApiResult: ScreeningApiResponse | null
  userName: string
  userAge: number
  assistedMode: boolean
  savedAt: number
}

export interface RestoredSession
  extends Omit<PersistedSession, "savedAt"> {
  /** True when the stored screen could not be resumed and was redirected. */
  redirected: boolean
}

/**
 * Reads the stored session. Returns null when there is nothing usable - a first
 * visit, cleared storage, a private window, or state old enough to be stale.
 */
export function loadSession(): RestoredSession | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage can throw outright (private mode, blocked site data), not just
    // return null. Treat it as a first visit.
    return null
  }

  if (!raw) return null

  let parsed: Partial<PersistedSession>
  try {
    parsed = (JSON.parse(raw) as Partial<PersistedSession>)
  } catch {
    clearSession()
    return null
  }

  if (!parsed || typeof parsed.screen !== "string") return null

  if (
    typeof parsed.savedAt !== "number" ||
    Date.now() - parsed.savedAt > MAX_AGE_MS
  ) {
    clearSession()
    return null
  }

  const stored = parsed.screen as Screen
  const redirectTo = NON_RESUMABLE[stored]

  return {
    screen: redirectTo ?? stored,
    redirected: Boolean(redirectTo),
    lang: parsed.lang as LanguageCode ?? "en",
    recordingContext:
      parsed.recordingContext as RecordingContext ?? "pictureDesc",
    lastResult: parsed.lastResult as ScreeningRisk | null ?? null,
    screeningApiResult:
      parsed.screeningApiResult as ScreeningApiResponse | null ?? null,
    userName: typeof parsed.userName === "string" ? parsed.userName : "",
    userAge: typeof parsed.userAge === "number" ? parsed.userAge : 0,
    assistedMode: Boolean(parsed.assistedMode),
  }
}

/** Writes the session. Never throws: persistence failing must not break the app. */
export function saveSession(session: Omit<PersistedSession, "savedAt">): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, savedAt: Date.now() }),
    )
  } catch {
    // Quota exceeded or storage blocked. Retry without the largest field so the
    // screen itself still survives the reload even if the result payload cannot.
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...session,
          screeningApiResult: null,
          savedAt: Date.now(),
        }),
      )
    } catch {
      // Nothing more to do; the app works without persistence.
    }
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
