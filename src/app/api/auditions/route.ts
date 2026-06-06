import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { createSupabaseServer } from "@/lib/supabase-server"
import {
  listAuditions,
  createAudition,
  updateAudition,
  deleteAudition,
} from "@/lib/services/auditions"

async function getAuthUserId() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await listAuditions(getSupabaseAdmin(), userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const result = await createAudition(getSupabaseAdmin(), userId, body)

  if (result.status === 403) {
    return NextResponse.json(
      { error: "Free tier limit reached", ...result.error },
      { status: 403 },
    )
  }
  if (result.error) {
    return NextResponse.json({ error: (result.error as any).message }, { status: 500 })
  }
  return NextResponse.json(result.data, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, ...body } = await request.json()
  const { data, error } = await updateAudition(getSupabaseAdmin(), userId, id, body)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await request.json()
  const { error } = await deleteAudition(getSupabaseAdmin(), userId, id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
