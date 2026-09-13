import React, { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  Timer as TimerIcon,
  RotateCcw,
  Heart,
  Star,
  Sparkles,
} from "lucide-react"
import { recordGameSession } from "./storage"

interface LogicPuzzleGameProps {
  onBack: () => void
  fontFamily?: string
}

interface PuzzleSymbol {
  id: number
  label: string
  icon: string
  color: string
  bgLight: string
}

const PUZZLE_SYMBOLS: PuzzleSymbol[] = [
  {
    id: 0,
    label: "Clover",
    icon: "🍀",
    color: "text-emerald-600 border-emerald-300",
    bgLight: "bg-emerald-50",
  },
  {
    id: 1,
    label: "Spark",
    icon: "⚡",
    color: "text-amber-600 border-amber-300",
    bgLight: "bg-amber-50",
  },
  {
    id: 2,
    label: "Water",
    icon: "💧",
    color: "text-sky-600 border-sky-300",
    bgLight: "bg-sky-50",
  },
  {
    id: 3,
    label: "Flame",
    icon: "🔥",
    color: "text-rose-600 border-rose-300",
    bgLight: "bg-rose-50",
  },
]

const SOLUTION_TEMPLATES = [
  [0, 1, 2, 3, 2, 3, 0, 1, 3, 0, 1, 2, 1, 2, 3, 0],
  [1, 2, 3, 0, 3, 0, 1, 2, 0, 1, 2, 3, 2, 3, 0, 1],
  [2, 3, 0, 1, 0, 1, 2, 3, 1, 2, 3, 0, 3, 0, 1, 2],
]

