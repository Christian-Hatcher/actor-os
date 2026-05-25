import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed"
    console.error("Webhook signature verification failed:", message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  console.log("Stripe webhook:", event.type)

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      const userEmail = session.customer_email || session.metadata?.email

      if (userEmail) {
        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            subscription_tier: session.metadata?.plan || "monthly",
            updated_at: new Date().toISOString(),
          })
          .eq("email", userEmail)
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const status = subscription.status

      let ourStatus = "inactive"
      if (["active", "trialing"].includes(status)) ourStatus = "active"
      else if (status === "past_due") ourStatus = "past_due"
      else if (["canceled", "unpaid"].includes(status)) ourStatus = "cancelled"

      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: ourStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId)
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: "cancelled",
          stripe_subscription_id: null,
          subscription_tier: "free",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId)
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
