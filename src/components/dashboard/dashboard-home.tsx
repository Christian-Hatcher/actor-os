"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { composeBriefing } from "@/lib/briefing"
import {
  formatPayCompact,
  initials,
  isActiveAudition,
  rollupEarnings,
} from "@/lib/format"
import type { Audition, Job } from "@/types"
import { AccordionSection } from "./accordion-section"
import { WeekStrip } from "./week-strip"
import { Splash } from "./splash"
import { Skeleton } from "@/components/ui/skeleton"

function metaDate(city: string): string {
  const now = new Date()
  const wd = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()
  const day = now.getDate()
  const mon = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
  return `${wd} · ${day} ${mon} · ${city.toUpperCase()}`
}

function thisWeek(auditions: Audition[]): Audition[] {
  const now = new Date()
  const weekAhead = new Date(now)
  weekAhead.setDate(now.getDate() + 7)
  return auditions
    .filter((a) => {
      const d = a.callback_date || a.shoot_date || a.submitted_date
      if (!d) return false
      const date = new Date(d)
      return date >= new Date(now.toDateString()) && date <= weekAhead
    })
    .slice(0, 5)
}

function StatusChip({ status }: { status: Audition["status"] }) {
  const map: Record<string, { cls: string; label: string }> = {
    callback: { cls: "cb", label: "CB" },
    submitted: { cls: "sub", label: "SUB" },
    pinned: { cls: "sub", label: "PIN" },
    booked: { cls: "bk", label: "BK" },
    passed: { cls: "", label: "PASS" },
    archived: { cls: "", label: "ARCH" },
  }
  const c = map[status] ?? { cls: "", label: status.toUpperCase() }
  return <span className={`chip ${c.cls}`}>{c.label}</span>
}

