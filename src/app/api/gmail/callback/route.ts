import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state") // Contains Supabase user_id (base64 encoded)

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_error=${error}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_error=no_code`
    )
  }

  try {
    console.log("[gmail-callback] code:", code?.substring(0, 10) + "...", "state:", state, "redirect_uri:", REDIRECT_URI)

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })

    const tokenData = await tokenRes.json()
    console.log("[gmail-callback] token exchange status:", tokenRes.status, "has access_token:", !!tokenData.access_token, "has refresh_token:", !!tokenData.refresh_token)

    if (!tokenRes.ok) {
      console.error("[gmail-callback] Token exchange failed:", JSON.stringify(tokenData))
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_error=token_exchange_${tokenData.error || "unknown"}`
      )
    }

    // Get user info from Google
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    )
    const userInfo = await userInfoRes.json()
    console.log("[gmail-callback] google user:", userInfo.email, userInfo.name)

    // State contains the user_id directly (UUID is URL-safe)
    let userId: string | null = state || null
    console.log("[gmail-callback] userId from state:", userId)

    // If no userId from state, try matching by email in profiles
    if (!userId && userInfo.email) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", userInfo.email)
        .single()

      if (profile) userId = profile.id
      console.log("[gmail-callback] userId from profile lookup:", userId)
    }

    if (!userId) {
      console.error("[gmail-callback] No userId found")
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_error=user_not_found`
      )
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Check if connection already exists
    const { data: existing } = await supabaseAdmin
      .from("email_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("email_address", userInfo.email)
      .single()

    if (existing) {
      // Update existing connection
      const { error: updateError } = await supabaseAdmin
        .from("email_connections")
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || undefined,
          token_expires_at: expiresAt.toISOString(),
          scopes: tokenData.scope?.split(" ") || [],
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
      console.log("[gmail-callback] updated existing connection:", existing.id, "error:", updateError)
    } else {
      // Create new connection
      const insertPayload = {
        user_id: userId,
        provider: "gmail",
        email_address: userInfo.email,
        display_name: userInfo.name || userInfo.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: expiresAt.toISOString(),
        scopes: tokenData.scope?.split(" ") || [],
        is_active: true,
      }
      console.log("[gmail-callback] inserting connection for:", userInfo.email, "user:", userId, "has refresh_token:", !!tokenData.refresh_token)
      const { error: insertError } = await supabaseAdmin.from("email_connections").insert(insertPayload)
      if (insertError) {
        console.error("[gmail-callback] Insert failed:", JSON.stringify(insertError))
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_error=insert_failed_${insertError.code}`
        )
      }
      console.log("[gmail-callback] insert success")
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_connected=${encodeURIComponent(userInfo.email)}`
    )
  } catch (err: any) {
    console.error("[gmail-callback] Unexpected error:", err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_error=unknown_${err.message?.substring(0, 50)}`
    )
  }
}
