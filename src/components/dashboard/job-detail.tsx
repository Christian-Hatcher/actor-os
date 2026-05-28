"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Sparkles } from "lucide-react"
import { useJob, useRehearsals, useScripts } from "@/hooks/use-jobs"
import { supabase } from "@/lib/supabase"
import { parseYen } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Job, RehearsalLog, RehearsalType, Script } from "@/types"

type TabId = "overview" | "rehearsals" | "scripts"

const REHEARSAL_TYPES: { id: RehearsalType; label: string }[] = [
  { id: "table_read", label: "Table read" },
  { id: "blocking", label: "Blocking" },
  { id: "run_through", label: "Run-through" },
  { id: "tech_rehearsal", label: "Tech" },
  { id: "dress_rehearsal", label: "Dress" },
  { id: "put_in", label: "Put-in" },
  { id: "other", label: "Other" },
]

const STATUS_OPTIONS: Job["status"][] = ["active", "wrapped", "archived"]

function CsRow({ k, v }: { k: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === "") return null
  return (
    <div className="font-mono grid grid-cols-[112px_1fr] items-baseline gap-x-[18px] border-t border-rule px-[18px] py-3 text-[11.5px] tracking-[0.04em] first:border-t-0">
      <span className="text-[10px] uppercase tracking-[0.14em] text-paper-faint">{k}</span>
      <span className="font-sans text-[13px] text-paper">{v}</span>
    </div>
  )
}

function RehearsalCard({ r }: { r: RehearsalLog }) {
  const date = new Date(r.date)
  const typeLabel = r.type ? REHEARSAL_TYPES.find((t) => t.id === r.type)?.label ?? r.type : null
  return (
    <article className="rounded-[12px] border border-rule p-4">
      <header className="flex items-baseline justify-between gap-3">
        <div className="font-serif text-[18px] text-paper">
          {date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
        </div>
        {typeLabel && (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber">
            {typeLabel}
          </span>
        )}
      </header>
      {r.duration_minutes ? (
        <div className="font-mono mt-1 text-[10px] uppercase tracking-[0.14em] text-paper-faint">
          {Math.round(r.duration_minutes / 60)}h {r.duration_minutes % 60}m
        </div>
      ) : null}
      {r.summary && (
        <p className="font-serif mt-2.5 text-[15px] leading-[1.45] text-paper">{r.summary}</p>
      )}
      {r.director_notes && (
        <div className="mt-3 rounded-[10px] border border-amber/30 bg-amber/[0.05] p-3">
          <div className="font-mono mb-1 text-[9px] uppercase tracking-[0.18em] text-amber">
            Director
          </div>
          <p className="font-serif text-[13.5px] italic leading-[1.45] text-paper">
            {r.director_notes}
          </p>
        </div>
      )}
      {r.personal_notes && (
        <p className="mt-2.5 text-[12.5px] leading-[1.45] text-paper-dim">{r.personal_notes}</p>
      )}
    </article>
  )
}

function NewRehearsalForm({
  onSubmit,
}: {
  onSubmit: (input: Omit<RehearsalLog, "id" | "user_id" | "created_at" | "job_id">) => Promise<void>
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<RehearsalType>("run_through")
  const [duration, setDuration] = useState("")
  const [summary, setSummary] = useState("")
  const [director, setDirector] = useState("")
  const [personal, setPersonal] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        date,
        type,
        duration_minutes: duration ? parseInt(duration, 10) : null,
        summary: summary || null,
        director_notes: director || null,
        personal_notes: personal || null,
      })
      setSummary("")
      setDirector("")
      setPersonal("")
      setDuration("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the rehearsal")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handle}
      className="rounded-[14px] border border-amber/30 bg-amber/[0.04] p-4"
    >
      <div className="font-mono mb-3 text-[10px] uppercase tracking-[0.18em] text-amber">
        Log rehearsal
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="font-sans rounded-[8px] border border-rule-strong bg-bg2 px-2 py-1.5 text-[13px] text-paper"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
            Type
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RehearsalType)}
            className="font-sans rounded-[8px] border border-rule-strong bg-bg2 px-2 py-1.5 text-[13px] text-paper"
          >
            {REHEARSAL_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-2 flex flex-col gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
          Duration (minutes)
        </span>
        <input
          type="number"
          min="0"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 180"
          className="font-sans rounded-[8px] border border-rule-strong bg-bg2 px-2 py-1.5 text-[13px] text-paper"
        />
      </label>
      <label className="mt-2 flex flex-col gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
          Summary
        </span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          placeholder="Worked Act 2 Scene 3. Got blocking on the tea kettle moment."
          className="font-sans rounded-[8px] border border-rule-strong bg-bg2 px-2 py-2 text-[13px] text-paper"
        />
      </label>
      <label className="mt-2 flex flex-col gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber">
          Director&apos;s notes
        </span>
        <textarea
          value={director}
          onChange={(e) => setDirector(e.target.value)}
          rows={2}
          placeholder="More urgency in line 47. Don't drop the moment."
          className="font-sans rounded-[8px] border border-rule-strong bg-bg2 px-2 py-2 text-[13px] text-paper"
        />
      </label>
      <label className="mt-2 flex flex-col gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
          Personal notes
        </span>
        <textarea
          value={personal}
          onChange={(e) => setPersonal(e.target.value)}
          rows={2}
          placeholder="Felt locked in. Try sitting earlier next run."
          className="font-sans rounded-[8px] border border-rule-strong bg-bg2 px-2 py-2 text-[13px] text-paper"
        />
      </label>
      {error && (
        <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.14em] text-red">{error}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="font-sans mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[30px] border border-paper bg-paper px-3.5 py-2 text-[13px] font-medium text-bg disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save rehearsal"}
      </button>
    </form>
  )
}

