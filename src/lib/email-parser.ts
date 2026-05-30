/**
 * Email parsing utilities — pure functions, no external dependencies.
 * Tested directly; used by /api/gmail/parse route.
 */

export interface ParsedEmailResult {
  email_type: "casting" | "callback" | "admin" | "irrelevant"
  project_name: string | null
  role_name: string | null
  casting_director: string | null
  agency: string | null
  location: string | null
  compensation: string | null
  deadline: string | null
  shoot_date: string | null
  callback_date: string | null
  notes: string | null
  summary: string | null
  confidence: number
}

export const DEFAULTS: ParsedEmailResult = {
  email_type: "irrelevant",
  project_name: null,
  role_name: null,
  casting_director: null,
  agency: null,
  location: null,
  compensation: null,
  deadline: null,
  shoot_date: null,
  callback_date: null,
  notes: null,
  summary: null,
  confidence: 0,
}

const VALID_EMAIL_TYPES = ["casting", "callback", "admin", "irrelevant"] as const

/**
 * Parse raw LLM text into a JSON object.
 * Handles markdown fences, trailing commas, and surrounding text.
 */
export function parseLLMResponse(raw: string): Record<string, any> | null {
  // Strip markdown fences
  let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*$/g, "").trim()

  // Find the JSON object
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1) return null

  cleaned = cleaned.substring(start, end + 1)

  // Fix trailing commas before closing braces (common LLM mistake)
  cleaned = cleaned.replace(/,\s*}/g, "}")

  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

/**
 * Validate and coerce a raw parsed object into a typed ParsedEmailResult.
 * Guarantees every field is present with the correct type.
 */
export function validateParsedResult(parsed: Record<string, any>): ParsedEmailResult {
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null

  return {
    email_type: VALID_EMAIL_TYPES.includes(parsed.email_type) ? parsed.email_type : "irrelevant",
    project_name: str(parsed.project_name),
    role_name: str(parsed.role_name),
    casting_director: str(parsed.casting_director),
    agency: str(parsed.agency),
    location: str(parsed.location),
    compensation: str(parsed.compensation),
    deadline: str(parsed.deadline),
    shoot_date: str(parsed.shoot_date),
    callback_date: str(parsed.callback_date),
    notes: str(parsed.notes),
    summary: str(parsed.summary),
    confidence: typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
      : 0,
  }
}

export const SYSTEM_PROMPT = `You are a casting email parser for a professional actor based in Tokyo, Japan. You receive emails that may be casting notices, audition invitations, self-tape requests, or unrelated messages.

Your job:
1. Determine if the email is a casting/audition opportunity
2. Extract structured data from casting emails
3. Translate Japanese content to English for the extracted fields

RULES:
- Respond with ONLY a JSON object. No markdown fences, no explanation, no text before or after.
- Every field must be present in the response. Use null for missing data, never omit a field.
- For "summary": write 1-2 sentences a busy actor can scan in 3 seconds. Lead with pay if mentioned, then what it is, then the deadline.
- For "email_type": classify as "casting" (audition/role opportunity), "callback" (follow-up to a previous audition), "admin" (scheduling, paperwork, logistics for an existing booking), or "irrelevant" (newsletters, promotions, unrelated).
- For "confidence": 90+ means you're very sure about the extracted data. 60-89 means some fields are guesses. Below 60 means you're unsure this is even a casting email.
- Dates should be in YYYY-MM-DD format when possible. If only month/day given, assume the current or next occurrence of that date.
- Compensation: keep the original currency and amount. "$500/day", "¥50,000", "3万円" are all fine.`

export const USER_PROMPT_TEMPLATE = `Parse this email:

FROM: {from}
SUBJECT: {subject}
BODY:
{body}

Respond with this exact JSON structure:
{"email_type":"casting|callback|admin|irrelevant","project_name":null,"role_name":null,"casting_director":null,"agency":null,"location":null,"compensation":null,"deadline":null,"shoot_date":null,"callback_date":null,"notes":null,"summary":null,"confidence":0}`

export function buildUserPrompt(from: string, subject: string, body: string): string {
  return USER_PROMPT_TEMPLATE
    .replace("{from}", from)
    .replace("{subject}", subject)
    .replace("{body}", body.substring(0, 4000))
}
