"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { useJobs } from "@/hooks/use-jobs"
import type { Job } from "@/types"

const TYPE_OPTIONS: { id: Job["type"]; label: string }[] = [
  { id: "film", label: "Film" },
  { id: "theater", label: "Theater" },
  { id: "commercial", label: "Commercial" },
  { id: "voiceover", label: "Voiceover" },
  { id: "other", label: "Other" },
]

export default function NewJobPage() {
  const router = useRouter()
  const { addJob } = useJobs()

  const [title, setTitle] = useState("")
  const [type, setType] = useState<Job["type"]>("film")
  const [role, setRole] = useState("")
  const [director, setDirector] = useState("")
  const [production, setProduction] = useState("")
  const [venue, setVenue] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [comp, setComp] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const job = await addJob({
        audition_id: null,
        title: title.trim(),
        type,
        venue_or_location: venue || null,
        director: director || null,
        production_company: production || null,
        role_name: role || null,
        status: "active",
        start_date: start || null,
        end_date: end || null,
        compensation: comp || null,
        contract_id: null,
        notes: notes || null,
      })
      router.push(`/dashboard/jobs/${job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the job")
      setSaving(false)
    }
  }

  return (
    <DashboardShell>
      <div className="-mx-[22px]">
        <div className="flex items-center justify-between gap-4 px-[22px] pb-3 pt-1">
          <Link
            href="/dashboard/jobs"
            className="font-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-dim"
          >
            <ArrowLeft className="size-3.5 text-paper" /> Jobs
          </Link>
        </div>

        <div className="px-[22px]">
          <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            New job · post-booking
          </div>
          <h1 className="font-serif text-[28px] leading-none tracking-[-0.01em]">Add a job.</h1>
          <p className="font-serif mt-2 text-[14.5px] italic leading-[1.5] text-paper-dim">
            For bookings that didn&apos;t come through Actor OS, or any direct-hire work.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 px-[22px] pb-12">
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Macbeth — Spring 2026"
              className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3 py-2 text-[14px] text-paper"
            />
          </Field>
          <Field label="Type">
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((t) => {
                const on = t.id === type
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`font-mono rounded-[30px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${
                      on
                        ? "border-amber bg-amber/[0.12] text-amber"
                        : "border-rule-strong text-paper-dim"
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label="Role">
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Macbeth"
              className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3 py-2 text-[14px] text-paper"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Director">
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3 py-2 text-[14px] text-paper"
              />
            </Field>
            <Field label="Production co.">
              <input
                type="text"
                value={production}
                onChange={(e) => setProduction(e.target.value)}
                className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3 py-2 text-[14px] text-paper"
              />
            </Field>
          </div>
          <Field label="Venue / location">
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3 py-2 text-[14px] text-paper"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3 py-2 text-[14px] text-paper"
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3 py-2 text-[14px] text-paper"
              />
            </Field>
          </div>
          <Field label="Compensation">
            <input
              type="text"
              value={comp}
              onChange={(e) => setComp(e.target.value)}
              placeholder="¥500,000 or 50万"
              className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3 py-2 text-[14px] text-paper"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3 py-2 text-[14px] text-paper"
            />
          </Field>

          {error && (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="font-serif mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-paper py-3.5 text-[20px] text-bg disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create job"} <span>→</span>
          </button>
        </form>
      </div>
    </DashboardShell>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper-faint">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  )
}
