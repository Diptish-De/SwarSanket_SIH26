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
