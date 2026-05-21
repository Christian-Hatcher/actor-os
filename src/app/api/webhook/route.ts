import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const customerId = session.customer
      const subscriptionId = session.subscription
      const userEmail = session.customer_email

      // Update profile with Stripe info
      await supabaseAdmin
        .from("profiles")
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
          subscription_tier: session.metadata?.plan || "monthly",
        })
        .eq("email", userEmail)

      break
    }

    case "invoice.paid": {
      const subscription = event.data.object
      const customerId = subscription.customer

      await supabaseAdmin
        .from("profiles")
        .update({ subscription_status: "active" })
        .eq("stripe_customer_id", customerId)

      break
    }

    case "invoice.payment_failed": {
      const subscription = event.data.object
      const customerId = subscription.customer

      await supabaseAdmin
        .from("profiles")
        .update({ subscription_status: "past_due" })
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
        })
        .eq("stripe_customer_id", customerId)

      break
    }
  }

  return NextResponse.json({ received: true })
}
