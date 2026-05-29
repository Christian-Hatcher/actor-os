import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Public values — the anon key is intentionally public (enforced by RLS)
const SUPABASE_URL = "https://kyljaiwtijovnwajotoq.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bGphaXd0aWpvdm53YWpvdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NjE5MTQsImV4cCI6MjA5NTIzNzkxNH0.R-GjRhXKzCWjNWXUOTuy9Oi_fTKqLaPmtnntqnn1QB0"

let browserClient: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    // SSR: return a throwaway client that won't pollute the singleton
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  if (!browserClient) {
    browserClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return browserClient
}

// Default export for backward compat with existing imports
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabase()
    const value = Reflect.get(client, prop)
    return typeof value === "function" ? value.bind(client) : value
  },
})
