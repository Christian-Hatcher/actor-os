import { describe, it, expect } from "vitest"
import {
  estimateTax,
  taxNudgeAmount,
  DEFAULT_TAX_SETTINGS,
  type TaxSettings,
} from "../tax-estimator"

function settings(over: Partial<TaxSettings>): TaxSettings {
  return { ...DEFAULT_TAX_SETTINGS, ...over }
}

describe("estimateTax", () => {
  it("zero income → zero tax, zero rate, no NaN", () => {
    const r = estimateTax(0, settings({}))
    expect(r.estimatedTax).toBe(0)
    expect(r.effectiveRate).toBe(0)
    expect(Number.isFinite(r.effectiveRate)).toBe(true)
  })

  it("clamps negative income to zero", () => {
    const r = estimateTax(-50_000, settings({}))
    expect(r.grossIncome).toBe(0)
    expect(r.estimatedTax).toBe(0)
  })

  it("manual_rate override short-circuits and uses the flat rate", () => {
    const r = estimateTax(100_000, settings({ manual_rate: 0.3 }))
    expect(r.effectiveRate).toBe(0.3)
    expect(r.estimatedTax).toBe(30_000)
    expect(r.breakdown).toHaveLength(1)
    expect(r.breakdown[0].label).toBe("Manual rate")
  })

  it("US single filer at modest income includes SE + federal lines", () => {
    const r = estimateTax(50_000, settings({ jurisdiction: "us", filing_status: "single" }))
    const labels = r.breakdown.map((b) => b.label)
    expect(labels).toContain("Self-employment tax")
    expect(labels).toContain("Federal income tax")
    // Effective rate should be sensible (somewhere 10-30% for this band)
    expect(r.effectiveRate).toBeGreaterThan(0.05)
    expect(r.effectiveRate).toBeLessThan(0.4)
  })

  it("US adds a state-tax line when state_tax_rate > 0", () => {
    const withState = estimateTax(
      80_000,
      settings({ jurisdiction: "us", filing_status: "single", state_tax_rate: 0.05 }),
    )
    expect(withState.breakdown.find((b) => b.label === "State tax")?.amount).toBe(4_000)
  })

  it("US tax scales monotonically with income", () => {
    const a = estimateTax(40_000, settings({ jurisdiction: "us" })).estimatedTax
    const b = estimateTax(80_000, settings({ jurisdiction: "us" })).estimatedTax
    const c = estimateTax(200_000, settings({ jurisdiction: "us" })).estimatedTax
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })

  it("JP jurisdiction returns a single withholding line", () => {
    const r = estimateTax(5_000_000, settings({ jurisdiction: "jp" }))
    expect(r.breakdown).toHaveLength(1)
    expect(r.breakdown[0].label).toMatch(/withholding/i)
    expect(r.estimatedTax).toBeGreaterThan(0)
  })

  it("UK jurisdiction returns income tax + NI", () => {
    const r = estimateTax(60_000, settings({ jurisdiction: "uk" }))
    const labels = r.breakdown.map((b) => b.label)
    expect(labels).toContain("Income tax")
    expect(labels).toContain("National Insurance")
  })

  it("unknown jurisdiction falls back to 25% flat", () => {
    const r = estimateTax(40_000, settings({ jurisdiction: "other" }))
    expect(r.effectiveRate).toBeCloseTo(0.25, 5)
    expect(r.estimatedTax).toBe(10_000)
  })
})

describe("taxNudgeAmount", () => {
  it("returns 0 for zero / negative pay", () => {
    expect(taxNudgeAmount(0, settings({}))).toBe(0)
    expect(taxNudgeAmount(-500, settings({}))).toBe(0)
  })

  it("uses manual rate directly when set", () => {
    expect(taxNudgeAmount(1_000, settings({ manual_rate: 0.25 }))).toBe(250)
  })

  it("scales with booking pay", () => {
    const s = settings({ jurisdiction: "us", filing_status: "single" })
    const small = taxNudgeAmount(500, s)
    const big = taxNudgeAmount(5_000, s)
    expect(big).toBeGreaterThan(small)
  })
})
