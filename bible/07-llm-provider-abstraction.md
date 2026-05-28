# Chapter 7: LLM Provider Abstraction

Actor OS uses artificial intelligence for four features: contract analysis, email parsing, briefing composition (future), and contact description generation. All LLM calls go through a single abstraction layer that is provider-agnostic by design.

---

## The Iron Rule

**NEVER hardcode a provider.** The choice of Anthropic, OpenAI, or Ollama is a configuration default, not a code constraint. Any developer or operator can swap providers by changing environment variables. No code change is required.

---

## Three Tiers

The LLM abstraction defines two callable tiers and one escalation marker:

| Tier | Purpose | Default Model | When Used |
|------|---------|---------------|-----------|
| `llm.low` | Fast, cheap, routine tasks | `llama3.2:3b` (Ollama local) | Email parsing, contact description generation, casting email classification |
| `llm.high` | Strong reasoning, complex analysis | `llama3.2:3b` (Ollama local) | Contract analysis (grade A-F, red flags, clause extraction) |
| `llm.human` | Escalation to a real person | N/A (marker only) | Not invoked in code -- exists as a conceptual tier for future agent workflows |

In production with paid providers, a reasonable configuration would be:

| Tier | Anthropic | OpenAI |
|------|-----------|--------|
| `low` | Claude Haiku | GPT-4o-mini |
| `high` | Claude Sonnet | GPT-4o |

---

## Source Code

**File:** `src/lib/llm.ts`

### Types

```typescript
export type LLMTier = "low" | "high"

interface LLMConfig {
  provider: string   // "ollama" | "anthropic" | "openai"
  model: string      // Model identifier
  baseUrl: string    // API endpoint
  apiKey?: string    // API key (not needed for Ollama)
}

interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface LLMResponse {
  content: string           // The generated text
  model: string             // Which model was used
  provider: string          // Which provider was used
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}
```

### Configuration via Environment Variables

Each tier reads three environment variables:

```
LLM_LOW_PROVIDER=ollama        # or "anthropic" or "openai"
LLM_LOW_MODEL=llama3.2:3b     # Model identifier
LLM_LOW_BASE_URL=http://localhost:11434
LLM_LOW_API_KEY=               # Only needed for Anthropic/OpenAI

LLM_HIGH_PROVIDER=ollama
LLM_HIGH_MODEL=llama3.2:3b
LLM_HIGH_BASE_URL=http://localhost:11434
LLM_HIGH_API_KEY=
```

If environment variables are not set, defaults are: provider = `ollama`, model = `llama3.2:3b`, baseUrl = `http://localhost:11434`.

### Provider Implementations

#### Ollama

```
POST {baseUrl}/api/chat
Body: { model, messages, stream: false, options: { num_predict: maxTokens } }
```

Response: `data.message.content`

#### Anthropic

```
POST https://api.anthropic.com/v1/messages
Headers: x-api-key, anthropic-version: 2023-06-01
Body: { model, max_tokens, messages, system? }
```

System messages are extracted from the messages array and sent as a top-level `system` field (Anthropic API requirement). Response: `data.content[0].text`

#### OpenAI

```
POST {baseUrl}/v1/chat/completions
Headers: Authorization: Bearer {apiKey}
Body: { model, messages, max_tokens }
```

Response: `data.choices[0].message.content`

### Main Entry Point

```typescript
export async function llm(
  tier: LLMTier,
  messages: LLMMessage[],
  maxTokens: number = 4000
): Promise<LLMResponse>
```

This is the only function that consuming code calls. It resolves the config from environment variables, dispatches to the correct provider implementation, and returns a normalized response.

---

## Usage Map

| Feature | Tier | Max Tokens | Prompt Strategy |
|---------|------|------------|-----------------|
| Contract analysis | `high` | 4000 | Structured JSON prompt requesting summary, key clauses, red flags, questions, restrictions, compensation, schedule, overall grade (A-F), grade reasoning |
| Email parsing (LLM v2) | `low` | 1000 | Structured JSON prompt requesting project name, role, agency, location, compensation, dates, summary, confidence score |
| Contact description | `low` | 100 | "Write a 1-sentence professional description" with name, email domain, and subject line |
| Briefing composition | N/A | N/A | Currently deterministic (src/lib/briefing.ts). Future: `llm("low", ...)` for prose generation |

---

## Cost Considerations

### Ollama (Default -- Free)

Ollama runs models locally. Cost: $0. Requires a machine with enough RAM for the model (llama3.2:3b needs approximately 4 GB). Suitable for development and single-user deployment.

### Anthropic

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| Claude Haiku | $0.25/MTok | $1.25/MTok | Good for low tier |
| Claude Sonnet | $3/MTok | $15/MTok | Good for high tier |

Estimated per-user monthly cost (active actor with 20 emails parsed, 2 contracts analyzed):
- Low tier: ~$0.02 (20 parses * ~500 input tokens * $0.25/MTok)
- High tier: ~$0.10 (2 analyses * ~2000 input tokens * $3/MTok)
- Total: approximately $0.12 per active user per month

### OpenAI

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| GPT-4o-mini | $0.15/MTok | $0.60/MTok | Good for low tier |
| GPT-4o | $2.50/MTok | $10/MTok | Good for high tier |

Comparable per-user costs to Anthropic.

### Cost Control Strategies

1. **Default to Ollama** in development. No API costs during development.
2. **Cap the high tier** to contract analysis only. Never use the high tier for routine tasks.
3. **Regex fallback** for email parsing. If the LLM call fails, the regex parser produces results without any API cost.
4. **Future: usage-based pricing.** Monthly plan: 5 contract analyses free. Annual plan: 10 contract analyses free. Beyond that, pass through at cost or charge a small premium.

---

## Error Handling

All three provider implementations follow the same pattern:

1. Make the HTTP request.
2. If `!res.ok`, read the error text and throw: `"{Provider} error {status}: {text}"`.
3. The calling code catches errors and handles gracefully:
   - Contract analysis: saves the raw response to `contract_analysis_logs` for debugging, returns a 500 with "AI analysis produced invalid format."
   - Email parsing: falls back to the regex parser. The user never sees the failure.
   - Contact description: catches and logs silently. The contact is created without a description.

---

## Adding a New Provider

To add a new provider (for example, Google Gemini):

1. Add a `callGemini()` function to `src/lib/llm.ts` following the pattern of the existing three.
2. Add `case "gemini":` to the switch statement in the `llm()` function.
3. Set environment variables: `LLM_LOW_PROVIDER=gemini`, `LLM_LOW_MODEL=gemini-2.0-flash`, etc.

No other code changes are needed. The abstraction was designed to make provider addition a 15-minute task.
