import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { createSupabaseServer } from "@/lib/supabase-server"
import { getStripe } from "@/lib/stripe-admin"

export async function POST() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stripe = getStripe()
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error("Portal error:", err)
    const message = err instanceof Error ? err.message : "Portal failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
