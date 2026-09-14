import React, { useCallback, useEffect, useRef, useState } from "react"

import {
  ChevronLeft,
  Mic,
  Square,
  Check,
  CalendarClock,
  MessageSquareQuote,
  Loader2,
  AlertCircle,
  Flame,
  ArrowRight,
} from "lucide-react"

import {
  VoiceRecorder,
  type AudioRecordingResult,
} from "../../services/audioRecorder"

import {
  submitScreeningJob,
  followScreeningJob,
  type TaskJobResponse,
} from "../../services/screeningJob"

import {
  INFORMANT_SOURCE_NOTE,
  buildOrientationQuestions,
  computeTrend,
  getTodayCheckIn,
  informantItemForDate,
  listCheckIns,
  localDateKey,
  saveCheckIn,
  type DailyCheckIn,
  type DailyTrend,
  type SeriesPoint,
  type OrientationAnswer,
  type OrientationQuestion,
} from "../../services/dailyCheckIn"

/** Long enough to describe a morning; short enough that nobody quits on day 8. */

const MIN_RECORD_SECONDS = 15

const MAX_RECORD_SECONDS = 60

type Step = "orientation" | "record" | "informant" | "done"

interface AloisDailyCheckInProps {
  patientName?: string

  memberId?: string | null

  /** True when a family member, not the patient, is holding the device. */

  assistedMode?: boolean

  onBack?: () => void

  fontFamily?: string
}

/**
 * The daily check-in.
 *
 * Replaces the household-chore list that used to sit in Secondary Care. Chores
 * are a caregiving feature; this app exists for early detection, and the
 * earliest thing to change in Alzheimer's disease is memory for recent personal
 * events. So the daily slot asks about the person's actual day.
 *
 * Roughly a minute: two orientation taps, a 40-second answer, and one optional
 * question for a family member. Everything is read against the same person's
 * own earlier check-ins, never a population cut-off.
 */

