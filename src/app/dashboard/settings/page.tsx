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
  AlertTriangle,
  ExternalLink,
  Trash2,
  Target,
  LogOut,
  Palette,
  Calculator,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "@/components/theme-provider"
import { useTax } from "@/hooks/use-tax"
import { setCurrency, type CurrencyCode } from "@/lib/format"
import type { TaxJurisdiction, USFilingStatus } from "@/lib/tax-estimator"
import type { ActorPreferences } from "@/types"

interface EmailConnection {
  id: string
  email_address: string
  display_name: string
  is_active: boolean
  last_synced_at: string
  scopes: string[]
}

export default function SettingsPage() {
  const { signOut, profile, refreshProfile } = useAuth()
  const { themeId, setThemeId, availableThemes } = useTheme()
  const searchParams = useSearchParams()
  const emailError = searchParams.get("email_error")
  const emailConnected = searchParams.get("email_connected")

  const [connections, setConnections] = useState<EmailConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncPhase, setSyncPhase] = useState("")
  const [syncResult, setSyncResult] = useState<any | null>(null)

  // Preferences state
  const defaultPreferences = {
    career_goal: "all_opportunities" as ActorPreferences["career_goal"],
    priorities: {
      compensation: 1,
      experience: 2,
      networking: 3,
      project_type: 4,
      location_flexibility: 5,
    },
    preferred_project_types: [] as string[],
    min_compensation: "",
    preferred_locations: "",
    willing_to_travel: false,
    bio_context: "",
  }
  const [prefs, setPrefs] = useState(defaultPreferences)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  // Fetch connections + preferences on mount
  useEffect(() => {
    fetchConnections()
    fetchPreferences()
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

  async function fetchPreferences() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from("actor_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (!error && data) {
      setPrefs({
        career_goal: (data.career_goal as typeof defaultPreferences.career_goal) || "all_opportunities",
        priorities: (data.priorities as typeof defaultPreferences.priorities) || defaultPreferences.priorities,
        preferred_project_types: data.preferred_project_types || [],
        min_compensation: data.min_compensation || "",
        preferred_locations: Array.isArray(data.preferred_locations)
          ? data.preferred_locations.join(", ")
          : "",
        willing_to_travel: data.willing_to_travel || false,
        bio_context: data.bio_context || "",
      })
    }
  }

  async function savePreferences() {
    setPrefsSaving(true)
    setPrefsSaved(false)
    setPrefsError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setPrefsError("Please log in first")
      setPrefsSaving(false)
      return
    }

    const locations = prefs.preferred_locations
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean)

    const payload = {
      user_id: session.user.id,
      career_goal: prefs.career_goal,
      priorities: prefs.priorities,
      preferred_project_types: prefs.preferred_project_types,
      min_compensation: prefs.min_compensation || null,
      preferred_locations: locations,
      willing_to_travel: prefs.willing_to_travel,
      bio_context: prefs.bio_context || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("actor_preferences")
      .upsert(payload, { onConflict: "user_id" })

    if (error) {
      setPrefsError(error.message)
    } else {
      setPrefsSaved(true)
      setTimeout(() => setPrefsSaved(false), 3000)
    }
    setPrefsSaving(false)
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

  // Tax settings
  const { settings: taxSettings, updateSettings: updateTaxSettings } = useTax()

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

        {/* Audition Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Audition Preferences</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Tell us what matters to you so we can prioritize your casting emails.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {prefsSaved && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                Preferences saved successfully.
              </div>
            )}

            {prefsError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" />
                {prefsError}
              </div>
            )}

            {/* Career Goal */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Career Goal</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "building_experience", label: "Building Experience", desc: "As many auditions as possible" },
                  { value: "earning_income", label: "Earning Income", desc: "Show me the money first" },
                  { value: "building_network", label: "Building Network", desc: "Connections matter most" },
                  { value: "all_opportunities", label: "All Opportunities", desc: "Show me everything" },
                ].map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() =>
                      setPrefs((p) => ({
                        ...p,
                        career_goal: goal.value as ActorPreferences["career_goal"],
                      }))
                    }
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      prefs.career_goal === goal.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{goal.label}</p>
                    <p className="text-xs text-muted-foreground">{goal.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Priority Rankings */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority Rankings</label>
              <p className="text-xs text-muted-foreground">
                Rank each factor from 1 (most important) to 5 (least important).
              </p>
              <div className="space-y-2">
                {[
                  { key: "compensation", label: "Compensation" },
                  { key: "experience", label: "Experience" },
                  { key: "networking", label: "Networking" },
                  { key: "project_type", label: "Project Type" },
                  { key: "location_flexibility", label: "Location Flexibility" },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm">{item.label}</span>
                    <select
                      value={prefs.priorities[item.key as keyof typeof prefs.priorities]}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          priorities: {
                            ...p.priorities,
                            [item.key]: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Project Types */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Project Types</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "commercial", label: "Commercial" },
                  { value: "film", label: "Film" },
                  { value: "tv", label: "TV" },
                  { value: "theater", label: "Theater" },
                  { value: "voice_over", label: "Voice Over" },
                  { value: "modeling", label: "Modeling" },
                ].map((type) => {
                  const selected = prefs.preferred_project_types.includes(type.value)
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setPrefs((p) => ({
                          ...p,
                          preferred_project_types: selected
                            ? p.preferred_project_types.filter((t) => t !== type.value)
                            : [...p.preferred_project_types, type.value],
                        }))
                      }
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {type.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Minimum Compensation */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Compensation</label>
              <input
                type="text"
                value={prefs.min_compensation}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, min_compensation: e.target.value }))
                }
                placeholder="e.g. $200/day or leave blank for any"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Preferred Locations */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Locations</label>
              <input
                type="text"
                value={prefs.preferred_locations}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, preferred_locations: e.target.value }))
                }
                placeholder="e.g. Tokyo, Yokohama, Remote"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Willing to Travel */}
            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <div>
                <p className="text-sm font-medium">Willing to Travel</p>
                <p className="text-xs text-muted-foreground">
                  Consider opportunities outside your preferred locations
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.willing_to_travel}
                onClick={() =>
                  setPrefs((p) => ({
                    ...p,
                    willing_to_travel: !p.willing_to_travel,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  prefs.willing_to_travel ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    prefs.willing_to_travel ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <Separator />

            {/* About You */}
            <div className="space-y-2">
              <label className="text-sm font-medium">About You</label>
              <textarea
                value={prefs.bio_context}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, bio_context: e.target.value }))
                }
                placeholder="Tell us about your career goals so we can better prioritize your emails. E.g., 'I'm a university student looking for commercial experience...'"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <Button
              onClick={savePreferences}
              disabled={prefsSaving}
              className="w-full"
            >
              {prefsSaving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
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

        {/* Appearance — theme picker (cinematic design system) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {availableThemes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeId(t.id)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    themeId === t.id ? "border-amber" : "border-rule hover:border-rule-strong"
                  }`}
                >
                  <span
                    className="size-8 flex-none rounded-full border border-rule-strong"
                    style={{
                      background: `linear-gradient(135deg, ${t.bg} 0 50%, ${t.amber} 50% 100%)`,
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-paper">{t.name}</span>
                    <span className="font-mono block text-[10px] uppercase tracking-[0.12em] text-paper-faint">
                      {themeId === t.id ? "Active" : "Tap to use"}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Currency */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { code: "USD", label: "US Dollar", symbol: "$" },
                  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
                  { code: "GBP", label: "British Pound", symbol: "£" },
                  { code: "EUR", label: "Euro", symbol: "€" },
                  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
                  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
                ] as { code: CurrencyCode; label: string; symbol: string }[]).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={async () => {
                      if (!profile?.id) return
                      const prev = profile.currency || "JPY"
                      setCurrency(c.code)
                      const { error } = await supabase
                        .from("profiles")
                        .update({ currency: c.code, updated_at: new Date().toISOString() })
                        .eq("id", profile.id)
                      if (error) {
                        setCurrency(prev)
                      } else {
                        refreshProfile()
                      }
                    }}
                    className={`rounded-lg border p-2.5 text-left transition-colors ${
                      (profile?.currency || "USD") === c.code
                        ? "border-amber bg-amber/5 ring-1 ring-amber"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{c.symbol} {c.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Tax Settings</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure how Actor OS estimates your tax liability.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Jurisdiction */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tax Jurisdiction</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "us", label: "United States", desc: "SE tax + federal brackets" },
                  { value: "jp", label: "Japan", desc: "Gensenchoushu withholding" },
                  { value: "uk", label: "United Kingdom", desc: "Income tax + NI" },
                  { value: "au", label: "Australia", desc: "25% flat estimate" },
                  { value: "ca", label: "Canada", desc: "25% flat estimate" },
                  { value: "other", label: "Other", desc: "25% flat estimate" },
                ] as { value: TaxJurisdiction; label: string; desc: string }[]).map((j) => (
                  <button
                    key={j.value}
                    type="button"
                    onClick={() => updateTaxSettings({ jurisdiction: j.value })}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      taxSettings.jurisdiction === j.value
                        ? "border-amber bg-amber/5 ring-1 ring-amber"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{j.label}</p>
                    <p className="text-xs text-muted-foreground">{j.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* US Filing Status — only show for US */}
            {taxSettings.jurisdiction === "us" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filing Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "single", label: "Single" },
                      { value: "married_joint", label: "Married Filing Jointly" },
                      { value: "married_separate", label: "Married Filing Separately" },
                      { value: "head_of_household", label: "Head of Household" },
                    ] as { value: USFilingStatus; label: string }[]).map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => updateTaxSettings({ filing_status: f.value })}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          taxSettings.filing_status === f.value
                            ? "border-amber bg-amber/5 ring-1 ring-amber"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <p className="text-sm font-medium">{f.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">State Tax Rate</label>
                  <p className="text-xs text-muted-foreground">
                    Enter your state income tax rate as a percentage (e.g. 5 for 5%).
                  </p>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="0.1"
                    value={taxSettings.state_tax_rate > 0 ? taxSettings.state_tax_rate * 100 : ""}
                    onChange={(e) => {
                      const pct = parseFloat(e.target.value) || 0
                      updateTaxSettings({ state_tax_rate: pct / 100 })
                    }}
                    placeholder="0"
                    className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </>
            )}

            <Separator />

            {/* Manual Rate Override */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Manual Rate Override</label>
              <p className="text-xs text-muted-foreground">
                If your accountant gave you a number, enter it here. This overrides all bracket calculations.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="0.5"
                  value={taxSettings.manual_rate !== null ? taxSettings.manual_rate * 100 : ""}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "" || val === "0") {
                      updateTaxSettings({ manual_rate: null })
                    } else {
                      updateTaxSettings({ manual_rate: parseFloat(val) / 100 })
                    }
                  }}
                  placeholder="Leave blank to use brackets"
                  className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span className="text-sm text-muted-foreground">%</span>
                {taxSettings.manual_rate !== null && (
                  <button
                    type="button"
                    onClick={() => updateTaxSettings({ manual_rate: null })}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <Separator />

            {/* Tax Savings Reminder */}
            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <div>
                <p className="text-sm font-medium">Tax Savings Reminders</p>
                <p className="text-xs text-muted-foreground">
                  Show a nudge after each booking: "Set aside $X for taxes"
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={taxSettings.tax_savings_reminder}
                onClick={() =>
                  updateTaxSettings({
                    tax_savings_reminder: !taxSettings.tax_savings_reminder,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  taxSettings.tax_savings_reminder ? "bg-amber" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    taxSettings.tax_savings_reminder ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
