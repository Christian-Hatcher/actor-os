"use client"

import { useState } from "react"
import { useTax } from "@/hooks/use-tax"
import { formatYen, formatYenCompact } from "@/lib/format"
import { cn } from "@/lib/utils"

function SetAsideInput({
  month,
  current,
  onSave,
}: {
  month: number
  current: number
  onSave: (month: number, amount: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(current))

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(current))
          setEditing(true)
        }}
        className="font-mono text-[12px] text-paper-dim hover:text-paper transition-colors"
      >
        {current > 0 ? formatYen(current) : "Log →"}
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const n = parseInt(value.replace(/[^\d]/g, ""), 10) || 0
        onSave(month, n)
        setEditing(false)
      }}
      className="flex items-center gap-1.5"
    >
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded-md border border-rule bg-bg3 px-2 py-0.5 font-mono text-[12px] text-paper outline-none focus:border-amber"
        placeholder="0"
      />
      <button type="submit" className="font-mono text-[10px] uppercase text-amber">
        Save
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="font-mono text-[10px] uppercase text-paper-faint"
      >
        ✕
      </button>
    </form>
  )
}

export function TaxKeeper() {
  const { summary, settings, logSavings, loading } = useTax()

  if (loading) {
    return (
      <p className="font-serif mt-10 text-center text-[18px] italic text-paper-faint">
        Calculating your taxes…
      </p>
    )
  }

  const surplusPositive = summary.surplus >= 0
  const ratePct = Math.round(summary.effectiveRate * 100)

  return (
    <div>
      {/* Hero: what to set aside this month */}
      <div className="mt-5 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper-faint">
          Set aside this month
        </div>
        <div className="font-serif mt-2 text-[56px] leading-none tracking-[-0.02em] text-amber">
          {formatYen(summary.thisMonthTax)}
        </div>
        <div className="font-mono mt-2 text-[11px] tracking-[0.08em] text-paper-dim">
          {ratePct}% effective rate · {formatYenCompact(summary.thisMonthGross)} gross this month
        </div>
      </div>

      {/* YTD Summary Card */}
      <div className="mt-6 rounded-[14px] border border-rule p-4">
        <div className="font-serif text-[20px] text-paper">Year to Date</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper-faint">
              Total earned
            </div>
            <div className="font-serif mt-0.5 text-[22px] text-paper">
              {formatYenCompact(summary.ytdGross)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper-faint">
              Tax owed (est.)
            </div>
            <div className="font-serif mt-0.5 text-[22px] text-red">
              {formatYenCompact(summary.ytdEstimatedTax)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper-faint">
              Actually saved
            </div>
            <div className="font-serif mt-0.5 text-[22px] text-green">
              {formatYenCompact(summary.ytdSetAside)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper-faint">
              {surplusPositive ? "Surplus" : "Shortfall"}
            </div>
            <div
              className={cn(
                "font-serif mt-0.5 text-[22px]",
                surplusPositive ? "text-green" : "text-red",
              )}
            >
              {surplusPositive ? "+" : ""}
              {formatYenCompact(summary.surplus)}
            </div>
          </div>
        </div>

        {/* Progress bar: saved vs owed */}
        <div className="mt-4">
          <div className="flex justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-faint">
              Saved vs owed
            </span>
            <span
              className={cn(
                "font-mono text-[9px] uppercase tracking-[0.12em]",
                surplusPositive ? "text-green" : "text-red",
              )}
            >
              {surplusPositive ? "On track" : "Behind"}
            </span>
          </div>
          <div className="mt-1.5 relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all",
                surplusPositive ? "bg-green" : "bg-red",
              )}
              style={{
                width: `${Math.min(100, summary.ytdEstimatedTax > 0 ? (summary.ytdSetAside / summary.ytdEstimatedTax) * 100 : 0)}%`,
              }}
            />
            {/* Owed marker at 100% */}
            <div className="absolute inset-y-0 right-0 w-0.5 bg-paper-faint/40" />
          </div>
        </div>
      </div>

      {/* Tax breakdown */}
      {summary.estimate.breakdown.length > 0 && (
        <div className="mt-4 rounded-[14px] border border-rule p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint mb-2.5">
            Tax breakdown ({settings.jurisdiction.toUpperCase()})
          </div>
          {summary.estimate.breakdown.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between border-t border-rule py-2 first:border-0 first:pt-0"
            >
              <span className="font-sans text-[13px] text-paper-dim">{item.label}</span>
              <span className="font-mono text-[12px] text-paper">{formatYen(item.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-rule-strong pt-2 mt-1">
            <span className="font-sans text-[13px] font-medium text-paper">Total estimated</span>
            <span className="font-mono text-[13px] font-medium text-red">
              {formatYen(summary.ytdEstimatedTax)}
            </span>
          </div>
        </div>
      )}

      {/* Monthly log */}
      <div className="mt-4 rounded-[14px] border border-rule overflow-hidden">
        <div className="px-4 py-3 border-b border-rule">
          <div className="font-serif text-[18px] text-paper">Monthly savings log</div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper-faint mt-0.5">
            Log what you actually put away each month
          </div>
        </div>
        <div className="divide-y divide-rule">
          {summary.months.map((m) => {
            const diff = m.setSAside - m.estimatedTax
            const monthNum = parseInt(m.key.split("-")[1], 10)
            return (
              <div key={m.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5">
                <div>
                  <div className="font-serif text-[15px] text-paper">{m.label}</div>
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-paper-faint">
                    {formatYenCompact(m.gross)} gross · {formatYenCompact(m.estimatedTax)} owed
                  </div>
                </div>
                <div className="text-right">
                  <SetAsideInput
                    month={monthNum}
                    current={m.setSAside}
                    onSave={logSavings}
                  />
                </div>
                <div
                  className={cn(
                    "font-mono text-[10px] min-w-[50px] text-right",
                    diff >= 0 ? "text-green" : "text-red",
                  )}
                >
                  {m.setSAside > 0 ? (diff >= 0 ? `+${formatYenCompact(diff)}` : formatYenCompact(diff)) : "—"}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Jurisdiction info */}
      <div className="mt-4 rounded-[12px] border border-rule bg-amber/[0.04] px-4 py-3">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-amber">
          How this works
        </div>
        <p className="font-sans mt-1.5 text-[13px] leading-[1.5] text-paper-dim">
          Actor OS estimates your tax liability based on your{" "}
          {settings.jurisdiction === "us" && "US self-employment tax + federal brackets"}
          {settings.jurisdiction === "jp" && "Japan freelancer withholding rates (gensenchoushu)"}
          {settings.jurisdiction === "uk" && "UK income tax + National Insurance"}
          {settings.jurisdiction !== "us" && settings.jurisdiction !== "jp" && settings.jurisdiction !== "uk" && "estimated flat rate"}
          . This is a guide — not tax advice. Adjust your rate in Settings if your accountant gives you a number.
        </p>
      </div>
    </div>
  )
}
