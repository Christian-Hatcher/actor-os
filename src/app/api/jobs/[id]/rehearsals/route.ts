import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { listRehearsals, createRehearsal } from "@/lib/services/rehearsals"

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
    const data = await listRehearsals(admin, userId, id)
    return NextResponse.json(data)
  } catch (err) {
    console.error("GET /api/jobs/[id]/rehearsals error:", err)
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
    const data = await createRehearsal(admin, userId, { ...body, job_id: id })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("POST /api/jobs/[id]/rehearsals error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
