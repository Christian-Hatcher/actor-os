import { describe, it, expect } from "vitest"
import { auditionRibbon } from "../ribbon"
import type { Audition } from "@/types"

// Local-time date/time helpers — toISOString() would shift the date when
// the system isn't in UTC (e.g. Tokyo), which breaks the ribbon math.
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function hm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function aud(partial: Partial<Audition>): Audition {
  return {
    id: "a",
    user_id: "u",
    project_name: "Project",
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

describe("auditionRibbon", () => {
  const now = new Date("2026-05-28T10:00:00")

  it("returns 'none' tone for submitted/no dates", () => {
    const r = auditionRibbon(aud({}), now)
    expect(r.tone).toBe("none")
    expect(r.text).toBe("")
  })

  it("booked future shoot → green countdown", () => {
    const shoot = new Date("2026-06-04T09:00:00")
    const r = auditionRibbon(
      aud({ status: "booked", shoot_date: ymd(shoot), call_time: "09:00" }),
      now,
    )
    expect(r.tone).toBe("green")
    expect(r.text).toMatch(/Shoots .* · \d+d/)
    expect(r.pulse).toBe(true)
  })

  it("booked in-progress → amber 'In progress'", () => {
    // Shoot from 09:00 with est_wrap at 18:00; now is 10:00 → in window.
    const r = auditionRibbon(
      aud({
        status: "booked",
        shoot_date: ymd(now),
        call_time: "09:00",
        est_wrap_time: "18:00",
      }),
      now,
    )
    expect(r.tone).toBe("amber")
    expect(r.text).toBe("In progress")
  })

  it("post-wrap → OT timer with owed money", () => {
    // Shoot from 09:00 with estimated wrap at 09:30; now is 10:00 = 30min over.
    const r = auditionRibbon(
      aud({
        status: "booked",
        shoot_date: ymd(now),
        call_time: "09:00",
        est_wrap_time: "09:30",
        compensation: "$8000", // hourly = 8000/8 = 1000
        ot_rate_multiplier: 1.5,
      }),
      now,
    )
    expect(r.tone).toBe("amber")
    expect(r.text).toMatch(/^OT · 0h 30m$/)
    expect(r.owed).toBeDefined()
    // 0.5h × $1000 × 1.5 = $750 → "+$750"
    expect(r.owed).toMatch(/\+\$750/)
  })

  it("callback in 10 minutes → red 'Starting now'", () => {
    const callback = new Date(now.getTime() + 10 * 60_000)
    const r = auditionRibbon(
      aud({
        status: "callback",
        callback_date: ymd(callback),
        call_time: hm(callback),
      }),
      now,
    )
    expect(r.tone).toBe("red")
    expect(r.text).toBe("Starting now")
  })

  it("callback in 45 minutes → amber 'Starts in …'", () => {
    const callback = new Date(now.getTime() + 45 * 60_000)
    const r = auditionRibbon(
      aud({
        status: "callback",
        callback_date: ymd(callback),
        call_time: hm(callback),
      }),
      now,
    )
    expect(r.tone).toBe("amber")
    expect(r.text).toMatch(/^Starts in /)
  })

  it("callback later today → amber 'Today at …'", () => {
    const callback = new Date(now.getTime() + 3 * 60 * 60_000)
    const r = auditionRibbon(
      aud({
        status: "callback",
        callback_date: ymd(callback),
        call_time: hm(callback),
      }),
      now,
    )
    expect(r.tone).toBe("amber")
    expect(r.text).toMatch(/^Today at /)
  })

  it("past callback → grey wrapped state", () => {
    const past = new Date(now.getTime() - 24 * 60 * 60_000)
    const r = auditionRibbon(
      aud({
        status: "callback",
        callback_date: ymd(past),
        call_time: "09:00",
      }),
      now,
    )
    expect(r.tone).toBe("grey")
    expect(r.text).toMatch(/Wrapped/)
  })
})
