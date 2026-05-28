"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useJobs } from "@/hooks/use-jobs"
import { parseYen, formatYenCompact } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import type { Job } from "@/types"

type FilterMode = "all" | "active" | "wrapped"

const TYPE_LABEL: Record<Job["type"], string> = {
  theater: "Theater",
  film: "Film",
  commercial: "Commercial",
  voiceover: "VO",
  other: "Other",
}

function statusChip(status: Job["status"]) {
  if (status === "active") return { cls: "bk", label: "ACTIVE" }
  if (status === "wrapped") return { cls: "sub", label: "WRAPPED" }
  return { cls: "", label: "ARCHIVED" }
}

function JobRow({ j }: { j: Job }) {
  const start = j.start_date ? new Date(j.start_date) : null
  const end = j.end_date ? new Date(j.end_date) : null
  const pay = parseYen(j.compensation)
  const chip = statusChip(j.status)

  return (
    <Link
      href={`/dashboard/jobs/${j.id}`}
      className="grid grid-cols-[1fr_auto] items-start gap-3 border-t border-rule py-3.5 first:border-t-0"
    >
      <div className="min-w-0">
        <div className="font-mono mb-1 text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
          {TYPE_LABEL[j.type]}
          {j.production_company ? ` · ${j.production_company}` : ""}
        </div>
        <div className="font-serif truncate text-[20px] leading-[1.1] text-paper">{j.title}</div>
        <div className="mt-1 truncate text-[11.5px] text-paper-dim">
          {[j.role_name, j.venue_or_location, j.director && `dir. ${j.director}`]
            .filter(Boolean)
            .join(" · ") || "No details yet"}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className={`chip ${chip.cls}`}>{chip.label}</span>
        {pay > 0 && (
          <span className="font-mono text-[10.5px] tracking-[0.04em] text-green">
            {formatYenCompact(pay)}
          </span>
        )}
        {(start || end) && (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper-faint">
            {start ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBC"}
            {end ? ` → ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
          </span>
        )}
      </div>
    </Link>
  )
}

export function JobsView() {
  const { profile } = useAuth()
  const { jobs, loading } = useJobs()
  const [filter, setFilter] = useState<FilterMode>("active")

  // Honor focus mode from profile: when theater or film is picked, filter the list.
  const mode = profile?.preferred_mode ?? "both"

  const filtered = useMemo(() => {
    let rows = jobs
    if (filter === "active") rows = rows.filter((j) => j.status === "active")
    else if (filter === "wrapped") rows = rows.filter((j) => j.status === "wrapped")
    if (mode === "theater") rows = rows.filter((j) => j.type === "theater")
    else if (mode === "film") rows = rows.filter((j) => j.type === "film" || j.type === "commercial")
    return rows
  }, [jobs, filter, mode])

  const counts = useMemo(() => {
    const active = jobs.filter((j) => j.status === "active").length
    const wrapped = jobs.filter((j) => j.status === "wrapped").length
    return { all: jobs.length, active, wrapped }
  }, [jobs])

  return (
    <div className="pb-4">
      <div className="flex items-end justify-between pt-2.5">
        <div>
          <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            Career · Booked &amp; running
          </div>
          <h1 className="font-serif text-[34px] leading-none tracking-[-0.01em]">Jobs.</h1>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="font-sans inline-flex items-center gap-1.5 rounded-[30px] border border-paper bg-paper px-3.5 py-2 text-[12px] font-medium text-bg"
        >
          New job <span className="font-serif text-base leading-none">+</span>
        </Link>
      </div>

      {/* Filter pills */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: "active", label: "Active", n: counts.active },
            { id: "wrapped", label: "Wrapped", n: counts.wrapped },
            { id: "all", label: "All", n: counts.all },
          ] as const
        ).map((p) => {
          const on = filter === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setFilter(p.id)}
              className={`font-mono rounded-[30px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                on
                  ? "border-amber bg-amber/[0.12] text-amber"
                  : "border-rule-strong text-paper-dim hover:text-paper"
              }`}
            >
              {p.label}
              <span className="ml-1.5 text-paper-faint">{p.n}</span>
            </button>
          )
        })}
        {mode !== "both" && (
          <span className="font-mono ml-auto rounded-[30px] border border-rule px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-paper-faint">
            {mode === "theater" ? "Theater focus" : "Film focus"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 rounded-[14px] border border-rule px-5 py-12 text-center">
          <p className="font-serif text-[20px] italic text-paper-dim">
            {jobs.length === 0 ? "No jobs yet." : "Nothing matches that filter."}
          </p>
          <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.18em] text-paper-faint">
            Promote a booked audition or create one manually
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link
              href="/dashboard/auditions"
              className="font-mono rounded-[30px] border border-rule-strong px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-paper-dim"
            >
              Open auditions →
            </Link>
            <Link
              href="/dashboard/jobs/new"
              className="font-mono rounded-[30px] border border-amber bg-amber/[0.12] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-amber"
            >
              + New job
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col">
          {filtered.map((j) => (
            <JobRow key={j.id} j={j} />
          ))}
        </div>
      )}
    </div>
  )
}
