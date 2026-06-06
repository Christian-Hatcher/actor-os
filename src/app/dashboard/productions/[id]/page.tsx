"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Users, Copy, MessageSquare, Plus, Check, ArrowLeft } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { Production, ProductionMember, ProductionNote } from "@/types"

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

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div
      className="grid size-8 shrink-0 place-items-center rounded-full border border-rule-strong text-[11px] font-medium text-paper-dim"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,.06), transparent 50%), linear-gradient(45deg, #2a251f, #3a3329)",
      }}
    >
      {initials || "?"}
    </div>
  )
}

interface MemberWithName extends ProductionMember {
  full_name: string | null
  email?: string | null
}

interface NoteWithAuthor extends ProductionNote {
  author_name: string | null
}

interface ProductionDetail {
  production: Production
  members: MemberWithName[]
  notes: NoteWithAuthor[]
}

function InviteCodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-paper-faint hover:text-paper-dim transition-colors"
      title="Copy invite code"
    >
      <span className="uppercase">{code}</span>
      {copied ? (
        <Check className="size-3 text-green" />
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  )
}

function NoteItem({ note }: { note: NoteWithAuthor }) {
  return (
    <div className="border-t border-rule py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[12px] font-medium text-paper-dim">
          {note.author_name ?? "Unknown"}
        </span>
        <span className="font-mono text-[10px] text-paper-faint">
          {formatTimestamp(note.created_at)}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-paper whitespace-pre-wrap">
        {note.content}
      </p>
    </div>
  )
}

function AddNoteForm({
  productionId,
  onAdded,
}: {
  productionId: string
  onAdded: (note: NoteWithAuthor) => void
}) {
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/productions/${productionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      onAdded(data)
      setContent("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post note.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note for the cast…"
        rows={3}
        className="w-full resize-none rounded-xl border border-rule bg-white/[0.04] px-3 py-2.5 text-[14px] text-paper placeholder:text-paper-faint focus:outline-none focus:border-amber/50 transition-colors"
      />
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !content.trim()}
        className={cn(
          "font-mono inline-flex items-center gap-1.5 rounded-[30px] border px-4 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
          submitting || !content.trim()
            ? "border-rule text-paper-faint opacity-50 cursor-not-allowed"
            : "border-amber bg-amber/[0.15] text-amber hover:bg-amber/[0.22]",
        )}
      >
        <Plus className="size-3" />
        {submitting ? "Posting…" : "Post Note"}
      </button>
    </form>
  )
}

function ProductionDetailView({ id }: { id: string }) {
  const [data, setData] = useState<ProductionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/productions/${id}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!active) return
        setData(json)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load production.")
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchDetail()
    return () => { active = false }
  }, [id])

  function handleNoteAdded(note: NoteWithAuthor) {
    setData((prev) => {
      if (!prev) return prev
      return { ...prev, notes: [...prev.notes, note] }
    })
  }

  if (loading) {
    return (
      <div className="pt-4 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-20 rounded-full bg-white/[0.04] animate-pulse" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-white/[0.06] animate-pulse" />
              <div className="h-3.5 w-28 rounded bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center">
        <p className="font-serif text-[17px] italic text-paper-faint">
          Couldn&apos;t load production.
        </p>
        {error && <p className="mt-1 text-[12px] text-paper-faint">{error}</p>}
      </div>
    )
  }

  const { production, members, notes } = data
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  return (
    <div className="pt-2 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[28px] leading-[1.1] tracking-[-0.015em] text-paper">
              {production.name}
            </h1>
            {production.description && (
              <p className="mt-1 text-[13px] text-paper-dim leading-relaxed">
                {production.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "font-mono inline-flex items-center rounded-[30px] border px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em]",
              projectTypeBadgeClass(production.project_type),
            )}
          >
            {PROJECT_TYPE_LABELS[production.project_type]}
          </span>
          <div className="flex items-center gap-1.5 rounded-[30px] border border-rule bg-white/[0.03] px-2.5 py-1">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper-faint mr-1">
              Invite
            </span>
            <InviteCodeCopy code={production.invite_code} />
          </div>
        </div>
      </div>

      {/* Members */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-4 text-paper-faint" strokeWidth={1.5} />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint">
            Members ({members.length})
          </span>
        </div>
        {members.length === 0 ? (
          <p className="text-[13px] text-paper-faint italic">No members yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <MemberAvatar name={member.full_name ?? member.email ?? "?"} />
                <div className="min-w-0">
                  <div className="text-[14px] text-paper truncate">
                    {member.full_name ?? member.email ?? "Unknown"}
                  </div>
                  {member.role_label && (
                    <div className="text-[11px] text-paper-faint">{member.role_label}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes feed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="size-4 text-paper-faint" strokeWidth={1.5} />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint">
            Notes ({sortedNotes.length})
          </span>
        </div>
        {sortedNotes.length === 0 ? (
          <p className="text-[13px] text-paper-faint italic">
            No notes yet. Be the first to post.
          </p>
        ) : (
          <div className="flex flex-col">
            {sortedNotes.map((note) => (
              <NoteItem key={note.id} note={note} />
            ))}
          </div>
        )}
        <AddNoteForm productionId={id} onAdded={handleNoteAdded} />
      </div>
    </div>
  )
}

export default function ProductionDetailPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : ""

  return (
    <DashboardShell>
      <Link
        href="/dashboard/productions"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint hover:text-paper-dim transition-colors mb-4"
      >
        <ArrowLeft className="size-3" />
        Productions
      </Link>
      <ProductionDetailView id={id} />
    </DashboardShell>
  )
}
