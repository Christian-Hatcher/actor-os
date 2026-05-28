// Tax estimation engine for freelance actors.
// Supports US (self-employment + federal brackets), Japan (withholding),
// and manual rate override.

export type TaxJurisdiction = "us" | "jp" | "uk" | "au" | "ca" | "other"
export type USFilingStatus = "single" | "married_joint" | "married_separate" | "head_of_household"

export interface TaxSettings {
  jurisdiction: TaxJurisdiction
  filing_status: USFilingStatus
  state_tax_rate: number // decimal, e.g. 0.05 for 5%
  manual_rate: number | null // decimal override — if set, ignores brackets
  tax_savings_reminder: boolean
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  jurisdiction: "us",
  filing_status: "single",
  state_tax_rate: 0,
  manual_rate: null,
  tax_savings_reminder: true,
}

// US 2026 federal brackets (single filer, approximate — update yearly)
const US_BRACKETS_SINGLE: [number, number][] = [
  [11600, 0.10],
  [47150, 0.12],
  [100525, 0.22],
  [191950, 0.24],
  [243725, 0.32],
  [609350, 0.35],
  [Infinity, 0.37],
]

const US_BRACKETS_MARRIED_JOINT: [number, number][] = [
  [23200, 0.10],
  [94300, 0.12],
  [201050, 0.22],
  [383900, 0.24],
  [487450, 0.32],
  [731200, 0.35],
  [Infinity, 0.37],
]

const US_BRACKETS_MARRIED_SEPARATE: [number, number][] = [
  [11600, 0.10],
  [47150, 0.12],
  [100525, 0.22],
  [191950, 0.24],
  [243725, 0.32],
  [365600, 0.35],
  [Infinity, 0.37],
]

const US_BRACKETS_HOH: [number, number][] = [
  [16550, 0.10],
  [63100, 0.12],
  [100500, 0.22],
  [191950, 0.24],
  [243700, 0.32],
  [609350, 0.35],
  [Infinity, 0.37],
]

// US self-employment tax
const US_SS_RATE = 0.124 // Social Security 12.4%
const US_MEDICARE_RATE = 0.029 // Medicare 2.9%
// Only 92.35% of net earnings subject to SE tax
const US_SE_TAXABLE_PCT = 0.9235
// Deduct half of SE tax from income
const US_SE_DEDUCTION_PCT = 0.5
// Social Security wage base cap (2026 approx)
const US_SS_WAGE_BASE = 176100

// Japan: freelancer withholding (gensenchoushu) — 10.21% on first ¥1M, 20.42% above
function estimateJapanTax(annualIncome: number): number {
  if (annualIncome <= 1_000_000) {
    return Math.round(annualIncome * 0.1021)
  }
  const base = Math.round(1_000_000 * 0.1021)
  const excess = Math.round((annualIncome - 1_000_000) * 0.2042)
  return base + excess
}

function estimateUSFederalIncomeTax(taxableIncome: number, brackets: [number, number][]): number {
  let tax = 0
  let prevCeiling = 0
  for (const [ceiling, rate] of brackets) {
    const taxable = Math.min(taxableIncome, ceiling) - prevCeiling
    if (taxable <= 0) break
    tax += taxable * rate
    prevCeiling = ceiling
  }
  return Math.round(tax)
}

export interface TaxEstimate {
  grossIncome: number
  effectiveRate: number // decimal
  estimatedTax: number
  breakdown: {
    label: string
    amount: number
  }[]
}

