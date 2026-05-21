"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import type { Contract } from "@/types"

const MOCK_CONTRACTS: Contract[] = [
  {
    id: "1",
    user_id: "user1",
    title: "Kamen Rider Toy Voice — BANDAI",
    file_url: "https://storage.example.com/contract1.pdf",
    status: "reviewed",
    summary: "Narration buyout agreement for toy voice work. Fixed fee of ¥150,000 with no residuals.",
    key_clauses: {
      "Buyout Type": "Full buyout — no residuals or reuse fees",
      "Usage": "Worldwide, all media, in perpetuity",
      "Payment Terms": "Net 30 after delivery",
      "Exclusivity": "Non-exclusive (can work with other toy brands)",
    },
    red_flags: [
      "No residuals for future use",
      "Perpetual usage rights without additional compensation",
    ],
    questions: [
      "Can I negotiate a reuse fee for subsequent years?",
      "Does 'all media' include streaming platforms not yet invented?",
    ],
    analyzed_at: "2026-03-10",
    created_at: "2026-03-05",
  },
  {
    id: "2",
    user_id: "user1",
    title: "LOST10 TBS Drama — Guest Star Agreement",
    file_url: "",
    status: "uploaded",
    summary: null,
    key_clauses: null,
    red_flags: null,
    questions: null,
    analyzed_at: null,
    created_at: "2026-05-18",
  },
]

export default function ContractsPage() {
  const [contracts] = useState<Contract[]>(MOCK_CONTRACTS)

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Contract Reader Agent"
        text="AI-powered contract analysis. Upload any agreement and get instant insights."
      />

      <div className="grid gap-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Upload a contract</p>
              <p className="text-sm text-muted-foreground">
                PDF, DOCX, or images. AI will analyze in under 60 seconds.
              </p>
            </div>
            <Button>Select File</Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {contracts.map((contract) => (
            <Card key={contract.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{contract.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {contract.created_at}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      contract.status === "reviewed"
                        ? "bg-green-100 text-green-800"
                        : contract.status === "analyzing"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  >
                    {contract.status === "reviewed" && (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Reviewed
                      </>
                    )}
                    {contract.status === "analyzing" && (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Analyzing
                      </>
                    )}
                    {contract.status === "uploaded" && "Uploaded"}
                  </Badge>
                </div>
              </CardHeader>

              {contract.status === "reviewed" && contract.summary && (
                <CardContent className="grid gap-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium">Summary</p>
                    <p className="text-sm text-muted-foreground">
                      {contract.summary}
                    </p>
                  </div>

                  {contract.key_clauses && (
                    <div>
                      <p className="text-sm font-medium mb-2">Key Clauses</p>
                      <div className="grid gap-2">
                        {Object.entries(contract.key_clauses).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between rounded-lg border p-2 text-sm"
                          >
                            <span className="font-medium">{key}</span>
                            <span className="text-muted-foreground">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {contract.red_flags && contract.red_flags.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <p className="text-sm font-medium text-red-800">
                          Red Flags
                        </p>
                      </div>
                      <ul className="list-inside list-disc text-sm text-red-700">
                        {contract.red_flags.map((flag) => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {contract.questions && contract.questions.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        Questions to Ask Your Agent
                      </p>
                      <ul className="list-inside list-disc text-sm text-blue-700">
                        {contract.questions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              )}

              {contract.status === "uploaded" && (
                <CardContent>
                  <Button className="w-full">
                    <Loader2 className="mr-2 h-4 w-4" />
                    Analyze with AI
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
