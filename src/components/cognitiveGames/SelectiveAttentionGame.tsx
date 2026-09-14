import React, { useState, useEffect, useRef } from "react"

import {
  ArrowLeft,
  Timer as TimerIcon,
  Target,
  Star,
  Flame,
} from "lucide-react"

import { recordGameSession } from "./storage"

interface SelectiveAttentionGameProps {
  onBack: () => void

  fontFamily?: string
}

interface AttentionItem {
  id: number

  icon: string

  name: string
}

const ATTENTION_ITEMS: AttentionItem[] = [
  { id: 0, icon: "🌟", name: "Gold Star" },

  { id: 1, icon: "⭐", name: "Star" },

  { id: 2, icon: "✨", name: "Sparkles" },

  { id: 3, icon: "🌙", name: "Moon" },

  { id: 4, icon: "☀️", name: "Sun" },

  { id: 5, icon: "⚡", name: "Lightning" },

  { id: 6, icon: "🎯", name: "Target" },

  { id: 7, icon: "🔥", name: "Flame" },

  { id: 8, icon: "💎", name: "Gem" },

  { id: 9, icon: "🍀", name: "Clover" },

  { id: 10, icon: "🌸", name: "Blossom" },

  { id: 11, icon: "🍎", name: "Apple" },

  { id: 12, icon: "🍓", name: "Berry" },

  { id: 13, icon: "🍒", name: "Cherry" },

  { id: 14, icon: "🎈", name: "Balloon" },

  { id: 15, icon: "🔔", name: "Bell" },
]

