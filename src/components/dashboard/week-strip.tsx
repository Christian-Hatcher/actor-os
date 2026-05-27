"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { Audition, Reminder } from "@/types"
import { auditionAnchorDate } from "@/hooks/use-data"

interface WeekStripProps {
  auditions: Audition[]
  reminders: Reminder[]
}

interface DayCell {
  date: Date
  weekday: string
  dayNum: number
  isToday: boolean
  dots: Array<"g" | "a" | "d">
}

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  // Monday-first week
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  return x
}

function sameDay(iso: string | null, ref: Date): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  )
}

// 7-day grid; today inverted to paper. Dots underneath show event count/kind:
// green = booked shoot, amber = callback, default = other reminder/event.
export function WeekStrip({ auditions, reminders }: WeekStripProps) {
  const days = useMemo<DayCell[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = startOfWeek(today)

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      const dots: Array<"g" | "a" | "d"> = []

      for (const a of auditions) {
        if (sameDay(a.shoot_date, date) && a.status === "booked") dots.push("g")
        else if (sameDay(a.callback_date, date)) dots.push("a")
        else if (sameDay(auditionAnchorDate(a), date)) dots.push("d")
      }
      for (const r of reminders) {
        if (!r.completed && sameDay(r.due_date, date)) dots.push("d")
      }

      return {
        date,
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
        dayNum: date.getDate(),
        isToday: date.getTime() === today.getTime(),
        dots: dots.slice(0, 4),
      }
    })
  }, [auditions, reminders])

  return (
    <div className="mt-[22px] grid grid-cols-7 gap-1.5">
      {days.map((d) => (
        <div
          key={d.date.toISOString()}
          className={cn(
            "relative rounded-[10px] border border-rule px-1 pt-2.5 pb-[7px] text-center",
            d.isToday ? "border-paper bg-paper" : "bg-white/[0.012]",
          )}
        >
          <div
            className={cn(
              "font-mono text-[9px] uppercase tracking-[0.1em]",
              d.isToday ? "text-bg" : "text-paper-faint",
            )}
          >
            {d.weekday}
          </div>
          <div
            className={cn(
              "font-serif mt-0.5 text-[22px] leading-[1.05]",
              d.isToday ? "text-bg" : "text-paper",
            )}
          >
            {d.dayNum}
          </div>
          <div className="mt-1 flex h-1 justify-center gap-[3px]">
            {d.dots.map((dot, i) => (
              <i
                key={i}
                className={cn(
                  "size-1 rounded-full",
                  d.isToday
                    ? "bg-bg"
                    : dot === "g"
                      ? "bg-green"
                      : dot === "a"
                        ? "bg-amber"
                        : "bg-paper-dim",
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
