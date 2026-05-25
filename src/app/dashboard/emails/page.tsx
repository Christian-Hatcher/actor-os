"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Loader2,
  Mail,
  ArrowRight,
} from "lucide-react"
import type { ParsedAudition } from "@/types"

export default function EmailReviewPage() {
  const [parsedEntries, setParsedEntries] = useState<ParsedAudition[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPendingReviews()
  }, [])

  async function fetchPendingReviews() {
    setLoading(true)

    const { data, error } = await supabase
      .from("parsed_auditions")
      .select(`
        *,
        casting_emails:email_id (*)
      `)
      .eq("needs_review", true)
      .eq("reviewed_by_user", false)
      .order("confidence_score", { ascending: false })

    if (!error && data) {
      setParsedEntries(data as unknown as ParsedAudition[])
    }
    setLoading(false)
  }

  async function handleApprove(parsedId: string, audId?: string) {
    setProcessing((prev) => new Set(prev).add(parsedId))

    try {
      const entry = parsedEntries.find((e) => e.id === parsedId)
      if (!entry) return

      const fields = entry.extracted_fields

      // Check if audition already created
      if (!audId && entry.audition_id) {
        audId = entry.audition_id
      }

      if (!audId) {
        // Create the audition
        const { data: audition, error: audError } = await supabase
          .from("auditions")
          .insert({
            user_id: entry.user_id,
            project_name: fields.project_name || "Unknown Project",
            role_name: fields.role_name,
            casting_director: fields.casting_director,
            agency: fields.agency,
            status: "submitted",
            location: fields.location,
            compensation: fields.compensation,
            notes: fields.notes || "Imported from email",
          })
          .select()
          .single()

        if (!audError && audition) {
          audId = audition.id
        }
      }

      // Update parsed entry
      await supabase
        .from("parsed_auditions")
        .update({
          needs_review: false,
          reviewed_by_user: true,
          reviewed_at: new Date().toISOString(),
          audition_id: audId || entry.audition_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsedId)

      // Update email status
      if (entry.email_id) {
        await supabase
          .from("casting_emails")
          .update({
            processing_status: "audition_created",
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.email_id)
      }

      fetchPendingReviews()
    } catch (err) {
      console.error("Approve failed:", err)
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(parsedId)
        return next
      })
    }
  }

  async function handleReject(parsedId: string) {
    setProcessing((prev) => new Set(prev).add(parsedId))

    try {
      await supabase
        .from("parsed_auditions")
        .update({
          needs_review: false,
          reviewed_by_user: true,
          reviewed_at: new Date().toISOString(),
          review_reason: "User rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsedId)

      fetchPendingReviews()
    } catch (err) {
      console.error("Reject failed:", err)
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(parsedId)
        return next
      })
    }
  }

  async function handleApproveAll() {
    if (!confirm(`Approve all ${parsedEntries.length} entries?`)) return

    for (const entry of parsedEntries) {
      await handleApprove(entry.id, entry.audition_id || undefined)
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Review Queue" text="Processing imported emails..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Review Queue"
        text="Review and approve audition data extracted from your casting emails."
      >
        {parsedEntries.length > 1 && (
          <Button variant="outline" onClick={handleApproveAll}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve All ({parsedEntries.length})
          </Button>
        )}
      </DashboardHeader>

      <div className="grid gap-4">
        {parsedEntries.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground max-w-md">
                No emails need review. New casting emails will appear here after
                syncing your Gmail.
              </p>
            </CardContent>
          </Card>
        )}

        {parsedEntries.map((entry) => {
          const fields = entry.extracted_fields
          const email = (entry as any).casting_emails
          const isProcessing = processing.has(entry.id)

          return (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-sm">
                        {email?.subject || "Unknown Subject"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Confidence {entry.confidence_score}%
                      </Badge>
                      <Badge
                        className={
                          entry.confidence_score >= 70
                            ? "bg-green-100 text-green-800"
                            : entry.confidence_score >= 40
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {entry.confidence_score >= 70
                          ? "High confidence"
                          : entry.confidence_score >= 40
                          ? "Medium confidence"
                          : "Low confidence"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {email?.received_at
                      ? new Date(email.received_at).toLocaleDateString()
                      : ""}
                  </div>
                </div>

                {entry.review_reason && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-yellow-700 bg-yellow-50 rounded p-2">
                    <AlertTriangle className="h-4 w-4" />
                    {entry.review_reason}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {fields.project_name && (
                    <div>
                      <p className="text-muted-foreground">Project</p>
                      <p className="font-medium">{fields.project_name}</p>
                    </div>
                  )}
                  {fields.role_name && (
                    <div>
                      <p className="text-muted-foreground">Role</p>
                      <p className="font-medium">{fields.role_name}</p>
                    </div>
                  )}
                  {fields.agency && (
                    <div>
                      <p className="text-muted-foreground">Agency</p>
                      <p className="font-medium">{fields.agency}</p>
                    </div>
                  )}
                  {fields.casting_director && (
                    <div>
                      <p className="text-muted-foreground">Casting Director</p>
                      <p className="font-medium">{fields.casting_director}</p>
                    </div>
                  )}
                  {fields.location && (
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium">{fields.location}</p>
                    </div>
                  )}
                  {fields.compensation && (
                    <div>
                      <p className="text-muted-foreground">Compensation</p>
                      <p className="font-medium">{fields.compensation}</p>
                    </div>
                  )}
                  {fields.deadline && (
                    <div>
                      <p className="text-muted-foreground">Deadline</p>
                      <p className="font-medium text-red-600">{fields.deadline}</p>
                    </div>
                  )}
                </div>

                {fields.notes && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Notes</p>
                    <p>{fields.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleApprove(entry.id, entry.audition_id || undefined)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Create Audition
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleReject(entry.id)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Not an Audition
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </DashboardShell>
  )
}
