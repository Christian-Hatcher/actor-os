"use client"

import { useMemo } from "react"
import type { Audition } from "@/types"
import { parsePay, isActiveAudition } from "@/lib/format"

export type EarningsRange = "3M" | "6M" | "YTD" | "ALL"

export interface MonthBucket {
  key: string // yyyy-mm
  date: Date // first of month
  name: string // "May"
  year: string // "'26"
  banked: number
  potential: number
  /** cumulative banked up to and including this month */
  cumulativeBanked: number
  /** cumulative potential ceiling up to and including this month */
  cumulativePotential: number
  isCurrent: boolean
  /** % change in banked vs previous month, or null */
  deltaPct: number | null
}

export interface EarningsStats {
  bookedCount: number
  pendingCount: number
  passedCount: number
  otTotal: number
}

export interface BreakdownRow {
  audition: Audition
  pay: number
}

/** Anchor an audition to a month: shoot date for booked, else submitted/callback/created. */
function anchorDate(a: Audition): Date {
  const iso =
    a.status === "booked"
      ? a.shoot_date || a.callback_date || a.submitted_date || a.created_at
      : a.callback_date || a.submitted_date || a.shoot_date || a.created_at
  return new Date(iso)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function rangeMonths(range: EarningsRange): number {
  switch (range) {
    case "3M":
      return 3
    case "6M":
      return 6
    case "YTD":
      return new Date().getMonth() + 1
    case "ALL":
      return 18
  }
}

export function useEarnings(auditions: Audition[], range: EarningsRange = "6M") {
  return useMemo(() => {
    const now = new Date()
    const months = rangeMonths(range)
    const curKey = monthKey(now)

    // Seed empty buckets oldest→newest.
    const buckets: MonthBucket[] = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({
        key: monthKey(d),
        date: d,
        name: d.toLocaleDateString("en-US", { month: "short" }),
        year: `'${String(d.getFullYear()).slice(2)}`,
        banked: 0,
        potential: 0,
        cumulativeBanked: 0,
        cumulativePotential: 0,
        isCurrent: monthKey(d) === curKey,
        deltaPct: null,
      })
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]))

    for (const a of auditions) {
      const b = byKey.get(monthKey(anchorDate(a)))
      if (!b) continue
      const v = parsePay(a.compensation)
      if (a.status === "booked") b.banked += v
      else if (isActiveAudition(a)) b.potential += v
    }

    // Cumulative + month-over-month delta.
    let cb = 0
    let cp = 0
    let prev: number | null = null
    for (const b of buckets) {
      cb += b.banked
      cp += b.banked + b.potential
      b.cumulativeBanked = cb
      b.cumulativePotential = cp
      if (prev !== null && prev > 0) {
        b.deltaPct = Math.round(((b.banked - prev) / prev) * 100)
      }
      prev = b.banked
    }

    // Current-month figures + stats.
    const current = byKey.get(curKey)
    const banked = current?.banked ?? 0
    const potential = current?.potential ?? 0
    const prevMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const prevBanked = byKey.get(prevMonthKey)?.banked ?? 0
    const deltaPct = prevBanked > 0 ? Math.round(((banked - prevBanked) / prevBanked) * 100) : null

    const thisMonth = auditions.filter((a) => monthKey(anchorDate(a)) === curKey)
    const stats: EarningsStats = {
      bookedCount: thisMonth.filter((a) => a.status === "booked").length,
      pendingCount: thisMonth.filter(isActiveAudition).length,
      passedCount: thisMonth.filter((a) => a.status === "passed").length,
      otTotal: 0, // populated from overtime_log once shoot-day OT lands
    }

    const breakdown: BreakdownRow[] = thisMonth
      .map((a) => ({ audition: a, pay: parsePay(a.compensation) }))
      .sort((x, y) => y.pay - x.pay)

    return { buckets, banked, potential, deltaPct, stats, breakdown, monthLabel: now.toLocaleDateString("en-US", { month: "long" }) }
  }, [auditions, range])
}
