import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

export async function POST(request: Request) {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", session.user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err: any) {
    console.error("Portal error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
