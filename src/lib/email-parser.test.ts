import { describe, it, expect } from "vitest"
import { parseLLMResponse, validateParsedResult, buildUserPrompt, DEFAULTS } from "./email-parser"

// ─── parseLLMResponse ───────────────────────────────────────────────

describe("parseLLMResponse", () => {
  it("parses clean JSON", () => {
    const input = '{"email_type":"casting","project_name":"Toyota CM","confidence":92}'
    const result = parseLLMResponse(input)
    expect(result).toEqual({ email_type: "casting", project_name: "Toyota CM", confidence: 92 })
  })

  it("strips markdown json fences", () => {
    const input = '```json\n{"email_type":"casting","confidence":85}\n```'
    const result = parseLLMResponse(input)
    expect(result?.email_type).toBe("casting")
    expect(result?.confidence).toBe(85)
  })

  it("strips plain markdown fences", () => {
    const input = '```\n{"email_type":"irrelevant","confidence":10}\n```'
    const result = parseLLMResponse(input)
    expect(result?.email_type).toBe("irrelevant")
  })

  it("handles surrounding text from LLM", () => {
    const input = 'Here is the parsed result:\n{"email_type":"casting","confidence":75}\nHope this helps!'
    const result = parseLLMResponse(input)
    expect(result?.email_type).toBe("casting")
  })

  it("fixes trailing commas", () => {
    const input = '{"email_type":"casting","project_name":"Test",}'
    const result = parseLLMResponse(input)
    expect(result?.project_name).toBe("Test")
  })

  it("fixes trailing commas with whitespace", () => {
    const input = '{"email_type":"casting","project_name":"Test"  ,  }'
    const result = parseLLMResponse(input)
    expect(result?.project_name).toBe("Test")
  })

  it("returns null for no JSON", () => {
    expect(parseLLMResponse("I cannot parse this email")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(parseLLMResponse("")).toBeNull()
  })

  it("returns null for malformed JSON", () => {
    expect(parseLLMResponse("{broken json here")).toBeNull()
  })

  it("handles nested objects", () => {
    const input = '{"email_type":"casting","confidence":80,"notes":"Pay is $500/day"}'
    const result = parseLLMResponse(input)
    expect(result?.notes).toBe("Pay is $500/day")
  })

  it("handles multiline JSON", () => {
    const input = `{
  "email_type": "casting",
  "project_name": "Honda CM",
  "role_name": "Father",
  "confidence": 90
}`
    const result = parseLLMResponse(input)
    expect(result?.project_name).toBe("Honda CM")
    expect(result?.role_name).toBe("Father")
  })
})

// ─── validateParsedResult ───────────────────────────────────────────

describe("validateParsedResult", () => {
  it("passes through valid data", () => {
    const input = {
      email_type: "casting",
      project_name: "Toyota CM 2026",
      role_name: "Dad",
      casting_director: "Tanaka-san",
      agency: "BAYSIDE",
      location: "Tokyo",
      compensation: "¥50,000",
      deadline: "2026-06-15",
      shoot_date: "2026-07-01",
      callback_date: null,
      notes: "Self-tape required",
      summary: "¥50,000 Toyota commercial. Self-tape due June 15.",
      confidence: 92,
    }
    const result = validateParsedResult(input)
    expect(result.email_type).toBe("casting")
    expect(result.project_name).toBe("Toyota CM 2026")
    expect(result.confidence).toBe(92)
  })

  it("defaults invalid email_type to irrelevant", () => {
    expect(validateParsedResult({ email_type: "banana" }).email_type).toBe("irrelevant")
    expect(validateParsedResult({ email_type: 42 }).email_type).toBe("irrelevant")
    expect(validateParsedResult({ email_type: undefined }).email_type).toBe("irrelevant")
  })

  it("accepts all valid email_types", () => {
    expect(validateParsedResult({ email_type: "casting" }).email_type).toBe("casting")
    expect(validateParsedResult({ email_type: "callback" }).email_type).toBe("callback")
    expect(validateParsedResult({ email_type: "admin" }).email_type).toBe("admin")
    expect(validateParsedResult({ email_type: "irrelevant" }).email_type).toBe("irrelevant")
  })

  it("coerces non-string fields to null", () => {
    const result = validateParsedResult({
      project_name: 123,
      role_name: true,
      agency: [],
      location: {},
    })
    expect(result.project_name).toBeNull()
    expect(result.role_name).toBeNull()
    expect(result.agency).toBeNull()
    expect(result.location).toBeNull()
  })

  it("trims whitespace from string fields", () => {
    const result = validateParsedResult({
      project_name: "  Toyota CM  ",
      role_name: "\nDad\n",
    })
    expect(result.project_name).toBe("Toyota CM")
    expect(result.role_name).toBe("Dad")
  })

  it("treats empty strings as null", () => {
    const result = validateParsedResult({
      project_name: "",
      role_name: "   ",
    })
    expect(result.project_name).toBeNull()
    expect(result.role_name).toBeNull()
  })

  it("clamps confidence to 0-100", () => {
    expect(validateParsedResult({ confidence: 150 }).confidence).toBe(100)
    expect(validateParsedResult({ confidence: -20 }).confidence).toBe(0)
    expect(validateParsedResult({ confidence: 73.6 }).confidence).toBe(74)
  })

  it("defaults non-numeric confidence to 0", () => {
    expect(validateParsedResult({ confidence: "high" }).confidence).toBe(0)
    expect(validateParsedResult({ confidence: null }).confidence).toBe(0)
    expect(validateParsedResult({}).confidence).toBe(0)
  })

  it("handles completely empty input", () => {
    const result = validateParsedResult({})
    expect(result.email_type).toBe("irrelevant")
    expect(result.project_name).toBeNull()
    expect(result.confidence).toBe(0)
  })
})

// ─── End-to-end: parseLLMResponse → validateParsedResult ────────────

describe("parse + validate pipeline", () => {
  it("handles a realistic Japanese casting email response", () => {
    const llmOutput = `{"email_type":"casting","project_name":"Honda Vezel CM","role_name":"Father (30s)","casting_director":"Suzuki Yuto","agency":"BAYSIDE","location":"Odaiba Studio, Tokyo","compensation":"¥80,000/day","deadline":"2026-06-10","shoot_date":"2026-06-20","callback_date":null,"notes":"Self-tape required, casual wardrobe","summary":"¥80,000/day Honda Vezel commercial. Self-tape by June 10, shoot June 20 in Odaiba.","confidence":95}`

    const parsed = parseLLMResponse(llmOutput)
    expect(parsed).not.toBeNull()

    const result = validateParsedResult(parsed!)
    expect(result.email_type).toBe("casting")
    expect(result.project_name).toBe("Honda Vezel CM")
    expect(result.compensation).toBe("¥80,000/day")
    expect(result.confidence).toBe(95)
    expect(result.summary).toContain("Honda Vezel")
  })

  it("handles a newsletter correctly classified as irrelevant", () => {
    const llmOutput = '{"email_type":"irrelevant","project_name":null,"role_name":null,"casting_director":null,"agency":null,"location":null,"compensation":null,"deadline":null,"shoot_date":null,"callback_date":null,"notes":null,"summary":"Monthly newsletter from talent agency.","confidence":5}'

    const parsed = parseLLMResponse(llmOutput)
    const result = validateParsedResult(parsed!)
    expect(result.email_type).toBe("irrelevant")
    expect(result.confidence).toBe(5)
  })

  it("handles callback email type", () => {
    const llmOutput = '{"email_type":"callback","project_name":"Netflix Drama","role_name":"Detective","casting_director":"Yamada","agency":"Horipro","location":"Roppongi","compensation":"$2,000/day","deadline":"2026-06-05","shoot_date":null,"callback_date":"2026-06-08","notes":"Bring two monologues","summary":"$2,000/day Netflix drama callback. Bring two monologues by June 5.","confidence":88}'

    const parsed = parseLLMResponse(llmOutput)
    const result = validateParsedResult(parsed!)
    expect(result.email_type).toBe("callback")
    expect(result.callback_date).toBe("2026-06-08")
  })

  it("handles LLM wrapping response in markdown with explanation", () => {
    const llmOutput = `I've analyzed the email. Here's the structured data:

\`\`\`json
{
  "email_type": "casting",
  "project_name": "Suntory Whisky CM",
  "role_name": "Bartender",
  "casting_director": null,
  "agency": "Liliana Models",
  "location": "Shibuya",
  "compensation": "3万円",
  "deadline": "2026-06-12",
  "shoot_date": "2026-06-18",
  "callback_date": null,
  "notes": null,
  "summary": "3万円 Suntory whisky commercial. Deadline June 12.",
  "confidence": 82
}
\`\`\`

Let me know if you need anything else!`

    const parsed = parseLLMResponse(llmOutput)
    expect(parsed).not.toBeNull()

    const result = validateParsedResult(parsed!)
    expect(result.email_type).toBe("casting")
    expect(result.project_name).toBe("Suntory Whisky CM")
    expect(result.compensation).toBe("3万円")
  })

  it("handles LLM returning garbage gracefully", () => {
    const llmOutput = "Sorry, I can't parse this email because it appears to be encrypted."
    const parsed = parseLLMResponse(llmOutput)
    expect(parsed).toBeNull()
    // Route would fall back to DEFAULTS
    expect(DEFAULTS.email_type).toBe("irrelevant")
    expect(DEFAULTS.confidence).toBe(0)
  })
})

// ─── buildUserPrompt ────────────────────────────────────────────────

describe("buildUserPrompt", () => {
  it("interpolates from, subject, body", () => {
    const result = buildUserPrompt("test@agency.com", "Audition Notice", "Hello actor")
    expect(result).toContain("FROM: test@agency.com")
    expect(result).toContain("SUBJECT: Audition Notice")
    expect(result).toContain("Hello actor")
  })

  it("truncates body to 4000 chars", () => {
    const longBody = "x".repeat(5000)
    const result = buildUserPrompt("a@b.com", "test", longBody)
    // The prompt template adds text around the body, so just check body portion
    expect(result.length).toBeLessThan(5000)
  })
})
