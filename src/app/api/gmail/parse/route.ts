import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Parse a Japanese casting email and extract audition details
 * Uses regex patterns + heuristics (v1 - AI parse will be v2)
 */
function parseCastingEmail(
  subject: string,
  body: string,
  fromAddress: string
): {
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
  confidence: number
} {
  const result = {
    project_name: null as string | null,
    role_name: null as string | null,
    casting_director: null as string | null,
    agency: null as string | null,
    location: null as string | null,
    compensation: null as string | null,
    deadline: null as string | null,
    shoot_date: null as string | null,
    callback_date: null as string | null,
    notes: null as string | null,
    confidence: 0,
  }

  let confidencePoints = 0

  // Detect agency from domain
  if (fromAddress.includes("bay-side.biz")) {
    result.agency = "BAYSIDE"
    confidencePoints += 20
  } else if (fromAddress.includes("lilianamodels.com")) {
    result.agency = "Liliana Models"
    confidencePoints += 20
  } else if (fromAddress.includes("horipro.co.jp")) {
    result.agency = "Horipro"
    confidencePoints += 20
  } else {
    // Extract domain as fallback
    const domainMatch = fromAddress.match(/@([^>\s)]+)/)
    if (domainMatch) {
      result.agency = domainMatch[1]
    }
  }

  // Extract cast from: "CAST:" or "Cast:"
  const castMatch = body.match(/(?:CAST|Cast)\s*[:：]\s*([^\n\r]+)/i)
  if (castMatch) {
    result.role_name = castMatch[1].trim()
    confidencePoints += 25
  }

  // Extract project from subject line patterns
  // Japanese casting: "【出演依頼】プロジェクト名" or "プロジェクト名 出演"
  const projectMatch =
    subject.match(/【([^】]+)】\s*(.+)/) ||
    subject.match(/\[(.+?)\]\s*(.+)/) ||
    subject.match(/(.+?)\s+(?:出演|audition|casting)/i)
  if (projectMatch) {
    result.project_name = projectMatch[2] || projectMatch[1]
    result.project_name = result.project_name.trim()
    confidencePoints += 20
  } else {
    // Use subject as fallback project name
    result.project_name = subject
      .replace(/\[.*?\]/g, "")
      .replace(/【.*?】/g, "")
      .replace(/(?:出演依頼|audition|casting|self.?tape)/gi, "")
      .trim()
  }

  // Extract compensation: "出演料" or "¥" or "$" or "USD" or "万円"
  const compMatch =
    body.match(/(?:出演料|報酬|fee|compensation)[：:]\s*([^\n\r]+)/i) ||
    body.match(/(\$[\d,]+(?:\.\d{2})?)/) ||
    body.match(/(¥[\d,]+(?:万)?円?)/) ||
    body.match(/((?:\d+[,\d]*\s*(?:万)?円))/)
  if (compMatch) {
    result.compensation = compMatch[1].trim()
    confidencePoints += 10
  }

  // Extract shoot date: "撮影" followed by date pattern
  const shootMatch =
    body.match(/(?:撮影日|Shoot Date| filming)[：:]\s*(\d{1,2}[\/.\-年]\d{1,2}[\/.\-月]?\d{0,2}[日月]?)/i) ||
    body.match(/(\d{4}[\/.\-年]\d{1,2}[\/.\-月]\d{1,2}[日月]?)/)
  if (shootMatch) {
    result.shoot_date = shootMatch[1].trim()
    confidencePoints += 10
  }

  // Extract deadline: "締切" or "Deadline" or date patterns
  const deadlineMatch =
    body.match(/(?:締切|締め切り|Deadline|期限)[\s：:]*(\d{1,2}[\/.\-月]\d{1,2}[日]?\s*(?:\d{1,2}[：:]\d{2})?)/i) ||
    body.match(/(\d{1,2}\/\d{1,2}(?:\s*\d{1,2}:\d{2})?)\s*(?:Deadline|締切|まで)/i)
  if (deadlineMatch) {
    result.deadline = deadlineMatch[1].trim()
    confidencePoints += 15
  }

  // Extract location
  const locMatch =
    body.match(/(?:場所|Location|Studio|撮影場所)[：:]\s*([^\n\r.{,]+)/i) ||
    body.match(/(横浜|東京|大阪|名古屋|スタジオ|Studio)/)
  if (locMatch) {
    result.location = locMatch[1].trim()
    confidencePoints += 5
  }

  // Extract casting director from signature patterns
  // Japanese: "担当" or name at bottom
  const sigMatch =
    body.match(/(?:担当|担当者|Casting Director)[：:]\s*([^\n\r<]+)/i) ||
    body.match(/\n\s*([^\n@]{2,20}[^\n]*(?:キャスティング|casting|model))\s*$/im)
  if (sigMatch) {
    result.casting_director = sigMatch[1].trim().substring(0, 50)
    confidencePoints += 5
  }

  // Extract notes: line mentioning "注意" or important info
  const notesMatch =
    body.match(/(?:注意|Important|Note)[：:]\s*([^\n\r]+)/i)
  if (notesMatch) {
    result.notes = notesMatch[1].trim()
  }

  // If no specific notes, use the first line of body
  if (!result.notes) {
    const firstLine = body.split("\n")[0]?.trim()
    if (firstLine && firstLine.length < 200) {
      result.notes = firstLine
    }
  }

  result.confidence = Math.min(confidencePoints, 100)
  return result
}

