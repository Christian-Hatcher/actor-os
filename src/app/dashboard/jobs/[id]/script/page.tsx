"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ArrowLeft, Download, ChevronDown, X, Plus } from "lucide-react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { cn } from "@/lib/utils"
import type { Script, ScriptAnnotation } from "@/types"

const PDFViewer = dynamic(() => import("@/components/dashboard/pdf-viewer"), { ssr: false })

type AnnotationType = ScriptAnnotation["annotation_type"]

const ANNOTATION_TYPES: { value: AnnotationType; label: string; color: string }[] = [
  { value: "blocking", label: "Blocking", color: "text-blue border-blue/40 bg-blue/[0.1]" },
  { value: "character_note", label: "Character", color: "text-purple border-purple/40 bg-purple/[0.1]" },
  { value: "director_note", label: "Director", color: "text-amber border-amber/40 bg-amber/[0.1]" },
  { value: "emotion", label: "Emotion", color: "text-red border-red/40 bg-red/[0.1]" },
  { value: "prop", label: "Prop", color: "text-green border-green/40 bg-green/[0.1]" },
  { value: "cue", label: "Cue", color: "text-paper-dim border-rule-strong bg-white/[0.04]" },
  { value: "general", label: "General", color: "text-paper-faint border-rule bg-white/[0.03]" },
]

function annotationColor(type: AnnotationType): string {
  return ANNOTATION_TYPES.find((t) => t.value === type)?.color ?? "text-paper-faint border-rule"
}

/* ------------------------------------------------------------------ */
/* Annotation sidebar / bottom sheet                                  */
/* ------------------------------------------------------------------ */

