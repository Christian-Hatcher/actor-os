"use server"

import stripe from "stripe"

const Stripe = stripe as unknown as typeof stripe.default
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
})

const PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID!,
  annual: process.env.STRIPE_ANNUAL_PRICE_ID!,
}

export async function createCheckoutSession(plan: "monthly" | "annual", customerEmail: string) {
  const session = await stripeClient.checkout.sessions.create({
    customer_email: customerEmail,
    line_items: [
      {
        price: PRICE_IDS[plan],
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?plan=${plan}&canceled=true`,
    subscription_data: {
      trial_period_days: 14,
    },
  })

  return { url: session.url }
}

export async function createPortalSession(customerId: string) {
  const session = await stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  })

  return { url: session.url }
}
