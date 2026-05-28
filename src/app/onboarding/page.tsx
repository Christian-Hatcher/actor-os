"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Clapperboard, Loader2, Mail, Check, ChevronRight, ChevronLeft, Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "@/components/theme-provider"
import { supabase } from "@/lib/supabase"
import { setCurrency, type CurrencyCode } from "@/lib/format"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 6

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "JPY", label: "Japanese Yen", symbol: "\u00a5" },
  { code: "GBP", label: "British Pound", symbol: "\u00a3" },
  { code: "EUR", label: "Euro", symbol: "\u20ac" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
]

const CHALLENGES = [
  "Missing deadlines",
  "Tracking auditions",
  "Reading contracts",
  "Staying organized",
  "Tax tracking",
]

const PREFERRED_MODES = [
  { value: "theater", label: "Theater" },
  { value: "film", label: "Film" },
  { value: "both", label: "Both" },
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editMode = searchParams.get("edit") === "1"
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const { themeId, setThemeId, availableThemes } = useTheme()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1: Welcome + Name
  const [fullName, setFullName] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Step 2: Career
  const [city, setCity] = useState("")
  const [agencyName, setAgencyName] = useState("")
  const [agencyEmail, setAgencyEmail] = useState("")
  const [preferredMode, setPreferredMode] = useState<"theater" | "film" | "both">("both")

  // Step 3: Goals
  const [monthlyGoal, setMonthlyGoal] = useState("")
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD")
  const [challenges, setChallenges] = useState<string[]>([])

  // Step 4: Connect Email — handled by redirect
  // Step 5: Theme — uses useTheme
  // Step 6: Summary

  // Pre-fill from profile on load
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name)
      if (profile.city) setCity(profile.city)
      if (profile.agency_name) setAgencyName(profile.agency_name)
      if (profile.agency_email) setAgencyEmail(profile.agency_email)
      if (profile.preferred_mode) setPreferredMode(profile.preferred_mode as "theater" | "film" | "both")
      if (profile.monthly_goal) setMonthlyGoal(String(profile.monthly_goal))
      if (profile.currency) setCurrencyState(profile.currency as CurrencyCode)
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url)
    }
  }, [profile])

  // Redirect if not authed
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  // Skip onboarding for users who've already finished setup. Pass
  // ?edit=1 to bypass the redirect and re-edit their profile.
  useEffect(() => {
    if (!authLoading && user && profile?.city && !editMode) {
      router.push("/dashboard")
    }
  }, [authLoading, user, profile, editMode, router])

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile || !user) return null
    const ext = avatarFile.name.split(".").pop() || "jpg"
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true })
    if (error) {
      console.error("Avatar upload error:", error)
      return null
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    return data.publicUrl
  }

  async function saveStep(updates: Record<string, unknown>) {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)
    if (error) console.error("Save error:", error)
    await refreshProfile()
    setSaving(false)
  }

  async function handleNext() {
    if (step === 1) {
      const avatarUrl = await uploadAvatar()
      const updates: Record<string, unknown> = { full_name: fullName }
      if (avatarUrl) updates.avatar_url = avatarUrl
      await saveStep(updates)
    } else if (step === 2) {
      await saveStep({
        city,
        agency_name: agencyName || null,
        agency_email: agencyEmail || null,
        preferred_mode: preferredMode,
      })
    } else if (step === 3) {
      const goal = parseFloat(monthlyGoal) || null
      setCurrency(currency)
      await saveStep({
        monthly_goal: goal,
        currency,
      })
    } else if (step === 5) {
      // Theme is already saved by setThemeId, but persist to profile
      await saveStep({ theme_id: themeId })
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1))
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function toggleChallenge(c: string) {
    setChallenges((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  async function handleFinish() {
    // Final save — ensure city is set (onboarding-complete marker)
    setSaving(true)
    const updates: Record<string, unknown> = {
      theme_id: themeId,
    }
    if (!profile?.city && city) {
      updates.city = city
    }
    await saveStep(updates)
    setSaving(false)
    router.push("/dashboard")
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <div className="animate-spin h-8 w-8 border-4 border-[var(--amber)] border-t-transparent rounded-full" />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--paper)] flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[var(--bg3)]">
        <div
          className="h-full bg-[var(--amber)] transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-2 pt-8 pb-4">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <button
            key={i}
            onClick={() => i + 1 < step && setStep(i + 1)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i + 1 === step
                ? "w-8 bg-[var(--amber)]"
                : i + 1 < step
                ? "w-2 bg-[var(--amber)] opacity-50 cursor-pointer"
                : "w-2 bg-[var(--rule-strong)]"
            )}
          />
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-24">
        <div className="w-full max-w-lg">
          {/* ----------------------------------------------------------------- */}
          {/* Step 1: Welcome + Name                                            */}
          {/* ----------------------------------------------------------------- */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg2)] border border-[var(--rule-strong)] mb-2">
                  <Clapperboard className="h-8 w-8 text-[var(--amber)]" />
                </div>
                <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl tracking-tight">
                  Welcome to Actor OS
                </h1>
                <p className="text-[var(--paper-dim)] text-base">
                  Your acting career, organized. Let us get you set up.
                </p>
              </div>

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3">
                <label
                  htmlFor="avatar-upload"
                  className="relative cursor-pointer group"
                >
                  <div className={cn(
                    "w-24 h-24 rounded-full border-2 border-dashed border-[var(--rule-strong)] flex items-center justify-center overflow-hidden transition-colors",
                    "group-hover:border-[var(--amber)]"
                  )}>
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="h-8 w-8 text-[var(--paper-faint)]" />
                    )}
                  </div>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setAvatarFile(null)
                        setAvatarPreview(null)
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--red)] flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <p className="text-xs text-[var(--paper-faint)] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest">
                  Profile Photo (optional)
                </p>
              </div>

              {/* Name input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--paper-dim)]">
                  Full Name
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="bg-[var(--bg2)] border-[var(--rule-strong)] text-[var(--paper)] h-12 text-base"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* Step 2: Your Career                                               */}
          {/* ----------------------------------------------------------------- */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="font-[family-name:var(--font-instrument-serif)] text-3xl tracking-tight">
                  Your Career
                </h1>
                <p className="text-[var(--paper-dim)]">
                  Tell us where you are and how you work.
                </p>
              </div>

              <div className="space-y-5">
                {/* City */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--paper-dim)]">
                    City / Location
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Tokyo, Los Angeles, London"
                    className="bg-[var(--bg2)] border-[var(--rule-strong)] text-[var(--paper)] h-12 text-base"
                    autoFocus
                  />
                </div>

                {/* Agency */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--paper-dim)]">
                    Agency Name
                    <span className="text-[var(--paper-faint)] ml-1">(optional)</span>
                  </label>
                  <Input
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="e.g. CAA, United Talent"
                    className="bg-[var(--bg2)] border-[var(--rule-strong)] text-[var(--paper)]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--paper-dim)]">
                    Agency Email
                    <span className="text-[var(--paper-faint)] ml-1">(optional)</span>
                  </label>
                  <Input
                    type="email"
                    value={agencyEmail}
                    onChange={(e) => setAgencyEmail(e.target.value)}
                    placeholder="agent@agency.com"
                    className="bg-[var(--bg2)] border-[var(--rule-strong)] text-[var(--paper)]"
                  />
                </div>

                {/* Preferred Mode */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--paper-dim)]">
                    Preferred Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {PREFERRED_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setPreferredMode(mode.value)}
                        className={cn(
                          "rounded-xl border py-3 px-4 text-sm font-medium transition-all duration-200",
                          preferredMode === mode.value
                            ? "border-[var(--amber)] bg-[var(--amber)]/10 text-[var(--amber)] ring-1 ring-[var(--amber)]"
                            : "border-[var(--rule-strong)] text-[var(--paper-dim)] hover:border-[var(--paper-faint)]"
                        )}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* Step 3: Your Goals                                                */}
          {/* ----------------------------------------------------------------- */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="font-[family-name:var(--font-instrument-serif)] text-3xl tracking-tight">
                  Your Goals
                </h1>
                <p className="text-[var(--paper-dim)]">
                  Set a target so we can track your progress.
                </p>
              </div>

              <div className="space-y-6">
                {/* Currency */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--paper-dim)]">
                    Currency
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setCurrencyState(c.code)}
                        className={cn(
                          "rounded-lg border p-2.5 text-left transition-all duration-200",
                          currency === c.code
                            ? "border-[var(--amber)] bg-[var(--amber)]/10 ring-1 ring-[var(--amber)]"
                            : "border-[var(--rule-strong)] hover:border-[var(--paper-faint)]"
                        )}
                      >
                        <p className="text-sm font-medium text-[var(--paper)]">
                          {c.symbol} {c.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly Goal */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--paper-dim)]">
                    Monthly Income Goal
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--paper-faint)] text-base">
                      {CURRENCIES.find((c) => c.code === currency)?.symbol}
                    </span>
                    <Input
                      type="number"
                      value={monthlyGoal}
                      onChange={(e) => setMonthlyGoal(e.target.value)}
                      placeholder="0"
                      className="bg-[var(--bg2)] border-[var(--rule-strong)] text-[var(--paper)] h-12 text-base pl-8"
                    />
                  </div>
                </div>

                {/* Challenges */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-[var(--paper-dim)]">
                    What is your biggest challenge?
                  </label>
                  <div className="space-y-2">
                    {CHALLENGES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleChallenge(c)}
                        className={cn(
                          "flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-left transition-all duration-200",
                          challenges.includes(c)
                            ? "border-[var(--amber)] bg-[var(--amber)]/10"
                            : "border-[var(--rule-strong)] hover:border-[var(--paper-faint)]"
                        )}
                      >
                        <div
                          className={cn(
                            "h-5 w-5 rounded flex items-center justify-center border transition-colors",
                            challenges.includes(c)
                              ? "bg-[var(--amber)] border-[var(--amber)]"
                              : "border-[var(--rule-strong)]"
                          )}
                        >
                          {challenges.includes(c) && (
                            <Check className="h-3 w-3 text-[var(--bg)]" />
                          )}
                        </div>
                        <span className="text-sm text-[var(--paper)]">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* Step 4: Connect Email                                             */}
          {/* ----------------------------------------------------------------- */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg2)] border border-[var(--rule-strong)] mb-2">
                  <Mail className="h-8 w-8 text-[var(--amber)]" />
                </div>
                <h1 className="font-[family-name:var(--font-instrument-serif)] text-3xl tracking-tight">
                  Connect Email
                </h1>
                <p className="text-[var(--paper-dim)] max-w-sm mx-auto">
                  Connect your Gmail to automatically detect casting emails, audition notices, and callback requests.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  className="w-full h-12 text-base bg-[var(--paper)] text-[var(--bg)] hover:opacity-90"
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session) return
                    const res = await fetch("/api/gmail/auth")
                    const { url } = await res.json()
                    const authUrl = new URL(url)
                    authUrl.searchParams.set("state", session.user.id)
                    window.location.href = authUrl.toString()
                  }}
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Connect Gmail
                </Button>

                <p className="text-center text-xs text-[var(--paper-faint)]">
                  Read-only access. We never send emails or delete anything.
                </p>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* Step 5: Choose Theme                                              */}
          {/* ----------------------------------------------------------------- */}
          {step === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="font-[family-name:var(--font-instrument-serif)] text-3xl tracking-tight">
                  Choose Your Look
                </h1>
                <p className="text-[var(--paper-dim)]">
                  Pick a theme. You can change this anytime in settings.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {availableThemes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeId(t.id)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200",
                      themeId === t.id
                        ? "border-[var(--amber)] ring-1 ring-[var(--amber)]"
                        : "border-[var(--rule-strong)] hover:border-[var(--paper-faint)]"
                    )}
                  >
                    <span
                      className="w-14 h-14 flex-none rounded-xl border border-[var(--rule-strong)]"
                      style={{
                        background: `linear-gradient(135deg, ${t.bg} 0% 50%, ${t.amber} 50% 100%)`,
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium text-[var(--paper)]">
                        {t.name}
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains-mono)] block text-[11px] uppercase tracking-[0.12em] text-[var(--paper-faint)] mt-0.5">
                        {themeId === t.id ? "Selected" : "Tap to preview"}
                      </span>
                    </span>
                    {themeId === t.id && (
                      <div className="w-8 h-8 rounded-full bg-[var(--amber)] flex items-center justify-center flex-none">
                        <Check className="h-4 w-4 text-[var(--bg)]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* Step 6: You're Ready                                              */}
          {/* ----------------------------------------------------------------- */}
          {step === 6 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--green)]/20 mb-2">
                  <Check className="h-10 w-10 text-[var(--green)]" />
                </div>
                <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl tracking-tight">
                  You are Ready
                </h1>
                <p className="text-[var(--paper-dim)] text-base">
                  Your career command center is set up. Here is what we saved:
                </p>
              </div>

              {/* Summary cards */}
              <div className="space-y-3">
                {fullName && (
                  <SummaryRow label="Name" value={fullName} />
                )}
                {city && (
                  <SummaryRow label="Location" value={city} />
                )}
                {agencyName && (
                  <SummaryRow label="Agency" value={agencyName} />
                )}
                <SummaryRow
                  label="Mode"
                  value={preferredMode === "both" ? "Theater + Film" : preferredMode === "theater" ? "Theater" : "Film"}
                />
                {monthlyGoal && (
                  <SummaryRow
                    label="Monthly Goal"
                    value={`${CURRENCIES.find((c) => c.code === currency)?.symbol}${Number(monthlyGoal).toLocaleString()}`}
                  />
                )}
                <SummaryRow
                  label="Theme"
                  value={availableThemes.find((t) => t.id === themeId)?.name || themeId}
                />
              </div>

              <Button
                className="w-full h-14 text-lg font-semibold bg-[var(--amber)] text-[var(--bg)] hover:opacity-90"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Go to Dashboard"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      {step < TOTAL_STEPS && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg)]/95 backdrop-blur-sm border-t border-[var(--rule)] px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-[var(--rule-strong)] text-[var(--paper-dim)]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}

            <div className="flex-1" />

            {step === 4 ? (
              <Button
                variant="outline"
                onClick={() => setStep(5)}
                className="border-[var(--rule-strong)] text-[var(--paper-dim)]"
              >
                Skip for now
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={saving || (step === 1 && !fullName.trim()) || (step === 2 && !city.trim())}
                className="bg-[var(--amber)] text-[var(--bg)] hover:opacity-90 min-w-[120px]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--rule-strong)] bg-[var(--bg2)] px-4 py-3">
      <span className="text-sm text-[var(--paper-faint)] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-widest text-[11px]">
        {label}
      </span>
      <span className="text-sm font-medium text-[var(--paper)]">{value}</span>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-bg">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber border-t-transparent" />
        </div>
      }
    >
      <OnboardingInner />
    </Suspense>
  )
}
