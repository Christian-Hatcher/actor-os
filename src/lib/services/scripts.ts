import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export const FREE_TIER_SCRIPT_LIMIT = 5

const SCRIPT_ALLOWED_FIELDS = [
  "job_id",
  "file_name",
  "file_url",
  "file_type",
  "file_size_bytes",
  "version_label",
] as const

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of SCRIPT_ALLOWED_FIELDS) {
    if (field in body) result[field] = body[field] ?? null
  }
  return result
}

export async function listScripts(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  jobId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("scripts")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return { data, error }
}

export async function createScriptRecord(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  body: Record<string, unknown>,
) {
  // Verify job ownership
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id")
    .eq("id", body.job_id as string)
    .eq("user_id", userId)
    .single()

  if (!job) {
    return { data: null, error: { message: "Job not found" }, status: 404 }
  }

  // Free tier check
  const [{ data: profile }, { count }] = await Promise.all([
    supabaseAdmin.from("profiles").select("subscription_status").eq("id", userId).single(),
    supabaseAdmin.from("scripts").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ])

  const isFreeTier = !profile?.subscription_status || profile.subscription_status !== "active"
  if (isFreeTier && (count ?? 0) >= FREE_TIER_SCRIPT_LIMIT) {
    return {
      data: null,
      error: { message: "Free tier limit reached", limit: FREE_TIER_SCRIPT_LIMIT, upgrade: true },
      status: 403,
    }
  }

  const allowed = pickAllowed(body)

  const { data, error } = await supabaseAdmin
    .from("scripts")
    .insert({ ...allowed, user_id: userId } as any)
    .select()
    .single()

  return { data, error, status: error ? 500 : 201 }
}

export async function deleteScript(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  scriptId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("scripts")
    .delete()
    .eq("id", scriptId)
    .eq("user_id", userId)
    .select()
    .single()

  return { data, error }
}
