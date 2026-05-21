import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const { contract_text, language = "en" } = await request.json()

  if (!contract_text || contract_text.length < 10) {
    return NextResponse.json(
      { error: "Contract text is too short" },
      { status: 400 }
    )
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an entertainment contract analysis assistant. Analyze the contract and return JSON with these fields:
          - summary: "2-3 sentence overview"
          - key_clauses: [{"title": "", "description": "", "risk_level": "low|medium|high", "section": ""}]
          - red_flags: [{"issue": "", "severity": "warning|danger", "advice": ""}]
          - questions_for_agent: ["question 1", "question 2"]
          - overall_risk: "low|medium|high"
          
          Language: ${language}`,
        },
        {
          role: "user",
          content: contract_text,
        },
      ],
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(completion.choices[0].message.content || "{}")
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI analysis failed"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
