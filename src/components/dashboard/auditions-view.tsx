"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { Search, Plus, CalendarDays, List, ChevronDown, ChevronRight, ArrowUpDown, RefreshCw } from "lucide-react"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useAuth } from "@/hooks/use-auth"
import { useAuditionGroups, auditionAnchorDate } from "@/hooks/use-data"
import { parsePay } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Audition } from "@/types"

type View = "agenda" | "calendar"
type Filter = "all" | "callback" | "submitted" | "booked" | "past"
type SortKey = "date" | "pay" | "created"

const VIEW_KEY = "auditions_view"
const SORT_KEY = "auditions_sort"
const SUBMITTED_COLLAPSED_KEY = "auditions_submitted_collapsed"

function statusClass(a: Audition): "cb" | "sub" | "bk" | "passed" | "" {
  if (a.status === "callback") return "cb"
  if (a.status === "submitted" || a.status === "pinned") return "sub"
  if (a.status === "booked") return "bk"
  if (a.status === "passed" || a.status === "archived") return "passed"
  return ""
}

function timeLabel(a: Audition): string {
  const iso = auditionAnchorDate(a)
  if (!iso) return "\u2014"
  const d = new Date(iso)
  const hasTime = iso.length > 10 && (d.getHours() !== 0 || d.getMinutes() !== 0)
  return hasTime
    ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { weekday: "short" })
}

function matchesFilter(a: Audition, f: Filter): boolean {
  switch (f) {
    case "all":
      return a.status !== "passed" && a.status !== "archived"
    case "callback":
      return a.status === "callback"
    case "submitted":
      return a.status === "submitted" || a.status === "pinned"
    case "booked":
      return a.status === "booked"
    case "past":
      return a.status === "passed" || a.status === "archived"
  }
}

/** Check if an audition's relevant date has passed (auto-expire candidate). */
function isExpired(a: Audition): boolean {
  if (a.status !== "submitted" && a.status !== "pinned") return false
  const anchor = a.callback_date || a.shoot_date
  if (!anchor) return false
  const anchorDate = new Date(anchor + "T23:59:59")
  return anchorDate < new Date()
}

