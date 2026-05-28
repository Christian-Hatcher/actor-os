"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
  ChevronLeft,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ClipboardPaste,
  X,
  ShieldCheck,
  HelpCircle,
} from "lucide-react"
import { useContracts } from "@/hooks/use-data"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type { Contract } from "@/types"

/* ---------- Grade badge color helper ---------- */
function gradeColor(grade: string | undefined) {
  if (!grade) return "text-paper-dim"
  if (grade === "A") return "text-green"
  if (grade === "B") return "text-green"
  if (grade === "C") return "text-amber"
  return "text-red"
}

/* ---------- Status chip ---------- */
function StatusChip({ status }: { status: Contract["status"] }) {
  if (status === "reviewed") {
    return (
      <span className="chip bk inline-flex items-center gap-1">
        <CheckCircle className="size-3" />
        Reviewed
      </span>
    )
  }
  if (status === "analyzing") {
    return (
      <span className="chip cb inline-flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" />
        Analyzing
      </span>
    )
  }
  if (status === "signed") {
    return (
      <span className="chip bk inline-flex items-center gap-1">
        <ShieldCheck className="size-3" />
        Signed
      </span>
    )
  }
  return <span className="chip">Uploaded</span>
}

/* ---------- Paste modal ---------- */
function PasteModal({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean
  onClose: () => void
  onSubmitted: (c: Contract) => void
}) {
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim() || !text.trim()) {
      setError("Please enter both a title and the contract text.")
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      // 1. Get current user
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error("Not signed in")

      // 2. Create contract row in Supabase
      const { data: contract, error: insertErr } = await supabase
        .from("contracts")
        .insert({
          user_id: userId,
          title: title.trim(),
          file_url: "",
          status: "uploaded" as const,
        })
        .select()
        .single()

      if (insertErr || !contract) throw new Error(insertErr?.message || "Failed to create contract")

      // 3. POST to the analysis endpoint
      const res = await fetch("/api/contracts/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract.id,
          contractText: text.trim(),
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Analysis failed")

      // 4. Return the updated contract
      const { data: updated } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contract.id)
        .single()

      onSubmitted((updated || contract) as Contract)
      setTitle("")
      setText("")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative mx-4 mb-4 w-full max-w-[480px] overflow-hidden rounded-[18px] border border-rule bg-bg sm:mb-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div className="font-serif text-[20px] leading-none text-paper">Paste Contract Text</div>
          <button onClick={onClose} className="rounded-full p-1 text-paper-dim hover:text-paper">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          {/* Title field */}
          <div>
            <label className="font-mono mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-paper-faint">
              Contract title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. BANDAI Toy Voice Agreement"
              className="w-full rounded-[10px] border border-rule bg-white/[0.03] px-3.5 py-2.5 font-serif text-[15px] text-paper placeholder:text-paper-faint focus:border-green/50 focus:outline-none"
            />
          </div>

          {/* Text area */}
          <div>
            <label className="font-mono mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-paper-faint">
              Full contract text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the entire contract here. The AI will analyze all clauses, flag risks, and generate questions for your agent..."
              rows={10}
              className="w-full resize-none rounded-[10px] border border-rule bg-white/[0.03] px-3.5 py-2.5 font-serif text-[14px] leading-[1.55] text-paper placeholder:text-paper-faint focus:border-green/50 focus:outline-none"
            />
            <div className="font-mono mt-1 text-[9px] uppercase tracking-[0.1em] text-paper-faint">
              PDF extraction coming soon — paste text for now
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-[10px] border border-red/30 bg-red/[0.06] px-3.5 py-2.5">
              <p className="font-serif text-[13px] text-red">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              "font-sans w-full rounded-[10px] border border-paper bg-paper py-3 text-[14px] font-medium text-bg transition-opacity",
              submitting && "opacity-50",
            )}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Analyzing contract...
              </span>
            ) : (
              "Analyze with AI"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Contract card ---------- */
function ContractCard({
  contract,
  onReanalyze,
}: {
  contract: Contract
  onReanalyze?: (c: Contract) => void
}) {
  const [expanded, setExpanded] = useState(contract.status === "reviewed")

  return (
    <div
      className={cn(
        "mt-3.5 overflow-hidden rounded-[14px] border border-rule [background:linear-gradient(180deg,rgba(255,255,255,.015),transparent)]",
        contract.status === "reviewed" &&
          "border-green/[0.22] [background:linear-gradient(180deg,rgba(58,168,107,.05),transparent_50%)]",
        contract.status === "analyzing" &&
          "border-amber/[0.22] [background:linear-gradient(180deg,rgba(200,160,60,.05),transparent_50%)]",
      )}
    >
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-start justify-between px-4 py-3.5 text-left"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="size-[18px] flex-none text-paper-dim" strokeWidth={1.6} />
          <div className="min-w-0">
            <div className="font-serif truncate text-[18px] leading-[1.15] text-paper">
              {contract.title}
            </div>
            <div className="font-mono mt-1 text-[10px] uppercase tracking-[0.12em] text-paper-faint">
              {new Date(contract.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
        <div className="flex-none ml-2">
          <StatusChip status={contract.status} />
        </div>
      </button>

      {/* Expanded analysis details */}
      {expanded && contract.status === "reviewed" && contract.summary && (
        <div className="border-t border-rule px-4 pb-4 pt-3.5">
          {/* Summary */}
          <div className="rounded-[10px] border border-rule bg-white/[0.02] p-3.5">
            <div className="font-mono mb-1.5 text-[9px] uppercase tracking-[0.2em] text-paper-faint">
              Summary
            </div>
            <p className="font-serif text-[15px] leading-[1.5] text-paper">
              {contract.summary}
            </p>
          </div>

          {/* Key clauses */}
          {contract.key_clauses && Object.keys(contract.key_clauses).length > 0 && (
            <div className="mt-3">
              <div className="font-mono mb-2 text-[9px] uppercase tracking-[0.2em] text-paper-faint">
                Key Clauses
              </div>
              <div className="flex flex-col gap-1.5">
                {Object.entries(contract.key_clauses).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-baseline justify-between gap-3 rounded-[8px] border border-rule bg-white/[0.015] px-3 py-2"
                  >
                    <span className="font-mono flex-none text-[10px] uppercase tracking-[0.08em] text-paper-dim">
                      {key}
                    </span>
                    <span className="font-serif text-right text-[13px] leading-[1.35] text-paper">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red flags */}
          {contract.red_flags && contract.red_flags.length > 0 && (
            <div className="mt-3 rounded-[10px] border border-red/25 bg-red/[0.05] p-3.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-red" />
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-red">
                  Red Flags
                </div>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {contract.red_flags.map((flag, i) => (
                  <li key={i} className="font-serif pl-3 text-[14px] leading-[1.45] text-paper before:mr-2 before:content-['\2022'] before:text-red">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Questions to ask */}
          {contract.questions && contract.questions.length > 0 && (
            <div className="mt-3 rounded-[10px] border border-blue-500/25 bg-blue-500/[0.04] p-3.5">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="size-3.5 text-blue-400" />
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-blue-400">
                  Questions for Your Agent
                </div>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {contract.questions.map((q, i) => (
                  <li key={i} className="font-serif pl-3 text-[14px] leading-[1.45] text-paper before:mr-2 before:content-['\2022'] before:text-blue-400">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Uploaded but not analyzed — prompt action */}
      {contract.status === "uploaded" && onReanalyze && (
        <div className="border-t border-rule px-4 py-3">
          <button
            onClick={() => onReanalyze(contract)}
            className="font-sans flex w-full items-center justify-center gap-2 rounded-[10px] border border-paper bg-paper py-2.5 text-[13px] font-medium text-bg"
          >
            <ClipboardPaste className="size-3.5" />
            Paste text to analyze
          </button>
        </div>
      )}

      {/* Analyzing spinner */}
      {contract.status === "analyzing" && (
        <div className="border-t border-rule px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin text-amber" />
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-amber">
              AI is reading the fine print...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Loading skeleton ---------- */
function ContractSkeleton() {
  return (
    <div className="mt-3.5 overflow-hidden rounded-[14px] border border-rule">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="size-[18px] animate-pulse rounded bg-white/[0.06]" />
        <div className="flex-1">
          <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-2 h-2.5 w-1/3 animate-pulse rounded bg-white/[0.04]" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.06]" />
      </div>
    </div>
  )
}

/* ================================================================
   Main page
   ================================================================ */
export default function ContractsPage() {
  const { contracts, loading, error } = useContracts()
  const [localContracts, setLocalContracts] = useState<Contract[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  // Merge server contracts with any just-created ones (avoid duplicates)
  const allContracts = [
    ...localContracts.filter((lc) => !contracts.some((c) => c.id === lc.id)),
    ...contracts,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const reviewed = allContracts.filter((c) => c.status === "reviewed" || c.status === "signed")
  const pending = allContracts.filter((c) => c.status === "uploaded" || c.status === "analyzing")

  const handleSubmitted = useCallback((contract: Contract) => {
    setLocalContracts((prev) => [contract, ...prev.filter((c) => c.id !== contract.id)])
  }, [])

  return (
    <DashboardShell>
      {/* Head row */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-dim"
        >
          <ChevronLeft className="size-3.5" /> Dashboard
        </Link>
        <button
          onClick={() => setModalOpen(true)}
          className="font-mono inline-flex items-center gap-1.5 rounded-[30px] border border-rule bg-white/[0.02] px-3.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-paper-dim hover:border-green/40 hover:text-paper"
        >
          <ClipboardPaste className="size-3" />
          New contract
        </button>
      </div>

      {/* Title */}
      <div className="mt-5">
        <div className="font-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
          <span className="pulse-dot mr-1.5 inline-block size-[5px] rounded-full bg-green align-[1px] shadow-[0_0_8px_var(--green)]" />
          {reviewed.length} reviewed · {allContracts.length} total
        </div>
        <h1 className="font-serif text-[40px] leading-none tracking-[-0.015em]">Contracts</h1>
        <p className="font-mono mt-2 text-[11px] tracking-[0.06em] text-paper-dim">
          AI-powered contract analysis. Paste any agreement and get instant red-flag detection.
        </p>
      </div>

      {/* Paste CTA card */}
      <div
        className="mt-5 cursor-pointer rounded-[14px] border border-dashed border-rule-strong p-6 text-center transition-colors hover:border-green/40"
        onClick={() => setModalOpen(true)}
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,.01) 0 10px, transparent 10px 20px)",
        }}
      >
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full border border-dashed border-rule-strong text-paper-dim">
          <ClipboardPaste className="size-[22px]" strokeWidth={1.6} />
        </div>
        <div className="font-serif text-[16px] text-paper">Paste a contract</div>
        <div className="font-mono mt-1 text-[10px] uppercase tracking-[0.12em] text-paper-faint">
          PDF extraction coming soon — paste text for now
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 rounded-[10px] border border-red/30 bg-red/[0.06] px-4 py-3">
          <p className="font-serif text-[14px] text-red">Failed to load contracts: {error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div>
          <ContractSkeleton />
          <ContractSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!loading && allContracts.length === 0 && !error && (
        <p className="font-serif mt-10 text-center text-[18px] italic text-paper-faint">
          No contracts yet. Paste one above and the AI will break it down for you.
        </p>
      )}

      {/* Pending contracts */}
      {pending.length > 0 && (
        <div className="mt-4">
          <div className="font-mono mb-1 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            Pending
          </div>
          {pending.map((c) => (
            <ContractCard key={c.id} contract={c} onReanalyze={() => setModalOpen(true)} />
          ))}
        </div>
      )}

      {/* Reviewed contracts */}
      {reviewed.length > 0 && (
        <div className="mt-4">
          <div className="font-mono mb-1 text-[10px] uppercase tracking-[0.22em] text-paper-faint">
            Reviewed
          </div>
          {reviewed.map((c) => (
            <ContractCard key={c.id} contract={c} />
          ))}
        </div>
      )}

      {/* Paste modal */}
      <PasteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmitted={handleSubmitted}
      />
    </DashboardShell>
  )
}
