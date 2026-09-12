/**
 * Household members & caregiver gate
 * ==================================
 * Identity for a screening app used by people with memory impairment.
 *
 * The design principle is that authentication strength should match what is being
 * protected, not be applied uniformly to the whole app:
 *
 *   - Recording your own voice and seeing your own result needs NO credential.
 *     Asking someone with Alzheimer's to recall a password gates the app on
 *     exactly the ability the disease removes.
 *   - Choosing which household member you are is a RECOGNITION task (tap your own
 *     photo), which survives far longer in dementia than recall of a secret.
 *   - Destructive or outbound actions - exporting a report, deleting history,
 *     changing who gets alerted - are gated by a caregiver PIN, because the
 *     caregiver is unimpaired and a real secret is reasonable for them.
 *
 * There are deliberately no security questions anywhere. They are pure recall and
 * are the single worst mechanism for this population.
 */

import { LanguageCode } from "../types"

import { getDB } from "./db"

export interface HouseholdMember {
  id: string

  displayName: string

  age: number

  /** Downscaled JPEG data URL. Empty string means fall back to initials. */

  photo: string

  language: LanguageCode

  /** The person being screened. Caregiver-only entries are not screened. */

  isPatient: boolean

  createdAt: string
}

const ACTIVE_MEMBER_KEY = "swarsanket.activeMember.v1"

const CAREGIVER_PIN_KEY = "swarsanket.caregiverPin.v1"

// ---------------------------------------------------------------------------

// Member storage

// ---------------------------------------------------------------------------

export async function listMembers(): Promise<HouseholdMember[]> {
  const db = await getDB()

  const all = await db.getAll("household")

  // Patients first, then oldest entry first, so the order on the picker is stable

  // between visits - a moving target is disorienting for this user group.

  return all.sort((a, b) => {
    if (a.isPatient !== b.isPatient) return a.isPatient ? -1 : 1

    return a.createdAt.localeCompare(b.createdAt)
  })
}

export async function getMember(
  id: string,
): Promise<HouseholdMember | undefined> {
  const db = await getDB()

  return db.get("household", id)
}

export async function saveMember(member: HouseholdMember): Promise<void> {
  const db = await getDB()

  await db.put("household", member)
}

export async function deleteMember(id: string): Promise<void> {
  const db = await getDB()

  await db.delete("household", id)

  if (getActiveMemberId() === id) clearActiveMember()
}

export function createMemberId(): string {
  return `hm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------

// Active member (who is using the device right now)

// ---------------------------------------------------------------------------

export function getActiveMemberId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_MEMBER_KEY)
  } catch {
    return null
  }
}

export function setActiveMemberId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_MEMBER_KEY, id)
  } catch {
    // Storage blocked; the app still works, the picker just appears each time.
  }
}

export function clearActiveMember(): void {
  try {
    localStorage.removeItem(ACTIVE_MEMBER_KEY)
  } catch {
    // Ignore.
  }
}

// ---------------------------------------------------------------------------

// Caregiver PIN

// ---------------------------------------------------------------------------

// Hashed rather than stored in the clear. This is a local-device gate against a

// confused or curious household member, NOT protection against someone with the

// device and technical skill - a client-side secret never can be. It is still a

// large improvement on storing the value verbatim.

interface StoredPin {
  salt: string

  hash: string
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)

  crypto.getRandomValues(bytes)

  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`swarsanket:${salt}:${pin}`)

  const digest = await crypto.subtle.digest("SHA-256", data)

  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("")
}

export function hasCaregiverPin(): boolean {
  try {
    return Boolean(localStorage.getItem(CAREGIVER_PIN_KEY))
  } catch {
    return false
  }
}

export async function setCaregiverPin(pin: string): Promise<void> {
  const salt = randomSalt()

  const hash = await hashPin(pin, salt)

  try {
    localStorage.setItem(
      CAREGIVER_PIN_KEY,

      JSON.stringify({ salt, hash } satisfies StoredPin),
    )
  } catch {
    // Nothing to do; the gate will simply prompt to set a PIN again.
  }
}

export async function verifyCaregiverPin(pin: string): Promise<boolean> {
  let raw: string | null = null

  try {
    raw = localStorage.getItem(CAREGIVER_PIN_KEY)
  } catch {
    return false
  }

  if (!raw) return false

  let stored: StoredPin

  try {
    stored = (JSON.parse(raw) as StoredPin)
  } catch {
    return false
  }

  if (!stored?.salt || !stored?.hash) return false

  const candidate = await hashPin(pin, stored.salt)

  return candidate === stored.hash
}

export function clearCaregiverPin(): void {
  try {
    localStorage.removeItem(CAREGIVER_PIN_KEY)
  } catch {
    // Ignore.
  }
}

// ---------------------------------------------------------------------------

// Photo handling

// ---------------------------------------------------------------------------

/**
 * Downscales a chosen photo to a small square JPEG data URL.
 *
 * Phone cameras produce multi-megabyte images; storing one per member would blow
 * the storage budget for no benefit, since the picker renders them at well under
 * 200px. Failure returns an empty string and the caller falls back to initials -
 * a member without a photo must still be selectable.
 */

export async function preparePhoto(file: File, size = 256): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file)

    const canvas = document.createElement("canvas")

    canvas.width = size

    canvas.height = size

    const ctx = canvas.getContext("2d")

    if (!ctx) return ""

    // Cover-crop to a square so faces are not distorted by a stretched aspect.

    const scale = Math.max(size / bitmap.width, size / bitmap.height)

    const w = bitmap.width * scale

    const h = bitmap.height * scale

    ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)

    bitmap.close?.()

    return canvas.toDataURL("image/jpeg", 0.82)
  } catch {
    return ""
  }
}

/** Initials shown when a member has no photo. */

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "?"

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Stable per-member tile colour, so a member's tile looks the same every time. */

export function avatarTint(id: string): string {
  const palette = [
    "#02738a",

    "#0d7a5f",

    "#8a5a02",

    "#7a3f8f",

    "#a03a4f",

    "#3f5f9f",
  ]

  let sum = 0

  for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i)) % 997

  return palette[sum % palette.length]
}
