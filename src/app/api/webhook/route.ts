import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getStripe } from "@/lib/stripe-admin"

export async function POST(request: Request) {
  const stripe = getStripe()
  const supabaseAdmin = getSupabaseAdmin()
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!
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
        const updatePayload = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
          subscription_tier: session.metadata?.plan || "monthly",
          updated_at: new Date().toISOString(),
        }

        const { data: updateResult } = await supabaseAdmin
          .from("profiles")
          .update(updatePayload)
          .eq("email", userEmail)
          .select("id")

        if (!updateResult?.length) {
          const clientRefId = session.client_reference_id
          if (clientRefId && clientRefId !== userEmail) {
            const { data: fallbackResult } = await supabaseAdmin
              .from("profiles")
              .update(updatePayload)
              .eq("email", clientRefId)
              .select("id")

            if (!fallbackResult?.length) {
              console.warn(`[WEBHOOK] checkout.session.completed: no profile found for email=${userEmail}, client_reference_id=${clientRefId}, customer=${customerId}`)
            }
          } else {
            console.warn(`[WEBHOOK] checkout.session.completed: no profile found for email=${userEmail}, client_reference_id=${session.client_reference_id}, customer=${customerId}`)
          }
        }
      } else {
        console.warn(`[WEBHOOK] checkout.session.completed: no email available, customer=${customerId}, client_reference_id=${session.client_reference_id}`)
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

      const { data: subUpdateResult } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: ourStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId)
        .select("id")

      if (!subUpdateResult?.length) {
        console.warn(`[WEBHOOK] customer.subscription.updated: no profile found for stripe_customer_id=${customerId}`)
      }
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { data: delResult } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: "cancelled",
          stripe_subscription_id: null,
          subscription_tier: "free",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId)
        .select("id")

      if (!delResult?.length) {
        console.warn(`[WEBHOOK] customer.subscription.deleted: no profile found for stripe_customer_id=${customerId}`)
      }
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const { data: invoiceResult } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId)
        .select("id")

      if (!invoiceResult?.length) {
        console.warn(`[WEBHOOK] invoice.payment_failed: no profile found for stripe_customer_id=${customerId}`)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