export function estimateTax(annualGross: number, settings: TaxSettings): TaxEstimate {
  const gross = Math.max(0, annualGross)

  // Manual override — simplest path
  if (settings.manual_rate !== null && settings.manual_rate > 0) {
    const tax = Math.round(gross * settings.manual_rate)
    return {
      grossIncome: gross,
      effectiveRate: settings.manual_rate,
      estimatedTax: tax,
      breakdown: [{ label: "Manual rate", amount: tax }],
    }
  }

  switch (settings.jurisdiction) {
    case "jp": {
      const tax = estimateJapanTax(gross)
      return {
        grossIncome: gross,
        effectiveRate: gross > 0 ? tax / gross : 0,
        estimatedTax: tax,
        breakdown: [{ label: "Withholding (gensenchoushu)", amount: tax }],
      }
    }

    case "us": {
      const breakdown: { label: string; amount: number }[] = []

      // Self-employment tax (SS capped at wage base, Medicare uncapped)
      const seBase = gross * US_SE_TAXABLE_PCT
      const ssTax = Math.round(Math.min(seBase, US_SS_WAGE_BASE) * US_SS_RATE)
      const medicareTax = Math.round(seBase * US_MEDICARE_RATE)
      const seTax = ssTax + medicareTax
      breakdown.push({ label: "Self-employment tax", amount: seTax })

      // Federal income tax (after SE deduction)
      const seDeduction = seTax * US_SE_DEDUCTION_PCT
      const brackets =
        settings.filing_status === "married_joint"
          ? US_BRACKETS_MARRIED_JOINT
          : settings.filing_status === "married_separate"
            ? US_BRACKETS_MARRIED_SEPARATE
            : settings.filing_status === "head_of_household"
              ? US_BRACKETS_HOH
              : US_BRACKETS_SINGLE
      // Standard deduction (2026 approx)
      const standardDeduction =
        settings.filing_status === "married_joint" ? 30000
          : settings.filing_status === "head_of_household" ? 22500
            : 15000
      const taxableIncome = Math.max(0, gross - seDeduction - standardDeduction)
      const federalTax = estimateUSFederalIncomeTax(taxableIncome, brackets)
      breakdown.push({ label: "Federal income tax", amount: federalTax })

      // State tax
      const stateTax = Math.round(gross * settings.state_tax_rate)
      if (stateTax > 0) {
        breakdown.push({ label: "State tax", amount: stateTax })
      }

      const total = seTax + federalTax + stateTax
      return {
        grossIncome: gross,
        effectiveRate: gross > 0 ? total / gross : 0,
        estimatedTax: total,
        breakdown,
      }
    }

    case "uk": {
      // Simplified UK: income tax bands + Class 4 NI
      const personalAllowance = 12570
      const basicCeiling = 50270
      const higherCeiling = 125140
      let tax = 0
      const taxable = Math.max(0, gross - personalAllowance)
      const basicBand = Math.min(taxable, basicCeiling - personalAllowance)
      const higherBand = Math.min(Math.max(0, taxable - (basicCeiling - personalAllowance)), higherCeiling - basicCeiling)
      const additionalBand = Math.max(0, taxable - (higherCeiling - personalAllowance))
      tax += basicBand * 0.20 + higherBand * 0.40 + additionalBand * 0.45
      // Class 4 NI
      const niBase = Math.min(Math.max(0, gross - 12570), 50270 - 12570)
      const niHigher = Math.max(0, gross - 50270)
      tax += niBase * 0.06 + niHigher * 0.02
      tax = Math.round(tax)
      return {
        grossIncome: gross,
        effectiveRate: gross > 0 ? tax / gross : 0,
        estimatedTax: tax,
        breakdown: [
          { label: "Income tax", amount: Math.round(basicBand * 0.20 + higherBand * 0.40 + additionalBand * 0.45) },
          { label: "National Insurance", amount: Math.round(niBase * 0.06 + niHigher * 0.02) },
        ],
      }
    }

    default: {
      // Fallback: 25% flat estimate for unknown jurisdictions
      const rate = 0.25
      const tax = Math.round(gross * rate)
      return {
        grossIncome: gross,
        effectiveRate: gross > 0 ? rate : 0,
        estimatedTax: tax,
        breakdown: [{ label: "Estimated (25% flat)", amount: tax }],
      }
    }
  }
}

/** Per-booking nudge: "Set aside $X from this job for taxes." */
export function taxNudgeAmount(bookingPay: number, settings: TaxSettings): number {
  const pay = Math.max(0, bookingPay)
  if (settings.manual_rate !== null && settings.manual_rate > 0) {
    return Math.round(pay * settings.manual_rate)
  }
  // Quick estimate using effective rate from a rough annual projection
  const roughAnnual = pay * 12 // assume this is a typical month
  const estimate = estimateTax(roughAnnual, settings)
  return Math.round(pay * estimate.effectiveRate)
}
