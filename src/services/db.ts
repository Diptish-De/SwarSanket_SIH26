import { openDB, DBSchema, IDBPDatabase } from "idb"

import { ScreeningSession, OfflineSyncItem } from "../types"

interface SwarSanketDB extends DBSchema {
  screenings: {
    key: string

    value: ScreeningSession

    indexes: { "by-date": string }
  }

  audio_blobs: {
    key: string

    value: {
      id: string

      sessionId: string

      taskId: string

      blob: Blob

      mimeType: string

      durationSeconds: number

      createdAt: string
    }

    indexes: { "by-session": string }
  }

  sync_queue: {
    key: string

    value: OfflineSyncItem

    indexes: { "by-status": string }
  }

  doctor_notes: {
    key: string

    value: {
      id: string

      patientId: string

      author: string

      note: string

      createdAt: string
    }

    indexes: { "by-patient": string }
  }
}

const DB_NAME = "SwarSanket_DB"

const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<SwarSanketDB>> | null = null

export function getDB(): Promise<IDBPDatabase<SwarSanketDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SwarSanketDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("screenings")) {
          const screeningStore = db.createObjectStore("screenings", {
            keyPath: "id",
          })

          screeningStore.createIndex("by-date", "createdAt")
        }

        if (!db.objectStoreNames.contains("audio_blobs")) {
          const audioStore = db.createObjectStore("audio_blobs", {
            keyPath: "id",
          })

          audioStore.createIndex("by-session", "sessionId")
        }

        if (!db.objectStoreNames.contains("sync_queue")) {
          const queueStore = db.createObjectStore("sync_queue", {
            keyPath: "id",
          })

          queueStore.createIndex("by-status", "status")
        }

        if (!db.objectStoreNames.contains("doctor_notes")) {
          const notesStore = db.createObjectStore("doctor_notes", {
            keyPath: "id",
          })

          notesStore.createIndex("by-patient", "patientId")
        }
      },
    })
  }

  return dbPromise
}

// ─── Screening operations ─────────────────────────────────────────────────────

export interface AudioBlobPayload {
  taskId: string

  blob: Blob

  durationSeconds: number
}

export async function saveScreeningSession(
  session: ScreeningSession,

  audioBlobs?: AudioBlobPayload[],
): Promise<void> {
  const db = await getDB()

  const tx = db.transaction(
    ["screenings", "audio_blobs", "sync_queue"],

    "readwrite",
  )

  // Save session record

  await tx.objectStore("screenings").put(session)

  // Save audio blobs if provided

  if (audioBlobs && audioBlobs.length > 0) {
    for (const item of audioBlobs) {
      const blobId = `${session.id}_${item.taskId}`

      await tx.objectStore("audio_blobs").put({
        id: blobId,

        sessionId: session.id,

        taskId: item.taskId,

        blob: item.blob,

        mimeType: item.blob.type || "audio/webm",

        durationSeconds: item.durationSeconds,

        createdAt: new Date().toISOString(),
      })
    }
  }

  // If session is not synced (e.g. offline mode), add to sync queue

  if (!session.synced) {
    await tx.objectStore("sync_queue").put({
      id: `queue_${session.id}`,

      sessionId: session.id,

      patientName: session.patientName,

      createdAt: session.createdAt,

      sizeBytes:
        (audioBlobs || []).reduce((acc, b) => acc + b.blob.size, 0) || 102400,

      status: "pending",

      retryCount: 0,
    })
  }

  await tx.done
}

export async function getAllScreenings(): Promise<ScreeningSession[]> {
  const db = await getDB()

  const all = await db.getAllFromIndex("screenings", "by-date")

  return all.reverse() // Newest first
}

export async function getScreeningById(
  id: string,
): Promise<ScreeningSession | undefined> {
  const db = await getDB()

  return db.get("screenings", id)
}

export async function getAudioBlob(blobId: string): Promise<Blob | undefined> {
  const db = await getDB()

  const record = await db.get("audio_blobs", blobId)

  return record?.blob
}

// ─── Sync queue operations ───────────────────────────────────────────────────

export async function getOfflineQueue(): Promise<OfflineSyncItem[]> {
  const db = await getDB()

  return db.getAll("sync_queue")
}

export async function markQueueItemSynced(id: string): Promise<void> {
  const db = await getDB()

  const tx = db.transaction(["sync_queue", "screenings"], "readwrite")

  const item = await tx.objectStore("sync_queue").get(id)

  if (item) {
    item.status = "synced"

    await tx.objectStore("sync_queue").put(item)

    // Also mark session synced

    const session = await tx.objectStore("screenings").get(item.sessionId)

    if (session) {
      session.synced = true

      await tx.objectStore("screenings").put(session)
    }
  }

  await tx.done
}

// ─── Doctor notes ─────────────────────────────────────────────────────────────

export async function addDoctorNote(
  patientId: string,

  note: string,

  author = "Dr. Priya Sharma",
): Promise<void> {
  const db = await getDB()

  await db.put("doctor_notes", {
    id: `note_${Date.now()}`,

    patientId,

    author,

    note,

    createdAt: new Date().toISOString(),
  })
}

export async function getDoctorNotes(patientId: string) {
  const db = await getDB()

  return db.getAllFromIndex("doctor_notes", "by-patient", patientId)
}

