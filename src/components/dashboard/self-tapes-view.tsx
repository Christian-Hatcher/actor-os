"use client"

import { Video, Upload, Play } from "lucide-react"
import { useSelfTapes } from "@/hooks/use-data"
import { cn } from "@/lib/utils"
import type { SelfTape } from "@/types"

type TapeState = "empty" | "draft" | "submitted"

function tapeState(t: SelfTape): TapeState {
  if (t.submitted) return "submitted"
  if (t.video_url) return "draft"
  return "empty"
}

function isDueToday(t: SelfTape): boolean {
  return !!t.deadline && new Date(t.deadline).toDateString() === new Date().toDateString()
}

function StateChip({ t }: { t: SelfTape }) {
  const state = tapeState(t)
  if (state === "submitted") {
    return <span className="chip bk">{t.feedback ? "Callback ✓" : "Submitted"}</span>
  }
  if (state === "empty") {
    return (
      <span className={cn("chip", isDueToday(t) ? "flag" : "")}>
        {t.deadline
          ? new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "Not recorded"}
      </span>
    )
  }
  return <span className="chip cb">Draft</span>
}

function TapeCard({ t }: { t: SelfTape }) {
  const state = tapeState(t)
  const urgent = state === "empty" && isDueToday(t)

  return (
    <div
      className={cn(
        "mt-3.5 overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.015),transparent)]",
        urgent && "border-red/30 [background:linear-gradient(180deg,rgba(232,98,90,.06),transparent_50%)]",
        state === "submitted" &&
          "border-green/[0.22] [background:linear-gradient(180deg,rgba(58,168,107,.05),transparent_50%)]",
      )}
    >
      {/* Preview */}
      {state === "empty" ? (
        <div
          className="flex h-[170px] flex-col items-center justify-center gap-2 border-b border-rule"
          style={{
            background:
              "repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 10px, transparent 10px 20px), #181614",
          }}
        >
          <div className="grid size-12 place-items-center rounded-full border border-dashed border-rule-strong text-paper-dim">
            <Video className="size-[22px]" strokeWidth={1.6} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-faint">
            not recorded
          </span>
        </div>
      ) : (
        <div
          className="relative h-[170px] border-b border-rule"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 38%, rgba(140,100,70,.4), transparent 65%), repeating-linear-gradient(135deg, #1f1a14 0 14px, #14110d 14px 28px)",
          }}
        >
          <div className="absolute left-1/2 top-1/2 grid size-[54px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[rgba(244,239,230,.92)]">
            <Play className="size-5 fill-bg text-bg" />
          </div>
          <span className="font-mono absolute right-3 top-2.5 rounded-[30px] bg-black/45 px-2 py-0.5 text-[10px] text-white backdrop-blur">
            {state === "submitted" ? "submitted" : "draft"}
          </span>
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="self-end">
            <StateChip t={t} />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
            {t.audition_id ? "Self-tape" : "Open submission"}
          </div>
          <div className="font-serif text-[22px] leading-[1.1] text-paper">{t.title}</div>
        </div>

        <div className="font-mono mt-2 flex flex-wrap items-center gap-2.5 text-[10px] tracking-[0.08em] text-paper-dim">
          {t.scene_partner && <span>partner: {t.scene_partner}</span>}
          {t.deadline && (
            <span>
              due {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {/* Feedback (submitted with reply) */}
        {state === "submitted" && t.feedback && (
          <div className="mt-3 rounded-[10px] border border-green/25 bg-green/[0.05] p-3">
            <div className="font-mono mb-1.5 text-[9px] uppercase tracking-[0.2em] text-green">
              CD feedback
            </div>
            <p className="font-serif text-[15px] italic leading-[1.45] text-paper">{t.feedback}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-3.5 flex gap-2">
          {state === "empty" && (
            <>
              <button className="font-sans flex-1 rounded-[10px] border border-paper bg-paper py-2.5 text-[13px] font-medium text-bg">
                Record now
              </button>
              <button className="font-sans flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-rule-strong py-2.5 text-[13px] font-medium text-paper">
                <Upload className="size-3.5" /> Upload
              </button>
            </>
          )}
          {state === "draft" && (
            <>
              <button className="font-sans flex-1 rounded-[10px] border border-paper bg-paper py-2.5 text-[13px] font-medium text-bg">
                Review &amp; submit
              </button>
              <button className="font-sans flex-1 rounded-[10px] border border-rule-strong py-2.5 text-[13px] font-medium text-paper">
                Reshoot
              </button>
            </>
          )}
          {state === "submitted" && (
            <>
              <button className="font-sans flex-1 rounded-[10px] border border-rule-strong py-2.5 text-[13px] font-medium text-paper">
                Re-watch
              </button>
              {t.feedback && (
                <button className="font-sans flex-1 rounded-[10px] border border-green bg-green py-2.5 text-[13px] font-medium text-white">
                  Open callback →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function SelfTapesView() {
  const { selfTapes, loading } = useSelfTapes()

  const due = selfTapes.filter((t) => !t.submitted)

  return (
    <div>
      <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
        <span className="pulse-dot mr-1.5 inline-block size-[5px] rounded-full bg-green align-[1px] shadow-[0_0_8px_var(--green)]" />
        {due.length} due · {selfTapes.length} total
      </div>
      <h1 className="font-serif text-[40px] leading-none tracking-[-0.015em]">Self-tapes</h1>

      {loading ? (
        <p className="font-serif py-12 text-center text-[18px] italic text-paper-faint">
          Loading your reel…
        </p>
      ) : selfTapes.length === 0 ? (
        <p className="font-serif py-12 text-center text-[18px] italic text-paper-faint">
          No self-tapes yet. They&apos;ll appear here as auditions ask for them.
        </p>
      ) : (
        selfTapes.map((t) => <TapeCard key={t.id} t={t} />)
      )}
    </div>
  )
}
