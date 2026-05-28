import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  _clearLLMProfileCache,
  defaultBaseUrl,
  defaultModelFor,
  llmForUser,
  testLLMConnection,
} from "../llm"

// Hoisted so vi.mock can see them — the factory runs before module imports.
const { singleSpy, anthropicFetchSpy } = vi.hoisted(() => ({
  singleSpy: vi.fn(),
  anthropicFetchSpy: vi.fn(),
}))

vi.mock("../supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: singleSpy,
        }),
      }),
    }),
  }),
}))

describe("defaultBaseUrl", () => {
  it("maps known providers", () => {
    expect(defaultBaseUrl("ollama")).toBe("http://localhost:11434")
    expect(defaultBaseUrl("anthropic")).toBe("https://api.anthropic.com")
    expect(defaultBaseUrl("openai")).toBe("https://api.openai.com")
  })
  it("falls back to local Ollama for unknowns", () => {
    expect(defaultBaseUrl("???")).toBe("http://localhost:11434")
  })
})

describe("defaultModelFor", () => {
  it("Anthropic uses Haiku for low / Sonnet for high", () => {
    expect(defaultModelFor("anthropic", "low")).toBe("claude-haiku-4-5-20251001")
    expect(defaultModelFor("anthropic", "high")).toBe("claude-sonnet-4-6")
  })
  it("OpenAI uses 4o-mini for low / 4o for high", () => {
    expect(defaultModelFor("openai", "low")).toBe("gpt-4o-mini")
    expect(defaultModelFor("openai", "high")).toBe("gpt-4o")
  })
  it("Ollama always uses llama3.2:3b", () => {
    expect(defaultModelFor("ollama", "low")).toBe("llama3.2:3b")
    expect(defaultModelFor("ollama", "high")).toBe("llama3.2:3b")
  })
  it("Unknown providers fall back to ollama default (so we don't send a llama-model name to Anthropic)", () => {
    // The point of this regression test: BEFORE the fix, llmForUser used
    // 'llama3.2:3b' for ALL providers when no model was set. After the fix,
    // each provider gets its own default — and an unknown provider is a
    // bug upstream, so falling back to llama is fine (we wouldn't reach
    // callProvider anyway, since the switch hits `default: throw`).
    expect(defaultModelFor("nope", "low")).toBe("llama3.2:3b")
  })
})

describe("testLLMConnection", () => {
  const realFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })
  afterEach(() => {
    global.fetch = realFetch
    vi.restoreAllMocks()
  })

  it("Ollama call sends Authorization header when apiKey is provided (B1 regression)", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "OK" } }),
    } as Response)

    await testLLMConnection({
      provider: "ollama",
      model: "llama3.2:3b",
      baseUrl: "https://ollama-cloud.example",
      apiKey: "sk-test-ollama-cloud",
    })

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://ollama-cloud.example/api/chat")
    const headers = init.headers as Record<string, string>
    expect(headers["Authorization"]).toBe("Bearer sk-test-ollama-cloud")
  })

  it("Ollama call omits Authorization header when no apiKey (local Ollama path)", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "OK" } }),
    } as Response)

    await testLLMConnection({
      provider: "ollama",
      model: "llama3.2:3b",
    })

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers["Authorization"]).toBeUndefined()
  })

  it("returns { ok: false, error } when the provider call fails", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "bad key",
    } as Response)

    const result = await testLLMConnection({
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      apiKey: "sk-bogus",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/Anthropic error 401/)
    }
  })

  it("returns { ok: true, sample } on success", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: "OK" }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    } as Response)

    const result = await testLLMConnection({
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      apiKey: "sk-ant-good",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.sample).toBe("OK")
    }
  })
})

describe("llmForUser profile cache (PHASE2 §B2)", () => {
  const realFetch = global.fetch

  beforeEach(() => {
    _clearLLMProfileCache()
    singleSpy.mockReset()
    anthropicFetchSpy.mockReset()
    // Profile lookup returns an Anthropic-configured user. We pick
    // Anthropic so the call goes to api.anthropic.com (where our
    // hoisted spy lives) and we don't accidentally hit a real Ollama.
    singleSpy.mockResolvedValue({
      data: {
        llm_provider: "anthropic",
        llm_model: "claude-haiku-4-5-20251001",
        llm_base_url: null,
        llm_api_key_encrypted: "sk-test",
      },
      error: null,
    })
    // Successful Anthropic response shape so callProvider doesn't throw.
    anthropicFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: "OK" }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    } as Response)
    global.fetch = anthropicFetchSpy
  })
  afterEach(() => {
    global.fetch = realFetch
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("two consecutive calls with the same userId share a single profile lookup", async () => {
    await llmForUser("low", "user-abc", [{ role: "user", content: "ping" }], 16)
    await llmForUser("low", "user-abc", [{ role: "user", content: "ping" }], 16)
    expect(singleSpy).toHaveBeenCalledTimes(1)
    expect(anthropicFetchSpy).toHaveBeenCalledTimes(2)
  })

  it("different userIds get separate profile lookups", async () => {
    await llmForUser("low", "user-a", [{ role: "user", content: "ping" }], 16)
    await llmForUser("low", "user-b", [{ role: "user", content: "ping" }], 16)
    expect(singleSpy).toHaveBeenCalledTimes(2)
  })

  it("cache entry expires after 5 minutes", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    await llmForUser("low", "user-ttl", [{ role: "user", content: "ping" }], 16)
    expect(singleSpy).toHaveBeenCalledTimes(1)

    // Just under the TTL — still cached.
    vi.setSystemTime(new Date("2026-01-01T00:04:59Z"))
    await llmForUser("low", "user-ttl", [{ role: "user", content: "ping" }], 16)
    expect(singleSpy).toHaveBeenCalledTimes(1)

    // Past the TTL — re-fetches.
    vi.setSystemTime(new Date("2026-01-01T00:05:01Z"))
    await llmForUser("low", "user-ttl", [{ role: "user", content: "ping" }], 16)
    expect(singleSpy).toHaveBeenCalledTimes(2)
  })

  it("_clearLLMProfileCache forces a re-fetch on the next call", async () => {
    await llmForUser("low", "user-clr", [{ role: "user", content: "ping" }], 16)
    expect(singleSpy).toHaveBeenCalledTimes(1)
    _clearLLMProfileCache()
    await llmForUser("low", "user-clr", [{ role: "user", content: "ping" }], 16)
    expect(singleSpy).toHaveBeenCalledTimes(2)
  })
})
