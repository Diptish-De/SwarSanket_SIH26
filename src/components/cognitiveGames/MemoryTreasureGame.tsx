import React, { useState, useEffect, useRef } from "react"

import {
  ArrowLeft,
  Timer as TimerIcon,
  RotateCcw,
  Award,
  Star,
  HelpCircle,
} from "lucide-react"

import { recordGameSession, formatGameTime } from "./storage"

interface MemoryTreasureGameProps {
  onBack: () => void

  fontFamily?: string
}

interface TreasureItem {
  id: number

  icon: string

  name: string
}

const TREASURE_ITEMS: TreasureItem[] = [
  { id: 0, icon: "💎", name: "Ruby" },

  { id: 1, icon: "🪙", name: "Coin" },

  { id: 2, icon: "👑", name: "Crown" },

  { id: 3, icon: "🗝️", name: "Key" },

  { id: 4, icon: "🏺", name: "Vase" },

  { id: 5, icon: "🧭", name: "Compass" },

  { id: 6, icon: "🗺️", name: "Map" },

  { id: 7, icon: "💍", name: "Ring" },
]

export default function MemoryTreasureGame({
  onBack,

  fontFamily = "'Outfit', sans-serif",
}: MemoryTreasureGameProps) {
  const [level, setLevel] = useState(1)

  const [moves, setMoves] = useState(0)

  const [pairsFound, setPairsFound] = useState(0)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const [isWon, setIsWon] = useState(false)

  const [deck, setDeck] = useState<number[]>([])

  const [flipped, setFlipped] = useState<boolean[]>(Array(16).fill(false))

  const [matched, setMatched] = useState<boolean[]>(Array(16).fill(false))

  const [firstChoice, setFirstChoice] = useState<number | null>(null)

  const [secondChoice, setSecondChoice] = useState<number | null>(null)

  const [isBusy, setIsBusy] = useState(false)

  const startTimeRef = useRef(Date.now())

  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    startNewGame()

    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current)
    }
  }, [level])

  // Timer

  useEffect(() => {
    if (isWon) return

    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isWon])

  const startNewGame = () => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current)

    startTimeRef.current = Date.now()

    setElapsedSeconds(0)

    setMoves(0)

    setPairsFound(0)

    setIsWon(false)

    setFirstChoice(null)

    setSecondChoice(null)

    setIsBusy(false)

    // Generate 8 pairs (16 cards)

    const pairs: number[] = []

    for (let i = 0; i < 8; i++) {
      pairs.push(i, i)
    }

    pairs.sort(() => Math.random() - 0.5)

    setDeck(pairs)

    setFlipped(Array(16).fill(false))

    setMatched(Array(16).fill(false))
  }

  const handleCardClick = (index: number) => {
    if (isBusy || matched[index] || flipped[index]) return

    const newFlipped = [...flipped]

    newFlipped[index] = true

    setFlipped(newFlipped)

    if (firstChoice === null) {
      setFirstChoice(index)
    } else {
      setSecondChoice(index)

      setMoves((m) => m + 1)

      setIsBusy(true)

      const card1 = deck[firstChoice]

      const card2 = deck[index]

      if (card1 === card2) {
        // MATCH!

        flipTimerRef.current = setTimeout(() => {
          setMatched((prev) => {
            const next = [...prev]

            next[firstChoice] = true

            next[index] = true

            return next
          })

          setPairsFound((p) => {
            const newCount = p + 1

            if (newCount === 8) {
              handleGameWin()
            }

            return newCount
          })

          setFirstChoice(null)

          setSecondChoice(null)

          setIsBusy(false)
        }, 300)
      } else {
        // MISMATCH

        flipTimerRef.current = setTimeout(() => {
          setFlipped((prev) => {
            const next = [...prev]

            next[firstChoice] = false

            next[index] = false

            return next
          })

          setFirstChoice(null)

          setSecondChoice(null)

          setIsBusy(false)
        }, 700)
      }
    }
  }

  const handleGameWin = () => {
    setIsWon(true)

    const movePenalty = (moves - 8) * 30

    const timePenalty = elapsedSeconds * 4

    const score = Math.max(250, 1000 - movePenalty - timePenalty)

    let stars = 3

    if (moves > 22) stars = 1
    else if (moves > 16) stars = 2

    recordGameSession({
      id: `mt_${Date.now()}`,

      gameId: "memory_treasure",

      startedAt: new Date(startTimeRef.current).toISOString(),

      completedAt: new Date().toISOString(),

      score,

      level,

      durationSeconds: elapsedSeconds,

      moves: moves + 1,

      stars,
    })
  }

  const scoreEstimate = Math.max(
    250,

    1000 - Math.max(0, moves - 8) * 30 - elapsedSeconds * 4,
  )

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
            Memory Treasure
          </span>
          <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-xs font-bold">
            Level {level}
          </span>
        </div>

        <button
          type="button"
          onClick={startNewGame}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          title="Restart Game"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-between">
        {/* ─── Top HUD ──────────────────────────────────────────────── */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 divide-x divide-slate-100 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Pairs Found
            </span>
            <span
              style={{ fontFamily }}
              className="text-sm font-bold text-emerald-600"
            >
              {pairsFound} / 8
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Turns / Moves
            </span>
            <span
              style={{ fontFamily }}
              className="text-sm font-bold text-sky-600"
            >
              {moves}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Time
            </span>
            <span
              style={{ fontFamily }}
              className="text-sm font-bold text-amber-600"
            >
              {formatGameTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* ─── 4x4 Card Grid ─────────────────────────────────────────── */}
        <div className="my-auto py-3">
          <div className="w-full max-w-[340px] aspect-square mx-auto grid grid-cols-4 gap-2.5">
            {deck.map((cardId, idx) => {
              const isCardFlipped = flipped[idx] || matched[idx]

              const isCardMatched = matched[idx]

              const item = TREASURE_ITEMS[cardId]

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCardClick(idx)}
                  className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 shadow-sm ${
                    isCardMatched
                      ? "bg-emerald-50 border-2 border-emerald-400 scale-95 shadow-inner"
                      : isCardFlipped
                        ? "bg-white border-2 border-sky-400 shadow-md scale-100"
                        : "bg-gradient-to-br from-[#0891B2] to-[#0E7490] hover:from-[#0E7490] hover:to-[#155E75] text-white active:scale-95 shadow-xs"
                  }`}
                >
                  {isCardFlipped ? (
                    <span>{item.icon}</span>
                  ) : (
                    <HelpCircle className="w-6 h-6 text-white/80" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── Hint Banner ──────────────────────────────────────────── */}
        <div className="bg-sky-50 rounded-2xl p-3 border border-sky-200 text-sky-800 text-xs flex items-center gap-2.5">
          <span className="text-lg">💡</span>
          <p className="leading-snug">
            Remember card positions to make fewer moves and score higher!
          </p>
        </div>
      </div>

      {/* ─── Victory Celebration Modal ───────────────────────────────── */}
      {isWon && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl shadow-sm">
              🏆
            </div>

            <div>
              <h3
                style={{ fontFamily }}
                className="text-xl font-bold text-slate-900"
              >
                Great Job!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                All 8 treasure pairs discovered!
              </p>
            </div>

            <div className="flex justify-center gap-1.5 py-1">
              {[0, 1, 2].map((i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${
                    i < (moves <= 16 ? 3 : moves <= 22 ? 2 : 1)
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Final Score:</span>
                <span className="font-bold text-slate-900">
                  {scoreEstimate} pts
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Time:</span>
                <span className="font-bold text-slate-900">
                  {formatGameTime(elapsedSeconds)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Moves:</span>
                <span className="font-bold text-slate-900">{moves} turns</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Accuracy:</span>
                <span className="font-bold text-emerald-600">
                  {Math.round((8 / Math.max(8, moves)) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={startNewGame}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => setLevel((l) => l + 1)}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Next Level
              </button>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Back to Games
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
