import stripe from "stripe"

const Stripe = stripe as any
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export { stripeClient as stripe }

export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID!,
  annual: process.env.STRIPE_ANNUAL_PRICE_ID!,
}

export async function getOrCreateCustomer(email: string, name?: string) {
  const existing = await stripeClient.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) return existing.data[0]

  return stripeClient.customers.create({ email, name })
}

export async function createCheckoutSession(
  customerId: string,
  plan: "monthly" | "annual",
  successUrl: string,
  cancelUrl: string
) {
  return stripeClient.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: STRIPE_PRICES[plan],
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14,
      metadata: { plan },
    },
    allow_promotion_codes: true,
  })
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  return stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
