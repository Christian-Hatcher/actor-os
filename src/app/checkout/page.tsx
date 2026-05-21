"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, ArrowLeft, Loader2 } from "lucide-react"

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan") || "monthly"

  const [loading, setLoading] = useState(false)

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

  const selected = planDetails[plan as keyof typeof planDetails] || planDetails.monthly

  const handleCheckout = async () => {
    setLoading(true)
    // TODO: Create Stripe Checkout Session
    // const response = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify({ plan }) })
    // const { url } = await response.json()
    // window.location.href = url

    // Mock for now
    setTimeout(() => {
      setLoading(false)
      alert("Stripe checkout would open here. This is a demo.")
    }, 1500)
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
              You're subscribing to the {selected.name} plan.
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
              Secure payment via Stripe. Cancel anytime.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
