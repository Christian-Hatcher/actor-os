import { NextRequest, NextResponse } from "next/server"
import { defaultModelFor, testLLMConnection } from "@/lib/llm"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

/**
 * Authenticated probe of an LLM provider configuration. The client posts
 * { provider, model, baseUrl, apiKey } and we make one tiny chat call to
 * verify the credentials work.
 *
 * If `apiKey` is omitted (because the saved key is intentionally never
 * round-tripped back to the UI), we fall back to the user's stored
 * llm_api_key_encrypted so they can re-test without re-pasting.
 *
 * This route NEVER persists the key — Settings has a separate save action.
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
  if (provider !== "ollama" && provider !== "anthropic" && provider !== "openai") {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })
  }

  // Resolve key with fall-back to stored value.
  let apiKey = body.apiKey
  if (!apiKey) {
    const { data: profile } = await admin
      .from("profiles")
      .select("llm_api_key_encrypted, llm_provider")
      .eq("id", userData.user.id)
      .single()
    // Only reuse the stored key when the user is testing the SAME provider
    // they had configured — otherwise we'd send an Anthropic key to OpenAI.
    if (profile?.llm_provider === provider && profile.llm_api_key_encrypted) {
      apiKey = profile.llm_api_key_encrypted
    }
  }

  const result = await testLLMConnection({
    provider,
    model: body.model || defaultModelFor(provider),
    baseUrl: body.baseUrl,
    apiKey,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 })
  }
  return NextResponse.json({ ok: true, sample: result.sample })
}
