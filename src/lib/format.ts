import type { Audition } from "@/types"

// ---------------------------------------------------------------------------
// Currency configuration
// ---------------------------------------------------------------------------

export type CurrencyCode = "JPY" | "USD" | "GBP" | "AUD" | "CAD" | "EUR"

interface CurrencyConfig {
  symbol: string
  locale: string
  decimals: boolean // true for $1,234.56, false for ¥1,234
}

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  JPY: { symbol: "¥", locale: "ja-JP", decimals: false },
  USD: { symbol: "$", locale: "en-US", decimals: true },
  GBP: { symbol: "£", locale: "en-GB", decimals: true },
  AUD: { symbol: "A$", locale: "en-AU", decimals: true },
  CAD: { symbol: "C$", locale: "en-CA", decimals: true },
  EUR: { symbol: "€", locale: "de-DE", decimals: true },
}

// Module-level currency — set from profile on login via setCurrency().
// Safe because all consumers are "use client" components (no SSR sharing).
let _currency: CurrencyCode = "USD"

export function setCurrency(code: string) {
  const upper = code.toUpperCase() as CurrencyCode
  if (upper in CURRENCIES) _currency = upper
}

export function getCurrency(): CurrencyCode {
  return _currency
}

function cfg(): CurrencyConfig {
  return CURRENCIES[_currency]
}

export function currencySymbol(code?: CurrencyCode): string {
  return CURRENCIES[code ?? _currency].symbol
}

// ---------------------------------------------------------------------------
// Parsing — works with any currency symbol in free text
// ---------------------------------------------------------------------------

/** Parse a free-text compensation string into a number (best-effort). */
export function parsePay(comp: string | null | undefined): number {
  if (!comp) return 0
  // Handle "万" (10k) shorthand common in JP listings
  const man = comp.match(/([\d,.]+)\s*万/)
  if (man) return Math.round(parseFloat(man[1].replace(/,/g, "")) * 10000)
  const digits = comp.replace(/[^\d.]/g, "")
  if (!digits) return 0
  const n = parseFloat(digits)
  return isNaN(n) ? 0 : Math.round(n)
}

/** @deprecated Use parsePay — kept for backward compat */
export const parseYen = parsePay

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Compact currency, e.g. 312000 -> "$312k", 4800000 -> "$4.8M". */
export function formatPayCompact(n: number): string {
  const { symbol } = cfg()
  if (Math.abs(n) >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (Math.abs(n) >= 1000) return `${symbol}${Math.round(n / 1000)}k`
  return `${symbol}${n}`
}

/** Full currency with separators, e.g. "$312,000" or "¥312,000". */
export function formatPay(n: number): string {
  const { symbol, decimals } = cfg()
  const opts: Intl.NumberFormatOptions = decimals
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : {}
  return `${symbol}${n.toLocaleString("en-US", opts)}`
}

/** @deprecated Use formatPayCompact */
export const formatYenCompact = formatPayCompact

/** @deprecated Use formatPay */
export const formatYen = formatPay

// ---------------------------------------------------------------------------
// Audition helpers
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: Audition["status"][] = ["submitted", "callback", "pinned"]

export function isActiveAudition(a: Audition): boolean {
  return ACTIVE_STATUSES.includes(a.status)
}

export interface EarningsRollup {
  banked: number
  potential: number
}

/** Banked = booked compensation; potential = everything still alive. */
export function rollupEarnings(auditions: Audition[]): EarningsRollup {
  let banked = 0
  let potential = 0
  for (const a of auditions) {
    const v = parsePay(a.compensation)
    if (a.status === "booked") banked += v
    else if (isActiveAudition(a)) potential += v
  }
  return { banked, potential }
}

/** Initials for the avatar circle, e.g. "Christian Hatcher" -> "CH". */
export function initials(name: string | null | undefined, fallback = "AO"): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
