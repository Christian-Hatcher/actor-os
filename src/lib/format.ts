import type { Audition } from "@/types"

/** Parse a free-text compensation string into a yen number (best-effort). */
export function parseYen(comp: string | null | undefined): number {
  if (!comp) return 0
  // Handle "万" (10k) shorthand common in JP listings.
  const man = comp.match(/([\d,.]+)\s*万/)
  if (man) return Math.round(parseFloat(man[1].replace(/,/g, "")) * 10000)
  const digits = comp.replace(/[^\d]/g, "")
  return digits ? parseInt(digits, 10) : 0
}

/** Compact yen, e.g. 312000 -> "¥312k", 4800000 -> "¥4.8M". */
export function formatYenCompact(n: number): string {
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1000) return `¥${Math.round(n / 1000)}k`
  return `¥${n}`
}

/** Full yen with separators, e.g. "¥312,000". */
export function formatYen(n: number): string {
  return `¥${n.toLocaleString("en-US")}`
}

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
    const v = parseYen(a.compensation)
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
