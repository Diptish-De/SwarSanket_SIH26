// ─── Daily check-in: storage, orientation items and within-person trend ──────
//
// A once-a-day, roughly one-minute check that replaces the household-chore list
// in Secondary Care. Chores are a caregiving feature; this app is for early
// detection, and the earliest thing to go in Alzheimer's disease is memory for
// recent personal events. Asking for that every day is the only practical way
// to watch it change.
//
// Three parts, in this order:
//   1. Orientation  - what day of the week, which month (MMSE/MoCA time items).
//   2. Daily recall - "tell me about your day", scored by the backend for
//                     episodic detail (backend/daily_recall.py).
//   3. Informant    - one question for a family member, adapted from the AD8.
//
// The whole point is the trend. A single day says nothing: sleep, mood and how
// much actually happened all move these numbers. Everything below is therefore
// computed against the same person's own earlier check-ins, never against a
// population cut-off.

import { getDB } from "./db"

// Matches BASELINE_MIN_CHECKINS in backend/daily_recall.py. Fewer than this and
// no trend is shown at all, only "building your baseline".
export const BASELINE_MIN_CHECKINS = 5

/** How many recent days the current reading is averaged over. */
export const RECENT_WINDOW = 3

export type OrientationQuestionId = "dayOfWeek" | "month"

export interface OrientationAnswer {
  question: OrientationQuestionId

  /** What the person picked. */
  answered: string

  /** What the device clock says. */
  expected: string

  isCorrect: boolean
}

/**
 * One AD8-derived observation from a family member.
 *
 * The AD8 (Galvin et al. 2005, Neurology) is an eight-item informant interview
 * about change over the past several years, scored in one sitting; two or more
 * "yes" answers suggest impairment. This asks one item a day about today, which
 * is neither its administration nor its scoring. These answers are observations
 * for a clinician to read. They are never summed into an AD8 score.
 */
export interface InformantAnswer {
  itemId: string

  question: string

  answer: "yes" | "no"

  /**
   * Who actually tapped it. A patient answering an informant question is not an
   * informant report, so the two are never mixed.
   */
  answeredBy: "caregiver" | "self"

  at: string
}

export interface DailyRecallResult {
  status: "pending" | "completed" | "failed" | "skipped"

  recordingId?: string

  durationSeconds?: number

  transcript?: string

  /** Episodic ("internal") detail count. The headline measurement. */
  internalDetails?: number

  /** Generic, habitual or repeated content ("external"). */
  externalDetails?: number

  /** internal / (internal + external). */
  specificity?: number

  breakdown?: {
    events: number
    time: number
    place: number
    people: number
    perceptual: number
  }

  wordCount?: number

  /** Present when the backend transcribed but could not score, with the reason. */
  unscoredReason?: string

  error?: string
}

export interface DailyCheckIn {
  /** Local calendar date, YYYY-MM-DD. One check-in per day, so this is the key. */
  id: string

  /** Household member, when the app knows who is using it. */
  memberId: string | null

  createdAt: string

  orientation: {
    answers: OrientationAnswer[]
    score: number
    total: number
  }

  recall: DailyRecallResult

  informant?: InformantAnswer
}

// ─── date helpers ────────────────────────────────────────────────────────────

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** YYYY-MM-DD in the device's own timezone, not UTC. */
export function localDateKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number)

  const dt = new Date(y, m - 1, d)

  dt.setDate(dt.getDate() + delta)

  return localDateKey(dt)
}

// ─── orientation items ───────────────────────────────────────────────────────

export interface OrientationQuestion {
  id: OrientationQuestionId

  prompt: string

  options: string[]

  expected: string
}

/**
 * Deterministic shuffle seeded on the date, so the options do not jump around
 * if the person backs out and returns, but do differ from day to day.
 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261

  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)

    h = Math.imul(h, 16777619)
  }

  const out = items.slice()

  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507)

    const j = Math.abs(h) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }

  return out
}

/**
 * Orientation to time, the two items from the MMSE (Folstein et al. 1975) and
 * MoCA (Nasreddine et al. 2005) that need no paper: day of the week and month.
 * Temporal disorientation is an early and specific change.
 *
 * The screen that asks these must not display the date. Showing a person the
 * answer and then asking for it measures nothing.
 */
