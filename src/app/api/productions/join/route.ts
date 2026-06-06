import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { joinProduction } from "@/lib/services/productions"

async function getAuthUserId() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts, try later" }, { status: 429 })
  }

  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getSupabaseAdmin()

  try {
    const body = await request.json()
    const data = await joinProduction(admin, userId, body.invite_code)
    return NextResponse.json(data, { status: 200 })
  } catch (err) {
    console.error("POST /api/productions/join error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