/**
 * Convert parsed fields into a proper audition row
 */
function buildAuditionFields(parsed: any, emailId: string, userId: string): any {
  // Extract deadline date for submitted_date
  let submittedDate = null
  if (parsed.deadline) {
    // Try to parse various date formats
    // For now, use current date if unparseable
    submittedDate = new Date().toISOString().split("T")[0]
  }

  return {
    user_id: userId,
    project_name: parsed.project_name || "Unknown Project",
    role_name: parsed.role_name || "Unknown Role",
    casting_director: parsed.casting_director,
    agency: parsed.agency,
    status: "submitted",
    submitted_date: submittedDate,
    callback_date: parsed.callback_date,
    shoot_date: parsed.shoot_date,
    location: parsed.location,
    notes: parsed.notes,
    compensation: parsed.compensation,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * POST /api/gmail/parse
 * Process pending casting emails and extract audition data
 * Called automatically after sync, or manually by user
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      user_id,
      connection_id,
      email_ids,
      auto_create = false, // If true, directly create auditions (confidence > 80)
      dry_run = false,
    } = body

    // Build query for pending emails
    let query = supabaseAdmin
      .from("casting_emails")
      .select("*")
      .eq("processing_status", "pending")
      .eq("is_casting_email", true)

    if (email_ids?.length) {
      query = query.in("id", email_ids)
    } else if (connection_id) {
      query = query.eq("connection_id", connection_id)
    } else if (user_id) {
      query = query.eq("user_id", user_id)
    } else {
      // No filter - process all pending (cron job mode)
    }

    query = query.limit(100) // Process max 100 at a time

    const { data: emails, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch pending emails" },
        { status: 500 }
      )
    }

    if (!emails?.length) {
      return NextResponse.json({
        processed: 0,
        parsed: 0,
        created: 0,
        needs_review: 0,
        message: "No pending casting emails to parse",
      })
    }

    const results: any[] = []

    for (const email of emails) {
      try {
        // Run parser
        const parsed = parseCastingEmail(
          email.subject,
          email.body_text || "",
          email.from_address
        )

        // Determine if needs review
        const needsReview = parsed.confidence < 70 || !parsed.project_name
        let reviewReason = ""

        if (parsed.confidence < 70) {
          reviewReason = `Low confidence (${parsed.confidence}%)`
        } else if (!parsed.project_name) {
          reviewReason = "Could not extract project name"
        }

        // Insert parsed_audition record
        const { data: parsedRecord, error: parsedError } = await supabaseAdmin
          .from("parsed_auditions")
          .insert({
            user_id: email.user_id,
            email_id: email.id,
            source_email_id: email.id,
            confidence_score: parsed.confidence,
            parser_version: "regex-v1",
            extracted_fields: JSON.stringify({
              project_name: parsed.project_name,
              role_name: parsed.role_name,
              casting_director: parsed.casting_director,
              agency: parsed.agency,
              location: parsed.location,
              compensation: parsed.compensation,
              deadline: parsed.deadline,
              shoot_date: parsed.shoot_date,
              callback_date: parsed.callback_date,
              notes: parsed.notes,
            }),
            raw_snippets: [],
            needs_review: needsReview || !auto_create,
            review_reason: reviewReason,
          })
          .select()
          .single()

        if (parsedError) {
          console.error("Failed to save parsed audition:", parsedError)
          results.push({
            email_id: email.id,
            status: "error",
            error: parsedError.message,
          })
          continue
        }

        let auditionCreated = false
        let auditionId: string | null = null

        // Auto-create audition if confidence is high and auto_create is true
        if (auto_create && parsed.confidence >= 80 && !dry_run) {
          const auditionFields = buildAuditionFields(
            parsed,
            email.id,
            email.user_id
          )

          const { data: audition, error: auditionError } = await supabaseAdmin
            .from("auditions")
            .insert(auditionFields)
            .select()
            .single()

          if (!auditionError && audition) {
            auditionCreated = true
            auditionId = audition.id

            // Link parsed record to audition
            await supabaseAdmin
              .from("parsed_auditions")
              .update({ audition_id: audition.id })
              .eq("id", parsedRecord.id)
          }
        }

        // Update email status
        const newStatus = auditionCreated ? "audition_created" : dry_run ? "pending" : "parsed"

        await supabaseAdmin
          .from("casting_emails")
          .update({
            processing_status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", email.id)

        results.push({
          email_id: email.id,
          status: "success",
          confidence: parsed.confidence,
          needs_review: needsReview || !auto_create,
          audition_created: auditionCreated,
          audition_id: auditionId,
          fields: {
            project_name: parsed.project_name,
            role_name: parsed.role_name,
            agency: parsed.agency,
          },
        })
      } catch (err: any) {
        console.error(`Failed to parse email ${email.id}:`, err)

        await supabaseAdmin
          .from("casting_emails")
          .update({
            processing_status: "error",
            parsing_error: err.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", email.id)

        results.push({
          email_id: email.id,
          status: "error",
          error: err.message,
        })
      }
    }

    const summary = {
      processed: results.length,
      parsed: results.filter((r) => r.status === "success").length,
      created: results.filter((r) => r.audition_created).length,
      needs_review: results.filter(
        (r) => r.status === "success" && r.needs_review
      ).length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    }

    return NextResponse.json(summary)
  } catch (err: any) {
    console.error("Parse error:", err)
    return NextResponse.json(
      { error: err.message || "Parse failed" },
      { status: 500 }
    )
  }
}