export function buildOrientationQuestions(
  now: Date = new Date(),
): OrientationQuestion[] {
  const todayKey = localDateKey(now)

  const correctDay = WEEKDAYS[now.getDay()]

  const correctMonth = MONTHS[now.getMonth()]

  // Distractors are the neighbouring days and months: a near miss is the
  // informative answer, and picking from far-apart options is too easy.
  const dayOptions = [
    WEEKDAYS[(now.getDay() + 6) % 7],
    correctDay,
    WEEKDAYS[(now.getDay() + 1) % 7],
    WEEKDAYS[(now.getDay() + 3) % 7],
  ]

  const monthOptions = [
    MONTHS[(now.getMonth() + 11) % 12],
    correctMonth,
    MONTHS[(now.getMonth() + 1) % 12],
    MONTHS[(now.getMonth() + 2) % 12],
  ]

  return [
    {
      id: "dayOfWeek",
      prompt: "What day of the week is it today?",
      options: seededShuffle(dayOptions, `${todayKey}-day`),
      expected: correctDay,
    },

    {
      id: "month",
      prompt: "Which month are we in?",
      options: seededShuffle(monthOptions, `${todayKey}-month`),
      expected: correctMonth,
    },
  ]
}

// ─── informant items ─────────────────────────────────────────────────────────

interface InformantItem {
  id: string
  question: string
}

/**
 * Adapted from the AD8 informant interview (Galvin et al. 2005). Reworded to ask
 * about today, because a daily check-in cannot ask about "the past several
 * years" every morning. One item is asked per day, rotating, so the family
 * member is never faced with a questionnaire.
 */
const INFORMANT_ITEMS: InformantItem[] = [
  {
    id: "ad8_repeat",
    question: "Did they repeat the same question or story today?",
  },
  {
    id: "ad8_misplace",
    question: "Did they misplace something and struggle to find it today?",
  },
  {
    id: "ad8_appointment",
    question: "Did they forget an appointment, a plan or a medicine today?",
  },
  {
    id: "ad8_device",
    question:
      "Did they have trouble using something familiar today, like the phone or the TV remote?",
  },
  {
    id: "ad8_interest",
    question: "Did they lose interest in something they normally enjoy today?",
  },
  {
    id: "ad8_judgment",
    question: "Did they make a decision today that seemed unlike them?",
  },
  {
    id: "ad8_date",
    question: "Did they seem unsure of the day or the date today?",
  },
]

/** Rotates by day so the same item is not asked twice in a week. */
export function informantItemForDate(
  dateKey: string = localDateKey(),
): InformantItem {
  const [y, m, d] = dateKey.split("-").map(Number)

  const days = Math.floor(Date.UTC(y, m - 1, d) / 86400000)

  return INFORMANT_ITEMS[days % INFORMANT_ITEMS.length]
}

export const INFORMANT_SOURCE_NOTE =
  "Adapted from the AD8 informant interview (Galvin et al. 2005). One item is asked per day about today, which is not how the AD8 is administered or scored, so these are observations for a clinician to read and never an AD8 score."

// ─── storage ─────────────────────────────────────────────────────────────────

export async function saveCheckIn(entry: DailyCheckIn): Promise<void> {
  const db = await getDB()

  await db.put("daily_checkins", entry)
}

export async function getCheckIn(
  id: string,
): Promise<DailyCheckIn | undefined> {
  const db = await getDB()

  return db.get("daily_checkins", id)
}

export async function getTodayCheckIn(): Promise<DailyCheckIn | undefined> {
  return getCheckIn(localDateKey())
}

/** Every check-in, oldest first. */
export async function listCheckIns(): Promise<DailyCheckIn[]> {
  const db = await getDB()

  const all = await db.getAll("daily_checkins")

  return all.sort((a, b) => a.id.localeCompare(b.id))
}

export async function deleteCheckIn(id: string): Promise<void> {
  const db = await getDB()

  await db.delete("daily_checkins", id)
}

// ─── trend ───────────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0

  const s = values.slice().sort((a, b) => a - b)

  const mid = Math.floor(s.length / 2)

  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

/** Median absolute deviation: a spread estimate one bad day cannot dominate. */
function mad(values: number[], centre: number): number {
  if (values.length === 0) return 0

  return median(values.map((v) => Math.abs(v - centre)))
}

/** Orientation items answered correctly out of those asked. */
export interface OrientationTally {
  correct: number

  total: number
}

