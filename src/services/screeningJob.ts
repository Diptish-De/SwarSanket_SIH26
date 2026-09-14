// ─── Asynchronous screening job client ───────────────────────────────────────

//

// A screening is a job, not a request. The phone uploads the clip once

// (POST /api/screenings, a few seconds), gets a recording_id back, and then

// follows the job's row in the Supabase `recordings` table. Two transports run

// side by side and the first to deliver a terminal state wins:

//

//   1. Supabase Realtime: a websocket subscription to UPDATEs on that one row,

//      pushed the moment the worker writes a new stage. This is the live path.

//   2. HTTP polling of GET /api/screenings/{id} every few seconds, so a blocked

//      websocket, a missing anon key or a flaky Realtime connection degrade to

//      "slightly less live" instead of "stuck".

//

// Neither path ever holds a long HTTP request open, which is what let the

// hosting proxy's 100 second cap kill screenings in the previous design.

//

// The same job endpoint scores the standardized tasks (animal fluency, delayed

// recall, sustained vowel) when a `task` is passed; those jobs are submitted as

// soon as each recording is reviewed and collected at the end of the session.

import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js"

import { getApiBaseUrl } from "./apiConfig"

import {
  analyzeAudioWithBackend,
  getExtensionForBlob,
  type ScreeningApiResponse,
} from "./audioRecorder"

/** Stages exactly as the backend writes them (backend/screening_jobs.py). */

export type ScreeningJobStage = "queued" | "uploading" | "transcribing" | "extracting" | "scoring" | "completed" | "failed"

/**
 * What the processing screen renders. "complete" is the app's historical
 * spelling; "battery" means the model result is in and the standardized task
 * jobs are being collected.
 */

export type AnalysisStep = "idle" | "uploading" | "queued" | "transcribing" | "extracting" | "scoring" | "battery" | "complete"

export type JobTransport = "http" | "realtime" | "poll"

/** Backend task names (backend/task_scoring.py). */

export type ScreeningTask = "picture" | "fluency" | "recall" | "phonation" | "daily"

export interface ScreeningJobProgress {
  stage: AnalysisStep

  /** 0 = running now, 1 = one ahead of you, …; null once running or finished. */

  queuePosition: number | null

  /** Which channel delivered this update. */

  transport: JobTransport

  recordingId: string

  task: ScreeningTask
}

/**
 * One standardized task's score as the backend reports it. `flag` true means
 * below the published typical range; null means it could not be scored.
 */

export interface BatteryTaskResult {
  task: Exclude<ScreeningTask, "picture">

  scored: boolean

  score: number | null

  /** Always null for the daily task: see reference_type. */

  flag: boolean | null

  /**
   * Absent on the standardized tasks, which have published cut-offs.
   * "within_person" marks a measurement that is only meaningful against the
   * same speaker's earlier recordings, so it must never be shown as a verdict.
   */

  reference_type?: "within_person"

  threshold: string

  reference: string

  note: string

  details: Record<string, unknown>
}

/** Job result for a standardized task (the picture task returns ScreeningApiResponse). */

export interface TaskJobResponse {
  success: boolean

  task: ScreeningTask

  transcript?: string

  word_count?: number

  detected_language?: string | null

  audio?: { duration_seconds?: number }

  battery: BatteryTaskResult

  recording_id: string

  processing_seconds?: number
}

export interface RunScreeningJobOptions {
  onProgress?: (progress: ScreeningJobProgress) => void

  /** Upload only; the request returns as soon as the clip is stored. */

  submitTimeoutMs?: number

  /** Whole job, including time spent queued behind other screenings. */

  overallTimeoutMs?: number

  pollIntervalMs?: number

  task?: ScreeningTask

  /** Task parameters, e.g. { target_words: [...], language: "hi" } for recall. */

  params?: Record<string, unknown>
}

interface RealtimeConfig {
  supabase_url: string

  anon_key: string

  schema: string

  table: string

  id_column: string
}

interface SubmitResponse {
  success: boolean

  recording_id: string

  task: ScreeningTask

  status: ScreeningJobStage

  queue_position: number | null

  poll_url: string

  realtime: RealtimeConfig | null
}

interface JobStatusResponse<T> {
  recording_id: string

  task: ScreeningTask

  status: ScreeningJobStage

  queue_position: number | null

  result: T | null

