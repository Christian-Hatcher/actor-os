import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { createSupabaseServer } from "@/lib/supabase-server"
import { getJobDetail, updateJob } from "@/lib/services/jobs"

async function getAuthUserId() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const result = await getJobDetail(getSupabaseAdmin(), userId, id)

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  if (!result.job) return NextResponse.json({ error: "Job not found" }, { status: 404 })
  return NextResponse.json(result)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const result = await updateJob(getSupabaseAdmin(), userId, id, body)

  if ((result as any).status === 404) {
    return NextResponse.json({ error: (result.error as any).message }, { status: 404 })
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(result.data)
}
