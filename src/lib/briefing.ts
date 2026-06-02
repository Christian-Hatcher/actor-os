import type { Audition, Reminder } from "@/types"
import { currencySymbol, parsePay } from "@/lib/format"

// Client-side briefing composition.
//
// The design spec calls for an LLM-generated "stage manager" paragraph
// (POST /api/briefing/generate, cached 1h). This deterministic composer is the
// always-available fallback: it builds the same voice — a single short
// paragraph, proper nouns wrapped in <b>, an earnings note at the end — from
// the actor's real data, so the dashboard is never empty while the LLM route
// is wired up. Proper-noun emphasis is rendered with the amber underline in CSS.

export interface ComposedBriefing {
  label: string
  /** Sanitized HTML — only <b> tags are introduced by us. */
  html: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function bold(s: string): string {
  return `<b>${escapeHtml(s)}</b>`
}

function timeOfDayGreeting(d = new Date()): string {
  const h = d.getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function isSameDay(iso: string | null, ref: Date): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  )
}


export function composeBriefing(
  auditions: Audition[],
  reminders: Reminder[],
  name?: string | null,
): ComposedBriefing {
  const now = new Date()
  const first = (name ?? "").split(" ")[0]
  const sentences: string[] = []

  const callbacksToday = auditions.filter(
    (a) => a.status === "callback" && isSameDay(a.callback_date, now),
  )
  const shootsToday = auditions.filter((a) => isSameDay(a.shoot_date, now))
  const dueToday = reminders.filter(
    (r) => !r.completed && isSameDay(r.due_date, now),
  )

  if (callbacksToday.length) {
    const a = callbacksToday[0]
    const where = a.location ? ` in ${bold(a.location)}` : ""
    const who = a.casting_director ? ` — ${bold(a.casting_director)} is in the room` : ""
    sentences.push(`You open with a callback for ${bold(a.project_name)}${where}${who}.`)
  } else if (shootsToday.length) {
    const a = shootsToday[0]
    sentences.push(`You're on set today for ${bold(a.project_name)}${a.location ? ` at ${bold(a.location)}` : ""}.`)
  } else {
    const active = auditions.filter(
      (a) => a.status === "received" || a.status === "submitted" || a.status === "callback" || a.status === "pinned",
    ).length
    sentences.push(
      active
        ? `A quieter day — ${bold(String(active) + " active")} ${active === 1 ? "audition" : "auditions"} in play, nothing on the floor.`
        : `Open road today. Nothing booked — good time to send a few submissions.`,
    )
  }

  if (dueToday.length) {
    const r = dueToday[0]
    const t = new Date(r.due_date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
    sentences.push(`${bold(r.title)} is due by ${bold(t)}.`)
  }

  // Earnings note — banked (booked) vs potential (everything still alive).
  const banked = auditions
    .filter((a) => a.status === "booked")
    .reduce((sum, a) => sum + parsePay(a.compensation), 0)
  const potential = auditions
    .filter((a) => a.status === "received" || a.status === "submitted" || a.status === "callback" || a.status === "pinned")
    .reduce((sum, a) => sum + parsePay(a.compensation), 0)

  if (banked || potential) {
    const sym = currencySymbol()
    const fmt = (n: number) => `${sym}${Math.round(n / 1000)}k`
    sentences.push(
      `${bold(fmt(banked) + " banked")} this month${potential ? `, ${bold(fmt(potential))} still in play` : ""}.`,
    )
  }

  return {
    label: "Today's briefing",
    html:
      (first ? `${timeOfDayGreeting(now)}, ${escapeHtml(first)}. ` : "") +
      sentences.join(" "),
  }
}
