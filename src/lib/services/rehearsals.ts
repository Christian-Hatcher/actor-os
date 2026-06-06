import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const REHEARSAL_ALLOWED_FIELDS = [
  "job_id",
  "date",
  "type",
  "duration_minutes",
  "location",
  "notes",
] as const

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of REHEARSAL_ALLOWED_FIELDS) {
    if (field in body) result[field] = body[field] ?? null
  }
  return result
}

export async function listRehearsals(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  jobId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("rehearsal_logs")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("date", { ascending: false })

  return { data, error }
}

export async function createRehearsal(
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

  const allowed = pickAllowed(body)

  const { data, error } = await supabaseAdmin
    .from("rehearsal_logs")
    .insert({ ...allowed, user_id: userId } as any)
    .select()
    .single()

  return { data, error, status: error ? 500 : 201 }
}

export async function updateRehearsal(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  rehearsalId: string,
  body: Record<string, unknown>,
) {
  const allowed = pickAllowed(body)

  const { data, error } = await supabaseAdmin
    .from("rehearsal_logs")
    .update(allowed as any)
    .eq("id", rehearsalId)
    .eq("user_id", userId)
    .select()
    .single()

  return { data, error }
}

export async function deleteRehearsal(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  rehearsalId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("rehearsal_logs")
    .delete()
    .eq("id", rehearsalId)
    .eq("user_id", userId)
    .select()
    .single()

  return { data, error }
}
