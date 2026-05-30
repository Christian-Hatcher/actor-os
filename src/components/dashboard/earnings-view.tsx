"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useEarnings, type EarningsRange } from "@/hooks/use-earnings"
import { EarningsChart } from "./earnings-chart"
import { TaxKeeper } from "./tax-keeper"
import { formatPay, formatPayCompact, parsePay, isActiveAudition, currencySymbol } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Audition } from "@/types"

type EarningsTab = "overview" | "goal" | "tax"

const RANGES: EarningsRange[] = ["3M", "6M", "YTD"]

function StatCell({
  n,
  label,
  tone,
}: {
  n: string
  label: string
  tone?: "green" | "red" | "amber"
}) {
  return (
    <div className="min-w-[110px] flex-none rounded-[11px] border border-rule bg-white/[0.018] px-3.5 py-3">
      <div
        className={cn(
          "font-serif whitespace-nowrap text-[22px] leading-none text-paper",
          tone === "green" && "text-green",
          tone === "red" && "text-red",
          tone === "amber" && "text-amber",
        )}
      >
        {n}
      </div>
      <div className="font-mono mt-1.5 whitespace-nowrap text-[9px] uppercase tracking-[0.12em] text-paper-faint">
        {label}
      </div>
    </div>
  )
}

function breakdownTone(a: Audition): "bk" | "passed" | "" {
  if (a.status === "booked") return "bk"
  if (a.status === "passed") return "passed"
  return ""
}

function GoalRing({ pct }: { pct: number }) {
  const r = 88
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, pct))
  return (
    <svg viewBox="0 0 200 200" className="size-[200px]">
      <circle cx="100" cy="100" r={r} fill="none" stroke="var(--rule)" strokeWidth="10" />
      <circle
        cx="100"
        cy="100"
        r={r}
        fill="none"
        stroke="var(--green)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        transform="rotate(-90 100 100)"
      />
      <text
        x="100"
        y="96"
        textAnchor="middle"
        className="font-serif"
        fill="var(--paper)"
        fontSize="40"
      >
        {Math.round(clamped * 100)}%
      </text>
      <text
        x="100"
        y="120"
        textAnchor="middle"
        className="font-mono"
        fill="var(--paper-faint)"
        fontSize="9"
        letterSpacing="2"
      >
        TO GOAL
      </text>
    </svg>
  )
}

