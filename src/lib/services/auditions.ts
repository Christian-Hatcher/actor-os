import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { autoCreateJobFromAudition } from "@/lib/services/jobs"

const FREE_TIER_AUDITION_LIMIT = 10

/** Fields allowed on create/update to prevent injection of id, user_id, created_at, etc. */
const AUDITION_ALLOWED_FIELDS = [
  "project_name",
  "role_name",
  "casting_director",
  "agency",
  "status",
  "submitted_date",
  "callback_date",
  "shoot_date",
  "location",
  "notes",
  "self_tape_url",
  "headshot_url",
  "resume_url",
  "compensation",
  "contract_url",
  "call_time",
  "est_wrap_time",
  "wrap_time",
  "ot_rate_multiplier",
] as const

function pickAllowedFields(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of AUDITION_ALLOWED_FIELDS) {
    if (field in body) {
      result[field] = body[field] ?? null
    }
  }
  return result
}

export async function listAuditions(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("auditions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return { data, error }
}

export async function createAudition(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  body: Record<string, unknown>,
) {
  // Free tier enforcement
  const [{ data: profile }, { count: auditionCount }] = await Promise.all([
    supabaseAdmin.from("profiles").select("subscription_status").eq("id", userId).single(),
    supabaseAdmin.from("auditions").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ])

  const isFreeTier = !profile?.subscription_status || profile.subscription_status !== "active"
  if (isFreeTier && (auditionCount ?? 0) >= FREE_TIER_AUDITION_LIMIT) {
    return {
      data: null,
      error: {
        message: "Free tier limit reached",
        limit: FREE_TIER_AUDITION_LIMIT,
        current: auditionCount,
        upgrade: true,
      },
      status: 403,
    }
  }

  const allowed = pickAllowedFields(body)
  if (!allowed.status) allowed.status = "received"

  const { data, error } = await supabaseAdmin
    .from("auditions")
    .insert({ ...allowed, user_id: userId } as any)
    .select()
    .single()

  return { data, error, status: error ? 500 : 201 }
}

export async function updateAudition(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const allowed = pickAllowedFields(body)

  const { data, error } = await supabaseAdmin
    .from("auditions")
    .update(allowed as any)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()

  // Auto-create job when status changes to "booked"
  if (data && allowed.status === "booked") {
    await autoCreateJobFromAudition(supabaseAdmin, userId, id)
  }

  return { data, error }
}

export async function deleteAudition(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  id: string,
) {
  const { error } = await supabaseAdmin
    .from("auditions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  return { error }
}
