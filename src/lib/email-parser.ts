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

export const SYSTEM_PROMPT = `You are a casting email parser for a professional actor. You receive emails that may be casting notices, audition invitations, callbacks, inquiries, self-tape requests, or unrelated messages.

STEP 1 — READ THE SUBJECT LINE FIRST.
The subject line is the most reliable source for the project title and email type. Extract the project name from the subject before reading the body.

STEP 2 — CLASSIFY THE EMAIL.
- "casting": a new audition opportunity, role posting, or self-tape request
- "callback": a follow-up to a previous audition (you got called back)
- "inquiry": asking you to fill out forms, provide availability, confirm interest — NOT a confirmed audition yet
- "admin": scheduling, paperwork, logistics for an already-confirmed booking
- "irrelevant": newsletters, promotions, unrelated

STEP 3 — EXTRACT STRUCTURED DATA from the email body.

PLATFORM AWARENESS:
- Actors Access / Breakdown Services: project title is usually in the subject after "Breakdown:" or "Audition:". Role details are in structured blocks.
- Backstage: subject often starts with "New Casting Notice:" or "Audition Alert:". Body has structured fields.
- Casting Networks / LA Casting: subject often has "Casting Notice" or "Audition". Body uses tables or labeled fields.
- Direct emails from agents/CDs: less structured — scan for project name, dates, and instructions.

RULES:
- Respond with ONLY a JSON object. No markdown fences, no explanation, no text before or after.
- Every field must be present in the response. Use null for missing data, never omit a field.
- "project_name": The title of the project/show/film/commercial. This is the MOST important field. Extract from subject line first, body second.
- "submission_deadline": When the actor must submit by (separate from shoot/callback dates). Common in Actors Access and Backstage listings.
- "action_required": One short phrase describing what the actor needs to DO. Examples: "Submit self-tape by Friday", "Fill out availability form", "Confirm callback attendance", "Upload headshot to portal". null if no action needed.
- "source_platform": "actors_access", "backstage", "casting_networks", "direct", or "unknown"
- "summary": 1-2 sentences a busy actor can scan in 3 seconds. Lead with pay if mentioned, then what it is, then the deadline.
- "confidence": 90+ = very sure. 60-89 = some guesses. Below 60 = unsure this is even a casting email.
- Dates in YYYY-MM-DD format. If only month/day given, assume the current or next occurrence.
- Compensation: keep original currency and amount. "$500/day", "¥50,000", "3万円" are all fine.
- Translate Japanese content to English for extracted fields.`

export const USER_PROMPT_TEMPLATE = `Parse this email:

FROM: {from}
SUBJECT: {subject}
BODY:
{body}

Respond with this exact JSON structure:
{"email_type":"casting|callback|inquiry|admin|irrelevant","project_name":null,"role_name":null,"casting_director":null,"agency":null,"location":null,"compensation":null,"deadline":null,"submission_deadline":null,"shoot_date":null,"callback_date":null,"notes":null,"summary":null,"confidence":0,"source_platform":"actors_access|backstage|casting_networks|direct|unknown","action_required":null}`

export function buildUserPrompt(from: string, subject: string, body: string): string {
  return USER_PROMPT_TEMPLATE
    .replace("{from}", from)
    .replace("{subject}", subject)
    .replace("{body}", body.substring(0, 4000))
}
