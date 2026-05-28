"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface PlanDetails {
  name: string
  price: string
  period: string
  hint: string
  features: string[]
}

const PLANS: Record<"monthly" | "annual", PlanDetails> = {
  monthly: {
    name: "Monthly",
    price: "$5",
    period: "/month",
    hint: "Cancel anytime. No questions asked.",
    features: [
      "Unlimited auditions",
      "Self-tape deadline tracker",
      "AI contract analysis (5/mo)",
      "Outreach CRM",
    ],
  },
  annual: {
    name: "Annual",
    price: "$45",
    period: "/year",
    hint: "Save 25% — $3.75/month effective.",
    features: [
      "Everything in Monthly",
      "AI contract analysis (10/mo)",
      "Priority support",
      "Save $15/year",
    ],
  },
}

function CheckoutInner() {
  const searchParams = useSearchParams()
  const plan = (searchParams.get("plan") || "monthly") as "monthly" | "annual"
  const selected = PLANS[plan] ?? PLANS.monthly
  const other = plan === "monthly" ? "annual" : "monthly"

  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [betaCode, setBetaCode] = useState("")

  async function handleCheckout() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          email: user?.email || "",
          name: profile?.full_name || "",
          ...(betaCode.trim() && { coupon_code: betaCode.trim() }),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Checkout failed")
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed")
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-paper">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,167,85,.12), transparent 65%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(60,50,40,.18), transparent 65%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-[22px] py-10">
        <Link
          href="/signup"
          className="font-mono inline-flex items-center gap-1.5 self-start text-[10px] uppercase tracking-[0.18em] text-paper-dim hover:text-paper"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="mt-8">
          <div className="font-mono mb-3 text-[10px] uppercase tracking-[0.22em] text-amber">
            One last step
          </div>
          <h1 className="font-serif text-[36px] leading-[1.05] tracking-[-0.015em]">
            Unlock the whole
            <br />
            <em className="not-italic italic text-paper-dim">command center.</em>
          </h1>
        </div>

        {/* Price card */}
        <div className="mt-7 rounded-[14px] border border-amber/30 bg-amber/[0.04] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber">
            {selected.name} plan
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-serif text-[52px] leading-none tracking-[-0.015em]">
              {selected.price}
            </span>
            <span className="text-[16px] text-paper-dim">{selected.period}</span>
          </div>
          <p className="font-serif mt-1 text-[13.5px] italic text-paper-faint">{selected.hint}</p>

          <ul className="mt-5 space-y-2">
            {selected.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-paper">
                <Check className="h-3.5 w-3.5 text-green" />
                {f}
              </li>
            ))}
          </ul>

          <Link
            href={`/checkout?plan=${other}`}
            className="font-mono mt-5 inline-block text-[10px] uppercase tracking-[0.18em] text-paper-dim hover:text-amber"
          >
            ← Switch to {PLANS[other].name.toLowerCase()} ({PLANS[other].price}
            {PLANS[other].period})
          </Link>
        </div>

        {/* Beta code */}
        <label className="mt-5 flex flex-col gap-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper-faint">
            Have a beta code?
          </span>
          <input
            type="text"
            value={betaCode}
            onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
            placeholder="BETA100"
            className="font-mono rounded-[10px] border border-rule-strong bg-bg2 px-3.5 py-2.5 text-[13px] uppercase tracking-[0.14em] text-paper outline-none focus:border-amber"
          />
        </label>

        {error && (
          <div className="mt-3 rounded-[10px] border border-red/40 bg-red/[0.08] px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="font-serif mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-amber py-3.5 text-[20px] text-bg disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
            </>
          ) : (
            <>
              Pay {selected.price}
              {selected.period} <span>→</span>
            </>
          )}
        </button>

        <p className="font-mono mt-3 text-center text-[9px] uppercase tracking-[0.18em] text-paper-faint">
          Secured by Stripe · 14-day free trial · Cancel anytime
        </p>

        <div className="mt-auto pt-12 text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper-faint">
            © At Home Reelz K.K. · Tokyo
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  )
}