// ─── Seed initial demo data if database is empty ──────────────────────────────

export async function seedInitialDemoData(): Promise<void> {
  const db = await getDB()

  const count = await db.count("screenings")

  if (count > 0) return

  const mockSessions: ScreeningSession[] = [
    {
      id: "sc_20260828_01",

      patientName: "Rama Devi",

      patientAge: 72,

      language: "hi",

      assistedMode: false,

      createdAt: "2026-08-28T10:14:00Z",

      durationSeconds: 252,

      audioQuality: "good",

      tasks: [
        {
          taskId: "freeSpeech",

          prompt: "हमें अपने दिन के बारे में बताइए।",

          durationSeconds: 28,

          quality: "good",

          snrEstimateDb: 24.5,

          speechRateWpm: 72,

          timestamp: "2026-08-28T10:14:30Z",
        },

        {
          taskId: "pictureDesc",

          prompt: "आप इस तस्वीर में क्या देख रहे हैं?",

          durationSeconds: 32,

          quality: "good",

          snrEstimateDb: 26.1,

          speechRateWpm: 68,

          timestamp: "2026-08-28T10:16:00Z",
        },

        {
          taskId: "memoryRecall",

          prompt: "गाय · नदी · किताब · घर · फूल",

          durationSeconds: 18,

          quality: "good",

          snrEstimateDb: 25.0,

          speechRateWpm: 60,

          timestamp: "2026-08-28T10:17:15Z",
        },
      ],

      biomarkers: {
        speechRateWpm: 68,

        pausePatternRatio: 45,

        pitchVariationHz: 72,

        jitterPercent: 3.2,

        shimmerDb: 4.1,

        hnrDb: 21.0,
      },

      mlResult: {
        screeningRisk: "elevated",

        confidenceScore: 0.88,

        confidenceLevel: "high",

        classicalModel: {
          name: "8-Qubit VQC",

          riskScore: 0.84,

          aucScore: 0.943,
        },

        quantumHybridModel: {
          name: "PennyLane + PyTorch QNN",

          riskScore: 0.89,

          aucScore: 0.943,
        },

        shapContributions: [
          {
            feature: "Long pause duration (>1.2s)",

            impact: "positive",

            weight: +0.34,
          },

          {
            feature: "Elevated pitch jitter (3.2%)",

            impact: "positive",

            weight: +0.28,
          },

          {
            feature: "Phonetic transition delay",

            impact: "positive",

            weight: +0.22,
          },

          {
            feature: "Semantic word recall loss",

            impact: "positive",

            weight: +0.16,
          },
        ],
      },

      synced: true,

      notes:
        "Elevated vocal latency and pause frequency detected. Recommended in-person neurological follow-up.",
    },

    {
      id: "sc_20260815_02",

      patientName: "Suresh Kumar",

      patientAge: 68,

      language: "hi",

      assistedMode: false,

      createdAt: "2026-08-15T09:30:00Z",

      durationSeconds: 210,

      audioQuality: "good",

      tasks: [],

      biomarkers: {
        speechRateWpm: 92,

        pausePatternRatio: 22,

        pitchVariationHz: 88,

        jitterPercent: 1.1,

        shimmerDb: 2.2,

        hnrDb: 28.5,
      },

      mlResult: {
        screeningRisk: "low",

        confidenceScore: 0.94,

        confidenceLevel: "high",

        classicalModel: {
          name: "8-Qubit VQC",

          riskScore: 0.12,

          aucScore: 0.943,
        },

        quantumHybridModel: {
          name: "PennyLane + PyTorch QNN",

          riskScore: 0.1,

          aucScore: 0.943,
        },

        shapContributions: [
          {
            feature: "Normal speech rhythm",

            impact: "negative",

            weight: -0.42,
          },

          {
            feature: "High harmonicity (HNR 28.5dB)",

            impact: "negative",

            weight: -0.38,
          },
        ],
      },

      synced: true,
    },

    {
      id: "sc_20260812_03",

      patientName: "Rama Devi",

      patientAge: 72,

      language: "hi",

      assistedMode: false,

      createdAt: "2026-08-12T11:00:00Z",

      durationSeconds: 195,

      audioQuality: "good",

      tasks: [],

      biomarkers: {
        speechRateWpm: 74,

        pausePatternRatio: 38,

        pitchVariationHz: 76,

        jitterPercent: 2.8,

        shimmerDb: 3.6,

        hnrDb: 23.1,
      },

      mlResult: {
        screeningRisk: "elevated",

        confidenceScore: 0.81,

        confidenceLevel: "high",

        classicalModel: {
          name: "8-Qubit VQC",

          riskScore: 0.78,

          aucScore: 0.943,
        },

        quantumHybridModel: {
          name: "PennyLane + PyTorch QNN",

          riskScore: 0.82,

          aucScore: 0.943,
        },

        shapContributions: [],
      },

      synced: true,
    },
  ]

  for (const s of mockSessions) {
    await db.put("screenings", s)
  }
}

export async function clearAllScreenings(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(
    ["screenings", "audio_blobs", "sync_queue"],
    "readwrite",
  )
  await tx.objectStore("screenings").clear()
  await tx.objectStore("audio_blobs").clear()
  await tx.objectStore("sync_queue").clear()
  await tx.done
}