  error: string | null
}

interface RecordingRow<T> {
  recording_id?: string

  processing_status?: string

  prediction_result?: T | null

  error_message?: string | null
}

/** Handle returned by submitScreeningJob; pass it to followScreeningJob. */

export interface ScreeningJobHandle {
  recordingId: string

  task: ScreeningTask

  status: ScreeningJobStage

  queuePosition: number | null

  realtime: RealtimeConfig | null

  baseUrl: string
}

const STAGE_ORDER: ScreeningJobStage[] = [
  "queued",

  "uploading",

  "transcribing",

  "extracting",

  "scoring",

  "completed",

  "failed",
]

export const SERVER_SLOW_MESSAGE =
  "The screening server is taking longer than expected. It may be waking up or busy - please wait a minute and try again. Your recording is kept."

export const SERVER_UNREACHABLE_MESSAGE =
  "The screening server did not respond. It may be restarting or overloaded - please wait a minute and try again. On a phone, also check your connection or the server address in Settings."

/**
 * The backend has no job endpoint: it is older than the client.
 *
 * Frontend and backend deploy separately, so a browser can be running new code
 * against a server that has not rolled over yet. Raised so the caller can fall
 * back rather than telling the person their screening failed.
 */

export class JobEndpointMissingError extends Error {
  constructor() {
    super("The screening server does not support queued screenings yet.")

    this.name = "JobEndpointMissingError"
  }
}

function toAnalysisStep(stage: string): AnalysisStep | null {
  switch (stage) {
    case "queued":

    case "uploading":

    case "transcribing":

    case "extracting":

    case "scoring":
      return stage

    case "completed":
      return "complete"

    default:
      return null
  }
}

/**
 * Realtime configuration: an explicit build-time setting wins; otherwise the
 * backend tells us where its own project lives, so a fresh deployment needs no
 * frontend configuration at all. The anon key is public by design.
 */

function resolveRealtimeConfig(
  fromServer: RealtimeConfig | null,
): RealtimeConfig | null {
  const envUrl = import.meta.env?.VITE_SUPABASE_URL as string | undefined

  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined

  if (envUrl && envKey) {
    return {
      supabase_url: envUrl.replace(/\/+$/, ""),

      anon_key: envKey,

      schema: fromServer?.schema ?? "public",

      table: fromServer?.table ?? "recordings",

      id_column: fromServer?.id_column ?? "recording_id",
    }
  }

  return fromServer
}

const clientCache = new Map<string, SupabaseClient>()

function getSupabaseClient(cfg: RealtimeConfig): SupabaseClient {
  const key = `${cfg.supabase_url}|${cfg.anon_key.slice(-8)}`

  let client = clientCache.get(key)

  if (!client) {
    client = createClient(cfg.supabase_url, cfg.anon_key, {
      auth: { persistSession: false, autoRefreshToken: false },

      realtime: { params: { eventsPerSecond: 5 } },
    })

    clientCache.set(key, client)
  }

  return client
}

/**
 * Uploads a recording and returns as soon as the backend has queued it. The
 * handle can be followed later, so a task can be submitted the moment its
 * recording is reviewed while the person moves on to the next task.
 */

