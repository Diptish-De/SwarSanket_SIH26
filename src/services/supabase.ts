// ─── Browser Supabase client ─────────────────────────────────────────────────
//
// Everything in this file ships to the browser, so it may only ever hold the
// anon key. The anon key is designed to be public: row access is governed by
// Row Level Security, not by keeping the key secret.
//
// The service-role key is the opposite. It bypasses RLS entirely and grants
// full read, write and delete over every table in the project. It used to live
// in this file, which put it in the deployed JavaScript bundle where anyone
// could read it out of DevTools. Account creation needs that level of access,
// so it now happens on the backend, which is the only place that key belongs.
//
// If you are about to add a VITE_SUPABASE_SERVICE_ROLE_KEY, stop. Add a backend
// endpoint instead.

import { createClient, SupabaseClient } from "@supabase/supabase-js"

import { getApiBaseUrl } from "./apiConfig"

const DEFAULT_SUPABASE_URL = "https://plfguopprxbfrkgwxsgf.supabase.co"

const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZmd1b3BwcnhiZnJrZ3d4c2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDgwNDQsImV4cCI6MjEwNDc4NDA0NH0.WlgcXkThY7sLLxiO59LvejLGWVGRFGhRMPJ91-9MzTo"

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL as string | undefined ||
  DEFAULT_SUPABASE_URL

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined ||
  DEFAULT_SUPABASE_ANON_KEY

export const supabase: SupabaseClient = createClient(
  supabaseUrl,

  supabaseAnonKey,

  {
    auth: {
      persistSession: true,

      autoRefreshToken: true,

      detectSessionInUrl: true,
    },
  },
)

export function isSupabaseConfigured(): boolean {
  return true
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

/**
 * The login address derived from a phone number.
 *
 * Patients sign in with a WhatsApp number, but Supabase Auth wants an email, so
 * the last ten digits become one. Derived identically on the backend, in
 * `register_patient_user`, and the two must not drift.
 */

export function virtualEmailForPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")

  return `${digits.slice(-10) || digits}@swarsanket.app`
}

export interface RegisteredUserResult {
  email: string

  userId: string
}

/**
 * Creates the patient's account through the backend.
 *
 * The account has to be created already confirmed, because the email address is
 * synthesised from a phone number and no confirmation link could ever be
 * followed. Only the service role can do that, so only the backend can: this
 * posts to `/api/auth/register`, which calls the Supabase admin API server-side
 * and returns the login address to sign in with.
 *
 * Throws on failure rather than returning an empty id. Swallowing the error
 * here is what produced the misleading "Invalid login credentials" on the
 * registration screen: the account had never been created, and the sign-in that
 * followed was being blamed for it.
 */

export async function registerVerifiedSupabaseUser(params: {
  fullName: string
  phone: string
  password: string
  age?: number
  gender?: string
  caregiverName?: string
  caregiverPhone?: string
}): Promise<RegisteredUserResult> {
  const virtualEmail = virtualEmailForPhone(params.phone)

  let response: Response

  try {
    response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({
        full_name: params.fullName,

        phone: params.phone,

        password: params.password,

        age: params.age,

        gender: params.gender,

        caregiver_name: params.caregiverName,

        caregiver_phone: params.caregiverPhone,
      }),
    })
  } catch {
    throw new Error(
      "Could not reach the registration server. Check your connection and try again.",
    )
  }

  if (!response.ok) {
    let detail = `Registration failed (HTTP ${response.status}).`

    try {
      const body = await response.json()

      if (body?.detail) detail = String(body.detail)
    } catch {
      // keep the status-code message
    }

    throw new Error(detail)
  }

  const data = await response.json()

  return {
    email: data.email || virtualEmail,

    userId: data.user_id || "",
  }
}

/**
 * Resolves what someone typed into the login address to authenticate with.
 *
 * An email or a phone number resolves here without talking to anyone, because
 * the mapping is a pure function. Only a name needs a directory search, and
 * that requires listing users, which is service-role work: the backend does it.
 */

export async function lookupVerifiedSupabaseUser(
  identifier: string,
): Promise<{
  found: boolean

  email?: string

  fullName?: string

  phone?: string
}> {
  const raw = identifier.trim()

  if (!raw) return { found: false }

  if (raw.includes("@")) return { found: true, email: raw.toLowerCase() }

  const digits = raw.replace(/\D/g, "")

  if (digits.length >= 10) {
    return { found: true, email: virtualEmailForPhone(digits), phone: digits }
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/lookup`, {
      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ identifier: raw }),
    })

    if (response.ok) {
      const data = await response.json()

      if (data?.found && data?.email) {
        return {
          found: true,

          email: data.email,

          fullName: data.full_name ?? undefined,

          phone: data.phone ?? undefined,
        }
      }
    }
  } catch {
    // Fall through to the digits guess below.
  }

  if (digits) {
    return { found: true, email: `${digits}@swarsanket.app` }
  }

  return { found: false }
}
