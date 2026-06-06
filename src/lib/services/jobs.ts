import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const FREE_TIER_JOB_LIMIT = 3

const JOB_ALLOWED_FIELDS = [
  "title",
  "role_name",
  "project_type",
  "status",
  "location",
  "compensation",
  "start_date",
  "end_date",
  "contract_id",
  "production_id",
  "notes",
] as const

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of JOB_ALLOWED_FIELDS) {
    if (field in body) result[field] = body[field] ?? null
  }
  return result
}

export async function listJobs(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  filters?: { status?: string; project_type?: string },
) {
  let query = supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (filters?.status) query = query.eq("status", filters.status)
  if (filters?.project_type) query = query.eq("project_type", filters.project_type)

  const { data, error } = await query
  return { data, error }
}

export async function getJob(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  jobId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single()

  return { data, error }
}

/**
 * Load all related data for a job detail page in one batch.
 * Prevents N+1 queries on the detail page.
 */
export async function getJobDetail(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  jobId: string,
) {
  const [jobResult, rehearsalsResult, scriptsResult] = await Promise.all([
    supabaseAdmin
      .from("jobs")
      .select("*, auditions(*), contracts(*)")
      .eq("id", jobId)
      .eq("user_id", userId)
      .single(),
    supabaseAdmin
      .from("rehearsal_logs")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .order("date", { ascending: false }),
    supabaseAdmin
      .from("scripts")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ])

  return {
    job: jobResult.data,
    rehearsals: rehearsalsResult.data ?? [],
    scripts: scriptsResult.data ?? [],
    error: jobResult.error || rehearsalsResult.error || scriptsResult.error,
  }
}

export async function createJob(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  body: Record<string, unknown>,
) {
  // Free tier check
  const [{ data: profile }, { count }] = await Promise.all([
    supabaseAdmin.from("profiles").select("subscription_status").eq("id", userId).single(),
    supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }).eq("user_id", userId).neq("status", "archived"),
  ])

  const isFreeTier = !profile?.subscription_status || profile.subscription_status !== "active"
  if (isFreeTier && (count ?? 0) >= FREE_TIER_JOB_LIMIT) {
    return {
      data: null,
      error: { message: "Free tier limit reached", limit: FREE_TIER_JOB_LIMIT, upgrade: true },
      status: 403,
    }
  }

  // FK ownership check on contract_id
  if (body.contract_id) {
    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("id")
      .eq("id", body.contract_id as string)
      .eq("user_id", userId)
      .single()

    if (!contract) {
      return { data: null, error: { message: "Contract not found" }, status: 404 }
    }
  }

  const allowed = pickAllowed(body)
  if (body.audition_id) allowed.audition_id = body.audition_id

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert({ ...allowed, user_id: userId } as any)
    .select()
    .single()

  // If created from an audition, backlink the job_id
  if (data && body.audition_id) {
    await supabaseAdmin
      .from("auditions")
      .update({ job_id: data.id })
      .eq("id", body.audition_id as string)
      .eq("user_id", userId)
  }

  return { data, error, status: error ? 500 : 201 }
}

/**
 * Auto-create a job when an audition status changes to "booked".
 * Idempotent: skips if a job already exists for this audition.
 */
export async function autoCreateJobFromAudition(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  auditionId: string,
) {
  // Check if job already exists for this audition
  const { data: existing } = await supabaseAdmin
    .from("jobs")
    .select("id")
    .eq("audition_id", auditionId)
    .single()

  if (existing) return { data: existing, error: null, created: false }

  // Get audition data to pre-populate
  const { data: audition } = await supabaseAdmin
    .from("auditions")
    .select("*")
    .eq("id", auditionId)
    .eq("user_id", userId)
    .single()

  if (!audition) return { data: null, error: { message: "Audition not found" }, created: false }

  return {
    ...await createJob(supabaseAdmin, userId, {
      audition_id: auditionId,
      title: audition.project_name,
      role_name: audition.role_name,
      location: audition.location,
      compensation: audition.compensation,
      project_type: "other",
    }),
    created: true,
  }
}

export async function updateJob(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  jobId: string,
  body: Record<string, unknown>,
) {
  // FK ownership check on contract_id if being changed
  if (body.contract_id) {
    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("id")
      .eq("id", body.contract_id as string)
      .eq("user_id", userId)
      .single()

    if (!contract) {
      return { data: null, error: { message: "Contract not found" }, status: 404 }
    }
  }

  const allowed = pickAllowed(body)
  allowed.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .update(allowed as any)
    .eq("id", jobId)
    .eq("user_id", userId)
    .select()
    .single()

  return { data, error }
}
