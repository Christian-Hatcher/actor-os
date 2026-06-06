import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { llm, type LLMSettings } from "@/lib/llm"
import {
  SYSTEM_PROMPT,
  DEEP_SYSTEM_PROMPT,
  DEFAULTS,
  buildUserPrompt,
  buildDeepUserPrompt,
  parseLLMResponse,
  validateParsedResult,
  detectPlatform,
} from "@/lib/email-parser"

/**
 * Quick pass: classify email + grab basics (~500 chars of body, small prompt)
 */
async function parseEmail(
  subject: string,
  body: string,
  fromAddress: string,
  userLLMSettings?: LLMSettings | null,
  isTrustedSource?: boolean
) {
  const detectedPlatform = detectPlatform(fromAddress, subject, body)

  const trustedHint = isTrustedSource
    ? " This is from a TRUSTED CASTING SOURCE — default to 'casting' unless clearly admin."
    : ""

  try {
    const response = await llm("low", [
      { role: "system", content: SYSTEM_PROMPT + trustedHint },
      { role: "user", content: buildUserPrompt(fromAddress, subject, body) },
    ], 2000, userLLMSettings)

    const parsed = parseLLMResponse(response.content)
    if (!parsed) {
      console.error("LLM returned unparseable response:", response.content.substring(0, 200))
      return DEFAULTS
    }

    return validateParsedResult(parsed, detectedPlatform)
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
  // --- Dual auth: cron secret OR authenticated user session ---
  const authHeader = request.headers.get("authorization")
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  let authenticatedUserId: string | null = null

  if (!isCron) {
    const { createSupabaseServer } = await import("@/lib/supabase-server")
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    authenticatedUserId = user.id
  }

  const supabaseAdmin = getSupabaseAdmin()
  try {
    const body = await request.json().catch(() => ({}))
    let {
      user_id,
      connection_id,
      email_ids,
      auto_create = false,
      dry_run = false,
    } = body

    // If user-triggered, override user_id with authenticated user's ID
    if (authenticatedUserId) {
      user_id = authenticatedUserId
    }

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

    // Small batches so the UI returns fast. Cron picks up the rest.
    query = query.order("received_at", { ascending: false }).limit(3)

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
          userLLMSettings,
          email.is_casting_email
        )

        // If LLM says it's not a casting email AND it wasn't flagged as trusted source, skip it
        if (parsed.email_type === "irrelevant" && !email.is_casting_email) {
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

        // Trusted source override: if LLM said irrelevant but it's from a trusted source,
        // treat it as a casting email and default to "casting" type
        if (parsed.email_type === "irrelevant" && email.is_casting_email) {
          parsed.email_type = "casting"
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
          submission_deadline: parsed.submission_deadline,
          shoot_date: parsed.shoot_date,
          callback_date: parsed.callback_date,
          notes: parsed.notes,
          summary: parsed.summary,
          source_platform: parsed.source_platform,
          email_type: parsed.email_type,
          action_required: parsed.action_required,
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
        let auditionUpdated = false
        let auditionId: string | null = null

        // Thread-aware: check if another email in this thread already has an audition
        let existingAuditionId: string | null = null
        if (email.thread_id) {
          const { data: threadEmails } = await supabaseAdmin
            .from("casting_emails")
            .select("id")
            .eq("thread_id", email.thread_id)
            .neq("id", email.id)

          if (threadEmails?.length) {
            const threadEmailIds = threadEmails.map((e: any) => e.id)
            const { data: linkedParsed } = await supabaseAdmin
              .from("parsed_auditions")
              .select("audition_id")
              .in("source_email_id", threadEmailIds)
              .not("audition_id", "is", null)
              .limit(1)

            if (linkedParsed?.[0]?.audition_id) {
              existingAuditionId = linkedParsed[0].audition_id
            }
          }
        }

        const isActionable = parsed.email_type === "casting" || parsed.email_type === "callback" || parsed.email_type === "inquiry"
        const hasEnoughData = parsed.project_name || (email.is_casting_email && parsed.summary)

        if (auto_create && !dry_run && existingAuditionId) {
          // UPDATE existing audition — this email is a thread follow-up
          // Build update payload — append new info to existing audition
          const newNote = [parsed.action_required ? `Update: ${parsed.action_required}` : null, parsed.summary].filter(Boolean).join("\n")
          let mergedNotes: string | undefined
          if (newNote) {
            const { data: existing } = await supabaseAdmin
              .from("auditions")
              .select("notes")
              .eq("id", existingAuditionId)
              .single()
            mergedNotes = [existing?.notes, newNote].filter(Boolean).join("\n---\n")
          }

          await supabaseAdmin
            .from("auditions")
            .update({
              updated_at: new Date().toISOString(),
              ...(parsed.callback_date ? { callback_date: parsed.callback_date } : {}),
              ...(parsed.shoot_date ? { shoot_date: parsed.shoot_date } : {}),
              ...(parsed.location ? { location: parsed.location } : {}),
              ...(parsed.compensation ? { compensation: parsed.compensation } : {}),
              ...(parsed.role_name ? { role_name: parsed.role_name } : {}),
              ...(parsed.email_type === "callback" ? { status: "callback" } : {}),
              ...(mergedNotes ? { notes: mergedNotes } : {}),
            })
            .eq("id", existingAuditionId)

          auditionUpdated = true
          auditionId = existingAuditionId

          await supabaseAdmin
            .from("parsed_auditions")
            .update({ audition_id: existingAuditionId })
            .eq("id", parsedRecord.id)

        } else if (auto_create && isActionable && hasEnoughData && !dry_run) {
          // CREATE new audition — first email in thread or no thread match
          const auditionStatus = parsed.email_type === "callback" ? "callback" : "received"

          const { data: audition, error: auditionError } = await supabaseAdmin
            .from("auditions")
            .insert({
              user_id: email.user_id,
              project_name: parsed.project_name || parsed.summary?.split(".")[0] || email.subject,
              role_name: parsed.role_name || null,
              casting_director: parsed.casting_director,
              agency: parsed.agency,
              status: auditionStatus,
              submitted_date: new Date().toISOString().split("T")[0],
              callback_date: parsed.callback_date,
              shoot_date: parsed.shoot_date,
              location: parsed.location,
              notes: [parsed.notes, parsed.action_required ? `Action: ${parsed.action_required}` : null].filter(Boolean).join("\n"),
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
        const finalStatus = auditionCreated ? "audition_created"
          : auditionUpdated ? "audition_updated"
          : dry_run ? "pending" : "parsed"

        await supabaseAdmin
          .from("casting_emails")
          .update({
            processing_status: finalStatus,
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
          audition_updated: auditionUpdated,
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
      updated: results.filter((r) => r.audition_updated).length,
      needs_review: results.filter((r) => r.status === "success" && r.needs_review).length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    })
  } catch (err: any) {
    console.error("Parse error:", err)
    return NextResponse.json({ error: err.message || "Parse failed" }, { status: 500 })
  }
}
