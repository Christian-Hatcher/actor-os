"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, Calendar, MapPin } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { cn } from "@/lib/utils"
import type { Job } from "@/types"

type StatusFilter = "all" | "active" | "wrapped" | "archived"

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "wrapped", label: "Wrapped" },
  { key: "archived", label: "Archived" },
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

function projectTypeBadgeClass(type: Job["project_type"]): string {
  const map: Record<Job["project_type"], string> = {
    film: "border-purple/40 bg-purple/[0.1] text-purple",
    tv: "border-blue/40 bg-blue/[0.1] text-blue",
    commercial: "border-amber/40 bg-amber/[0.1] text-amber",
    theater: "border-green/40 bg-green/[0.1] text-green",
    voice_over: "border-paper-faint/40 bg-white/[0.04] text-paper-faint",
    modeling: "border-paper-faint/40 bg-white/[0.04] text-paper-faint",
    other: "border-paper-faint/40 bg-white/[0.04] text-paper-faint",
  }
  return map[type] ?? "border-rule bg-white/[0.04] text-paper-faint"
}

function statusBadgeClass(status: Job["status"]): string {
  const map: Record<Job["status"], string> = {
    active: "border-green/40 bg-green/[0.1] text-green",
    wrapped: "border-paper-faint/40 bg-white/[0.04] text-paper-faint",
    archived: "border-rule bg-white/[0.03] text-paper-faint",
  }
  return map[status] ?? "border-rule bg-white/[0.04] text-paper-faint"
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return ""
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
  if (start && end) return `${fmt(start)} — ${fmt(end)}`
  if (start) return `From ${fmt(start)}`
  if (end) return `Until ${fmt(end)}`
  return ""
}

function JobRow({ job }: { job: Job }) {
  const dateRange = formatDateRange(job.start_date, job.end_date)

  return (
    <Link
      href={`/dashboard/jobs/${job.id}`}
      className="block border-t border-rule py-4 first:border-t-0 hover:bg-white/[0.015] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[19px] leading-[1.15] text-paper truncate">
            {job.title}
          </div>
          {job.role_name && (
            <div className="mt-0.5 text-[12px] text-paper-dim truncate">{job.role_name}</div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "font-mono inline-flex items-center rounded-[30px] border px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em]",
                projectTypeBadgeClass(job.project_type),
              )}
            >
              {PROJECT_TYPE_LABELS[job.project_type]}
            </span>
            <span
              className={cn(
                "font-mono inline-flex items-center rounded-[30px] border px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em]",
                statusBadgeClass(job.status),
              )}
            >
              {job.status}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 text-right">
          {dateRange && (
            <div className="flex items-center gap-1 text-[11px] text-paper-faint">
              <Calendar className="size-3" />
              <span className="font-mono tracking-[0.02em]">{dateRange}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1 text-[11px] text-paper-faint">
              <MapPin className="size-3" />
              <span className="font-mono tracking-[0.02em] max-w-[120px] truncate">
                {job.location}
              </span>
            </div>
          )}
          {job.compensation && (
            <div className="font-mono text-[11px] tracking-[0.04em] text-green">
              {job.compensation}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function JobsView() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("all")

  useEffect(() => {
    let active = true
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!active) return
        setJobs(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load jobs.")
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchJobs()
    return () => { active = false }
  }, [])

  const filtered =
    filter === "all" ? jobs : jobs.filter((j) => j.status === filter)

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-t border-rule py-4 first:border-t-0">
            <div className="h-5 w-48 rounded bg-white/[0.06] animate-pulse" />
            <div className="mt-2 h-3.5 w-32 rounded bg-white/[0.04] animate-pulse" />
            <div className="mt-3 flex gap-1.5">
              <div className="h-4 w-16 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-14 rounded-full bg-white/[0.04] animate-pulse" />
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
          Couldn&apos;t load jobs.
        </p>
        <p className="mt-1 text-[12px] text-paper-faint">{error}</p>
      </div>
    )
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto py-4 no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? jobs.length
              : jobs.filter((j) => j.status === tab.key).length
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={cn(
                "font-mono shrink-0 rounded-[30px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
                filter === tab.key
                  ? "border-amber bg-amber/[0.15] text-amber"
                  : "border-rule bg-white/[0.02] text-paper-faint hover:border-rule-strong hover:text-paper-dim",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 opacity-60">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <div
            className="mx-auto grid size-[64px] place-items-center rounded-full border border-rule-strong"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,.04), transparent 50%), linear-gradient(45deg, #2a251f, #3a3329)",
            }}
          >
            <Briefcase className="size-6 text-paper-faint" strokeWidth={1.4} />
          </div>
          <h2 className="font-serif mt-5 text-[22px] leading-tight tracking-[-0.01em] text-paper">
            {filter === "all" ? "No jobs yet." : `No ${filter} jobs.`}
          </h2>
          <p className="mt-2 max-w-[320px] mx-auto text-[13px] leading-relaxed text-paper-dim">
            {filter === "all"
              ? "Jobs are created automatically when you book an audition."
              : `You have no jobs with status "${filter}" right now.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </>
  )
}

export default function JobsPage() {
  return (
    <DashboardShell>
      <div className="font-mono mb-1 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
        Jobs
      </div>
      <h1 className="font-serif text-[32px] leading-none tracking-[-0.015em] text-paper">
        Your work.
      </h1>
      <JobsView />
    </DashboardShell>
  )
}