function AnnotationPanel({
  scriptId,
  annotations: initial,
  onClose,
}: {
  scriptId: string
  annotations: ScriptAnnotation[]
  onClose?: () => void
}) {
  const [annotations, setAnnotations] = useState<ScriptAnnotation[]>(initial)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    annotation_type: "general" as AnnotationType,
    content: "",
    page_number: "",
    line_reference: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annotation_type: form.annotation_type,
          content: form.content,
          page_number: form.page_number ? parseInt(form.page_number, 10) : null,
          line_reference: form.line_reference || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to save annotation.")
      const created: ScriptAnnotation = await res.json()
      setAnnotations((prev) => [created, ...prev])
      setForm({ annotation_type: "general", content: "", page_number: "", line_reference: "" })
      setFormOpen(false)
    } catch {
      // surface inline if needed
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper-faint">
          Annotations
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-paper-faint hover:text-paper"
            aria-label="Close annotations"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Annotation list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {annotations.length === 0 && !formOpen && (
          <p className="font-serif py-8 text-center text-[15px] italic text-paper-faint">
            No annotations yet.
          </p>
        )}
        {annotations.map((a) => (
          <div
            key={a.id}
            className="rounded-[10px] border border-rule bg-white/[0.015] p-3"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span
                className={cn(
                  "font-mono inline-flex items-center rounded-[30px] border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em]",
                  annotationColor(a.annotation_type),
                )}
              >
                {a.annotation_type.replace(/_/g, " ")}
              </span>
              {a.page_number != null && (
                <span className="font-mono text-[9.5px] text-paper-faint">
                  p.{a.page_number}
                </span>
              )}
            </div>
            <p className="text-[13px] leading-relaxed text-paper">{a.content}</p>
            {a.line_reference && (
              <p className="mt-1 font-mono text-[10px] text-paper-faint italic">
                &ldquo;{a.line_reference}&rdquo;
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add form */}
      <div className="border-t border-rule px-3 py-3">
        {formOpen ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative">
              <select
                value={form.annotation_type}
                onChange={(e) => setForm((f) => ({ ...f, annotation_type: e.target.value as AnnotationType }))}
                className="font-sans w-full appearance-none rounded-[10px] border border-rule-strong bg-bg px-3 py-2 pr-8 text-[12px] text-paper outline-none focus:border-amber/50"
              >
                {ANNOTATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-paper-faint" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                placeholder="Page #"
                value={form.page_number}
                onChange={(e) => setForm((f) => ({ ...f, page_number: e.target.value }))}
                className="font-sans rounded-[10px] border border-rule-strong bg-transparent px-3 py-2 text-[12px] text-paper outline-none focus:border-amber/50"
              />
              <input
                type="text"
                placeholder="Line ref"
                value={form.line_reference}
                onChange={(e) => setForm((f) => ({ ...f, line_reference: e.target.value }))}
                className="font-sans rounded-[10px] border border-rule-strong bg-transparent px-3 py-2 text-[12px] text-paper outline-none focus:border-amber/50"
              />
            </div>

            <textarea
              required
              placeholder="Your note…"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={3}
              className="font-sans w-full resize-none rounded-[10px] border border-rule-strong bg-transparent px-3 py-2 text-[12px] text-paper outline-none focus:border-amber/50"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "font-sans flex-1 rounded-[10px] border border-amber/40 bg-amber/[0.1] py-2 text-[12px] font-medium text-amber transition-opacity min-h-[44px]",
                  saving && "opacity-50",
                )}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="font-sans rounded-[10px] border border-rule bg-white/[0.02] px-3 py-2 text-[12px] text-paper-faint min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="font-sans flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-rule-strong bg-white/[0.02] py-2.5 text-[12px] text-paper-dim hover:bg-white/[0.04] transition-colors min-h-[44px]"
          >
            <Plus className="size-3.5" />
            Add annotation
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* TXT viewer with line numbers                                        */
/* ------------------------------------------------------------------ */

function TxtViewer({ content }: { content: string }) {
  const lines = content.split("\n")
  return (
    <div className="overflow-x-auto rounded-[14px] border border-rule bg-bg2">
      <pre className="font-mono min-w-0 p-4 text-[12px] leading-[1.7] text-paper-dim">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-4">
            <span className="w-[3ch] shrink-0 select-none text-right text-paper-faint opacity-40">
              {i + 1}
            </span>
            <span className="break-all whitespace-pre-wrap text-paper">{line || " "}</span>
          </div>
        ))}
      </pre>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* DOCX info card                                                      */
/* ------------------------------------------------------------------ */

function DocxViewer({ script }: { script: Script }) {
  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="rounded-[14px] border border-rule bg-white/[0.015] p-6 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[12px] border border-rule-strong bg-white/[0.04]">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-paper-faint">DOC</span>
      </div>
      <div className="font-serif text-[18px] text-paper">{script.file_name}</div>
      <div className="font-mono mt-1 text-[11px] text-paper-faint">
        {formatBytes(script.file_size_bytes)}
        {script.version_label && ` · ${script.version_label}`}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-paper-dim">
        DOCX files can&apos;t be previewed in-browser. Download to view in your preferred editor.
      </p>
      <a
        href={script.file_url}
        download={script.file_name}
        className="font-sans mt-4 inline-flex items-center gap-2 rounded-[30px] border border-paper bg-paper px-5 py-2.5 text-[13px] font-medium text-bg"
      >
        <Download className="size-4" />
        Download
      </a>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Script viewer page                                                  */
/* ------------------------------------------------------------------ */

function ScriptViewer({ jobId, scriptId }: { jobId: string; scriptId: string }) {
  const [script, setScript] = useState<Script | null>(null)
  const [annotations, setAnnotations] = useState<ScriptAnnotation[]>([])
  const [txtContent, setTxtContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [annotationsOpen, setAnnotationsOpen] = useState(false)

  useEffect(() => {
    let active = true
    async function fetchScript() {
      try {
        const [scriptRes, annotRes] = await Promise.all([
          fetch(`/api/scripts/${scriptId}`),
          fetch(`/api/scripts/${scriptId}/annotations`),
        ])
        if (!scriptRes.ok) throw new Error(scriptRes.status === 404 ? "not_found" : `HTTP ${scriptRes.status}`)
        const scriptData: Script = await scriptRes.json()
        const annotData: ScriptAnnotation[] = annotRes.ok ? await annotRes.json() : []
        if (!active) return

        setScript(scriptData)
        setAnnotations(annotData)

        if (scriptData.file_type === "txt") {
          const textRes = await fetch(scriptData.file_url)
          const text = await textRes.text()
          if (active) setTxtContent(text)
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load script.")
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchScript()
    return () => { active = false }
  }, [scriptId])

  if (loading) {
    return (
      <p className="font-serif py-16 text-center text-[18px] italic text-paper-faint">
        Loading script&hellip;
      </p>
    )
  }

  if (error === "not_found" || !script) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-[20px] italic text-paper-faint">Script not found.</p>
        <Link
          href={`/dashboard/jobs/${jobId}`}
          className="font-mono mt-4 inline-block text-[11px] uppercase tracking-[0.18em] text-amber"
        >
          &larr; Back to job
        </Link>
      </div>
    )
  }

  return (
    <div className="-mx-[22px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-[22px] pb-3 pt-1">
        <Link
          href={`/dashboard/jobs/${jobId}?tab=scripts`}
          className="font-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-dim"
        >
          <ArrowLeft className="size-3.5 text-paper" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={script.file_url}
            download={script.file_name}
            className="font-mono flex items-center gap-1.5 rounded-[30px] border border-rule-strong px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-paper-dim hover:border-paper-faint transition-colors"
          >
            <Download className="size-3" />
            Download
          </a>
          {/* Mobile: toggle annotations bottom sheet */}
          <button
            type="button"
            onClick={() => setAnnotationsOpen((o) => !o)}
            className="font-mono md:hidden flex items-center gap-1.5 rounded-[30px] border border-rule-strong px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-paper-dim hover:border-paper-faint transition-colors"
          >
            Notes
            {annotations.length > 0 && (
              <span className="ml-0.5 opacity-60">{annotations.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-[22px] pb-4">
        <div className="font-serif text-[22px] leading-tight text-paper">{script.file_name}</div>
        {script.version_label && (
          <div className="font-mono mt-0.5 text-[10px] uppercase tracking-[0.1em] text-paper-faint">
            {script.version_label}
          </div>
        )}
      </div>

      {/* Desktop: two-column layout */}
      <div className="flex gap-0">
        {/* Viewer */}
        <div className="min-w-0 flex-1 px-[22px]">
          {script.file_type === "pdf" && (
            <PDFViewer url={script.file_url} />
          )}
          {script.file_type === "txt" && txtContent != null && (
            <TxtViewer content={txtContent} />
          )}
          {script.file_type === "txt" && txtContent == null && (
            <p className="font-serif py-8 text-center italic text-paper-faint">
              Loading content&hellip;
            </p>
          )}
          {script.file_type === "docx" && (
            <DocxViewer script={script} />
          )}
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:w-[280px] md:shrink-0 md:flex-col border-l border-rule h-[calc(100vh-120px)] sticky top-[72px]">
          <AnnotationPanel
            scriptId={scriptId}
            annotations={annotations}
          />
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      {annotationsOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setAnnotationsOpen(false)}
          />
          <div
            className="relative z-10 flex max-h-[75vh] flex-col rounded-t-[20px] border-t border-rule"
            style={{ background: "var(--bg2)" }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-rule-strong" />
            <AnnotationPanel
              scriptId={scriptId}
              annotations={annotations}
              onClose={() => setAnnotationsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScriptPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const scriptId = searchParams.get("scriptId") ?? ""

  if (!scriptId) {
    return (
      <DashboardShell>
        <div className="py-16 text-center">
          <p className="font-serif text-[18px] italic text-paper-faint">
            No script specified.
          </p>
          <Link
            href={`/dashboard/jobs/${params.id}`}
            className="font-mono mt-4 inline-block text-[11px] uppercase tracking-[0.18em] text-amber"
          >
            &larr; Back to job
          </Link>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <ScriptViewer jobId={params.id} scriptId={scriptId} />
    </DashboardShell>
  )
}
