"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  FileText,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Video,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useAudition, useAuditions } from "@/hooks/use-data"
import { auditionRibbon, type RibbonTone } from "@/lib/ribbon"
import { formatPay, parsePay, currencySymbol } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Audition } from "@/types"

const ALL_STATUSES: Audition["status"][] = [
  "submitted",
  "callback",
  "pinned",
  "booked",
  "passed",
  "archived",
]

const STATUS_COLORS: Record<Audition["status"], { border: string; bg: string; text: string }> = {
  submitted: { border: "border-blue/50", bg: "bg-blue/15", text: "text-blue" },
  callback: { border: "border-amber/50", bg: "bg-amber/15", text: "text-amber" },
  pinned: { border: "border-blue/50", bg: "bg-blue/15", text: "text-blue" },
  booked: { border: "border-green/50", bg: "bg-green/15", text: "text-green" },
  passed: { border: "border-rule", bg: "bg-white/[0.04]", text: "text-paper-faint" },
  archived: { border: "border-rule", bg: "bg-white/[0.04]", text: "text-paper-faint" },
}

function Ribbon({ a }: { a: Audition }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const r = auditionRibbon(a)
  if (r.tone === "none" || !r.text) return null

  const toneCls: Record<Exclude<RibbonTone, "none">, string> = {
    amber: "border-amber/35 bg-amber/[0.12] text-amber",
    red: "border-red/40 bg-red/[0.12] text-red",
    green: "border-green/40 bg-green/[0.12] text-green",
    grey: "border-rule bg-white/[0.04] text-paper-faint",
  }
  const dotCls: Record<string, string> = {
    amber: "bg-amber shadow-[0_0_8px_var(--amber)]",
    red: "bg-red shadow-[0_0_8px_var(--red)]",
    green: "bg-green shadow-[0_0_8px_var(--green)]",
  }

  return (
    <span
      className={cn(
        "font-mono inline-flex items-center gap-2 rounded-[30px] border px-3 py-1 text-[10px] uppercase tracking-[0.12em]",
        toneCls[r.tone],
      )}
    >
      {r.tone !== "grey" && (
        <i className={cn("size-[5px] rounded-full", r.pulse && "pulse-dot", dotCls[r.tone])} />
      )}
      {r.text}
      {r.owed && (
        <span className="ml-1 border-l border-amber/40 pl-2 tracking-[0.04em] text-green">
          {r.owed}
        </span>
      )}
    </span>
  )
}

