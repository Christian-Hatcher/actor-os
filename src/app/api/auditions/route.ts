import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getUserIdFromHeader(request: NextRequest): string | null {
  return request.headers.get("x-user-id")
}

export async function GET(request: NextRequest) {
  const userId = getUserIdFromHeader(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("auditions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromHeader(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabaseAdmin
    .from("auditions")
    .insert({ ...body, user_id: userId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const userId = getUserIdFromHeader(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, ...updates } = await request.json()

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
  const userId = getUserIdFromHeader(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await request.json()

  const { error } = await supabaseAdmin
    .from("auditions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
