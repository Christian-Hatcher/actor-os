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

// US self-employment tax rate (Social Security 12.4% + Medicare 2.9%)
const US_SE_TAX_RATE = 0.153
// Only 92.35% of net earnings subject to SE tax
const US_SE_TAXABLE_PCT = 0.9235
// Deduct half of SE tax from income
const US_SE_DEDUCTION_PCT = 0.5

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
  // Manual override — simplest path
  if (settings.manual_rate !== null && settings.manual_rate > 0) {
    const tax = Math.round(annualGross * settings.manual_rate)
    return {
      grossIncome: annualGross,
      effectiveRate: settings.manual_rate,
      estimatedTax: tax,
      breakdown: [{ label: "Manual rate", amount: tax }],
    }
  }

  switch (settings.jurisdiction) {
    case "jp": {
      const tax = estimateJapanTax(annualGross)
      return {
        grossIncome: annualGross,
        effectiveRate: annualGross > 0 ? tax / annualGross : 0,
        estimatedTax: tax,
        breakdown: [{ label: "Withholding (gensenchoushu)", amount: tax }],
      }
    }

    case "us": {
      const breakdown: { label: string; amount: number }[] = []

      // Self-employment tax
      const seBase = annualGross * US_SE_TAXABLE_PCT
      const seTax = Math.round(seBase * US_SE_TAX_RATE)
      breakdown.push({ label: "Self-employment tax", amount: seTax })

      // Federal income tax (after SE deduction)
      const seDeduction = seTax * US_SE_DEDUCTION_PCT
      const brackets =
        settings.filing_status === "married_joint"
          ? US_BRACKETS_MARRIED_JOINT
          : US_BRACKETS_SINGLE
      // Standard deduction (2026 approx)
      const standardDeduction =
        settings.filing_status === "married_joint" ? 30000 : 15000
      const taxableIncome = Math.max(0, annualGross - seDeduction - standardDeduction)
      const federalTax = estimateUSFederalIncomeTax(taxableIncome, brackets)
      breakdown.push({ label: "Federal income tax", amount: federalTax })

      // State tax
      const stateTax = Math.round(annualGross * settings.state_tax_rate)
      if (stateTax > 0) {
        breakdown.push({ label: "State tax", amount: stateTax })
      }

      const total = seTax + federalTax + stateTax
      return {
        grossIncome: annualGross,
        effectiveRate: annualGross > 0 ? total / annualGross : 0,
        estimatedTax: total,
        breakdown,
      }
    }

    case "uk": {
      // Simplified UK: Class 4 NI (6% on 12,570–50,270, 2% above) + income tax bands
      const personalAllowance = 12570
      const basicCeiling = 50270
      let tax = 0
      const taxable = Math.max(0, annualGross - personalAllowance)
      const basicBand = Math.min(taxable, basicCeiling - personalAllowance)
      const higherBand = Math.max(0, taxable - (basicCeiling - personalAllowance))
      tax += basicBand * 0.20 + higherBand * 0.40
      // Class 4 NI
      const niBase = Math.min(Math.max(0, annualGross - 12570), 50270 - 12570)
      const niHigher = Math.max(0, annualGross - 50270)
      tax += niBase * 0.06 + niHigher * 0.02
      tax = Math.round(tax)
      return {
        grossIncome: annualGross,
        effectiveRate: annualGross > 0 ? tax / annualGross : 0,
        estimatedTax: tax,
        breakdown: [
          { label: "Income tax", amount: Math.round(basicBand * 0.20 + higherBand * 0.40) },
          { label: "National Insurance", amount: Math.round(niBase * 0.06 + niHigher * 0.02) },
        ],
      }
    }

    default: {
      // Fallback: 25% flat estimate for unknown jurisdictions
      const rate = 0.25
      const tax = Math.round(annualGross * rate)
      return {
        grossIncome: annualGross,
        effectiveRate: rate,
        estimatedTax: tax,
        breakdown: [{ label: "Estimated (25% flat)", amount: tax }],
      }
    }
  }
}

/** Per-booking nudge: "Set aside $X from this job for taxes." */
export function taxNudgeAmount(bookingPay: number, settings: TaxSettings): number {
  if (settings.manual_rate !== null && settings.manual_rate > 0) {
    return Math.round(bookingPay * settings.manual_rate)
  }
  // Quick estimate using effective rate from a rough annual projection
  const roughAnnual = bookingPay * 12 // assume this is a typical month
  const estimate = estimateTax(roughAnnual, settings)
  return Math.round(bookingPay * estimate.effectiveRate)
}
