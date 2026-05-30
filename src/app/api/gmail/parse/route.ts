import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { llm, type LLMSettings } from "@/lib/llm"
import {
  SYSTEM_PROMPT,
  DEFAULTS,
  buildUserPrompt,
  parseLLMResponse,
  validateParsedResult,
} from "@/lib/email-parser"

/**
 * LLM-powered casting email parser with structured output
 */
async function parseEmail(
  subject: string,
  body: string,
  fromAddress: string,
  userLLMSettings?: LLMSettings | null
) {
  try {
    const response = await llm("low", [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(fromAddress, subject, body) },
    ], 800, userLLMSettings)

    const parsed = parseLLMResponse(response.content)
    if (!parsed) {
      console.error("LLM returned unparseable response:", response.content.substring(0, 200))
      return DEFAULTS
    }

    return validateParsedResult(parsed)
  } catch (err) {
    console.error("LLM parse failed:", err)
    return DEFAULTS
  }
}

/**
 * POST /api/gmail/parse
 * Process pending casting emails and extract audition data.
 * Called automatically after sync, or manually by user.
 */
export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const body = await request.json().catch(() => ({}))
    const {
      user_id,
      connection_id,
      email_ids,
      auto_create = false,
      dry_run = false,
    } = body

    // Fetch pending emails (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    let query = supabaseAdmin
      .from("casting_emails")
      .select("*")
      .eq("processing_status", "pending")
      .gte("received_at", thirtyDaysAgo)

    if (email_ids?.length) {
      query = query.in("id", email_ids)
    } else if (connection_id) {
      query = query.eq("connection_id", connection_id)
    } else if (user_id) {
      query = query.eq("user_id", user_id)
    }

    query = query.limit(50)

    const { data: emails, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json({ error: "Failed to fetch pending emails" }, { status: 500 })
    }

    // Look up user's LLM settings
    const emailUserId = emails?.[0]?.user_id || user_id
    let userLLMSettings: LLMSettings | null = null
    if (emailUserId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("llm_settings")
        .eq("id", emailUserId)
        .single()
      if (profile?.llm_settings) {
        userLLMSettings = profile.llm_settings as unknown as LLMSettings
      }
    }

    if (!emails?.length) {
      return NextResponse.json({
        processed: 0,
        parsed: 0,
        created: 0,
        needs_review: 0,
        message: "No pending emails to parse",
      })
    }

    const results: any[] = []

    for (const email of emails) {
      try {
        const parsed = await parseEmail(
          email.subject,
          email.body_text || "",
          email.from_address,
          userLLMSettings
        )

        // If LLM says it's not a casting email, mark it and move on
        if (parsed.email_type === "irrelevant") {
          await supabaseAdmin
            .from("casting_emails")
            .update({
              is_casting_email: false,
              processing_status: "skipped",
              updated_at: new Date().toISOString(),
            })
            .eq("id", email.id)

          results.push({ email_id: email.id, status: "skipped", reason: "not_casting" })
          continue
        }

        // Determine if needs human review
        const needsReview = parsed.confidence < 70 || !parsed.project_name
        const reviewReason = parsed.confidence < 70
          ? `Low confidence (${parsed.confidence}%)`
          : !parsed.project_name
            ? "Could not extract project name"
            : ""

        const extractedFields = {
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
          summary: parsed.summary,
        }

        const { data: parsedRecord, error: parsedError } = await supabaseAdmin
          .from("parsed_auditions")
          .insert({
            user_id: email.user_id,
            email_id: email.id,
            source_email_id: email.id,
            confidence_score: parsed.confidence,
            parser_version: "llm-v3",
            extracted_fields: extractedFields,
            raw_snippets: [],
            needs_review: needsReview || !auto_create,
            review_reason: reviewReason,
          })
          .select()
          .single()

        if (parsedError) {
          console.error("Failed to save parsed audition:", parsedError)
          results.push({ email_id: email.id, status: "error", error: parsedError.message })
          continue
        }

        let auditionCreated = false
        let auditionId: string | null = null

        // Auto-create audition if high confidence
        if (auto_create && parsed.confidence >= 80 && !dry_run) {
          const { data: audition, error: auditionError } = await supabaseAdmin
            .from("auditions")
            .insert({
              user_id: email.user_id,
              project_name: parsed.project_name || "Unknown Project",
              role_name: parsed.role_name || "Unknown Role",
              casting_director: parsed.casting_director,
              agency: parsed.agency,
              status: "submitted",
              submitted_date: new Date().toISOString().split("T")[0],
              callback_date: parsed.callback_date,
              shoot_date: parsed.shoot_date,
              location: parsed.location,
              notes: parsed.notes,
              compensation: parsed.compensation,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (!auditionError && audition) {
            auditionCreated = true
            auditionId = audition.id
            await supabaseAdmin
              .from("parsed_auditions")
              .update({ audition_id: audition.id })
              .eq("id", parsedRecord.id)
          }
        }

        // Update email processing status
        await supabaseAdmin
          .from("casting_emails")
          .update({
            processing_status: auditionCreated ? "audition_created" : dry_run ? "pending" : "parsed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", email.id)

        results.push({
          email_id: email.id,
          status: "success",
          email_type: parsed.email_type,
          confidence: parsed.confidence,
          needs_review: needsReview || !auto_create,
          audition_created: auditionCreated,
          audition_id: auditionId,
          summary: parsed.summary,
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

        results.push({ email_id: email.id, status: "error", error: err.message })
      }
    }

    return NextResponse.json({
      processed: results.length,
      parsed: results.filter((r) => r.status === "success").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      created: results.filter((r) => r.audition_created).length,
      needs_review: results.filter((r) => r.status === "success" && r.needs_review).length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    })
  } catch (err: any) {
    console.error("Parse error:", err)
    return NextResponse.json({ error: err.message || "Parse failed" }, { status: 500 })
  }
}
