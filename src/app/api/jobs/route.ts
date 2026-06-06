import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { createSupabaseServer } from "@/lib/supabase-server"
import { listJobs, createJob } from "@/lib/services/jobs"

async function getAuthUserId() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? undefined
  const project_type = searchParams.get("project_type") ?? undefined

  const { data, error } = await listJobs(getSupabaseAdmin(), userId, { status, project_type })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const result = await createJob(getSupabaseAdmin(), userId, body)

  if (result.status === 403 || result.status === 404) {
    return NextResponse.json({ error: (result.error as any).message }, { status: result.status })
  }
  if (result.error) {
    return NextResponse.json({ error: (result.error as any).message }, { status: 500 })
  }
  return NextResponse.json(result.data, { status: 201 })
}
