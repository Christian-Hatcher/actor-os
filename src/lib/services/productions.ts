import { randomUUID } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const FREE_TIER_PRODUCTION_LIMIT = 1

const PRODUCTION_ALLOWED_FIELDS = ["name", "description", "project_type"] as const

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of PRODUCTION_ALLOWED_FIELDS) {
    if (field in body) result[field] = body[field] ?? null
  }
  return result
}

export async function listProductions(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
) {
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("production_members")
    .select("production_id")
    .eq("user_id", userId)

  if (membershipError) return { data: null, error: membershipError }

  const productionIds = (memberships ?? []).map((m) => m.production_id)

  if (productionIds.length === 0) return { data: [], error: null }

  const { data, error } = await supabaseAdmin
    .from("productions")
    .select("*")
    .in("id", productionIds)
    .order("created_at", { ascending: false })

  return { data, error }
}

/**
 * Load production detail with members and notes in one batch.
 * Prevents N+1 queries on the detail page.
 */
export async function getProduction(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  productionId: string,
) {
  const [productionResult, membersResult, notesResult] = await Promise.all([
    supabaseAdmin
      .from("productions")
      .select("*")
      .eq("id", productionId)
      .single(),
    supabaseAdmin
      .from("production_members")
      .select("*, profiles(full_name, avatar_url)")
      .eq("production_id", productionId),
    supabaseAdmin
      .from("production_notes")
      .select("*, profiles(full_name, avatar_url)")
      .eq("production_id", productionId)
      .order("created_at", { ascending: false }),
  ])

  // Verify caller is a member
  const isMember = (membersResult.data ?? []).some((m) => m.user_id === userId)
  if (!isMember) {
    return {
      data: null,
      error: { message: "Not a member" },
      status: 403,
    }
  }

  return {
    production: productionResult.data,
    members: membersResult.data ?? [],
    notes: notesResult.data ?? [],
    error: productionResult.error || membersResult.error || notesResult.error,
  }
}

export async function createProduction(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  body: Record<string, unknown>,
) {
  // Free tier check
  const [{ data: profile }, { count }] = await Promise.all([
    supabaseAdmin.from("profiles").select("subscription_status").eq("id", userId).single(),
    supabaseAdmin
      .from("production_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role_label", "creator"),
  ])

  const isFreeTier = !profile?.subscription_status || profile.subscription_status !== "active"
  if (isFreeTier && (count ?? 0) >= FREE_TIER_PRODUCTION_LIMIT) {
    return {
      data: null,
      error: { message: "Free tier limit reached", limit: FREE_TIER_PRODUCTION_LIMIT, upgrade: true },
      status: 403,
    }
  }

  const invite_code = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
  const allowed = pickAllowed(body)

  const { data: production, error: insertError } = await supabaseAdmin
    .from("productions")
    .insert({ ...allowed, invite_code, created_by: userId } as any)
    .select()
    .single()

  if (insertError || !production) {
    return { data: null, error: insertError, status: 500 }
  }

  const { error: memberError } = await supabaseAdmin
    .from("production_members")
    .insert({ production_id: production.id, user_id: userId, role_label: "creator" })

  return { data: production, error: memberError, status: memberError ? 500 : 201 }
}

export async function joinProduction(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  inviteCode: string,
) {
  const { data: production, error: lookupError } = await supabaseAdmin
    .from("productions")
    .select("id")
    .eq("invite_code", inviteCode)
    .single()

  if (lookupError || !production) {
    return { data: null, error: { message: "Invalid invite code" }, status: 404 }
  }

  const { error: memberError } = await supabaseAdmin
    .from("production_members")
    .insert({ production_id: production.id, user_id: userId, role_label: "member" })

  // Unique constraint violation means already a member — treat as success
  if (memberError && memberError.code !== "23505") {
    return { data: null, error: memberError, status: 500 }
  }

  return { data: { production_id: production.id }, error: null, status: 200 }
}

export async function createNote(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  productionId: string,
  content: string,
) {
  // Verify membership
  const { data: membership } = await supabaseAdmin
    .from("production_members")
    .select("user_id")
    .eq("production_id", productionId)
    .eq("user_id", userId)
    .single()

  if (!membership) {
    return { data: null, error: { message: "Not a member" }, status: 403 }
  }

  const { data, error } = await supabaseAdmin
    .from("production_notes")
    .insert({ production_id: productionId, user_id: userId, content })
    .select()
    .single()

  return { data, error, status: error ? 500 : 201 }
}

export async function deleteNote(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  noteId: string,
) {
  const { error } = await supabaseAdmin
    .from("production_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId)

  return { error }
}
