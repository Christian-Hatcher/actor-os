import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { createSupabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = user.id

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from("auditions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

const FREE_TIER_AUDITION_LIMIT = 10

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = user.id

  const supabaseAdmin = getSupabaseAdmin()

  // Free tier enforcement: check subscription status and audition count
  const [{ data: profile }, { count: auditionCount }] = await Promise.all([
    supabaseAdmin.from("profiles").select("subscription_status").eq("id", userId).single(),
    supabaseAdmin.from("auditions").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ])

  const isFreeTier = !profile?.subscription_status || profile.subscription_status !== "active"
  if (isFreeTier && (auditionCount ?? 0) >= FREE_TIER_AUDITION_LIMIT) {
    return NextResponse.json(
      { error: "Free tier limit reached", limit: FREE_TIER_AUDITION_LIMIT, current: auditionCount, upgrade: true },
      { status: 403 }
    )
  }

  const body = await request.json()

  // Allowlist fields to prevent injection of id, user_id, created_at, etc.
  const allowed = {
    project_name: body.project_name,
    role_name: body.role_name ?? null,
    casting_director: body.casting_director ?? null,
    agency: body.agency ?? null,
    status: body.status ?? "received",
    submitted_date: body.submitted_date ?? null,
    callback_date: body.callback_date ?? null,
    shoot_date: body.shoot_date ?? null,
    location: body.location ?? null,
    notes: body.notes ?? null,
    self_tape_url: body.self_tape_url ?? null,
    headshot_url: body.headshot_url ?? null,
    resume_url: body.resume_url ?? null,
    compensation: body.compensation ?? null,
    contract_url: body.contract_url ?? null,
    call_time: body.call_time ?? null,
    est_wrap_time: body.est_wrap_time ?? null,
    wrap_time: body.wrap_time ?? null,
    ot_rate_multiplier: body.ot_rate_multiplier ?? null,
  }

  const { data, error } = await supabaseAdmin
    .from("auditions")
    .insert({ ...allowed, user_id: userId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = user.id

  const { id, ...updates } = await request.json()

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from("auditions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = user.id

  const { id } = await request.json()

  const supabaseAdmin = getSupabaseAdmin()
  const { error } = await supabaseAdmin
    .from("auditions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