function ScriptRow({ s }: { s: Script }) {
  const sizeKb = s.file_size_bytes ? Math.round(s.file_size_bytes / 1024) : null
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[12px] border border-rule p-3.5">
      <div className="min-w-0">
        <div className="font-serif truncate text-[16px] text-paper">{s.title}</div>
        <div className="font-mono mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
          {(s.file_type ?? "file").toUpperCase()}
          {sizeKb ? ` · ${sizeKb} KB` : ""} ·{" "}
          {new Date(s.uploaded_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
      {s.file_url ? (
        <a
          href={s.file_url}
          target="_blank"
          rel="noreferrer"
          className="font-mono rounded-[30px] border border-rule-strong px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-paper-dim"
        >
          Open
        </a>
      ) : (
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
          No file
        </span>
      )}
    </div>
  )
}

export function JobDetail({ id }: { id: string }) {
  const { job, loading, error, setJob } = useJob(id)
  const { rehearsals, loading: rehearsalsLoading, addRehearsal } = useRehearsals(id)
  const { scripts, loading: scriptsLoading } = useScripts(id)
  const [tab, setTab] = useState<TabId>("overview")
  const [showRehearsalForm, setShowRehearsalForm] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  if (loading) {
    return (
      <p className="font-serif py-16 text-center text-[18px] italic text-paper-faint">
        Pulling the job…
      </p>
    )
  }
  if (error || !job) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-[20px] italic text-paper-faint">Job not found.</p>
        <Link
          href="/dashboard/jobs"
          className="font-mono mt-4 inline-block text-[11px] uppercase tracking-[0.18em] text-amber"
        >
          ← Back to jobs
        </Link>
      </div>
    )
  }

  async function changeStatus(next: Job["status"]) {
    if (!job || next === job.status) return
    setStatusUpdating(true)
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", job.id)
      if (error) throw error
      setJob({ ...job, status: next })
    } finally {
      setStatusUpdating(false)
    }
  }

  const pay = parseYen(job.compensation)
  const start = job.start_date ? new Date(job.start_date) : null
  const end = job.end_date ? new Date(job.end_date) : null

  return (
    <div className="-mx-[22px]">
      {/* Head */}
      <div className="flex items-center justify-between gap-4 px-[22px] pb-3 pt-1">
        <Link
          href="/dashboard/jobs"
          className="font-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-dim"
        >
          <ArrowLeft className="size-3.5 text-paper" /> Jobs
        </Link>
        <select
          value={job.status}
          onChange={(e) => changeStatus(e.target.value as Job["status"])}
          disabled={statusUpdating}
          className="font-mono rounded-[30px] border border-rule-strong bg-bg2 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-paper"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Hero */}
      <div className="px-[22px]">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint">
          {job.type.toUpperCase()}
          {job.production_company ? ` · ${job.production_company}` : ""}
        </div>
        <h1 className="font-serif mt-2 text-[34px] leading-[1.05] tracking-[-0.01em] text-paper">
          {job.title}
        </h1>
        <div className="font-mono mt-2 text-[10.5px] uppercase tracking-[0.14em] text-paper-dim">
          {[
            job.role_name,
            start &&
              `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${end ? ` → ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {pay > 0 && (
          <div className="font-serif mt-3 text-[24px] leading-none text-green">
            ¥{pay.toLocaleString("en-US")}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto px-[22px] pb-1">
        {([
          { id: "overview", label: "Overview" },
          { id: "rehearsals", label: `Rehearsals · ${rehearsals.length}` },
          { id: "scripts", label: `Scripts · ${scripts.length}` },
        ] as const).map((t) => {
          const on = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "font-mono whitespace-nowrap rounded-[30px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors",
                on
                  ? "border-amber bg-amber/[0.12] text-amber"
                  : "border-rule-strong text-paper-dim",
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="mt-4 px-[22px]">
        {tab === "overview" && (
          <div className="overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.018),transparent)]">
            <CsRow k="Role" v={job.role_name} />
            <CsRow k="Type" v={job.type} />
            <CsRow k="Director" v={job.director} />
            <CsRow k="Production" v={job.production_company} />
            <CsRow k="Venue" v={job.venue_or_location} />
            <CsRow k="Pay" v={job.compensation} />
            <CsRow k="Start" v={start?.toLocaleDateString("en-US", { dateStyle: "medium" })} />
            <CsRow k="End" v={end?.toLocaleDateString("en-US", { dateStyle: "medium" })} />
            {job.audition_id && (
              <div className="border-t border-rule px-[18px] py-3">
                <Link
                  href={`/dashboard/auditions/${job.audition_id}`}
                  className="font-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-amber"
                >
                  <Sparkles className="size-3.5" /> View origin audition
                </Link>
              </div>
            )}
            {job.notes && (
              <div className="border-t border-rule px-[18px] py-4">
                <div className="font-mono mb-1.5 text-[10px] uppercase tracking-[0.14em] text-paper-faint">
                  Notes
                </div>
                <p className="font-serif text-[15px] leading-[1.5] text-paper">{job.notes}</p>
              </div>
            )}
          </div>
        )}

        {tab === "rehearsals" && (
          <div className="flex flex-col gap-3">
            {!showRehearsalForm && (
              <button
                type="button"
                onClick={() => setShowRehearsalForm(true)}
                className="font-sans inline-flex items-center justify-center gap-1.5 rounded-[30px] border border-amber bg-amber/[0.1] px-3.5 py-2 text-[12.5px] font-medium text-amber"
              >
                <Plus className="size-3.5" /> Log a rehearsal
              </button>
            )}
            {showRehearsalForm && (
              <NewRehearsalForm
                onSubmit={async (input) => {
                  await addRehearsal(input)
                  setShowRehearsalForm(false)
                }}
              />
            )}
            {rehearsalsLoading ? (
              <p className="font-serif text-center italic text-paper-faint">Loading rehearsals…</p>
            ) : rehearsals.length === 0 ? (
              <p className="font-serif rounded-[12px] border border-rule px-4 py-10 text-center italic text-paper-faint">
                No rehearsals logged yet. Start with your next one.
              </p>
            ) : (
              rehearsals.map((r) => <RehearsalCard key={r.id} r={r} />)
            )}
          </div>
        )}

        {tab === "scripts" && (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint">
              Script upload + annotation lands in V2.2 — schema is ready, viewer next.
            </p>
            {scriptsLoading ? (
              <p className="font-serif text-center italic text-paper-faint">Loading scripts…</p>
            ) : scripts.length === 0 ? (
              <p className="font-serif rounded-[12px] border border-rule px-4 py-10 text-center italic text-paper-faint">
                No scripts attached to this job yet.
              </p>
            ) : (
              scripts.map((s) => <ScriptRow key={s.id} s={s} />)
            )}
          </div>
        )}
      </div>
    </div>
  )
}
