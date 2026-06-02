"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Mail,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react"
import type { ParsedAudition } from "@/types"

export default function EmailReviewPage() {
  const [parsedEntries, setParsedEntries] = useState<ParsedAudition[]>([])
  const [processedEntries, setProcessedEntries] = useState<ParsedAudition[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [showProcessed, setShowProcessed] = useState(false)
  const hasFetched = useRef(false)

  const fetchPendingReviews = useCallback(async () => {
    setLoading(true)

    // Fetch both pending AND processed in parallel
    const [pendingResult, processedResult] = await Promise.all([
      supabase
        .from("parsed_auditions")
        .select("*")
        .eq("needs_review", true)
        .eq("reviewed_by_user", false)
        .order("confidence_score", { ascending: false }),
      supabase
        .from("parsed_auditions")
        .select("*")
        .eq("reviewed_by_user", true)
        .order("reviewed_at", { ascending: false })
        .limit(50),
    ])

    if (pendingResult.error) {
      console.error("Failed to fetch reviews:", pendingResult.error)
      setLoading(false)
      return
    }

    const allParsed = [...(pendingResult.data || []), ...(processedResult.data || [])]
    const emailIds = allParsed.map((p: any) => p.email_id).filter(Boolean)
    let emailMap: Record<string, any> = {}
    if (emailIds.length > 0) {
      const { data: emails } = await supabase
        .from("casting_emails")
        .select("*")
        .in("id", [...new Set(emailIds)])
      if (emails) {
        emailMap = Object.fromEntries(emails.map((e: any) => [e.id, e]))
      }
    }

    function enrich(entries: any[]) {
      return entries.map((p: any) => ({
        ...p,
        casting_emails: emailMap[p.email_id] || null,
      }))
    }

    setParsedEntries(enrich(pendingResult.data || []) as unknown as ParsedAudition[])
    setProcessedEntries(enrich(processedResult.data || []) as unknown as ParsedAudition[])
    setLoading(false)
    hasFetched.current = true
  }, [])

  useEffect(() => {
    if (!hasFetched.current) {
      fetchPendingReviews()
    }
  }, [fetchPendingReviews])

  function toggleExpanded(id: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleApprove(parsedId: string, audId?: string) {
    setProcessing((prev) => new Set(prev).add(parsedId))

    try {
      const entry = parsedEntries.find((e) => e.id === parsedId)
      if (!entry) return

      const fields = entry.extracted_fields

      if (!audId && entry.audition_id) {
        audId = entry.audition_id
      }

      if (!audId) {
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

      if (entry.email_id) {
        await supabase
          .from("casting_emails")
          .update({
            processing_status: "audition_created",
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.email_id)
      }

      setParsedEntries((prev) => prev.filter((e) => e.id !== parsedId))
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

  async function handleNeedsResponse(parsedId: string) {
    setProcessing((prev) => new Set(prev).add(parsedId))

    try {
      const entry = parsedEntries.find((e) => e.id === parsedId)
      if (!entry) return

      await supabase
        .from("parsed_auditions")
        .update({
          needs_review: false,
          reviewed_by_user: true,
          reviewed_at: new Date().toISOString(),
          review_reason: "Needs response",
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsedId)

      if (entry.email_id) {
        await supabase
          .from("casting_emails")
          .update({
            processing_status: "needs_response",
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.email_id)
      }

      setParsedEntries((prev) => prev.filter((e) => e.id !== parsedId))
    } catch (err) {
      console.error("Needs response failed:", err)
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(parsedId)
        return next
      })
    }
  }

  async function handleSkip(parsedId: string) {
    setProcessing((prev) => new Set(prev).add(parsedId))

    try {
      await supabase
        .from("parsed_auditions")
        .update({
          needs_review: false,
          reviewed_by_user: true,
          reviewed_at: new Date().toISOString(),
          review_reason: "User skipped",
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsedId)

      setParsedEntries((prev) => prev.filter((e) => e.id !== parsedId))
    } catch (err) {
      console.error("Skip failed:", err)
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(parsedId)
        return next
      })
    }
  }

  function confidenceBadge(score: number) {
    if (score >= 70) {
      return (
        <Badge className="bg-green-100 text-green-800 text-xs">
          {score}%
        </Badge>
      )
    }
    if (score >= 40) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
          {score}%
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-100 text-red-800 text-xs">
        {score}%
      </Badge>
    )
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
        heading="Email Inbox"
        text={`${parsedEntries.length} to review · ${processedEntries.length} processed`}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPendingReviews}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="mx-auto w-full max-w-lg space-y-3 px-1">
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

        {/* Section label: To Review */}
        {parsedEntries.length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <Mail className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium">To Review</p>
          </div>
        )}

        {parsedEntries.map((entry) => {
          const fields = entry.extracted_fields
          const email = (entry as any).casting_emails
          const isProcessing = processing.has(entry.id)
          const isExpanded = expandedCards.has(entry.id)

          const hasDetailFields =
            fields.casting_director ||
            fields.location ||
            fields.compensation ||
            fields.shoot_date ||
            fields.callback_date ||
            fields.notes

          return (
            <Card key={entry.id} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                {/* Subject line + confidence */}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-snug line-clamp-2 min-w-0">
                    {email?.subject || "Unknown Subject"}
                  </p>
                  {confidenceBadge(entry.confidence_score)}
                </div>

                {/* From + date row */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">
                    {email?.from_name || "Unknown sender"}
                  </span>
                  <span className="whitespace-nowrap ml-2">
                    {email?.received_at
                      ? new Date(email.received_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>

                {/* Summary */}
                {fields.summary && (
                  <p className="text-sm text-muted-foreground leading-snug">
                    {fields.summary}
                  </p>
                )}

                {/* Review reason */}
                {entry.review_reason && (
                  <div className="flex items-center gap-1.5 text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {entry.review_reason}
                  </div>
                )}

                {/* Key fields - 2 col on mobile */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {fields.project_name && (
                    <div>
                      <span className="text-muted-foreground text-xs">Project</span>
                      <p className="font-medium leading-tight text-sm truncate">{fields.project_name}</p>
                    </div>
                  )}
                  {fields.role_name && (
                    <div>
                      <span className="text-muted-foreground text-xs">Role</span>
                      <p className="font-medium leading-tight text-sm truncate">{fields.role_name}</p>
                    </div>
                  )}
                  {fields.agency && (
                    <div>
                      <span className="text-muted-foreground text-xs">Agency</span>
                      <p className="font-medium leading-tight text-sm truncate">{fields.agency}</p>
                    </div>
                  )}
                  {(fields.submission_deadline || fields.deadline) && (
                    <div>
                      <span className="text-muted-foreground text-xs">Due</span>
                      <p className="font-medium leading-tight text-sm text-red-600 truncate">
                        {fields.submission_deadline || fields.deadline}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action required + platform badges */}
                <div className="flex flex-wrap gap-1.5">
                  {fields.email_type && fields.email_type !== "irrelevant" && (
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                      fields.email_type === "casting" && "bg-blue-100 text-blue-700",
                      fields.email_type === "callback" && "bg-amber-100 text-amber-700",
                      fields.email_type === "inquiry" && "bg-purple-100 text-purple-700",
                      fields.email_type === "admin" && "bg-gray-100 text-gray-700",
                    )}>
                      {fields.email_type}
                    </span>
                  )}
                  {fields.source_platform && fields.source_platform !== "unknown" && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                      {fields.source_platform.replace("_", " ")}
                    </span>
                  )}
                </div>

                {fields.action_required && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
                    <Mail className="h-3 w-3 shrink-0" />
                    {fields.action_required}
                  </div>
                )}

                {/* Expandable details */}
                {hasDetailFields && (
                  <>
                    <button
                      onClick={() => toggleExpanded(entry.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {isExpanded ? "Less" : "More"}
                    </button>

                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm border-t pt-2">
                        {fields.casting_director && (
                          <div>
                            <span className="text-muted-foreground text-xs">CD</span>
                            <p className="font-medium leading-tight truncate">
                              {fields.casting_director}
                            </p>
                          </div>
                        )}
                        {fields.location && (
                          <div>
                            <span className="text-muted-foreground text-xs">Location</span>
                            <p className="font-medium leading-tight truncate">{fields.location}</p>
                          </div>
                        )}
                        {fields.compensation && (
                          <div>
                            <span className="text-muted-foreground text-xs">Pay</span>
                            <p className="font-medium leading-tight truncate">
                              {fields.compensation}
                            </p>
                          </div>
                        )}
                        {fields.shoot_date && (
                          <div>
                            <span className="text-muted-foreground text-xs">Shoot</span>
                            <p className="font-medium leading-tight truncate">
                              {fields.shoot_date}
                            </p>
                          </div>
                        )}
                        {fields.callback_date && (
                          <div>
                            <span className="text-muted-foreground text-xs">Callback</span>
                            <p className="font-medium leading-tight truncate">
                              {fields.callback_date}
                            </p>
                          </div>
                        )}
                        {fields.notes && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground text-xs">Notes</span>
                            <p className="leading-tight text-sm line-clamp-3">{fields.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Actions - stack vertically on tiny screens */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <Button
                    size="sm"
                    onClick={() =>
                      handleApprove(entry.id, entry.audition_id || undefined)
                    }
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 text-xs h-8"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Add
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleNeedsResponse(entry.id)}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 text-xs h-8"
                  >
                    <MessageSquare className="mr-1 h-3 w-3" />
                    Reply
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSkip(entry.id)}
                    disabled={isProcessing}
                    className="text-xs h-8"
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Processed section — collapsible */}
        {processedEntries.length > 0 && (
          <>
            <button
              onClick={() => setShowProcessed((o) => !o)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 mt-4"
            >
              <div className="flex items-center gap-2">
                {showProcessed ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">Processed</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {processedEntries.length}
              </Badge>
            </button>

            {showProcessed && processedEntries.map((entry) => {
              const fields = entry.extracted_fields
              const email = (entry as any).casting_emails
              const outcome = entry.audition_id ? "added" : entry.review_reason === "Needs response" ? "reply" : "skipped"

              return (
                <Card key={entry.id} className="overflow-hidden opacity-75">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-snug line-clamp-1 min-w-0">
                        {fields.project_name || email?.subject || "Unknown"}
                      </p>
                      <span className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                        outcome === "added" && "bg-green-100 text-green-700",
                        outcome === "reply" && "bg-blue-100 text-blue-700",
                        outcome === "skipped" && "bg-gray-100 text-gray-600",
                      )}>
                        {outcome === "added" ? "Audition" : outcome === "reply" ? "Needs reply" : "Skipped"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{email?.from_name || "Unknown sender"}</span>
                      <span className="whitespace-nowrap ml-2">
                        {entry.reviewed_at
                          ? new Date(entry.reviewed_at).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    {fields.summary && (
                      <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                        {fields.summary}
                      </p>
                    )}
                    {outcome === "added" && entry.audition_id && (
                      <a
                        href={`/dashboard/auditions/${entry.audition_id}`}
                        className="inline-block text-xs text-amber-600 hover:underline"
                      >
                        View audition &rarr;
                      </a>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
