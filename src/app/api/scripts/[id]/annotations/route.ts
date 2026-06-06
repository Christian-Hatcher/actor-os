import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import {
  listAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from "@/lib/services/annotations"

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
    const data = await listAnnotations(admin, userId, id)
    return NextResponse.json(data)
  } catch (err) {
    console.error("GET /api/scripts/[id]/annotations error:", err)
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
    const data = await createAnnotation(admin, userId, { ...body, script_id: id })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("POST /api/scripts/[id]/annotations error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await params
  const admin = getSupabaseAdmin()

  try {
    const body = await request.json()
    const data = await updateAnnotation(admin, userId, body.id, body)
    return NextResponse.json(data)
  } catch (err) {
    console.error("PUT /api/scripts/[id]/annotations error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await params
  const admin = getSupabaseAdmin()

  try {
    const body = await request.json()
    const data = await deleteAnnotation(admin, userId, body.id)
    return NextResponse.json(data)
  } catch (err) {
    console.error("DELETE /api/scripts/[id]/annotations error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
