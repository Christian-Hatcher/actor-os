"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

function CheckoutContent() {
  const searchParams = useSearchParams()
  const plan = (searchParams.get("plan") || "monthly") as "monthly" | "annual"
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const planDetails = {
    monthly: {
      name: "Monthly",
      price: "$10",
      period: "/month",
      features: [
        "Unlimited auditions",
        "Email auto-import from Gmail",
        "Unlimited AI contract analysis",
        "Self-tape deadline tracker",
        "Outreach CRM",
      ],
    },
    annual: {
      name: "Annual",
      price: "$90",
      period: "/year",
      features: [
        "Everything in Monthly",
        "Save $30/year ($7.50/mo)",
        "Priority support",
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
          name: user?.user_metadata?.full_name || user?.email || "",
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4 sm:px-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">Please log in to continue to checkout.</p>
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4 sm:px-6">
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

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  )
}
