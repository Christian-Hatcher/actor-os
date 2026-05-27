import type { Audition } from "@/types"
import { parseYen, formatYenCompact } from "@/lib/format"

export type RibbonTone = "amber" | "red" | "green" | "grey" | "none"

export interface RibbonState {
  tone: RibbonTone
  text: string
  /** Money owed for OT, formatted — present only in the OT state. */
  owed?: string
  pulse: boolean
}

/** Combine a date (ISO) and optional HH:MM time string into a Date. */
function at(dateIso: string | null | undefined, time: string | null | undefined): Date | null {
  if (!dateIso) return null
  const base = new Date(dateIso)
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [h, m] = time.split(":").map((n) => parseInt(n, 10))
    base.setHours(h, m, 0, 0)
  }
  return base
}

function humanGap(ms: number): string {
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `in ${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `in ${h}h ${m}m` : `in ${h}h`
}

/**
 * Ribbon state machine for the audition-detail header. Drives the live
 * countdown, the "starting now" pulse, in-progress, post-wrap OT timer, and
 * the wrapped state. See README "Ribbon state machine" + OT math.
 */
export function auditionRibbon(a: Audition, now = new Date()): RibbonState {
  const callbackAt = at(a.callback_date, a.call_time)
  const shootStart = at(a.shoot_date, a.call_time)
  const wrap = at(a.shoot_date, a.est_wrap_time || a.wrap_time)

  // Booked shoot in the future → green countdown.
  if (a.status === "booked" && shootStart && shootStart > now) {
    const days = Math.ceil((shootStart.getTime() - now.getTime()) / 86_400_000)
    const wd = shootStart.toLocaleDateString("en-US", { weekday: "short" })
    return { tone: "green", text: `Shoots ${wd} · ${days}d`, pulse: true }
  }

  // Shoot day in progress / OT / wrapped.
  if (a.status === "booked" && shootStart) {
    if (wrap && now > wrap) {
      const overMs = now.getTime() - wrap.getTime()
      const rate = parseYen(a.compensation)
      const mult = a.ot_rate_multiplier ?? 1.5
      // Base hourly ~ comp / 8h day; OT = hours × hourly × multiplier.
      const hourly = rate > 0 ? rate / 8 : 0
      const owedAmt = Math.round((overMs / 3_600_000) * hourly * mult)
      const h = Math.floor(overMs / 3_600_000)
      const m = Math.floor((overMs % 3_600_000) / 60000)
      return {
        tone: "amber",
        text: `OT · ${h}h ${m}m`,
        owed: `+${formatYenCompact(owedAmt)}`,
        pulse: true,
      }
    }
    if (now >= shootStart) return { tone: "amber", text: "In progress", pulse: true }
  }

  // Callback timeline.
  const target = callbackAt ?? shootStart
  if (!target) return { tone: "none", text: "", pulse: false }

  const diff = target.getTime() - now.getTime()
  const mins = diff / 60000

  if (diff < 0) return { tone: "grey", text: "Wrapped · rate this audition", pulse: false }
  if (mins <= 15) return { tone: "red", text: "Starting now", pulse: true }
  if (mins <= 60) return { tone: "amber", text: `Starts ${humanGap(diff)}`, pulse: true }
  if (mins <= 24 * 60) {
    const t = target.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    return { tone: "amber", text: `Today at ${t}`, pulse: true }
  }
  return { tone: "none", text: "", pulse: false }
}