export async function submitScreeningJob(
  blob: Blob,

  filename?: string,

  options: Pick<RunScreeningJobOptions, "task" | "params" | "submitTimeoutMs"> = {},
): Promise<ScreeningJobHandle> {
  const { task = "picture", params, submitTimeoutMs = 90000 } = options

  const baseUrl = getApiBaseUrl()

  const endpoint = `${baseUrl}/api/screenings`

  const targetFilename = filename || `${task}${getExtensionForBlob(blob)}`

  const formData = new FormData()

  formData.append("audio", blob, targetFilename)

  formData.append("task", task)

  if (params && Object.keys(params).length > 0) {
    formData.append("params", JSON.stringify(params))
  }

  console.log("[SwarSanket] Submitting recording as a screening job", {
    endpoint,

    task,

    filename: targetFilename,

    sizeBytes: blob.size,
  })

  const controller = new AbortController()

  const timeoutId = setTimeout(() => controller.abort(), submitTimeoutMs)

  let submitted: SubmitResponse

  try {
    const response = await fetch(endpoint, {
      method: "POST",

      body: formData,

      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")

      let detail = `Server returned HTTP ${response.status}`

      try {
        const parsed = JSON.parse(errorText)

        if (parsed.detail) detail = String(parsed.detail)
      } catch {
        // keep the fallback detail
      }

      // A 404 on the route itself means an older server, not a bad request.

      // The endpoint's own 404 names a recording id, so the two are distinct.

      if (
        response.status === 404 &&
        !detail.toLowerCase().includes("recording")
      ) {
        throw new JobEndpointMissingError()
      }

      throw new Error(detail)
    }

    submitted = ((await response.json()) as SubmitResponse)
  } catch (err: unknown) {
    if (err instanceof JobEndpointMissingError) throw err

    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(SERVER_SLOW_MESSAGE)
    }

    const message =
      err instanceof Error ? err.message : "Unable to reach screening backend."

    if (
      message.includes("Failed to fetch") ||
      message.includes("NetworkError")
    ) {
      throw new Error(SERVER_UNREACHABLE_MESSAGE)
    }

    throw err instanceof Error ? err : new Error(message)
  } finally {
    clearTimeout(timeoutId)
  }

  const realtime = resolveRealtimeConfig(submitted.realtime)

  console.log("[SwarSanket] Screening job accepted", {
    recordingId: submitted.recording_id,

    task: submitted.task,

    status: submitted.status,

    queuePosition: submitted.queue_position,

    realtime: realtime ? "available" : "polling only",
  })

  return {
    recordingId: submitted.recording_id,

    task: submitted.task ?? task,

    status: submitted.status,

    queuePosition: submitted.queue_position,

    realtime,

    baseUrl,
  }
}

/**
 * Follows a submitted job to completion over Realtime and polling. Resolves
 * with the job's result object: a ScreeningApiResponse for the picture task,
 * a TaskJobResponse for the standardized tasks.
 */

