"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  FileText,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Check,
  X,
  Pencil,
  User,
  type LucideIcon,
} from "lucide-react"
import { useAudition } from "@/hooks/use-data"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { auditionRibbon, type RibbonTone } from "@/lib/ribbon"
import { formatPay, parsePay, currencySymbol } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Audition, Contact } from "@/types"

/* ------------------------------------------------------------------ */
/* Ribbon                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Action button                                                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Inline editable call-sheet row                                      */
/* ------------------------------------------------------------------ */

function CsRow({
  k,
  v,
  fieldKey,
  onSave,
}: {
  k: string
  v: React.ReactNode
  fieldKey?: string
  onSave?: (key: string, value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const editable = !!fieldKey && !!onSave

  function startEdit() {
    if (!editable) return
    setDraft(typeof v === "string" ? v : "")
    setEditing(true)
  }

  function save() {
    if (fieldKey && onSave) onSave(fieldKey, draft)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
  }

  if (!v && !editing) return null

  return (
    <div className="font-mono grid grid-cols-[108px_1fr_auto] items-baseline gap-x-[18px] border-t border-rule px-[18px] py-3 text-[11.5px] tracking-[0.04em] first:border-t-0">
      <span className="text-[10px] uppercase tracking-[0.14em] text-paper-faint">{k}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel() }}
            className="font-sans flex-1 border-b border-amber/40 bg-transparent py-0.5 text-[13px] text-paper outline-none"
          />
          <button onClick={save} className="text-green"><Check className="size-3.5" /></button>
          <button onClick={cancel} className="text-paper-faint"><X className="size-3.5" /></button>
        </div>
      ) : (
        <span
          className={cn("font-sans text-[13px] text-paper", editable && "cursor-pointer hover:text-amber")}
          onClick={startEdit}
        >
          {v || <span className="italic text-paper-faint">tap to add</span>}
        </span>
      )}
      {!editing && editable && (
        <button onClick={startEdit} className="text-paper-faint hover:text-amber">
          <Pencil className="size-3" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Status action buttons                                               */
/* ------------------------------------------------------------------ */

function StatusActions({
  audition,
  onUpdate,
}: {
  audition: Audition
  onUpdate: (id: string, updates: Partial<Audition>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  async function setStatus(status: Audition["status"]) {
    setSaving(true)
    try {
      await onUpdate(audition.id, { status })
      const labels: Record<string, string> = {
        booked: "Booked! Nice work.",
        passed: "Marked as passed.",
        submitted: "Marked as submitted.",
        received: "Reopened.",
      }
      setFlash(labels[status] || "Updated.")
      setTimeout(() => setFlash(null), 2500)
    } catch (err) {
      console.error("Status update failed:", err)
      setFlash("Failed to update. Try again.")
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  // Show contextual actions based on current status
  const s = audition.status

  const flashBanner = flash && (
    <div
      className={cn(
        "font-mono mx-[22px] mt-2 rounded-[10px] border px-4 py-2.5 text-center text-[11px] uppercase tracking-[0.12em] transition-opacity",
        flash.includes("Booked") ? "border-green/40 bg-green/[0.12] text-green" :
        flash.includes("Failed") ? "border-red/40 bg-red/[0.12] text-red" :
        "border-rule bg-white/[0.04] text-paper-dim",
      )}
    >
      {flash}
    </div>
  )

  if (s === "booked" || s === "passed" || s === "archived") {
    // Already resolved — show undo-ish options
    return (
      <>
        {flashBanner}
        <div className="flex gap-2 px-[22px] pt-2">
          {s === "passed" && (
            <button
              onClick={() => setStatus("received")}
              disabled={saving}
              className="font-mono flex-1 rounded-[10px] border border-rule bg-white/[0.02] py-2.5 text-[10px] uppercase tracking-[0.12em] text-paper-dim hover:bg-white/[0.05]"
            >
              Reopen
            </button>
          )}
          {s === "booked" && (
            <button
              onClick={() => setStatus("passed")}
              disabled={saving}
              className="font-mono flex-1 rounded-[10px] border border-rule bg-white/[0.02] py-2.5 text-[10px] uppercase tracking-[0.12em] text-paper-dim hover:bg-white/[0.05]"
            >
              Mark wrapped
            </button>
          )}
        </div>
      </>
    )
  }

  // Active audition — show actions based on current status
  return (
    <>
      {flashBanner}
      <div className="flex gap-2 px-[22px] pt-2">
        {s === "received" && (
          <button
            onClick={() => setStatus("submitted")}
            disabled={saving}
            className={cn(
              "font-serif flex-1 rounded-[10px] border border-blue/40 bg-blue/[0.1] py-3 text-[16px] text-blue hover:bg-blue/[0.18]",
              saving && "opacity-50",
            )}
          >
            {saving ? "Saving..." : "Submitted"}
          </button>
        )}
        {(s === "submitted" || s === "callback" || s === "pinned") && (
          <button
            onClick={() => setStatus("booked")}
            disabled={saving}
            className={cn(
              "font-serif flex-1 rounded-[10px] border border-green/40 bg-green/[0.1] py-3 text-[16px] text-green hover:bg-green/[0.18]",
              saving && "opacity-50",
            )}
          >
            {saving ? "Saving..." : "Booked"}
          </button>
        )}
        <button
          onClick={() => setStatus("passed")}
          disabled={saving}
          className={cn(
            "font-serif flex-1 rounded-[10px] border border-rule bg-white/[0.02] py-3 text-[16px] text-paper-faint hover:bg-white/[0.05]",
            saving && "opacity-50",
          )}
        >
          {saving ? "Saving..." : "Pass"}
        </button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* CRM contact card                                                    */
/* ------------------------------------------------------------------ */

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="mx-[22px] mt-3.5 rounded-[14px] border border-rule bg-white/[0.015] p-4">
      <div className="font-mono mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
        <User className="size-3" />
        CRM Contact
      </div>
      <div className="font-serif text-[18px] leading-tight text-paper">{contact.name}</div>
      <div className="font-mono mt-1.5 space-y-1 text-[11px] tracking-[0.04em] text-paper-dim">
        {contact.company && <div>{contact.company}</div>}
        {contact.role && <div>{contact.role}</div>}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="block text-amber hover:underline">
            {contact.email}
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="block text-amber hover:underline">
            {contact.phone}
          </a>
        )}
        {contact.last_contact_date && (
          <div className="text-paper-faint">
            Last contact: {new Date(contact.last_contact_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        )}
        {contact.notes && (
          <p className="mt-2 border-t border-rule pt-2 text-[11px] leading-relaxed text-paper-dim">
            {contact.notes}
          </p>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main detail component                                               */
/* ------------------------------------------------------------------ */

export function AuditionDetail({ id }: { id: string }) {
  const { audition: a, loading, error } = useAudition(id)
  const { contacts, updateAudition } = useDashboardData()
  const [briefOpen, setBriefOpen] = useState(false)

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

  // Find matching CRM contact by casting director name or agency
  const matchedContact = a
    ? contacts.find((c) => {
        const nameMatch = a.casting_director && c.name.toLowerCase().includes(a.casting_director.toLowerCase())
        const companyMatch = a.agency && c.company?.toLowerCase().includes(a.agency.toLowerCase())
        return nameMatch || companyMatch
      })
    : undefined

  const handleFieldSave = useCallback(
    async (key: string, value: string) => {
      if (!a) return
      await updateAudition(a.id, { [key]: value || null })
    },
    [a, updateAudition],
  )

  if (loading) {
    return (
      <p className="font-serif py-16 text-center text-[18px] italic text-paper-faint">
        Pulling the call sheet&hellip;
      </p>
    )
  }
  if (error || !a) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-[20px] italic text-paper-faint">Audition not found.</p>
        <Link href="/dashboard/auditions" className="font-mono mt-4 inline-block text-[11px] uppercase tracking-[0.18em] text-amber">
          &larr; Back to auditions
        </Link>
      </div>
    )
  }

  const isBooked = a.status === "booked"
  const badgeTone = isBooked ? "bk" : a.status === "callback" ? "cb" : a.status === "received" ? "rcv" : a.status === "submitted" ? "sub" : ""
  const when = a.callback_date || a.shoot_date || a.submitted_date
  const whenDate = when ? new Date(when) : null
  const startTime =
    a.call_time ||
    (whenDate && when && when.length > 10
      ? whenDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "\u2014")
  const pay = parsePay(a.compensation)

  const tel = a.casting_director ? `tel:` : undefined

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
        <Ribbon a={a} />
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
              badgeTone === "rcv" && "border-purple/45 bg-black/70 text-purple",
              badgeTone === "cb" && "border-amber/45 bg-black/70 text-amber",
              badgeTone === "sub" && "border-blue/45 bg-black/70 text-blue",
              badgeTone === "bk" && "border-green/45 text-green",
            )}
          >
            {a.status === "received" ? "new" : a.status}
          </span>
        )}
        <div className="absolute inset-x-4 bottom-4 z-[3]">
          <div className="font-serif text-[34px] leading-none tracking-[-0.01em] text-white [text-shadow:0_2px_16px_rgba(0,0,0,.7)]">
            {a.project_name}
          </div>
          <div className="font-mono mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[rgba(244,239,230,.7)]">
            {[a.role_name, a.agency].filter(Boolean).join(" \u00b7 ")}
          </div>
        </div>
      </div>

      {/* Time + pay */}
      <div className="grid grid-cols-[1fr_auto] items-end gap-3.5 px-[22px] pb-1.5 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint">
            {isBooked ? "Shoot \u00b7 call" : "Callback \u00b7 start"}
          </span>
          <span className="font-mono mt-0.5 text-[11px] uppercase tracking-[0.14em] text-paper-dim">
            {whenDate
              ? whenDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
              : "Date TBC"}
          </span>
          <span className="font-serif mt-1 text-[38px] leading-none tracking-[-0.01em] text-paper">
            {startTime}
          </span>
          {isBooked && a.est_wrap_time && (
            <span className="font-mono mt-1.5 text-[10px] uppercase tracking-[0.14em] text-paper-faint">
              est. wrap <b className="font-normal text-paper-dim">{a.est_wrap_time}</b>
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
              <span className="text-paper-faint">&mdash;</span>
            )}
          </div>
        </div>
      </div>

      {/* Status action buttons */}
      <StatusActions audition={a} onUpdate={updateAudition} />

      {/* Call sheet — editable fields */}
      <div className="mx-[22px] mt-3.5 overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.018),transparent)]">
        <CsRow k="Role" v={a.role_name} fieldKey="role_name" onSave={handleFieldSave} />
        <CsRow k="Location" v={a.location} fieldKey="location" onSave={handleFieldSave} />
        <CsRow k="Casting" v={a.casting_director} fieldKey="casting_director" onSave={handleFieldSave} />
        <CsRow k="Pay" v={a.compensation} fieldKey="compensation" onSave={handleFieldSave} />
        {briefOpen && (
          <>
            <CsRow k="Agency" v={a.agency} fieldKey="agency" onSave={handleFieldSave} />
            {isBooked && <CsRow k="Call time" v={a.call_time} fieldKey="call_time" onSave={handleFieldSave} />}
            {isBooked && <CsRow k="Wrap" v={a.wrap_time || a.est_wrap_time} fieldKey="wrap_time" onSave={handleFieldSave} />}
            <CsRow
              k="Contract"
              v={
                a.contract_url ? (
                  <a href={a.contract_url} className="text-amber underline">
                    View contract
                  </a>
                ) : (
                  "Not attached"
                )
              }
            />
          </>
        )}
      </div>

      {/* CRM contact card */}
      {matchedContact && <ContactCard contact={matchedContact} />}

      {/* Briefing expanded: director's note */}
      {briefOpen && a.notes && (
        <div className="mx-[22px] mt-3.5 rounded-[14px] border border-amber/30 bg-amber/[0.05] p-4">
          <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-amber">
            Director&apos;s note
          </div>
          <p className="font-serif text-[16px] italic leading-[1.5] text-paper">{a.notes}</p>
        </div>
      )}

      {!briefOpen && (
        <p className="font-serif px-[22px] pt-2.5 text-[13px] italic text-paper-faint">
          tap briefing for full call-sheet, notes &amp; sides
        </p>
      )}

      {/* Action bar */}
      <div className="mt-4 flex gap-2 px-[22px]">
        <ActionButton icon={FileText} label="Briefing" active={briefOpen} onClick={toggleBrief} />
        <ActionButton icon={Phone} label="Call" href={tel} />
        <ActionButton icon={MessageSquare} label="Text" href={tel ? "sms:" : undefined} />
        <ActionButton
          icon={Mail}
          label="Email"
          href={a.casting_director ? "mailto:" : undefined}
        />
        <ActionButton
          icon={MapPin}
          label="Maps"
          href={
            a.location
              ? `https://maps.google.com/?q=${encodeURIComponent(a.location)}`
              : undefined
          }
        />
      </div>

      {/* Primary CTA */}
      <div className="mt-4 px-[22px]">
        <button
          type="button"
          className={cn(
            "font-serif flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[22px]",
            isBooked ? "bg-green text-white" : "bg-paper text-bg",
          )}
        >
          {isBooked ? "Add to wallet pass" : "On my way"} <span>&rarr;</span>
        </button>
        <p className="font-mono mt-2.5 text-center text-[9px] uppercase tracking-[0.18em] text-paper-faint">
          {isBooked ? "call sheet QR \u00b7 adds to calendar" : "texts CD \u00b7 shares ETA \u00b7 opens maps"}
        </p>
      </div>
    </div>
  )
}
