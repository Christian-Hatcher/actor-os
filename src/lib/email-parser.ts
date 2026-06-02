/**
 * Email parsing utilities — pure functions, no external dependencies.
 * Tested directly; used by /api/gmail/parse route.
 *
 * v4: Subject-first extraction, platform detection, inquiry type,
 *     submission_deadline, action_required.
 */

export interface ParsedEmailResult {
  email_type: "casting" | "callback" | "inquiry" | "admin" | "irrelevant"
  project_name: string | null
  role_name: string | null
  casting_director: string | null
  agency: string | null
  location: string | null
  compensation: string | null
  deadline: string | null
  submission_deadline: string | null
  shoot_date: string | null
  callback_date: string | null
  notes: string | null
  summary: string | null
  confidence: number
  source_platform: "actors_access" | "backstage" | "casting_networks" | "direct" | "unknown"
  action_required: string | null
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
  submission_deadline: null,
  shoot_date: null,
  callback_date: null,
  notes: null,
  summary: null,
  confidence: 0,
  source_platform: "unknown",
  action_required: null,
}

const VALID_EMAIL_TYPES = ["casting", "callback", "inquiry", "admin", "irrelevant"] as const
const VALID_PLATFORMS = ["actors_access", "backstage", "casting_networks", "direct", "unknown"] as const

/**
 * Detect the source platform from email headers before LLM parsing.
 * This is deterministic — no LLM needed.
 */
export function detectPlatform(
  fromAddress: string,
  subject: string,
  body: string
): ParsedEmailResult["source_platform"] {
  const all = `${fromAddress} ${subject} ${body}`.toLowerCase()

  if (all.includes("actorsaccess") || all.includes("actors access") || all.includes("breakdownservices") || all.includes("breakdown services"))
    return "actors_access"
  if (all.includes("backstage.com") || all.includes("backstage casting"))
    return "backstage"
  if (all.includes("castingnetworks") || all.includes("casting networks") || all.includes("lacasting"))
    return "casting_networks"

  // If it's from a personal email or agency domain, treat as direct
  if (!all.includes("noreply") && !all.includes("no-reply") && !all.includes("mailer-daemon"))
    return "direct"

  return "unknown"
}

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
export function validateParsedResult(
  parsed: Record<string, any>,
  detectedPlatform?: ParsedEmailResult["source_platform"]
): ParsedEmailResult {
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
    submission_deadline: str(parsed.submission_deadline),
    shoot_date: str(parsed.shoot_date),
    callback_date: str(parsed.callback_date),
    notes: str(parsed.notes),
    summary: str(parsed.summary),
    confidence: typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
      : 0,
    source_platform: VALID_PLATFORMS.includes(parsed.source_platform)
      ? parsed.source_platform
      : detectedPlatform ?? "unknown",
    action_required: str(parsed.action_required),
  }
}

// Quick pass: classify + grab basics. ~5 fields, fast.
export const SYSTEM_PROMPT = `Classify this email and extract basics. Respond with ONLY a JSON object — no explanation, no markdown.

Types: "casting" (new audition/role/self-tape), "callback", "inquiry" (availability check, form), "admin" (logistics), "irrelevant"

Extract project_name from the subject line. Translate Japanese to English. Dates as YYYY-MM-DD.`

export const USER_PROMPT_TEMPLATE = `FROM: {from}
SUBJECT: {subject}
BODY:
{body}

{"email_type":"","project_name":null,"agency":null,"deadline":null,"summary":null,"confidence":0,"action_required":null}`

// Deep pass: full extraction for confirmed casting emails. Called on demand.
export const DEEP_SYSTEM_PROMPT = `Extract full details from this casting email. Respond with ONLY a JSON object.

Rules:
- Dates as YYYY-MM-DD. Keep original currency for compensation.
- Translate Japanese to English. Use null for missing fields.`

export const DEEP_USER_PROMPT_TEMPLATE = `FROM: {from}
SUBJECT: {subject}
BODY:
{body}

{"project_name":null,"role_name":null,"casting_director":null,"agency":null,"location":null,"compensation":null,"deadline":null,"submission_deadline":null,"shoot_date":null,"callback_date":null,"notes":null,"summary":null,"confidence":0,"source_platform":"actors_access|backstage|casting_networks|direct|unknown","action_required":null}`

export function buildUserPrompt(from: string, subject: string, body: string): string {
  return USER_PROMPT_TEMPLATE
    .replace("{from}", from)
    .replace("{subject}", subject)
    .replace("{body}", body.substring(0, 1500))
}

export function buildDeepUserPrompt(from: string, subject: string, body: string): string {
  return DEEP_USER_PROMPT_TEMPLATE
    .replace("{from}", from)
    .replace("{subject}", subject)
    .replace("{body}", body.substring(0, 4000))
}
