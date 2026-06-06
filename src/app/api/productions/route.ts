import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { listProductions, createProduction } from "@/lib/services/productions"

async function getAuthUserId() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getSupabaseAdmin()

  try {
    const data = await listProductions(admin, userId)
    return NextResponse.json(data)
  } catch (err) {
    console.error("GET /api/productions error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getSupabaseAdmin()

  try {
    const body = await request.json()
    const data = await createProduction(admin, userId, body)
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("POST /api/productions error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