function AuditionMiniRow({ a }: { a: Audition }) {
  const d = a.callback_date || a.shoot_date || a.submitted_date
  const date = d ? new Date(d) : null
  return (
    <Link
      href={`/dashboard/auditions/${a.id}`}
      className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-t border-rule py-2.5 first:border-t-0"
    >
      <div className="text-center">
        <div className="font-serif text-[22px] leading-none text-paper">
          {date ? date.getDate() : "—"}
        </div>
        <div className="font-mono mt-0.5 text-[9px] uppercase tracking-[0.14em] text-paper-faint">
          {date ? date.toLocaleDateString("en-US", { weekday: "short" }) : "soon"}
        </div>
      </div>
      <div>
        <div className="font-serif text-[17px] leading-[1.15] text-paper">{a.project_name}</div>
        <div className="text-[11.5px] text-paper-dim">
          {[a.role_name, a.location, a.casting_director && `w/ ${a.casting_director}`]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusChip status={a.status} />
        {a.compensation && (
          <div className="font-mono text-[10.5px] tracking-[0.04em] text-paper-dim">
            {a.compensation}
          </div>
        )}
      </div>
    </Link>
  )
}

export function DashboardHome() {
  const { profile } = useAuth()
  const { auditions, jobs, reminders, selfTapes, contacts, contracts, pendingApprovals, emailConnections, loading: auditionsLoading } = useDashboardData()
  const activeJobs = jobs.filter((j: Job) => j.status === "active")
  const approvalsCount = pendingApprovals.filter((r) => r.needs_review).length

  const name = profile?.full_name ?? null
  const city = profile?.city ?? "Tokyo"

  const briefing = useMemo(
    () => composeBriefing(auditions, reminders, name),
    [auditions, reminders, name],
  )

  const activeAuditions = auditions.filter(isActiveAudition)
  const week = useMemo(() => thisWeek(auditions), [auditions])
  const { banked, potential } = useMemo(() => rollupEarnings(auditions), [auditions])

  const hasGmail = emailConnections.some((c) => c.is_active)
  const [gmailBannerDismissed, setGmailBannerDismissed] = useState(false)

  const now = new Date()
  const tapesDue = selfTapes.filter((t) => !t.submitted)
  const tapesDueToday = tapesDue.filter(
    (t) => t.deadline && new Date(t.deadline).toDateString() === now.toDateString(),
  )
  const contractsToReview = contracts.filter((c) => c.status !== "signed")
  const flaggedContracts = contracts.filter((c) => (c.red_flags?.length ?? 0) > 0)
  const followUps = contacts.filter((c) => {
    if (!c.last_contact_date) return true
    const days = (now.getTime() - new Date(c.last_contact_date).getTime()) / 86_400_000
    return days >= 7
  })

  return (
    <div>
      <Splash />
      {/* Greeting */}
      <div className="flex items-start justify-between pt-2.5">
        <div>
          <div className="font-mono mb-3.5 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            <span className="pulse-dot mr-1.5 inline-block size-[5px] rounded-full bg-green align-[1px] shadow-[0_0_8px_var(--green)]" />
            {metaDate(city)}
          </div>
          <h1 className="font-serif text-[40px] leading-none tracking-[-0.015em]">
            {name ? (
              <>
                Good morning,
                <br />
                <em className="text-paper-dim not-italic italic">{name.split(" ")[0]}.</em>
              </>
            ) : (
              "Welcome back."
            )}
          </h1>
        </div>
        <div
          className="font-serif grid size-[42px] place-items-center rounded-full border border-rule-strong text-[18px] text-paper"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,.06), transparent 50%), linear-gradient(45deg, #2a251f, #4a3f33)",
          }}
        >
          {initials(name)}
        </div>
      </div>

      {/* Prose briefing */}
      <div className="briefing-card relative mt-[22px] rounded-[14px] border border-rule px-[18px] pb-4 pt-[18px]">
        <div className="font-mono mb-2.5 text-[10px] uppercase tracking-[0.22em] text-amber">
          {briefing.label}
        </div>
        <p
          className="briefing-prose font-serif m-0 text-[18px] italic leading-[1.5] text-paper"
          dangerouslySetInnerHTML={{ __html: briefing.html }}
        />
        <div className="mt-3.5 flex gap-2">
          <Link
            href="/dashboard/auditions"
            className="font-sans inline-flex items-center gap-1.5 rounded-[30px] border border-paper bg-paper px-3.5 py-2 text-[13px] font-medium text-bg"
          >
            Open day <span className="font-serif text-base leading-none">→</span>
          </Link>
          <button
            type="button"
            className="font-sans inline-flex items-center rounded-[30px] border border-rule-strong px-3.5 py-2 text-[13px] font-medium text-paper-dim"
          >
            Snooze
          </button>
        </div>
      </div>

      {/* Week strip */}
      <WeekStrip auditions={auditions} reminders={reminders} />

      {/* Gmail connect banner — shown when auditions exist but no Gmail connected */}
      {!auditionsLoading && auditions.length > 0 && !hasGmail && !gmailBannerDismissed && (
        <div className="relative mt-5 rounded-[14px] border border-rule px-[18px] py-4">
          <button
            type="button"
            onClick={() => setGmailBannerDismissed(true)}
            className="absolute right-3 top-3 font-mono text-[11px] text-paper-faint hover:text-paper"
            aria-label="Dismiss"
          >
            &times;
          </button>
          <div className="flex items-center gap-3">
            <div className="grid size-[36px] flex-shrink-0 place-items-center rounded-full border border-rule-strong">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-paper-dim"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <div>
              <p className="font-serif text-[15px] leading-snug text-paper">
                Connect Gmail to auto-import auditions
              </p>
              <p className="mt-0.5 text-[12px] text-paper-dim">
                Actor OS reads your casting emails and pulls out projects, roles, and dates automatically.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href="/dashboard/settings"
              className="font-sans inline-flex items-center gap-1.5 rounded-[30px] border border-paper bg-paper px-3.5 py-1.5 text-[12px] font-medium text-bg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Connect Gmail
            </Link>
          </div>
        </div>
      )}

      {/* Empty state — shown when no auditions and no Gmail connected */}
      {!auditionsLoading && auditions.length === 0 && !hasGmail && (
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="grid size-[72px] place-items-center rounded-full border border-rule-strong"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,.04), transparent 50%), linear-gradient(45deg, #2a251f, #3a3329)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-paper-dim"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </div>
          <h2 className="font-serif mt-5 text-[26px] leading-tight tracking-[-0.01em] text-paper">
            Welcome to Actor OS
          </h2>
          <p className="mt-2 max-w-[340px] text-[14px] leading-relaxed text-paper-dim">
            Connect your Gmail to automatically track auditions from your email. Actor OS reads casting notices and builds your dashboard for you.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/settings"
              className="font-sans inline-flex items-center justify-center gap-2 rounded-[30px] border border-paper bg-paper px-5 py-2.5 text-[14px] font-medium text-bg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Connect Gmail
            </Link>
            <Link
              href="/dashboard/auditions/new"
              className="font-sans inline-flex items-center justify-center gap-2 rounded-[30px] border border-rule-strong px-5 py-2.5 text-[14px] font-medium text-paper-dim"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Add an audition manually
            </Link>
          </div>
        </div>
      )}

      {/* Accordion sections */}
      {(auditionsLoading || auditions.length > 0 || hasGmail) && <div className="mt-6">
        <div className="font-mono mb-2.5 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
          Your work
        </div>

        {auditionsLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <>
            <AccordionSection
              id="auditions"
              title="Auditions"
              meta={`${activeAuditions.length} active`}
            >
              <p className="mb-3.5">
                <b className="font-medium text-paper">{week.length} this week.</b>{" "}
                {activeAuditions.filter((a) => a.status === "received").length} new,{" "}
                {activeAuditions.filter((a) => a.status === "callback").length} callback,{" "}
                {activeAuditions.filter((a) => a.status === "submitted").length} submitted.
              </p>
              {week.length > 0 ? (
                <div className="flex flex-col">
                  {week.map((a) => (
                    <AuditionMiniRow key={a.id} a={a} />
                  ))}
                </div>
              ) : (
                <p className="font-serif italic text-paper-faint">Nothing on the books this week.</p>
              )}
              <div className="mt-3">
                <Link
                  href="/dashboard/auditions"
                  className="font-sans inline-flex items-center gap-1.5 rounded-[30px] border border-rule-strong px-3 py-1.5 text-xs text-paper"
                >
                  View all auditions <span className="font-serif">→</span>
                </Link>
              </div>
            </AccordionSection>

            <AccordionSection
              id="jobs"
              title="Jobs"
              meta={`${activeJobs.length} active`}
            >
              {activeJobs.length > 0 ? (
                <>
                  <p>
                    <b className="font-medium text-paper">{activeJobs.length} active job{activeJobs.length !== 1 ? "s" : ""}.</b>{" "}
                    {jobs.filter((j: Job) => j.status === "wrapped").length} wrapped.
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    {activeJobs.slice(0, 3).map((j: Job) => (
                      <Link
                        key={j.id}
                        href={`/dashboard/jobs/${j.id}`}
                        className="flex items-center justify-between rounded-[10px] border border-rule px-3.5 py-2.5 hover:bg-white/[0.015] transition-colors"
                      >
                        <div>
                          <div className="font-serif text-[15px] text-paper">{j.title}</div>
                          {j.role_name && (
                            <div className="text-[11px] text-paper-dim">{j.role_name}</div>
                          )}
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-faint capitalize">
                          {j.project_type.replace(/_/g, " ")}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className="font-serif italic text-paper-faint">No active jobs. Book an audition to get started.</p>
              )}
              <div className="mt-3">
                <Link
                  href="/dashboard/jobs"
                  className="font-sans inline-flex items-center gap-1.5 rounded-[30px] border border-rule-strong px-3 py-1.5 text-xs text-paper"
                >
                  All jobs <span className="font-serif">→</span>
                </Link>
              </div>
            </AccordionSection>

            <AccordionSection
              id="earnings"
              title="Earnings"
              meta={`${formatPayCompact(banked)} / ${formatPayCompact(banked + potential)}`}
              tone="good"
            >
              <p>
                <b className="font-medium text-green">{formatPayCompact(banked)} banked.</b>{" "}
                {potential > 0 && <>{formatPayCompact(potential)} still in play.</>}
              </p>
              <div className="mt-3">
                <Link
                  href="/dashboard/earnings"
                  className="font-sans inline-flex items-center gap-1.5 rounded-[30px] border border-rule-strong px-3 py-1.5 text-xs text-paper"
                >
                  Fullscreen earnings <span className="font-serif">→</span>
                </Link>
              </div>
            </AccordionSection>

            <AccordionSection
              id="selftapes"
              title="Self-tapes"
              meta={`${tapesDue.length} due`}
              tone={tapesDueToday.length ? "urgent" : "default"}
            >
              {tapesDue.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {tapesDue.slice(0, 4).map((t) => {
                    const dueToday =
                      t.deadline && new Date(t.deadline).toDateString() === now.toDateString()
                    return (
                      <div
                        key={t.id}
                        className="rounded-[10px] border border-rule p-3.5"
                        style={dueToday ? { background: "rgba(232,98,90,.04)" } : undefined}
                      >
                        <div className="mb-1.5 flex items-baseline justify-between">
                          <span className="font-serif text-[18px] text-paper">{t.title}</span>
                          {t.deadline && (
                            <span className={`chip ${dueToday ? "flag" : ""}`}>
                              {new Date(t.deadline).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-paper-dim">
                          {t.scene_partner ? `Scene partner: ${t.scene_partner} · ` : ""}
                          not recorded
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="font-serif italic text-paper-faint">No tapes due. Nice.</p>
              )}
              <div className="mt-3">
                <Link
                  href="/dashboard/self-tapes"
                  className="font-sans inline-flex items-center gap-1.5 rounded-[30px] border border-rule-strong px-3 py-1.5 text-xs text-paper"
                >
                  All self-tapes <span className="font-serif">→</span>
                </Link>
              </div>
            </AccordionSection>

            <AccordionSection
              id="contracts"
              title="Contracts"
              meta={`${contractsToReview.length} to review`}
              tone={flaggedContracts.length ? "urgent" : "default"}
            >
              {contractsToReview.length > 0 ? (
                <>
                  <p>
                    <b className="font-medium text-paper">{contractsToReview[0].title}</b>
                    {flaggedContracts.length > 0 && (
                      <> — {flaggedContracts[0].red_flags?.length} red flags flagged by AI.</>
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {flaggedContracts.length > 0 && (
                      <span className="chip flag">{flaggedContracts[0].red_flags?.length} flags</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="font-serif italic text-paper-faint">No contracts waiting on you.</p>
              )}
            </AccordionSection>

            <AccordionSection
              id="outreach"
              title="Outreach"
              meta={`${followUps.length} to follow up`}
            >
              {followUps.length > 0 ? (
                <p>
                  <b className="font-medium text-paper">{followUps[0].name}</b>
                  {followUps[0].last_contact_date
                    ? ` — ${Math.round(
                        (now.getTime() - new Date(followUps[0].last_contact_date).getTime()) /
                          86_400_000,
                      )} days since last contact.`
                    : " — no contact logged yet."}
                </p>
              ) : (
                <p className="font-serif italic text-paper-faint">You&apos;re all caught up.</p>
              )}
            </AccordionSection>

            <AccordionSection id="relationships" title="Relationships" meta={`${contacts.length} notes`}>
              <p>
                <b className="font-medium text-paper">Notes on people, projects, places.</b> Linked
                like a graph — your private <i>Obsidian-style</i> vault.{" "}
                <span className="text-paper-faint">(Coming soon.)</span>
              </p>
            </AccordionSection>

            <AccordionSection
              id="approvals"
              title="Needs approval"
              meta={`${approvalsCount} pending`}
              tone={approvalsCount ? "urgent" : "default"}
            >
              {approvalsCount > 0 ? (
                <p>
                  {approvalsCount} parsed from <b className="font-medium text-paper">email</b>, ready
                  to review and one-tap approve.
                </p>
              ) : (
                <p className="font-serif italic text-paper-faint">Nothing pending approval.</p>
              )}
              <div className="mt-3">
                <Link
                  href="/dashboard/emails"
                  className="font-sans inline-flex items-center gap-1.5 rounded-[30px] border border-rule-strong px-3 py-1.5 text-xs text-paper"
                >
                  Review queue <span className="font-serif">→</span>
                </Link>
              </div>
            </AccordionSection>
          </>
        )}
      </div>}
    </div>
  )
}
