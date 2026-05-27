import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe-admin"

export async function POST(request: Request) {
  const stripe = getStripe()
  try {
    const { plan, email, name } = await request.json()

    if (!plan || !email) {
      return NextResponse.json({ error: "Missing plan or email" }, { status: 400 })
    }

    // Find or create customer
    const existing = await stripe.customers.list({ email, limit: 1 })
    const customer = existing.data[0] || await stripe.customers.create({ email, name })

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price:
            plan === "annual"
              ? process.env.STRIPE_ANNUAL_PRICE_ID
              : process.env.STRIPE_MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?plan=${plan}&canceled=true`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { plan },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error("Checkout error:", err)
    const message = err instanceof Error ? err.message : "Checkout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
