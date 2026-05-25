/**
 * LLM Provider Abstraction Layer
 *
 * Three tiers:
 *   llm.low  — cheap/fast model (routine tasks, parsing, classification)
 *   llm.high — stronger model (contract analysis, deep reasoning)
 *   llm.human — escalation to actual person
 *
 * Provider is set via env vars. Defaults to Ollama (local).
 * Supports: ollama, anthropic, openai
 */

export type LLMTier = "low" | "high"

interface LLMConfig {
  provider: string
  model: string
  baseUrl: string
  apiKey?: string
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

function getConfig(tier: LLMTier): LLMConfig {
  const provider = process.env[`LLM_${tier.toUpperCase()}_PROVIDER`] || "ollama"
  const model = process.env[`LLM_${tier.toUpperCase()}_MODEL`] || (tier === "low" ? "llama3.2:3b" : "llama3.2:3b")
  const baseUrl = process.env[`LLM_${tier.toUpperCase()}_BASE_URL`] || "http://localhost:11434"
  const apiKey = process.env[`LLM_${tier.toUpperCase()}_API_KEY`]

  return { provider, model, baseUrl, apiKey }
}

async function callOllama(config: LLMConfig, messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
  const res = await fetch(`${config.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
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
  return {
    content: data.message?.content || "",
    model: config.model,
    provider: "ollama",
    usage: {
      input_tokens: data.prompt_eval_count,
      output_tokens: data.eval_count,
    },
  }
}

async function callAnthropic(config: LLMConfig, messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
  const systemMessage = messages.find((m) => m.role === "system")
  const nonSystemMessages = messages.filter((m) => m.role !== "system")

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: maxTokens,
    messages: nonSystemMessages,
  }
  if (systemMessage) {
    body.system = systemMessage.content
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey!,
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
    model: config.model,
    provider: "anthropic",
    usage: {
      input_tokens: data.usage?.input_tokens,
      output_tokens: data.usage?.output_tokens,
    },
  }
}

async function callOpenAI(config: LLMConfig, messages: LLMMessage[], maxTokens: number): Promise<LLMResponse> {
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return {
    content: data.choices?.[0]?.message?.content || "",
    model: config.model,
    provider: "openai",
    usage: {
      input_tokens: data.usage?.prompt_tokens,
      output_tokens: data.usage?.completion_tokens,
    },
  }
}

export async function llm(
  tier: LLMTier,
  messages: LLMMessage[],
  maxTokens: number = 4000
): Promise<LLMResponse> {
  const config = getConfig(tier)

  switch (config.provider) {
    case "ollama":
      return callOllama(config, messages, maxTokens)
    case "anthropic":
      return callAnthropic(config, messages, maxTokens)
    case "openai":
      return callOpenAI(config, messages, maxTokens)
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`)
  }
}
