import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export async function getProfile(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  return { data, error }
}

export async function isFreeTier(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .single()

  return !profile?.subscription_status || profile.subscription_status !== "active"
}

/**
 * Update a profile by Stripe customer ID. Used by webhook handlers.
 * Returns the matched profile IDs so the caller can detect no-match.
 */
export async function updateProfileByStripeCustomer(
  supabaseAdmin: SupabaseClient<Database>,
  stripeCustomerId: string,
  fields: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("stripe_customer_id", stripeCustomerId)
    .select("id")

  return { data, error, matched: (data?.length ?? 0) > 0 }
}