export function EarningsView() {
  const { profile } = useAuth()
  const { auditions, loading } = useDashboardData()
  const [range, setRange] = useState<EarningsRange>("6M")
  const [tab, setTab] = useState<EarningsTab>("overview")

  const { buckets, banked, potential, deltaPct, stats, breakdown, monthLabel } = useEarnings(
    auditions,
    range,
  )

  const yearlyGoal = profile?.yearly_goal ?? 0
  const yearBanked = auditions
    .filter((a) => a.status === "booked" && new Date(a.shoot_date || a.created_at).getFullYear() === new Date().getFullYear())
    .reduce((s, a) => s + parsePay(a.compensation), 0)
  const goalPct = yearlyGoal > 0 ? yearBanked / yearlyGoal : 0

  return (
    <div>
      {/* Head row */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-dim"
        >
          <ChevronLeft className="size-3.5" /> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          {/* Tab pills: Overview / Goal / Tax */}
          <div className="inline-flex rounded-[30px] border border-rule bg-white/[0.02] p-[3px]">
            {([
              { id: "overview", label: "Overview" },
              { id: "goal", label: "Goal" },
              { id: "tax", label: "Tax" },
            ] as { id: EarningsTab; label: string }[]).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "font-mono rounded-[30px] px-3 py-1.5 text-[10px] uppercase tracking-[0.1em]",
                  tab === t.id
                    ? t.id === "tax"
                      ? "bg-amber text-bg"
                      : t.id === "goal"
                        ? "bg-green text-bg"
                        : "bg-paper text-bg"
                    : "text-paper-dim",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "overview" && (
            <div className="inline-flex rounded-[30px] border border-rule bg-white/[0.02] p-[3px]">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "font-mono rounded-[30px] px-3.5 py-1 text-[10px] uppercase tracking-[0.1em]",
                    range === r ? "bg-paper text-bg" : "text-paper-dim",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <p className="font-serif mt-10 text-center text-[18px] italic text-paper-faint">
          Tallying your year…
        </p>
      ) : tab === "tax" ? (
        <TaxKeeper />
      ) : tab === "goal" ? (
        /* ===== Goal mode ===== */
        <div className="mt-6">
          <h1 className="font-serif text-center text-[34px] leading-[1.1]">
            Hit {yearlyGoal > 0 ? formatPayCompact(yearlyGoal) : "your goal"} by Dec 31.
          </h1>
          <div className="mt-4 flex justify-center">
            <GoalRing pct={goalPct} />
          </div>
          <p className="font-mono mt-2 text-center text-[11px] uppercase tracking-[0.12em] text-green">
            {formatPay(yearBanked)} banked · {Math.round(goalPct * 100)}% of goal
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <StatCell n={formatPayCompact(Math.round(yearBanked / (new Date().getMonth() + 1)))} label="Avg / month" />
            <StatCell
              n={yearlyGoal > 0 ? formatPayCompact(Math.round(yearlyGoal / 12)) : "—"}
              label="Target / month"
            />
            <StatCell n={String(auditions.filter((a) => a.status === "booked").length)} label="Booked" tone="green" />
            <StatCell
              n={`${auditions.length ? Math.round((auditions.filter((a) => a.status === "booked").length / auditions.length) * 100) : 0}%`}
              label="Book rate"
            />
          </div>
          {yearlyGoal === 0 && (
            <p className="font-serif mt-6 text-center text-[15px] italic text-paper-faint">
              Set a yearly goal in settings to track your pace.
            </p>
          )}
        </div>
      ) : (
        /* ===== Overview ===== */
        <>
          <div className="mt-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper-faint">
              {monthLabel} · banked
            </div>
            <div className="font-serif mt-1.5 text-[64px] leading-none tracking-[-0.02em] text-green">
              <span className="align-[14px] mr-1.5 text-[34px] text-paper-faint">{currencySymbol()}</span>
              {banked.toLocaleString("en-US")}
            </div>
            <div className="font-mono mt-2 text-[11px] tracking-[0.08em] text-paper-dim">
              {deltaPct !== null && (
                <span className="text-green">
                  {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}%
                </span>
              )}{" "}
              {deltaPct !== null && "on last month · "}
              <span className="text-paper-faint">{formatPayCompact(potential)} still in play</span>
            </div>
          </div>

          {/* Chart */}
          <div className="relative mt-3.5 rounded-[14px] border border-rule p-3.5"
            style={{ background: "linear-gradient(180deg, rgba(58,168,107,.04), transparent 70%)" }}>
            <div className="font-mono absolute right-4 top-3.5 flex gap-3.5 text-[9px] uppercase tracking-[0.14em]">
              <span className="inline-flex items-center gap-1.5 text-green">
                <i className="h-0.5 w-3.5 rounded bg-current" />
                banked
              </span>
              <span className="inline-flex items-center gap-1.5 text-paper-dim">
                <i className="w-3.5 border-t-[1.5px] border-dashed border-current" />
                potential
              </span>
            </div>
            <EarningsChart buckets={buckets} />
          </div>

          {/* Stat strip */}
          <div className="-mx-[22px] mt-3.5 flex gap-2 overflow-x-auto px-[22px] [scrollbar-width:none]">
            <StatCell n={String(stats.bookedCount)} label="Booked" tone="green" />
            <StatCell n={String(stats.pendingCount)} label="Pending" />
            <StatCell n={String(stats.passedCount)} label="Passed" tone="red" />
            <StatCell n={formatPayCompact(stats.otTotal)} label="OT" tone="amber" />
          </div>

          {/* Month strip */}
          <div className="mt-3.5">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper-faint">
                By month
              </div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper-faint">
                Swipe ← →
              </div>
            </div>
            <div className="-mx-[22px] flex gap-2.5 overflow-x-auto px-[22px] pb-1 [scrollbar-width:none]">
              {buckets.map((b) => (
                <div
                  key={b.key}
                  className={cn(
                    "flex w-32 flex-none flex-col gap-2 rounded-[12px] border border-rule bg-white/[0.02] p-3.5",
                    b.isCurrent &&
                      "border-green/35 [background:linear-gradient(180deg,rgba(58,168,107,.07),rgba(58,168,107,.01)_60%)]",
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-[20px] leading-none text-paper">{b.name}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper-faint">
                      {b.year}
                    </span>
                  </div>
                  <div className="font-mono text-[12.5px] tracking-[0.02em] text-paper">
                    {formatPay(b.banked)}
                  </div>
                  <div className="relative h-1.5 overflow-hidden rounded bg-white/[0.06]">
                    <i
                      className="absolute inset-y-0 left-0 rounded bg-green"
                      style={{
                        width: `${b.banked + b.potential > 0 ? Math.round((b.banked / (b.banked + b.potential)) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div
                    className={cn(
                      "font-mono text-[9.5px] uppercase tracking-[0.1em]",
                      b.deltaPct === null
                        ? "text-paper-faint"
                        : b.deltaPct >= 0
                          ? "text-green"
                          : "text-red",
                    )}
                  >
                    {b.deltaPct === null
                      ? "—"
                      : `${b.deltaPct >= 0 ? "↑" : "↓"} ${Math.abs(b.deltaPct)}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          <div className="mt-[18px] overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.015),transparent)]">
            <div className="flex items-baseline justify-between px-[18px] pb-2 pt-3.5">
              <div className="font-serif text-[22px] leading-none text-paper">
                {monthLabel} · breakdown
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-dim">
                {breakdown.length} {breakdown.length === 1 ? "project" : "projects"}
              </div>
            </div>
            {breakdown.length === 0 ? (
              <p className="font-serif border-t border-rule px-[18px] py-6 text-center text-[15px] italic text-paper-faint">
                No projects this month yet.
              </p>
            ) : (
              breakdown.map(({ audition: a, pay }) => {
                const tone = breakdownTone(a)
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/auditions/${a.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-3.5 border-t border-rule px-[18px] py-2.5"
                  >
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "font-serif truncate text-[16px] leading-[1.15] text-paper",
                          tone === "passed" && "text-paper-faint",
                        )}
                      >
                        {a.project_name}
                      </div>
                      <div className="font-mono mt-[3px] text-[9.5px] uppercase tracking-[0.1em] text-paper-faint">
                        {a.role_name || a.status}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-[3px]">
                      <span
                        className={cn(
                          "font-mono text-[13px] text-paper",
                          tone === "bk" && "text-green",
                          tone === "passed" && "text-red line-through",
                        )}
                      >
                        {pay > 0 ? formatPay(pay) : "—"}
                      </span>
                      <span className={`chip ${a.status === "callback" ? "cb" : isActiveAudition(a) ? "sub" : tone}`}>
                        {a.status}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
