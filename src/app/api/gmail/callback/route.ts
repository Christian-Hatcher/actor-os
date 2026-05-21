import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`

export async function GET(request: NextRequest) {
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

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenData)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_error=token_exchange`
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

    // Decode state to get Supabase user_id
    let userId: string | null = null
    try {
      if (state) {
        userId = Buffer.from(state, "base64url").toString("utf8")
      }
    } catch {
      // If state decoding fails, we'll try to link via email
    }

    // If no userId from state, try matching by email in profiles
    if (!userId && userInfo.email) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", userInfo.email)
        .single()
      
      if (profile) userId = profile.id
    }

    if (!userId) {
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
      await supabaseAdmin
        .from("email_connections")
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          scopes: tokenData.scope?.split(" ") || [],
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    } else {
      // Create new connection
      await supabaseAdmin.from("email_connections").insert({
        user_id: userId,
        email_address: userInfo.email,
        display_name: userInfo.name || userInfo.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        scopes: tokenData.scope?.split(" ") || [],
        is_active: true,
      })
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_connected=${encodeURIComponent(userInfo.email)}`
    )
  } catch (err: any) {
    console.error("Gmail callback error:", err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?email_error=unknown`
    )
  }
}
