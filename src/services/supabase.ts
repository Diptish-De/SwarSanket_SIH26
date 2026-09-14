import { createClient, SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined

const supabaseAnonKey = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,

          autoRefreshToken: true,

          detectSessionInUrl: true,
        },
      })
    : null

export function isSupabaseConfigured(): boolean {
  return Boolean(supabase)
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}
