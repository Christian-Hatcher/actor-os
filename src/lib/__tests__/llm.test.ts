import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defaultBaseUrl, defaultModelFor, testLLMConnection } from "../llm"

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
