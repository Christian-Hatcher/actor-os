"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Clapperboard, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

function SignupInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan") || "monthly"
  const { signUp } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await signUp(email, password, { full_name: name })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(`/onboarding?plan=${encodeURIComponent(plan)}`)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-paper">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,167,85,.14), transparent 65%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(60,50,40,.18), transparent 65%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col px-[22px] py-12">
        <Link
          href="/"
          className="font-mono mb-12 inline-flex items-center gap-2 self-start text-[11px] uppercase tracking-[0.22em] text-paper-dim hover:text-paper"
        >
          <Clapperboard className="h-3.5 w-3.5 text-amber" /> Actor OS
        </Link>

        <div>
          <div className="font-mono mb-4 text-[10px] uppercase tracking-[0.22em] text-amber">
            New chapter
          </div>
          <h1 className="font-serif text-[44px] leading-[1.02] tracking-[-0.015em]">
            Make this the year
            <br />
            <em className="not-italic italic text-paper-dim">you get organized.</em>
          </h1>
          <p className="font-serif mt-3 text-[15px] italic leading-[1.5] text-paper-dim">
            14-day free trial. No credit card. Cancel anytime.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper-faint">
              Full name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Christian Hatcher"
              required
              autoComplete="name"
              className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3.5 py-3 text-[15px] text-paper outline-none focus:border-amber"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper-faint">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="actor@example.com"
              required
              autoComplete="email"
              className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3.5 py-3 text-[15px] text-paper outline-none focus:border-amber"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper-faint">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
              autoComplete="new-password"
              className="font-sans rounded-[10px] border border-rule-strong bg-bg2 px-3.5 py-3 text-[15px] text-paper outline-none focus:border-amber"
            />
          </label>

          {error && (
            <div className="rounded-[10px] border border-red/40 bg-red/[0.08] px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="font-serif mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-amber py-3.5 text-[20px] text-bg disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
              </>
            ) : (
              <>
                Start free trial <span>→</span>
              </>
            )}
          </button>
        </form>

        <p className="font-mono mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-paper-faint">
          Already with us?{" "}
          <Link href="/login" className="text-amber">
            Sign in
          </Link>
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

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  )
}
