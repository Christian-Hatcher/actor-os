import { NextResponse } from "next/server"

/**
 * GET /api/cron/email-sync
 * Vercel Cron: syncs all active Gmail connections, then parses pending emails.
 * Runs every 30 minutes. Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this header automatically)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://actor-os-gray.vercel.app"

  try {
    // Step 1: Sync all active connections (no user_id = all users)
    const syncRes = await fetch(`${baseUrl}/api/gmail/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({}),
    })
    const syncData = await syncRes.json()

    // Step 2: Parse all pending emails with auto_create
    const parseRes = await fetch(`${baseUrl}/api/gmail/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ auto_create: true }),
    })
    const parseData = await parseRes.json()

    return NextResponse.json({
      ok: true,
      sync: syncData,
      parse: parseData,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error("Cron email-sync failed:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
