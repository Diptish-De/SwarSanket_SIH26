import { createClient, SupabaseClient } from "@supabase/supabase-js"

const DEFAULT_SUPABASE_URL = "https://plfguopprxbfrkgwxsgf.supabase.co"

const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZmd1b3BwcnhiZnJrZ3d4c2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDgwNDQsImV4cCI6MjEwNDc4NDA0NH0.WlgcXkThY7sLLxiO59LvejLGWVGRFGhRMPJ91-9MzTo"

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL as string | undefined ||
  DEFAULT_SUPABASE_URL

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined ||
  DEFAULT_SUPABASE_ANON_KEY

export const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZmd1b3BwcnhiZnJrZ3d4c2dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTIwODA0NCwiZXhwIjoyMTA0Nzg0MDQ0fQ.iw_zHks4qrXPnslsgkUzWDHBaYKXWXVZl1ZqOzl39AA"

const supabaseServiceKey =
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined ||
  DEFAULT_SUPABASE_SERVICE_ROLE_KEY

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

export async function registerVerifiedSupabaseUser(params: {
  fullName: string

  phone: string

  password: string

  age?: number

  gender?: string

  caregiverName?: string

  caregiverPhone?: string
}): Promise<{ email: string userId: string }> {
  const digits = params.phone.replace(/\D/g, "")

  const phoneKey = digits.slice(-10) || digits

  const phoneWithCode = digits.length === 10 ? `91${digits}` : digits

  const virtualEmail = `${phoneKey}@swarsanket.app`

  const payload = {
    phone: phoneWithCode,

    phone_confirm: true,

    email: virtualEmail,

    email_confirm: true,

    password: params.password,

    user_metadata: {
      full_name: params.fullName,

      username: params.fullName,

      phone: params.phone,

      clean_phone: phoneKey,

      age: params.age,

      gender: params.gender,

      caregiver_name: params.caregiverName,

      caregiver_phone: params.caregiverPhone,
    },
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",

      headers: {
        apikey: supabaseServiceKey,

        Authorization: `Bearer ${supabaseServiceKey}`,

        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    })

    if (response.ok) {
      const data = await response.json()

      return { email: virtualEmail, userId: data.id || "" }
    }

    // If already registered, update credentials so the chosen password works

    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: supabaseServiceKey,

        Authorization: `Bearer ${supabaseServiceKey}`,
      },
    })

    if (listRes.ok) {
      const usersData = await listRes.json()

      const existingUser = (usersData.users || []).find(
        (u: { email?: string }) => u.email === virtualEmail,
      )

      if (existingUser) {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${existingUser.id}`, {
          method: "PUT",

          headers: {
            apikey: supabaseServiceKey,

            Authorization: `Bearer ${supabaseServiceKey}`,

            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            phone: phoneWithCode,

            phone_confirm: true,

            password: params.password,

            user_metadata: payload.user_metadata,
          }),
        })

        return { email: virtualEmail, userId: existingUser.id }
      }
    }
  } catch (err) {
    console.warn("Direct admin registration fallback:", err)
  }

  return { email: virtualEmail, userId: "" }
}

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
    return {
      found: true,

      email: `${digits.slice(-10)}@swarsanket.app`,

      phone: digits,
    }
  }

  try {
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: supabaseServiceKey,

        Authorization: `Bearer ${supabaseServiceKey}`,
      },
    })

    if (listRes.ok) {
      const usersData = await listRes.json()

      for (const u of usersData.users || []) {
        const meta = u.user_metadata || {}

        const fn = String(meta.full_name || "")

          .trim()

          .toLowerCase()

        const ph = String(meta.phone || "")

          .trim()

          .toLowerCase()

        const cleanP = String(meta.clean_phone || "")

          .trim()

          .toLowerCase()

        const target = raw.toLowerCase()

        if (
          target === fn ||
          target === ph ||
          target === cleanP ||
          (target.length >= 3 && fn.includes(target))
        ) {
          return {
            found: true,

            email: u.email,

            fullName: meta.full_name,

            phone: meta.phone,
          }
        }
      }
    }
  } catch {
    // fallback
  }

  if (digits) {
    return { found: true, email: `${digits}@swarsanket.app` }
  }

  return { found: false }
}