/** One scored day on the trend line. */
export interface SeriesPoint {
  date: string

  value: number
}

/**
 * Where recent check-ins sit against this person's own baseline.
 *
 *   building  fewer than BASELINE_MIN_CHECKINS scored days; nothing is claimed
 *   typical   recent days sit inside this person's own usual range
 *   below     recent days sit under it
 *
 * There is no "good" or "bad" here, and no comparison with anyone else.
 */

export type TrendStatus = "building" | "typical" | "below"

export interface DailyTrend {
  status: TrendStatus

  /** Completed, scored check-ins used for the baseline. */
  baselineCount: number

  /** Days still needed before a trend is shown. */
  needed: number

  baselineMedian: number | null

  recentMedian: number | null

  /** The lower edge of this person's usual range. */
  lowerBound: number | null

  /** Internal-detail counts, oldest first, for the sparkline. */
  series: SeriesPoint[]

  /** Consecutive days ending today (or yesterday) with a completed check-in. */
  streak: number

  /** Orientation items answered correctly over the last 7 check-ins. */
  orientationRecent: OrientationTally
}

function scoredValue(c: DailyCheckIn): number | null {
  if (c.recall.status !== "completed") return null

  return typeof c.recall.internalDetails === "number"
    ? c.recall.internalDetails
    : null
}

/**
 * Streak of consecutive days on which the person actually spoke. Counts back
 * from today, so having already done today, or not yet today but yesterday,
 * both keep an unbroken run alive.
 *
 * A day whose scoring failed still counts: they did their part, and a server
 * outage is not theirs to pay for. A skipped day does not.
 */
export function computeStreak(
  checkIns: DailyCheckIn[],
  today: string = localDateKey(),
): number {
  const done = new Set(
    checkIns
      .filter(
        (c) => c.recall.status === "completed" || c.recall.status === "failed",
      )
      .map((c) => c.id),
  )

  let cursor = done.has(today) ? today : addDays(today, -1)

  let streak = 0

  while (done.has(cursor)) {
    streak++

    cursor = addDays(cursor, -1)
  }

  return streak
}

/**
 * Reads recent check-ins against the person's own earlier ones.
 *
 * The baseline is the median of the first BASELINE_MIN_CHECKINS scored days and
 * its median absolute deviation. "Below" means the median of the last few days
 * sits more than 1.5 spreads under that baseline: a standard robust outlier
 * rule rather than an invented percentage.
 *
 * The spread is floored at 15 % of the baseline median. Without that floor, a
 * person whose first five days happened to be identical would have a spread of
 * zero and would be called "below" for a difference of one detail.
 */
export function computeTrend(
  checkIns: DailyCheckIn[],
  today: string = localDateKey(),
): DailyTrend {
  const sorted = checkIns.slice().sort((a, b) => a.id.localeCompare(b.id))

  const series = sorted
    .map((c) => ({ date: c.id, value: scoredValue(c) }))
    .filter((p): p is SeriesPoint => p.value !== null)

  const streak = computeStreak(sorted, today)

  const lastSeven = sorted.slice(-7)

  const orientationRecent = lastSeven.reduce(
    (acc, c) => ({
      correct: acc.correct + c.orientation.score,
      total: acc.total + c.orientation.total,
    }),
    { correct: 0, total: 0 },
  )

  if (series.length < BASELINE_MIN_CHECKINS) {
    return {
      status: "building",
      baselineCount: series.length,
      needed: BASELINE_MIN_CHECKINS - series.length,
      baselineMedian: null,
      recentMedian: null,
      lowerBound: null,
      series,
      streak,
      orientationRecent,
    }
  }

  const baselineValues = series
    .slice(0, BASELINE_MIN_CHECKINS)
    .map((p) => p.value)

  const baselineMedian = median(baselineValues)

  const spread = Math.max(
    mad(baselineValues, baselineMedian),
    0.15 * baselineMedian,
  )

  const lowerBound = baselineMedian - 1.5 * spread

  const recentValues = series.slice(-RECENT_WINDOW).map((p) => p.value)

  const recentMedian = median(recentValues)

  return {
    status: recentMedian < lowerBound ? "below" : "typical",
    baselineCount: series.length,
    needed: 0,
    baselineMedian,
    recentMedian,
    lowerBound: Math.round(lowerBound * 10) / 10,
    series,
    streak,
    orientationRecent,
  }
}
