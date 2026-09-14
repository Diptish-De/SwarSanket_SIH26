// ─── Daily check-in trend maths ──────────────────────────────────────────────

//

// The trend is the whole feature: a single day's detail count means nothing, so

// everything depends on reading recent days against the same person's earlier

// ones. These checks pin that behaviour, including the two ways it could do

// harm: calling a normal fluctuation "below", or hiding a real decline.

//

// Pure functions only, no IndexedDB. Run with:

//   node_modules/.bin/vite build --config vite.test.config.ts && node dist-test/tests.js

// or from the scratchpad harness that does both in one step.

import {
  BASELINE_MIN_CHECKINS,
  buildOrientationQuestions,
  computeStreak,
  computeTrend,
  informantItemForDate,
  localDateKey,
  type DailyCheckIn,
} from "./dailyCheckIn"

let passed = 0

const failures: string[] = []

function check(cond: boolean, msg: string) {
  if (cond) {
    passed++

    console.log(`  [PASS] ${msg}`)
  } else {
    failures.push(msg)

    console.log(`  [FAIL] ${msg}`)
  }
}

// Named rather than inline: the formatter strips the separator out of a

// single-line type literal, which turns it into a syntax error on save.

interface DayOptions {
  orientation?: number

  status?: DailyCheckIn["recall"]["status"]
}

/** A check-in on `date` whose recall scored `internal` episodic details. */

function day(
  date: string,

  internal: number | null,

  opts: DayOptions = {},
): DailyCheckIn {
  const status = opts.status ?? (internal === null ? "failed" : "completed")

  return {
    id: date,

    memberId: null,

    createdAt: `${date}T09:00:00.000Z`,

    orientation: {
      answers: [],

      score: opts.orientation ?? 2,

      total: 2,
    },

    recall:
      status === "completed"
        ? {
            status,

            internalDetails: internal ?? 0,

            externalDetails: 4,

            wordCount: 90,
          }
        : { status },
  }
}

