import React, { useState, useEffect, useRef } from "react"
import { ArrowLeft, Timer as TimerIcon, Zap, Star } from "lucide-react"
import { recordGameSession } from "./storage"

interface SpeedVisualisationGameProps {
  onBack: () => void
  fontFamily?: string
}

const SYMBOL_POOL = ["🔷", "🔶", "🟢", "🔺", "⭐", "🟣", "⬛", "💛"]

export default function SpeedVisualisationGame({
  onBack,
  fontFamily = "'Outfit', sans-serif",
}: SpeedVisualisationGameProps) {
  const TOTAL_ROUNDS = 10
  const [currentRound, setCurrentRound] = useState(1)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectCount, setIncorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [feedback, setFeedback] = useState<{
    text: string
    isCorrect: boolean
  } | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

  const [referencePattern, setReferencePattern] = useState<string[]>([])
  const [choices, setChoices] = useState<string[][]>([])
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState(0)

  const roundStartTimeRef = useRef(performance.now())
  const sessionStartTimeRef = useRef(Date.now())
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    startSession()
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  // Timer
  useEffect(() => {
    if (isCompleted) return
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isCompleted])

  const startSession = () => {
    sessionStartTimeRef.current = Date.now()
    setCurrentRound(1)
    setScore(0)
    setCorrectCount(0)
    setIncorrectCount(0)
    setStreak(0)
    setMaxStreak(0)
    setResponseTimes([])
    setElapsedSeconds(0)
    setIsCompleted(false)
    setupRound(1)
  }

  const setupRound = (round: number) => {
    const patternLen = round > 4 ? 4 : 3
    const choiceCount = round > 5 ? 4 : 3

    // Create reference pattern
    const poolShuffled = [...SYMBOL_POOL].sort(() => Math.random() - 0.5)
    const ref = poolShuffled.slice(0, patternLen)
    setReferencePattern(ref)

    // Generate choices
    const correctIdx = Math.floor(Math.random() * choiceCount)
    setCorrectChoiceIndex(correctIdx)

    const newChoices: string[][] = []
    for (let i = 0; i < choiceCount; i++) {
      if (i === correctIdx) {
        newChoices.push([...ref])
      } else {
        // Modify one symbol
        const distractor = [...ref]
        const alterPos = Math.floor(Math.random() * patternLen)
        const unused = SYMBOL_POOL.filter((s) => !ref.includes(s))
        if (unused.length > 0) {
          distractor[alterPos] =
            unused[Math.floor(Math.random() * unused.length)]
        } else {
          // Swap positions
          const swapPos = (alterPos + 1) % patternLen
          const tmp = distractor[alterPos]
          distractor[alterPos] = distractor[swapPos]
          distractor[swapPos] = tmp
        }
        newChoices.push(distractor)
      }
    }

    setChoices(newChoices)
    setFeedback(null)
    roundStartTimeRef.current = performance.now()
  }

  const handleChoiceClick = (choiceIndex: number) => {
    if (feedback) return // prevent double-tap during transition
    const latency = Math.round(performance.now() - roundStartTimeRef.current)
    setResponseTimes((prev) => [...prev, latency])

    const isMatch = choiceIndex === correctChoiceIndex

    if (isMatch) {
      let speedBonus = 50
      if (latency < 800) speedBonus = 150
      else if (latency < 1400) speedBonus = 100

      const roundPoints = 100 + speedBonus + streak * 20
      const newStreak = streak + 1
      setStreak(newStreak)
      setMaxStreak((m) => Math.max(m, newStreak))
      setCorrectCount((c) => c + 1)
      setScore((s) => s + roundPoints)
      setFeedback({
        text: `⚡ Fast! ${latency}ms (+${roundPoints} pts)`,
        isCorrect: true,
      })
    } else {
      setIncorrectCount((i) => i + 1)
      setStreak(0)
      setFeedback({ text: "Mismatched pattern!", isCorrect: false })
    }

    advanceTimerRef.current = setTimeout(() => {
      if (currentRound >= TOTAL_ROUNDS) {
        handleSessionComplete()
      } else {
        setCurrentRound((r) => {
          const next = r + 1
          setupRound(next)
          return next
        })
      }
    }, 400)
  }

  const handleSessionComplete = () => {
    setIsCompleted(true)
    const accuracy = Math.round((correctCount / TOTAL_ROUNDS) * 100)
    const avgLatency =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          )
        : 0

    let stars = 1
    if (accuracy >= 80 && avgLatency < 1300) stars = 3
    else if (accuracy >= 60) stars = 2

    recordGameSession({
      id: `sv_${Date.now()}`,
      gameId: "speed_visualisation",
      startedAt: new Date(sessionStartTimeRef.current).toISOString(),
      completedAt: new Date().toISOString(),
      score,
      level: currentRound > 5 ? 2 : 1,
      durationSeconds: elapsedSeconds,
      moves: TOTAL_ROUNDS,
      mistakes: incorrectCount,
      streak: maxStreak,
      stars,
    })
  }

  const avgLatency =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        )
      : 0

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] text-[#0F172A] overflow-y-auto select-none">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Games Hub</span>
        </button>

        <div className="flex items-center gap-2">
          <span
            style={{ fontFamily }}
            className="text-base font-bold text-slate-800"
          >
            Speed Visualisation
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-xs font-bold">
            {currentRound} / {TOTAL_ROUNDS}
          </span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
          <TimerIcon className="w-3.5 h-3.5 text-purple-600" />
          <span>{elapsedSeconds}s</span>
        </div>
      </div>

      <div className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-between">
        {/* ─── Top Stats Bar ────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {streak > 1 ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>{streak} Streak</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                Speed match mode
              </span>
            )}

            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">
                Score:{" "}
              </span>
              <span
                style={{ fontFamily }}
                className="text-sm font-bold text-slate-900"
              >
                {score} pts
              </span>
            </div>
          </div>

          {/* Reference Pattern Card */}
          <div className="w-full rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-4 shadow-lg text-center space-y-2.5">
            <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider block">
              Reference Pattern
            </span>

            <div className="flex items-center justify-center gap-3 py-1">
              {referencePattern.map((sym, idx) => (
                <div
                  key={idx}
                  className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl shadow-xs"
                >
                  {sym}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-300">
              Tap the exact matching sequence below as quickly as possible
            </p>
          </div>

          {feedback && (
            <div
              className={`text-xs text-center font-bold py-1.5 px-3 rounded-xl transition-all ${
                feedback.isCorrect
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>

        {/* ─── Options Selection List ────────────────────────────────── */}
        <div className="my-auto py-2 space-y-2.5">
          {choices.map((choice, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChoiceClick(idx)}
              className="w-full py-3.5 px-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-purple-400 active:scale-[0.99] shadow-xs hover:shadow-md flex items-center justify-center gap-3 text-2xl transition-all"
            >
              {choice.map((sym, sIdx) => (
                <span key={sIdx}>{sym}</span>
              ))}
            </button>
          ))}
        </div>

        <div className="text-center text-[11px] text-slate-400">
          Round {currentRound} of {TOTAL_ROUNDS} • Reaction speed scales bonus
          points
        </div>
      </div>

      {/* ─── Victory Celebration Modal ───────────────────────────────── */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl shadow-sm">
              ⚡
            </div>

            <div>
              <h3
                style={{ fontFamily }}
                className="text-xl font-bold text-slate-900"
              >
                Rapid Visual Complete!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Outstanding reaction speed & visual processing!
              </p>
            </div>

            <div className="flex justify-center gap-1.5 py-1">
              {[0, 1, 2].map((i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${
                    i <
                    (Math.round((correctCount / TOTAL_ROUNDS) * 100) >= 80
                      ? 3
                      : 2)
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Final Score:</span>
                <span className="font-bold text-slate-900">{score} pts</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Average Reaction:</span>
                <span className="font-bold text-purple-600">
                  {avgLatency} ms
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Accuracy:</span>
                <span className="font-bold text-emerald-600">
                  {Math.round((correctCount / TOTAL_ROUNDS) * 100)}% (
                  {correctCount}/{TOTAL_ROUNDS})
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Best Streak:</span>
                <span className="font-bold text-amber-600">
                  {maxStreak} streak
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={startSession}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Back to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
