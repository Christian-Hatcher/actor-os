import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { llmForUser } from "@/lib/llm"

// Contract analysis prompt template
const CONTRACT_ANALYSIS_PROMPT = `You are a legal analyst specializing in entertainment industry contracts. Analyze the following contract and extract structured information.

Contract text:
---
{contractText}
---

Provide your analysis in this exact JSON format:
{
  "summary": "2-3 sentence plain English summary of what this contract is about",
  "key_clauses": {
    "Payment Terms": "string",
    "Usage/Usage Rights": "string", 
    "Exclusivity": "string",
    "Term/Duration": "string",
    "Cancellation": "string",
    " any other key clause name": "string"
  },
  "red_flags": ["list of concerning clauses or missing protections"],
  "questions": ["questions the actor should ask their agent or lawyer"],
  "restrictions": [
    {
      "type": "nda|social_media_ban|bts_delay|exclusivity|non_compete|confidentiality|other",
      "description": "what is restricted",
      "applies_to": ["instagram", "linkedin", "facebook", "twitter"],
      "effective_date": "YYYY-MM-DD or null",
      "expiry_date": "YYYY-MM-DD or null"
    }
  ],
  "compensation": {
    "amount": "string with currency",
    "type": "fixed|daily|buyout|residual|other",
    "notes": "any compensation notes"
  },
  "schedule": {
    "shoot_dates": ["YYYY-MM-DD"],
    "location": "string",
    "call_times": "string or null",
    "duration_days": number or null
  },
  "overall_grade": "A|B|C|D|F based on fairness to actor",
  "grade_reasoning": "one sentence explaining the grade"
}

Be thorough but concise. If information is missing, use null or empty arrays. Do NOT make up information that isn't in the contract.`

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { contractId, contractText, fileUrl } = await request.json()

    if (!contractId) {
      return NextResponse.json({ error: "contractId required" }, { status: 400 })
    }

    // Get contract from DB to verify ownership
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Update status to analyzing
    await supabaseAdmin
      .from("contracts")
      .update({ status: "analyzing" })
      .eq("id", contractId)

    let textToAnalyze = contractText

    // If no text provided but fileUrl exists, try to extract
    if (!textToAnalyze && fileUrl) {
      // For now, we'll use the text extraction from the upload step
      // In production, you'd use a PDF extraction service
      textToAnalyze = "[PDF extraction not yet implemented. Please paste contract text.]"
    }

    if (!textToAnalyze || textToAnalyze.trim().length < 50) {
      return NextResponse.json(
        { error: "Contract text too short or missing. Please paste the contract text." },
        { status: 400 }
      )
    }

    // Call LLM for analysis. Use the contract owner's per-user provider
    // (Settings → AI Connection). Falls back to env-var defaults if they
    // haven't configured one.
    const llmResponse = await llmForUser("high", contract.user_id, [
      {
        role: "user",
        content: CONTRACT_ANALYSIS_PROMPT.replace("{contractText}", textToAnalyze),
      },
    ], 4000)

    const analysisText = llmResponse.content

    // Parse JSON from LLM response
    let analysis
    try {
      // LLMs sometimes wrap JSON in markdown code blocks
      const jsonMatch = analysisText.match(/```json\n?([\s\S]*?)\n?```/) ||
                        analysisText.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : analysisText
      analysis = JSON.parse(jsonString)
    } catch (parseErr) {
      console.error("Failed to parse LLM response as JSON:", analysisText)
      // Save raw response for debugging
      await supabaseAdmin.from("contract_analysis_logs").insert({
        contract_id: contractId,
        analysis_type: "initial",
        model_used: llmResponse.model,
        raw_response: analysisText,
        processing_time_ms: null,
      })
      return NextResponse.json(
        { error: "AI analysis produced invalid format. Raw response saved for review." },
        { status: 500 }
      )
    }

    // Save analysis log
    await supabaseAdmin.from("contract_analysis_logs").insert({
      contract_id: contractId,
      analysis_type: "initial",
      model_used: llmResponse.model,
      raw_response: JSON.stringify(analysis),
      processing_time_ms: null,
    })

    // Update contract with analysis results
    const { error: updateError } = await supabaseAdmin
      .from("contracts")
      .update({
        status: "reviewed",
        summary: analysis.summary,
        key_clauses: analysis.key_clauses,
        red_flags: analysis.red_flags,
        questions: analysis.questions,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", contractId)

    if (updateError) {
      throw new Error(`Failed to update contract: ${updateError.message}`)
    }

    // Insert restrictions
    if (analysis.restrictions && analysis.restrictions.length > 0) {
      const restrictions = analysis.restrictions.map((r: any) => ({
        contract_id: contractId,
        restriction_type: r.type,
        description: r.description,
        applies_to_platforms: r.applies_to || ["instagram", "linkedin", "facebook", "twitter"],
        effective_date: r.effective_date,
        expiry_date: r.expiry_date,
        is_active: true,
      }))

      await supabaseAdmin.from("contract_restrictions").insert(restrictions)
    }

    // Update auditions table if contract is linked to an audition
    if (analysis.compensation && analysis.schedule) {
      // Find auditions with matching project name
      const { data: auditions } = await supabaseAdmin
        .from("auditions")
        .select("id")
        .eq("user_id", contract.user_id)
        .ilike("project_name", `%${contract.title}%`)

      if (auditions && auditions.length > 0) {
        for (const audition of auditions) {
          await supabaseAdmin
            .from("auditions")
            .update({
              compensation: analysis.compensation.amount,
              shoot_date: analysis.schedule.shoot_dates?.[0] || null,
              contract_url: fileUrl || null,
            })
            .eq("id", audition.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      contractId,
      analysis: {
        summary: analysis.summary,
        key_clauses: analysis.key_clauses,
        red_flags: analysis.red_flags,
        questions: analysis.questions,
        overall_grade: analysis.overall_grade,
        grade_reasoning: analysis.grade_reasoning,
        compensation: analysis.compensation,
        schedule: analysis.schedule,
      },
    })
  } catch (err) {
    console.error("Contract analysis error:", err)
    const message = err instanceof Error ? err.message : "Analysis failed"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
