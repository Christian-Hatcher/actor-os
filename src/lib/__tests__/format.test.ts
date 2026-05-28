import { describe, it, expect, beforeEach } from "vitest"
import {
  setCurrency,
  parsePay,
  formatPayCompact,
  formatPay,
  currencySymbol,
  isActiveAudition,
  rollupEarnings,
  initials,
} from "../format"
import type { Audition } from "@/types"

function aud(partial: Partial<Audition>): Audition {
  return {
    id: "x",
    user_id: "u",
    project_name: "x",
    role_name: null,
    casting_director: null,
    agency: null,
    status: "submitted",
    submitted_date: null,
    callback_date: null,
    shoot_date: null,
    location: null,
    notes: null,
    self_tape_url: null,
    headshot_url: null,
    resume_url: null,
    compensation: null,
    contract_url: null,
    created_at: "",
    updated_at: "",
    ...partial,
  }
}

describe("parsePay", () => {
  it("returns 0 for null/empty/undefined", () => {
    expect(parsePay(null)).toBe(0)
    expect(parsePay(undefined)).toBe(0)
    expect(parsePay("")).toBe(0)
    expect(parsePay("no money here")).toBe(0)
  })

  it("parses bare digits", () => {
    expect(parsePay("312000")).toBe(312000)
  })

  it("strips currency symbols and commas", () => {
    expect(parsePay("$312,000")).toBe(312000)
    expect(parsePay("¥1,250,000")).toBe(1250000)
    expect(parsePay("£45.00")).toBe(45)
  })

  it("expands Japanese '万' (10k) shorthand", () => {
    expect(parsePay("30万")).toBe(300_000)
    expect(parsePay("4.5万")).toBe(45_000)
    expect(parsePay("100万円")).toBe(1_000_000)
  })
})

describe("currency formatters", () => {
  beforeEach(() => setCurrency("USD"))

  it("formatPayCompact uses USD symbol and k/M suffixes", () => {
    expect(formatPayCompact(500)).toBe("$500")
    expect(formatPayCompact(7_500)).toBe("$8k") // rounds 7.5 → 8
    expect(formatPayCompact(312_000)).toBe("$312k")
    expect(formatPayCompact(4_800_000)).toBe("$4.8M")
    expect(formatPayCompact(5_000_000)).toBe("$5M")
  })

  it("switches symbol when currency changes", () => {
    setCurrency("JPY")
    expect(currencySymbol()).toBe("¥")
    expect(formatPayCompact(312_000)).toBe("¥312k")
    setCurrency("GBP")
    expect(formatPayCompact(50_000)).toBe("£50k")
  })

  it("formatPay returns full localized number with the active symbol", () => {
    setCurrency("USD")
    expect(formatPay(1234)).toBe("$1,234")
    setCurrency("JPY")
    expect(formatPay(1_000_000)).toBe("¥1,000,000")
  })

  it("setCurrency ignores unknown codes (defensive)", () => {
    setCurrency("USD")
    setCurrency("XXX")
    expect(currencySymbol()).toBe("$")
  })
})

describe("isActiveAudition", () => {
  it("counts submitted / callback / pinned as active", () => {
    expect(isActiveAudition(aud({ status: "submitted" }))).toBe(true)
    expect(isActiveAudition(aud({ status: "callback" }))).toBe(true)
    expect(isActiveAudition(aud({ status: "pinned" }))).toBe(true)
  })
  it("excludes booked / passed / archived", () => {
    expect(isActiveAudition(aud({ status: "booked" }))).toBe(false)
    expect(isActiveAudition(aud({ status: "passed" }))).toBe(false)
    expect(isActiveAudition(aud({ status: "archived" }))).toBe(false)
  })
})

describe("rollupEarnings", () => {
  it("sums booked into banked and active into potential", () => {
    const rows: Audition[] = [
      aud({ status: "booked", compensation: "$1000" }),
      aud({ status: "booked", compensation: "$2000" }),
      aud({ status: "callback", compensation: "$500" }),
      aud({ status: "submitted", compensation: "$300" }),
      aud({ status: "passed", compensation: "$10000" }),
      aud({ status: "archived", compensation: "$10000" }),
    ]
    const r = rollupEarnings(rows)
    expect(r.banked).toBe(3000)
    expect(r.potential).toBe(800)
  })

  it("handles empty input", () => {
    expect(rollupEarnings([])).toEqual({ banked: 0, potential: 0 })
  })
})

describe("initials", () => {
  it("returns first + last letter for two-word names", () => {
    expect(initials("Christian Hatcher")).toBe("CH")
    expect(initials("Jamie Lee Curtis")).toBe("JC")
  })
  it("returns first two letters of single-word names", () => {
    expect(initials("Plato")).toBe("PL")
  })
  it("falls back when name is null/empty", () => {
    expect(initials(null)).toBe("AO")
    expect(initials(undefined)).toBe("AO")
    expect(initials("")).toBe("AO")
    expect(initials(null, "XX")).toBe("XX")
  })
  it("trims and is case-insensitive in output", () => {
    expect(initials("  alice   bob  ")).toBe("AB")
  })
})
