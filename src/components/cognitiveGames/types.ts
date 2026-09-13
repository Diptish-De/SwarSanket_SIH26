// ─── SwarSanket Cognitive Games Data Contracts (Separate from Clinical Screening) ───

export type CognitiveGameId = "logic_puzzle" | "memory_treasure" | "selective_attention" | "speed_visualisation"

export interface GameSession {
  id: string
  gameId: CognitiveGameId
  startedAt: string
  completedAt?: string
  score: number
  level: number
  durationSeconds: number
  moves?: number
  mistakes?: number
  streak?: number
  stars: number
}

export interface GameProgress {
  gameId: CognitiveGameId
  bestScore: number
  highestLevel: number
  bestTimeSeconds: number
  bestStreak: number
  gamesPlayed: number
  lastPlayed?: string
}

export interface GameMetadata {
  id: CognitiveGameId
  title: string
  subtitle: string
  icon: string
  tag: string
  accentColor: string
  bgLight: string
  description: string
}

export const COGNITIVE_GAMES_META: GameMetadata[] = [
  {
    id: "logic_puzzle",
    title: "Logic Puzzle",
    subtitle: "4x4 symbol deduction challenge",
    icon: "🧩",
    tag: "Deduction",
    accentColor: "#16A34A",
    bgLight: "bg-emerald-50 border-emerald-200 text-emerald-800",
    description:
      "Fill rows & columns with unique symbols using deductive logic.",
  },
  {
    id: "memory_treasure",
    title: "Memory Treasure",
    subtitle: "Find hidden matching pairs",
    icon: "🃏",
    tag: "Working Memory",
    accentColor: "#0284C7",
    bgLight: "bg-sky-50 border-sky-200 text-sky-800",
    description: "Flip and match 8 pairs of hidden treasure artifacts.",
  },
  {
    id: "selective_attention",
    title: "Selective Attention",
    subtitle: "Spot target symbols among distractors",
    icon: "🎯",
    tag: "Focus",
    accentColor: "#D97706",
    bgLight: "bg-amber-50 border-amber-200 text-amber-800",
    description:
      "Identify target items rapidly while ignoring visual distractors.",
  },
  {
    id: "speed_visualisation",
    title: "Speed Visualisation",
    subtitle: "Rapid visual pattern matching",
    icon: "⚡",
    tag: "Reaction Speed",
    accentColor: "#9333EA",
    bgLight: "bg-purple-50 border-purple-200 text-purple-800",
    description: "Match complex sequences against the reference clock.",
  },
]
