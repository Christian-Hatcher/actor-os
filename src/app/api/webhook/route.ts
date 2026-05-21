import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  console.log("Stripe webhook:", event.type)

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const customerId = session.customer
      const subscriptionId = session.subscription
      const userEmail = session.customer_email || session.metadata?.email
      const plan = session.subscription_data?.metadata?.plan || "monthly"

      if (userEmail) {
        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            subscription_tier: plan,
            updated_at: new Date().toISOString(),
          })
          .eq("email", userEmail)
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object
      const customerId = subscription.customer
      const status = subscription.status // active, past_due, cancelled, etc
      
      // Map Stripe status to our status
      let ourStatus = "inactive"
      if (["active", "trialing"].includes(status)) ourStatus = "active"
      else if (status === "past_due") ourStatus = "past_due"
      else if (["cancelled", "unpaid"].includes(status)) ourStatus = "cancelled"

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
      const subscription = event.data.object
      const customerId = subscription.customer

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
      const invoice = event.data.object
      const customerId = invoice.customer

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