export default function AloisDailyCheckIn({
  patientName,

  memberId = null,

  assistedMode = false,

  onBack,

  fontFamily = "'Outfit', sans-serif",
}: AloisDailyCheckInProps) {
  const todayKey = localDateKey()

  const [step, setStep] = useState<Step>("orientation")

  const [questions] = useState<OrientationQuestion[]>(() =>
    buildOrientationQuestions(),
  )

  const [questionIdx, setQuestionIdx] = useState(0)

  const [orientationAnswers, setOrientationAnswers] =
    useState<OrientationAnswer[]>([])

  const [isRecording, setIsRecording] = useState(false)

  const [elapsed, setElapsed] = useState(0)

  const [micLevel, setMicLevel] = useState(0)

  const [recordError, setRecordError] = useState<string | null>(null)

  const [scoring, setScoring] = useState(false)

  const [entry, setEntry] = useState<DailyCheckIn | null>(null)

  const [trend, setTrend] = useState<DailyTrend | null>(null)

  const [alreadyDone, setAlreadyDone] = useState(false)

  const recorderRef = useRef<VoiceRecorder | null>(null)

  const recorder = () => {
    if (!recorderRef.current) recorderRef.current = new VoiceRecorder()

    return recorderRef.current
  }

  const mountedRef = useRef(true)

  const stoppingRef = useRef(false)

  const informantItem = informantItemForDate(todayKey)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false

      // Leaving mid-recording must not leave the microphone open. stop() also

      // tears down the audio graph and the media stream.

      recorderRef.current?.stop().catch(() => undefined)
    }
  }, [])

  // Already checked in today: show the summary instead of asking again. The

  // record is keyed by date, so a second run would overwrite it anyway.

  useEffect(() => {
    let cancelled = false

    Promise.all([getTodayCheckIn(), listCheckIns()])

      .then(([today, all]) => {
        if (cancelled) return

        setTrend(computeTrend(all, todayKey))

        if (today && today.recall.status !== "skipped") {
          setEntry(today)

          setAlreadyDone(true)

          setStep("done")
        }
      })

      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [todayKey])

  // Recording clock. Stops itself at the cap so the clock, not the person,

  // decides when a timed task is over.

  useEffect(() => {
    if (!isRecording) return

    const id = setInterval(() => setElapsed((s) => s + 1), 1000)

    return () => clearInterval(id)
  }, [isRecording])

  const persist = useCallback(
    async (next: DailyCheckIn) => {
      await saveCheckIn(next)

      const all = await listCheckIns()

      if (!mountedRef.current) return

      setEntry(next)

      setTrend(computeTrend(all, todayKey))
    },

    [todayKey],
  )

  const handleOrientationPick = (option: string) => {
    const q = questions[questionIdx]

    const answer: OrientationAnswer = {
      question: q.id,

      answered: option,

      expected: q.expected,

      isCorrect: option === q.expected,
    }

    const next = [...orientationAnswers, answer]

    setOrientationAnswers(next)

    if (questionIdx + 1 < questions.length) {
      setQuestionIdx(questionIdx + 1)
    } else {
      setStep("record")
    }
  }

  const finishRecording = useCallback(async () => {
    // The auto-stop effect and the button can both fire within the same tick;

    // a second stop() on an inactive recorder throws.

    if (stoppingRef.current) return

    stoppingRef.current = true

    setIsRecording(false)

    let result: AudioRecordingResult

    try {
      result = await recorder().stop()
    } catch (err) {
      setRecordError(
        err instanceof Error
          ? err.message
          : "The recording could not be saved.",
      )

      stoppingRef.current = false

      return
    }

    const base: DailyCheckIn = {
      id: todayKey,

      memberId,

      createdAt: new Date().toISOString(),

      orientation: {
        answers: orientationAnswers,

        score: orientationAnswers.filter((a) => a.isCorrect).length,

        total: orientationAnswers.length,
      },

      recall: {
        status: "pending",

        durationSeconds: result.durationSeconds,
      },
    }

    // Saved before the job is submitted, so the day is recorded even if the

    // network, the server or the app dies in the next second.

    await persist(base)

    setScoring(true)

    setStep(assistedMode ? "informant" : "done")

    try {
      // No language is sent: the backend uses the language Whisper detected.

      // Forcing the app's UI language would score, say, Hindi speech against

      // English lexicons instead of returning it unscored.

      const handle = await submitScreeningJob(result.blob, "daily.webm", {
        task: "daily",
      })

      const res = await followScreeningJob<TaskJobResponse>(handle)

      const b = res.battery

      const d = (b?.details ?? {}) as Record<string, unknown>

      await persist({
        ...base,

        recall: {
          status: "completed",

          recordingId: handle.recordingId,

          durationSeconds: result.durationSeconds,

          transcript: res.transcript,

          internalDetails: b?.scored ? d.internal_details as number : undefined,

          externalDetails: b?.scored ? d.external_details as number : undefined,

          specificity: b?.scored ? d.specificity as number : undefined,

          breakdown: b?.scored
            ? d.breakdown as DailyCheckIn["recall"]["breakdown"]
            : undefined,

          wordCount: d.word_count as number | undefined,

          unscoredReason: b?.scored ? undefined : b?.note,
        },
      })
    } catch (err) {
      // The person did their part. The day still counts; only the score is

      // missing, and it says so rather than showing a zero.

      await persist({
        ...base,

        recall: {
          status: "failed",

          durationSeconds: result.durationSeconds,

          error:
            err instanceof Error
              ? err.message
              : "The score could not be calculated.",
        },
      })
    } finally {
      if (mountedRef.current) setScoring(false)
    }
  }, [assistedMode, memberId, orientationAnswers, persist, todayKey])

  // Auto-stop at the cap.

  useEffect(() => {
    if (isRecording && elapsed >= MAX_RECORD_SECONDS) {
      finishRecording()
    }
  }, [elapsed, isRecording, finishRecording])

  const startRecording = async () => {
    setRecordError(null)

    setElapsed(0)

    stoppingRef.current = false

    try {
      await recorder().start((level) => setMicLevel(level))

      setIsRecording(true)
    } catch (err) {
      setRecordError(
        err instanceof Error
          ? err.message
          : "The microphone could not be started.",
      )
    }
  }

  const answerInformant = async (answer: "yes" | "no") => {
    if (!entry) {
      setStep("done")

      return
    }

    await persist({
      ...entry,

      informant: {
        itemId: informantItem.id,

        question: informantItem.question,

        answer,

        // Only an assisted session can produce an informant report. A patient

        // answering this about themselves is self-report, and is stored as such.

        answeredBy: assistedMode ? "caregiver" : "self",

        at: new Date().toISOString(),
      },
    })

    setStep("done")
  }

  // ─── chrome ───────────────────────────────────────────────────────────────

  const header = (title: string, subtitle?: string) => (
    <header className="h-[72px] px-4 flex items-center gap-3 bg-[#F4F4F4] border-b border-[#E0E0E0] sticky top-0 z-20">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-white border border-[#E0E0E0] text-[#525252] flex items-center justify-center hover:text-[#161616] active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      <div className="min-w-0">
        <h1
          style={{ fontFamily }}
          className="text-[20px] font-bold text-[#161616] tracking-tight leading-tight"
        >
          {title}
        </h1>

        {subtitle && (
          <p className="text-[12px] text-[#525252] leading-tight">{subtitle}</p>
        )}
      </div>
    </header>
  )

  const stepDots = (active: number) => (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === active ? "w-6 bg-[#0F62FE]" : "w-1.5 bg-[#C6C6C6]"
          }`}
        />
      ))}
    </div>
  )

  // ─── step 1: orientation ──────────────────────────────────────────────────

  if (step === "orientation") {
    const q = questions[questionIdx]

    return (
      <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28">
        {header("Daily check-in", "Two quick questions")}

        <div className="px-4 pt-5 space-y-5 max-w-[375px] mx-auto">
          {stepDots(0)}

          <div className="rounded-2xl bg-white border border-[#E0E0E0] p-5 space-y-1 shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0F62FE] flex items-center justify-center mb-2">
              <CalendarClock className="w-5 h-5" />
            </div>

            <h2
              style={{ fontFamily }}
              className="text-[19px] font-semibold text-[#161616] leading-snug"
            >
              {q.prompt}
            </h2>

            <p className="text-[12px] text-[#525252]">
              Question {questionIdx + 1} of {questions.length}
            </p>
          </div>

          <div className="space-y-2">
            {q.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOrientationPick(option)}
                className="w-full rounded-xl bg-white border border-[#E0E0E0] px-4 py-3.5 text-left text-[15px] font-medium text-[#161616] hover:border-[#0F62FE] hover:bg-blue-50/40 active:scale-[0.99] transition-all shadow-2xs"
              >
                {option}
              </button>
            ))}
          </div>

          {/*
            The answer is never shown before it is asked, and no date appears on
            this screen. The device's own status bar may still show one, so this
            is a weaker cue-free test than the same item asked at a bedside.
          */}
          <p className="text-[11px] text-[#8D8D8D] leading-snug px-1">
            Orientation to time, from the MMSE and MoCA. Answers are checked
            against this device's clock.
          </p>
        </div>
      </div>
    )
  }

  // ─── step 2: the day ──────────────────────────────────────────────────────

  if (step === "record") {
    const canStop = elapsed >= MIN_RECORD_SECONDS

    return (
      <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28">
        {header("Tell me about your day")}

        <div className="px-4 pt-5 space-y-5 max-w-[375px] mx-auto">
          {stepDots(1)}

          <div className="rounded-2xl bg-white border border-[#E0E0E0] p-5 shadow-2xs space-y-2">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0F62FE] flex items-center justify-center">
              <MessageSquareQuote className="w-5 h-5" />
            </div>

            <h2
              style={{ fontFamily }}
              className="text-[19px] font-semibold text-[#161616] leading-snug"
            >
              What have you done today?
            </h2>

            <p className="text-[13px] text-[#525252] leading-relaxed">
              Start from when you woke up. Who did you see, where did you go,
              what did you eat? Small things are fine.
            </p>
          </div>

          {recordError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />

              <p className="text-[12px] text-rose-800 leading-snug">
                {recordError}
              </p>
            </div>
          )}

          <div className="flex flex-col items-center gap-4 pt-2">
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <span
                  className="absolute rounded-full bg-rose-500/15"
                  style={{
                    width: `${112 + micLevel * 70}px`,

                    height: `${112 + micLevel * 70}px`,

                    transition: "width 120ms linear, height 120ms linear",
                  }}
                />
              )}

              <button
                type="button"
                onClick={isRecording ? finishRecording : startRecording}
                disabled={isRecording && !canStop}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all ${
                  isRecording
                    ? canStop
                      ? "bg-rose-600"
                      : "bg-rose-400 cursor-not-allowed"
                    : "bg-[#0F62FE] hover:bg-[#0353e9]"
                }`}
              >
                {isRecording ? (
                  <Square className="w-10 h-10 fill-current" />
                ) : (
                  <Mic className="w-11 h-11" />
                )}
              </button>
            </div>

            <div className="text-center space-y-1">
              <p
                style={{ fontFamily }}
                className={`text-[30px] font-bold tabular-nums leading-none ${
                  canStop ? "text-emerald-600" : "text-[#161616]"
                }`}
              >
                0:{String(elapsed).padStart(2, "0")}
              </p>

              <p className="text-[12px] text-[#525252]">
                {!isRecording
                  ? "Tap the microphone to start"
                  : canStop
                    ? `Tap to finish · stops on its own at 0:${MAX_RECORD_SECONDS}`
                    : `Keep going to 0:${MIN_RECORD_SECONDS}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── step 3: the family member ────────────────────────────────────────────

  if (step === "informant") {
    return (
      <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28">
        {header("One question for you", "For the family member")}

        <div className="px-4 pt-5 space-y-5 max-w-[375px] mx-auto">
          {stepDots(2)}

          <div className="rounded-2xl bg-white border border-[#E0E0E0] p-5 shadow-2xs space-y-2">
            <h2
              style={{ fontFamily }}
              className="text-[18px] font-semibold text-[#161616] leading-snug"
            >
              {informantItem.question}
            </h2>

            <p className="text-[12px] text-[#525252]">
              About {patientName || "the person you care for"}, today only.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => answerInformant("yes")}
              className="rounded-xl bg-white border border-[#E0E0E0] py-4 text-[15px] font-semibold text-[#161616] hover:border-[#0F62FE] active:scale-[0.98] transition-all shadow-2xs"
            >
              Yes
            </button>

            <button
              type="button"
              onClick={() => answerInformant("no")}
              className="rounded-xl bg-white border border-[#E0E0E0] py-4 text-[15px] font-semibold text-[#161616] hover:border-[#0F62FE] active:scale-[0.98] transition-all shadow-2xs"
            >
              No
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep("done")}
            className="w-full text-[13px] font-medium text-[#525252] hover:text-[#161616] py-2"
          >
            Skip this
          </button>

          <p className="text-[11px] text-[#8D8D8D] leading-snug px-1">
            {INFORMANT_SOURCE_NOTE}
          </p>
        </div>
      </div>
    )
  }

  // ─── step 4: done ─────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F4F4] text-[#161616] select-none pb-28">
      {header(alreadyDone ? "Today is done" : "Thank you")}

      <div className="px-4 pt-5 space-y-4 max-w-[375px] mx-auto">
        <div className="rounded-2xl bg-white border border-[#E0E0E0] p-5 shadow-2xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Check className="w-7 h-7" />
          </div>

          <div className="min-w-0">
            <h2
              style={{ fontFamily }}
              className="text-[18px] font-semibold text-[#161616] leading-tight"
            >
              Checked in for today
            </h2>

            {trend && trend.streak > 0 && (
              <p className="text-[13px] text-[#525252] flex items-center gap-1.5 mt-0.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                {trend.streak} day{trend.streak === 1 ? "" : "s"} in a row
              </p>
            )}
          </div>
        </div>

        {scoring && (
          <div className="rounded-xl bg-white border border-[#E0E0E0] p-3.5 flex items-center gap-2.5 shadow-2xs">
            <Loader2 className="w-4 h-4 text-[#0F62FE] animate-spin shrink-0" />

            <p className="text-[12px] text-[#525252]">
              Scoring what you told us. You can close this.
            </p>
          </div>
        )}

        <DailyTrendCard trend={trend} entry={entry} fontFamily={fontFamily} />

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl bg-[#0F62FE] hover:bg-[#0353e9] text-white py-3.5 text-[15px] font-semibold active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            style={{ fontFamily }}
          >
            Done
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── trend ──────────────────────────────────────────────────────────────────

/**
 * Everything here is this person against their own earlier check-ins. There is
 * no published cut-off for an automated detail count, so no absolute judgement
 * is available and none is shown.
 */

export function DailyTrendCard({
  trend,

  entry,

  fontFamily = "'Outfit', sans-serif",
}: {
  trend: DailyTrend | null

  entry?: DailyCheckIn | null

  fontFamily?: string
}) {
  if (!trend) return null

  const today = entry?.recall

  return (
    <div className="rounded-2xl bg-white border border-[#E0E0E0] p-4 shadow-2xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8D8D8D]">
            Your own pattern
          </p>

          <p
            style={{ fontFamily }}
            className="text-[16px] font-semibold text-[#161616] leading-tight"
          >
            {trend.status === "building"
              ? `Building your baseline · ${trend.needed} more day${
                  trend.needed === 1 ? "" : "s"
                }`
              : trend.status === "typical"
                ? "Usual amount of detail for you"
                : "Less detail than your usual"}
          </p>
        </div>

        {trend.status !== "building" && (
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              trend.status === "typical"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {trend.recentMedian} vs {trend.baselineMedian}
          </span>
        )}
      </div>

      <Sparkline points={trend.series} lowerBound={trend.lowerBound} />

      {today?.status === "completed" &&
        typeof today.internalDetails === "number" && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: "Details", value: String(today.internalDetails) },

              {
                label: "Specific",

                value:
                  typeof today.specificity === "number"
                    ? `${Math.round(today.specificity * 100)}%`
                    : "—",
              },

              { label: "Words", value: String(today.wordCount ?? "—") },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl bg-[#F4F4F4] px-2 py-2 text-center"
              >
                <p
                  style={{ fontFamily }}
                  className="text-[17px] font-bold text-[#161616] leading-none tabular-nums"
                >
                  {m.value}
                </p>

                <p className="text-[10px] text-[#8D8D8D] mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        )}

      {today?.status === "completed" && today.unscoredReason && (
        <p className="text-[11px] text-[#8D8D8D] leading-snug">
          {today.unscoredReason}
        </p>
      )}

      {today?.status === "failed" && (
        <p className="text-[11px] text-amber-700 leading-snug">
          Today counted, but the score could not be calculated. It will not
          appear on the line above.
        </p>
      )}

      {trend.orientationRecent.total > 0 && (
        <p className="text-[11px] text-[#525252]">
          Day and month: {trend.orientationRecent.correct} of{" "}
          {trend.orientationRecent.total} correct over the last week.
        </p>
      )}

      <p className="text-[10px] text-[#8D8D8D] leading-snug">
        Compared only with your own earlier check-ins, never with other people.
        Sleep, mood and how much happened that day all move these numbers. Not a
        diagnosis.
      </p>
    </div>
  )
}

/** Detail count per day, oldest to newest, with the person's own lower edge. */

function Sparkline({
  points,

  lowerBound,
}: {
  points: SeriesPoint[]

  lowerBound: number | null
}) {
  if (points.length < 2) {
    return (
      <div className="h-[56px] rounded-xl bg-[#F4F4F4] flex items-center justify-center">
        <p className="text-[11px] text-[#8D8D8D]">
          {points.length === 0
            ? "No scored days yet"
            : "One day so far — the line starts at two"}
        </p>
      </div>
    )
  }

  const shown = points.slice(-14)

  const values = shown.map((p) => p.value)

  const max = Math.max(...values, lowerBound ?? 0) || 1

  const min = Math.min(...values, lowerBound ?? Infinity, 0)

  const w = 300

  const h = 56

  const pad = 4

  const x = (i: number) =>
    pad + (i * (w - pad * 2)) / Math.max(1, shown.length - 1)

  const y = (v: number) =>
    h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2)

  const path = shown

    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`)

    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-[56px]"
      role="img"
      aria-label="Episodic detail count per day"
      preserveAspectRatio="none"
    >
      {lowerBound !== null && lowerBound > min && (
        <line
          x1={pad}
          x2={w - pad}
          y1={y(lowerBound)}
          y2={y(lowerBound)}
          stroke="#F1C21B"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      <path d={path} fill="none" stroke="#0F62FE" strokeWidth={2} />

      {shown.map((p, i) => (
        <circle
          key={p.date}
          cx={x(i)}
          cy={y(p.value)}
          r={i === shown.length - 1 ? 3.5 : 2}
          fill={i === shown.length - 1 ? "#0F62FE" : "#A6C8FF"}
        />
      ))}
    </svg>
  )
}