function ActionButton({
  icon: Icon,
  label,
  href,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  href?: string
  active?: boolean
  onClick?: () => void
}) {
  const inner = (
    <>
      <Icon className={cn("size-5", active ? "text-bg" : "text-paper")} strokeWidth={1.6} />
      <span className="font-mono text-[9px] uppercase tracking-[0.12em]">{label}</span>
    </>
  )
  const cls = cn(
    "flex flex-1 flex-col items-center gap-1.5 rounded-[12px] border border-rule-strong py-3",
    active ? "border-amber bg-amber text-bg" : "bg-white/[0.02] hover:bg-white/[0.05]",
    label === "Briefing" && !active && "border-amber/40",
  )
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

function CsRow({ k, v }: { k: string; v: React.ReactNode }) {
  if (!v) return null
  return (
    <div className="font-mono grid grid-cols-[108px_1fr] items-baseline gap-x-[18px] border-t border-rule px-[18px] py-3 text-[11.5px] tracking-[0.04em] first:border-t-0">
      <span className="text-[10px] uppercase tracking-[0.14em] text-paper-faint">{k}</span>
      <span className="font-sans text-[13px] text-paper">{v}</span>
    </div>
  )
}

function StatusSwitcher({
  current,
  onUpdate,
}: {
  current: Audition["status"]
  onUpdate: (status: Audition["status"]) => Promise<void>
}) {
  const [updating, setUpdating] = useState<Audition["status"] | null>(null)

  async function handleClick(status: Audition["status"]) {
    if (status === current) return
    setUpdating(status)
    try {
      await onUpdate(status)
      toast.success(`Status changed to ${status}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status"
      toast.error(msg)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_STATUSES.map((s) => {
        const colors = STATUS_COLORS[s]
        const isActive = s === current
        return (
          <button
            key={s}
            type="button"
            disabled={updating !== null}
            onClick={() => handleClick(s)}
            className={cn(
              "font-mono rounded-[10px] border px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition-all",
              isActive
                ? `${colors.border} ${colors.bg} ${colors.text}`
                : "border-rule bg-white/[0.02] text-paper-faint hover:bg-white/[0.04]",
              updating === s && "opacity-60",
            )}
          >
            {updating === s ? (
              <Loader2 className="inline size-3 animate-spin" />
            ) : (
              s
            )}
          </button>
        )
      })}
    </div>
  )
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function AuditionDetail({ id }: { id: string }) {
  const { audition: a, loading, error } = useAudition(id)
  const { updateAudition } = useAuditions()
  const [briefOpen, setBriefOpen] = useState(false)
  const [localAudition, setLocalAudition] = useState<Audition | null>(null)

  // Keep local copy in sync with fetched data
  useEffect(() => {
    if (a) setLocalAudition(a)
  }, [a])

  useEffect(() => {
    if (!id) return
    const stored = window.localStorage.getItem(`audition_briefing_expanded_${id}`)
    if (stored === "1") setBriefOpen(true)
  }, [id])

  function toggleBrief() {
    setBriefOpen((o) => {
      const next = !o
      window.localStorage.setItem(`audition_briefing_expanded_${id}`, next ? "1" : "0")
      return next
    })
  }

  async function handleStatusUpdate(status: Audition["status"]) {
    await updateAudition(id, { status })
    setLocalAudition((prev) => prev ? { ...prev, status } : prev)
  }

  if (loading) {
    return (
      <p className="font-serif py-16 text-center text-[18px] italic text-paper-faint">
        Pulling the call sheet…
      </p>
    )
  }

  const display = localAudition ?? a
  if (error || !display) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-[20px] italic text-paper-faint">Audition not found.</p>
        <Link href="/dashboard/auditions" className="font-mono mt-4 inline-block text-[11px] uppercase tracking-[0.18em] text-amber">
          ← Back to auditions
        </Link>
      </div>
    )
  }

  const isBooked = display.status === "booked"
  const badgeTone = isBooked ? "bk" : display.status === "callback" ? "cb" : ""
  const when = display.callback_date || display.shoot_date || display.submitted_date
  const whenDate = when ? new Date(when) : null
  const startTime =
    display.call_time ||
    (whenDate && when && when.length > 10
      ? whenDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "—")
  const pay = parsePay(display.compensation)

  const tel = display.casting_director ? `tel:` : undefined

  return (
    <div className="-mx-[22px]">
      {/* Head */}
      <div className="flex items-center justify-between gap-4 px-[22px] pb-3 pt-1">
        <Link
          href="/dashboard/auditions"
          className="font-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-dim"
        >
          <ArrowLeft className="size-3.5 text-paper" /> Back
        </Link>
        <Ribbon a={display} />
      </div>

      {/* Poster */}
      <div
        className="relative mx-[22px] h-[300px] overflow-hidden rounded-[14px] border border-rule-strong"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(140,100,70,.45), transparent 65%), repeating-linear-gradient(135deg, #2a241d 0 12px, #1d1814 12px 24px)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.4) 0 8%, transparent 30% 65%, rgba(0,0,0,.85) 100%)",
          }}
        />
        {badgeTone && (
          <span
            className={cn(
              "font-mono absolute left-3.5 top-3.5 z-[3] rounded-[30px] border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] backdrop-blur",
              badgeTone === "cb" && "border-amber/45 bg-black/70 text-amber",
              badgeTone === "bk" && "border-green/45 text-green",
            )}
          >
            {display.status}
          </span>
        )}
        <div className="absolute inset-x-4 bottom-4 z-[3]">
          <div className="font-serif text-[34px] leading-none tracking-[-0.01em] text-white [text-shadow:0_2px_16px_rgba(0,0,0,.7)]">
            {display.project_name}
          </div>
          <div className="font-mono mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[rgba(244,239,230,.7)]">
            {[display.role_name, display.agency].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      {/* Time + pay */}
      <div className="grid grid-cols-[1fr_auto] items-end gap-3.5 px-[22px] pb-1.5 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint">
            {isBooked ? "Shoot · call" : "Callback · start"}
          </span>
          <span className="font-mono mt-0.5 text-[11px] uppercase tracking-[0.14em] text-paper-dim">
            {whenDate
              ? whenDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
              : "Date TBC"}
          </span>
          <span className="font-serif mt-1 text-[38px] leading-none tracking-[-0.01em] text-paper">
            {startTime}
          </span>
          {isBooked && display.est_wrap_time && (
            <span className="font-mono mt-1.5 text-[10px] uppercase tracking-[0.14em] text-paper-faint">
              est. wrap <b className="font-normal text-paper-dim">{display.est_wrap_time}</b>
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint">Pay</span>
          <div className="font-serif mt-1 text-[30px] leading-none tracking-[-0.01em] text-green">
            {pay > 0 ? (
              <>
                <span className="align-[3px] mr-0.5 text-[18px] text-paper-faint">{currencySymbol()}</span>
                {pay.toLocaleString("en-US")}
              </>
            ) : (
              <span className="text-paper-faint">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Status switcher */}
      <div className="mx-[22px] mt-4">
        <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
          Update status
        </div>
        <StatusSwitcher current={display.status} onUpdate={handleStatusUpdate} />
      </div>

      {/* Call sheet */}
      <div className="mx-[22px] mt-4 overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.018),transparent)]">
        <CsRow k="Role" v={display.role_name} />
        <CsRow k="Location" v={display.location} />
        <CsRow k="Casting" v={display.casting_director} />
        <CsRow k="Agency" v={display.agency} />
        <CsRow k="Submitted" v={formatDate(display.submitted_date)} />
        <CsRow k="Callback" v={formatDate(display.callback_date)} />
        <CsRow k="Shoot" v={formatDate(display.shoot_date)} />
        <CsRow k="Compensation" v={display.compensation} />
        {isBooked && <CsRow k="Call time" v={display.call_time} />}
        {isBooked && <CsRow k="Wrap" v={display.wrap_time || display.est_wrap_time} />}
        <CsRow
          k="Contract"
          v={
            display.contract_url ? (
              <a href={display.contract_url} className="text-amber underline">
                View contract
              </a>
            ) : null
          }
        />
      </div>

      {/* Self-tape link */}
      {display.self_tape_url ? (
        <a
          href={display.self_tape_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-[22px] mt-3.5 flex items-center gap-3 rounded-[14px] border border-green/25 bg-green/[0.05] px-4 py-3.5 transition-colors hover:bg-green/[0.08]"
        >
          <div className="grid size-10 flex-none place-items-center rounded-full border border-green/30 bg-green/10">
            <Video className="size-5 text-green" strokeWidth={1.6} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-green">
              Self-tape attached
            </div>
            <div className="font-serif mt-0.5 text-[15px] text-paper">
              View recording
            </div>
          </div>
        </a>
      ) : (
        <div className="mx-[22px] mt-3.5 flex items-center gap-3 rounded-[14px] border border-rule bg-white/[0.015] px-4 py-3.5">
          <div className="grid size-10 flex-none place-items-center rounded-full border border-dashed border-rule-strong">
            <Video className="size-5 text-paper-faint" strokeWidth={1.6} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
              No self-tape
            </div>
            <div className="font-serif mt-0.5 text-[15px] text-paper-faint">
              Not yet recorded
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {display.notes && (
        <div className="mx-[22px] mt-3.5 rounded-[14px] border border-amber/30 bg-amber/[0.05] p-4">
          <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-amber">
            Notes
          </div>
          <p className="font-serif text-[16px] italic leading-[1.5] text-paper">{display.notes}</p>
        </div>
      )}

      {/* Action bar */}
      <div className="mt-4 flex gap-2 px-[22px]">
        <ActionButton icon={FileText} label="Briefing" active={briefOpen} onClick={toggleBrief} />
        <ActionButton icon={Phone} label="Call" href={tel} />
        <ActionButton icon={MessageSquare} label="Text" href={tel ? "sms:" : undefined} />
        <ActionButton
          icon={Mail}
          label="Email"
          href={display.casting_director ? "mailto:" : undefined}
        />
        <ActionButton
          icon={MapPin}
          label="Maps"
          href={
            display.location
              ? `https://maps.google.com/?q=${encodeURIComponent(display.location)}`
              : undefined
          }
        />
      </div>

      {/* Briefing expanded: full details */}
      {briefOpen && (
        <div className="mx-[22px] mt-3.5 overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.018),transparent)]">
          <CsRow k="Headshot" v={
            display.headshot_url ? (
              <a href={display.headshot_url} className="text-amber underline">View headshot</a>
            ) : "Not attached"
          } />
          <CsRow k="Resume" v={
            display.resume_url ? (
              <a href={display.resume_url} className="text-amber underline">View resume</a>
            ) : "Not attached"
          } />
          {display.ot_rate_multiplier && (
            <CsRow k="OT rate" v={`${display.ot_rate_multiplier}x`} />
          )}
        </div>
      )}

      {!briefOpen && (
        <p className="font-serif px-[22px] pt-2.5 text-[13px] italic text-paper-faint">
          tap briefing for headshot, resume &amp; full details
        </p>
      )}

      {/* Primary CTA */}
      <div className="mt-4 px-[22px] pb-6">
        <button
          type="button"
          className={cn(
            "font-serif flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[22px]",
            isBooked ? "bg-green text-white" : "bg-paper text-bg",
          )}
        >
          {isBooked ? "Add to wallet pass" : "On my way"} <span>→</span>
        </button>
        <p className="font-mono mt-2.5 text-center text-[9px] uppercase tracking-[0.18em] text-paper-faint">
          {isBooked ? "call sheet QR · adds to calendar" : "texts CD · shares ETA · opens maps"}
        </p>
      </div>
    </div>
  )
}
