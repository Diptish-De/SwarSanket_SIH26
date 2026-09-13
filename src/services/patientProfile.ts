import { getApiBaseUrl } from "./apiConfig"
import { getSupabaseAccessToken } from "./supabase"

export interface PatientProfileRecord {
  id: string
  auth_user_id: string | null
  username: string | null
  full_name: string
  age: number | null
  gender: string | null
  phone: string | null
  abha_id: string | null
  caregiver_name: string | null
  caregiver_phone: string | null
  caregiver_email: string | null
  created_at: string
  updated_at: string
}

async function authorizedRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const accessToken = await getSupabaseAccessToken()

  if (!accessToken) throw new Error("Your Supabase session has expired.")

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  })
}

export async function getMyPatientProfile(): Promise<PatientProfileRecord | null> {
  const response = await authorizedRequest("/api/patient/me")

  if (response.status === 404) return null
  if (!response.ok) throw new Error("Unable to load your patient profile.")

  return (await response.json()) as PatientProfileRecord
}

export async function upsertMyPatientProfile(profile: {
  patientId?: string
  username?: string
  fullName?: string
  age?: number
  gender?: string
  phone?: string
  caregiverName?: string
  caregiverPhone?: string
  caregiverEmail?: string
}): Promise<PatientProfileRecord> {
  const response = await authorizedRequest("/api/patient/me", {
    method: "PUT",
    body: JSON.stringify({
      patient_id: profile.patientId,
      username: profile.username,
      full_name: profile.fullName,
      age: profile.age,
      gender: profile.gender,
      phone: profile.phone,
      caregiver_name: profile.caregiverName,
      caregiver_phone: profile.caregiverPhone,
      caregiver_email: profile.caregiverEmail,
    }),
  })

  if (!response.ok) throw new Error("Unable to save your patient profile.")

  return (await response.json()) as PatientProfileRecord
}

export async function getMyScreenings(): Promise<unknown[]> {
  const response = await authorizedRequest("/api/supabase/my-screenings")

  if (!response.ok) throw new Error("Unable to load your screening history.")

  const data = (await response.json()) as { screenings?: unknown[] }
  return data.screenings ?? []
}