function run() {
  console.log("=".repeat(72))

  console.log("Daily check-in trend maths")

  console.log("=".repeat(72))

  // ── baseline ─────────────────────────────────────────────────────────────

  console.log("\n[baseline]")

  const four = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"].map(
    (d, i) => day(d, 20 + i),
  )

  let t = computeTrend(four, "2026-09-04")

  check(t.status === "building", "under five scored days nothing is claimed")

  check(
    t.needed === BASELINE_MIN_CHECKINS - 4,

    `it says how many days are still needed (${t.needed})`,
  )

  check(
    t.baselineMedian === null && t.lowerBound === null,

    "no baseline is reported while still building",
  )

  // ── steady person stays typical ──────────────────────────────────────────

  console.log("\n[steady]")

  const steady = [
    day("2026-09-01", 22),

    day("2026-09-02", 19),

    day("2026-09-03", 24),

    day("2026-09-04", 21),

    day("2026-09-05", 23),

    day("2026-09-06", 20),

    day("2026-09-07", 25),

    day("2026-09-08", 22),
  ]

  t = computeTrend(steady, "2026-09-08")

  console.log(
    `  baseline=${t.baselineMedian} lower=${t.lowerBound} recent=${t.recentMedian}`,
  )

  check(t.status === "typical", "ordinary day-to-day variation is not flagged")

  check(t.series.length === 8, "every scored day is on the line")

  // One bad day inside an otherwise steady run must not trip it: people sleep

  // badly, and a false alarm about dementia is a real harm.

  const oneBadDay = [...steady.slice(0, 7), day("2026-09-08", 9)]

  t = computeTrend(oneBadDay, "2026-09-08")

  console.log(
    `  after one bad day: recent=${t.recentMedian} status=${t.status}`,
  )

  check(
    t.status === "typical",

    "a single poor day inside a steady run does not flag",
  )

  // ── genuine decline is caught ────────────────────────────────────────────

  console.log("\n[decline]")

  const declining = [
    day("2026-09-01", 24),

    day("2026-09-02", 22),

    day("2026-09-03", 25),

    day("2026-09-04", 23),

    day("2026-09-05", 24),

    day("2026-09-06", 14),

    day("2026-09-07", 12),

    day("2026-09-08", 11),
  ]

  t = computeTrend(declining, "2026-09-08")

  console.log(
    `  baseline=${t.baselineMedian} lower=${t.lowerBound} recent=${t.recentMedian}`,
  )

  check(
    t.status === "below",

    "a sustained drop is reported as below the usual range",
  )

  check(
    t.baselineMedian !== null && t.recentMedian! < t.baselineMedian,

    "the two numbers shown to the user are baseline and recent",
  )

  // ── degenerate spread ────────────────────────────────────────────────────

  console.log("\n[identical baseline]")

  const identical = [
    day("2026-09-01", 20),

    day("2026-09-02", 20),

    day("2026-09-03", 20),

    day("2026-09-04", 20),

    day("2026-09-05", 20),

    day("2026-09-06", 19),

    day("2026-09-07", 18),

    day("2026-09-08", 19),
  ]

  t = computeTrend(identical, "2026-09-08")

  console.log(
    `  lower=${t.lowerBound} recent=${t.recentMedian} status=${t.status}`,
  )

  check(
    t.status === "typical",

    "an identical baseline does not collapse the band and flag a one-point dip",
  )

  check(
    t.lowerBound !== null && t.lowerBound < 20,

    "the spread floor keeps the lower edge below the baseline",
  )

  // ── streak ───────────────────────────────────────────────────────────────

  console.log("\n[streak]")

  check(
    computeStreak(
      [day("2026-09-06", 20), day("2026-09-07", 20), day("2026-09-08", 20)],

      "2026-09-08",
    ) === 3,

    "three consecutive days counts as three",
  )

  check(
    computeStreak(
      [day("2026-09-06", 20), day("2026-09-07", 20)],

      "2026-09-08",
    ) === 2,

    "a run ending yesterday is still alive before today's check-in",
  )

  check(
    computeStreak(
      [day("2026-09-04", 20), day("2026-09-05", 20)],

      "2026-09-08",
    ) === 0,

    "a gap of two days breaks the run",
  )

  check(
    computeStreak(
      [day("2026-09-07", 20), day("2026-09-08", null)],

      "2026-09-08",
    ) === 2,

    "a day whose scoring failed still counts: the person did their part",
  )

  check(
    computeStreak(
      [day("2026-09-07", 20), day("2026-09-08", null, { status: "skipped" })],

      "2026-09-08",
    ) === 1,

    "a skipped day does not count",
  )

  // A failed day must not appear on the line as a zero.

  t = computeTrend([...steady, day("2026-09-09", null)], "2026-09-09")

  check(
    t.series.every((p) => p.value > 0) && t.series.length === 8,

    "an unscored day is left off the trend line rather than plotted as zero",
  )

  // ── orientation ──────────────────────────────────────────────────────────

  console.log("\n[orientation]")

  const qs = buildOrientationQuestions(new Date(2026, 8, 14)) // 14 Sep 2026, a Monday

  check(qs.length === 2, "two orientation questions are asked")

  check(
    qs[0].expected === "Monday",

    `the weekday comes from the clock (${qs[0].expected})`,
  )

  check(
    qs[1].expected === "September",

    `the month comes from the clock (${qs[1].expected})`,
  )

  check(
    qs.every((q) => q.options.length === 4 && q.options.includes(q.expected)),

    "each question offers four options including the right one",
  )

  check(
    qs.every((q) => new Set(q.options).size === 4),

    "no option is repeated",
  )

  const again = buildOrientationQuestions(new Date(2026, 8, 14))

  check(
    JSON.stringify(again[0].options) === JSON.stringify(qs[0].options),

    "options are stable within a day, so backing out does not reshuffle them",
  )

  const tomorrow = buildOrientationQuestions(new Date(2026, 8, 15))

  check(
    JSON.stringify(tomorrow[0].options) !== JSON.stringify(qs[0].options) ||
      tomorrow[0].expected !== qs[0].expected,

    "a different day gives a different question",
  )

  t = computeTrend(
    [
      day("2026-09-07", 20, { orientation: 2 }),

      day("2026-09-08", 20, { orientation: 1 }),
    ],

    "2026-09-08",
  )

  check(
    t.orientationRecent.correct === 3 && t.orientationRecent.total === 4,

    `orientation is tallied over recent days (${t.orientationRecent.correct}/${t.orientationRecent.total})`,
  )

  // ── informant rotation ───────────────────────────────────────────────────

  console.log("\n[informant]")

  const week = [
    "2026-09-14",

    "2026-09-15",

    "2026-09-16",

    "2026-09-17",

    "2026-09-18",

    "2026-09-19",

    "2026-09-20",
  ].map((d) => informantItemForDate(d).id)

  check(
    new Set(week).size === 7,

    "seven consecutive days ask seven different questions",
  )

  check(
    informantItemForDate("2026-09-14").id ===
      informantItemForDate("2026-09-21").id,

    "the rotation repeats after a week",
  )

  // ── date key ─────────────────────────────────────────────────────────────

  console.log("\n[date key]")

  check(
    localDateKey(new Date(2026, 0, 5)) === "2026-01-05",

    "the date key is zero padded",
  )

  // Late evening in a positive-offset timezone is the next day in UTC. The key

  // must follow the person's calendar, not UTC, or a check-in lands on the

  // wrong day and breaks the streak.

  const lateEvening = new Date(2026, 8, 14, 23, 30)

  check(
    localDateKey(lateEvening) === "2026-09-14",

    "a late-evening check-in stays on the local calendar day",
  )

  console.log(
    `\n${
      failures.length === 0
        ? `ALL ${passed} TREND CHECKS PASSED.`
        : `${failures.length} FAILED:\n  - ${failures.join("\n  - ")}`
    }`,
  )

  return failures.length
}

const failed = run()

// Surfaced for the harness; browsers never load this file.
;(globalThis as unknown as {
  __checkInTestFailures?: number
}).__checkInTestFailures = failed
