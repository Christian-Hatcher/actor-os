"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const plan = (searchParams.get("plan") || "monthly") as "monthly" | "annual"

  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [betaCode, setBetaCode] = useState("")

  const planDetails = {
    monthly: {
      name: "Monthly",
      price: "$5",
      period: "/month",
      features: [
        "Unlimited auditions",
        "Self-tape deadline tracker",
        "AI contract analysis (5/month)",
        "Outreach CRM",
      ],
    },
    annual: {
      name: "Annual",
      price: "$45",
      period: "/year",
      features: [
        "Everything in Monthly",
        "AI contract analysis (10/month)",
        "Priority support",
        "Save $15/year",
      ],
    },
  }

  const selected = planDetails[plan]

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

      if (!res.ok) {
        throw new Error(data.error || "Checkout failed")
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-md">
        <Link
          href="/signup"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to signup
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Complete your subscription</CardTitle>
            <p className="text-sm text-muted-foreground">
              You&apos;re subscribing to the {selected.name} plan.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="text-3xl font-bold">
                {selected.price}
                <span className="text-lg text-muted-foreground">{selected.period}</span>
              </div>
            </div>

            <ul className="space-y-2">
              {selected.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <label className="text-sm font-medium">Have a beta code?</label>
              <input
                type="text"
                value={betaCode}
                onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g. BETA100)"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                `Pay ${selected.price}${selected.period}`
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Secure payment via Stripe. 14-day free trial. Cancel anytime.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