export function followScreeningJob<T = ScreeningApiResponse>(
  handle: ScreeningJobHandle,

  options: Pick<RunScreeningJobOptions, "onProgress" | "overallTimeoutMs" | "pollIntervalMs"> = {},
): Promise<T> {
  const {
    onProgress,

    overallTimeoutMs = 600000,

    pollIntervalMs = 4000,
  } = options

  const { recordingId, realtime: realtimeCfg, baseUrl, task } = handle

  return new Promise<T>((resolve, reject) => {
    let settled = false

    let highestStage = -1

    let channel: RealtimeChannel | null = null

    let pollTimer: ReturnType<typeof setTimeout> | null = null

    const deadline = setTimeout(
      () => finish(new Error(SERVER_SLOW_MESSAGE)),

      overallTimeoutMs,
    )

    const cleanup = () => {
      clearTimeout(deadline)

      if (pollTimer) clearTimeout(pollTimer)

      if (channel && realtimeCfg) {
        const client = getSupabaseClient(realtimeCfg)

        client.removeChannel(channel).catch(() => undefined)

        channel = null
      }
    }

    const finish = (outcome: Error | T) => {
      if (settled) return

      settled = true

      cleanup()

      if (outcome instanceof Error) reject(outcome)
      else resolve(outcome)
    }

    // Stages may arrive from two transports slightly out of step; never let a

    // late poll response move the display backwards.

    const report = (
      stage: string,

      queuePosition: number | null,

      transport: JobTransport,
    ) => {
      const idx = STAGE_ORDER.indexOf(stage as ScreeningJobStage)

      if (idx < 0 || idx < highestStage) return

      highestStage = idx

      const step = toAnalysisStep(stage)

      if (step) {
        onProgress?.({
          stage: step,

          queuePosition,

          transport,

          recordingId,

          task,
        })
      }
    }

    const fetchResult = async (preferred: JobTransport): Promise<T | null> => {
      if (preferred === "realtime" && realtimeCfg) {
        try {
          const { data } = await getSupabaseClient(realtimeCfg)

            .from(realtimeCfg.table)

            .select("prediction_result")

            .eq(realtimeCfg.id_column, recordingId)

            .maybeSingle<RecordingRow<T>>()

          if (data?.prediction_result) return data.prediction_result
        } catch {
          // fall through to HTTP
        }
      }

      try {
        const res = await fetch(`${baseUrl}/api/screenings/${recordingId}`)

        if (res.ok) {
          const body = (await res.json()) as JobStatusResponse<T>

          if (body.result) return body.result
        }
      } catch {
        // caller keeps waiting; the poll loop will retry
      }

      return null
    }

    const handleTerminal = async (
      status: string,

      result: T | null | undefined,

      error: string | null | undefined,

      transport: JobTransport,
    ): Promise<boolean> => {
      if (status === "failed") {
        finish(
          new Error(
            error ||
              "An error occurred while processing the voice screening. Please try again.",
          ),
        )

        return true
      }

      if (status !== "completed") return false

      // Realtime trims oversized rows; fetch the result explicitly then.

      const full = result ?? (await fetchResult(transport))

      if (full) {
        console.log("[SwarSanket] Screening job completed via", transport, {
          task,

          recordingId,
        })

        finish(full)

        return true
      }

      return false
    }

    // ── Transport 1: Supabase Realtime ────────────────────────────────────

    if (realtimeCfg) {
      try {
        const client = getSupabaseClient(realtimeCfg)

        channel = client

          .channel(`screening-${recordingId}`)

          .on(
            "postgres_changes",

            {
              event: "UPDATE",

              schema: realtimeCfg.schema,

              table: realtimeCfg.table,

              filter: `${realtimeCfg.id_column}=eq.${recordingId}`,
            },

            (payload) => {
              const row = (payload.new ?? {}) as RecordingRow<T>

              const status = row.processing_status ?? ""

              report(status, null, "realtime")

              void handleTerminal(
                status,

                row.prediction_result,

                row.error_message,

                "realtime",
              )
            },
          )

          .subscribe((status, err) => {
            if (status === "SUBSCRIBED") {
              console.log(
                "[SwarSanket] Realtime subscribed to recording",

                recordingId,
              )
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.warn(
                "[SwarSanket] Realtime unavailable, polling instead:",

                err?.message ?? status,
              )
            }
          })
      } catch (err) {
        console.warn(
          "[SwarSanket] Realtime setup failed, polling instead:",

          err,
        )

        channel = null
      }
    }

    // ── Transport 2: HTTP polling (always on, as the safety net) ──────────

    const poll = async () => {
      if (settled) return

      try {
        const res = await fetch(`${baseUrl}/api/screenings/${recordingId}`)

        if (res.ok) {
          const body = (await res.json()) as JobStatusResponse<T>

          report(body.status, body.queue_position, "poll")

          if (
            await handleTerminal(body.status, body.result, body.error, "poll")
          ) {
            return
          }
        } else if (res.status === 404) {
          // The worker restarted and forgot the job before Supabase had the row.

          finish(new Error(SERVER_SLOW_MESSAGE))

          return
        }
      } catch {
        // transient; try again on the next tick
      }

      if (!settled) pollTimer = setTimeout(poll, pollIntervalMs)
    }

    report(handle.status, handle.queuePosition, "http")

    pollTimer = setTimeout(poll, Math.min(pollIntervalMs, 2500))
  })
}

/**
 * Uploads a recording, then follows its job to completion. Resolves with the
 * same contract the synchronous endpoint returned, so callers need no changes
 * beyond swapping the function.
 */

export async function runScreeningJob(
  blob: Blob,

  filename?: string,

  options: RunScreeningJobOptions = {},
): Promise<ScreeningApiResponse> {
  const task = options.task ?? "picture"

  options.onProgress?.({
    stage: "uploading",

    queuePosition: null,

    transport: "http",

    recordingId: "",

    task,
  })

  let handle: ScreeningJobHandle

  try {
    handle = await submitScreeningJob(blob, filename, options)
  } catch (err) {
    // Deploy skew: this browser has the new client, the server does not have

    // the job endpoint yet. The old synchronous endpoint returns the identical

    // payload, so a screening still works. It holds one long request open,

    // which is the thing the job pipeline exists to avoid, so this is a

    // fallback and not a second supported path.

    if (err instanceof JobEndpointMissingError && task === "picture") {
      console.warn(
        "[SwarSanket] Screening server has no job endpoint; using the synchronous one.",
      )

      options.onProgress?.({
        stage: "transcribing",

        queuePosition: null,

        transport: "http",

        recordingId: "",

        task,
      })

      return analyzeAudioWithBackend(blob, filename, options.overallTimeoutMs)
    }

    throw err
  }

  return followScreeningJob<ScreeningApiResponse>(handle, options)
}
