"use client"

import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type Tone = "default" | "urgent" | "good"

interface AccordionSectionProps {
  /** Stable id used for the localStorage key. */
  id: string
  title: string
  meta: string
  tone?: Tone
  children: ReactNode
}

const STORAGE_KEY = "dashboard_accordion"

/**
 * Per-session open/closed state, persisted in localStorage but reset to
 * collapsed on the first launch of a new day (per the design spec).
 */
function useDailyAccordion(id: string): [boolean, () => void] {
  const today = new Date().toISOString().slice(0, 10)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { date: string; open: Record<string, boolean> }
      if (parsed.date === today && parsed.open?.[id]) setOpen(true)
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        const parsed =
          raw && (JSON.parse(raw) as { date: string; open: Record<string, boolean> })
        const base =
          parsed && parsed.date === today ? parsed : { date: today, open: {} }
        base.open[id] = next
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(base))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return [open, toggle]
}

export function AccordionSection({
  id,
  title,
  meta,
  tone = "default",
  children,
}: AccordionSectionProps) {
  const [open, toggle] = useDailyAccordion(id)

  return (
    <div className="border-t border-rule last:border-b">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-1 py-4 text-left text-paper"
      >
        <span className="font-serif flex-1 text-[22px] leading-none tracking-[-0.005em]">
          {title}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.14em]",
            tone === "urgent" && "text-amber",
            tone === "good" && "text-green",
            tone === "default" && "text-paper-dim",
          )}
        >
          {meta}
        </span>
        <span
          className={cn(
            "grid size-[22px] place-items-center rounded-full border border-rule-strong text-[14px] leading-none text-paper-dim transition-transform duration-250",
            open && "rotate-45 border-paper bg-paper text-bg",
          )}
          aria-hidden
        >
          +
        </span>
      </button>
      <div
        className={cn(
          "grid overflow-hidden px-1 transition-all duration-300",
          open ? "grid-rows-[1fr] pb-[18px]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden text-sm leading-[1.55] text-paper-dim">
          {children}
        </div>
      </div>
    </div>
  )
}
