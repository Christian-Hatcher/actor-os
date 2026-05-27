import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

let cached: SupabaseClient<Database> | null = null

function getClient(): SupabaseClient<Database> {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      "Supabase client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  }
  cached = createClient<Database>(url, key)
  return cached
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop, getClient())
  },
}) as SupabaseClient<Database>
