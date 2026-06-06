/**
 * LLM Provider Abstraction Layer
 *
 * Priority chain:
 *   1. User's own API key (stored in profiles.llm_settings)
 *   2. App-level env vars (LLM_LOW_PROVIDER etc.)
 *   3. Groq free tier (GROQ_API_KEY env var)
 *
 * Supports: groq (default), gemini, openai, anthropic, ollama
 */

export type LLMTier = "low" | "high"

export type LLMProvider = "gemini" | "openai" | "anthropic" | "ollama" | "groq"

export interface LLMSettings {
  provider: LLMProvider
  api_key: string
  model?: string
}

interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface LLMResponse {
  content: string
  model: string
  provider: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

// Default models per provider
const DEFAULT_MODELS: Record<LLMProvider, Record<LLMTier, string>> = {
  gemini: { low: "gemini-2.0-flash", high: "gemini-2.0-flash" },
  openai: { low: "gpt-4o-mini", high: "gpt-4o" },
  anthropic: { low: "claude-haiku-4-5-20251001", high: "claude-sonnet-4-6" },
  ollama: { low: "llama3.2:3b", high: "llama3.2:3b" },
  groq: { low: "llama-3.3-70b-versatile", high: "llama-3.3-70b-versatile" },
}

/**
 * Get LLM config for a tier, optionally using per-user settings.
 */
function getConfig(tier: LLMTier, userSettings?: LLMSettings | null) {
  // Priority 1: User's own key
  if (userSettings?.api_key && userSettings?.provider) {
    return {
      provider: userSettings.provider,
      model: userSettings.model || DEFAULT_MODELS[userSettings.provider]?.[tier] || DEFAULT_MODELS.gemini[tier],
      apiKey: userSettings.api_key,
      baseUrl: undefined as string | undefined,
    }
  }

  // Priority 2: App-level env vars
  const envProvider = process.env[`LLM_${tier.toUpperCase()}_PROVIDER`] as LLMProvider | undefined
  const envModel = process.env[`LLM_${tier.toUpperCase()}_MODEL`]
  const envKey = process.env[`LLM_${tier.toUpperCase()}_API_KEY`]
  const envBaseUrl = process.env[`LLM_${tier.toUpperCase()}_BASE_URL`]

  // Ollama needs no API key, just a base URL
  if (envProvider === "ollama") {
    return {
      provider: "ollama" as LLMProvider,
      model: envModel || DEFAULT_MODELS.ollama[tier],
      apiKey: "",
      baseUrl: envBaseUrl || "http://localhost:11434",
    }
  }

  if (envProvider && envKey) {
    return {
      provider: envProvider,
      model: envModel || DEFAULT_MODELS[envProvider]?.[tier] || DEFAULT_MODELS.gemini[tier],
      apiKey: envKey,
      baseUrl: envBaseUrl,
    }
  }

  // Priority 3: Groq free tier (default — generous: 30 req/min, Llama 3.3 70B)
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    return {
      provider: "groq" as LLMProvider,
      model: DEFAULT_MODELS.groq[tier],
      apiKey: groqKey,
      baseUrl: undefined,
    }
  }

  throw new Error(
    "No LLM provider configured. Set GROQ_API_KEY env var, or add your own key in Settings > AI Provider."
  )
}

async function callGemini(model: string, apiKey: string, messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
  // Gemini uses a different message format
  const systemInstruction = messages.find((m) => m.role === "system")?.content
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens },
  }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

  return {
    content: text,
    model,
    provider: "gemini",
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount,
      output_tokens: data.usageMetadata?.candidatesTokenCount,
    },
  }
}

async function callAnthropic(model: string, apiKey: string, messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
  const systemMessage = messages.find((m) => m.role === "system")
  const nonSystemMessages = messages.filter((m) => m.role !== "system")

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: nonSystemMessages,
  }
  if (systemMessage) {
    body.system = systemMessage.content
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return {
    content: data.content?.[0]?.text || "",
    model,
    provider: "anthropic",
    usage: {
      input_tokens: data.usage?.input_tokens,
      output_tokens: data.usage?.output_tokens,
    },
  }
}

async function callOpenAI(model: string, apiKey: string, messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return {
    content: data.choices?.[0]?.message?.content || "",
    model,
    provider: "openai",
    usage: {
      input_tokens: data.usage?.prompt_tokens,
      output_tokens: data.usage?.completion_tokens,
    },
  }
}

async function callOllama(model: string, baseUrl: string, messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
  // Use Ollama native API for thinking models (kimi, deepseek, qwq)
  // The OpenAI-compat endpoint doesn't separate thinking vs content well
  const isThinkingModel = model.includes("kimi") || model.includes("deepseek") || model.includes("qwq")

  if (isThinkingModel) {
    // Use native Ollama /api/chat which properly handles thinking models
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { num_predict: maxTokens },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Ollama error ${res.status}: ${text}`)
    }

    const data = await res.json()
    let content = data.message?.content || ""

    // If content is empty but there's thinking, try to extract JSON from thinking
    if (!content && data.message?.thinking) {
      const thinking = data.message.thinking
      const jsonStart = thinking.lastIndexOf("{")
      const jsonEnd = thinking.lastIndexOf("}")
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        content = thinking.substring(jsonStart, jsonEnd + 1)
      }
    }

    return {
      content,
      model,
      provider: "ollama",
      usage: {
        input_tokens: data.prompt_eval_count,
        output_tokens: data.eval_count,
      },
    }
  }

  // Standard OpenAI-compat endpoint for non-thinking models
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ollama error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return {
    content: data.choices?.[0]?.message?.content || "",
    model,
    provider: "ollama",
    usage: {
      input_tokens: data.usage?.prompt_tokens,
      output_tokens: data.usage?.completion_tokens,
    },
  }
}

async function callGroq(model: string, apiKey: string, messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return {
    content: data.choices?.[0]?.message?.content || "",
    model,
    provider: "groq",
    usage: {
      input_tokens: data.usage?.prompt_tokens,
      output_tokens: data.usage?.completion_tokens,
    },
  }
}

/**
 * Call an LLM.
 *
 * @param tier - "low" for cheap/fast tasks, "high" for complex reasoning
 * @param messages - Chat messages (system, user, assistant)
 * @param maxTokens - Max output tokens
 * @param userLLMSettings - Optional per-user LLM config from profiles.llm_settings
 */
export async function llm(
  tier: LLMTier,
  messages: LLMMessage[],
  maxTokens: number = 4000,
  userLLMSettings?: LLMSettings | null
): Promise<LLMResponse> {
  const config = getConfig(tier, userLLMSettings)

  switch (config.provider) {
    case "gemini":
      return callGemini(config.model, config.apiKey, messages, maxTokens)
    case "anthropic":
      return callAnthropic(config.model, config.apiKey, messages, maxTokens)
    case "openai":
      return callOpenAI(config.model, config.apiKey, messages, maxTokens)
    case "ollama":
      return callOllama(config.model, config.baseUrl || "http://localhost:11434", messages, maxTokens)
    case "groq":
      return callGroq(config.model, config.apiKey, messages, maxTokens)
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`)
  }
}
