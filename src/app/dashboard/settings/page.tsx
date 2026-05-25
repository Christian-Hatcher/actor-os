"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import {
  Mail,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from "lucide-react"

interface EmailConnection {
  id: string
  email_address: string
  display_name: string
  is_active: boolean
  last_synced_at: string
  scopes: string[]
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const emailError = searchParams.get("email_error")
  const emailConnected = searchParams.get("email_connected")

  const [connections, setConnections] = useState<EmailConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncPhase, setSyncPhase] = useState("")
  const [syncResult, setSyncResult] = useState<any | null>(null)

  // Fetch connections on mount
  useEffect(() => {
    fetchConnections()
  }, [])

  async function fetchConnections() {
    const { data, error } = await supabase
      .from("email_connections")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setConnections(data as EmailConnection[])
    }
    setLoading(false)
  }

  async function handleConnectGmail() {
    // Get current user for state parameter
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert("Please log in first")
      return
    }

    // Pass user_id directly as state — it's a UUID, URL-safe already
    const state = session.user.id

    // Call auth endpoint
    const res = await fetch("/api/gmail/auth")
    const { url } = await res.json()

    // Add state to URL
    const authUrl = new URL(url)
    authUrl.searchParams.set("state", state)

    window.location.href = authUrl.toString()
  }

  async function handleSync(connectionId?: string) {
    setSyncing(true)
    setSyncResult(null)
    setSyncPhase("Fetching emails from Gmail...")

    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Step 1: Sync emails from Gmail
      const syncRes = await fetch("/api/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session?.user?.id,
          connection_id: connectionId,
        }),
      })
      const syncData = await syncRes.json()

      if (syncData.error) {
        setSyncResult(syncData)
        return
      }

      const inserted = syncData.results?.[0]?.emails_inserted || 0
      const fetched = syncData.results?.[0]?.emails_fetched || 0

      if (inserted === 0) {
        setSyncResult({
          message: `Checked ${fetched} emails — no new casting emails found.`,
        })
        fetchConnections()
        return
      }

      // Step 2: Parse new emails with AI
      setSyncPhase(`Parsing ${inserted} new emails with AI...`)
      const parseRes = await fetch("/api/gmail/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session?.user?.id,
          connection_id: connectionId,
        }),
      })
      const parseData = await parseRes.json()

      setSyncResult({
        message: `Synced ${inserted} emails, parsed ${parseData.parsed || 0}, ${parseData.needs_review || 0} need review.`,
        details: syncData,
      })

      fetchConnections()
    } catch (err: any) {
      setSyncResult({ error: err.message })
    } finally {
      setSyncing(false)
      setSyncPhase("")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this Gmail connection? Emails will not be deleted.")) return

    await supabase.from("email_connections").delete().eq("id", id)
    fetchConnections()
  }

  const subscription = {
    tier: "monthly",
    status: "active",
    currentPeriodEnd: "2026-06-21",
    price: "$5",
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Settings"
        text="Manage your Gmail connections, profile, and subscription."
      />

      <div className="grid gap-6 max-w-3xl">
        {/* Gmail Connection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Gmail Connection</CardTitle>
              </div>
              <Badge variant="outline">
                {connections.filter((c) => c.is_active).length} connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {emailError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Connection failed: {emailError}
              </div>
            )}

            {emailConnected && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                Successfully connected {emailConnected}
              </div>
            )}

            {syncing && syncPhase && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {syncPhase}
              </div>
            )}

            {syncResult && !syncing && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  syncResult.error
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {syncResult.error
                  ? `Sync error: ${syncResult.error}`
                  : syncResult.message || "Sync complete"}
              </div>
            )}

            <div className="space-y-2">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        conn.is_active ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{conn.email_address}</p>
                      <p className="text-xs text-muted-foreground">
                        {conn.is_active ? "Active" : "Disconnected"}
                        {conn.last_synced_at
                          ? ` • Last sync ${new Date(
                              conn.last_synced_at
                            ).toLocaleDateString()}`
                          : " • Never synced"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(conn.id)}
                      disabled={syncing || !conn.is_active}
                    >
                      <RefreshCw
                        className={`h-3 w-3 mr-1 ${
                          syncing ? "animate-spin" : ""
                        }`}
                      />
                      Sync
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(conn.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              {connections.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">
                  No Gmail accounts connected. Connect your actor email to
                  auto-import casting emails.
                </p>
              )}
            </div>

            <Button onClick={handleConnectGmail} className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Connect Gmail Account
            </Button>

            <p className="text-xs text-muted-foreground">
              Actor OS needs read-only access to your Gmail to scan for
              audition and self-tape emails. We never send emails or
              delete anything.
            </p>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Subscription</CardTitle>
              <Badge
                className={
                  subscription.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Actor OS {subscription.tier}
                </p>
                <p className="text-sm text-muted-foreground">
                  Renews on {subscription.currentPeriodEnd}
                </p>
              </div>
              <div className="text-2xl font-bold">{subscription.price}</div>
            </div>

            <Separator />

            <Button variant="outline" className="w-full" asChild>
              <Link href="/api/portal" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Billing Portal
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
