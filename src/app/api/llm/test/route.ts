import { NextRequest, NextResponse } from "next/server"
import { testLLMConnection } from "@/lib/llm"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

/**
 * Authenticated probe of an LLM provider configuration. The client posts
 * { provider, model, baseUrl, apiKey } and we make one tiny chat call to
 * verify the credentials work. The key is never persisted from this
 * route — that happens via the Settings page's separate save action.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 })
  }
  const admin = getSupabaseAdmin()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  let body: {
    provider?: string
    model?: string
    baseUrl?: string
    apiKey?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 })
  }

  const provider = body.provider
  const model = body.model
  if (provider !== "ollama" && provider !== "anthropic" && provider !== "openai") {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })
  }
  if (!model) {
    return NextResponse.json({ error: "Missing model" }, { status: 400 })
  }

  const result = await testLLMConnection({
    provider,
    model,
    baseUrl: body.baseUrl,
    apiKey: body.apiKey,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 })
  }
  return NextResponse.json({ ok: true, sample: result.sample })
}
