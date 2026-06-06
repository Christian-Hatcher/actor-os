"use client"

import { useEffect, useState } from "react"
import { Users, Plus, Hash } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { Production } from "@/types"

const PROJECT_TYPE_LABELS: Record<Production["project_type"], string> = {
  film: "Film",
  tv: "TV",
  commercial: "Commercial",
  theater: "Theater",
  other: "Other",
}

function projectTypeBadgeClass(type: Production["project_type"]): string {
  const map: Record<Production["project_type"], string> = {
    film: "border-purple/40 bg-purple/[0.1] text-purple",
    tv: "border-blue/40 bg-blue/[0.1] text-blue",
    commercial: "border-amber/40 bg-amber/[0.1] text-amber",
    theater: "border-green/40 bg-green/[0.1] text-green",
    other: "border-paper-faint/40 bg-white/[0.04] text-paper-faint",
  }
  return map[type] ?? "border-rule bg-white/[0.04] text-paper-faint"
}

interface ProductionWithMemberCount extends Production {
  member_count?: number
}

function ProductionRow({ production }: { production: ProductionWithMemberCount }) {
  return (
    <Link
      href={`/dashboard/productions/${production.id}`}
      className="block border-t border-rule py-4 first:border-t-0 hover:bg-white/[0.015] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[19px] leading-[1.15] text-paper truncate">
            {production.name}
          </div>
          {production.description && (
            <div className="mt-0.5 text-[12px] text-paper-dim truncate">
              {production.description}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "font-mono inline-flex items-center rounded-[30px] border px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em]",
                projectTypeBadgeClass(production.project_type),
              )}
            >
              {PROJECT_TYPE_LABELS[production.project_type]}
            </span>
            <span className="font-mono inline-flex items-center gap-1 rounded-[30px] border border-rule bg-white/[0.03] px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em] text-paper-faint">
              <Users className="size-2.5" />
              {production.member_count ?? 0}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1 text-[11px] text-paper-faint font-mono tracking-[0.06em]">
            <Hash className="size-3" />
            <span>{production.invite_code}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

type ActiveForm = "create" | "join" | null

function CreateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (p: ProductionWithMemberCount) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [projectType, setProjectType] = useState<Production["project_type"]>("theater")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/productions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, project_type: projectType }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      onSuccess(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create production.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-rule bg-surface p-4 space-y-3"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint mb-1">
        New Production
      </div>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Production name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-rule bg-white/[0.04] px-3 py-2 text-[14px] text-paper placeholder:text-paper-faint focus:outline-none focus:border-amber/50 transition-colors"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-rule bg-white/[0.04] px-3 py-2 text-[14px] text-paper placeholder:text-paper-faint focus:outline-none focus:border-amber/50 transition-colors"
        />
        <select
          value={projectType}
          onChange={(e) => setProjectType(e.target.value as Production["project_type"])}
          className="w-full rounded-lg border border-rule bg-white/[0.04] px-3 py-2 text-[14px] text-paper focus:outline-none focus:border-amber/50 transition-colors"
        >
          <option value="theater">Theater</option>
          <option value="film">Film</option>
          <option value="tv">TV</option>
          <option value="commercial">Commercial</option>
          <option value="other">Other</option>
        </select>
      </div>
      {error && (
        <p className="text-[12px] text-red-400">{error}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className={cn(
            "font-mono flex-1 rounded-[30px] border px-4 py-2 text-[10px] uppercase tracking-[0.12em] transition-colors",
            submitting || !name.trim()
              ? "border-rule text-paper-faint opacity-50 cursor-not-allowed"
              : "border-amber bg-amber/[0.15] text-amber hover:bg-amber/[0.22]",
          )}
        >
          {submitting ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono rounded-[30px] border border-rule bg-white/[0.02] px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-paper-faint hover:text-paper-dim hover:border-rule-strong transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function JoinForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (p: ProductionWithMemberCount) => void
  onCancel: () => void
}) {
  const [inviteCode, setInviteCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (inviteCode.trim().length !== 8) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/productions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode.trim().toUpperCase() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      onSuccess(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join production.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-rule bg-surface p-4 space-y-3"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint mb-1">
        Join Production
      </div>
      <input
        type="text"
        placeholder="8-character invite code"
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 8))}
        maxLength={8}
        required
        className="w-full rounded-lg border border-rule bg-white/[0.04] px-3 py-2 font-mono text-[14px] uppercase tracking-[0.1em] text-paper placeholder:text-paper-faint placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-amber/50 transition-colors"
      />
      {error && (
        <p className="text-[12px] text-red-400">{error}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting || inviteCode.trim().length !== 8}
          className={cn(
            "font-mono flex-1 rounded-[30px] border px-4 py-2 text-[10px] uppercase tracking-[0.12em] transition-colors",
            submitting || inviteCode.trim().length !== 8
              ? "border-rule text-paper-faint opacity-50 cursor-not-allowed"
              : "border-amber bg-amber/[0.15] text-amber hover:bg-amber/[0.22]",
          )}
        >
          {submitting ? "Joining…" : "Join"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono rounded-[30px] border border-rule bg-white/[0.02] px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-paper-faint hover:text-paper-dim hover:border-rule-strong transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function ProductionsView() {
  const [productions, setProductions] = useState<ProductionWithMemberCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeForm, setActiveForm] = useState<ActiveForm>(null)

  useEffect(() => {
    let active = true
    async function fetchProductions() {
      try {
        const res = await fetch("/api/productions")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!active) return
        setProductions(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load productions.")
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchProductions()
    return () => { active = false }
  }, [])

  function handleCreated(production: ProductionWithMemberCount) {
    setProductions((prev) => [production, ...prev])
    setActiveForm(null)
  }

  function handleJoined(production: ProductionWithMemberCount) {
    setProductions((prev) => {
      const exists = prev.some((p) => p.id === production.id)
      return exists ? prev : [production, ...prev]
    })
    setActiveForm(null)
  }

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-t border-rule py-4 first:border-t-0">
            <div className="h-5 w-48 rounded bg-white/[0.06] animate-pulse" />
            <div className="mt-2 h-3.5 w-32 rounded bg-white/[0.04] animate-pulse" />
            <div className="mt-3 flex gap-1.5">
              <div className="h-4 w-16 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-10 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="font-serif text-[17px] italic text-paper-faint">
          Couldn&apos;t load productions.
        </p>
        <p className="mt-1 text-[12px] text-paper-faint">{error}</p>
      </div>
    )
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex gap-2 py-4">
        <button
          type="button"
          onClick={() => setActiveForm(activeForm === "create" ? null : "create")}
          className={cn(
            "font-mono inline-flex items-center gap-1.5 rounded-[30px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
            activeForm === "create"
              ? "border-amber bg-amber/[0.15] text-amber"
              : "border-rule bg-white/[0.02] text-paper-faint hover:border-rule-strong hover:text-paper-dim",
          )}
        >
          <Plus className="size-3" />
          Create Production
        </button>
        <button
          type="button"
          onClick={() => setActiveForm(activeForm === "join" ? null : "join")}
          className={cn(
            "font-mono inline-flex items-center gap-1.5 rounded-[30px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
            activeForm === "join"
              ? "border-amber bg-amber/[0.15] text-amber"
              : "border-rule bg-white/[0.02] text-paper-faint hover:border-rule-strong hover:text-paper-dim",
          )}
        >
          <Hash className="size-3" />
          Join Production
        </button>
      </div>

      {/* Inline forms */}
      {activeForm === "create" && (
        <CreateForm onSuccess={handleCreated} onCancel={() => setActiveForm(null)} />
      )}
      {activeForm === "join" && (
        <JoinForm onSuccess={handleJoined} onCancel={() => setActiveForm(null)} />
      )}

      {/* Productions list */}
      {productions.length === 0 ? (
        <div className="py-12 text-center">
          <div
            className="mx-auto grid size-[64px] place-items-center rounded-full border border-rule-strong"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,.04), transparent 50%), linear-gradient(45deg, #2a251f, #3a3329)",
            }}
          >
            <Users className="size-6 text-paper-faint" strokeWidth={1.4} />
          </div>
          <h2 className="font-serif mt-5 text-[22px] leading-tight tracking-[-0.01em] text-paper">
            No productions yet.
          </h2>
          <p className="mt-2 max-w-[320px] mx-auto text-[13px] leading-relaxed text-paper-dim">
            Create one to collaborate with your cast.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {productions.map((production) => (
            <ProductionRow key={production.id} production={production} />
          ))}
        </div>
      )}
    </>
  )
}

export default function ProductionsPage() {
  return (
    <DashboardShell>
      <div className="font-mono mb-1 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
        Productions
      </div>
      <h1 className="font-serif text-[32px] leading-none tracking-[-0.015em] text-paper">
        Cast &amp; crew.
      </h1>
      <ProductionsView />
    </DashboardShell>
  )
}
