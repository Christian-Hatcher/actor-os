import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getProduction, createNote } from "@/lib/services/productions"

async function getAuthUserId() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  try {
    const data = await getProduction(admin, userId, id)
    return NextResponse.json(data)
  } catch (err) {
    console.error("GET /api/productions/[id] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  try {
    const body = await request.json()
    const data = await createNote(admin, userId, id, body.content)
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("POST /api/productions/[id] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
