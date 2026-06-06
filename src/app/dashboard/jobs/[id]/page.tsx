"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  Plus,
  ChevronDown,
} from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { cn } from "@/lib/utils"
import type { Job, RehearsalLog, Script } from "@/types"

type Tab = "overview" | "rehearsals" | "scripts"

const REHEARSAL_TYPES: { value: RehearsalLog["type"]; label: string }[] = [
  { value: "table_read", label: "Table Read" },
  { value: "blocking", label: "Blocking" },
  { value: "run_through", label: "Run Through" },
  { value: "tech_rehearsal", label: "Tech Rehearsal" },
  { value: "dress_rehearsal", label: "Dress Rehearsal" },
  { value: "other", label: "Other" },
]

const PROJECT_TYPE_LABELS: Record<Job["project_type"], string> = {
  film: "Film",
  tv: "TV",
  commercial: "Commercial",
  theater: "Theater",
  voice_over: "Voice Over",
  modeling: "Modeling",
  other: "Other",
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatRehearsalDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="font-mono grid grid-cols-[108px_1fr] items-baseline gap-x-[18px] border-t border-rule px-[18px] py-3 text-[11.5px] tracking-[0.04em] first:border-t-0">
      <span className="text-[10px] uppercase tracking-[0.14em] text-paper-faint">{label}</span>
      <span className="font-sans text-[13px] text-paper">{value}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview tab                                                        */
/* ------------------------------------------------------------------ */

function OverviewTab({ job }: { job: Job }) {
  return (
    <div className="mt-4 space-y-3.5">
      <div className="overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.018),transparent)]">
        <InfoRow label="Role" value={job.role_name} />
        <InfoRow label="Type" value={PROJECT_TYPE_LABELS[job.project_type]} />
        <InfoRow label="Status" value={<span className="capitalize">{job.status}</span>} />
        <InfoRow label="Location" value={job.location} />
        <InfoRow label="Start" value={formatDate(job.start_date)} />
        <InfoRow label="End" value={formatDate(job.end_date)} />
        <InfoRow label="Pay" value={job.compensation} />
      </div>

      {job.notes && (
        <div className="rounded-[14px] border border-amber/30 bg-amber/[0.05] p-4">
          <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-amber">
            Notes
          </div>
          <p className="font-serif text-[15px] italic leading-[1.5] text-paper">{job.notes}</p>
        </div>
      )}

      {job.audition_id && (
        <div className="rounded-[14px] border border-rule bg-white/[0.015] p-4">
          <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            Linked Audition
          </div>
          <Link
            href={`/dashboard/auditions/${job.audition_id}`}
            className="font-sans text-[13px] text-amber hover:underline inline-flex items-center gap-1.5"
          >
            View original audition
            <span className="font-serif">→</span>
          </Link>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Rehearsals tab                                                      */
/* ------------------------------------------------------------------ */

function RehearsalsTab({ jobId, rehearsals: initial }: { jobId: string; rehearsals: RehearsalLog[] }) {
  const [rehearsals, setRehearsals] = useState<RehearsalLog[]>(initial)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "other" as RehearsalLog["type"],
    duration_minutes: "",
    location: "",
    notes: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/rehearsals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          type: form.type,
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes, 10) : null,
          location: form.location || null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to save rehearsal.")
      const created: RehearsalLog = await res.json()
      setRehearsals((prev) =>
        [...prev, created].sort((a, b) => a.date.localeCompare(b.date)),
      )
      setForm({ date: new Date().toISOString().slice(0, 10), type: "other", duration_minutes: "", location: "", notes: "" })
      setFormOpen(false)
    } catch {
      // surface inline if needed
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 space-y-3.5">
      {rehearsals.length === 0 && !formOpen && (
        <div className="py-8 text-center">
          <p className="font-serif text-[17px] italic text-paper-faint">
            No rehearsals logged yet.
          </p>
        </div>
      )}

      {rehearsals.length > 0 && (
        <div className="overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.018),transparent)]">
          {rehearsals.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[56px_1fr_auto] items-start gap-3 border-t border-rule px-[18px] py-3.5 first:border-t-0"
            >
              <div className="text-center">
                <div className="font-serif text-[20px] leading-none text-paper">
                  {new Date(r.date + "T00:00:00").getDate()}
                </div>
                <div className="font-mono mt-0.5 text-[9px] uppercase tracking-[0.14em] text-paper-faint">
                  {new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                </div>
              </div>
              <div>
                <div className="font-sans text-[14px] text-paper capitalize">
                  {r.type.replace(/_/g, " ")}
                </div>
                {r.location && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-paper-faint">
                    <MapPin className="size-3" />
                    {r.location}
                  </div>
                )}
                {r.notes && (
                  <div className="mt-1 text-[12px] leading-relaxed text-paper-dim">{r.notes}</div>
                )}
              </div>
              {r.duration_minutes && (
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-paper-faint">
                  {r.duration_minutes}m
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick-add form */}
      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-[14px] border border-rule bg-white/[0.015] p-4 space-y-3"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            Log Rehearsal
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono block mb-1 text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
                className="font-sans w-full rounded-[10px] border border-rule-strong bg-transparent px-3 py-2 text-[13px] text-paper outline-none focus:border-amber/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="font-mono block mb-1 text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
                Type
              </label>
              <div className="relative">
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RehearsalLog["type"] }))}
                  className="font-sans w-full appearance-none rounded-[10px] border border-rule-strong bg-bg px-3 py-2 pr-8 text-[13px] text-paper outline-none focus:border-amber/50"
                >
                  {REHEARSAL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-paper-faint" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono block mb-1 text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
                Duration (min)
              </label>
              <input
                type="number"
                min="0"
                placeholder="90"
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                className="font-sans w-full rounded-[10px] border border-rule-strong bg-transparent px-3 py-2 text-[13px] text-paper outline-none focus:border-amber/50"
              />
            </div>
            <div>
              <label className="font-mono block mb-1 text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
                Location
              </label>
              <input
                type="text"
                placeholder="Studio B"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="font-sans w-full rounded-[10px] border border-rule-strong bg-transparent px-3 py-2 text-[13px] text-paper outline-none focus:border-amber/50"
              />
            </div>
          </div>

          <div>
            <label className="font-mono block mb-1 text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
              Notes
            </label>
            <textarea
              placeholder="Director notes, blocking, etc."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="font-sans w-full resize-none rounded-[10px] border border-rule-strong bg-transparent px-3 py-2 text-[13px] text-paper outline-none focus:border-amber/50"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "font-sans flex-1 rounded-[10px] border border-green/40 bg-green/[0.1] py-2.5 text-[13px] font-medium text-green transition-opacity",
                saving && "opacity-50",
              )}
            >
              {saving ? "Saving…" : "Log rehearsal"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="font-sans rounded-[10px] border border-rule bg-white/[0.02] px-4 py-2.5 text-[13px] text-paper-faint"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="font-sans flex w-full items-center justify-center gap-2 rounded-[10px] border border-rule-strong bg-white/[0.02] py-3 text-[13px] text-paper-dim hover:bg-white/[0.04] transition-colors min-h-[44px]"
        >
          <Plus className="size-4" />
          Log rehearsal
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Scripts tab                                                         */
/* ------------------------------------------------------------------ */

function ScriptsTab({ jobId, scripts: initial }: { jobId: string; scripts: Script[] }) {
  const [scripts, setScripts] = useState<Script[]>(initial)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/jobs/${jobId}/scripts`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed.")
      const created: Script = await res.json()
      setScripts((prev) => [created, ...prev])
    } catch {
      // surface inline if needed
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const FILE_TYPE_ICONS: Record<Script["file_type"], string> = {
    pdf: "PDF",
    txt: "TXT",
    docx: "DOC",
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="mt-4 space-y-3.5">
      {scripts.length === 0 && (
        <div className="py-8 text-center">
          <p className="font-serif text-[17px] italic text-paper-faint">
            No scripts uploaded yet.
          </p>
        </div>
      )}

      {scripts.length > 0 && (
        <div className="overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.018),transparent)]">
          {scripts.map((script) => (
            <Link
              key={script.id}
              href={`/dashboard/jobs/${jobId}/script?scriptId=${script.id}`}
              className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-t border-rule px-[18px] py-3.5 first:border-t-0 hover:bg-white/[0.015] transition-colors"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-[8px] border border-rule-strong bg-white/[0.04]">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-paper-faint">
                  {FILE_TYPE_ICONS[script.file_type]}
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-sans text-[13px] text-paper truncate">{script.file_name}</div>
                <div className="font-mono mt-0.5 text-[10px] text-paper-faint">
                  {formatBytes(script.file_size_bytes)}
                  {script.version_label && ` · ${script.version_label}`}
                </div>
              </div>
              <FileText className="size-4 text-paper-faint shrink-0" strokeWidth={1.4} />
            </Link>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div
        className="relative flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-rule-strong py-8 transition-colors hover:border-amber/40 hover:bg-amber/[0.02] cursor-pointer min-h-[44px]"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="grid size-10 place-items-center rounded-full border border-rule-strong bg-white/[0.03]">
          <Plus className="size-5 text-paper-faint" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <div className="font-sans text-[13px] text-paper-dim">
            {uploading ? "Uploading…" : "Upload a script"}
          </div>
          <div className="font-mono mt-0.5 text-[10px] uppercase tracking-[0.1em] text-paper-faint">
            PDF, TXT, or DOCX
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main detail component                                               */
/* ------------------------------------------------------------------ */

function JobDetail({ id }: { id: string }) {
  const [job, setJob] = useState<Job | null>(null)
  const [rehearsals, setRehearsals] = useState<RehearsalLog[]>([])
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("overview")

  useEffect(() => {
    let active = true
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/jobs/${id}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error("not_found")
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        if (!active) return
        setJob(data.job ?? null)
        setRehearsals(data.rehearsals ?? [])
        setScripts(data.scripts ?? [])
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load job.")
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchDetail()
    return () => { active = false }
  }, [id])

  if (loading) {
    return (
      <p className="font-serif py-16 text-center text-[18px] italic text-paper-faint">
        Loading&hellip;
      </p>
    )
  }

  if (error === "not_found" || !job) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-[20px] italic text-paper-faint">Job not found.</p>
        <Link
          href="/dashboard/jobs"
          className="font-mono mt-4 inline-block text-[11px] uppercase tracking-[0.18em] text-amber"
        >
          &larr; Back to jobs
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-[18px] italic text-paper-faint">{error}</p>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "rehearsals", label: "Rehearsals", count: rehearsals.length },
    { key: "scripts", label: "Scripts", count: scripts.length },
  ]

  return (
    <div className="-mx-[22px]">
      {/* Back nav */}
      <div className="flex items-center gap-4 px-[22px] pb-3 pt-1">
        <Link
          href="/dashboard/jobs"
          className="font-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-dim"
        >
          <ArrowLeft className="size-3.5 text-paper" /> Back
        </Link>
      </div>

      {/* Hero */}
      <div
        className="relative mx-[22px] h-[220px] overflow-hidden rounded-[14px] border border-rule-strong"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(100,80,140,.4), transparent 65%), repeating-linear-gradient(135deg, #2a241d 0 12px, #1d1814 12px 24px)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.35) 0 8%, transparent 30% 60%, rgba(0,0,0,.85) 100%)",
          }}
        />
        <span
          className={cn(
            "font-mono absolute left-3.5 top-3.5 z-[3] rounded-[30px] border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] backdrop-blur",
            job.status === "active" && "border-green/45 text-green",
            job.status === "wrapped" && "border-paper-faint/45 text-paper-faint",
            job.status === "archived" && "border-rule text-paper-faint",
          )}
        >
          {job.status}
        </span>
        <div className="absolute inset-x-4 bottom-4 z-[3]">
          <div className="font-serif text-[30px] leading-none tracking-[-0.01em] text-white [text-shadow:0_2px_16px_rgba(0,0,0,.7)]">
            {job.title}
          </div>
          <div className="font-mono mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[rgba(244,239,230,.7)]">
            {[job.role_name, PROJECT_TYPE_LABELS[job.project_type]].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="mx-[22px] mt-3 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {job.start_date && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-rule px-3 py-2">
            <Calendar className="size-3.5 text-paper-faint" strokeWidth={1.5} />
            <span className="font-mono text-[10.5px] tracking-[0.04em] text-paper-dim">
              {new Date(job.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {job.end_date && ` — ${new Date(job.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </span>
          </div>
        )}
        {job.location && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-rule px-3 py-2">
            <MapPin className="size-3.5 text-paper-faint" strokeWidth={1.5} />
            <span className="font-mono text-[10.5px] tracking-[0.04em] text-paper-dim">{job.location}</span>
          </div>
        )}
        {job.compensation && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-rule px-3 py-2">
            <DollarSign className="size-3.5 text-green" strokeWidth={1.5} />
            <span className="font-mono text-[10.5px] tracking-[0.04em] text-green">{job.compensation}</span>
          </div>
        )}
      </div>

      {/* Sub-navigation tabs */}
      <div className="mx-[22px] mt-4 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "font-mono flex-1 rounded-[10px] border py-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
              tab === t.key
                ? "border-amber bg-amber/[0.15] text-amber"
                : "border-rule bg-white/[0.02] text-paper-faint hover:border-rule-strong hover:text-paper-dim",
            )}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="ml-1 opacity-60">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mx-[22px]">
        {tab === "overview" && <OverviewTab job={job} />}
        {tab === "rehearsals" && <RehearsalsTab jobId={id} rehearsals={rehearsals} />}
        {tab === "scripts" && <ScriptsTab jobId={id} scripts={scripts} />}
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>()
  return (
    <DashboardShell>
      <JobDetail id={params.id} />
    </DashboardShell>
  )
}