export default function LogicPuzzleGame({
  onBack,
  fontFamily = "'Outfit', sans-serif",
}: LogicPuzzleGameProps) {
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isWon, setIsWon] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const [board, setBoard] = useState<(number | null)[]>(Array(16).fill(null))
  const [clueIndices, setClueIndices] = useState<Set<number>>(new Set())
  const [solution, setSolution] = useState<number[]>([])

  const startTimeRef = useRef(Date.now())

  // Initialize level
  useEffect(() => {
    startLevel(level)
  }, [level])

  // Timer
  useEffect(() => {
    if (isWon || isGameOver) return
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isWon, isGameOver])

  const startLevel = (lvl: number) => {
    startTimeRef.current = Date.now()
    setElapsedSeconds(0)
    setLives(3)
    setSelectedCell(null)
    setFeedback(null)
    setIsWon(false)
    setIsGameOver(false)

    const templateIndex = (lvl - 1) % SOLUTION_TEMPLATES.length
    const currentSolution = [...SOLUTION_TEMPLATES[templateIndex]]
    setSolution(currentSolution)

    // Calculate prefilled clues (Level 1: 10, Level 2: 8, Level 3: 6, Level 4: 5, Level 5: 4)
    const clueCount = Math.max(4, Math.min(10, 12 - lvl * 2))
    const indices = Array.from({ length: 16 }, (_, i) => i).sort(
      () => Math.random() - 0.5,
    )
    const clues = new Set(indices.slice(0, clueCount))
    setClueIndices(clues)

    const initialBoard = Array.from({ length: 16 }, (_, i) =>
      clues.has(i) ? currentSolution[i] : null,
    )
    setBoard(initialBoard)
  }

  const handleCellClick = (index: number) => {
    if (clueIndices.has(index)) return
    setSelectedCell(index)
    setFeedback(null)
  }

  const handlePlaceSymbol = (symbolId: number) => {
    if (
      selectedCell === null ||
      clueIndices.has(selectedCell) ||
      isWon ||
      isGameOver
    )
      return

    const row = Math.floor(selectedCell / 4)
    const col = selectedCell % 4

    // Check conflicts
    let rowConflict = false
    for (let c = 0; c < 4; c++) {
      const idx = row * 4 + c
      if (idx !== selectedCell && board[idx] === symbolId) {
        rowConflict = true
        break
      }
    }

    let colConflict = false
    for (let r = 0; r < 4; r++) {
      const idx = r * 4 + col
      if (idx !== selectedCell && board[idx] === symbolId) {
        colConflict = true
        break
      }
    }

    const isMatch = solution[selectedCell] === symbolId

    if (rowConflict || colConflict || !isMatch) {
      const newLives = lives - 1
      setLives(newLives)
      setFeedback("Duplicate symbol in row or column!")

      if (newLives <= 0) {
        setIsGameOver(true)
      }
      return
    }

    // Valid placement
    const newBoard = [...board]
    newBoard[selectedCell] = symbolId
    setBoard(newBoard)
    setScore((s) => s + 100)
    setFeedback("Nice deduction! ⭐")

    // Check completion
    const complete = newBoard.every((cell) => cell !== null)
    if (complete) {
      handleGameComplete(newBoard)
    }
  }

  const handleClearCell = () => {
    if (
      selectedCell === null ||
      clueIndices.has(selectedCell) ||
      isWon ||
      isGameOver
    )
      return
    const newBoard = [...board]
    newBoard[selectedCell] = null
    setBoard(newBoard)
    setFeedback(null)
  }

  const handleGameComplete = (finalBoard: (number | null)[]) => {
    setIsWon(true)
    const bonus = lives * 60 + Math.max(10, 120 - elapsedSeconds)
    const finalScore = score + 100 + bonus

    let stars = 3
    if (lives === 2) stars = 2
    if (lives === 1) stars = 1

    recordGameSession({
      id: `lp_${Date.now()}`,
      gameId: "logic_puzzle",
      startedAt: new Date(startTimeRef.current).toISOString(),
      completedAt: new Date().toISOString(),
      score: finalScore,
      level,
      durationSeconds: elapsedSeconds,
      mistakes: 3 - lives,
      stars,
    })
  }

  const filledCount = board.filter((x) => x !== null).length
  const progressPercent = Math.round((filledCount / 16) * 100)

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
            Logic Puzzle
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
            Level {level}
          </span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
          <TimerIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>{elapsedSeconds}s</span>
        </div>
      </div>

      <div className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-between">
        {/* ─── Top Stats Bar ────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <Heart
                  key={i}
                  className={`w-5 h-5 transition-colors ${
                    i < lives
                      ? "text-rose-500 fill-rose-500"
                      : "text-slate-300 fill-slate-200"
                  }`}
                />
              ))}
            </div>

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

          {/* Progress Indicator */}
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-center text-slate-500">
            Each row & column must have 🍀, ⚡, 💧, 🔥 without duplicates.
          </p>

          {feedback && (
            <div
              className={`text-xs text-center font-bold py-1 px-3 rounded-lg transition-all ${
                feedback.includes("Duplicate")
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {feedback}
            </div>
          )}
        </div>

        {/* ─── 4x4 Grid Board ────────────────────────────────────────── */}
        <div className="my-auto py-2">
          <div className="w-full max-w-[340px] aspect-square mx-auto bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-md grid grid-cols-4 gap-2">
            {board.map((cellValue, idx) => {
              const isClue = clueIndices.has(idx)
              const isSelected = selectedCell === idx
              const sym = cellValue !== null ? PUZZLE_SYMBOLS[cellValue] : null

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCellClick(idx)}
                  className={`relative rounded-xl flex items-center justify-center text-2xl transition-all ${
                    isSelected
                      ? "bg-sky-100 border-2 border-sky-500 shadow-sm scale-105"
                      : isClue
                        ? "bg-slate-100 border border-slate-300 cursor-default"
                        : cellValue !== null
                          ? "bg-white border border-slate-200 shadow-xs hover:border-slate-400"
                          : "bg-slate-50 border border-dashed border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {sym ? (
                    sym.icon
                  ) : isSelected ? (
                    <span className="text-sky-400 text-sm font-bold">+</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── Symbol Palette Tray ───────────────────────────────────── */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block text-center">
            Tap to place symbol in selected cell
          </span>

          <div className="grid grid-cols-5 gap-2">
            {PUZZLE_SYMBOLS.map((sym) => (
              <button
                key={sym.id}
                type="button"
                onClick={() => handlePlaceSymbol(sym.id)}
                className={`py-3 rounded-xl border-2 flex items-center justify-center text-2xl shadow-xs hover:scale-105 active:scale-95 transition-all ${sym.bgLight} ${sym.color}`}
              >
                {sym.icon}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClearCell}
              className="py-3 rounded-xl border-2 border-slate-300 bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ─── Victory Celebration Modal ───────────────────────────────── */}
      {isWon && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-sm">
              🎉
            </div>

            <div>
              <h3
                style={{ fontFamily }}
                className="text-xl font-bold text-slate-900"
              >
                Level {level} Solved!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Outstanding logical deduction!
              </p>
            </div>

            <div className="flex justify-center gap-1.5 py-1">
              {[0, 1, 2].map((i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${
                    i < (lives === 3 ? 3 : lives === 2 ? 2 : 1)
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Score:</span>
                <span className="font-bold text-slate-900">{score} pts</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Time Taken:</span>
                <span className="font-bold text-slate-900">
                  {elapsedSeconds}s
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Remaining Lives:</span>
                <span className="font-bold text-emerald-600">{lives} / 3</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => startLevel(level)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => setLevel((l) => l + 1)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
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

      {/* ─── Game Over Modal ─────────────────────────────────────────── */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl shadow-sm">
              💔
            </div>

            <div>
              <h3
                style={{ fontFamily }}
                className="text-lg font-bold text-rose-600"
              >
                Out of Lives
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Take your time to inspect the rows and columns, then try again.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Exit
              </button>
              <button
                type="button"
                onClick={() => startLevel(level)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Retry Level
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
