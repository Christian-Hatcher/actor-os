"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { parsePay } from "@/lib/format"
import {
  estimateTax,
  DEFAULT_TAX_SETTINGS,
  type TaxSettings,
  type TaxEstimate,
} from "@/lib/tax-estimator"

export interface TaxMonth {
  key: string // yyyy-mm
  label: string // "May '26"
  gross: number
  estimatedTax: number
  setSAside: number // what user actually saved
}

export interface TaxSummary {
  ytdGross: number
  ytdEstimatedTax: number
  ytdSetAside: number
  surplus: number // positive = ahead, negative = behind
  thisMonthGross: number
  thisMonthTax: number
  effectiveRate: number
  months: TaxMonth[]
  estimate: TaxEstimate
}

export function useTax() {
  const { user, profile } = useAuth()
  const { auditions } = useDashboardData()
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS)
  const [withholdings, setWithholdings] = useState<
    { year: number; month: number; actually_set_aside: number }[]
  >([])
  const [loading, setLoading] = useState(true)

  // Load tax settings from profile
  useEffect(() => {
    if (!profile) return
    const stored = (profile as Record<string, unknown>).tax_settings as TaxSettings | undefined
    if (stored) setSettings({ ...DEFAULT_TAX_SETTINGS, ...stored })
  }, [profile])

  // Load withholding records
  useEffect(() => {
    if (!user) return
    async function fetch() {
      const year = new Date().getFullYear()
      const { data } = await supabase
        .from("tax_withholdings")
        .select("year, month, actually_set_aside")
        .eq("user_id", user!.id)
        .eq("year", year)
        .order("month", { ascending: true })
      if (data) setWithholdings(data)
      setLoading(false)
    }
    fetch()
  }, [user])

  const summary = useMemo((): TaxSummary => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Get YTD booked income
    const ytdAuditions = auditions.filter((a) => {
      if (a.status !== "booked") return false
      const d = new Date(a.shoot_date || a.created_at)
      return d.getFullYear() === currentYear
    })
    const ytdGross = ytdAuditions.reduce((sum, a) => sum + parsePay(a.compensation), 0)

    // This month's income
    const thisMonthAuditions = ytdAuditions.filter((a) => {
      const d = new Date(a.shoot_date || a.created_at)
      return d.getMonth() + 1 === currentMonth
    })
    const thisMonthGross = thisMonthAuditions.reduce(
      (sum, a) => sum + parsePay(a.compensation),
      0,
    )

    // Annualize YTD gross for progressive bracket accuracy
    const monthsElapsed = currentMonth
    const annualizedGross = monthsElapsed > 0 ? Math.round(ytdGross / monthsElapsed * 12) : 0
    const estimate = estimateTax(annualizedGross, settings)
    const thisMonthTax = Math.round(thisMonthGross * estimate.effectiveRate)

    // Total set aside this year
    const ytdSetAside = withholdings.reduce((sum, w) => sum + (w.actually_set_aside || 0), 0)

    // Build monthly breakdown
    const months: TaxMonth[] = []
    for (let m = 1; m <= currentMonth; m++) {
      const monthAuditions = ytdAuditions.filter((a) => {
        const d = new Date(a.shoot_date || a.created_at)
        return d.getMonth() + 1 === m
      })
      const gross = monthAuditions.reduce((sum, a) => sum + parsePay(a.compensation), 0)
      const estimatedTax = Math.round(gross * estimate.effectiveRate)
      const saved = withholdings.find((w) => w.month === m)?.actually_set_aside || 0
      const date = new Date(currentYear, m - 1)
      months.push({
        key: `${currentYear}-${String(m).padStart(2, "0")}`,
        label: `${date.toLocaleDateString("en-US", { month: "short" })} '${String(currentYear).slice(2)}`,
        gross,
        estimatedTax,
        setSAside: saved,
      })
    }

    // YTD tax = annualized estimate scaled back to elapsed months
    const ytdEstimatedTax = monthsElapsed > 0
      ? Math.round(estimate.estimatedTax / 12 * monthsElapsed)
      : 0

    return {
      ytdGross,
      ytdEstimatedTax,
      ytdSetAside,
      surplus: ytdSetAside - ytdEstimatedTax,
      thisMonthGross,
      thisMonthTax,
      effectiveRate: estimate.effectiveRate,
      months,
      estimate,
    }
  }, [auditions, settings, withholdings])

  const logSavings = useCallback(
    async (month: number, amount: number) => {
      if (!user) return
      const year = new Date().getFullYear()

      // Find month gross for context
      const monthData = summary.months.find((m) => parseInt(m.key.split("-")[1], 10) === month)

      await supabase
        .from("tax_withholdings")
        .upsert(
          {
            user_id: user.id,
            year,
            month,
            gross_income: monthData?.gross ?? 0,
            tax_rate: summary.effectiveRate,
            estimated_tax: monthData?.estimatedTax ?? 0,
            actually_set_aside: amount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,year,month" },
        )

      setWithholdings((prev) => {
        const idx = prev.findIndex((w) => w.month === month && w.year === year)
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = { ...copy[idx], actually_set_aside: amount }
          return copy
        }
        return [...prev, { year, month, actually_set_aside: amount }]
      })
    },
    [user, summary],
  )

  const updateSettings = useCallback(
    async (patch: Partial<TaxSettings>) => {
      const next = { ...settings, ...patch }
      setSettings(next)
      if (!user) return
      const { error } = await supabase
        .from("profiles")
        .update({ tax_settings: next, updated_at: new Date().toISOString() })
        .eq("id", user.id)
      if (error) {
        // Functional rollback: only revert if state hasn't changed since
        setSettings((cur) => (cur === next ? settings : cur))
      }
    },
    [user, settings],
  )

  return { summary, settings, updateSettings, logSavings, loading }
}