function sortAuditions(auditions: Audition[], key: SortKey): Audition[] {
  const sorted = [...auditions]
  switch (key) {
    case "pay":
      return sorted.sort((a, b) => parsePay(b.compensation) - parsePay(a.compensation))
    case "date": {
      return sorted.sort((a, b) => {
        const da = auditionAnchorDate(a) || "9999"
        const db = auditionAnchorDate(b) || "9999"
        return da.localeCompare(db)
      })
    }
    case "created":
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
}

function AgendaRow({ a, showExpired }: { a: Audition; showExpired?: boolean }) {
  const sc = statusClass(a)
  const expired = isExpired(a)
  return (
    <Link
      href={`/dashboard/auditions/${a.id}`}
      className={cn(
        "relative grid grid-cols-[56px_1fr_auto] items-center gap-x-4 border-t border-rule py-[18px] pl-6 pr-[22px] first:border-t-0 hover:bg-white/[0.025]",
        expired && showExpired && "opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-[2px]",
          sc === "cb" && "[background:linear-gradient(180deg,var(--amber),rgba(232,167,85,.25))]",
          sc === "sub" && "[background:linear-gradient(180deg,var(--blue),rgba(106,179,232,.25))]",
          sc === "bk" && "[background:linear-gradient(180deg,var(--green),rgba(58,168,107,.25))]",
        )}
      />
      <div className="font-mono text-[11px] tracking-[0.04em] text-paper-dim">{timeLabel(a)}</div>
      <div className="min-w-0">
        <div className="font-serif truncate text-[22px] leading-[1.15] tracking-[-0.005em] text-paper">
          {a.project_name}
        </div>
        <div className="font-mono mt-1.5 truncate text-[10px] uppercase tracking-[0.08em] text-paper-faint">
          {[a.role_name, a.location, a.agency].filter(Boolean).join(" \u00b7 ") || "\u2014"}
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-[7px]">
        <span className={`chip ${sc}`}>
          {expired ? "expired" : a.status}
        </span>
        {a.compensation && (
          <span className={cn("font-mono text-[11.5px] text-paper", sc === "bk" && "text-green")}>
            {a.compensation}
          </span>
        )}
      </div>
    </Link>
  )
}

function CalendarView({
  auditions,
  selected,
  onSelect,
}: {
  auditions: Audition[]
  selected: string | null
  onSelect: (key: string) => void
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const todayKey = new Date().toISOString().slice(0, 10)

  const byDay = useMemo(() => {
    const m = new Map<string, Audition[]>()
    for (const a of auditions) {
      const iso = auditionAnchorDate(a)
      if (!iso) continue
      const key = iso.slice(0, 10)
      const list = m.get(key) ?? []
      list.push(a)
      m.set(key, list)
    }
    return m
  }, [auditions])

  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const startOffset = (first.getDay() + 6) % 7 // Monday-first
    const out: Array<{ date: Date; outside: boolean }> = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(year, month, 1 - startOffset + i)
      out.push({ date, outside: date.getMonth() !== month })
    }
    return out
  }, [cursor])

  function dayClass(list: Audition[] | undefined): string {
    if (!list?.length) return ""
    if (list.some((a) => a.status === "booked")) return "bk"
    if (list.some((a) => a.status === "callback")) return "cb"
    return "sub"
  }

  const selectedList = selected ? byDay.get(selected) : undefined

  return (
    <div className="px-[22px] pb-2 pt-1.5">
      <div className="flex items-baseline justify-between py-2.5">
        <div className="font-serif text-[30px] leading-none tracking-[-0.015em]">
          {cursor.toLocaleDateString("en-US", { month: "long" })}{" "}
          <em className="text-paper-dim">{cursor.getFullYear()}</em>
        </div>
        <div className="font-mono flex gap-1 text-[10px] uppercase tracking-[0.14em] text-paper-dim">
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="rounded-[30px] border border-rule bg-white/[0.02] px-2.5 py-1.5"
          >
            &lsaquo;
          </button>
          <button
            onClick={() => setCursor(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })}
            className="rounded-[30px] border border-paper bg-paper px-2.5 py-1.5 text-bg"
          >
            Today
          </button>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="rounded-[30px] border border-rule bg-white/[0.02] px-2.5 py-1.5"
          >
            &rsaquo;
          </button>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-7 gap-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div
            key={d}
            className="font-mono py-1 text-center text-[9px] uppercase tracking-[0.14em] text-paper-faint"
          >
            {d}
          </div>
        ))}
        {cells.map(({ date, outside }) => {
          const key = date.toISOString().slice(0, 10)
          const list = byDay.get(key)
          const sc = dayClass(list)
          const isToday = key === todayKey
          const isSelected = key === selected
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                "relative flex aspect-square flex-col rounded-[8px] border border-rule bg-white/[0.012] px-[7px] pb-1.5 pt-2 text-left",
                outside && "pointer-events-none opacity-30",
                sc === "cb" && "border-amber/30 bg-amber/10",
                sc === "sub" && "border-blue/25 bg-blue/[0.08]",
                sc === "bk" && "border-green/30 bg-green/10",
                isToday && "border-paper bg-paper",
                isSelected && "shadow-[0_0_0_2px_var(--amber)]",
              )}
            >
              <span
                className={cn(
                  "font-serif text-[18px] leading-none",
                  isToday ? "font-semibold text-bg" : "text-paper",
                )}
              >
                {date.getDate()}
              </span>
              {list && list.length > 0 && (
                <span
                  className={cn(
                    "font-mono mt-auto truncate text-[8.5px] uppercase tracking-[0.1em]",
                    isToday
                      ? "text-bg/60"
                      : sc === "cb"
                        ? "text-amber"
                        : sc === "bk"
                          ? "text-green"
                          : "text-blue",
                  )}
                >
                  {list.length === 1 ? list[0].status : `${list.length} events`}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="font-mono mt-3 flex flex-wrap gap-3 text-[9px] uppercase tracking-[0.12em] text-paper-faint">
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-amber" />Callback</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-blue" />Submitted</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-green" />Booked</span>
      </div>

      {/* Selected day events */}
      {selectedList && selectedList.length > 0 && (
        <div className="mt-4 border-t border-rule pt-2">
          {selectedList.map((a) => (
            <AgendaRow key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  const labels: Record<SortKey, string> = { date: "Due date", pay: "Pay", created: "Newest" }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-mono flex items-center gap-1.5 rounded-[30px] border border-rule bg-white/[0.025] px-3 py-[5px] text-[10px] uppercase tracking-[0.1em] text-paper-dim"
      >
        <ArrowUpDown className="size-3" />
        {labels[value]}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-[10px] border border-rule bg-[var(--bg)] shadow-lg">
            {(Object.keys(labels) as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => { onChange(k); setOpen(false) }}
                className={cn(
                  "font-mono block w-full px-3.5 py-2 text-left text-[10px] uppercase tracking-[0.1em]",
                  k === value ? "bg-paper text-bg" : "text-paper-dim hover:bg-white/[0.04]",
                )}
              >
                {labels[k]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CollapsibleSection({
  label,
  count,
  defaultOpen,
  storageKey,
  highlight,
  children,
}: {
  label: string
  count: number
  defaultOpen: boolean
  storageKey?: string
  highlight?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (storageKey) {
      const stored = window.localStorage.getItem(storageKey)
      if (stored === "0") setOpen(false)
      if (stored === "1") setOpen(true)
    }
  }, [storageKey])

  function toggle() {
    setOpen((o) => {
      const next = !o
      if (storageKey) window.localStorage.setItem(storageKey, next ? "1" : "0")
      return next
    })
  }

  return (
    <div className="mt-[22px] first:mt-2">
      <button
        onClick={toggle}
        className="relative flex w-full items-baseline justify-between gap-3.5 px-[22px] pb-3 pt-6 text-left"
      >
        <span
          className="absolute inset-x-[22px] top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, var(--rule-strong) 0, var(--rule) 30%, transparent 100%)",
          }}
        />
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="size-3.5 text-paper-faint" />
          ) : (
            <ChevronRight className="size-3.5 text-paper-faint" />
          )}
          <span
            className={cn(
              "font-serif text-[24px] italic leading-none tracking-[-0.005em]",
              highlight ? "text-amber" : "text-paper",
            )}
          >
            {highlight && (
              <i className="mr-2 inline-block size-1.5 rounded-full bg-amber align-[3px] shadow-[0_0_10px_var(--amber)]" />
            )}
            {label}
          </span>
        </span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-faint">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </button>
      {open && children}
    </div>
  )
}

export function AuditionsView() {
  const { auditions, loading, updateAudition, refresh } = useDashboardData()
  const { user } = useAuth()
  const [view, setView] = useState<View>("agenda")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [sort, setSort] = useState<SortKey>("date")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const handleSync = useCallback(async () => {
    if (syncing || !user?.id) return
    setSyncing(true)
    setSyncMsg("Syncing emails...")
    try {
      const syncRes = await fetch("/api/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      })
      const syncData = await syncRes.json()
      const inserted = syncData.results?.[0]?.emails_inserted || 0

      setSyncMsg(inserted > 0 ? `Parsing ${inserted} new emails...` : "Parsing...")
      const parseRes = await fetch("/api/gmail/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, auto_create: true }),
      })
      const parseData = await parseRes.json()
      const parsed = parseData.parsed || 0
      const created = parseData.created || 0

      if (created > 0) {
        setSyncMsg(`${created} new audition${created > 1 ? "s" : ""} added`)
        refresh()
      } else if (parsed > 0) {
        setSyncMsg(`${parsed} emails parsed`)
        refresh()
      } else if (inserted > 0) {
        setSyncMsg(`${inserted} emails synced`)
      } else {
        setSyncMsg("Up to date")
      }
      setTimeout(() => setSyncMsg(null), 4000)
    } catch {
      setSyncMsg("Sync failed")
      setTimeout(() => setSyncMsg(null), 3000)
    } finally {
      setSyncing(false)
    }
  }, [syncing, user, refresh])

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_KEY)
    if (stored === "agenda" || stored === "calendar") setView(stored)
    const storedSort = window.localStorage.getItem(SORT_KEY)
    if (storedSort === "date" || storedSort === "pay" || storedSort === "created") setSort(storedSort)
  }, [])

  function switchView(v: View) {
    setView(v)
    window.localStorage.setItem(VIEW_KEY, v)
  }

  function switchSort(s: SortKey) {
    setSort(s)
    window.localStorage.setItem(SORT_KEY, s)
  }

  // Auto-expire: mark submitted auditions with past dates as "passed"
  useEffect(() => {
    for (const a of auditions) {
      if (isExpired(a)) {
        updateAudition(a.id, { status: "passed" }).catch(() => {})
      }
    }
  }, [auditions, updateAudition])

  const filtered = useMemo(
    () =>
      sortAuditions(
        auditions.filter((a) => {
          const q = search.toLowerCase()
          const matchesSearch =
            !q ||
            a.project_name.toLowerCase().includes(q) ||
            a.role_name?.toLowerCase().includes(q) ||
            a.agency?.toLowerCase().includes(q)
          return matchesSearch && matchesFilter(a, filter)
        }),
        sort,
      ),
    [auditions, search, filter, sort],
  )

  const groups = useAuditionGroups(filtered)

  const counts = useMemo(() => {
    const active = auditions.filter((a) => a.status !== "passed" && a.status !== "archived")
    return {
      all: active.length,
      callback: auditions.filter((a) => a.status === "callback").length,
      submitted: auditions.filter((a) => a.status === "submitted" || a.status === "pinned").length,
      booked: auditions.filter((a) => a.status === "booked").length,
      past: auditions.filter((a) => a.status === "passed" || a.status === "archived").length,
    }
  }, [auditions])

  const filterDefs: Array<{ key: Filter; label: string; n: number }> = [
    { key: "all", label: "All", n: counts.all },
    { key: "callback", label: "Callback", n: counts.callback },
    { key: "submitted", label: "Submitted", n: counts.submitted },
    { key: "booked", label: "Booked", n: counts.booked },
    { key: "past", label: "Past", n: counts.past },
  ]

  return (
    <div className="-mx-[22px]">
      {/* Page head */}
      <div className="flex items-end justify-between px-[22px]">
        <div>
          <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }).toUpperCase()}{" "}
            · {counts.all} active
          </div>
          <h1 className="font-serif text-[40px] leading-none tracking-[-0.015em]">Auditions</h1>
        </div>
        <div className="flex gap-1 rounded-[30px] border border-rule bg-white/[0.02] p-[3px]">
          <button
            onClick={() => switchView("agenda")}
            aria-label="Agenda view"
            className={cn("rounded-[30px] p-2", view === "agenda" ? "bg-paper text-bg" : "text-paper-dim")}
          >
            <List className="size-3.5" />
          </button>
          <button
            onClick={() => switchView("calendar")}
            aria-label="Calendar view"
            className={cn("rounded-[30px] p-2", view === "calendar" ? "bg-paper text-bg" : "text-paper-dim")}
          >
            <CalendarDays className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2 px-[22px] pb-1 pt-3">
        <label className="flex flex-1 items-center gap-2 rounded-[30px] border border-rule bg-white/[0.025] px-3.5 py-2.5">
          <Search className="size-3.5 text-paper-faint" strokeWidth={1.8} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, roles, agencies"
            className="font-sans flex-1 bg-transparent text-[13px] text-paper outline-none placeholder:text-paper-faint"
          />
        </label>
        <SortDropdown value={sort} onChange={switchSort} />
        <button
          onClick={handleSync}
          disabled={syncing}
          className={cn(
            "font-mono flex-none rounded-[30px] border border-rule bg-white/[0.025] px-3 py-[5px] text-[10px] uppercase tracking-[0.1em] text-paper-dim",
            syncing && "opacity-50",
          )}
        >
          <RefreshCw className={cn("inline size-3 mr-1", syncing && "animate-spin")} />
          Sync
        </button>
        <button className="font-mono flex-none rounded-[30px] bg-paper px-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-bg">
          <Plus className="inline size-3" /> Add
        </button>
      </div>
      {syncMsg && (
        <div className="font-mono px-[22px] py-1.5 text-[11px] text-paper-dim">
          {syncMsg}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto px-[22px] pb-3 pt-3.5 [scrollbar-width:none]">
        {filterDefs.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "font-mono flex-none rounded-[30px] border px-3 py-[5px] text-[10px] uppercase tracking-[0.1em]",
              filter === f.key
                ? "border-paper bg-paper text-bg"
                : "border-rule bg-white/[0.025] text-paper-dim",
            )}
          >
            {f.label} <span className="opacity-60">{f.n}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-serif px-[22px] py-12 text-center text-[18px] italic text-paper-faint">
          Loading your slate&hellip;
        </p>
      ) : view === "calendar" ? (
        <CalendarView auditions={filtered} selected={selectedDay} onSelect={setSelectedDay} />
      ) : filtered.length === 0 ? (
        <p className="font-serif px-[22px] py-12 text-center text-[18px] italic text-paper-faint">
          {search || filter !== "all" ? "Nothing matches." : "No auditions yet. Add your first."}
        </p>
      ) : filter === "past" ? (
        // Past view: sub-sections by status
        (() => {
          const passed = filtered.filter((a) => a.status === "passed")
          const archived = filtered.filter((a) => a.status === "archived")
          const pastGroups = [
            { key: "passed", label: "Passed", auditions: passed },
            { key: "archived", label: "Archived", auditions: archived },
          ].filter((g) => g.auditions.length > 0)

          return pastGroups.map((g) => (
            <CollapsibleSection
              key={g.key}
              label={g.label}
              count={g.auditions.length}
              defaultOpen={g.key === "passed"}
              storageKey={`auditions_past_${g.key}`}
            >
              {g.auditions.map((a) => (
                <AgendaRow key={a.id} a={a} />
              ))}
            </CollapsibleSection>
          ))
        })()
      ) : groups.length === 0 ? (
        <p className="font-serif px-[22px] py-12 text-center text-[18px] italic text-paper-faint">
          {search ? "Nothing matches." : "No auditions in this view."}
        </p>
      ) : (
        groups.map((g) => {
          // "Submitted" and "Awaiting reply" sections are collapsible (start collapsed)
          const isSubmittedGroup = g.auditions.every(
            (a) => a.status === "submitted" || a.status === "pinned"
          )
          const isAwaitingGroup = g.key === "awaiting"
          const shouldCollapse = isSubmittedGroup || isAwaitingGroup

          if (shouldCollapse) {
            return (
              <CollapsibleSection
                key={g.key}
                label={g.label}
                count={g.auditions.length}
                defaultOpen={!isAwaitingGroup}
                storageKey={`auditions_collapse_${g.key}`}
              >
                {g.auditions.map((a) => (
                  <AgendaRow key={a.id} a={a} showExpired />
                ))}
              </CollapsibleSection>
            )
          }

          return (
            <CollapsibleSection
              key={g.key}
              label={g.label}
              count={g.auditions.length}
              defaultOpen
              highlight={g.label.startsWith("Today")}
            >
              {g.auditions.map((a) => (
                <AgendaRow key={a.id} a={a} />
              ))}
            </CollapsibleSection>
          )
        })
      )}
    </div>
  )
}
