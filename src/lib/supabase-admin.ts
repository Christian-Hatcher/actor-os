import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const SUPABASE_URL = "https://kyljaiwtijovnwajotoq.supabase.co"

let cached: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error("Supabase admin client requires SUPABASE_SERVICE_ROLE_KEY env var")
  }
  cached = createClient<Database>(SUPABASE_URL, key)
  return cached
}
