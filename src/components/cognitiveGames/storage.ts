import { CognitiveGameId, GameProgress, GameSession } from "./types"

const PROGRESS_PREFIX = "swarsanket_web_game_progress_"

const SESSIONS_KEY = "swarsanket_web_game_sessions"

export function getGameProgress(gameId: CognitiveGameId): GameProgress {
  try {
    const raw = localStorage.getItem(`${PROGRESS_PREFIX}${gameId}`)

    if (raw) {
      return JSON.parse(raw) as GameProgress
    }
  } catch {
    // LocalStorage fallback
  }

  return {
    gameId,

    bestScore: 0,

    highestLevel: 1,

    bestTimeSeconds: 0,

    bestStreak: 0,

    gamesPlayed: 0,
  }
}

export function getAllGamesProgress(): Record<CognitiveGameId, GameProgress> {
  const ids: CognitiveGameId[] = [
    "logic_puzzle",

    "memory_treasure",

    "selective_attention",

    "speed_visualisation",
  ]

  const result = {} as Record<CognitiveGameId, GameProgress>

  for (const id of ids) {
    result[id] = getGameProgress(id)
  }

  return result
}

export function recordGameSession(session: GameSession): GameProgress {
  const current = getGameProgress(session.gameId)

  const newBestScore = Math.max(current.bestScore, session.score)

  const newHighestLevel = Math.max(current.highestLevel, session.level)

  const newBestStreak = Math.max(current.bestStreak, session.streak || 0)

  let newBestTime = current.bestTimeSeconds

  if (session.durationSeconds > 0) {
    if (
      current.bestTimeSeconds === 0 ||
      session.durationSeconds < current.bestTimeSeconds
    ) {
      newBestTime = session.durationSeconds
    }
  }

  const updated: GameProgress = {
    gameId: session.gameId,

    bestScore: newBestScore,

    highestLevel: newHighestLevel,

    bestStreak: newBestStreak,

    bestTimeSeconds: newBestTime,

    gamesPlayed: current.gamesPlayed + 1,

    lastPlayed: session.completedAt || new Date().toISOString(),
  }

  try {
    localStorage.setItem(
      `${PROGRESS_PREFIX}${session.gameId}`,

      JSON.stringify(updated),
    )

    const rawSessions = localStorage.getItem(SESSIONS_KEY)

    const list: GameSession[] = rawSessions ? JSON.parse(rawSessions) : []

    const updatedList = [session, ...list].slice(0, 25)

    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedList))
  } catch {
    // LocalStorage fallback
  }

  return updated
}

export function formatGameTime(seconds: number): string {
  if (seconds <= 0) return "--:--"

  const m = Math.floor(seconds / 60)

    .toString()

    .padStart(2, "0")

  const s = (seconds % 60).toString().padStart(2, "0")

  return `${m}:${s}`
}
