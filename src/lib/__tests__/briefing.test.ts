import { describe, it, expect, beforeEach } from "vitest"
import { composeBriefing, timeOfDayGreeting } from "../briefing"
import { setCurrency } from "../format"
import type { Audition, Reminder } from "@/types"

function aud(partial: Partial<Audition>): Audition {
  return {
    id: "a",
    user_id: "u",
    project_name: "Unnamed",
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

function rem(partial: Partial<Reminder>): Reminder {
  return {
    id: "r",
    user_id: "u",
    title: "Reminder",
    description: null,
    due_date: new Date().toISOString(),
    type: "general",
    related_id: null,
    completed: false,
    created_at: "",
    ...partial,
  }
}

describe("timeOfDayGreeting", () => {
  it("morning before noon", () => {
    expect(timeOfDayGreeting(new Date("2026-05-28T08:00:00"))).toBe("Good morning")
  })
  it("afternoon between noon and 6pm", () => {
    expect(timeOfDayGreeting(new Date("2026-05-28T13:00:00"))).toBe("Good afternoon")
    expect(timeOfDayGreeting(new Date("2026-05-28T17:59:00"))).toBe("Good afternoon")
  })
  it("evening from 6pm", () => {
    expect(timeOfDayGreeting(new Date("2026-05-28T18:00:00"))).toBe("Good evening")
    expect(timeOfDayGreeting(new Date("2026-05-28T23:30:00"))).toBe("Good evening")
  })
})

describe("composeBriefing", () => {
  beforeEach(() => setCurrency("USD"))

  it("leads with a callback when one is today", () => {
    const today = new Date()
    const result = composeBriefing(
      [
        aud({
          status: "callback",
          project_name: "Macbeth",
          location: "Tokyo",
          casting_director: "Yamada",
          callback_date: today.toISOString(),
        }),
      ],
      [],
      "Christian",
    )
    expect(result.label).toBe("Today's briefing")
    expect(result.html).toMatch(/callback/i)
    expect(result.html).toContain("<b>Macbeth</b>")
    expect(result.html).toContain("<b>Tokyo</b>")
    expect(result.html).toContain("<b>Yamada</b>")
    expect(result.html.startsWith("Good")).toBe(true)
  })

  it("falls back to active count when nothing is today", () => {
    const result = composeBriefing(
      [
        aud({ status: "submitted" }),
        aud({ status: "submitted" }),
        aud({ status: "callback", callback_date: "2030-01-01" }),
      ],
      [],
      null,
    )
    expect(result.html).toMatch(/3 active/i)
  })

  it("offers a tip when there's nothing in the pipeline", () => {
    const result = composeBriefing([], [], null)
    expect(result.html).toMatch(/open road|good time to send/i)
  })

  it("appends an earnings line when there's banked / potential", () => {
    const result = composeBriefing(
      [
        aud({ status: "booked", compensation: "$5000" }),
        aud({ status: "submitted", compensation: "$2000" }),
      ],
      [],
      null,
    )
    // Earnings sentence — USD currency
    expect(result.html).toMatch(/\$5k/)
    expect(result.html).toMatch(/\$2k/)
    expect(result.html).toMatch(/banked/)
  })

  it("escapes html in user-provided strings (XSS safety)", () => {
    const result = composeBriefing(
      [
        aud({
          status: "callback",
          callback_date: new Date().toISOString(),
          project_name: "<script>alert(1)</script>",
        }),
      ],
      [],
      null,
    )
    expect(result.html).not.toContain("<script>")
    expect(result.html).toContain("&lt;script&gt;")
  })

  it("flags reminder due today", () => {
    const result = composeBriefing(
      [],
      [rem({ title: "Submit headshots", due_date: new Date().toISOString() })],
      null,
    )
    expect(result.html).toContain("<b>Submit headshots</b>")
  })
})