export default function SelectiveAttentionGame({
  onBack,

  fontFamily = "'Outfit', sans-serif",
}: SelectiveAttentionGameProps) {
  const TOTAL_ROUNDS = 10

  const [currentRound, setCurrentRound] = useState(1)

  const [score, setScore] = useState(0)

  const [correctCount, setCorrectCount] = useState(0)

  const [incorrectCount, setIncorrectCount] = useState(0)

  const [streak, setStreak] = useState(0)

  const [maxStreak, setMaxStreak] = useState(0)

  const [roundTimeLeft, setRoundTimeLeft] = useState(14)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const [feedback, setFeedback] = useState<{
    text: string

    isCorrect: boolean
  } | null>(null)

  const [isCompleted, setIsCompleted] = useState(false)

  const [targetItem, setTargetItem] = useState<AttentionItem>(
    ATTENTION_ITEMS[0],
  )

  const [gridItems, setGridItems] = useState<AttentionItem[]>([])

  const startTimeRef = useRef(Date.now())

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    startSession()

    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  // Elapsed game timer

  useEffect(() => {
    if (isCompleted) return

    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isCompleted])

  // Round countdown timer

  useEffect(() => {
    if (isCompleted) return

    const roundInterval = setInterval(() => {
      setRoundTimeLeft((t) => {
        if (t <= 1) {
          handleTimeExpired()

          return 0
        }

        return t - 1
      })
    }, 1000)

    return () => clearInterval(roundInterval)
  }, [currentRound, isCompleted])

  const startSession = () => {
    startTimeRef.current = Date.now()

    setCurrentRound(1)

    setScore(0)

    setCorrectCount(0)

    setIncorrectCount(0)

    setStreak(0)

    setMaxStreak(0)

    setElapsedSeconds(0)

    setIsCompleted(false)

    setupRound(1)
  }

  const setupRound = (round: number) => {
    let count = 6

    let time = 14

    if (round > 8) {
      count = 16

      time = 8
    } else if (round > 5) {
      count = 12

      time = 10
    } else if (round > 2) {
      count = 9

      time = 12
    }

    setRoundTimeLeft(time)

    // Select target

    const targetIdx = Math.floor(Math.random() * ATTENTION_ITEMS.length)

    const target = ATTENTION_ITEMS[targetIdx]

    setTargetItem(target)

    // Select distractors

    const poolWithoutTarget = ATTENTION_ITEMS.filter(
      (_, i) => i !== targetIdx,
    ).sort(() => Math.random() - 0.5)

    const distractors = poolWithoutTarget.slice(0, count - 1)

    // Insert target at random position

    const randPos = Math.floor(Math.random() * count)

    const items = [...distractors]

    items.splice(randPos, 0, target)

    setGridItems(items)

    setFeedback(null)
  }

  const handleTimeExpired = () => {
    setIncorrectCount((i) => i + 1)

    setStreak(0)

    setFeedback({ text: "Time expired!", isCorrect: false })

    advanceRound()
  }

  const handleItemClick = (item: AttentionItem) => {
    if (feedback) return // Avoid multi-taps during transition

    if (item.id === targetItem.id) {
      // MATCH

      const speedBonus = roundTimeLeft * 10

      const streakBonus = streak * 15

      const roundPoints = 100 + speedBonus + streakBonus

      const newStreak = streak + 1

      setStreak(newStreak)

      setMaxStreak((m) => Math.max(m, newStreak))

      setCorrectCount((c) => c + 1)

      setScore((s) => s + roundPoints)

      setFeedback({
        text: `Target found! +${roundPoints} pts`,

        isCorrect: true,
      })

      advanceRound()
    } else {
      // MISMATCH

      setIncorrectCount((i) => i + 1)

      setStreak(0)

      setScore((s) => Math.max(0, s - 20))

      setFeedback({ text: "Distractor tapped! Keep looking", isCorrect: false })
    }
  }

  const advanceRound = () => {
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
    }, 450)
  }

  const handleSessionComplete = () => {
    setIsCompleted(true)

    const total = correctCount + incorrectCount

    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0

    let stars = 1

    if (accuracy >= 85 && correctCount >= 7) stars = 3
    else if (accuracy >= 65 && correctCount >= 5) stars = 2

    recordGameSession({
      id: `sa_${Date.now()}`,

      gameId: "selective_attention",

      startedAt: new Date(startTimeRef.current).toISOString(),

      completedAt: new Date().toISOString(),

      score,

      level: currentRound > 5 ? 2 : 1,

      durationSeconds: elapsedSeconds,

      moves: total,

      mistakes: incorrectCount,

      streak: maxStreak,

      stars,
    })
  }

  const totalAttempts = correctCount + incorrectCount

  const accuracy =
    totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0

  const gridColsClass = gridItems.length === 16 ? "grid-cols-4" : "grid-cols-3"

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
            Selective Attention
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
            {currentRound} / {TOTAL_ROUNDS}
          </span>
        </div>

        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${
            roundTimeLeft <= 3
              ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
              : "bg-slate-100 border-slate-200 text-slate-700"
          }`}
        >
          <TimerIcon className="w-3.5 h-3.5" />
          <span>{roundTimeLeft}s</span>
        </div>
      </div>

      <div className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-between">
        {/* ─── Top Stats Bar ────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {streak > 1 ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>{streak} Streak</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                Focus mode active
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

          {/* Target Symbol Focus Card */}
          <div className="w-full rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] text-white p-4 flex items-center gap-4 shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-white text-slate-900 flex items-center justify-center text-3xl shadow-md shrink-0">
              {targetItem.icon}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-200 tracking-wider block">
                Find this target
              </span>
              <h3
                style={{ fontFamily }}
                className="text-lg font-bold text-white leading-tight"
              >
                {targetItem.name}
              </h3>
              <span className="text-[11px] text-sky-100/90">
                Tap matching symbol ignoring all distractors
              </span>
            </div>
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

        {/* ─── Interactive Items Grid ────────────────────────────────── */}
        <div className="my-auto py-2">
          <div
            className={`w-full max-w-[340px] mx-auto bg-white p-3 rounded-2xl border border-slate-200 shadow-md grid gap-2.5 ${gridColsClass}`}
          >
            {gridItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleItemClick(item)}
                className="aspect-square rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl shadow-2xs hover:scale-105 active:scale-95 transition-all"
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          Round {currentRound} of {TOTAL_ROUNDS} • Speed and accuracy increase
          points
        </div>
      </div>

      {/* ─── Victory Celebration Modal ───────────────────────────────── */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl shadow-sm">
              🎯
            </div>

            <div>
              <h3
                style={{ fontFamily }}
                className="text-xl font-bold text-slate-900"
              >
                Attention Challenge Complete!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Superb visual target discrimination!
              </p>
            </div>

            <div className="flex justify-center gap-1.5 py-1">
              {[0, 1, 2].map((i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${
                    i < (accuracy >= 85 ? 3 : accuracy >= 65 ? 2 : 1)
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
                <span>Accuracy:</span>
                <span className="font-bold text-emerald-600">
                  {accuracy}% ({correctCount}/{totalAttempts})
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Best Streak:</span>
                <span className="font-bold text-amber-600">
                  {maxStreak} in a row
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Time:</span>
                <span className="font-bold text-slate-900">
                  {elapsedSeconds}s
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
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors"
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
